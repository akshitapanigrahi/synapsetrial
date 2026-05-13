#!/usr/bin/env python3
"""
Download hemibrain neuron meshes via CloudVolume.

Usage:
  python3 setup_meshes.py              # download all IDs in neuron_config.py
  python3 setup_meshes.py --force      # re-download even if OBJ already exists

To change which neurons appear in the game, edit neuron_config.py.
"""

import os
import sys

OUTPUT_DIR = "frontend/static/meshes"
CV_PATH    = "gs://flyem-male-cns/v0.9/segmentation"

LOD        = 2      # level of detail: 0=finest, 2=coarser but fast to download

def _check_imports():
    try:
        import cloudvolume  # noqa: F401
    except ImportError:
        print("cloud-volume not installed.\nRun: pip install cloud-volume")
        sys.exit(1)


def download_meshes(force: bool = False):
    _check_imports()
    from cloudvolume import CloudVolume
    from neuron_config import NEURON_IDS, NEURON_LABELS

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Separate already-present from still-needed
    pending_ids    = []
    pending_labels = []
    for body_id, label in zip(NEURON_IDS, NEURON_LABELS):
        out_path = os.path.join(OUTPUT_DIR, f"{body_id}.obj")
        if not force and os.path.exists(out_path):
            print(f"  [{label}] {body_id}.obj already present — skipping")
        else:
            pending_ids.append(body_id)
            pending_labels.append(label)

    if not pending_ids:
        print("All meshes already downloaded.")
        return

    print(f"\nConnecting to CloudVolume ({CV_PATH})...")
    vol = CloudVolume(CV_PATH, use_https=True, progress=False, fill_missing=True)

    print(f"Fetching {len(pending_ids)} meshes at lod={LOD}...\n")

    # Try batch fetch first; fall back to one-by-one if it fails
    meshes = {}
    try:
        meshes = vol.mesh.get(pending_ids, lod=LOD)
    except Exception as batch_err:
        print(f"  Batch fetch failed ({batch_err}). Falling back to individual fetches...")
        for body_id, label in zip(pending_ids, pending_labels):
            try:
                result = vol.mesh.get([body_id], lod=LOD)
                meshes.update(result)
                print(f"  [{label}] {body_id} — fetched individually")
            except Exception as e:
                print(f"  [{label}] {body_id} — FAILED: {e}")

    # Save
    for body_id, label in zip(pending_ids, pending_labels):
        if body_id not in meshes:
            print(f"  [{label}] {body_id} — no mesh returned, skipping")
            continue
        mesh     = meshes[body_id]
        out_path = os.path.join(OUTPUT_DIR, f"{body_id}.obj")
        with open(out_path, "wb") as f:
            f.write(mesh.to_obj())
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  [{label}] Saved {body_id}.obj  ({size_kb} KB)")

    print("\nDone.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    download_meshes(force=force)
