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
import { hasKoseAuthorId, isKoseArticle, type KoseArticleLike } from "./kose-article.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { enrichSerializedNewsListImages, isSiteLocalNewsRow, withTimeoutOrFallback } from "./news-list-image-enrich.js";
import { applyNewsSiteOverrides } from "./hybrid-news-merge.js";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { isHmCorporateLayout, parseHmLayoutJson, resolveHmCorporateAuthorsEnabledFromLayout } from "./hm-editor-categories.js";
import { centralNewsRowBelongsToCorporateSite, centralNewsRowVisibleOnHmEditorSite } from "./hm-corporate-news-policy.js";
import { newsRowVisibleOnHmSiteByRssTarget } from "./rss-campaign-target.js";
import {
  isHmPublishGroupSharedEditorNews,
  publicHmSiteNewsScopeSql,
  resolveHmPublishGroupSiteIds,
} from "./hm-publish-groups.js";
import { shouldHideAuthorOnAnkaraHmSite } from "./hm-vatanhaber-author-block.js";

export const NEWS_PAGE_BUNDLE_BUDGET_MS = 5_000;

type NewsReadDb = ReturnType<typeof getNewsDbForRead>;
type SerializedArticle = ReturnType<typeof serializeNews> | ReturnType<typeof serializeHmMakaleAsNews>;

async function newsSiteScopeCondition(readDb: NewsReadDb, siteId: number) {
  const groupScope = await publicHmSiteNewsScopeSql(siteId);
  const ownedCategories = await readDb
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));
  const ownedCategoryIds = ownedCategories.map((row) => row.id).filter((id) => Number.isFinite(id) && id > 0);
  if (ownedCategoryIds.length === 0) return groupScope;
  return or(groupScope, and(isNull(newsTable.siteId), inArray(newsTable.categoryId, ownedCategoryIds)))!;
}

async function newsRowBelongsToSite(
  row: typeof newsTable.$inferSelect,
  siteId: number,
  readDb: NewsReadDb,
  isCorporate: boolean,
): Promise<boolean> {
  if (row.siteId === siteId) return true;
  if (row.siteId != null) {
    const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId);
    return isHmPublishGroupSharedEditorNews(row, siteId, groupSiteIds);
  }
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
  // Haber siteleri: vitrinde listelenen merkez havuz (RSS kampanya / hybrid) + exclusive kategori.
  if (isVisibleCentralPoolNewsForHmSite(row, siteId)) return true;
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

function toHmEditorVisibilityRow(row: {
  siteId?: number | null;
  rssSourceUrl?: string | null;
  authorId?: number | null;
  isEditorManual?: boolean | null;
  siteOnly?: boolean | null;
  categorySlug?: string | null;
  contentKind?: string | null;
  hmSyncKind?: string | null;
}): {
  siteId?: number | null;
  rssSourceUrl?: string | null;
  authorId?: number | null;
  isEditorManual?: boolean | null;
  siteOnly?: boolean | null;
} & KoseArticleLike {
  const contentKind =
    row.contentKind === "makale" || row.contentKind === "news" ? row.contentKind : undefined;
  const hmSyncKind =
    row.hmSyncKind === "makale" || row.hmSyncKind === "news"
      ? row.hmSyncKind
      : row.hmSyncKind == null
        ? null
        : undefined;
  return {
    siteId: row.siteId,
    rssSourceUrl: row.rssSourceUrl,
    authorId: row.authorId,
    isEditorManual: row.isEditorManual,
    siteOnly: row.siteOnly,
    categorySlug: row.categorySlug ?? undefined,
    contentKind,
    hmSyncKind,
  };
}

/**
 * Merkez `news` (site_id NULL) — başka sitenin satırı değil.
 * Anasayfa/hybrid bu satırları listeler; `/haber/{slug}?siteId=` aynı kuralı kullanmalı.
 */
export function isVisibleCentralPoolNewsForHmSite(
  row: {
    siteId?: number | null;
    rssSourceUrl?: string | null;
    authorId?: number | null;
    isEditorManual?: boolean | null;
    siteOnly?: boolean | null;
    tags?: string[] | null;
    categorySlug?: string | null;
    contentKind?: string | null;
    hmSyncKind?: string | null;
  },
  siteId: number,
): boolean {
  if (!Number.isFinite(siteId) || siteId <= 0) return false;
  if (row.siteId != null) return row.siteId === siteId;
  if (!centralNewsRowVisibleOnHmEditorSite(toHmEditorVisibilityRow(row), siteId)) return false;
  return newsRowVisibleOnHmSiteByRssTarget(row, siteId);
}

async function lookupPublishedCentralNewsBySlug(
  db: NewsReadDb,
  slugKey: string,
  siteId: number,
): Promise<typeof newsTable.$inferSelect | undefined> {
  const [pool] = await db
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.slug, slugKey), isNull(newsTable.siteId), eq(newsTable.status, "published")))
    .limit(1);
  if (!pool) return undefined;
  return isVisibleCentralPoolNewsForHmSite(pool, siteId) ? pool : undefined;
}

/** Panelden eklenen haber: slug+siteId tek sorgu — site layout / corporate / makale yok. */
export async function resolveLocalSiteNewsBySlug(
  rawSlug: string,
  siteId: number,
): Promise<SerializedArticle | null> {
  const slugKey = String(rawSlug ?? "").trim();
  if (!slugKey || !Number.isFinite(siteId) || siteId <= 0 || /^\d+$/.test(slugKey)) return null;
  const readDb = getNewsDbForRead();
  const [row] = await readDb
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.slug, slugKey), eq(newsTable.siteId, siteId)))
    .limit(1);
  if (!row || String(row.slug ?? "").trim() !== slugKey) return null;
  const ctx = await loadNewsContext();
  void dualWriteUpdate(newsTable, { views: row.views + 1 }, eq(newsTable.id, row.id)).catch((err) =>
    console.error("[news/local-slug/views]", err instanceof Error ? err.message : err),
  );
  return serializeNews({ ...row, views: row.views + 1 }, ctx);
}

export async function resolveNewsArticleBySlug(
  rawSlug: string,
  siteId: number | null,
): Promise<SerializedArticle | null> {
  // Yalnızca tamamen sayısal id — "2026-yili-..." / "15-temmuz-..." parseInt ile yanlış id'ye düşmesin.
  const slugKey = String(rawSlug ?? "").trim();
  const numericId = /^\d+$/.test(slugKey) ? parseInt(slugKey, 10) : NaN;
  const siteScoped = siteId != null && siteId > 0;
  if (siteScoped && Number.isNaN(numericId)) {
    const local = await resolveLocalSiteNewsBySlug(slugKey, siteId!);
    if (local) return local;
  }

  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  let isCorporate = false;
  if (siteScoped) {
    const site = await getHmNewsSiteByIdCompat(siteId!);
    isCorporate = isHmCorporateLayout(parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null));
  }
  let row: typeof newsTable.$inferSelect | undefined;

  const acceptRowForSlug = (candidate: typeof newsTable.$inferSelect | undefined) => {
    if (!candidate) return undefined;
    // Saf sayısal id isteği değilse slug birebir uyuşmalı (eski parseInt sızıntısına karşı).
    if (Number.isNaN(numericId) && String(candidate.slug ?? "").trim() !== slugKey) return undefined;
    return candidate;
  };

  if (!Number.isNaN(numericId)) {
    [row] = await readDb.select().from(newsTable).where(eq(newsTable.id, numericId));
    // Site kapsamındaysa önce bu siteye ait satırı tercih et.
    if (row && siteScoped && row.siteId != null && row.siteId !== siteId) {
      const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId!);
      if (!isHmPublishGroupSharedEditorNews(row, siteId!, groupSiteIds)) row = undefined;
    }
  }
  if (!row && siteScoped) {
    const [siteLocal] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, slugKey), eq(newsTable.siteId, siteId!)))
      .limit(1);
    row = acceptRowForSlug(siteLocal);
  }
  // Merkez havuz slug'ı exclusive-cat OR taramasından önce — o sorgu timeout üretebiliyor.
  if (!row && siteScoped && !isCorporate) {
    row = acceptRowForSlug(await lookupPublishedCentralNewsBySlug(readDb, slugKey, siteId!));
  }
  if (!row && siteScoped) {
    const [scoped] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, slugKey), await newsSiteScopeCondition(readDb, siteId!)))
      .orderBy(sql`case when ${newsTable.siteId} = ${siteId!} then 0 else 1 end`)
      .limit(1);
    row = acceptRowForSlug(scoped);
  }
  if (!row && siteScoped && isCorporate) {
    const [corp] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, slugKey), eq(newsTable.siteId, siteId!)))
      .limit(1);
    row = acceptRowForSlug(corp);
  }
  // Portal (siteId yok): eski davranış.
  if (!row && !siteScoped) {
    const [portalRow] = await readDb.select().from(newsTable).where(eq(newsTable.slug, slugKey));
    row = acceptRowForSlug(portalRow);
  }

  let mak: typeof hmMakalelerTable.$inferSelect | undefined;
  if (!row && siteScoped) {
    const [m] = await readDb
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.slug, slugKey), eq(hmMakalelerTable.siteId, siteId!)))
      .limit(1);
    if (m && m.status === "published") mak = m;
    if (!mak) {
      const [mainM] = await mainDb
        .select()
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.slug, slugKey), eq(hmMakalelerTable.siteId, siteId!)))
        .limit(1);
      if (mainM && mainM.status === "published") mak = mainM;
    }
  }

  if (!row && !mak) {
    if (!Number.isNaN(numericId)) {
      [row] = await mainDb.select().from(newsTable).where(eq(newsTable.id, numericId));
      if (row && siteScoped && row.siteId != null && row.siteId !== siteId) {
        const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId!);
        if (!isHmPublishGroupSharedEditorNews(row, siteId!, groupSiteIds)) row = undefined;
      }
    }
    if (!row && siteScoped) {
      const [siteLocal] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, slugKey), eq(newsTable.siteId, siteId!)))
        .limit(1);
      row = acceptRowForSlug(siteLocal);
    }
    if (!row && siteScoped && !isCorporate) {
      row = acceptRowForSlug(await lookupPublishedCentralNewsBySlug(mainDb as NewsReadDb, slugKey, siteId!));
    }
    if (!row && siteScoped) {
      const [scoped] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, slugKey), await newsSiteScopeCondition(mainDb as NewsReadDb, siteId!)))
        .orderBy(sql`case when ${newsTable.siteId} = ${siteId!} then 0 else 1 end`)
        .limit(1);
      row = acceptRowForSlug(scoped);
    }
    if (!row && siteScoped && isCorporate) {
      const [corp] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, slugKey), eq(newsTable.siteId, siteId!)))
        .limit(1);
      row = acceptRowForSlug(corp);
    }
    if (!row && !siteScoped) {
      const [portalRow] = await mainDb.select().from(newsTable).where(eq(newsTable.slug, slugKey));
      row = acceptRowForSlug(portalRow);
    }
  }

  if (!row && !mak) return null;

  if (mak) {
    // Görüntü sayacı yanıtı bloklamasın — Hostinger dual-write 30sn+ TTFB olabiliyor.
    void dualWriteUpdate(hmMakalelerTable, { views: mak.views + 1 }, eq(hmMakalelerTable.id, mak.id)).catch(
      (err) => console.error("[news-page-bundle/views-makale]", err instanceof Error ? err.message : err),
    );
    return serializeHmMakaleAsNews({ ...mak, views: mak.views + 1 }, ctx);
  }

  if (siteScoped && !(await newsRowBelongsToSite(row!, siteId!, readDb, isCorporate))) return null;
  void dualWriteUpdate(newsTable, { views: row!.views + 1 }, eq(newsTable.id, row!.id)).catch((err) =>
    console.error("[news-page-bundle/views]", err instanceof Error ? err.message : err),
  );
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
    // Yalnızca bu siteye ait yazarlar — başka siteden makale authorId sızıntısı yok.
    const site = await getHmNewsSiteByIdCompat(siteId);
    const owned = await readDb
      .select()
      .from(authorsTable)
      .where(and(eq(authorsTable.hmSiteId, siteId), sql`${authorsTable.id} <> ${authorId}`))
      .orderBy(asc(sql`coalesce(${authorsTable.hmSortOrder}, 999999)`), desc(authorsTable.id));
    return owned
      .filter(
        (r) =>
          !shouldHideAuthorOnAnkaraHmSite({
            siteSlug: site?.slug,
            siteDomain: site?.domain,
            authorName: r.name,
            authorTitle: r.title,
          }),
      )
      .map(({ passwordHash: _p, ...rest }) => rest);
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
    // Otomatik çapraz site yazar yok — yalnızca panelden bu siteye eklenenler.
    const site = await getHmNewsSiteByIdCompat(siteId);
    const rows = await readDb
      .select()
      .from(authorsTable)
      .where(eq(authorsTable.hmSiteId, siteId))
      .orderBy(asc(sql`coalesce(${authorsTable.hmSortOrder}, 999999)`), desc(authorsTable.id));
    return rows
      .filter(
        (r) =>
          !shouldHideAuthorOnAnkaraHmSite({
            siteSlug: site?.slug,
            siteDomain: site?.domain,
            authorName: r.name,
            authorTitle: r.title,
          }),
      )
      .map(({ passwordHash: _p, ...rest }) => rest);
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

const emptySidebar = (): NewsPageBundle["sidebar"] => ({ authors: [], popular: [] });

export function wrapArticleAsNewsPageBundle(article: SerializedArticle | null): NewsPageBundle {
  return { article, related: [], kose: null, sidebar: emptySidebar() };
}

async function settleBundlePart<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await withTimeoutOrFallback(promise, 2_500, fallback);
  } catch (err) {
    console.error(`[news-page-bundle] ${label}`, err instanceof Error ? err.message.slice(0, 180) : err);
    return fallback;
  }
}

export async function buildNewsPageBundle(slug: string, siteId: number | null): Promise<NewsPageBundle> {
  const ctx = await loadNewsContext();
  let article = await resolveNewsArticleBySlug(slug, siteId);
  if (!article) return wrapArticleAsNewsPageBundle(null);

  const [relatedRaw, authorsPublicEnabled, sidebarAuthors, sidebarPopular] = await Promise.all([
    settleBundlePart("related", loadRelatedArticles(article, siteId, ctx), [] as SerializedArticle[]),
    settleBundlePart("authors-enabled", resolveHmSiteAuthorsPublicEnabled(siteId), true),
    settleBundlePart("sidebar-authors", loadSidebarAuthors(siteId), [] as Awaited<ReturnType<typeof loadSidebarAuthors>>),
    settleBundlePart("sidebar-popular", loadSidebarPopular(siteId, ctx), [] as SerializedArticle[]),
  ]);

  let kose: NewsPageBundle["kose"] = null;
  if (authorsPublicEnabled && isKoseArticle(article) && hasKoseAuthorId(article) && article.authorId) {
    const [author, moreArticles, otherAuthors] = await Promise.all([
      settleBundlePart("kose-author", loadKoseAuthor(article.authorId, siteId), null),
      settleBundlePart(
        "kose-more",
        loadKoseMoreArticles(article.authorId, siteId, article.slug, ctx),
        [] as SerializedArticle[],
      ),
      settleBundlePart("kose-others", loadKoseOtherAuthors(article.authorId, siteId), []),
    ]);
    const moreEnriched = await settleBundlePart(
      "kose-more-images",
      enrichDetailBundleArticles(moreArticles, siteId),
      moreArticles,
    );
    kose = { author, moreArticles: moreEnriched, otherAuthors };
  }

  if (article) {
    const [enrichedArticle] = await settleBundlePart(
      "article-images",
      enrichDetailBundleArticles([article], siteId),
      [article],
    );
    if (enrichedArticle) article = enrichedArticle;
  }
  const related = await settleBundlePart(
    "related-images",
    enrichDetailBundleArticles(relatedRaw, siteId),
    relatedRaw,
  );
  const popular = await settleBundlePart(
    "popular-images",
    enrichDetailBundleArticles(sidebarPopular, siteId),
    sidebarPopular,
  );

  return {
    article,
    related,
    kose,
    sidebar: { authors: sidebarAuthors, popular },
  };
}

const PAGE_BUNDLE_TIMEOUT = { timedOut: true } as const;

/** İlgili/sidebar takılırsa bile haberi 5sn içinde döndür. */
export async function buildNewsPageBundleFast(slug: string, siteId: number | null): Promise<NewsPageBundle> {
  const built = await withTimeoutOrFallback<NewsPageBundle | typeof PAGE_BUNDLE_TIMEOUT>(
    buildNewsPageBundle(slug, siteId),
    NEWS_PAGE_BUNDLE_BUDGET_MS,
    PAGE_BUNDLE_TIMEOUT,
  );
  if (!("timedOut" in built)) return built;
  const article = await resolveNewsArticleBySlug(slug, siteId);
  return wrapArticleAsNewsPageBundle(article);
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
