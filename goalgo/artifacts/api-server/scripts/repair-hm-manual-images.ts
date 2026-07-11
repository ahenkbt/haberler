/**
 * HM site-local haber kapak görselleri — tanı ve otomatik onarım.
 *
 * Yanlış rss-* kapak (eski zenginleştirme hatası) içerik HTML'den kurtarılır.
 *
 * Kullanım (yerel veya Render — DATABASE_URL ortam değişkeninden):
 *   pnpm --filter @workspace/api-server repair:hm-manual-images -- --site-slug=vatankahramanlari
 *   pnpm --filter @workspace/api-server repair:hm-manual-images -- --site-id=7 --apply
 *   pnpm --filter @workspace/api-server repair:hm-manual-images -- --site-id=7 --dry-run
 *
 * Render shell:
 *   cd /app/artifacts/api-server && node --import tsx ./scripts/repair-hm-manual-images.ts --dry-run --site-slug=vatankahramanlari
 */
import { db, getNewsDbForRead, hmNewsSitesTable, newsTable } from "@workspace/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { mediaObjectExists } from "../src/lib/mediaUploadService.js";
import { uploadFnameFromImageUrl } from "../src/lib/news-display-image.js";
import { parseHmPoolRef } from "../src/lib/hm-sync-source.js";
import {
  isSuspectWrongRssCover,
  repairCorporateSiteLocalManualImages,
  resolveRepairedCorporateManualCover,
} from "../src/lib/hm-corporate-manual-image-repair.js";

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

async function resolveSiteId(): Promise<number | null> {
  const siteIdRaw = argValue("--site-id");
  if (siteIdRaw) {
    const id = Number(siteIdRaw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  const slug = String(argValue("--site-slug") ?? "").trim();
  if (!slug) return null;
  const [site] = await db.select({ id: hmNewsSitesTable.id }).from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, slug)).limit(1);
  return site?.id ?? null;
}

type IssueKind = "missing_file" | "pool_ref_central_mismatch" | "wrong_rss_cover" | "empty_cover";

async function main(): Promise<void> {
  const siteId = await resolveSiteId();
  const limit = Math.min(500, Math.max(1, Number(argValue("--limit") || "100") || 100));
  const apply = hasFlag("--apply");
  const dryRun = hasFlag("--dry-run") || !apply;

  if (!siteId) {
    console.error("Belirtin: --site-slug=<slug> veya --site-id=<id>");
    process.exit(1);
  }

  if (apply && !dryRun) {
    const repair = await repairCorporateSiteLocalManualImages({ siteId, dryRun: false, limit });
    console.log(JSON.stringify({ mode: "repair", siteId, ...repair }, null, 2));
    return;
  }

  const readDb = getNewsDbForRead();
  const rows = await readDb
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      imageUrl: newsTable.imageUrl,
      content: newsTable.content,
      rssSourceUrl: newsTable.rssSourceUrl,
      isEditorManual: newsTable.isEditorManual,
      tags: newsTable.tags,
    })
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), eq(newsTable.status, "published"), isNotNull(newsTable.imageUrl)))
    .orderBy(desc(newsTable.updatedAt))
    .limit(limit);

  const issues: Array<{
    id: number;
    slug: string;
    title: string;
    imageUrl: string;
    kind: IssueKind;
    note: string;
    repairPreview?: string | null;
  }> = [];

  for (const row of rows) {
    const imageUrl = String(row.imageUrl ?? "").trim();
    if (!imageUrl) {
      issues.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        imageUrl,
        kind: "empty_cover",
        note: "Kapak alanı boş",
      });
      continue;
    }

    if (isSuspectWrongRssCover(row)) {
      const preview = await resolveRepairedCorporateManualCover(row);
      issues.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        imageUrl,
        kind: "wrong_rss_cover",
        note: preview.note,
        repairPreview: preview.toImageUrl,
      });
      continue;
    }

    const fname = uploadFnameFromImageUrl(imageUrl);
    if (fname && !(await mediaObjectExists(fname))) {
      issues.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        imageUrl,
        kind: "missing_file",
        note: `Medya kütüphanesinde dosya yok: ${fname}`,
      });
    }

    const poolRef = parseHmPoolRef(row.rssSourceUrl);
    if (poolRef) {
      const [central] = await readDb
        .select({ imageUrl: newsTable.imageUrl })
        .from(newsTable)
        .where(and(eq(newsTable.id, poolRef.id), isNull(newsTable.siteId)))
        .limit(1);
      const centralImg = String(central?.imageUrl ?? "").trim();
      if (centralImg && centralImg !== imageUrl) {
        issues.push({
          id: row.id,
          slug: row.slug,
          title: row.title,
          imageUrl,
          kind: "pool_ref_central_mismatch",
          note: `Havuz ref ${poolRef.id} merkez görseli farklı`,
        });
      }
    }
  }

  const wrongRss = issues.filter((i) => i.kind === "wrong_rss_cover");
  console.log(
    JSON.stringify(
      {
        siteId,
        scanned: rows.length,
        issueCount: issues.length,
        wrongRssCoverCount: wrongRss.length,
        issues,
        hint: wrongRss.length
          ? "Onarmak için: aynı komuta --apply ekleyin veya repair:corporate-manual-images çalıştırın."
          : undefined,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
