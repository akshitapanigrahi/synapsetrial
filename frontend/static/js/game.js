/**
 * Game state machine and bit-rate computation.
 *
 * Input scheme:
 *   First key  → E (excitatory) or I (inhibitory)
 *   Second key → A–Z (neuron label)
 *
 * N = 52  (26 neurons × 2 types)
 * Bit rate formula (Shenoy et al. 2021):
 *   B = log2(N−1) × max(Sc−Si, 0) / t
 */

import { NEURON_LABELS } from './neurons.js';

export const N          = 52;
const GAME_DURATION     = 60;    // seconds
const LOG2_N_MINUS_1   = Math.log2(N - 1); // ≈ 5.672

// Valid first keys (type indicator)
const TYPE_KEYS   = new Set(['e', 'i']);
// Valid second keys (neuron label — lowercase version of NEURON_LABELS)
const LETTER_KEYS = new Set(NEURON_LABELS.map(l => l.toLowerCase()));

/** Generate a random i.i.d. trial sequence. */
function generateSequence(length) {
  const seq = [];
  for (let k = 0; k < length; k++) {
    const letter = NEURON_LABELS[Math.floor(Math.random() * NEURON_LABELS.length)];
    const type   = Math.random() < 0.5 ? 'E' : 'I';
    seq.push({ letter, type });
  }
  return seq;
}

export class Game {
  /**
   * @param {import('./scene.js').NeuronScene} scene
   * @param {import('./ui.js').UI}             ui
   * @param {import('./network.js').NetworkGraph} network
   * @param {function} onEnd  called when the 60-s window closes
   */
  constructor(scene, ui, network, onEnd) {
    this._scene   = scene;
    this._ui      = ui;
    this._network = network;
    this._onEnd   = onEnd;

    this._state         = 'IDLE'; // IDLE | PLAYING | ENDED
    this._seq           = [];
    this._idx           = 0;
    this._sc            = 0;  // correct
    this._si            = 0;  // incorrect
    this._start         = 0;  // Date.now() ms
    this._buffer        = ''; // stage 1: E or I
    this._pendingLetter = ''; // stage 2: neuron label
    this._transitioning = false; // true during the brief display pause after 2nd key
    this._rafId         = null;
    this._lastBitrateUpdate = 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  start() {
    this._scene.resetForNewGame();   // clear arcs / firing from any prior round
    this._network.reset();           // reset 2D mini-graph
    this._seq           = generateSequence(400);
    this._idx           = 0;
    this._sc            = 0;
    this._si            = 0;
    this._buffer        = '';
    this._pendingLetter = '';
    this._transitioning     = false;
    this._lastBitrateUpdate = 0;
    this._start             = Date.now();
    this._state             = 'PLAYING';

    this._ui.show();
    this._ui.updateStats(0, 0, 0);
    this._ui.setBitRate(0);
    this._ui.setInputBuffer(null, null);


    this._scene.disableAutoRotate();
    this._startTimerLoop();
    this._showCurrentTarget();
  }

  reset() {
    this._state = 'IDLE';
    cancelAnimationFrame(this._rafId);
    // Arcs stay visible so the user can explore the network they built.
    // Only resetForNewGame() (called by start()) clears them.
    this._scene.enableAutoRotate();
    this._ui.hide();
    this._ui.clearTarget();
  }

  handleKey(rawKey) {
    if (this._state !== 'PLAYING' || this._transitioning) return;

    const key = rawKey.toLowerCase();

    if (key === 'backspace' || key === 'enter') return;

    if (!this._buffer) {
      // Stage 1 — waiting for E or I
      if (!TYPE_KEYS.has(key)) return;
      this._buffer = key;
      this._ui.setInputBuffer(key.toUpperCase(), null);

    } else {
      // Stage 2 — waiting for neuron label; letter keys take priority so that
      // E and I are treated as neuron labels, not type-key overwrites.
      if (LETTER_KEYS.has(key)) {
        this._pendingLetter = key;
        this._ui.setInputBuffer(this._buffer.toUpperCase(), key.toUpperCase());
        this._transitioning = true;
        setTimeout(() => {
          this._transitioning = false;
          this._confirmSelection();
        }, 25);
      } else if (TYPE_KEYS.has(key)) {
        // Allow overwriting the type slot before the letter is chosen
        this._buffer = key;
        this._ui.setInputBuffer(key.toUpperCase(), null);
      }
    }
  }

  _confirmSelection() {
    const typedType   = this._buffer.toUpperCase();
    const typedLetter = this._pendingLetter.toUpperCase();
    const target      = this._seq[this._idx];
    const correct     = (typedType === target.type && typedLetter === target.letter);

    if (correct) this._sc++; else this._si++;

    this._ui.setInputBuffer(typedType, typedLetter);
    this._ui.flashResult(correct);
    this._ui.showFeedbackPopup(correct);
    this._ui.updateStats(this._sc, this._si, this._sc + this._si);

    const nextTrial = this._seq[this._idx + 1];
    this._network.addEdge(target.letter, nextTrial?.letter ?? target.letter, typedType, correct);
    if (nextTrial) {
      this._scene.fireSynapseArc(target.letter, nextTrial.letter, correct, typedType);
    }

    this._buffer        = '';
    this._pendingLetter = '';
    this._idx++;

    if (this._state === 'PLAYING') this._showCurrentTarget();
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _showCurrentTarget() {
    if (this._idx >= this._seq.length) return;
    const cur  = this._seq[this._idx];
    const next = this._seq[this._idx + 1];

    this._scene.fireNeuron(cur.letter, cur.type);
    this._network.addNode(cur.letter);
    this._ui.showTarget(cur.letter, cur.type);
    this._ui.setInputBuffer(null, null);
  }

  _elapsed() { return (Date.now() - this._start) / 1000; }

  _bitRate(t) {
    if (t <= 0) return 0;
    return LOG2_N_MINUS_1 * Math.max(this._sc - this._si, 0) / t;
  }

  _startTimerLoop() {
    const tick = () => {
      if (this._state !== 'PLAYING') return;
      const t = this._elapsed();

      this._ui.setTimer(GAME_DURATION - t);

      // Throttle bit-rate update to once per second
      if (t - this._lastBitrateUpdate >= 1.0) {
        this._ui.setBitRate(this._bitRate(t));
        this._lastBitrateUpdate = t;
      }

      if (t >= GAME_DURATION) {
        this._end(t);
        return;
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _end(elapsed) {
    this._state = 'ENDED';
    this._scene.clearPredictiveArc();
    this._scene.stopFiringAnimation(); // dim the last neuron — game over
    this._scene.enableAutoRotate();
    cancelAnimationFrame(this._rafId);

    const finalBitRate = this._bitRate(elapsed);
    this._ui.setBitRate(finalBitRate);
    this._ui.setTimer(0);

    this._onEnd({
      bitRate: finalBitRate,
      sc:      this._sc,
      si:      this._si,
      N,
      elapsed,
    });
  }
}
