/**
 * CLI: Google Maps kazıması kayıtlarında phone/address backfill
 *
 *   node --import tsx ./scripts/backfill-scraped-contacts.ts --limit 500
 *   node --import tsx ./scripts/backfill-scraped-contacts.ts --dry-run
 *   node --import tsx ./scripts/backfill-scraped-contacts.ts --all --limit 500
 *   node --import tsx ./scripts/backfill-scraped-contacts.ts --places-api-cap 50 --gmaps-enrich
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "500" },
    "dry-run": { type: "boolean", default: false },
    all: { type: "boolean", default: false },
    "places-api-cap": { type: "string", default: "50" },
    "gmaps-enrich": { type: "boolean", default: true },
    "gmaps-scrape-cap": { type: "string", default: "20" },
    endpoint: { type: "string", default: "backfill" },
  },
});

const limit = Math.min(Math.max(parseInt(String(values.limit ?? "500"), 10) || 500, 1), 5000);
const dryRun = Boolean(values["dry-run"]);
const runAll = Boolean(values.all);
const placesApiCap = Math.min(Math.max(parseInt(String(values["places-api-cap"] ?? "50"), 10) || 50, 0), 100);
const enrichViaGmaps = values["gmaps-enrich"] !== false;
const gmapsScrapeCap = Math.min(Math.max(parseInt(String(values["gmaps-scrape-cap"] ?? "20"), 10) || 20, 0), 50);
const useGmapsEndpoint = String(values.endpoint ?? "backfill").toLowerCase() === "gmaps";

const base = process.env.MAP_API_BASE?.replace(/\/$/, "") || "http://localhost:3001/api";

type BackfillResult = {
  success?: boolean;
  dryRun?: boolean;
  scanned?: number;
  updated?: number;
  placesApiFetched?: number;
  gmapsScraped?: number;
  stillMissingBoth?: number;
  stillMissingPhone?: number;
  stillMissingAddress?: number;
  samples?: unknown[];
  error?: string;
};

async function runBatch(): Promise<BackfillResult> {
  const path = useGmapsEndpoint
    ? "/map/admin/enrich-missing-contacts-gmaps"
    : "/map/admin/backfill-scraped-contacts";
  const params = new URLSearchParams({
    limit: String(limit),
    placesApiCap: String(placesApiCap),
    gmapsScrapeCap: String(gmapsScrapeCap),
    enrichViaGmaps: enrichViaGmaps ? "1" : "0",
  });
  if (dryRun) params.set("dryRun", "1");
  const url = `${base}${path}?${params.toString()}`;
  const res = await fetch(url, { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as BackfillResult;
  if (!res.ok) {
    console.error("[backfill-scraped-contacts] failed:", body);
    process.exit(1);
  }
  return body;
}

let totalUpdated = 0;
let batches = 0;
let last: BackfillResult | null = null;

do {
  last = await runBatch();
  batches++;
  totalUpdated += last.updated ?? 0;
  console.log(
    `[batch ${batches}] scanned=${last.scanned ?? 0} updated=${last.updated ?? 0}` +
    ` placesApi=${last.placesApiFetched ?? 0} gmapsScrape=${last.gmapsScraped ?? 0}`,
  );
  if (dryRun) break;
  if (!runAll) break;
  if ((last.updated ?? 0) === 0) break;
  if ((last.scanned ?? 0) === 0) break;
} while (runAll);

console.log(JSON.stringify({
  batches,
  totalUpdated,
  dryRun,
  enrichViaGmaps,
  placesApiCap,
  stillMissingBoth: last?.stillMissingBoth ?? null,
  stillMissingPhone: last?.stillMissingPhone ?? null,
  stillMissingAddress: last?.stillMissingAddress ?? null,
  samples: last?.samples ?? [],
}, null, 2));
