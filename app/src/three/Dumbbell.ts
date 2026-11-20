import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  PCFSoftShadowMap,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Pose } from '../lib/actor.ts';

/* The landing's dumbbell, live. Loaded on demand (DumbbellActor.tsx imports this module
   dynamically), so three.js never sits in the first-paint bundle.

   The model is the poster WebP's scene rebuilt: a dark-rimmed plate tiled as a pixel-grid
   color wheel, a pen-tool bar with tomato knobs and a cream anchor square, and a tomato hex
   weight stamped Aa. Warm clay materials lit by a studio room environment, one soft shadow.
   Its bar runs along x; both plates show their +x faces, so turning about y reveals either.

   A pose is the box the poster image would fill (center and width in CSS px, see
   lib/actor.ts). FRAME places the model inside that box the way the poster does, so the
   live render can replace the image without a jump. */

export type DumbbellView = {
  setSize: (width: number, height: number, dpr: number) => void;
  render: (pose: Pose) => void;
  dispose: () => void;
};

// Model units per poster-box width, and where the bar's middle sits in the box (fractions of w).
const FRAME = { scale: 0.42, dx: -0.02, dy: -0.03 };
const FOV = 18; // narrow, so a dumbbell near the viewport edge is barely skewed
const DISTANCE = 12;
const TILT = 0.26; // the camera looks down on the model and its floor by this much (rad)

// The landing's warm palette, as sRGB hex (three converts to linear). Clay, not plastic.
const C = {
  rim: '#2f2219',
  bar: '#24180f',
  tomato: '#e8623d',
  hex: '#ec6d45',
  cream: '#f3ede1',
  creamShade: '#d9cfbd',
  shadow: '#3d281a',
  // clockwise from the top, as the poster's wheel reads
  swatch: ['#b7d6bd', '#a9cde6', '#f1cfc8', '#f2eee6', '#ece7dc', '#e9dfa6', '#e8623d', '#ece3ad'],
};

export function createDumbbell(canvas: HTMLCanvasElement): DumbbellView {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  let env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;
  // A lost context takes the generated environment map with it; three restores its own
  // state on its listener (registered first), then this one bakes the room again.
  const onRestored = () => {
    env.dispose();
    env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
  };
  canvas.addEventListener('webglcontextrestored', onRestored);
  scene.environmentIntensity = 0.85;

  const camera = new PerspectiveCamera(FOV, 1, 1, 60);
  camera.position.set(0, 0, DISTANCE);

  // Everything that must be freed on dispose.
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const texs: Texture[] = [];
  const g = <T extends BufferGeometry>(x: T): T => (geos.push(x), x);
  const clay = (color: string, roughness = 0.62) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness: 0 });
    mats.push(m);
    return m;
  };
  const mesh = (geo: BufferGeometry, mat: Material, cast = true) => {
    const m = new Mesh(geo, mat);
    m.castShadow = cast;
    return m;
  };

  // rig: position and scale for a pose, tilted so the floor is seen from above.
  // spin: the pose's own rotation. model: the dumbbell itself.
  const rig = new Group();
  rig.rotation.x = TILT;
  const spin = new Group();
  const model = new Group();
  spin.add(model);
  rig.add(spin);
  scene.add(rig);

  /* ---- swatch plate: x -0.5, faces +x ---- */
  const PLATE_X = -0.5;
  const R = 0.5;
  const T = 0.13;
  const face = PLATE_X + T / 2;
  const rimMat = clay(C.rim, 0.5);
  const disc = mesh(g(new CylinderGeometry(R, R, T, 72)), rimMat);
  disc.rotation.z = Math.PI / 2;
  disc.position.x = PLATE_X;
  const lip = mesh(g(new TorusGeometry(R - 0.018, 0.024, 12, 72)), rimMat);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = face;
  const hub = mesh(g(new CylinderGeometry(0.078, 0.078, 0.07, 32)), clay(C.bar, 0.4));
  hub.rotation.z = Math.PI / 2;
  hub.position.x = face + 0.035;
  model.add(disc, lip, hub);

  // The pixel grid: one instanced chiclet per cell inside the rim, colored by angle like a
  // color wheel, leaving the hub clear.
  const PITCH = 0.074;
  const cells: { y: number; z: number; color: Color }[] = [];
  for (let iy = -7; iy <= 7; iy++) {
    for (let iz = -7; iz <= 7; iz++) {
      const y = iy * PITCH;
      const z = iz * PITCH;
      const r = Math.hypot(y, z);
      if (r > R - 0.075 || r < 0.13) continue;
      // Seen from +x, screen right is -z: the angle clockwise from the top is atan2(-z, y).
      const turn = (Math.atan2(-z, y) / (Math.PI * 2) + 1 + 1 / 16) % 1;
      cells.push({ y, z, color: new Color(C.swatch[Math.floor(turn * 8) % 8]) });
    }
  }
  const chicletGeo = g(new RoundedBoxGeometry(0.03, PITCH * 0.86, PITCH * 0.86, 2, 0.012));
  const chicletMat = clay('#ffffff', 0.58);
  const grid = new InstancedMesh(chicletGeo, chicletMat, cells.length);
  grid.castShadow = true;
  const m4 = new Matrix4();
  cells.forEach((c, i) => {
    grid.setMatrixAt(i, m4.makeTranslation(face + 0.012, c.y, c.z));
    grid.setColorAt(i, c.color);
  });
  model.add(grid);

  /* ---- bar: the pen tool's path, with its two handles and the anchor ---- */
  const HEX_X = 0.64;
  const HEX_T = 0.24;
  const barStart = face;
  const barEnd = HEX_X - HEX_T / 2;
  const bar = mesh(g(new CylinderGeometry(0.036, 0.036, barEnd - barStart, 24)), clay(C.bar, 0.32));
  bar.rotation.z = Math.PI / 2;
  bar.position.x = (barStart + barEnd) / 2;
  const knobGeo = g(new SphereGeometry(0.07, 32, 20));
  const knobMat = clay(C.tomato, 0.5);
  const knobL = mesh(knobGeo, knobMat);
  knobL.position.x = -0.27;
  const knobR = mesh(knobGeo, knobMat);
  knobR.position.x = 0.44;
  const anchor = mesh(g(new RoundedBoxGeometry(0.17, 0.17, 0.17, 3, 0.026)), clay(C.cream, 0.55));
  anchor.position.x = 0.1;
  model.add(bar, knobL, knobR, anchor);

  /* ---- hex weight: x +0.56, Aa on its +x face ---- */
  const hex = new Shape();
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3; // pointy top
    const px = Math.cos(a) * 0.44;
    const py = Math.sin(a) * 0.44;
    if (k === 0) hex.moveTo(px, py);
    else hex.lineTo(px, py);
  }
  hex.closePath();
  const hexGeo = g(
    new ExtrudeGeometry(hex, { depth: HEX_T - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 1 }),
  );
  hexGeo.translate(0, 0, -(HEX_T - 0.06) / 2);
  const hexMesh = mesh(hexGeo, clay(C.hex, 0.6));
  hexMesh.rotation.y = Math.PI / 2; // extrusion z becomes x
  hexMesh.position.x = HEX_X;
  model.add(hexMesh);

  // "Aa": cream letters standing proud of the face. A stack of alpha-cut planes, the deeper
  // ones a shade darker, reads as an extrusion at any angle without a font file.
  const glyphs = document.createElement('canvas');
  glyphs.width = glyphs.height = 256;
  const ctx = glyphs.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '700 176px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Aa', 128, 138);
  }
  const alpha = new CanvasTexture(glyphs);
  texs.push(alpha);
  const glyphGeo = g(new PlaneGeometry(0.5, 0.5));
  const topMat = new MeshStandardMaterial({ color: C.cream, roughness: 0.5, alphaMap: alpha, alphaTest: 0.5 });
  const sideMat = new MeshStandardMaterial({ color: C.creamShade, roughness: 0.7, alphaMap: alpha, alphaTest: 0.5 });
  mats.push(topMat, sideMat);
  const hexFace = HEX_X + HEX_T / 2;
  for (let k = 0; k <= 6; k++) {
    const p = mesh(glyphGeo, k === 6 ? topMat : sideMat, false);
    p.rotation.y = Math.PI / 2;
    p.position.x = hexFace + 0.003 + k * 0.006;
    p.position.y = 0.0;
    model.add(p);
  }

  /* ---- floor shadow and its light, both in rig space ---- */
  const floor = new Mesh(g(new PlaneGeometry(6, 6)), new ShadowMaterial({ color: C.shadow, opacity: 0.2 }));
  mats.push(floor.material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  floor.receiveShadow = true;
  rig.add(floor);

  const sun = new DirectionalLight('#fff4e6', 1.6);
  sun.position.set(1.4, 5, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512); // low resolution on purpose: PCF soft blurs it into a soft contact shadow
  sun.shadow.bias = -0.002;
  const sunTarget = new Object3D();
  rig.add(sun, sunTarget);
  sun.target = sunTarget;

  let vw = 1;
  let vh = 1;
  let upp = 1; // world units per CSS px on the z = 0 plane
  let shadowScale = 0;

  function setSize(width: number, height: number, dpr: number) {
    vw = width;
    vh = height;
    renderer.setPixelRatio(Math.min(dpr, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    upp = (2 * DISTANCE * Math.tan(((FOV / 2) * Math.PI) / 180)) / height;
  }

  function render(p: Pose) {
    const s = p.w * FRAME.scale * upp;
    rig.position.set((p.x + p.w * FRAME.dx - vw / 2) * upp, -(p.y + p.w * FRAME.dy - vh / 2) * upp, 0);
    rig.scale.setScalar(s);
    spin.rotation.set(p.rx, p.ry, p.rz);
    // The shadow camera lives in world units, so its frustum follows the rig's scale.
    if (Math.abs(s - shadowScale) > 1e-4) {
      shadowScale = s;
      const sc = sun.shadow.camera;
      sc.left = sc.bottom = -1.3 * s;
      sc.right = sc.top = 1.3 * s;
      sc.near = 0.5 * s;
      sc.far = 12 * s;
      sc.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    canvas.removeEventListener('webglcontextrestored', onRestored);
    env.dispose();
    for (const x of geos) x.dispose();
    for (const x of mats) x.dispose();
    for (const x of texs) x.dispose();
    grid.dispose();
    sun.shadow.dispose();
    pmrem.dispose();
    room.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { setSize, render, dispose };
}
