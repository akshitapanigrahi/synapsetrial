/**
 * Three.js scene — camera, renderer, post-processing, neuron mesh management.
 */
import * as THREE                from 'three';
import { OrbitControls }         from 'three/addons/controls/OrbitControls.js';
import { EffectComposer }        from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }            from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }       from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }            from 'three/addons/postprocessing/OutputPass.js';

import {
  NEURON_LABELS, NEURON_COLORS, NEURON_POSITIONS,
  buildNeuronGroup, buildBackgroundNeuron, loadMeshNeuron,
} from './neurons.js';
import {
  startFiringAnimation,
  spawnPredictiveArc, spawnPersistentArc, spawnParticleBurst,
  drainBloomQueue, EXC_COLOR, INH_COLOR,
} from './effects.js';

const BG_NEURON_COUNT = 220;
const BG_SPREAD       = 900;

export class NeuronScene {
  constructor(container) {
    this._container = container;
    this._neuronGroups    = new Map(); // label → THREE.Group
    this._neuronPositions = new Map(); // label → THREE.Vector3
    this._labelEls        = new Map(); // label → DOM element
    this._tickFns         = [];        // active per-frame callbacks

    this._predictiveArc     = null;
    this._currentFiringStop  = null;   // stop() to reset emissive of current firing neuron
    this._currentFiringLabel = null;   // label of neuron currently lit up
    this._persistentArcs     = [];     // dispose() fns for all placed arcs

    this._clock = new THREE.Clock();

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._initPostProcessing();
    this._initControls();
    this._animate();
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  _initRenderer() {
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.toneMapping         = THREE.ReinhardToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this._container.appendChild(this._renderer.domElement);
    window.addEventListener('resize', () => this._onResize());
  }

  _initScene() {
    this._scene  = new THREE.Scene();
    this._scene.background = new THREE.Color(0x020408);
    this._scene.fog        = new THREE.FogExp2(0x020408, 0.00012);

    this._camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 8000);
    this._camera.position.set(0, 40, 620);
  }

  _initLights() {
    this._scene.add(new THREE.AmbientLight(0x112233, 0.9));

    const d1 = new THREE.DirectionalLight(0x4466cc, 0.8);
    d1.position.set(200, 400, 300);
    this._scene.add(d1);

    const d2 = new THREE.DirectionalLight(0x221133, 0.4);
    d2.position.set(-200, -100, -300);
    this._scene.add(d2);
  }

  _initPostProcessing() {
    const sz  = new THREE.Vector2(window.innerWidth, window.innerHeight);
    const rp  = new RenderPass(this._scene, this._camera);
    const bp  = new UnrealBloomPass(sz, 1.2, 0.5, 0.55);
    const out = new OutputPass();

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(rp);
    this._composer.addPass(bp);
    this._composer.addPass(out);
  }

  _initControls() {
    this._controls                 = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping   = true;
    this._controls.dampingFactor   = 0.06;
    this._controls.minDistance     = 80;
    this._controls.maxDistance     = 2500;
    this._controls.autoRotate      = true;
    this._controls.autoRotateSpeed = 0.18;
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    this._composer.setSize(w, h);
  }

  // ── Population ───────────────────────────────────────────────────────────

  addBackgroundNeurons() {
    for (let i = 0; i < BG_NEURON_COUNT; i++) {
      const g = buildBackgroundNeuron(i);
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = BG_SPREAD * 0.4 + Math.random() * BG_SPREAD * 0.6;
      g.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.6,
        r * Math.cos(phi),
      );
      g.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      g.scale.setScalar(0.5 + Math.random() * 1.5);
      this._scene.add(g);
    }
  }

  async addForegroundNeurons(neuronManifest = []) {
    const labelsContainer = document.getElementById('labels-container');
    const manifestByLabel = Object.fromEntries(neuronManifest.map(m => [m.label, m]));

    for (let i = 0; i < NEURON_LABELS.length; i++) {
      const label = NEURON_LABELS[i];
      const color = NEURON_COLORS[i];
      const pos   = NEURON_POSITIONS[i];
      const entry = manifestByLabel[label];

      let group;
      if (entry?.available) {
        try {
          group = await loadMeshNeuron(label, color, entry.bodyId);
        } catch (err) {
          console.warn(`[${label}] OBJ load failed, using procedural:`, err);
          group = buildNeuronGroup(color, i, 1.0);
        }
      } else {
        group = buildNeuronGroup(color, i, 1.0);
      }

      group.position.copy(pos);
      this._scene.add(group);
      this._neuronGroups.set(label, group);
      this._neuronPositions.set(label, pos.clone());

      const el       = document.createElement('div');
      const hexColor = `#${color.toString(16).padStart(6, '0')}`;
      el.className   = 'neuron-label';
      el.textContent = label;
      el.dataset.origColor = hexColor;
      el.style.color      = hexColor;
      el.style.textShadow = `0 0 8px ${hexColor}`;
      labelsContainer.appendChild(el);
      this._labelEls.set(label, el);
    }
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = this._clock.getDelta();

    this._controls.update();
    drainBloomQueue(delta);

    for (let i = this._tickFns.length - 1; i >= 0; i--) {
      const done = this._tickFns[i](delta);
      if (done) this._tickFns.splice(i, 1);
    }

    this._updateLabelPositions();
    this._composer.render();
  }

  _updateLabelPositions() {
    for (const [label, el] of this._labelEls) {
      const pos    = this._neuronPositions.get(label).clone();
      const offset = new THREE.Vector3(12, 14, 0);
      pos.add(offset);
      const v = pos.project(this._camera);
      const x = (v.x + 1) / 2 * window.innerWidth;
      const y = (-v.y + 1) / 2 * window.innerHeight;
      el.style.left    = `${x}px`;
      el.style.top     = `${y}px`;
      el.style.display = v.z < 1 ? 'block' : 'none';
    }
  }

  // ── Game-facing API ──────────────────────────────────────────────────────

  /**
   * Light up the given neuron as the current firing target.
   * Stops and resets whichever neuron was previously lit.
   */
  fireNeuron(label, type) {
    // Reset the previously firing neuron
    if (this._currentFiringStop) {
      this._currentFiringStop();
      this._currentFiringStop = null;
    }
    if (this._currentFiringLabel) {
      const prevEl = this._labelEls.get(this._currentFiringLabel);
      if (prevEl) {
        prevEl.classList.remove('firing');
        prevEl.style.color = prevEl.dataset.origColor ?? '';
      }
    }
    this._currentFiringLabel = label;

    const group = this._neuronGroups.get(label);
    if (!group) return;

    // Steady bright glow — no pulsing
    this._currentFiringStop = startFiringAnimation(group, type);

    // Prominent label — force white text while firing
    const firingEl = this._labelEls.get(label);
    if (firingEl) {
      firingEl.classList.add('firing');
      firingEl.style.color = '#ffffff';
    }

    // Brief particle burst on transition
    const color = type === 'E' ? EXC_COLOR : INH_COLOR;
    spawnParticleBurst(this._scene, this._neuronPositions.get(label), color, 22);
  }

  /** Show dashed gold predictive arc from current neuron to next. */
  showPredictiveArc(fromLabel, toLabel) {
    this.clearPredictiveArc();
    if (!fromLabel || !toLabel) return;
    const from = this._neuronPositions.get(fromLabel);
    const to   = this._neuronPositions.get(toLabel);
    if (!from || !to) return;
    this._predictiveArc = spawnPredictiveArc(this._scene, from, to);
  }

  clearPredictiveArc() {
    if (this._predictiveArc) {
      this._scene.remove(this._predictiveArc);
      this._predictiveArc = null;
    }
  }

  /** Place persistent tube arc after user answers. */
  fireSynapseArc(fromLabel, toLabel, correct, type) {
    const from = this._neuronPositions.get(fromLabel);
    const to   = this._neuronPositions.get(toLabel);
    if (!from || !to) return;

    this.clearPredictiveArc();

    // Persistent tube arc with looping traveler sphere
    const { tick, dispose } = spawnPersistentArc(this._scene, from, to, correct, type);
    this._persistentArcs.push(dispose);
    this._tickFns.push(tick);
  }

  getNeuronPosition(label) {
    return this._neuronPositions.get(label)?.clone() ?? null;
  }

  disableAutoRotate()  { this._controls.autoRotate = false; }
  enableAutoRotate()   { this._controls.autoRotate = true;  }

  /**
   * Stop the current firing animation and remove the firing label highlight.
   * Called when the game ends so the scene looks neutral while user reads results.
   */
  stopFiringAnimation() {
    if (this._currentFiringStop) {
      this._currentFiringStop();
      this._currentFiringStop = null;
    }
    if (this._currentFiringLabel) {
      const el = this._labelEls.get(this._currentFiringLabel);
      if (el) {
        el.classList.remove('firing');
        el.style.color = el.dataset.origColor ?? '';
      }
      this._currentFiringLabel = null;
    }
  }

  /**
   * Full reset for a new game:
   * – stops any firing animation
   * – disposes all persistent tube arcs
   * – clears the predictive arc
   * Persistent arcs are intentionally NOT cleared on game end / results dismiss —
   * only on a fresh game start.
   */
  resetForNewGame() {
    this.stopFiringAnimation();
    this._persistentArcs.forEach(d => d());
    this._persistentArcs = [];
    this.clearPredictiveArc();
  }
}
