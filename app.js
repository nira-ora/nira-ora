// Nira Ora – simulateur 3D de suture et de soins de plaies (three.js r160)
// 1 unité = 1 cm. Modèles faits dans Blender (blender/*.py).
import * as THREE from 'three';
import { GLTFLoader } from './lib/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from './lib/jsm/environments/RoomEnvironment.js';
import * as D from './data.js';

const VERSION = 'v1';
const $ = (id) => document.getElementById(id);
const PI = Math.PI, UP = new THREE.Vector3(0, 1, 0);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ------------------------------------------------------------------ SAUVEGARDE
const SAVE_KEY = 'niraora_save';
let save = { v: 1, best: {}, pupu: 0, certs: [] };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) save = s; } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ------------------------------------------------------------------ RENDU
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15302c);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 400);
scene.add(new THREE.HemisphereLight(0xfff4e6, 0x30403c, 0.35));
const sun = new THREE.DirectionalLight(0xfff4e8, 2.6);
sun.position.set(6, 16, 9); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
sun.shadow.bias = -0.0008; sun.shadow.radius = 4; scene.add(sun);
const lamp = new THREE.PointLight(0xffe2c0, 18, 30, 2); lamp.position.set(-5, 8, 4); scene.add(lamp);

// champ opératoire vert (tissu)
function clothTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#2f6b64'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) { g.fillStyle = i % 4 ? '#2a625c' : '#33736b'; g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const drape = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: clothTex(), roughness: 1 }));
drape.rotation.x = -PI / 2; drape.position.y = -1.62; drape.receiveShadow = true; scene.add(drape);
// plateau d'instruments
const tray = new THREE.Mesh(new THREE.BoxGeometry(10, 0.12, 17), new THREE.MeshStandardMaterial({ color: 0xc9ced2, metalness: 0.8, roughness: 0.35 }));
tray.position.set(14, -1.56, 0); tray.receiveShadow = true; scene.add(tray);

// grain de peau (pores) en carte de relief
function poreTex() {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const im = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 128 + (Math.random() - 0.5) * 50; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  for (let k = 0; k < 900; k++) { g.fillStyle = 'rgba(40,40,40,0.55)'; g.beginPath(); g.arc(Math.random() * n, Math.random() * n, 0.6 + Math.random(), 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(70,70,70,0.25)';
  for (let k = 0; k < 60; k++) { g.beginPath(); const x = Math.random() * n, y = Math.random() * n; g.moveTo(x, y); g.lineTo(x + 30 * (Math.random() - .5), y + 30 * (Math.random() - .5)); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const PORES = poreTex();
const SKIN_N = new THREE.TextureLoader().load('tex/skin_n.png'); SKIN_N.wrapS = SKIN_N.wrapT = THREE.RepeatWrapping;
const TENT = { uTipA: { value: new THREE.Vector3(99, 0, 99) }, uPushA: { value: 0 }, uTipB: { value: new THREE.Vector3(99, 0, 99) }, uPushB: { value: 0 } };
function setTent(A, pa, B, pb) { if (A) TENT.uTipA.value.copy(A); TENT.uPushA.value = pa || 0; if (B) TENT.uTipB.value.copy(B); TENT.uPushB.value = pb || 0; }
function skinMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0, normalMap: SKIN_N, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 0.6 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TENT);
    sh.vertexShader = 'attribute float wet;\nvarying float vWet;\nuniform vec3 uTipA; uniform float uPushA; uniform vec3 uTipB; uniform float uPushB;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvWet = wet;\n{ float dA = distance(position.xz, uTipA.xz); transformed.y -= uPushA * exp(-dA * dA / 0.03); float dB = distance(position.xz, uTipB.xz); transformed.y -= uPushB * exp(-dB * dB / 0.03); }');
    // diffusion sous-surface simulée : éclairage « enveloppant » + teinte rouge dans la transition vers l'ombre
    const lp = THREE.ShaderChunk.lights_physical_pars_fragment.replace('vec3 irradiance = dotNL * directLight.color;',
      'float nlw = dot( geometryNormal, directLight.direction ); vec3 irradiance = saturate( ( nlw + 0.45 ) / 1.45 ) * directLight.color * mix( vec3( 1.0, 0.55, 0.45 ), vec3( 1.0 ), saturate( nlw * 2.0 + 0.3 ) );');
    sh.fragmentShader = 'varying float vWet;\n' + sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', lp)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - 0.22 * vWet;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.15, vWet);');
  };
  return m;
}
const STEEL = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.26 });

// ------------------------------------------------------------------ CAMÉRA (orbite tactile)
const cam = { target: new THREE.Vector3(), r: 12, th: 0, ph: 0.7, T: new THREE.Vector3(), R: 12, TH: 0, PH: 0.7 };
let panelH = 0;
function setView(target, width, ph = 0.7, th = 0, instant = false) {
  cam.T.copy(target); cam.PH = ph; cam.TH = th;
  const hf = 2 * Math.atan(Math.tan(camera.fov * PI / 360) * camera.aspect);
  cam.R = Math.max(width / (2 * Math.tan(Math.min(hf, camera.fov * PI / 180) / 2)), 3);
  if (instant) { cam.target.copy(cam.T); cam.r = cam.R; cam.th = cam.TH; cam.ph = cam.PH; }
}
function updateCam(dt) {
  const k = 1 - Math.exp(-6 * dt);
  cam.target.lerp(cam.T, k); cam.r = lerp(cam.r, cam.R, k); cam.th = lerp(cam.th, cam.TH, k); cam.ph = lerp(cam.ph, cam.PH, k);
  camera.position.set(cam.target.x + cam.r * Math.sin(cam.ph) * Math.sin(cam.th), cam.target.y + cam.r * Math.cos(cam.ph), cam.target.z + cam.r * Math.sin(cam.ph) * Math.cos(cam.th));
  camera.lookAt(cam.target);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  panelH = $('panel').offsetHeight || 0;
  camera.setViewOffset(w, h, 0, Math.min(panelH * 0.45, h * 0.25), w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe($('panel'));

// gestes : pendant la suture, un doigt = l'instrument, deux doigts = tourner et zoomer ; ailleurs un doigt tourne la vue
const ptr = new Map(); let gest = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); const p = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; ptr.set(e.pointerId, p);
  if (ptr.size === 1 && stitchActive()) { p.n = true; nDown(e); }
  if (ptr.size === 2) { for (const q of ptr.values()) if (q.n) { q.n = false; nUp(e, true); }
    const [a, b] = [...ptr.values()]; gest = { d: Math.hypot(a.x - b.x, a.y - b.y), R: cam.R, pinch: true, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptr.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (p.n && ptr.size === 1) { nMove(e); return; }
  if (ptr.size === 2 && gest && gest.pinch) { const [a, b] = [...ptr.values()]; cam.R = clamp(gest.R * gest.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 2.5, 80);
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; cam.TH -= (cx - gest.cx) * 0.006; cam.PH = clamp(cam.PH - (cy - gest.cy) * 0.005, 0.08, 1.35); gest.cx = cx; gest.cy = cy; }
  else if (ptr.size === 1 && !stitchActive() && Math.hypot(p.x - p.x0, p.y - p.y0) > 10) { cam.TH -= dx * 0.006; cam.PH = clamp(cam.PH - dy * 0.005, 0.08, 1.35); }
});
canvas.addEventListener('pointerup', (e) => {
  const p = ptr.get(e.pointerId); ptr.delete(e.pointerId);
  if (p && p.n) { nUp(e); if (ptr.size === 0) gest = null; return; }
  if (ptr.size < 2) gest = gest && gest.pinch ? { done: true } : null;
  if (p && !gest && !stitchActive() && performance.now() - p.t < 400 && Math.hypot(p.x - p.x0, p.y - p.y0) < 10) onTap(e.clientX, e.clientY);
  if (ptr.size === 0) gest = null;
});
canvas.addEventListener('pointercancel', (e) => { const p = ptr.get(e.pointerId); ptr.delete(e.pointerId); if (p && p.n) nUp(e, true); if (ptr.size === 0) gest = null; });
canvas.addEventListener('wheel', (e) => { cam.R = clamp(cam.R * (1 + Math.sign(e.deltaY) * 0.1), 2.5, 80); }, { passive: true });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y, objs) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(objs, true)[0];
}

// ------------------------------------------------------------------ CHARGEMENT
const loader = new GLTFLoader(); const cache = {};
function glb(name) {
  // .glb (GitHub Pages) ou, à défaut, module .js en base64 (hébergement qui refuse les .glb)
  return cache[name] || (cache[name] = fetch('models/' + name + '.glb').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .catch(() => import('./models/' + name + '.glb.js').then((m) => Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0)).buffer))
    .then((buf) => new Promise((ok, ko) => loader.parse(buf, '', (g) => ok(g.scene), ko))));
}
let META = null, CMETA = null, INST = null, DRESS = null;
const needles = {}, needleHits = [], packets = {};
let holder, forceps, syringe, drapeHole;

async function boot() {
  [META, CMETA] = await Promise.all([fetch('models/meta.json').then((r) => r.json()), fetch('models/care_meta.json').then((r) => r.json())]);
  [INST, DRESS] = await Promise.all([glb('instruments'), glb('dressings')]);
  INST.traverse((o) => { if (o.isMesh) { o.material = STEEL; o.castShadow = true; } });
  // aiguilles posées sur le plateau
  const keys = Object.keys(D.NEEDLES);
  keys.forEach((k, i) => {
    const src = INST.getObjectByName('needle_' + k);
    const g = new THREE.Group(); const m = src.clone(); g.add(m);
    g.rotation.x = -PI / 2; g.position.set(11.6, -1.47, -5.5 + i * 2.6); scene.add(g);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(g.position); hit.userData.needle = k; scene.add(hit); needleHits.push(hit);
    needles[k] = { tray: g, src };
  });
  // sachets de fil sur le plateau (3D, touchables)
  ['3_0', '4_0', '5_0', '6_0', 'res'].forEach((k, i) => {
    const src = INST.getObjectByName('pk_' + k); if (!src) return;
    src.parent.remove(src); src.position.set(13.7, -1.49, -5.8 + i * 2.9); src.rotation.set(0, 0, 0); src.userData.pk = k; scene.add(src); packets[k] = src;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 2.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(src.position); hit.userData.pk = k; scene.add(hit); needleHits.push(hit);
  });
  syringe = INST.getObjectByName('syringe'); syringe.parent.remove(syringe); drapeHole = INST.getObjectByName('champ_troue'); drapeHole.parent.remove(drapeHole);
  holder = INST.getObjectByName('needle_holder'); forceps = INST.getObjectByName('forceps');
  holder.parent.remove(holder); forceps.parent.remove(forceps);
  holder.rotation.set(0, -PI / 2, 0); holder.position.set(15.6, -1.36, -6.5); scene.add(holder);
  forceps.rotation.set(0, -PI / 2, 0); forceps.position.set(17.8, -1.42, -5.5); scene.add(forceps);
  // pansements sur le champ, derrière la table
  const ids = Object.keys(D.DRESSINGS);
  ids.forEach((id, i) => {
    let obj;
    if (id === 'tpn') { obj = makeFoam(true); obj.scale.setScalar(0.8); obj.userData.foam.position.y = 0.2; }
    else if (id === 'champ') obj = new THREE.Mesh(new THREE.PlaneGeometry(12, 10).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0x7fb7a4, roughness: 1, side: THREE.DoubleSide }));
    else if (D.DRESSINGS[id].model === 'cream') obj = makeCream(D.DRESSINGS[id].tint);
    else {
      obj = DRESS.getObjectByName(D.DRESSINGS[id].model).clone();
      const film = id === 'film' || id === 'hydrogel';
      obj.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: film ? 0.15 : 0.85, transparent: film, opacity: film ? 0.45 : 1, side: THREE.DoubleSide, depthWrite: !film });
      if (D.DRESSINGS[id].tint) { obj.material.color.setHex(D.DRESSINGS[id].tint); obj.material.roughness = 0.4; }
    }
    obj.castShadow = true;
    const col = i % 5, row = Math.floor(i / 5);
    obj.position.set(-24 + col * 12, -1.58, -16 - row * 11);
    obj.userData.dress = id; scene.add(obj); DRESS_OBJ[id] = obj; obj.userData.home = obj.position.clone();
  });
  $('loading').classList.add('hide');
  resize(); setView(new THREE.Vector3(0, 0, 0), 16, 0.75, 0, true);
  home(); $('landing').classList.remove('hide');
  if (D.ATELIER) { $('landing').classList.add('hide'); startLesson('atelier'); }
}
const DRESS_OBJ = {};

// ------------------------------------------------------------------ ÉTAT
let S = null; // partie en cours
let pad = null, padGroup = new THREE.Group(); scene.add(padGroup);

function newGame(mode, key, level) {
  try { caption(''); clearNext(); } catch (e) {} // audit : la consigne de la suture restait affichée dans les soins et l'urgence
  S = { mode, key, level, L: D.LEVELS[level], data: mode === 'suture' ? D.SUTURE[key] : mode === 'urg' ? D.URGENCE[key] : D.CARE[key], t0: performance.now(),
        step: 'prep', choices: {}, stitches: [], log: [], errors: [], critical: [], score: {}, pupu: 0, done: {}, order: [] };
  if (S.L.bleed < 0) S.bleedLv = Math.floor(Math.random() * 3); else S.bleedLv = S.L.bleed;
  if (mode === 'care') S.bleedLv = 0;
  if (mode === 'urg') { S.bleedLv = 3; S.lost = 0; }
  S.pat = {};
  if ((level === 'avc' || level === 'exam') && mode !== 'learn') { // patient tiré au hasard : 0 à 2 facteurs
    const ks = Object.keys(D.RISKS).filter((k) => mode !== 'urg' || D.RISKS[k].med); for (let n = Math.floor(Math.random() * 3); n > 0; n--) S.pat[ks[Math.floor(Math.random() * ks.length)]] = true;
    if (mode === 'suture' && Object.keys(S.pat).some((k) => D.RISKS[k].bleed)) S.bleedLv = Math.max(1, S.bleedLv); }
}
function patText() { const p = Object.keys(S.pat || {}).filter((k) => S.pat[k]); return p.length ? `<br><b>👤 Patient : ${p.map((k) => D.RISKS[k].n.charAt(0).toLowerCase() + D.RISKS[k].n.slice(1)).join(', ')}.</b>` : ''; }

// ------------------------------------------------------------------ PEAU / PLAIE
const W = { pts: [], w: [], L: 1, d: 0.5 };   // courbe de la plaie (suture)
let band = null;  // données par sommet proche de la plaie
const BLOOD_C = new THREE.Color(0.30, 0.012, 0.01);

async function loadPad() {
  if (pad) { padGroup.remove(pad); pad.geometry.dispose(); }
  padGroup.clear(); padGroup.position.set(0, 0, 0); padGroup.rotation.set(0, 0, 0); nReset();
  const name = S.mode !== 'care' || S.data.pad ? 'pad_' + (S.data.pad || S.key) : S.data.model;
  const src = (await glb(name)).children[0];
  const geo = src.geometry.clone();
  // couleurs -> RGB flottant ; alpha = code tissu (soins)
  const ca = geo.attributes.color, n = geo.attributes.position.count;
  const rgb = new Float32Array(n * 3), code = new Float32Array(n);
  for (let i = 0; i < n; i++) { rgb[i * 3] = ca.getX(i); rgb[i * 3 + 1] = ca.getY(i); rgb[i * 3 + 2] = ca.getZ(i); code[i] = ca.itemSize > 3 ? ca.getW(i) : 0; }
  // AgX désature : on redonne un peu de saturation aux couleurs bakées (sans dépasser un rouge organique)
  for (let i = 0; i < n; i++) { const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2], l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    rgb[i * 3] = Math.min(0.62, Math.max(0, l + (r - l) * 1.3)); rgb[i * 3 + 1] = Math.max(0.004, l + (g - l) * 1.3); rgb[i * 3 + 2] = Math.max(0.003, l + (b - l) * 1.3); }
  geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  const pos = geo.attributes.position;
  const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = pos.getX(i) / 1.6; uv[i * 2 + 1] = pos.getZ(i) / 1.6; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  PORES.repeat.set(1, 1);
  const wet = new Float32Array(n); geo.setAttribute('wet', new THREE.BufferAttribute(wet, 1));
  pad = new THREE.Mesh(geo, skinMaterial()); pad.receiveShadow = true; pad.castShadow = true; pad.name = 'pad';
  padGroup.add(pad);
  S.base = { pos: pos.array.slice(), col: rgb.slice(), code };
  if (S.mode !== 'care') prepWound(); else if (S.data.removal) prepRemoval(); else prepCare();
}

function nearest(x, z) {
  let best = { dd: 1e9 };
  const P = W.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], az = P[i][2], bx = P[i + 1][0], bz = P[i + 1][2];
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    const u = clamp(((x - ax) * ex + (z - az) * ez) / l2);
    const qx = ax + ex * u, qz = az + ez * u, dd = Math.hypot(x - qx, z - qz);
    if (dd < best.dd) { const l = Math.sqrt(l2), nx = -ez / l, nz = ex / l; best = { dd, s: (x - qx) * nx + (z - qz) * nz, t: (i + u) / (P.length - 1), nx, nz, qx, qz, tx: ex / l, tz: ez / l }; }
  }
  return best;
}
function gAt(t) { const f = t * (W.w.length - 1), i = Math.min(W.w.length - 2, Math.floor(f)); return lerp(W.w[i], W.w[i + 1], f - i); }

function prepWound() {
  const m = META.wounds[S.data.pad || S.key]; W.pts = m.curve; W.w = m.w; W.d = m.d;
  W.L = 0; for (let i = 1; i < W.pts.length; i++) W.L += Math.hypot(W.pts[i][0] - W.pts[i - 1][0], W.pts[i][2] - W.pts[i - 1][2]);
  const pos = S.base.pos, n = pos.length / 3, idx = [], info = [];
  const wet = pad.geometry.attributes.wet.array;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (Math.abs(x) > 4.6 || Math.abs(z) > 4.0) continue;
    const q = nearest(x, z); if (q.dd > 3.2) continue;
    idx.push(i); info.push(q);
    const g = gAt(q.t); if (y < -0.03 && Math.abs(q.s) < g + 0.05) wet[i] = 0.85;
  }
  band = { idx, info };
  pad.geometry.attributes.wet.needsUpdate = true;
  // repère pour points de suture
  S.vessel = null; S.vesselOK = false;
  if (S.data.vessel != null) { // petit vaisseau sectionné au fond de la plaie
    const tv = S.data.vessel, c = ptAt(tv, 1, -0.03), q = c.q, yb = -Math.min(0.24, 0.5 * W.d * Math.pow(Math.sin(PI * tv), 0.45)); // dans la paroi, à la profondeur des points enfouis
    const vg = new THREE.Group(), vm = new THREE.MeshStandardMaterial({ color: 0x8a1c1a, roughness: 0.3 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12).rotateZ(PI / 2), vm); cyl.position.set(q.nx * 0.3, 0, q.nz * 0.3); cyl.rotation.y = -Math.atan2(q.nz, q.nx); vg.add(cyl);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshStandardMaterial({ color: 0xa3120f, roughness: 0.08 })); bead.position.set(-q.nx * 0.04, 0, -q.nz * 0.04); vg.add(bead);
    vg.position.set(c.P0.x, yb, c.P0.z); vg.userData.bead = bead; padGroup.add(vg); S.vessel = vg;
    if (S.bleedLv < 2) S.bleedLv = 2;
  }
  S.blood = { V: S.bleedLv ? 0.25 : 0, flow: [0, 0.05, 0.3, 0.9][S.bleedLv], compress: 0 };
  // saletés à laver
  addDirt();
  buildGuides();
}

function addDirt() {
  const g = new THREE.IcosahedronGeometry(0.03, 0); const m = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 });
  const inst = new THREE.InstancedMesh(g, m, 26); const M = new THREE.Matrix4();
  for (let k = 0; k < 26; k++) {
    const t = Math.random(), i = Math.floor(t * (W.pts.length - 1)); const p = W.pts[i];
    const q = nearest(p[0], p[2]); const off = (Math.random() < 0.5 ? -1 : 1) * (gAt(t) + 0.05 + Math.random() * 0.8);
    M.makeScale(1 + Math.random(), 0.6, 1 + Math.random()).setPosition(p[0] + q.nx * off, 0.01, p[2] + q.nz * off); inst.setMatrixAt(k, M);
  }
  padGroup.add(inst); S.dirt = inst;
}

// Fermeture : champ gaussien autour des points ; éversion des berges
function closureAt(t) {
  let open = 1; const sig = S.key === 'face' ? 0.22 : 0.45;
  for (const st of S.stitches) { const kk = st.tied ? st.k : st.anch ? st.k * 0.85 * (st.kT != null ? st.kT : 1) : st.pre ? st.k * clamp(st.pre / 40) : 0; if (!kk) continue; for (const tt of (st.ts || [st.t])) { const d = (t - tt) * W.L; open *= 1 - kk * Math.exp(-(d * d) / (2 * sig * sig)); } }
  return 1 - open;
}
function deformXZ(x, y, z, q, c, ev) {
  const g = gAt(q.t), a = Math.abs(q.s), sg = Math.sign(q.s) || 1;
  const sh = a <= g ? c * a * 0.97 : c * g * Math.exp(-(a - g) / 1.0);
  let ny = y; if (y > -0.03) ny += c * ev * 0.06 * Math.exp(-Math.pow((a - g) / 0.22, 2));
  return [x - sg * sh * q.nx, ny, z - sg * sh * q.nz];
}
function applyClosure(fast) { // fast = point en cours : aperçu rapide (sans normales, un seul point redessiné)
  const pos = pad.geometry.attributes.position.array, P0 = S.base.pos;
  const bins = new Float32Array(201), ev = new Float32Array(201);
  for (let b = 0; b <= 200; b++) { bins[b] = closureAt(b / 200); }
  let eq = 0, eqn = 0; for (const st of S.stitches) if (st.tied || st.pre || st.anch) { eq += st.q / 100; eqn++; }
  const e = eqn ? eq / eqn : 1;
  band.idx.forEach((i, k) => {
    const q = band.info[k], c = bins[Math.round(clamp(q.t) * 200)];
    const r = deformXZ(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2], q, c, e);
    pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2];
  });
  pad.geometry.attributes.position.needsUpdate = true; if (!fast) pad.geometry.computeVertexNormals();
  for (const st of S.stitches) if (!fast || st === fast) buildStitch(st);
}
function deformPoint(p0) {
  const q = nearest(p0.x, p0.z), c = closureAt(q.t);
  const r = deformXZ(p0.x, p0.y, p0.z, q, c, 1); return new THREE.Vector3(r[0], r[1], r[2]);
}

// Sang (non gore : teinte mate, sans éclaboussure)
let bloodTick = 0;
function updateBlood(dt) {
  if (!S || S.mode === 'care' || !band || !S.blood) return;
  const B = S.blood;
  const closed = S.stitches.length ? S.stitches.reduce((a, s) => a + (s.tied ? s.k : 0), 0) / Math.max(1, W.L / 0.8) : 0;
  let flow = B.flow * (1 - clamp(closed));
  if (S.vessel) { if (!S.vesselOK) flow = Math.max(flow, 0.55); const bd = S.vessel.userData.bead; if (bd.visible) bd.scale.setScalar(1 + 0.45 * Math.max(0, Math.sin(performance.now() / 1000 * 2 * PI * 1.2))); }
  if (S.bleedLv === 3) { flow *= 1 + 0.6 * Math.sin(performance.now() / 1000 * 2 * PI * 1.4); if (S.step !== 'bilan') S.lost = clamp(S.lost + B.flow * dt * 0.012 * (B.compress ? 0.2 : 1), 0, 1.2); }
  if (B.compress > 0) B.V *= Math.pow(0.35, dt); else B.V = Math.min(1.5, B.V + flow * dt * 0.35);
  B.V *= Math.pow(0.985, dt);
  bloodTick += dt; if (bloodTick < 0.1) return; bloodTick = 0;
  const col = pad.geometry.attributes.color.array, C0 = S.base.col, wet = pad.geometry.attributes.wet.array;
  const inten = clamp(B.V * 2.2), spread = 0.04 + 0.45 * clamp(B.V);
  band.idx.forEach((i, k) => {
    const q = band.info[k], g = gAt(q.t), edge = Math.max(0, Math.abs(q.s) - g);
    const prof = Math.pow(Math.sin(PI * clamp(q.t)), 0.4);
    const b = clamp(inten * Math.exp(-edge / spread) * prof) * 0.88;
    col[i * 3] = lerp(C0[i * 3], BLOOD_C.r, b); col[i * 3 + 1] = lerp(C0[i * 3 + 1], BLOOD_C.g, b); col[i * 3 + 2] = lerp(C0[i * 3 + 2], BLOOD_C.b, b);
    if (b > 0.1) wet[i] = Math.max(wet[i], b);
  });
  pad.geometry.attributes.color.needsUpdate = true; pad.geometry.attributes.wet.needsUpdate = true;
  const lvl = clamp(B.V / 1.0); $('bleedbar').classList.toggle('hide', !(S.bleedLv > 0));
  $('bleedfill').style.width = (lvl * 100).toFixed(0) + '%';
  $('bleedtxt').textContent = B.flow < 0.02 ? 'Saignement contrôlé' : (['', 'Suintement', 'Saignement veineux', 'Hémorragie artérielle'][S.bleedLv]);
  if (S.mode === 'urg') { const fc = Math.round(85 + (S.pat && S.pat.betabloq ? 12 : 60) * S.lost), ta = Math.round(125 - 45 * S.lost); $('bleedtxt').textContent += ` · ♥ ${fc} · TA ${ta}/${Math.round(ta * 0.62)}`;
    if (S.lost > 0.8 && !S.shock) { S.shock = true; S.errors.push('La victime est entrée en état de choc : il fallait comprimer plus vite.'); toast('⚠️ Pâleur, sueurs, pouls rapide : état de choc !', 'bad'); } }
}
function tintSkin(rgb, amt = 0.35) {
  const C0 = S.base.col, pos = S.base.pos, n = C0.length / 3;
  for (let i = 0; i < n; i++) {
    if (pos[i * 3 + 1] < -0.06) continue;
    const r = Math.hypot(pos[i * 3], pos[i * 3 + 2] * 1.3), k = amt * clamp(1 - (r - 3) / 2);
    if (k <= 0) continue;
    for (let c = 0; c < 3; c++) C0[i * 3 + c] = lerp(C0[i * 3 + c], Math.pow(rgb[c], 2.2), k);
  }
  pad.geometry.attributes.color.array.set(C0); pad.geometry.attributes.color.needsUpdate = true;
}
function wetSkin(amt = 0.6, ms = 2500) {
  const w = pad.geometry.attributes.wet, old = w.array.slice();
  for (let i = 0; i < w.count; i++) w.array[i] = Math.max(w.array[i], amt);
  w.needsUpdate = true; setTimeout(() => { if (pad && pad.geometry.attributes.wet === w) { w.array.set(old); w.needsUpdate = true; } }, ms);
}

// Guides (aides visuelles selon le niveau)
let guides = null;
function buildGuides() {
  if (guides) padGroup.remove(guides); guides = new THREE.Group(); padGroup.add(guides);
  if (!S.L.guides || !S.data.bite) return;
  const D0 = S.data, far = S.choices.point === 'donati' || D0.tension;
  const bite = S.kind && S.kind !== 'fil' ? 0.45 : BUR(curType()) ? -0.07 : (D0.bite[0] + D0.bite[1]) / 2;
  const op = S.L.guides === 2 ? 0.85 : 0.3;
  for (const sg of [-1, 1]) {
    const pts = [];
    for (let k = 3; k <= 97; k++) { const t = k / 100, f = t * (W.pts.length - 1), i = Math.min(W.pts.length - 2, Math.floor(f)); const a = W.pts[i], b = W.pts[i + 1];
      const x = lerp(a[0], b[0], f - i), z = lerp(a[2], b[2], f - i); const q = nearest(x, z); const o = sg * (gAt(t) + bite);
      pts.push(new THREE.Vector3(x + q.nx * o, 0.02, z + q.nz * o)); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffe08a, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: op }));
    ln.computeLineDistances(); guides.add(ln);
  }
  if (S.L.guides === 2) {
    const sp = (D0.spacing[0] + D0.spacing[1]) / 2, nst = Math.max(2, Math.round(W.L / sp));
    const ringG = new THREE.RingGeometry(0.075, 0.115, 22).rotateX(-PI / 2);
    for (let k = 0; k < nst; k++) {
      const t = (k + 0.5) / nst, f = t * (W.pts.length - 1), i = Math.min(W.pts.length - 2, Math.floor(f)); const a = W.pts[i], b = W.pts[i + 1];
      const x = lerp(a[0], b[0], f - i), z = lerp(a[2], b[2], f - i); const q = nearest(x, z);
      for (const sg of [-1, 1]) { const o = sg * (gAt(t) + bite); const r = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0x9dffb0, transparent: true, opacity: 0.8 }));
        r.position.set(x + q.nx * o, 0.025, z + q.nz * o); r.userData.t = t; guides.add(r); }
    }
  }
}

// ------------------------------------------------------------------ POINTS DE SUTURE
const animN = new THREE.Group(), animH = new THREE.Group(), animF = new THREE.Group();
scene.add(animN, animH, animF); animN.visible = animH.visible = animF.visible = false;
let pendingA = null, marker = null, anim = null;
function threadMat() { return new THREE.MeshStandardMaterial({ color: 0x1d2a6b, roughness: 0.25, metalness: 0 }); }
const KNOT_G = new THREE.TorusKnotGeometry(0.028, 0.011, 40, 6, 2, 3);

function toolClone(src, dx) { const c = src.clone(); c.position.set(dx, 0, 0); c.rotation.set(0, 0, 0); return c; } // l'outil du plateau, remis à l'origine (mors en x = 0)
function tapSuture(hit) { if (anim) return; const p = padGroup.worldToLocal(hit.point.clone()); if (S.kind && S.kind !== 'fil') return placeDevice(p); }
function sampleY(x, z) {
  const r = new THREE.Raycaster(new THREE.Vector3(x, 5, z).applyMatrix4(padGroup.matrixWorld), new THREE.Vector3(0, -1, 0));
  const h = r.intersectObject(pad)[0]; return h ? padGroup.worldToLocal(h.point.clone()).y : 0;
}
function showForceps(P0, q) {
  if (!animF.children.length) animF.add(toolClone(forceps, 0));
  animF.visible = true;
  const out = new THREE.Vector3(q.nx, 0, q.nz).multiplyScalar(Math.sign(q.s));
  const tip = P0.clone().addScaledVector(out, -0.08); tip.y += 0.03;
  const dir = out.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.6, 0)).normalize();
  animF.position.copy(padGroup.localToWorld(tip.clone()));
  animF.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  animF.rotateX(PI / 2);
}

function snapRing(p) {
  if (!S || S.L.guides !== 2 || !guides) return p;
  let best = null, bd = 0.5;
  for (const r of (nextG && nextG.children.length ? nextG.children : guides.children)) { if (r.userData.t === undefined || !r.visible) continue; const d = Math.hypot(r.position.x - p.x, r.position.z - p.z); if (d < bd) { bd = d; best = r; } }
  return best ? new THREE.Vector3(best.position.x, p.y, best.position.z) : p;
}
function hideRings(tm) { if (guides) guides.children.forEach((r) => { if (r.userData.t !== undefined && Math.abs(r.userData.t - tm) * W.L < 0.3) r.visible = false; }); }
function evalStitch(A, B) {
  const D0 = S.data, tol = S.L.tol, donati = S.choices.point === 'donati', holds = donati || S.choices.point === 'horiz';
  let lo = D0.bite[0], hi = D0.bite[1];
  if (donati && !D0.tension) { lo = Math.max(lo, 0.45); hi = Math.max(hi, 0.8); }
  const m = (lo + hi) / 2, h = (hi - lo) / 2 * tol; lo = m - h; hi = m + h;
  const bS = (e) => e >= lo && e <= hi ? 1 : clamp(1 - (e < lo ? lo - e : e - hi) / (0.25 * (hi - lo) + 0.08));
  const sym = clamp(1 - (Math.abs(A.edge - B.edge) - 0.04 * tol) / (0.16 * tol));
  const ab = new THREE.Vector3().subVectors(B.P0, A.P0); ab.y = 0; ab.normalize();
  const tm = (A.q.t + B.q.t) / 2, qm = nearest((A.P0.x + B.P0.x) / 2, (A.P0.z + B.P0.z) / 2);
  const ang = Math.acos(clamp(Math.abs(ab.x * qm.nx + ab.z * qm.nz))) * 180 / PI;
  const perp = ang <= 10 * tol ? 1 : clamp(1 - (ang - 10 * tol) / (15 * tol));
  const issues = [];
  let extra = 15;
  if (D0.tension && !holds) { extra = 0; issues.push('Trop de tension pour ce point : il risque de lâcher (Donati ou matelassier).'); }
  const tooClose = Math.min(A.edge, B.edge) < (S.key === 'face' ? 0.05 : 0.08);
  if (tooClose) { extra = 0; issues.push(S.L.tear ? 'Trop près du bord : la berge se déchire.' : 'Trop près du bord : risque de déchirure.'); }
  if (S.choices.needle === 'C') issues.push('L\'aiguille ronde force pour traverser la peau.');
  if (S.choices.needle === 'D' && Math.min(A.edge, B.edge) < m) issues.push('Aiguille conventionnelle près du bord : elle peut couper la berge.');
  let q = Math.round(35 * (bS(A.edge) + bS(B.edge)) / 2 + 25 * sym + 25 * perp + extra);
  if (S.choices.needle === 'C') q -= 10;
  q = clamp(q, 0, 100);
  if (bS(A.edge) < 0.7 || bS(B.edge) < 0.7) issues.unshift(A.edge < lo || B.edge < lo ? 'Prise trop proche de la berge.' : 'Prise trop loin de la berge.');
  if (sym < 0.7) issues.push('Entrée et sortie pas à la même distance : marche d\'escalier.');
  if (perp < 0.7) issues.push('Le point n\'est pas perpendiculaire à la plaie.');
  let k = 0.62 + 0.33 * q / 100; if (D0.tension && !holds) k = Math.min(k, 0.45); if (tooClose && S.L.tear) k = 0.25;
  const st = { A0: A.P0, B0: B.P0, qa: A.q, qb: B.q, eA: A.edge, eB: B.edge, t: tm, q, k, kTear: tooClose && S.L.tear ? 0.25 : 1, issues, donati, tied: false, grp: new THREE.Group(), fil: S.choices.fil, depth: Math.max(0.22, (A.edge + B.edge) / 2 * 0.9 + 0.12) };
  return st;
}

function tube(pts, r, mat) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 3), r, 6, false), mat); }
function tubeS(pts, r, mat) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), Math.min(220, pts.length * 7), r, 8, false), mat); } // fil lisse (nœud)
function placeDevice(p) {
  const q = nearest(p.x, p.z), g = gAt(q.t);
  if (q.dd > g + 0.5 || q.t <= 0 || q.t >= 1) return toast('Touchez directement la ligne de la plaie.', 'mid');
  const tens = S.data.tension, P = new THREE.Vector3(q.qx, 0, q.qz);
  let qv = 92, k = { staple: 0.85, strip: 0.7, glue: 0.9 }[S.kind], issues = [];
  if (tens && S.kind !== 'staple') { k = 0.3; issues.push('Les berges s\'écartent : trop de tension pour cette méthode.'); qv = 40; }
  if (S.kind === 'glue' && S.key === 'curve') { k = 0.4; issues.push('Sur une articulation, la colle se fissure à chaque mouvement.'); qv = 45; }
  if (S.kind === 'staple' && S.key === 'face') { issues.push('Pas d\'agrafes au visage : cicatrice marquée.'); qv = 20; }
  if (S.kind === 'strip' && S.key === 'scalp') { issues.push('Les strips ne collent pas sur les cheveux.'); qv = 15; k = 0.2; }
  const st = { type: S.kind, t: q.t, q: qv, k, issues, tied: true, grp: new THREE.Group(), P0: P, qn: q };
  padGroup.add(st.grp); S.stitches.push(st); applyClosure();
  if (S.kind === 'staple' && !S.L.silent) flashForceps(P);
  if (!S.L.silent && issues[0]) toast(issues[0], 'bad');
  if (qv >= 80) S.pupu++;
  sutureStep();
}
function buildDevice(st) {
  const q = st.qn, C = deformPoint(st.P0); C.y = Math.max(C.y, 0) + 0.01;
  const ang = -Math.atan2(q.nz, q.nx);
  if (st.type === 'staple') {
    const m = STEEL_PLAIN, w = gAt(q.t) + 0.28;
    const grp = new THREE.Group(); grp.position.copy(C); grp.rotation.y = ang;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.03, 0.05), m); top.position.y = 0.04; grp.add(top);
    for (const sg of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.05), m); leg.position.set(sg * w, -0.01, 0); grp.add(leg); }
    st.grp.add(grp);
  } else if (st.type === 'strip') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.012, 0.32), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 }));
    s.position.copy(C); s.position.y += 0.01; s.rotation.y = ang; s.castShadow = true; st.grp.add(s);
  } else {
    const pts = []; for (let d = -0.35; d <= 0.351; d += 0.07) { const tt = clamp(st.t + d / W.L); const f = tt * (W.pts.length - 1), i = Math.min(W.pts.length - 2, Math.floor(f)); const a = W.pts[i], b = W.pts[i + 1];
      const P = deformPoint(new THREE.Vector3(lerp(a[0], b[0], f - i), 0, lerp(a[2], b[2], f - i))); P.y = Math.max(P.y, 0) + 0.02; pts.push(P); }
    st.grp.add(tube(pts, 0.09, GLUE));
  }
}
const STEEL_PLAIN = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 1, roughness: 0.25 });
const GLUE = new THREE.MeshStandardMaterial({ color: 0x9a6fd0, transparent: true, opacity: 0.45, roughness: 0.05 });

// Geste direct : poser le doigt = entrée, glisser = l'aiguille suit sous la peau, relâcher = sortie
function validPoint(h) {
  const p = snapRing(padGroup.worldToLocal(h.point.clone())), q = nearest(p.x, p.z), edge = Math.abs(q.s) - gAt(q.t);
  if (edge < 0 || q.dd > 2.5) return null;
  const P0 = new THREE.Vector3(p.x, sampleY(p.x, p.z), p.z); return { P0, q, edge };
}
// ================================================================== GESTE v5 — un seul schéma, gestes droits
// Conseil n° 3 (chirurgien formateur, designer tactile, animateur 3D) :
//  G1 passer l'aiguille (glissé) · G2 reprendre la pointe et tirer le fil (glissé) · G3 nouer (glissés alternés
//  par-dessus la plaie ; la longueur du 1er règle le serrage) · G4 couper (toucher).
//  L'aiguille est rigide : elle tourne autour de son centre de courbure. Prise profonde en deux temps
//  (sortie dans la plaie, reprise automatique, puis paroi d'en face à la même profondeur).
const NEED = { simple: 1, donati: 2, horiz: 2, x: 2, surjet: 0, intra: 0, buried: 1, hemo: 2 };
const BUR = (t) => t === 'buried' || t === 'hemo';
const LOOSE = (t) => t === 'intra' || BUR(t); // points qui se piquent dans la berge / dans la plaie
const GRIP = 0.2, LEAD = 0.25, T0 = 9.3, TK = 2 / 30;
const V3 = THREE.Vector3;
const ov = document.createElement('canvas'); ov.id = 'ov'; document.body.appendChild(ov); const og = ov.getContext('2d');
function ovResize() { const d = Math.min(window.devicePixelRatio || 1, 2); ov.width = innerWidth * d; ov.height = innerHeight * d; og.setTransform(d, 0, 0, d, 0, 0); }
window.addEventListener('resize', ovResize); ovResize();
const GHOST = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, () => new V3())), new THREE.LineDashedMaterial({ color: 0x9dffb0, dashSize: 0.05, gapSize: 0.035, transparent: true, opacity: 0.9, depthTest: false }));
GHOST.frustumCulled = false; GHOST.renderOrder = 5;
const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function tween(ms, fn) { return new Promise((res) => { const t0 = performance.now(); const f = (now) => { const t = clamp((now - t0) / ms); fn(t); if (t < 1 && S) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); }
function toScreen(vLocal) { const v = padGroup.localToWorld(vLocal.clone()).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }
const curType = () => (S && S.choices.point) || 'simple';

// ---------------------------------------------------------------- règles de chaque point
function crossSide(a, b) { return Math.sign(a.q.s) !== Math.sign(b.q.s); }
function along(a, b) { return Math.abs(a.q.t - b.q.t) * W.L; }
function bandOK(e, lo, hi) { const m = (lo + hi) / 2, h = (hi - lo) / 2 * S.L.tol; return e >= m - h && e <= m + h; }
function validLoose(h) { const p = snapRing(padGroup.worldToLocal(h.point.clone())), q = nearest(p.x, p.z), edge = Math.abs(q.s) - gAt(q.t); if (edge < -0.14 || q.dd > 2.5) return null; return { P0: new V3(p.x, 0, p.z), q, edge }; }
function passRule(type, i, A, B, cur) {
  const p0 = cur && cur.passes[0], prev = cur && cur.passes[cur.passes.length - 1], issues = [];
  if (type === 'intra') {
    if (crossSide(A, B)) return { err: 'Intradermique : chaque passage reste du même côté, dans le derme, le long de la berge.' };
    if (along(A, B) < 0.15) return { err: 'Intradermique : glissez le long de la berge (3 à 6 mm), pas vers la plaie.' };
    if (A.edge > 0.12 || B.edge > 0.12) issues.push('Trop loin du bord : l\'intradermique passe dans le derme, à 1–2 mm de la berge.');
    if (prev && Math.sign(prev.A.q.s) === Math.sign(A.q.s)) return { err: 'Intradermique : alternez, le passage suivant est de l\'autre côté.' };
    if (prev) { const dr = Math.sign(prev.B.q.t - prev.A.q.t) || 1, back = (prev.B.q.t - A.q.t) * W.L * dr;
      if (back < -0.12) issues.push('Repiquez en face de la sortie précédente, ou 1–2 mm en arrière : jamais en avant, sinon un trou reste.');
      else if (back > 0.4) issues.push('Reprise trop en arrière : 1–2 mm suffisent.'); }
    return { issues };
  }
  if (!crossSide(A, B)) return { err: 'Ce passage doit traverser la plaie : sortez de l\'autre côté.' };
  if (BUR(type)) {
    if (type === 'hemo' && i === 1) {
      if (Math.sign(A.q.s) !== Math.sign(p0.A.q.s)) return { err: 'Point en X : le 2e passage part du même côté que le premier, de l\'autre côté du vaisseau.' };
      const dd = along(A, p0.A); if (dd < 0.15 || dd > 0.9) issues.push('Encadrez le vaisseau : 2e passage 2 à 8 mm plus loin.');
    }
    if (A.edge > 0.04) issues.push('Point enfoui : piquez dans la plaie (la paroi), pas sur la peau.');
    if (Math.abs(A.edge - B.edge) > 0.06) issues.push('Entrée et sortie à la même hauteur des deux côtés, sinon les berges se décalent.');
    return { issues };
  }
  if (type === 'donati' && i === 1) {
    if (Math.sign(A.q.s) !== Math.sign(p0.B.q.s)) return { err: 'Donati : le 2e passage repart du côté de la sortie (retour « près-près »).' };
    if (!bandOK(A.edge, 0.05, 0.25) || !bandOK(B.edge, 0.05, 0.25)) issues.push('Passage près-près : à 1–2 mm du bord, superficiel.');
    if (along(A, p0.B) > 0.2 || along(B, p0.A) > 0.2) issues.push('Les 4 points du Donati doivent être sur la même ligne.');
  } else if (type === 'horiz' && i === 1) {
    if (Math.sign(A.q.s) !== Math.sign(p0.B.q.s)) return { err: 'Matelassier horizontal : le 2e passage revient du côté de la sortie.' };
    const d = along(A, p0.B); if (d < 0.3 || d > 0.9) issues.push('Décalez le retour de 4 à 8 mm le long de la plaie.');
    if (Math.abs(A.edge - p0.B.edge) > 0.15) issues.push('Gardez la même distance au bord qu\'au premier passage.');
    if (Math.abs(along(B, p0.A) - d) > 0.25) issues.push('Le retour doit être parallèle à l\'aller.');
  } else if (type === 'x' && i === 1) {
    if (Math.sign(A.q.s) !== Math.sign(p0.A.q.s)) return { err: 'Point en X : le 2e passage part du même côté que le premier.' };
    const d = along(A, p0.A); if (d < 0.3 || d > 0.9) issues.push('Décalez le 2e passage de 4 à 8 mm.');
  } else if (type === 'surjet' && prev) {
    if (Math.sign(A.q.s) !== Math.sign(p0.A.q.s)) return { err: 'Surjet : chaque passage part du même côté, le fil passe en diagonale par-dessus.' };
    const d = along(A, prev.A); if (d < 0.3 || d > 1.1) issues.push('Surjet : avancez de 4 à 10 mm entre deux passages.');
  }
  return { issues };
}
let nextG = null;
function clearNext() { if (nextG) { padGroup.remove(nextG); nextG = null; } }
function ptAt(t, side, e) { // point de la peau à la distance e de la berge, du côté « side »
  const tc = clamp(t, 0.02, 0.98), f = tc * (W.pts.length - 1), i = Math.min(W.pts.length - 2, Math.floor(f)), a = W.pts[i], b = W.pts[i + 1];
  const x = lerp(a[0], b[0], f - i), z = lerp(a[2], b[2], f - i), n = nearest(x, z), o = side * (gAt(tc) + e), px = x + n.nx * o, pz = z + n.nz * o, q = nearest(px, pz);
  return { P0: new V3(px, 0, pz), q, edge: Math.abs(q.s) - gAt(q.t) };
}
function nextTargets() {
  clearNext(); const st = N.st; if (!st || S.L.guides !== 2 || !st.passes.length) return;
  const type = st.type, p0 = st.passes[0], last = st.passes[st.passes.length - 1], bite = (S.data.bite[0] + S.data.bite[1]) / 2;
  const sA = Math.sign(p0.A.q.s) || 1, sB = -sA, dt = 0.55 / W.L, dir = Math.sign(last.A.q.t - p0.A.q.t) || (p0.A.q.t < 0.5 ? 1 : -1);
  let pts = [];
  if (type === 'donati') pts = [ptAt(p0.B.q.t, sB, 0.14), ptAt(p0.A.q.t, sA, 0.14)];
  else if (type === 'horiz') pts = [ptAt(p0.B.q.t + dt, sB, p0.B.edge), ptAt(p0.A.q.t + dt, sA, p0.A.edge)];
  else if (type === 'x') pts = [ptAt(p0.A.q.t + dt, sA, bite), ptAt(p0.B.q.t + dt, sB, bite)];
  else if (type === 'surjet') { const tn = last.A.q.t + dt * dir; if (tn < 0.05 || tn > 0.95) { if (!N.auto) toast('Bout de la plaie atteint : touchez ➰ Nouer et terminer.', ''); return; } pts = [ptAt(tn, sA, bite), ptAt(last.B.q.t + dt * dir, sB, bite)]; }
  else if (type === 'intra') { const s2 = -(Math.sign(last.A.q.s) || 1), dr = Math.sign(last.B.q.t - last.A.q.t) || 1, t0 = last.B.q.t - 0.1 / W.L * dr; const tn = t0 + 0.45 / W.L * dr; if (tn < 0.03 || tn > 0.97) { if (!N.auto) toast('Bout de la plaie atteint : touchez ➰ Tendre et terminer.', ''); return; } pts = [ptAt(t0, s2, 0.02), ptAt(tn, s2, 0.02)]; }
  nextG = new THREE.Group(); padGroup.add(nextG);
  pts.forEach((p, k) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.15, 26).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: k ? 0x6cc4ff : 0xffd34d, transparent: true, opacity: 1, depthTest: false })); r.renderOrder = 7; r.position.copy(p.P0).setY(0.03); r.userData.t = -1; r.userData.nk = k; nextG.add(r); });
}

// ---------------------------------------------------------------- aiguille rigide
function makePass(P, Q, r, e) { // arc de cercle de rayon r de P à Q dans le plan vertical (e, haut)
  const u = (v) => (v.x - P.x) * e.x + (v.z - P.z) * e.z;
  const p = [0, P.y], q = [u(Q), Q.y];
  const c = Math.hypot(q[0] - p[0], q[1] - p[1]); if (c > 2 * r * 0.995 || c < 0.02) return null;
  let nx = -(q[1] - p[1]) / c, ny = (q[0] - p[0]) / c; if (ny < 0) { nx = -nx; ny = -ny; }
  const h = Math.sqrt(r * r - c * c / 4), cx = (p[0] + q[0]) / 2 + nx * h, cy = (p[1] + q[1]) / 2 + ny * h;
  let aP = Math.atan2(p[1] - cy, p[0] - cx); if (aP > PI / 2) aP -= 2 * PI; let aQ = Math.atan2(q[1] - cy, q[0] - cx); while (aQ <= aP) aQ += 2 * PI;
  const at = (psi) => new V3(P.x + e.x * (cx + r * Math.cos(psi)), cy + r * Math.sin(psi), P.z + e.z * (cx + r * Math.cos(psi)));
  const ang = (a) => Math.atan2(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) * 180 / PI;
  return { P, Q, e, r, cx, cy, aP, aQ, sweep: aQ - aP, at, entryDeg: ang(aP), exitDeg: ang(aQ), depth: -(cy - r), center: new V3(P.x + e.x * cx, cy, P.z + e.z * cx) };
}
function needleGeo() { const m = META.needles[S.choices.needle]; return m.curv > 0 ? { r: m.r, Th: m.curv * 2 * PI, L: m.L } : { r: 1.0, Th: m.L / 1.0, L: m.L, straight: true }; }
const camRight = new V3();
function poseOnPass(pass, psiTip, lift, gfrac = GRIP) {
  const G0 = needleGeo(), e = pass.e;
  const rad = (a) => e.clone().multiplyScalar(Math.cos(a)).addScaledVector(UP, Math.sin(a)), tan = (a) => e.clone().multiplyScalar(-Math.sin(a)).addScaledVector(UP, Math.cos(a));
  let X, Y, posL, gripL;
  if (!G0.straight) { const d = psiTip - G0.Th; X = rad(d); Y = tan(d); posL = pass.center.clone(); gripL = pass.at(psiTip - G0.Th * (1 - gfrac)); }
  else { X = rad(psiTip); Y = tan(psiTip); }
  const Z = new V3().crossVectors(X, Y), q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  if (G0.straight) { posL = pass.at(psiTip).sub(new V3(0.4, G0.L / 2, 0).applyQuaternion(q)); gripL = posL.clone().add(new V3(0.4, -G0.L / 2 + G0.L * gfrac, 0).applyQuaternion(q)); }
  if (lift) { posL.add(lift); gripL.add(lift); }
  animN.position.copy(padGroup.localToWorld(posL.clone())); animN.quaternion.copy(padGroup.quaternion).multiply(q);
  if (pass.hs === undefined) { camRight.setFromMatrixColumn(camera.matrixWorld, 0); pass.hs = Z.dot(camRight) >= 0 ? 1 : -1; } // côté fixé une fois par passage
  animH.position.copy(padGroup.localToWorld(gripL.clone()));
  animH.quaternion.setFromUnitVectors(new V3(1, 0, 0), Z.clone().multiplyScalar(pass.hs * 0.75).add(new V3(0, 0.66, 0)).normalize());
  animN.visible = animH.visible = true;
  const tip = pass.at(psiTip); if (lift) tip.add(lift); return tip;
}
// v7.25 : point juste DERRIÈRE le chas, dans le prolongement de l'aiguille : le fil sort du chas dans l'axe, sans coude
function swageBack() { const G0 = needleGeo(), d = 0.28; return padGroup.worldToLocal(animN.localToWorld(G0.straight ? new V3(0.4, -G0.L / 2 - d, 0) : new V3(G0.r * Math.cos(-d / G0.r), G0.r * Math.sin(-d / G0.r), 0))); }
function swageLocal() { const G0 = needleGeo(); return padGroup.worldToLocal(animN.localToWorld(G0.straight ? new V3(0.4, -G0.L / 2, 0) : new V3(G0.r, 0, 0))); }
function fakePass(base, e, r, lift) {
  const center = base.clone(); center.y += r + lift;
  return { e, center, at: (psi) => new V3(center.x + e.x * r * Math.cos(psi), center.y + r * Math.sin(psi), center.z + e.z * r * Math.cos(psi)) };
}
const HOLDER_MAT = new THREE.MeshStandardMaterial({ color: 0xe6eaee, metalness: 0.55, roughness: 0.35, envMapIntensity: 1.4, transparent: true, opacity: 0.5, depthWrite: false }); // translucide : ne cache pas la plaie
const NEEDLE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.7, roughness: 0.2, envMapIntensity: 1.6, emissive: 0x333333 });
function ensureNeedle() {
  const k = S.choices.needle;
  if (!animN.children.length || animN.userData.k !== k || animN.userData.g !== S.L.guides) {
    animN.clear(); const m = needles[k].src.clone(); m.material = NEEDLE_MAT; animN.add(m); animN.userData.k = k; animN.userData.g = S.L.guides;
    const nm = META.needles[k];
    if (nm.curv > 0 && S.L.guides) { // contour lumineux visible même sous la peau (aide)
      const Th = nm.curv * 2 * PI, pts = []; for (let i = 0; i <= 30; i++) { const a = Th * i / 30; pts.push(new V3(nm.r * Math.cos(a), nm.r * Math.sin(a), 0)); }
      const halo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 8, false), new THREE.MeshBasicMaterial({ color: 0xffe45c, transparent: true, opacity: 0.55, depthTest: false }));
      halo.renderOrder = 6; animN.add(halo);
    }
  }
  if (!animH.children.length) { const hc = toolClone(holder, -0.35); hc.material = HOLDER_MAT; hc.castShadow = false; animH.add(hc); }
}
function idlePose() { // aiguille au repos : près du dernier point de sortie si un point est en cours, sinon près du milieu de la plaie
  if (!S || S.kind !== 'fil' || !W.pts.length || anim || !pad) return;
  ensureNeedle(); const { r } = needleGeo(), st = N.st;
  let base, e;
  if (st && st.passes.length) { const B = st.passes[st.passes.length - 1].B, sg = Math.sign(B.q.s) || 1; e = new V3(-sg * B.q.nx, 0, -sg * B.q.nz); base = B.P0.clone().addScaledVector(e, -0.7); }
  else { // rangée à l'écart, du côté de l'utilisateur, pour ne rien cacher
    const mid = W.pts[Math.floor(W.pts.length * 0.3)], q = nearest(mid[0], mid[2]), sg = (q.nz * (camera.position.z - cam.target.z) + q.nx * (camera.position.x - cam.target.x)) >= 0 ? 1 : -1;
    e = new V3(-sg * q.nx, 0, -sg * q.nz); base = new V3(mid[0] + sg * q.nx * 1.9, 0, mid[2] + sg * q.nz * 1.9); }
  N.parkOut = e.clone().negate();
  poseOnPass(fakePass(base, e, r, 0.55), -PI / 2 + 0.3);
}

// ---------------------------------------------------------------- fil dynamique (tube pré-alloué, aucune allocation par image)
class DynTube {
  constructor(maxPts, sides, mat) {
    this.max = maxPts; this.s = sides; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxPts * sides * 3); this.nor = new Float32Array(maxPts * sides * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < maxPts - 1; i++) for (let k = 0; k < sides; k++) { const a = i * sides + k, b = i * sides + (k + 1) % sides; idx.push(a, b, b + sides, a, b + sides, a + sides); }
    g.setIndex(idx); this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.t = new V3(); this.n = new V3(); this.b = new V3();
  }
  set(pts, r) {
    const n = Math.min(pts.length, this.max), s = this.s, { t, n: nn, b } = this; if (n < 2) { this.mesh.visible = false; return; }
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
      t.subVectors(c, a); if (t.lengthSq() < 1e-10) t.set(1, 0, 0); t.normalize();
      nn.crossVectors(t, UP); if (nn.lengthSq() < 1e-4) nn.set(1, 0, 0).cross(t); nn.normalize(); b.crossVectors(t, nn);
      for (let k = 0; k < s; k++) { const an = 2 * PI * k / s, cs = Math.cos(an), sn = Math.sin(an), o = (i * s + k) * 3, nx = nn.x * cs + b.x * sn, ny = nn.y * cs + b.y * sn, nz = nn.z * cs + b.z * sn;
        this.pos[o] = p.x + nx * r; this.pos[o + 1] = p.y + ny * r; this.pos[o + 2] = p.z + nz * r; this.nor[o] = nx; this.nor[o + 1] = ny; this.nor[o + 2] = nz; }
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.setDrawRange(0, (n - 1) * s * 6); this.mesh.visible = true;
  }
}
const TAIL_MAT = threadMat(), LIVE = new DynTube(120, 5, threadMat()), TAILT = new DynTube(48, 5, TAIL_MAT);
function sag(a, b, out, n = 7) { const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, lo = Math.min(a.y, b.y), cy = Math.max(0.03, lo + Math.abs(a.y - b.y) * 0.12); for (let i = 1; i < n; i++) { const u = i / n, v = 1 - u; out.push(new V3(v * v * a.x + 2 * u * v * cx + u * u * b.x, v * v * a.y + 2 * u * v * cy + u * u * b.y, v * v * a.z + 2 * u * v * cz + u * u * b.z)); } }
function arcPts(pass, a0, a1, out) { const n = Math.max(2, Math.ceil((a1 - a0) / 0.14)); for (let i = 0; i <= n; i++) out.push(pass.at(a0 + (a1 - a0) * i / n)); }
function archPts(a, b, h, out, n = 7) { for (let i = 0; i <= n; i++) { const u = i / n; out.push(new V3(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + 4 * h * u * (1 - u), lerp(a.z, b.z, u))); } }
function tailCurve(A, T) { // brin court couché sur la peau, qui part de l'entrée
  const sg = Math.sign(A.q.s) || 1, ox = sg * A.q.nx, oz = sg * A.q.nz, sd = (A.P0.x * A.q.tx + A.P0.z * A.q.tz) >= 0 ? 1 : -1, yd = S.drape ? 0.14 : 0.025, pts = [];
  const n = clamp(Math.ceil(T / 0.25), 2, 44);
  for (let i = 0; i <= n; i++) { const s = T * i / n, o = 1.0 * (1 - Math.exp(-s / 0.7)) + 0.08 * Math.sin(s * 1.7), l = 0.93 * 0.45 * Math.log(1 + Math.exp((s - 0.55) / 0.45)), /* v7.25 : virage arrondi (avant : coude net à 5 mm) */ k = clamp((s - 0.6) / 1.0);
    pts.push(new V3(A.P0.x + ox * o + A.q.tx * sd * l, 0.025 + (yd - 0.025) * k * k * (3 - 2 * k), A.P0.z + oz * o + A.q.tz * sd * l)); }
  return pts;
}

// ---------------------------------------------------------------- moteur
const N = { ph: 'idle', st: null, d: null, pen: [], auto: false };
function nCap(full, short) { if (N.auto) return; caption(S && S.L.hints ? full : (short || '')); }
function nPen(p, msg) { if (!N.pen.some((x) => x.msg === msg)) N.pen.push({ p, msg }); if (!S.L.silent) toast(msg, 'bad'); vib(40); }
function nReset() { // tout remettre à zéro (changement de plaie, annulation)
  N.ph = 'idle'; N.d = null; N.st = null; N.kn = null; N.pen = []; N.touch = null; N.vFix = null; N.tipL = null; if (S) S.cur = null;
  GHOST.visible = false; setTent(null, 0, null, 0); animF.visible = false; clearNext();
  if (S && S.step === 'suture' && S.kind === 'fil') idlePose(); else { animN.visible = animH.visible = false; }
}
const gReset = nReset;
function leadOf(A) { return LEAD * clamp(Math.max(A.edge, 0.1) / 0.4, 0.4, 1); }
function passDown(A, F0) {
  ensureNeedle(); const type = curType(), i = N.st ? N.st.passes.length : 0;
  const Db = BUR(type) ? Math.min(0.24, 0.5 * W.d * Math.pow(Math.sin(PI * clamp(A.q.t, 0.03, 0.97)), 0.45)) : 0;
  N.d = { A, i, type, buried: BUR(type), shallow: type === 'intra' || BUR(type) || (type === 'donati' && i === 1), stage: 1, P: A.P0.clone().setY(-Db), F0: (F0 || A.P0).clone(), F: (F0 || A.P0).clone(), psi: null };
  N.ph = 'pass'; N.offAxis = false; if (!N.st) N.pen = []; vib(8);
  nCap(BUR(type) ? 'L\'aiguille pique dans la paroi de la plaie, sous le derme… glissez vers la paroi d\'en face.' : 'L\'aiguille pique droit dans la peau… continuez de glisser vers l\'autre côté.', 'Passer');
}
function passGeom(d) {
  const A = d.A, P = d.P, F = d.F, { r, Th } = needleGeo(), avail = Th * (1 - GRIP) - 0.05;
  const sg = Math.sign(A.q.s) || 1, nIn = new V3(-sg * A.q.nx, 0, -sg * A.q.nz), v = new V3(F.x - d.F0.x, 0, F.z - d.F0.z), dist = v.length(); // déplacement du doigt depuis son point de départ
  if (!d.frozen) {
    if (d.forceE) d.e = d.forceE;
    else if (dist > 0.12) d.e = v.clone().multiplyScalar(1 / dist);
    else if (!d.e) d.e = d.type === 'intra' ? new V3(A.q.tx, 0, A.q.tz).multiplyScalar(A.q.t < 0.5 ? 1 : -1) : nIn.clone();
  }
  const e = d.e; d.x = Math.max(0, v.dot(e)); d.lead = leadOf(A); d.tipX = d.x + Math.min(d.x, d.lead); d.r = r; d.avail = avail;
  if (!d.frozen) {
    const cn = e.dot(nIn), cosn = Math.max(0.35, Math.abs(cn)), gw = gAt(A.q.t), Dd = W.d * Math.pow(Math.sin(PI * clamp(A.q.t, 0.03, 0.97)), 0.45);
    d.xm = Math.abs(A.q.s) / cosn; d.mirror = d.pred != null ? d.pred : (d.type === 'intra' ? 0.45 : 2 * d.xm); d.farEdge = d.type === 'intra' ? 0.15 : d.buried ? d.xm + 0.03 : d.xm + gw / cosn + 0.03; d.gw = gw; d.Dd = Dd; d.two = false;
    if (!d.shallow && cn > 0.3) { // prise profonde : 1er temps jusqu'à la paroi de la plaie
      const x1 = Math.min(Math.max(A.edge, 0.05) / cosn, r * 0.98);
      let dep = clamp(Math.sqrt(Math.max(1e-4, 2 * r * x1 - x1 * x1)) * 0.97, 0.08, 0.85 * Dd);
      for (let k = 0; k < 9; k++) {
        const f = dep / (Dd + 0.06), lat = gw * Math.pow(Math.max(0, 1 - f), 1.25) * 0.85 / cosn;
        const Q1 = P.clone().addScaledVector(e, d.xm - lat).setY(-dep), p1 = makePass(P, Q1, r, e);
        if (p1 && p1.sweep <= avail - 0.2) { d.two = true; d.p1 = p1; d.P2 = P.clone().addScaledVector(e, d.xm + lat).setY(-dep); d.x1 = d.xm - lat; d.x2 = d.xm + lat; d.dep = dep; break; }
        dep *= 0.8; if (dep < 0.06) break;
      }
    }
    d.cmax = 2 * r * Math.sin(Math.min(avail - 0.3, PI * 0.96) / 2);
    if (d.forceE || (d.two ? d.x > 0.3 * d.x1 : d.x > 0.15)) d.frozen = true;
  }
  // point de sortie : sous la pointe dès qu'elle dépasse le point symétrique de l'entrée
  let qx = Math.max(d.tipX, d.mirror);
  if (S.L.guides === 2 && !N.auto && d.type !== 'intra') { const Qp = P.clone().addScaledVector(e, qx), sn = snapRing(Qp); if (sn !== Qp) { const sx = (sn.x - P.x) * e.x + (sn.z - P.z) * e.z; if (Math.abs(sx - d.tipX) < 0.4 || d.tipX < sx) qx = Math.max(sx, d.farEdge); } }
  if (d.two) { qx = Math.min(qx, d.x2 + Math.sqrt(Math.max(0.01, d.cmax * d.cmax - d.dep * d.dep))); d.p2 = makePass(d.P2, P.clone().addScaledVector(e, qx), r, e) || d.p2; }
  else { qx = clamp(qx, 0.08, d.cmax); const hs = d.p1 && d.p1.hs; d.p1 = makePass(P, P.clone().addScaledVector(e, qx), r, e) || d.p1; if (d.p1 && hs !== undefined) d.p1.hs = hs; }
  if (d.two && d.p2 && d.hs2 !== undefined) d.p2.hs = d.hs2;
  if (d.releasing) d.tipX = Math.max(d.tipX, qx);
  d.qx = qx; d.reach = d.tipX >= qx - 1e-3;
}
function passFrame(dt) {
  const d = N.d; passGeom(d); const r = d.r; let pass, psiT;
  if (d.two && d.stage === 1) { pass = d.p1; psiT = clamp(-Math.acos(clamp((d.tipX - pass.cx) / r, -1, 1)), pass.aP - 0.06, pass.aQ + 0.16); d.want2 = d.tipX >= d.x1 + 0.03; if (d.want2) psiT = pass.aQ + 0.16; }
  else { pass = d.two ? d.p2 : d.p1; if (!pass) return; const xs = d.two ? d.tipX - d.x2 : d.tipX; psiT = clamp(-Math.acos(clamp((xs - pass.cx) / r, -1, 1)), pass.aP - 0.06, pass.aQ); if (d.reach) psiT = Math.min(pass.aQ + 0.25, pass.aP + d.avail); }
  if (d.psi == null) d.psi = pass.aP - 0.06;
  d.psi += (psiT - d.psi) * (1 - Math.exp(-18 * dt)); d.pass = pass;
  N.tipL = poseOnPass(pass, d.psi); if (d.two && d.stage === 2) d.hs2 = pass.hs;
  const fin = !d.two || d.stage === 2; d.emerged = fin && d.reach && d.psi >= pass.aQ + 0.13;
  // peau : s'enfonce sous la pointe à l'entrée, se soulève à la sortie
  const inP = clamp((d.psi - pass.aP + 0.06) / 0.25), outP = fin ? clamp((d.psi - pass.aQ + 0.3) / 0.3) * clamp((pass.aQ + 0.14 - d.psi) / 0.1) : 0;
  setTent(d.P, (d.stage === 1 || !d.two) ? 0.05 * (1 - inP) + 0.012 : 0.012, fin ? d.P.clone().addScaledVector(d.e, d.qx) : null, -0.045 * outP);
  if (S.L.guides && !GHOST.parent) padGroup.add(GHOST);
  if (S.L.guides) { const pts = [], ps = d.two ? [d.p1, d.p2] : [d.p1], n = Math.floor(60 / ps.length); for (const p of ps) for (let i = 0; i < n; i++) { const w = p.at(p.aP + p.sweep * i / (n - 1)); w.y += 0.004; pts.push(w); } GHOST.geometry.setFromPoints(pts); GHOST.computeLineDistances(); GHOST.visible = true; }
  if (d.two && d.stage === 1 && d.want2 && d.psi >= pass.aQ + 0.1) startMid();
  else if (d.releasing && d.emerged) passExit();
}
function startMid() { // reprise automatique de l'aiguille dans la plaie (0,3 s)
  const d = N.d; N.ph = 'mid'; vib(12);
  nCap('La pointe sort dans la plaie : on reprend l\'aiguille, puis on repique en face, à la même profondeur.', 'Passer');
  const p0 = animN.position.clone(), q0 = animN.quaternion.clone(), h0 = animH.position.clone(), g0 = animH.quaternion.clone();
  passGeom(d); d.p2.hs = d.hs2 = d.p1.hs; poseOnPass(d.p2, d.p2.aP - 0.02);
  const p1 = animN.position.clone(), q1 = animN.quaternion.clone(), h1 = animH.position.clone(), g1 = animH.quaternion.clone(), t0 = performance.now();
  animN.position.copy(p0); animN.quaternion.copy(q0); animH.position.copy(h0); animH.quaternion.copy(g0);
  anim = (now) => { const t = ease(clamp((now - t0) / 300));
    animN.position.lerpVectors(p0, p1, t); animN.quaternion.slerpQuaternions(q0, q1, t); animH.position.lerpVectors(h0, h1, t); animH.quaternion.slerpQuaternions(g0, g1, t);
    if (t >= 1) { anim = null; d.stage = 2; d.psi = d.p2.aP - 0.02; N.ph = 'pass'; nCap('Continuez jusqu\'à la sortie, puis relâchez quand la pointe ressort.', 'Passer'); } };
}
function passUp() {
  const d = N.d; if (!d || N.ph !== 'pass') return;
  const fin = !d.two || d.stage === 2;
  if (fin && d.emerged) return passExit();
  if (fin && d.tipX >= d.farEdge) { d.mirror = d.pred = Math.min(d.mirror, Math.max(d.tipX, d.farEdge)); d.releasing = true; return; } // sortie là où on relâche
  if (d.stage === 1 && d.x < 0.07) { N.d = null; N.ph = 'idle'; GHOST.visible = false; setTent(null, 0, null, 0); idlePose(); return nIdleCap(); }
  nCap('Aiguille plantée : reposez le doigt et continuez jusqu\'à l\'autre côté (↩ pour annuler).', 'Passer');
}
function passExit() {
  const d = N.d; d.releasing = false; GHOST.visible = false;
  const Q = d.P.clone().addScaledVector(d.e, d.qx), q = nearest(Q.x, Q.z), B = { P0: new V3(Q.x, 0, Q.z), q, edge: Math.abs(q.s) - gAt(q.t) };
  const bad = (msg) => { toast('✗ ' + msg, 'bad'); N.d = null; N.ph = 'idle'; setTent(null, 0, null, 0); idlePose(); nIdleCap(); };
  if (d.buried && B.edge > 0.06) return bad('Point enfoui : ressortez DANS la plaie, dans la paroi d\'en face, pas sur la peau.');
  if (!LOOSE(d.type) && B.edge < 0.01) return bad('L\'aiguille est trop petite pour cette prise : piquez plus près de la berge ou changez d\'aiguille.');
  const r = passRule(d.type, d.i, d.A, B, N.st); if (r.err) return bad(r.err);
  d.B = B; d.issues = r.issues || []; d.psiOut = d.psi; N.ph = 'out'; N.v = 0; vib(15); setTent(null, 0, null, 0);
  nCap(d.i === 0 ? 'Touchez la pointe qui dépasse (cercle jaune) et tirez : le fil passe. Gardez un brin court de 2 à 4 cm.' : 'Touchez la pointe (cercle jaune) et tirez pour tendre la boucle.', 'Tirer le fil');
}
function pullEff() { if (N.vFix != null) return N.vFix; let v = N.v || 0; if (N.d && N.d.i === 0 && S.level === 'deb') { v = v <= 80 ? v : 80 + (v - 80) * 0.3; v = Math.min(v, 125); } return v; }
function tailLen() { return clamp(T0 - pullEff() * TK, 0, T0); }
function pullDown() { if (N.ph !== 'out') return false; N.ph = 'pull'; N.vBase = N.v || 0; vib(10); return true; }
function pullMove(v, cosAxis) {
  N.v = N.vBase + v; const d = N.d;
  if (cosAxis !== undefined && cosAxis < 0.25 && v > 45 && S.L.tear && !N.offAxis) { N.offAxis = true; nPen(6, 'Tirez dans l\'axe de la courbe : une traction de travers déchire la berge.'); }
  if (d.i === 0) { const T = tailLen(); nCap(`Brin court : ${T.toFixed(1).replace('.', ',')} cm ${T > 4 ? '— tirez encore' : T >= 2 ? '✓ relâchez' : '— trop court !'}`, 'Tirer le fil'); }
}
function pullFrame() {
  const d = N.d, G0 = needleGeo(), pass = d.two ? d.p2 : d.p1, eff = pullEff(), fr = clamp(eff / 60), ex = Math.max(0, eff - 60) / 85;
  d.psi = lerp(d.psiOut, pass.aQ + G0.Th + 0.04, ease(fr));
  N.tipL = poseOnPass(pass, d.psi, ex > 0 ? d.e.clone().multiplyScalar(ex * 0.5).add(new V3(0, ex * 0.6, 0)) : null, 0.72);
}
function pullUp() {
  if (N.ph !== 'pull') return; const d = N.d;
  if (d.i === 0) {
    const T = tailLen();
    if (T > 4.6) { N.ph = 'out'; return nCap('Le brin est encore trop long : reprenez l\'aiguille et tirez encore.', 'Tirer le fil'); }
    if (T < 0.3) { nPen(10, 'Le fil est ressorti de la peau : passage à refaire.'); N.d = null; N.ph = 'idle'; idlePose(); return nIdleCap(); }
    if (T < 1.5) nPen(4, 'Brin court trop court : il sera difficile à nouer (2 à 3 cm).');
  } else {
    if (pullEff() < 63) { N.ph = 'out'; return nCap('La boucle est encore lâche : tirez encore un peu.', 'Tirer le fil'); }
    if (pullEff() > 185 && S.L.tear) nPen(5, 'Fil trop tiré : la peau fronce.');
  }
  commitPass();
}
function commitPass() {
  const d = N.d, type = d.type; let st = N.st;
  if (!st) {
    st = evalStitch(d.A, d.B); Object.assign(st, { type, multi: true, passes: [], ts: [], issuesP: [], tied: false, seed: Math.random(), nx: 1 });
    if (type === 'intra') { st.q = 88; st.issues = []; }
    if (BUR(type)) { st.q = 92; st.issues = []; st.mat = new THREE.MeshStandardMaterial({ color: 0x6b3fa0, roughness: 0.35 }); }
    N.st = S.cur = st; padGroup.add(st.grp); S.stitches.push(st);
  } else if (type !== 'intra' && !BUR(type) && !(type === 'donati' && d.i === 1)) { const e2 = evalStitch(d.A, d.B); st.q = Math.round((st.q * st.nx + e2.q) / (st.nx + 1)); st.nx++; if (e2.issues[0]) st.issuesP.push(e2.issues[0]); st.kTear = Math.min(st.kTear, e2.kTear); }
  st.issuesP.push(...d.issues);
  const pts = []; arcPts(d.p1, d.p1.aP, d.p1.aQ, pts); if (d.two) arcPts(d.p2, d.p2.aP, d.p2.aQ, pts);
  const tm = (d.A.q.t + d.B.q.t) / 2;
  st.passes.push({ A0: d.A.P0, B0: d.B.P0, A: d.A, B: d.B, pts, gap: d.two ? [d.p1.at(d.p1.aQ), d.P2.clone()] : null, depth: d.two ? d.dep : d.p1.depth });
  st.ts.push(tm); st.t = st.ts.reduce((a, b) => a + b, 0) / st.ts.length; hideRings(tm);
  if (d.i === 0) st.tailT = tailLen();
  N.d = null; N.v = 0; N.vFix = null; idlePose(); buildStitch(st);
  const need = NEED[type], n = st.passes.length;
  if (type === 'surjet' && n === 1) return knotStart('anchor');
  if (need && n >= need) return knotStart('final');
  N.ph = 'idle'; if (st.anch) applyClosure();
  nextTargets(); nIdleCap(); if (!N.auto) sutureStep();
}
const MULTI_MSG = { hemo: '2e passage : repartez du même côté, de l\'autre côté du vaisseau. Les deux passages encadrent le vaisseau et font un X.', buried: '', donati: '2e passage « près-près » : repiquez du côté de la sortie, à 1–2 mm du bord, et revenez.', horiz: '2e passage : repiquez du côté de la sortie, 4–8 mm plus loin, et revenez.', x: '2e passage : repartez du même côté que le premier, 4–8 mm plus loin.', surjet: 'Passage suivant : même côté de départ, 4–10 mm plus loin. Puis ➰ Nouer quand la plaie est couverte.', intra: 'Passage suivant : de l\'autre côté, dans la berge, le long de la plaie. Puis ➰ Tendre à la fin.' };
function nIdleCap() {
  const st = N.st, g2 = S.L.guides === 2;
  if (st && st.passes.length) return nCap((g2 ? '🟡 entrée → 🔵 sortie. ' : '') + MULTI_MSG[st.type], 'Passage suivant');
  if (BUR(curType())) return nCap((S.plane === 'hemo' ? '🩸 Vaisseau · ' : S.plane === 'deep' ? 'Plan profond · ' : '') + (g2 ? 'Posez le doigt sur un rond, au bord de la plaie, et glissez vers celui d\'en face : l\'aiguille passe dans les parois, en profondeur.' : 'Piquez dans la paroi de la plaie, sous le derme, et glissez vers la paroi d\'en face.'), 'Point enfoui');
  nCap(curType() === 'intra' ? 'Posez le doigt dans la berge, à un bout de la plaie, et glissez le long du bord.' : (g2 ? 'Posez le doigt sur un rond vert et glissez vers celui d\'en face : l\'aiguille suit.' : 'Posez le doigt à l\'entrée et glissez vers l\'autre côté de la plaie : l\'aiguille suit.'), 'Passer l\'aiguille');
}
// ---- nœud : glissés droits par-dessus la plaie
function knotStart(kind) {
  const st = N.st; if (!st || !st.passes.length) return;
  N.ph = 'knot'; N.kn = { kind, throws: [], tension: 0, need: kind === 'tend' ? 1 : 3, cur: null, step: kind === 'tend' ? 'pull' : 'place', wraps: 0, pT: 0 };
  animN.visible = animH.visible = false; clearNext(); buildStitch(st);
  if (kind !== 'tend' && save.autoKnot && !N.auto && S.level !== 'exam') setTimeout(() => { if (N.ph === 'knot' && N.kn && !N.auto) rescue(); }, 500);
  if (kind !== 'tend') { const c = new V3().lerpVectors(st.passes[0].A0, st.passes[st.passes.length - 1].B0, 0.5); N.viewBack = true; setView(c.clone().add(new V3(0, 0, 0.25)), 3.3, 0.5, cam.TH); knotCap(); if (!N.auto) sutureStep(); return; } // vue rapprochée sur le nœud
  nCap(kind === 'tend' ? 'Tendez le fil : glissez par-dessus la plaie. Plus vous allez loin, plus les berges se rapprochent.' : 'Nœud : posez le doigt d\'un côté de la plaie et glissez de l\'AUTRE côté (suivez la flèche jaune).' + (easyK() ? '' : ' Plus vous allez loin, plus ça serre.'), kind === 'tend' ? 'Tendre' : 'Nouer');
  if (!N.auto) sutureStep();
}
// Nœud à la pince (MSF, « nœuds à la pince ») : ① enrouler le chef long autour du porte-aiguille (2 tours au 1er jeté :
// nœud du chirurgien, 1 tour ensuite, chaque fois dans l'autre sens) ② saisir le chef court ③ tirer à plat de l'autre côté.
const wrapNeed = (k) => (k.throws.length === 0 ? 2 : 1);
function knotCap() {
  const k = N.kn; if (!k) return; if (S && S.lessonKey === 'atelier') setTimeout(atelierPanel, 0); const n = k.throws.length, j = `Jeté ${n + 1}/${k.need} · `;
  if (k.step === 'place') nCap(j + '⓪ Placez le porte-aiguille juste au-dessus de la plaie, ENTRE les 2 brins, parallèle à la plaie : touchez le rond blanc.', 'Poser la pince');
  else if (k.step === 'wrap') nCap(j + `① Enroulez le brin long autour du porte-aiguille, VERS le bout court (${easyK() ? 'touchez le rond jaune' : 'petit glissé dans le sens de la flèche verte'}) : ${wrapNeed(k) === 2 ? '2 tours, ou 3 si le fil glisse (nœud du chirurgien)' : '1 tour'}${n ? ', dans l\'autre sens que le jeté d\'avant' : ''}. (${k.wraps}/${wrapNeed(k)})`, 'Enrouler');
  else if (k.step === 'grab') nCap(j + '② Les boucles restent sur les mors : ouvrez-les et allez saisir le bout court par son extrémité (touchez-le, rond bleu).', 'Saisir le bout court');
  else nCap(j + `③ Tirez à plat : les boucles glissent hors des mors sur le bout court ; le porte-aiguille le ramène de l'autre côté (glissez, flèche jaune), ${(save.holdTool || 'pince') === 'pince' ? 'la pince à disséquer' : 'la main gantée'} tire le brin long dans l'autre sens. Les deux tirent parallèle à la peau.` + (n === 0 && !easyK() ? ' Plus vous allez loin, plus ça serre.' : ''), 'Tirer');
}
const KS = () => (N.slow ? 2.2 : 1); // démo lente
function knotAnim(k, ms, fn) { const st = N.st, id = (k.aid = (k.aid || 0) + 1); tween(ms, (u) => { if (N.kn !== k || k.aid !== id) return; fn(u); buildStitch(st); }); } // image par image
function knotTap(p) { // étapes ① et ② : de simples touchers
  const k = N.kn, easy = easyK() || N.auto;
  if (k.step === 'place') {
    if (!easy && k.HT && p.distanceTo(k.HT.clone().setY(p.y)) > 1.2) return toast('Touchez la plaie entre les 2 brins (rond blanc) pour y placer la pince, juste au-dessus.', 'mid');
    k.step = 'wrap'; k.pT = 0; vib(6); knotAnim(k, 450 * KS(), (u) => (k.pT = u));
  } else if (k.step === 'wrap') {
    if (!easy && k.HT && p.distanceTo(k.HT.clone().setY(p.y)) > 1.1) return toast('Touchez le porte-aiguille (rond jaune) pour enrouler le fil.', 'mid');
    const w0 = k.wraps; k.wraps++; vib(8); knotAnim(k, 520 * KS(), (u) => (k.wv = w0 + ease(u)));
    if (k.wraps >= wrapNeed(k)) { k.step = 'grab'; if (!N.auto && k.throws.length === 0) toast('2 tours : le premier jeté ne glissera pas (nœud du chirurgien).', ''); }
  } else if (k.step === 'grab' && k.throws.length === 0 && k.wraps < 3 && k.HT && p.distanceTo(k.HT.clone().setY(p.y)) < 0.5 && p.distanceTo(k.TT.clone().setY(p.y)) > 0.5) {
    const w0 = k.wraps; k.wraps++; vib(8); knotAnim(k, 520 * KS(), (u) => (k.wv = w0 + ease(u))); toast('3e tour : utile avec un fil glissant (monofilament).', '');
  } else if (k.step === 'grab') {
    if (!easy && k.TT && p.distanceTo(k.TT.clone().setY(p.y)) > 0.9) return toast('Touchez le bout court du fil (rond bleu).', 'mid');
    k.step = 'pull'; vib(10); k.gT = 0; knotAnim(k, 520 * KS(), (u) => (k.gT = u));
  }
  buildStitch(N.st); knotCap(); if (!N.auto) sutureStep();
}
function offOf(p) { const q = nearest(p.x, p.z); return { s: Math.sign(q.s) || 1, off: Math.abs(q.s) - gAt(q.t) }; }
const easyK = () => S && (S.level === 'deb' || S.mode === 'learn');
function throwDown(p) { if (N.ph !== 'knot') return false; const k = N.kn; if (k.step === 'wrap' && !(easyK() || N.auto)) { k.wd0 = p.clone(); k.wd1 = p.clone(); return true; } if (k.step && k.step !== 'pull') { knotTap(p); return true; } const o = offOf(p); k.s0 = o.s; k.p0 = p.clone(); k.crossed = false; k.cur = p.clone(); k.live = true; return true; }
let prevT = 0;
function tensionPreview(force) { const now = performance.now(); if (!force && now - prevT < 45) return; prevT = now; const st = N.st; st.pre = N.kn.tension; applyClosure(st); }
function throwMove(p) {
  const k = N.kn; if (k && k.step === 'wrap' && k.wd0) { k.wd1 = p.clone(); return; }
  if (!k || !k.live || (k.step && k.step !== 'pull')) return; const o = offOf(p); k.cur = p.clone(); 
  k.crossed = o.s !== k.s0 && o.off > (easyK() ? -0.03 : 0.02);
  k.dirty = true;
  if (k.throws.length === 0) { const t = !k.crossed ? 0 : easyK() ? clamp(45 + o.off * 25, 45, 80) : clamp((o.off - 0.2) / 1.0) * 100; if (t >= 40 && k.tension < 40) vib(10); if (t > 85 && k.tension <= 85) vib(60); k.tension = t; tensionPreview(); }
}
function throwUp() {
  const k0 = N.kn;
  if (k0 && k0.step === 'wrap' && k0.wd0) { // ① un tour = un petit glissé du porte-aiguille vers le bout court
    const d = k0.wd1.clone().sub(k0.wd0); d.y = 0; k0.wd0 = null;
    if (d.length() < 0.2) return toast('Glissez court, du porte-aiguille vers le bout court (flèche verte) : un glissé = un tour.', 'mid');
    if (k0.SD && d.dot(k0.SD) < 0) { nPen(6, 'Enroulé dans le mauvais sens : on enroule toujours vers le bout court, sinon nœud de vache.'); return toast('✗ Mauvais sens : ce tour ferait un nœud de vache (il glisse et vrille). Enroulez vers le bout court.', 'bad'); }
    return knotTap(k0.HT || k0.wd1);
  }
  const k = N.kn; if (!k || !k.live) return; k.live = false; const st = N.st, n = k.throws.length, redraw = () => { if (n === 0) { k.tension = 0; tensionPreview(true); } else buildStitch(st); };
  if (!k.crossed) { if (!N.auto) toast('Glissez par-dessus la plaie, d\'un côté jusqu\'à l\'autre.', 'mid'); k.cur = null; return redraw(); }
  const dir = -k.s0;
  if (n === 0 && k.tension < 40 && S.level === 'deb') { toast('Allez un peu plus loin : les berges doivent se toucher.', 'mid'); k.cur = null; return redraw(); }
  if (n > 0 && dir === k.throws[n - 1]) { if (S.L.hints) { toast('Même sens que le jeté précédent : glissez dans l\'autre sens.', 'mid'); k.cur = null; return redraw(); } nPen(10, 'Deux jetés dans le même sens : nœud de vache, qui glisse.'); }
  k.throws.push(dir); k.cur = null; vib(12);
  if (k.throws.length >= k.need) return knotDone();
  if (k.kind !== 'tend') { k.step = 'place'; k.wraps = 0; k.wv = 0; k.gT = 0; k.pT = 0; k.back = k.TIP ? k.TIP.clone() : null; k.aid = (k.aid || 0) + 1; }
  tensionPreview(true); buildStitch(st); knotCap();
}
function knotDone() {
  const k = N.kn, st = N.st, T = k.tension;
  if (T > 85) { nPen(12, 'Trop serré : la peau blanchit (ischémie), risque de marques en rails.'); st.blanch = true; }
  else if (T < 40) nPen(12, 'Pas assez serré : les berges restent écartées.');
  else if (!S.L.silent && !N.auto) toast(k.kind === 'tend' ? '✓ Tension juste : les berges se touchent.' : k.throws.length < 3 ? '✓ Bien serré. Les jetés de blocage restants sont ajoutés pour vous.' : '✓ Nœud du chirurgien bloqué par 2 jetés en sens alternés.', 'good');
  st.kT = clamp(T / 40) * (T > 85 ? 0.95 : 1); st.pre = null; N.kn = null;
  if (k.kind === 'anchor') { st.anch = true; N.ph = 'idle'; applyClosure(); idlePose(); nextTargets(); nIdleCap(); if (!N.auto) sutureStep(); return; }
  if (st.type === 'intra') { st.tail = 0; return finalizeStitch(); }
  st.tied = true; st.tail = 2.0; st.uncut = true; applyClosure(); if (st.blanch) blanchAt(st);
  N.ph = 'cut'; nCap(easyK() ? 'Touchez la peau près du nœud pour couper les fils (ou ✂️ Couper).' : 'Touchez les fils pour les couper : 5 à 10 mm du nœud.', 'Couper'); if (!N.auto) sutureStep();
}
function cutAtPoint(p) {
  const st = N.st; if (N.ph !== 'cut' || !st || !st.K) return;
  if (easyK()) return cutTap(BUR(st.type) ? 0.25 : 0.75);
  const rx = p.x - st.K.x, rz = p.z - st.K.z; let len = rx * st.out.x + rz * st.out.z; const perp = Math.hypot(rx - st.out.x * len, rz - st.out.z * len);
  if (perp > 1.0 || len < -0.3 || len > 2.6) return toast('Touchez les fils qui dépassent du nœud.', 'mid');
  cutTap(len);
}
function cutTap(len) {
  const st = N.st; if (N.ph !== 'cut' || !st) return;
  if (BUR(st.type)) { // nœud enfoui : coupé ras
    if (easyK()) len = 0.25; len = clamp(len, 0.1, 2.0); st.tail = Math.min(len, 0.4); vib(10);
    if (len > 0.5) nPen(8, 'Nœud enfoui : on coupe ras (2–3 mm), sinon le fil ressort par la cicatrice.');
    return finalizeStitch();
  }
  if (S.level === 'deb' && len > 0.3 && len < 1.4) len = clamp(len, 0.5, 1.0);
  len = clamp(len, 0.1, 2.0); st.tail = len; vib(10);
  if (len < 0.3) nPen(10, 'Fils coupés trop court : le nœud peut lâcher.'); else if (len > 1.5) nPen(5, 'Fils trop longs : ils s\'accrochent.');
  finalizeStitch();
}
function finalizeStitch() {
  const st = N.st; st.uncut = false;
  if (st.type === 'surjet' && st.passes.length < 3) st.issuesP.push('Un surjet fait au moins 3 passages.');
  if (st.type === 'intra' && st.passes.length < 4) st.issuesP.push('L\'intradermique doit couvrir toute la longueur de la plaie.');
  const pen = Math.min(45, st.issuesP.length * 12) + N.pen.reduce((a, b) => a + b.p, 0);
  st.q = clamp(Math.round(st.q - pen), 0, 100); st.issues = [...new Set([...N.pen.map((x) => x.msg), ...st.issuesP, ...st.issues])];
  const holds = st.type === 'donati' || st.type === 'horiz', c = S.data.tension; let kq = 0.62 + 0.33 * st.q / 100;
  if (c && !holds) kq = Math.min(kq, 0.45); if (st.type === 'intra') kq = c ? 0.35 : kq * 0.92; if (BUR(st.type)) kq = 0.45 + 0.1 * st.q / 100;
  st.k = Math.min(kq, st.kTear) * (st.kT != null ? st.kT : 1); st.tied = true; st.final = true; st.pre = null;
  if (N.viewBack) { N.viewBack = false; setView(new THREE.Vector3(0, 0, 0), clamp(W.L + 0.4, 3.4, 5.6), 0.42, cam.TH); }
  N.st = S.cur = null; N.ph = 'idle'; N.pen = []; N.kn = null; clearNext(); applyClosure(); if (S.blood) S.blood.flow *= 0.85;
  if (st.type === 'hemo' && S.data.vessel != null) {
    const dv = Math.abs(st.t - S.data.vessel) * W.L;
    if (dv < 0.45) { S.vesselOK = true; if (S.blood) S.blood.flow = 0.04; if (S.vessel) S.vessel.userData.bead.visible = false; st.issues.unshift('Le saignement s\'arrête : vaisseau lié.'); }
    else { st.q = Math.min(st.q, 40); st.issues.unshift('À côté du vaisseau : il saigne encore. Placez le X de part et d\'autre du point qui saigne.'); }
  }
  if (st.q >= 80) S.pupu++;
  if (!S.L.silent && !N.auto) toast(st.q >= 80 ? '✓ ' + D.POINTS[st.type] + ' réussi ! ' + (st.issues[0] || '') : (st.issues[0] || 'Point correct.'), st.q >= 80 ? 'good' : st.q >= 55 ? 'mid' : 'bad');
  idlePose(); nIdleCap(); if (!N.auto) sutureStep();
}
function nUndo() {
  if (N.auto || anim) return;
  if (N.st || N.d) { const st = N.st; if (st) { S.stitches = S.stitches.filter((x) => x !== st); padGroup.remove(st.grp); } nReset(); }
  else { const st = S.stitches.pop(); if (st) padGroup.remove(st.grp); }
  applyClosure(); idlePose(); nIdleCap(); sutureStep();
}

// ---------------------------------------------------------------- images : aiguille, fil
function nTick(dt) {
  if (!S || S.step !== 'suture' || S.kind !== 'fil' || !pad) { if (LIVE.mesh.visible || TAILT.mesh.visible) LIVE.mesh.visible = TAILT.mesh.visible = false; return; }
  if (N.ph === 'pass' && N.d) passFrame(dt);
  else if ((N.ph === 'out' || N.ph === 'pull') && N.d) pullFrame();
  threadFrame();
  if (N.ph === 'knot' && N.kn && N.st && ((N.kn.live && N.kn.dirty) || N.kn.settle > 0) && performance.now() - prevT > 40) { prevT = performance.now(); N.kn.dirty = false; buildStitch(N.st); }
}
function threadFrame() {
  if (!LIVE.mesh.parent) padGroup.add(LIVE.mesh); if (!TAILT.mesh.parent) padGroup.add(TAILT.mesh);
  if (!animN.visible || N.ph === 'knot' || N.ph === 'cut') { LIVE.mesh.visible = TAILT.mesh.visible = false; return; }
  const st = N.st, d = N.d, r = D.FILS[S.choices.fil] || 0.019, sw = swageLocal(), sb = swageBack(), pts = [];
  const lastB = st && st.passes.length ? deformPoint(st.passes[st.passes.length - 1].B0).setY(0.02) : null;
  let tail = null;
  if (!d) {
    if (lastB) { pts.push(lastB); sag(lastB, sb, pts); pts.push(sb, sw); }
    else { const o = N.parkOut || new V3(0, 0, 1), g0 = new V3(sw.x + o.x * 0.5, 0.03, sw.z + o.z * 0.5); pts.push(g0.clone().addScaledVector(o, 3.5), g0.clone().addScaledVector(o, 1.5), g0); sag(g0, sb, pts); pts.push(sb, sw); }
  } else {
    const Th = needleGeo().Th, A0 = d.P.clone().setY(0.015), first = d.i === 0, chain = [], sp = d.psi - Th, pulling = N.ph === 'out' || N.ph === 'pull';
    const fin = !d.two || d.stage === 2, cur = d.pass || d.p1;
    if (d.two && (d.stage === 2 || N.ph === 'mid')) { chain.push(A0); arcPts(d.p1, d.p1.aP, d.p1.aQ, chain); chain.push(d.P2.clone()); if (cur === d.p2 && sp > d.p2.aP) { arcPts(d.p2, d.p2.aP, Math.min(d.p2.aQ, sp), chain); } }
    else if (cur && sp > cur.aP) { chain.push(A0); arcPts(cur, cur.aP, Math.min(cur.aQ, sp), chain); }
    const slack = pulling && !first ? clamp(1 - pullEff() / 90) : 1;
    if (!chain.length) { const a = first ? A0 : lastB; pts.push(a); sag(a, sb, pts); pts.push(sb, sw); }
    else { if (!first && lastB) archPts(lastB, A0, 0.06 + 0.5 * slack, pts); for (const p of chain) pts.push(p); const le = pts[pts.length - 1]; if (le.distanceTo(sw) > 0.12) sag(le, sw, pts, 5); pts.push(sw); }
    if (first) { const T = pulling ? tailLen() : T0; tail = tailCurve(d.A, T); TAIL_MAT.color.setHex(pulling && S.L.guides && T >= 2 && T <= 4 ? 0x2fae5a : 0x1d2a6b); }
  }
  LIVE.set(pts, r); if (tail) TAILT.set(tail, r); else TAILT.mesh.visible = false;
}

// ---------------------------------------------------------------- aspect final des points (ce qu'on voit sur la peau)
const HOLE_G = new THREE.CircleGeometry(1, 10).rotateX(-PI / 2), HOLE_M = new THREE.MeshBasicMaterial({ color: 0x3a1512, transparent: true, opacity: 0.75, depthWrite: false });
const TORUS_G = new THREE.TorusGeometry(1.5, 0.95, 5, 10).rotateX(PI / 2); HOLE_G.userData.shared = TORUS_G.userData.shared = KNOT_G.userData.shared = true;
function buildStitch(st) {
  st.grp.traverse((c) => { if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose(); }); st.grp.clear();
  if (st.multi) return buildThread(st);
  if (st.tied && st.type) return buildDevice(st);
}
function buildThread(st) {
  const r = D.FILS[st.fil] || 0.019, mat = st.mat || (st.mat = threadMat()), g = st.grp, n = st.passes.length, t = st.type; if (!n) return;
  const P = st.passes.map((p) => ({ A: deformPoint(p.A0).setY(0.012), B: deformPoint(p.B0).setY(0.012), p }));
  const outOf = (X) => { const sg = Math.sign(X.q.s) || 1; return new V3(sg * X.q.nx, 0, sg * X.q.nz); };
  const arch = (a, b, h, rr = r) => { const pts = [a.clone().setY(a.y - 0.03)]; archPts(a, b, h, pts, 8); pts.push(b.clone().setY(b.y - 0.03)); g.add(tube(pts, rr, mat)); };
  const hole = (p) => { const m = new THREE.Mesh(HOLE_G, HOLE_M); m.position.set(p.x, 0.008, p.z); m.scale.setScalar(r * 1.9); g.add(m); };
  const knot = (K, o) => { for (const sg of [-1, 1]) { const m = new THREE.Mesh(TORUS_G, mat); m.scale.setScalar(r); m.position.copy(K).addScaledVector(o, sg * r * 0.9).setY(K.y + r * (sg > 0 ? 1.6 : 0.9)); m.rotation.y = sg * 0.5; g.add(m); } };
  const tails = (K, o, len, uncut) => { for (const sg of [-1, 1]) { const a = sg * (uncut ? 0.16 : 0.3 + 0.3 * ((st.seed * (sg > 0 ? 7.3 : 3.1)) % 1)), c = Math.cos(a), s = Math.sin(a), dd = new V3(o.x * c - o.z * s, 0, o.x * s + o.z * c);
      g.add(tube([K.clone().setY(K.y + r * 2), K.clone().addScaledVector(dd, len * 0.45).setY(0.02 + r * 1.5), K.clone().addScaledVector(dd, len).setY(0.012 + r)], r * 0.9, mat)); } };
  if (t === 'hemo') {
    const W3 = (p) => p.pts.map((v) => { const w = deformPoint(new V3(v.x, 0, v.z)); return new V3(w.x, v.y, w.z); });
    const L0 = W3(st.passes[0]); g.add(tube(L0, r, mat));
    const a0 = L0[0], b0 = L0[L0.length - 1];
    if (n < 2) { g.add(tube([b0, b0.clone().setY(0.25), b0.clone().add(new V3(0, 0.6, 0.3))], r, mat)); return; }
    const L1 = W3(st.passes[1]); g.add(tube(L1, r, mat));
    const a1 = L1[0], b1 = L1[L1.length - 1], M = new V3().lerpVectors(b0, a1, 0.5).setY(Math.max(b0.y, a1.y) + 0.03);
    g.add(tube([b0, M, a1], r, mat)); // 1re branche du X
    const K = new V3().lerpVectors(a0, b1, 0.5).setY(Math.max(a0.y, b1.y) + 0.05); // 2e branche : le nœud
    if (st.tied || (N.ph === 'knot' && st === N.st)) { const lo = st.tied ? 0 : 0.05; for (const e of [a0, b1]) g.add(tube([e, e.clone().lerp(K, 0.5).setY(K.y + lo), K], r, mat)); const km = new THREE.Mesh(TORUS_G, mat); km.scale.setScalar(r * 1.3); km.position.copy(K); g.add(km); st.K = K.clone(); st.out = new V3(0, 1, 0); if (st.tied) tails(K, new V3(st.passes[0].A.q.tx, 0, st.passes[0].A.q.tz), st.tail || 0.25, st.uncut); }
    else g.add(tube([b1, b1.clone().setY(0.25), b1.clone().add(new V3(0, 0.6, 0.3))], r, mat));
    return;
  }
  if (t === 'buried') {
    const p = st.passes[0], cl = st.tied || st.pre ? 1 : 0;
    const pts = p.pts.map((v) => { const w = deformPoint(new V3(v.x, 0, v.z)); return new V3(w.x, v.y, w.z); });
    g.add(tube(pts, r, mat));
    const a = pts[0], b = pts[pts.length - 1], K = new V3().lerpVectors(a, b, 0.5).setY(a.y + 0.02);
    if (st.tied || (N.ph === 'knot' && st === N.st)) { for (const e of [a, b]) g.add(tube([e, e.clone().lerp(K, 0.5).setY(K.y + 0.03 * (1 - cl)), K], r, mat)); const km = new THREE.Mesh(TORUS_G, mat); km.scale.setScalar(r * 1.3); km.position.copy(K); g.add(km); st.K = K.clone(); st.out = new V3(0, 1, 0); if (st.tied) tails(K, new V3(p.A.q.tx, 0, p.A.q.tz), st.tail || 0.25, st.uncut); }
    else { g.add(tube([a, a.clone().setY(0.25), a.clone().add(new V3(0, 0.6, 0.3))], r, mat)); }
    return;
  }
  const loose = st.tied ? 1 : 1.5, hOver = (0.1 + 2 * r) * loose, hSide = (0.035 + 2 * r) * loose;
  for (const p of P) { hole(p.A); hole(p.B); if (!st.tied && !st.pre && p.p.gap && !st.anch) g.add(tube([deformPoint(p.p.gap[0]), deformPoint(p.p.gap[1])], r * 0.9, mat)); }
  // liaisons en surface entre les passages
  if ((t === 'donati' || t === 'horiz') && n >= 2) arch(P[0].B, P[1].A, hSide);
  if (t === 'x' && n >= 2) arch(P[0].B, P[1].A, hOver);
  if (t === 'surjet') for (let i = 0; i < n - 1; i++) arch(P[i].B, P[i + 1].A, hOver);
  const oA = outOf(st.passes[0].A), K0 = P[0].A.clone().addScaledVector(oA, 0.1).setY(0.02);
  if (t === 'surjet' && st.anch) { arch(P[0].B, K0, hOver); knot(K0, oA); tails(K0, oA, 0.6, false); }
  const kn = N.kn, tying = N.ph === 'knot' && st === N.st && kn;
  // emplacement du nœud final : déporté sur un côté, jamais sur la plaie
  let K = K0, o = oA, ends = [];
  if (t === 'simple') ends = [[P[0].B, hOver]];
  else if (t === 'donati' || t === 'horiz') { K = new V3().lerpVectors(P[0].A, P[n - 1].B, 0.5).setY(0.02); ends = [[P[0].A, 0.02 + r], [P[n - 1].B, 0.02 + r]]; }
  else if (t === 'x') ends = [[P[n - 1].B, hOver + 2 * r]];
  else if (t === 'surjet') { o = outOf(st.passes[n - 1].B); K = P[n - 1].B.clone().addScaledVector(o, 0.1).setY(0.02); ends = []; }
  if (t === 'intra') { // rien en surface : le fil sort dans l'axe, au-delà des deux bouts
    const ax = (X, sgn) => { const d = new V3(X.q.tx, 0, X.q.tz).multiplyScalar(sgn); return [X.P0.clone().setY(0.012), X.P0.clone().addScaledVector(d, 0.7).setY(0.03), X.P0.clone().addScaledVector(d, 1.5).setY(0.02)]; };
    const dr = n > 1 ? Math.sign(st.passes[n - 1].B.q.t - st.passes[0].A.q.t) || 1 : (Math.sign(st.passes[0].B.q.t - st.passes[0].A.q.t) || 1);
    g.add(tube(ax(st.passes[0].A, -dr), r, mat)); if (st.tied) g.add(tube(ax(st.passes[n - 1].B, dr), r, mat));
  } else if (st.tied) {
    for (const [p, h] of ends) arch(p, K, h); knot(K, o); tails(K, o, st.tail || 0.7, st.uncut); st.K = K.clone(); st.out = o.clone();
  } else if (tying) { // nœud en cours : il descend quand on serre
    const Kk = kn.kind === 'final' && t === 'surjet' ? K : (kn.kind === 'anchor' ? K0 : K), T = kn.tension / 100, up = 0.45 * (1 - clamp(T / 0.4)) + 0.03, Kh = Kk.clone().setY(Kk.y + up);
    const src = kn.kind === 'anchor' ? [[P[0].B, hOver]] : (t === 'surjet' ? [[P[n - 1].B, 0.05]] : ends);
    const one = kn.kind !== 'tend' && src.length === 1, hasTail = t === 'simple' || t === 'x' || kn.kind === 'anchor'; let longPre = null;
    for (const [p, h] of src) { const pts = [p.clone().setY(p.y - 0.02)]; archPts(p, Kh, Math.max(h, up * 0.6), pts, 7); if (one) longPre = pts; else g.add(tube(pts, r, mat)); }
    const tailPre = hasTail ? [P[0].A.clone().setY(0), P[0].A.clone().lerp(Kh, 0.5)] : null;
    if (tailPre && kn.kind === 'tend') g.add(tube([...tailPre, Kh], r, mat));
    if (kn.throws.length) { const km = new THREE.Mesh(TORUS_G, mat); km.scale.setScalar(r * (0.75 + 0.25 * kn.throws.length)); km.position.copy(Kh); g.add(km); }
    const hand = kn.cur ? kn.cur.clone().setY(0.35) : Kh.clone().addScaledVector(o, 0.9).setY(0.3);
    if (kn.kind === 'tend') {
      g.add(tube([Kh, Kh.clone().lerp(hand, 0.5).setY(Kh.y + 0.12), hand], r, mat));
      const other = Kh.clone().addScaledVector(Kh.clone().sub(hand).setY(0).normalize(), 0.9).setY(0.25); g.add(tube([Kh, Kh.clone().lerp(other, 0.5).setY(Kh.y + 0.1), other], r, mat));
    } else { // NŒUD À LA PINCE (instrument tie), EN MOUVEMENT CONTINU (v7.8) :
      // ① le brin long tourne autour de la pince (hélice qui grandit, kn.wv) ② la pince avance à travers les boucles
      // jusqu'au bout court (kn.gT) ③ elle le ramène de l'autre côté : les boucles glissent de la pince sur le fil et
      // se resserrent sur le nœud, le brin long part dans l'autre sens.
      const qK = nearest(Kh.x, Kh.z), nrm = (sd) => new V3(qK.nx * sd, 0, qK.nz * sd), tv = new V3(qK.tx, 0, qK.tz);
      const nT = kn.throws.length, ss = nT ? kn.throws[nT - 1] : (Math.sign(st.passes[0].A.q.s) || 1), step = kn.step, dirW = nT % 2 ? -1 : 1;
      const TT = Kh.clone().addScaledVector(nrm(ss), 0.8).setY(0.05); kn.TT = TT.clone();
      const HT = Kh.clone().addScaledVector(tv, 0.05).setY(0.42); kn.HT = HT.clone(); // v7.19 : on enroule en l'air (≈ 4 mm au-dessus de la plaie), pas sur la peau
      const wv = kn.wv != null ? kn.wv : kn.wraps, gT = kn.gT || 0, cross = -ss;
      let tip = HT.clone(), p = 0; // p = avancée de la traction (0 → 1)
      const rest = kn.back || Kh.clone().addScaledVector(tv, 0.55).addScaledVector(nrm(-ss), 0.45).setY(0.55); // pince au repos, en l'air
      if (step === 'place') tip = rest.clone();
      if (step === 'wrap' && (kn.pT || 0) < 1) tip = rest.clone().lerp(HT, ease(kn.pT || 0)); // elle descend se poser entre les brins
      if (step === 'grab' || step === 'pull') tip.lerp(TT.clone().setY(0.07), ease(gT));
      if (step === 'pull' && kn.cur) { tip = kn.cur.clone().setY(0.1); p = clamp((tip.clone().sub(TT).dot(nrm(cross))) / 1.5); }
      const up = new V3(0, 1, 0), side = tv.clone().cross(up).normalize(), open = step === 'grab' && gT < 0.8 ? 0.05 : 0.02;
      // v7.20 (vidéos de référence) : c'est le PORTE-AIGUILLE qui tourne autour du brin long, la main gauche reste
      // haute et immobile. Pendant chaque tour, la pointe décrit un petit cercle (≈ 1,5 cm) autour du fil.
      // v7.24 (Brian) : c'est la PINCE qui fait les 2 enroulements. À chaque tour, sa pointe fait un cercle complet AUTOUR
      // du brin long (axe nœud → main gauche) : 1er tour, puis 2e tour, et les boucles se forment sur les mors.
      { const fr = (kn.wv != null ? kn.wv : kn.wraps) % 1; if (step === 'wrap' && (kn.pT || 0) >= 1 && fr > 0.01 && fr < 0.995) {
        const hE = kn.sp ? kn.sp.p : Kh.clone().addScaledVector(nrm(-ss), 0.75).setY(1.25), dS = hE.clone().sub(Kh).normalize();
        const P = Kh.clone().addScaledVector(dS, HT.clone().sub(Kh).dot(dS)), w = P.clone().sub(HT); const R = Math.max(0.18, w.length()); w.normalize();
        const v = dS.clone().cross(w).normalize(), o = fr * 2 * PI * (nT % 2 ? -1 : 1), C = HT.clone().addScaledVector(w, R);
        tip.copy(C).addScaledVector(w, -R * Math.cos(o)).addScaledVector(v, -R * Math.sin(o)); } }
      for (const sg of [-1, 1]) g.add(tube([tip.clone().addScaledVector(side, open * sg), tip.clone().addScaledVector(tv, 0.45).addScaledVector(side, 0.03 * sg).setY(tip.y + 0.04), tip.clone().addScaledVector(tv, 1.7).addScaledVector(side, 0.09 * sg).setY(tip.y + 0.32)], 0.03, STEEL_PLAIN));
      // hélice du brin long : autour de la pince, puis (traction) elle quitte la pince, glisse sur le fil et se resserre
      // v7.13 : les boucles RESTENT sur les mors du porte-aiguille quand il va chercher le bout court (il « rentre » dans
      // les boucles) ; à la traction elles glissent hors des mors, sur le bout court, et se resserrent sur le nœud.
      const toK = Kh.clone().sub(tip); toK.y = 0; const dK = toK.length() || 1; toK.multiplyScalar(1 / dK);
      const ax = tv.clone().lerp(toK, ease(clamp(p * 1.6))).normalize(), axS = ax.clone().cross(up).normalize();
      // v7.19 : l'hélice suit l'axe des mors (qui montent un peu) et les entoure SANS les traverser :
      // rayon = écartement des mors + épaisseur des mors (0,03) + fil + jeu
      const dJ = tv.clone().multiplyScalar(0.45).addScaledVector(up, 0.04).normalize();
      const axH = dJ.clone().lerp(ax, ease(clamp(p * 1.6))).normalize(), uH = up.clone().addScaledVector(axH, -up.dot(axH)).normalize(), sH = axH.clone().cross(uH).normalize();
      const c0 = tip.clone().addScaledVector(dJ, 0.1), cC = c0.clone().lerp(Kh.clone().setY(Kh.y + 0.02), ease(p));
      const radJ = open + 0.03 + r * 1.4 + 0.012, rad = lerp(radJ, r * 2.2, ease(p)), pitch = lerp(Math.max(0.075, r * 3.2), r * 2.4, ease(p));
      const hel = []; const nSeg = Math.max(2, Math.round(wv * 26));
      // v7.22 : l'hélice COMMENCE du côté du nœud et FINIT du côté de la main gauche : le brin qui part vers la main
      // ne traverse plus les mors (avant, au 2e tour, il sortait sous la pince et coupait à travers).
      // v7.24 (Brian) : le 1er tour est le plus PROFOND sur les mors (côté articulation), le 2e se pose plus près de la pointe
      const Nt = Math.max(kn.step === 'wrap' || kn.step === 'grab' ? wrapNeed(kn) : 1, Math.ceil(wv - 1e-3));
      const angOf = (v) => Math.atan2(v.dot(sH), v.dot(uH)), wrapPi = (t) => t - 2 * PI * Math.round(t / (2 * PI));
      const handE = kn.sp ? kn.sp.p : Kh.clone().addScaledVector(nrm(-ss), 0.75).setY(1.25), cE = cC.clone().addScaledVector(axH, (Nt - wv) * pitch);
      const a0 = angOf(Kh.clone().sub(cC.clone().addScaledVector(axH, Nt * pitch))), aE = angOf(handE.clone().sub(cE)), s0 = wv * 2 * PI * dirW;
      let sweep = s0 + wrapPi(aE - (a0 + s0)); if (sweep * dirW < 0) sweep += 2 * PI * dirW;
      if (wv > 0.02) for (let i = 0; i <= nSeg; i++) { const u = i / nSeg, a = a0 + u * sweep; hel.push(cC.clone().addScaledVector(axH, (Nt - u * wv) * pitch).addScaledVector(uH, rad * Math.cos(a)).addScaledVector(sH, rad * Math.sin(a))); }
      kn.SD = nrm(ss).clone(); // côté du bout court : on enroule VERS lui
      // main qui tient le brin long : elle tourne pendant l'enroulement, puis part du côté opposé au bout court
      const frac = wv - Math.floor(wv), orbit = step === 'wrap' || frac > 0.02 ? frac * 2 * PI * dirW : 0;
      const LH0 = Kh.clone().addScaledVector(nrm(-ss), 0.75).setY(1.25).addScaledVector(side, 0.04 * Math.sin(orbit)); // main haute, quasi immobile
      const LH1 = Kh.clone().addScaledVector(nrm(ss), 1.05).setY(0.14), LH = LH0.clone().lerp(LH1, ease(p));
      // v7.10 : le fil a du poids et de la souplesse. La main suit avec un petit retard (ressort amorti, kn.sp) ; entre
      // les boucles et la main le fil pend (chaînette) tant qu'il est lâche et se tend quand on tire (p → 1).
      const spr = kn.sp || (kn.sp = { p: LH.clone(), v: new V3() }); spr.v.addScaledVector(LH.clone().sub(spr.p), 0.22).multiplyScalar(0.72); spr.p.add(spr.v);
      kn.settle = spr.v.length() > 0.004 || spr.p.distanceTo(LH) > 0.01 ? 3 : Math.max(0, (kn.settle || 0) - 1);
      const LHs = spr.p.clone(), slack = (1 - ease(p)) * (step === 'pull' ? 0.6 : 0.35); // brin long tenu presque tendu
      const hang = (a, b, n, sag) => { const out = []; for (let i = 1; i <= n; i++) { const u = i / (n + 1), q = a.clone().lerp(b, u); q.y = Math.max(0.1, q.y - sag * 4 * u * (1 - u)); out.push(q); } return out; };
      const lp = longPre ? longPre.slice(0, -1) : []; lp.push(Kh.clone());
      if (hel.length) { lp.push(Kh.clone().lerp(hel[0], 0.5).setY(Kh.y + 0.03)); for (const h of hel) lp.push(h); const e = hel[hel.length - 1]; lp.push(...hang(e, LHs, 4, 0.08 * slack * e.distanceTo(LHs))); }
      else lp.push(...hang(Kh, LHs, 4, 0.07 * slack * Kh.distanceTo(LHs)));
      lp.push(LHs); LH.copy(LHs);
      { // la main gauche tient le brin long : pince à disséquer (plate) ou doigts gantés (v7.12)
        const out = LHs.clone().sub(Kh).setY(0); if (out.lengthSq() < 1e-6) out.copy(nrm(-ss)); out.normalize();
        const hd = out.clone().multiplyScalar(0.85).add(new V3(0, 0.55, 0)).normalize(), sd2 = hd.clone().cross(up).normalize();
        lp.push(LHs.clone().addScaledVector(hd, 0.35)); // le fil continue vers l'aiguille, dans la main
        if ((save.holdTool || 'pince') === 'pince') { for (const sg of [-1, 1]) g.add(tube([LHs.clone().addScaledVector(sd2, 0.012 * sg), LHs.clone().addScaledVector(hd, 0.45).addScaledVector(sd2, 0.035 * sg), LHs.clone().addScaledVector(hd, 1.15).addScaledVector(sd2, 0.07 * sg)], 0.028, STEEL_PLAIN)); }
        else { const gm = kn.gloveM || (kn.gloveM = new THREE.MeshStandardMaterial({ color: 0x6f9fd8, roughness: 0.55 }));
          for (const [sg, L] of [[-1, 0.42], [1, 0.36]]) { const a0 = LHs.clone().addScaledVector(sd2, 0.055 * sg), a1 = a0.clone().addScaledVector(hd, L).addScaledVector(sd2, 0.04 * sg); g.add(tube([a0, a0.clone().lerp(a1, 0.5), a1], 0.05, gm)); const tipS = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), gm); tipS.position.copy(a0); g.add(tipS); } }
      } g.add(tubeS(lp, r, mat)); // UN seul fil : sortie de la peau → nœud → boucles → main kn.LH = LH.clone(); kn.TIP = tip.clone();
      // bout court : MÊME fil, même couleur (un bout d'une autre couleur faisait croire à un 2e fil) ;
      // il est repéré seulement par l'anneau bleu (niveau Débutant) et l'étiquette « bout court »
      const shortM = mat;
      const held = step === 'pull' && (gT > 0.95 || kn.cur);
      const sp = tailPre ? [...tailPre, Kh.clone()] : [Kh.clone()], se = held ? tip : (step === 'place' && kn.back ? kn.back.clone().setY(0.06) : step === 'wrap' && kn.back && (kn.pT || 0) < 1 ? kn.back.clone().setY(0.06).lerp(TT, ease(kn.pT || 0)) : TT);
      if (held) { const dS = Kh.distanceTo(se), sagS = 0.1 * (1 - ease(p)) * dS; for (const u of [0.3, 0.6]) { const q = Kh.clone().lerp(se, u); q.y = Math.max(0.03, q.y - sagS * 4 * u * (1 - u)); sp.push(q); } } // tenu : il pend puis se tend
      else { sp.push(Kh.clone().lerp(se, 0.3).setY(0.09), Kh.clone().lerp(se, 0.7).setY(0.07).addScaledVector(tv, 0.05)); } // libre : couché sur la peau, légèrement courbé
      sp.push(se); g.add(tubeS(sp, r * 1.1, shortM)); // UN seul fil : peau → nœud → bout
      if (S.L.guides && !N.auto && !N.knotBusy && (step === 'place' || step === 'wrap' || step === 'grab')) { const P0 = step === 'grab' ? TT : HT; const ring = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.17, 26).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: step === 'place' ? 0xffffff : step === 'wrap' ? 0xffd34d : 0x6cc4ff, transparent: true, depthTest: false })); ring.renderOrder = 7; ring.position.copy(P0).setY(P0.y + 0.02); g.add(ring); }
    }
  } else if (!st.anch) { // point en cours : brin court couché près de l'entrée
    if (!(N.d && N.d.i === 0) && st.tailT) g.add(tube(tailCurve(st.passes[0].A, st.tailT), r, mat));
  }
  if (!st.final || S.L.silent) return;
  const c = P.reduce((a, p) => a.add(p.A).add(p.B), new V3()).multiplyScalar(1 / (2 * n));
  const mk = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 20).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: st.q >= 80 ? 0x4fc46a : st.q >= 55 ? 0xf0b33a : 0xe0573a, transparent: true, opacity: 0.85, depthWrite: false }));
  mk.position.set(c.x, 0.03, c.z); g.add(mk);
}
function blanchAt(st) {
  const col = pad.geometry.attributes.color.array, pos = pad.geometry.attributes.position.array, C0 = S.base.col;
  const c = new V3().lerpVectors(st.A0, st.B0, 0.5);
  for (let i = 0; i < col.length / 3; i++) { const d = Math.hypot(pos[i * 3] - c.x, pos[i * 3 + 2] - c.z); if (d < 0.5 && pos[i * 3 + 1] > -0.03) { const k = 0.45 * (1 - d / 0.5); for (let j = 0; j < 3; j++) C0[i * 3 + j] = col[i * 3 + j] = lerp(C0[i * 3 + j], 0.75, k); } }
  pad.geometry.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- doigt → moteur
function stitchActive() { return !!(S && S.step === 'suture' && S.kind === 'fil' && pad); }
const SKINPLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hp = new THREE.Vector3();
function planeAt(x, y) { // doigt projeté sur le plan de la peau : au-dessus de la plaie ouverte, on ne « tombe » pas au fond
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  SKINPLANE.constant = -padGroup.position.y; return ray.ray.intersectPlane(SKINPLANE, _hp) ? padGroup.worldToLocal(_hp.clone()) : null;
}
function localAt(x, y) { const h = pick(x, y, [pad]); return h ? [h, padGroup.worldToLocal(h.point.clone())] : [null, null]; }
function nDown(e) {
  N.touch = { x0: e.clientX, y0: e.clientY, moved: false }; if (N.auto) return;
  const [h, p] = localAt(e.clientX, e.clientY);
  if (N.ph === 'mid') { return; }
  if (anim) return;
  if (N.ph === 'idle') {
    if (!h) return; const A = (LOOSE(curType()) ? validLoose : validPoint)(h);
    if (!A) return toast('Posez le doigt sur la peau, à côté de la berge (pas dans la plaie).', 'mid');
    passDown(A, planeAt(e.clientX, e.clientY) || p);
  } else if (N.ph === 'pass' && N.d) { const d = N.d; d.releasing = false; const p = planeAt(e.clientX, e.clientY); if (p) { d.F0 = d.e ? p.clone().addScaledVector(d.e, -d.x) : p.clone(); d.F = p; } }
  else if (N.ph === 'out') { const t = toScreen(N.tipL); if (Math.hypot(e.clientX - t[0], e.clientY - t[1]) > 85) return toast('Touchez la pointe de l\'aiguille (cercle jaune), puis tirez.', 'mid'); pullDown(); }
  else if (N.ph === 'knot') { if (p) throwDown(p); }
}
function nMove(e) {
  const t = N.touch; if (!t || N.auto) return; const dx = e.clientX - t.x0, dy = e.clientY - t.y0; if (Math.hypot(dx, dy) > 8) t.moved = true;
  if ((N.ph === 'pass' || N.ph === 'mid') && N.d) { const p = planeAt(e.clientX, e.clientY); if (p) N.d.F = p; }
  else if (N.ph === 'pull') { const d = N.d, a = toScreen(d.P), b = toScreen(d.P.clone().addScaledVector(d.e, 1)), ax = b[0] - a[0], ay = b[1] - a[1], v = Math.hypot(dx, dy); pullMove(v, v > 1 ? Math.abs(dx * ax + dy * ay) / (v * Math.hypot(ax, ay)) : 1); }
  else if (N.ph === 'knot') { const [, p] = localAt(e.clientX, e.clientY); if (p) throwMove(p); }
}
function nUp(e, cancel) {
  const t = N.touch; N.touch = null; if (!t || N.auto) return;
  if (N.ph === 'pass') passUp(); else if (N.ph === 'pull') pullUp(); else if (N.ph === 'knot') throwUp();
  else if (N.ph === 'cut' && !cancel && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) < 30) { const [, p] = localAt(e.clientX, e.clientY); if (p) cutAtPoint(p); }
}

// ---------------------------------------------------------------- démonstrations (le jeu joue les mêmes gestes)
function demoSeq(type, t0) {
  const bite = (S.data.bite[0] + S.data.bite[1]) / 2, d = 0.55 / W.L; if (t0 == null) t0 = type === 'intra' ? 0.12 : type === 'surjet' ? 0.2 : 0.42;
  let seq = [];
  if (type === 'simple') seq = [[ptAt(t0, 1, bite), ptAt(t0, -1, bite), 'Entrée droite dans la peau, même distance des deux côtés']];
  if (type === 'hemo') { const tv = S.data.vessel ?? 0.42, dv = 0.22 / W.L; seq = [[ptAt(tv - dv, 1, -0.07), ptAt(tv - dv, -1, -0.07), '1) En profondeur, juste avant le vaisseau, d\'une paroi à l\'autre'], [ptAt(tv + dv, 1, -0.07), ptAt(tv + dv, -1, -0.07), '2) Même côté de départ, juste après le vaisseau : le fil fait un X qui l\'écrase']]; }
  if (type === 'buried') seq = [[ptAt(t0, 1, -0.07), ptAt(t0, -1, -0.07), 'Dans la paroi, sous le derme, en profondeur, jusqu\'à la paroi d\'en face ; nœud au fond, coupé ras']];
  if (type === 'donati') { const far = Math.max(bite, S.data.tension ? bite : 0.55); seq = [[ptAt(t0, 1, far), ptAt(t0, -1, far), '1) Loin-loin : prise large et profonde'], [ptAt(t0, -1, 0.14), ptAt(t0, 1, 0.14), '2) Retour près-près : à 1–2 mm du bord, superficiel']]; }
  if (type === 'horiz') seq = [[ptAt(t0, 1, bite), ptAt(t0, -1, bite), '1) Aller, comme un point simple'], [ptAt(t0 + d, -1, bite), ptAt(t0 + d, 1, bite), '2) Retour, 5 mm plus loin, même distance']];
  if (type === 'x') seq = [[ptAt(t0, 1, bite), ptAt(t0, -1, bite), '1) Premier passage'], [ptAt(t0 + d, 1, bite), ptAt(t0 + d, -1, bite), '2) Même côté de départ, 5 mm plus loin : le fil fait un X']];
  if (type === 'surjet') for (let i = 0; i < 4; i++) seq.push([ptAt(t0 + i * d, 1, bite), ptAt(t0 + i * d, -1, bite), i ? `${i + 1}) Toujours du même côté, on avance de 5 mm` : '1) Premier point, que l\'on noue']);
  if (type === 'intra') { let t = t0; for (let i = 0; i < 4; i++) { const sd = i % 2 ? -1 : 1, st = 0.45 / W.L; seq.push([ptAt(t, sd, 0.02), ptAt(t + st, sd, 0.02), `${i + 1}) Dans la berge, le long de la plaie, d'un côté puis de l'autre`]); t += st - 0.1 / W.L; } }
  return seq;
}
async function autoPass(A, B) {
  passDown(A); const d = N.d; if (!d) return;
  d.forceE = new V3(B.P0.x - A.P0.x, 0, B.P0.z - A.P0.z); d.pred = d.forceE.length(); d.forceE.normalize();
  const L = d.pred, xf = L - leadOf(A) + 0.01;
  await tween(1500, (k) => { if (N.d === d) d.F = A.P0.clone().addScaledVector(d.forceE, ease(k) * xf); });
  for (let i = 0; i < 40 && N.d === d && !(N.ph === 'pass' && d.emerged); i++) await sleep(50);
  if (N.d !== d) return; passUp(); if (N.ph !== 'out') return;
  caption('Reprendre l\'aiguille derrière la pointe et tirer le fil'); await sleep(350);
  pullDown(); const tg = d.i === 0 ? 95 : 92; await tween(800, (k) => { N.vFix = ease(k) * tg; }); pullUp();
}
async function autoKnot() {
  const st = N.st, k = N.kn; if (!st || !k) return; caption(k.kind === 'tend' ? 'Tendre le fil pour rapprocher les berges' : 'Nœud : glisser par-dessus la plaie, puis dans l\'autre sens');
  let s = Math.sign(st.passes[0].A.q.s) || 1; const need = k.need;
  for (let j = 0; j < need && N.ph === 'knot'; j++) { const a = ptAt(st.t, s, 0.5).P0, b = ptAt(st.t, -s, j === 0 ? 0.92 : 0.6).P0;
    if (N.kn && N.kn.step === 'place') { caption(j === 0 ? '⓪ Le porte-aiguille se place juste au-dessus de la plaie, entre les 2 brins, parallèle à elle' : '⓪ Le porte-aiguille revient se poser entre les 2 brins'); await sleep(350 * KS()); knotTap(N.kn.HT || a); await sleep(550 * KS()); }
    while (N.kn && N.kn.step === 'wrap') { caption(j === 0 ? '① La main gauche enroule le brin long 2 fois autour du porte-aiguille (nœud du chirurgien)' : '① 1 tour, dans l\'autre sens'); await sleep(250 * KS()); knotTap(N.kn.HT || a); await sleep(650 * KS()); }
    if (N.kn && N.kn.step === 'grab') { caption('② Le porte-aiguille saisit le bout court par son extrémité'); await sleep(250 * KS()); knotTap(N.kn.TT || a); await sleep(700 * KS()); }
    caption('③ On tire à plat : porte-aiguille et bout court d\'un côté, brin long de l\'autre (pince ou gant)'); await sleep(250 * KS()); throwDown(a); await tween(1100 * KS(), (u) => throwMove(a.clone().lerp(b, ease(u)))); throwUp(); s = -s; }
}
async function autoStitch(seq, done) {
  if (N.auto || N.st || N.ph !== 'idle' || anim) return; N.auto = true;
  try {
    for (let i = 0; i < seq.length && S && S.step === 'suture'; i++) {
      const [A, B, c] = seq[i]; caption(c); await sleep(450); await autoPass(A, B);
      if (N.ph === 'knot') await autoKnot();
      if (N.ph === 'cut') { { const bu = N.st && BUR(N.st.type); caption(bu ? 'Couper ras, au-dessus du nœud enfoui' : 'Couper les fils à 5–10 mm du nœud'); await sleep(500); cutTap(bu ? 0.25 : 0.75); } }
      await sleep(300);
    }
    if (S && N.st && !NEED[N.st.type] && N.ph === 'idle') { knotStart(N.st.type === 'intra' ? 'tend' : 'final'); await autoKnot(); if (N.ph === 'cut') { { const bu = N.st && BUR(N.st.type); caption(bu ? 'Couper ras, au-dessus du nœud enfoui' : 'Couper les fils à 5–10 mm du nœud'); await sleep(500); cutTap(bu ? 0.25 : 0.75); } } }
    await sleep(500);
  } finally { N.auto = false; caption(''); if (S && S.step === 'suture') { nIdleCap(); sutureStep(); } if (done) done(); }
}
function demoStitch() {
  if (N.auto || N.st || N.ph !== 'idle' || !guides) return;
  const rs = guides.children.filter((r) => r.userData.t >= 0 && r.visible).map((r) => r.userData.t).sort((a, b) => a - b);
  if (!rs.length) return toast('Plus de place à montrer : à vous !', '');
  const type = curType(); autoStitch(demoSeq(type, type === 'simple' ? rs[0] : clamp(rs[0], 0.08, 0.5)));
}
function demoPoint(type, done) { autoStitch(demoSeq(type === 'noeud' ? 'simple' : type), done); }

// ---------------------------------------------------------------- incrustation 2D : repères et vue en coupe
function drawOverlay(now) {
  og.clearRect(0, 0, innerWidth, innerHeight);
  if (!S || S.step !== 'suture' || S.kind !== 'fil' || !pad) return;
  const ph = N.ph; og.lineWidth = 3; og.lineCap = 'round';
  if (ph === 'out' && N.tipL && !N.auto) { const t = toScreen(N.tipL), r = 22 + 4 * Math.sin(now / 160); og.strokeStyle = '#ffd34d'; og.beginPath(); og.arc(t[0], t[1], r, 0, 2 * PI); og.stroke(); }
  if (ph === 'knot' && N.kn && N.kn.LH && N.kn.kind !== 'tend' && (S.L.hints || S.lessonKey)) { const k = N.kn; og.font = '600 12px system-ui'; og.textAlign = 'center';
    const lab = (P, t, c) => { const a = toScreen(P); const w = og.measureText(t).width + 10; og.fillStyle = 'rgba(0,0,0,.6)'; og.fillRect(a[0] - w / 2, a[1] - 26, w, 18); og.fillStyle = c; og.fillText(t, a[0], a[1] - 13); };
    if (k.step === 'wrap' && k.HT && k.SD && !easyK()) { const a = toScreen(k.HT), b = toScreen(k.HT.clone().addScaledVector(k.SD, 0.55)); og.strokeStyle = '#4fc46a'; og.fillStyle = '#4fc46a'; og.lineWidth = 4; og.beginPath(); og.moveTo(a[0], a[1]); og.lineTo(b[0], b[1]); og.stroke(); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); og.beginPath(); og.moveTo(b[0], b[1]); og.lineTo(b[0] - 12 * Math.cos(ang - 0.5), b[1] - 12 * Math.sin(ang - 0.5)); og.lineTo(b[0] - 12 * Math.cos(ang + 0.5), b[1] - 12 * Math.sin(ang + 0.5)); og.fill(); }
    lab(k.LH, 'brin long (main)', '#fff'); lab(k.step === 'pull' ? k.TIP : k.TT, 'bout court', '#8fdcff'); og.textAlign = 'left'; }
  if (ph === 'knot' && N.kn && N.st && !N.auto && !N.knotBusy) {
    const k = N.kn, st = N.st, n = k.throws.length, from = n ? k.throws[n - 1] : (Math.sign(st.passes[0].A.q.s) || 1);
    if ((S.L.guides || n) && (!k.step || k.step === 'pull')) { const a = toScreen(ptAt(st.t, from, 0.55).P0.setY(0.05)), b = toScreen(ptAt(st.t, -from, n ? 0.7 : 1.0).P0.setY(0.05)), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      og.strokeStyle = og.fillStyle = '#ffd34d'; og.setLineDash([8, 7]); og.beginPath(); og.moveTo(a[0], a[1]); og.lineTo(b[0], b[1]); og.stroke(); og.setLineDash([]);
      og.beginPath(); og.moveTo(b[0], b[1]); og.lineTo(b[0] - 14 * Math.cos(an - 0.5), b[1] - 14 * Math.sin(an - 0.5)); og.lineTo(b[0] - 14 * Math.cos(an + 0.5), b[1] - 14 * Math.sin(an + 0.5)); og.fill();
      og.beginPath(); og.arc(a[0], a[1], 9, 0, 2 * PI); og.stroke(); }
    if (n === 0) { const x = 26, y0 = 170, h = 190; og.fillStyle = 'rgba(0,0,0,.55)'; og.fillRect(x - 9, y0, 18, h);
      og.fillStyle = 'rgba(79,196,106,.85)'; og.fillRect(x - 9, y0 + h * 0.15, 18, h * 0.45); og.fillStyle = 'rgba(224,87,58,.8)'; og.fillRect(x - 9, y0, 18, h * 0.15);
      og.fillStyle = '#fff'; og.fillRect(x - 14, y0 + h * (1 - k.tension / 100) - 2, 28, 4); og.font = '600 12px system-ui'; og.fillText('serrage', x - 12, y0 - 8); }
  }
  if (ph === 'cut' && N.st && N.st.K && !N.auto) { const st = N.st, a = toScreen(st.K.clone().addScaledVector(st.out, 0.5)), b = toScreen(st.K.clone().addScaledVector(st.out, 1.0));
    if (S.L.guides) { og.strokeStyle = 'rgba(79,196,106,.9)'; og.lineWidth = 9; og.beginPath(); og.moveTo(a[0], a[1]); og.lineTo(b[0], b[1]); og.stroke(); }
    og.font = '22px system-ui'; og.fillText('✂️', b[0] + 8, b[1] - 6); }
  if ((ph === 'pass' || ph === 'mid') && N.d && N.d.p1 && S.L.hints) drawCoupe();
}
function drawCoupe() { // vue en coupe : couches de peau, plaie, trajet prévu, aiguille en direct
  const d = N.d, cross = d.type !== 'intra', X = 10, Y = 100, Wd = 170, Hd = 112, uC = cross ? d.xm : d.mirror / 2, s = Math.min(70, 150 / Math.max(1.0, (cross ? 2 * d.xm : d.mirror) + 0.5));
  const px = (u) => X + Wd / 2 + (u - uC) * s, py = (dp) => Y + 26 + dp * s;
  og.save(); og.beginPath(); og.roundRect(X, Y, Wd, Hd, 10); og.clip();
  og.fillStyle = '#e8c56a'; og.fillRect(X, Y, Wd, Hd); og.fillStyle = '#15302c'; og.fillRect(X, Y, Wd, 26);
  og.fillStyle = '#e9c9bf'; og.fillRect(X, py(0.05), Wd, 0.19 * s); og.fillStyle = '#a8705a'; og.fillRect(X, py(0), Wd, 0.05 * s);
  if (S.data.deep) { og.fillStyle = '#ecebe4'; og.fillRect(X, py(1.18), Wd, 0.07 * s); og.fillStyle = '#8c1c18'; og.fillRect(X, py(1.25), Wd, Hd); }
  og.font = '600 9px system-ui'; og.fillStyle = 'rgba(40,20,10,.75)'; og.fillText('derme', X + 4, py(0.17)); og.fillText('graisse', X + 4, py(0.4));
  if (cross) { og.fillStyle = '#5a1410'; og.beginPath(); og.moveTo(px(d.xm - d.gw), py(0)); og.lineTo(px(d.xm), py(d.Dd)); og.lineTo(px(d.xm + d.gw), py(0)); og.fill(); }
  const uv = (v) => [(v.x - d.P.x) * d.e.x + (v.z - d.P.z) * d.e.z, -v.y];
  og.strokeStyle = '#2f8f4a'; og.setLineDash([4, 3]); og.lineWidth = 2; og.beginPath();
  for (const p of (d.two ? [d.p1, d.p2] : [d.p1])) { if (!p) continue; for (let i = 0; i <= 18; i++) { const [u, dp] = uv(p.at(p.aP + p.sweep * i / 18)); i ? og.lineTo(px(u), py(dp)) : og.moveTo(px(u), py(dp)); } }
  og.stroke(); og.setLineDash([]);
  const G0 = needleGeo(), pass = d.pass;
  if (pass && !G0.straight && d.psi != null) { og.strokeStyle = '#f4f6f8'; og.lineWidth = 3; og.beginPath(); for (let i = 0; i <= 16; i++) { const [u, dp] = uv(pass.at(d.psi - G0.Th + G0.Th * i / 16)); i ? og.lineTo(px(u), py(dp)) : og.moveTo(px(u), py(dp)); } og.stroke(); }
  og.restore();
  const dep = d.two ? d.dep : d.p1.depth, ok = dep >= (S.key === 'face' ? 0.08 : 0.18) || d.shallow;
  og.strokeStyle = ok ? '#4fc46a' : '#f0b33a'; og.lineWidth = 3; og.beginPath(); og.roundRect(X, Y, Wd, Hd, 10); og.stroke();
  og.fillStyle = '#fff'; og.font = '600 11px system-ui'; og.fillText(`Coupe · profondeur ${(dep * 10).toFixed(1).replace('.', ',')} mm`, X + 8, Y + 17);
}

// ------------------------------------------------------------------ SOINS : actions sur la plaie
function prepCare() {
  band = null; S.blood = null;
  const pos = S.base.pos, code = S.base.code, wet = pad.geometry.attributes.wet.array;
  for (let i = 0; i < code.length; i++) { const c = code[i]; if ((c > 0.15 && c < 0.55) && c !== 0.4) wet[i] = c > 0.45 ? 0.75 : 0.4; if (c > 0.85 && c < 0.92) wet[i] = 0.35; if (c > 0.92) wet[i] = 0.02; if (Math.abs(c - 0.1) < 0.02 && S.key === 'infect') wet[i] = 0.3; if (Math.abs(c - 0.45) < 0.02) wet[i] = 0.85; if (Math.abs(c - 0.6) < 0.02) wet[i] = 0.8; if (Math.abs(c - 0.4) < 0.02) wet[i] = 0.05; }
  if (S.key === 'exsud') for (let i = 0; i < code.length; i++) if (code[i] > 0.15 && code[i] < 0.25) wet[i] = 1;
  pad.geometry.attributes.wet.needsUpdate = true;
  S.act = { total: 0, done: 0, bleeds: 0 };
  if (S.key === 'corail') {
    const g = new THREE.DodecahedronGeometry(0.06, 0), m = new THREE.MeshStandardMaterial({ color: 0xe9dcc8, roughness: 0.9 });
    S.debris = [];
    for (const [x0, y0, x1, y1] of CMETA.scratch) for (let k = 0; k < 4; k++) {
      const u = 0.15 + 0.7 * Math.random(); const d = new THREE.Mesh(g, m); d.scale.set(1 + Math.random(), 0.6, 1 + Math.random() * 0.5);
      d.position.set(lerp(x0, x1, u), 0.0, -lerp(y0, y1, u)); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.castShadow = true; padGroup.add(d); S.debris.push(d);
    }
    S.act.total = S.debris.length;
  }
  if (S.key === 'route' && CMETA.road) {   // gravillons de bitume incrustés dans la dermabrasion
    const g = new THREE.DodecahedronGeometry(0.07, 0), ms = [0x3a3835, 0x56524c, 0x6e6a62].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
    const [cx, cy, A, B] = CMETA.road; S.debris = [];
    for (let k = 0; k < 14; k++) {
      const an = Math.random() * 2 * PI, r = 0.75 * Math.sqrt(Math.random());
      const d = new THREE.Mesh(g, ms[k % 3]); d.scale.set(0.7 + Math.random() * 0.9, 0.55, 0.7 + Math.random() * 0.7);
      d.position.set(cx + Math.cos(an) * r * A, -0.02, -(cy + Math.sin(an) * r * B)); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.castShadow = true; padGroup.add(d); S.debris.push(d);
    }
    S.act.total = S.debris.length;
  }
  if (S.key === 'brul2s') { S.act.total = CMETA.blisters.filter((b) => b[3]).length; S.blDone = {};
    const bm = new THREE.MeshStandardMaterial({ color: 0xf3e2c0, roughness: 0.06, transparent: true, opacity: 0.4, depthWrite: false });
    bm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); gl_FragColor.a = 0.22 + 0.6 * fr;'); };
    for (const b of CMETA.blisters) if (!b[3]) { const d = new THREE.Mesh(new THREE.SphereGeometry(b[2], 28, 12, 0, 2 * PI, 0, PI / 2), bm); d.scale.y = 0.42; d.position.set(b[0], 0.0, -b[1]); padGroup.add(d); } }
  if (S.key === 'fibrine' || S.key === 'infect') { const tgt = S.key === 'fibrine' ? 0.3 : 0.5; let n = 0; for (const c of code) if (Math.abs(c - tgt) < 0.02) n++; S.act.total = n; S.act.code = tgt; }
  if (S.key === 'necrose') { S.act.total = 6; S.scar = new THREE.Group(); padGroup.add(S.scar); }
  if (S.key === 'necrohum') { let n = 0; for (const c of code) if (Math.abs(c - 0.45) < 0.02) n++; S.act.total = n; S.act.code = 0.45; }
  if (S.key === 'tpn') S.act.total = 1;
}
// ---------------------------------------------------------------- ABLATION DES FILS / AGRAFES (plaie cicatrisée)
// Technique (CHUV, procédures « ablation fils » et « ablation d'agrafes ») : antisepsie, saisir un brin du nœud
// avec la pince et le soulever, couper sous le nœud au ras de la peau, tirer ; agrafes : ôte-agrafes glissé dessous.
function prepRemoval() {
  const R0 = S.data.removal, m = META.wounds[S.data.pad]; W.pts = m.curve; W.w = m.w; W.d = m.d;
  W.L = 0; for (let i = 1; i < W.pts.length; i++) W.L += Math.hypot(W.pts[i][0] - W.pts[i - 1][0], W.pts[i][2] - W.pts[i - 1][2]);
  const pos = S.base.pos, n = pos.length / 3, idx = [], info = [], col = pad.geometry.attributes.color.array, C0 = S.base.col;
  for (let i = 0; i < n; i++) { const x = pos[i * 3], z = pos[i * 3 + 2]; if (Math.abs(x) > 4.6 || Math.abs(z) > 4.0) continue; const q = nearest(x, z); if (q.dd > 3.2) continue; idx.push(i); info.push(q); }
  band = { idx, info }; S.blood = null; S.vessel = null;
  // plaie fermée : un « point » invisible de cicatrisation tout le long
  const heal = { tied: true, k: 0.995, ts: Array.from({ length: 26 }, (_, i) => i / 25), grp: new THREE.Group(), q: 100 };
  S.stitches = [heal]; applyClosure();
  S.rem = { type: R0.type, infect: R0.infect, items: [], mat: threadMat() };
  const scar = (i, k, c) => { for (let j = 0; j < 3; j++) C0[i * 3 + j] = col[i * 3 + j] = lerp(col[i * 3 + j], c[j], k); };
  idx.forEach((i, k) => { const q = info[k], g = gAt(q.t), a = Math.abs(q.s); if (pos[i * 3 + 1] < -0.03) scar(i, 0.85, [0.42, 0.12, 0.1]); else if (a < g + 0.12) scar(i, 0.55 * (1 - Math.max(0, a - g) / 0.12), [0.5, 0.17, 0.14]); });
  const N0 = R0.n, rr = D.FILS['4-0'];
  for (let k = 0; k < N0; k++) {
    const t = 0.14 + k * 0.72 / (N0 - 1), A = ptAt(t, 1, R0.type === 'agrafe' ? 0.28 : 0.3), B = ptAt(t, -1, R0.type === 'agrafe' ? 0.28 : 0.3);
    const it = { k, t, A: deformPoint(A.P0), B: deformPoint(B.P0), q: A.q, st: 0, grp: new THREE.Group() }; it.A.y = it.B.y = 0.012;
    it.C = new V3().lerpVectors(it.A, it.B, 0.5); padGroup.add(it.grp); S.rem.items.push(it); remBuild(it);
  }
  if (R0.infect != null) { // point infecté : rougeur, œdème, pus au bord du fil
    const it = S.rem.items[R0.infect];
    for (let i = 0; i < n; i++) { const dd = Math.hypot(pos[i * 3] - it.C.x, pos[i * 3 + 2] - it.C.z); if (dd < 1.3 && pos[i * 3 + 1] > -0.03) { const kk = Math.pow(1 - dd / 1.3, 0.8); scar(i, 0.75 * kk, [0.55, 0.05, 0.06]); pad.geometry.attributes.position.array[i * 3 + 1] += 0.05 * kk; } }
    const pus = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xc9c25a, roughness: 0.12, clearcoat: 1 })); pus.scale.y = 0.55; pus.position.copy(it.C).add(new V3(0, 0.03, 0)).addScaledVector(new V3(it.q.tx, 0, it.q.tz), 0.16); it.grp.add(pus); it.pus = pus;
    pad.geometry.attributes.position.needsUpdate = true; pad.geometry.computeVertexNormals();
  }
  pad.geometry.attributes.color.needsUpdate = true;
  S.act = { total: R0.infect != null ? 1 : N0, done: 0, bleeds: 0, extra: 0 };
}
function remBuild(it) {
  const g = it.grp, keep = it.pus; g.traverse((c) => { if (c.geometry && !c.geometry.userData.shared && c !== keep) c.geometry.dispose(); }); g.clear(); if (keep && it.st < 2) g.add(keep);
  if (it.st >= 2) return;
  if (S.rem.type === 'agrafe') {
    const s = new THREE.Group(), w = it.A.distanceTo(it.B) / 2, up = it.st === 1 ? 0.18 : 0; s.position.copy(it.C).setY(0.02 + up); s.rotation.y = -Math.atan2(it.B.z - it.A.z, it.B.x - it.A.x);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.03, 0.05), STEEL_PLAIN); top.position.y = 0.04; s.add(top);
    for (const sg of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.05), STEEL_PLAIN); leg.position.set(sg * w, -0.01, 0); s.add(leg); }
    g.add(s); return;
  }
  const r = D.FILS['4-0'], mat = S.rem.mat, o = new V3(it.A.x - it.B.x, 0, it.A.z - it.B.z).normalize(), lift = it.st === 1 ? 0.2 : 0;
  const K = it.A.clone().addScaledVector(o, 0.1).setY(0.03 + lift);
  for (const P of [it.A, it.B]) { const h = new THREE.Mesh(HOLE_G, HOLE_M); h.position.set(P.x, 0.008, P.z); h.scale.setScalar(r * 1.9); g.add(h); }
  const pts = [it.B.clone().setY(0)]; archPts(it.B, K, 0.06 + lift * 0.5, pts, 8); g.add(tube(pts, r, mat));
  g.add(tube([it.A.clone().setY(-0.01), it.A.clone().lerp(K, 0.5).setY(0.02 + lift * 0.6), K], r, mat));
  const km = new THREE.Mesh(TORUS_G, mat); km.scale.setScalar(r * 1.4); km.position.copy(K); g.add(km);
  for (const sg of [-1, 1]) { const a = sg * 0.28, dd = new V3(o.x * Math.cos(a) - o.z * Math.sin(a), 0, o.x * Math.sin(a) + o.z * Math.cos(a)); g.add(tube([K, K.clone().addScaledVector(dd, 0.16).setY(K.y), K.clone().addScaledVector(dd, 0.32).setY(0.015 + lift * 0.4)], r * 0.9, mat)); }
  if (it.st === 1 && S.L.guides) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.11, 20).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, depthTest: false })); ring.position.copy(it.A).setY(0.04); ring.renderOrder = 7; g.add(ring); }
}
async function remOut(it, far) { // le fil (ou l'agrafe) sort
  it.st = 2; const g = it.grp, from = g.position.clone(), dir = new V3(it.A.x - it.B.x, 0, it.A.z - it.B.z).normalize();
  await tween(450, (t) => { g.position.copy(from).addScaledVector(dir, (far ? -0.4 : 0.4) * t).setY(from.y + 0.6 * t); g.traverse((c) => { if (c.material && c.material.opacity != null && c !== it.pus) { c.material.transparent = true; } }); });
  remBuild(it); g.position.copy(from); if (it.pus) { it.grp.add(it.pus); it.pus.scale.set(1.3, 0.4, 1.3); }
}
function tapRemove(p) {
  const R0 = S.rem; let best = null, bd = 0.6;
  for (const it of R0.items) { if (it.st >= 2) continue; const dd = Math.min(it.A.distanceTo(p.clone().setY(0.012)), it.B.distanceTo(p.clone().setY(0.012)), it.C.distanceTo(p.clone().setY(0.012))); if (dd < bd) { bd = dd; best = it; } }
  if (!best) return toast(R0.type === 'agrafe' ? 'Touchez une agrafe.' : 'Touchez un point (son nœud).', 'mid');
  const it = best, inf = R0.infect != null, ok = !inf || Math.abs(it.k - R0.infect) <= 1;
  const count = () => { if (inf) { if (it.k === R0.infect) S.act.done = 1; else if (!ok) { S.act.bleeds++; S.act.extra++; S.errors.push('Point sain retiré trop tôt (J5 sur une jambe) : risque que la cicatrice s\'ouvre.'); toast('✗ Ce point est sain : à J5 sur une jambe, on le laisse.', 'bad'); } } else S.act.done++; };
  if (R0.type === 'agrafe') { flashForceps(it.C); vib(10); toast('✓ Les 2 mors glissés entièrement sous l\'agrafe, serrés à fond : elle se plie au milieu, ses pointes sortent ; on la soulève d\'un seul geste.', 'good'); it.st = 1; remBuild(it); remOut(it); count(); return actionProgress(); }
  if (it.st === 0) { if (it.A.distanceTo(p.clone().setY(0.012)) > 0.45 && it.C.distanceTo(p.clone().setY(0.012)) > 0.3 && !(S.level === 'deb')) return toast('Saisissez d\'abord le nœud avec la pince (côté nœud).', 'mid'); it.st = 1; remBuild(it); flashForceps(it.A); vib(8); return toast('Nœud soulevé. Touchez maintenant le fil sous le nœud, au ras de la peau (rond jaune), pour couper.', ''); }
  const dA = it.A.distanceTo(p.clone().setY(0.012)), dB = it.B.distanceTo(p.clone().setY(0.012));
  if (dA < 0.4 || (S.level === 'deb' && dA < dB)) { vib(12); toast(inf && it.k === R0.infect ? '✓ Point retiré : le pus s\'écoule. Nettoyez, avis médical.' : '✓ Coupé sous le nœud au ras de la peau, puis tiré vers la cicatrice : seul le fil qui était sous la peau la traverse.', 'good'); remOut(it); count(); }
  else { S.act.bleeds++; S.errors.push('Fil coupé du mauvais côté : la partie extérieure, souillée, repasse sous la peau.'); toast('✗ On coupe sous le nœud, au ras de la peau, côté nœud : sinon le fil sale repasse sous la peau.', 'bad'); remOut(it, true); count(); }
  actionProgress();
}
function nearestVert(p) { const pos = pad.geometry.attributes.position.array; let bi = 0, bd = 1e9; for (let i = 0; i < pos.length / 3; i += 3) { const d = (pos[i * 3] - p.x) ** 2 + (pos[i * 3 + 2] - p.z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; }
function makeFoam(full) { // mousse polyuréthane noire, à la forme de la cavité
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 1, bumpMap: PORES, bumpScale: 3 });
  const f = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.75, 40), m); f.scale.set(2.35, 1, 1.5); f.position.y = -0.3; f.castShadow = true; g.add(f); g.userData.foam = f;
  if (full) { // film transparent + pastille + tubulure
    const film = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.12, transparent: true, opacity: 0.35, depthWrite: false })); film.position.y = 0.09; g.add(film);
    const tm = new THREE.MeshStandardMaterial({ color: 0xf3f4f2, roughness: 0.4, transparent: true, opacity: 0.85 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 24), tm); disc.position.y = 0.18; g.add(disc);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(1.5, 0.6, 0.3), new THREE.Vector3(4, 0.3, 1.5), new THREE.Vector3(7, 0.1, 2.5)]), 30, 0.12, 8), tm));
  }
  return g;
}
function tapCare(hit) {
  const p = padGroup.worldToLocal(hit.point.clone()), a = S.action;
  if (!a) return;
  if (a === 'remove') return tapRemove(p);
  const pos = pad.geometry.attributes.position.array, col = pad.geometry.attributes.color.array, code = S.base.code, wet = pad.geometry.attributes.wet.array;
  if (a === 'debris') {
    let best = null, bd = 0.45; for (const d of S.debris) { if (!d.visible) continue; const dd = Math.hypot(d.position.x - p.x, d.position.z - p.z); if (dd < bd) { bd = dd; best = d; } }
    if (best) { best.visible = false; S.act.done++; flashForceps(best.position); } else toast(S.key === 'route' ? 'Visez un gravillon gris.' : 'Visez un débris blanc de corail.', 'mid');
  } else if (a === 'blisters') {
    const bl = CMETA.blisters.find((b) => Math.hypot(p.x - b[0], p.z + b[1]) < b[2]);
    if (!bl) return toast('Touchez une phlyctène (cloque).', 'mid');
    if (!bl[3]) { S.act.intactTouched = (S.act.intactTouched || 0) + 1; return toast('Phlyctène intacte : on la respecte (ou ponction stérile selon le protocole du service).', 'mid'); }
    const key = bl.join(); if (S.blDone[key]) return; S.blDone[key] = 1; S.act.done++;
    for (let i = 0; i < code.length; i++) { const x = pos[i * 3], z = pos[i * 3 + 2]; if (Math.hypot(x - bl[0], z + bl[1]) < bl[2] * 1.05 && pos[i * 3 + 1] > -0.05) { pos[i * 3 + 1] = -0.02 + 0.004 * Math.random(); col[i * 3] = 0.62; col[i * 3 + 1] = 0.12; col[i * 3 + 2] = 0.10; wet[i] = 0.95; } }
    flashForceps(new THREE.Vector3(bl[0], 0, -bl[1]));
  } else if (a === 'foam') {
    const q = code[nearestVert(p)];
    if (!(q > 0.15 && q < 0.35)) return toast('✗ Posez la mousse DANS la plaie : elle ne doit pas toucher la peau saine.', 'bad');
    if (!S.foam) { S.foam = makeFoam(); padGroup.add(S.foam); S.act.done = 1; toast('✓ Mousse découpée à la forme de la plaie et posée, sans déborder.', 'good'); }
  } else if (a === 'deterge' || a === 'excise') {
    let took = 0, gran = 0;
    for (let i = 0; i < code.length; i++) {
      const dd = Math.hypot(pos[i * 3] - p.x, pos[i * 3 + 2] - p.z); if (dd > 0.42) continue;
      if (Math.abs(code[i] - S.act.code) < 0.02) { code[i] = 0.2; took++; const g = 0.5 + 0.5 * Math.random(); col[i * 3] = lerp(0.47, 0.70, g); col[i * 3 + 1] = lerp(0.012, 0.05, g); col[i * 3 + 2] = lerp(0.012, 0.04, g); pos[i * 3 + 1] -= 0.025; wet[i] = 0.7; }
      else if (Math.abs(code[i] - 0.2) < 0.02) gran++;
    }
    if (took) { S.act.done += took; flashForceps(p); }
    else if (gran > 5) { S.act.bleeds++; toast('Ça saigne : on respecte les bourgeons rouges.', 'bad'); for (let i = 0; i < code.length; i++) { const dd = Math.hypot(pos[i * 3] - p.x, pos[i * 3 + 2] - p.z); if (dd < 0.25) { col[i * 3] = 0.30; col[i * 3 + 1] = 0.01; col[i * 3 + 2] = 0.01; wet[i] = 1; } } }
  } else if (a === 'scarify') {
    let nec = 0; for (let i = 0; i < code.length; i++) if (Math.abs(code[i] - 0.4) < 0.02 && Math.hypot(pos[i * 3] - p.x, pos[i * 3 + 2] - p.z) < 0.2) nec++;
    if (!nec) return toast('Scarifiez uniquement la plaque noire.', 'mid');
    const y = sampleY(p.x, p.z) + 0.01; const m = new THREE.MeshBasicMaterial({ color: 0x5a1a12 });
    for (const r of [PI / 4, -PI / 4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.01, 0.025), m); l.position.set(p.x, y, p.z); l.rotation.y = r; S.scar.add(l); }
    S.act.done = Math.min(S.act.total, S.act.done + 1);
  }
  pad.geometry.attributes.position.needsUpdate = true; pad.geometry.attributes.color.needsUpdate = true; pad.geometry.attributes.wet.needsUpdate = true;
  if (a === 'blisters' || a === 'deterge') pad.geometry.computeVertexNormals();
  actionProgress();
}
function flashForceps(p) {
  if (!animF.children.length) animF.add(toolClone(forceps, 0));
  animF.visible = true; animF.position.copy(padGroup.localToWorld(p.clone().add(new THREE.Vector3(0, 0.05, 0))));
  animF.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.5, 0.7, 0.5).normalize()); animF.rotateX(PI / 2);
  clearTimeout(flashForceps.t); flashForceps.t = setTimeout(() => (animF.visible = false), 700);
}

// ------------------------------------------------------------------ INTERFACE
function helpTip() {
  if (!S) return toast('Choisissez un mode, un niveau et une plaie.', '');
  if (S.L.silent) return toast('Pas d\'astuce pendant l\'examen. Courage !', 'mid');
  S.helps = (S.helps || 0) + 1;
  const kind = S.choices.close ? D.CLOSE[S.choices.close].kind : 'fil';
  let t = D.TIPS[S.step === 'suture' ? (kind === 'fil' ? 'suture' : kind) : S.step] || D.TIPS[S.mode === 'care' ? 'care' : S.mode === 'urg' ? 'urg' : 'prep'];
  if (S.step === 'prep' && S.nextHint) t = 'Prochain geste conseillé : <b>' + S.nextHint() + '</b>';
  if (S.action) t = $('ptext').innerHTML;
  toast('💡 ' + t, '');
}
$('help').onclick = helpTip;
// ---------------- Accueil + tutoriel (passable) + fiches « comment faire » par exercice
const TUTO = [
  ['Bienvenue', '<p>Nira Ora vous entraîne à <b>suturer</b> une plaie, à <b>soigner</b> les plaies difficiles (brûlures, plaies infectées…) et à réagir face à une <b>hémorragie</b>.</p><p>Chaque exercice suit les vraies étapes : préparation, matériel, geste, pansement, bilan.</p>'],
  ['Bouger la vue', '<ul><li>☝️ <b>1 doigt</b> : tourner autour de la plaie</li><li>🤏 <b>2 doigts</b> : zoomer — et, pendant la suture, tourner (un doigt guide alors l\'aiguille)</li><li>💡 une astuce · ❓ comment faire · ✕ retour à l\'accueil</li></ul>'],
  ['Faire un point', '<div class="demo"><div class="cut"></div><span class="dot" style="left:46%;top:18px"></span><span class="dot" style="left:46%;top:62px"></span><div class="fing">👆</div></div><p><b>① Glissez</b> de l\'entrée vers l\'autre côté : l\'aiguille suit votre doigt sous la peau.<br><b>② Touchez la pointe et tirez</b> le fil.<br><b>③ Glissez par-dessus la plaie</b> pour nouer et serrer.<br><b>④ Touchez les fils</b> pour couper.</p>'],
  ['Les types de points', '<ul>' + Object.keys(D.POINTS).map((k) => `<li><b>${D.POINTS[k]}</b> : ${D.POINT_INFO[k]}</li>`).join('') + '</ul><p>Les points à plusieurs passages se font passage par passage : 🟡 entrée, 🔵 sortie du passage suivant.</p>'],
  ['Niveaux', '<ul><li><b>Débutant</b> : on vous montre, ronds verts, matériel conseillé, 👀 « Montre-moi »</li><li><b>Intermédiaire / Avancé</b> : vous choisissez tout, la plaie saigne, le patient bouge</li><li><b>Examen</b> : plaie au hasard, sans aide, certificat à 80 %</li></ul><p>🐚 Les coquillages récompensent vos beaux points. Pas de classement : on progresse contre soi-même.</p>'],
  ['Prêt ?', '<p>Commencez par <b>Suture → Débutant → Coupure nette</b>. Une fiche « comment faire » s\'affiche au début de chaque étape ; vous pouvez la passer.</p>'],
];
let ti = 0;
function tuto(i = 0) { ti = i; $('tuto').classList.remove('hide'); const [t, b] = TUTO[ti]; $('tstep').textContent = `${ti + 1} / ${TUTO.length}`; $('tbody').innerHTML = `<h2>${t}</h2>${b}`; $('tprev').disabled = ti === 0; $('tnext').textContent = ti === TUTO.length - 1 ? 'Commencer ▶' : 'Suivant ▶'; }
function tutoEnd() { $('tuto').classList.add('hide'); save.tutoDone = 1; persist(); $('landing').classList.add('hide'); home(); }
$('tprev').onclick = () => tuto(Math.max(0, ti - 1)); $('tnext').onclick = () => ti < TUTO.length - 1 ? tuto(ti + 1) : tutoEnd(); $('tskip').onclick = tutoEnd;
$('goMenu').onclick = () => { $('landing').classList.add('hide'); home(); };
$('goTuto').onclick = () => tuto(0);
$('menuTuto').onclick = () => tuto(0);
const COACH = {
  prep: ['Préparation', 'Avant de suturer : asepsie, examen, anesthésie, lavage, antiseptique, séchage, champ stérile. En Débutant, touchez ▶ Regarder ; sinon touchez les gestes <b>dans le bon ordre</b> (attention aux pièges).'],
  choose: ['Matériel', 'Touchez une <b>aiguille</b> ou un <b>sachet de fil</b> sur le plateau, ou utilisez la liste. Le choix dépend de la zone : visage = fil fin, cuir chevelu = agrafes, tension = Donati.'],
  suture: ['Un point en 4 gestes', '<b>① Passer</b> : posez le doigt à l\'entrée et glissez vers l\'autre côté, l\'aiguille suit. Relâchez quand la pointe ressort.<br><b>② Tirer le fil</b> : touchez la pointe (cercle jaune) et tirez, en gardant un brin court de 2 à 4 cm.<br><b>③ Nouer</b> : glissez par-dessus la plaie. Plus vous allez loin, plus ça serre.<br><b>④ Couper</b> : touchez les fils à 5–10 mm du nœud.<br><small>Pendant la suture, la vue se tourne et se zoome avec <b>deux doigts</b>.</small>'],
  multi: ['Point à plusieurs passages', 'Chaque passage se fait comme un point simple : <b>glisser</b> pour passer l\'aiguille, puis <b>toucher la pointe et tirer</b> le fil. Suivez les ronds : 🟡 entrée, 🔵 sortie. Le nœud (glisser par-dessus la plaie) et la coupe viennent à la fin. Pour les surjets, touchez ➰ <b>Nouer et terminer</b> quand la plaie est couverte.<br><small>La vue se tourne avec <b>deux doigts</b>.</small>'],
  dress: ['Pansement', 'Touchez un pansement sur le champ ou dans la liste, puis « Poser ». Plaie suturée sèche → pansement sec stérile.'],
  care: ['Soins de plaies', 'Regardez la plaie (couleur, exsudat, rougeur), répondez à la question, puis suivez la conduite à tenir. Certains gestes se font en touchant la plaie.'],
  urg: ['Urgence', 'Chaque seconde compte : le pouls et la tension évoluent en direct. Se protéger, comprimer, alerter, allonger. Le garrot en dernier recours.'],
};
function coach(key, force) {
  if (!S || S.L.silent) return;
  save.coach = save.coach || {};
  if (!force && (save.coach[key] || (S.coachSeen || {})[key])) return;
  S.coachSeen = S.coachSeen || {}; S.coachSeen[key] = 1;
  const [t, b] = COACH[key]; $('ctitle').innerHTML = t; $('cbody').innerHTML = b; $('coach').classList.remove('hide');
  $('cok').onclick = () => $('coach').classList.add('hide');
  $('coff').onclick = () => { save.coach[key] = 1; persist(); $('coach').classList.add('hide'); };
}
$('aide').onclick = () => { if (!S) return tuto(0); const k = S.step === 'suture' ? (S.cur || (S.choices.point && S.choices.point !== 'simple') ? 'multi' : 'suture') : S.step === 'choose' ? 'choose' : S.step === 'dress' ? 'dress' : S.mode === 'care' ? 'care' : S.mode === 'urg' ? 'urg' : 'prep'; coach(k, true); };
$('quit').onclick = () => {
  if (!S) return;
  $('ctitle').textContent = 'Revenir à l\'accueil ?'; $('cbody').textContent = 'La partie en cours sera perdue.';
  $('cok').textContent = 'Oui, accueil'; $('coff').textContent = 'Non, continuer'; $('coach').classList.remove('hide');
  const reset = () => { $('cok').textContent = 'J\'ai compris'; $('coff').textContent = 'Ne plus afficher'; $('coach').classList.add('hide'); };
  $('cok').onclick = () => { reset(); caption(''); anim = null; animN.visible = animH.visible = animF.visible = false; home(); };
  $('coff').onclick = reset;
};
function placeDrape() {
  if (!drapeHole || S.mode !== 'suture' || S.drape) return;
  const d = drapeHole.clone(); d.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }); d.receiveShadow = d.castShadow = true;
  const a = W.pts[0], b = W.pts[W.pts.length - 1]; d.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]);
  d.scale.setScalar(Math.max(0.62, W.L / 4.5)); d.position.y = 0.0; padGroup.add(d); S.drape = d;
}
// Anesthésie locale : méthode, puis où piquer (dans les berges, sous le derme, lentement)
function showSyringe(P, q) {
  if (!S.syr) { S.syr = syringe.clone(); S.syr.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2 }); padGroup.add(S.syr); }
  const sg = Math.sign(q.s) || 1, inN = new THREE.Vector3(-sg * q.nx, 0, -sg * q.nz), tan = new THREE.Vector3(q.tx, 0, q.tz);
  const dir = tan.multiplyScalar(0.55).addScaledVector(inN, -0.35).add(new THREE.Vector3(0, 0.55, 0)).normalize();
  S.syr.position.copy(P).add(new THREE.Vector3(0, -0.04, 0)); S.syr.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); S.syr.visible = true;
}
function bleb(P) {
  const col = pad.geometry.attributes.color.array, pos = pad.geometry.attributes.position.array, C0 = S.base.col;
  for (let i = 0; i < col.length / 3; i++) { const d = Math.hypot(pos[i * 3] - P.x, pos[i * 3 + 2] - P.z); if (d < 0.5 && pos[i * 3 + 1] > -0.04) { const k = 0.3 * (1 - d / 0.5); for (let j = 0; j < 3; j++) C0[i * 3 + j] = col[i * 3 + j] = lerp(C0[i * 3 + j], 0.62, k); } }
  pad.geometry.attributes.color.needsUpdate = true; setTent(P, -0.05, null, 0); setTimeout(() => setTent(null, 0, null, 0), 700);
}
function edgePoint(t, side) { const f = t * (W.pts.length - 1), i = Math.min(W.pts.length - 2, Math.floor(f)), a = W.pts[i], b = W.pts[i + 1]; const x = lerp(a[0], b[0], f - i), z = lerp(a[2], b[2], f - i); const q = nearest(x, z); const o = side * (gAt(t) + 0.06); return { P: new THREE.Vector3(x + q.nx * o, 0.01, z + q.nz * o), q: nearest(x + q.nx * o, z + q.nz * o) }; }
function anesthStep(it, after, auto) {
  setView(new THREE.Vector3(0, 0, 0), S.key === 'face' ? 3.6 : 5.5, 0.5, 0.4);
  const finish = () => { if (S.syr) S.syr.visible = false; S.action = null; caption(''); if (!S.L.silent) toast('Attendre 2 minutes que l\'anesthésie agisse.', 'good'); setTimeout(after, auto ? 900 : 400); };
  if (auto) {
    caption('💉 Lidocaïne 1 % injectée dans les berges'); toast('Pas de spray : il n\'endort que la surface de la peau.', '');
    const pts = [[0.25, 1], [0.25, -1], [0.75, 1], [0.75, -1]]; let k = 0;
    const go = () => { if (k >= pts.length) return finish(); const e = edgePoint(...pts[k]); showSyringe(e.P, e.q); bleb(e.P); k++; setTimeout(go, 800); };
    return go();
  }
  const opts = shuffle([['inj', '💉 Injection de lidocaïne 1 %'], ['spray', '🌬️ Spray anesthésiant ou froid'], ['gel', '🧴 Gel anesthésiant (LET)'], ['none', 'Pas d\'anesthésie']]);
  panel('Anesthésie locale', 'Quelle méthode pour suturer cette plaie ?', '<div class="chk">' + opts.map(([k, l]) => `<button data-a="${k}">${l}</button>`).join('') + '</div>', []);
  $('pbody').querySelectorAll('button[data-a]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.a, V = { inj: [100, '✓ Injection de lidocaïne 1 % : la référence pour suturer.'], spray: [20, '✗ Un spray n\'endort que la surface : insuffisant pour suturer la peau.'], gel: [60, '≈ Le gel (LET) marche sur une plaie ouverte, surtout chez l\'enfant, mais demande 20–30 min ; on complète souvent par une injection.'], none: [0, '✗ Suturer sans anesthésie : douleur inutile.'] }[k];
    S.prodScore.push(V[0]); if (V[0] < 60) S.errors.push('Anesthésie : ' + V[1].slice(2)); if (!S.L.silent) toast(V[1], V[0] >= 100 ? 'good' : V[0] >= 60 ? 'mid' : 'bad');
    S.inj = { n: 0, far: 0, after: () => { if (S.inj.far) S.prodScore.push(Math.max(0, 100 - 20 * S.inj.far)); finish(); } };
    S.action = 'inject';
    panel('Où piquer ?', 'Touchez <b>4 points</b> où injecter la lidocaïne.', '<div class="bar"><span>Injections</span><div><i id="aprog" style="width:0"></i></div></div>', [['Terminé', () => S.inj.n ? S.inj.after() : toast('Faites au moins une injection.', 'mid'), 'main']]);
  }));
}
function tapInject(h) {
  const p = padGroup.worldToLocal(h.point.clone()), q = nearest(p.x, p.z), edge = Math.abs(q.s) - gAt(q.t);
  if (edge > 0.35 || q.t <= 0 || q.t >= 1) { S.inj.far++; return toast('✗ Piquez <b>dans les berges</b> de la plaie : à travers la peau saine, c\'est plus douloureux.', 'bad'); }
  const P = new THREE.Vector3(p.x, 0.01, p.z); showSyringe(P, q); bleb(P); S.inj.n++;
  if (!S.L.silent && S.inj.n === 1) toast('✓ Dans la berge, sous le derme, lentement, aiguille fine.', 'good');
  const el = $('aprog'); if (el) el.style.width = Math.min(100, S.inj.n * 25) + '%';
  if (S.inj.n >= 4) S.inj.after();
}
function caption(t) { const c = $('cap'); if (!c) return; c.textContent = t; c.classList.toggle('on', !!t); }
// note courte en haut, 2 lignes max ; toucher = l'ouvrir en entier, retoucher = la fermer
function toast(msg, cls = '') { const t = $('toast'); t.innerHTML = msg; t.className = 'on ' + cls; clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), Math.min(5200, Math.max(2200, msg.length * 32))); }
$('toast').onclick = () => { const t = $('toast'); if (t.classList.contains('full')) { t.className = ''; return; } t.classList.add('full'); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), 7000); };
function panel(title, text, body = '', acts = []) {
  $('panel').classList.remove('hide'); $('panel').classList.toggle('min', !!save.pmin && !/^Bilan/.test(title)); $('panel').classList.toggle('bilan', /^Bilan/.test(title));
  $('ptitle').innerHTML = title; $('ptext').innerHTML = text; $('pbody').innerHTML = body;
  const pa = $('pact'); pa.innerHTML = '';
  for (const a of acts) { const b = document.createElement('button'); b.innerHTML = a[0]; if (a[2]) b.className = a[2]; b.onclick = a[1]; pa.appendChild(b); }
  requestAnimationFrame(resize);
}
// replier le panneau (titre + boutons seulement) pour voir la plaie
$('ptitle').onclick = () => { save.pmin = !save.pmin; persist(); $('panel').classList.toggle('min', save.pmin); requestAnimationFrame(resize); };
function panelHint(h) { $('ptext').innerHTML = h; }
function btns(sel, list, cur, cb) {
  const el = $('pbody').querySelector(sel); el.innerHTML = '';
  for (const [k, label] of list) { const b = document.createElement('button'); b.innerHTML = label; if (k === cur) b.classList.add('sel'); b.onclick = () => cb(k); el.appendChild(b); }
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// accueil
let homeMode = 'suture', homeLevel = 'deb';
function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
// démo : ce qui n'est pas ouvert reste visible, en gris
function demoLock() { toast('🔒 Disponible dans la version complète de Nira Ora.', 'mid'); }
function home() {
  S = null; $('home').classList.remove('hide'); $('panel').classList.add('hide'); $('bleedbar').classList.add('hide'); $('timer').textContent = '';
  $('pupu').textContent = '🐚 ' + save.pupu; $('lvlchip').textContent = '';
  const lv = $('levels'); lv.innerHTML = '';
  const modes = document.createElement('div'); modes.className = 'row'; modes.style.marginBottom = '8px';
  for (const [k, l] of [['learn', '🎓 Apprendre'], ['suture', '✂️ Suture'], ['care', '🩹 Soins'], ['urg', '🚨 Urgence'], ['sb', '🧪 Bac à sable']]) { const b = document.createElement('button'); b.textContent = l; if (k === homeMode) b.className = 'sel';
    if (D.DEMO && k === 'sb') { b.className = 'off'; b.textContent = '🔒 ' + l.slice(3); b.onclick = demoLock; } else b.onclick = () => { homeMode = k; home(); }; modes.appendChild(b); }
  lv.appendChild(modes);
  if (D.DEMO) { const bn = document.createElement('div'); bn.className = 'info'; bn.style.margin = '0 0 8px'; bn.innerHTML = '🧪 <b>Version de démonstration</b> : les exercices en gris 🔒 sont dans la version complète (7 sutures, 16 soins, 3 urgences, 12 leçons, bac à sable, photo → 3D, niveaux Avancé et Examen).'; lv.appendChild(bn); }
  const row = document.createElement('div'); row.className = 'row';
  for (const k of Object.keys(D.LEVELS)) { const b = document.createElement('button'); b.textContent = D.LEVELS[k].name; if (k === homeLevel) b.className = 'sel';
    if (D.DEMO && !D.DEMO_KEEP.levels.includes(k)) { b.className = 'off'; b.textContent = '🔒 ' + D.LEVELS[k].name; b.onclick = demoLock; } else b.onclick = () => { homeLevel = k; home(); }; row.appendChild(b); }
  lv.appendChild(row);
  const wg = $('wounds'); wg.innerHTML = '';
  if (homeMode === 'sb') return sbForm(wg);
  if (homeMode === 'learn') {
    row.style.display = 'none';
    const L = [['couches', '🧬 Les couches de la peau', 'Épiderme, derme, graisse, aponévrose, muscle'], ['atelier', '➰ Atelier nœud', 'Seulement le nœud, à répéter : l\'aiguille passe pour vous'], ['noeud', '➰ Le nœud à la pince', 'Enrouler, saisir le bout court, tirer à plat ; 3 jetés'], ['anesth', '💉 Anesthésie locale', 'Pas à pas : dose, matériel, où piquer, surveiller'], ...Object.keys(D.POINTS).map((k) => [k, '✂️ ' + D.POINTS[k], 'Fiche + démonstration + à vous'])];
    for (const [k, n, d] of L) { const c = document.createElement('button'); const off = D.DEMO && !D.DEMO_KEEP.learn.includes(k); c.className = 'card' + (off ? ' off' : ''); const done = (save.learn || {})[k]; c.innerHTML = `<b>${n}</b><small>${d}</small><span class="st">${off ? '🔒 Version complète' : done ? '✓ faite' : ''}</span>`; c.onclick = off ? demoLock : () => startLesson(k); wg.appendChild(c); }
    return;
  }
  row.style.display = '';
  const all = homeMode === 'suture' ? D.SUTURE_ORDER : homeMode === 'urg' ? Object.keys(D.URGENCE) : D.CARE_ORDER, open = (k) => !D.DEMO || D.DEMO_KEEP[homeMode].includes(k);
  const order = D.DEMO ? [...all.filter(open), ...all.filter((k) => !open(k))] : all, src = homeMode === 'suture' ? D.SUTURE : homeMode === 'urg' ? D.URGENCE : D.CARE;
  if (homeLevel === 'exam') {
    const b = document.createElement('button'); b.className = 'main'; b.style.gridColumn = '1 / 3';
    b.innerHTML = '🎲 Tirer une plaie au hasard<br><small>Sans aide, chronométré. Certificat à 80 %.</small>';
    const o2 = order.filter(open); b.onclick = () => start(homeMode, o2[Math.floor(Math.random() * o2.length)], 'exam'); wg.appendChild(b);
  } else order.forEach((k, i) => {
    const w = src[k], best = save.best[homeMode + '_' + k] || 0;
    const prev = i ? (save.best[homeMode + '_' + order[i - 1]] || 0) : 3;
    const locked = !D.DEMO && !$('libre').checked && prev < 2, off = !open(k);
    const c = document.createElement('button'); c.className = 'card' + (off ? ' off' : locked ? ' lock' : '');
    c.innerHTML = `<b>${w.icon} ${w.name}</b><small>${w.zone}</small><span class="st">${off ? '🔒 Version complète' : locked ? '🔒 2 ★ à la précédente' : stars(best)}</span>`;
    c.onclick = () => off ? demoLock() : locked ? toast('Obtenez 2 étoiles à la plaie précédente, ou cochez « Mode libre ».', 'mid') : start(homeMode, k, homeLevel);
    wg.appendChild(c);
  });
  if (save.certs.length) { const p = document.createElement('p'); p.className = 'warn'; p.textContent = '🎓 Certificats : ' + save.certs.map((c) => c.n + ' (' + c.d + ')').join(', '); wg.after(p); }
}
$('libre').onchange = home;
// ---------------- 🔍 Recherche : exercices, leçons, tutoriel, fiches, pansements, antiseptiques
const fold = (t) => String(t).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, ' ');
function popInfo(t, b) { $('ctitle').innerHTML = t; $('cbody').innerHTML = b; $('coach').classList.remove('hide'); $('cok').onclick = () => $('coach').classList.add('hide'); $('coff').onclick = $('cok').onclick; }
function searchIndex() {
  const I = [], lv = () => homeLevel === 'exam' ? 'int' : homeLevel;
  for (const k of D.SUTURE_ORDER) { const w = D.SUTURE[k]; I.push(['✂️ Suture', `${w.icon} ${w.name} · ${w.zone}`, w.desc, () => start('suture', k, lv())]); }
  for (const k of D.CARE_ORDER) { const w = D.CARE[k]; I.push(['🩹 Soins', `${w.icon} ${w.name} · ${w.zone}`, w.desc, () => start('care', k, lv())]); }
  for (const k in D.URGENCE) { const w = D.URGENCE[k]; I.push(['🚨 Urgence', `${w.icon} ${w.name}`, w.desc, () => start('urg', k, lv())]); }
  I.push(['🎓 Apprendre', '🧬 Les couches de la peau', 'épiderme derme hypoderme graisse aponévrose muscle', () => startLesson('couches')]);
  I.push(['🎓 Apprendre', '➰ Atelier nœud', 'atelier noeud nœud entraînement répéter', () => startLesson('atelier')]);
  I.push(['🎓 Apprendre', '➰ Le nœud à la pince', 'noeud nœud jeté enrouler porte-aiguille chirurgien serrer couper', () => startLesson('noeud')]);
  I.push(['🎓 Apprendre', '💉 Anesthésie locale', 'lidocaïne dose injection où piquer spray', () => startLesson('anesth')]);
  for (const k in D.POINTS) I.push(['🎓 Point', '✂️ ' + D.POINTS[k], D.POINT_INFO[k] + ' ' + Object.values(D.FICHES[k] || {}).flat().join(' '), () => startLesson(k)]);
  TUTO.forEach(([t, b], i) => I.push(['📖 Tutoriel', t, b, () => tuto(i)]));
  for (const k in D.DRESSINGS) { const x = D.DRESSINGS[k]; I.push(['🩹 Pansement', x.name, x.note || '', () => popInfo('🩹 ' + x.name, x.note || '')]); }
  for (const k in D.PRODUCTS) { const x = D.PRODUCTS[k]; I.push(['🧴 Produit', x.name, x.note || '', () => popInfo('🧴 ' + x.name, x.note || '')]); }
  for (const k in D.CLOSE) { const x = D.CLOSE[k]; I.push(['✂️ Fermeture', x.name, x.note || '', () => popInfo('✂️ ' + x.name, x.note || '')]); }
  for (const k in D.RISKS) { const x = D.RISKS[k]; I.push(['👤 Patient', x.name || x.n, (x.why || '') + ' cicatrisation infection facteur', () => popInfo('👤 ' + x.n, (x.why ? x.why + '. ' : '') + 'Ce facteur change l\'« Évolution prévue » du bilan. ' + (x.adv ? 'Disponible en Avancé et en Examen (bac à sable), et tiré au hasard dans les cas de ces niveaux.' : 'À choisir dans le bac à sable.'))]); }
  I.push(['🧪 Bac à sable', '🧪 Créer son cas', 'bac à sable zone corps tête bras jambe pied périnée main multiple délai', () => { homeMode = 'sb'; home(); }]);
  const out = I.map((x) => ({ g: x[0], t: x[1], f: fold(x[1] + ' ' + x[2] + ' ' + x[0]), go: x[3] }));
  if (!D.DEMO) return out; // démo : le contenu fermé reste trouvable, marqué 🔒
  const ok = new Set([...D.DEMO_KEEP.suture.map((k) => D.SUTURE[k].name), ...D.DEMO_KEEP.care.map((k) => D.CARE[k].name), ...D.DEMO_KEEP.urg.map((k) => D.URGENCE[k].name), ...D.DEMO_KEEP.learn.map((k) => D.POINTS[k] || k)]);
  const learnN = { couches: 'couches de la peau', atelier: 'Atelier nœud', noeud: 'nœud à la pince', anesth: 'Anesthésie locale' };
  for (const x of out) { const gated = /Suture|Soins|Urgence|Point|Bac|Apprendre/.test(x.g), opened = [...ok].some((n) => x.t.includes(learnN[n] || n)); if (gated && !opened) { x.t = '🔒 ' + x.t; x.go = demoLock; } }
  return out;
}
let SIDX = null;
$('q').oninput = () => {
  const q = fold($('q').value).trim(), box = $('qres'); box.innerHTML = '';
  if (q.length < 2) return;
  SIDX = SIDX || searchIndex(); const words = q.split(/\s+/);
  const hits = SIDX.map((x) => ({ x, s: words.every((w) => x.f.includes(w)) ? (fold(x.t).includes(q) ? 2 : 1) : 0 })).filter((h) => h.s).sort((a, b) => b.s - a.s).slice(0, 8);
  if (!hits.length) { box.innerHTML = '<div class="qnone">Rien trouvé. Essayez un autre mot (ex. : donati, brûlure, alginate).</div>'; return; }
  for (const { x } of hits) { const b = document.createElement('button'); b.className = 'qhit'; b.innerHTML = `<small>${x.g}</small>${x.t}`; b.onclick = () => { $('q').value = ''; box.innerHTML = ''; x.go(); }; box.appendChild(b); }
};

async function start(mode, key, level) {
  newGame(mode, key, level);
  $('home').classList.add('hide'); $('loading').classList.remove('hide'); $('loading').textContent = 'Préparation de la plaie…';
  await loadPad();
  $('loading').classList.add('hide');
  $('lvlchip').textContent = S.L.name;
  setView(new THREE.Vector3(0, 0, 0), S.mode !== 'care' ? (S.key === 'face' ? 4.2 : 7.5) : 9, 0.55, 0, true);
  if (mode === 'suture') intro(); else if (mode === 'urg') urgIntro(); else careIntro();
}

// ---------------- SUTURE
function intro() {
  const w = S.data;
  panel(`${w.icon} ${w.name} · ${w.zone}`, w.desc + (S.sbq ? '' : patText()) + (S.bleedLv ? `<br><b>🩸 ${S.bleedLv === 2 ? 'La plaie saigne (veineux).' : 'La plaie suinte.'}</b>` : ''),
    '',
    [['Commencer', () => protocol(D.suturePrep(S.bleedLv > 0, S.level), choose), 'main'], ['↩ Accueil', home]]);
}

// moteur de protocole commun (préparation avant suture / soins)
function autoProtocol(P, next, autorun) {
  if (!autorun) coach(S.mode === 'care' ? 'care' : S.mode === 'urg' ? 'urg' : 'prep');
  const items = P.items; let i = 0;
  const list = items.map((it, k) => `<div class="stp" id="stp${k}">${k + 1}. ${it.label}</div>`).join('');
  panel(S.mode === 'suture' ? 'Préparation' : 'Conduite à tenir', 'Regardez les gestes, dans l\'ordre.', `<div class="chk">${list}</div>`, [['▶ Regarder', () => run(), 'main'], ['Je le fais moi-même', () => protocol(P, next, true)]]);
  const run = () => {
    $('pact').innerHTML = '';
    const step = () => {
      if (i > 0) { const el = $('stp' + (i - 1)); if (el) el.className = 'stp done'; }
      if (i >= items.length) { S.score.prep = 100; S.order = items.map((x) => x.id); setTimeout(next, 500); return; }
      const it = items[i]; const el = $('stp' + i); if (el) el.className = 'stp cur';
      if (it.kind === 'action') { const k = i; i++; return actionStep(it, () => { autoResume(P, k + 1, next); }); }
      if (it.kind === 'anesth') { const k = i; i++; return anesthStep(it, () => { const el2 = $('stp' + k); autoResume(P, k + 1, next); }, true); }
      if (it.id === 'champ') placeDrape();
      if (it.kind === 'wash') { if (S.dirt) S.dirt.visible = false; wetSkin(0.7, 1800); }
      if (it.kind === 'choice') { toast(it.opts[it.ok] + ' — ' + (it.msg || ''), 'good'); if (S.foam) S.foam.userData.foam.scale.y = 0.65; }
      if (it.kind === 'product') { const P0 = D.PRODUCTS[it.ok[0]]; if (P0.tint) tintSkin(P0.tint, 0.28); wetSkin(0.6, 1800); toast(P0.name, 'good'); }
      if (it.id === 'compress' && S.blood) { S.blood.flow = 0.004; S.blood.V *= 0.3; }
      if (it.msg && it.kind !== 'product') toast(it.msg, 'good');
      i++; setTimeout(step, 1300);
    };
    step();
  };
  if (autorun) run();
}
function autoResume(P, from, next) { const rest = { items: P.items.slice(from), bad: [] }; if (!rest.items.length) { S.score.prep = 100; return next(); } autoProtocol(rest, next, true); }
function protocol(P, next, manual) {
  coach(S.mode === 'care' ? 'care' : S.mode === 'urg' ? 'urg' : 'prep');
  if (S.level === 'deb' && !manual) return autoProtocol(P, next);
  const items = P.items.map((x) => ({ ...x }));
  const all = S.L.shuffle ? shuffle([...items, ...P.bad]) : [...items, ...P.bad];
  S.order = []; S.badTaps = 0; S.prodScore = []; S.step = 'prep';
  S.nextHint = () => { const n = items.find((x) => !S.order.includes(x.id)); return n ? n.label : 'Terminer cette étape'; };
  const render = () => {
    const done = new Set(S.order);
    let h = '<div class="chk">';
    all.forEach((it, i) => { const d = done.has(it.id); h += `<button data-i="${i}" class="${d ? 'done' : ''}" ${d ? 'disabled' : ''}>${d ? '✓ ' : (S.L.hints && !it.bad ? (items.indexOf(items.find((x) => x.id === it.id)) + 1) + '. ' : '• ')}${it.label}</button>`; });
    h += '</div>';
    panel(S.mode === 'suture' ? 'Préparation' : 'Conduite à tenir', S.L.hints ? 'Touchez les gestes <b>dans le bon ordre</b>. Attention aux pièges.' : 'Touchez les gestes dans l\'ordre que vous choisissez.', h,
      [['Terminer cette étape', () => finish(), 'main']]);
    $('pbody').querySelectorAll('button[data-i]').forEach((b) => (b.onclick = () => doItem(all[+b.dataset.i])));
  };
  const finish = () => {
    const ids = items.map((x) => x.id), seq = S.order.map((id) => ids.indexOf(id)).filter((x) => x >= 0);
    const lis = (a) => { const t = []; for (const x of a) { let l = 0, r = t.length; while (l < r) { const m = (l + r) >> 1; if (t[m] < x) l = m + 1; else r = m; } t[l] = x; } return t.length; };
    const missed = items.filter((x) => !S.order.includes(x.id));
    missed.forEach((m) => S.errors.push('Oublié : ' + m.label));
    const ord = items.length ? lis(seq) / items.length : 1;
    const prod = S.prodScore.length ? S.prodScore.reduce((a, b) => a + b, 0) / S.prodScore.length / 100 : 1;
    S.score.prep = Math.round(clamp(ord * 0.75 + prod * 0.25 - S.badTaps * 0.15) * 100);
    if (S.blood && S.blood.flow > 0.1 && !S.order.includes('compress')) S.errors.push('Saignement non contrôlé avant la suture.');
    next();
  };
  const doItem = (it) => {
    if (it.bad) { S.badTaps++; S.errors.push(it.label + ' — ' + it.bad); if (it.critical) S.critical.push(it.label); if (!S.L.silent) toast('✗ ' + it.bad, 'bad'); else toast('Noté.', ''); return; }
    const after = () => { S.order.push(it.id); render(); };
    if (it.kind === 'product') return chooseProduct(it, after);
    if (it.kind === 'hold') return holdStep(it, after, () => render());
    if (it.kind === 'choice') {
      panel(it.label, it.q, '<div class="chk">' + it.opts.map((o, i) => `<button data-c="${i}">${o}</button>`).join('') + '</div>', []);
      $('pbody').querySelectorAll('button[data-c]').forEach((b) => (b.onclick = () => { const ok = +b.dataset.c === it.ok; S.prodScore.push(ok ? 100 : 0);
        if (!ok) S.errors.push(it.label + ' : ' + it.opts[it.ok]); if (!S.L.silent) toast(ok ? '✓ ' + (it.msg || 'Exact.') : '✗ Réponse : ' + it.opts[it.ok], ok ? 'good' : 'bad');
        if (ok && S.foam) tween(800, (t) => { S.foam.userData.foam.scale.y = 1 - 0.35 * t; S.foam.userData.foam.position.y = -0.3 - 0.12 * t; });
        after(); })); return;
    }
    if (it.kind === 'action') return actionStep(it, after);
    if (it.kind === 'anesth') return anesthStep(it, after, false);
    if (it.id === 'champ') placeDrape();
    if (it.kind === 'wash') { if (S.dirt) S.dirt.visible = false; wetSkin(0.7, 2200); if (!S.L.silent) toast('Lavage abondant : la plaie est propre.', 'good'); }
    if (it.flow !== undefined && S.blood) { S.blood.flow *= it.flow; }
    if (it.kind === 'look') setView(new THREE.Vector3(0, 0, 0), 5, 0.35, cam.TH);
    if (it.msg && !S.L.silent) toast(it.msg, 'good');
    after();
  };
  render();
}
function chooseProduct(it, after) {
  let h = '<div class="chk">'; const ids = shuffle(Object.keys(D.PRODUCTS));
  ids.forEach((id) => (h += `<button data-p="${id}">${D.PRODUCTS[id].name}</button>`)); h += '</div>';
  panel('Quel produit ?', it.label, h, []);
  $('pbody').querySelectorAll('button[data-p]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.p, [sc, msg] = D.productVerdict(it, id); S.prodScore.push(sc);
    if (sc < 60) S.errors.push('Produit : ' + msg.slice(2));
    const P = D.PRODUCTS[id]; if (P.tint) tintSkin(P.tint, 0.28); wetSkin(P.wet * 0.8, 2500); if (S.dirt && P.wet > 0.6) S.dirt.visible = false;
    if (!S.L.silent) toast(msg, sc >= 100 ? 'good' : sc >= 60 ? 'mid' : 'bad');
    after();
  }));
}
function holdStep(it, after, back) {
  // Un toucher lance le geste (plus besoin de garder le doigt appuyé) ; « Retour » annule.
  const need = it.dur || S.L.compress || 3;
  const isComp = it.id === 'compress' || it.id === 'comp';
  let t0 = 0, raf = 0, comp = null, water = null, running = false;
  const clean = () => { cancelAnimationFrame(raf); running = false; if (comp) { padGroup.remove(comp); comp = null; } if (water) { padGroup.remove(water); water = null; } if (S.blood) S.blood.compress = 0; };
  const end = () => {
    clean();
    if (it.id === 'compress') { S.blood.flow = 0.004; S.blood.V *= 0.3; } else if (it.flow !== undefined && S.blood) { S.blood.flow = it.flow ? S.blood.flow * it.flow : 0.0; S.blood.V *= 0.5; }
    if (it.tourniquet) { const g = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 9.4), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })); g.position.set(-5.6, 0.1, 0); padGroup.add(g); }
    if (it.msg && !S.L.silent) toast(it.msg, 'good'); else if (isComp && !S.L.silent) toast('Saignement arrêté par la compression.', 'good');
    after();
  };
  const start = () => {
    if (running) return; running = true; t0 = performance.now();
    if (isComp && S.blood) { S.blood.compress = 1; comp = DRESS_OBJ.compresse.clone(); comp.position.set(0, 0.08, 0); comp.scale.set(0.9, 0.6, 0.9); padGroup.add(comp); }
    else if (!isComp) { water = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 9), new THREE.MeshStandardMaterial({ color: it.id === 'chd' ? 0x9fd4e6 : 0x7cc3e0, transparent: true, opacity: 0.35, roughness: 0.05 })); water.position.y = -0.2; padGroup.add(water); }
    const btn = $('hold'); if (btn) btn.lastChild.textContent = isComp ? '✋ Compression en cours…' : '⏳ En cours…';
    const tick = () => { const p = clamp((performance.now() - t0) / 1000 / need); const f = $('holdfill'); if (f) f.style.width = p * 100 + '%'; if (p >= 1) return end(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  };
  panel(it.label, isComp ? `Touchez le bouton : la compresse appuie fort sur la plaie (${need} s ici, 5 à 10 min en vrai, sans relâcher pour regarder).` : `Touchez le bouton pour commencer (${need} s ici, temps accéléré).`,
    `<button id="hold" class="hold main" style="width:100%"><i id="holdfill"></i><span>${isComp ? '✋ Comprimer' : '⏳ Commencer'}</span></button>`,
    [['↩ Retour', () => { clean(); (back || after)(true); }]]);
  $('hold').onclick = start;
}
function actionStep(it, after) {
  S.action = it.action;
  const txt = { remove: !S.rem ? '' : S.rem.type === 'agrafe' ? 'Touchez chaque <b>agrafe</b> : l\'ôte-agrafes se glisse dessous et la retire.' : S.rem.infect != null ? 'Retirez <b>le point infecté</b> (rouge, pus) : touchez son nœud pour le soulever, puis le fil au ras de la peau, côté nœud.' : 'Pour chaque point : ① touchez le <b>nœud</b> (la pince le soulève) ② touchez le fil <b>sous le nœud, au ras de la peau</b> (rond jaune) pour couper et tirer.', excise: 'Touchez les îlots <b>gris-brun mous</b> pour les retirer (pince et ciseaux). Ne touchez pas les bourgeons rouges : ils sont vivants.', foam: 'Touchez <b>l\'intérieur de la plaie</b> pour poser la mousse découpée à sa forme.', debris: S.key === 'route' ? 'Touchez chaque <b>gravillon</b> pour le retirer : laissé sous la peau, il fait un tatouage.' : 'Touchez chaque débris de corail pour le retirer à la pince.', blisters: 'Touchez les phlyctènes <b>rompues</b> (toit blanc fripé) pour exciser leur toit.', deterge: S.key === 'infect' ? 'Touchez le pus jaune-vert pour le nettoyer avec une compresse.' : 'Touchez la fibrine jaune pour la retirer à la curette, sans toucher les bourgeons rouges.', scarify: 'Touchez la plaque noire pour la scarifier en quadrillage (6 fois).' }[it.action];
  panel(it.label, txt, '<div class="bar"><span>Progression</span><div><i id="aprog" style="width:0"></i></div></div>', [['Terminé', () => { if (S.rem && S.act.done < S.act.total) { S.errors.push(S.rem.type === 'agrafe' ? 'Agrafe oubliée : comptez-les toujours.' : 'Fil oublié : comptez les fils retirés.'); if (S.rem.infect == null) S.critical.push('Fil ou agrafe oublié'); } S.action = null; S.score.action = actionScore(); after(); }, 'main']]);
  setView(new THREE.Vector3(0, 0, 0), 6, 0.3, cam.TH);
  actionProgress();
}
function actionScore() { const a = S.act; if (!a.total) return 100; const need = S.key === 'fibrine' || S.key === 'infect' || S.key === 'necrohum' ? 0.7 : 1; return Math.round(clamp(a.done / a.total / need) * 100 - a.bleeds * 10 - (a.intactTouched || 0) * 3); }
function actionProgress() { const el = $('aprog'); if (el && S.act) el.style.width = (clamp(actionScore() / 100) * 100) + '%'; }

// choix du matériel
const best = (o) => Object.keys(o).sort((a, b) => o[b] - o[a])[0];
function choose(force) {
  S.step = 'choose'; coach('choose');
  if (S.level === 'deb' && !force) {
    const w = S.data; Object.assign(S.choices, { close: best(w.close), needle: best(w.needle), fil: best(w.fil), point: best(w.point) });
    const isFil = D.CLOSE[S.choices.close].kind === 'fil';
    setView(new THREE.Vector3(13.4, -1.5, 0), 12.5, 0.42, 0); highlightNeedle();
    panel('Matériel conseillé', `Pour une ${w.name.toLowerCase()} (${w.zone.toLowerCase()}) :`,
      `<div class="info" style="font-size:15px">✂️ ${D.CLOSE[S.choices.close].name}${isFil ? `<br>✂️ ${D.NEEDLES[S.choices.needle].name}<br>📏 Fil ${S.choices.fil} · ${D.POINTS[S.choices.point]}<br><small>${D.POINT_INFO[S.choices.point]}</small>` : ''}<br><small>${D.CLOSE[S.choices.close].note}</small></div>`,
      [['Commencer', () => sutureStart(), 'main'], ['Changer', () => choose(true)]]);
    return;
  }
  setView(new THREE.Vector3(13.4, -1.5, 0), 12.5, 0.42, 0);
  const render = () => {
    const c = S.choices.close, isFil = c && D.CLOSE[c].kind === 'fil';
    const n = S.choices.needle ? D.NEEDLES[S.choices.needle] : null;
    panel('Matériel', 'Choisissez la méthode de fermeture.' + (isFil ? ' Touchez une aiguille <b>sur le plateau</b> ou dans la liste.' : ''),
      `<div class="info">👆 Touchez une aiguille ou un sachet de fil sur le plateau.</div><div class="lab">Fermeture</div><div class="row" id="rc"></div>${c && S.L.hints ? `<div class="info">${D.CLOSE[c].note}</div>` : ''}` +
      (isFil ? `<div class="lab">Aiguille</div><div class="row" id="rn"></div>${n ? `<div class="info"><b>${n.name}</b>${S.L.hints ? '<br>' + n.use : ''}</div>` : ''}${S.real ? `<div class="lab">Prise du porte-aiguille : <b id="gv">${S.choices.grip} %</b> depuis le sertissage</div><input type="range" id="grip" min="10" max="90" step="5" value="${S.choices.grip}" style="width:100%">` : ''}<div class="lab">Taille du fil</div><div class="row" id="rf"></div><div class="lab">Point</div><div class="row" id="rp"></div>${S.choices.point ? `<div class="info">${D.POINT_INFO[S.choices.point]}</div>` : ''}` : ''),
      [['Commencer', () => (c && (!isFil || (S.choices.needle && S.choices.fil && S.choices.point))) ? sutureStart() : toast('Complétez vos choix.', 'mid'), 'main']]);
    btns('#rc', Object.keys(D.CLOSE).map((k) => [k, D.CLOSE[k].name]), c, (k) => { S.choices.close = k; render(); highlightNeedle(); });
    if (isFil) {
      btns('#rn', Object.keys(D.NEEDLES).map((k) => [k, D.NEEDLES[k].short]), S.choices.needle, (k) => { S.choices.needle = k; render(); highlightNeedle(); });
      const gr = $('grip'); if (gr) gr.oninput = () => { S.choices.grip = +gr.value; $('gv').textContent = gr.value + ' %'; };
      btns('#rf', Object.keys(D.FILS).map((k) => [k, k + ' <small>' + ({ '3-0': '0,2', '4-0': '0,15', '5-0': '0,1', '6-0': '0,07' }[k]) + ' mm</small>']), S.choices.fil, (k) => { S.choices.fil = k; render(); highlightNeedle(); });
      btns('#rp', Object.keys(D.POINTS).map((k) => [k, D.POINTS[k]]), S.choices.point, (k) => { S.choices.point = k; render(); });
    }
  };
  S.renderChoose = render; render(); highlightNeedle();
}
const SEL_M = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.7 });
const selPk = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.1).rotateX(-PI / 2), SEL_M), selNd = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28).rotateX(-PI / 2), SEL_M);
selPk.visible = selNd.visible = false; scene.add(selPk, selNd);
function highlightPacket() {
  const sel = S && S.choices.close === 'res' ? 'res' : S && S.choices.close === 'nonres' && S.choices.fil ? S.choices.fil.replace('-', '_') : null;
  for (const k in packets) { const o = packets[k], on = k === sel; o.position.y = on ? -1.3 : -1.49; o.scale.setScalar(on ? 1.15 : 1); if (on) { selPk.position.set(o.position.x, -1.49, o.position.z); } }
  selPk.visible = !!sel && !!packets[sel];
  const nk = S && S.choices.needle; if (nk && needles[nk] && (!S.choices.close || D.CLOSE[S.choices.close].kind === 'fil')) { selNd.position.set(needles[nk].tray.position.x - 0.3, -1.49, needles[nk].tray.position.z); selNd.visible = true; } else selNd.visible = false;
}
function highlightNeedle() { highlightPacket(); for (const k in needles) { const g = needles[k].tray; g.position.y = (S && S.choices.needle === k) ? -1.2 : -1.47; g.scale.setScalar((S && S.choices.needle === k) ? 1.25 : 1); } }
function sutureStart() {
  S.step = 'suture'; const w = S.data;
  const cs = w.close[S.choices.close] ?? 50; S.kind = D.CLOSE[S.choices.close].kind;
  if (cs < 60) S.errors.push('Méthode peu adaptée ici : ' + D.CLOSE[S.choices.close].name + '. ' + D.CLOSE[S.choices.close].note);
  if (S.kind !== 'fil') { S.score.choices = cs; buildGuides(); setView(new THREE.Vector3(0, 0, 0), S.key === 'face' ? 3.6 : 6.2, 0.38, 0); return sutureStep(); }
  S.score.choices = Math.round(cs * 0.4 + 0.6 * (w.needle[S.choices.needle] + (w.fil[S.choices.fil] || 0) + w.point[S.choices.point]) / 3);
  if (w.point[S.choices.point] < 60) S.errors.push('Type de point peu adapté : ' + D.POINTS[S.choices.point] + '.');
  if ((w.fil[S.choices.fil] || 0) < 60) S.errors.push('Fil ' + S.choices.fil + ' peu adapté à la zone (' + w.zone + ').');
  if (w.needle[S.choices.needle] < 60) S.errors.push('Aiguille peu adaptée : ' + D.NEEDLES[S.choices.needle].name + '.');
  if (w.vessel != null && S.mode !== 'learn') { S.plane = 'hemo'; S.skinPoint = S.choices.point; S.choices.point = 'hemo'; if (!S.L.silent) toast('Un petit vaisseau saigne au fond (point rouge qui bat). D\'abord le point hémostatique en X, fil résorbable, puis le plan profond, puis la peau.', ''); }
  else if (w.deep && S.mode !== 'learn') { S.plane = 'deep'; S.skinPoint = S.choices.point; S.choices.point = 'buried'; if (!S.L.silent) toast('Plaie profonde : on ferme d\'abord le plan profond (points enfouis, fil résorbable violet), puis la peau.', ''); }
  buildGuides(); S.step = 'suture'; nReset();
  setView(new THREE.Vector3(0, 0, 0), clamp(W.L + 0.4, 3.4, 5.6), 0.42, 0);
  sutureStep();
}
async function rescue() { if (N.auto || N.knotBusy) return; if (N.ph === 'knot') { N.knotBusy = true; try { await autoKnot(); } finally { N.knotBusy = false; if (S && S.step === 'suture') sutureStep(); } } else if (N.ph === 'cut') cutTap(N.st && BUR(N.st.type) ? 0.25 : 0.75); }
function sutureStep() {
  if (S.mode === 'learn' && S.lessonKey === 'atelier') return atelierStep();
  if (S.mode === 'learn') { // leçon : le panneau reste celui de la leçon
    const c = S.lesson[S.li], st = N.st, old = $('knotL'); if (old) old.remove(); const oh = $('helpL'); if (oh) oh.remove();
    if (c.act === 'point' && !N.auto && (N.ph === 'knot' || N.ph === 'cut')) { $('pact').insertAdjacentHTML('afterbegin', `<button id="helpL" class="main">${N.ph === 'knot' ? '➰ Nouer pour moi' : '✂️ Couper'}</button>`); $('helpL').onclick = rescue; }
    if (c.act === 'point' && st && !NEED[st.type] && N.ph === 'idle' && st.passes.length) { $('pact').insertAdjacentHTML('afterbegin', `<button id="knotL" class="main">➰ ${st.type === 'intra' ? 'Tendre' : 'Nouer'} et terminer</button>`); $('knotL').onclick = () => knotStart(st.type === 'intra' ? 'tend' : 'final'); }
    lessonPointDone(); return;
  }
  const n = S.stitches.filter((x) => x.final || x.type && !x.multi).length;
  if (S.kind === 'fil') { // panneau court et stable : les consignes sont dans le bandeau du haut
    const st = N.st, type = curType(), busy = N.ph !== 'idle' || !!st, acts = [];
    coach(type !== 'simple' ? 'multi' : 'suture');
    if (S.plane === 'hemo' && !busy) acts.push(['✓ Vaisseau lié → plan profond', () => { if (!S.vesselOK) return toast('Le vaisseau saigne encore : point en X de part et d\'autre du point rouge.', 'mid'); S.plane = 'deep'; S.choices.point = 'buried'; buildGuides(); nReset(); toast('Saignement arrêté. Maintenant le plan profond : points enfouis.', 'good'); sutureStep(); }, 'main']);
    if (S.plane === 'deep' && !busy) acts.push(['✓ Plan profond fermé → peau', () => { if (!S.stitches.some((x) => x.type === 'buried' && x.final)) return toast('Faites au moins un point profond enfoui.', 'mid'); S.plane = 'skin'; S.choices.point = S.skinPoint; buildGuides(); nReset(); toast('Maintenant la peau : ' + D.POINTS[S.choices.point] + '.', 'good'); sutureStep(); }, 'main']);
    if (S.L.guides === 2 && !busy) acts.push(['👀 Montre-moi', demoStitch]);
    if (S.level !== 'exam' && !N.auto && N.ph === 'knot' && !N.knotBusy) acts.push(['➰ Nouer pour moi', rescue, 'main']);
    if (S.level !== 'exam' && !N.auto) acts.push([`➰ Nœud auto : ${save.autoKnot ? 'oui' : 'non'}`, () => { save.autoKnot = !save.autoKnot; persist(); toast(save.autoKnot ? 'Nœud automatique : après le passage de l\'aiguille, le nœud se fait tout seul (regardez les gestes).' : 'Nœud à faire vous-même.', ''); if (save.autoKnot && N.ph === 'knot') rescue(); else sutureStep(); }]);
    if (!N.auto && N.ph === 'cut') acts.push(['✂️ Couper', rescue, 'main']);
    if (st && !NEED[type] && N.ph === 'idle' && st.passes.length) acts.push([type === 'intra' ? '➰ Tendre et terminer' : '➰ Nouer et terminer', () => knotStart(type === 'intra' ? 'tend' : 'final'), 'main']);
    acts.push(['↩ Annuler', nUndo]);
    acts.push(['Terminer', () => { if (busy) return toast('Terminez d\'abord le point en cours (ou ↩ Annuler).', 'mid'); n ? endSuture() : toast('Faites au moins un point.', 'mid'); }, busy ? '' : 'main']);
    panel(`${D.POINTS[type]} · ${n} fait${n > 1 ? 's' : ''}`, '', '', acts);
    if (N.ph === 'idle' && !N.d) { if (!anim) idlePose(); nIdleCap(); }
    return;
  }
  const dev = { staple: 'Touchez la ligne de la plaie pour poser une agrafe à cheval.', strip: 'Touchez la plaie pour poser un strip perpendiculaire.', glue: 'Touchez le long de la plaie pour appliquer la colle, segment par segment.' }[S.kind];
  caption('');
  panel(`${D.CLOSE[S.choices.close].name} · ${n}`, dev, '', [
    ['Retirer le dernier', () => { const st = S.stitches.pop(); if (st) { padGroup.remove(st.grp); applyClosure(); sutureStep(); } }],
    ['Terminer', () => n ? endSuture() : toast('Posez-en au moins un.', 'mid'), 'main']]);
}
function endSuture() {
  if (N.st || N.ph !== 'idle') return toast('Terminez d\'abord le point en cours (ou ↩ Annuler).', 'mid');
  if (S.plane === 'hemo') return toast('Liez d\'abord le vaisseau qui saigne (point en X).', 'mid');
  if (S.plane === 'deep') return toast('Fermez aussi la peau : touchez « Plan profond fermé → peau ».', 'mid');
  if (S.data.deep && !S.stitches.some((x) => x.type === 'buried' && x.final)) { S.errors.push('Plan profond non fermé : espace mort sous la peau (hématome, infection).'); S.critical.push('Plan profond non fermé'); }
  caption(''); animN.visible = animH.visible = false;
  const w = S.data, tol = S.L.tol, st = S.stitches.filter((x) => !BUR(x.type)).flatMap((x) => (x.ts || [x.t]).map((t) => ({ t, q: x.q, issues: x.issues }))).sort((a, b) => a.t - b.t);
  let sp0 = w.spacing[0], sp1 = w.spacing[1];
  if (S.kind === 'strip') { sp0 = 0.35; sp1 = 0.75; } if (S.kind === 'glue') { sp0 = 0.2; sp1 = 0.75; } if (['surjet', 'intra'].includes(S.choices.point) && S.kind === 'fil') { sp0 = 0.3; sp1 = 1.0; }
  const lo = sp0 / Math.max(1, tol), hi = sp1 * Math.max(1, tol);
  let ok = 0, gaps = 0, unc = 0;
  for (let i = 1; i < st.length; i++) { const d = (st[i].t - st[i - 1].t) * W.L; gaps++; if (d >= lo * 0.8 && d <= hi) ok++; if (d > hi * 1.3) unc += d - hi; }
  const e0 = st[0].t * W.L, e1 = (1 - st[st.length - 1].t) * W.L;
  if (e0 > hi) unc += e0 - hi; if (e1 > hi) unc += e1 - hi;
  const spacing = gaps ? ok / gaps : 0.5, cover = clamp(1 - unc / W.L);
  S.score.stitches = Math.round(st.reduce((a, s) => a + s.q, 0) / st.length);
  S.score.spacing = Math.round((spacing * 0.5 + cover * 0.5) * 100);
  if (cover < 0.85) S.errors.push('Des zones de la plaie restent ouvertes : ajoutez des points.');
  if (spacing < 0.6) S.errors.push('Espacement irrégulier entre les points.');
  const worst = st.slice().sort((a, b) => a.q - b.q)[0]; if (worst && worst.q < 70 && worst.issues[0]) S.errors.push('Point le moins bon : ' + worst.issues[0]);
  const c = S.choices.close;
  const qz = c === 'nonres' || c === 'agrafe' ? [w.abl[1], w.abl[0], c === 'agrafe' ? 'Quand retirer les agrafes ?' : 'Quand retirer les fils ?']
    : [['Non : ' + (c === 'res' ? 'le fil se résorbe seul' : c === 'colle' ? 'la colle tombe seule en 5 à 10 jours' : 'les strips tombent seuls ou se retirent vers J7'), 'Oui, à J2', 'Oui, à J30'], null, 'Faudra-t-il revenir pour les retirer ?'];
  if (!qz[1]) qz[1] = qz[0][0];
  dressing(['compresse', 'ilot', 'film', 'hydro', 'alginate', 'mousse'], D.SUTURE_DRESS, () => quiz(qz[0], qz[1], qz[2], 'quiz', bilan));
}

// pansement
// tube de crème (générique, sans marque)
function makeCream(tint) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6.5, 20).rotateZ(PI / 2), m); body.position.y = 1.1;
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 2.5), m); crimp.position.set(-3.4, 1.1, 0);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.4, 16).rotateZ(PI / 2), new THREE.MeshStandardMaterial({ color: tint || 0xffffff, roughness: 0.5 })); cap.position.set(3.9, 1.1, 0);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 1.6, 20, 1, true).rotateZ(PI / 2), new THREE.MeshStandardMaterial({ color: tint || 0xcccccc, roughness: 0.6 })); band.position.set(0.6, 1.1, 0);
  g.add(body, crimp, cap, band); g.traverse((o) => (o.castShadow = true)); return g;
}
// taille de la plaie à couvrir, en cm (1 unité = 1 cm)
function woundCm() {
  if (S.mode === 'care') return (D.CARE_CM[S.key] || [5, 4]).slice();
  if (W && W.L) { let w = 0; for (let t = 0; t <= 1.001; t += 0.05) w = Math.max(w, gAt(t)); return [Math.max(1, Math.round(W.L * 10) / 10), Math.max(0.6, Math.round(w * 20) / 10)]; }
  return [5, 3];
}
const fitsCm = (s, m) => (s[0] >= m[0] && s[1] >= m[1]) || (s[0] >= m[1] && s[1] >= m[0]);
// taille du pansement : il dépasse de 2–3 cm sur la peau saine (couvrant), ou va dans la plaie à sa taille (mèche, alginate)
function dressSize(id, done) {
  const F = D.DRESS_FIT[id], wc = woundCm(), [L, w] = wc;
  if (!F || F.role === 'none' || F.role === 'topical' || !F.sizes || !F.sizes.length) return done(null, null);
  const cutDim = F.role === 'cover' ? [L + 5, w + 5] : F.role === 'fill' ? [L, w] : [L + 2, w + 2];
  const opts = F.sizes.map((s) => [s.join('x'), s[0] + ' × ' + s[1] + ' cm']);
  if (F.cut) opts.push(['cut', F.role === 'fill' ? '✂️ Découper à la taille de la plaie' : F.role === 'contact' ? '✂️ Découper un peu plus grand que la plaie' : '✂️ Découper : plaie + 2 à 3 cm']);
  const tip = { cover: 'Il doit dépasser de <b>2 à 3 cm</b> sur la peau saine pour bien coller.', fill: 'Il va <b>dans</b> la plaie, sans déborder sur la peau (macération).', contact: 'Un peu plus grand que la plaie, puis des compresses par-dessus.' }[F.role];
  let cur = null;
  const judge = (k) => {
    if (k === 'cut') return [100, '✓ Découpé à la bonne taille.', cutDim];
    const s = k.split('x').map(Number), big = s[0] * s[1] / (cutDim[0] * cutDim[1]);
    if (F.role === 'cover') {
      if (fitsCm(s, cutDim)) return big > 2.4 ? [75, 'Un peu grand : il fait des plis et se décolle. Une taille plus petite suffit.', s] : [100, '✓ Bonne taille : 2–3 cm de peau saine tout autour.', s];
      if (fitsCm(s, [L + 2, w + 2])) return [60, 'Marge trop juste : il faut 2 à 3 cm de peau saine autour de la plaie pour qu\'il tienne.', s];
      return [20, 'Trop petit : les bords collent sur la plaie, il ne protège pas.', s];
    }
    if (F.role === 'fill') return fitsCm(s, cutDim) ? [45, 'Il déborde sur la peau saine : risque de macération. On le découpe à la taille de la plaie.', s] : [50, 'Trop petit : la plaie n\'est pas couverte.', s];
    if (fitsCm(s, [L + 1, w + 1])) return big > 3 ? [80, 'Un peu grand : on peut le découper.', s] : [100, '✓ Bonne taille.', s];
    return [40, 'Trop petit : la plaie n\'est pas couverte.', s];
  };
  const render = () => {
    panel('Taille du pansement', `Plaie : <b>${String(L).replace('.', ',')} × ${String(w).replace('.', ',')} cm</b>. ${S.L.hints ? tip : 'Quelle taille ?'}`, '<div class="chk" id="dsz"></div>', [['Valider', () => {
      if (!cur) return toast('Choisissez une taille.', 'mid');
      const [sc, msg, s] = judge(cur), dims = L >= w ? [Math.max(...s), Math.min(...s)] : [Math.min(...s), Math.max(...s)];
      if (sc < 75) S.errors.push('Taille du pansement : ' + msg);
      done(sc, dims, sc < 100 ? (sc >= 75 ? '≈ ' : '✗ ') + msg : '');
    }, 'main']]);
    btns('#dsz', opts, cur, (k) => { cur = k; render(); });
  };
  render();
}
function dressing(list, rule, next) {
  S.step = 'dress'; coach('dress');
  setView(new THREE.Vector3(0, -1.5, -32), 36, 0.3, 0);
  let cur = null;
  const render = () => {
    panel('Pansement', 'Touchez un pansement <b>sur le champ</b> ou dans la liste.', `<div class="chk" id="dl"></div>${cur ? `<div class="info"><b>${D.DRESSINGS[cur].name}</b>${S.L.hints ? '<br>' + D.DRESSINGS[cur].note : ''}</div>` : ''}`,
      [['Poser ce pansement', () => cur ? apply() : toast('Choisissez un pansement.', 'mid'), 'main']]);
    btns('#dl', list.map((k) => [k, D.DRESSINGS[k].name]), cur, (k) => { cur = k; render(); lift(); });
  };
  const lift = () => { for (const k in DRESS_OBJ) { const o = DRESS_OBJ[k]; o.position.copy(o.userData.home); if (k === cur) o.position.y += 0.6; o.visible = list.includes(k); } };
  S.pickDress = (k) => { if (list.includes(k)) { cur = k; render(); lift(); } };
  const apply = () => { S.pickDress = null; dressSize(cur, place); };
  const place = (szs, dims, smsg) => {
    const sc0 = rule.best.includes(cur) ? 100 : rule.ok.includes(cur) ? 75 : (rule.fair || []).includes(cur) ? 50 : 10;
    const sc = szs == null ? sc0 : Math.round(sc0 * 0.7 + szs * 0.3);
    S.score.dress = sc; if (sc0 < 75) S.errors.push('Pansement : ' + D.DRESSINGS[cur].name + ' — ' + rule.why);
    const F = D.DRESS_FIT[cur] || {}, topical = F.role === 'topical';
    const o = DRESS_OBJ[cur].clone(); o.userData = {}; scene.add(o); const from = DRESS_OBJ[cur].position.clone();
    if (dims) { const bb = new THREE.Box3().setFromObject(DRESS_OBJ[cur]), sz = bb.getSize(new THREE.Vector3()); o.scale.x *= dims[0] / Math.max(0.5, sz.x); o.scale.z *= dims[1] / Math.max(0.5, sz.z); }
    let rotY = 0; if (S.mode === 'suture') { const a = W.pts[0], b = W.pts[W.pts.length - 1]; rotY = -Math.atan2(b[2] - a[2], b[0] - a[0]); }
    const top = Math.max(0.03, sampleY(0, 0) + 0.03) - 0.0, to = padGroup.localToWorld(new THREE.Vector3(0, top, 0));
    { const wc = woundCm(), m = Math.max(...(dims || [wc[0] + 2, wc[1] + 2])); setView(new THREE.Vector3(0, 0, 0), Math.max(12, m * 2.3 + 4), 0.6, 0); }
    const t0 = performance.now();
    S.dressAnim = (now) => { const t = clamp((now - t0) / 1400), e = ease(t); o.position.lerpVectors(from, to, e); o.position.y += Math.sin(PI * e) * 6; o.rotation.y = rotY * e; if (t >= 1) { S.dressAnim = null; S.dressObj = o;
      if (topical) { const wc = woundCm(), lay = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: D.DRESSINGS[cur].tint || 0xf4f2ec, roughness: 0.3, transparent: true, opacity: 0.88 }));
        lay.scale.set(wc[0] + 0.8, 1, wc[1] + 0.8); lay.position.copy(to); lay.position.y = to.y + 0.01; lay.rotation.y = rotY; scene.add(lay); o.visible = false; S.dressObj = lay; }
      if (!S.L.silent) toast(sc0 < 75 ? '✗ ' + rule.why : smsg ? smsg : '✓ ' + D.DRESSINGS[cur].note, sc0 < 75 || (szs != null && szs < 75) ? 'bad' : smsg ? 'mid' : 'good'); setTimeout(next, 1200); } };
    for (const k in DRESS_OBJ) DRESS_OBJ[k].visible = false;
  };
  for (const k in DRESS_OBJ) DRESS_OBJ[k].visible = list.includes(k);
  render(); lift();
}
function quiz(opts, ans, q, key, next) {
  const o = S.L.shuffle ? shuffle(opts) : opts;
  let h = '<div class="chk">'; o.forEach((x, i) => (h += `<button data-q="${i}">${x}</button>`)); h += '</div>';
  panel('Question', q, h, []);
  $('pbody').querySelectorAll('button[data-q]').forEach((b) => (b.onclick = () => {
    const ok = o[+b.dataset.q] === ans; S.score[key] = ok ? 100 : 0;
    if (!ok) S.errors.push(q + ' → ' + ans);
    if (!S.L.silent) toast(ok ? '✓ Exact.' : '✗ Réponse : ' + ans, ok ? 'good' : 'bad');
    setTimeout(next, 900);
  }));
}

// ---------------- SOINS DE PLAIES
function careIntro() {
  const c = S.data;
  panel(`${c.icon} ${c.name} · ${c.zone}`, c.desc + patText(), `<div class="info">Étapes : évaluer → conduite à tenir → pansement → orientation → bilan.</div>`,
    [['Évaluer la plaie', () => { setView(new THREE.Vector3(0, 0, 0), 6.5, 0.32, 0); quiz(c.assess[1], c.assess[1][c.assess[2]], c.assess[0], 'assess', () => protocol({ items: [{ id: 'hands', label: 'Hygiène des mains et gants (asepsie)', kind: 'plain' }, ...c.steps], bad: c.bad }, careDress)); }, 'main'], ['↩ Accueil', home]]);
}
function careDress() { S.score.protocol = S.score.prep; dressing(Object.keys(D.DRESSINGS), S.data.dress, () => quiz(S.data.orient[1], S.data.orient[1][S.data.orient[2]], S.data.orient[0], 'orient', bilan)); }

// ---------------- APPRENDRE : leçons pas à pas
async function startLesson(key) {
  const pt = key !== 'anesth' && key !== 'couches';
  newGame('learn', key === 'intra' ? 'face' : key === 'hemo' ? 'vaisseau' : (key === 'buried' || key === 'couches') ? 'deep' : 'lin', 'deb');
  S.data = D.SUTURE[S.key]; S.lessonKey = key; S.bleedLv = 0;
  Object.assign(S.choices, { close: BUR(key) ? 'res' : 'nonres', needle: S.key === 'face' ? 'B' : 'A', fil: S.key === 'face' ? '6-0' : '4-0', point: pt && key !== 'noeud' && key !== 'atelier' ? key : 'simple' });
  S.kind = 'fil';
  $('home').classList.add('hide'); $('loading').classList.remove('hide'); $('loading').textContent = 'Préparation de la leçon…';
  await loadPad(); $('loading').classList.add('hide'); $('lvlchip').textContent = 'Apprendre';
  if (S.dirt) S.dirt.visible = false;
  setView(new THREE.Vector3(0, 0, 0), S.key === 'face' ? 4.2 : 5.4, 0.45, 0, true);
  if (key === 'couches' && guides) guides.visible = false;
  S.lesson = key === 'atelier' ? [{ t: '➰ Atelier nœud', x: '', act: 'knot' }] : pt ? pointLesson(key) : key === 'couches' ? layersLesson() : D.ANESTH_LESSON.map((x) => ({ ...x })); S.li = 0; S.step = 'lesson';
  lessonRender();
}
function layersSVG(hi) { // coupe schématique de la peau, couche surlignée
  const H = [10, 34, 52, 8, 46], L = D.LAYERS; let y = 22, out = '';
  L.forEach((l, i) => { const on = l.k === hi; out += `<rect x="70" y="${y}" width="230" height="${H[i]}" fill="${l.c}" opacity="${hi && !on ? 0.35 : 1}" stroke="${on ? '#f7c873' : 'none'}" stroke-width="3"/><text x="64" y="${y + H[i] / 2 + 4}" text-anchor="end" font-size="11" fill="${on ? '#f7c873' : '#f4efe6'}" font-weight="${on ? 700 : 400}">${l.n.split(' ')[0]}</text>`; y += H[i]; });
  out += '<path d="M170 22 L190 22 L184 110 L176 110 Z" fill="#3a0d0b"/>';  // la plaie, jusqu'à la graisse
  return `<svg viewBox="0 0 310 ${y + 6}" style="width:100%;max-width:340px;display:block;margin:6px auto" role="img" aria-label="Coupe de la peau"><text x="185" y="15" text-anchor="middle" font-size="10" fill="#f4efe6">plaie</text>${out}</svg>`;
}
function layersLesson() {
  const views = { epi: [0.35, 0.9, 2.2], der: [0.25, 1.0, 2.0], hyp: [-0.4, 1.05, 2.4], apo: [-1.15, 1.1, 2.6], mus: [-1.3, 1.15, 2.8] };
  return [
    { t: 'Les couches de la peau', x: layersSVG() + 'Une plaie traverse une ou plusieurs couches. Savoir lesquelles sont touchées décide du geste : suture simple, points profonds, ou chirurgien. Regardez la plaie : on va descendre couche par couche.' },
    ...D.LAYERS.map((l) => ({ t: l.n, x: layersSVG(l.k) + l.x, view: views[l.k] })),
    ...D.LAYERS_QUIZ.map((q, i) => ({ t: 'Question ' + (i + 1), x: '', quiz: q })),
  ];
}
// ---------------------------------------------------------------- ➰ ATELIER NŒUD : l'aiguille passe toute seule, on ne
// s'entraîne qu'au nœud à la pince, autant de fois qu'on veut, avec la liste des étapes cochée en direct.
const AT = { n: 0, ok: 0, last: null, seen: 0 };
const KSTEP = { place: '⓪ Poser le porte-aiguille sur la plaie, entre les 2 brins', wrap: '① Enrouler le brin long autour (pince à disséquer ou gant)', grab: '② Porte-aiguille : saisir le bout court', pull: '③ Tirer à plat, chacun de son côté' };
async function atelierNext() {
  if (N.auto || N.knotBusy || N.ph !== 'idle' || N.st || !S || S.lessonKey !== 'atelier') return;
  if (S.stitches.filter((x) => x.final).length >= 5) { clearStitches(); AT.seen = 0; }
  const used = S.stitches.filter((x) => x.final).map((x) => x.t), t = [0.5, 0.32, 0.68, 0.2, 0.8].find((v) => !used.some((u) => Math.abs(u - v) < 0.06)) ?? 0.5;
  N.auto = true; caption('L\'aiguille passe pour vous…'); atelierPanel();
  try { const [A, B] = demoSeq('simple', t)[0]; await sleep(300); await autoPass(A, B); } finally { N.auto = false; caption(''); }
  if (N.ph === 'knot') { buildStitch(N.st); knotCap(); } atelierPanel();
}
function atelierStep() {
  const f = S.stitches.filter((x) => x.final);
  if (f.length > AT.seen) { AT.seen = f.length; const st = f[f.length - 1]; AT.n++;
    const good = !st.blanch && (st.kT || 0) >= 0.99; if (good) AT.ok++;
    AT.last = good ? '✓ Nœud réussi : nœud du chirurgien + 2 jetés en sens alternés, tension juste.' : '✗ ' + (st.issues.find((x) => /serr|écart|tension/i.test(x)) || st.issues[0] || 'Tension à revoir.');
    setTimeout(() => { if (S && S.lessonKey === 'atelier') atelierNext(); }, 1100); }
  atelierPanel();
}
function atelierPanel() {
  if (!S || S.lessonKey !== 'atelier') return;
  const k = N.kn, order = ['place', 'wrap', 'grab', 'pull'];
  let body = '';
  if (N.ph === 'knot' && k && k.kind !== 'tend') { const i = order.indexOf(k.step);
    body += `<div class="lab">Jeté ${k.throws.length + 1} sur 3${k.throws.length === 0 ? ' · 2 tours (nœud du chirurgien)' : ' · 1 tour, dans l\'autre sens'}</div>`;
    body += '<ul class="ksteps">' + order.map((o, j) => `<li class="${j < i ? 'ok' : j === i ? 'now' : ''}">${j < i ? '✅' : j === i ? '👉' : '⬜'} ${KSTEP[o]}${o === 'wrap' && j === i ? ` <b>${k.wraps}/${wrapNeed(k)}</b>` : ''}</li>`).join('') + '</ul>'; }
  else if (N.ph === 'cut') body += '<div class="lab">Coupez les 2 fils à 5–10 mm du nœud : touchez-les.</div>';
  else if (N.auto) body += '<div class="lab">L\'aiguille passe pour vous…</div>';
  if (AT.last) body += `<div class="info">${AT.last}</div>`;
  const acts = [];
  const tool = save.holdTool || 'pince';
  body += `<div class="row sbrow" id="atTool"><span style="align-self:center;font-size:13px;opacity:.8">Brin long tenu par :</span><button data-k="pince" class="${tool === 'pince' ? 'sel' : ''}">🔧 Pince à disséquer</button><button data-k="gant" class="${tool === 'gant' ? 'sel' : ''}">🧤 Main gantée</button></div>`;
  if (N.ph === 'knot' && !N.auto && !N.knotBusy) acts.push(['🐢 Démo lente', async () => { N.slow = true; try { await rescue(); } finally { N.slow = false; } }, 'main'], ['➰ Nouer pour moi', rescue]);
  if (N.ph === 'cut' && !N.auto) acts.push(['✂️ Couper', () => cutTap(0.75), 'main']);
  acts.push(['🔄 Nouveau nœud', () => { if (N.auto || N.knotBusy) return; clearStitches(); AT.seen = 0; AT.last = null; N.ph = 'idle'; N.st = null; N.kn = null; atelierNext(); }]);
  acts.push(['↩ Accueil', () => { if (N.auto || N.knotBusy) return; if (D.ATELIER) { AT.last = null; return startLesson('atelier'); } homeMode = 'learn'; home(); }]);
  panel(`➰ Atelier nœud <small style="opacity:.6">· ${AT.ok} réussi${AT.ok > 1 ? 's' : ''} sur ${AT.n}</small>`, 'L\'aiguille est déjà passée : vous ne faites que le nœud. Porte-aiguille à droite ; à gauche, le brin long tenu par une pince à disséquer ou les doigts gantés.', body, acts);
  document.querySelectorAll('#atTool button').forEach((b) => (b.onclick = () => { save.holdTool = b.dataset.k; persist(); if (N.st) buildStitch(N.st); if (N.kn) knotCap(); atelierPanel(); }));
}
function knotLesson() { // nœud à la pince (MSF, « Exercice de nœuds à la pince »)
  const ul = (a) => '<ul style="margin:4px 0;padding-left:20px">' + a.map((x) => `<li>${x}</li>`).join('') + '</ul>';
  return [
    { t: 'Le nœud à la pince', x: `<svg viewBox="0 0 320 120" style="width:100%;max-width:340px;display:block;margin:4px auto" role="img" aria-label="Schéma du nœud à la pince"><rect width="320" height="120" rx="8" fill="#c99570"/><line x1="10" y1="60" x2="310" y2="60" stroke="#8a2a22" stroke-width="3"/><path d="M150 60 C150 30 120 20 60 14" fill="none" stroke="#1d2a6b" stroke-width="3"/><text x="14" y="12" font-size="10" fill="#fff">brin long (main gauche)</text><path d="M150 60 L150 104" stroke="#58c8ff" stroke-width="3"/><text x="158" y="110" font-size="10" fill="#dff4ff">bout court (2–4 cm)</text><rect x="156" y="55" width="150" height="5" fill="#d6dade"/><rect x="156" y="61" width="150" height="5" fill="#b9bfc4"/><ellipse cx="178" cy="60" rx="5" ry="11" fill="none" stroke="#1d2a6b" stroke-width="3"/><ellipse cx="190" cy="60" rx="5" ry="11" fill="none" stroke="#1d2a6b" stroke-width="3"/><text x="212" y="48" font-size="10" fill="#fff">pince sur la plaie,</text><text x="212" y="82" font-size="10" fill="#fff">entre les 2 brins</text></svg><div class="info">Après le passage de l'aiguille, on noue avec le porte-aiguille : un nœud plat, serré juste assez pour que les berges se touchent.</div>
      <div class="lab">Avant de nouer</div>${ul(['Tirer le brin long (côté aiguille) jusqu\'à garder un <b>bout court de 2 à 4 cm</b> de l\'autre côté', 'Poser le porte-aiguille <b>sur la plaie, entre les 2 brins, parallèle à la plaie</b>'])}
      <div class="lab">Chaque jeté, en 3 gestes</div>${ul(['<b>① Enrouler</b> le brin long autour du porte-aiguille, 2 ou 3 tours, en le tenant de la main gauche avec une pince à disséquer ou les doigts gantés', '<b>② Saisir</b> le bout court par son extrémité, avec les mors de la pince', '<b>③ Ramener</b> le bout court à travers les boucles, de l\'autre côté de la plaie, pendant que le brin long part dans l\'autre sens : les mains se croisent ; poser le nœud à plat'])}
      <div class="lab">Le nœud complet</div>${ul(['1er jeté : <b>2 tours</b> (nœud du chirurgien) : il ne glisse pas pendant qu\'on serre', '2e jeté : pince de nouveau entre les 2 brins, <b>1 tour dans l\'autre sens</b> ; le bout court revient de son côté de départ', '3e jeté : comme le 1er, mais 1 seul tour. Sens toujours alternés, sinon le nœud glisse (nœud de vache)', 'Serrer sans blanchir la peau : la peau blanche = trop serré (ischémie)'])}` },
    { t: 'Regardez', x: 'Le jeu fait un point simple et le nœud, geste par geste : enrouler, saisir, tirer, trois fois.', demo: 'point' },
    { t: 'À vous', x: 'Faites un point, puis le nœud : <b>touchez la pince</b> (rond jaune) pour enrouler, <b>touchez le bout court</b> (rond bleu), puis <b>glissez par-dessus la plaie</b>. Recommencez pour les 3 jetés, puis coupez.', act: 'point' },
    { t: 'Vérifiez vos connaissances', x: '', quiz: ['Pourquoi fait-on 2 tours au premier jeté ?', ['Pour que le premier jeté ne glisse pas pendant qu\'on fait le suivant', 'Pour que le fil soit plus joli', 'Pour pouvoir couper plus court'], 0] },
  ];
}
function pointLesson(k) {
  if (k === 'noeud') return knotLesson();
  const F = D.FICHES[k], ul = (a) => '<ul style="margin:4px 0;padding-left:20px">' + a.map((x) => `<li>${x}</li>`).join('') + '</ul>';
  return [
    { t: D.POINTS[k] + ' : la fiche', x: `<div class="info">${D.POINT_INFO[k]}</div><div class="lab">✅ Quand le faire</div>${ul(F.quand)}<div class="lab">⛔ Quand l'éviter</div>${ul(F.non)}<div class="lab">➕ Avantages</div>${ul(F.plus)}${F.geste ? '<div class="lab">✋ Le geste</div>' + ul(F.geste) : ''}<div class="lab">➖ Inconvénients</div>${ul(F.moins)}` },
    { t: 'Regardez', x: 'Le jeu fait le point devant vous avec <b>les mêmes gestes que vous</b> : passer l\'aiguille, tirer le fil, nouer, couper.', demo: 'point' },
    { t: 'À vous', x: '<b>① Glissez</b> pour passer l\'aiguille · <b>② touchez la pointe et tirez</b> le fil · <b>③ glissez par-dessus la plaie</b> pour nouer · <b>④ touchez les fils</b> pour couper. Les consignes s\'affichent en haut.', act: 'point' },
    { t: 'Vérifiez vos connaissances', x: '', quiz: D.LESSON_QUIZ[k] },
  ];
}
function clearStitches() {
  for (const st of S.stitches) padGroup.remove(st.grp);
  S.stitches = []; nReset(); applyClosure(); buildGuides();
}
function lessonRender() {
  const L = S.lesson, st = L[S.li], n = L.length, k = S.lessonKey;
  if (st.act === 'knot') { S.step = 'suture'; if (!st.started) { st.started = true; Object.assign(AT, { n: 0, ok: 0, last: null, seen: 0 }); clearStitches(); if (guides) guides.visible = false; atelierNext(); } else atelierPanel(); return; }
  S.step = st.act === 'point' || st.demo === 'point' ? 'suture' : 'lesson'; caption('');
  if (S.step !== 'suture') { animN.visible = animH.visible = false; }
  if (S.syr) S.syr.visible = st.show === 'syringe';
  if (st.show === 'syringe') { const e = edgePoint(0.5, 1); showSyringe(e.P.clone().add(new THREE.Vector3(0, 1.2, 0)), e.q); }
  if (st.view) setView(new THREE.Vector3(0, st.view[0], 0), st.view[2], st.view[1], PI / 2 - 0.25);
  else if (S.lessonKey === 'couches' && S.li === 0) setView(new THREE.Vector3(0, 0, 0), 6, 0.6, 0.4);
  let body = st.x ? '' : '', acts = [], ready = !st.act && !st.quiz && !st.demo;
  if (st.quiz) { const [q, o, a] = st.quiz; body += `<div class="lab">Question</div><div>${q}</div><div class="chk" id="lq">` + o.map((x, i) => `<button data-q="${i}">${x}</button>`).join('') + '</div>'; }
  const nextOk = ready || st.done;
  acts = [['◀', () => { if (S.li > 0) { S.li--; lessonRender(); } }], [S.li === n - 1 ? 'Terminer ✓' : 'Suivant ▶', () => {
    if (!(ready || st.done)) return toast(st.quiz ? 'Répondez à la question.' : st.demo ? 'Regardez la démonstration jusqu\'au bout.' : 'Faites l\'exercice d\'abord (ou « Passer »).', 'mid');
    if (S.li < n - 1) { S.li++; lessonRender(); } else { save.learn = save.learn || {}; save.learn[k] = 1; persist(); toast('🎓 Leçon terminée. Bravo !', 'good'); homeMode = 'learn'; home(); }
  }, nextOk ? 'main' : ''], ['Passer', () => { st.done = true; if (S.li < n - 1) { S.li++; lessonRender(); } else { homeMode = 'learn'; home(); } }]];
  if (st.act === 'point') acts.splice(1, 0, ['↩ Annuler le point', () => { nUndo(); lessonRender(); }], ['🔄 Recommencer', () => { clearStitches(); lessonRender(); }]);
  panel(`${st.t} <small style="opacity:.6">· ${S.li + 1}/${n}</small>`, st.x, body, acts);
  if (st.quiz) $('lq').querySelectorAll('button').forEach((b) => (b.onclick = () => { const ok = +b.dataset.q === st.quiz[2]; b.className = ok ? 'done' : 'bad'; toast(ok ? '✓ Exact !' : '✗ Pas tout à fait : ' + st.quiz[1][st.quiz[2]], ok ? 'good' : 'bad'); if (ok) { st.done = true; setTimeout(lessonRender, 700); } }));
  if (st.demo === 'point' && !st.started) { st.started = true; clearStitches(); demoPoint(k, () => { st.done = true; caption(''); lessonRender(); }); }
  if (st.demo === 'inject' && !st.started) { st.started = true; caption('Piquer dans la berge → aspirer → injecter lentement'); const e = edgePoint(0.3, 1); showSyringe(e.P, e.q); setTimeout(() => { bleb(e.P); caption(''); st.done = true; lessonRender(); }, 2200); }
  if (st.act === 'inject' && !st.done) { S.inj = { n: 0, far: 0, after: () => { st.done = true; S.action = null; if (S.syr) S.syr.visible = false; toast('✓ Les berges sont anesthésiées.', 'good'); lessonRender(); } }; S.action = 'inject'; }
  if (st.act === 'wait' && !st.done) { $('pbody').innerHTML = '<button id="hold" class="hold main" style="width:100%"><i id="holdfill"></i><span>⏳ Attendre (2 min, accéléré)</span></button>'; $('hold').onclick = () => { const t0 = performance.now(); const tk = () => { const p = clamp((performance.now() - t0) / 3000); $('holdfill') && ($('holdfill').style.width = p * 100 + '%'); if (p < 1) requestAnimationFrame(tk); else { st.done = true; lessonRender(); } }; tk(); }; }
  if (st.act === 'test' && !st.done) S.action = 'test';
  if (st.act === 'point' && !st.started) { st.started = true; clearStitches(); }
  if (st.act === 'point' && !N.auto) { if (N.ph === 'idle' && !N.d) idlePose(); nIdleCap(); }
}
function lessonPointDone() { const st = S.lesson && S.lesson[S.li]; if (st && st.act === 'point' && !st.done && !N.auto && S.stitches.some((x) => x.final)) { st.done = true; toast('✓ Bravo ! Touchez Suivant.', 'good'); setTimeout(lessonRender, 900); } }

// ---------------- URGENCE
function urgIntro() {
  const c = S.data; S.t0 = performance.now();
  panel(`${c.icon} ${c.name}`, c.desc + patText(), '<div class="info">Agissez vite : le pouls et la tension évoluent en direct.</div>',
    [['Agir !', () => { S.t1 = performance.now(); protocol({ items: c.steps, bad: c.bad }, () => {
      const sec = (performance.now() - S.t1) / 1000; S.score.speed = Math.round(clamp(1 - (sec - 25) / 90) * 100); S.score.blood = Math.round(clamp(1 - S.lost) * 100);
      quiz(c.orient[1], c.orient[1][c.orient[2]], c.orient[0], 'orient', bilan); }); }, 'main'], ['↩ Accueil', home]]);
}

// ---------------- BILAN
function bilan() {
  S.step = 'bilan'; const sc = S.score;
  const parts = S.noSuture ? [['Décision', sc.decision, 60], ['Pansement', sc.dress, 40]]
    : S.mode === 'suture'
    ? [['Préparation', sc.prep, 15], ['Matériel', sc.choices, 15], ['Qualité des points', sc.stitches, 40], ['Espacement', sc.spacing, 15], ['Pansement', sc.dress, 10], ['Ablation des fils', sc.quiz, 5]]
    : S.mode === 'urg' ? [['Conduite à tenir', sc.prep, 50], ['Rapidité', sc.speed, 25], ['Sang perdu', sc.blood, 25], ['Garrot', sc.orient, 10]]
    : [['Évaluation', sc.assess, 15], ['Conduite à tenir', sc.protocol, 30], ['Geste', sc.action ?? 100, 20], ['Pansement', sc.dress, 20], ['Orientation', sc.orient, 15]];
  let tot = 0, wsum = 0; parts.forEach(([, v, w]) => { tot += (v ?? 0) * w; wsum += w; });
  let total = Math.round(tot / wsum); if (S.errors.some((e) => e.includes('saignait'))) total -= 8;
  if (S.critical.length) total = Math.min(total, S.level === 'exam' ? 49 : 64); // une erreur critique = 1 étoile au plus, à tous les niveaux
  total = clamp(total, 0, 100);
  const st = total >= 85 ? 3 : total >= 65 ? 2 : total >= 40 ? 1 : 0;
  const key = S.mode + '_' + S.key; if (!S.sbq && !S.photo) save.best[key] = Math.max(save.best[key] || 0, st); save.pupu += S.pupu + st;
  let cert = '';
  if (S.level === 'exam' && total >= 80 && !S.critical.length) { const d = new Date().toLocaleDateString('fr-FR'); save.certs.push({ n: S.data.name, d }); cert = `<div class="info">🎓 <b>Attestation d\'entraînement Nira Ora</b> (sans valeur de certification) — ${S.data.name}, ${d}. Bravo !</div>`; }
  persist();
  const best = parts.filter((p) => p[1] != null).sort((a, b) => b[1] - a[1])[0], low = parts.filter((p) => p[1] != null).sort((a, b) => a[1] - b[1])[0];
  const bars = parts.map(([n, v]) => `<div class="bar"><span>${n}</span><div><i style="width:${v ?? 0}%;background:${(v ?? 0) >= 80 ? '#4fc46a' : (v ?? 0) >= 55 ? '#f0b33a' : '#e0573a'}"></i></div></div>`).join('');
  const sec = (performance.now() - S.t0) / 1000;
  const errs = [...new Set(S.errors)].slice(0, 6).map((e) => `<li>${e}</li>`).join('');
  const learn = S.noSuture ? 'Plaie ancienne laissée ouverte : lavage, parage, pansement refait chaque jour, surveillance. Suture différée possible après avis médical.' : S.mode === 'urg' ? 'Hémorragie : se protéger, comprimer fort, alerter le 15, allonger. Le garrot en dernier recours, heure notée, jamais desserré.' : S.mode === 'suture' ? `${D.CLOSE[S.choices.close] ? D.CLOSE[S.choices.close].note + '<br>' : ''}Ablation (fil non résorbable) : <b>${S.data.abl[0]}</b>. Garder sec 24–48 h, surveiller rougeur, chaleur, pus, fièvre.` : S.data.dress.why;
  const again = () => (S.photo && PHOTO ? startPhoto() : S.sbq && S.sbq.i >= 0 ? startCustom(S.sbq.cfg, S.sbq.i) : start(S.mode, S.key, S.level));
  const xa = []; if (S.mode !== 'urg') xa.push(['🔮 Évolution prévue', () => showPredict(total)]);
  if (S.sbq && S.sbq.i + 1 < S.sbq.cfg.n) { const q = S.sbq; xa.unshift([`▶ Plaie suivante (${q.i + 2}/${q.cfg.n})`, () => startCustom(q.cfg, q.i + 1), 'main']); }
  S.showBilan = () => panel(`Bilan · ${total} %`, `<div class="stars">${stars(st)}</div>Maitaʻi ! Votre point fort : <b>${best[0]}</b>.${low[1] < 80 ? ` Un axe de progrès : <b>${low[0]}</b>.` : ''}`,
    `${S.critical.length ? '<div class="info">⛔ <b>Erreur critique</b> : la note est limitée à 1 étoile.</div>' : ''}${cert}${bars}${errs ? `<div class="lab">À retenir</div><ul class="info" style="padding-left:22px;margin:4px 0">${errs}</ul>` : ''}<div class="info">${learn}</div><div class="info">⏱ ${Math.floor(sec / 60)} min ${Math.round(sec % 60)} s · 🐚 +${S.pupu + st} coquillages</div>`,
    [...xa, ['Recommencer', again, xa.length > 1 ? '' : 'main'], ['Revoir la plaie', () => { setView(new THREE.Vector3(0, 0, 0), 8, 0.6, 0); panel('Bilan', `${total} % · ${stars(st)}`, '', [['↩ Accueil', home, 'main'], ['Recommencer', again]]); }], ['↩ Accueil', home]]);
  S.showBilan(); S.total = total;
  if (S.dressObj) { scene.remove(S.dressObj); S.dressObj = null; }
  $('pupu').textContent = '🐚 ' + save.pupu;
}

// ---------------------------------------------------------------- ÉVOLUTION PRÉVUE (hypothèse pédagogique)
// Facteurs : Manuel MSD « Facteurs qui peuvent perturber la cicatrisation » (ischémie, diabète, sutures trop
// serrées, délai > 6 h membre inférieur / > 12–24 h visage-cuir chevelu, contamination, anticoagulants,
// corticoïdes, dénutrition) ; âge et tabac (Quotidien du Médecin). Les chiffres sont des réglages de jeu.
const HEALD = { morsure: 14, route: 14, corail: 14, pierre: 21, brul2s: 12, brul3: 60, exsud: 28, fibrine: 28, infect: 21, necrose: 42, necrohum: 42, talon: 90, tpn: 42, ablation: 0, ablation_inf: 14, ablation_agr: 0 };
const BASEINF = { morsure: 0.3, route: 0.15, corail: 0.2, pierre: 0.25, brul2s: 0.1, brul3: 0.3, exsud: 0.2, fibrine: 0.2, infect: 0.45, necrose: 0.3, necrohum: 0.35, talon: 0.3, tpn: 0.2, ablation: 0.02, ablation_inf: 0.4, ablation_agr: 0.02 };
function isLower(z) { return /jambe|genou|pied|mollet|talon|cuisse|cheville/i.test(z || ''); }
function isFace(z) { return /visage|cuir|tête|front|lèvre|sourcil|joue/i.test(z || ''); }
function predict(total) {
  const sc = S.score, pat = S.pat || {}, why = [], zone = S.data.zone, care = S.mode === 'care', sut = S.mode === 'suture' || S.mode === 'learn';
  const delay = S.delayH ?? 1, late = delay > (isLower(zone) ? 6 : isFace(zone) ? 24 : 12);
  let inf = care ? (BASEINF[S.key] ?? 0.15) : 0.04, hema = sut ? 0.03 : 0.01, deh = sut ? 0.03 : 0, H = 1;
  for (const k in pat) if (pat[k] && D.RISKS[k]) { const r = D.RISKS[k]; inf *= r.inf || 1; H *= r.heal || 1; hema *= r.hema || 1; deh *= r.heal || 1; why.push(r.why || r.n); }
  const prep = care ? sc.protocol : sc.prep;
  if (prep != null && prep < 60) { inf *= 2; why.push('Asepsie ou lavage incomplets'); } else if (prep != null && prep < 80) inf *= 1.4;
  if (sc.dress != null && sc.dress < 75) { inf *= 1.3; why.push('Pansement peu adapté'); }
  if (late) { inf *= 2; why.push(`Délai de ${delay} h (${isLower(zone) ? '> 6 h au membre inférieur' : isFace(zone) ? '> 24 h' : '> 12 h'})`); }
  if (S.noSuture) { inf *= 0.6; deh = 0; hema = 0.01; }
  if (S.critical.some((c) => c.includes('profond'))) { inf *= 1.8; hema *= 3; why.push('Plan profond non fermé : espace mort'); }
  if (S.critical.some((c) => /oublié/.test(c))) { inf *= 2; why.push('Fil ou agrafe oublié'); }
  if (sut && !S.noSuture) {
    const fin = S.stitches.filter((x) => x.final || (x.type && !x.multi));
    if (sc.stitches != null && sc.stitches < 60) { deh *= 2.5; why.push('Points de qualité moyenne'); }
    if (sc.spacing != null && sc.spacing < 60) { deh *= 1.5; why.push('Points mal espacés'); }
    if (S.data.tension && !fin.some((x) => x.type === 'donati' || x.type === 'horiz')) { deh *= 2; why.push('Plaie sous tension sans point qui tient (Donati)'); }
    if (fin.some((x) => x.kT === 0.95)) { deh *= 1.4; inf *= 1.3; why.push('Points trop serrés (ischémie des berges)'); }
    if (S.data.vessel != null && !S.vesselOK) { hema *= 4; why.push('Vaisseau non lié'); }
  }
  if (S.bleedLv >= 2 && sut && total < 60) hema *= 1.5;
  inf = clamp(inf, 0.01, 0.9); hema = clamp(hema, 0.01, 0.9); deh = clamp(deh, 0, 0.9); if (inf > 0.3) H *= 1.4;
  return { inf, hema, deh, H, why: [...new Set(why)], late };
}
function showPredict(total) {
  const P = predict(total), pc = (x) => Math.round(x * 100), dom = [['inf', P.inf], ['hema', P.hema], ['deh', P.deh]].sort((a, b) => b[1] - a[1])[0], bad = dom[1] >= 0.25 ? dom[0] : null;
  const sut = (S.mode === 'suture' || S.mode === 'learn') && !S.noSuture, ab = parseInt(S.data.abl ? S.data.abl[0] : '10') || 10, abD = Math.round(ab * Math.min(P.H, 1.6));
  let tl;
  if (sut) {
    const n = { 2: 'Berges collées, peu de rougeur. Pansement sec, garder au sec 24–48 h.', 7: 'Cicatrice fermée, croûte fine sur la ligne.', 14: S.choices.close === 'res' ? 'Fil résorbable : rien à retirer, il disparaît.' : `Ablation ${S.choices.close === 'agrafe' ? 'des agrafes' : 'des fils'} vers J${abD}${abD > ab ? ' (plus tard que d\'habitude : cicatrisation lente)' : ''}.`, 30: 'Cicatrice rose et fine. Protéger du soleil 6 à 12 mois.' };
    if (bad === 'inf') Object.assign(n, { 2: 'Douleur qui augmente, rougeur et chaleur autour d\'un point.', 7: 'Pus entre deux points : retirer les points concernés, soins chaque jour, avis médical.', 14: 'Cicatrisation dirigée de la partie ouverte (bourgeons rouges).', 30: 'Cicatrice plus large et plus visible.' });
    if (bad === 'hema') Object.assign(n, { 2: 'Gonflement bleuté et tendu sous la suture.', 7: 'Hématome à évacuer (on retire un ou deux points), risque d\'infection.', 14: 'Plaie qui se referme lentement.', 30: 'Cicatrice épaissie.' });
    if (bad === 'deh') Object.assign(n, { 7: 'Un bout de la cicatrice s\'ouvre : points lâchés ou trop espacés.', 14: 'Strips, ou fermeture différée après avis.', 30: 'Cicatrice élargie.' });
    tl = [2, 7, 14, 30].map((j) => [j, n[j]]);
  } else if (S.mode === 'care' && S.data.removal) {
    tl = S.data.removal.infect != null && bad !== 'inf' ? [[1, 'Le pus s\'écoule par l\'ouverture, la douleur baisse.'], [3, 'Rougeur qui diminue. Soins chaque jour.'], [5, 'Retrait des autres points au bon jour.'], [21, 'Cicatrice un peu plus large à cet endroit.']]
      : bad === 'inf' ? [[1, 'La rougeur persiste.'], [3, 'L\'infection s\'étend : avis médical, antibiotique.'], [7, 'Ouverture de la plaie, soins quotidiens.'], [30, 'Cicatrice élargie.']]
      : [[1, 'Cicatrice fermée, sans fil. Strips si fragile.'], [3, 'Douche normale.'], [14, 'Cicatrice rose.'], [180, 'Cicatrice blanche et souple. Soleil : protéger.']];
  } else {
    const T = Math.round((HEALD[S.key] || 21) * P.H * (S.noSuture ? 1 : 1));
    tl = [[3, 'Détersion : la plaie se nettoie (fibrine, exsudat).'], [Math.round(T / 3), 'Bourgeonnement : tissu rouge vif et granuleux qui comble.'], [T, S.key === 'brul3' ? 'Brûlure profonde : greffe le plus souvent (centre spécialisé).' : 'Épidermisation : la peau recouvre depuis les bords.'], [T * 2, 'Cicatrice fermée, fragile : hydrater, protéger du soleil.']];
    if (bad === 'inf') tl[1] = [Math.round(T / 3), '⚠ Infection possible : rougeur qui s\'étend, odeur, fièvre → avis médical. La cicatrisation est retardée.'];
    if (S.key === 'talon') tl[1][1] += ' Sans décharge du talon, l\'escarre ne guérit pas.';
  }
  const row = (j, t, i) => `<div class="tl"><b>J${j}</b><span>${t}</span></div>`;
  const bar = (n, v) => `<div class="bar"><span>${n} ${pc(v)} %</span><div><i style="width:${pc(v)}%;background:${v < 0.12 ? '#4fc46a' : v < 0.3 ? '#f0b33a' : '#e0573a'}"></i></div></div>`;
  panel('🔮 Évolution prévue', 'Hypothèse pédagogique, d\'après vos gestes, la plaie et la personne. <b>Ce n\'est pas une prédiction médicale.</b>',
    `${tl.map(([j, t], i) => row(j, t, i)).join('')}<div class="lab">Risques estimés</div>${bar('Infection', P.inf)}${sut ? bar('Hématome', P.hema) + bar('Désunion', P.deh) : ''}${P.H > 1.15 ? `<div class="info">Cicatrisation plus lente (×${P.H.toFixed(1)}).</div>` : ''}${P.why.length ? `<div class="lab">Pourquoi</div><ul class="info" style="padding-left:22px;margin:4px 0">${P.why.map((w) => `<li>${w}</li>`).join('')}</ul>` : '<div class="info">Aucun facteur de risque particulier.</div>'}`,
    [['↩ Bilan', () => S.showBilan(), 'main']]);
}

// ---------------------------------------------------------------- BAC À SABLE : on crée son cas
let sbCfg = { sex: 'm', mark: null, zone: 'bras', type: 'nette', size: 4, n: 1, bleed: 0, delay: 2, pat: {} };
// Corps 3D du patient : maillage MakeHuman continu (CC0), vêtements peints, zone dans l'alpha de la couleur.
// Plein écran : 1 doigt = tourner (dans tous les sens, aussi par-dessous), 2 doigts = zoomer, toucher = choisir.
const RIGB = { m: { H: 1.75, eyeY: 1.641, eyeZ: 0.127 }, f: { H: 1.63, eyeY: 1.524, eyeZ: 0.112 } };
const ZN = { 1: 'tete', 2: 'tronc', 3: 'bras', 4: 'main', 5: 'jambe', 6: 'jambe', 7: 'pied', 8: 'perinee', 9: 'genou' };
let SBV = null;
function sbOpen(onDone) {
  let ov = $('bodyov'); if (!ov) { ov = document.createElement('div'); ov.id = 'bodyov'; document.body.appendChild(ov);
    ov.innerHTML = `<div class="bvbar"><b id="bvz">Touchez le corps</b><small>1 doigt : tourner · 2 doigts : zoomer · toucher : choisir</small></div>
      <div id="bvhost"></div><div class="bvbtn row"><button data-a="in">＋</button><button data-a="out">－</button><button data-a="up">⤒ dessus</button><button data-a="down">⤓ dessous</button><button data-a="reset">↺</button></div>
      <div class="row" style="padding:0 12px 14px"><button id="bvok" class="main">✓ Valider</button><button id="bvx">Annuler</button></div>`; }
  ov.classList.remove('hide');
  if (!SBV) {
    const cv = document.createElement('canvas'); cv.className = 'bodycv';
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff1e2, 0x3a3028, 1.5)); const dl = new THREE.DirectionalLight(0xfff4ea, 2.4); dl.position.set(1.5, 3, 2.5); sc.add(dl);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 1.1); rim.position.set(-2, 1.5, -2.5); sc.add(rim); const low = new THREE.DirectionalLight(0xffe0c8, 0.5); low.position.set(0, -3, 1); sc.add(low);
    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff2a1a, depthTest: false })); mark.renderOrder = 5; mark.visible = false; sc.add(mark);
    SBV = { cv, r, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 30), yaw: 0.35, pitch: 0.08, zoom: 1, T: new THREE.Vector3(), body: null, K: null, mark, run: false, sel: null };
    const pts = new Map(); let moved = false, d0 = 0, z0 = 1;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = SBV.zoom; } });
    cv.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1];
      if (pts.size === 1) { if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; if (moved) { SBV.yaw -= dx * 0.011; SBV.pitch = clamp(SBV.pitch + dy * 0.009, -1.45, 1.45); } p[0] = e.clientX; p[1] = e.clientY; }
      else { p[0] = e.clientX; p[1] = e.clientY; const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0 > 10) SBV.zoom = clamp(z0 * d / d0, 0.8, 6); moved = true; } });
    const up = (e) => { const was = pts.size; pts.delete(e.pointerId); if (was === 1 && !moved) sbPick(e); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
    cv.addEventListener('wheel', (e) => { e.preventDefault(); SBV.zoom = clamp(SBV.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.8, 6); }, { passive: false });
  }
  SBV.onDone = onDone; SBV.sel = sbCfg.mark ? { zone: sbCfg.zone, p: sbCfg.mark } : null;
  const host = $('bvhost'); host.appendChild(SBV.cv);
  const w = innerWidth, hh = Math.max(300, innerHeight - 230); SBV.r.setSize(w, hh, false); SBV.cv.style.width = w + 'px'; SBV.cv.style.height = hh + 'px'; SBV.cam.aspect = w / hh; SBV.cam.updateProjectionMatrix();
  ov.querySelectorAll('.bvbtn button').forEach((b) => (b.onclick = () => { const a = b.dataset.a;
    if (a === 'in') SBV.zoom = clamp(SBV.zoom * 1.35, 0.8, 6); if (a === 'out') SBV.zoom = clamp(SBV.zoom / 1.35, 0.8, 6);
    if (a === 'up') SBV.pitch = 1.2; if (a === 'down') SBV.pitch = -1.2; if (a === 'reset') { SBV.yaw = 0.35; SBV.pitch = 0.08; SBV.zoom = 1; SBV.T.set(0, RIGB[SBV.K].H * 0.5, 0); } }));
  $('bvok').onclick = () => { ov.classList.add('hide'); if (SBV.sel) SBV.onDone(SBV.sel.zone, SBV.sel.p); };
  $('bvx').onclick = () => ov.classList.add('hide');
  const K = sbCfg.sex;
  if (SBV.K !== K) { SBV.K = K; if (SBV.body) SBV.sc.remove(SBV.body); SBV.body = null; SBV.T.set(0, RIGB[K].H * 0.5, 0);
    glb('patient_' + K).then((g) => { if (SBV.K !== K) return; let mesh = null; g.traverse((o) => { if (o.isMesh) mesh = o; });
      const ca = mesh.geometry.attributes.color; if (ca && ca.itemSize === 4) { const n = ca.count, rgb = new Float32Array(n * 3), zz = new Uint8Array(n);
        for (let i = 0; i < n; i++) { rgb[i * 3] = ca.getX(i); rgb[i * 3 + 1] = ca.getY(i); rgb[i * 3 + 2] = ca.getZ(i); zz[i] = Math.round(ca.getW(i) * 10); }
        mesh.geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); mesh.userData.zone = zz; }
      mesh.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0 });
      mesh.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('vec3 irradiance = dotNL * directLight.color;', 'float nlw = dot( geometryNormal, directLight.direction ); vec3 irradiance = saturate( ( nlw + 0.4 ) / 1.4 ) * directLight.color * mix( vec3( 1.0, 0.6, 0.5 ), vec3( 1.0 ), saturate( nlw * 2.0 + 0.3 ) );')); }; // peau : lumière « enveloppante » (diffusion sous-surface simulée)
      SBV.body = g; SBV.mesh = mesh; SBV.sc.add(g); sbMark(); }); }
  sbMark(); sbLabel();
  if (!SBV.run) { SBV.run = true; const loop = () => { if (!SBV.cv.isConnected || ov.classList.contains('hide')) { SBV.run = false; return; }
    const H = RIGB[SBV.K].H, d = 2.15 * H / SBV.zoom, cp = Math.cos(SBV.pitch);
    SBV.cam.position.set(SBV.T.x + Math.sin(SBV.yaw) * cp * d, SBV.T.y + Math.sin(SBV.pitch) * d, SBV.T.z + Math.cos(SBV.yaw) * cp * d); SBV.cam.lookAt(SBV.T);
    SBV.r.render(SBV.sc, SBV.cam); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
function sbPick(e) {
  if (!SBV.mesh) return; const cv = SBV.cv, b = cv.getBoundingClientRect(), ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), SBV.cam);
  const h = ray.intersectObject(SBV.mesh)[0]; if (!h) return;
  const p = SBV.body.worldToLocal(h.point.clone()), zz = SBV.mesh.userData.zone, f = h.face, code = zz ? Math.round([zz[f.a], zz[f.b], zz[f.c]].sort()[1]) : 2;
  const r = RIGB[SBV.K]; let zone = ZN[code] || 'tronc'; if (zone === 'tete') zone = p.z > r.eyeZ - 0.05 && p.y < r.eyeY + 0.045 ? 'visage' : 'tete';
  SBV.sel = { zone, p: [p.x, p.y, p.z] }; vib(8); sbMark(); sbLabel();
  if (SBV.zoom > 1.5) SBV.T.lerp(p, 0.5); // zoomé : la vue se recentre vers l'endroit touché
}
function sbLabel() { const el = $('bvz'); if (el) el.innerHTML = SBV && SBV.sel ? '📍 ' + D.SB.zones[SBV.sel.zone][0] : 'Touchez le corps à l\'endroit de la plaie'; }
function sbMark() { if (!SBV) return; const m = SBV.sel && SBV.sel.p; SBV.mark.visible = !!(m && SBV.body); if (m) SBV.mark.position.set(m[0], m[1], m[2]); }
function sbForm(wg) { // v7.8 : menus déroulants, 2 colonnes, volets repliables pour la personne et ses médicaments
  const c = sbCfg, open = sbForm.open || (sbForm.open = {});
  const sel = (id, lab, list, cur) => `<label class="sbf"><span>${lab}</span><select id="${id}">${list.map(([k, l]) => `<option value="${k}" ${String(k) === String(cur) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  const fold = (id, lab, list) => { const n = list.filter(([k]) => c.pat[k]).length; return `<details class="sbd" id="${id}" ${open[id] ? 'open' : ''}><summary>${lab} <b>${n ? n + ' choisi' + (n > 1 ? 's' : '') : 'aucun'}</b></summary><div class="row sbrow">${list.map(([k, l]) => `<button data-k="${k}" class="${c.pat[k] ? 'sel' : ''}">${l}</button>`).join('')}</div></details>`; };
  const pers = Object.entries(D.RISKS).filter(([, r]) => !r.med).map(([k, r]) => [k, r.n]), meds = Object.entries(D.RISKS).filter(([, r]) => r.med).map(([k, r]) => [k, r.n]);
  const chosen = Object.keys(c.pat).filter((k) => c.pat[k] && D.RISKS[k]).map((k) => D.RISKS[k].n);
  wg.innerHTML = `<div class="sb" style="grid-column:1/3">
    <div class="sbcard"><div class="lab">La plaie</div>
      <button id="sbBody" class="sbzone">🧍 <span>Zone : <b>${D.SB.zones[c.zone][0]}</b>${c.mark ? ' 📍' : ''}</span><i>changer ›</i></button>
      <div class="sbgrid">${sel('sbT', 'Type', Object.entries(D.SB.types), c.type)}${sel('sbS', 'Taille', [[2, '2 cm'], [4, '4 cm'], [7, '7 cm']], c.size)}${sel('sbN', 'Nombre de plaies', [[1, '1'], [2, '2'], [3, '3']], c.n)}${sel('sbB', 'Saignement', D.SB.bleeds.map((l, i) => [i, l]), c.bleed)}${sel('sbD', 'Délai', [[2, 'Moins de 6 h'], [8, '6 à 12 h'], [18, '12 à 24 h'], [30, 'Plus de 24 h']], c.delay)}${sel('sbX', 'Patient', [['m', '👨 Homme'], ['f', '👩 Femme']], c.sex)}</div></div>
    <div class="sbcard"><div class="lab">Le terrain</div>${fold('sbP', '👤 La personne', pers)}${fold('sbM', '💊 Ses médicaments', meds)}</div>
    <div class="info" style="font-size:13px">${D.SB.types[c.type]}, ${c.size} cm, ${D.SB.zones[c.zone][0].replace(/^\S+\s/, '').toLowerCase()}${c.n > 1 ? ' · ' + c.n + ' plaies' : ''}${chosen.length ? ' · ' + chosen.join(', ') : ''}</div>
    <button class="main" id="sbGo" style="width:100%;margin-top:6px">▶ Lancer le cas</button>
    <button id="sbPhoto" style="width:100%;margin-top:8px">📷 Ma photo de plaie → 3D</button></div>`;
  const ch = (id, f) => ($(id).onchange = (e) => { f(e.target.value); sbForm(wg); });
  ch('sbT', (k) => (c.type = k)); ch('sbS', (k) => (c.size = +k)); ch('sbN', (k) => (c.n = +k)); ch('sbB', (k) => (c.bleed = +k)); ch('sbD', (k) => (c.delay = +k)); ch('sbX', (k) => { if (c.sex !== k) c.mark = null; c.sex = k; });
  for (const id of ['sbP', 'sbM']) { $(id).ontoggle = () => (open[id] = $(id).open); $(id).querySelectorAll('button').forEach((b) => (b.onclick = () => { c.pat[b.dataset.k] = !c.pat[b.dataset.k]; open[id] = true; sbForm(wg); })); }
  $('sbBody').onclick = () => sbOpen((z, p) => { c.zone = z; c.mark = p; sbForm(wg); });
  $('sbPhoto').onclick = photoStart;
  $('sbGo').onclick = () => startCustom(JSON.parse(JSON.stringify(c)), 0);
}
function sbData(cfg, type) {
  const z = cfg.zone, base = type === 'vaisseau' ? 'vaisseau' : type === 'profonde' ? 'deep' : type === 'beante' ? 'gap' : type === 'courbe' ? 'curve' : z === 'visage' ? 'face' : z === 'tete' ? 'scalp' : 'lin';
  const w = JSON.parse(JSON.stringify(D.SUTURE[base])), lab = D.SB.zones[z][0].replace(/^\S+\s/, '');
  if (z === 'visage') Object.assign(w, { fil: { '6-0': 100, '5-0': 80, '4-0': 30, '3-0': 0 }, needle: { B: 100, A: 60, C: 50, D: 40, E: 20 }, abl: ['5 jours', ['5 jours', '10 jours', '14 jours']], close: { nonres: 100, colle: 80, strip: 70, res: 60, agrafe: 0 } });
  if (z === 'tete') Object.assign(w, { fil: { '3-0': 100, '4-0': 90, '5-0': 40, '6-0': 0 }, abl: ['8 jours', ['3 jours', '8 jours', '21 jours']] }), (w.close.agrafe = 100);
  if (z === 'main') Object.assign(w, { fil: { '5-0': 100, '4-0': 80, '6-0': 60, '3-0': 20 } });
  if (z === 'jambe' || z === 'genou' || z === 'pied') Object.assign(w, { fil: { '4-0': 100, '3-0': 90, '5-0': 50, '6-0': 10 }, abl: ['10 à 14 jours', ['5 jours', '10 à 14 jours', '1 mois']] });
  if (z === 'perinee') Object.assign(w, { fil: { '4-0': 100, '3-0': 80, '5-0': 50, '6-0': 0 }, close: { res: 100, nonres: 30, agrafe: 0, strip: 0, colle: 0 }, abl: ['résorbable : rien à retirer', ['résorbable : rien à retirer', '5 jours', '14 jours']] });
  const pat = Object.keys(cfg.pat).filter((k) => cfg.pat[k]).map((k) => D.RISKS[k].n.charAt(0).toLowerCase() + D.RISKS[k].n.slice(1));
  w.name = D.SB.types[type]; w.zone = lab; w.icon = '🧪'; w._base = base;
  w.desc = `Cas créé : ${D.SB.types[type].toLowerCase()} de ${cfg.size} cm, ${lab.toLowerCase()}. Blessure il y a ${cfg.delay < 6 ? 'moins de 6 h' : cfg.delay < 12 ? '6 à 12 h' : cfg.delay < 24 ? '12 à 24 h' : 'plus de 24 h'}.${pat.length ? ' Personne : ' + pat.join(', ') + '.' : ' Adulte en bonne santé.'}${z === 'perinee' ? ' <b>Peau du périnée seulement</b> : fil résorbable. Déchirure profonde (muscle, sphincter) : sage-femme ou obstétricien, au bloc.' : ''}${z === 'main' ? ' Main : tester tendons et nerfs avant tout ; au moindre doute, chirurgien de la main.' : ''}`;
  return w;
}
async function startCustom(cfg, i) {
  if (i === 0 && cfg.bleed === 3 && !cfg._urg) { cfg._urg = 1; toast('Saignement en jet : d\'abord l\'urgence. On suturera ensuite.', 'mid'); await start('urg', 'hemo', homeLevel); S.sbq = { cfg, i: -1 }; S.pat = cfg.pat; return; }
  const others = ['nette', 'courbe', 'beante'].filter((t) => t !== cfg.type), type = i === 0 ? cfg.type : others[(i - 1) % others.length];
  const data = sbData(cfg, type), key = data._base;
  newGame('suture', key, homeLevel); S.data = data; S.pat = cfg.pat; S.delayH = cfg.delay; S.sbq = { cfg, i };
  S.bleedLv = Math.min(2, cfg.bleed); if (Object.keys(cfg.pat).some((k) => cfg.pat[k] && D.RISKS[k] && D.RISKS[k].bleed)) S.bleedLv = Math.max(1, S.bleedLv); if (cfg.n > 1) S.data.name += ` (${i + 1}/${cfg.n})`;
  $('home').classList.add('hide'); $('loading').classList.remove('hide'); $('loading').textContent = 'Préparation du cas…';
  await loadPad(); $('loading').classList.add('hide'); $('lvlchip').textContent = S.L.name + ' · 🧪';
  setView(new THREE.Vector3(0, 0, 0), S.key === 'face' ? 4.2 : 7.5, 0.55, 0, true);
  const late = cfg.delay > (isLower(data.zone) ? 6 : isFace(data.zone) ? 24 : 12);
  if (!late) return intro();
  const ok = 'Ne pas suturer maintenant : laver, parer, pansement, cicatrisation dirigée ou suture différée, avis médical';
  panel(`${data.icon} ${data.name} · ${data.zone}`, data.desc, `<div class="info">⏰ Plaie ancienne : ${isLower(data.zone) ? 'au membre inférieur, au-delà de 6 h' : isFace(data.zone) ? 'au visage, au-delà de 24 h' : 'au-delà de 12 h'}, le risque d'infection augmente beaucoup si on ferme.</div>`, [['Décider', () => quiz([ok, 'Suturer tout de suite comme d\'habitude', 'Fermer avec de la colle'], ok, 'Que faire de cette plaie ?', 'decision', () => {
    if (S.score.decision === 100) { S.noSuture = true; dressing(Object.keys(D.DRESSINGS), { best: ['interface', 'compresse'], ok: ['hydrogel', 'alginate'], fair: ['ilot'], why: 'Plaie laissée ouverte : pansement non adhérent, refait chaque jour, surveillance.' }, bilan); }
    else { S.critical.push('Plaie ancienne fermée'); S.errors.push('Plaie ancienne fermée : risque d\'infection élevé. On aurait dû la laisser ouverte.'); protocol(D.suturePrep(S.bleedLv > 0, S.level), choose); }
  }), 'main'], ['↩ Accueil', home]]);
}

// ---------------------------------------------------------------- 📷 PHOTO D'UNE PLAIE → PLAIE 3D D'ENTRAÎNEMENT
// La photo reste dans la mémoire du téléphone (jamais envoyée, jamais enregistrée). On trace la plaie au doigt ;
// la photo est plaquée sur la peau 3D en suivant ce tracé (coordonnées le long de la plaie / de part et d'autre).
// Une seule photo ne donne pas la profondeur : la personne la choisit (peau, graisse, muscle).
let PHOTO = null;
function photoStart() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; /* v7.27 : pas d'appareil photo direct (la photo irait dans la galerie) : on choisit une image existante */
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k) + 8; c.height = Math.round(img.height * k) + 8;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 4, 4, c.width - 8, c.height - 8); URL.revokeObjectURL(url);
      PHOTO = { cv: c, pts: [], depth: 'peau', ok: false }; photoTrace(); };
    img.src = url; };
  inp.click();
}
function photoTrace() {
  let ov = $('photoov'); if (!ov) { ov = document.createElement('div'); ov.id = 'photoov'; document.body.appendChild(ov); }
  ov.classList.remove('hide');
  ov.innerHTML = `<div class="phin"><b>📷 Tracez la plaie</b><small>Du doigt, d'un bout à l'autre de la plaie, en suivant la ligne.</small>
    <canvas id="phcv"></canvas>
    <div class="row sbrow" id="phD">${[['peau', 'Peau (derme)'], ['graisse', 'Jusqu\'à la graisse'], ['muscle', 'Jusqu\'au muscle']].map(([k, l]) => `<button data-k="${k}" class="${PHOTO.depth === k ? 'sel' : ''}">${l}</button>`).join('')}</div>
    <label class="libre"><input type="checkbox" id="phOk" ${PHOTO.ok ? 'checked' : ''}> Photo de la banque pédagogique, ou photo de patient avec son accord écrit ET l'autorisation de l'établissement. Pas de visage. L'app ne l'envoie nulle part, mais l'appareil photo peut la garder dans la galerie.</label>
    <div class="row"><button id="phGo" class="main">▶ Créer la plaie 3D</button><button id="phRe">↺ Retracer</button><button id="phX">✕</button></div></div>`;
  const cv = $('phcv'), src = PHOTO.cv, W0 = Math.min(innerWidth - 24, 520), sc = W0 / src.width; cv.width = W0; cv.height = Math.round(src.height * sc);
  const g = cv.getContext('2d'); const draw = () => { g.drawImage(src, 0, 0, cv.width, cv.height); if (PHOTO.pts.length > 1) { g.strokeStyle = '#3cf0a0'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); PHOTO.pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * sc, y * sc)); g.stroke(); } };
  draw(); let on = false;
  const at = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * cv.width / sc, (e.clientY - b.top) / b.height * cv.height / sc]; };
  cv.onpointerdown = (e) => { on = true; PHOTO.pts = [at(e)]; cv.setPointerCapture(e.pointerId); draw(); };
  cv.onpointermove = (e) => { if (!on) return; const p = at(e), l = PHOTO.pts[PHOTO.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 6 / sc) { PHOTO.pts.push(p); draw(); } };
  cv.onpointerup = () => { on = false; };
  ov.querySelectorAll('#phD button').forEach((b) => (b.onclick = () => { PHOTO.depth = b.dataset.k; PHOTO.ok = $('phOk').checked; photoTrace(); }));
  $('phRe').onclick = () => { PHOTO.pts = []; draw(); };
  $('phX').onclick = () => { ov.classList.add('hide'); PHOTO = null; };
  $('phGo').onclick = () => {
    if (!$('phOk').checked) return toast('Cochez l\'accord de la personne (et pas de visage sur la photo).', 'mid');
    let L = 0; for (let i = 1; i < PHOTO.pts.length; i++) L += Math.hypot(PHOTO.pts[i][0] - PHOTO.pts[i - 1][0], PHOTO.pts[i][1] - PHOTO.pts[i - 1][1]);
    if (PHOTO.pts.length < 3 || L < 40) return toast('Tracez la plaie d\'un bout à l\'autre, d\'un seul geste.', 'mid');
    ov.classList.add('hide'); startPhoto();
  };
}
async function startPhoto() {
  const base = { peau: 'lin', graisse: 'gap', muscle: 'deep' }[PHOTO.depth];
  const w = JSON.parse(JSON.stringify(D.SUTURE[base])); w.name = 'Ma plaie (photo)'; w.icon = '📷'; w.zone = 'Photo';
  w.desc = `Plaie reconstruite à partir de votre photo. Profondeur choisie : ${PHOTO.depth === 'peau' ? 'peau' : PHOTO.depth === 'graisse' ? 'jusqu\'à la graisse' : 'jusqu\'au muscle'}. La forme 3D est approchée : entraînez-vous, puis comparez avec l'avis d'un formateur.`;
  newGame('suture', base, homeLevel); S.data = w; S.sbq = null; S.photo = true;
  $('home').classList.add('hide'); $('loading').classList.remove('hide'); $('loading').textContent = 'Plaie 3D à partir de la photo…';
  await loadPad(); photoSkin(); $('loading').classList.add('hide'); $('lvlchip').textContent = S.L.name + ' · 📷';
  setView(new THREE.Vector3(0, 0, 0), 7, 0.55, 0, true); intro();
}
function photoSkin() { // UV (canal 1) : position le long du tracé + écart de part et d'autre, à l'échelle du tracé
  const P = PHOTO.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  let tA = 0, tB = 1; for (let t = 0; t <= 1; t += 0.005) if (gAt(t) > 0.03) { tA = t; break; } for (let t = 1; t >= 0; t -= 0.005) if (gAt(t) > 0.03) { tB = t; break; }
  const Li = cum[cum.length - 1], k = Li / ((tB - tA) * W.L), cw = PHOTO.cv.width, ch = PHOTO.cv.height; // le tracé = la partie ouverte de la plaie 3D
  const imgAt = (a) => { // point et normale du tracé à l'abscisse a (prolongé aux bouts)
    const aa = clamp(a, 0, Li); let i = 1; while (i < cum.length - 1 && cum[i] < aa) i++;
    const u = (aa - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), tx = P[i][0] - P[i - 1][0], ty = P[i][1] - P[i - 1][1], tl = Math.hypot(tx, ty) || 1;
    const x = lerp(P[i - 1][0], P[i][0], u) + (a - aa) * tx / tl, y = lerp(P[i - 1][1], P[i][1], u) + (a - aa) * ty / tl; return [x, y, -ty / tl, tx / tl]; };
  const geo = pad.geometry, pos = S.base.pos, n = pos.length / 3, uv1 = new Float32Array(n * 2), col = geo.attributes.color.array, C0 = S.base.col;
  const a0 = tA * W.L;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], q = nearest(x, z), over = (x - q.qx) * q.tx + (z - q.qz) * q.tz;
    const g = gAt(q.t), inside = y < -0.03 || Math.abs(q.s) < g * 0.9;
    if (inside) { uv1[i * 2] = 1 / cw; uv1[i * 2 + 1] = 1 - 1 / ch; continue; } // pixel blanc du bord : la plaie 3D garde ses couleurs
    const [ix, iy, nx, ny] = imgAt((q.t * W.L - a0 + over) * k), sg = Math.sign(q.s) || 1, off = (Math.abs(q.s) - g * 0.9 + 0.02) * k * sg;
    uv1[i * 2] = clamp(ix + nx * off + 4, 6, cw - 6) / cw; uv1[i * 2 + 1] = 1 - clamp(iy + ny * off + 4, 6, ch - 6) / ch; // hors de la photo : on garde le bord de la photo (peau), jamais le cadre blanc
    const e = clamp((Math.abs(q.s) - g) / 0.18); for (let j = 0; j < 3; j++) C0[i * 3 + j] = col[i * 3 + j] = lerp(col[i * 3 + j], 0.92, e);
  }
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); geo.attributes.color.needsUpdate = true;
  const tex = new THREE.CanvasTexture(PHOTO.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.channel = 1; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
  pad.material.map = tex; pad.material.needsUpdate = true; if (S.dirt) S.dirt.visible = false;
}

// ---------------------------------------------------------------- 🎥 COMMANDES DE VUE (v7.8)
// Brian : « on a du mal à changer de vue et de position autour de la plaie ». Pendant la suture, un doigt guide
// l'aiguille : des boutons toujours visibles tournent, basculent, zooment et proposent 4 vues toutes faites.
(function viewPad() {
  const el = document.createElement('div'); el.id = 'viewpad'; el.className = 'hide';
  el.innerHTML = `<button data-a="tog" aria-label="Commandes de vue">🎥</button><div class="vp"><button data-a="l" aria-label="Tourner à gauche">⟲</button><button data-a="r" aria-label="Tourner à droite">⟳</button><button data-a="u" aria-label="Vue plus haute">⤒</button><button data-a="d" aria-label="Vue plus rasante">⤓</button><button data-a="in" aria-label="Zoom avant">＋</button><button data-a="out" aria-label="Zoom arrière">－</button><button data-a="top">Dessus</button><button data-a="side">Côté</button><button data-a="end">Bout</button><button data-a="std">↺</button></div>`;
  el.classList.add('closed'); document.body.appendChild(el); let open = false, rep = null;
  const act = (a) => {
    if (a === 'l') cam.TH -= 0.35; if (a === 'r') cam.TH += 0.35;
    if (a === 'u') cam.PH = clamp(cam.PH - 0.2, 0.08, 1.35); if (a === 'd') cam.PH = clamp(cam.PH + 0.2, 0.08, 1.35); /* PH = angle depuis la verticale */
    if (a === 'in') cam.R = clamp(cam.R * 0.8, 2.5, 80); if (a === 'out') cam.R = clamp(cam.R * 1.25, 2.5, 80);
    if (a === 'top') cam.PH = 0.08; if (a === 'side') { cam.PH = 1.05; cam.TH = Math.round(cam.TH / PI) * PI; } if (a === 'end') { cam.PH = 0.95; cam.TH = Math.round(cam.TH / PI) * PI + PI / 2; }
    if (a === 'std') { cam.PH = 0.55; cam.TH = 0; cam.T.set(0, 0, 0); cam.R = clamp(cam.R, 6, 12); }
  };
  el.querySelectorAll('button').forEach((b) => { const a = b.dataset.a;
    if (a === 'tog') { b.onclick = () => { open = !open; el.classList.toggle('closed', !open); }; return; }
    const stop = () => { clearInterval(rep); rep = null; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); act(a); if ('lrudinout'.includes(a) && a.length <= 3 && !['top', 'end', 'std'].includes(a)) { stop(); rep = setInterval(() => act(a), 220); } });
    b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop); });
  setInterval(() => { const show = !!S && $('home').classList.contains('hide') && S.step !== 'bilan' && S.step !== 'dress' && !(document.getElementById('bodyov') && !$('bodyov').classList.contains('hide')); el.classList.toggle('hide', !show); }, 400);
})();

// ------------------------------------------------------------------ TAPS
function onTap(x, y) {
  if (!S) return;
  if (S.step === 'choose') { const h = pick(x, y, needleHits); if (h) {
      const u = h.object.userData;
      if (u.pk) { if (u.pk === 'res') S.choices.close = 'res'; else { S.choices.close = 'nonres'; S.choices.fil = u.pk.replace('_', '-'); } if (!S.choices.fil) S.choices.fil = '5-0'; }
      else S.choices.needle = u.needle;
      if (S.renderChoose) S.renderChoose(); highlightNeedle(); } return; }
  if (S.step === 'dress' && S.pickDress) { const h = pick(x, y, Object.values(DRESS_OBJ).filter((o) => o.visible)); if (h) { let o = h.object; while (o && !o.userData.dress) o = o.parent; if (o) S.pickDress(o.userData.dress); } return; }
  if (!pad) return;
  const h = pick(x, y, [pad]); if (!h) return;
  if (S.action === 'inject') return tapInject(h);
  if (S.action === 'test') { S.action = null; toast('✓ Le patient ne sent plus la piqûre : on peut suturer.', 'good'); const c = S.lesson[S.li]; c.done = true; return lessonRender(); }
  if ((S.mode === 'suture' || S.mode === 'learn') && S.step === 'suture') { if (S.kind !== 'fil') tapSuture(h); }
  else if (S.mode === 'care' && S.action) tapCare(h);
}

// ------------------------------------------------------------------ BOUCLE
let last = performance.now();
function loop(now) {
  const rdt = Math.min(0.3, (now - last) / 1000), dt = Math.min(0.05, rdt); last = now; // rdt : temps réel (téléphones lents)
  updateCam(rdt);
  if (S) {
    if (anim) anim(now);
    if (S.dressAnim) S.dressAnim(now);
    updateBlood(dt);
    // patient qui respire / bouge (niveaux avancés)
    const mv = S.L.move; if (mv && pad) { const t = now / 1000; padGroup.position.y = Math.sin(t * 1.5) * 0.015 * mv; padGroup.position.x = mv > 1 ? Math.sin(t * 0.37) * 0.03 + (Math.sin(t * 0.11) > 0.97 ? 0.08 : 0) : 0; }
    if (S.L.timer && S.step !== 'bilan') {
      const sec = (now - S.t0) / 1000;
      if (S.L.timer === 2) { const lim = S.mode === 'suture' ? 300 : 240, left = Math.max(0, lim - sec); $('timer').textContent = '⏱ ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'); if (left <= 0 && !S.timeout) { S.timeout = true; S.errors.push('Temps écoulé.'); bilan(); } }
      else $('timer').textContent = '⏱ ' + Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
    }
  }
  nTick(rdt);
  renderer.render(scene, camera);
  drawOverlay(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__nira = { buildStitch, startLesson, dressing, careDress, N, animN, animH, ptAt, demoSeq, autoStitch, passDown, passUp, pullDown, pullMove, pullUp, throwDown, throwMove, throwUp, cutTap, knotStart, scr: (v) => toScreen(v), scene, camera, cam, get S() { return S; }, start, onTap, setView, pick, padGroup, get pad() { return pad; }, nearest, gAt, W, renderer, home, startCustom, photoSkin, startPhoto, setPhoto: (cv, pts, depth) => (PHOTO = { cv, pts, depth, ok: true }), showPredict, sbForm, get sbCfg() { return sbCfg; } };
boot().catch((e) => { $('loading').textContent = 'Erreur de chargement : ' + e.message; console.error(e); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
