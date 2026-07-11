import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import { stripHaberlerShareAndChrome } from "./haberlerArticleHtmlCleanup.js";

/** Veritabanındaki haber gövdelerinden Haberler.com kromunu temizler. */
export async function repairHaberlerScrapedContentBatch(options?: {
  limit?: number;
  dryRun?: boolean;
  siteId?: number;
}): Promise<{
  scanned: number;
  fixed: number;
  skipped: number;
  results: Array<{ id: number; ok: boolean; charsRemoved?: number }>;
}> {
  const limit = Math.min(500, Math.max(1, options?.limit ?? 200));
  const dryRun = options?.dryRun === true;
  const siteId = options?.siteId;

  const whereParts = [
    isNotNull(newsTable.content),
    or(
      ilike(newsTable.content, "%haberler.com%"),
      ilike(newsTable.content, "%new3card-reklam%"),
      ilike(newsTable.content, "%Yeni Haberler%"),
      ilike(newsTable.content, "%UYGULAMAMIZI İNDİRİN%"),
      ilike(newsTable.rssSourceUrl, "%haberler.com%"),
    ),
  ];
  if (siteId != null && siteId > 0) {
    whereParts.push(sql`${newsTable.siteId} = ${siteId}`);
  }

  const rows = await db
    .select({ id: newsTable.id, content: newsTable.content })
    .from(newsTable)
    .where(and(...whereParts))
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const results: Array<{ id: number; ok: boolean; charsRemoved?: number }> = [];
  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    const before = String(row.content ?? "");
    const after = stripHaberlerShareAndChrome(before);
    if (!after || after === before) {
      skipped += 1;
      results.push({ id: row.id, ok: false });
      continue;
    }
    const charsRemoved = before.length - after.length;
    if (!dryRun) {
      await db.update(newsTable).set({ content: after, updatedAt: new Date() }).where(eq(newsTable.id, row.id));
    }
    fixed += 1;
    results.push({ id: row.id, ok: true, charsRemoved });
  }

  return { scanned: rows.length, fixed, skipped, results };
}
