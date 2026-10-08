/**
 * turkatahaber.com & yerel.net.tr — Cumha kamu-yerel seed.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run ensure:kamu-yerel
 *   DRY_RUN=1 … (katalog özeti; DB gerekmez)
 *
 * Ops (canlı onarım):
 *   SYNC_PHP_LAYOUT=1 … — twilight-pine layout + kategori aynası (--layout-only)
 *   RUN_RSS_CAMPAIGN=1 … — turkata Cumha kampanyasını bir kez çalıştır
 *   RSS_CAMPAIGN_ID=1021 … — belirli kampanya id (yoksa seed dönen id)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  buildKamuYerelLayoutJson,
  KAMU_YEREL_SITES,
  TURKATAHABER_DOMAIN,
  TURKATAHABER_SLUG,
} from "../src/lib/hm-kamu-yerel-sites.js";
import { buildKamuYerelHmNewsSiteRssFeedRows } from "../src/lib/hm-cumha-kamu-yerel-catalog.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

async function maybeSyncPhpLayout(siteIds: number[]) {
  if (process.env.SYNC_PHP_LAYOUT !== "1") return;
  if (!process.env.NEWS_DATABASE_URL?.trim()) {
    console.warn("[ensure:kamu-yerel] SYNC_PHP_LAYOUT=1 ama NEWS_DATABASE_URL yok — atlandı");
    return;
  }
  for (const siteId of siteIds) {
    if (!siteId) continue;
    const sync = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(scriptDir, "sync-php-neon-news.ts"),
        "--apply",
        "--layout-only",
        `--site-id=${siteId}`,
      ],
      { cwd: scriptDir, stdio: "inherit" },
    );
    if (sync.status !== 0) process.exitCode = sync.status ?? 1;
  }
}

async function maybeRunRssCampaign(campaignId: number | null) {
  if (process.env.RUN_RSS_CAMPAIGN !== "1") return;
  const fromEnv = Number(process.env.RSS_CAMPAIGN_ID || "");
  const id = Number.isFinite(fromEnv) && fromEnv > 0 ? Math.trunc(fromEnv) : campaignId;
  if (!id) {
    console.warn("[ensure:kamu-yerel] RUN_RSS_CAMPAIGN=1 ama kampanya id yok");
    return;
  }
  const { executeRssCampaignRun } = await import("../src/lib/rssCampaignRun.js");
  const result = await executeRssCampaignRun(id);
  console.log("[ensure:kamu-yerel] rss campaign", { campaignId: id, ...result });
}

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
  const row = await ensureKamuYerelSites();
  console.log(JSON.stringify(row, null, 2));
  if (row.sites.some((s) => s.action === "error")) process.exitCode = 1;

  const siteIds = row.sites.map((s) => s.siteId).filter((id): id is number => id != null && id > 0);
  await maybeSyncPhpLayout(siteIds);

  const turkataCampaign = row.sites.find((s) => s.slug === TURKATAHABER_SLUG)?.campaignId ?? null;
  await maybeRunRssCampaign(turkataCampaign);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
