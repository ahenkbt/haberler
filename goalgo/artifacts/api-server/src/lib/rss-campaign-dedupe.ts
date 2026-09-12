/**
 * RSS kampanya içe aktarma — URL / başlık benzerliği / görselsiz yükseltme.
 */
import { areSimilarNewsTitles, normalizeNewsTitleKey } from "./news-title-similarity.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

export const RSS_CAMPAIGN_REQUIRE_IMAGE_TAG = "require-image";
export const VATANHABER_ANKARA_CAMPAIGN_TAG = "vatanhaber-ankara";
export const VATANHABER_ANKARA_LISTING_URL = "https://vatanhaber.net/kategori/ankara";
export const VATANHABER_SITE_SLUG = "vatanhaber";

export type RssDedupeNewsRow = {
  id: number;
  rssSourceUrl?: string | null;
  title: string;
  imageUrl?: string | null;
};

export function newsHasCoverImage(imageUrl: string | null | undefined): boolean {
  const t = String(imageUrl ?? "").trim();
  if (t.length < 6) return false;
  if (t.startsWith("/api/media/")) return true;
  return /^https?:\/\//i.test(t);
}

export function shouldUpgradeMissingImage(
  existingImage: string | null | undefined,
  incomingImage: string | null | undefined,
): boolean {
  return !newsHasCoverImage(existingImage) && newsHasCoverImage(incomingImage);
}

export function campaignRequiresCoverImage(
  tags: string[] | null | undefined,
  feeds?: unknown,
): boolean {
  const list = Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()) : [];
  if (list.includes(RSS_CAMPAIGN_REQUIRE_IMAGE_TAG) || list.includes(VATANHABER_ANKARA_CAMPAIGN_TAG)) {
    return true;
  }
  const urls = Array.isArray(feeds) ? feeds.map((f) => String(f ?? "").toLowerCase()) : [];
  return urls.some((u) => u.includes("vatanhaber.net") && u.includes("ankara"));
}

export function isMidnightTrCampaign(campaign: {
  active?: boolean | null;
  tags?: string[] | null;
  intervalMinutes?: number | null;
  feeds?: unknown;
  name?: string | null;
}): boolean {
  if (campaign.active === false) return false;
  const tags = Array.isArray(campaign.tags) ? campaign.tags.map((t) => String(t).toLowerCase()) : [];
  if (tags.includes("midnight-tr") || tags.includes("sehirhaberajansi") || tags.includes(VATANHABER_ANKARA_CAMPAIGN_TAG)) {
    return true;
  }
  if (Number(campaign.intervalMinutes) >= 1440) return true;
  const feeds = Array.isArray(campaign.feeds) ? campaign.feeds : [];
  return feeds.some((f) => {
    const u = String(f ?? "").toLowerCase();
    return u.includes("sehirhaberajansi.com.tr") || (u.includes("vatanhaber.net") && u.includes("ankara"));
  });
}

export function sortByPublishedAtAsc<T extends { publishedAt: Date }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt instanceof Date ? a.publishedAt.getTime() : 0;
    const tb = b.publishedAt instanceof Date ? b.publishedAt.getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String((a as { title?: string }).title ?? "").localeCompare(
      String((b as { title?: string }).title ?? ""),
      "tr",
    );
  });
}

export function rssCampaignItemLimit(dailyLimit: number | null | undefined, fallback = 20): number {
  const n = Number(dailyLimit);
  if (Number.isFinite(n) && n > 0) return Math.min(200, Math.trunc(n));
  return fallback;
}

export function findDuplicateNews<T extends RssDedupeNewsRow>(
  existing: readonly T[],
  sourceUrl: string | null,
  title: string,
): T | null {
  const sourceKey = sourceUrl ? normalizeRssSourceUrl(sourceUrl) : null;
  if (sourceKey) {
    const byUrl = existing.find((row) => {
      const rowKey = row.rssSourceUrl ? normalizeRssSourceUrl(row.rssSourceUrl) : null;
      return rowKey != null && rowKey === sourceKey;
    });
    if (byUrl) return byUrl;
  }

  const titleKey = normalizeNewsTitleKey(title);
  if (titleKey) {
    const exact = existing.find((row) => normalizeNewsTitleKey(row.title) === titleKey);
    if (exact) return exact;
  }

  for (const row of existing) {
    if (areSimilarNewsTitles(title, row.title)) return row;
  }
  return null;
}
