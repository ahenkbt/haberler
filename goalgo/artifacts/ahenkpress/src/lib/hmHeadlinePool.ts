import { deferSimilarNewsItems } from "@/lib/hmNewsTitleSimilarity";

/**
 * Manşet havuzu tazelik kuralları:
 * - Manuel / DB haberleri: en fazla 7 gün (MANUAL_HEADLINE_MAX_AGE_MS)
 * - RSS feed haberleri: en fazla 24 saat (RSS_HEADLINE_MAX_AGE_MS)
 *
 * RSS manşet slider: ziyaret bazlı rotasyon + RSS kaynakları.
 * MANŞET HABER kutusu (esenThemeBlock): yalnızca manuel/DB haberler.
 */

export const RSS_HEADLINE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const MANUAL_HEADLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TR_DAY_OFFSET_MS = 3 * 60 * 60 * 1000;
/** Manşet lead rotasyonu: en güncel haberler arasında kalır. */
export const HEADLINE_VISIT_ROTATION_WINDOW = 8;
/** Anasayfa üst manşet slider havuzu — üst sınır. */
export const HM_HOME_HEADLINE_SLIDER_LIMIT = 20;
/** Yeterli veri varken hedeflenen minimum manşet slide sayısı. */
export const HM_HOME_HEADLINE_SLIDER_MIN = 15;
/** Portal3 / klasik «öne çıkanlar» şeridi hedef öşe sayısı. */
export const HM_HOME_FEATURED_STRIP_ITEM_COUNT = 6;
/** leadListSidebar: 1 büyük + 6 liste. */
export const HM_LEAD_LIST_SIDEBAR_TOTAL = 7;
/** Esen «Günün Öne Çıkanları»: 1 büyük manşet + 6 küçük kutu. */
export const HM_ESEN_LEAD_PACK_TOTAL = 7;
/** Split manşet: slider yanında 2×2 yan haber kutusu. */
export const HM_MANSET_SPLIT_SIDE_COUNT = 4;
/** Split manşet yan ızgarası satır sayısı (2×2). */
export const HM_MANSET_SPLIT_SIDE_ROWS = 2;
/** full-numbered manşet: yan sütunda dikey haber kartları (klasik orta kolon 2×2). */
export const HM_MANSET_FULL_NUMBERED_SIDE_COUNT = 4;
/** full-numbered yığılmış yan sütun: reklam / Son Haberler yokken üst sınır. */
export const HM_MANSET_FULL_NUMBERED_SIDE_MAX = 6;

/** full-numbered orta sütun 2×2 ızgarası satır sayısı. */
export function resolveFullNumberedSideGridRows(itemCount: number): number {
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / 2));
}

/** full-numbered sağ sütun kart sayısı — reklam ve Son Haberler ile yüksekliği dengelemek için. */
export function resolveFullNumberedSideCount(opts: {
  hasSidebarAd?: boolean;
  hasHeroLatest?: boolean;
}): number {
  const { hasSidebarAd, hasHeroLatest } = opts;
  if (hasSidebarAd && hasHeroLatest) return HM_MANSET_FULL_NUMBERED_SIDE_COUNT;
  if (hasSidebarAd || hasHeroLatest) return 5;
  return HM_MANSET_FULL_NUMBERED_SIDE_MAX;
}

/** Slider UI / pagination: gerçek havuz boyutu, en fazla limit. */
export function resolveHeadlineSliderDisplayCount(
  poolSize: number,
  limit: number = HM_HOME_HEADLINE_SLIDER_LIMIT,
): number {
  const safe = Math.max(0, poolSize);
  return Math.min(limit, safe);
}

/** Havuz doldurma hedefi: veri >= minTarget ise en az minTarget, en fazla limit. */
export function resolveHeadlineSliderBuildTarget(
  availableCount: number,
  limit: number = HM_HOME_HEADLINE_SLIDER_LIMIT,
  minTarget: number = HM_HOME_HEADLINE_SLIDER_MIN,
): number {
  const available = Math.max(0, availableCount);
  if (available === 0) return 0;
  if (available >= minTarget) return Math.min(limit, Math.max(minTarget, available));
  return Math.min(limit, available);
}

export function newsKeyOf(n: {
  id?: string | number | null;
  slug?: string | null;
  href?: string | null;
  link?: string | null;
  url?: string | null;
  title?: string | null;
  source?: string | null;
}): string {
  const source = String(n?.source ?? "").trim();
  if (n?.id != null) return `${source || "db"}:${String(n.id)}`;
  const slug = String(n?.slug ?? "").trim();
  if (slug) return `slug:${slug}`;
  const href = String(n?.href ?? n?.link ?? n?.url ?? "").trim();
  if (href) return `href:${href}`;
  return `title:${String(n?.title ?? "").trim().toLocaleLowerCase("tr-TR")}`;
}

/** Başlık/slug/href karşılaştırması — hmNewsTitleSimilarity döngüsünden kaçınmak için yerel kopya. */
export function normalizeNewsIdentityKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNewsPathIdentity(href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "";
  const path = raw.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0] ?? "";
  const match = path.match(/\/haber(?:ler\/rss)?\/([^/]+)/i);
  if (!match?.[1]) return "";
  try {
    return normalizeNewsIdentityKey(decodeURIComponent(match[1]).replace(/-/g, " "));
  } catch {
    return normalizeNewsIdentityKey(match[1].replace(/-/g, " "));
  }
}

/** RSS / harici link tekilleştirme — protokol ve sorgu dizesi hariç. */
function normalizeNewsLinkIdentity(href: string): string {
  const raw = String(href ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!raw) return "";
  const withoutProto = raw.replace(/^https?:\/\//, "");
  const slashIdx = withoutProto.indexOf("/");
  const path = (slashIdx >= 0 ? withoutProto.slice(slashIdx) : `/${withoutProto}`).split(/[?#]/)[0] ?? "";
  return path.replace(/\/+$/, "") || path;
}

function rememberNewsAliasKeys(
  item: Parameters<typeof homeNewsAliasKeys>[0],
  seen: Set<string>,
): void {
  for (const key of homeNewsAliasKeys(item)) seen.add(key);
}

function isNewsAliasDuplicate(
  item: Parameters<typeof homeNewsAliasKeys>[0],
  seen: Set<string>,
): boolean {
  return homeNewsAliasKeys(item).some((key) => seen.has(key));
}

export function isRssHybridItem(n: unknown): boolean {
  const item = n as { id?: unknown; href?: unknown; source?: unknown };
  const id = String(item?.id ?? "");
  const href = String(item?.href ?? "");
  return item?.source === "rss" || id.startsWith("rss:") || href.includes("/haberler/rss/");
}

/** HM editör / DB manuel haber — RSS, yekpare-hm-pool ve hibrit RSS hariç. */
export function isHmEditorManualNewsItem(n: unknown): boolean {
  if (isRssHybridItem(n)) return false;
  const item = n as {
    isFeatured?: boolean;
    isEditorManual?: boolean;
    hmSyncKind?: string | null;
    rssSourceUrl?: string | null;
    source?: string | null;
  };
  /** Editör «Manşet» (isFeatured) — DB kaydı; RSS hibrit satırı değilse aday. */
  if (item.isFeatured === true) return true;
  const rssUrl = String(item.rssSourceUrl ?? "").trim();
  if (rssUrl.startsWith("yekpare-hm-pool:")) return false;
  if (item.isEditorManual === true) return true;
  if (item.hmSyncKind === "news") return true;
  if (/^yekpare-hm-sync:\d+:news:\d+$/.test(rssUrl)) return true;
  if (rssUrl) return false;
  return String(item.source ?? "").trim() !== "rss";
}

export function filterHmEditorManualNews<T>(items: readonly T[]): T[] {
  return items.filter(isHmEditorManualNewsItem);
}

/** Editör MANŞET etiketi (`isFeatured`) — RSS / yekpare havuz kopyası hariç. */
export function isHmMansetNewsItem(n: unknown): boolean {
  const item = n as { isFeatured?: boolean | null };
  if (item.isFeatured !== true) return false;
  return isHmEditorManualNewsItem(n);
}

export function filterHmMansetNews<T>(items: readonly T[]): T[] {
  return items.filter(isHmMansetNewsItem);
}

/** Tepe Manşet üst band: yalnızca editör «Manşet» (`isFeatured`) manuel DB haberleri — yedek yok. */
export function buildTepeMansetPool(opts: {
  items: readonly unknown[];
  limit?: number;
}): any[] {
  const limit = opts.limit ?? 5;
  const pool = sortNewsByRecency(
    filterHmMansetNews(filterHmEditorManualNews(opts.items)),
  );
  return pool.slice(0, limit);
}

export function isYekparePoolNewsItem(n: unknown): boolean {
  const rssUrl = String((n as { rssSourceUrl?: string | null }).rssSourceUrl ?? "").trim();
  return rssUrl.startsWith("yekpare-hm-pool:");
}

/** Yekpare havuz adayları — önce `yekpare-hm-pool:` ref, yoksa tüm girdi; eklenme tarihine göre. */
export function buildYekparePoolSortedCandidates<T>(items: readonly T[]): T[] {
  const yekpareOnly = sortNewsByRecency(
    mergeUniqueNews(items.filter(isYekparePoolNewsItem)) as T[],
  );
  return yekpareOnly.length > 0 ? yekpareOnly : sortNewsByRecency([...items]);
}

/** Manşet kategori filtresi — slug / ad eşleşmesi (basit). */
export function filterHeadlineItemsByCategorySlug<T>(
  items: readonly T[],
  categorySlug: string | null | undefined,
): T[] {
  const slug = String(categorySlug ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!slug) return [...items];
  return items.filter((item) => {
    const row = item as { categorySlug?: string | null; categoryName?: string | null };
    const itemSlug = String(row.categorySlug ?? "").trim().toLocaleLowerCase("tr-TR");
    const itemName = String(row.categoryName ?? "").trim().toLocaleLowerCase("tr-TR");
    if (!itemSlug && !itemName) return false;
    if (itemSlug === slug || itemName === slug) return true;
    if (itemSlug.endsWith(`-${slug}`) || slug.endsWith(`-${itemSlug}`)) return true;
    return false;
  });
}

/** Editör SITE MANŞET etiketi (`isSiteManset`) — RSS / yekpare havuz kopyası hariç. */
export function isHmSiteMansetNewsItem(n: unknown): boolean {
  const item = n as { isSiteManset?: boolean | null };
  if (item.isSiteManset !== true) return false;
  return isHmEditorManualNewsItem(n);
}

export function filterHmSiteMansetNews<T>(items: readonly T[]): T[] {
  return items.filter(isHmSiteMansetNewsItem);
}

/**
 * Orta (site) manşet slider:
 * — `isSiteManset` işaretli haberler varsa yalnızca onlar
 * — yoksa en son eklenen editör/DB haberleri (`isFeatured` tepe manşet ve RSS / yekpare hariç)
 */
export function buildCenterMansetSliderPool(opts: {
  manualItems: unknown[];
  latestItems: unknown[];
  categorySlug?: string | null;
  limit?: number;
}): any[] {
  const limit = opts.limit ?? HM_HOME_HEADLINE_SLIDER_MIN;
  const merged = mergeUniqueNews(
    filterHmEditorManualNews(opts.latestItems),
    filterHmEditorManualNews(opts.manualItems),
  ).filter((item) => !isRssHybridItem(item) && !isYekparePoolNewsItem(item));
  const siteManset = filterHmSiteMansetNews(merged);
  const latestFirst =
    siteManset.length > 0
      ? siteManset
      : merged.filter((item) => (item as { isFeatured?: boolean }).isFeatured !== true);
  const scoped = filterHeadlineItemsByCategorySlug(latestFirst, opts.categorySlug);
  const pool = sortNewsByRecency(scoped);
  return dedupeHeadlineSliderItems(pool.slice(0, limit));
}

/** Yan manşet: manşet etiketi yerine en son eklenenler (tepe/orta tekrarı hariç). */
export function buildLatestNewsSideFallbackPool<T>(opts: {
  items: readonly T[];
  sliderItems: readonly T[];
  tepeMansetItems?: readonly T[];
}): T[] {
  const excludeFrom = mergeUniqueNews(opts.sliderItems, opts.tepeMansetItems ?? []);
  const latestPool = sortNewsByRecency(
    mergeUniqueNews(opts.items).filter(
      (item) =>
        !isRssHybridItem(item) &&
        !isYekparePoolNewsItem(item) &&
        (item as { isFeatured?: boolean }).isFeatured !== true,
    ),
  );
  return excludeHeadlineSliderItems(latestPool as T[], excludeFrom);
}

/** Yekpare havuz yan kartları: önce son dakika (`isBreaking`), sonra en güncel. */
export function sortYekparePoolSonDakika<T>(items: readonly T[]): T[] {
  const pool = buildYekparePoolSortedCandidates(items);
  const breaking = pool.filter((item) => (item as { isBreaking?: boolean }).isBreaking === true);
  const rest = pool.filter((item) => (item as { isBreaking?: boolean }).isBreaking !== true);
  return mergeUniqueNews(sortNewsByRecency(breaking), sortNewsByRecency(rest)) as T[];
}

/** Yan manşet: yekpare havuzundan son dakika + güncel (tepe/orta slider tekrarı hariç). */
export function buildYekparePoolSideCandidatePool<T>(opts: {
  yekparePoolItems: readonly T[];
  sliderItems: readonly T[];
  dedupe?: HomeNewsDedupeTracker;
}): T[] {
  const pool = sortYekparePoolSonDakika(opts.yekparePoolItems);
  return buildHeroSideHeadlineFallbackPool({
    pool,
    sliderItems: opts.sliderItems,
    dedupe: opts.dedupe,
  });
}

/** Yekpare havuz kapalıyken yan manşet: `isFeatured` haberler (tepe + orta slider hariç). */
export function buildMansetTaggedSideFallbackPool<T>(opts: {
  items: readonly T[];
  sliderItems: readonly T[];
  tepeMansetItems?: readonly T[];
}): T[] {
  const excludeFrom = mergeUniqueNews(opts.sliderItems, opts.tepeMansetItems ?? []);
  const mansetPool = sortNewsByRecency(filterHmMansetNews(mergeUniqueNews(opts.items)));
  return excludeHeadlineSliderItems(mansetPool, excludeFrom);
}

/** HM sitelerde manşet dışı son dakika: kategori seçiliyken açık, değilken kapalı. */
export function resolveExternalSondakikaEnabled(
  prefs: {
    mansetCategorySlug?: string | null;
    hmNewsBreakingBandEnabled?: boolean;
    hmNewsGoogleNewsBandEnabled?: boolean;
  },
  opts?: { siteId?: number | null; mansetVariant?: string },
): boolean {
  void opts?.mansetVariant;
  const bandEnabled =
    prefs.hmNewsBreakingBandEnabled !== false || prefs.hmNewsGoogleNewsBandEnabled !== false;
  if (!bandEnabled) return false;
  if (String(prefs.mansetCategorySlug ?? "").trim()) return true;
  if (opts?.siteId != null) return false;
  return true;
}

/** Anasayfa tekilleştirme: id, slug, dedupeKey, href ve başlık alias'ları. */
export function homeNewsAliasKeys(n: {
  id?: string | number | null;
  slug?: string | null;
  dedupeKey?: string | null;
  rssSourceUrl?: string | null;
  href?: string | null;
  link?: string | null;
  url?: string | null;
  title?: string | null;
  source?: string | null;
}): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (key: string) => {
    const k = key.trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    keys.push(k);
  };
  push(newsKeyOf(n));
  const dedupeKey = String(n.dedupeKey ?? "").trim().toLocaleLowerCase("tr-TR");
  if (dedupeKey) push(`dedupe:${dedupeKey}`);
  const rssSourceUrl = String(n.rssSourceUrl ?? "").trim().toLocaleLowerCase("tr-TR");
  if (rssSourceUrl) push(`rss:${rssSourceUrl}`);
  const slug = String(n.slug ?? "").trim().toLocaleLowerCase("tr-TR");
  if (slug) push(`slug:${slug}`);
  const slugNorm = normalizeNewsIdentityKey(slug.replace(/-/g, " "));
  if (slugNorm.length >= 8) push(`slugNorm:${slugNorm}`);
  const hrefRaw = String(n.href ?? n.link ?? n.url ?? "").trim();
  const href = hrefRaw.toLocaleLowerCase("tr-TR");
  if (href) push(`href:${href}`);
  const linkNorm = normalizeNewsLinkIdentity(hrefRaw);
  if (linkNorm) push(`linkNorm:${linkNorm}`);
  const pathIdentity = extractNewsPathIdentity(hrefRaw);
  if (pathIdentity.length >= 8) push(`pathNorm:${pathIdentity}`);
  if (!dedupeKey && linkNorm) push(`dedupe:link:${linkNorm}`);
  const title = String(n.title ?? "").trim().toLocaleLowerCase("tr-TR");
  if (title) push(`title:${title}`);
  const titleNorm = normalizeNewsIdentityKey(String(n.title ?? ""));
  if (titleNorm.length >= 8) push(`titleNorm:${titleNorm}`);
  return keys;
}

export type HomeNewsDedupeTracker = {
  remember: (item: unknown) => void;
  rememberMany: (items: readonly unknown[]) => void;
  has: (item: unknown) => boolean;
  filterUnused: <T>(items: readonly T[]) => T[];
  pickUnused: <T>(items: readonly T[], limit?: number) => T[];
};

/** Anasayfa blokları arası global tekilleştirme — render sırasına göre kullanılır. */
export function createHomeNewsDedupeTracker(initialItems?: readonly unknown[]): HomeNewsDedupeTracker {
  const used = new Set<string>();
  const remember = (item: unknown) => {
    for (const key of homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0])) {
      used.add(key);
    }
  };
  const rememberMany = (items: readonly unknown[]) => {
    for (const item of items) remember(item);
  };
  if (initialItems?.length) rememberMany(initialItems);
  const has = (item: unknown) =>
    homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0]).some((key) => used.has(key));
  const filterUnused = <T,>(items: readonly T[]) => items.filter((item) => !has(item));
  const pickUnused = <T,>(items: readonly T[], limit?: number) => {
    const filtered = filterUnused(items);
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  };
  return { remember, rememberMany, has, filterUnused, pickUnused };
}

/** Slider dışındaki haberleri döndürür — yan kart fallback havuzu. */
export function sliderHeadlineKeys(sliderItems: readonly unknown[]): Set<string> {
  const keys = new Set<string>();
  for (const item of sliderItems) {
    for (const key of homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0])) {
      keys.add(key);
    }
  }
  return keys;
}

/** Manşet yan kartları için slider dışı havuz; dedupe boşaltırsa slider dışı tüm havuz kullanılır. */
export function buildHeroSideHeadlineFallbackPool<T>(opts: {
  pool: readonly T[];
  sliderItems: readonly T[];
  dedupe?: HomeNewsDedupeTracker;
}): T[] {
  const slideKeys = sliderHeadlineKeys(opts.sliderItems);
  const notInSlider = opts.pool.filter(
    (item) => !isNewsAliasDuplicate(item as Parameters<typeof homeNewsAliasKeys>[0], slideKeys),
  );
  if (opts.dedupe) {
    const unused = opts.dedupe.filterUnused(notInSlider);
    if (unused.length > 0) return unused;
  }
  return notInSlider;
}

/** Yan manşet havuzu: birincil + genişletilmiş kaynaklar; slider tekrarı hariç. */
export function buildHeroSideHeadlineCandidatePool<T>(opts: {
  primaryPool: readonly T[];
  widenPools?: ReadonlyArray<readonly T[]>;
  sliderItems: readonly T[];
  dedupe?: HomeNewsDedupeTracker;
}): T[] {
  const merged = sortNewsByRecency(
    mergeUniqueNews(opts.primaryPool, ...(opts.widenPools ?? [])) as T[],
  );
  return buildHeroSideHeadlineFallbackPool({
    pool: merged,
    sliderItems: opts.sliderItems,
    dedupe: opts.dedupe,
  });
}

/** Görünür slider lead dışındaki haberler — yalnızca yan slot doldurma son çare. */
function fillHeroSideFromSliderReserve<T>(
  out: T[],
  opts: {
    sliderItems: readonly T[];
    sideCount: number;
    seen: Set<string>;
    totalPoolSize: number;
  },
): T[] {
  const { sliderItems, sideCount, seen, totalPoolSize } = opts;
  if (out.length >= sideCount || totalPoolSize < sideCount + 1) return out;
  const leadKey = sliderItems[0]
    ? newsKeyOf(sliderItems[0] as Parameters<typeof newsKeyOf>[0])
    : "";
  for (const item of sliderItems.slice(1)) {
    if (out.length >= sideCount) break;
    const key = newsKeyOf(item as Parameters<typeof newsKeyOf>[0]);
    if (!key || seen.has(key) || (leadKey && key === leadKey)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Yeterli benzersiz haber varken yan kart slotlarının boş bırakılmaması için kontrol. */
export function hasEnoughNewsForHeroSideHeadlines(
  pool: readonly unknown[],
  sliderItems: readonly unknown[],
  sideCount: number,
): boolean {
  if (sideCount <= 0) return false;
  const candidates = buildHeroSideHeadlineFallbackPool({ pool, sliderItems });
  if (candidates.length >= sideCount) return true;
  if (pool.length >= sideCount + 1 && sliderItems.length > 1) return true;
  return candidates.length >= Math.min(sideCount, Math.max(0, pool.length - 1));
}

/** Manşet yan kart havuzu — yekpare son dakika veya manşet etiketi yedek; portal legacy. */
export function buildHeadlineSidePrimaryPool<T>(opts: {
  siteId?: number | null;
  sliderItems: readonly T[];
  tepeMansetItems?: readonly unknown[];
  tepeMansetActive?: boolean;
  yekparePoolItems?: readonly T[];
  legacySidePool: readonly T[];
  /** \hmYekparePoolReceiveEnabled\; tanımsız = açık. */
  yekparePoolReceiveEnabled?: boolean;
  /** Havuz kapalıyken yan kart için \isFeatured\ adayları. */
  mansetFallbackItems?: readonly unknown[];
}): T[] {
  if (opts.siteId == null) {
    const legacy = [...opts.legacySidePool];
    return opts.tepeMansetActive
      ? excludeHeadlineSliderItems(legacy, opts.tepeMansetItems ?? [])
      : legacy;
  }

  const excludeSlider = mergeUniqueNews(
    opts.sliderItems,
    opts.tepeMansetActive ? (opts.tepeMansetItems ?? []) : [],
  );

  let raw: T[];
  if (opts.yekparePoolReceiveEnabled !== false) {
    raw = buildYekparePoolSideCandidatePool({
      yekparePoolItems: opts.yekparePoolItems ?? [],
      sliderItems: excludeSlider,
    });
  } else {
    raw = buildLatestNewsSideFallbackPool({
      items: opts.mansetFallbackItems ?? [],
      sliderItems: opts.sliderItems,
      tepeMansetItems: opts.tepeMansetActive ? opts.tepeMansetItems : [],
    }) as T[];
  }

  return opts.tepeMansetActive
    ? excludeHeadlineSliderItems(raw, opts.tepeMansetItems ?? [])
    : raw;
}


/** Yan manşet kartları: slider dışı havuzdan seçim + boş slot doldurma. */
export function pickHeroSideHeadlines<T>(opts: {
  pool: readonly T[];
  sliderItems: readonly T[];
  sideCount: number;
  dedupe?: HomeNewsDedupeTracker;
  widenPools?: ReadonlyArray<readonly T[]>;
  resolve?: (input: {
    sideItems: readonly T[];
    sliderItems: readonly T[];
    sideCount: number;
    fallbackPool: readonly T[];
    totalPoolSize: number;
  }) => T[];
}): T[] {
  const sideCount = Math.max(0, opts.sideCount);
  if (sideCount === 0) return [];
  const mergedPool = sortNewsByRecency(
    mergeUniqueNews(opts.pool, ...(opts.widenPools ?? [])) as T[],
  );
  const totalPoolSize = mergedPool.length;
  const fallbackPool = buildHeroSideHeadlineFallbackPool({
    pool: mergedPool,
    sliderItems: opts.sliderItems,
    dedupe: opts.dedupe,
  });
  const sideItemsRaw = opts.dedupe
    ? opts.dedupe.pickUnused(fallbackPool, sideCount)
    : fallbackPool.slice(0, sideCount);
  const resolve = opts.resolve ?? resolveSplitSideHeadlines;
  const result = resolve({
    sideItems: sideItemsRaw,
    sliderItems: opts.sliderItems,
    sideCount,
    fallbackPool,
    totalPoolSize,
  });
  opts.dedupe?.rememberMany(result);
  return result;
}

/** Klasik / portal3 manşet yan kart sayısı (slider dışı havuzdan seçilir). */
export function resolveClassicHeroSideCount(variant: string): number {
  if (variant === "full-thumbs") return 0;
  if (variant === "full-numbered") return HM_MANSET_FULL_NUMBERED_SIDE_COUNT;
  if (variant === "center-trio") return 3;
  if (variant === "slider-side-band") return 3;
  if (variant === "magazine-grid") return HM_MANSET_SPLIT_SIDE_COUNT;
  return HM_MANSET_SPLIT_SIDE_COUNT;
}

/** center-trio yan kartları: dedupe sonrası boş slotları fallback havuzundan doldurur (slider tekrarı yok). */
export function resolveCenterTrioSideHeadlines<T>(opts: {
  sideItems: readonly T[];
  sliderItems: readonly T[];
  sideCount?: number;
  /** Manşet slider dışı benzersiz havuz — boş yan slotları doldurmak için. */
  fallbackPool?: readonly T[];
  totalPoolSize?: number;
}): T[] {
  const sideCount = Math.max(0, opts.sideCount ?? 2);
  const slideKeys = sliderHeadlineKeys(opts.sliderItems);
  const out: T[] = [];
  const seen = new Set<string>();
  const push = (item: T) => {
    const aliases = homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0]);
    if (aliases.length === 0 || aliases.some((key) => seen.has(key) || slideKeys.has(key))) return;
    for (const key of aliases) seen.add(key);
    out.push(item);
  };
  for (const item of opts.sideItems) push(item);
  for (const item of opts.fallbackPool ?? []) {
    if (out.length >= sideCount) break;
    push(item);
  }
  fillHeroSideFromSliderReserve(out, {
    sliderItems: opts.sliderItems,
    sideCount,
    seen,
    totalPoolSize: opts.totalPoolSize ?? (opts.fallbackPool?.length ?? 0) + opts.sliderItems.length,
  });
  return out.slice(0, sideCount);
}

/**
 * split manşet yan kartları: dedupe sonrası boş slotları fallback havuzundan doldurur.
 * Slider haberleri yan kartlara tekrar eklenmez — global havuzdan benzersiz doldurma.
 */
export function resolveSplitSideHeadlines<T>(opts: {
  sideItems: readonly T[];
  sliderItems: readonly T[];
  sideCount?: number;
  /** Manşet slider dışı benzersiz havuz — boş yan slotları doldurmak için. */
  fallbackPool?: readonly T[];
  totalPoolSize?: number;
}): T[] {
  const sideCount = Math.max(0, opts.sideCount ?? HM_MANSET_SPLIT_SIDE_COUNT);
  const slideKeys = sliderHeadlineKeys(opts.sliderItems);
  const out: T[] = [];
  const seen = new Set<string>();
  const push = (item: T) => {
    const aliases = homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0]);
    if (aliases.length === 0 || aliases.some((key) => seen.has(key) || slideKeys.has(key))) return;
    for (const key of aliases) seen.add(key);
    out.push(item);
  };
  for (const item of opts.sideItems) push(item);
  for (const item of opts.fallbackPool ?? []) {
    if (out.length >= sideCount) break;
    push(item);
  }
  fillHeroSideFromSliderReserve(out, {
    sliderItems: opts.sliderItems,
    sideCount,
    seen,
    totalPoolSize: opts.totalPoolSize ?? (opts.fallbackPool?.length ?? 0) + opts.sliderItems.length,
  });
  return out.slice(0, sideCount);
}

/**
 * Manşet türüne göre yan haber hedef sayısı (tema/layout referansı).
 * center-trio editöryal hero modülünde resolveCenterTrioSideHeadlines(3) kullanılır.
 */
export function resolveMansetSideCount(
  variant: string,
  opts?: { hasSidebarAd?: boolean; hasHeroLatest?: boolean },
): number {
  if (variant === "full-thumbs") return 0;
  if (variant === "center-trio") return 3;
  if (variant === "full-numbered") return resolveFullNumberedSideCount(opts ?? {});
  if (variant === "magazine-grid") return 8;
  if (variant === "slider-side-band") return 3;
  return HM_MANSET_SPLIT_SIDE_COUNT;
}

export type ClassicTopGridStateInput = {
  isPortal3Theme: boolean;
  mansetVariant: string;
  sideHeadlineCount: number;
  hasHeroSidebar: boolean;
  /** Manşet türünün hedeflediği yan kart sayısı — grid sütunlarını korumak için. */
  targetSideCount?: number;
  /** Havuzda slider dışı yeterli haber varken yan sütun düzenini zorla. */
  forceSideLayout?: boolean;
};

/**
 * Klasik/portal3 manşet grid sınıfı — yan haberler yüklenmeden tam genişlik (main-only) flash'ını önler.
 * Manşet türü (center-trio, magazine-grid vb.) yapısal sütun düzenini korur.
 */
export function resolveClassicTopGridState(input: ClassicTopGridStateInput): string {
  const { isPortal3Theme, mansetVariant, hasHeroSidebar, forceSideLayout } = input;
  const sideHeadlineCount =
    forceSideLayout && (input.targetSideCount ?? 0) > 0
      ? Math.max(input.sideHeadlineCount, input.targetSideCount ?? 0)
      : input.sideHeadlineCount;

  if (mansetVariant === "center-trio") {
    if (hasHeroSidebar) return "hm-classic-top-grid--center-trio-with-sidebar";
    return "";
  }

  if (mansetVariant === "magazine-grid") {
    if (sideHeadlineCount === 0 && !hasHeroSidebar) return "hm-classic-top-grid--magazine-no-side";
    if (sideHeadlineCount === 0) return "hm-classic-top-grid--magazine-no-side";
    if (!hasHeroSidebar) return "hm-classic-top-grid--magazine-no-sidebar";
    return "";
  }

  if (mansetVariant === "full-thumbs") {
    return "";
  }

  if (mansetVariant === "full-numbered") {
    if (sideHeadlineCount === 0 && !hasHeroSidebar) return "hm-classic-top-grid--main-only";
    return "";
  }

  if (mansetVariant === "split") {
    if (sideHeadlineCount === 0 && !hasHeroSidebar) return "hm-classic-top-grid--main-only";
    return "";
  }

  if (mansetVariant === "slider-side-band") {
    if (sideHeadlineCount === 0 && !hasHeroSidebar) return "hm-classic-top-grid--main-only";
    if (hasHeroSidebar) return "hm-classic-top-grid--center-trio-with-sidebar";
    return "hm-classic-top-grid--center-trio";
  }

  if (isPortal3Theme) {
    if (hasHeroSidebar) return "hm-classic-top-grid--portal3";
    if (sideHeadlineCount > 0) return "hm-classic-top-grid--portal3-no-sidebar";
    return "hm-classic-top-grid--portal3-no-sidebar";
  }

  if (sideHeadlineCount === 0) {
    return "hm-classic-top-grid--no-side";
  }

  return "";
}

/**
 * Modül haber seçimi: anasayfa blokları arasında global dedupe — daha önce manşet veya
 * üst modülde kullanılan haber tekrar seçilmez (blok kısa kalabilir).
 */
export function pickHomeModuleNewsItems<T>(
  tracker: HomeNewsDedupeTracker,
  sortedItems: readonly T[],
  opts?: { limit?: number; minItems?: number },
): T[] {
  const limit = opts?.limit;
  const unused = tracker.filterUnused(sortedItems);
  const seen = new Set<string>();
  const pushUnique = (out: T[], item: T) => {
    if (isNewsAliasDuplicate(item as Parameters<typeof homeNewsAliasKeys>[0], seen)) return;
    rememberNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0], seen);
    out.push(item);
  };
  const out: T[] = [];
  for (const item of unused) {
    if (typeof limit === "number" && out.length >= limit) break;
    pushUnique(out, item);
  }
  tracker.rememberMany(out);
  return out;
}

/** Haber eklenme tarihi — manşet havuzlarında tutarlı sıralama alanı. */
export function newsItemRecencyMs(n: unknown): number {
  const item = n as { createdAt?: string | null; publishedAt?: string | null; date?: string | null };
  const raw = item?.createdAt ?? item?.publishedAt ?? item?.date;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function sortNewsByRecency<T>(items: readonly T[] | null | undefined): T[] {
  const source = Array.isArray(items) ? items : [];
  return [...source].sort((a, b) => newsItemRecencyMs(b) - newsItemRecencyMs(a));
}

export function isHeadlineFreshEnough(n: unknown): boolean {
  const isRss = isRssHybridItem(n);
  const rawDate = (n as { createdAt?: string; publishedAt?: string; date?: string })?.createdAt
    ?? (n as { publishedAt?: string }).publishedAt
    ?? (n as { date?: string }).date;
  if (!rawDate) return !isRss;
  const time = new Date(rawDate).getTime();
  if (!Number.isFinite(time)) return !isRss;
  const maxAge = isRss ? RSS_HEADLINE_MAX_AGE_MS : MANUAL_HEADLINE_MAX_AGE_MS;
  return Date.now() - time <= maxAge;
}

function turkeyCalendarDayKey(ms: number): string {
  const tr = new Date(ms + TR_DAY_OFFSET_MS);
  return `${tr.getUTCFullYear()}-${tr.getUTCMonth()}-${tr.getUTCDate()}`;
}

/** Günün öne çıkanları — yalnızca bugün (TR) yayınlanan/eklenen haberler. */
export function isTodayHeadlineNews(n: unknown): boolean {
  if (!isHeadlineFreshEnough(n)) return false;
  const recency = newsItemRecencyMs(n);
  if (!recency) return false;
  return turkeyCalendarDayKey(recency) === turkeyCalendarDayKey(Date.now());
}

/** Önce taze adaylar; hiç taze yoksa manuel/DB yedek (RSS hariç — RSS yalnızca taze kalır). */
export function preferFreshHeadlineCandidates<T>(items: readonly T[]): T[] {
  const source = Array.isArray(items) ? items : [];
  const fresh = source.filter(isHeadlineFreshEnough);
  if (fresh.length > 0) return fresh;
  return source.filter((item) => !isRssHybridItem(item));
}

/** Alias çakışmasında hangi kaynak kazanır — editör manuel haber görseli korunur. */
function mergeNewsItemPriority(item: unknown): number {
  if (isHmEditorManualNewsItem(item)) {
    const siteId = (item as { siteId?: number | null }).siteId;
    if (siteId != null && siteId > 0) return 3;
    return 2;
  }
  if (isYekparePoolNewsItem(item)) return 0;
  if (isRssHybridItem(item)) return 0;
  return 1;
}

function mergeNewsItemHasImage(item: unknown): boolean {
  return Boolean(String((item as { imageUrl?: string | null }).imageUrl ?? "").trim());
}

function findAliasConflictIndex(
  item: Parameters<typeof homeNewsAliasKeys>[0],
  aliasIndex: Map<string, number>,
): number | null {
  for (const key of homeNewsAliasKeys(item)) {
    const idx = aliasIndex.get(key);
    if (idx != null) return idx;
  }
  return null;
}

function clearAliasIndexForItem(
  item: Parameters<typeof homeNewsAliasKeys>[0],
  idx: number,
  aliasIndex: Map<string, number>,
): void {
  for (const key of homeNewsAliasKeys(item)) {
    if (aliasIndex.get(key) === idx) aliasIndex.delete(key);
  }
}

function bindAliasIndex(
  idx: number,
  item: Parameters<typeof homeNewsAliasKeys>[0],
  aliasIndex: Map<string, number>,
): void {
  for (const key of homeNewsAliasKeys(item)) {
    aliasIndex.set(key, idx);
  }
}

export function mergeUniqueNews(...groups: unknown[]): any[] {
  const aliasIndex = new Map<string, number>();
  const out: any[] = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const typed = item as Parameters<typeof homeNewsAliasKeys>[0];
      const aliases = homeNewsAliasKeys(typed);
      if (aliases.length === 0) continue;
      const conflictIdx = findAliasConflictIndex(typed, aliasIndex);
      if (conflictIdx != null) {
        const existing = out[conflictIdx];
        const newPriority = mergeNewsItemPriority(item);
        const oldPriority = mergeNewsItemPriority(existing);
        const newHasImage = mergeNewsItemHasImage(item);
        const oldHasImage = mergeNewsItemHasImage(existing);
        const replace =
          newPriority > oldPriority ||
          (newPriority === oldPriority && newHasImage && !oldHasImage);
        if (replace) {
          clearAliasIndexForItem(existing as Parameters<typeof homeNewsAliasKeys>[0], conflictIdx, aliasIndex);
          out[conflictIdx] = item;
          bindAliasIndex(conflictIdx, typed, aliasIndex);
        }
        continue;
      }
      const idx = out.length;
      out.push(item);
      bindAliasIndex(idx, typed, aliasIndex);
    }
  }
  return out;
}

/** Manşet slider: alias tabanlı tekilleştirme — aynı haber en fazla bir slide. */
export function dedupeHeadlineSliderItems<T>(items: readonly T[] | null | undefined): T[] {
  return mergeUniqueNews(Array.isArray(items) ? items : []) as T[];
}

export function createHeadlineVisitSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

export function rotateHeadlinePool(items: any[], offset: number): any[] {
  if (items.length <= 1) return items;
  const n = items.length;
  const start = ((offset % n) + n) % n;
  if (start === 0) return items;
  return [...items.slice(start), ...items.slice(0, start)];
}

/** En güncel haberler arasında ziyaret bazlı lead rotasyonu. */
export function applyHeadlineVisitRotation(pool: any[], visitSeed: number): any[] {
  if (pool.length <= 1) return pool;
  const windowSize = Math.min(pool.length, HEADLINE_VISIT_ROTATION_WINDOW);
  const window = pool.slice(0, windowSize);
  const rest = pool.slice(windowSize);
  const offset = visitSeed % window.length;
  return [...rotateHeadlinePool(window, offset), ...rest];
}

/** Kategori bazında en yeni RSS temsilcisi (ilk bulunan, en eski RSS deşil). */
export function pickLatestRssPerCategory(items: unknown[]): any[] {
  const byCategory = new Map<string, any>();
  for (const item of items) {
    if (!isRssHybridItem(item)) continue;
    if (!isHeadlineFreshEnough(item)) continue;
    const category = String(
      (item as { categorySlug?: string; categoryName?: string; feedLabel?: string })?.categorySlug
        ?? (item as { categoryName?: string }).categoryName
        ?? (item as { feedLabel?: string }).feedLabel
        ?? "",
    ).trim().toLocaleLowerCase("tr-TR");
    if (!category) continue;
    const existing = byCategory.get(category);
    if (!existing || newsItemRecencyMs(item) > newsItemRecencyMs(existing)) {
      byCategory.set(category, item);
    }
  }
  return sortNewsByRecency(Array.from(byCategory.values()));
}

/** RSS manşet adayları: kategori temsilcileri önce, kalan RSS ile havuz limit'e kadar doldurulur. */
function buildRssHeadlineCandidates(rssItems: any[], rssEnabled: boolean, limit: number): any[] {
  if (!rssEnabled || rssItems.length === 0 || limit <= 0) return [];
  const reps = pickLatestRssPerCategory(rssItems);
  const rest = sortNewsByRecency(
    rssItems.filter((item) => !reps.some((rep) => newsKeyOf(rep) === newsKeyOf(item))),
  );
  return mergeUniqueNews(reps, rest).slice(0, limit);
}

function interleaveHeadlineItems(manualItems: any[], rssItems: any[], limit: number): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  let mi = 0;
  let ri = 0;
  const push = (item: any): boolean => {
    if (isNewsAliasDuplicate(item, seen)) return false;
    rememberNewsAliasKeys(item, seen);
    out.push(item);
    return true;
  };

  while (out.length < limit && (mi < manualItems.length || ri < rssItems.length)) {
    if (mi < manualItems.length) push(manualItems[mi++]);
    if (out.length >= limit) break;
    if (ri < rssItems.length) push(rssItems[ri++]);
    if (mi >= manualItems.length && ri < rssItems.length) push(rssItems[ri++]);
  }
  return out.slice(0, limit);
}

/**
 * RSS + manuel manşet havuzu: en yeni önce, RSS kategori temsilcileri, ziyaret rotasyonu.
 */
export function buildRssAwareHeadlinePool(opts: {
  manualItems: unknown[] | null | undefined;
  latestItems: unknown[] | null | undefined;
  rssEnabled: boolean;
  limit?: number;
  minTarget?: number;
  minManual?: number;
  /** Hibrit RSS bootstrap tamamlandığında taze RSS manşete öncelik alır. */
  rssBootstrapReady?: boolean;
  visitSeed?: number;
}): any[] {
  const limit = opts.limit ?? HM_HOME_HEADLINE_SLIDER_LIMIT;
  const minTarget = opts.minTarget ?? HM_HOME_HEADLINE_SLIDER_MIN;
  const manualItems = Array.isArray(opts.manualItems) ? opts.manualItems : [];
  const latestItems = Array.isArray(opts.latestItems) ? opts.latestItems : [];

  const allManual = sortNewsByRecency(
    mergeUniqueNews(
      manualItems.filter((item) => !isRssHybridItem(item)),
      latestItems.filter((item) => !isRssHybridItem(item)),
    ),
  );
  const allRss = sortNewsByRecency(latestItems.filter((item) => isRssHybridItem(item)));
  const freshRssSorted = allRss.filter(isHeadlineFreshEnough);
  const minManualDefault = Math.max(0, opts.minManual ?? 3);
  const minManual =
    opts.rssBootstrapReady && opts.rssEnabled && freshRssSorted.length > 0
      ? Math.min(minManualDefault, 1)
      : minManualDefault;

  const buildPool = (): any[] => {
    const manualPool = preferFreshHeadlineCandidates(allManual);
    const manual = manualPool.slice(0, Math.max(minManual, Math.min(manualPool.length, limit)));
    const rssSorted = freshRssSorted;
    const rss = buildRssHeadlineCandidates(rssSorted, opts.rssEnabled, limit);

    const interleaved = interleaveHeadlineItems(manual, rss, limit);
    let pool = sortNewsByRecency(
      mergeUniqueNews(
        interleaved,
        manualPool,
        rss,
        latestItems.filter(isHeadlineFreshEnough),
        manualItems.filter(isHeadlineFreshEnough),
      ),
    );
    if (pool.length < limit) {
      pool = sortNewsByRecency(
        mergeUniqueNews(pool, manualPool, rss, latestItems.filter(isHeadlineFreshEnough), manualItems.filter(isHeadlineFreshEnough)),
      );
    }
    const target = resolveHeadlineSliderBuildTarget(pool.length, limit, minTarget);
    return pool.slice(0, target);
  };

  let pool = buildPool();

  if (opts.rssBootstrapReady && opts.rssEnabled && freshRssSorted.length > 0) {
    const rssLead = buildRssHeadlineCandidates(freshRssSorted, true, limit);
    if (rssLead.length > 0) {
      pool = sortNewsByRecency(mergeUniqueNews(rssLead, pool)).slice(0, limit);
    }
  }

  pool = dedupeHeadlineSliderItems(deferSimilarNewsItems(pool));

  if (typeof opts.visitSeed === "number") {
    return applyHeadlineVisitRotation(pool, opts.visitSeed);
  }
  return pool;
}

/** MANŞET HABER kutusu: editör manuel/DB haberler; RSS hibrit hariç. Tazelik yetersizse geniş havuz. */
export function buildManualHeadlineOnlyPool(opts: {
  manualItems: unknown[];
  latestItems: unknown[];
  limit?: number;
}): any[] {
  const limit = opts.limit ?? HM_HOME_HEADLINE_SLIDER_LIMIT;
  const merged = mergeUniqueNews(
    filterHmEditorManualNews(opts.manualItems),
    filterHmEditorManualNews(opts.latestItems),
  );
  let pool = sortNewsByRecency(preferFreshHeadlineCandidates(merged));
  return pool.slice(0, limit);
}

/** Tepe Manşet / MANŞET etiketli havuz: yalnızca `isFeatured` manuel haberler; manuel yedek yok. */
export function buildMansetHeadlineOnlyPool(opts: {
  manualItems: unknown[];
  latestItems: unknown[];
  limit?: number;
}): any[] {
  const limit = opts.limit ?? HM_HOME_HEADLINE_SLIDER_LIMIT;
  const manual = mergeUniqueNews(
    filterHmEditorManualNews(opts.manualItems),
    filterHmEditorManualNews(opts.latestItems),
  );
  const pool = sortNewsByRecency(preferFreshHeadlineCandidates(filterHmMansetNews(manual)));
  return pool.slice(0, limit);
}

/**
 * Anasayfa global dedupe seed — öncelik sırası:
 * tepe manşet > orta slider > yan kartlar > son dakika > ek havuz.
 */
export function buildHomePageDedupeSeedItems(opts: {
  tepeMansetItems?: readonly unknown[];
  sliderItems?: readonly unknown[];
  sideHeadlineItems?: readonly unknown[];
  breakingItems?: readonly unknown[];
  sonDakikaItems?: readonly unknown[];
  categoryVitrinItems?: readonly unknown[];
  extraItems?: readonly unknown[];
}): unknown[] {
  return mergeUniqueNews(
    opts.tepeMansetItems ?? [],
    opts.sliderItems ?? [],
    opts.sideHeadlineItems ?? [],
    opts.breakingItems ?? [],
    opts.sonDakikaItems ?? [],
    opts.categoryVitrinItems ?? [],
    opts.extraItems ?? [],
  );
}

/** @deprecated buildHomePageDedupeSeedItems kullanın. */
export const buildHomeHeroDedupeSeedItems = buildHomePageDedupeSeedItems;

/** Yan panel / liste blokları: global dedupe sonrası limit kadar haber seçer. */
export function pickHomeDisplayNewsItems<T>(
  tracker: HomeNewsDedupeTracker,
  items: readonly T[],
  limit?: number,
): T[] {
  const picked =
    typeof limit === "number" ? tracker.pickUnused(items, limit) : tracker.filterUnused(items);
  tracker.rememberMany(picked);
  return picked;
}


/** Yan manşet kartları — dedupe tracker oluşturulmadan önce seed için. */
export function buildHomeMansetSideHeadlineSeedItems<T>(opts: {
  pool: readonly T[];
  sliderItems: readonly T[];
  sideCount: number;
  widenPools?: ReadonlyArray<readonly T[]>;
  resolve?: (input: {
    sideItems: readonly T[];
    sliderItems: readonly T[];
    sideCount: number;
    fallbackPool: readonly T[];
    totalPoolSize: number;
  }) => T[];
}): T[] {
  if (opts.sideCount <= 0 || opts.sliderItems.length === 0) return [];
  return pickHeroSideHeadlines({
    pool: opts.pool,
    widenPools: opts.widenPools,
    sliderItems: opts.sliderItems,
    sideCount: opts.sideCount,
    resolve: opts.resolve,
  });
}

/** Tepe Manşet vb. üst bant haberlerini slider / yan kart havuzlarından çıkarır. */
export function excludeHeadlineSliderItems<T>(
  items: readonly T[] | null | undefined,
  excludeItems: readonly unknown[] | null | undefined,
): T[] {
  const source = Array.isArray(items) ? items : [];
  const exclude = Array.isArray(excludeItems) ? excludeItems : [];
  if (source.length === 0 || exclude.length === 0) return [...source];
  const excludeKeys = sliderHeadlineKeys(exclude);
  return source.filter(
    (item) => !isNewsAliasDuplicate(item as Parameters<typeof homeNewsAliasKeys>[0], excludeKeys),
  );
}

/**
 * Klasik / Gazete Portal (portal3) üst manşet slider: önce RSS-aware sliderNews,
 * yetersizse havuz birleştirerek HM_HOME_HEADLINE_SLIDER_LIMIT (20) hedeflenir.
 */
export function buildClassicHeadlineSliderPool(opts: {
  sliderItems: unknown[] | null | undefined;
  fallbackGroups: ReadonlyArray<unknown[] | null | undefined>;
  limit?: number;
  minTarget?: number;
}): any[] {
  const limit = opts.limit ?? HM_HOME_HEADLINE_SLIDER_LIMIT;
  const minTarget = opts.minTarget ?? HM_HOME_HEADLINE_SLIDER_MIN;
  const fromSlider = (Array.isArray(opts.sliderItems) ? opts.sliderItems : []).filter(Boolean);

  const merged = sortNewsByRecency(
    preferFreshHeadlineCandidates(mergeUniqueNews(fromSlider, ...opts.fallbackGroups)),
  );
  const target = resolveHeadlineSliderBuildTarget(merged.length, limit, minTarget);
  return dedupeHeadlineSliderItems(merged.slice(0, target)).slice(0, limit);
}

/** HM / portal / yekpare manşet slider havuzu — buildClassicHeadlineSliderPool ile aynı. */
export const buildHeadlineSliderPool = buildClassicHeadlineSliderPool;

/** Yekpare / SixAmMart haber vitrini manşet havuzu. */
export function buildPortalHeadlinePool(opts: {
  manualItems: unknown[];
  latestItems: unknown[];
  rssEnabled: boolean;
  limit?: number;
  visitSeed?: number;
}): any[] {
  return buildRssAwareHeadlinePool({
    manualItems: opts.manualItems,
    latestItems: opts.latestItems,
    rssEnabled: opts.rssEnabled,
    limit: opts.limit ?? HM_HOME_HEADLINE_SLIDER_LIMIT,
    visitSeed: opts.visitSeed,
  });
}
