/**
 * Cloudflare Assets publish dir must contain the nested Yektube SPA.
 * Vite copies public/yektube-v2 → dist/public, but a missed copy + SPA
 * fallback makes the Worker proxy /yektube-v2/index.html to the API
 * Container (Express: Cannot GET). Overlay from git-tracked public/ and fail
 * the build if the hashed JS is absent.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export function isYektubeIndexHtml(html) {
  const s = String(html || "");
  return /yektube-v2\/assets\//i.test(s) || /<title>\s*Yektube\s*<\/title>/i.test(s);
}

export function yektubeIndexScriptSrc(html) {
  const m = String(html || "").match(/src="(\/yektube-v2\/assets\/index-[^"]+\.js)"/);
  return m ? m[1] : null;
}

function readIfFile(path) {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function resolveYektubeSrcDir(candidates) {
  for (const dir of candidates) {
    const html = readIfFile(join(dir, "index.html"));
    if (!html || !isYektubeIndexHtml(html)) continue;
    const scriptSrc = yektubeIndexScriptSrc(html);
    if (!scriptSrc) continue;
    const scriptRel = scriptSrc.replace(/^\/yektube-v2\//, "");
    if (existsSync(join(dir, scriptRel))) return dir;
  }
  return null;
}

export function writeAssetsIgnore(destDir) {
  mkdirSync(destDir, { recursive: true });
  writeFileSync(
    join(destDir, ".assetsignore"),
    [
      "# Publish root — do not inherit repo /artifacts/ gitignore.",
      ".DS_Store",
      "_redirects",
      "",
    ].join("\n"),
    "utf8",
  );
}

/**
 * @param {string} destDir wrangler [assets] directory (artifacts/ahenkpress/dist/public)
 * @param {string[]} srcCandidates directories that already contain Yektube SPA files
 */
export function ensureYektubeCloudflareAssets(destDir, srcCandidates) {
  const destYektube = join(destDir, "yektube-v2");
  const destIndex = join(destYektube, "index.html");
  const destHtml = readIfFile(destIndex);
  const destScript = destHtml ? yektubeIndexScriptSrc(destHtml) : null;
  const destComplete =
    Boolean(destHtml) &&
    isYektubeIndexHtml(destHtml) &&
    Boolean(destScript) &&
    existsSync(join(destDir, String(destScript).replace(/^\//, "")));
  if (!destComplete) {
    const src = resolveYektubeSrcDir(srcCandidates);
    if (!src) {
      throw new Error(
        "Yektube SPA missing: no yektube-v2/index.html in dist or public. Run build:web:full.",
      );
    }
    rmSync(destYektube, { recursive: true, force: true });
    mkdirSync(dirname(destYektube), { recursive: true });
    cpSync(src, destYektube, { recursive: true });
  }

  const html = readIfFile(destIndex);
  if (!html || !isYektubeIndexHtml(html)) {
    throw new Error("Yektube SPA copy failed: dest yektube-v2/index.html is not Yektube HTML.");
  }
  const scriptSrc = yektubeIndexScriptSrc(html);
  if (!scriptSrc) {
    throw new Error("Yektube SPA index.html has no /yektube-v2/assets/index-*.js script.");
  }
  const scriptFile = join(destDir, scriptSrc.replace(/^\//, ""));
  if (!existsSync(scriptFile)) {
    throw new Error(`Yektube SPA JS missing in Assets dir: ${scriptSrc}`);
  }
  writeAssetsIgnore(destDir);
  return { scriptSrc, destIndex };
}
