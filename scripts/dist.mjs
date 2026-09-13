// 构建完成后,把 APK 以「应用名-v版本号.apk」复制到 dist/,并清理 dist 里的旧版本。
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const { appName } = JSON.parse(readFileSync(join(root, "capacitor.config.json"), "utf-8"));

const src = join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
if (!existsSync(src)) {
  throw new Error("未找到构建产物,请先执行 gradlew assembleDebug");
}

const distDir = join(root, "dist");
mkdirSync(distDir, { recursive: true });
for (const f of readdirSync(distDir)) {
  if (f.endsWith(".apk")) rmSync(join(distDir, f)); // 只保留最新版本
}

const dest = join(distDir, `${appName}-v${version}.apk`);
copyFileSync(src, dest);
console.log(`dist → ${appName}-v${version}.apk`);
