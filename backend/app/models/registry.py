"""
MODEL REGISTRY
==============
Structured metadata for every specialist model/tool the agent can route to.
The orchestrator (agents/orchestrator.py) queries this registry to select
the correct tool for a given task rather than hardcoding logic inline.

Each entry mirrors the SIH-required conceptual structure:
{
  "name": ...,
  "task": ...,
  "required_inputs": [...],
  "output": [...]
}
"""
from __future__ import annotations
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List


@dataclass
class ModelSpec:
    name: str
    task: str
    input_type: str
    required_modalities: List[str]
    output_type: List[str]
    model_path: str
    supported_formats: List[str]
    parameters: dict = field(default_factory=dict)
    model_type: str = "fallback-heuristic"  # or "finetuned-checkpoint" / "pretrained-vlm"
    adapted: bool = False
    version: str = "0.1.0"
    description: str = ""
    status: str = "ready"


def _detect_vqa_classifier_status() -> tuple[str, bool, str]:
    """Innovation #7: honestly reflect whether the trained synthetic
    land-cover classifier checkpoint is present, without ever claiming
    real-dataset fine-tuning."""
    ckpt_dir = Path(__file__).resolve().parent.parent.parent.parent / "models" / "checkpoints"
    ckpt = ckpt_dir / "synthetic_landcover_classifier.joblib"
    metrics_path = ckpt_dir / "synthetic_landcover_classifier_metrics.json"
    if ckpt.exists():
        note = ""
        if metrics_path.exists():
            try:
                metrics = json.loads(metrics_path.read_text())
                accs = [f"{k}={v['accuracy']*100:.0f}%" for k, v in metrics.get("metrics", {}).items()]
                note = f" Held-out accuracy on synthetic data: {', '.join(accs)}."
            except Exception:
                pass
        return ("adapted-classifier (synthetic)", True,
                "Answers presence questions (water/built-up) using a trained RandomForest classifier "
                "fit on labeled synthetic scenes; falls back to heuristic thresholds for other question "
                "types. NOT trained on real satellite imagery or BigEarthNet." + note)
    return ("fallback-heuristic", False,
            "Answers natural-language questions about a single remote-sensing scene using spectral "
            "statistics, texture and heuristic land-cover cues. Architecture is ready to load a "
            "BigEarthNet-adapted VLM checkpoint, or the lighter synthetic-classifier checkpoint from "
            "training/train_sklearn_classifier.py.")


_VQA_MODEL_TYPE, _VQA_ADAPTED, _VQA_DESCRIPTION = _detect_vqa_classifier_status()


MODEL_REGISTRY: dict[str, ModelSpec] = {
    "RemoteSensingVQAModel": ModelSpec(
        name="RemoteSensingVQAModel",
        task="vqa",
        input_type="single_image",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["answer", "confidence", "evidence_regions"],
        model_path="models/checkpoints/synthetic_landcover_classifier.joblib" if _VQA_ADAPTED
                    else "models/checkpoints/rs_vqa.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        model_type=_VQA_MODEL_TYPE,
        adapted=_VQA_ADAPTED,
        description=_VQA_DESCRIPTION,
    ),
    "RemoteSensingCaptionModel": ModelSpec(
        name="RemoteSensingCaptionModel",
        task="captioning",
        input_type="single_image",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["caption", "confidence"],
        model_path="models/checkpoints/rs_caption.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        description="Generates a scene-level natural language description using land-cover "
                     "composition, dominant colors/textures and spatial layout heuristics.",
    ),
    "GroundingModel": ModelSpec(
        name="GroundingModel",
        task="grounding",
        input_type="single_image",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["mask", "bounding_boxes", "confidence"],
        model_path="models/checkpoints/rs_grounding.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        description="Locates the region referenced by a text query (e.g. 'the water body') "
                     "using color/spectral segmentation and connected-component analysis.",
    ),
    "ChangeDetectionModel": ModelSpec(
        name="ChangeDetectionModel",
        task="change_detection",
        input_type="bi_temporal_pair",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["change_map", "change_regions", "change_score"],
        model_path="models/checkpoints/change_det.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        description="Detects pixel-level and region-level change between two co-registered "
                     "images using differencing, thresholding and morphological analysis.",
    ),
    "ChangeVQAModel": ModelSpec(
        name="ChangeVQAModel",
        task="change_vqa",
        input_type="bi_temporal_pair",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["answer", "confidence"],
        model_path="models/checkpoints/change_vqa.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        description="Answers questions about change between two images "
                     "(e.g. increase/decrease/unchanged) using the change map and "
                     "per-class area statistics from both dates.",
    ),
    "OpticalSARFusionModel": ModelSpec(
        name="OpticalSARFusionModel",
        task="optical_sar_fusion",
        input_type="cross_modal_pair",
        required_modalities=["optical", "sar"],
        output_type=["fused_regions", "optical_evidence", "sar_evidence", "confidence"],
        model_path="models/checkpoints/optical_sar_fusion.pt (not present -> fallback active)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        description="Combines optical spectral/contextual cues with SAR structural/backscatter "
                     "cues to jointly identify classes such as built-up and water regions.",
    ),
    "GeospatialAnalysisTools": ModelSpec(
        name="GeospatialAnalysisTools",
        task="general_analysis",
        input_type="any",
        required_modalities=["optical", "sar", "multispectral"],
        output_type=["metadata", "statistics"],
        model_path="n/a (deterministic geospatial utilities, rasterio/GDAL based)",
        supported_formats=[".tif", ".tiff", ".png", ".jpg", ".jpeg"],
        model_type="deterministic-tool",
        description="Extracts CRS, bounds, band count, resolution and other metadata; "
                     "computes NDWI-like/texture statistics used by other specialist models.",
    ),
}


def get_model(name: str) -> ModelSpec:
    if name not in MODEL_REGISTRY:
        raise KeyError(f"Model '{name}' not found in registry")
    return MODEL_REGISTRY[name]


def list_models() -> List[ModelSpec]:
    return list(MODEL_REGISTRY.values())


def models_for_task(task: str) -> List[ModelSpec]:
    return [m for m in MODEL_REGISTRY.values() if m.task == task]
