"""
Fallback vision tools for remote-sensing analysis.

These are REAL, deterministic, classical computer-vision implementations
(color/spectral thresholding, texture statistics, connected components).
They are explicitly labeled as fallback/demo inference where a trained
vision-language checkpoint is not present (see MODEL_REGISTRY[*].model_type).

The functions are written so a real model call (e.g. a BigEarthNet-adapted
CLIP/VLM checkpoint) can be substituted behind the same interface with no
change to the orchestrator or API layer.
"""
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import json
import numpy as np
import cv2

# ---------------------------------------------------------------------------
# Optional trained classifier (Innovation #7) — loaded once at import time if
# present. Falls back cleanly to pure heuristic thresholds when absent, so
# the app always runs even without the checkpoint.
# ---------------------------------------------------------------------------
_CLASSIFIER_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models" / "checkpoints"
_CLASSIFIER_PATH = _CLASSIFIER_DIR / "synthetic_landcover_classifier.joblib"
_METRICS_PATH = _CLASSIFIER_DIR / "synthetic_landcover_classifier_metrics.json"

_CLASSIFIER_BUNDLE: Optional[dict] = None
_CLASSIFIER_METRICS: Optional[dict] = None

try:
    if _CLASSIFIER_PATH.exists():
        import joblib
        _CLASSIFIER_BUNDLE = joblib.load(_CLASSIFIER_PATH)
        if _METRICS_PATH.exists():
            _CLASSIFIER_METRICS = json.loads(_METRICS_PATH.read_text())
except Exception:
    _CLASSIFIER_BUNDLE = None  # any load failure -> silently use heuristic fallback


def classifier_available() -> bool:
    return _CLASSIFIER_BUNDLE is not None


def classifier_metrics() -> Optional[dict]:
    return _CLASSIFIER_METRICS


FEATURE_ORDER = ["water_pct", "vegetation_pct", "built_up_pct", "bare_soil_pct",
                  "brightness_mean", "texture_std"]


def _classifier_predict(label_name: str, stats: Dict[str, float]) -> Optional[float]:
    """Returns predicted probability of presence for a given label, or None
    if the classifier/label is unavailable."""
    if _CLASSIFIER_BUNDLE is None or label_name not in _CLASSIFIER_BUNDLE.get("models", {}):
        return None
    model = _CLASSIFIER_BUNDLE["models"][label_name]
    x = np.array([[stats[f] for f in FEATURE_ORDER]], dtype=np.float32)
    try:
        proba = model.predict_proba(x)[0]
        # proba[1] is probability of class "1" (present), if both classes exist
        return float(proba[1]) if len(proba) > 1 else float(proba[0])
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Land-cover style statistics (used by VQA, captioning, grounding, fusion)
# ---------------------------------------------------------------------------

def compute_landcover_stats(rgb: np.ndarray) -> Dict[str, float]:
    """Approximate land-cover class coverage using color heuristics on an
    8-bit RGB rendering. This is intentionally simple/explainable rather
    than a black box, and is documented as a fallback signal."""
    img = rgb.astype(np.float32)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    total = img.shape[0] * img.shape[1]

    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(np.float32), hsv[..., 1].astype(np.float32), hsv[..., 2].astype(np.float32)

    # Water: low brightness OR clearly blue-dominant with sufficient saturation, hue ~90-140 (cv2 scale 0-179)
    water_mask = ((h > 85) & (h < 140) & (b > r + 15) & (s > 40) & (v < 200)) | ((v < 60) & (s < 60))
    # Vegetation: green dominant, hue ~35-85
    veg_mask = (h > 25) & (h < 90) & (g > r) & (g > b * 0.9)
    # Built-up / urban: low saturation, mid-high brightness, gray-ish
    builtup_mask = (s < 40) & (v > 90) & (v < 230) & (~water_mask) & (~veg_mask)
    # Bare soil: warm hue, moderate saturation
    soil_mask = (h < 25) & (s > 30) & (~water_mask) & (~veg_mask) & (~builtup_mask)

    def pct(mask):
        return float(np.sum(mask)) / total * 100.0

    stats = {
        "water_pct": pct(water_mask),
        "vegetation_pct": pct(veg_mask),
        "built_up_pct": pct(builtup_mask),
        "bare_soil_pct": pct(soil_mask),
        "brightness_mean": float(np.mean(v)),
        "texture_std": float(np.std(cv2.Laplacian(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), cv2.CV_32F))),
    }
    other = max(0.0, 100.0 - sum([stats["water_pct"], stats["vegetation_pct"],
                                   stats["built_up_pct"], stats["bare_soil_pct"]]))
    stats["other_pct"] = other
    return stats


def get_mask(rgb: np.ndarray, class_name: str) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(np.float32), hsv[..., 1].astype(np.float32), hsv[..., 2].astype(np.float32)
    r, g, b = rgb[..., 0].astype(np.float32), rgb[..., 1].astype(np.float32), rgb[..., 2].astype(np.float32)

    if class_name == "water":
        mask = ((h > 85) & (h < 140) & (b > r + 15) & (s > 40) & (v < 200)) | ((v < 60) & (s < 60))
    elif class_name == "vegetation":
        mask = (h > 25) & (h < 90) & (g > r) & (g > b * 0.9)
    elif class_name == "built_up":
        water = ((h > 85) & (h < 140) & (b > r + 15) & (s > 40) & (v < 200)) | ((v < 60) & (s < 60))
        veg = (h > 25) & (h < 90) & (g > r) & (g > b * 0.9)
        mask = (s < 40) & (v > 90) & (v < 230) & (~water) & (~veg)
    elif class_name == "bare_soil":
        water = ((h > 85) & (h < 140) & (b > r + 15) & (s > 40) & (v < 200)) | ((v < 60) & (s < 60))
        veg = (h > 25) & (h < 90) & (g > r) & (g > b * 0.9)
        mask = (h < 25) & (s > 30) & (~water) & (~veg)
    else:
        mask = np.zeros(rgb.shape[:2], dtype=bool)
    return mask.astype(np.uint8) * 255


QUERY_CLASS_KEYWORDS = {
    "water": ["water", "river", "lake", "flood", "pond", "sea", "reservoir"],
    "vegetation": ["vegetation", "forest", "tree", "crop", "agricultur", "farm", "green", "plant"],
    "built_up": ["built", "building", "urban", "city", "settlement", "road", "infrastructure", "house"],
    "bare_soil": ["soil", "bare", "barren", "desert", "sand"],
}


def detect_target_class(query: str) -> str:
    q = query.lower()
    for cls, kws in QUERY_CLASS_KEYWORDS.items():
        if any(kw in q for kw in kws):
            return cls
    return "built_up"  # sensible default focus for grounding demos


# ---------------------------------------------------------------------------
# VQA (fallback heuristic)
# ---------------------------------------------------------------------------

def answer_vqa(query: str, stats: Dict[str, float], modality: str) -> Tuple[str, float, List[str]]:
    q = query.lower()
    evidence = []
    dominant = max(
        [("water", stats["water_pct"]), ("vegetation", stats["vegetation_pct"]),
         ("built-up", stats["built_up_pct"]), ("bare soil", stats["bare_soil_pct"])],
        key=lambda x: x[1],
    )

    if any(k in q for k in ["water", "river", "lake", "flood"]):
        clf_proba = _classifier_predict("water_present", stats)
        if clf_proba is not None:
            present = clf_proba > 0.5
            answer = (f"Yes, water is present, covering approximately {stats['water_pct']:.1f}% of the scene "
                       f"(classifier confidence {clf_proba*100:.1f}%)."
                       if present else
                       f"No significant water body is detected (classifier confidence "
                       f"{(1-clf_proba)*100:.1f}% for absence; {stats['water_pct']:.1f}% raw coverage).")
            evidence.append(f"Prediction from trained RandomForest classifier "
                             f"(synthetic-data validated, see models/checkpoints/*_metrics.json)")
            evidence.append(f"Water-class pixel coverage estimated at {stats['water_pct']:.1f}%")
            conf = max(clf_proba, 1 - clf_proba)
            return answer, conf, evidence
        present = stats["water_pct"] > 3.0
        answer = (f"Yes, water is present, covering approximately {stats['water_pct']:.1f}% of the scene."
                   if present else
                   f"No significant water body is detected (only {stats['water_pct']:.1f}% coverage).")
        evidence.append(f"Water-class pixel coverage estimated at {stats['water_pct']:.1f}%")
        conf = min(0.95, 0.55 + stats["water_pct"] / 100.0 * 2)
        return answer, conf, evidence

    if any(k in q for k in ["building", "urban", "built", "settlement", "infrastructure"]):
        clf_proba = _classifier_predict("built_up_present", stats)
        if clf_proba is not None:
            present = clf_proba > 0.5
            answer = (f"Yes, built-up/urban structures are visible, covering approximately "
                       f"{stats['built_up_pct']:.1f}% of the scene (classifier confidence {clf_proba*100:.1f}%)."
                       if present else
                       f"Minimal built-up area detected (classifier confidence {(1-clf_proba)*100:.1f}% for "
                       f"absence; {stats['built_up_pct']:.1f}% raw coverage); scene appears predominantly "
                       f"natural/rural.")
            evidence.append(f"Prediction from trained RandomForest classifier "
                             f"(synthetic-data validated, see models/checkpoints/*_metrics.json)")
            evidence.append(f"Built-up-class pixel coverage estimated at {stats['built_up_pct']:.1f}%")
            conf = max(clf_proba, 1 - clf_proba)
            return answer, conf, evidence
        present = stats["built_up_pct"] > 3.0
        answer = (f"Yes, built-up/urban structures are visible, covering approximately "
                   f"{stats['built_up_pct']:.1f}% of the scene."
                   if present else
                   f"Minimal built-up area detected ({stats['built_up_pct']:.1f}% coverage); "
                   f"the scene appears predominantly natural/rural.")
        evidence.append(f"Built-up-class pixel coverage estimated at {stats['built_up_pct']:.1f}%")
        conf = min(0.93, 0.55 + stats["built_up_pct"] / 100.0 * 2)
        return answer, conf, evidence

    if any(k in q for k in ["vegetation", "crop", "forest", "agricultur", "farm", "green"]):
        present = stats["vegetation_pct"] > 3.0
        answer = (f"Vegetation/agricultural land is present, covering approximately "
                   f"{stats['vegetation_pct']:.1f}% of the scene."
                   if present else
                   f"Limited vegetation is detected ({stats['vegetation_pct']:.1f}% coverage).")
        evidence.append(f"Vegetation-class pixel coverage estimated at {stats['vegetation_pct']:.1f}%")
        conf = min(0.93, 0.55 + stats["vegetation_pct"] / 100.0 * 2)
        return answer, conf, evidence

    if any(k in q for k in ["land cover", "land-cover", "what type", "class"]):
        answer = (f"The scene is predominantly {dominant[0]} ({dominant[1]:.1f}% coverage), "
                  f"with vegetation {stats['vegetation_pct']:.1f}%, built-up {stats['built_up_pct']:.1f}%, "
                  f"water {stats['water_pct']:.1f}%, and bare soil {stats['bare_soil_pct']:.1f}%.")
        evidence.append("Per-class pixel coverage computed from color/HSV heuristic segmentation")
        return answer, 0.8, evidence

    if any(k in q for k in ["object", "major", "visible", "see", "identify"]):
        parts = []
        if stats["built_up_pct"] > 3: parts.append("built-up structures")
        if stats["vegetation_pct"] > 3: parts.append("vegetation/cropland")
        if stats["water_pct"] > 3: parts.append("water bodies")
        if stats["bare_soil_pct"] > 3: parts.append("bare soil/exposed ground")
        if not parts:
            parts = ["a largely homogeneous surface without a strongly dominant land-cover class"]
        answer = "The major visible elements include: " + ", ".join(parts) + "."
        evidence.append("Aggregated from land-cover coverage statistics")
        return answer, 0.75, evidence

    # Generic fallback
    answer = (f"Based on scene analysis, the area is dominated by {dominant[0]} "
              f"({dominant[1]:.1f}% coverage). Brightness mean {stats['brightness_mean']:.1f}, "
              f"texture variance {stats['texture_std']:.1f} suggest "
              f"{'a heterogeneous, structured surface' if stats['texture_std'] > 300 else 'a relatively uniform surface'}.")
    evidence.append("General scene statistics used as fallback evidence")
    return answer, 0.6, evidence


# ---------------------------------------------------------------------------
# Captioning (fallback heuristic)
# ---------------------------------------------------------------------------

def generate_caption(stats: Dict[str, float], modality: str) -> Tuple[str, float]:
    parts = []
    ordered = sorted(
        [("vegetation", stats["vegetation_pct"]), ("built-up areas", stats["built_up_pct"]),
         ("water bodies", stats["water_pct"]), ("bare soil", stats["bare_soil_pct"])],
        key=lambda x: -x[1],
    )
    described = [f"{name} ({pct:.0f}%)" for name, pct in ordered if pct > 2.0]
    modality_txt = {"sar": "a SAR (radar) scene", "multispectral": "a multispectral satellite scene",
                     "optical": "an optical satellite image"}.get(modality, "a remote-sensing image")
    if described:
        caption = f"This is {modality_txt} showing " + ", ".join(described) + "."
    else:
        caption = f"This is {modality_txt} with a relatively uniform surface and no strongly dominant land-cover class."
    texture_note = " The surface texture appears heterogeneous, suggesting mixed land use." \
        if stats["texture_std"] > 300 else " The surface texture appears fairly uniform."
    caption += texture_note
    conf = 0.7 if described else 0.55
    return caption, conf


# ---------------------------------------------------------------------------
# Grounding (fallback heuristic)
# ---------------------------------------------------------------------------

def ground_query(rgb: np.ndarray, query: str, min_area_frac: float = 0.001
                  ) -> Tuple[np.ndarray, List[List[int]], str, float, List[float]]:
    """Returns (binary mask, bounding_boxes[x,y,w,h], class_name, overall_confidence,
    per_box_confidence). Per-box confidence (Innovation #5 — pixel-level reasoning)
    is the mask-fill density within that specific box, i.e. how solidly the
    detected region matches the target class versus being a loose/noisy detection."""
    cls = detect_target_class(query)
    mask = get_mask(rgb, cls)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    min_area = min_area_frac * rgb.shape[0] * rgb.shape[1]
    for c in contours:
        area = cv2.contourArea(c)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(c)
            boxes.append([int(x), int(y), int(w), int(h)])
    boxes = sorted(boxes, key=lambda b: -b[2] * b[3])[:8]

    per_box_conf = []
    for (x, y, w, h) in boxes:
        region = mask[y:y + h, x:x + w]
        density = float(np.sum(region > 0)) / max(1, region.size)
        per_box_conf.append(round(min(0.97, 0.35 + density * 0.65), 3))

    coverage = float(np.sum(mask > 0)) / mask.size
    overall_conf = min(0.92, 0.5 + coverage * 3) if boxes else 0.3
    return mask, boxes, cls, overall_conf, per_box_conf


def overlay_mask(rgb: np.ndarray, mask: np.ndarray, boxes: List[List[int]],
                  box_confidences: List[float] = None, color=(255, 60, 60)) -> np.ndarray:
    """Renders the mask overlay plus per-region bounding boxes color-coded and
    labeled by confidence (Innovation #11 — uncertainty-aware overlays):
    green = high confidence, amber = moderate, red = low."""
    out = rgb.copy()
    colored = np.zeros_like(out)
    colored[..., 0] = color[0]
    colored[..., 1] = color[1]
    colored[..., 2] = color[2]
    alpha = (mask > 0).astype(np.float32)[..., None] * 0.45
    out = (out * (1 - alpha) + colored * alpha).astype(np.uint8)

    box_confidences = box_confidences or [None] * len(boxes)
    for (x, y, w, h), conf in zip(boxes, box_confidences):
        if conf is None:
            box_color = (255, 255, 0)
        elif conf >= 0.75:
            box_color = (60, 220, 100)
        elif conf >= 0.5:
            box_color = (255, 180, 40)
        else:
            box_color = (255, 70, 70)
        cv2.rectangle(out, (x, y), (x + w, y + h), box_color, 2)
        if conf is not None:
            label = f"{conf*100:.0f}%"
            cv2.putText(out, label, (x, max(12, y - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, box_color, 1, cv2.LINE_AA)
    return out
