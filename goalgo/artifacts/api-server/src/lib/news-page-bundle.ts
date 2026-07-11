import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  db as mainDb,
  dualWriteUpdate,
  getNewsDbForRead,
  newsTable,
  categoriesTable,
  hmMakalelerTable,
  authorsTable,
} from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import { serializeHmMakaleAsNews, serializeNews, type NewsContext, type SerializedNewsListItem } from "./serializers.js";
import { getHmHiddenCategoryIds, getHmHiddenCategorySlugs } from "./hm-public-layout.js";
import { filterPortalAuthorPeerIds } from "./hm-sync-source.js";
import { hasKoseAuthorId, isKoseArticle } from "./kose-article.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { enrichSerializedNewsListImages, isSiteLocalNewsRow } from "./news-list-image-enrich.js";
import { applyNewsSiteOverrides } from "./hybrid-news-merge.js";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { isHmCorporateLayout, parseHmLayoutJson, resolveHmCorporateAuthorsEnabledFromLayout } from "./hm-editor-categories.js";
import { centralNewsRowBelongsToCorporateSite } from "./hm-corporate-news-policy.js";

type NewsReadDb = ReturnType<typeof getNewsDbForRead>;
type SerializedArticle = ReturnType<typeof serializeNews> | ReturnType<typeof serializeHmMakaleAsNews>;

async function newsSiteScopeCondition(readDb: NewsReadDb, siteId: number) {
  const ownedCategories = await readDb
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));
  const ownedCategoryIds = ownedCategories.map((row) => row.id).filter((id) => Number.isFinite(id) && id > 0);
  if (ownedCategoryIds.length === 0) return eq(newsTable.siteId, siteId);
  return or(eq(newsTable.siteId, siteId), and(isNull(newsTable.siteId), inArray(newsTable.categoryId, ownedCategoryIds)))!;
}

async function newsRowBelongsToSite(
  row: typeof newsTable.$inferSelect,
  siteId: number,
  readDb: NewsReadDb,
  isCorporate: boolean,
): Promise<boolean> {
  if (row.siteId === siteId) return true;
  if (row.siteId != null) return false;
  if (isCorporate) {
    if (row.categoryId == null) return false;
    const [cat] = await readDb
      .select({
        id: categoriesTable.id,
        exclusiveSiteId: categoriesTable.exclusiveSiteId,
        slug: categoriesTable.slug,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, row.categoryId))
      .limit(1);
    return centralNewsRowBelongsToCorporateSite(
      {
        siteId: row.siteId,
        rssSourceUrl: row.rssSourceUrl,
        categoryExclusiveSiteId: cat?.exclusiveSiteId ?? null,
        categorySlug: cat?.slug ?? null,
      },
      siteId,
    );
  }
  // Yekpare merkez havuzu (site_id NULL): haber siteleri YAYINLANMIŞ global haberi görüntüleyebilir.
  if (row.status === "published") return true;
  if (row.categoryId == null) return false;
  const [readCat, mainCat] = await Promise.all([
    readDb
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, row.categoryId), eq(categoriesTable.exclusiveSiteId, siteId)))
      .limit(1),
    mainDb
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, row.categoryId), eq(categoriesTable.exclusiveSiteId, siteId)))
      .limit(1),
  ]);
  return readCat.length > 0 || mainCat.length > 0;
}

export async function resolveNewsArticleBySlug(
  rawSlug: string,
  siteId: number | null,
): Promise<SerializedArticle | null> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const siteScoped = siteId != null && siteId > 0;
  let isCorporate = false;
  if (siteScoped) {
    const site = await getHmNewsSiteByIdCompat(siteId!);
    isCorporate = isHmCorporateLayout(parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null));
  }

  const numericId = parseInt(String(rawSlug), 10);
  let row: typeof newsTable.$inferSelect | undefined;

  if (!Number.isNaN(numericId)) {
    [row] = await readDb.select().from(newsTable).where(eq(newsTable.id, numericId));
  }
  if (!row && siteScoped) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, rawSlug), await newsSiteScopeCondition(readDb, siteId!)))
      .limit(1);
  }
  if (!row && siteScoped && isCorporate) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, rawSlug), eq(newsTable.siteId, siteId!)))
      .limit(1);
  }
  if (!row && !isCorporate) {
    [row] = await readDb.select().from(newsTable).where(eq(newsTable.slug, rawSlug));
  }

  let mak: typeof hmMakalelerTable.$inferSelect | undefined;
  if (!row && siteScoped) {
    const [m] = await readDb
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.slug, rawSlug), eq(hmMakalelerTable.siteId, siteId!)))
      .limit(1);
    if (m && m.status === "published") mak = m;
    if (!mak) {
      const [mainM] = await mainDb
        .select()
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.slug, rawSlug), eq(hmMakalelerTable.siteId, siteId!)))
        .limit(1);
      if (mainM && mainM.status === "published") mak = mainM;
    }
  }

  if (!row && !mak) {
    if (!Number.isNaN(numericId)) {
      [row] = await mainDb.select().from(newsTable).where(eq(newsTable.id, numericId));
    }
    if (!row && siteScoped) {
      [row] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, rawSlug), await newsSiteScopeCondition(mainDb as NewsReadDb, siteId!)))
        .limit(1);
    }
    if (!row && siteScoped && isCorporate) {
      [row] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, rawSlug), eq(newsTable.siteId, siteId!)))
        .limit(1);
    }
    if (!row && !isCorporate) {
      [row] = await mainDb.select().from(newsTable).where(eq(newsTable.slug, rawSlug));
    }
  }

  if (!row && !mak) return null;

  if (mak) {
    await dualWriteUpdate(hmMakalelerTable, { views: mak.views + 1 }, eq(hmMakalelerTable.id, mak.id));
    return serializeHmMakaleAsNews({ ...mak, views: mak.views + 1 }, ctx);
  }

  if (siteScoped && !(await newsRowBelongsToSite(row!, siteId!, readDb, isCorporate))) return null;
  await dualWriteUpdate(newsTable, { views: row!.views + 1 }, eq(newsTable.id, row!.id));
  return serializeNews({ ...row!, views: row!.views + 1 }, ctx);
}

async function loadRelatedArticles(
  article: SerializedArticle,
  siteId: number | null,
  ctx: NewsContext,
): Promise<SerializedArticle[]> {
  const categorySlug = String(article.categorySlug ?? "").trim();
  if (!categorySlug) return [];
  if (categorySlug.toLowerCase() === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
    return [];
  }
  const siteScoped = siteId != null && siteId > 0;
  if (siteScoped) {
    const hiddenSlugs = await getHmHiddenCategorySlugs(siteId);
    if (hiddenSlugs.has(categorySlug.toLowerCase())) return [];
  }

  const [cat] = await getNewsDbForRead()
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, categorySlug));
  if (!cat) return [];

  const catConds = [eq(newsTable.categoryId, cat.id), eq(newsTable.status, "published")];
  if (siteScoped) {
    if (cat.exclusiveSiteId === siteId) catConds.push(or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId))!);
    else catConds.push(eq(newsTable.siteId, siteId));
  } else {
    catConds.push(isNull(newsTable.siteId));
  }

  const rows = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(and(...catConds))
    .orderBy(desc(newsTable.createdAt))
    .limit(8);

  return rows
    .map((r) => serializeNews(r, ctx))
    .filter((item) => item.id !== article.id && item.slug !== article.slug)
    .slice(0, 6);
}

async function loadKoseAuthor(authorId: number, siteId: number | null) {
  const readDb = getNewsDbForRead();
  const [author] = await readDb.select().from(authorsTable).where(eq(authorsTable.id, authorId));
  if (!author) return null;
  if (siteId != null && author.hmSiteId != null && author.hmSiteId !== siteId) return null;
  const { passwordHash: _p, ...rest } = author;
  return rest;
}

async function loadKoseMoreArticles(
  authorId: number,
  siteId: number | null,
  excludeSlug: string,
  ctx: NewsContext,
): Promise<SerializedArticle[]> {
  if (siteId != null) {
    const rows = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.authorId, authorId),
          eq(hmMakalelerTable.siteId, siteId),
          eq(hmMakalelerTable.status, "published"),
        ),
      )
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(24);
    return rows.map((m) => serializeHmMakaleAsNews(m, ctx)).filter((x) => x.slug !== excludeSlug).slice(0, 12);
  }
  const rows = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.authorId, authorId), isNull(newsTable.siteId), eq(newsTable.status, "published")))
    .orderBy(desc(newsTable.createdAt))
    .limit(24);
  return rows.map((r) => serializeNews(r, ctx)).filter((x) => x.slug !== excludeSlug).slice(0, 12);
}

async function loadKoseOtherAuthors(authorId: number, siteId: number | null) {
  const readDb = getNewsDbForRead();
  if (siteId != null) {
    const fromMak = await readDb
      .selectDistinct({ authorId: hmMakalelerTable.authorId })
      .from(hmMakalelerTable)
      .where(
        and(eq(hmMakalelerTable.siteId, siteId), eq(hmMakalelerTable.status, "published"), isNotNull(hmMakalelerTable.authorId)),
      );
    const idSet = new Set<number>();
    for (const r of fromMak) if (typeof r.authorId === "number") idSet.add(r.authorId);
    const owned = await readDb.select({ id: authorsTable.id }).from(authorsTable).where(eq(authorsTable.hmSiteId, siteId));
    for (const r of owned) idSet.add(r.id);
    idSet.delete(authorId);
    if (idSet.size === 0) return [];
    const rows = await readDb
      .select()
      .from(authorsTable)
      .where(inArray(authorsTable.id, [...idSet]))
      .orderBy(asc(sql`coalesce(${authorsTable.hmSortOrder}, 999999)`), desc(authorsTable.id));
    return rows.map(({ passwordHash: _p, ...rest }) => rest);
  }
  const portalPeers = await readDb
    .select({ id: authorsTable.id, name: authorsTable.name })
    .from(authorsTable)
    .where(isNull(authorsTable.hmSiteId));
  const [author] = await readDb.select().from(authorsTable).where(eq(authorsTable.id, authorId));
  if (!author) return [];
  const peerIds = filterPortalAuthorPeerIds(author.name, portalPeers, author.id).filter((id) => id !== authorId);
  if (peerIds.length === 0) return [];
  const rows = await readDb.select().from(authorsTable).where(inArray(authorsTable.id, peerIds));
  return rows.map(({ passwordHash: _p, ...rest }) => rest);
}

async function resolveHmSiteAuthorsPublicEnabled(siteId: number | null): Promise<boolean> {
  if (siteId == null || siteId <= 0) return true;
  const site = await getHmNewsSiteByIdCompat(siteId);
  const layout = parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null);
  if (!isHmCorporateLayout(layout)) return true;
  return resolveHmCorporateAuthorsEnabledFromLayout(layout);
}

async function loadSidebarAuthors(siteId: number | null) {
  if (!(await resolveHmSiteAuthorsPublicEnabled(siteId))) return [];
  const readDb = getNewsDbForRead();
  if (siteId != null) {
    const fromMak = await readDb
      .selectDistinct({ authorId: hmMakalelerTable.authorId })
      .from(hmMakalelerTable)
      .where(
        and(eq(hmMakalelerTable.siteId, siteId), eq(hmMakalelerTable.status, "published"), isNotNull(hmMakalelerTable.authorId)),
      );
    const idSet = new Set<number>();
    for (const r of fromMak) if (typeof r.authorId === "number") idSet.add(r.authorId);
    const owned = await readDb.select({ id: authorsTable.id }).from(authorsTable).where(eq(authorsTable.hmSiteId, siteId));
    for (const r of owned) idSet.add(r.id);
    if (idSet.size === 0) return [];
    const rows = await readDb
      .select()
      .from(authorsTable)
      .where(inArray(authorsTable.id, [...idSet]))
      .orderBy(asc(sql`coalesce(${authorsTable.hmSortOrder}, 999999)`), desc(authorsTable.id));
    return rows.map(({ passwordHash: _p, ...rest }) => rest);
  }
  const rows = await readDb
    .select()
    .from(authorsTable)
    .where(isNull(authorsTable.hmSiteId))
    .orderBy(desc(authorsTable.id))
    .limit(12);
  return rows.map(({ passwordHash: _p, ...rest }) => rest);
}

async function loadSidebarPopular(siteId: number | null, ctx: NewsContext) {
  const limit = 12;
  if (siteId != null) {
    const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
    const hiddenCond =
      hiddenCategoryIds.length > 0
        ? or(isNull(newsTable.categoryId), sql`${newsTable.categoryId} not in (${sql.join(hiddenCategoryIds.map((id) => sql`${id}`), sql`, `)})`)
        : undefined;
    const newsWhere = hiddenCond
      ? and(eq(newsTable.status, "published"), await newsSiteScopeCondition(getNewsDbForRead(), siteId), hiddenCond)
      : and(eq(newsTable.status, "published"), await newsSiteScopeCondition(getNewsDbForRead(), siteId));
    const newsRows = await getNewsDbForRead()
      .select()
      .from(newsTable)
      .where(newsWhere)
      .orderBy(desc(newsTable.views))
      .limit(limit);
    const makRows = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.status, "published"), eq(hmMakalelerTable.siteId, siteId)))
      .orderBy(desc(hmMakalelerTable.views))
      .limit(limit);
    const merged = [
      ...newsRows.map((r) => serializeNews(r, ctx)),
      ...makRows.map((m) => serializeHmMakaleAsNews(m, ctx)),
    ];
    merged.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    return merged.slice(0, limit);
  }
  const rows = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.status, "published"), isNull(newsTable.siteId)))
    .orderBy(desc(newsTable.views))
    .limit(limit);
  return rows.map((r) => serializeNews(r, ctx));
}

type NewsPageBundle = {
  article: SerializedArticle | null;
  related: SerializedArticle[];
  kose: {
    author: Awaited<ReturnType<typeof loadKoseAuthor>>;
    moreArticles: SerializedArticle[];
    otherAuthors: Awaited<ReturnType<typeof loadKoseOtherAuthors>>;
  } | null;
  sidebar: {
    authors: Awaited<ReturnType<typeof loadSidebarAuthors>>;
    popular: SerializedArticle[];
  };
  redirect?: { status: 301; location: string; searchQuery: string };
};

async function enrichDetailBundleArticles(
  items: SerializedArticle[],
  siteId: number | null,
): Promise<SerializedArticle[]> {
  if (!items.length) return items;
  const toEnrich = items.filter((item) => !isSiteLocalNewsRow(item));
  const enrichedById = new Map(
    ((await enrichSerializedNewsListImages(toEnrich)) as SerializedArticle[]).map((item) => [item.id, item]),
  );
  const merged = items.map((item) => enrichedById.get(item.id) ?? item) as SerializedArticle[];
  if (siteId != null && siteId > 0) {
    return (await applyNewsSiteOverrides(
      merged as SerializedNewsListItem[],
      siteId,
    )) as SerializedArticle[];
  }
  return merged;
}

export async function buildNewsPageBundle(slug: string, siteId: number | null): Promise<NewsPageBundle> {
  const ctx = await loadNewsContext();
  let article = await resolveNewsArticleBySlug(slug, siteId);
  let related = article ? await loadRelatedArticles(article, siteId, ctx) : [];

  let kose: NewsPageBundle["kose"] = null;
  const authorsPublicEnabled = await resolveHmSiteAuthorsPublicEnabled(siteId);
  if (authorsPublicEnabled && article && isKoseArticle(article) && hasKoseAuthorId(article) && article.authorId) {
    const [author, moreArticles, otherAuthors] = await Promise.all([
      loadKoseAuthor(article.authorId, siteId),
      loadKoseMoreArticles(article.authorId, siteId, article.slug, ctx),
      loadKoseOtherAuthors(article.authorId, siteId),
    ]);
    kose = { author, moreArticles: await enrichDetailBundleArticles(moreArticles, siteId), otherAuthors };
  }

  const [sidebarAuthors, sidebarPopular] = await Promise.all([
    loadSidebarAuthors(siteId),
    loadSidebarPopular(siteId, ctx),
  ]);

  if (article) {
    const [enrichedArticle] = await enrichDetailBundleArticles([article], siteId);
    if (enrichedArticle) article = enrichedArticle;
  }
  related = await enrichDetailBundleArticles(related, siteId);
  const popular = await enrichDetailBundleArticles(sidebarPopular, siteId);

  return {
    article,
    related,
    kose,
    sidebar: { authors: sidebarAuthors, popular },
  };
}

const PAGE_BUNDLE_TTL_MS = 45_000;
const PAGE_BUNDLE_MAX_ENTRIES = 300;
const pageBundleCache = new Map<string, { expiresAt: number; body: unknown }>();

export function readNewsPageBundleCache(cacheKey: string): unknown | null {
  const hit = pageBundleCache.get(cacheKey);
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) pageBundleCache.delete(cacheKey);
    return null;
  }
  return hit.body;
}

export function writeNewsPageBundleCache(cacheKey: string, body: unknown): void {
  if (pageBundleCache.size >= PAGE_BUNDLE_MAX_ENTRIES) {
    const oldestKey = pageBundleCache.keys().next().value;
    if (oldestKey !== undefined) pageBundleCache.delete(oldestKey);
  }
  pageBundleCache.set(cacheKey, { expiresAt: Date.now() + PAGE_BUNDLE_TTL_MS, body });
}

/** Haber düzenleme sonrası detay BFF önbelleğini temizle. */
export function invalidateNewsPageBundleCache(opts?: { slug?: string; siteId?: number | null }): void {
  const slug = String(opts?.slug ?? "").trim().toLowerCase();
  const siteId = opts?.siteId;
  if (slug && siteId != null && siteId > 0) {
    pageBundleCache.delete(`${slug}|${siteId}`);
    return;
  }
  if (slug) {
    for (const key of pageBundleCache.keys()) {
      if (key.startsWith(`${slug}|`)) pageBundleCache.delete(key);
    }
    return;
  }
  if (siteId != null && siteId > 0) {
    const suffix = `|${siteId}`;
    for (const key of pageBundleCache.keys()) {
      if (key.endsWith(suffix)) pageBundleCache.delete(key);
    }
    return;
  }
  pageBundleCache.clear();
}
