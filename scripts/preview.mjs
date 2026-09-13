// 在无头浏览器里以小米 17 Pro Max 的视口参数(400×869 逻辑像素,3x,对应 1200×2608 物理)
// 预览适配后的 app,自动截图:主界面 / 搜索 / 筛选 / 动作详情弹窗 / 语言切换。输出到 preview/。
// 用法:先启动本地服务(python -m http.server 8642 -d www),再 node scripts/preview.mjs
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "preview");
mkdirSync(outDir, { recursive: true });

const URL = process.env.PREVIEW_URL || "http://localhost:8642/index.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const edgePath = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(p => existsSync(p));
if (!edgePath) throw new Error("未找到 Edge 浏览器");

const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 400, height: 869, deviceScaleFactor: 3 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector(".exercise-card", { timeout: 60000 });
await sleep(1200); // 等首屏缩略图

const shot = async name => {
  await page.screenshot({ path: join(outDir, name) });
  console.log("✓", name);
};

// 1. 主界面
await shot("01-主界面.png");

// 2. 搜索「杠铃」
await page.type("#search", "杠铃", { delay: 30 });
await sleep(700); // 输入防抖 250ms + 渲染
await shot("02-搜索杠铃.png");

// 3. 清空搜索,点选分类「胸部」+ 器械「杠铃」
await page.click("#search-clear");
await sleep(500);
await page.evaluate(() => {
  for (const label of ["胸部", "杠铃"]) {
    const chip = [...document.querySelectorAll(".chip")].find(c => c.textContent === label);
    if (chip) chip.click();
  }
});
await sleep(600);
await shot("03-筛选胸部杠铃.png");

// 4. 打开第一个动作的详情弹窗(默认简体中文步骤)
await page.evaluate(() => {
  // 清除筛选,回到全量列表
  const clear = document.querySelector(".clear-all");
  if (clear) clear.click();
});
await sleep(400);
await page.click(".exercise-card");
await page.waitForSelector("#modal-overlay.open", { timeout: 10000 });
await sleep(1500); // 等 GIF 加载
await shot("04-动作详情.png");

// 5. 弹窗内切到英文标签,验证语言切换
await page.evaluate(() => {
  const tab = [...document.querySelectorAll(".lang-tab")].find(t => t.textContent === "English");
  if (tab) tab.click();
});
await sleep(300);
await shot("05-语言切换英文.png");

await browser.close();
console.log("全部截图完成 →", outDir);
