import { db, newsTable, portalRssItemsTable } from "@workspace/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { isExternalRssImageUrl, isLocalMediaUploadUrl, mirrorRssImportImageUrl } from "../src/lib/portal-rss-image-mirror.js";
function argValue(flag: string) { const hit = process.argv.find((a) => a.startsWith(`${flag}=`)); return hit ? hit.slice(flag.length + 1) : null; }
function hasFlag(flag: string) { return process.argv.includes(flag); }
async function main() {
  const limit = Math.min(2000, Math.max(1, Number(argValue("--limit") || "500") || 500));
  const dryRun = hasFlag("--dry-run");
  const scope = (argValue("--scope") || "all").trim();
  console.log("[backfill-rss-images-webp]", { limit, dryRun, scope });
  if (scope === "pool" || scope === "all") {
    const rows = await db.select({ id: portalRssItemsTable.id, title: portalRssItemsTable.title, imageUrl: portalRssItemsTable.imageUrl }).from(portalRssItemsTable).where(or(ilike(portalRssItemsTable.imageUrl, "http://%"), ilike(portalRssItemsTable.imageUrl, "https://%"))).limit(limit);
    let updated = 0;
    for (const row of rows) {
      const from = String(row.imageUrl ?? "").trim();
      if (!isExternalRssImageUrl(from)) continue;
      if (dryRun) { updated++; continue; }
      const to = await mirrorRssImportImageUrl(from, row.title);
      if (to && to !== from && isLocalMediaUploadUrl(to)) { await db.update(portalRssItemsTable).set({ imageUrl: to }).where(eq(portalRssItemsTable.id, row.id)); updated++; }
    }
    console.log("[portal_rss_items]", { updated });
  }
  if (scope === "news" || scope === "all") {
    const rows = await db.select({ id: newsTable.id, title: newsTable.title, imageUrl: newsTable.imageUrl }).from(newsTable).where(and(or(ilike(newsTable.imageUrl, "http://%"), ilike(newsTable.imageUrl, "https://%"))!, or(sql`${newsTable.tags}::text ILIKE '%rss%'`, sql`NULLIF(BTRIM(COALESCE(${newsTable.rssSourceUrl}, '')), '') IS NOT NULL`)!)).limit(limit);
    let updated = 0;
    for (const row of rows) {
      const from = String(row.imageUrl ?? "").trim();
      if (!isExternalRssImageUrl(from)) continue;
      if (dryRun) { updated++; continue; }
      const to = await mirrorRssImportImageUrl(from, row.title);
      if (to && to !== from && isLocalMediaUploadUrl(to)) { await db.update(newsTable).set({ imageUrl: to }).where(eq(newsTable.id, row.id)); updated++; }
    }
    console.log("[news rss]", { updated });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
