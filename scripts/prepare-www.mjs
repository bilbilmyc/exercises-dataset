// Copy the static site and media into www/, which Capacitor bundles into the APK.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const www = join(root, "www");
mkdirSync(www, { recursive: true });

for (const item of ["index.html", "setup.html", "data", "images", "videos"]) {
  cpSync(join(root, item), join(www, item), { recursive: true });
}

console.log("www/ ready: index.html, setup.html, data, images, videos");
