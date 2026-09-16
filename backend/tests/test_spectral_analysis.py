"""
Unit tests for the Advanced Spectral & Biophysical Change Analysis module.
"""
import pytest
import numpy as np

from app.tools.spectral_analysis import (
    compute_spectral_bands,
    compute_rms_spectral_distance,
    compute_biophysical_radar_data,
    analyze_spectral_and_biophysical_change,
    generate_ai_interpretation,
)
from app.tools.change_and_fusion import detect_change
from app.agents.orchestrator import orchestrator, region_followup


def test_compute_spectral_bands():
    # Synthetic Before and After images
    t1 = np.full((100, 100, 3), 120, dtype=np.uint8)
    t2 = np.full((100, 100, 3), 160, dtype=np.uint8)

    bands = compute_spectral_bands(t1, t2)
    assert len(bands) >= 6
    for b in bands:
        assert "band" in b
        assert "T1_Before" in b
        assert "T2_After" in b
        assert "delta" in b
        assert b["T2_After"] >= 0


def test_spectral_distance_rms():
    t1 = np.zeros((100, 100, 3), dtype=np.uint8)
    t2 = np.full((100, 100, 3), 255, dtype=np.uint8)

    dist = compute_rms_spectral_distance(t1, t2)
    assert dist > 1.0

    # Identical images
    dist_same = compute_rms_spectral_distance(t1, t1)
    assert dist_same <= 0.1


def test_biophysical_radar_rgb_vs_multispectral():
    t1 = np.full((100, 100, 3), 100, dtype=np.uint8)
    t2 = np.full((100, 100, 3), 150, dtype=np.uint8)

    radar, flags = compute_biophysical_radar_data(t1, t2, meta_a={"bands": 3}, meta_b={"bands": 3})
    assert len(radar) >= 6
    assert flags["has_nir"] is False
    assert flags["is_sar"] is False


def test_detect_change_attaches_spectral_analysis():
    t1 = np.full((100, 100, 3), 80, dtype=np.uint8)
    t2 = np.full((100, 100, 3), 180, dtype=np.uint8)
    # Add a distinct change patch
    t2[20:60, 20:60] = [240, 240, 240]

    res = detect_change(t1, t2)
    assert "advanced_change_analysis" in res
    adv = res["advanced_change_analysis"]
    assert "global_cards" in adv
    assert "spectral_bands" in adv
    assert "biophysical_radar" in adv
    assert "spectral_distance" in adv
    assert "ai_interpretation" in adv
    assert len(adv["global_cards"]) == 4


def test_orchestrator_change_e2e():
    t1 = np.full((128, 128, 3), 70, dtype=np.uint8)
    t2 = np.full((128, 128, 3), 140, dtype=np.uint8)
    t2[30:70, 30:70] = [230, 230, 230]

    images = [
        {"file_id": "img1", "array": t1, "meta": {"bands": 3, "modality_guess": "optical"}},
        {"file_id": "img2", "array": t2, "meta": {"bands": 3, "modality_guess": "optical"}},
    ]

    resp = orchestrator.run(
        query="What changed between these images?",
        mode="before_after",
        images=images,
    )

    assert resp.advanced_change_analysis is not None
    assert "global_cards" in resp.advanced_change_analysis
    assert "spectral_bands" in resp.advanced_change_analysis
    assert "biophysical_radar" in resp.advanced_change_analysis

    # Test region follow-up on the detected change area (e.g. at x=40, y=40)
    followup = region_followup(resp.analysis_id, x=40, y=40)
    assert followup.in_region is True
    assert followup.region_spectral_data is not None
