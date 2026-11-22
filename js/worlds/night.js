import * as THREE from "three";
import { makeSigilPoints, makeAmbient, sceneState, placement, reduce } from "../particles.js";

// ---- 夏の夜: 藍色の夜に蛍。蛍が集まってセミの形になる ----
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
const PR = Math.min(window.devicePixelRatio, 1.75);
renderer.setPixelRatio(PR);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
camera.position.z = 6;

let halfH = 1, halfW = 1;
function measure() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  halfW = halfH * camera.aspect;
}
measure();

const rnd = (a, b) => a + Math.random() * (b - a);
// セミの粒。ほどけたときは画面いっぱいに散って、蛍にまぎれる
// 画面が広いと粒がまばらに見えるので、PC では粒を増やして大きくする
const wideScreen = window.innerWidth >= 700;
const sigil = makeSigilPoints(THREE, {
  step: wideScreen ? 0.0082 : 0.0105, size: wideScreen ? 5.6 : 4.2, colA: "#f2f7b4", colB: "#ffcf7d",
  home: () => [rnd(-1.15, 1.15) * halfW, rnd(-1.1, 1.1) * halfH, rnd(-3, 1.5)],
});
const fireflies = makeAmbient(THREE, {
  count: 110, size: 10, colA: "#e2f27a", colB: "#b9ef8c", blink: true, wander: 0.42,
  place: () => [rnd(-1.3, 1.3) * halfW, rnd(-1.2, 1.2) * halfH, rnd(-4, 2)],
});
const stars = makeAmbient(THREE, {
  count: 520, size: 1.7, colA: "#cbd5ff", colB: "#ffffff", blink: false, wander: 0,
  place: () => [rnd(-1.3, 1.3) * halfW * 5, rnd(-0.2, 1.4) * halfH * 5, rnd(-28, -22)],
});
stars.uniforms.uAlpha.value = 0.7;
[stars, fireflies, sigil].forEach((o) => { o.uniforms.uPR.value = PR; scene.add(o.points); });

const pivot = new THREE.Object3D();
pivot.rotation.order = "YXZ";

const mouse = { x: 0, y: 0, wx: 99, wy: 99 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
  mouse.wx = mouse.x * halfW;
  mouse.wy = mouse.y * halfH;
});
window.addEventListener("pointerleave", () => { mouse.wx = 99; mouse.wy = 99; });

let lastW = window.innerWidth;
window.addEventListener("resize", () => {
  // スマホのアドレスバーの出し入れでは作り直さない
  if (window.innerWidth === lastW) return;
  lastW = window.innerWidth;
  measure();
});

const clock = new THREE.Clock();
let form = reduce ? 1 : 0;
const cur = placement(halfW, halfH);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = reduce ? 4 : clock.elapsedTime;
  const state = sceneState();
  const target = state === "read" ? 0 : 1;
  form += (target - form) * (1 - Math.exp(-dt * (target > form ? 0.75 : 1.4)));
  if (reduce) form = target;

  const pl = placement(halfW, halfH);
  const k = 1 - Math.exp(-dt * 3);
  cur.x += (pl.x - cur.x) * k; cur.y += (pl.y - cur.y) * k; cur.s += (pl.s - cur.s) * k;
  pivot.position.set(cur.x, cur.y + Math.sin(t * 0.6) * 0.03, 0);
  pivot.scale.setScalar(cur.s);
  pivot.rotation.y = Math.sin(t * 0.28) * 0.32 + mouse.x * 0.22;
  pivot.rotation.x = mouse.y * -0.1;
  pivot.updateMatrixWorld();

  sigil.uniforms.uSigil.value.copy(pivot.matrixWorld);
  sigil.uniforms.uForm.value = form;
  sigil.uniforms.uTime.value = t;
  sigil.uniforms.uMouse.value.set(mouse.wx, mouse.wy);
  sigil.uniforms.uAlpha.value = 0.65 + form * 0.35;
  const scroll = window.scrollY / window.innerHeight;
  [fireflies, stars].forEach((o) => { o.uniforms.uTime.value = t; o.uniforms.uScroll.value = scroll * 0.12; });

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
