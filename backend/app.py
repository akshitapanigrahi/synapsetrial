"""
Minimal Flask server — serves the frontend and mesh static files.
All game logic runs client-side in Three.js / vanilla JS.
"""

import os
import sys
from flask import Flask, send_from_directory, jsonify

# Allow importing neuron_config from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
STATIC_DIR   = os.path.join(FRONTEND_DIR, "static")
MESH_DIR     = os.path.join(STATIC_DIR, "meshes")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)


@app.route("/api/mesh-manifest")
def mesh_manifest():
    """Return label→bodyId mapping and whether each OBJ file is on disk.
    The frontend uses this to decide whether to load real meshes or fall
    back to procedural geometry per neuron."""
    from neuron_config import NEURON_IDS, NEURON_LABELS

    neurons = []
    for label, body_id in zip(NEURON_LABELS, NEURON_IDS):
        obj_path = os.path.join(MESH_DIR, f"{body_id}.obj")
        neurons.append({
            "label":     label,
            "bodyId":    body_id,
            "available": os.path.exists(obj_path),
        })
    return jsonify({"neurons": neurons})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
