/**
 * HM sitelerinde resimsiz RSS haberlerine kaynak og:image / enclosure yazar.
 *
 *   pnpm --filter @workspace/api-server backfill:hm-rss-missing-images -- --site-slug=vatanhaber --dry-run
 *   pnpm --filter @workspace/api-server backfill:hm-rss-missing-images -- --site-slug=vatanhaber --apply --limit=40
 *
 * vatanhaber.net/kategori/gundem placeholder kontrolü:
 * 1) Dry-run ile boş imageUrl + http rssSourceUrl satırlarını say
 * 2) --apply sonrası aynı slug'larda imageUrl dolu olmalı
 * 3) Kategori listesi «Görsel Hazırlanmaktadır» yerine kaynak kapağı gösterir
 */
import { db, hmNewsSitesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { backfillHmRssMissingImages } from "../src/lib/hm-rss-missing-image.js";

function argValue(flag: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1] ?? null;
  return null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function resolveSiteId(): Promise<number | undefined> {
  const siteIdRaw = argValue("--site-id");
  if (siteIdRaw) {
    const id = Number(siteIdRaw);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }
  const slug = String(argValue("--site-slug") ?? "").trim();
  if (!slug) return undefined;
  const [site] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, slug))
    .limit(1);
  return site?.id;
}

async function main(): Promise<void> {
  const siteId = await resolveSiteId();
  const limit = Math.min(400, Math.max(1, Number(argValue("--limit") || "80") || 80));
  const apply = hasFlag("--apply");
  const dryRun = hasFlag("--dry-run") || !apply;
  const result = await backfillHmRssMissingImages({
    siteId,
    limit,
    dryRun,
    scrape: true,
  });
  console.log(JSON.stringify({ siteId: siteId ?? null, dryRun, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
