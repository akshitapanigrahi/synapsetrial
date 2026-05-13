/**
 * Entry point — wires together scene, game, UI, and network graph.
 */

import { NeuronScene }  from './scene.js';
import { Game }         from './game.js';
import { UI }           from './ui.js';
import { NetworkGraph } from './network.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────

async function bootstrap() {
  // Fetch mesh manifest from backend
  // Shape: { neurons: [{label, bodyId, available}, ...] }
  let neuronManifest = [];
  try {
    const resp = await fetch('static/mesh-manifest.json');
    if (resp.ok) {
      const data  = await resp.json();
      neuronManifest = data.neurons ?? [];
      const nReal = neuronManifest.filter(m => m.available).length;
      console.info(`[manifest] ${nReal}/15 real OBJ meshes available`);
    }
  } catch { /* server unreachable — all neurons will use procedural geometry */ }

  // Build Three.js scene
  const container = document.getElementById('canvas-container');
  const scene     = new NeuronScene(container);

  // Populate neurons (real OBJs where available, procedural otherwise)
  const meshLoaderFill  = document.getElementById('mesh-loader-fill');
  const meshLoaderLabel = document.getElementById('mesh-loader-label');
  const meshLoader      = document.getElementById('mesh-loader');
  const enterBtn        = document.getElementById('enter-btn');

  scene.addBackgroundNeurons();
  await scene.addForegroundNeurons(neuronManifest, (loaded, total) => {
    meshLoaderFill.style.width = `${(loaded / total) * 100}%`;
    meshLoaderLabel.textContent = 'Loading neuron meshes...';
    if (loaded === total) {
      setTimeout(() => {
        meshLoader.classList.add('hidden');
        enterBtn.classList.remove('hidden');
      }, 400);
    }
  });

  // UI + network graph
  const ui        = new UI();
  const netCanvas = document.getElementById('network-canvas');
  const network   = new NetworkGraph(netCanvas);

  // Game
  let lastResults = null;
  const game = new Game(scene, ui, network, (results) => {
    lastResults = results;
    ui.showResults(results);
    showLaunchBar();   // re-show top-right bar so user can start again
  });

  // ── Keyboard input (type selection: E or R) ──────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    game.handleKey(e.key);
  });

  // ── Neuron click (neuron identification) ─────────────────────────────────
  scene.setupNeuronClickHandler((label) => {
    game.handleNeuronClick(label);
  });

  // ── Element refs ─────────────────────────────────────────────────────────
  const introScreen     = document.getElementById('intro-screen');
  const resultsScreen   = document.getElementById('results-screen');
  const startBtn        = document.getElementById('launch-start-btn');
  const countdownScreen = document.getElementById('countdown-screen');
  const countdownNum    = document.getElementById('countdown-number');

  // ── Helpers ──────────────────────────────────────────────────────────────

  function showIntro()    { introScreen.classList.remove('hidden'); }
  function hideIntro()    { introScreen.classList.add('hidden'); }
  // Only the ▶ button is toggled — ? stays visible at all times
  function showLaunchBar(){ startBtn.classList.remove('hidden'); }
  function hideLaunchBar(){ startBtn.classList.add('hidden'); }

  function startCountdown() {
    hideIntro();
    hideLaunchBar();
    resultsScreen.classList.add('hidden');   // dismiss results if still open
    countdownScreen.classList.remove('hidden');

    let count = 3;
    countdownNum.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNum.textContent = count;
      } else {
        clearInterval(interval);
        countdownScreen.classList.add('hidden');
        game.start();
      }
    }, 1000);
  }

  // ── Button wiring ────────────────────────────────────────────────────────

  const closeIntroBtn = document.getElementById('close-intro-btn');

  // Enter arrow — first-load close
  enterBtn.addEventListener('click', hideIntro);

  // X button — close when reopened via ?
  closeIntroBtn.addEventListener('click', () => {
    closeIntroBtn.classList.add('hidden');
    hideIntro();
  });

  // "Instructions" button — reopen with X, no progress bar
  document.getElementById('instructions-btn').addEventListener('click', () => {
    meshLoader.classList.add('hidden');
    enterBtn.classList.add('hidden');
    closeIntroBtn.classList.remove('hidden');
    showIntro();
  });

  // Start evaluation — launch bar only
  document.getElementById('launch-start-btn').addEventListener('click', startCountdown);

  // Connectome expand / collapse
  const connectomeModal     = document.getElementById('connectome-modal');
  const networkCanvasLarge  = document.getElementById('network-canvas-large');

  document.getElementById('expand-connectome-btn').addEventListener('click', () => {
    network.renderTo(networkCanvasLarge);
    connectomeModal.classList.remove('hidden');
  });

  document.getElementById('close-connectome-btn').addEventListener('click', () => {
    connectomeModal.classList.add('hidden');
  });

  // Close modal on backdrop click
  connectomeModal.addEventListener('click', (e) => {
    if (e.target === connectomeModal) connectomeModal.classList.add('hidden');
  });

  // ✕ on results card — show summary in left panel, keep stats panel, keep arcs
  document.getElementById('close-results-btn').addEventListener('click', () => {
    document.getElementById('results-screen').classList.add('hidden');
    scene.enableAutoRotate();
    if (lastResults) ui.showPostGameSummary(lastResults);
  });
}

bootstrap().catch(console.error);
