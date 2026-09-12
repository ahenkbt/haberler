/**
 * How HM homepage / category vitrin picks items:
 *
 * Tepe Manşet (home-bundle.tepeManset):
 *   1) Site-owned / manuel / manşet-tagged rows (existing tepe selector)
 *   2) For kirsehirhaber (or layout.hmHomepageLocalCity): Kırşehir-matching
 *      manuel + RSS / central-pool rows
 *   3) Remaining slots: importance / recency from the shared pool (never empty
 *      when any publishable news exists)
 *
 * Gündemde Öne Çıkanlar (home-bundle.centerHeadlines):
 *   1) Local-preferred rows when a city pack is active
 *   2) Mixed cross-category round-robin (Yerel, Gündem, Dünya, Spor, …)
 *   3) Recency backfill so the section is never blank
 *
 * Category listings:
 *   site-local + manuel first, then central pool for that category (and aliases),
 *   then mixed recent — never a blank page if the network has publishable news.
 */

import {
  newsItemMatchesHomepageLocalPref,
  type HmHomepageLocalPref,
} from "./hm-homepage-local-pref.js";

export type HomepageFillItem = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  siteId?: number | null;
  ownerSiteId?: number | null;
  createdAt?: string | Date | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  imageUrl?: string | null;
};

export function homepageItemKey(item: HomepageFillItem): string {
  if (item.id != null && String(item.id).trim()) return `id:${String(item.id)}`;
  const slug = String(item.slug ?? "").trim();
  if (slug) return `slug:${slug}`;
  return `title:${String(item.title ?? "").trim().toLocaleLowerCase("tr-TR")}`;
}

export function homepageItemCategoryKey(item: HomepageFillItem): string {
  const slug = String(item.categorySlug ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i");
  if (slug) return slug;
  const name = String(item.categoryName ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i");
  return name || "diger";
}

function itemTimeMs(item: HomepageFillItem): number {
  for (const raw of [item.publishedAt, item.createdAt, item.updatedAt]) {
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
}

export function sortHomepageItemsByRecency<T extends HomepageFillItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => itemTimeMs(b) - itemTimeMs(a));
}

export function mergeUniqueHomepageItems<T extends HomepageFillItem>(...groups: Array<readonly T[] | T[] | undefined>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const item of group) {
      const key = homepageItemKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Round-robin across categories so Öne Çıkanlar is not one-category-only. */
export function pickDiversifiedByCategory<T extends HomepageFillItem>(
  items: readonly T[],
  limit: number,
): T[] {
  const target = Math.min(Math.max(limit, 0), 40);
  if (target === 0) return [];
  const ranked = sortHomepageItemsByRecency(items);
  const buckets = new Map<string, T[]>();
  const keyOrder: string[] = [];
  for (const item of ranked) {
    const cat = homepageItemCategoryKey(item);
    if (!buckets.has(cat)) {
      buckets.set(cat, []);
      keyOrder.push(cat);
    }
    buckets.get(cat)!.push(item);
  }
  const cursors = new Map<string, number>(keyOrder.map((k) => [k, 0]));
  const seen = new Set<string>();
  const out: T[] = [];
  let progressed = true;
  while (out.length < target && progressed) {
    progressed = false;
    for (const cat of keyOrder) {
      if (out.length >= target) break;
      const bucket = buckets.get(cat) ?? [];
      let cursor = cursors.get(cat) ?? 0;
      while (cursor < bucket.length) {
        const item = bucket[cursor]!;
        cursor += 1;
        const key = homepageItemKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        progressed = true;
        break;
      }
      cursors.set(cat, cursor);
    }
  }
  return out;
}

export function preferLocalThenFill<T extends HomepageFillItem>(
  items: readonly T[],
  pref: HmHomepageLocalPref | null | undefined,
  siteId: number | null | undefined,
  limit: number,
): T[] {
  const target = Math.min(Math.max(limit, 0), 80);
  if (!pref) return pickDiversifiedByCategory(items, target);
  const local = items.filter((item) => newsItemMatchesHomepageLocalPref(item, pref, siteId ?? undefined));
  const rest = items.filter((item) => !newsItemMatchesHomepageLocalPref(item, pref, siteId ?? undefined));
  return mergeUniqueHomepageItems(
    pickDiversifiedByCategory(local, target),
    pickDiversifiedByCategory(rest, target),
  ).slice(0, target);
}

export function pickLeadPackColumns<T extends HomepageFillItem>(opts: {
  pool: readonly T[];
  backfillPool?: readonly T[];
  leftCount: number;
  rightCount: number;
  localPref?: HmHomepageLocalPref | null;
  siteId?: number | null;
  hasCover?: (item: T) => boolean;
}): { left: T[]; right: T[] } {
  const wide = mergeUniqueHomepageItems(opts.pool, opts.backfillPool ?? []);
  const ranked = preferLocalThenFill(
    wide,
    opts.localPref,
    opts.siteId,
    Math.max(opts.leftCount + opts.rightCount, wide.length),
  );
  const seen = new Set<string>();
  const take = (source: readonly T[], limit: number, coverOnly: boolean): T[] => {
    const out: T[] = [];
    for (const item of source) {
      if (out.length >= limit) break;
      const key = homepageItemKey(item);
      if (seen.has(key)) continue;
      if (coverOnly && opts.hasCover && !opts.hasCover(item)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };
  const left = take(ranked, opts.leftCount, false);
  if (left.length < opts.leftCount) {
    for (const item of wide) {
      if (left.length >= opts.leftCount) break;
      const key = homepageItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      left.push(item);
    }
  }
  const rightPreferred = take(ranked, opts.rightCount, true);
  const right =
    rightPreferred.length >= opts.rightCount
      ? rightPreferred
      : [...rightPreferred, ...take(wide, opts.rightCount - rightPreferred.length, false)];
  return { left, right };
}
