import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const goalgoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(goalgoRoot, "artifacts/yektube-web/dist/index.html");
const publicIndex = path.join(goalgoRoot, "artifacts/ahenkpress/public/yektube-v2/index.html");

function scriptSrc(html) {
  const m = html.match(/src="(\/yektube-v2\/assets\/index-[^"]+\.js)"/);
  return m ? m[1] : null;
}

function gitRepoRoot() {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: goalgoRoot,
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim() : goalgoRoot;
}

function gitShow(repoRoot, relative) {
  const r = spawnSync("git", ["show", `HEAD:${relative}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout;
}

const ci = process.env.CI === "true" || process.env.CI === "1";
if (!ci && process.env.VERIFY_YEKTUBE_GIT_ARTIFACTS !== "1") {
  process.exit(0);
}

if (!fs.existsSync(distIndex)) {
  console.error("[verify-yektube-git-artifacts] Run build:yektube first.");
  process.exit(1);
}

const repoRoot = gitRepoRoot();
const repoRelative = path.relative(repoRoot, publicIndex).replace(/\\/g, "/");

const builtHtml = fs.readFileSync(distIndex, "utf8");
const builtSrc = scriptSrc(builtHtml);
const committedHtml = gitShow(repoRoot, repoRelative);
const committedSrc = committedHtml ? scriptSrc(committedHtml) : null;

if (!builtSrc) {
  console.error("[verify-yektube-git-artifacts] Could not parse dist/index.html");
  process.exit(1);
}

if (committedSrc && committedSrc !== builtSrc) {
  console.error(
    `[verify-yektube-git-artifacts] Git commits ${committedSrc} but this runner builds ${builtSrc}.`,
  );
  console.error(
    "Sync goalgo/artifacts/ahenkpress/public/yektube-v2 from ubuntu-latest CI (same as Vercel).",
  );
  process.exit(1);
}

console.log(`[verify-yektube-git-artifacts] OK ${path.basename(builtSrc)}`);