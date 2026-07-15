import { and, desc, eq, ilike, isNotNull, isNull, or, sql, inArray, type SQL } from "drizzle-orm";
import { getNewsDbForRead, db as mainDb, newsTable, categoriesTable, newsSiteOverridesTable } from "@workspace/db";
import {
  buildHmSyncDedupeKey,
  excludeCorporateOriginCentralNewsSql,
  loadCorporateHmSiteIds,
} from "./hm-yekpare-news-sync.js";
import {
  centralNewsRowVisibleOnHmEditorSite,
  filterNonCorporateOriginCentralNewsItems,
  isExternalManualEditorNewsForSite,
} from "./hm-corporate-news-policy.js";
import { loadNewsContext } from "./news-context.js";
import {
  collectEditorScopedPoolTargetIds,
  dedupeEditorScopedDbNewsItems,
  editorScopedNewsRecencyMs,
} from "./editor-scoped-news-dedupe.js";
import { normalizeArticleTitle } from "./hm-sync-source.js";
import { deferSimilarNewsItems } from "./news-title-similarity.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";
import { newsRowVisibleOnHmSiteByRssTarget } from "./rss-campaign-target.js";
import { sanitizeCumhaRssSpot } from "./rssCumhaExclude.js";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { sanitizeDisplayText } from "./sanitizeDisplayText.js";
import { serializeNewsListItem, newsListSelectFields, type NewsContext, type SerializedNewsListItem } from "./serializers.js";
import { normalizePublicMediaUrl } from "./normalizePublicMediaUrl.js";
import { resolveNewsItemImageUrl } from "./news-display-image.js";
import {
  enrichSerializedNewsListImages,
  filterHiddenPoolNewsItems,
} from "./news-list-image-enrich.js";
import { ensureNewsPublicSubmissionColumns } from "./news-public-submission-schema.js";
import { PORTAL_ORIGIN } from "./portalBrand.js";
import { buildYekparePortalArticleUrl } from "./site-public-origin.js";
import {
  findPortalCategoryIdsBySlug,
  findPortalGlobalCategoryBySlug,
  loadHmSiteSlugPrefixes,
  normalizePortalCategoryFields,
  normalizePortalCategorySlug,
  portalCategorySlugMatches,
} from "./portal-category-slug.js";
import { portalRssTitleKey, portalRssInternalHref, type PortalRssItem } from "./portal-rss-fetch.js";
import {
  filterGlobalCategoryNewsItems,
  HM_GLOBAL_NEWS_CATEGORY_SLUG,
} from "./hm-global-news-category.js";
import {
  excludeKoseFromEditorialNewsList,
  isKoseArticle,
  KOSE_ARTICLE_CATEGORY_NAME,
  KOSE_ARTICLE_CATEGORY_SLUG,
  resolveArticlePublicPath,
} from "./kose-article.js";
export {
  filterForeignOnlyPortalHybridRssFeeds,
  filterForeignOnlyPortalRssItems,
} from "./hybrid-news-foreign-rss.js";

export { dedupeEditorScopedDbNewsItems } from "./editor-scoped-news-dedupe.js";

export type HybridRotateSource = "db" | "rss" | "author";

export const HYBRID_ROTATE_SOURCES: HybridRotateSource[] = ["db", "rss", "author"];

export type HybridNewsItem = {
  id: string;
  source: HybridRotateSource;
  title: string;
  slug: string | null;
  href: string;
  spot: string | null;
  content: string | null;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  categoryId?: number | null;
  categoryColor: string;
  externalUrl: string | null;
  /** RSS feed orijinal makale URL — public API; href asla harici olmaz. */
  rssSourceUrl: string | null;
  /** Canonical origin article URL (absolute https) — cross-site pool/sync/portal. */
  originUrl?: string | null;
  /** Origin site public base URL. */
  sourceSiteUrl?: string | null;
  /** Site DB id where article was originally published; null = Yekpare portal. */
  publishedOnSiteId?: number | null;
  sourceSiteSlug?: string | null;
  publishedAt: string;
  feedId: string | null;
  feedLabel: string | null;
  authorName: string | null;
  isFeatured: boolean;
  isBreaking: boolean;
  views: number;
  isEditorManual?: boolean;
  hmSyncKind?: "news" | "makale" | null;
  contentKind?: "news" | "makale";
  authorId?: number | null;
  /** Newsmap — RSS feed geo metadata */
  geoLat?: number | null;
  geoLng?: number | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
};

export type PortalHybridFeedGeo = {
  geoLat?: number | null;
  geoLng?: number | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
};

type DbSerialized = SerializedNewsListItem;

export function scopeNewsContextForSite(ctx: NewsContext, siteId: number | null): NewsContext {
  if (siteId == null) return ctx;
  return {
    ...ctx,
    categories: new Map(
      [...ctx.categories.entries()].filter(([, category]) => {
        const exclusiveSiteId = category.exclusiveSiteId;
        return exclusiveSiteId == null || exclusiveSiteId === siteId;
      }),
    ),
  };
}

function dbDedupeKey(item: DbSerialized): string {
  const titleKey = normalizeArticleTitle(item.title) || portalRssTitleKey(item.title);
  const slug = String(item.slug ?? "").trim().toLowerCase();
  if (slug) return `slug:${slug}`;
  return `title:${titleKey}`;
}

function rssDedupeKey(item: PortalRssItem): string {
  const normalized = normalizeRssSourceUrl(item.link);
  if (normalized) return `link:${normalized}`;
  const link = item.link.trim().toLowerCase();
  if (link) return `link:${link}`;
  return `title:${item.titleKey}`;
}

/**
 * Yekpare havuzunda `hmActivatedCategorySlugs` filtresi yalnızca genel akışta uygulanır.
 * `/kategori/:slug` gibi açık kategori isteklerinde havuz zaten kategoriye indirgenmiştir;
 * tekrar aktivasyon süzgeci uygulanırsa opt-in olmayan slug'lar (ör. asayis) boş kalır.
 */
export function shouldApplyActivatedPoolCategoryFilter(categorySlug?: string | null | undefined): boolean {
  return !normalizePortalCategorySlug(categorySlug);
}

async function findCategoryForScope(categorySlug: string, siteId: number | null): Promise<{ id: number } | null> {
  const slug = normalizePortalCategorySlug(categorySlug);
  if (!slug) return null;
  if (siteId == null) {
    return findPortalGlobalCategoryBySlug(slug);
  }
  const siteSlugs = await loadHmSiteSlugPrefixes();
  const rows = await getNewsDbForRead()
    .select({ id: categoriesTable.id, exclusiveSiteId: categoriesTable.exclusiveSiteId, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId))!);
  const siteExclusive = rows.find(
    (row) =>
      row.exclusiveSiteId === siteId &&
      portalCategorySlugMatches(slug, String(row.slug ?? ""), siteSlugs),
  );
  if (siteExclusive) return { id: siteExclusive.id };
  const globalIds = await findPortalCategoryIdsBySlug(slug);
  return globalIds.length > 0 ? { id: globalIds[0]! } : null;
}

function dbToHybrid(item: DbSerialized, source: "db" | "author" = "db", rssImageUrl?: string | null): HybridNewsItem {
  const slug = item.slug;
  const ownImage = resolveNewsItemImageUrl(item);
  const imageUrl = ownImage || rssImageUrl || item.imageUrl;
  const kose = isKoseArticle(item);
  const href = resolveArticlePublicPath({ ...item, slug, id: item.id });
  return {
    id: `db:${item.id}`,
    source: kose ? "author" : source,
    title: item.title,
    slug,
    href,
    spot: item.spot,
    content: null,
    imageUrl,
    categorySlug: kose ? KOSE_ARTICLE_CATEGORY_SLUG : item.categorySlug,
    categoryName: kose ? KOSE_ARTICLE_CATEGORY_NAME : item.categoryName,
    categoryId: kose ? null : item.categoryId ?? null,
    categoryColor: item.categoryColor,
    externalUrl: null,
    rssSourceUrl: String(item.rssSourceUrl ?? "").trim() || null,
    originUrl: null,
    sourceSiteUrl: null,
    publishedOnSiteId: item.siteId ?? null,
    sourceSiteSlug: null,
    publishedAt: item.createdAt,
    feedId: null,
    feedLabel: null,
    authorName: item.authorName,
    isFeatured: item.isFeatured,
    isBreaking: item.isBreaking,
    views: item.views ?? 0,
    isEditorManual: item.isEditorManual ?? false,
    hmSyncKind: item.hmSyncKind ?? null,
    contentKind: item.contentKind ?? (kose ? "makale" : "news"),
    authorId: item.authorId ?? null,
  };
}

function rssToHybrid(
  item: PortalRssItem,
  feedLabel: string | null,
  ctx: Awaited<ReturnType<typeof loadNewsContext>>,
  feedGeo?: PortalHybridFeedGeo | null,
): HybridNewsItem {
  const cat = [...ctx.categories.values()].find((c) => c.slug === item.categorySlug);
  return {
    id: `rss:${item.id}`,
    source: "rss",
    title: decodeHtmlEntities(item.title),
    slug: null,
    href: portalRssInternalHref(item.id),
    spot: item.spot ? sanitizeCumhaRssSpot(decodeHtmlEntities(item.spot), item.link) || null : null,
    content: null,
    imageUrl: item.imageUrl,
    categorySlug: item.categorySlug,
    categoryName: sanitizeDisplayText(cat?.name ?? feedLabel ?? item.categorySlug),
    categoryColor: cat?.color ?? "#CC0000",
    externalUrl: item.link || null,
    rssSourceUrl: item.link?.trim() || null,
    originUrl: item.link?.trim() || null,
    sourceSiteUrl: null,
    publishedOnSiteId: null,
    sourceSiteSlug: null,
    publishedAt: item.publishedAt,
    feedId: item.feedId,
    feedLabel: feedLabel != null ? sanitizeDisplayText(feedLabel) : null,
    authorName: feedLabel != null ? sanitizeDisplayText(feedLabel) : null,
    isFeatured: false,
    isBreaking: false,
    views: 0,
    geoLat: feedGeo?.geoLat ?? null,
    geoLng: feedGeo?.geoLng ?? null,
    regionKey: feedGeo?.regionKey ?? null,
    regionLabel: feedGeo?.regionLabel ?? null,
    countryCode: feedGeo?.countryCode ?? null,
  };
}

export async function loadPortalDbNews(opts: {
  categorySlug?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ items: DbSerialized[]; total: number }> {
  await ensureNewsPublicSubmissionColumns();
  // Yekpare merkez havuzu: siteye özel (site_only) haberler dahil edilmez.
  const conds: SQL[] = [eq(newsTable.status, "published"), isNull(newsTable.siteId), eq(newsTable.siteOnly, false)];
  const corporateSiteIds = await loadCorporateHmSiteIds();
  const corporateExcl = excludeCorporateOriginCentralNewsSql(corporateSiteIds);
  if (corporateExcl) conds.push(corporateExcl);

  if (opts.q) {
    const pattern = `%${opts.q}%`;
    conds.push(or(ilike(newsTable.title, pattern), ilike(newsTable.spot, pattern))!);
  }

  if (opts.categorySlug) {
    const portalCategoryIds = await findPortalCategoryIdsBySlug(opts.categorySlug);
    if (portalCategoryIds.length === 0) return { items: [], total: 0 };
    conds.push(inArray(newsTable.categoryId, portalCategoryIds));
  }

  const where = and(...conds);
  const ctx = await loadNewsContext();
  const [rows, totalRows] = await Promise.all([
    getNewsDbForRead()
      .select(newsListSelectFields)
      .from(newsTable)
      .where(where)
      .orderBy(desc(newsTable.createdAt))
      .limit(opts.limit + opts.offset + 100),
    getNewsDbForRead()
      .select({ count: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(where),
  ]);

  return {
    items: excludeKoseFromEditorialNewsList(
      filterNonCorporateOriginCentralNewsItems(
        rows.map((r) => serializeNewsListItem(r, ctx)),
        corporateSiteIds,
      ),
    ),
    total: totalRows[0]?.count ?? 0,
  };
}

/** HM editör sitesi havuz seçenekleri — public vitrinde merkez canlı birleşmez (onaylı yerel kopya gerekir). */
export function resolveEditorScopedPoolOpts(hmAccess: {
  isCorporate: boolean;
  activatedCategorySlugs: string[];
  hiddenPoolNewsIds: number[];
  allowCrossSiteManualNews: boolean;
  yekparePoolReceiveEnabled?: boolean;
}): {
  activatedSlugs: string[];
  activationDefault: "all" | "none";
  hiddenPoolNewsIds: number[];
  excludeCentralPool: boolean;
  allowCrossSiteManualNews: boolean;
  yekparePoolReceiveEnabled: boolean;
} {
  const poolReceiveOff = hmAccess.yekparePoolReceiveEnabled === false;
  return {
    activatedSlugs: hmAccess.activatedCategorySlugs,
    activationDefault: hmAccess.isCorporate ? "none" : "all",
    hiddenPoolNewsIds: hmAccess.hiddenPoolNewsIds,
    // Public hybrid: asla merkez canlı merge — havuz alımı açıksa bile taslak/onay gerekir.
    excludeCentralPool: true,
    allowCrossSiteManualNews: hmAccess.isCorporate ? false : !poolReceiveOff && hmAccess.allowCrossSiteManualNews,
    yekparePoolReceiveEnabled: hmAccess.isCorporate ? false : !poolReceiveOff,
  };
}

/**
 * Editör sitesi okuma havuzu (kesinleşmiş model):
 *  - Yekpare merkez havuzu (news.site_id NULL, yayınlanmış) — etkin kategorilere göre,
 *  - + editörün kendi manuel haberleri (news.site_id = siteId).
 * Kurumsal vitrin temasında `excludeCentralPool` ile yalnızca site-yerel satırlar döner.
 * (Kutu içi RSS ayrı, canlı; bu fonksiyona dahil değil.)
 */
export async function loadEditorScopedDbNews(opts: {
  siteId: number;
  categorySlug?: string;
  q?: string;
  limit: number;
  offset: number;
  /** Editörün AÇIK ettiği global kategori slug'ları. Boş/undefined = yapılandırılmamış → `activationDefault`. */
  activatedSlugs?: string[];
  /**
   * Yapılandırma yoksa varsayılan davranış:
   *  - "all" (haber sitesi): tüm genel kategoriler gösterilir,
   *  - "none" (kurumsal site): hiçbir genel kategori gösterilmez (yalnızca kendi manuel haberleri).
   */
  activationDefault?: "all" | "none";
  /** Editörün Yekpare havuzundan gizlediği merkez haber id'leri. */
  hiddenPoolNewsIds?: number[];
  /** Kurumsal site: merkez havuz (site_id NULL) satırlarını tamamen hariç tut. */
  excludeCentralPool?: boolean;
  /** false: başka HM sitelerinden manuel sync/pool haberleri bu sitede gösterilmez. */
  allowCrossSiteManualNews?: boolean;
}): Promise<{ items: DbSerialized[]; total: number }> {
  const fetchLimit = opts.limit + opts.offset + 100;
  const excludeCentralPool = opts.excludeCentralPool === true;
  const corporateSiteIds = excludeCentralPool ? new Set<number>() : await loadCorporateHmSiteIds();
  const [portal, editor] = await Promise.all([
    excludeCentralPool
      ? Promise.resolve({ items: [] as DbSerialized[], total: 0 })
      : loadPortalDbNews({ categorySlug: opts.categorySlug, q: opts.q, limit: fetchLimit, offset: 0 }),
    loadHmSiteDbNews({ siteId: opts.siteId, categorySlug: opts.categorySlug, q: opts.q, limit: fetchLimit, offset: 0 }),
  ]);

  if (excludeCentralPool) {
    let items = dedupeEditorScopedDbNewsItems(editor.items, opts.siteId);
    items = items.filter((item) => {
      const ref = String(item.rssSourceUrl ?? "").trim();
      // Sync merkez kopyaları yerel sitede olmamalı; onaylı havuz kopyaları (pool:) kalsın.
      if (ref.startsWith("yekpare-hm-sync:")) return false;
      return true;
    });
    items.sort((a, b) => editorScopedNewsRecencyMs(b) - editorScopedNewsRecencyMs(a));
    const wantSlug = String(opts.categorySlug ?? "").trim().toLowerCase();
    if (wantSlug === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
      items = filterGlobalCategoryNewsItems(items);
    }
    items = excludeKoseFromEditorialNewsList(items);
    return { items, total: items.length };
  }

  // Etkin genel kategori kümesi:
  //  - yapılandırılmışsa (activatedSlugs dolu) → tam olarak o küme,
  //  - değilse activationDefault: "none" → boş küme (kurumsal), "all"/varsayılan → null (filtre yok, haber sitesi).
  let activated: Set<string> | null;
  if (opts.activatedSlugs && opts.activatedSlugs.length) {
    activated = new Set(opts.activatedSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean));
  } else if (opts.activationDefault === "none") {
    activated = new Set();
  } else {
    activated = null;
  }
  const portalFiltered =
    activated && shouldApplyActivatedPoolCategoryFilter(opts.categorySlug)
      ? portal.items.filter((item) => activated!.has(String(item.categorySlug ?? "").trim().toLowerCase()))
      : portal.items;

  const portalNonCorporate = filterNonCorporateOriginCentralNewsItems(portalFiltered, corporateSiteIds);

  /* Bu sitede kaynaklanan paylaşılan haber: yerel satır güncel; merkez kopyası (eski sürüm) gizlenir. */
  const localRssSourceUrls = new Set(
    editor.items
      .map((item) => normalizeRssSourceUrl(String(item.rssSourceUrl ?? "")))
      .filter((url): url is string => Boolean(url)),
  );
  const localPoolTargetIds = collectEditorScopedPoolTargetIds(editor.items);
  const localSyncKeys = new Set(
    editor.items
      .filter((item) => item.siteOnly !== true)
      .map((item) => buildHmSyncDedupeKey(opts.siteId, "news", item.id)),
  );
  const allowCrossSiteManualNews = opts.allowCrossSiteManualNews !== false;
  const portalForSite = portalNonCorporate.filter((item) => {
    if (localPoolTargetIds.has(item.id)) return false;
    const rssUrl = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
    if (rssUrl && localRssSourceUrls.has(rssUrl)) return false;
    const syncKey = String(item.rssSourceUrl ?? "").trim();
    if (syncKey && localSyncKeys.has(syncKey)) return false;
    if (!centralNewsRowVisibleOnHmEditorSite(item, opts.siteId)) return false;
    if (!newsRowVisibleOnHmSiteByRssTarget(item, opts.siteId)) return false;
    if (!allowCrossSiteManualNews && isExternalManualEditorNewsForSite(item, opts.siteId)) return false;
    return true;
  });

  // Yekpare havuzu haberlerine bu siteye özel override (başlık/spot/içerik/görsel) uygula.
  const portalItems = await applyNewsSiteOverrides(portalForSite, opts.siteId);

  let items = dedupeEditorScopedDbNewsItems(
    [...editor.items, ...filterHiddenPoolNewsItems(portalItems, opts.hiddenPoolNewsIds)],
    opts.siteId,
  );
  items.sort((a, b) => editorScopedNewsRecencyMs(b) - editorScopedNewsRecencyMs(a));
  const wantSlug = String(opts.categorySlug ?? "").trim().toLowerCase();
  if (wantSlug === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
    items = filterGlobalCategoryNewsItems(items);
  }
  items = excludeKoseFromEditorialNewsList(items);
  items = await enrichSerializedNewsListImages(items);
  return { items, total: items.length };
}

/** Belirli site için haber override'larını (varsa) serialize edilmiş öğelere uygular. */
export async function applyNewsSiteOverrides(
  items: DbSerialized[],
  siteId: number,
): Promise<DbSerialized[]> {
  if (items.length === 0) return items;
  const ids = items.map((it) => it.id).filter((id) => Number.isFinite(id));
  if (ids.length === 0) return items;
  let overrides: Array<{
    articleId: number;
    title: string | null;
    spot: string | null;
    content: string | null;
    imageUrl: string | null;
  }> = [];
  try {
    overrides = await mainDb
      .select({
        articleId: newsSiteOverridesTable.articleId,
        title: newsSiteOverridesTable.title,
        spot: newsSiteOverridesTable.spot,
        content: newsSiteOverridesTable.content,
        imageUrl: newsSiteOverridesTable.imageUrl,
      })
      .from(newsSiteOverridesTable)
      .where(and(eq(newsSiteOverridesTable.siteId, siteId), inArray(newsSiteOverridesTable.articleId, ids)));
  } catch {
    return items;
  }
  if (overrides.length === 0) return items;
  const byArticle = new Map(overrides.map((o) => [o.articleId, o]));
  return items.map((item) => {
    const o = byArticle.get(item.id);
    if (!o) return item;
    return {
      ...item,
      title: o.title?.trim() ? o.title : item.title,
      spot: o.spot != null && o.spot.trim() ? o.spot : item.spot,
      imageUrl: o.imageUrl?.trim() ? o.imageUrl : item.imageUrl,
    };
  });
}

export async function loadHmSiteDbNews(opts: {
  siteId: number;
  categorySlug?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ items: DbSerialized[]; total: number }> {
  await ensureNewsPublicSubmissionColumns();
  const conds: SQL[] = [eq(newsTable.status, "published"), eq(newsTable.siteId, opts.siteId)];

  if (opts.q) {
    const pattern = `%${opts.q}%`;
    conds.push(or(ilike(newsTable.title, pattern), ilike(newsTable.spot, pattern))!);
  }

  if (opts.categorySlug) {
    const cat = await findCategoryForScope(opts.categorySlug, opts.siteId);
    if (!cat) return { items: [], total: 0 };
    conds.push(eq(newsTable.categoryId, cat.id));
  }

  const where = and(...conds);
  const ctx = scopeNewsContextForSite(await loadNewsContext(), opts.siteId);
  const [rows, totalRows] = await Promise.all([
    getNewsDbForRead()
      .select(newsListSelectFields)
      .from(newsTable)
      .where(where)
      .orderBy(desc(newsTable.createdAt))
      .limit(opts.limit + opts.offset + 100),
    getNewsDbForRead()
      .select({ count: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(where),
  ]);

  return {
    items: excludeKoseFromEditorialNewsList(rows.map((r) => serializeNewsListItem(r, ctx))),
    total: totalRows[0]?.count ?? 0,
  };
}

function isPublicNewsHrefUnsafe(href: string): boolean {
  const value = String(href ?? "").trim();
  if (!value) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^\/\//.test(value)) return true;
  return !value.startsWith("/");
}

function coercePublicHybridNewsHrefFromItem(item: HybridNewsItem): string {
  const rssId = item.source === "rss" ? String(item.id ?? "").replace(/^rss:/, "").trim() : "";
  if (item.source === "rss" && rssId) return portalRssInternalHref(rssId);
  const rawId = String(item.id ?? "");
  if (rawId.startsWith("rss:")) {
    const id = rawId.slice(4).trim();
    if (id) return portalRssInternalHref(id);
  }
  const direct = String(item.href ?? "").trim();
  if (direct.startsWith("/") && !isPublicNewsHrefUnsafe(direct)) return direct;
  return resolveArticlePublicPath({
    contentKind: item.contentKind,
    hmSyncKind: item.hmSyncKind,
    rssSourceUrl: item.rssSourceUrl,
    categorySlug: item.categorySlug,
    authorId: item.authorId,
    slug: item.slug,
    id: item.id,
  });
}

/** Hibrit liste yanıtında kapak görsellerini RSS önbelleği / havuz kaynağıyla hizalar. */
export async function enrichHybridNewsListImages(items: HybridNewsItem[]): Promise<HybridNewsItem[]> {
  const enriched = await enrichSerializedNewsListImages(
    items as unknown as Parameters<typeof enrichSerializedNewsListImages>[0],
  );
  return enriched as unknown as HybridNewsItem[];
}

/** Harici kaynak URL'lerini API yanıtından çıkarır; RSS href her zaman site içi kalır. */
export function sanitizeHybridNewsItemForPublic(item: HybridNewsItem): HybridNewsItem {
  const safeHref = coercePublicHybridNewsHrefFromItem(item);
  if (isPublicNewsHrefUnsafe(safeHref)) {
    throw new Error(`sanitizeHybridNewsItemForPublic refused external href for ${item.id}`);
  }
  const rssSourceUrl =
    String(item.rssSourceUrl ?? item.externalUrl ?? "").trim() || null;
  return {
    ...item,
    title: sanitizeDisplayText(item.title),
    spot: item.spot != null ? sanitizeDisplayText(item.spot) : item.spot,
    categoryName: sanitizeDisplayText(item.categoryName),
    feedLabel: item.feedLabel != null ? sanitizeDisplayText(item.feedLabel) : item.feedLabel,
    authorName: item.authorName != null ? sanitizeDisplayText(item.authorName) : item.authorName,
    href: safeHref,
    content: null,
    imageUrl: normalizePublicMediaUrl(resolveNewsItemImageUrl(item) ?? item.imageUrl) ?? item.imageUrl,
    externalUrl: null,
    rssSourceUrl,
    originUrl: item.originUrl ?? (rssSourceUrl && /^https?:\/\//i.test(rssSourceUrl) ? rssSourceUrl : null),
  };
}

/**
 * Kaynak linki kuralı (kesinleşmiş):
 *  - EDITÖR sitelerinde haber "Kaynağı" → Yekpare'deki o haber (yekpare.net/haber/... veya
 *    yekpare.net/haberler/rss/...), ham RSS yayıncısı DEĞİL.
 *  - yekpare.net/haberler tarafında kaynak → orijinal RSS kaynağı (mevcut davranış).
 * Editörün kendi manuel haberi (publishedOnSiteId === siteId) için kaynak değiştirilmez.
 */
export function applyEditorSourceAttribution(
  items: HybridNewsItem[],
  siteId: number,
): HybridNewsItem[] {
  return items.map((item) => {
    const isEditorOwn = item.publishedOnSiteId != null && item.publishedOnSiteId === siteId;
    if (isEditorOwn) return item;

    let yekpareUrl: string | null = null;
    if (item.source === "rss") {
      const key = String(item.id ?? "").replace(/^rss:/, "").trim();
      if (key) yekpareUrl = `${PORTAL_ORIGIN}/haberler/rss/${encodeURIComponent(key)}`;
    } else {
      const slug = String(item.slug ?? "").trim();
      if (slug) yekpareUrl = buildYekparePortalArticleUrl(slug);
    }
    if (!yekpareUrl) return item;
    return { ...item, rssSourceUrl: yekpareUrl, originUrl: yekpareUrl, sourceSiteUrl: PORTAL_ORIGIN };
  });
}

/** RSS gövdesindeki harici bağlantıları kaldırır (yalnızca metin kalır). */
export function stripExternalAnchorsFromHtml(html: string): string {
  return String(html ?? "")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']\/\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

export function isPortalHmEditorSyncedNews(item: Pick<HybridNewsItem, "source" | "hmSyncKind">): boolean {
  if (item.source === "rss") return false;
  return item.hmSyncKind === "news";
}

export async function applyPortalCategoryNormalization(items: HybridNewsItem[]): Promise<HybridNewsItem[]> {
  const siteSlugs = await loadHmSiteSlugPrefixes();
  return items.map((item) => {
    const normalized = normalizePortalCategoryFields(item.categorySlug, item.categoryName, siteSlugs);
    return { ...item, categorySlug: normalized.categorySlug, categoryName: normalized.categoryName };
  });
}

export function mergeHybridNews(opts: {
  dbItems: DbSerialized[];
  rssItems: PortalRssItem[];
  feedLabels?: Record<string, string>;
  feedGeoById?: Record<string, PortalHybridFeedGeo>;
  limit: number;
  offset: number;
  ctx: Awaited<ReturnType<typeof loadNewsContext>>;
  siteSlugs?: string[];
}): { items: HybridNewsItem[]; total: number; dbCount: number; rssCount: number } {
  const dbKeys = new Set<string>();
  const linkKeys = new Set<string>();
  const rssImageBySourceUrl = new Map<string, string>();
  for (const item of opts.rssItems) {
    const link = normalizeRssSourceUrl(item.link);
    const img = String(item.imageUrl ?? "").trim();
    if (link && img) rssImageBySourceUrl.set(link, img);
  }

  for (const item of opts.dbItems) {
    dbKeys.add(dbDedupeKey(item));
    const titleKey = normalizeArticleTitle(item.title) || portalRssTitleKey(item.title);
    if (titleKey) dbKeys.add(`title:${titleKey}`);
    const src = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
    if (src) dbKeys.add(`link:${src}`);
  }

  const merged: HybridNewsItem[] = [];

  for (const item of opts.dbItems) {
    const srcKey = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
    const rssFallback = srcKey ? (rssImageBySourceUrl.get(srcKey) ?? null) : null;
    const hybrid = dbToHybrid(item, "db", rssFallback);
    if (opts.siteSlugs?.length) {
      const normalized = normalizePortalCategoryFields(hybrid.categorySlug, hybrid.categoryName, opts.siteSlugs);
      merged.push({ ...hybrid, categorySlug: normalized.categorySlug, categoryName: normalized.categoryName });
    } else {
      merged.push(hybrid);
    }
  }

  let rssIncluded = 0;
  for (const item of opts.rssItems) {
    const key = rssDedupeKey(item);
    if (dbKeys.has(key)) continue;
    const titleKey = `title:${item.titleKey}`;
    if (dbKeys.has(titleKey)) continue;
    if (linkKeys.has(key)) continue;
    linkKeys.add(key);
    const feedLabel = opts.feedLabels?.[item.feedId] ?? null;
    const feedGeo = opts.feedGeoById?.[item.feedId] ?? null;
    const hybrid = rssToHybrid(item, feedLabel, opts.ctx, feedGeo);
    if (opts.siteSlugs?.length) {
      const normalized = normalizePortalCategoryFields(hybrid.categorySlug, hybrid.categoryName, opts.siteSlugs);
      merged.push({ ...hybrid, categorySlug: normalized.categorySlug, categoryName: normalized.categoryName });
    } else {
      merged.push(hybrid);
    }
    rssIncluded += 1;
  }

  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const ranked = deferSimilarNewsItems(merged);

  const total = ranked.length;
  const items = ranked.slice(opts.offset, opts.offset + opts.limit);

  return {
    items,
    total,
    dbCount: opts.dbItems.length,
    rssCount: rssIncluded,
  };
}

const HYBRID_INFINITE_POOL_LIMIT = 500;

function isAuthorArticle(item: DbSerialized): boolean {
  return item.contentKind === "makale" || (item.authorId != null && item.authorId > 0);
}

function makaleSyncCondition(): SQL {
  return sql`${newsTable.rssSourceUrl} like 'yekpare-hm-sync:%:makale:%'`;
}

/** Editör havuzu için site kapsamı: kendi haberleri + Yekpare merkez (site_id NULL). */
function newsSiteScopeForPool(siteId: number, includePortalPool: boolean): SQL {
  return includePortalPool ? or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId))! : eq(newsTable.siteId, siteId);
}

function editorialDbConditions(siteId: number | null, includePortalPool = false): SQL[] {
  const conds: SQL[] = [
    eq(newsTable.status, "published"),
    isNull(newsTable.authorId),
    or(
      isNull(newsTable.rssSourceUrl),
      sql`${newsTable.rssSourceUrl} like 'yekpare-hm-sync:%:news:%'`,
      sql`'rss-auto' = ANY(${newsTable.tags})`,
    )!,
  ];
  if (siteId != null) conds.push(newsSiteScopeForPool(siteId, includePortalPool));
  else conds.push(isNull(newsTable.siteId));
  return conds;
}

function authorDbConditions(siteId: number | null, includePortalPool = false): SQL[] {
  const conds: SQL[] = [
    eq(newsTable.status, "published"),
    or(isNotNull(newsTable.authorId), makaleSyncCondition())!,
  ];
  if (siteId != null) conds.push(newsSiteScopeForPool(siteId, includePortalPool));
  else conds.push(isNull(newsTable.siteId));
  return conds;
}

/** Etkin genel kategori kümesini çözer (loadEditorScopedDbNews ile aynı mantık). */
export function resolveActivatedSet(
  activatedSlugs: string[] | undefined,
  activationDefault: "all" | "none" | undefined,
): Set<string> | null {
  if (activatedSlugs && activatedSlugs.length) {
    return new Set(activatedSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean));
  }
  if (activationDefault === "none") return new Set();
  return null;
}

/**
 * Yekpare havuzundan gelen RSS öğelerini editörün ETKİN genel kategori kümesine
 * göre süzer. `activated`:
 *  - null (haber sitesi varsayılanı "all") → filtre yok, tüm öğeler döner.
 *  - boş küme (kurumsal, hiç aktivasyon yok) → hiçbir genel RSS gösterilmez.
 *  - dolu küme → yalnızca o kategorilerin (alias/suffix eşleşmeli) öğeleri.
 * Böylece kurumsal sitede yalnızca AÇIKÇA etkinleştirilen kategoriler
 * (ör. savunma-sanayi, sehit-gazi) haberleri anasayfa genel akışında görünür;
 * etkinleştirilmemiş genel RSS (dunya, turkiye vb.) akışı boğmaz.
 */
export function filterRssItemsByActivatedSet<T extends { categorySlug?: string | null }>(
  items: T[],
  activated: Set<string> | null,
): T[] {
  if (!activated) return items;
  if (activated.size === 0) return [];
  return items.filter((item) => {
    const slug = String(item.categorySlug ?? "").trim().toLowerCase();
    if (!slug) return false;
    if (activated.has(slug)) return true;
    for (const want of activated) {
      if (slug === want || slug.endsWith(`-${want}`) || want.endsWith(`-${slug}`)) return true;
    }
    return false;
  });
}

export function filterRssItemsByHiddenSet<T extends { id?: string | null }>(
  items: T[],
  hiddenIds: Set<string> | null,
): T[] {
  if (!hiddenIds || hiddenIds.size === 0) return items;
  return items.filter((item) => {
    const raw = String(item.id ?? "").trim();
    if (!raw) return true;
    const normalized = raw.startsWith("rss:") ? raw.slice(4) : raw;
    return !hiddenIds.has(raw) && !hiddenIds.has(normalized) && !hiddenIds.has(`rss:${normalized}`);
  });
}

async function loadScopedDbPool(opts: {
  siteId: number | null;
  categorySlug?: string;
  kind: "editorial" | "author";
  limit?: number;
  includePortalPool?: boolean;
  /** Yekpare havuzu (site_id NULL) öğelerini bu etkin kategori kümesine göre filtreler. */
  activatedSlugs?: string[];
  activationDefault?: "all" | "none";
}): Promise<DbSerialized[]> {
  const baseConds =
    opts.kind === "editorial"
      ? editorialDbConditions(opts.siteId, opts.includePortalPool === true)
      : authorDbConditions(opts.siteId, opts.includePortalPool === true);
  const conds = [...baseConds];

  if (opts.categorySlug) {
    // Editör havuzunda kategori hem siteye özel hem de global slug ile eşleşebilir.
    if (opts.siteId != null && opts.includePortalPool) {
      const [siteCat, globalIds] = await Promise.all([
        findCategoryForScope(opts.categorySlug, opts.siteId),
        findPortalCategoryIdsBySlug(opts.categorySlug),
      ]);
      const ids = new Set<number>(globalIds);
      if (siteCat) ids.add(siteCat.id);
      if (ids.size === 0) return [];
      conds.push(inArray(newsTable.categoryId, [...ids]));
    } else {
      const cat = await findCategoryForScope(opts.categorySlug, opts.siteId);
      if (!cat) return [];
      conds.push(eq(newsTable.categoryId, cat.id));
    }
  }

  const where = and(...conds);
  const ctx = await loadNewsContext();
  const limit = opts.limit ?? HYBRID_INFINITE_POOL_LIMIT;
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(where)
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);

  let serialized = rows.map((r) => serializeNewsListItem(r, ctx));
  if (opts.siteId != null && opts.includePortalPool) {
    serialized = await applyNewsSiteOverrides(serialized, opts.siteId);
    serialized = serialized.filter(
      (item) => item.siteId != null || centralNewsRowVisibleOnHmEditorSite(item, opts.siteId!),
    );
    // Yekpare havuzu (site_id NULL) öğelerini etkin genel kategorilere göre filtrele; kendi haberleri her zaman kalır.
    const activated = resolveActivatedSet(opts.activatedSlugs, opts.activationDefault);
    if (activated && shouldApplyActivatedPoolCategoryFilter(opts.categorySlug)) {
      serialized = serialized.filter(
        (item) => item.siteId != null || activated.has(String(item.categorySlug ?? "").trim().toLowerCase()),
      );
    }
  }
  if (opts.kind === "editorial") return serialized.filter((item) => !isAuthorArticle(item));
  return serialized.filter((item) => isAuthorArticle(item));
}

/** Site-içi sonsuz kaydırma tekil anahtarı — frontend `stackedNewsArticleKey` ile uyumlu. */
export function hybridPublicItemKey(item: Pick<HybridNewsItem, "source" | "id" | "slug">): string {
  if (item.source === "rss") {
    const raw = String(item.id ?? "")
      .trim()
      .replace(/^rss:/, "");
    return raw ? `rss:${raw}` : "";
  }
  const prefix = item.source === "author" ? "author" : "db";
  const slug = String(item.slug ?? "").trim();
  if (slug) return `${prefix}:${slug}`;
  const numId = String(item.id ?? "")
    .trim()
    .replace(/^db:/, "");
  return numId ? `${prefix}:id:${numId}` : "";
}

export function parseHybridExcludeIds(raw: unknown): Set<string> {
  const value = String(raw ?? "").trim();
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function pickNthUnseenFromPool(
  pool: HybridNewsItem[],
  excludeIds: Set<string>,
  nth: number,
): HybridNewsItem | null {
  let unseen = 0;
  for (const item of pool) {
    const key = hybridPublicItemKey(item);
    if (!key || excludeIds.has(key)) continue;
    if (unseen === nth) return item;
    unseen += 1;
  }
  return null;
}

function buildRssHybridPool(opts: {
  rssItems: PortalRssItem[];
  feedLabels?: Record<string, string>;
  ctx: Awaited<ReturnType<typeof loadNewsContext>>;
  excludeTitleKeys: Set<string>;
}): HybridNewsItem[] {
  const linkKeys = new Set<string>();
  const merged: HybridNewsItem[] = [];
  for (const item of opts.rssItems) {
    const key = rssDedupeKey(item);
    const titleKey = `title:${item.titleKey}`;
    if (opts.excludeTitleKeys.has(key) || opts.excludeTitleKeys.has(titleKey)) continue;
    if (linkKeys.has(key)) continue;
    linkKeys.add(key);
    const feedLabel = opts.feedLabels?.[item.feedId] ?? null;
    merged.push(rssToHybrid(item, feedLabel, opts.ctx));
  }
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return merged;
}

export async function pickNextHybridInfiniteItem(opts: {
  cursor: number;
  excludeIds: Set<string>;
  categorySlug?: string;
  siteId?: number | null;
  includeRss: boolean;
  rssItems: PortalRssItem[];
  feedLabels?: Record<string, string>;
  ctx: Awaited<ReturnType<typeof loadNewsContext>>;
  /** Editör sitesi: kendi haberleri + Yekpare merkez havuzu (site_id NULL). */
  includePortalPool?: boolean;
  /** Etkin genel kategori slug'ları; havuz öğelerini filtreler. */
  activatedSlugs?: string[];
  activationDefault?: "all" | "none";
}): Promise<{
  item: HybridNewsItem | null;
  cursor: number;
  source: HybridRotateSource | null;
  exhausted: boolean;
  pools: Record<HybridRotateSource, number>;
}> {
  const siteId = opts.siteId != null && opts.siteId > 0 ? opts.siteId : null;
  const includePortalPool = opts.includePortalPool === true && siteId != null;
  const [editorialRows, authorRows] = await Promise.all([
    loadScopedDbPool({
      siteId,
      categorySlug: opts.categorySlug,
      kind: "editorial",
      includePortalPool,
      activatedSlugs: opts.activatedSlugs,
      activationDefault: opts.activationDefault,
    }),
    loadScopedDbPool({
      siteId,
      categorySlug: opts.categorySlug,
      kind: "author",
      includePortalPool,
      activatedSlugs: opts.activatedSlugs,
      activationDefault: opts.activationDefault,
    }),
  ]);

  const titleKeys = new Set<string>();
  for (const item of [...editorialRows, ...authorRows]) {
    const titleKey = normalizeArticleTitle(item.title) || portalRssTitleKey(item.title);
    if (titleKey) titleKeys.add(`title:${titleKey}`);
    const slug = String(item.slug ?? "").trim().toLowerCase();
    if (slug) titleKeys.add(`slug:${slug}`);
  }

  const dbPool = editorialRows.map((item) => dbToHybrid(item, "db"));
  const authorPool = authorRows.map((item) => dbToHybrid(item, "author"));
  const rssPool = opts.includeRss
    ? buildRssHybridPool({
        rssItems: opts.rssItems,
        feedLabels: opts.feedLabels,
        ctx: opts.ctx,
        excludeTitleKeys: titleKeys,
      })
    : [];

  const pools: Record<HybridRotateSource, HybridNewsItem[]> = {
    db: dbPool,
    rss: rssPool,
    author: authorPool,
  };

  const maxAttempts = HYBRID_ROTATE_SOURCES.length * 6;
  for (let step = 0; step < maxAttempts; step += 1) {
    const slot = opts.cursor + step;
    const source = HYBRID_ROTATE_SOURCES[slot % HYBRID_ROTATE_SOURCES.length]!;
    if (source === "rss" && !opts.includeRss) continue;
    const nth = Math.floor(slot / HYBRID_ROTATE_SOURCES.length);
    const item = pickNthUnseenFromPool(pools[source], opts.excludeIds, nth);
    if (item) {
      return {
        item,
        cursor: slot + 1,
        source,
        exhausted: false,
        pools: {
          db: dbPool.length,
          rss: rssPool.length,
          author: authorPool.length,
        },
      };
    }
  }

  return {
    item: null,
    cursor: opts.cursor,
    source: null,
    exhausted: true,
    pools: {
      db: dbPool.length,
      rss: rssPool.length,
      author: authorPool.length,
    },
  };
}
