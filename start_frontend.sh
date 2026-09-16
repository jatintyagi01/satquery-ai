#!/usr/bin/env bash
# Starts the SatQuery AI React frontend (expects backend running on :8000).
set -e
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  npm install
fi

echo "Starting SatQuery AI frontend on http://localhost:5173"
npm run dev -- --host 0.0.0.0 --port 5173
