import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import {
  coerceNewsPublishedAt,
  extractHtmlArticlePublishedAt,
} from "./rssPublishedDate.js";

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Yekpare/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

const FETCH_GAP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPublishedAtFromSourceUrl(url: string): Promise<Date | null> {
  try {
    const res = await fetch(url.trim(), {
      signal: AbortSignal.timeout(14_000),
      redirect: "follow",
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractHtmlArticlePublishedAt(html);
  } catch {
    return null;
  }
}

/** RSS / Haberler.com kaynak URL'sinden orijinal yayın tarihini geri yükler. */
export async function repairRssImportDatesBatch(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  fixed: number;
  skipped: number;
  failed: number;
  results: Array<{
    id: number;
    ok: boolean;
    from?: string;
    to?: string;
    error?: string;
  }>;
}> {
  const limit = Math.min(500, Math.max(1, options?.limit ?? 200));
  const dryRun = options?.dryRun === true;

  const rows = await db
    .select({
      id: newsTable.id,
      createdAt: newsTable.createdAt,
      rssSourceUrl: newsTable.rssSourceUrl,
    })
    .from(newsTable)
    .where(and(eq(newsTable.isEditorManual, false), isNotNull(newsTable.rssSourceUrl)))
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const results: Array<{
    id: number;
    ok: boolean;
    from?: string;
    to?: string;
    error?: string;
  }> = [];
  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const sourceUrl = row.rssSourceUrl?.trim();
    if (!sourceUrl) {
      skipped++;
      continue;
    }

    if (i > 0) await sleep(FETCH_GAP_MS);

    const extracted = await fetchPublishedAtFromSourceUrl(sourceUrl);
    const next = coerceNewsPublishedAt(extracted);
    if (!extracted) {
      failed++;
      results.push({ id: row.id, ok: false, error: "tarih bulunamadı" });
      continue;
    }

    const prev = row.createdAt;
    if (Math.abs(next.getTime() - prev.getTime()) < 60_000) {
      skipped++;
      results.push({
        id: row.id,
        ok: true,
        from: prev.toISOString(),
        to: prev.toISOString(),
        error: "zaten doğru",
      });
      continue;
    }

    if (!dryRun) {
      await db
        .update(newsTable)
        .set({ createdAt: next, updatedAt: next })
        .where(eq(newsTable.id, row.id));
    }
    fixed++;
    results.push({
      id: row.id,
      ok: true,
      from: prev.toISOString(),
      to: next.toISOString(),
    });
  }

  return { scanned: rows.length, fixed, skipped, failed, results };
}
