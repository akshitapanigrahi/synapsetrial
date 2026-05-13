#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Prefer the project venv if present, fall back to system python3
PYTHON="${PWD}/.venv/bin/python3"
if [ ! -x "$PYTHON" ]; then PYTHON="python3"; fi

# Install Python dependencies if needed
if ! "$PYTHON" -c "import flask, cloudvolume" 2>/dev/null; then
  echo "Installing Python dependencies..."
  if command -v uv &>/dev/null && [ -x "${PWD}/.venv/bin/python3" ]; then
    uv pip install -r requirements.txt --python "${PWD}/.venv/bin/python3" -q
  else
    pip3 install -r requirements.txt
  fi
fi

# Download OBJ meshes if none are present yet.
# Edit neuron_config.py to change which neurons are used, then run:
#   python3 setup_meshes.py
# to re-download.
MESH_COUNT=$(ls frontend/static/meshes/*.obj 2>/dev/null | wc -l | tr -d ' ')
if [ "$MESH_COUNT" -eq 0 ]; then
  echo "No OBJ meshes found — downloading via CloudVolume..."
  "$PYTHON" setup_meshes.py
fi

echo ""
echo "  Synapse Game — BCI Bit Rate Maximizer"
echo "  ─────────────────────────────────────"
echo "  Open http://localhost:5050 in your browser"
echo ""

"$PYTHON" -m backend.app
