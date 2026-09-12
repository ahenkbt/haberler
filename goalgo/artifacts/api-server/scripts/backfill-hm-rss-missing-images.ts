/**
 * RSS kaynaklı haberlerde boş imageUrl — rssSourceUrl / makale og:image ile doldur.
 *
 *   pnpm --filter @workspace/api-server backfill:hm-rss-missing-images -- --dry-run --limit=40
 *   pnpm --filter @workspace/api-server backfill:hm-rss-missing-images -- --apply --limit=80
 */
import { dualWriteUpdate, getNewsDbForRead, newsTable } from "@workspace/db";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { resolveRssImportCoverImage } from "../src/lib/rss-import-cover.js";
import { mirrorRssImportImageUrl } from "../src/lib/portal-rss-image-mirror.js";

function argValue(flag: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1] ?? null;
  return null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const limit = Math.min(300, Math.max(1, Number(argValue("--limit") || "60") || 60));
  const apply = hasFlag("--apply");
  const dryRun = hasFlag("--dry-run") || !apply;
  const readDb = getNewsDbForRead();

  const rows = await readDb
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      imageUrl: newsTable.imageUrl,
      rssSourceUrl: newsTable.rssSourceUrl,
      siteId: newsTable.siteId,
    })
    .from(newsTable)
    .where(
      and(
        eq(newsTable.status, "published"),
        isNotNull(newsTable.rssSourceUrl),
        or(
          sql`NULLIF(BTRIM(COALESCE(${newsTable.imageUrl}, '')), '') IS NULL`,
          sql`${newsTable.imageUrl} ILIKE '%haber-gorsel-hazirlaniyor%'`,
        )!,
      ),
    )
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);

  let updated = 0;
  const samples: Array<{ id: number; slug: string; imageUrl: string }> = [];

  for (const row of rows) {
    const sourceUrl = String(row.rssSourceUrl ?? "").trim();
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) continue;
    const resolved = await resolveRssImportCoverImage({
      link: sourceUrl,
      existing: row.imageUrl,
    });
    const imageUrl = (await mirrorRssImportImageUrl(resolved, row.title)) || resolved;
    if (!imageUrl) continue;
    samples.push({ id: row.id, slug: row.slug, imageUrl });
    if (dryRun) continue;
    await dualWriteUpdate(newsTable, { imageUrl, updatedAt: new Date() }, eq(newsTable.id, row.id));
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned: rows.length,
        withCover: samples.length,
        updated,
        samples: samples.slice(0, 8),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
