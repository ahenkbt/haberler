/**
 * Su Haber şablon artığı menü/marka izlerini temizler.
 * Usage: pnpm --filter @workspace/api-server exec tsx ./scripts/repair-stale-su-brand.ts [--dry-run] [--site-id=2]
 */
import { repairStaleSuBrandOnHmSites } from "../src/lib/hm-stale-su-brand-repair.js";
import { ensureHmNewsSiteWritableColumns } from "../src/lib/hm-site-compat.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const siteArg = process.argv.find((a) => a.startsWith("--site-id="));
  const siteId = siteArg ? Number(siteArg.split("=")[1]) : undefined;
  await ensureHmNewsSiteWritableColumns();
  const result = await repairStaleSuBrandOnHmSites({
    dryRun,
    siteIds: siteId && Number.isFinite(siteId) ? [siteId] : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
