import { and, eq, ilike, isNotNull, or } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, newsTable } from "@workspace/db";
import { downloadExternalImageToMedia, mediaObjectExists, publicUploadPath } from "./mediaUploadService.js";
import { collectUploadFnamesFromHtml, uploadFnameFromImageUrl } from "./news-display-image.js";

const UPLOAD_PATH_RE = /\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/g;
const EXTERNAL_IMG_RE = /src\s*=\s*["'](https?:\/\/[^"']+)["']/gi;

export type CorporateManualImageRepairSource =
  | "unchanged"
  | "content_upload"
  | "content_external"
  | "cleared"
  | "skipped_rss_item";

export type CorporateManualImageRepairItem = {
  id: number;
  slug: string;
  title: string;
  fromImageUrl: string | null;
  toImageUrl: string | null;
  source: CorporateManualImageRepairSource;
  note: string;
};

export type CorporateManualImageRepairResult = {
  scanned: number;
  repaired: number;
  items: CorporateManualImageRepairItem[];
};

/** WXR / editör manuel haber — gerçek RSS önbellek satırı değil. */
export function isManualOrWxrNewsRow(row: {
  isEditorManual?: boolean | null;
  rssSourceUrl?: string | null;
  tags?: string[] | null;
}): boolean {
  if (row.isEditorManual === true) return true;
  const ref = String(row.rssSourceUrl ?? "").trim();
  if (ref.startsWith("wp-wxr:")) return true;
  const tags = row.tags ?? [];
  if (tags.includes("wp-import")) return true;
  return false;
}

/** Gerçek RSS havuzu / otomatik içe aktarım — onarım kapsamı dışı. */
export function isGenuineRssNewsRow(row: {
  rssSourceUrl?: string | null;
  tags?: string[] | null;
}): boolean {
  const tags = row.tags ?? [];
  if (tags.includes("rss-auto") || tags.includes("rss-hybrid")) return true;
  const ref = String(row.rssSourceUrl ?? "").trim();
  return /^https?:\/\//i.test(ref);
}

function collectUploadPathsFromHtml(html: string | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const text = String(html ?? "");
  if (!text) return out;
  for (const m of text.matchAll(UPLOAD_PATH_RE)) {
    const fname = m[1];
    if (!fname || seen.has(fname)) continue;
    seen.add(fname);
    out.push(publicUploadPath(fname));
  }
  return out;
}

function collectExternalImgUrlsFromHtml(html: string | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const text = String(html ?? "");
  if (!text) return out;
  for (const m of text.matchAll(EXTERNAL_IMG_RE)) {
    const url = String(m[1] ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Eski read-path zenginleştirme hatası: site-yerel WXR/manuel haberin kapağı
 * başka bir RSS öğesinin rss-* dosyasına yazılmış. İçerik HTML'deki görseller doğru kaynak.
 */
export function isSuspectWrongRssCover(row: {
  imageUrl?: string | null;
  content?: string | null;
  isEditorManual?: boolean | null;
  rssSourceUrl?: string | null;
  tags?: string[] | null;
}): boolean {
  if (!isManualOrWxrNewsRow(row)) return false;
  if (isGenuineRssNewsRow(row)) return false;

  const coverFname = uploadFnameFromImageUrl(row.imageUrl);
  if (!coverFname?.startsWith("rss-")) return false;

  const contentFnames = collectUploadFnamesFromHtml(row.content);
  if (contentFnames.length > 0 && !contentFnames.includes(coverFname)) return true;

  const externals = collectExternalImgUrlsFromHtml(row.content);
  if (externals.length > 0) return true;

  return true;
}

async function firstExistingContentUpload(content: string | null | undefined): Promise<string | null> {
  for (const path of collectUploadPathsFromHtml(content)) {
    const fname = uploadFnameFromImageUrl(path);
    if (fname && (await mediaObjectExists(fname))) return path;
  }
  return null;
}

async function firstDownloadableExternal(
  content: string | null | undefined,
  title: string,
): Promise<string | null> {
  for (const url of collectExternalImgUrlsFromHtml(content)) {
    const saved = await downloadExternalImageToMedia(url, { title, hashSeed: url });
    if (saved) return saved;
  }
  return null;
}

export async function resolveRepairedCorporateManualCover(row: {
  imageUrl?: string | null;
  content?: string | null;
  title?: string | null;
  isEditorManual?: boolean | null;
  rssSourceUrl?: string | null;
  tags?: string[] | null;
}): Promise<{ toImageUrl: string | null; source: CorporateManualImageRepairSource; note: string }> {
  const from = String(row.imageUrl ?? "").trim() || null;
  if (!isSuspectWrongRssCover(row)) {
    return { toImageUrl: from, source: "unchanged", note: "Onarım gerekmez" };
  }

  const contentUpload = await firstExistingContentUpload(row.content);
  if (contentUpload && contentUpload !== from) {
    return {
      toImageUrl: contentUpload,
      source: "content_upload",
      note: "İçerik HTML'deki mevcut yükleme kullanıldı",
    };
  }

  const external = await firstDownloadableExternal(row.content, String(row.title ?? "").trim() || "haber");
  if (external && external !== from) {
    return {
      toImageUrl: external,
      source: "content_external",
      note: "İçerikteki harici görsel indirildi",
    };
  }

  if (from) {
    return {
      toImageUrl: null,
      source: "cleared",
      note: "Kurtarılabilir görsel yok — kapak temizlendi",
    };
  }

  return { toImageUrl: null, source: "unchanged", note: "Kapak zaten boş" };
}

export async function repairCorporateSiteLocalManualImages(opts: {
  siteId: number;
  dryRun?: boolean;
  limit?: number;
}): Promise<CorporateManualImageRepairResult> {
  const siteId = opts.siteId;
  const limit = Math.min(2000, Math.max(1, Number(opts.limit) || 500));
  const readDb = getNewsDbForRead();

  const rows = await readDb
    .select({
      id: newsTable.id,
      slug: newsTable.slug,
      title: newsTable.title,
      imageUrl: newsTable.imageUrl,
      content: newsTable.content,
      rssSourceUrl: newsTable.rssSourceUrl,
      isEditorManual: newsTable.isEditorManual,
      tags: newsTable.tags,
    })
    .from(newsTable)
    .where(
      and(
        eq(newsTable.siteId, siteId),
        isNotNull(newsTable.siteId),
        or(
          ilike(newsTable.imageUrl, "%/api/media/uploads/rss-%"),
          ilike(newsTable.imageUrl, "%rss-%.webp"),
          ilike(newsTable.imageUrl, "%rss-%.jpg"),
          ilike(newsTable.imageUrl, "%rss-%.png"),
        ),
      ),
    )
    .limit(limit);

  const items: CorporateManualImageRepairItem[] = [];

  for (const row of rows) {
    if (!isSuspectWrongRssCover(row)) continue;

    const resolved = await resolveRepairedCorporateManualCover(row);
    if (resolved.source === "unchanged") continue;
    if (resolved.toImageUrl === String(row.imageUrl ?? "").trim()) continue;

    items.push({
      id: row.id,
      slug: String(row.slug ?? ""),
      title: String(row.title ?? "").slice(0, 120),
      fromImageUrl: String(row.imageUrl ?? "").trim() || null,
      toImageUrl: resolved.toImageUrl,
      source: resolved.source,
      note: resolved.note,
    });
  }

  if (!opts.dryRun && items.length > 0) {
    for (const item of items) {
      await dualWriteUpdate(
        newsTable,
        { imageUrl: item.toImageUrl, updatedAt: new Date() },
        eq(newsTable.id, item.id),
      );
    }
  }

  return { scanned: rows.length, repaired: items.length, items };
}

export async function repairAllCorporateSiteLocalManualImages(opts: {
  siteIds: number[];
  dryRun?: boolean;
  limitPerSite?: number;
}): Promise<Array<{ siteId: number; result: CorporateManualImageRepairResult }>> {
  const out: Array<{ siteId: number; result: CorporateManualImageRepairResult }> = [];
  for (const siteId of opts.siteIds) {
    const result = await repairCorporateSiteLocalManualImages({
      siteId,
      dryRun: opts.dryRun,
      limit: opts.limitPerSite,
    });
    out.push({ siteId, result });
  }
  return out;
}
