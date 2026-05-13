/**
 * Procedural neuron geometry — realistic branching dendrite trees.
 * Used when real hemibrain meshes aren't available.
 */
import * as THREE from 'three';

// 75 neurons labeled 1–75 in array order.
export const NEURON_LABELS = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36','37','38','39','40',
  '41','42','43','44','45','46','47','48','49','50',
  '51','52','53','54','55','56','57','58','59','60',
  '61','62','63','64','65','66','67','68','69','70',
  '71','72','73','74','75',
];

export const NEURON_COLORS = [
  // existing 26
  0x00d4ff, 0xff7733, 0x44ee88, 0xff55bb, 0xffd700,
  0xaa55ff, 0x3399ff, 0xff4455, 0x22ddbb, 0xffbb33,
  0x55ffcc, 0xff66aa, 0x44aaff, 0xff8833, 0x99ee44,
  0x00ffaa, 0xff3366, 0x66ccff, 0xffcc00, 0xcc44ff,
  0x33ff99, 0xff9911, 0x4488ff, 0xee2266, 0x88ff44,
  0xff5500,
  // new 27
  0x00bbdd, 0xee4400, 0x77eeaa, 0xff2288, 0xbbff00, 0x2244ff,
  0xff9966, 0x66ffee, 0xbb44ee, 0xffee44, 0x44bbff, 0xee6688,
  0x88ee44, 0xff4488, 0x44eebb, 0xee8833, 0x8833ee, 0x33ee88,
  0xee3388, 0x88ee33, 0x3388ee, 0xee33ff, 0x33ffee, 0xffee33,
  // neurons 51-75
  0xffaacc, 0xaaffcc, 0xccaaff, 0xff8866, 0x66ff88,
  0x8866ff, 0xffcc88, 0x88ccff, 0xcc88ff, 0xff6699,
  0x99ff66, 0x6699ff, 0xffaa55, 0x55ffaa, 0xaa55ff,
  0xff5577, 0x77ff55, 0x5577ff, 0xffbb77, 0x77ffbb,
  0xbb77ff, 0xff77bb, 0x77bbff, 0xbbff77, 0xaabbdd,
];

// 75 organic 3-D positions — stretched horizontally to fill a widescreen
// laptop display (X spans ±370, Y spans ±210).
export const NEURON_POSITIONS = [
  // neurons 1-26
  new THREE.Vector3(-210,  65, -30),
  new THREE.Vector3( -90, 105,  40),
  new THREE.Vector3(  40,  80, -50),
  new THREE.Vector3( 170,  55,  30),
  new THREE.Vector3(-245,   0,  60),
  new THREE.Vector3(-115, -55, -20),
  new THREE.Vector3(  25, -30,  90),
  new THREE.Vector3( 195, -65,   0),
  new THREE.Vector3(-275, -90, -10),
  new THREE.Vector3(-130,-130,  50),
  new THREE.Vector3(  50,-135, -30),
  new THREE.Vector3( 220, -95,  30),
  new THREE.Vector3( -50,  30, 110),
  new THREE.Vector3( 115,  10,-110),
  new THREE.Vector3(-180, 130, -50),
  new THREE.Vector3(  80, 130,  70),
  new THREE.Vector3(-260,  40, -80),
  new THREE.Vector3( 260,  30,  70),
  new THREE.Vector3( -25,-160,  20),
  new THREE.Vector3( 145,-120, -60),
  new THREE.Vector3(-155,  10, 130),
  new THREE.Vector3(  90,  70, 120),
  new THREE.Vector3(-220,-145,  40),
  new THREE.Vector3( 235, 110, -40),
  new THREE.Vector3( -80, 160,  10),
  new THREE.Vector3( 180,-160,  80),
  // neurons 27-50
  new THREE.Vector3(-130, 160, -80),
  new THREE.Vector3(  65, -90,-130),
  new THREE.Vector3(-300, -40,  40),
  new THREE.Vector3( 300, -40, -30),
  new THREE.Vector3(   0,  50,-160),
  new THREE.Vector3( -65, -95, 150),
  new THREE.Vector3( 145, 160, -90),
  new THREE.Vector3(-235,  70,  90),
  new THREE.Vector3( 215,  45,-130),
  new THREE.Vector3(-190, -45,-140),
  new THREE.Vector3( 110,-170,  55),
  new THREE.Vector3( -85, 115, 140),
  new THREE.Vector3( 265,-125,  65),
  new THREE.Vector3(-110,-170, -65),
  new THREE.Vector3(   0, 150,-145),
  new THREE.Vector3( 165,  90, 145),
  new THREE.Vector3(-265, 125,  35),
  new THREE.Vector3( 330,  70, -15),
  new THREE.Vector3(-330,  25, -55),
  new THREE.Vector3(  40,-205, -45),
  new THREE.Vector3(-135,  45,-175),
  new THREE.Vector3( 200, -45, 155),
  new THREE.Vector3( -20, 190,  85),
  new THREE.Vector3( 110, -70,-175),
  // neurons 51-75
  new THREE.Vector3(-370,  45,  20),
  new THREE.Vector3( 370,  45, -20),
  new THREE.Vector3(-340, 175,  15),
  new THREE.Vector3( 340,-175,  15),
  new THREE.Vector3(-310,-165,  40),
  new THREE.Vector3( 310, 165, -40),
  new THREE.Vector3(   0, 210,  50),
  new THREE.Vector3(   0,-210, -50),
  new THREE.Vector3(-185, 100,-170),
  new THREE.Vector3( 185,-100,-170),
  new THREE.Vector3(-255, 110, 140),
  new THREE.Vector3( 255,-110, 140),
  new THREE.Vector3( -35, 195, 170),
  new THREE.Vector3(  35,-195, 170),
  new THREE.Vector3(-355,  20, -90),
  new THREE.Vector3( 355, -20, -90),
  new THREE.Vector3(-160,-185,-120),
  new THREE.Vector3( 160, 185,-120),
  new THREE.Vector3(-370, -60,  70),
  new THREE.Vector3( 370,  60, -70),
  new THREE.Vector3(  80,-210, 130),
  new THREE.Vector3( -80, 210, 130),
  new THREE.Vector3( 295, 100,-115),
  new THREE.Vector3(-295,-100,-115),
  new THREE.Vector3(   0,   0, 210),
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
