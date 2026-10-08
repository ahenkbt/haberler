/**
 * turkatahaber.com canlı onarım — kamu-yerel seed, PHP Neon layout, isteğe bağlı RSS + kapak backfill.
 *
 *   cd goalgo && SYNC_PHP_LAYOUT=1 RUN_RSS_CAMPAIGN=1 RSS_CAMPAIGN_ID=1021 \
 *     pnpm --filter @workspace/api-server run ensure:turkata-live
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { wakeTurkatahaberCatalogRepair } from "../src/lib/hm-turkatahaber-repair.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function syncPhpNewsFull(siteSlug: string) {
  if (!process.env.NEWS_DATABASE_URL?.trim()) {
    console.warn("[ensure:turkata-live] NEWS_DATABASE_URL yok — PHP news sync atlandı");
    return;
  }
  const sync = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(scriptDir, "sync-php-neon-news.ts"),
      "--apply",
      `--site-slug=${siteSlug}`,
      "--batch=200",
    ],
    { cwd: scriptDir, stdio: "inherit" },
  );
  if (sync.status !== 0) process.exitCode = sync.status ?? 1;
}

async function main() {
  process.env.SYNC_PHP_LAYOUT = process.env.SYNC_PHP_LAYOUT ?? "1";
  const { seed, layoutMirror } = await wakeTurkatahaberCatalogRepair();
  console.log(JSON.stringify({ seed, layoutMirror }, null, 2));
  if (seed.sites.some((s) => s.action === "error")) process.exitCode = 1;

  if (process.env.RUN_RSS_CAMPAIGN === "1") {
    const fromEnv = Number(process.env.RSS_CAMPAIGN_ID || "");
    const turkata = seed.sites.find((s) => s.slug === "turkatahaber");
    const id =
      Number.isFinite(fromEnv) && fromEnv > 0 ? Math.trunc(fromEnv) : (turkata?.campaignId ?? null);
    if (id) {
      const { executeRssCampaignRun } = await import("../src/lib/rssCampaignRun.js");
      // forceHmSiteId=panel id so legacy campaign hmSiteIds=[230] still publish to 1132.
      const forceHmSiteId = turkata?.siteId ?? undefined;
      const result = await executeRssCampaignRun(id, forceHmSiteId ? { forceHmSiteId } : undefined);
      console.log("[ensure:turkata-live] rss", { campaignId: id, forceHmSiteId, ...result });
<<<<<<< HEAD
    }
  }

  // Full news mirror (orphan 230→1132 rebound + category_slug edge upsert) so PHP
  // /kategori pages fill even when the campaign only skipped already-ingested items.
  syncPhpNewsFull("turkatahaber");

  if (process.env.BACKFILL_RSS_COVERS !== "0") {
    const cover = spawnSync(
      process.execPath,
      ["--import", "tsx", path.join(scriptDir, "backfill-turkata-rss-covers.ts"), "--apply", "--limit=80"],
      { cwd: scriptDir, stdio: "inherit", env: process.env },
    );
    if (cover.status !== 0) {
      console.warn("[ensure:turkata-live] cover backfill exit", cover.status);
=======
>>>>>>> origin/main
    }
  }

  // Full news mirror (orphan 230→1132 rebound + category_slug edge upsert) so PHP
  // /kategori pages fill even when the campaign only skipped already-ingested items.
  syncPhpNewsFull("turkatahaber");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
