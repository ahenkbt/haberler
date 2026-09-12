/**
 * Homepage Tepe Manşet / Gündemde Öne Çıkanlar fill.
 * Kırşehir Haber prefers city-matching items; all HM news sites mix categories
 * and backfill so Öne Çıkanlar is never a blank "Henüz haber yok" slot.
 */

import {
  buildTepeMansetPool,
  mergeUniqueNews,
  newsKeyOf,
  sortNewsByRecency,
} from "@/lib/hmHeadlinePool";
import { isUsableNewsCoverSrc } from "@/lib/hmNewsPlaceholder";

export type HmHomepageLocalPref = {
  cityKey: string;
  cityKeywords: readonly string[];
  categorySlugs: readonly string[];
};

const KIRSEHIR_PREF: HmHomepageLocalPref = {
  cityKey: "kirsehir",
  cityKeywords: [
    "kırşehir",
    "kirsehir",
    "kirşehir",
    "kırsehir",
    "kirsehri",
    "kırşehri",
    "mucur",
    "kaman",
    "çiçekdağı",
    "cicekdagi",
    "akpınar",
    "akpinar",
    "boztepe",
    "akçakent",
    "akcakent",
  ],
  categorySlugs: ["kirsehir"],
};

const CITY_PACKS: Record<string, HmHomepageLocalPref> = { kirsehir: KIRSEHIR_PREF };
const SLUG_TO_CITY: Record<string, string> = {
  kirsehirhaber: "kirsehir",
  kirsehir: "kirsehir",
  kh: "kirsehir",
};

export function foldHmNewsText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeSiteSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

export function resolveHomepageLocalPref(
  siteSlug: string | null | undefined,
  layout?: { hmHomepageLocalCity?: string | null } | null,
): HmHomepageLocalPref | null {
  const fromLayout = normalizeSiteSlug(layout?.hmHomepageLocalCity);
  const fromSlug = SLUG_TO_CITY[normalizeSiteSlug(siteSlug)] ?? "";
  const cityKey = fromLayout || fromSlug;
  if (!cityKey) return null;
  return CITY_PACKS[cityKey] ?? null;
}

export function newsItemIsSiteOwned(item: { siteId?: number | null; ownerSiteId?: number | null }, siteId: number): boolean {
  if (!Number.isFinite(siteId) || siteId <= 0) return false;
  return item.siteId === siteId || item.ownerSiteId === siteId;
}

export function newsItemMatchesHomepageLocalPref(
  item: {
    siteId?: number | null;
    ownerSiteId?: number | null;
    title?: string | null;
    spot?: string | null;
    content?: string | null;
    tags?: string[] | null;
    slug?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    regionKey?: string | null;
    regionLabel?: string | null;
  },
  pref: HmHomepageLocalPref | null | undefined,
  siteId?: number | null,
): boolean {
  if (!pref) return false;
  if (siteId != null && newsItemIsSiteOwned(item, siteId)) return true;
  const hay = foldHmNewsText(
    [
      item.title,
      item.spot,
      item.slug,
      item.content,
      item.regionKey,
      item.regionLabel,
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const textHit = pref.cityKeywords.some((kw) => {
    const folded = foldHmNewsText(kw);
    return folded.length >= 3 && hay.includes(folded);
  });
  if (textHit) return true;
  const slug = foldHmNewsText(item.categorySlug);
  const name = foldHmNewsText(item.categoryName);
  return pref.categorySlugs.some((want) => {
    const folded = foldHmNewsText(want);
    return Boolean(folded) && (slug === folded || name === folded || slug.endsWith(`-${folded}`));
  });
}

function categoryKeyOf(item: { categorySlug?: string | null; categoryName?: string | null }): string {
  const slug = String(item.categorySlug ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  if (slug) return slug;
  return String(item.categoryName ?? "").trim().toLocaleLowerCase("tr-TR") || "diger";
}

export function pickDiversifiedByCategory<T>(items: readonly T[], limit: number): T[] {
  const target = Math.min(Math.max(limit, 0), 40);
  if (target === 0) return [];
  const ranked = sortNewsByRecency([...items]);
  const buckets = new Map<string, T[]>();
  const keyOrder: string[] = [];
  for (const item of ranked) {
    const cat = categoryKeyOf(item as { categorySlug?: string | null; categoryName?: string | null });
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
        const key = newsKeyOf(item as Parameters<typeof newsKeyOf>[0]);
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

export function preferLocalThenFill<T>(
  items: readonly T[],
  pref: HmHomepageLocalPref | null | undefined,
  siteId: number | null | undefined,
  limit: number,
): T[] {
  const target = Math.min(Math.max(limit, 0), 80);
  if (!pref) return pickDiversifiedByCategory(items, target);
  const local = items.filter((item) =>
    newsItemMatchesHomepageLocalPref(item as Parameters<typeof newsItemMatchesHomepageLocalPref>[0], pref, siteId),
  );
  const rest = items.filter(
    (item) => !newsItemMatchesHomepageLocalPref(item as Parameters<typeof newsItemMatchesHomepageLocalPref>[0], pref, siteId),
  );
  return mergeUniqueNews(pickDiversifiedByCategory(local, target), pickDiversifiedByCategory(rest, target)).slice(
    0,
    target,
  );
}

export function pickEsenLeadPackColumns<T>(opts: {
  pool: readonly T[];
  backfillPool?: readonly T[];
  leftCount: number;
  rightCount: number;
  localPref?: HmHomepageLocalPref | null;
  siteId?: number | null;
}): { left: T[]; right: T[] } {
  const wide = mergeUniqueNews(opts.pool, opts.backfillPool ?? []) as T[];
  const ranked = preferLocalThenFill(wide, opts.localPref, opts.siteId, wide.length) as T[];
  const seen = new Set<string>();
  const take = (source: readonly T[], limit: number, coverOnly: boolean): T[] => {
    const out: T[] = [];
    for (const item of source) {
      if (out.length >= limit) break;
      const key = newsKeyOf(item as Parameters<typeof newsKeyOf>[0]);
      if (!key || seen.has(key)) continue;
      if (coverOnly && !isUsableNewsCoverSrc((item as { imageUrl?: string | null }).imageUrl)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };
  const left = take(ranked, opts.leftCount, false);
  if (left.length < opts.leftCount) {
    for (const item of wide) {
      if (left.length >= opts.leftCount) break;
      const key = newsKeyOf(item as Parameters<typeof newsKeyOf>[0]);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      left.push(item);
    }
  }
  const rightCover = take(ranked, opts.rightCount, true);
  const right =
    rightCover.length >= opts.rightCount
      ? rightCover
      : [...rightCover, ...take(wide, opts.rightCount - rightCover.length, false)];
  return { left, right };
}

export function buildTepeMansetPoolPreferringLocal(opts: {
  items: readonly unknown[];
  localPref?: HmHomepageLocalPref | null;
  siteId?: number | null;
  limit?: number;
}): any[] {
  const limit = opts.limit ?? 5;
  if (!opts.localPref) return buildTepeMansetPool({ items: opts.items, limit });
  const local = opts.items.filter((item) =>
    newsItemMatchesHomepageLocalPref(item as Parameters<typeof newsItemMatchesHomepageLocalPref>[0], opts.localPref, opts.siteId),
  );
  const localPicks = buildTepeMansetPool({ items: local, limit });
  if (localPicks.length >= limit) return localPicks;
  const rest = opts.items.filter(
    (item) => !newsItemMatchesHomepageLocalPref(item as Parameters<typeof newsItemMatchesHomepageLocalPref>[0], opts.localPref, opts.siteId),
  );
  return mergeUniqueNews(localPicks, buildTepeMansetPool({ items: rest, limit: limit - localPicks.length })).slice(
    0,
    limit,
  );
}

/** Category page: keep matched rows; if the filter emptied the list, keep API items. */
export function keepCategoryItemsOrFallback<T>(matched: readonly T[], all: readonly T[]): T[] {
  if (matched.length > 0) return [...matched];
  return [...all];
}
