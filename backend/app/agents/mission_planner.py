"""Mission Planner Agent for SatQuery AI.

Translates high-level natural language Earth-observation objectives into
dynamic, ordered task execution graphs for remote-sensing investigation.
"""
from __future__ import annotations
import uuid
import re
from typing import List, Dict, Any, Tuple
from ..schemas.mission_schemas import MissionTask, MissionPlanResponse


MISSION_PRESETS = {
    "flood_agriculture": {
        "title": "Flood Impact & Agricultural Assessment",
        "keywords": ["flood", "inundat", "water damage", "overflow", "submerg", "drown"],
        "target_land": "agriculture",
        "tasks_template": [
            ("t1", "Understanding Objective", "Decompose flood and agricultural vulnerability indicators", "planning"),
            ("t2", "Preparing Imagery", "Co-register spatial bounds and radiometric calibration", "baseline"),
            ("t3", "Analyzing Baseline Land Cover", "Extract pre-event agricultural canopy and water boundaries", "baseline"),
            ("t4", "Comparing Current Observation", "Analyze post-event surface reflectance and moisture markers", "temporal"),
            ("t5", "Detecting Temporal Changes", "Execute bi-temporal difference segmentation and thresholding", "temporal"),
            ("t6", "Analyzing SAR Surface Response", "Examine microwave backscatter for specular water reflection", "sar"),
            ("t7", "Identifying Affected Agricultural Regions", "Compute intersection of change mask with agricultural parcels", "impact"),
            ("t8", "Calculating Affected Area", "Compute metric scale square kilometers of inundated cropland", "impact"),
            ("t9", "Preparing Investigation Findings", "Compile optical, temporal, and SAR evidence into mission summary", "synthesis"),
        ],
    },
    "urban_expansion": {
        "title": "Urban Expansion & Infrastructure Development",
        "keywords": ["urban", "city", "built", "construction", "development", "sprawl", "building", "infrastructure"],
        "target_land": "built_up",
        "tasks_template": [
            ("t1", "Understanding Objective", "Identify targets for urban sprawl and built-up conversion", "planning"),
            ("t2", "Preparing Imagery", "Spatial normalization and multi-date alignment", "baseline"),
            ("t3", "Analyzing Baseline Footprint", "Segment existing urban settlements and impervious boundaries", "baseline"),
            ("t4", "Comparing Current Observation", "Detect new high-reflectance structural development", "temporal"),
            ("t5", "Detecting Temporal Changes", "Delineate ground clearance and surface modification zones", "temporal"),
            ("t6", "Analyzing Structural Texture", "Evaluate edge density and local structural backscatter", "sar"),
            ("t7", "Identifying New Development Zones", "Extract contiguous new built-up clusters", "impact"),
            ("t8", "Calculating Expansion Area", "Calculate net square kilometers of converted urban surface", "impact"),
            ("t9", "Preparing Investigation Findings", "Synthesize development metrics and structural change report", "synthesis"),
        ],
    },
    "forest_loss": {
        "title": "Vegetation & Forest Canopy Loss Investigation",
        "keywords": ["forest", "tree", "deforest", "canopy", "loss", "fire", "burn", "logging", "clearance", "vegetation loss"],
        "target_land": "vegetation",
        "tasks_template": [
            ("t1", "Understanding Objective", "Parameterize canopy loss and biomass disturbance criteria", "planning"),
            ("t2", "Preparing Imagery", "Calibrate multi-spectral band alignment and surface reflectance", "baseline"),
            ("t3", "Analyzing Baseline Canopy", "Map pre-disturbance healthy forest and canopy density", "baseline"),
            ("t4", "Comparing Current Observation", "Measure green leaf reflectance decrease and bare soil exposure", "temporal"),
            ("t5", "Detecting Temporal Changes", "Segment canopy disturbance anomalies across multi-temporal pair", "temporal"),
            ("t6", "Analyzing Surface Scatter", "Evaluate radar volumetric scattering reduction", "sar"),
            ("t7", "Identifying Deforested Regions", "Isolate contiguous canopy loss polygons", "impact"),
            ("t8", "Calculating Lost Area", "Compute total square kilometers of affected tree cover", "impact"),
            ("t9", "Preparing Investigation Findings", "Assemble environmental loss assessment and evidence", "synthesis"),
        ],
    },
    "water_body": {
        "title": "Water Body Dynamics & Reservoir Investigation",
        "keywords": ["water", "river", "lake", "reservoir", "recession", "drying", "drought", "shoreline", "pond"],
        "target_land": "water",
        "tasks_template": [
            ("t1", "Understanding Objective", "Formulate hydrologic boundary and surface water tracking plan", "planning"),
            ("t2", "Preparing Imagery", "Normalize multi-spectral water absorption channels", "baseline"),
            ("t3", "Analyzing Baseline Shoreline", "Delineate historical water body surface area", "baseline"),
            ("t4", "Comparing Current Observation", "Evaluate shoreline shift and surface water spectral index", "temporal"),
            ("t5", "Detecting Temporal Changes", "Segment expanding or receding water surface boundaries", "temporal"),
            ("t6", "Analyzing Microwave Specular Response", "Cross-validate dielectric surface moisture via SAR", "sar"),
            ("t7", "Identifying Dynamic Hydrological Regions", "Classify perennial vs seasonal water boundary changes", "impact"),
            ("t8", "Calculating Surface Water Delta", "Calculate net change in water surface area (km²)", "impact"),
            ("t9", "Preparing Investigation Findings", "Synthesize hydrologic evidence into mission report", "synthesis"),
        ],
    },
}


def classify_mission_type(objective: str) -> Tuple[str, str]:
    obj_lower = objective.lower()
    for m_type, preset in MISSION_PRESETS.items():
        if any(kw in obj_lower for kw in preset["keywords"]):
            return m_type, preset["title"]
    return "custom_investigation", "Custom Earth-Observation Investigation"


def plan_mission(objective: str, image_count: int = 2) -> MissionPlanResponse:
    mission_type, mission_title = classify_mission_type(objective)

    needs_additional = False
    missing_warning = None

    # Investigations naturally require at least 2 images (baseline + current)
    # for temporal, flood, expansion, or loss detection.
    if image_count < 2:
        needs_additional = True
        missing_warning = (
            "A baseline observation is required for temporal comparison. "
            "Please select or upload both baseline (earlier) and current observations."
        )

    # Pick task template
    preset = MISSION_PRESETS.get(mission_type)
    if preset:
        tasks_raw = preset["tasks_template"]
    else:
        # Generic dynamic task graph
        tasks_raw = [
            ("t1", "Understanding Objective", f"Decompose objective: '{objective[:60]}...'", "planning"),
            ("t2", "Preparing Imagery", "Co-register and radiometrically normalize input observations", "baseline"),
            ("t3", "Analyzing Baseline Observation", "Extract baseline land-cover composition and spectral signatures", "baseline"),
            ("t4", "Comparing Current Observation", "Measure spectral shifts and radiometric variations", "temporal"),
            ("t5", "Detecting Temporal Changes", "Segment multi-temporal change polygons", "temporal"),
            ("t6", "Analyzing Multi-Sensor Evidence", "Corroborate findings with secondary sensor/SAR backscatter", "sar"),
            ("t7", "Identifying Target Impact Regions", "Isolate candidate regions matching investigation criteria", "impact"),
            ("t8", "Calculating Quantitative Area", "Compute metric scale square kilometers of affected territory", "impact"),
            ("t9", "Preparing Investigation Findings", "Assemble structured evidence cards and mission summary", "synthesis"),
        ]

    tasks = [
        MissionTask(
            task_id=f"step_{idx+1}",
            title=title,
            description=desc,
            category=cat,
            status="pending",
        )
        for idx, (_, title, desc, cat) in enumerate(tasks_raw)
    ]

    # Determine required analytics based on task categories (exclude planning)
    required_analytics = [cat for cat in {cat for _, _, _, cat in tasks_raw} if cat != "planning"]

    return MissionPlanResponse(
        objective=objective,
        mission_type=mission_type,
        mission_title=mission_title,
        required_inputs_description="Baseline Optical Image + Current Optical Image (SAR optional)",
        needs_additional_imagery=needs_additional,
        missing_input_warning=missing_warning,
        required_analytics=required_analytics,
        tasks=tasks,
    )
