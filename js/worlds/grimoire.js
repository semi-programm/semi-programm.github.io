// 魔導書: 本文をページに割り付けて、紙をめくって読む本にする。金の紋章は右上に浮かぶ
//
// - 本文（index.html の main の中身）を、画面に収まる大きさのページへ流し込む。広い画面は見開き、狭い画面は1ページずつ
// - めくる紙は、細い短冊を少しずつ角度を変えてつないだもの。短冊ごとにページの写しを置くので、文字も紙と一緒に曲がる
// - JS が動かないときや割り付けに失敗したときは、grimoire.css の元の作り（縦に読む本）のまま

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(pointer: fine)").matches;
const html = document.documentElement;
const body = document.body;
const book = document.querySelector(".book");
const main = book.querySelector("main");
const aside = document.querySelector(".page-right");
const plate = aside.querySelector(".plate");

/* ---------- 文字が本の外から集まる ---------- */
// ページを開くと、一文字ずつが本の外のばらばらの場所から飛んできて、自分の位置に収まる。
// 本物の文字は動かさない（一文字ずつに分けると行の折り返しが変わり、割り付けが狂う）。
// 本物の文字の位置を測り、同じ書体・大きさ・色の写しを重ねて飛ばし、収まったら写しを消して本物を見せる
const layer = document.createElement("div");
layer.className = "gather-layer";
layer.setAttribute("aria-hidden", "true");
const running = new Map(); // ページ → { els, timer }

// ::first-letter の飾り（章のはじめの大きな字、表紙の M）は、その一字だけ飾りの書体と色で飛ばす
const FIRST_LETTER = ".opening, h1";
// z は、縮めた表紙（CSS の zoom）の中の文字のときの倍率
const px = (v, z) => (v.endsWith("px") ? parseFloat(v) * z + "px" : v);
const styleCss = (cs, z = 1) =>
  `font-family:${cs.fontFamily};font-size:${px(cs.fontSize, z)};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};` +
  `color:${cs.color};letter-spacing:${px(cs.letterSpacing, z)};text-transform:${cs.textTransform};` +
  `font-feature-settings:${cs.fontFeatureSettings};font-variant-numeric:${cs.fontVariantNumeric};`;
const zoomOf = (el) => parseFloat(el.closest(".title-page")?.style.zoom) || 1;

// ページの中の文字を、一字ずつ位置と見た目つきで拾う
function glyphs(pg) {
  const root = pg.querySelector(".pg-body");
  const firsts = new Map();
  root.querySelectorAll(FIRST_LETTER).forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const i = n.textContent.search(/\S/);
      if (i >= 0) { firsts.set(n, { i, css: styleCss(getComputedStyle(el, "::first-letter"), zoomOf(el)) }); break; }
    }
  });
  const cache = new Map();
  const out = [];
  const range = document.createRange();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const text = n.textContent;
    if (!/\S/.test(text)) continue;
    const el = n.parentElement;
    let css = cache.get(el);
    if (!css) { css = styleCss(getComputedStyle(el), zoomOf(el)); cache.set(el, css); }
    const fl = firsts.get(n);
    for (let i = 0; i < text.length; ) {
      const len = text.codePointAt(i) > 0xffff ? 2 : 1;
      const ch = text.slice(i, i + len);
      if (/\S/.test(ch)) {
        range.setStart(n, i);
        range.setEnd(n, i + len);
        const r = range.getBoundingClientRect();
        if (r.width && r.height) out.push({ ch, r, css: fl && fl.i === i ? fl.css : css });
      }
      i += len;
    }
  }
  return out;
}

function gather(pg) {
  if (!pg || reduce || pg.classList.contains("blank")) return;
  settle(pg);
  // 見た目（色など）は、本物の文字を透明にする前に測る
  const list = glyphs(pg);
  if (!list.length) return;
  pg.classList.add("gathering");
  const B = main.getBoundingClientRect();
  const cx = B.left + B.width / 2, cy = B.top + B.height / 2;
  const vw = window.innerWidth, vh = window.innerHeight;
  const frag = document.createDocumentFragment();
  const els = [];
  let longest = 0;
  list.forEach((g, k) => {
    const { r } = g;
    const sp = document.createElement("span");
    sp.className = "gch";
    sp.textContent = g.ch;
    sp.style.cssText = g.css + `left:${r.left}px;top:${r.top}px;height:${r.height}px;line-height:${r.height}px;`;
    // 本の真ん中から見たその字の方向のまわりで、本の外へ散らしておく。
    // 机が見えている向きなら机の上に、本が画面いっぱいの向きなら画面のすぐ外に置く（遠すぎると飛び始めが見えない）
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    const th = Math.atan2(ty - cy, tx - cx) + (Math.random() - 0.5) * 2.2;
    const cos = Math.cos(th), sin = Math.sin(th);
    const along = (w, h, x0, y0) =>
      Math.min(Math.abs((cos > 0 ? w - x0 : x0) / (cos || 1e-6)), Math.abs((sin > 0 ? h - y0 : y0) / (sin || 1e-6)));
    const edge = Math.min(Math.abs(B.width / 2 / (cos || 1e-6)), Math.abs(B.height / 2 / (sin || 1e-6)));
    const screen = along(vw, vh, cx, cy);
    const dist = screen - edge > 50 ? edge + 20 + Math.random() * (screen - edge) : screen + 10 + Math.random() * 70;
    const dx = cx + cos * dist - tx, dy = cy + sin * dist - ty;
    const rot = (Math.random() - 0.5) * 720;
    const sc = 0.5 + Math.random() * 1.3;
    // まっすぐ来ずに、少し回り込んで集まる
    const bend = (Math.random() - 0.5) * 0.5;
    const mx = dx * 0.3 - dy * bend, my = dy * 0.3 + dx * bend;
    // 読む順に少しずつ、ばらつきを持たせて飛び立つ
    const delay = (k / list.length) * 380 + Math.random() * 420;
    const duration = 780 + Math.random() * 520;
    longest = Math.max(longest, delay + duration);
    // 回転と大きさは道のりの 8 割ほどで元に戻しきり、最後はまっすぐ滑り込むだけにする。
    // 減速しきって最後の数ピクセルを這う動きだと、集まったあとに字がふるえて見えるので、
    // わずかに勢いを残したまま、すっと止める（easing の終わりの傾きを 0 にしない）
    const lx = mx * 0.45, ly = my * 0.45;
    sp.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sc})`, opacity: 0 },
        { opacity: 1, offset: 0.16 },
        { transform: `translate(${mx}px, ${my}px) rotate(${rot * 0.1}deg) scale(${1 + (sc - 1) * 0.15})`, offset: 0.6 },
        { transform: `translate(${lx}px, ${ly}px) rotate(0deg) scale(1)`, offset: 0.82 },
        { transform: "translate(0px, 0px) rotate(0deg) scale(1)", opacity: 1 },
      ],
      { duration, delay, easing: "cubic-bezier(.25, .62, .45, .93)", fill: "backwards" }
    );
    els.push(sp);
    frag.append(sp);
  });
  layer.append(frag);
  running.set(pg, { els, timer: setTimeout(() => settle(pg), longest + 60) });
}

// 文字を透明にしたり戻したりする間は、ボタンや目次の「色がゆっくり変わる」効果を止める。
// 止めないと、戻した直後に測った色がまだ透明に近く、写しが見えなくなる
function quiet(pg) {
  pg.classList.add("notrans");
  void pg.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => pg.classList.remove("notrans")));
}

// 写しを片づけて本物の文字を見せる。pg を省くと全部。
// 止まった写しは本物と同じ位置・同じ描き方なので、入れ替えても見た目は変わらない
function settle(pg) {
  const list = pg ? [pg] : [...running.keys(), ...main.querySelectorAll(".pg.gathering")];
  for (const p of list) {
    const job = running.get(p);
    if (job) {
      clearTimeout(job.timer);
      job.els.forEach((e) => e.remove());
      running.delete(p);
    }
    quiet(p);
    p.classList.remove("gathering");
  }
}

/* ---------- 割り付け ---------- */
// 中身ごとページをまたいで分けてよい入れ物。それ以外（段落・見出し・li など）は分けずにまるごと送る
const SPLIT = new Set(["HEADER", "NAV", "SECTION", "ARTICLE", "OL", "UL", "FOOTER"]);
// 見出しのたぐいは、ページの最後に取り残さず、次のかたまりと一緒に送る
const HEAD = ".headpiece, .imprint, .orn, .cap, h2, .toc-h, .meta, h3, .label, .sub-h";

main.querySelectorAll(":scope > i.corner").forEach((c) => c.remove());
const tops = [...main.children];
// 元の親子を覚えておく。割り付け直すときは、これで元の形に戻してからやり直す
const kids = new Map();
const record = (el) => {
  if (!SPLIT.has(el.tagName)) return;
  const list = [...el.children];
  kids.set(el, list);
  list.forEach(record);
};
tops.forEach(record);
const restore = (el) => {
  const list = kids.get(el);
  if (!list) return;
  list.forEach((c) => { el.append(c); restore(c); });
};

let mode = "spread";
let PW = 0, PH = 0;
let pages = [];
let sectionPage = {};
const blankL = makeBlank("l");
const blankR = makeBlank("r");

function makeBlank(side) {
  const el = document.createElement("div");
  el.className = `pg blank ${side}`;
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
  return el;
}

// 画面のふち（iPhone の角の丸みやホームバー）の分の余白。CSS の env() を、測るための要素で読む
let safeCache = null;
function safeArea() {
  if (safeCache) return safeCache;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
  body.append(probe);
  const cs = getComputedStyle(probe);
  safeCache = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  probe.remove();
  return safeCache;
}

// ページの大きさを決める。紋章は右上の机の上に置くので、見開きの左右にはその分の余白を取る
function measure() {
  const vw = window.innerWidth, vh = window.innerHeight;
  mode = vw >= 1100 && vh >= 560 ? "spread" : "single";
  if (mode === "spread") {
    const logo = 104, gutter = logo + 28;
    PH = vh - 22 - 62;
    PW = Math.floor(Math.min((vw - gutter * 2) / 2, 680, PH * 0.82));
    html.style.setProperty("--book-top", "22px");
  } else {
    // 1ページずつのときも、開いた本の右ページとして見せる。
    // 上はページ送りと紋章、下は世界の切り替えの場所を空け、左に向かいのページのはし（SLIVER）、右に紙の重なりと表紙（EDGE）
    const SLIVER = 12, EDGE = 16, safe = safeArea();
    const top = 52 + safe.top, bottom = 66 + safe.bottom;
    PH = vh - top - bottom;
    PW = Math.min(vw - SLIVER - EDGE, Math.max(Math.round(PH * 0.78), 520));
    html.style.setProperty("--book-top", top + "px");
    html.style.setProperty("--book-left", Math.round((vw - PW - EDGE + SLIVER) / 2) + "px");
  }
  html.dataset.mode = mode;
  html.style.setProperty("--pw", PW + "px");
  html.style.setProperty("--ph", PH + "px");
}

function makePage() {
  const el = document.createElement("div");
  el.className = "pg";
  el.innerHTML =
    '<div class="pg-body"></div>' +
    '<i class="corner tl" aria-hidden="true"></i><i class="corner tr" aria-hidden="true"></i>' +
    '<i class="corner bl" aria-hidden="true"></i><i class="corner br" aria-hidden="true"></i>' +
    '<i class="fold" aria-hidden="true"></i><span class="folio" aria-hidden="true"></span>';
  el.inert = true;
  main.append(el);
  pages.push(el);
  return el;
}

function paginate() {
  tops.forEach(restore);
  main.replaceChildren();
  pages = [];
  sectionPage = {};

  let pg = null, fresh = true, chapter = "0", section = "top";
  const stack = [{ orig: null, el: null, count: 0 }];
  const top = () => stack[stack.length - 1];
  const pbody = () => pg.firstElementChild;
  const over = () => pbody().scrollHeight > pbody().clientHeight + 1;
  const usedPx = () => {
    const b = pbody(), last = b.lastElementChild;
    return last ? last.getBoundingClientRect().bottom - b.getBoundingClientRect().top : 0;
  };

  // 新しいページを開き、いま開いている入れ物（章・実績・リストなど）の続きをそこに作る
  const openPage = () => {
    // 前のページに、中身がひとつも入らなかった入れ物（枠だけの実績など）が残っていたら片づけ、
    // それが元の要素なら、続きの写しではなく元の要素ごと次のページへ持ち越す
    const carry = new Set();
    for (let k = stack.length - 1; k >= 1; k--) {
      const el = stack[k].el;
      if (!el || el.children.length) break;
      el.remove();
      if (el === stack[k].orig) carry.add(k);
    }
    pg = makePage();
    pg.dataset.chapter = chapter;
    pg.dataset.section = section;
    fresh = true;
    let p = pbody();
    stack.forEach((s, k) => {
      if (k === 0) { s.el = p; return; }
      let c = s.orig;
      if (!carry.has(k)) {
        c = s.orig.cloneNode(false);
        c.removeAttribute("id");
        c.classList.add("cont");
        if (s.orig.matches("ol.numbered")) c.style.counterReset = `n ${s.count}`;
      }
      p.append(c);
      s.el = c;
      p = c;
    });
  };

  const placeList = (list) => {
    for (let i = 0; i < list.length; i++) {
      const group = [list[i]];
      while (group[group.length - 1].matches(HEAD) && i + 1 < list.length) group.push(list[++i]);
      placeGroup(group);
    }
  };

  const placeGroup = (group) => {
    const holder = top();
    const before = usedPx();
    group.forEach((n) => holder.el.append(n));
    if (!over()) { fresh = false; holder.count += group.length; return; }
    const last = group[group.length - 1];
    const startY = group[0].getBoundingClientRect().top;
    const tall = last.getBoundingClientRect().bottom - startY;
    const first = kids.get(last)?.[0];
    const firstNeed = first ? first.getBoundingClientRect().bottom - startY : tall;
    group.forEach((n) => n.remove());
    const heads = group.slice(0, -1);
    const pageH = pbody().clientHeight;
    const roomPx = pageH - before;
    // ページの途中で分けるのは、次のどれかのときだけ。それ以外は丸ごと次のページへ送る
    // - 1ページに収まらない大きさ
    // - かたまりの大半（6割）が残りに入る
    // - 実績の中の箇条書きのように、分けた入れ物の中で、最初の1つが残りに入る
    // 枠で囲んだもの（.featured）は、1ページに収まるかぎり分けない
    const boxed = last.matches(".featured");
    const worth = fresh || tall > pageH * 0.9 || (!boxed && (roomPx > tall * 0.6 || (stack.length >= 3 && roomPx >= firstNeed)));
    if (SPLIT.has(last.tagName) && kids.get(last)?.length && worth) {
      if (heads.length) {
        heads.forEach((n) => holder.el.append(n));
        if (over() && !fresh) { heads.forEach((n) => n.remove()); openPage(); placeGroup(group); return; }
        fresh = false;
        holder.count += heads.length;
      }
      split(last);
      return;
    }
    if (!fresh) { openPage(); placeGroup(group); return; }
    // 空のページにも収まらない（とても低い画面）。そのページだけ中でスクロールさせる
    group.forEach((n) => top().el.append(n));
    pg.classList.add("tall");
    fresh = false;
    top().count += group.length;
  };

  // 入れ物だけを先に置き、中身を1つずつ流し込む
  const split = (el) => {
    const list = kids.get(el);
    list.forEach((c) => c.remove());
    top().el.append(el);
    top().count += 1;
    if (over() && !fresh) { el.remove(); openPage(); top().el.append(el); }
    stack.push({ orig: el, el, count: 0 });
    placeList(list);
    stack.pop();
  };

  // 表紙・目次・各章は、新しいページから始める
  tops.forEach((t) => {
    chapter = t.dataset.chapter || chapter;
    section = t.id || section;
    stack.length = 1;
    openPage();
    if (t.id) sectionPage[t.id] = pages.length - 1;
    // 表紙は分けない。1ページに入らない画面では、入る大きさまで縮める
    if (t.classList.contains("title-page")) {
      t.style.zoom = "";
      pbody().append(t);
      const need = t.getBoundingClientRect().height, room = pbody().clientHeight;
      if (need > room) t.style.zoom = String(Math.max(0.6, Math.floor((room / need) * 100) / 100 - 0.01));
      t.remove();
    }
    split(t);
  });

  pages.forEach((p, i) => {
    p.classList.add(mode === "spread" && i % 2 === 0 ? "l" : "r");
    p.querySelector(".folio").textContent = i === 0 ? "" : i + 1;
    // 表紙と目次は、ページの上下の真ん中に置く
    if (!p.classList.contains("tall") && p.querySelector(":scope > .pg-body > .title-page, :scope > .pg-body > .toc")) p.classList.add("center");
  });
  // 目次のページ番号を、本当のページ番号にする
  document.querySelectorAll('.toc a[href^="#"]').forEach((a) => {
    const n = sectionPage[a.getAttribute("href").slice(1)];
    const p = a.querySelector(".p");
    if (p && n !== undefined) p.textContent = n + 1;
  });
  main.append(blankL, blankR, castL, castR);
}

/* ---------- 見開き（または1ページ）の表示 ---------- */
let at = 0; // 見開きなら何番目の見開きか、1ページずつなら何ページ目か
const count = () => (mode === "spread" ? Math.ceil(pages.length / 2) : pages.length);
const L = (s) => (mode === "spread" ? pages[2 * s] || blankL : null);
const R = (s) => (mode === "spread" ? pages[2 * s + 1] || blankR : pages[s]);
const atOfPage = (i) => (mode === "spread" ? Math.floor(i / 2) : i);
const clampAt = (s) => Math.max(0, Math.min(count() - 1, s));

const castL = document.createElement("i");
castL.className = "cast l";
const castR = document.createElement("i");
castR.className = "cast r";

function setSlots(l, r) {
  for (const p of [...pages, blankL, blankR]) {
    p.classList.remove("at-l", "at-r");
    p.inert = true;
  }
  if (l) { l.classList.add("at-l"); if (!l.classList.contains("blank")) l.inert = false; }
  if (r) { r.classList.add("at-r"); if (!r.classList.contains("blank")) r.inert = false; }
}

function show(s, animate) {
  settle();
  at = clampAt(s);
  setSlots(L(at), R(at));
  if (animate) { gather(L(at)); gather(R(at)); }
  afterMove();
}

const deskbar = document.createElement("div");
deskbar.className = "deskbar";
deskbar.innerHTML =
  '<button type="button" class="prev" aria-label="前のページ">‹</button>' +
  '<span class="count" aria-live="polite"></span>' +
  '<button type="button" class="next" aria-label="次のページ">›</button>' +
  '<span class="desk-hint">ページの端をつまんで、めくる</span>';
const countEl = deskbar.querySelector(".count");
const prevBtn = deskbar.querySelector(".prev");
const nextBtn = deskbar.querySelector(".next");

function afterMove() {
  const shown = [L(at), R(at)].filter((p) => p && !p.classList.contains("blank"));
  const nums = shown.map((p) => pages.indexOf(p) + 1);
  countEl.textContent = `${nums.join("–")} / ${pages.length}`;
  prevBtn.disabled = at === 0;
  nextBtn.disabled = at === count() - 1;
  // 紋章の姿勢は、読んでいる章で変わる（sigil.js が body[data-chapter] を見る）
  const ref = shown[shown.length - 1];
  if (ref) body.dataset.chapter = ref.dataset.chapter;
  // 小口の厚み: 読んだぶん左に、残りが右に積もる
  if (mode === "spread") {
    const read = 2 * at, left = Math.max(0, pages.length - read - 2);
    html.style.setProperty("--thick-l", Math.min(9, read * 0.35) + "px");
    html.style.setProperty("--thick-r", Math.min(9, left * 0.35) + "px");
  }
}

/* ---------- めくる紙 ---------- */
const DUR = () => (mode === "spread" ? 1100 : 820);
let busy = false;
let turned = false;

// めくる前に、下に見えるページと、めくる紙の表裏に写すページを決める
function plan(to) {
  const fwd = to > at;
  if (mode === "spread") {
    return fwd
      ? { to, fwd, front: R(at), back: L(to), under: [L(at), R(to)], now: R(to), end: L(to), hinge: PW }
      : { to, fwd, front: R(to), back: L(at), under: [L(to), R(at)], now: L(to), end: R(to), hinge: PW };
  }
  return fwd
    ? { to, fwd, front: R(at), back: null, under: [null, R(to)], now: R(to), end: null, hinge: 0 }
    : { to, fwd, front: R(to), back: null, under: [null, R(at)], now: null, end: R(to), hinge: 0 };
}

function ghost(pg) {
  const g = pg.cloneNode(true);
  g.classList.remove("at-l", "at-r", "peek", "gathering", "notrans");
  g.classList.add("ghost");
  g.removeAttribute("inert");
  g.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
  g.removeAttribute("id");
  return g;
}

function begin(to) {
  clearPeek();
  settle();
  const T = plan(to);
  setSlots(T.under[0], T.under[1]);
  // 下から現れるページは、紙が十分めくれてから文字が集まる。それまでは白い紙
  if (T.now && !reduce) { quiet(T.now); T.now.classList.add("gathering"); }
  const n = mode === "spread" ? 24 : 16;
  const w = PW / n;
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.setAttribute("aria-hidden", "true");
  turn.style.left = T.hinge + "px";
  const front = ghost(T.front);
  const back = T.back ? ghost(T.back) : null;
  let parent = turn;
  T.strips = [];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "strip";
    s.style.left = (i === 0 ? 0 : w) + "px";
    s.style.width = w + 1.5 + "px";
    const f = document.createElement("div");
    f.className = "face front";
    const fg = front.cloneNode(true);
    fg.style.left = -i * w + "px";
    const fs = document.createElement("i");
    fs.className = "shade";
    f.append(fg, fs);
    const b = document.createElement("div");
    b.className = "face back";
    if (back) {
      const bg = back.cloneNode(true);
      bg.style.left = -(PW - (i + 1) * w) + "px";
      b.append(bg);
    } else {
      b.classList.add("plain");
    }
    const bs = document.createElement("i");
    bs.className = "shade";
    b.append(bs);
    s.append(f, b);
    parent.append(s);
    parent = s;
    T.strips.push({ s, fs, bs, bf: b });
  }
  main.append(turn);
  T.turn = turn;
  window.dispatchEvent(new CustomEvent("pageturn", { detail: { dir: T.fwd ? 1 : -1 } }));
  return T;
}

// p: 0 = 紙が右に平らに伏せている、1 = 左に平らに伏せている。戻るときは 1 から 0 へ動かす
// 引っぱっている端ほど先に回るように、外側の短冊ほど角度を足す
function pose(T, p) {
  T.p = p;
  const A = -180 * p;
  const lead = T.fwd ? -1 : 1;
  const bend = Math.sin(Math.PI * p) * (mode === "spread" ? 72 : 62);
  const n = T.strips.length;
  const front = [], back = [];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let a = A + lead * bend * Math.pow((i + 1) / n, 1.7);
    a = Math.max(-180, Math.min(0, a));
    T.strips[i].s.style.transform = `rotateY(${(a - prev).toFixed(3)}deg)`;
    prev = a;
    // 光は手前から。紙が立つほど暗くなる
    const c = Math.cos((a * Math.PI) / 180);
    front.push((1 - Math.max(0, c)) * 0.55);
    back.push((1 - Math.max(0, -c)) * 0.55);
  }
  // 短冊ごとに一色だと段になって見える。となりとの中間の濃さで、左右の端をつなぐ
  const edge = (arr, i, side) => (arr[i] + arr[Math.max(0, Math.min(n - 1, i + side))]) / 2;
  const ink = (v) => `rgba(43, 26, 8, ${v.toFixed(3)})`;
  for (let i = 0; i < n; i++) {
    const st = T.strips[i];
    st.fs.style.background = `linear-gradient(to right, ${ink(edge(front, i, -1))}, ${ink(edge(front, i, 1))})`;
    // 裏の面は左右が反対を向いている
    st.bs.style.background = `linear-gradient(to right, ${ink(edge(back, i, 1))}, ${ink(edge(back, i, -1))})`;
  }
  // 1ページずつのときは左にページがないので、立ちきった紙の裏は机の上で薄れて消える
  if (mode === "single") {
    const fade = Math.max(0, Math.min(1, (0.85 - p) / 0.3)).toFixed(3);
    for (const st of T.strips) st.bf.style.opacity = fade;
  }
  // 紙が十分めくれたら、現れたページに文字を集める（見開きは半分過ぎ、1ページずつは紙が3割ほど立ったところ）。
  // ドラッグの途中でも集め始め、めくるのをやめたら片づける
  const opened = mode === "spread" ? 0.55 : 0.3;
  if (T.now && !T.gathered && (T.fwd ? p > opened : p < 1 - opened)) {
    T.gathered = true;
    gather(T.now);
  }
  const lift = Math.sin(Math.PI * p);
  castR.style.opacity = (0.6 * (1 - p) * lift).toFixed(3);
  castL.style.opacity = mode === "spread" ? (0.5 * p * lift).toFixed(3) : "0";
}

function finish(T, commit) {
  T.turn.remove();
  castL.style.opacity = castR.style.opacity = "0";
  if (commit) {
    at = T.to;
    setSlots(L(at), R(at));
    if (T.now && !T.gathered) gather(T.now);
    afterMove();
    if (!turned) { turned = true; deskbar.classList.add("turned"); }
  } else {
    if (T.now) settle(T.now);
    setSlots(L(at), R(at));
  }
  busy = false;
}

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function run(T, from, to, ms) {
  return new Promise((done) => {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      pose(T, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
}

async function flip(to) {
  to = clampAt(to);
  if (busy || to === at || !pages.length) return;
  if (reduce) { show(to, false); return; }
  busy = true;
  const T = begin(to);
  const a = T.fwd ? 0 : 1;
  pose(T, a);
  await run(T, a, 1 - a, DUR());
  finish(T, true);
}

function goToSection(id) {
  const el = document.getElementById(id);
  const pg = el && el.closest(".pg");
  if (pg) flip(atOfPage(pages.indexOf(pg)));
}

/* ---------- 手で操作する ---------- */
const local = (e) => {
  const r = main.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
// x がどのページの、外側のどれくらいにあるか
function zone(x) {
  if (mode === "spread") {
    if (x >= PW) return { side: "r", outer: (x - PW) / PW };
    return { side: "l", outer: 1 - x / PW };
  }
  return x >= PW / 2 ? { side: "r", outer: x / PW } : { side: "l", outer: 1 - x / PW };
}

let drag = null;
main.addEventListener("pointerdown", (e) => {
  if (busy || e.button !== 0 || !pages.length) return;
  if (e.target.closest("a, button, input, textarea, select, label")) return;
  const { x, y } = local(e);
  drag = { id: e.pointerId, x0: x, y0: y, t: performance.now(), started: false, zone: zone(x) };
});

window.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) { hover(e); return; }
  const { x, y } = local(e);
  const dx = x - drag.x0, dy = y - drag.y0;
  if (!drag.started) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    const z = drag.zone.side;
    const to = mode === "spread" ? (z === "r" && dx < 0 ? at + 1 : z === "l" && dx > 0 ? at - 1 : null) : dx < 0 ? at + 1 : at - 1;
    if (to === null || to < 0 || to >= count() || reduce) { drag = null; return; }
    clearPeek();
    busy = true;
    drag.started = true;
    drag.T = begin(to);
    drag.target = drag.T.fwd ? 0 : mode === "spread" ? 1 : 0.5;
    pose(drag.T, drag.T.fwd ? 0 : 1);
    drag.last = { p: drag.target, t: performance.now() };
    drag.v = 0;
    try { main.setPointerCapture(e.pointerId); } catch { /* 取れなくても動く */ }
    follow();
  }
  // 指の位置を、紙の進み具合に置き換える（つまんだ所から反対の端まで）
  const T = drag.T;
  let p;
  if (mode === "spread") {
    p = T.fwd ? (drag.x0 - x) / Math.max(drag.x0, 1) : 1 - (x - drag.x0) / Math.max(2 * PW - drag.x0, 1);
  } else {
    // 1ページずつのときは綴じ目が画面の左端にある。紙が立ちきる（p = 0.5）までを指の動きに合わせ、
    // 紙の端がいつも指の近くに見えるようにする。その先は手を離したあとのアニメーションで回す
    p = T.fwd
      ? 0.5 * (drag.x0 - x) / Math.max(drag.x0, PW * 0.3)
      : 0.5 * (1 - (x - drag.x0) / Math.max(PW - drag.x0, PW * 0.3));
  }
  p = Math.max(0, Math.min(1, p));
  const now = performance.now();
  drag.v = (p - drag.last.p) / Math.max(1, now - drag.last.t);
  drag.last = { p, t: now };
  drag.target = p;
});

function follow() {
  if (!drag || !drag.started) return;
  const T = drag.T;
  pose(T, T.p + (drag.target - T.p) * 0.32);
  requestAnimationFrame(follow);
}

async function release(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (!d.started) {
    // 押しただけ: ページの外側を押したらめくる
    const quick = performance.now() - d.t < 600;
    if (quick && e.type === "pointerup" && d.zone.outer > 0.62) flip(d.zone.side === "r" ? at + 1 : at - 1);
    return;
  }
  const T = d.T;
  // 半分まで行かなくても、勢いがあればめくる
  const toward = T.fwd ? d.v : -d.v;
  // 見開きは紙が半分近くまで、1ページずつは紙が半分ほど立ったら、離してもめくりきる
  const done = mode === "spread" ? (T.fwd ? T.p > 0.42 : T.p < 0.58) : T.fwd ? T.p > 0.24 : T.p < 0.26;
  const commit = toward > 0.0012 || (done && toward > -0.0012);
  const goal = commit ? (T.fwd ? 1 : 0) : T.fwd ? 0 : 1;
  await run(T, T.p, goal, Math.max(220, Math.abs(goal - T.p) * DUR()));
  finish(T, commit);
}
window.addEventListener("pointerup", release);
window.addEventListener("pointercancel", release);

// ページの端にマウスを寄せると、角が少しめくれて「めくれる」と分かる
let peeked = null;
function clearPeek() {
  if (peeked) peeked.classList.remove("peek");
  peeked = null;
  main.classList.remove("hot");
}
function hover(e) {
  if (!fine || busy || drag || !pages.length || e.pointerType !== "mouse") return;
  const { x, y } = local(e);
  const inside = x >= 0 && y >= 0 && y <= PH && x <= (mode === "spread" ? 2 * PW : PW);
  const z = inside ? zone(x) : null;
  const canNext = at < count() - 1, canPrev = at > 0;
  let pg = null;
  if (z && z.outer > 0.62) {
    if (z.side === "r" && canNext) pg = R(at);
    else if (z.side === "l" && canPrev) pg = mode === "spread" ? L(at) : R(at);
  }
  main.classList.toggle("hot", !!pg);
  const near = pg && z.outer > 0.9 ? pg : null;
  if (near !== peeked) {
    if (peeked) peeked.classList.remove("peek");
    peeked = near;
    if (near) {
      near.classList.toggle("peek-prev", z.side === "l");
      near.classList.add("peek");
    }
  }
}
main.addEventListener("pointerleave", clearPeek);

// ホイールは、1回の動きで1回めくる（トラックパッドの惰性で何枚もめくれないように）
let wheelAcc = 0, wheelLast = 0, wheelUsed = false;
window.addEventListener("wheel", (e) => {
  if (e.ctrlKey) return;
  const tall = e.target.closest && e.target.closest(".pg.tall .pg-body");
  if (tall) return;
  e.preventDefault();
  const now = performance.now();
  if (now - wheelLast > 240) { wheelAcc = 0; wheelUsed = false; }
  wheelLast = now;
  if (wheelUsed || busy) return;
  wheelAcc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (Math.abs(wheelAcc) > 36) {
    wheelUsed = true;
    flip(at + (wheelAcc > 0 ? 1 : -1));
  }
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest && e.target.closest("input, textarea, select")) return;
  const k = e.key;
  if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); flip(at + 1); }
  else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); flip(at - 1); }
  else if (k === "Home") { e.preventDefault(); flip(0); }
  else if (k === "End") { e.preventDefault(); flip(count() - 1); }
});

prevBtn.addEventListener("click", () => flip(at - 1));
nextBtn.addEventListener("click", () => flip(at + 1));

// 目次や「実績を読む」などのページ内リンクは、そのページまでめくる
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a || !html.classList.contains("paged")) return;
  const id = a.getAttribute("href").slice(1);
  if (!document.getElementById(id)) return;
  e.preventDefault();
  goToSection(id);
});

/* ---------- 右上の紋章 ---------- */
document.body.append(aside);
if (fine) plate.classList.add("can-drag");
// 押しただけなら目次へ。ドラッグは回す（sigil.js）
let press = null;
plate.addEventListener("pointerdown", (e) => { press = { x: e.clientX, y: e.clientY }; });
plate.addEventListener("pointerup", (e) => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) goToSection("toc");
  press = null;
});
plate.setAttribute("title", "目次へ");

/* ---------- 世界の切り替え（main.js）に、いま読んでいる章を教える ---------- */
window.worldReadingSection = () => {
  const shown = [L(at), R(at)].filter((p) => p && !p.classList.contains("blank"));
  return shown.length ? shown[shown.length - 1].dataset.section : "top";
};

/* ---------- 組み立てる ---------- */
// いま見ているページの最初の中身を覚えておき、割り付け直したあともそこを開く
function anchor() {
  const pg = mode === "spread" ? L(at) : R(at);
  if (!pg || pg.classList.contains("blank")) return null;
  for (const el of pg.querySelectorAll(".pg-body *")) {
    if (!el.classList.contains("cont") && !kids.has(el)) return el;
  }
  return null;
}

function build(keep) {
  measure();
  paginate();
  let s = 0;
  if (keep && keep.isConnected) s = atOfPage(pages.indexOf(keep.closest(".pg")));
  show(s, false);
}

// 割り付け直すとき（画面の大きさが変わった、遅れて書体が届いた）は、文字を集め直さずにそのまま出す
let resizeTimer = 0;
function rebuild() {
  if (drag && drag.started) return;
  if (busy) { setTimeout(rebuild, 200); return; }
  const keep = anchor();
  build(keep);
}

function fallback(err) {
  // 割り付けに失敗したら、元の縦に読む本に戻す
  console.error(err);
  html.classList.remove("paged", "paging");
  main.className = "page page-left";
  deskbar.remove();
  tops.forEach(restore);
  main.replaceChildren(...tops);
  settle();
  layer.remove();
}

// 書体が届くのを待つ（届かなくても 1.5 秒で先へ進む）
const fontsSettled = () =>
  document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();

// 遅れて届いた書体で割り付け直すのは、めくりや文字の集まりが終わってから
function rebuildWhenIdle() {
  clearTimeout(resizeTimer);
  const tryIt = () => {
    if (busy || running.size || (drag && drag.started)) { resizeTimer = setTimeout(tryIt, 300); return; }
    rebuild();
  };
  resizeTimer = setTimeout(tryIt, 180);
}

(async () => {
  try {
    window.scrollTo(0, 0);
    // 書体が届く前に割り付けると、届いた後に文字の幅が変わってページからあふれる。届くまで本は伏せておく
    html.classList.add("paged", "paging");
    main.className = "pages";
    body.append(deskbar, layer);
    await fontsSettled();
    measure();
    paginate();
    // 割り付けたことで、太字や斜体など、まだ使っていなかった書体の読み込みが始まることがある。届いたら割り付け直す
    for (let k = 0; k < 3 && document.fonts && document.fonts.status === "loading"; k++) {
      await fontsSettled();
      measure();
      paginate();
    }
    const resume = window.worldResume || location.hash.slice(1);
    let s = 0;
    if (resume && sectionPage[resume] !== undefined) s = atOfPage(sectionPage[resume]);
    html.classList.remove("paging");
    show(s, true);
    if (document.fonts) document.fonts.addEventListener("loadingdone", rebuildWhenIdle);
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 180);
    });
  } catch (err) {
    fallback(err);
  }
})();

// 紋章は three.js を読み込むので重い。文字の準備を先に済ませてから読む
import("../sigil.js");
