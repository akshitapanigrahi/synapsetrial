/**
 * Visual effects: neuron firing glow, Bézier tube arcs, spark travel, synapse bloom.
 */
import * as THREE from 'three';

export const EXC_COLOR   = 0x00ee66;  // green — excitatory
export const INH_COLOR   = 0xff3333;  // red   — inhibitory
export const ARC_COLOR   = 0xffd700;  // gold  — predictive arc
export const WRONG_COLOR = 0x888899;  // gray  — wrong answer

// ── Internal helpers ──────────────────────────────────────────────────────────

function arcMidpoint(a, b) {
  const mid  = a.clone().add(b).multiplyScalar(0.5);
  const span = a.distanceTo(b);
  mid.y += span * 0.45;
  return mid;
}

function buildDashedArc(from, to, color) {
  const ctrl   = arcMidpoint(from, to);
  const curve  = new THREE.QuadraticBezierCurve3(from, ctrl, to);
  const points = curve.getPoints(60);
  const geo    = new THREE.BufferGeometry().setFromPoints(points);
  const mat    = new THREE.LineDashedMaterial({
    color, linewidth: 1, dashSize: 6, gapSize: 4,
    transparent: true, opacity: 0.85,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return { line, curve };
}

// ── Exported effect API ───────────────────────────────────────────────────────

/**
 * Immediately light up a neuron to signal it is the current firing target.
 * No pulsing — steady bright glow in the synapse color.
 * Returns a stop() function that resets the neuron to its base emissive state.
 */
export function startFiringAnimation(neuronGroup, type) {
  const baseEmit  = neuronGroup.userData.baseEmit ?? 0.30;
  const fireColor = new THREE.Color(type === 'E' ? EXC_COLOR : INH_COLOR);

  const meshes = [];
  neuronGroup.traverse(obj => {
    if (obj.isMesh && obj.material?.emissive) meshes.push(obj.material);
  });
  const baseEmissive = meshes[0]?.emissive.clone() ?? new THREE.Color(0);

  // Light up immediately — steady, no pulsing.
  // INH (red) has ~3.5x lower luminance than EXC (green), so it needs a higher
  // emissive intensity to reach a similar perceived glow level.
  const intensity = type === 'E' ? 1.2 : 2.4;
  for (const m of meshes) {
    m.emissiveIntensity = intensity;
    m.emissive.copy(fireColor);
  }

  return function stop() {
    for (const m of meshes) {
      m.emissiveIntensity = baseEmit;
      m.emissive.copy(baseEmissive);
    }
  };
}

/**
 * Spawn a dashed gold predictive arc from `fromPos` to `toPos`.
 */
export function spawnPredictiveArc(scene, fromPos, toPos) {
  const { line } = buildDashedArc(fromPos, toPos, ARC_COLOR);
  line.userData.isPredictiveArc = true;
  scene.add(line);
  return line;
}

/**
 * Animate a spark travelling from `fromPos` to `toPos` along a Bézier curve,
 * then bloom at the destination.
 * Returns tick(delta) — returns true when done.
 */
export function spawnSynapseArc(scene, fromPos, toPos, correct, type) {
  const sparkColor = correct
    ? (type === 'E' ? EXC_COLOR : INH_COLOR)
    : WRONG_COLOR;

  const ctrl  = arcMidpoint(fromPos, toPos);
  const curve = new THREE.QuadraticBezierCurve3(fromPos, ctrl, toPos);

  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(5, 8, 8),
    new THREE.MeshBasicMaterial({ color: sparkColor }),
  );
  spark.position.copy(fromPos);
  scene.add(spark);

  const trailPoints = [fromPos.clone()];
  const trailGeo    = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMat    = new THREE.LineBasicMaterial({ color: sparkColor, transparent: true, opacity: 0.65 });
  const trail       = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);

  let t = 0, bloomed = false;

  return (delta) => {
    t = Math.min(t + delta * 2.0, 1);
    const pos = curve.getPoint(t);
    spark.position.copy(pos);

    if (trailPoints.length > 22) trailPoints.shift();
    trailPoints.push(pos.clone());
    trail.geometry.setFromPoints(trailPoints);
    trail.geometry.attributes.position.needsUpdate = true;
    trailMat.opacity = (1 - t) * 0.65;

    if (t >= 1 && !bloomed) {
      bloomed = true;
      scene.remove(spark);
      scene.remove(trail);
      spawnBloom(scene, toPos, sparkColor);
    }
    return t >= 1;
  };
}

/**
 * Spawn a persistent tubular arc for a confirmed synapse.
 * A bright sphere travels continuously from source to target showing directionality.
 * Returns { tick(delta)→bool, dispose() }.
 *
 * Correct E → green tube, correct I → red tube, wrong → dim gray.
 */
export function spawnPersistentArc(scene, fromPos, toPos, correct, type) {
  // Tubes are always gray — type is conveyed by end-marker shape, not color.
  const tubeColor   = correct ? 0xbbbbbb : WRONG_COLOR;
  const tubeOpacity = correct ? 0.45 : 0.16;
  const endOpacity  = tubeOpacity + 0.20;

  const ctrl  = arcMidpoint(fromPos, toPos);
  const curve = new THREE.QuadraticBezierCurve3(fromPos, ctrl, toPos);

  const TUBE_SEGS   = 48;
  const RAD_SEGS    = 8;
  const totalIdx    = TUBE_SEGS * RAD_SEGS * 6;

  // Tube body — starts invisible, grows via drawRange each tick
  const tubeGeo = new THREE.TubeGeometry(curve, TUBE_SEGS, 0.55, RAD_SEGS, false);
  tubeGeo.setDrawRange(0, 0);
  const tubeMat = new THREE.MeshBasicMaterial({
    color: tubeColor, transparent: true, opacity: tubeOpacity,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  scene.add(tube);

  // End marker — hidden until tube fully forms
  const tangent = curve.getTangent(1).normalize();
  const endMat  = new THREE.MeshBasicMaterial({
    color: tubeColor, transparent: true, opacity: 0, depthWrite: false,
  });
  let endGeo, endMarker;
  if (type === 'E') {
    const coneH = 11;
    endGeo    = new THREE.ConeGeometry(2.5, coneH, 8);
    endMarker = new THREE.Mesh(endGeo, endMat);
    endMarker.position.copy(toPos).addScaledVector(tangent, -coneH / 2);
    endMarker.setRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    );
  } else {
    endGeo    = new THREE.SphereGeometry(2.5, 12, 12);
    endMarker = new THREE.Mesh(endGeo, endMat);
    endMarker.position.copy(toPos);
  }
  scene.add(endMarker);

  let t      = 0;
  const speed = 6.0;
  let active  = true;

  const tick = (delta) => {
    if (!active) return true;
    t = Math.min(t + delta * speed, 1);
    tubeGeo.setDrawRange(0, Math.floor(t * totalIdx));
    if (t >= 1) {
      endMat.opacity = endOpacity;
      return true;
    }
    return false;
  };

  const dispose = () => {
    active = false;
    scene.remove(tube);
    scene.remove(endMarker);
    tubeGeo.dispose();  tubeMat.dispose();
    endGeo.dispose();   endMat.dispose();
  };

  return { tick, dispose };
}

/**
 * Expanding ring bloom at a synapse site.
 */
function spawnBloom(scene, position, color) {
  const rings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.1 + r * 1.5, 32),
      new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 - r * 0.2,
      }),
    );
    ring.position.copy(position);
    ring.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
    rings.push(ring);
    scene.add(ring);
  }

  let elapsed = 0;
  _bloomQueue.push((delta) => {
    elapsed += delta;
    const t = Math.min(elapsed / 0.7, 1);
    rings.forEach((ring, i) => {
      ring.scale.setScalar(1 + t * (8 + i * 3));
      ring.material.opacity = (1 - t) * (0.9 - i * 0.2);
    });
    if (t >= 1) rings.forEach(r => scene.remove(r));
    return t >= 1;
  });
}

const _bloomQueue = [];
export function drainBloomQueue(delta) {
  for (let i = _bloomQueue.length - 1; i >= 0; i--) {
    if (_bloomQueue[i](delta)) _bloomQueue.splice(i, 1);
  }
}

/** Particle burst at a position (small dots flying outward). */
export function spawnParticleBurst(scene, position, color, count = 18) {
  const verts = [], vels = [];
  for (let i = 0; i < count; i++) {
    verts.push(position.x, position.y, position.z);
    vels.push(new THREE.Vector3(
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 140,
    ));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 4, transparent: true, opacity: 0.9 }));
  scene.add(pts);

  let elapsed = 0;
  _bloomQueue.push((delta) => {
    elapsed += delta;
    const t   = Math.min(elapsed / 0.65, 1);
    const pos = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3]     += vels[i].x * delta;
      pos[i * 3 + 1] += vels[i].y * delta;
      pos[i * 3 + 2] += vels[i].z * delta;
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.9 * (1 - t);
    if (t >= 1) scene.remove(pts);
    return t >= 1;
  });
}
