/**
 * site_id=null Muhtar haberlerini turkatahaber (1132) paneline bağlar.
 *   node --env-file=../../.env --import tsx ./scripts/assign-orphan-muhtar-to-turkata.ts
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";

async function main() {
  if (process.env.NEWS_DATABASE_URL?.trim() && !process.env.NEWS_DB_WRITE?.trim()) {
    process.env.NEWS_DB_WRITE = "dual";
  }
  const db = getNewsDbForRead();
  const [site] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, "turkatahaber"))
    .limit(1);
  const [cat] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, "muhtar"))
    .limit(1);
  if (!site?.id || !cat?.id) {
    console.error("turkatahaber site or muhtar category missing", { site, cat });
    process.exit(1);
  }

  const orphans = await db
    .select({ id: newsTable.id, title: newsTable.title })
    .from(newsTable)
    .where(and(isNull(newsTable.siteId), eq(newsTable.categoryId, cat.id)));

  console.log(JSON.stringify({ siteId: site.id, categoryId: cat.id, orphanCount: orphans.length }, null, 2));

  let updated = 0;
  for (const row of orphans) {
    await dualWriteUpdate(
      newsTable,
      {
        siteId: site.id,
        siteOnly: true,
        ownerSiteId: site.id,
        updatedAt: new Date(),
      },
      eq(newsTable.id, row.id),
    );
    updated += 1;
  }

  const [count] = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM news
    WHERE site_id = ${site.id} AND category_id = ${cat.id} AND status = 'published'
  `);
  console.log(JSON.stringify({ updated, publishedOnTurkata: count }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
