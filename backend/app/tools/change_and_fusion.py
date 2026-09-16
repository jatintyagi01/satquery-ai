"""
Bi-temporal change detection and optical-SAR fusion fallback tools.
Classical, explainable computer-vision implementations (differencing,
thresholding, morphology) matching the SIH-mandated output structure:
change_map, change_regions, change_score.
"""
from __future__ import annotations
from typing import Dict, List, Tuple
import numpy as np
import cv2
from .vision_tools import compute_landcover_stats


def align_shapes(a: np.ndarray, b: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    h = min(a.shape[0], b.shape[0])
    w = min(a.shape[1], b.shape[1])
    a_r = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA)
    b_r = cv2.resize(b, (w, h), interpolation=cv2.INTER_AREA)
    return a_r, b_r


def detect_change(img_t1: np.ndarray, img_t2: np.ndarray, sensitivity: float = 1.0) -> Dict:
    """sensitivity < 1.0 lowers the effective change threshold (more sensitive,
    used by the orchestrator's self-correction retry loop, Innovation #3);
    sensitivity == 1.0 is the standard Otsu-adaptive threshold."""
    a, b = align_shapes(img_t1, img_t2)
    gray_a = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
    gray_b = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY).astype(np.float32)
    diff = cv2.absdiff(gray_a, gray_b)
    diff_blur = cv2.GaussianBlur(diff, (5, 5), 0)
    diff_blur_u8 = diff_blur.astype(np.uint8)

    # Otsu threshold for adaptive change segmentation
    otsu_val, change_mask = cv2.threshold(diff_blur_u8, 0, 255,
                                           cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if sensitivity != 1.0:
        adjusted = max(1, min(254, otsu_val * sensitivity))
        _, change_mask = cv2.threshold(diff_blur_u8, adjusted, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3, 3), np.uint8)
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_OPEN, kernel)
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_CLOSE, kernel)

    change_pct = float(np.sum(change_mask > 0)) / change_mask.size * 100.0

    contours, _ = cv2.findContours(change_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = 0.001 * change_mask.size
    diff_norm = diff_blur / (diff_blur.max() + 1e-6)
    regions = []
    for c in contours:
        area = cv2.contourArea(c)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(c)
            # Region confidence (Innovation #11): mean normalized diff intensity
            # within the region -- a strong, consistent difference is more
            # trustworthy than a faint one that just cleared the Otsu threshold.
            region_diff = diff_norm[y:y + h, x:x + w]
            region_confidence = float(np.clip(0.4 + region_diff.mean() * 1.2, 0.2, 0.97))
            regions.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h),
                             "area_pct": float(area) / change_mask.size * 100.0,
                             "confidence": round(region_confidence, 3)})
    regions = sorted(regions, key=lambda r: -r["area_pct"])[:10]

    stats_a = compute_landcover_stats(a)
    stats_b = compute_landcover_stats(b)

    # Visualization: change map heat overlay + red-highlighted overlay on "after" image
    heat = cv2.applyColorMap(diff_blur.astype(np.uint8), cv2.COLORMAP_JET)
    heat_rgb = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)

    overlay = b.copy()
    red = np.zeros_like(overlay)
    red[..., 0] = 255
    alpha = (change_mask > 0).astype(np.float32)[..., None] * 0.5
    overlay = (overlay * (1 - alpha) + red * alpha).astype(np.uint8)

    # Uncertainty-aware region outlines (Innovation #11): outline each region
    # in green/amber/red based on its own confidence, with a text label.
    for r in regions:
        conf = r["confidence"]
        box_color = (60, 220, 100) if conf >= 0.75 else (255, 180, 40) if conf >= 0.5 else (255, 70, 70)
        cv2.rectangle(overlay, (r["x"], r["y"]), (r["x"] + r["w"], r["y"] + r["h"]), box_color, 2)
        cv2.putText(overlay, f"{conf*100:.0f}%", (r["x"], max(12, r["y"] - 5)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, box_color, 1, cv2.LINE_AA)

    return {
        "aligned_before": a,
        "aligned_after": b,
        "change_mask": change_mask,
        "change_heatmap": heat_rgb,
        "change_overlay": overlay,
        "change_regions": regions,
        "change_pct": change_pct,
        "stats_before": stats_a,
        "stats_after": stats_b,
    }


def change_vqa_answer(query: str, change_result: Dict) -> Tuple[str, float, List[str], Dict[str, float]]:
    q = query.lower()
    sa, sb = change_result["stats_before"], change_result["stats_after"]
    change_pct = change_result["change_pct"]
    evidence = [f"Overall changed area estimated at {change_pct:.1f}% of the scene "
                f"({len(change_result['change_regions'])} distinct change regions detected)"]
    # Signals surfaced for the knowledge-grounding layer (Innovation #8)
    delta_signals = {
        "change_pct": change_pct,
        "built_up_delta": sb["built_up_pct"] - sa["built_up_pct"],
        "water_delta": sb["water_pct"] - sa["water_pct"],
        "vegetation_delta": sb["vegetation_pct"] - sa["vegetation_pct"],
    }

    def trend(key, label):
        delta = sb[key] - sa[key]
        if abs(delta) < 1.0:
            return f"{label} remained roughly unchanged ({sa[key]:.1f}% -> {sb[key]:.1f}%)"
        direction = "increased" if delta > 0 else "decreased"
        return f"{label} {direction} from {sa[key]:.1f}% to {sb[key]:.1f}%"

    if "built" in q or "urban" in q:
        evidence.append(trend("built_up_pct", "Built-up coverage"))
        delta = sb["built_up_pct"] - sa["built_up_pct"]
        if delta > 1.0:
            answer = f"Built-up area has increased between the two dates ({sa['built_up_pct']:.1f}% -> {sb['built_up_pct']:.1f}%)."
        elif delta < -1.0:
            answer = f"Built-up area has decreased between the two dates ({sa['built_up_pct']:.1f}% -> {sb['built_up_pct']:.1f}%)."
        else:
            answer = f"Built-up area has remained approximately unchanged ({sa['built_up_pct']:.1f}% -> {sb['built_up_pct']:.1f}%)."
        conf = min(0.92, 0.55 + abs(delta) / 20)
        return answer, conf, evidence, delta_signals

    if "water" in q or "flood" in q:
        evidence.append(trend("water_pct", "Water coverage"))
        delta = sb["water_pct"] - sa["water_pct"]
        if delta > 1.0:
            answer = f"Water-covered area has increased ({sa['water_pct']:.1f}% -> {sb['water_pct']:.1f}%), consistent with flooding or inundation."
        elif delta < -1.0:
            answer = f"Water-covered area has decreased ({sa['water_pct']:.1f}% -> {sb['water_pct']:.1f}%), consistent with recession/drying."
        else:
            answer = f"Water-covered area is approximately unchanged ({sa['water_pct']:.1f}% -> {sb['water_pct']:.1f}%)."
        conf = min(0.92, 0.55 + abs(delta) / 20)
        return answer, conf, evidence, delta_signals

    if "vegetation" in q or "forest" in q or "crop" in q:
        evidence.append(trend("vegetation_pct", "Vegetation coverage"))
        delta = sb["vegetation_pct"] - sa["vegetation_pct"]
        direction = "increased" if delta > 1 else ("decreased" if delta < -1 else "remained stable")
        answer = f"Vegetation coverage has {direction} ({sa['vegetation_pct']:.1f}% -> {sb['vegetation_pct']:.1f}%)."
        conf = min(0.92, 0.55 + abs(delta) / 20)
        return answer, conf, evidence, delta_signals

    if "what changed" in q or "where" in q or "describe" in q:
        top_region = change_result["change_regions"][0] if change_result["change_regions"] else None
        loc = ""
        if top_region:
            loc = f" The largest change region covers approximately {top_region['area_pct']:.1f}% of the scene."
        answer = (f"Approximately {change_pct:.1f}% of the scene changed between the two acquisition dates."
                   f"{loc} Built-up coverage moved from {sa['built_up_pct']:.1f}% to {sb['built_up_pct']:.1f}%, "
                   f"vegetation from {sa['vegetation_pct']:.1f}% to {sb['vegetation_pct']:.1f}%, "
                   f"and water from {sa['water_pct']:.1f}% to {sb['water_pct']:.1f}%.")
        conf = min(0.9, 0.5 + change_pct / 40)
        return answer, conf, evidence, delta_signals

    answer = (f"Overall change magnitude is {change_pct:.1f}% of the scene area, detected across "
              f"{len(change_result['change_regions'])} regions.")
    conf = min(0.85, 0.5 + change_pct / 40)
    return answer, conf, evidence, delta_signals


def optical_sar_fusion(optical_rgb: np.ndarray, sar_rgb: np.ndarray, query: str) -> Dict:
    a, b = align_shapes(optical_rgb, sar_rgb)
    optical_stats = compute_landcover_stats(a)

    sar_gray = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY).astype(np.float32)
    # Log-scale backscatter visualization (SAR-specific handling)
    sar_log = np.log1p(sar_gray)
    sar_log_norm = ((sar_log - sar_log.min()) / (sar_log.max() - sar_log.min() + 1e-6) * 255).astype(np.uint8)

    # Low backscatter -> smooth surfaces (water); high backscatter + high local variance -> built-up
    low_backscatter = sar_gray < np.percentile(sar_gray, 25)
    local_var = cv2.Laplacian(sar_gray, cv2.CV_32F)
    local_var = cv2.GaussianBlur(np.abs(local_var), (5, 5), 0)
    high_structure = local_var > np.percentile(local_var, 70)

    water_optical = compute_landcover_stats(a)["water_pct"]

    # Fusion logic: water = optical water cue AND SAR low backscatter; built-up = optical built-up cue OR SAR high structure
    from .vision_tools import get_mask
    water_mask_opt = get_mask(a, "water") > 0
    builtup_mask_opt = get_mask(a, "built_up") > 0

    fused_water = water_mask_opt & low_backscatter
    fused_builtup = builtup_mask_opt | (high_structure & ~fused_water)

    fused_vis = a.copy()
    overlay = np.zeros_like(fused_vis)
    overlay[fused_water] = [0, 120, 255]
    overlay[fused_builtup] = [255, 60, 60]
    alpha = 0.5
    mask_any = (fused_water | fused_builtup)[..., None].astype(np.float32) * alpha
    fused_vis = (fused_vis * (1 - mask_any) + overlay * mask_any).astype(np.uint8)

    water_pct = float(np.sum(fused_water)) / fused_water.size * 100
    builtup_pct = float(np.sum(fused_builtup)) / fused_builtup.size * 100
    agreement = float(np.sum(water_mask_opt & low_backscatter)) / max(1, np.sum(water_mask_opt | low_backscatter))

    return {
        "sar_backscatter_vis": np.stack([sar_log_norm] * 3, axis=-1),
        "fused_overlay": fused_vis,
        "optical_aligned": a,
        "sar_aligned": b,
        "water_pct_fused": water_pct,
        "builtup_pct_fused": builtup_pct,
        "cross_modal_agreement": agreement,
        "optical_stats": optical_stats,
    }
