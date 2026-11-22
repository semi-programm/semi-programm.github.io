import * as THREE from "three";
import { makeSigilPoints, makeAmbient, sceneState, placement, reduce } from "../particles.js";
import { buildScenery, makeFireworks } from "./night-scenery.js";

// ---- ひぐらし（夏の夜）: 縁側から眺める、夕暮れから夜の田舎。光の粒が集まってセミ（ヒグラシ）の形になる ----
const canvas = document.getElementById("scene");

// 景色を置く。空・花火・景色は粒より奥、縁側（軒・風鈴・柱・床）は粒より手前
const scenery = buildScenery();
canvas.before(scenery.sky, scenery.fireworks, scenery.far);
canvas.after(scenery.near);
const fireworks = reduce ? null : makeFireworks(scenery.fireworks);

// 読み進めるにつれて、夕方の散歩のように景色が移り、日が暮れる。
//   景色: 0 縁側と田んぼ（表紙〜強み） / 1 線路と無人駅（実績の前半） / 2 海辺と灯台（実績の後半）
//         3 駄菓子屋と自販機（大事にしていること・技能） / 4 夏祭り（来歴〜）。「便り」で花火が上がる
//   時間: 開いたとき夕焼け（--t = 0）、「便り」に入るところで夜（1）
const root = document.documentElement;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
let bounds = [];
function measureBounds() {
  const y = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : Infinity);
  const works = document.getElementById("works");
  const entries = works ? works.querySelectorAll("article.entry") : [];
  bounds = [
    y(works),
    y(entries[Math.floor(entries.length / 2)]),
    y(document.getElementById("principles")),
    y(document.getElementById("history")),
    y(document.getElementById("contact")),
  ];
}
// 景色の区切りごとの時間。実績の頭はまだ夕焼け、半ばで青い黄昏、大事にしていることで宵、来歴で夜、便りで夜になりきる
const TIMES = [0, 0.14, 0.36, 0.56, 0.78, 1];
let dusk = 0, sceneW = [1, 0, 0, 0, 0], fireW = 0;
function timeOfDay() {
  const vh = window.innerHeight;
  // 読んでいる行（画面の上から 6 割）の位置で、時間と景色を決める
  const line = window.scrollY + vh * 0.6, F = vh * 0.55;
  const marks = [vh * 0.6, ...bounds];
  let i = 0;
  while (i < marks.length - 1 && line >= marks[i + 1]) i++;
  const u = i >= marks.length - 1 ? 1 : (line - marks[i]) / Math.max(1, marks[i + 1] - marks[i]);
  dusk = i >= marks.length - 1 ? 1 : Math.min(1, TIMES[i] + (TIMES[i + 1] - TIMES[i]) * Math.min(1, Math.max(0, u)));
  root.style.setProperty("--t", dusk.toFixed(3));
  // 境目をまたぐあいだ、2 つの景色を重ねて入れ替える
  const ramp = (b) => smooth((line - (b - F / 2)) / F);
  sceneW = scenery.scenes.map((el, i) => {
    const w = (i === 0 ? 1 : ramp(bounds[i - 1])) * (i < 4 ? 1 - ramp(bounds[i]) : 1);
    el.style.opacity = w.toFixed(3);
    el.style.visibility = w > 0.001 ? "visible" : "hidden";
    return w;
  });
  fireW = ramp(bounds[4]);
  scenery.near.style.opacity = sceneW[0].toFixed(3);
  scenery.near.style.visibility = sceneW[0] > 0.001 ? "visible" : "hidden";
}
measureBounds();
timeOfDay();
if (document.fonts) document.fonts.ready.then(() => { measureBounds(); timeOfDay(); });

// 風鈴: スクロールの勢いで揺れ、ばねのように戻る
const furin = scenery.near.querySelector(".hg-furin-swing");
const bell = { angle: 0, vel: 0, lastY: window.scrollY };
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
// 夕焼けのうちは星は見えず、蛍も少ない。宵から夜にかけて増える
const lightUp = () => {
  stars.uniforms.uAlpha.value = 0.03 + 0.67 * smooth((dusk - 0.45) / 0.5);
  fireflies.uniforms.uAlpha.value = 0.2 + 0.8 * smooth(dusk / 0.7);
};
lightUp();
window.addEventListener("scroll", () => { timeOfDay(); lightUp(); }, { passive: true });

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
  measureBounds();
  timeOfDay();
  lightUp();
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

  if (!reduce) {
    const dy = window.scrollY - bell.lastY;
    bell.lastY = window.scrollY;
    bell.vel += Math.max(-1.5, Math.min(1.5, dy * 0.015));
    bell.vel -= bell.angle * 0.035;
    bell.vel *= 0.94;
    bell.angle = Math.max(-14, Math.min(14, bell.angle + bell.vel));
    furin.style.setProperty("--kick", bell.angle.toFixed(2) + "deg");
  }
  if (fireworks) fireworks.step(dt, fireW);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
