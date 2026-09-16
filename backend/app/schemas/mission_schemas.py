"""Pydantic request/response schemas for SatQuery AI Mission Mode."""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MissionTask(BaseModel):
    task_id: str
    title: str
    description: str
    category: str  # planning | baseline | temporal | sar | impact | synthesis
    status: str = "pending"  # pending | running | completed | needs_input | failed
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    output_summary: Optional[str] = None
    error_message: Optional[str] = None


class MissionEvidenceCard(BaseModel):
    title: str
    category: str
    description: str
    modality: str  # optical | sar | temporal | domain
    status: str = "verified"  # verified | unavailable | inferred


class MissionAffectedRegion(BaseModel):
    region_id: str
    bbox: List[int]  # [x, y, w, h]
    area_km2: float
    area_pct: float
    change_type: str
    land_type: str
    temporal_status: str
    evidence_summary: str


class MissionStatistics(BaseModel):
    total_scene_area_km2: float
    changed_area_km2: float
    changed_area_pct: float
    agricultural_affected_km2: float
    agricultural_affected_pct: float
    water_expansion_km2: float
    built_up_expansion_km2: float
    vegetation_loss_km2: float


class MissionPlanResponse(BaseModel):
    objective: str
    mission_type: str
    mission_title: str
    required_inputs_description: str
    needs_additional_imagery: bool
    missing_input_warning: Optional[str] = None
    required_analytics: List[str] = Field(default_factory=list)
    tasks: List[MissionTask]


class StartMissionRequest(BaseModel):
    objective: str
    image_ids: List[str]
    session_id: Optional[str] = None


class Mission(BaseModel):
    mission_id: str
    objective: str
    mission_type: str
    mission_title: str
    status: str = "running"  # running | completed | failed | needs_input
    created_at: str
    completed_at: Optional[str] = None
    image_ids: List[str]
    tasks: List[MissionTask] = Field(default_factory=list)
    visual_outputs: Dict[str, str] = Field(default_factory=dict)
    primary_finding: str
    executive_summary: str
    key_findings: List[str] = Field(default_factory=list)
    evidence_cards: List[MissionEvidenceCard] = Field(default_factory=list)
    affected_regions: List[MissionAffectedRegion] = Field(default_factory=list)
    statistics: MissionStatistics
    missing_input_warning: Optional[str] = None
    limitations: List[str] = Field(default_factory=list)


class MissionSummaryItem(BaseModel):
    mission_id: str
    mission_title: str
    objective: str
    mission_type: str
    status: str
    created_at: str
    changed_area_km2: float
