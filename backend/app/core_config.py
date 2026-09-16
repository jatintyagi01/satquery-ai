"""
Central configuration for SatQuery AI backend.
All environment-driven settings live here. Never hardcode secrets.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.getenv("SATQUERY_UPLOAD_DIR", BASE_DIR / "uploads"))
REPORTS_DIR = Path(os.getenv("SATQUERY_REPORTS_DIR", BASE_DIR / "reports_out"))
DATA_DIR = Path(os.getenv("SATQUERY_DATA_DIR", BASE_DIR / "data"))
DB_PATH = Path(os.getenv("SATQUERY_DB_PATH", BASE_DIR / "satquery.db"))
MODELS_DIR = Path(os.getenv("SATQUERY_MODELS_DIR", BASE_DIR.parent.parent / "models"))

MAX_UPLOAD_MB = int(os.getenv("SATQUERY_MAX_UPLOAD_MB", "50"))
ALLOWED_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}

# Inference mode: "fallback" (classical CV / heuristic, always available)
# or "checkpoint" (real trained model, loaded from MODELS_DIR if present).
INFERENCE_MODE = os.getenv("SATQUERY_INFERENCE_MODE", "fallback")

DEFAULT_CONFIDENCE_THRESHOLD = float(os.getenv("SATQUERY_CONF_THRESHOLD", "0.5"))

CORS_ORIGINS = os.getenv("SATQUERY_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

for d in (UPLOAD_DIR, REPORTS_DIR, DATA_DIR, MODELS_DIR):
    d.mkdir(parents=True, exist_ok=True)
