// どの世界（魔導書・夏の夜・霧の森）を出すかは <head> の小さなスクリプトが決めて、html[data-world] に書いている
const WORLDS = ["grimoire", "night", "mist"];
const world = WORLDS.includes(document.documentElement.dataset.world) ? document.documentElement.dataset.world : "grimoire";

// 経験年数は開始年月から数える。毎年 HTML を書き換えなくても古くならない
const now = new Date();
const monthsSince = (since) => {
  const [y, m = 1] = since.split("-").map(Number);
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
};
document.querySelectorAll("[data-years]").forEach((el) => (el.textContent = Math.floor(monthsSince(el.dataset.years) / 12)));
document.querySelectorAll("[data-nth]").forEach((el) => (el.textContent = Math.floor(monthsSince(el.dataset.nth) / 12) + 1));
document.querySelectorAll(".year").forEach((el) => (el.textContent = now.getFullYear()));

// ---- 世界の切り替え ----
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* 保存できなくても切り替えはできる */ } },
};
const choice = store.get("world-choice");
let randomMode = !WORLDS.includes(choice);
document.querySelectorAll(".worlds button").forEach((b) => {
  const w = b.dataset.world;
  if (w === "random") b.setAttribute("aria-pressed", String(randomMode));
  else b.setAttribute("aria-pressed", String(w === world));
  b.addEventListener("click", () => {
    if (w === "random") {
      if (randomMode) return;
      store.set("world-choice", null);
    } else {
      if (w === world && !randomMode) return;
      store.set("world-choice", w);
      if (w === world) {
        // 見ている世界をそのまま固定するだけなので、読み込み直さない
        document.querySelectorAll(".worlds button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        randomMode = false;
        return;
      }
    }
    leave();
  });
});

// 切り替えても、読んでいた章から続けられるようにする
const SECTIONS = ["top", "toc", "strengths", "works", "principles", "skills", "history", "about", "contact"];
function readingSection() {
  // ページをめくる世界（魔導書）は、自分で開いているページの章を答える
  if (typeof window.worldReadingSection === "function") return window.worldReadingSection();
  let id = "top";
  for (const s of SECTIONS) {
    const el = document.getElementById(s);
    if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) id = s;
  }
  return id;
}
function leave() {
  try { sessionStorage.setItem("world-section", readingSection()); } catch { /* なくても困らない */ }
  document.documentElement.classList.add("leaving");
  setTimeout(() => location.reload(), 380);
}
let resume = null;
try { resume = sessionStorage.getItem("world-section"); sessionStorage.removeItem("world-section"); } catch { /* なくても困らない */ }
// 魔導書はスクロールせずページをめくる本なので、どの章から開くかは grimoire.js に渡す
window.worldResume = resume;
if (resume && resume !== "top" && world !== "grimoire") {
  const go = () => document.getElementById(resume)?.scrollIntoView({ behavior: "instant", block: "start" });
  go();
  if (document.fonts) document.fonts.ready.then(go);
}

import(`./worlds/${world}.js`);
