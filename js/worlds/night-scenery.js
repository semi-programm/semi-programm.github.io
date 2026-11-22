// ひぐらし（夏の夜）の景色。夕方の散歩のように、読み進めると景色が移り、日が暮れていく
//
// 景色（night.js が章に合わせて重ねながら入れ替える）
//   0 縁側から、田んぼと鳥居   1 線路と無人駅   2 海辺と灯台   3 駄菓子屋と自販機   4 神社の夏祭り（最後に花火）
// 重なり順: 空 → 花火 → 景色 → 本文の後ろの覆い → 蛍とセミの粒（#scene） → 縁側（軒・風鈴・柱・床。景色 0 だけ）
//
// 色はすべて CSS の変数で、html の --t（0 = 夕焼け、1 = 夜）に合わせて移る（night.css）

const SVG = "http://www.w3.org/2000/svg";

// いつ開いても同じ形になる乱数（杉の高さ、すすきの向きなど）
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svg(viewBox, cls, inner, aspect) {
  const el = document.createElementNS(SVG, "svg");
  el.setAttribute("viewBox", viewBox);
  el.setAttribute("preserveAspectRatio", aspect);
  el.setAttribute("class", cls);
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = inner;
  return el;
}

// 横長の景色（1〜4）は 1600×440。見どころは右に置く（スマホでは右側だけが見える）
const wide = (cls, inner) => svg("0 0 1600 440", `hg-wide ${cls}`, inner, "xMaxYMax slice");

// ---------- 共通の部品 ----------

// 杉: 細い三角を、段ごとに少し外へ張り出させる
function cedar(x, base, h, w, cls) {
  const top = base - h;
  let d = `M${x} ${top}`;
  const tiers = 6;
  for (let k = 1; k <= tiers; k++) {
    const y = top + (h * k) / tiers;
    d += ` L${x - (w / 2) * (k / tiers) - 2} ${y} L${x - (w / 2) * (k / tiers) * 0.72} ${y - 2}`;
  }
  d += ` L${x + (w / 2) * 0.72} ${base - 2}`;
  for (let k = tiers; k >= 1; k--) {
    const y = top + (h * k) / tiers;
    d += ` L${x + (w / 2) * (k / tiers) + 2} ${y} L${x + (w / 2) * (k / tiers) * 0.72} ${y - (h / tiers) * 0.6}`;
  }
  return `<path class="${cls}" d="${d} Z"/>`;
}

// 電柱と、たるんだ電線（xs の電柱どうしをつなぐ）
function polesAndWires(xs, base, top, w = 6, arm = 54) {
  let s = "";
  xs.forEach((x) => {
    s += `<rect class="pole" x="${x - w / 2}" y="${top}" width="${w}" height="${base - top}"/>`;
    s += `<rect class="pole" x="${x - arm / 2}" y="${top + 10}" width="${arm}" height="3"/>`;
  });
  for (let i = 0; i < xs.length - 1; i++) {
    for (const dx of [-arm / 2 + 3, 0, arm / 2 - 3]) {
      const x1 = xs[i] + dx, x2 = xs[i + 1] + dx, y = top + (dx === 0 ? 8 : 10);
      s += `<path class="wire" d="M${x1} ${y} Q ${(x1 + x2) / 2} ${y + (x2 - x1) * 0.08} ${x2} ${y}"/>`;
    }
  }
  return s;
}

// 光のにじみ（中心が明るい丸）。暗くなるほど強くなる
const glow = (id, x, y, r, extra = "") => `<circle class="glow ${extra}" cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;
const glowDef = (id, color) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".85"/><stop offset=".35" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

// すすき・夏草（手前の下のふち）
function grass(seed, y0, count, maxH, cls = "grass") {
  const rnd = seeded(seed);
  let d = "";
  for (let k = 0; k < count; k++) {
    const x = rnd() * 1600, h = maxH * (0.4 + rnd() * 0.6), lean = (rnd() - 0.35) * h * 0.6;
    d += `M${x - 2} ${y0} Q ${x + lean * 0.3} ${y0 - h * 0.6} ${x + lean} ${y0 - h} Q ${x + lean * 0.3 + 2} ${y0 - h * 0.55} ${x + 3} ${y0} Z `;
  }
  return `<path class="${cls}" d="${d}"/>`;
}

// ---------- 0 縁側から、田んぼと鳥居 ----------

const MOUNTAINS =
  '<path class="mtn-far" d="M0 118 C 70 96, 130 70, 200 78 S 330 52, 400 70 S 520 104, 590 86 S 720 44, 800 60 S 930 92, 1000 80 L1000 440 L0 440 Z"/>' +
  '<path class="mtn-near" d="M0 170 C 90 150, 170 156, 250 168 S 400 190, 480 178 S 620 150, 700 162 S 860 196, 940 184 L1000 180 L1000 440 L0 440 Z"/>';

const PADDIES =
  '<defs><linearGradient id="hg-water" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" class="water-top"/><stop offset=".45" class="water-mid"/><stop offset="1" class="water-bottom"/></linearGradient></defs>' +
  '<rect class="paddy-base" x="0" y="232" width="1000" height="208"/>' +
  '<rect x="0" y="236" width="1000" height="204" fill="url(#hg-water)"/>' +
  [[236, 3], [254, 3.5], [278, 4.5], [310, 6], [352, 8], [406, 11]]
    .map(([y, h]) => `<rect class="bank" x="0" y="${y}" width="1000" height="${h}"/><rect class="glint" x="0" y="${y + h + 1}" width="1000" height="1.2"/>`)
    .join("");

function ricePoles() {
  const P = [
    { x: 120, base: 440, top: 6, w: 9, arm: 86 },
    { x: 300, base: 334, top: 150, w: 5.5, arm: 50 },
    { x: 392, base: 290, top: 196, w: 3.6, arm: 32 },
    { x: 452, base: 266, top: 218, w: 2.6, arm: 22 },
    { x: 494, base: 252, top: 230, w: 2, arm: 15 },
  ];
  let s = '<path class="path" d="M-40 440 L60 440 C 200 380, 360 300, 520 238 L508 238 C 340 300, 170 380, -40 440 Z"/>';
  P.forEach((p) => {
    const a = p.top + p.w * 1.6;
    s += `<rect class="pole" x="${p.x - p.w / 2}" y="${p.top}" width="${p.w}" height="${p.base - p.top}"/>`;
    s += `<rect class="pole" x="${p.x - p.arm / 2}" y="${a}" width="${p.arm}" height="${Math.max(1.6, p.w * 0.55)}"/>`;
  });
  const ends = (p) => {
    const y = p.top + p.w * 1.6;
    return [[p.x - p.arm / 2 + 2, y], [p.x, y - p.w * 0.3], [p.x + p.arm / 2 - 2, y]];
  };
  for (let i = 0; i < P.length - 1; i++) {
    const A = ends(P[i]), B = ends(P[i + 1]);
    for (let k = 0; k < 3; k++) {
      const [x1, y1] = A[k], [x2, y2] = B[k];
      s += `<path class="wire" d="M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + (x2 - x1) * 0.12} ${x2} ${y2}"/>`;
    }
  }
  ends(P[0]).forEach(([x, y], k) => {
    s += `<path class="wire" d="M${x} ${y} Q ${x - 160} ${y - 40 + k * 10} ${x - 330} ${y - 150 + k * 14}"/>`;
  });
  return s;
}

function riceShrine() {
  const rnd = seeded(7);
  const hillY = (x) => {
    if (x < 170) return 236 - (x / 170) * 66;
    if (x < 380) return 170 - ((x - 170) / 210) * 58;
    return 112 + ((x - 380) / 140) * 6;
  };
  let s = "";
  for (let x = 150; x <= 540; x += 17 + rnd() * 8) s += cedar(x, hillY(Math.min(x, 519)) + 6, 70 + rnd() * 50, 20 + rnd() * 8, "cedar-far");
  s += '<path class="hill" d="M0 236 C 60 232, 110 200, 170 170 C 230 142, 300 120, 380 112 C 440 108, 500 114, 520 118 L520 440 L0 440 Z"/>';
  for (let x = 176; x <= 540; x += 22 + rnd() * 10) s += cedar(x, hillY(Math.min(x, 519)) + 14, 96 + rnd() * 64, 24 + rnd() * 10, "cedar");
  for (let k = 0; k < 7; k++) {
    const y = 236 - k * 7.5, half = 13 - k * 1.1;
    s += `<rect class="step" x="${118 - half + k * 4}" y="${y}" width="${half * 2}" height="2.2"/>`;
  }
  s += torii(104, 240, 1);
  return s;
}

// 鳥居（cx: 真ん中、base: 柱の足もと、k: 大きさ）
function torii(cx, base, k) {
  const r = (x, y, w, h) => `<rect class="torii" x="${cx + x * k}" y="${base + y * k}" width="${w * k}" height="${h * k}"/>`;
  return (
    r(-32, -66, 6, 66) + r(26, -66, 6, 66) + r(-38, -52, 76, 4.5) + r(-3, -66, 6, 15) + r(-44, -70, 88, 5) +
    `<path class="torii" d="M${cx - 52 * k} ${base - 79 * k} Q ${cx} ${base - 71 * k} ${cx + 52 * k} ${base - 79 * k} L${cx + 50 * k} ${base - 72 * k} Q ${cx} ${base - 65 * k} ${cx - 50 * k} ${base - 72 * k} Z"/>`
  );
}

// ---------- 1 線路と無人駅 ----------

function station() {
  let s = "<defs>" + glowDef("hg-g-lamp", "#ffd892") + glowDef("hg-g-red", "#ff4a3a") + "</defs>";
  s += '<path class="mtn-far" d="M0 250 C 200 200, 380 226, 560 210 S 900 176, 1100 200 S 1420 222, 1600 196 L1600 440 L0 440 Z"/>';
  s += '<path class="mtn-near" d="M0 300 C 240 284, 520 296, 760 288 S 1200 282, 1600 292 L1600 440 L0 440 Z"/>';
  s += polesAndWires([180, 470, 760], 336, 214, 5, 44);
  // ホーム（線路の向こう側）と柵・待合所・駅名の看板・ホームの灯り
  s += '<rect class="platform" x="1030" y="314" width="560" height="24"/>';
  let fence = "";
  for (let x = 1036; x <= 1584; x += 11) fence += `M${x} 296 h2.4 v18 h-2.4 Z `;
  s += `<path class="fence" d="${fence}"/><rect class="fence" x="1032" y="298" width="556" height="2.4"/>`;
  s += '<rect class="shelter-wall" x="1300" y="256" width="150" height="58"/>';
  s += '<rect class="pole" x="1300" y="252" width="6" height="62"/><rect class="pole" x="1444" y="252" width="6" height="62"/>';
  s += '<path class="roof" d="M1282 254 L1468 246 L1468 256 L1282 262 Z"/>';
  s += '<rect class="bench" x="1330" y="290" width="92" height="5"/><rect class="pole" x="1336" y="295" width="4" height="19"/><rect class="pole" x="1410" y="295" width="4" height="19"/>';
  s += '<rect class="pole" x="1178" y="286" width="4" height="28"/><rect class="pole" x="1228" y="286" width="4" height="28"/>';
  s += '<rect class="sign-board" x="1164" y="266" width="82" height="22" rx="2"/>';
  s += '<text class="sign-text" x="1205" y="282" text-anchor="middle" font-size="13">ひぐらし</text>';
  s += glow("hg-g-lamp", 1534, 232, 70) + '<rect class="pole" x="1532" y="232" width="4" height="82"/><path class="lamp-shade" d="M1522 232 h24 l-4 -8 h-16 Z"/><circle class="lamp" cx="1534" cy="234" r="4"/>';
  // 電車: 右から来てホームに止まり、左へ走り去る（night.css の train）
  let train = "";
  for (const cx of [0, 264]) {
    train += `<rect class="train-body" x="${cx}" y="266" width="252" height="64" rx="12"/>`;
    train += `<rect class="train-stripe" x="${cx}" y="310" width="252" height="5"/>`;
    for (let k = 0; k < 6; k++) train += `<rect class="win" x="${cx + 22 + k * 36}" y="280" width="22" height="18" rx="2"/>`;
  }
  train += '<rect class="train-body" x="252" y="282" width="12" height="40"/>';
  train += glow("hg-g-lamp", 6, 316, 34) + '<circle class="lamp" cx="7" cy="316" r="3.4"/>';
  s += `<g class="train">${train}</g>`;
  // 線路と土手（電車の足もとを隠す）
  let sleepers = "";
  for (let x = 0; x < 1600; x += 14) sleepers += `M${x} 334 h7 v3 h-7 Z `;
  s += '<rect class="bank" x="0" y="337" width="1600" height="30"/>';
  s += `<rect class="rail" x="0" y="329" width="1600" height="3.4"/><path class="rail" d="${sleepers}"/>`;
  s += '<path class="hill" d="M0 362 C 300 352, 700 366, 1000 358 S 1400 350, 1600 360 L1600 440 L0 440 Z"/>';
  // 踏切: 電車が近づくと赤い灯りが交互に点滅する（night.css の crossing）
  s += '<rect class="pole" x="897" y="250" width="6" height="110"/>';
  s += '<rect class="crossbuck" x="866" y="246" width="68" height="7" transform="rotate(28 900 250)"/><rect class="crossbuck" x="866" y="246" width="68" height="7" transform="rotate(-28 900 250)"/>';
  s += '<rect class="pole" x="872" y="270" width="56" height="16" rx="8"/>';
  s += '<g class="crossing"><g class="blink-a">' + glow("hg-g-red", 881, 278, 26) + '<circle class="red-lamp" cx="881" cy="278" r="5"/></g>';
  s += '<g class="blink-b">' + glow("hg-g-red", 919, 278, 26) + '<circle class="red-lamp" cx="919" cy="278" r="5"/></g></g>';
  s += grass(11, 440, 260, 70);
  return wide("hg-station", s);
}

// ---------- 2 海辺と灯台 ----------

function seaside() {
  const rnd = seeded(23);
  let s = "<defs>" + glowDef("hg-g-lamp2", "#fff1c4") + glowDef("hg-g-fire", "#ffcf7a") +
    '<linearGradient id="hg-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sea-top"/><stop offset=".4" class="sea-mid"/><stop offset="1" class="sea-bottom"/></linearGradient>' +
    '<linearGradient id="hg-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff3cc" stop-opacity=".75"/><stop offset="1" stop-color="#fff3cc" stop-opacity="0"/></linearGradient></defs>';
  s += '<rect x="0" y="200" width="1600" height="240" fill="url(#hg-sea)"/>';
  s += '<path class="mtn-far" d="M80 201 C 140 186, 210 180, 270 192 S 380 196, 420 201 Z M1180 201 C 1230 190, 1300 184, 1360 194 L1400 201 Z"/>';
  // 沖の漁火
  for (const x of [320, 470, 560, 760, 880]) s += `<g class="isaribi" style="animation-delay:${(rnd() * 3).toFixed(2)}s">${glow("hg-g-fire", x, 198, 16)}<circle class="lamp" cx="${x}" cy="198" r="1.8"/></g>`;
  // 海面のきらめき
  for (let k = 0; k < 46; k++) {
    const y = 210 + Math.pow(rnd(), 1.6) * 200, w = 14 + rnd() * 90 * (0.4 + (y - 200) / 240);
    s += `<rect class="shimmer" x="${(rnd() * 1600).toFixed(0)}" y="${y.toFixed(1)}" width="${w.toFixed(0)}" height="${(1 + (y - 200) / 120).toFixed(1)}" style="animation-delay:${(rnd() * 4).toFixed(2)}s"/>`;
  }
  // 灯台の光: 灯台のまわりを回る（night.css の beam）。灯台はスマホでも見えるよう右寄りに置く
  s += '<g class="beam-wrap"><path class="beam" d="M1300 128 L420 70 L420 190 L1300 138 Z" fill="url(#hg-beam)"/></g>';
  // 防波堤と消波ブロックと赤い灯台
  s += '<path class="breakwater" d="M1220 270 L1600 264 L1600 304 L1210 306 Z"/>';
  let tetra = "";
  for (let x = 1230; x < 1600; x += 26) tetra += `M${x} 306 l10 -14 l10 14 l-4 6 h-12 Z `;
  s += `<path class="hill" d="${tetra}"/>`;
  s += '<path class="lighthouse" d="M1280 270 L1320 270 L1312 148 L1288 148 Z"/>';
  s += '<rect class="lighthouse-band" x="1284" y="200" width="32" height="7"/>';
  s += '<rect class="pole" x="1280" y="142" width="40" height="6"/>';
  s += '<rect class="lantern-room" x="1290" y="120" width="20" height="22"/>';
  s += '<path class="pole" d="M1286 120 Q 1300 104 1314 120 Z"/>';
  s += `<g class="lighthouse-lamp">${glow("hg-g-lamp2", 1300, 131, 46)}<circle class="lamp" cx="1300" cy="131" r="5"/></g>`;
  // 小さな漁船
  s += '<path class="boat" d="M1040 300 L1180 300 L1164 318 L1054 318 Z"/><rect class="boat" x="1120" y="282" width="34" height="18"/><rect class="win" x="1126" y="287" width="10" height="7"/>';
  s += '<rect class="pole" x="1082" y="262" width="2.4" height="38"/>' + glow("hg-g-fire", 1083, 262, 18) + '<circle class="lamp" cx="1083" cy="262" r="2.4"/>';
  // 手前の浜と岩
  s += '<path class="hill" d="M0 352 C 160 336, 330 350, 480 372 S 700 410, 780 440 L0 440 Z"/>';
  s += '<path class="sil-deep" d="M40 380 q 30 -34 70 -20 q 30 -10 46 14 q 10 30 -20 40 l-100 4 Z M300 410 q 20 -26 56 -14 q 26 4 30 26 l-90 6 Z"/>';
  s += grass(31, 440, 60, 46);
  return wide("hg-sea", s);
}

// ---------- 3 駄菓子屋と自販機 ----------

function dagashiya() {
  const rnd = seeded(47);
  let s = "<defs>" + glowDef("hg-g-shop", "#ffd28a") + glowDef("hg-g-vend", "#dff1ff") +
    '<pattern id="hg-awning" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="22" height="40" class="awning-a"/><rect x="22" width="22" height="40" class="awning-b"/></pattern>' +
    '<linearGradient id="hg-vend-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="1" stop-color="#b9dcff"/></linearGradient></defs>';
  s += '<path class="mtn-far" d="M0 220 C 260 190, 520 206, 800 196 S 1300 186, 1600 200 L1600 440 L0 440 Z"/>';
  // 奥の家並み（瓦屋根の影）
  let town = "M0 300 ";
  let x = 0;
  while (x < 1600) {
    const w = 90 + rnd() * 110, h = 34 + rnd() * 40, base = 300;
    town += `L${x} ${base - h * 0.55} L${x + 14} ${base - h} L${x + w - 14} ${base - h} L${x + w} ${base - h * 0.55} `;
    x += w + 6;
  }
  s += `<path class="mtn-near" d="${town} L1600 440 L0 440 Z"/>`;
  for (let k = 0; k < 14; k++) s += `<rect class="win" x="${(rnd() * 1000).toFixed(0)}" y="${(262 + rnd() * 24).toFixed(0)}" width="8" height="7" style="opacity:var(--on)"/>`;
  s += polesAndWires([150, 520, 880], 400, 196, 6, 50);
  s += '<rect class="pole" x="508" y="226" width="24" height="30" rx="5"/>';
  // 道
  s += '<rect class="road" x="0" y="398" width="1600" height="42"/><rect class="glint" x="0" y="398" width="1600" height="1.5"/>';
  // 駄菓子屋: 瓦屋根・看板・日よけ・ガラス戸の明かり
  s += glow("hg-g-shop", 1250, 360, 260, "shop-spill");
  s += '<path class="roof" d="M1020 236 L1480 236 L1446 196 L1054 196 Z"/><rect class="roof" x="1048" y="190" width="404" height="8" rx="3"/>';
  s += '<rect class="shop-wall" x="1050" y="236" width="400" height="164"/>';
  s += '<rect class="sign-board" x="1150" y="246" width="200" height="34" rx="2"/>';
  s += '<text class="sign-text" x="1250" y="271" text-anchor="middle" font-size="22" letter-spacing="10">駄菓子</text>';
  s += '<path d="M1060 288 L1440 288 L1452 316 L1048 316 Z" fill="url(#hg-awning)" class="awning"/>';
  s += '<rect class="shop-light" x="1074" y="318" width="352" height="82"/>';
  for (let k = 0; k < 4; k++) {
    for (let r = 0; r < 3; r++) s += `<rect class="shelf" x="${1082 + k * 88 + rnd() * 6}" y="${330 + r * 22}" width="${60 + rnd() * 14}" height="${8 + rnd() * 5}"/>`;
  }
  let frames = "";
  for (let k = 0; k <= 4; k++) frames += `M${1072 + k * 88} 318 h4 v82 h-4 Z `;
  s += `<path class="pole" d="${frames} M1072 316 h356 v4 h-356 Z"/>`;
  // アイスの冷凍ケース・ベンチ・赤いポスト
  s += '<rect class="icebox" x="950" y="360" width="80" height="40" rx="4"/><rect class="icebox-lid" x="946" y="354" width="88" height="8" rx="3"/>';
  s += '<rect class="bench" x="850" y="374" width="80" height="6"/><rect class="pole" x="856" y="380" width="4" height="20"/><rect class="pole" x="920" y="380" width="4" height="20"/>';
  s += '<rect class="post" x="1478" y="338" width="28" height="62" rx="6"/><rect class="post" x="1474" y="334" width="36" height="8" rx="3"/><rect class="pole" x="1484" y="352" width="16" height="3"/>';
  // 自販機: 白く光り、虫が寄ってくる
  s += glow("hg-g-vend", 1556, 330, 150, "vend-glow");
  s += '<rect class="vend" x="1524" y="296" width="66" height="104" rx="3"/>';
  s += '<rect x="1530" y="302" width="54" height="56" fill="url(#hg-vend-face)" class="vend-face"/>';
  const cans = ["#e04a3a", "#3a7bd5", "#f2c14e", "#3fae6a", "#ffffff", "#e07ab0"];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) s += `<rect x="${1533 + k * 10}" y="${305 + r * 17}" width="7" height="12" rx="1.5" fill="${cans[(r * 5 + k) % cans.length]}" class="can"/>`;
  s += '<rect class="vend-slot" x="1534" y="376" width="46" height="12" rx="2"/>';
  for (let k = 0; k < 7; k++) {
    const r = 26 + rnd() * 34;
    s += `<circle class="bug" cx="1556" cy="330" r="1.6" style="--r:${r.toFixed(0)}px;animation-duration:${(2.2 + rnd() * 2.6).toFixed(2)}s;animation-delay:-${(rnd() * 3).toFixed(2)}s"/>`;
  }
  s += grass(53, 440, 40, 26);
  return wide("hg-dagashi", s);
}

// ---------- 4 神社の夏祭り ----------

function festival() {
  const rnd = seeded(61);
  let s = "<defs>" + glowDef("hg-g-chochin", "#ff9a4a") + glowDef("hg-g-stall", "#ffcf86") +
    '<radialGradient id="hg-chochin-body" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#fff1c8"/><stop offset=".55" stop-color="#ff9b4d"/><stop offset="1" stop-color="#c8432f"/></radialGradient>' +
    '<pattern id="hg-stall-a" width="36" height="30" patternUnits="userSpaceOnUse"><rect width="18" height="30" fill="#c8343a"/><rect x="18" width="18" height="30" fill="#f4ead6"/></pattern>' +
    '<pattern id="hg-stall-b" width="36" height="30" patternUnits="userSpaceOnUse"><rect width="18" height="30" fill="#2f5aa8"/><rect x="18" width="18" height="30" fill="#f4ead6"/></pattern></defs>';
  // 鎮守の森と拝殿の屋根
  for (let x = -10; x <= 1620; x += 26 + rnd() * 14) s += cedar(x, 300, 150 + rnd() * 110, 40 + rnd() * 16, "cedar-far");
  s += '<path class="hill" d="M1140 250 Q 1260 222 1380 250 L1420 262 L1100 262 Z"/><rect class="hill" x="1160" y="262" width="200" height="48"/>';
  for (let x = 0; x <= 1620; x += 34 + rnd() * 16) s += cedar(x, 330, 110 + rnd() * 80, 34 + rnd() * 12, "cedar");
  s += '<rect class="ground" x="0" y="326" width="1600" height="114"/>';
  // 参道の石灯籠と鳥居
  for (const cx of [1110, 1410]) {
    s += `<g class="ishidoro"><rect class="stone" x="${cx - 6}" y="300" width="12" height="28"/><rect class="stone" x="${cx - 14}" y="292" width="28" height="8"/>` +
      `<rect class="stone" x="${cx - 10}" y="278" width="20" height="14"/><path class="stone" d="M${cx - 18} 279 L${cx} 266 L${cx + 18} 279 Z"/>` +
      `${glow("hg-g-stall", cx, 285, 22)}<rect class="lamp" x="${cx - 5}" y="281" width="10" height="7"/></g>`;
  }
  s += torii(1260, 330, 2.3);
  // 提灯の列: 柱から柱へ、たるんだ綱に吊るす。ゆっくり揺れる
  const rows = [
    { y: 150, sag: 30, gap: 52, k: 1 },
    { y: 196, sag: 22, gap: 40, k: 0.74 },
  ];
  for (const row of rows) {
    const posts = [0, 540, 1080, 1600];
    for (let i = 0; i < posts.length - 1; i++) {
      const x1 = posts[i], x2 = posts[i + 1];
      s += `<path class="wire" d="M${x1} ${row.y} Q ${(x1 + x2) / 2} ${row.y + row.sag * 2} ${x2} ${row.y}"/>`;
      for (let x = x1 + row.gap / 2; x < x2; x += row.gap) {
        const u = (x - x1) / (x2 - x1), y = row.y + 4 * row.sag * u * (1 - u) + 2;
        const w = 9 * row.k, h = 13 * row.k;
        s += `<g class="chochin" style="transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px;animation-delay:-${(rnd() * 4).toFixed(2)}s">` +
          glow("hg-g-chochin", x, y + h + 6, 30 * row.k, "chochin-glow") +
          `<line class="wire" x1="${x}" y1="${y}" x2="${x}" y2="${y + 6}"/>` +
          `<ellipse cx="${x}" cy="${y + 6 + h}" rx="${w}" ry="${h}" fill="url(#hg-chochin-body)" class="chochin-body"/>` +
          `<rect class="chochin-cap" x="${x - w * 0.6}" y="${y + 5}" width="${w * 1.2}" height="${2.6 * row.k}"/>` +
          `<rect class="chochin-cap" x="${x - w * 0.6}" y="${y + 5 + h * 2 - 1}" width="${w * 1.2}" height="${2.6 * row.k}"/></g>`;
      }
    }
    for (const x of posts) s += `<rect class="pole" x="${x - 3}" y="${row.y - 6}" width="6" height="${330 - row.y + 6}"/>`;
  }
  // 屋台: 縞の日よけ、明るい台、のれん
  const stalls = [[140, "a"], [400, "b"], [660, "a"], [920, "b"], [1450, "a"]];
  for (const [x, p] of stalls) {
    s += glow("hg-g-stall", x + 85, 330, 150, "stall-glow");
    s += `<rect class="stall-light" x="${x + 8}" y="290" width="154" height="44"/>`;
    s += `<rect class="pole" x="${x + 4}" y="262" width="5" height="88"/><rect class="pole" x="${x + 161}" y="262" width="5" height="88"/>`;
    s += `<path d="M${x - 6} 262 L${x + 176} 262 L${x + 168} 290 L${x + 2} 290 Z" fill="url(#hg-stall-${p})" class="stall-awning"/>`;
    for (let k = 0; k < 5; k++) s += `<rect class="noren" x="${x + 14 + k * 30}" y="290" width="26" height="14"/>`;
    s += `<rect class="stall-counter" x="${x}" y="334" width="170" height="20"/>`;
    for (let k = 0; k < 4; k++) s += `<circle class="sil-deep" cx="${x + 30 + k * 36 + rnd() * 10}" cy="${330 - rnd() * 4}" r="${5 + rnd() * 4}"/>`;
  }
  // 手前を歩く人の影（浴衣・うちわ）
  for (const [px, h] of [[310, 96], [560, 88], [790, 100], [1180, 92]]) {
    s += `<g class="sil-deep"><circle cx="${px}" cy="${440 - h}" r="${h * 0.09}"/><path d="M${px - h * 0.13} ${440 - h * 0.86} Q ${px} ${440 - h * 0.92} ${px + h * 0.13} ${440 - h * 0.86} L${px + h * 0.17} 440 L${px - h * 0.17} 440 Z"/></g>`;
  }
  return wide("hg-festival", s);
}

// ---------- 花火（最後の章で、夏祭りの空に上がる） ----------

export function makeFireworks(canvas) {
  const ctx = canvas.getContext("2d");
  const PR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * PR); canvas.height = Math.round(H * PR);
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  const COLORS = ["#ffd36e", "#ff6b5a", "#ff9fd0", "#9fe3ff", "#b8ff8a", "#fff4d6"];
  const rockets = [], sparks = [];
  let wait = 0.4;
  function launch() {
    const narrow = W < 700;
    // PC は本文の列（左）を避けて右側に上げる
    const x = narrow ? W * (0.15 + Math.random() * 0.7) : W * (0.5 + Math.random() * 0.42);
    rockets.push({ x, y: H * 0.62, vy: -(H * (0.55 + Math.random() * 0.25)), top: H * (0.12 + Math.random() * 0.22), color: COLORS[(Math.random() * COLORS.length) | 0], willow: Math.random() < 0.3 });
  }
  function burst(r) {
    const n = r.willow ? 70 : 90, speed = Math.min(W, H) * (r.willow ? 0.22 : 0.3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.1, v = speed * (0.75 + Math.random() * 0.3);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: r.willow ? 0.38 : 0.62, color: r.willow ? "#ffcf6e" : r.color, willow: r.willow });
    }
  }
  return {
    // dt 秒すすめて描く。weight（0〜1）が花火の章の濃さ。0 のあいだは新しく上げない
    step(dt, weight) {
      ctx.clearRect(0, 0, W, H);
      if (weight <= 0 && !rockets.length && !sparks.length) return;
      wait -= dt;
      if (weight > 0.5 && wait <= 0) { launch(); wait = 0.9 + Math.random() * 1.6; }
      ctx.globalCompositeOperation = "lighter";
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt; r.vy *= 0.985;
        ctx.fillStyle = "rgba(255, 220, 160, .9)";
        ctx.fillRect(r.x - 1, r.y, 2, 7);
        if (r.y <= r.top) { burst(r); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.vx *= 0.975; p.vy = p.vy * 0.975 + H * (p.willow ? 0.12 : 0.08) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, p.life * 1.4) * Math.max(0.25, weight);
        ctx.fillStyle = p.color;
        const sz = p.willow ? 1.8 : 2.3;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(p.x - p.vx * 0.03 - 1, p.y - p.vy * 0.03 - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

// ---------- 組み立て ----------

export function buildScenery() {
  const layer = (cls) => {
    const el = document.createElement("div");
    el.className = cls;
    el.setAttribute("aria-hidden", "true");
    return el;
  };
  const sky = layer("hg-sky");
  sky.innerHTML = '<div class="hg-sky-blue"></div><div class="hg-sky-night"></div>';

  const fireworks = document.createElement("canvas");
  fireworks.className = "hg-fireworks";
  fireworks.setAttribute("aria-hidden", "true");

  const far = layer("hg-land");
  const scenes = [];
  const scene = (...svgs) => {
    const el = layer("hg-scene");
    el.append(...svgs);
    far.append(el);
    scenes.push(el);
  };
  scene(
    svg("0 0 1000 440", "hg-mtn", MOUNTAINS, "none"),
    svg("0 0 1000 440", "hg-paddy", PADDIES, "none"),
    svg("0 0 760 440", "hg-poles", ricePoles(), "xMinYMax meet"),
    svg("0 0 520 440", "hg-shrine", riceShrine(), "xMaxYMax meet")
  );
  scene(station());
  scene(seaside());
  scene(dagashiya());
  scene(festival());
  // 本文の後ろだけ、景色を夜の色で薄く覆って読みやすくする
  far.append(layer("hg-veil"));

  const near = layer("hg-near");
  near.innerHTML =
    '<div class="hg-eave"></div><div class="hg-pillar"></div><div class="hg-floor"></div>' +
    '<div class="hg-furin"><div class="hg-furin-swing"><svg viewBox="0 0 60 190" aria-hidden="true">' +
    '<line class="furin-string" x1="30" y1="0" x2="30" y2="46"/>' +
    '<path class="furin-glass" d="M14 70 C 14 52, 20 44, 30 44 C 40 44, 46 52, 46 70 Z"/>' +
    '<path class="furin-paint" d="M15.2 64 C 22 61, 38 61, 44.8 64 L45.3 68 C 38 65.5, 22 65.5, 14.7 68 Z"/>' +
    '<path class="furin-shine" d="M21 52 C 23 48, 26 47, 28 47"/>' +
    '<line class="furin-string" x1="30" y1="62" x2="30" y2="96"/>' +
    '<g class="tanzaku"><rect x="24" y="96" width="12" height="78" rx="1"/></g></svg></div></div>';
  return { sky, fireworks, far, near, scenes };
}
