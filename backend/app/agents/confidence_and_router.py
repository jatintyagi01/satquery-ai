"""
Confidence Engine + Task Router.

Confidence is a documented weighted combination of available evidence
signals -- never a random number. If insufficient signals are available,
we explicitly return None so the caller can display "Confidence unavailable".
"""
from __future__ import annotations
from typing import Dict, Optional, Tuple, List
import re

CLARIFICATION_OPTIONS_DEFAULT = [
    "Describe this image.",
    "Is there a water body in this image?",
    "Are there buildings in this image?",
    "Highlight the water body.",
]

# ---------------------------------------------------------------------------
# Task classification
# ---------------------------------------------------------------------------

TASK_PATTERNS: List[Tuple[str, List[str]]] = [
    ("change_vqa", [r"\bincrease[d]?\b", r"\bdecrease[d]?\b", r"\bmore than\b", r"\bunchanged\b",
                     r"\bhas .* (increased|decreased|changed)\b"]),
    ("change_description", [r"what changed", r"describe.*change", r"change.*where"]),
    ("change_detection", [r"\bchange\b", r"\bbefore.*after\b", r"\bcompare (these|two) images\b",
                           r"\bdifferen(t|ce)\b.*(image|scene)"]),
    ("optical_sar_fusion", [r"optical.*sar", r"sar.*optical", r"fuse", r"fusion", r"both images.*identify",
                             r"use.*optical and sar"]),
    ("grounding", [r"\bhighlight\b", r"\bwhere is\b", r"\blocate\b", r"\bfind (the )?water",
                   r"\bground\b", r"\bpoint out\b", r"\bshow me the\b"]),
    ("captioning", [r"\bdescribe (this|the) image\b", r"\bcaption\b", r"\bwhat is (this|the) (scene|image)\b",
                     r"\bgive a description\b"]),
    ("vqa", [r"^(is|are|does|do|what|how many|which)\b", r"\?"]),
]


def classify_task(query: str, num_images: int, mode: str) -> str:
    task, _matched = classify_task_verbose(query, num_images, mode)
    return task


def classify_task_verbose(query: str, num_images: int, mode: str) -> Tuple[str, bool]:
    """Same as classify_task but also reports whether an explicit pattern
    matched, vs. falling through to the generic default (used for
    ambiguity detection / clarification prompts, Innovation #9)."""
    q = query.lower().strip()

    if mode == "optical_sar":
        return "optical_sar_fusion", True
    if mode == "before_after":
        for task in ("change_vqa", "change_description"):
            for pat in dict(TASK_PATTERNS)[task]:
                if re.search(pat, q):
                    return task, True
        return "change_detection", True  # before/after mode is unambiguous even without keywords

    # single image mode
    for task, patterns in TASK_PATTERNS:
        if task in ("change_vqa", "change_description", "change_detection", "optical_sar_fusion"):
            continue
        for pat in patterns:
            if re.search(pat, q):
                return task, True
    return "vqa", False  # default fallback for single image — NOT a confident match


# ---------------------------------------------------------------------------
# Ambiguity detection (Innovation #9)
# ---------------------------------------------------------------------------

VAGUE_PHRASES = [
    r"^tell me (something|more)\b", r"^analyz(e|ing) this\b", r"^what.?s (going on|here)\??$",
    r"^help\b", r"^look at this\b", r"^check this\b", r"^\W*$",
]


def is_ambiguous(query: str, mode: str, matched: bool) -> bool:
    """A query is ambiguous when it's a single-image query that matched no
    explicit task pattern AND is short/generic enough that guessing 'vqa'
    would likely not answer what the user actually wants."""
    if mode != "single":
        return False
    if matched:
        return False
    q = query.lower().strip()
    if any(re.search(p, q) for p in VAGUE_PHRASES):
        return True
    word_count = len(q.split())
    has_question_word = bool(re.search(r"\b(is|are|does|do|what|how|which|where)\b", q))
    # Generic, short, and not phrased as a real question -> ambiguous.
    return word_count <= 4 and not has_question_word


TASK_DISPLAY = {
    "vqa": "Visual Question Answering",
    "captioning": "Image Captioning / Scene Description",
    "grounding": "Text-Guided Region Grounding",
    "change_detection": "Bi-Temporal Change Detection",
    "change_vqa": "Change-Based Visual Question Answering",
    "change_description": "Change Description",
    "optical_sar_fusion": "Optical-SAR Cross-Modal Fusion",
    "general_analysis": "General Remote-Sensing Analysis",
}

TASK_TO_MODEL = {
    "vqa": "RemoteSensingVQAModel",
    "captioning": "RemoteSensingCaptionModel",
    "grounding": "GroundingModel",
    "change_detection": "ChangeDetectionModel",
    "change_vqa": "ChangeVQAModel",
    "change_description": "ChangeDetectionModel",
    "optical_sar_fusion": "OpticalSARFusionModel",
    "general_analysis": "GeospatialAnalysisTools",
}


# ---------------------------------------------------------------------------
# Confidence engine
# ---------------------------------------------------------------------------

def compute_confidence(signals: Dict[str, Optional[float]]) -> Tuple[Optional[float], Dict[str, float]]:
    """
    signals: dict of named evidence signals in [0,1], e.g.:
        - model_confidence
        - evidence_consistency
        - input_compatibility
        - spatial_agreement
        - cross_modal_agreement
    Weighted average of the signals that are actually present.
    Returns (confidence or None, breakdown of contributing weighted values).
    """
    weights = {
        "model_confidence": 0.4,
        "evidence_consistency": 0.2,
        "input_compatibility": 0.15,
        "spatial_agreement": 0.15,
        "cross_modal_agreement": 0.10,
    }
    present = {k: v for k, v in signals.items() if v is not None}
    if not present:
        return None, {}
    total_weight = sum(weights.get(k, 0.1) for k in present)
    if total_weight == 0:
        return None, {}
    weighted_sum = sum(present[k] * weights.get(k, 0.1) for k in present)
    confidence = weighted_sum / total_weight
    breakdown = {k: round(present[k] * weights.get(k, 0.1) / total_weight, 4) for k in present}
    return round(min(0.99, max(0.01, confidence)), 4), breakdown


def confidence_label(confidence: Optional[float]) -> str:
    if confidence is None:
        return "Confidence unavailable"
    if confidence >= 0.8:
        return "High Confidence"
    if confidence >= 0.6:
        return "Moderate Confidence"
    return "Low Confidence"
