/**
 * Günlük: Cumha RSS kampanyaları (turkata + yerel) + ağ senkronu + isteğe bağlı PHP Neon.
 *
 *   cd goalgo && pnpm --filter @workspace/api-server run run:kamu-yerel-rss-daily
 *   SKIP_ENSURE=1 SKIP_SYNDICATE=1 SKIP_PHP_SYNC=1 …
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNewsDbForRead, rssCampaignsTable } from "@workspace/db";
import { KAMU_YEREL_CAMPAIGN_TAG } from "../src/lib/hm-kamu-yerel-sites.js";
import { executeRssCampaignRun } from "../src/lib/rssCampaignRun.js";

function shouldRunStep(skipEnv: string): boolean {
  const v = String(process.env[skipEnv] ?? "").trim().toLowerCase();
  return v !== "1" && v !== "true";
}

async function findKamuYerelCampaignIds(): Promise<number[]> {
  const rows = await getNewsDbForRead().select({ id: rssCampaignsTable.id, tags: rssCampaignsTable.tags }).from(rssCampaignsTable);
  const tag = KAMU_YEREL_CAMPAIGN_TAG.toLowerCase();
  return rows
    .filter((r) => {
      const tags = Array.isArray(r.tags) ? r.tags.map((t) => String(t).toLowerCase()) : [];
      return tags.includes(tag);
    })
    .map((r) => r.id);
}

async function main() {
  const summary: Record<string, unknown> = {};

  if (shouldRunStep("SKIP_ENSURE")) {
    const { ensureKamuYerelSites } = await import("../src/lib/hm-kamu-yerel-seed.js");
    summary.ensure = await ensureKamuYerelSites();
  } else {
    summary.ensure = { skipped: true };
  }

  const campaignIds = await findKamuYerelCampaignIds();
  const runs: Array<{ campaignId: number; result: Awaited<ReturnType<typeof executeRssCampaignRun>> }> = [];
  for (const campaignId of campaignIds) {
    runs.push({ campaignId, result: await executeRssCampaignRun(campaignId) });
  }
  summary.campaignIds = campaignIds;
  summary.rssRuns = runs;

  if (shouldRunStep("SKIP_SYNDICATE")) {
    const { syndicateKamuYerelNewsToNetwork } = await import("../src/lib/hm-kamu-yerel-syndicate.js");
    summary.syndicate = await syndicateKamuYerelNewsToNetwork();
  } else {
    summary.syndicate = { skipped: true };
  }

  console.log(JSON.stringify(summary, null, 2));

  // Soft-fail for cron: feed-level errors with skips/upgrades are expected (stale URLs,
  // already-ingested items). Only hard-fail when a campaign produced zero progress.
  const hardRssFail = runs.some((r) => {
    const { errors, added, skipped, upgraded } = r.result;
    if (errors <= 0) return false;
    const progressed = added > 0 || skipped > 0 || upgraded > 0;
    return !progressed;
  });
  if (hardRssFail) process.exitCode = 1;

  if (!shouldRunStep("SKIP_PHP_SYNC")) return;
  if (!process.env.NEWS_DATABASE_URL?.trim()) return;

  // Always sync by slug: SKIP_ENSURE leaves siteIds empty, and --site-id=230 (PHP)
  // reads the wrong panel row (Worker id is 1132 for turkatahaber).
  const slugs = new Set<string>(["turkatahaber", "yerelnet"]);
  const ensureSites = summary.ensure as { sites?: Array<{ slug?: string | null }> };
  for (const s of ensureSites.sites ?? []) {
    const slug = String(s.slug ?? "")
      .trim()
      .toLowerCase();
    if (slug) slugs.add(slug);
  }
  const { spawnSync } = await import("node:child_process");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  for (const siteSlug of slugs) {
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
