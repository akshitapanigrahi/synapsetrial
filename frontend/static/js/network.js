/**
 * 2-D connectome graph — force-directed network diagram.
 *
 * Nodes appear only when their neuron first fires.
 * Edges are revealed once both endpoints are present.
 * E connections end with an arrowhead; I connections end with a filled circle.
 */

import { NEURON_LABELS, NEURON_COLORS } from './neurons.js';

const CORRECT_COLOR = '#bbbbbb';
const WRONG_COLOR   = '#888899';

const NODE_R      = 5;    // node circle radius
const TARGET_DIST = 58;   // ideal spring length between connected nodes
const REPULSION   = 2200; // repulsion constant
const SPRING_K    = 0.045;
const GRAVITY     = 0.006;
const DAMPING     = 0.80;
const SIM_ITERS   = 100;

export class NetworkGraph {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');
    this._nodes  = new Map(); // label → { x, y, vx, vy }
    this._edges  = [];        // { from, to, type, correct }
    this._draw();
  }

  /** Register a node the first time its neuron fires. */
  addNode(label) {
    if (this._nodes.has(label)) return;

    const { width: W, height: H } = this._canvas;

    // Place near a connected neighbor if one already exists, else near center
    let startX = W / 2, startY = H / 2;
    for (const e of this._edges) {
      if (e.from === label && this._nodes.has(e.to)) {
        const n = this._nodes.get(e.to);
        startX = n.x; startY = n.y;
        break;
      }
      if (e.to === label && this._nodes.has(e.from)) {
        const n = this._nodes.get(e.from);
        startX = n.x; startY = n.y;
        break;
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const r     = 15 + Math.random() * 25;
    this._nodes.set(label, {
      x:  startX + Math.cos(angle) * r,
      y:  startY + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
    });

    this._simulate(SIM_ITERS);
    this._draw();
  }

  /** Store an edge; it will render once both endpoints are present. */
  addEdge(fromLabel, toLabel, type, correct) {
    if (fromLabel === toLabel) return; // skip self-loops
    this._edges.push({ from: fromLabel, to: toLabel, type, correct });
    this._simulate(SIM_ITERS / 2);
    this._draw();
  }

  reset() {
    this._nodes.clear();
    this._edges = [];
    this._draw();
  }

  /** Render the current graph onto an external canvas (e.g. the expanded modal). */
  renderTo(targetCanvas) {
    this._draw(targetCanvas.getContext('2d'), targetCanvas.width, targetCanvas.height);
  }

  // ── Force-directed simulation ─────────────────────────────────────────────

  _simulate(iters) {
    const nodes = [...this._nodes.values()];
    if (nodes.length < 2) return;
    const { width: W, height: H } = this._canvas;
    const pad = NODE_R + 10;

    for (let iter = 0; iter < iters; iter++) {
      // Repulsion between every pair
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const na = nodes[a], nb = nodes[b];
          const dx = nb.x - na.x, dy = nb.y - na.y;
          const d2 = dx * dx + dy * dy || 0.01;
          const d  = Math.sqrt(d2);
          const f  = REPULSION / d2;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          na.vx -= fx; na.vy -= fy;
          nb.vx += fx; nb.vy += fy;
        }
      }

      // Spring attraction along visible edges
      for (const e of this._edges) {
        const a = this._nodes.get(e.from), b = this._nodes.get(e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f  = (d - TARGET_DIST) * SPRING_K;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Weak gravity toward center
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * GRAVITY;
        n.vy += (H / 2 - n.y) * GRAVITY;
      }

      // Integrate + dampen + clamp
      for (const n of nodes) {
        n.vx *= DAMPING; n.vy *= DAMPING;
        n.x = Math.max(pad, Math.min(W - pad, n.x + n.vx));
        n.y = Math.max(pad, Math.min(H - pad, n.y + n.vy));
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  _draw(ctx = this._ctx, W = this._canvas.width, H = this._canvas.height) {
    const srcW = this._canvas.width, srcH = this._canvas.height;
    const scx = W / srcW, scy = H / srcH;
    const scale = Math.min(scx, scy);
    const p = (x, y) => [x * scx, y * scy];

    ctx.clearRect(0, 0, W, H);

    // Edges — only draw when both endpoints are present
    for (const e of this._edges) {
      const from = this._nodes.get(e.from);
      const to   = this._nodes.get(e.to);
      if (!from || !to) continue;

      const color = e.correct ? CORRECT_COLOR : WRONG_COLOR;
      const [fx, fy] = p(from.x, from.y);
      const [tx, ty] = p(to.x,   to.y);

      ctx.save();
      ctx.globalAlpha = e.correct ? 0.70 : 0.30;
      ctx.strokeStyle = color;
      ctx.lineWidth   = (e.correct ? 1.2 : 0.7) * scale;

      const mx  = (fx + tx) / 2 + (fy - ty) * 0.18;
      const my  = (fy + ty) / 2 - (fx - tx) * 0.18;

      const dx  = tx - fx, dy = ty - fy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux  = dx / len, uy = dy / len;
      const nr  = NODE_R * scale;
      const ox  = fx + ux * nr,  oy = fy + uy * nr;
      const ex  = tx - ux * nr,  ey = ty - uy * nr;

      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();

      ctx.fillStyle = color;
      const angle = Math.atan2(ey - my, ex - mx);
      if (e.type === 'E') {
        const aLen = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - aLen * Math.cos(angle - 0.42), ey - aLen * Math.sin(angle - 0.42));
        ctx.lineTo(ex - aLen * Math.cos(angle + 0.42), ey - aLen * Math.sin(angle + 0.42));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, 2.8 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Nodes
    for (const [label, pos] of this._nodes) {
      const i     = NEURON_LABELS.indexOf(label);
      const color = `#${NEURON_COLORS[i].toString(16).padStart(6, '0')}`;
      const [nx, ny] = p(pos.x, pos.y);

      ctx.save();
      ctx.fillStyle   = color;
      ctx.globalAlpha = 0.92;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 7 * scale;
      ctx.beginPath();
      ctx.arc(nx, ny, NODE_R * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle    = '#ffffff';
      ctx.font         = `bold ${Math.round(5 * scale)}px JetBrains Mono, monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, nx, ny);
      ctx.restore();
    }
  }
}
