import * as THREE from "three";
import { makeSigilPoints, makeAmbient, sceneState, placement, reduce } from "../particles.js";

// ---- 光と霧の森: 霧と木立と光の筋。光のセミが霧の奥から現れる ----
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
const PR = Math.min(window.devicePixelRatio, 1.5);
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
  bgU.uAspect.value = camera.aspect;
}

// 背景: 霧・奥行きのある木立・斜めの光の筋を、一枚のシェーダーで描く
const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;
const bgU = { uTime: { value: 0 }, uScroll: { value: 0 }, uAspect: { value: 1 }, uHole: { value: new THREE.Vector3(0.7, 0.5, 0.0) } };
const bg = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: bgU, depthWrite: false, depthTest: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime, uScroll, uAspect;
      uniform vec3 uHole;
      varying vec2 vUv;
      ${NOISE}
      // 幹の列。id ごとに太さ・傾き・有無を変える
      float trunks(vec2 p, float density, float width, float seed) {
        float x = p.x * density + seed;
        float id = floor(x);
        float r = hash(vec2(id, seed));
        if (r < 0.38) return 0.0;
        float w = width * (0.55 + r * 0.9);
        float c = (hash(vec2(id, seed + 1.0)) - 0.5) * 0.5;
        float edge = (noise(vec2(id * 3.1, p.y * 7.0)) - 0.5) * w * 0.35;
        float lean = (r - 0.5) * 0.12 * p.y;
        float d = abs(fract(x) - 0.5 - c + lean + edge);
        return smoothstep(w, w * 0.7, d);
      }
      void main() {
        vec2 uv = vUv;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        vec3 TOP = vec3(0.905, 0.928, 0.900), BOT = vec3(0.70, 0.765, 0.725);
        vec3 FOG = vec3(0.89, 0.915, 0.885), TRUNK = vec3(0.30, 0.37, 0.33), LIGHT = vec3(1.0, 0.965, 0.86);
        vec3 col = mix(BOT, TOP, smoothstep(0.0, 1.0, uv.y));
        float s = uScroll;
        // 奥の木ほど霧に溶ける。スクロールで手前ほど大きく流れる
        col = mix(col, mix(TRUNK, FOG, 0.80), trunks(p + vec2(s * 0.04, 0.0), 4.4, 0.06, 7.1) * 0.6);
        col = mix(col, mix(TRUNK, FOG, 0.64), trunks(p + vec2(s * 0.10, 0.0), 2.6, 0.08, 3.3) * 0.6);
        col = mix(col, mix(TRUNK, FOG, 0.46), trunks(p + vec2(s * 0.22, 0.0), 1.4, 0.10, 1.7) * 0.55);
        // 霧
        float f = fbm(p * vec2(1.4, 2.8) + vec2(uTime * 0.012, s * 0.25));
        float f2 = fbm(p * vec2(2.6, 4.5) - vec2(uTime * 0.02, 0.0));
        col = mix(col, FOG, smoothstep(0.3, 0.85, f) * 0.6 + (1.0 - uv.y) * 0.18);
        // 左上から差す光の筋
        vec2 q = vec2(uv.x * uAspect + uv.y * 0.62, uv.y);
        float rays = pow(max(0.0, sin(q.x * 7.5 + noise(vec2(q.x * 2.5, uTime * 0.04)) * 2.4)), 9.0);
        rays *= smoothstep(0.05, 0.95, uv.y) * (0.45 + 0.55 * f2);
        col += LIGHT * rays * 0.2;
        col += LIGHT * pow(max(0.0, 1.0 - length(vec2((uv.x - 0.15) * uAspect, uv.y - 1.1))), 2.2) * 0.28;
        // セミのいるあたりだけ少し翳らせて、光が浮くようにする
        float hd = length(vec2((uv.x - uHole.x) * uAspect, uv.y - uHole.y));
        col *= 1.0 - uHole.z * 0.22 * smoothstep(0.55, 0.0, hd);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
bg.frustumCulled = false;
bg.renderOrder = -1;
scene.add(bg);
measure();

const rnd = (a, b) => a + Math.random() * (b - a);
const wideScreen = window.innerWidth >= 700;
// セミの粒。ほどけたときは霧の奥へ下がる
const sigil = makeSigilPoints(THREE, {
  step: wideScreen ? 0.0082 : 0.0105, size: wideScreen ? 6.2 : 4.8, colA: "#fffaf0", colB: "#ffdf9e", fog: 0.11,
  home: () => [rnd(-1.7, 1.7) * halfW, rnd(-1.4, 1.4) * halfH, rnd(-16, -7)],
});
const motes = makeAmbient(THREE, {
  count: 260, size: 3.2, colA: "#fff8e6", colB: "#ffffff", blink: false, wander: 0.3, rise: 0.035, fog: 0.08,
  place: () => [rnd(-1.4, 1.4) * halfW, rnd(-1.2, 1.2) * halfH, rnd(-10, 2.5)],
});
[motes, sigil].forEach((o) => { o.uniforms.uPR.value = PR; scene.add(o.points); });

// 手前に流れる薄い霧。粒の上にかかって、霧の中にいるように見せる
const veilU = { uTime: { value: 0 }, uAspect: bgU.uAspect };
const veil = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: veilU, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime, uAspect;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vec2(vUv.x * uAspect, vUv.y);
        float f = fbm(p * vec2(1.1, 2.2) + vec2(-uTime * 0.018, uTime * 0.004));
        gl_FragColor = vec4(vec3(0.92, 0.94, 0.915), smoothstep(0.45, 0.9, f) * 0.42);
      }
    `,
  })
);
veil.frustumCulled = false;
veil.renderOrder = 10;
scene.add(veil);

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
  if (window.innerWidth === lastW) return;
  lastW = window.innerWidth;
  measure();
});

const clock = new THREE.Clock();
let form = reduce ? 1 : 0;
let depth = reduce ? 0 : -7;
const cur = placement(halfW, halfH);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = reduce ? 4 : clock.elapsedTime;
  const state = sceneState();
  const target = state === "read" ? 0 : 1;
  form += (target - form) * (1 - Math.exp(-dt * (target > form ? 0.6 : 1.2)));
  // 現れるときは霧の奥から手前へ、ほどけるときは奥へ
  depth += ((target ? 0 : -5) - depth) * (1 - Math.exp(-dt * 0.7));
  if (reduce) { form = target; depth = target ? 0 : -5; }

  const pl = placement(halfW, halfH);
  const k = 1 - Math.exp(-dt * 3);
  cur.x += (pl.x - cur.x) * k; cur.y += (pl.y - cur.y) * k; cur.s += (pl.s - cur.s) * k;
  pivot.position.set(cur.x, cur.y + Math.sin(t * 0.5) * 0.04, depth);
  pivot.scale.setScalar(cur.s);
  pivot.rotation.y = Math.sin(t * 0.22) * 0.3 + mouse.x * 0.2;
  pivot.rotation.x = mouse.y * -0.1;
  pivot.updateMatrixWorld();

  sigil.uniforms.uSigil.value.copy(pivot.matrixWorld);
  sigil.uniforms.uForm.value = form;
  sigil.uniforms.uTime.value = t;
  sigil.uniforms.uMouse.value.set(mouse.wx, mouse.wy);
  // 背景の翳りをセミの位置に合わせる
  const sp = new THREE.Vector3(cur.x, cur.y, depth).project(camera);
  bgU.uHole.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, form);
  const scroll = window.scrollY / window.innerHeight;
  bgU.uTime.value = t;
  bgU.uScroll.value = scroll;
  veilU.uTime.value = t;
  motes.uniforms.uTime.value = t;
  motes.uniforms.uScroll.value = scroll * 0.1;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
