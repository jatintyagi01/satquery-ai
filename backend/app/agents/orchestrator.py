"""
AGENTIC ORCHESTRATOR
====================
The central controller described in SIH Requirement 6, extended with a set
of agentic "innovation" capabilities that go beyond the base requirement:

 1. Interpret the user query (+ resolve multi-turn follow-up context)
 2. Determine task type
 3. Inspect number of images
 4. Detect modality
 5. Validate image compatibility
 5b. Multi-step chain detection ("find water bodies then tell me which shrank")
 5c. Ambiguity detection -> clarification prompt for genuinely vague queries
 6. Select specialist model/tool (via MODEL_REGISTRY)
 7. Configure permitted parameters
 8. Execute workflow
 8b. Self-correction retry loop when confidence is low
 9. Validate outputs
10. Combine textual/spatial outputs
11. Estimate confidence
11b. Knowledge-grounded domain context injection
11c. Follow-up question suggestion generation
12. Return evidence
13. Produce an execution trace

Every step appends a TraceStep so the full reasoning path is auditable in
the UI without exposing private chain-of-thought.
"""
from __future__ import annotations
import re
import time
import uuid
import datetime
from typing import List, Dict, Optional
import numpy as np

from ..schemas.schemas import TraceStep, EvidenceItem, AnalyzeResponse, ChainStep, RetryAttempt, RegionFollowupResponse
from ..models.registry import get_model, MODEL_REGISTRY
from ..tools import geo_io
from ..tools.vision_tools import compute_landcover_stats, answer_vqa, generate_caption, ground_query, overlay_mask
from ..tools.change_and_fusion import detect_change, change_vqa_answer, optical_sar_fusion
from .confidence_and_router import (
    classify_task, classify_task_verbose, is_ambiguous, TASK_DISPLAY, TASK_TO_MODEL,
    compute_confidence, confidence_label, CLARIFICATION_OPTIONS_DEFAULT,
)
from .followups import generate_followups
from ..services import session_service, knowledge_base
from ..core_config import REPORTS_DIR, UPLOAD_DIR

RETRY_CONFIDENCE_THRESHOLD = 0.5
RETRYABLE_TASKS = {"grounding", "change_detection", "change_vqa", "change_description"}

# analysis_id -> spatial artifacts, used to answer region-click follow-ups
# (Innovation #6 — interactive "Change-Agent" style region drill-down).
ANALYSIS_ARTIFACTS: Dict[str, dict] = {}
MAX_ARTIFACTS = 200


class OrchestrationError(Exception):
    def __init__(self, message: str, user_message: str):
        super().__init__(message)
        self.user_message = user_message


class Orchestrator:
    """Remote Sensing Query Agent — the primary agent identity shown in the UI."""

    AGENT_NAME = "Remote Sensing Query Agent"

    def __init__(self):
        self.trace: List[TraceStep] = []

    def _step(self, step: str, tool: str, status: str, input_summary: str,
              output_summary: str, start_time: float):
        self.trace.append(TraceStep(
            step=step, tool=tool, status=status,
            input_summary=input_summary, output_summary=output_summary,
            processing_time_ms=round((time.time() - start_time) * 1000, 2),
        ))

    # =====================================================================
    def run(self, query: str, mode: str, images: List[Dict], modality_hints: Optional[Dict[str, str]] = None,
            is_demo: bool = False, session_id: Optional[str] = None) -> AnalyzeResponse:
        self.trace = []
        analysis_id = uuid.uuid4().hex[:10]
        warnings: List[str] = []

        # --- Step 1: Interpret query (+ multi-turn follow-up resolution, Innovation #1) ---
        t0 = time.time()
        query_clean = query.strip()
        if not query_clean:
            raise OrchestrationError("empty query", "Please enter a question about your imagery.")

        followup_used = False
        last_turn = session_service.get_last_turn(session_id) if session_id else None
        if last_turn and session_service.is_followup_query(query_clean):
            followup_used = True
        self._step("Query Interpretation", "QueryInterpreter", "ok",
                   input_summary=f'"{query_clean}"',
                   output_summary="Query parsed and normalized" +
                                  (f" (resolved as a follow-up to a prior '{last_turn['task']}' analysis)"
                                   if followup_used else ""),
                   start_time=t0)

        # --- Step 2/3: Inspect input configuration ---
        t0 = time.time()
        n_images = len(images)
        expected = {"single": 1, "optical_sar": 2, "before_after": 2}
        if mode not in expected:
            raise OrchestrationError("bad mode", "Unknown analysis mode selected.")
        if n_images != expected[mode]:
            msg = ("Change analysis requires two spatially corresponding images."
                   if mode == "before_after" else
                   "This analysis mode requires exactly two images (optical + SAR)."
                   if mode == "optical_sar" else
                   "Single-image analysis requires exactly one image.")
            self._step("Input Validation", "InputValidator", "error",
                       input_summary=f"{n_images} image(s) provided for mode '{mode}'",
                       output_summary="Validation failed", start_time=t0)
            raise OrchestrationError("image count mismatch", msg)
        self._step("Input Validation", "InputValidator", "ok",
                   input_summary=f"{n_images} image(s), mode={mode}",
                   output_summary="Input configuration valid", start_time=t0)

        # --- Step 4: Modality detection ---
        t0 = time.time()
        modalities = []
        for i, img in enumerate(images):
            hint = (modality_hints or {}).get(f"image_{i+1}")
            modality = hint or img["meta"].get("modality_guess", "optical")
            modalities.append(modality)
        self._step("Modality Detection", "GeospatialAnalysisTools", "ok",
                   input_summary=f"{n_images} image(s)",
                   output_summary=f"Detected modalities: {modalities}", start_time=t0)

        # --- Step 5: Compatibility validation ---
        t0 = time.time()
        if mode == "optical_sar" and "sar" not in modalities:
            warnings.append("Neither image was confidently detected as SAR; proceeding using provided order "
                             "(image 1 = optical, image 2 = SAR). You can override via modality hints.")
        if mode == "before_after":
            h1, w1 = images[0]["array"].shape[:2]
            h2, w2 = images[1]["array"].shape[:2]
            ratio = abs((h1 / w1) - (h2 / w2)) if w1 and w2 else 0
            if ratio > 0.15:
                warnings.append("The two images have notably different aspect ratios; "
                                 "results are computed after best-effort resizing alignment.")
        self._step("Compatibility Validation", "InputValidator", "ok" if not warnings else "warning",
                   input_summary=f"modalities={modalities}",
                   output_summary="Compatible" if not warnings else "; ".join(warnings), start_time=t0)

        # --- Step 5b: Multi-step chain detection (Innovation #10) ---
        chain_parts = [p.strip() for p in re.split(r"\s+and then\s+|\s+then\s+", query_clean, flags=re.IGNORECASE)
                       if p.strip()]
        if len(chain_parts) > 1:
            return self._run_chain(chain_parts, mode, images, modalities, analysis_id, is_demo, warnings, session_id)

        # --- Step 5c: Ambiguity detection -> clarification (Innovation #9) ---
        task, matched = classify_task_verbose(query_clean, n_images, mode)
        if is_ambiguous(query_clean, mode, matched):
            t0 = time.time()
            self._step("Ambiguity Check", "TaskRouter", "warning",
                       input_summary=f'query="{query_clean}"',
                       output_summary="Query too vague to confidently route to a specialist model",
                       start_time=t0)
            visuals = {}
            if mode == "single":
                visuals = {"input_image": self._save_vis(images[0]["array"], analysis_id, "input")}
            return AnalyzeResponse(
                analysis_id=analysis_id, query=query_clean, task="clarification_needed",
                task_display="Clarification Needed", agent=self.AGENT_NAME, selected_model="n/a",
                answer="Your question is broad enough that I can't confidently route it to a specific "
                       "specialist model. Could you ask something more specific? A few examples that "
                       "work well for this imagery:",
                confidence=None, confidence_label="Confidence unavailable", confidence_breakdown={},
                evidence=[], visual_outputs=visuals, trace=self.trace,
                metadata_used={"modalities": modalities, "mode": mode},
                timestamp=datetime.datetime.utcnow().isoformat(), is_demo=is_demo, warnings=warnings,
                clarification_needed=True, clarification_options=CLARIFICATION_OPTIONS_DEFAULT,
                session_id=session_id,
            )

        # --- Step 6: Task classification & model selection ---
        t0 = time.time()
        model_name = TASK_TO_MODEL[task]
        model_spec = get_model(model_name)
        self._step("Task Classification & Model Selection", "TaskRouter", "ok",
                   input_summary=f'query="{query_clean}", mode={mode}',
                   output_summary=f"task={task} -> model={model_name}", start_time=t0)

        # --- Step 7/8: Execute workflow ---
        t0 = time.time()
        result = self._execute_task(task, query_clean, images, modalities, analysis_id)
        self._step(f"Inference Execution ({model_name})", model_name, "ok",
                   input_summary=f"task={task}",
                   output_summary=result["exec_summary"], start_time=t0)

        # --- Step 9: Output validation ---
        t0 = time.time()
        if not result.get("answer"):
            self._step("Evidence Validation", "EvidenceValidator", "error",
                       input_summary="model output", output_summary="No answer produced", start_time=t0)
            raise OrchestrationError("empty result", "The selected model could not produce a result for this input.")
        self._step("Evidence Validation", "EvidenceValidator", "ok",
                   input_summary="model output + evidence signals",
                   output_summary=f"{len(result.get('evidence', []))} evidence item(s) validated", start_time=t0)

        # --- Step 10/11: Confidence estimation ---
        t0 = time.time()
        confidence, breakdown = compute_confidence(result["confidence_signals"])
        self._step("Confidence Estimation", "ConfidenceEngine", "ok",
                   input_summary=str({k: round(v, 2) for k, v in result["confidence_signals"].items() if v is not None}),
                   output_summary=f"confidence={confidence}", start_time=t0)

        # --- Step 8b: Self-correction retry loop (Innovation #3) ---
        retries: List[RetryAttempt] = []
        if confidence is not None and confidence < RETRY_CONFIDENCE_THRESHOLD and task in RETRYABLE_TASKS:
            retries.append(RetryAttempt(attempt=1, confidence=confidence,
                                          note="Initial confidence below 0.50 threshold."))
            t0 = time.time()
            retry_result = self._execute_task_retry(task, query_clean, images, modalities, analysis_id)
            retry_confidence, retry_breakdown = compute_confidence(retry_result["confidence_signals"])
            self._step("Self-Correction Retry", model_name, "ok",
                       input_summary=f"initial confidence={confidence}, retrying with relaxed detection parameters",
                       output_summary=f"retry confidence={retry_confidence}", start_time=t0)
            retries.append(RetryAttempt(attempt=2, confidence=retry_confidence,
                                          note="Retried with relaxed detection threshold."))
            if retry_confidence is not None and (confidence is None or retry_confidence > confidence):
                result, confidence, breakdown = retry_result, retry_confidence, retry_breakdown
                warnings.append("Initial analysis had low confidence; the agent automatically retried with "
                                 "adjusted detection parameters and used the improved result.")

        # --- Step 11b: Knowledge-grounded domain context (Innovation #8) ---
        t0 = time.time()
        domain_notes = knowledge_base.get_domain_notes(task, result.get("kb_signals", {}))
        if domain_notes:
            self._step("Knowledge Grounding", "DomainKnowledgeBase", "ok",
                       input_summary=f"signals={result.get('kb_signals', {})}",
                       output_summary=f"{len(domain_notes)} domain note(s) attached", start_time=t0)

        # --- Step 11c: Follow-up suggestions (Innovation #2) ---
        followups = generate_followups(task, {"query": query_clean, **result})

        # --- Step 12: Response synthesis ---
        t0 = time.time()
        self._step("Response Synthesis", "ResponseSynthesizer", "ok",
                   input_summary="answer + evidence + visuals",
                   output_summary="Final structured response assembled", start_time=t0)

        evidence_items = [EvidenceItem(label=e, detail=e) for e in result.get("evidence", [])]
        evidence_items += [EvidenceItem(label=n, detail=n) for n in domain_notes]
        if followup_used:
            evidence_items.insert(0, EvidenceItem(
                label="context", detail=f"Context carried over from previous turn: "
                                          f"'{last_turn['task']}' -> \"{last_turn['answer'][:120]}\""))

        # Store spatial artifacts for interactive region follow-ups (Innovation #6)
        self._store_artifacts(analysis_id, task, result)

        response = AnalyzeResponse(
            analysis_id=analysis_id,
            query=query_clean,
            task=task,
            task_display=TASK_DISPLAY[task],
            agent=self.AGENT_NAME,
            selected_model=model_name,
            answer=result["answer"],
            confidence=confidence,
            confidence_label=confidence_label(confidence),
            confidence_breakdown=breakdown,
            evidence=evidence_items,
            visual_outputs=result.get("visual_outputs", {}),
            trace=self.trace,
            metadata_used={"modalities": modalities, "mode": mode, "model_type": model_spec.model_type,
                           "adapted": model_spec.adapted},
            timestamp=datetime.datetime.utcnow().isoformat(),
            is_demo=is_demo,
            warnings=warnings,
            session_id=session_id,
            suggested_followups=followups,
            chain_steps=[],
            retries=retries,
            followup_context_used=followup_used,
            advanced_change_analysis=result.get("advanced_change_analysis"),
        )

        if session_id:
            session_service.record_turn(session_id, {
                "task": task, "answer": response.answer, "query": query_clean,
                "signals": result.get("kb_signals", {}),
            })

        return response

    # =====================================================================
    # Multi-step chain execution (Innovation #10)
    # =====================================================================
    def _run_chain(self, parts: List[str], mode: str, images: List[Dict], modalities: List[str],
                    analysis_id: str, is_demo: bool, warnings: List[str], session_id: Optional[str]) -> AnalyzeResponse:
        t0 = time.time()
        self._step("Chain Planning", "ChainPlanner", "ok",
                   input_summary=f"{len(parts)} sequential steps detected",
                   output_summary=" -> ".join(parts), start_time=t0)

        chain_steps: List[ChainStep] = []
        combined_evidence: List[EvidenceItem] = []
        combined_visuals: Dict[str, str] = {}
        confidences: List[float] = []

        for i, part in enumerate(parts):
            sub_task = classify_task(part, len(images), mode)
            sub_model = TASK_TO_MODEL[sub_task]
            t1 = time.time()
            try:
                sub_result = self._execute_task(sub_task, part, images, modalities, f"{analysis_id}_s{i+1}")
            except OrchestrationError as e:
                sub_result = {"answer": f"(step could not be completed: {e.user_message})",
                              "evidence": [], "confidence_signals": {}, "visual_outputs": {},
                              "exec_summary": "step failed"}
            sub_conf, _ = compute_confidence(sub_result["confidence_signals"])
            self._step(f"Chain Step {i+1} ({sub_task})", sub_model, "ok",
                       input_summary=part, output_summary=sub_result["exec_summary"], start_time=t1)
            chain_steps.append(ChainStep(step_index=i + 1, query=part, task=sub_task,
                                           task_display=TASK_DISPLAY[sub_task],
                                           answer=sub_result["answer"], confidence=sub_conf))
            combined_evidence.extend(EvidenceItem(label=e, detail=e) for e in sub_result.get("evidence", []))
            for k, v in sub_result.get("visual_outputs", {}).items():
                combined_visuals[f"step{i+1}_{k}"] = v
            if sub_conf is not None:
                confidences.append(sub_conf)

        final_answer = "\n".join(f"Step {cs.step_index} ({cs.task_display}): {cs.answer}" for cs in chain_steps)
        overall_conf = round(sum(confidences) / len(confidences), 4) if confidences else None

        t0 = time.time()
        self._step("Response Synthesis", "ResponseSynthesizer", "ok",
                   input_summary=f"{len(chain_steps)} chain step results",
                   output_summary="Combined multi-step answer assembled", start_time=t0)

        response = AnalyzeResponse(
            analysis_id=analysis_id, query=" then ".join(parts), task="multi_step_chain",
            task_display="Multi-Step Reasoning Chain", agent=self.AGENT_NAME,
            selected_model="Multiple (see chain steps)", answer=final_answer,
            confidence=overall_conf, confidence_label=confidence_label(overall_conf),
            confidence_breakdown={}, evidence=combined_evidence, visual_outputs=combined_visuals,
            trace=self.trace, metadata_used={"modalities": modalities, "mode": mode},
            timestamp=datetime.datetime.utcnow().isoformat(), is_demo=is_demo, warnings=warnings,
            session_id=session_id, suggested_followups=generate_followups("multi_step_chain", {}),
            chain_steps=chain_steps, retries=[], followup_context_used=False,
        )
        if session_id:
            session_service.record_turn(session_id, {"task": "multi_step_chain", "answer": final_answer,
                                                        "query": response.query, "signals": {}})
        return response

    # =====================================================================
    def _save_vis(self, array: np.ndarray, analysis_id: str, name: str) -> str:
        fname = f"{analysis_id}_{name}.png"
        path = str(UPLOAD_DIR / fname)
        geo_io.save_preview(array, path)
        return f"/api/files/{fname}"

    def _store_artifacts(self, analysis_id: str, task: str, result: Dict):
        """Persists spatial data needed to answer region-click follow-ups
        (Innovation #6). Bounded in-memory cache."""
        artifact = result.get("artifact")
        if artifact is None:
            return
        if len(ANALYSIS_ARTIFACTS) > MAX_ARTIFACTS:
            oldest = next(iter(ANALYSIS_ARTIFACTS))
            ANALYSIS_ARTIFACTS.pop(oldest, None)
        ANALYSIS_ARTIFACTS[analysis_id] = artifact

    # =====================================================================
    def _execute_task(self, task: str, query: str, images: List[Dict], modalities: List[str],
                       analysis_id: str, grounding_min_area: float = 0.001,
                       change_sensitivity: float = 1.0) -> Dict:
        if task == "vqa":
            arr = images[0]["array"]
            stats = compute_landcover_stats(arr)
            answer, model_conf, evidence = answer_vqa(query, stats, modalities[0])
            return {
                "answer": answer,
                "evidence": evidence + [f"Modality detected: {modalities[0]}"],
                "confidence_signals": {"model_confidence": model_conf, "evidence_consistency": 0.8,
                                        "input_compatibility": 1.0},
                "visual_outputs": {"input_image": self._save_vis(arr, analysis_id, "input")},
                "exec_summary": f"VQA answered using land-cover heuristic stats ({modalities[0]})",
                "kb_signals": {"water_pct": stats["water_pct"], "built_up_pct": stats["built_up_pct"]},
            }

        if task == "captioning":
            arr = images[0]["array"]
            stats = compute_landcover_stats(arr)
            caption, model_conf = generate_caption(stats, modalities[0])
            return {
                "answer": caption,
                "evidence": [f"Dominant classes: veg={stats['vegetation_pct']:.1f}%, "
                             f"built-up={stats['built_up_pct']:.1f}%, water={stats['water_pct']:.1f}%"],
                "confidence_signals": {"model_confidence": model_conf, "evidence_consistency": 0.75},
                "visual_outputs": {"input_image": self._save_vis(arr, analysis_id, "input")},
                "exec_summary": "Caption generated from scene composition heuristics",
                "kb_signals": {},
            }

        if task == "grounding":
            arr = images[0]["array"]
            mask, boxes, cls, model_conf, per_box_conf = ground_query(arr, query, min_area_frac=grounding_min_area)
            overlay = overlay_mask(arr, mask, boxes, box_confidences=per_box_conf)
            answer = (f"Located {len(boxes)} candidate region(s) matching '{cls.replace('_', ' ')}'."
                       if boxes else
                       f"No confident '{cls.replace('_', ' ')}' region was found in this image.")
            region_conf_str = ", ".join(f"{c*100:.0f}%" for c in per_box_conf) if per_box_conf else "n/a"
            return {
                "answer": answer,
                "evidence": [f"Target class inferred from query: {cls}",
                             f"{len(boxes)} region(s) above minimum-area threshold",
                             f"Per-region confidence: {region_conf_str}"],
                "confidence_signals": {"model_confidence": model_conf, "spatial_agreement": 0.7 if boxes else 0.2},
                "visual_outputs": {
                    "input_image": self._save_vis(arr, analysis_id, "input"),
                    "grounding_overlay": self._save_vis(overlay, analysis_id, "grounding"),
                },
                "exec_summary": f"Grounding executed for class '{cls}', {len(boxes)} region(s) found",
                "kb_signals": {},
                "artifact": {"type": "grounding", "boxes": boxes, "confidences": per_box_conf,
                              "class": cls, "shape": list(arr.shape[:2])},
            }

        if task in ("change_detection", "change_description", "change_vqa"):
            a, b = images[0]["array"], images[1]["array"]
            meta_a = images[0].get("meta", {})
            meta_b = images[1].get("meta", {})
            res = detect_change(a, b, sensitivity=change_sensitivity, meta_t1=meta_a, meta_t2=meta_b)
            effective_query = query if task == "change_vqa" else (
                query if task == "change_description" else "what changed")
            answer, model_conf, evidence, delta_signals = change_vqa_answer(effective_query, res)
            adv_analysis = res.get("advanced_change_analysis")
            return {
                "answer": answer,
                "evidence": evidence,
                "confidence_signals": {"model_confidence": model_conf,
                                        "spatial_agreement": min(1.0, res["change_pct"] / 30)},
                "visual_outputs": {
                    "before": self._save_vis(res["aligned_before"], analysis_id, "before"),
                    "after": self._save_vis(res["aligned_after"], analysis_id, "after"),
                    "change_heatmap": self._save_vis(res["change_heatmap"], analysis_id, "heatmap"),
                    "change_overlay": self._save_vis(res["change_overlay"], analysis_id, "overlay"),
                },
                "exec_summary": f"Change detected across {res['change_pct']:.1f}% of scene "
                                f"({len(res['change_regions'])} regions)",
                "kb_signals": delta_signals,
                "advanced_change_analysis": adv_analysis,
                "artifact": {"type": "change", "regions": res["change_regions"],
                              "shape": list(res["change_mask"].shape[:2]),
                              "advanced_change_analysis": adv_analysis},
            }

        if task == "optical_sar_fusion":
            optical_idx = 0 if modalities[0] != "sar" else 1
            sar_idx = 1 - optical_idx
            optical_arr, sar_arr = images[optical_idx]["array"], images[sar_idx]["array"]
            res = optical_sar_fusion(optical_arr, sar_arr, query)
            answer = (f"Fused optical-SAR analysis identifies water covering ~{res['water_pct_fused']:.1f}% "
                       f"and built-up areas covering ~{res['builtup_pct_fused']:.1f}% of the scene. "
                       f"Optical evidence contributed spectral/contextual cues (color, texture) while SAR "
                       f"evidence contributed structural/backscatter cues (low backscatter for water, "
                       f"high local structure for built-up).")
            return {
                "answer": answer,
                "evidence": [
                    f"OPTICAL EVIDENCE: spectral water cue = {res['optical_stats']['water_pct']:.1f}%, "
                    f"built-up spectral cue = {res['optical_stats']['built_up_pct']:.1f}%",
                    f"SAR EVIDENCE: low-backscatter (water-consistent) regions identified via log-scaled "
                    f"backscatter thresholding",
                    f"Cross-modal agreement (optical vs SAR water cue overlap): {res['cross_modal_agreement']*100:.1f}%",
                ],
                "confidence_signals": {"model_confidence": 0.7, "cross_modal_agreement": res["cross_modal_agreement"],
                                        "input_compatibility": 1.0},
                "visual_outputs": {
                    "optical": self._save_vis(res["optical_aligned"], analysis_id, "optical"),
                    "sar_backscatter": self._save_vis(res["sar_backscatter_vis"], analysis_id, "sar_vis"),
                    "fused_overlay": self._save_vis(res["fused_overlay"], analysis_id, "fused"),
                },
                "exec_summary": f"Optical-SAR fusion complete; cross-modal agreement="
                                f"{res['cross_modal_agreement']*100:.1f}%",
                "kb_signals": {"cross_modal_agreement": res["cross_modal_agreement"]},
            }

        raise OrchestrationError(f"unhandled task {task}", "This task type is not yet supported.")

    def _execute_task_retry(self, task: str, query: str, images: List[Dict], modalities: List[str],
                             analysis_id: str) -> Dict:
        """Self-correction retry (Innovation #3): re-runs the same task with
        relaxed/adjusted detection parameters when the first attempt scored
        low confidence."""
        if task == "grounding":
            return self._execute_task(task, query, images, modalities, analysis_id, grounding_min_area=0.0003)
        if task in ("change_detection", "change_description", "change_vqa"):
            return self._execute_task(task, query, images, modalities, analysis_id, change_sensitivity=0.85)
        return self._execute_task(task, query, images, modalities, analysis_id)


orchestrator = Orchestrator()


# =========================================================================
# Interactive region follow-up (Innovation #6 — "Change-Agent" style
# click-to-drill-down on a change map or grounding overlay).
# =========================================================================

def region_followup(analysis_id: str, x: int, y: int, query: Optional[str] = None) -> RegionFollowupResponse:
    art = ANALYSIS_ARTIFACTS.get(analysis_id)
    if not art:
        return RegionFollowupResponse(
            analysis_id=analysis_id, x=x, y=y, in_region=False,
            summary="No stored spatial data for this analysis. Region follow-up is available for "
                    "grounding and change-detection results only, and only shortly after the original "
                    "analysis (the cache is bounded).",
        )

    if art["type"] == "grounding":
        for (bx, by, bw, bh), conf in zip(art["boxes"], art["confidences"]):
            if bx <= x <= bx + bw and by <= y <= by + bh:
                return RegionFollowupResponse(
                    analysis_id=analysis_id, x=x, y=y, in_region=True,
                    summary=f"This point falls inside a detected '{art['class'].replace('_', ' ')}' region "
                            f"with {conf*100:.0f}% regional confidence.",
                    local_stats={"confidence": conf},
                )
        return RegionFollowupResponse(
            analysis_id=analysis_id, x=x, y=y, in_region=False,
            summary=f"This point is outside any detected '{art['class'].replace('_', ' ')}' region.",
        )

    if art["type"] == "change":
        adv = art.get("advanced_change_analysis") or {}
        adv_regions = adv.get("regions", [])
        for idx, r in enumerate(art["regions"]):
            if r["x"] <= x <= r["x"] + r["w"] and r["y"] <= y <= r["y"] + r["h"]:
                # Match corresponding region metrics
                matched_reg_data = None
                for reg in adv_regions:
                    if reg.get("region_index") == idx + 1:
                        matched_reg_data = reg
                        break

                reg_conf_str = "High Confidence" if r["confidence"] >= 0.75 else "Moderate Confidence" if r["confidence"] >= 0.5 else "Low Confidence"
                summary_text = (
                    f"Region {idx + 1} ({reg_conf_str}): covers {r['area_pct']:.1f}% of the scene "
                    f"with {r['confidence']*100:.0f}% regional confidence."
                )
                if matched_reg_data:
                    b_card = matched_reg_data["cards"]["built_up"]
                    v_card = matched_reg_data["cards"]["vegetation"]
                    summary_text += f" Built-up shifted ({b_card['label']}), Vegetation shifted ({v_card['label']}). Spectral distance: {matched_reg_data['spectral_distance']:.2f} RMS."

                return RegionFollowupResponse(
                    analysis_id=analysis_id, x=x, y=y, in_region=True,
                    summary=summary_text,
                    local_stats={"area_pct": r["area_pct"], "confidence": r["confidence"], "region_index": idx + 1},
                    region_spectral_data=matched_reg_data,
                )
        return RegionFollowupResponse(
            analysis_id=analysis_id, x=x, y=y, in_region=False,
            summary="This point is outside any detected change region — no significant change was found here.",
        )

    return RegionFollowupResponse(analysis_id=analysis_id, x=x, y=y, in_region=False,
                                    summary="Region follow-up is not supported for this analysis type.")
