/**
 * turkatahaber.com canlı onarım — kamu-yerel seed, PHP Neon layout, isteğe bağlı RSS.
 *
 *   cd goalgo && SYNC_PHP_LAYOUT=1 RUN_RSS_CAMPAIGN=1 RSS_CAMPAIGN_ID=1021 \
 *     pnpm --filter @workspace/api-server run ensure:turkata-live
 */
import { wakeTurkatahaberCatalogRepair } from "../src/lib/hm-turkatahaber-repair.js";

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
      const result = await executeRssCampaignRun(id);
      console.log("[ensure:turkata-live] rss", { campaignId: id, ...result });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
