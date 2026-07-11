import {
  hmCategorySlug,
  hmCategorySlugCandidates,
  humanizeNewsCategorySlug,
  normalizeNewsCategorySlug,
} from "@/lib/hmCategorySlug";
import { sortNewsByRecency } from "@/lib/hmHeadlinePool";
import {
  normalizeCategoryDisplayName,
  newsItemMatchesCategorySlug,
} from "@/lib/hmHomeModuleCategories";
import { resolveCanonicalPortalCategorySlug } from "@/lib/portalCategorySlug";
import { passesCategoryContentGuard } from "@/lib/hmCategoryContentGuard";
import {
  resolveHmBreakingRssCategoryKey,
  type HmBreakingRssFeedRow,
} from "@/lib/newsSiteLayout";

export type HmHomeCategoryMatchContext = {
  knownCanonicalSlugs: ReadonlySet<string>;
  siteSlugPrefixes?: readonly string[];
  rssFeedRows?: Array<Pick<HmBreakingRssFeedRow, "id" | "label" | "categoryKey">>;
  /** API kategori listesinden slug → id (yeniden adlandırılmış slug'lar için yedek eşleşme). */
  categoryIdBySlug?: ReadonlyMap<string, number>;
};

export function buildHmKnownCanonicalCategorySlugs(opts: {
  apiCategories?: Array<{ slug?: string | null; name?: string | null }>;
  rssNavSlugs?: readonly string[];
  sectionSlugs?: readonly string[];
}): Set<string> {
  const slugs = new Set<string>();
  const push = (raw: unknown) => {
    const slug = normalizeNewsCategorySlug(raw);
    if (slug) slugs.add(slug);
  };
  for (const cat of opts.apiCategories ?? []) push(cat.slug);
  for (const slug of opts.rssNavSlugs ?? []) push(slug);
  for (const slug of opts.sectionSlugs ?? []) push(slug);
  return slugs;
}

export function hmNewsItemCategorySlugCandidates(item: unknown): string[] {
  const row = item as { categorySlug?: unknown; categoryName?: unknown; feedLabel?: unknown };
  const slug = normalizeNewsCategorySlug(row?.categorySlug);
  if (slug) return hmCategorySlugCandidates(row.categorySlug, row.categoryName, row.feedLabel);
  return hmCategorySlugCandidates(row.categorySlug, row.categoryName, row.feedLabel);
}

export function hmNewsItemCanonicalCategorySlugs(
  item: unknown,
  knownCanonicalSlugs: ReadonlySet<string>,
  siteSlugPrefixes: readonly string[] = [],
): string[] {
  const seen = new Set<string>();
  for (const candidate of hmNewsItemCategorySlugCandidates(item)) {
    const canonical = resolveCanonicalPortalCategorySlug(candidate, knownCanonicalSlugs, siteSlugPrefixes);
    if (canonical) seen.add(canonical);
  }
  const fallback = resolveCanonicalPortalCategorySlug(
    hmCategorySlug(
      (item as { categorySlug?: unknown }).categorySlug,
      (item as { categoryName?: unknown }).categoryName,
      (item as { feedLabel?: unknown }).feedLabel,
    ),
    knownCanonicalSlugs,
    siteSlugPrefixes,
  );
  if (fallback) seen.add(fallback);
  return Array.from(seen);
}

function feedSlugMatchesWant(feedCategorySlug: string, wantSlug: string): boolean {
  const feedSlug = feedCategorySlug.trim().toLowerCase();
  const want = wantSlug.trim().toLowerCase();
  if (!want) return true;
  if (feedSlug === want) return true;
  if (feedSlug.endsWith(`-${want}`)) return true;
  return false;
}

function rssFeedRowMatchesSectionSlug(
  row: Pick<HmBreakingRssFeedRow, "id" | "label" | "categoryKey">,
  sectionSlug: string,
): boolean {
  const want = normalizeNewsCategorySlug(sectionSlug);
  if (!want) return false;
  const rowSlug = hmCategorySlug(row.label, resolveHmBreakingRssCategoryKey(row));
  if (rowSlug === want) return true;
  const categoryKey = normalizeNewsCategorySlug(resolveHmBreakingRssCategoryKey(row));
  if (categoryKey === want) return true;
  if (feedSlugMatchesWant(categoryKey, want)) return true;
  const labelSlug = normalizeNewsCategorySlug(row.label);
  return labelSlug === want;
}

function itemMatchesRssFeedRow(
  item: unknown,
  row: Pick<HmBreakingRssFeedRow, "id" | "label" | "categoryKey">,
): boolean {
  const feedId = String((item as { feedId?: unknown }).feedId ?? "").trim();
  const rowId = String(row.id ?? "").trim();
  if (feedId && rowId && (feedId === rowId || feedId.startsWith(rowId) || rowId.startsWith(feedId))) {
    return true;
  }
  const itemCategoryKey = normalizeNewsCategorySlug(
    (item as { categorySlug?: unknown }).categorySlug ?? resolveHmBreakingRssCategoryKey(row),
  );
  const rowKey = normalizeNewsCategorySlug(resolveHmBreakingRssCategoryKey(row));
  if (itemCategoryKey && rowKey && (itemCategoryKey === rowKey || feedSlugMatchesWant(itemCategoryKey, rowKey))) {
    return true;
  }
  const feedLabel = String((item as { feedLabel?: unknown }).feedLabel ?? "").trim();
  const rowLabel = String(row.label ?? "").trim();
  if (feedLabel && rowLabel && normalizeCategoryDisplayName(feedLabel) === normalizeCategoryDisplayName(rowLabel)) {
    return true;
  }
  return false;
}

/** Site + RSS haber öğesi, anasayfa kategori kutusu slug'ı ile eşleşir (canonical + RSS feed alias). */
export function hmNewsItemMatchesHomeCategorySlug(
  item: unknown,
  categorySlug: string,
  ctx: HmHomeCategoryMatchContext,
): boolean {
  const want = normalizeNewsCategorySlug(categorySlug);
  if (!want) return true;

  // İçerik koruması: SPOR kutusuna sızan siyaset haberlerini engelle (diğer kategoriler etkilenmez).
  if (!passesCategoryContentGuard(item as { title?: unknown; feedLabel?: unknown; source?: unknown; id?: unknown }, want)) {
    return false;
  }

  const wantCategoryId = ctx.categoryIdBySlug?.get(want);
  const itemCategoryId = Number((item as { categoryId?: unknown }).categoryId);
  if (
    wantCategoryId != null &&
    Number.isFinite(itemCategoryId) &&
    itemCategoryId > 0 &&
    itemCategoryId === wantCategoryId
  ) {
    return true;
  }

  const prefixes = ctx.siteSlugPrefixes ?? [];
  const canonicalSlugs = hmNewsItemCanonicalCategorySlugs(item, ctx.knownCanonicalSlugs, prefixes);
  if (canonicalSlugs.includes(want)) return true;

  for (const candidate of hmNewsItemCategorySlugCandidates(item)) {
    if (candidate === want) return true;
    if (feedSlugMatchesWant(candidate, want)) return true;
  }

  if (newsItemMatchesCategorySlug(item, categorySlug)) return true;

  // RSS: besleme eşleşmesi yalnızca slug ile eşleşmeyen öğelerde (ör. yanlış categorySlug).
  for (const row of ctx.rssFeedRows ?? []) {
    if (!itemMatchesRssFeedRow(item, row)) continue;
    return rssFeedRowMatchesSectionSlug(row, want);
  }

  for (const row of ctx.rssFeedRows ?? []) {
    if (!rssFeedRowMatchesSectionSlug(row, want)) continue;
    if (itemMatchesRssFeedRow(item, row)) return true;
  }

  return false;
}

/** Kategori kutusu havuzu: API fetch → önceden seçilmiş → eşleşen havuz → (isteğe bağlı) site geneli. */
export function resolveHomeCategorySectionPool<
  T extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(opts: {
  sectionSlug: string;
  sectionTitle?: string;
  fetchedItems?: readonly T[];
  prefilledItems?: readonly T[];
  fallbackPool: readonly T[];
  matchContext: HmHomeCategoryMatchContext;
  allowGlobalPoolFallback?: boolean;
}): T[] {
  const slug = hmCategorySlug(opts.sectionSlug, opts.sectionTitle);
  const title = opts.sectionTitle ?? humanizeNewsCategorySlug(slug);

  if (opts.fetchedItems !== undefined) {
    // İçerik koruması: API'den gelen öğelere de uygula — SPOR kutusuna sızan siyaset
    // haberleri (yanlış etiketli ingest) doğrudan fetch yolundan geçmesin.
    // Boş dizi = API bilinçli boş döndü; prefilled/global fallback yapma.
    const guarded = opts.fetchedItems.filter((item) =>
      passesCategoryContentGuard(item as { title?: unknown }, slug),
    );
    return sortNewsByRecency(guarded);
  }

  if (opts.prefilledItems?.length) {
    const matched = opts.prefilledItems.filter(
      (item) =>
        hmNewsItemMatchesHomeCategorySlug(item, slug, opts.matchContext) ||
        hmNewsItemMatchesHomeCategorySlug(item, title, opts.matchContext),
    );
    if (matched.length > 0) return sortNewsByRecency(matched);
  }

  const fromPool = opts.fallbackPool.filter(
    (item) =>
      hmNewsItemMatchesHomeCategorySlug(item, slug, opts.matchContext) ||
      hmNewsItemMatchesHomeCategorySlug(item, title, opts.matchContext),
  );
  if (fromPool.length > 0) return sortNewsByRecency(fromPool);

  if (opts.allowGlobalPoolFallback === true && opts.fallbackPool.length > 0) {
    return sortNewsByRecency([...opts.fallbackPool]);
  }

  return [];
}
