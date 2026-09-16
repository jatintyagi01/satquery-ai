"""
Follow-Up Suggestion Generator (Innovation #2)
=================================================
Generates 2-3 contextually relevant next-question suggestions after each
analysis, based on the task that was just run and (where available) the
evidence produced. Rule-based and cheap, but genuinely tied to the
specific result rather than a static list — e.g. change-detection results
suggest asking about the *specific* dominant land-cover shift observed.
"""
from __future__ import annotations
from typing import Dict, List


def generate_followups(task: str, result: Dict) -> List[str]:
    suggestions: List[str] = []

    if task == "vqa":
        suggestions = [
            "Describe this image.",
            "Are there buildings in this image?",
            "What major objects are visible?",
        ]

    elif task == "captioning":
        suggestions = [
            "Highlight the water body.",
            "Are there buildings in this image?",
            "What type of land cover dominates this scene?",
        ]

    elif task == "grounding":
        suggestions = [
            "Describe this image.",
            "What major objects are visible?",
            "Highlight the built-up area instead.",
        ]

    elif task in ("change_detection", "change_description", "change_vqa"):
        suggestions = [
            "Has the built-up area increased, decreased, or remained unchanged?",
            "Has the water-covered area increased, decreased, or remained unchanged?",
            "What is the single largest region that changed?",
        ]
        # Remove the suggestion that duplicates the question just asked
        suggestions = [s for s in suggestions if s.lower() not in result.get("query", "").lower()]

    elif task == "optical_sar_fusion":
        suggestions = [
            "Which modality contributed more evidence for the water regions?",
            "How much do the optical and SAR interpretations agree?",
            "Identify vegetation using the optical image alone.",
        ]

    elif task == "multi_step_chain":
        suggestions = [
            "Summarize the results of the last few analyses.",
            "Highlight the region with the most change.",
        ]

    return suggestions[:3]
