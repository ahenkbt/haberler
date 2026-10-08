/**
 * Dünya Sağlık logoUrl/faviconUrl onarımı (panel Neon + PHP sync).
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:dunyasaglik-logo
 *   DRY_RUN=1 … (yalnızca katalog)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyDunyaSaglikLogoToLayout,
  listDunyaSaglikDomains,
  DUNYASAGLIK_DOMAIN,
  DUNYASAGLIK_FAVICON_PATH,
  DUNYASAGLIK_LOGO_PATH,
  DUNYASAGLIK_SLUG,
} from "../src/lib/hm-dunyasaglik-site.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const { layout } = applyDunyaSaglikLogoToLayout({});
    console.log(
      JSON.stringify(
        {
          slug: DUNYASAGLIK_SLUG,
          domain: DUNYASAGLIK_DOMAIN,
          domains: listDunyaSaglikDomains(),
          logoUrl: DUNYASAGLIK_LOGO_PATH,
          faviconUrl: DUNYASAGLIK_FAVICON_PATH,
          layoutSample: layout,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { ensureDunyaSaglikLogo } = await import("../src/lib/hm-dunyasaglik-logo-repair.js");
  const row = await ensureDunyaSaglikLogo();
  console.log(JSON.stringify(row, null, 2));
  if (row.action === "error" || row.action === "missing") process.exitCode = 1;

  if (row.siteId && process.env.NEWS_DATABASE_URL?.trim() && !row.phpMirrored) {
    const { spawnSync } = await import("node:child_process");
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
