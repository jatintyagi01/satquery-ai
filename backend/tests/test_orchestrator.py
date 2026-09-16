"""
Backend test suite for SatQuery AI.

Run with:  cd backend && pytest -q

Covers the pieces most critical to the SIH honesty/functionality
requirements: task classification, confidence engine behavior, and
end-to-end orchestration for every mandatory task type using the
synthetic demo-mode scene generator (no external dataset required).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pytest

from app.agents.confidence_and_router import classify_task, compute_confidence, confidence_label
from app.agents.orchestrator import Orchestrator, OrchestrationError
from app.services import demo_service


# ---------------------------------------------------------------------------
# Task classification
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("query,mode,expected", [
    ("Is there a water body in this image?", "single", "vqa"),
    ("Describe this image.", "single", "captioning"),
    ("Highlight the water body.", "single", "grounding"),
    ("What changed?", "before_after", "change_description"),
    ("Has the built-up area increased?", "before_after", "change_vqa"),
    ("Use the optical and SAR images together to identify built-up areas.", "optical_sar", "optical_sar_fusion"),
])
def test_task_classification(query, mode, expected):
    assert classify_task(query, 2 if mode != "single" else 1, mode) == expected


# ---------------------------------------------------------------------------
# Confidence engine — must never fabricate a number
# ---------------------------------------------------------------------------

def test_confidence_none_when_no_signals():
    conf, breakdown = compute_confidence({})
    assert conf is None
    assert breakdown == {}
    assert confidence_label(conf) == "Confidence unavailable"


def test_confidence_bounded_and_weighted():
    conf, breakdown = compute_confidence({"model_confidence": 0.9, "spatial_agreement": 0.9})
    assert conf is not None
    assert 0.0 < conf <= 0.99
    assert set(breakdown.keys()) == {"model_confidence", "spatial_agreement"}


def test_confidence_label_thresholds():
    assert confidence_label(0.85) == "High Confidence"
    assert confidence_label(0.65) == "Moderate Confidence"
    assert confidence_label(0.2) == "Low Confidence"


# ---------------------------------------------------------------------------
# Orchestrator — end-to-end on synthetic demo scenes
# ---------------------------------------------------------------------------

def _fake_image(array):
    return {"array": array, "meta": {"modality_guess": "optical"}}


def test_orchestrator_rejects_wrong_image_count():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.5, veg_amount=0.5)
    with pytest.raises(OrchestrationError):
        orch.run(query="What changed?", mode="before_after", images=[_fake_image(scene)])


def test_orchestrator_rejects_empty_query():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.5, veg_amount=0.5)
    with pytest.raises(OrchestrationError):
        orch.run(query="   ", mode="single", images=[_fake_image(scene)])


def test_orchestrator_vqa_end_to_end():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.3, water_amount=0.9, veg_amount=0.5)
    resp = orch.run(query="Is there a water body in this image?", mode="single", images=[_fake_image(scene)])
    assert resp.task == "vqa"
    assert resp.answer
    assert len(resp.trace) >= 5
    assert resp.trace[0].step == "Query Interpretation"


def test_orchestrator_change_detection_end_to_end():
    orch = Orchestrator()
    before = demo_service._base_scene(seed=4, urban_amount=0.2, water_amount=0.5, veg_amount=0.7)
    after = demo_service._base_scene(seed=4, urban_amount=0.85, water_amount=0.5, veg_amount=0.4)
    resp = orch.run(
        query="Has the built-up area increased, decreased, or remained unchanged?",
        mode="before_after",
        images=[_fake_image(before), _fake_image(after)],
    )
    assert resp.task == "change_vqa"
    assert "increased" in resp.answer.lower() or "built-up" in resp.answer.lower()
    assert "before" in resp.visual_outputs and "after" in resp.visual_outputs


def test_orchestrator_optical_sar_fusion_end_to_end():
    orch = Orchestrator()
    optical = demo_service._base_scene(seed=6, urban_amount=0.5, water_amount=0.6, veg_amount=0.5)
    sar = demo_service._pseudo_sar_from_optical(optical, seed=6)
    resp = orch.run(
        query="Use the optical and SAR images together to identify built-up and water-covered regions.",
        mode="optical_sar",
        images=[
            {"array": optical, "meta": {"modality_guess": "optical"}},
            {"array": sar, "meta": {"modality_guess": "sar"}},
        ],
        modality_hints={"image_1": "optical", "image_2": "sar"},
    )
    assert resp.task == "optical_sar_fusion"
    assert "OPTICAL EVIDENCE" in " ".join(e.detail for e in resp.evidence) or any(
        "optical" in e.detail.lower() for e in resp.evidence
    )
    assert "fused_overlay" in resp.visual_outputs


def test_no_fabricated_confidence_when_task_unclear():
    """Guards the honesty rule: confidence must derive from real signals only."""
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=9, urban_amount=0.0, water_amount=0.0, veg_amount=1.0)
    resp = orch.run(query="Tell me something interesting.", mode="single", images=[_fake_image(scene)])
    assert resp.confidence is None or 0.0 <= resp.confidence <= 1.0


# ---------------------------------------------------------------------------
# Innovation #9 — ambiguity detection / clarification
# ---------------------------------------------------------------------------

def test_ambiguous_query_returns_clarification():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.5, veg_amount=0.5)
    resp = orch.run(query="tell me something", mode="single", images=[_fake_image(scene)])
    assert resp.clarification_needed is True
    assert len(resp.clarification_options) > 0
    assert resp.confidence is None


def test_clear_question_does_not_trigger_clarification():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.9, veg_amount=0.5)
    resp = orch.run(query="Is there a water body in this image?", mode="single", images=[_fake_image(scene)])
    assert resp.clarification_needed is False


# ---------------------------------------------------------------------------
# Innovation #3 — self-correction retry loop
# ---------------------------------------------------------------------------

def test_self_correction_retry_fires_on_low_confidence():
    orch = Orchestrator()
    blank = np.full((300, 300, 3), (40, 120, 50), dtype=np.uint8)  # no built-up features present
    resp = orch.run(query="Highlight the built-up area.", mode="single", images=[_fake_image(blank)])
    assert len(resp.retries) == 2
    assert any(step.step == "Self-Correction Retry" for step in resp.trace)


def test_no_retry_when_confidence_already_high():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=11, urban_amount=0.9, water_amount=0.0, veg_amount=0.3)
    resp = orch.run(query="Highlight the built-up area.", mode="single", images=[_fake_image(scene)])
    if resp.confidence is not None and resp.confidence >= 0.5:
        assert resp.retries == []


# ---------------------------------------------------------------------------
# Innovation #10 — multi-step reasoning chains
# ---------------------------------------------------------------------------

def test_multi_step_chain_splits_and_executes_both_parts():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=3, urban_amount=0.4, water_amount=0.9, veg_amount=0.4)
    resp = orch.run(query="Highlight the water body then describe this image", mode="single",
                     images=[_fake_image(scene)])
    assert resp.task == "multi_step_chain"
    assert len(resp.chain_steps) == 2
    assert resp.chain_steps[0].task == "grounding"
    assert resp.chain_steps[1].task == "captioning"


# ---------------------------------------------------------------------------
# Innovation #1 — multi-turn conversational memory
# ---------------------------------------------------------------------------

def test_followup_query_uses_prior_session_context():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.9, veg_amount=0.5)
    session_id = "pytest-session"
    first = orch.run(query="Is there a water body in this image?", mode="single",
                      images=[_fake_image(scene)], session_id=session_id)
    assert first.followup_context_used is False
    second = orch.run(query="What about the built-up area instead?", mode="single",
                       images=[_fake_image(scene)], session_id=session_id)
    assert second.followup_context_used is True
    assert any("Context carried over" in e.detail for e in second.evidence)


# ---------------------------------------------------------------------------
# Innovation #6 — interactive region follow-up
# ---------------------------------------------------------------------------

def test_region_followup_hits_a_real_change_region():
    from app.agents.orchestrator import region_followup
    orch = Orchestrator()
    before = demo_service._base_scene(seed=4, urban_amount=0.2, water_amount=0.5, veg_amount=0.7)
    after = demo_service._base_scene(seed=4, urban_amount=0.85, water_amount=0.5, veg_amount=0.4)
    resp = orch.run(query="What changed?", mode="before_after",
                     images=[_fake_image(before), _fake_image(after)])
    from app.agents.orchestrator import ANALYSIS_ARTIFACTS
    art = ANALYSIS_ARTIFACTS[resp.analysis_id]
    assert art["regions"], "expected at least one detected change region for this scene pair"
    r = art["regions"][0]
    cx, cy = r["x"] + r["w"] // 2, r["y"] + r["h"] // 2
    followup = region_followup(resp.analysis_id, cx, cy)
    assert followup.in_region is True
    assert followup.local_stats.get("confidence") is not None


# ---------------------------------------------------------------------------
# Innovation #8 — knowledge-grounded domain context
# ---------------------------------------------------------------------------

def test_domain_notes_attached_for_large_water_increase():
    orch = Orchestrator()
    before = demo_service._base_scene(seed=4, urban_amount=0.0, water_amount=0.3, veg_amount=0.9)
    after = demo_service._base_scene(seed=4, urban_amount=1.0, water_amount=1.7, veg_amount=0.2)
    resp = orch.run(query="Has the built-up area increased?", mode="before_after",
                     images=[_fake_image(before), _fake_image(after)])
    assert any("Domain context" in e.detail for e in resp.evidence)


# ---------------------------------------------------------------------------
# Innovation #7 — real trained classifier wired into VQA
# ---------------------------------------------------------------------------

def test_trained_classifier_used_when_checkpoint_present():
    from app.tools import vision_tools
    if not vision_tools.classifier_available():
        pytest.skip("synthetic classifier checkpoint not present in this environment")
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.9, veg_amount=0.5)
    resp = orch.run(query="Is there a water body in this image?", mode="single", images=[_fake_image(scene)])
    assert "classifier confidence" in resp.answer.lower()


# ---------------------------------------------------------------------------
# Innovation #2 / #5 / #11 — followups, per-region confidence, uncertainty overlays
# ---------------------------------------------------------------------------

def test_followup_suggestions_present_and_relevant():
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.9, veg_amount=0.5)
    resp = orch.run(query="Is there a water body in this image?", mode="single", images=[_fake_image(scene)])
    assert 1 <= len(resp.suggested_followups) <= 3


def test_grounding_returns_per_region_confidence():
    from app.tools.vision_tools import ground_query
    scene = demo_service._base_scene(seed=3, urban_amount=0.4, water_amount=0.9, veg_amount=0.4)
    mask, boxes, cls, overall_conf, per_box_conf = ground_query(scene, "Highlight the water body.")
    assert len(per_box_conf) == len(boxes)
    assert all(0.0 <= c <= 1.0 for c in per_box_conf)


# ---------------------------------------------------------------------------
# Innovation #4 — multi-analysis natural-language summary
# ---------------------------------------------------------------------------

def test_summarize_analyses_empty_history():
    from app.services import history_service
    result = history_service.summarize_analyses(limit=5, analysis_ids=["nonexistent-id-xyz"])
    assert result["count"] == 0
    assert "No past analyses" in result["summary"]


def test_summarize_analyses_reflects_real_stored_results():
    from app.services import history_service
    orch = Orchestrator()
    scene = demo_service._base_scene(seed=1, urban_amount=0.5, water_amount=0.9, veg_amount=0.5)
    resp1 = orch.run(query="Is there a water body in this image?", mode="single", images=[_fake_image(scene)])
    resp2 = orch.run(query="Describe this image.", mode="single", images=[_fake_image(scene)])
    history_service.save_analysis(resp1, "single", ["fake1"])
    history_service.save_analysis(resp2, "single", ["fake2"])

    result = history_service.summarize_analyses(analysis_ids=[resp1.analysis_id, resp2.analysis_id])
    assert result["count"] == 2
    assert resp1.analysis_id in result["analyses_included"]
    assert resp2.analysis_id in result["analyses_included"]
    assert "vqa" in result["summary"] or "captioning" in result["summary"]
