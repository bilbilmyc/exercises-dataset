// 构建 www/ 目录:把仓库原版 index.html 转换为「中文 + app 化」版本,并拷贝媒体资源。
// 仓库根目录的 index.html / data / images / videos 始终保持原样,转换只发生在 www/。
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const www = join(root, "www");
const appDir = join(root, "app");

// ── 0. 重建 www/ ──────────────────────────────────
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

let html = readFileSync(join(root, "index.html"), "utf-8");
const dict = JSON.parse(readFileSync(join(appDir, "zh-dict.json"), "utf-8"));

// ── 1. 数据中文化:部位/器械/目标肌群等枚举值 ──────
const startMarker = "const EXERCISES = ";
const start = html.indexOf(startMarker);
const arrStart = html.indexOf("[", start);
const stateIdx = html.indexOf("// ── State", start);
const arrEnd = html.lastIndexOf("];", stateIdx);
if (start < 0 || arrStart < 0 || stateIdx < 0 || arrEnd < 0) {
  throw new Error("未定位到 EXERCISES 数据数组,页面结构可能已变化");
}
const data = JSON.parse(html.slice(arrStart, arrEnd + 1));
const valueFields = ["category", "body_part", "equipment", "target", "muscle_group"];
const unknown = new Set();
let translated = 0;
for (const ex of data) {
  for (const f of valueFields) {
    const v = ex[f];
    if (v && dict[v]) { ex[f] = dict[v]; translated++; }
    else if (v) unknown.add(v);
  }
  if (Array.isArray(ex.secondary_muscles)) {
    ex.secondary_muscles = ex.secondary_muscles.map(m => {
      if (dict[m]) { translated++; return dict[m]; }
      unknown.add(m);
      return m;
    });
  }
}
if (unknown.size > 0) {
  throw new Error("以下数据值缺少中文映射,请补充 app/zh-dict.json: " + [...unknown].join(", "));
}
html = html.slice(0, start) + "const EXERCISES = " + JSON.stringify(data) + html.slice(arrEnd + 2);

// ── 2. 界面文字中文化(逐项断言,防止源页面改版后悄悄失效)──
function replaceOnce(html, from, to) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`替换目标应出现 1 次,实际 ${count} 次: ${from.slice(0, 60)}`);
  return html.replace(from, to);
}

// HTML 部分
html = replaceOnce(html, '<title>Exercise Library</title>', '<title>哈哈健身</title>');
html = replaceOnce(html, 'width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
html = replaceOnce(html, 'Exercise<span>DB</span>', '哈哈<span>健身</span>');
html = replaceOnce(html, '<div class="filter-summary">Category</div>', '<div class="filter-summary">分类</div>');
html = replaceOnce(html, '<div class="filter-summary">Equipment</div>', '<div class="filter-summary">器械</div>');
html = replaceOnce(html, '<div class="filter-summary">Target Muscle</div>', '<div class="filter-summary">目标肌群</div>');
html = replaceOnce(html, 'placeholder="Search exercises…"', 'placeholder="搜索动作…"');

// 移除侧边栏 DB Setup 入口(target="_blank" 在 WebView 中会唤起外部浏览器)
const anchorRe = /<a class="db-setup-btn"[\s\S]*?<\/a>\s*/;
if (!anchorRe.test(html)) throw new Error("未找到 db-setup-btn 入口");
html = html.replace(anchorRe, "");

// 移除整个 Database Setup 开发者弹窗(与 app 无关)
const overlayRe = /<!-- DB Setup Overlay -->[\s\S]*?<!-- Modal -->/;
if (!overlayRe.test(html)) throw new Error("未找到 DB Setup 弹窗区块");
html = html.replace(overlayRe, "<!-- Modal -->");

// JS 部分
html = replaceOnce(html, "'<p>🔍</p><p>No exercises found</p>'", "'<p>🔍</p><p>没有找到匹配的动作</p>'");
html = replaceOnce(html, "`${all.toLocaleString()} exercises`", "`${all.toLocaleString()} 个动作`");
html = replaceOnce(html, "`${total.toLocaleString()} of ${all.toLocaleString()} exercises`", "`${total.toLocaleString()} / ${all.toLocaleString()} 个动作`");
html = replaceOnce(html, "`+${rest.length} more`", "`更多 ${rest.length} 项`");
html = replaceOnce(html, "textContent = 'Clear all'", "textContent = '清除全部'");
html = replaceOnce(html, "{ label: 'Body Part',", "{ label: '部位',");
html = replaceOnce(html, "{ label: 'Equipment',", "{ label: '器械',");
html = replaceOnce(html, "{ label: 'Target',", "{ label: '目标',");
html = replaceOnce(html, "textContent = 'Muscles'", "textContent = '肌群'");
html = replaceOnce(html, "makeMuscleGroup('Primary',", "makeMuscleGroup('主要',");
html = replaceOnce(html, "makeMuscleGroup('Secondary',", "makeMuscleGroup('次要',");
html = replaceOnce(html, "textContent = 'Instructions'", "textContent = '动作步骤'");
// 默认语言:中文 tab 排第一(用户仍可切换其他语言)
html = replaceOnce(html, "['en', 'es', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko', 'fr']", "['zh', 'en', 'es', 'it', 'tr', 'ru', 'hi', 'pl', 'ko', 'fr']");

// ── 3. 移除 DB Setup 的 JS 逻辑(随 HTML 一并下线)──
const dbJsRe = /\r?\n {2}\/\/ ═+\r?\n {2}\/\/ ── DB Setup[\s\S]*?(?=<\/script>)/;
if (!dbJsRe.test(html)) throw new Error("未找到 DB Setup 的 JS 段");
html = html.replace(dbJsRe, "\n");

// ── 4. 注入 app 层(原生化样式 + 原生交互脚本)─────
const appCss = readFileSync(join(appDir, "app.css"), "utf-8");
html = replaceOnce(html, "</head>", "<style>\n" + appCss + "\n</style>\n</head>");
html = replaceOnce(html, "</body>", '<script src="app.js"></script>\n</body>');

// ── 5. 落盘 ───────────────────────────────────────
writeFileSync(join(www, "index.html"), html);
cpSync(join(appDir, "app.js"), join(www, "app.js"));
for (const item of ["images", "videos"]) {
  if (existsSync(join(root, item))) cpSync(join(root, item), join(www, item), { recursive: true });
}

console.log(`www/ 就绪:数据已翻译 ${translated} 处,中文界面 + app 层注入完成`);
