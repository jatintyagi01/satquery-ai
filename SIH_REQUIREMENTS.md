# SIH Requirement Mapping

Every mandatory requirement from the problem brief, mapped to its exact
implementation location in this repository.

> **Known deviation from the original brief:** the problem brief's Section
> 33 mandates a preloaded "Demo Mode" scenario runner. That feature was
> **removed from this build at the project owner's explicit request** (see
> row 21 below). A curated real-image sample-data package is provided as
> a replacement so every task type can still be demonstrated end-to-end
> without requiring a large dataset download — see `sample_data/README.md`.
> If Demo Mode is required for evaluation, it can be restored from the
> project's git history / a prior build; the underlying synthetic-scene
> generator (`backend/app/services/demo_service.py`) was kept intact and
> still powers the Evaluation module's synthetic-results fallback.

| # | SIH Requirement | SatQuery AI Implementation | Location |
|---|---|---|---|
| 1 | Remote-Sensing Adaptation (fine-tune/adapt on RS data) | `BigEarthNetDataset` loader + `train.py` fine-tuning script for a 4-band CNN backbone. **Not yet executed on the full archive** — honestly labeled `adapted: false` everywhere until a real checkpoint is trained and wired in. | `training/dataset.py`, `training/train.py`, `training/config.yaml` |
| 2 | Single-Image VQA (mandatory) | `RemoteSensingVQAModel` — HSV/land-cover heuristic answer engine with keyword-driven question handling, confidence, and evidence | `backend/app/tools/vision_tools.py::answer_vqa`, routed via `agents/orchestrator.py` |
| 3 | Additional single-image task (captioning and/or grounding) | **Both** implemented: `RemoteSensingCaptionModel` (scene-composition captioning) and `GroundingModel` (query→class→mask→bounding boxes) | `vision_tools.py::generate_caption`, `vision_tools.py::ground_query` |
| 4 | Multitemporal Change Understanding (mandatory) | `ChangeDetectionModel` (diff + Otsu threshold + morphology → change map, regions, score) and `ChangeVQAModel` (trend answers using before/after land-cover stats) | `backend/app/tools/change_and_fusion.py` |
| 5 | Optical-SAR Analysis (mandatory) | `OpticalSARFusionModel` — combines optical spectral/segmentation cues with SAR log-scaled backscatter + structure cues; UI shows separate Optical / SAR / Fused panels | `change_and_fusion.py::optical_sar_fusion`, `frontend/src/components/ResultsPanel.tsx` |
| 6 | Agentic Orchestration (most important) | `Orchestrator.run()` — 13-step structured pipeline (interpret → validate → detect modality → validate compatibility → classify task → select model → execute → validate output → combine → confidence → evidence → trace → synthesize response). Not "ask an LLM to do everything." | `backend/app/agents/orchestrator.py` |
| 7 | Model/Tool Registry | 7 structured `ModelSpec` entries with name/task/required_inputs/output/model_path/parameters | `backend/app/models/registry.py` |
| 8 | Query Routing / Task Classification | Pattern-based classifier mapping query + mode + image count → one of 8 task types, displayed in the UI | `backend/app/agents/confidence_and_router.py::classify_task` |
| 9 | Fallback Architecture (must run without GPU/large models) | Every specialist tool has a classical-CV fallback implementation that always runs; `model_type` field distinguishes fallback vs. checkpoint; architecture ready for real checkpoints | `backend/app/tools/*.py`, `models/registry.py` |
| 10 | Datasets (BigEarthNet / VRSBench / RSVQA / CDVQA) | BigEarthNet loader for adaptation; VRSBench/RSVQA/CDVQA wired into the Evaluation module's dataset registry | `training/dataset.py`, `backend/app/evaluation/eval_runner.py` |
| 11 | Evaluation Module | Dedicated Evaluation page/API; computes real metrics on synthetic labeled data (SYNTHETIC RESULTS) when benchmark files are absent; never fabricates scores | `backend/app/evaluation/eval_runner.py`, `frontend/src/pages/EvaluationPage.tsx` |
| 12 | ISRO/SAC Evaluation Compatibility | Generic `/api/upload` + `/api/analyze` accept any GeoTIFF with CRS/bounds metadata and hidden reference annotations without UI changes; no fake ISRO/SAC results included | `backend/app/tools/geo_io.py`, `data/README.md` |
| 13 | Geospatial Image Processing | Rasterio-based GeoTIFF reading, band handling, CRS/bounds extraction, normalization, RGB rendering, resizing | `backend/app/tools/geo_io.py` |
| 14 | SAR-Specific Handling | Log-scaled backscatter visualization, distinct SAR preprocessing path, explicit "SAR preprocessing applied" evidence in fusion output | `change_and_fusion.py::optical_sar_fusion` |
| 15 | Confidence System (no random numbers) | Documented weighted combination of model confidence, evidence consistency, input compatibility, spatial agreement, cross-modal agreement; returns `None` → "Confidence unavailable" when signals are insufficient | `backend/app/agents/confidence_and_router.py::compute_confidence` |
| 16 | Evidence Panel | Every response includes structured evidence items (spectral cues, coverage %, cross-modal agreement, region counts) | `AnalyzeResponse.evidence`, `frontend/src/components/ResultsPanel.tsx` |
| 17 | Execution Trace | 13-step auditable trace with tool, status, input/output summary, and timing per analysis; never exposes private chain-of-thought | `Orchestrator._step()`, `frontend/src/components/ExecutionTracePanel.tsx` |
| 18 | Downloadable Report | PDF report with query, metadata, task, models used, answer, confidence, evidence, visuals, execution trace | `backend/app/services/report_service.py` |
| 19 | History | SQLite-backed history with open/delete/download-report actions | `backend/app/services/history_service.py`, `frontend/src/pages/HistoryPage.tsx` |
| 20 | Models Page | Lists all 7 registry entries with purpose/input/output/type/version/status | `frontend/src/pages/ModelsPage.tsx` |
| 21 | Sample Test Data | The user-facing "Demo Mode" scenario runner has been removed from this build by project-owner request. In its place, a curated sample-image package (`sample_data/`, delivered separately) covers every mandatory task with pre-verified queries; upload through the normal Analyze workflow | `sample_data/README.md` |
| 22 | Error Handling | Explicit validation errors for wrong image counts, unsupported formats, size limits, missing files, with user-facing messages matching the brief's examples | `backend/app/agents/orchestrator.py`, `backend/app/services/upload_service.py` |
| 23 | Security | Filename sanitization, extension allowlist, file size limits, no secrets in frontend, environment-variable configuration | `backend/app/services/upload_service.py`, `backend/app/core_config.py`, `.env.example` |
| 24 | Responsive / Professional UI | Dark space/earth "mission control" theme, glassmorphism cards, grid backgrounds, professional typography | `frontend/src/index.css`, `frontend/src/components/ui/primitives.tsx` |
| 25 | Honesty Rule (no fabricated results) | No hardcoded accuracy/benchmark/ISRO numbers anywhere; `is_benchmark` flag and explicit notes distinguish synthetic vs. real results | `backend/app/evaluation/eval_runner.py` |

## Priority order followed during implementation

1. Agentic orchestration — ✅ implemented and tested end-to-end
2. Single-image VQA — ✅ implemented and tested
3. Bi-temporal change analysis — ✅ implemented and tested
4. Optical-SAR analysis — ✅ implemented and tested
5. Grounding — ✅ implemented and tested
6. Captioning — ✅ implemented and tested
7. Remote-sensing adaptation pipeline — ✅ real, runnable code; not executed on full archive (documented limitation)
8. Evaluation framework — ✅ implemented, honest synthetic/benchmark distinction
9. Report generation — ✅ implemented and tested (PDF verified)
10. Advanced UI features — ✅ before/after slider, optical/SAR/fused panels, confidence rings, execution trace UI
