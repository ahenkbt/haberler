import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const goalgo = "goalgo";
const distSrc = join(goalgo, "artifacts/ahenkpress/dist/public");
const distDest = "artifacts/ahenkpress/dist/public";

function run(cmd, args, cwd = ".") {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd,
    env: process.env,
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 2);
}

run("corepack", ["enable"]);
run("corepack", ["prepare", "pnpm@9.15.5", "--activate"]);

process.env.NPM_CONFIG_PRODUCTION = "false";
run("pnpm", ["install", "--frozen-lockfile", "--prod=false"], goalgo);
run("pnpm", ["run", "build:cloudflare"], goalgo);

rmSync(distDest, { recursive: true, force: true });
mkdirSync(distDest, { recursive: true });
cpSync(distSrc, distDest, { recursive: true });

// Netlify `_redirects` CF Assets'te infinite-loop hatası veriyor (code 100324).
// SPA fallback: wrangler not_found_handling; /yp rewrite: worker.js.
const redirectsPath = join(distDest, "_redirects");
if (existsSync(redirectsPath)) {
  unlinkSync(redirectsPath);
  console.log("cloudflare-root-build: removed _redirects (Worker handles routing)");
}

// Cloudflare Workers Static Assets — SPA fallback /api proxy worker'da; _headers cache yardımcı
writeFileSync(
  join(distDest, "_headers"),
  [
    "/*",
    "  X-Yekpare-Frontend: ahenkpress-cloudflare",
    "  Cache-Control: no-store, max-age=0, must-revalidate",
    "",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/yektube-v2/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/yp/sw.js",
    "  Service-Worker-Allowed: /yp/",
    "",
    "/yektube-v2/sw.js",
    "  Service-Worker-Allowed: /yp/",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`cloudflare-root-build ok → ${distDest}`);
