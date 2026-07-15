/**
 * Cloudflare Workers Builds runs only: pnpm install → npx wrangler deploy
 * Dashboard build command is empty and [build] in wrangler.toml is ignored.
 * When WORKERS_CI=1, build the SPA during postinstall so assets exist before deploy.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const onWorkersCi =
  process.env.WORKERS_CI === "1" ||
  process.env.WORKERS_CI === "true" ||
  process.env.CF_PAGES === "1" ||
  process.env.CI === "true";
const force = process.env.CF_FORCE_POSTINSTALL_BUILD === "1";

// Yerel `pnpm install` sırasında ağır SPA build çalıştırma
if (!onWorkersCi && !force) {
  process.exit(0);
}

const marker = join("artifacts", "ahenkpress", "dist", "public", "index.html");
if (existsSync(marker) && !force) {
  console.log("cf-workers-ci-prepare: assets already present");
  process.exit(0);
}

console.log("cf-workers-ci-prepare: building SPA for Workers Builds…");
const r = spawnSync("node", ["scripts/cloudflare-root-build.mjs"], {
  stdio: "inherit",
  env: { ...process.env, NPM_CONFIG_PRODUCTION: "false", API_ORIGIN: process.env.API_ORIGIN ?? "" },
});
process.exit(r.status ?? 1);
