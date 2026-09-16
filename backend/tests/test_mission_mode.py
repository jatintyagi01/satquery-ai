import pytest
import io
import numpy as np
from PIL import Image
from app.agents.mission_planner import plan_mission
from app.services.mission_service import run_investigation, list_missions, get_mission
from app.services.report_service import build_mission_report


def _create_synthetic_image_array(color=(100, 150, 80), size=(200, 200)) -> np.ndarray:
    arr = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    # Add some variations to trigger classification/vegetation
    arr[20:80, 20:80] = [30, 200, 30]    # Vegetation green
    arr[100:160, 100:160] = [20, 50, 220] # Water blue
    return arr


def test_mission_planner_flood_objective():
    plan = plan_mission(
        objective="Investigate whether flooding has affected agricultural land in this district",
        image_count=2,
    )
    assert plan.mission_type == "flood_agriculture"
    assert len(plan.tasks) >= 3
    assert plan.needs_additional_imagery is False
    assert any("flood" in t.task_id or "crop" in t.description.lower() or "flood" in t.description.lower() for t in plan.tasks)


def test_mission_planner_missing_baseline():
    plan = plan_mission(
        objective="Check flood damage",
        image_count=1,
    )
    assert plan.needs_additional_imagery is True
    assert plan.missing_input_warning is not None
    assert "baseline" in plan.missing_input_warning.lower()



def test_mission_planner_urban_objective():
    plan = plan_mission(
        objective="Analyze urban sprawl and new construction",
        image_count=2,
    )
    assert plan.mission_type == "urban_expansion"
    assert len(plan.tasks) >= 2


def test_mission_planner_custom_objective():
    plan = plan_mission(
        objective="Inspect military airfield runway changes",
        image_count=2,
    )
    assert plan.mission_type == "custom_investigation"
    assert len(plan.tasks) >= 2



def test_run_investigation_end_to_end():
    img1 = _create_synthetic_image_array(color=(120, 160, 90))
    img2 = _create_synthetic_image_array(color=(60, 100, 200)) # Change to flooded/water

    images = [
        {"file_id": "test_t1", "array": img1, "meta": {"bands": 3, "filename": "t1.png", "width": 200, "height": 200}},
        {"file_id": "test_t2", "array": img2, "meta": {"bands": 3, "filename": "t2.png", "width": 200, "height": 200}},
    ]

    mission = run_investigation(
        objective="Investigate whether flooding has affected agricultural land in this district",
        images=images,
    )

    assert mission.mission_id is not None
    assert mission.status == "completed"
    assert len(mission.tasks) >= 3
    assert all(t.status == "completed" for t in mission.tasks)
    assert mission.statistics.total_scene_area_km2 > 0
    assert len(mission.key_findings) >= 1
    assert len(mission.evidence_cards) >= 1
    assert len(mission.executive_summary) > 50

    # Ensure mission is in database
    retrieved = get_mission(mission.mission_id)
    assert retrieved is not None
    assert retrieved.mission_id == mission.mission_id

    all_missions = list_missions()
    assert any(m.mission_id == mission.mission_id for m in all_missions)

    # Test PDF Report Generation
    pdf_path = build_mission_report(mission, [img["meta"] for img in images])
    assert pdf_path is not None
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    assert len(pdf_bytes) > 100
    assert pdf_bytes.startswith(b"%PDF")


