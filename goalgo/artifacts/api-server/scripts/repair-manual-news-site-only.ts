/**
 * CLI: Manuel HM editör haberlerini site_only yapar; merkez sync / yabancı pool kopyalarını siler.
 *
 *   pnpm --filter @workspace/api-server repair:manual-news-site-only -- --dry-run
 *   pnpm --filter @workspace/api-server repair:manual-news-site-only -- --site-id=7
 *   pnpm --filter @workspace/api-server repair:manual-news-site-only -- --since=2026-07-01
 */
import { parseArgs } from "node:util";
import { repairManualEditorNewsSiteOnly } from "../src/lib/hm-manual-news-site-only.js";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "site-id": { type: "string" },
    since: { type: "string" },
  },
});

const siteIdRaw = values["site-id"] ? Number(values["site-id"]) : NaN;
const result = await repairManualEditorNewsSiteOnly({
  dryRun: Boolean(values["dry-run"]),
  siteId: Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : undefined,
  since: values.since ?? null,
});

console.log(JSON.stringify({ dryRun: Boolean(values["dry-run"]), ...result }, null, 2));
