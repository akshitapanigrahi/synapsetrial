"""
Minimal Flask server — serves the frontend and mesh static files.
All game logic runs client-side in Three.js / vanilla JS.
"""

import json
import os
import sys
from flask import Flask, send_from_directory, jsonify

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


def _load_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "neuron_config.json")
    with open(config_path) as f:
        sources = json.load(f)["sources"]
    neurons = []
    for source in sources:
        for n in source["neurons"]:
            neurons.append((n["label"], n["body_id"]))
    return neurons


@app.route("/api/mesh-manifest")
def mesh_manifest():
    """Return label→bodyId mapping and whether each OBJ file is on disk."""
    neurons = []
    for label, body_id in _load_config():
        obj_path = os.path.join(MESH_DIR, f"{body_id}.obj")
        neurons.append({
            "label":     label,
            "bodyId":    body_id,
            "available": os.path.exists(obj_path),
        })
    return jsonify({"neurons": neurons})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
