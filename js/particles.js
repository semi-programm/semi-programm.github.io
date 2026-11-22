// 光の粒でできたセミ（ひぐらしで使う）。ロゴの骨組みに沿って粒を置き、集めたりほどいたりする
import DATA from "./sigil-data.js";

// スマホの「動きを減らす」設定に関係なく、常に全部動かす（サイトの方針として決めたこと）。
// 設定に従わせるなら、ここを window.matchMedia("(prefers-reduced-motion: reduce)").matches に戻す
export const reduce = false;

function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function sampleSigil(step) {
  const pts = [];
  for (const o of DATA.paths) {
    for (let i = 0; i < o.p.length - 1; i++) {
      const [x0, y0] = o.p[i], [x1, y1] = o.p[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
      const n = Math.max(1, Math.round(len / step));
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      for (let k = 0; k < n; k++) {
        const t = (k + Math.random()) / n;
        const j = (Math.random() - 0.5) * o.w * 1.7; // 線の太さの中にばらす
        pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
      }
    }
  }
  for (const [x, y, r] of DATA.dots) {
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
  }
  for (const poly of DATA.solids) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const n = Math.round((((x1 - x0) * (y1 - y0)) / (step * step)) * 0.5);
    for (let k = 0; k < n; k++) {
      const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
      if (inside(poly, x, y)) pts.push([x, y]);
    }
  }
  return pts;
}

// 丸く柔らかい光。加算で重ねる
const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying float vA;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c) * 4.0;
    float a = exp(-r2 * 5.0) * 0.55 + exp(-r2 * 38.0);
    gl_FragColor = vec4(mix(uColA, uColB, vSeed), a * vA);
  }
`;

// uForm が 1 でセミの形、0 で home（あたりに散った場所）へほどける
export function makeSigilPoints(THREE, opts) {
  const pts = sampleSigil(opts.step);
  const n = pts.length;
  const target = new Float32Array(n * 3), home = new Float32Array(n * 3), seed = new Float32Array(n), size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    // 羽は本物のセミのように屋根の形にたたむ
    target.set([x, y, -0.42 * Math.abs(x) + (Math.random() - 0.5) * 0.03], i * 3);
    home.set(opts.home(), i * 3);
    seed[i] = Math.random();
    size[i] = opts.size * (0.5 + Math.random() * Math.random() * 1.6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(target, 3));
  g.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const uniforms = {
    uTime: { value: 0 }, uForm: { value: 0 }, uPR: { value: 1 }, uAlpha: { value: 1 },
    uMouse: { value: new THREE.Vector2(99, 99) }, uSigil: { value: new THREE.Matrix4() },
    uColA: { value: new THREE.Color(opts.colA) }, uColB: { value: new THREE.Color(opts.colB) },
    uFog: { value: opts.fog || 0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uForm, uPR, uAlpha, uFog;
      uniform vec2 uMouse;
      uniform mat4 uSigil;
      attribute vec3 aHome;
      attribute float aSeed, aSize;
      varying float vA;
      varying float vSeed;
      void main() {
        // 粒ごとに少しずつ遅れて集まる
        float f = smoothstep(0.0, 1.0, clamp(uForm * 1.7 - aSeed * 0.7, 0.0, 1.0));
        float t = uTime * 0.22 + aSeed * 60.0;
        vec3 drift = vec3(sin(t * 1.3) + sin(t * 0.7 + 2.0), cos(t * 1.1) + sin(t * 0.5 + 1.0), sin(t * 0.9)) * 0.22;
        vec3 tw = (uSigil * vec4(position, 1.0)).xyz;
        vec3 p = mix(aHome + drift, tw, f);
        p += vec3(sin(t * 7.0), cos(t * 6.3), 0.0) * 0.008;
        // マウスの周りの粒は逃げる
        vec2 dm = p.xy - uMouse;
        p.xy += normalize(dm + 1e-5) * smoothstep(0.55, 0.0, length(dm)) * 0.32 * f;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (6.0 / -mv.z);
        float tw2 = 0.6 + 0.4 * sin(uTime * (1.2 + aSeed * 2.4) + aSeed * 40.0);
        float fog = exp(-max(0.0, -mv.z - 6.0) * uFog);
        vA = uAlpha * tw2 * mix(0.28, 1.0, f) * fog;
        vSeed = aSeed;
      }
    `,
    fragmentShader: GLOW_FRAG,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return { points, uniforms };
}

// まわりを漂う粒（蛍・星・光の塵）
export function makeAmbient(THREE, opts) {
  const n = opts.count;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n), size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set(opts.place(), i * 3);
    seed[i] = Math.random();
    size[i] = opts.size * (0.4 + Math.random() * 1.2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const uniforms = {
    uTime: { value: 0 }, uPR: { value: 1 }, uAlpha: { value: 1 }, uScroll: { value: 0 },
    uColA: { value: new THREE.Color(opts.colA) }, uColB: { value: new THREE.Color(opts.colB) },
    uBlink: { value: opts.blink ? 1 : 0 }, uWander: { value: opts.wander }, uRise: { value: opts.rise || 0 }, uFog: { value: opts.fog || 0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uPR, uAlpha, uScroll, uBlink, uWander, uRise, uFog;
      attribute float aSeed, aSize;
      varying float vA;
      varying float vSeed;
      void main() {
        float t = uTime * 0.18 + aSeed * 80.0;
        vec3 p = position + vec3(sin(t * 1.1) + sin(t * 0.43 + 3.0), cos(t * 0.9) + sin(t * 0.31 + 1.0), sin(t * 0.7)) * uWander;
        p.y += mod(uTime * uRise * (0.5 + aSeed) + aSeed * 12.0, 12.0) - 6.0;
        p.y += uScroll * (0.6 + aSeed * 1.4);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (6.0 / -mv.z);
        // 蛍は消えたり灯ったりする。星や塵はゆっくり瞬く
        float s = sin(uTime * (0.5 + aSeed * 0.9) + aSeed * 25.0);
        float blink = mix(0.55 + 0.45 * s, pow(max(0.0, s), 6.0), uBlink);
        vA = uAlpha * blink * exp(-max(0.0, -mv.z - 6.0) * uFog);
        vSeed = aSeed;
      }
    `,
    fragmentShader: GLOW_FRAG,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return { points, uniforms };
}

// 表紙と「便り」ではセミの形に集まり、その間はほどける
export function sceneState() {
  const vh = window.innerHeight;
  const hero = document.querySelector(".title-page").getBoundingClientRect();
  const contact = document.getElementById("contact").getBoundingClientRect();
  if (contact.top < vh * 0.6) return "contact";
  if (hero.bottom > vh * 0.42) return "hero";
  return "read";
}

// セミの置き場所（PC は右、スマホは上）
export function placement(halfW, halfH) {
  const w = window.innerWidth;
  if (w >= 1100) return { x: halfW * 0.46, y: -halfH * 0.04, s: halfH * 0.74 };
  if (w >= 700) return { x: halfW * 0.5, y: halfH * 0.05, s: halfH * 0.56 };
  return { x: 0, y: halfH * 0.48, s: halfH * 0.34 };
}
