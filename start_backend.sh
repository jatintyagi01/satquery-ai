#!/usr/bin/env bash
# Starts the SatQuery AI FastAPI backend.
set -e
cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ] && [ "$1" == "--venv" ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
elif [ -d ".venv" ]; then
  source .venv/bin/activate
fi

echo "Starting SatQuery AI backend on http://localhost:8000 (docs at /docs)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
