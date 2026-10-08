/**
 * turkatahaber.com — resimsiz (veya harici hotlink) RSS kapaklarını doldur + R2 mirror.
 *
 *   pnpm --filter @workspace/api-server run backfill:turkata-rss-covers -- --dry-run
 *   pnpm --filter @workspace/api-server run backfill:turkata-rss-covers -- --apply --limit=60
 */
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable, newsTable } from "@workspace/db";
import { backfillHmRssMissingImages } from "../src/lib/hm-rss-missing-image.js";
import { isLocalMediaUploadUrl, mirrorRssImportImageUrl } from "../src/lib/portal-rss-image-mirror.js";

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

async function resolveTurkataSiteIds(): Promise<number[]> {
  const readDb = getNewsDbForRead();
  const rows = await readDb
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(sql`lower(trim(both '/' from coalesce(${hmNewsSitesTable.slug}, ''))) = 'turkatahaber'`);
  return rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0);
}

async function mirrorExternalCovers(siteIds: number[], limit: number, apply: boolean) {
  const readDb = getNewsDbForRead();
  const rows = await readDb
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      imageUrl: newsTable.imageUrl,
    })
    .from(newsTable)
    .where(
      and(
        inArray(newsTable.siteId, siteIds),
        eq(newsTable.status, "published"),
        or(sql`${newsTable.imageUrl} ILIKE 'http://%'`, sql`${newsTable.imageUrl} ILIKE 'https://%'`)!,
      ),
    )
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);

  let updated = 0;
  const samples: Array<{ id: number; slug: string | null; from: string; to: string }> = [];
  for (const row of rows) {
    const from = String(row.imageUrl ?? "").trim();
    if (!from || isLocalMediaUploadUrl(from)) continue;
    if (!apply) {
      updated += 1;
      if (samples.length < 6) samples.push({ id: row.id, slug: row.slug, from, to: "(dry-run)" });
      continue;
    }
    const to = await mirrorRssImportImageUrl(from, String(row.title ?? ""), { force: true });
    if (!to || to === from || !isLocalMediaUploadUrl(to)) continue;
    await dualWriteUpdate(newsTable, { imageUrl: to, updatedAt: new Date() }, eq(newsTable.id, row.id));
    updated += 1;
    if (samples.length < 6) samples.push({ id: row.id, slug: row.slug, from, to });
  }
  return { scanned: rows.length, updated, samples };
}

async function main(): Promise<void> {
  const limit = Math.min(300, Math.max(1, Number(argValue("--limit") || "60") || 60));
  const apply = hasFlag("--apply");
  const dryRun = hasFlag("--dry-run") || !apply;
  const siteIds = await resolveTurkataSiteIds();
  if (!siteIds.length) {
    console.error("turkatahaber site id bulunamadı");
    process.exit(1);
  }

  const missingResults = [];
  for (const siteId of siteIds) {
    missingResults.push(
      await backfillHmRssMissingImages({
        siteId,
        limit,
        dryRun,
        scrape: true,
        mirrorToR2: true,
      }),
    );
  }

  const external = await mirrorExternalCovers(siteIds, limit, apply);

  console.log(
    JSON.stringify(
      {
        dryRun,
        siteIds,
        missing: missingResults,
        externalHotlinkMirror: external,
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
