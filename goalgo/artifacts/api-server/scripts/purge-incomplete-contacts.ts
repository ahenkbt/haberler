/**
 * CLI: gmaps_scrape kayıtlarında telefon+adres hâlâ boşsa sil
 *
 *   node --import tsx ./scripts/purge-incomplete-contacts.ts --dry-run
 *   node --import tsx ./scripts/purge-incomplete-contacts.ts --limit 500
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "500" },
    "dry-run": { type: "boolean", default: false },
    "no-enrich": { type: "boolean", default: false },
    "places-api-cap": { type: "string", default: "15" },
  },
});

const limit = Math.min(Math.max(parseInt(String(values.limit ?? "500"), 10) || 500, 1), 5000);
const dryRun = Boolean(values["dry-run"]);
const enrichFirst = !Boolean(values["no-enrich"]);
const placesApiCap = Math.min(Math.max(parseInt(String(values["places-api-cap"] ?? "15"), 10) || 15, 0), 50);

const base = process.env.MAP_API_BASE?.replace(/\/$/, "") || "http://localhost:3001/api";
const url =
  `${base}/map/admin/purge-incomplete-contacts?limit=${limit}` +
  `${dryRun ? "&dryRun=1" : ""}` +
  `${enrichFirst ? "&enrichFirst=1" : "&enrichFirst=0"}` +
  `&placesApiCap=${placesApiCap}`;

const res = await fetch(url, { method: "POST" });
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("[purge-incomplete-contacts] failed:", body);
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
