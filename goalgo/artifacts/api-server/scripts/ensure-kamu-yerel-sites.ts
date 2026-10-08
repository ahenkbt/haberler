/**
 * turkatahaber.com & yerel.net.tr — Cumha kamu-yerel seed.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:kamu-yerel
 *   DRY_RUN=1 … (katalog özeti; DB gerekmez)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKamuYerelLayoutJson,
  KAMU_YEREL_SITES,
  TURKATAHABER_DOMAIN,
  TURKATAHABER_SLUG,
} from "../src/lib/hm-kamu-yerel-sites.js";
import { buildKamuYerelHmNewsSiteRssFeedRows } from "../src/lib/hm-cumha-kamu-yerel-catalog.js";

async function main() {
  if (process.env.DRY_RUN === "1") {
    const layout = buildKamuYerelLayoutJson(KAMU_YEREL_SITES[0]!);
    console.log(
      JSON.stringify(
        {
          slugs: KAMU_YEREL_SITES.map((s) => s.slug),
          domains: KAMU_YEREL_SITES.map((s) => s.domain),
          rssRowCount: buildKamuYerelHmNewsSiteRssFeedRows().length,
          sample: { slug: TURKATAHABER_SLUG, domain: TURKATAHABER_DOMAIN, mansetCategorySlug: layout.mansetCategorySlug },
        },
        null,
        2,
      ),
    );
    return;
  }
  const { ensureKamuYerelSites } = await import("../src/lib/hm-kamu-yerel-seed.js");
  const { mirrorHmSiteLayoutJsonToPhpNeon } = await import("../src/lib/hm-php-layout-sync.js");
  const row = await ensureKamuYerelSites();
  for (const site of row.sites) {
    if (!site.siteId) continue;
    const def = KAMU_YEREL_SITES.find((s) => s.slug === site.slug);
    if (!def) continue;
    const layoutJson = JSON.stringify(buildKamuYerelLayoutJson(def));
    const mirror = await mirrorHmSiteLayoutJsonToPhpNeon(site.siteId, layoutJson).catch((err: unknown) => ({
      mirrored: false,
      reason: err instanceof Error ? err.message : String(err),
    }));
    console.log("[ensure:kamu-yerel] php layout mirror", { slug: site.slug, siteId: site.siteId, ...mirror });
  }
  console.log(JSON.stringify(row, null, 2));
  if (row.sites.some((s) => s.action === "error")) process.exitCode = 1;
  if (!process.env.NEWS_DATABASE_URL?.trim()) return;
  const { spawnSync } = await import("node:child_process");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  for (const site of row.sites) {
    if (!site.siteId) continue;
    const sync = spawnSync(
      process.execPath,
      ["--import", "tsx", "./scripts/sync-php-neon-news.ts", "--apply", `--site-id=${site.siteId}`, "--batch=200"],
      { cwd: scriptDir, stdio: "inherit" },
    );
    if (sync.status !== 0) process.exitCode = sync.status ?? 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
