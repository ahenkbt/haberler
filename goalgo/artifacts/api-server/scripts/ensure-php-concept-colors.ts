/**
 * PHP konsept siteleri — hmPrimaryColor/hmSecondaryColor + PHP Neon sync.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:php-concept-colors
 *   DRY_RUN=1 … (katalog)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HM_PHP_CONCEPT_PALETTES } from "../src/lib/hm-php-concept-colors.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.log(JSON.stringify({ palettes: HM_PHP_CONCEPT_PALETTES }, null, 2));
    return;
  }

  const { ensureAllPhpConceptColors } = await import("../src/lib/hm-php-concept-colors-repair.js");
  const rows = await ensureAllPhpConceptColors();
  console.log(JSON.stringify({ sites: rows }, null, 2));
  if (rows.some((r) => r.action === "error" || r.action === "missing")) {
    process.exitCode = 1;
  }

  const needPhp = rows.filter((r) => r.siteId && !r.phpMirrored && r.action === "updated");
  if (needPhp.length && process.env.NEWS_DATABASE_URL?.trim()) {
    const { spawnSync } = await import("node:child_process");
    for (const row of needPhp) {
      const sync = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          path.join(path.dirname(fileURLToPath(import.meta.url)), "sync-php-neon-news.ts"),
          "--apply",
          `--site-id=${row.siteId}`,
          "--batch=50",
        ],
        { cwd: path.dirname(fileURLToPath(import.meta.url)), stdio: "inherit" },
      );
      if (sync.status !== 0) process.exitCode = sync.status ?? 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
