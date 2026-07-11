/**
 * Yektube v2 build çıktısını Yekpare static public klasörüne kopyalar.
 * Vercel / production build: önce `pnpm run build:yektube`, sonra bu script, sonra `build:web`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "artifacts/yektube-web/dist");
const dest = path.join(root, "artifacts/ahenkpress/public/yektube-v2");

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const p = path.join(target, entry.name);
    if (entry.isDirectory()) rmrf(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(target);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(src)) {
  console.error("[copy-yektube-build] Önce pnpm run build:yektube çalıştırın.");
  process.exit(1);
}

rmrf(dest);
copyDir(src, dest);
console.log(`[copy-yektube-build] ${src} → ${dest}`);
