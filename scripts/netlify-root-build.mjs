import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
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
run("pnpm", ["run", "build:netlify"], goalgo);

rmSync(distDest, { recursive: true, force: true });
mkdirSync(distDest, { recursive: true });
cpSync(distSrc, distDest, { recursive: true });

console.log(`netlify-root-build ok → ${distDest}`);
