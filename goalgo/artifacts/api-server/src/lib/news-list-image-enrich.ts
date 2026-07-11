import { and, eq, inArray } from "drizzle-orm";
import { db as mainDb, getNewsDbForRead, newsTable, portalRssItemsTable } from "@workspace/db";
import { isCorporateOriginCentralNewsRef } from "./hm-corporate-news-policy.js";
import { loadCorporateHmSiteIds } from "./hm-yekpare-news-sync.js";
import { parseHmPoolRef } from "./hm-sync-source.js";
import { normalizePublicMediaUrl } from "./normalizePublicMediaUrl.js";
import { resolveNewsItemImageUrl } from "./news-display-image.js";
import {
  shouldRefreshNewsListImageFromSource,
  type NewsListImageEnrichInput,
} from "./news-list-image-enrich-logic.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

export type { NewsListImageEnrichInput } from "./news-list-image-enrich-logic.js";
export { isSiteLocalNewsRow, shouldRefreshNewsListImageFromSource } from "./news-list-image-enrich-logic.js";

function normalizeListImageUrl(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return normalizePublicMediaUrl(value) ?? value;
}

async function loadRssCacheImagesBySourceUrl(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(urls.map((url) => normalizeRssSourceUrl(url) ?? url.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return out;

  const dedupeKeys = unique.flatMap((url) => {
    const normalized = normalizeRssSourceUrl(url) ?? url;
    const keys = new Set<string>();
    keys.add(`link:${normalized.toLowerCase()}`);
    keys.add(`link:${url.toLowerCase()}`);
    return [...keys];
  });

  const rows = await mainDb
    .select({ link: portalRssItemsTable.link, imageUrl: portalRssItemsTable.imageUrl, dedupeKey: portalRssItemsTable.dedupeKey })
    .from(portalRssItemsTable)
    .where(inArray(portalRssItemsTable.dedupeKey, [...new Set(dedupeKeys)]))
    .limit(500);

  for (const row of rows) {
    const img = normalizeListImageUrl(row.imageUrl);
    if (!img) continue;
    const linkKey = normalizeRssSourceUrl(String(row.link ?? "")) ?? String(row.link ?? "").trim().toLowerCase();
    if (linkKey) out.set(linkKey, img);
    const dedupe = String(row.dedupeKey ?? "").replace(/^link:/i, "").trim().toLowerCase();
    if (dedupe) out.set(dedupe, img);
  }
  return out;
}

function poolRefCacheKey(siteId: number, id: number): string {
  return `yekpare-hm-pool:${siteId}:${id}`;
}

/** yekpare-hm-pool ref — kaynak site satırının görseli (merkez id ile karıştırılmaz). */
async function loadPoolRefSourceImages(
  refs: Array<{ siteId: number; id: number }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!refs.length) return out;

  const bySite = new Map<number, number[]>();
  for (const ref of refs) {
    const list = bySite.get(ref.siteId) ?? [];
    if (!list.includes(ref.id)) list.push(ref.id);
    bySite.set(ref.siteId, list);
  }

  for (const [siteId, ids] of bySite) {
    const rows = await getNewsDbForRead()
      .select({ id: newsTable.id, imageUrl: newsTable.imageUrl })
      .from(newsTable)
      .where(and(eq(newsTable.siteId, siteId), inArray(newsTable.id, ids)));

    for (const row of rows) {
      const img = normalizeListImageUrl(row.imageUrl);
      if (img) out.set(poolRefCacheKey(siteId, row.id), img);
    }
  }
  return out;
}

/**
 * Liste/anasayfa yanıtlarında haber başına doğru kapak görseli — RSS önbelleği veya
 * merkez Yekpare havuz kaynağından (yalnızca tam rssSourceUrl / pool ref eşleşmesi).
 * siteId dolu satırlar ve başlık/peer araması yok.
 */
export async function enrichSerializedNewsListImages<T extends NewsListImageEnrichInput>(
  items: T[],
): Promise<T[]> {
  if (!items.length) return items;

  const corporateSiteIds = await loadCorporateHmSiteIds();
  const rssUrls: string[] = [];
  const poolRefs: Array<{ siteId: number; id: number }> = [];
  const seenPool = new Set<string>();

  for (const item of items) {
    if (!shouldRefreshNewsListImageFromSource(item)) continue;
    if (isCorporateOriginCentralNewsRef(item.rssSourceUrl, corporateSiteIds)) continue;
    const poolRef = parseHmPoolRef(item.rssSourceUrl);
    if (poolRef) {
      const key = poolRefCacheKey(poolRef.siteId, poolRef.id);
      if (!seenPool.has(key)) {
        seenPool.add(key);
        poolRefs.push(poolRef);
      }
      continue;
    }
    const rssUrl = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
    if (rssUrl) rssUrls.push(rssUrl);
  }

  const [rssImages, poolImages] = await Promise.all([
    loadRssCacheImagesBySourceUrl(rssUrls),
    loadPoolRefSourceImages(poolRefs),
  ]);

  return items.map((item) => {
    if (!shouldRefreshNewsListImageFromSource(item)) return item;
    if (isCorporateOriginCentralNewsRef(item.rssSourceUrl, corporateSiteIds)) return item;

    let candidate: string | null = null;
    const poolRef = parseHmPoolRef(item.rssSourceUrl);
    if (poolRef) candidate = poolImages.get(poolRefCacheKey(poolRef.siteId, poolRef.id)) ?? null;

    const rssUrl = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
    if (!candidate && rssUrl) {
      candidate = rssImages.get(rssUrl) ?? null;
    }
    if (!candidate) return item;

    const current = normalizeListImageUrl(resolveNewsItemImageUrl(item));
    if (current === candidate) return item;
    return { ...item, imageUrl: candidate };
  });
}

/** Editör Yekpare havuzundan gizlenen merkez haber id'leri. */
export function filterHiddenPoolNewsItems<T extends { id: number }>(
  items: T[],
  hiddenIds: readonly number[] | undefined,
): T[] {
  if (!hiddenIds?.length) return items;
  const hidden = new Set(hiddenIds.filter((id) => Number.isFinite(id) && id > 0));
  if (!hidden.size) return items;
  return items.filter((item) => !hidden.has(item.id));
}
