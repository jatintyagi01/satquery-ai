"""Pydantic request/response schemas for SatQuery AI."""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ImageMetadata(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    bands: Optional[int] = None
    dtype: Optional[str] = None
    crs: Optional[str] = None
    bounds: Optional[List[float]] = None
    acquisition_date: Optional[str] = None
    modality_guess: Optional[str] = None
    format: Optional[str] = None
    preview_url: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    query: str
    mode: str = Field(description="single | optical_sar | before_after")
    image_ids: List[str]
    modality_hints: Optional[Dict[str, str]] = None  # e.g. {"image_1": "optical", "image_2": "sar"}
    session_id: Optional[str] = None  # enables multi-turn conversational follow-ups


class ChainStep(BaseModel):
    step_index: int
    query: str
    task: str
    task_display: str
    answer: str
    confidence: Optional[float] = None


class RetryAttempt(BaseModel):
    attempt: int
    confidence: Optional[float] = None
    note: str


class RegionFollowupRequest(BaseModel):
    analysis_id: str
    x: int  # pixel x on the reference visual (0..width)
    y: int  # pixel y on the reference visual (0..height)
    query: Optional[str] = None


class RegionFollowupResponse(BaseModel):
    analysis_id: str
    x: int
    y: int
    in_region: bool
    summary: str
    local_stats: Dict[str, float] = Field(default_factory=dict)


class SummarizeRequest(BaseModel):
    limit: int = 5
    analysis_ids: Optional[List[str]] = None  # if provided, overrides limit


class SummarizeResponse(BaseModel):
    summary: str
    analyses_included: List[str]
    count: int


class TraceStep(BaseModel):
    step: str
    tool: str
    status: str  # ok | warning | error
    input_summary: str
    output_summary: str
    processing_time_ms: float


class EvidenceItem(BaseModel):
    label: str
    detail: str
    supports: bool = True


class AnalyzeResponse(BaseModel):
    analysis_id: str
    query: str
    task: str
    task_display: str
    agent: str
    selected_model: str
    answer: str
    confidence: Optional[float] = None
    confidence_label: str
    confidence_breakdown: Dict[str, float] = Field(default_factory=dict)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    visual_outputs: Dict[str, str] = Field(default_factory=dict)  # name -> url/path
    trace: List[TraceStep] = Field(default_factory=list)
    metadata_used: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str
    is_demo: bool = False
    warnings: List[str] = Field(default_factory=list)

    # --- Innovation additions ---
    session_id: Optional[str] = None
    suggested_followups: List[str] = Field(default_factory=list)
    clarification_needed: bool = False
    clarification_options: List[str] = Field(default_factory=list)
    chain_steps: List[ChainStep] = Field(default_factory=list)
    retries: List[RetryAttempt] = Field(default_factory=list)
    followup_context_used: bool = False


class HistoryItem(BaseModel):
    analysis_id: str
    query: str
    task: str
    mode: str
    confidence: Optional[float]
    timestamp: str


class ModelCard(BaseModel):
    name: str
    task: str
    input_type: str
    required_modalities: List[str]
    output_type: List[str]
    status: str
    version: str
    model_type: str
    adapted: bool
    description: str


class EvaluationRunRequest(BaseModel):
    dataset: str  # vrsbench | rsvqa | cdvqa | custom
    subset_size: int = 10


class EvaluationRunResponse(BaseModel):
    dataset: str
    task: str
    num_samples: int
    metrics: Dict[str, float]
    is_benchmark: bool
    notes: str
