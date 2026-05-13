/**
 * Procedural neuron geometry — realistic branching dendrite trees.
 * Used when real hemibrain meshes aren't available.
 */
import * as THREE from 'three';

export const NEURON_LABELS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const NEURON_COLORS  = [
  0x00d4ff, 0xff7733, 0x44ee88, 0xff55bb, 0xffd700,
  0xaa55ff, 0x3399ff, 0xff4455, 0x22ddbb, 0xffbb33,
  0x55ffcc, 0xff66aa, 0x44aaff, 0xff8833, 0x99ee44,
  0x00ffaa, 0xff3366, 0x66ccff, 0xffcc00, 0xcc44ff,
  0x33ff99, 0xff9911, 0x4488ff, 0xee2266, 0x88ff44,
  0xff5500,
];

// 26 organic 3-D positions roughly brain-shaped
export const NEURON_POSITIONS = [
  new THREE.Vector3(-160,  80, -30),
  new THREE.Vector3( -70, 130,  40),
  new THREE.Vector3(  30, 100, -50),
  new THREE.Vector3( 130,  70,  30),
  new THREE.Vector3(-190,   0,  60),
  new THREE.Vector3( -90, -70, -20),
  new THREE.Vector3(  20, -40,  90),
  new THREE.Vector3( 150, -80,   0),
  new THREE.Vector3(-210,-110, -10),
  new THREE.Vector3(-100,-160,  50),
  new THREE.Vector3(  40,-170, -30),
  new THREE.Vector3( 170,-120,  30),
  new THREE.Vector3( -40,  40, 110),
  new THREE.Vector3(  90,  10,-110),
  new THREE.Vector3(-140, 160, -50),
  new THREE.Vector3(  60, 160,  70),
  new THREE.Vector3(-200,  50, -80),
  new THREE.Vector3( 200,  40,  70),
  new THREE.Vector3( -20,-200,  20),
  new THREE.Vector3( 110,-150, -60),
  new THREE.Vector3(-120,  10, 130),
  new THREE.Vector3(  70,  90, 120),
  new THREE.Vector3(-170,-180,  40),
  new THREE.Vector3( 180, 140, -40),
  new THREE.Vector3( -60, 200,  10),
  new THREE.Vector3( 140,-200,  80),
];

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a single dendrite branch recursively, appending Mesh objects to `group`. */
function addBranch(group, mat, rng, origin, direction, length, radius, depth) {
  if (depth <= 0 || length < 2) return;

  const segments = Math.max(3, Math.floor(length / 8));
  const points   = [origin.clone()];
  const cur       = origin.clone();
  const dir       = direction.clone().normalize();

  for (let s = 0; s < segments; s++) {
    const jitter = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.35);
    dir.add(jitter).normalize();
    cur.addScaledVector(dir, length / segments);
    points.push(cur.clone());
  }

  const curve  = new THREE.CatmullRomCurve3(points);
  const tube   = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments * 2, Math.max(0.25, radius), 5, false),
    mat,
  );
  group.add(tube);

  // Branch tips
  const numChildren = depth > 2 ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
  const tip = points[points.length - 1];
  for (let c = 0; c < numChildren; c++) {
    const childDir = dir.clone().add(
      new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(1.5)
    ).normalize();
    addBranch(group, mat, rng, tip, childDir, length * (0.55 + rng() * 0.2), radius * 0.65, depth - 1);
  }
}

/**
 * Build a complete neuron group: soma sphere + dendrite tree + axon.
 * @param {number} color  hex integer
 * @param {number} seed   for reproducible geometry
 * @param {number} scale  overall size multiplier
 */
export function buildNeuronGroup(color, seed, scale = 1.0) {
  const group = new THREE.Group();
  const rng   = mulberry32(seed * 1234567 + 42);

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive:          new THREE.Color(color),
    emissiveIntensity: 0.30,
    roughness:         0.55,
    metalness:         0.2,
    transparent:       true,
    opacity:           0.9,
  });
  group.userData.mat      = mat;
  group.userData.baseEmit = 0.30;

  // Soma
  const somaRadius = 9 * scale;
  const soma = new THREE.Mesh(new THREE.SphereGeometry(somaRadius, 20, 14), mat.clone());
  soma.userData.isSoma = true;
  group.add(soma);

  // Dendrites
  const numDendrites = 4 + Math.floor(rng() * 4);
  for (let d = 0; d < numDendrites; d++) {
    const startDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    const origin   = startDir.clone().multiplyScalar(somaRadius);
    addBranch(group, mat.clone(), rng, origin, startDir, (25 + rng() * 30) * scale, 1.4 * scale, 3);
  }

  // Axon (one longer, thicker branch)
  const axonDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
  addBranch(group, mat.clone(), rng, axonDir.clone().multiplyScalar(somaRadius), axonDir, (55 + rng() * 20) * scale, 1.8 * scale, 2);

  return group;
}

/**
 * Build a simplified background neuron (fewer polygons, gray).
 */
export function buildBackgroundNeuron(seed) {
  const rng   = mulberry32(seed * 9876 + 13);
  const group = new THREE.Group();
  const mat   = new THREE.MeshStandardMaterial({
    color:             0x1e2a3a,
    emissive:          new THREE.Color(0x081828),
    emissiveIntensity: 0.15,
    roughness:         0.8,
    transparent:       true,
    opacity:           0.55,
  });

  const somaR = 3 + rng() * 4;
  group.add(new THREE.Mesh(new THREE.SphereGeometry(somaR, 8, 6), mat));

  const numD = 2 + Math.floor(rng() * 3);
  for (let d = 0; d < numD; d++) {
    const dir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    addBranch(group, mat, rng, dir.clone().multiplyScalar(somaR), dir, 10 + rng() * 20, 0.5, 2);
  }
  return group;
}

/**
 * Load a real hemibrain neuron from an OBJ file downloaded by setup_meshes.py.
 * Normalises the mesh to ~180-unit diameter and centres it at the origin
 * so it drops into the same coordinate space as the procedural neurons.
 *
 * @param {string} label  — A–Z
 * @param {number} color  — hex integer
 * @param {number} bodyId — hemibrain body ID (used as filename)
 * @returns {Promise<THREE.Group>}
 */
export async function loadMeshNeuron(label, color, bodyId) {
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');

  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();

    loader.load(
      `static/meshes/${bodyId}.obj`,
      (group) => {
        // Build a shared material for all sub-meshes
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive:          new THREE.Color(color),
          emissiveIntensity: 0.30,
          roughness:         0.50,
          metalness:         0.15,
          transparent:       true,
          opacity:           0.9,
        });

        group.traverse(child => {
          if (child.isMesh) child.material = mat.clone();
        });

        // --- Normalise: translate geometry to origin, then scale to ~180 units ---
        // Hemibrain voxel coordinates can be in the tens-of-thousands range;
        // we translate each mesh's geometry so the bounding-box centre is at
        // the group's local origin before applying a uniform scale.
        group.updateMatrixWorld(true);
        const box    = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Translate vertex positions so the mesh is centred at local origin
        group.traverse(child => {
          if (child.isMesh) {
            child.geometry.translate(-center.x, -center.y, -center.z);
          }
        });

        // Scale so the longest axis is 180 units
        if (maxDim > 0) group.scale.setScalar(180 / maxDim);

        group.userData.mat      = mat;
        group.userData.baseEmit = 0.30;
        resolve(group);
      },
      undefined,                      // progress — not needed
      (err) => reject(err),
    );
  });
}
