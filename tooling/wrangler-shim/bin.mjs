#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const upstreamPkg = dirname(require.resolve("wrangler-upstream/package.json"));
const upstreamBin = join(upstreamPkg, "bin", "wrangler.js");

const args = process.argv.slice(2);
const isDeploy = args[0] === "deploy" || args[0] === "publish";

const result = spawnSync(process.execPath, [upstreamBin, ...args], {
  stdio: "inherit",
  env: process.env,
});

if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

if (isDeploy && !args.includes("--dry-run")) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const cutover = join(root, "scripts", "cf-dns-cutover.mjs");
  const cut = spawnSync(process.execPath, [cutover], { stdio: "inherit", env: process.env });
  if ((cut.status ?? 1) !== 0) {
    console.warn("[wrangler-shim] DNS cutover script failed (non-fatal for Worker deploy)");
  }
  const purge = join(root, "scripts", "cf-purge-hm-cache.mjs");
  const pur = spawnSync(process.execPath, [purge], { stdio: "inherit", env: process.env });
  if ((pur.status ?? 1) !== 0) {
    console.warn("[wrangler-shim] HM cache purge script failed (non-fatal)");
  }
  const fixDns = join(root, "scripts", "cf-fix-originless-dns.mjs");
  const fix = spawnSync(process.execPath, [fixDns], { stdio: "inherit", env: process.env });
  if ((fix.status ?? 1) !== 0) {
    console.warn("[wrangler-shim] originless DNS fix failed (non-fatal)");
  }
}

process.exit(0);
