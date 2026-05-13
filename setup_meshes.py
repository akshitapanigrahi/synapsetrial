#!/usr/bin/env python3
"""
Download neuron meshes from multiple CloudVolume sources and write the
frontend mesh manifest so the game knows which OBJs are available.

Usage:
  python3 setup_meshes.py              # download missing OBJs only
  python3 setup_meshes.py --force      # re-download everything

To change which neurons appear, edit neuron_config.json then re-run.
"""

import json
import os
import sys

OUTPUT_DIR   = "frontend/static/meshes"
MANIFEST_OUT = "frontend/static/mesh-manifest.json"


def _check_imports():
    try:
        import cloudvolume  # noqa: F401
    except ImportError:
        print("cloud-volume not installed.  Run: pip install cloud-volume")
        sys.exit(1)


def _load_config():
    config_path = os.path.join(os.path.dirname(__file__), "neuron_config.json")
    with open(config_path) as f:
        return json.load(f)["sources"]


def _fetch_source(vol, neurons, force, lod):
    pending = [
        n for n in neurons
        if force or not os.path.exists(os.path.join(OUTPUT_DIR, f"{n['body_id']}.obj"))
    ]
    for n in neurons:
        if n not in pending:
            print(f"  [{n['label']}] {n['body_id']}.obj already present — skipping")

    if not pending:
        return

    pending_ids = [n["body_id"] for n in pending]
    kwargs = {"lod": lod} if lod is not None else {}

    meshes = {}
    try:
        meshes = vol.mesh.get(pending_ids, **kwargs)
    except Exception as batch_err:
        print(f"  Batch fetch failed ({batch_err}). Falling back to one-by-one...")
        for n in pending:
            try:
                result = vol.mesh.get([n["body_id"]], **kwargs)
                meshes.update(result)
            except Exception as e:
                print(f"  [{n['label']}] {n['body_id']} — FAILED: {e}")

    for n in pending:
        body_id = n["body_id"]
        if body_id not in meshes:
            print(f"  [{n['label']}] {body_id} — no mesh returned, skipping")
            continue
        out_path = os.path.join(OUTPUT_DIR, f"{body_id}.obj")
        with open(out_path, "wb") as f:
            f.write(meshes[body_id].to_obj())
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  [{n['label']}] Saved {body_id}.obj  ({size_kb} KB)")


def _write_manifest(sources):
    neurons = []
    for source in sources:
        for n in source["neurons"]:
            obj_path = os.path.join(OUTPUT_DIR, f"{n['body_id']}.obj")
            neurons.append({
                "label":     n["label"],
                "bodyId":    n["body_id"],
                "available": os.path.exists(obj_path),
            })
    os.makedirs(os.path.dirname(MANIFEST_OUT), exist_ok=True)
    with open(MANIFEST_OUT, "w") as f:
        json.dump({"neurons": neurons}, f, indent=2)
    available = sum(1 for n in neurons if n["available"])
    print(f"\nManifest written → {MANIFEST_OUT}  ({available}/{len(neurons)} available)")


def download_meshes(force: bool = False):
    _check_imports()
    from cloudvolume import CloudVolume

    sources = _load_config()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for source in sources:
        cv_path = source["cv_path"]
        lod     = source.get("lod")   # None = don't pass lod arg (dataset has one resolution)
        neurons = source["neurons"]

        print(f"\nConnecting to {cv_path} …")
        try:
            vol = CloudVolume(cv_path, use_https=True, progress=False, fill_missing=True)
        except Exception as e:
            print(f"  Connection failed: {e}")
            continue

        print(f"Fetching {len(neurons)} meshes (lod={lod}) …\n")
        _fetch_source(vol, neurons, force, lod)

    _write_manifest(sources)
    print("\nDone.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    download_meshes(force=force)
