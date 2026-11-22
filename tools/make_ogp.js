// URL を貼ったときのカード画像（1200×630）を tools/ogp.html から撮って images/ogp.png にする。
// 使い方: リポジトリの直下で `python3 -m http.server 8766` を動かしてから `node tools/make_ogp.js`（要 Playwright）
const { chromium } = require("playwright");

const BASE = process.env.OGP_BASE || "http://localhost:8766";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/tools/ogp.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "images/ogp.png" });
  console.log("wrote images/ogp.png");
  await browser.close();
})();
