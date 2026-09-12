/**
 * HM category pages: site-local + manuel first, then central pool for that
 * category (and aliases), then mixed recent. Corporate sites stay site-local.
 */

import { expandRssCategorySlugCandidates } from "./hm-rss-category-aliases.js";
import { expandShaListingCategorySlugs } from "./hm-sha-rss-feeds.js";
import { loadPortalDbNews } from "./hybrid-news-merge.js";
import {
  mergeUniqueHomepageItems,
  pickDiversifiedByCategory,
} from "./hm-homepage-section-fill.js";
import {
  newsItemMatchesHomepageLocalPref,
  resolveHomepageLocalPref,
  type HmHomepageLocalPref,
} from "./hm-homepage-local-pref.js";
import type { SerializedNewsListItem } from "./serializers.js";

export async function ensureHmCategoryListingNotEmpty<T extends SerializedNewsListItem>(opts: {
  items: readonly T[];
  siteId: number;
  siteSlug: string;
  categorySlug: string;
  limit: number;
  corporate: boolean;
  layout?: Record<string, unknown> | null;
}): Promise<T[]> {
  const limit = Math.min(Math.max(opts.limit, 1), 80);
  const pref = resolveHomepageLocalPref(opts.siteSlug, opts.layout);
  const localFirst = reorderListingPreferringLocal(opts.items, pref, opts.siteId);
  if (localFirst.length > 0 || opts.corporate) {
    return localFirst.slice(0, Math.max(localFirst.length, 0));
  }

  const wanted = expandShaListingCategorySlugs(opts.categorySlug, opts.siteSlug);
  const aliasSlugs = expandRssCategorySlugCandidates(opts.categorySlug, ...wanted);
  const slugs = [...new Set([...wanted, ...aliasSlugs].map((s) => String(s).trim().toLowerCase()).filter(Boolean))];

  for (const slug of slugs) {
    const portal = await loadPortalDbNews({
      categorySlug: slug,
      limit,
      offset: 0,
    });
    if (portal.items.length > 0) {
      return reorderListingPreferringLocal(portal.items as T[], pref, opts.siteId).slice(0, limit);
    }
  }

  const mixed = await loadPortalDbNews({ limit: Math.min(limit * 3, 60), offset: 0 });
  if (mixed.items.length === 0) return [];
  return pickDiversifiedByCategory(mixed.items as T[], limit);
}

function reorderListingPreferringLocal<T extends SerializedNewsListItem>(
  items: readonly T[],
  pref: HmHomepageLocalPref | null,
  siteId: number,
): T[] {
  if (!pref) return [...items];
  const local = items.filter((item) => newsItemMatchesHomepageLocalPref(item, pref, siteId));
  const rest = items.filter((item) => !newsItemMatchesHomepageLocalPref(item, pref, siteId));
  return mergeUniqueHomepageItems(local, rest);
}

export function keepCategoryItemsOrFallback<T>(matched: readonly T[], all: readonly T[]): T[] {
  if (matched.length > 0) return [...matched];
  return [...all];
}
