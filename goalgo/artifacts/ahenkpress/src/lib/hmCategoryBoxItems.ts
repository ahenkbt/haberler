import { createHomeNewsDedupeTracker, homeNewsAliasKeys, mergeUniqueNews, newsKeyOf, sortNewsByRecency, type HomeNewsDedupeTracker } from "@/lib/hmHeadlinePool";
import { hmCategorySlug } from "@/lib/hmCategorySlug";
import { deferSimilarNewsItems } from "@/lib/hmNewsTitleSimilarity";

/** Masaüstü sağ sütun / numaralı liste — 3 küçük haber (1 büyük + 3 = 4). */
export const CATEGORY_BOX_DESKTOP_LIST_SLOTS = 3;

/** Mobil kategori kutusu — 4 eşit küçük kart (2×2). */
export const CATEGORY_BOX_MOBILE_QUAD_TOTAL = 4;

/** @deprecated Use CATEGORY_BOX_DESKTOP_LIST_SLOTS — geriye dönük import uyumu. */
export const CATEGORY_BOX_LIST_SLOTS = CATEGORY_BOX_DESKTOP_LIST_SLOTS;

/** Kategori kutusu masaüstü: 1 öne çıkan + 3 liste (toplam 4). */
export const CATEGORY_BOX_DISPLAY_TOTAL = 1 + CATEGORY_BOX_DESKTOP_LIST_SLOTS;

/** Modül limitini 4 veya 6'ya yuvarlar (tek sayı grid bozar). */
export function normalizeCategoryBoxDisplayTotal(raw: number | null | undefined): 4 | 6 {
  return normalizeEvenDisplayCount(typeof raw === "number" ? raw : CATEGORY_BOX_DISPLAY_TOTAL, 4);
}

/** Yekpare kategori kutusu: masaüstü 1+3, mobil 4 — her zaman 4 haber. */
export function normalizeYekpareKutuItemCount(_raw: number | null | undefined): 4 {
  return 4;
}

/** Anasayfada gösterilecek Yekpare kategori kutusu sayısı (çift: 2, 4, 6, 8). */
export const YEKPARE_CATEGORY_BOX_COUNT_OPTIONS = [2, 4, 6, 8] as const;
export type YekpareCategoryBoxCount = (typeof YEKPARE_CATEGORY_BOX_COUNT_OPTIONS)[number];

export function normalizeYekpareCategoryBoxCount(raw: number | null | undefined): YekpareCategoryBoxCount {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 4;
  const rounded = Math.round(raw);
  if (rounded <= 2) return 2;
  if (rounded <= 4) return 4;
  if (rounded <= 6) return 6;
  return 8;
}

export function yekpareCategoryBoxGridClass(count: YekpareCategoryBoxCount): string {
  if (count <= 2) return "grid gap-4 sm:grid-cols-2";
  if (count <= 4) return "grid gap-4 sm:grid-cols-2";
  if (count <= 6) return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  return "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
}

/** Modül gridleri için çift haber sayısı (4 veya 6). */
export function normalizeEvenDisplayCount(raw: number, fallback: 4 | 6 = 4): 4 | 6 {
  if (!Number.isFinite(raw)) return fallback;
  const rounded = Math.round(raw);
  if (rounded <= 4) return 4;
  if (rounded >= 6) return 6;
  return fallback;
}

export function categoryBoxItemKey(n: {
  id?: string | number | null;
  slug?: string | null;
  href?: string | null;
  link?: string | null;
  url?: string | null;
  title?: string | null;
  source?: string | null;
}): string {
  return homeNewsAliasKeys(n)[0] ?? newsKeyOf(n);
}

/** Havuzdan tekrar eden haberleri (id/slug/başlık alias) çıkarır — manuel editör öncelikli. */
export function dedupeCategoryBoxItems<T>(items: T[]): T[] {
  return mergeUniqueNews(items) as T[];
}

/** lead = items[0], list = benzersiz items[1..5]. */
export function splitCategoryBoxItems<
  T extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(
  items: T[],
  listSlots: number = CATEGORY_BOX_LIST_SLOTS,
): { lead: T | null; listItems: T[]; totalUnique: number } {
  const unique = dedupeCategoryBoxItems(deferSimilarNewsItems(items));
  return {
    lead: unique[0] ?? null,
    listItems: unique.slice(1, 1 + listSlots),
    totalUnique: unique.length,
  };
}

function filterPoolForPick<T>(
  sectionPool: readonly T[],
  moduleDedupe: HomeNewsDedupeTracker,
  globalDedupe?: HomeNewsDedupeTracker,
): T[] {
  const moduleUnused = moduleDedupe.filterUnused(sectionPool);
  const base = moduleUnused.length > 0 ? moduleUnused : [...sectionPool];
  if (!globalDedupe) return base;
  return globalDedupe.filterUnused(base);
}

function rememberPickedItems(
  picked: readonly unknown[],
  moduleDedupe: HomeNewsDedupeTracker,
  globalDedupe?: HomeNewsDedupeTracker,
): void {
  moduleDedupe.rememberMany(picked);
  globalDedupe?.rememberMany(picked);
}

/**
 * Kategori vitrin kutuları: modül içi tekilleştirme (komşu kutularda aynı haber yok),
 * kategori havuzu boş değilse en az bir haber garantisi.
 */
export function pickModuleSectionCategoryItems<
  T extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(
  moduleDedupe: HomeNewsDedupeTracker,
  sectionPool: readonly T[],
  limit: number = CATEGORY_BOX_DISPLAY_TOTAL,
  globalDedupe?: HomeNewsDedupeTracker,
): T[] {
  const targetLimit = normalizeCategoryBoxDisplayTotal(limit);
  const candidate = filterPoolForPick(sectionPool, moduleDedupe, globalDedupe);
  const unique = dedupeCategoryBoxItems(deferSimilarNewsItems([...candidate]));
  const picked = unique.slice(0, targetLimit);
  if (picked.length < targetLimit) {
    const seen = new Set(
      picked.map((item) => categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0])),
    );
    const backfill = dedupeCategoryBoxItems(deferSimilarNewsItems([...sectionPool]));
    for (const item of backfill) {
      if (picked.length >= targetLimit) break;
      const key = categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0]);
      if (!key || seen.has(key)) continue;
      if (globalDedupe?.has(item) || moduleDedupe.has(item)) continue;
      seen.add(key);
      picked.push(item);
    }
  }
  // Hero seed / üst modüller tüm taze havuzu claim ettiyse bile kutu boş kalmasın.
  if (picked.length < targetLimit && sectionPool.length > 0) {
    const seen = new Set(
      picked.map((item) => categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0])),
    );
    const reusePool = dedupeCategoryBoxItems(deferSimilarNewsItems([...sectionPool]));
    for (const item of reusePool) {
      if (picked.length >= targetLimit) break;
      const key = categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0]);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      picked.push(item);
    }
  }
  rememberPickedItems(picked, moduleDedupe, globalDedupe);
  return picked;
}

/** Çoklu kategori vitrin modülleri için modül-içi dedupe tracker. */
export function createCategoryBoxModuleDedupeTracker(): HomeNewsDedupeTracker {
  return createHomeNewsDedupeTracker();
}

/**
 * Kategori vitrin/grid kutularını render sırasından bağımsız olarak global dedupe'ye işler.
 * Öncelik: tepe > slider > yan > breaking > kategori kutuları > spor > sidebar.
 */
export function seedHomeCategoryVitrinDedupe<
  TSection extends { slug: string; title: string; items?: TItem[] },
  TItem extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(opts: {
  sections: readonly TSection[];
  globalDedupe: HomeNewsDedupeTracker;
  globalPool: readonly TItem[];
  resolveSectionPool: (section: TSection) => readonly TItem[];
  itemLimit?: number;
}): void {
  const limit = normalizeCategoryBoxDisplayTotal(opts.itemLimit ?? CATEGORY_BOX_DISPLAY_TOTAL);
  const moduleDedupe = createCategoryBoxModuleDedupeTracker();
  const seenSectionSlugs = new Set<string>();
  for (const section of opts.sections) {
    const slug = hmCategorySlug(section.slug, section.title);
    if (!slug || seenSectionSlugs.has(slug)) continue;
    seenSectionSlugs.add(slug);
    const pool = opts.resolveSectionPool(section);
    const backfill = pool.length > 0 ? pool : opts.globalPool;
    pickModuleSectionCategoryItems(moduleDedupe, backfill, limit, opts.globalDedupe);
  }
}

/**
 * Kategori/haber kutusu: havuzda haber varken minCount altına düşmez.
 * Önce mevcut öğeler, sonra section/global havuzdan benzersiz doldurma.
 */
export function ensureNewsBoxItems<
  T extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(
  items: readonly T[],
  pool: readonly T[],
  minCount: number,
  globalDedupe?: HomeNewsDedupeTracker,
): T[] {
  if (pool.length === 0) return [...items];
  const limit = Math.max(1, normalizeCategoryBoxDisplayTotal(minCount));
  const unique = dedupeCategoryBoxItems(deferSimilarNewsItems([...items]));
  if (unique.length >= limit) {
    globalDedupe?.rememberMany(unique.slice(0, limit));
    return unique.slice(0, limit);
  }

  const seen = new Set(
    unique.map((item) => categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0])),
  );
  const out: T[] = [...unique];
  const poolSorted = sortNewsByRecency(dedupeCategoryBoxItems(deferSimilarNewsItems([...pool])));
  const unusedPool = globalDedupe ? globalDedupe.filterUnused(poolSorted) : poolSorted;
  for (const item of unusedPool) {
    if (out.length >= limit) break;
    const key = categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0]);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  // Kullanılmamış aday kalmasa da (manşet seed büyümesi) kutuyu doldur — boş beyaz alan olmasın.
  if (out.length < limit) {
    for (const item of poolSorted) {
      if (out.length >= limit) break;
      const key = categoryBoxItemKey(item as Parameters<typeof categoryBoxItemKey>[0]);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  const result = out.slice(0, limit);
  globalDedupe?.rememberMany(result);
  return result;
}

/**
 * Çoklu kategori kutusu modülleri: boş slug bölümlerini global havuzdan doldurur.
 */
export function ensureNewsBoxSections<
  TSection extends { slug: string; title: string; items?: TItem[] },
  TItem extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null; date?: string | null },
>(
  sections: readonly TSection[] | null | undefined,
  globalPool: readonly TItem[] | null | undefined,
  itemLimit: number,
  pickForSection: (section: TSection, sectionPool: readonly TItem[]) => TItem[],
  resolveSectionPool?: (section: TSection) => readonly TItem[],
  globalDedupe?: HomeNewsDedupeTracker,
): Array<TSection & { items: TItem[] }> {
  const safeSections = Array.isArray(sections) ? sections : [];
  const safeGlobalPool = Array.isArray(globalPool) ? globalPool : [];
  const limit = normalizeCategoryBoxDisplayTotal(itemLimit);
  const moduleDedupe = createCategoryBoxModuleDedupeTracker();
  const resolved = safeSections.map((section) => {
    const resolvedPool = resolveSectionPool?.(section);
    const hasExplicitPool = resolvedPool !== undefined;
    const sectionPool = hasExplicitPool
      ? resolvedPool
      : [...(Array.isArray(section.items) ? section.items : []), ...safeGlobalPool];
    /** Kategori havuzu bilinçli olarak boşsa (ör. SPOR guard) global havuza düşme. */
    const backfillSource = hasExplicitPool
      ? sectionPool
      : sectionPool.length > 0
        ? sectionPool
        : safeGlobalPool;
    const primary = pickForSection(section, backfillSource);
    let items = ensureNewsBoxItems(
      primary,
      backfillSource.length > 0 ? backfillSource : hasExplicitPool ? [] : safeGlobalPool,
      limit,
      globalDedupe,
    );
    if (items.length === 0 && !hasExplicitPool && safeGlobalPool.length > 0) {
      items = pickModuleSectionCategoryItems(moduleDedupe, safeGlobalPool, limit, globalDedupe);
    } else if (items.length > 0) {
      rememberPickedItems(items, moduleDedupe, globalDedupe);
    }
    return { ...section, items };
  });

  for (const section of resolved) {
    if (section.items.length === 0 && resolveSectionPool == null && safeGlobalPool.length > 0) {
      section.items = pickModuleSectionCategoryItems(moduleDedupe, safeGlobalPool, limit, globalDedupe);
    }
  }
  return resolved;
}
