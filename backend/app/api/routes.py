"""All REST API routes for SatQuery AI."""
from __future__ import annotations
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
import json

from ..schemas.schemas import (AnalyzeRequest, AnalyzeResponse, ImageMetadata, HistoryItem,
                                 ModelCard, EvaluationRunRequest, EvaluationRunResponse,
                                 RegionFollowupRequest, RegionFollowupResponse,
                                 SummarizeRequest, SummarizeResponse)
from ..services import upload_service, history_service, report_service
from ..agents.orchestrator import orchestrator, OrchestrationError, region_followup as _region_followup
from ..models.registry import list_models
from ..evaluation.eval_runner import run_evaluation
from ..core_config import UPLOAD_DIR

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@router.post("/upload", response_model=ImageMetadata)
async def upload_image(file: UploadFile = File(...)):
    record = upload_service.save_upload(file)
    m = record["meta"]
    return ImageMetadata(
        file_id=record["file_id"], filename=m.get("filename", file.filename),
        size_bytes=m.get("size_bytes", 0), width=m.get("width"), height=m.get("height"),
        bands=m.get("bands"), dtype=m.get("dtype"), crs=m.get("crs"), bounds=m.get("bounds"),
        acquisition_date=m.get("acquisition_date"), modality_guess=m.get("modality_guess"),
        format=m.get("format"), preview_url=record["preview_url"], warnings=m.get("warnings", []),
    )


@router.get("/files/{filename}")
async def get_file(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))


# ---------------------------------------------------------------------------
# Analyze (main agentic endpoint)
# ---------------------------------------------------------------------------
@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    images = []
    for fid in req.image_ids:
        rec = upload_service.get_image(fid)
        images.append(rec)

    try:
        response = orchestrator.run(
            query=req.query, mode=req.mode, images=images,
            modality_hints=req.modality_hints,
            session_id=req.session_id,
        )
    except OrchestrationError as e:
        raise HTTPException(status_code=400, detail=e.user_message)

    history_service.save_analysis(response, req.mode, req.image_ids)
    return response


@router.post("/analyze/region-followup", response_model=RegionFollowupResponse)
async def analyze_region_followup(req: RegionFollowupRequest):
    """Innovation #6 — interactive region drill-down: click a point on a
    change map or grounding overlay and get a localized answer without
    re-running the full pipeline."""
    return _region_followup(req.analysis_id, req.x, req.y, req.query)


# Convenience task-specific endpoints (thin wrappers over /analyze semantics,
# useful for direct integration/testing per SIH API spec).
@router.post("/analyze/vqa", response_model=AnalyzeResponse)
async def analyze_vqa(image_id: str = Form(...), query: str = Form(...)):
    return await analyze(AnalyzeRequest(query=query, mode="single", image_ids=[image_id]))


@router.post("/analyze/caption", response_model=AnalyzeResponse)
async def analyze_caption(image_id: str = Form(...)):
    return await analyze(AnalyzeRequest(query="Describe this image.", mode="single", image_ids=[image_id]))


@router.post("/analyze/grounding", response_model=AnalyzeResponse)
async def analyze_grounding(image_id: str = Form(...), query: str = Form(...)):
    return await analyze(AnalyzeRequest(query=query, mode="single", image_ids=[image_id]))


@router.post("/analyze/change", response_model=AnalyzeResponse)
async def analyze_change(image_id_1: str = Form(...), image_id_2: str = Form(...), query: str = Form("What changed?")):
    return await analyze(AnalyzeRequest(query=query, mode="before_after", image_ids=[image_id_1, image_id_2]))


@router.post("/analyze/optical-sar", response_model=AnalyzeResponse)
async def analyze_optical_sar(image_id_optical: str = Form(...), image_id_sar: str = Form(...),
                               query: str = Form("Identify built-up and water regions using both images.")):
    return await analyze(AnalyzeRequest(query=query, mode="optical_sar",
                                          image_ids=[image_id_optical, image_id_sar],
                                          modality_hints={"image_1": "optical", "image_2": "sar"}))


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------
@router.get("/history", response_model=List[HistoryItem])
async def get_history(limit: int = 50):
    return history_service.list_history(limit)


@router.get("/history/{analysis_id}", response_model=AnalyzeResponse)
async def get_history_item(analysis_id: str):
    r = history_service.get_analysis(analysis_id)
    if not r:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return r


@router.delete("/history/{analysis_id}")
async def delete_history_item(analysis_id: str):
    ok = history_service.delete_analysis(analysis_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"deleted": True}


@router.post("/history/summarize", response_model=SummarizeResponse)
async def summarize_history(req: SummarizeRequest):
    """Innovation #4 — natural-language synthesis across several past
    analyses (task mix, confidence stats, standout findings), computed
    from real stored results, not a fabricated narrative."""
    result = history_service.summarize_analyses(limit=req.limit, analysis_ids=req.analysis_ids)
    return SummarizeResponse(**result)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
@router.get("/models", response_model=List[ModelCard])
async def get_models():
    return [ModelCard(name=m.name, task=m.task, input_type=m.input_type,
                       required_modalities=m.required_modalities, output_type=m.output_type,
                       status=m.status, version=m.version, model_type=m.model_type,
                       adapted=m.adapted, description=m.description) for m in list_models()]


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
@router.post("/evaluation/run", response_model=EvaluationRunResponse)
async def evaluation_run(req: EvaluationRunRequest):
    try:
        result = run_evaluation(req.dataset, req.subset_size)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return EvaluationRunResponse(**result)


@router.get("/evaluation/datasets")
async def evaluation_datasets():
    from ..evaluation.eval_runner import DATASET_INFO, _benchmark_available
    return [{"dataset": k, "task": v["task"], "benchmark_files_present": _benchmark_available(k)}
            for k, v in DATASET_INFO.items()]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
@router.post("/reports/{analysis_id}")
async def generate_report(analysis_id: str):
    r = history_service.get_analysis(analysis_id)
    if not r:
        raise HTTPException(status_code=404, detail="Analysis not found")
    image_meta = []  # image metadata not persisted long-term in this build; report uses response data
    path = report_service.build_report(r, image_meta)
    return FileResponse(path, filename=Path(path).name, media_type="application/pdf")


# ---------------------------------------------------------------------------
# Mission Mode — Autonomous Earth-Observation Investigation
# ---------------------------------------------------------------------------
from ..schemas.mission_schemas import (
    Mission, MissionPlanResponse, StartMissionRequest, MissionSummaryItem
)
from ..services import mission_service
from ..agents.mission_planner import plan_mission


@router.post("/missions/plan", response_model=MissionPlanResponse)
async def api_plan_mission(req: StartMissionRequest):
    return plan_mission(req.objective, len(req.image_ids))


@router.post("/missions/run", response_model=Mission)
async def api_run_mission(req: StartMissionRequest):
    images = []
    for fid in req.image_ids:
        rec = upload_service.get_image(fid)
        images.append(rec)
    return mission_service.run_investigation(req.objective, images, req.session_id)


@router.get("/missions", response_model=List[MissionSummaryItem])
async def api_list_missions(limit: int = 50):
    return mission_service.list_missions(limit)


@router.get("/missions/{mission_id}", response_model=Mission)
async def api_get_mission(mission_id: str):
    m = mission_service.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission investigation not found")
    return m


@router.delete("/missions/{mission_id}")
async def api_delete_mission(mission_id: str):
    ok = mission_service.delete_mission(mission_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"deleted": True}


@router.post("/missions/{mission_id}/report")
async def api_mission_report(mission_id: str):
    m = mission_service.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission investigation not found")
    path = report_service.build_mission_report(m, [])
    return FileResponse(path, filename=Path(path).name, media_type="application/pdf")

