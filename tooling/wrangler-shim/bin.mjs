#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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
  const fromCwd = join(process.cwd(), "scripts", "cf-dns-cutover.mjs");
  const fromShim = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "cf-dns-cutover.mjs");
  const cutover = existsSync(fromCwd) ? fromCwd : fromShim;
  if (!existsSync(cutover)) {
    console.warn("[wrangler-shim] DNS cutover script not found (non-fatal):", fromCwd, fromShim);
  } else {
    const cut = spawnSync(process.execPath, [cutover], { stdio: "inherit", env: process.env });
    if ((cut.status ?? 1) !== 0) {
      console.warn("[wrangler-shim] DNS cutover script failed (non-fatal for Worker deploy)");
    }
  }
}

process.exit(0);
