"""
Edit NEURON_IDS to change which flyem-male-cns neurons are downloaded and displayed.
Each ID maps in order to a label A–Z. List length must stay at 26.

After editing, re-run:   python3 setup_meshes.py
"""

NEURON_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")   # do not change

NEURON_IDS = [
    10860,
    12240,
    12326,
    12681,
    13935,
    10629,
    15890,
    16554,
    17336,
    17459,
    17778,
    17920,
    18168,
    10048,
    10010,
    20020,
    20457,
    10001,
    10038,
    20989,
    21176,
    10073,
    22445,
    34869,
    53098,
    514230,
]

if len(NEURON_IDS) != len(NEURON_LABELS):
    raise ValueError(
        f"NEURON_IDS must have exactly {len(NEURON_LABELS)} entries "
        f"(one per label A–Z), got {len(NEURON_IDS)}"
    )

