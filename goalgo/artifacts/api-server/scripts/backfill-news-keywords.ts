/**
 * Yayınlanmış haberlerde yetersiz etiket (tags) olan kayıtları otomatik doldurur.
 *
 * Kullanım:
 *   cd goalgo && pnpm exec tsx artifacts/api-server/scripts/backfill-news-keywords.ts --dry-run
 *   cd goalgo && pnpm exec tsx artifacts/api-server/scripts/backfill-news-keywords.ts --limit 500
 */
import { and, eq, sql } from "drizzle-orm";
import { categoriesTable, dualWriteUpdate, getNewsDbForRead, newsTable } from "@workspace/db";
import { deriveNewsTagsFromContent, filterNewsDisplayTags } from "../src/lib/newsAutoTags.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 500) : 2000;

async function main(): Promise<void> {
  const readDb = getNewsDbForRead();
  const rows = await readDb
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      spot: newsTable.spot,
      content: newsTable.content,
      tags: newsTable.tags,
      categoryId: newsTable.categoryId,
      status: newsTable.status,
    })
    .from(newsTable)
    .where(eq(newsTable.status, "published"))
    .orderBy(sql`${newsTable.id} DESC`)
    .limit(limit);

  const catRows = await readDb
    .select({ id: categoriesTable.id, slug: categoriesTable.slug, name: categoriesTable.name })
    .from(categoriesTable);
  const catById = new Map(catRows.map((c) => [c.id, c]));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const displayCount = filterNewsDisplayTags(row.tags).length;
    if (displayCount >= 10) {
      skipped += 1;
      continue;
    }
    const cat = row.categoryId != null ? catById.get(row.categoryId) : undefined;
    const nextTags = deriveNewsTagsFromContent({
      title: row.title,
      spot: row.spot,
      content: row.content,
      categoryName: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
      existingTags: row.tags,
      minTags: 10,
    });
    if (dryRun) {
      console.log(`[dry-run] #${row.id} ${row.slug} → ${nextTags.length} etiket`);
      updated += 1;
      continue;
    }
    await dualWriteUpdate(newsTable, { tags: nextTags, updatedAt: new Date() }, eq(newsTable.id, row.id));
    updated += 1;
  }

  console.log(
    JSON.stringify(
      { dryRun, scanned: rows.length, updated, skipped, minTags: 10 },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
