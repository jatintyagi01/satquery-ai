# SatQuery AI

**An Interactive Vision-Language Assistant for Multimodal Remote-Sensing Image Analysis through Text Queries**

Built for Smart India Hackathon (SIH). A working, agentic web application —
not a mockup — that lets a user upload remote-sensing imagery and ask
natural-language questions, with the system automatically identifying the
task, selecting the right specialist workflow, executing it, and returning
an evidence-grounded, confidence-scored, auditable answer.

---

## 1. Project Overview

Remote-sensing AI today is fragmented: separate tools for land-cover
classification, VQA, captioning, grounding, and change detection, each
requiring domain expertise to operate. **SatQuery AI** unifies these behind
a single natural-language interface, driven by a genuine agentic controller
(not a chatbot with an image attached).

## 2. Problem Statement

Non-expert users need to know sensor types, GIS workflows, remote-sensing
terminology, model selection, and task-specific parameters to get value out
of existing remote-sensing AI tools. This creates a high barrier for
disaster management teams, urban planners, and agricultural monitors who
need fast answers, not a GIS pipeline.

## 3. Solution

A user uploads one image, an optical+SAR pair, or a before/after pair, and
asks a question in plain English. The **Remote Sensing Query Agent**:

1. Interprets the query
2. Validates the input configuration
3. Detects modality (optical / SAR / multispectral)
4. Classifies the task (VQA, captioning, grounding, change detection,
   change-VQA, optical-SAR fusion)
5. Selects the specialist model from a structured registry
6. Executes the workflow
7. Validates outputs and evidence
8. Computes a documented, weighted confidence score
9. Returns an answer with visual evidence and a full execution trace

## 4. Novelty

**Agentic Query-Driven Remote-Sensing AI Framework.** The system decides
*what to do*, not just *how to answer*. The orchestration is a structured
pipeline (`backend/app/agents/orchestrator.py`) with explicit steps, each
logged to an auditable execution trace — this is the key differentiator
from a generic vision-language chatbot.

## 5. Architecture

```
User Query + Imagery
        |
Query Understanding Agent
        |
   Input Validator
        |
    Task Router  ───────────────► Model Registry
        |                                |
        └──────────┬─────────┬─────────┬┴────────┬──────────────┐
                   VQA    Grounding  Captioning  Change    Optical-SAR
                                                            Fusion
        └──────────┴─────────┴─────────┴──────────┴──────────────┘
                        |
               Evidence Validator
                        |
              Response Synthesizer
                        |
   Text + Visual Evidence + Confidence + Execution Trace + Report
```

See `SIH_REQUIREMENTS.md` for the full requirement-to-implementation mapping.

## 6. Features

- Single-image VQA, captioning, and text-guided region grounding
- Bi-temporal change detection, change description, and change-VQA
- Optical-SAR cross-modal fusion with separate optical/SAR/fused evidence panels
- Structured model registry + task router (genuine agentic orchestration)
- Documented, weighted confidence engine (never a random number)
- Full auditable execution trace per analysis
- GeoTIFF/TIFF/PNG/JPEG support with metadata extraction (CRS, bounds, bands, dtype)
- SAR-specific preprocessing (log-scaled backscatter visualization)
- History (SQLite), downloadable PDF reports
- Multi-turn conversational memory, follow-up suggestions, and multi-step reasoning chains
- Self-correcting agent (automatic retry with adjusted parameters on low confidence)
- Interactive region follow-up — click any point on a result overlay for a localized explanation
- Curated sample test-data package covering every mandatory task (see `sample_data/README.md`)
- Evaluation module with an honest SYNTHETIC vs. BENCHMARK distinction
- BigEarthNet-based domain adaptation pipeline (dataset loader + trainer), plus a real trained classifier on labeled synthetic data
- Professional "mission control" UI (React + TypeScript + Tailwind)

## 7. Tech Stack

**Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Lucide icons,
Recharts, Framer Motion, React Router.

**Backend:** Python, FastAPI, Pydantic, SQLAlchemy + SQLite.

**AI/ML:** NumPy, OpenCV, Pillow, Rasterio (GeoTIFF/GDAL-backed I/O),
PyTorch-ready training pipeline for BigEarthNet adaptation.

**Reports:** ReportLab (PDF generation).

## 8. Installation

```bash
git clone <this-repo>
cd satquery-ai
cp .env.example .env
```

### Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000` (interactive API docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` to the backend
(see `vite.config.ts`). Open it in a browser to use the app.

### Production build

```bash
cd frontend && npm run build   # outputs frontend/dist
```

Serve `frontend/dist` with any static file server, with `/api` reverse-proxied
to the FastAPI backend (see `docker-compose.yml` for a containerized setup).

## 9. Environment Setup

All configuration is via environment variables (see `.env.example`) —
no secrets are hardcoded or exposed to the frontend. Key variables:

| Variable | Purpose |
|---|---|
| `SATQUERY_UPLOAD_DIR` | Where uploaded images and generated visuals are stored |
| `SATQUERY_DB_PATH` | SQLite database path for history |
| `SATQUERY_INFERENCE_MODE` | `fallback` (default) or `checkpoint` |
| `SATQUERY_CORS_ORIGINS` | Allowed frontend origins |

## 10. Running the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Health check: `GET http://localhost:8000/api/health`

## 11. Running the Frontend

```bash
cd frontend
npm run dev
```

## 12. Model Setup

See `models/README.md`. By default, all specialist tasks run on
**fallback classical-CV heuristics** (clearly labeled `model_type:
"fallback-heuristic"` everywhere in the UI and API). To plug in a real
trained checkpoint, see the instructions in `models/README.md` and
`training/README.md`.

## 13. Dataset Setup

See `data/README.md`. A curated sample test-data package (`sample_data/`,
distributed separately) requires no dataset download — it covers every
mandatory task with pre-verified queries; upload through the normal
Analyze workflow. For real BigEarthNet/VRSBench/RSVQA/CDVQA usage, see the
paths documented in `data/README.md`.

## 14. Training / Fine-Tuning

See `training/README.md`. Includes a real `BigEarthNetDataset` loader and
`train.py` fine-tuning script. A `--smoke-test` mode verifies the pipeline
end-to-end on synthetic data without requiring the ~66GB BigEarthNet archive.
Also includes `train_sklearn_classifier.py`, which trains a real
RandomForest classifier on labeled synthetic scenes — this checkpoint is
actually loaded and used by the VQA pipeline when present (honestly
labeled `adapted-classifier (synthetic)`, never claimed as BigEarthNet-trained).

## 15. Sample Test Data

A curated package of real-format sample images (single scene, before/after
pair, optical+SAR pair, and a georeferenced GeoTIFF) is provided separately
to demonstrate every mandatory task type end-to-end. Upload them through
the **Analyze** page using the suggested queries in the package's README.
See `SIH_REQUIREMENTS.md` for a note on why this replaces the preloaded
"Demo Mode" scenario runner described in the original problem brief.

## 16. Evaluation

The **Evaluation** page and `/api/evaluation/run` endpoint support VRSBench,
RSVQA, CDVQA, and custom datasets. Results are always labeled SYNTHETIC
RESULTS (computed on synthetic labeled data via the live pipeline) unless real
benchmark files are present under `backend/data/benchmarks/<name>/` — see
`backend/app/evaluation/eval_runner.py`. No fabricated scores are shown.

## 17. API Documentation

Interactive OpenAPI docs are available at `http://localhost:8000/docs` once
the backend is running. Key endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload and validate an image, extract metadata |
| POST | `/api/analyze` | Main agentic analysis endpoint |
| POST | `/api/analyze/region-followup` | Interactive region drill-down on a result overlay |
| POST | `/api/analyze/vqa` \| `/caption` \| `/grounding` \| `/change` \| `/optical-sar` | Task-specific convenience wrappers |
| GET | `/api/history` / GET, DELETE `/api/history/{id}` | Analysis history |
| POST | `/api/history/summarize` | Natural-language summary across recent analyses |
| GET | `/api/models` | Model registry |
| POST | `/api/evaluation/run` | Run evaluation |
| POST | `/api/reports/{analysis_id}` | Generate/download PDF report |

## 18. Project Structure

```
satquery-ai/
├── frontend/            React + TypeScript + Vite + Tailwind UI
├── backend/
│   └── app/
│       ├── main.py
│       ├── api/         REST routes
│       ├── agents/      Orchestrator + task classifier + confidence engine
│       ├── models/      Model/tool registry
│       ├── tools/       Geospatial I/O + fallback CV models
│       ├── services/    Upload, history, report, synthetic-scene services
│       ├── schemas/     Pydantic request/response schemas
│       └── evaluation/  Evaluation harness
├── training/             BigEarthNet dataset loader + training script
├── data/                 Sample/benchmark dataset docs
├── models/               Checkpoint directory
├── SIH_REQUIREMENTS.md
├── DEMO_SCRIPT.md            (walkthrough using sample_data/, not a "Demo Mode" feature)
└── docker-compose.yml
```

## 19. SIH Requirement Mapping

See `SIH_REQUIREMENTS.md` for the complete table mapping every mandatory
SIH requirement to its exact implementation location.

## 20. Limitations

- All specialist "models" currently run classical-CV **fallback heuristics**,
  not trained deep-learning checkpoints — this is honestly labeled
  everywhere (`model_type`, `adapted` fields, UI badges, PDF reports).
- The BigEarthNet training pipeline is real and runnable but has not been
  executed against the full archive in this environment (no GPU / 66GB
  download available here) — see `training/README.md`.
- Evaluation numbers shown by default are SYNTHETIC RESULTS on synthetic data,
  not real VRSBench/RSVQA/CDVQA benchmark scores, unless those dataset
  files are supplied.
- The preloaded "Demo Mode" scenario runner described in the original
  problem brief has been removed at the project owner's request. A curated
  real-format sample-data package (`sample_data/`, distributed separately)
  covers the same task types via the normal upload workflow instead — see
  `SIH_REQUIREMENTS.md` for details.
- Modality detection (optical vs. SAR vs. multispectral) is heuristic
  (band count + statistics) and can be overridden via `modality_hints`.
- Co-registration between before/after or optical/SAR pairs is assumed;
  the system resizes to a common shape rather than performing full
  geometric registration.

## 21. Future Scope

- Replace fallback heuristics with a BigEarthNet/VRSBench-fine-tuned
  vision-language backbone (CLIP-RS / RemoteCLIP-style) behind the same
  `MODEL_REGISTRY` interface.
- Real benchmark loaders for VRSBench, RSVQA, and CDVQA.
- True geometric co-registration (feature matching / SAR-optical
  registration) instead of resize-based alignment.
- Multi-user auth and cloud object storage for uploaded imagery.
- Streaming/async inference progress over WebSockets for large scenes.

---

*No fabricated benchmark scores, fine-tuning claims, or ISRO/SAC results are
included anywhere in this repository. Fallback/synthetic-data inference is
clearly labeled throughout the UI, API responses, and generated reports.*
