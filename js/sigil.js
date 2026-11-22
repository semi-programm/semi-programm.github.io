// セミの紋章。ロゴの骨組みを金の線で立体にし、点と線で描き上げ、羽の回路に光を流す
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import DATA from "./sigil-data.js";

const canvas = document.getElementById("sigil");
const plate = document.querySelector(".plate");
// スマホの「動きを減らす」設定に関係なく、常に全部動かす（サイトの方針として決めたこと）。
// 設定に従わせるなら、ここを window.matchMedia("(prefers-reduced-motion: reduce)").matches に戻す
const reduce = false;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
// 紋章が描く範囲いっぱいに大きく見えるよう寄せる（回したり傾けたりしてもはみ出さない近さ）
camera.position.set(0, 0, 4.75);
const key = new THREE.DirectionalLight(0xfff0d0, 1.4);
key.position.set(2.5, 3, 4);
scene.add(key);

// 本物のセミは羽を屋根の形にたたむ。中心から離れるほど奥へ下げる
const FOLD = 0.42;
const foldZ = (x) => -FOLD * Math.abs(x);

const uniforms = {
  uTime: { value: 0 },
  uFlow: { value: 0 },
  uHeart: { value: new THREE.Vector2(0, 0.12) },
  uGroupInv: { value: new THREE.Matrix4() },
};

// 金。中心（胸）から外へ、回路に沿って光の輪が広がっていく
function goldMaterial(roughness) {
  const m = new THREE.MeshStandardMaterial({ color: 0xc49a45, metalness: 1, roughness, envMapIntensity: 1.15 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform mat4 uGroupInv;\nvarying vec3 vSig;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSig = (uGroupInv * modelMatrix * vec4(position, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uFlow;\nuniform vec2 uHeart;\nvarying vec3 vSig;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float d = length(vSig.xy - uHeart);
        float w = fract(d * 1.25 - uTime * 0.22);
        float band = exp(-pow((w - 0.5) * 10.0, 2.0));
        float core = exp(-pow((w - 0.5) * 34.0, 2.0));
        totalEmissiveRadiance += uFlow * (band * 0.45 + core * 0.95) * vec3(1.0, 0.62, 0.24);`
      );
  };
  return m;
}

const gold = goldMaterial(0.3);
const goldMatte = goldMaterial(0.5);
const group = new THREE.Group();
group.rotation.order = "YXZ";
scene.add(group);

// 線
const strokes = [];
const sphere = new THREE.SphereGeometry(1, 20, 14);
DATA.paths.forEach((o) => {
  const pts = o.p.map(([x, y]) => new THREE.Vector3(x, y, foldZ(x)));
  if (pts.length < 2) return;
  const curve = pts.length === 2 ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const len = curve.getLength();
  const r = o.w * 0.9;
  const geo = new THREE.TubeGeometry(curve, Math.max(6, Math.ceil(len * 70)), r, 10, false);
  const mesh = new THREE.Mesh(geo, gold);
  const caps = [pts[0], pts[pts.length - 1]].map((p) => {
    const c = new THREE.Mesh(sphere, gold);
    c.position.copy(p);
    c.scale.setScalar(r);
    group.add(c);
    return c;
  });
  group.add(mesh);
  strokes.push({ mesh, caps, total: geo.index.count, len });
});

// 羽の点
const dots = DATA.dots.map(([x, y, r]) => {
  const m = new THREE.Mesh(sphere, gold);
  m.position.set(x, y, foldZ(x) + 0.004);
  m.userData.r = r * 1.05;
  group.add(m);
  return m;
});

// 胴体の塗りつぶし
const solids = DATA.solids.map((poly) => {
  const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 4 });
  geo.translate(0, 0, -0.015);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + foldZ(pos.getX(i)));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, goldMatte);
  group.add(m);
  return m;
});

// 描き上げの順番: 点 → 線（上から） → 胴体 → 光
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const T_DOTS = 0.15, T_LINES = 0.9, T_SOLIDS = 3.3, T_FLOW = 3.9;

function intro(t) {
  dots.forEach((m, i) => {
    const k = clamp01((t - T_DOTS - i * 0.07) / 0.5);
    m.scale.setScalar(m.userData.r * Math.max(0.0001, easeBack(k)));
  });
  strokes.forEach((s, i) => {
    const k = easeOut(clamp01((t - T_LINES - i * 0.04) / 0.85));
    // TubeGeometry の三角形は線の頭から順に並んでいるので、描く範囲を伸ばすと線が引かれていくように見える
    const n = Math.floor((s.total * k) / 6) * 6;
    s.mesh.geometry.setDrawRange(0, n);
    s.caps[0].visible = k > 0;
    s.caps[1].visible = k >= 1;
  });
  solids.forEach((m, i) => {
    const k = easeOut(clamp01((t - T_SOLIDS - i * 0.1) / 0.6));
    m.scale.set(1, 1, Math.max(0.0001, k));
    m.visible = k > 0;
  });
  return clamp01((t - T_FLOW) / 1.2);
}

// 章ごとの姿勢と光の強さ（main.js が body[data-chapter] を書き換える）
const STATES = [
  { yaw: 0.0, pitch: 0.0, flow: 0.55 },
  { yaw: 0.42, pitch: -0.1, flow: 1.0 },
  { yaw: -0.62, pitch: 0.16, flow: 0.9 },
  { yaw: 1.2, pitch: 0.05, flow: 0.7 },
  { yaw: 0.15, pitch: -0.55, flow: 1.0 },
  { yaw: Math.PI - 0.25, pitch: 0.1, flow: 0.6 },
  { yaw: -0.25, pitch: 0.08, flow: 0.65 },
  { yaw: 0.0, pitch: 0.0, flow: 1.25 },
];

const cur = { yaw: 0, pitch: 0, flow: 0 };
const drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0, vyaw: 0 };
const mouse = { x: 0, y: 0 };

canvas.addEventListener("pointerdown", (e) => {
  if (!plate.classList.contains("can-drag")) return;
  drag.on = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag.on) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.yaw += dx * 0.012;
  drag.pitch = Math.max(-0.8, Math.min(0.8, drag.pitch + dy * 0.008));
  drag.vyaw = dx * 0.012;
});
const endDrag = () => { drag.on = false; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

const clock = new THREE.Clock();
let introT = reduce ? 99 : 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  introT += dt;
  const introFlow = intro(introT);

  const st = STATES[Number(document.body.dataset.chapter) || 0] || STATES[0];
  const k = 1 - Math.exp(-dt * 1.8);
  cur.yaw += (st.yaw - cur.yaw) * k;
  cur.pitch += (st.pitch - cur.pitch) * k;
  cur.flow += (st.flow * introFlow - cur.flow) * k;

  if (!drag.on) {
    // 手を離したら、少し惰性で回ってから元の姿勢に戻る
    drag.yaw += drag.vyaw;
    drag.vyaw *= Math.exp(-dt * 3);
    drag.yaw *= Math.exp(-dt * 0.9);
    drag.pitch *= Math.exp(-dt * 1.5);
  }
  const sway = reduce ? 0 : Math.sin(t * 0.45) * 0.16;
  const bob = reduce ? 0 : Math.sin(t * 0.8) * 0.03;
  group.rotation.y = cur.yaw + drag.yaw + sway + mouse.x * 0.12;
  group.rotation.x = cur.pitch + drag.pitch + mouse.y * 0.08;
  group.position.y = bob;
  group.updateMatrixWorld();
  uniforms.uGroupInv.value.copy(group.matrixWorld).invert();
  uniforms.uTime.value = reduce ? 0.8 : t;
  uniforms.uFlow.value = cur.flow;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.documentElement.classList.add("sigil-ready");

// ページをめくると、紋章も勢いをつけて少し回り、また元の姿勢に戻る（grimoire.js が pageturn を出す）
window.addEventListener("pageturn", (e) => {
  if (reduce) return;
  drag.vyaw += (e.detail && e.detail.dir < 0 ? -1 : 1) * 0.09;
});
