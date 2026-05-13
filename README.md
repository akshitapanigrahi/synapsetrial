# Synapse — Neural Bit Rate Game

A Neuroglancer-style 3-D connectome game designed to maximise BCI bit rate.

## Quick start

```bash
bash run.sh
# → http://localhost:5050
```

`run.sh` installs Python deps if needed, optionally fetches real neuron meshes,
then launches the Flask server.

**Real hemibrain meshes (optional)**

```bash
export NEUPRINT_TOKEN="your_token_from_neuprint.janelia.org"
python3 setup_meshes.py   # run once to cache 15 mesh JSONs
bash run.sh
```

Without a token the game procedurally generates dendrite trees that look
identical in-game.

---

## Design rationale

### Why N = 52?

Each trial presents one of 26 neurons firing either **excitatory** or
**inhibitory** — 26 × 2 = 52 equiprobable targets, sampled i.i.d. with
replacement.  
`log₂(51) ≈ 5.67 bits` per correct selection.

Compared with the canonical N = 8 centre-out task (`log₂(7) ≈ 2.81 bits`),
N = 52 gives **102 % more bits per trial** with the same accuracy.

### Input modality — keyboard two-chord

```
[E or I]  →  type indicator  (Excitatory / Inhibitory)
[A – Z]   →  neuron label
```

Example: neuron **G** fires with a warm gold pulse → press **E G**

A fast typist (200 wpm ≈ 1000 cpm) takes ~120 ms per keystroke.  Two
keystrokes + minimal reaction time ≈ 0.7 – 1.2 s per trial.  At 80 % accuracy
over 60 s:

```
~55 trials × 0.8 accuracy → Sc=44, Si=11
B = 5.67 × (44−11) / 60 ≈ 3.12 bps
```

At 90 % accuracy the same player reaches ~3.7 bps — competitive with
iBCI cursor-control benchmarks in the literature.

### Visual design choices

| Choice | Reason |
|---|---|
| 3-D OrbitControls | Neuroglancer-like exploration; zoom in on confusing neurons |
| Bloom post-processing | Immediately obvious which neuron fired |
| Gold dashed predictive arc | Shows where the next signal arrives *before* answering, letting users prime their response |
| Persistent coloured arcs | Builds the connectome live; green = exc correct, violet = inh correct, red = wrong |
| 220 gray background neurons | Realistic brain parenchyma context without visual clutter |
| Two-colour neuron firing | Warm pulse (orange/gold) = excitatory; cool pulse (violet) = inhibitory — consistent with standard neuroscience colour conventions |

### Bit rate formula

```
B = log₂(N−1) × max(Sc−Si, 0) / t   [N = 52, log₂(51) ≈ 5.67]
```

Where `t` is total elapsed session time (seconds).  
Updated on-screen every second. Final values reported at session end:
**B**, **N**, **Sc**, **Si**.

### First-session learnability

The game is explicitly designed for first-session players:
- Instructions on the intro screen
- Large target letter in the HUD (can't miss it)
- Input buffer slots give immediate visual confirmation of each keypress
- Green/red flash and floating popup confirm correctness before next trial
- No timeout per trial — players control pace and only get penalised for wrong
  answers, not slowness

---

## Architecture

```
neuronGame/
├── run.sh                  launch script
├── setup_meshes.py         one-time hemibrain mesh fetch (optional)
├── requirements.txt
├── backend/
│   └── app.py              Flask — serves frontend + /api/mesh-manifest
└── frontend/
    ├── index.html
    └── static/
        ├── css/style.css
        ├── meshes/         cached neuron JSON (if fetched)
        └── js/
            ├── main.js     entry point
            ├── scene.js    Three.js scene, orbit controls, bloom
            ├── neurons.js  procedural dendrite geometry + mesh loader
            ├── effects.js  pulse, arcs, sparks, bloom rings
            ├── game.js     state machine + bit-rate formula
            ├── network.js  2-D connectome canvas graph
            └── ui.js       HUD, timer, popups
```

All game logic runs **client-side** in ES6 modules.  The Python backend is
stateless; it only serves static files and a small mesh-manifest JSON.

---

## Dependencies

| Layer | Library |
|---|---|
| Python | Flask, numpy, navis, neuprint-python, trimesh |
| JS (CDN) | Three.js r160, OrbitControls, EffectComposer, UnrealBloomPass |

No bundler required.
