"""
Knowledge-Grounded Context (Innovation #8)
=============================================
A small, static, honestly-labeled domain knowledge base that adds
real-world interpretive context to answers when specific evidence
conditions are met (e.g. large built-up increase, large water increase).

This is NOT a claim of a knowledge-grounded LLM or retrieval system —
it is explicit rule-based domain context, clearly attributed as such in
the evidence panel ("Domain context:"), matching the project's honesty
requirements (no fabricated conclusions).
"""
from __future__ import annotations
from typing import Dict, List


def get_domain_notes(task: str, signals: Dict[str, float]) -> List[str]:
    notes: List[str] = []

    if task in ("change_vqa", "change_detection", "change_description"):
        built_up_delta = signals.get("built_up_delta")
        water_delta = signals.get("water_delta")
        change_pct = signals.get("change_pct")

        if built_up_delta is not None and built_up_delta > 10:
            notes.append(
                "Domain context: a built-up area increase of this magnitude over the "
                "observed interval is typically associated with rapid urban expansion, "
                "which can strain local infrastructure and increase impervious-surface "
                "runoff in the affected area."
            )
        if water_delta is not None and water_delta > 8:
            notes.append(
                "Domain context: a water-coverage increase of this magnitude is consistent "
                "with flooding, monsoon inundation, or reservoir filling — cross-check with "
                "recent precipitation records if flood assessment is the goal."
            )
        if water_delta is not None and water_delta < -8:
            notes.append(
                "Domain context: a water-coverage decrease of this magnitude may indicate "
                "seasonal recession, drought, or upstream water diversion."
            )
        if change_pct is not None and change_pct > 25:
            notes.append(
                "Domain context: overall change magnitude above ~25% of the scene is large "
                "for a single observation interval — consider verifying co-registration "
                "quality before drawing strong conclusions."
            )

    if task == "optical_sar_fusion":
        agreement = signals.get("cross_modal_agreement")
        if agreement is not None and agreement < 0.4:
            notes.append(
                "Domain context: low optical-SAR agreement can indicate cloud cover in the "
                "optical scene, SAR layover/shadow effects, or a genuine acquisition-date "
                "mismatch between the two sensors."
            )

    if task == "vqa":
        water_pct = signals.get("water_pct")
        if water_pct is not None and water_pct > 30:
            notes.append(
                "Domain context: water coverage above 30% of the scene may indicate the "
                "image includes a large water body (lake/reservoir/coastline) rather than "
                "isolated inland water features."
            )

    return notes
