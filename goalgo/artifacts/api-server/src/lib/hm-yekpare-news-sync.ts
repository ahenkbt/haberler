/**
 * HM editör sitelerinden Yekpare merkez haber akışına (news.site_id NULL) idempotent senkron.
 */
import { and, eq, inArray, isNotNull, isNull, not, or, sql, type SQL } from "drizzle-orm";
import {
  authorsTable,
  categoriesTable,
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
  type HmNewsSiteRow,
  type NewsRow,
} from "@workspace/db";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { loadNewsContext, slugify } from "./news-context";
import { sitePublicOrigin } from "./site-public-origin";
import {
  authorMatchKey,
  authorsRepresentSamePerson,
  isKoseCategorySlug,
  normalizeArticleTitle,
  normalizeAuthorName,
  parseHmSyncDedupeKey,
} from "./hm-sync-source";
import { runConsolidateSitePrefixCategories } from "./consolidate-site-prefix-categories";
import { isHmCorporateLayout, parseHmLayoutJson } from "./hm-editor-categories.js";
import { yekparePoolSendEnabledFromLayout } from "./hm-public-layout.js";

/** Kurumsal vitrin siteleri Yekpare merkez havuzuna senkron edilmez. */
export function isCorporateHmSiteRow(site: Pick<HmNewsSiteRow, "layoutJson">): boolean {
  return isHmCorporateLayout(parseHmLayoutJson(site.layoutJson != null ? String(site.layoutJson) : null));
}

function filterSitesForYekpareSync(sites: HmNewsSiteRow[]): HmNewsSiteRow[] {
  return sites.filter((site) => {
    if (isCorporateHmSiteRow(site)) return false;
    const layout = parseHmLayoutJson(site.layoutJson != null ? String(site.layoutJson) : null);
    return yekparePoolSendEnabledFromLayout(layout as Record<string, unknown>);
  });
}

let corporateHmSiteIdsCache: Set<number> | null = null;

/** Aktif kurumsal vitrin HM site id'leri (Yekpare merkez havuzundan hariç tutulur). */
export async function loadCorporateHmSiteIds(): Promise<Set<number>> {
  if (corporateHmSiteIdsCache) return corporateHmSiteIdsCache;
  const sites = await db
    .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));
  corporateHmSiteIdsCache = new Set(
    sites.filter((site) => isCorporateHmSiteRow(site)).map((site) => site.id),
  );
  return corporateHmSiteIdsCache;
}

export function clearCorporateHmSiteIdsCache(): void {
  corporateHmSiteIdsCache = null;
}

/** SQL: merkez havuzda kurumsal site kaynaklı sync/pool ref satırlarını hariç tut. */
export function excludeCorporateOriginCentralNewsSql(corporateSiteIds: Iterable<number>): SQL | undefined {
  const ids = [...corporateSiteIds];
  if (!ids.length) return undefined;
  const patterns = ids.flatMap((siteId) => [
    sql`${newsTable.rssSourceUrl} LIKE ${`yekpare-hm-sync:${siteId}:%`}`,
    sql`${newsTable.rssSourceUrl} LIKE ${`yekpare-hm-pool:${siteId}:%`}`,
  ]);
  return not(or(...patterns)!)!;
}

const ATTRIBUTION_MARKER = "yekpare-hm-attribution";
const HM_SITE_PUBLIC_PREFIX = "tr";
const db = getNewsDbForRead();

export type YekpareHmSyncResult = {
  sitesProcessed: number;
  authorsUpserted: number;
  authorsSkipped: number;
  authorsMerged: number;
  newsInserted: number;
  newsUpdated: number;
  newsSkipped: number;
  newsDeduped: number;
  makaleInserted: number;
  makaleUpdated: number;
  makaleSkipped: number;
  makaleDeduped: number;
  categoriesCreated: number;
  authorLinksRepaired: number;
  errors: string[];
};

export function buildHmSyncDedupeKey(siteId: number, kind: "news" | "makale", sourceId: number): string {
  return `yekpare-hm-sync:${siteId}:${kind}:${sourceId}`;
}

function authorMapKey(siteId: number, sourceAuthorId: number): string {
  return `${siteId}:${sourceAuthorId}`;
}

function authorQualityScore(row: {
  avatarUrl?: string | null;
  bio?: string | null;
  title?: string | null;
}): number {
  return (row.avatarUrl ? 2 : 0) + (row.bio ? 1 : 0) + (row.title ? 1 : 0);
}

export function buildHmSitePublicOrigin(site: Pick<HmNewsSiteRow, "domain" | "slug">): string {
  const domain = String(site.domain ?? "").trim();
  if (domain) {
    try {
      const withProto = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
      return new URL(withProto).origin;
    } catch {
      /* fall through */
    }
  }
  const portal = sitePublicOrigin().replace(/\/+$/, "");
  return `${portal}/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}`;
}

export function buildHmSiteArticleUrl(
  site: Pick<HmNewsSiteRow, "domain" | "slug">,
  slug: string,
): string {
  const base = buildHmSitePublicOrigin(site).replace(/\/+$/, "");
  const s = encodeURIComponent(slug);
  return `${base}/haber/${s}`;
}

function buildSourceArticleUrl(
  site: HmNewsSiteRow,
  kind: "news" | "makale",
  slug: string,
): string {
  return buildHmSiteArticleUrl(site, slug);
}

function buildAttributionHtml(site: HmNewsSiteRow, sourceUrl: string): string {
  const name = String(site.displayName ?? site.slug).trim();
  const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeUrl = sourceUrl.replace(/"/g, "&quot;");
  return (
    `<p class="${ATTRIBUTION_MARKER}" style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:0.875rem;color:#64748b;">` +
    `Bu haber, Yekpare Haber Merkezi sitesi, ` +
    `<a href="${safeUrl}" rel="noopener noreferrer" style="color:#039D55;font-weight:600;">${safeName}</a> sitesi tarafından eklenmiştir.` +
    `</p>`
  );
}

function contentWithAttribution(content: string | null, attribution: string): string {
  const base = String(content ?? "").trim();
  if (base.includes(ATTRIBUTION_MARKER)) return base;
  if (!base) return attribution;
  return `${base}\n${attribution}`;
}

type SiteCtx = {
  site: HmNewsSiteRow;
  authorMap: Map<string, number>;
  slugSet: Set<string>;
  categoryMap: Map<string, number>;
  blogCategoryId: number | null;
};

async function loadCentralSlugSet(): Promise<Set<string>> {
  const rows = await db
    .select({ slug: newsTable.slug })
    .from(newsTable)
    .where(isNull(newsTable.siteId));
  return new Set(rows.map((r) => String(r.slug ?? "").trim()).filter(Boolean));
}

function allocCentralSlug(base: string, slugSet: Set<string>): string {
  let s = slugify(base);
  if (!s) s = "haber";
  let cand = s;
  let n = 0;
  while (slugSet.has(cand)) {
    n += 1;
    cand = `${s}-${n}`;
  }
  slugSet.add(cand);
  return cand;
}

/** Aynı isimli portal yazarlarını birleştirir; makaleleri kanonik yazara taşır. */
async function consolidatePortalAuthors(
  stats: YekpareHmSyncResult,
  dryRun: boolean,
): Promise<Map<string, number>> {
  const rows = await db.select().from(authorsTable).where(isNull(authorsTable.hmSiteId));
  const groups: (typeof rows)[number][][] = [];
  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    let placed = false;
    for (const group of groups) {
      if (authorsRepresentSamePerson(group[0]!.name, name)) {
        group.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([row]);
  }

  const nameToCanonicalId = new Map<string, number>();
  for (const group of groups) {
    const key = authorMatchKey(group[0]!.name) || normalizeAuthorName(group[0]!.name);
    if (group.length <= 1) {
      if (group[0]) nameToCanonicalId.set(key, group[0].id);
      continue;
    }
    const sorted = [...group].sort((a, b) => authorQualityScore(b) - authorQualityScore(a));
    const canonical = sorted[0]!;
    nameToCanonicalId.set(key, canonical.id);
    const dupIds = sorted.slice(1).map((r) => r.id);
    if (dupIds.length === 0) continue;
    if (!dryRun) {
      await dualWriteUpdate(newsTable, { authorId: canonical.id }, and(inArray(newsTable.authorId, dupIds), isNull(newsTable.siteId)));
      await dualWriteDelete(authorsTable, inArray(authorsTable.id, dupIds));
    }
    stats.authorsMerged += dupIds.length;
  }
  return nameToCanonicalId;
}

async function findCentralAuthorByName(sourceName: string): Promise<number | null> {
  const normalized = normalizeAuthorName(sourceName);
  if (!normalized) return null;

  const portalAuthors = await db
    .select({ id: authorsTable.id, name: authorsTable.name })
    .from(authorsTable)
    .where(isNull(authorsTable.hmSiteId));

  for (const row of portalAuthors) {
    if (normalizeAuthorName(row.name) === normalized) return row.id;
  }

  const key = authorMatchKey(sourceName);
  for (const row of portalAuthors) {
    if (authorMatchKey(row.name) === key) return row.id;
  }

  for (const row of portalAuthors) {
    if (authorsRepresentSamePerson(row.name, sourceName)) return row.id;
  }

  return null;
}

async function resolveCentralAuthorId(
  sourceAuthorId: number | null,
  siteId: number,
  authorMap: Map<string, number>,
  stats: YekpareHmSyncResult,
): Promise<number | null> {
  if (sourceAuthorId == null || sourceAuthorId <= 0) return null;
  const cacheKey = authorMapKey(siteId, sourceAuthorId);
  const cached = authorMap.get(cacheKey);
  if (cached) return cached;

  const [source] = await db
    .select()
    .from(authorsTable)
    .where(eq(authorsTable.id, sourceAuthorId))
    .limit(1);
  if (!source) return null;

  if (source.hmSiteId == null) {
    authorMap.set(cacheKey, source.id);
    stats.authorsSkipped += 1;
    return source.id;
  }
  if (source.hmSiteId !== siteId) return null;

  const normalized = normalizeAuthorName(source.name);
  if (!normalized) return null;

  const existingId = await findCentralAuthorByName(source.name);
  if (existingId) {
    authorMap.set(cacheKey, existingId);
    stats.authorsSkipped += 1;
    return existingId;
  }

  const [created] = await dualWriteInsert(authorsTable, {
      name: source.name,
      title: source.title ?? null,
      avatarUrl: source.avatarUrl ?? null,
      bio: source.bio ?? null,
      hmSiteId: null,
      email: null,
      passwordHash: null,
    });

  if (!created) return null;
  authorMap.set(cacheKey, created.id);
  stats.authorsUpserted += 1;
  return created.id;
}

async function syncSiteAuthors(
  siteId: number,
  authorMap: Map<string, number>,
  stats: YekpareHmSyncResult,
): Promise<void> {
  const siteAuthors = await db
    .select({ id: authorsTable.id })
    .from(authorsTable)
    .where(eq(authorsTable.hmSiteId, siteId));

  for (const row of siteAuthors) {
    await resolveCentralAuthorId(row.id, siteId, authorMap, stats);
  }

  const makAuthorIds = await db
    .selectDistinct({ authorId: hmMakalelerTable.authorId })
    .from(hmMakalelerTable)
    .where(and(eq(hmMakalelerTable.siteId, siteId), isNotNull(hmMakalelerTable.authorId)));

  for (const row of makAuthorIds) {
    if (typeof row.authorId === "number") {
      await resolveCentralAuthorId(row.authorId, siteId, authorMap, stats);
    }
  }

  const newsAuthorIds = await db
    .selectDistinct({ authorId: newsTable.authorId })
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), isNotNull(newsTable.authorId)));

  for (const row of newsAuthorIds) {
    if (typeof row.authorId === "number") {
      await resolveCentralAuthorId(row.authorId, siteId, authorMap, stats);
    }
  }
}

async function resolvePortalCategoryId(
  sourceCategoryId: number | null,
  site: HmNewsSiteRow,
  categoryMap: Map<string, number>,
  stats: YekpareHmSyncResult,
  categoriesById: Map<number, { id: number; name: string; slug: string; exclusiveSiteId: number | null }>,
): Promise<number | null> {
  if (sourceCategoryId == null) return null;
  const sourceCat = categoriesById.get(sourceCategoryId);
  if (!sourceCat) return null;

  const isSiteExclusive = sourceCat.exclusiveSiteId === site.id;
  const portalSlug = isSiteExclusive
    ? `${site.slug}-${sourceCat.slug}`.replace(/--+/g, "-").slice(0, 80)
    : sourceCat.slug;

  const cacheKey = `${site.id}:${portalSlug}`;
  const cached = categoryMap.get(cacheKey);
  if (cached) return cached;

  const [globalHit] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.slug, portalSlug), isNull(categoriesTable.exclusiveSiteId)))
    .limit(1);

  if (globalHit) {
    if (isSiteExclusive && portalSlug === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
      return null;
    }
    categoryMap.set(cacheKey, globalHit.id);
    return globalHit.id;
  }

  if (!isSiteExclusive) {
    const [anyHit] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, sourceCat.slug))
      .limit(1);
    if (anyHit) {
      categoryMap.set(cacheKey, anyHit.id);
      return anyHit.id;
    }
  }

  // Silinen kategorileri Yekpare senkronu yeniden oluşturmaz — admin panelinden tanımlanmalı.
  return null;
}

async function findCentralArticleFallback(params: {
  title: string;
  authorId: number | null;
}): Promise<{ id: number; slug: string | null; rssSourceUrl: string | null } | null> {
  const titleNorm = normalizeArticleTitle(params.title);
  if (!titleNorm) return null;

  const baseConds = [
    isNull(newsTable.siteId),
    sql`lower(regexp_replace(btrim(${newsTable.title}), '\s+', ' ', 'g')) = ${titleNorm}`,
  ];
  if (params.authorId != null) {
    const [hit] = await db
      .select({ id: newsTable.id, slug: newsTable.slug, rssSourceUrl: newsTable.rssSourceUrl })
      .from(newsTable)
      .where(and(...baseConds, eq(newsTable.authorId, params.authorId)))
      .limit(1);
    return hit ?? null;
  }

  const [hit] = await db
    .select({ id: newsTable.id, slug: newsTable.slug, rssSourceUrl: newsTable.rssSourceUrl })
    .from(newsTable)
    .where(and(...baseConds))
    .limit(1);
  return hit ?? null;
}

async function upsertCentralNews(params: {
  dedupeKey: string;
  site: HmNewsSiteRow;
  kind: "news" | "makale";
  sourceSlug: string;
  title: string;
  spot: string | null;
  content: string | null;
  imageUrl: string | null;
  categoryId: number | null;
  authorId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  slugSet: Set<string>;
  stats: YekpareHmSyncResult;
  counter: "news" | "makale";
}): Promise<void> {
  const sourceUrl = buildSourceArticleUrl(params.site, params.kind, params.sourceSlug);
  const attribution = buildAttributionHtml(params.site, sourceUrl);
  const content = contentWithAttribution(params.content, attribution);

  const [existingByKey] = await db
    .select({ id: newsTable.id, slug: newsTable.slug })
    .from(newsTable)
    .where(and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, params.dedupeKey)))
    .limit(1);

  let existing = existingByKey;
  if (!existing) {
    const fallback = await findCentralArticleFallback({
      title: params.title,
      authorId: params.authorId,
    });
    if (fallback) {
      const ref = String(fallback.rssSourceUrl ?? "").trim();
      // Başlık eşleşmesiyle alakasız merkez/RSS satırına görsel taşınmasını engelle.
      if (ref.startsWith(`yekpare-hm-sync:${params.site.id}:`)) {
        existing = { id: fallback.id, slug: fallback.slug ?? "" };
        if (params.counter === "news") params.stats.newsDeduped += 1;
        else params.stats.makaleDeduped += 1;
      }
    }
  }

  const slug = existing?.slug?.trim() || allocCentralSlug(params.sourceSlug || params.title, params.slugSet);

  if (existing) {
    await dualWriteUpdate(
      newsTable,
      {
        title: params.title,
        spot: params.spot,
        content,
        imageUrl: params.imageUrl,
        categoryId: params.categoryId,
        authorId: params.authorId,
        status: params.status,
        updatedAt: params.updatedAt,
        rssSourceUrl: params.dedupeKey,
      },
      eq(newsTable.id, existing.id),
    );
    if (params.counter === "news") params.stats.newsUpdated += 1;
    else params.stats.makaleUpdated += 1;
    return;
  }

  await dualWriteInsert(newsTable, {
    title: params.title,
    slug,
    spot: params.spot,
    content,
    imageUrl: params.imageUrl,
    categoryId: params.categoryId,
    authorId: params.authorId,
    status: params.status,
    siteId: null,
    isEditorManual: true,
    rssSourceUrl: params.dedupeKey,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  });

  if (params.counter === "news") params.stats.newsInserted += 1;
  else params.stats.makaleInserted += 1;
}

function shouldSyncEditorNews(
  row: NewsRow,
  categoriesById: Map<number, { slug: string; exclusiveSiteId: number | null }>,
): boolean {
  if (row.siteId == null) return false;
  // Siteye özel haber yekpare merkeze / diğer sitelere senkron edilmez.
  if (row.siteOnly === true) return false;
  if (String(row.rssSourceUrl ?? "").trim().startsWith("yekpare-hm-sync:")) return false;
  if (String(row.rssSourceUrl ?? "").trim()) return false;
  if (row.isEditorManual) return true;
  if (row.authorId != null && row.authorId > 0) {
    if (row.categoryId != null) {
      const cat = categoriesById.get(row.categoryId);
      if (isKoseCategorySlug(cat?.slug)) return true;
    }
    return true;
  }
  if (row.categoryId != null) {
    const cat = categoriesById.get(row.categoryId);
    if (cat?.exclusiveSiteId === row.siteId) return true;
    if (isKoseCategorySlug(cat?.slug)) return true;
  }
  return false;
}

async function buildSiteCtx(
  site: HmNewsSiteRow,
  categoriesById: Map<number, { id: number; name: string; slug: string; exclusiveSiteId: number | null }>,
  blogCategoryId: number | null,
  centralSlugs: Set<string>,
  authorMap: Map<string, number>,
): Promise<SiteCtx> {
  return {
    site,
    authorMap,
    slugSet: new Set(centralSlugs),
    categoryMap: new Map(),
    blogCategoryId,
  };
}

async function syncSiteNews(ctx: SiteCtx, stats: YekpareHmSyncResult, categoriesById: Map<number, { id: number; name: string; slug: string; exclusiveSiteId: number | null }>): Promise<void> {
  const rows = await db
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.siteId, ctx.site.id), eq(newsTable.status, "published")));

  for (const row of rows) {
    if (!shouldSyncEditorNews(row, categoriesById)) {
      stats.newsSkipped += 1;
      continue;
    }
    try {
      const authorId = await resolveCentralAuthorId(row.authorId, ctx.site.id, ctx.authorMap, stats);
      const categoryId = await resolvePortalCategoryId(
        row.categoryId,
        ctx.site,
        ctx.categoryMap,
        stats,
        categoriesById,
      );
      await upsertCentralNews({
        dedupeKey: buildHmSyncDedupeKey(ctx.site.id, "news", row.id),
        site: ctx.site,
        kind: "news",
        sourceSlug: row.slug,
        title: row.title,
        spot: row.spot,
        content: row.content,
        imageUrl: row.imageUrl,
        categoryId,
        authorId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        slugSet: ctx.slugSet,
        stats,
        counter: "news",
      });
    } catch (e) {
      stats.errors.push(
        `news#${row.id} (${ctx.site.slug}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

/** Merkez akıştaki HM senkron kayıtlarında eksik/yanlış yazar bağlantılarını düzeltir. */
async function repairCentralAuthorLinks(
  authorMap: Map<string, number>,
  stats: YekpareHmSyncResult,
  dryRun: boolean,
): Promise<void> {
  const rows = await db
    .select({
      id: newsTable.id,
      authorId: newsTable.authorId,
      rssSourceUrl: newsTable.rssSourceUrl,
    })
    .from(newsTable)
    .where(
      and(
        isNull(newsTable.siteId),
        sql`${newsTable.rssSourceUrl} like 'yekpare-hm-sync:%'`,
      ),
    );

  for (const row of rows) {
    const parts = parseHmSyncDedupeKey(row.rssSourceUrl);
    if (!parts) continue;

    let sourceAuthorId: number | null = null;
    if (parts.kind === "makale") {
      const [src] = await db
        .select({ authorId: hmMakalelerTable.authorId })
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.siteId, parts.siteId), eq(hmMakalelerTable.id, parts.sourceId)))
        .limit(1);
      sourceAuthorId = src?.authorId ?? null;
    } else {
      const [src] = await db
        .select({ authorId: newsTable.authorId })
        .from(newsTable)
        .where(and(eq(newsTable.siteId, parts.siteId), eq(newsTable.id, parts.sourceId)))
        .limit(1);
      sourceAuthorId = src?.authorId ?? null;
    }

    const resolved =
      sourceAuthorId != null
        ? await resolveCentralAuthorId(sourceAuthorId, parts.siteId, authorMap, stats)
        : null;

    let targetAuthorId = resolved;
    if (targetAuthorId == null && row.authorId != null && row.authorId > 0) {
      const [linked] = await db
        .select({ hmSiteId: authorsTable.hmSiteId })
        .from(authorsTable)
        .where(eq(authorsTable.id, row.authorId))
        .limit(1);
      if (linked?.hmSiteId != null) {
        targetAuthorId = await resolveCentralAuthorId(row.authorId, parts.siteId, authorMap, stats);
      } else {
        targetAuthorId = row.authorId;
      }
    }

    if (targetAuthorId == null || targetAuthorId === row.authorId) continue;
    if (!dryRun) {
      await dualWriteUpdate(newsTable, { authorId: targetAuthorId }, eq(newsTable.id, row.id));
    }
    stats.authorLinksRepaired += 1;
  }
}

async function syncSiteMakaleler(ctx: SiteCtx, stats: YekpareHmSyncResult): Promise<void> {
  const rows = await db
    .select()
    .from(hmMakalelerTable)
    .where(and(eq(hmMakalelerTable.siteId, ctx.site.id), eq(hmMakalelerTable.status, "published")));

  for (const row of rows) {
    try {
      const authorId = await resolveCentralAuthorId(row.authorId, ctx.site.id, ctx.authorMap, stats);
      await upsertCentralNews({
        dedupeKey: buildHmSyncDedupeKey(ctx.site.id, "makale", row.id),
        site: ctx.site,
        kind: "makale",
        sourceSlug: row.slug,
        title: row.title,
        spot: row.spot,
        content: row.content,
        imageUrl: row.imageUrl,
        categoryId: ctx.blogCategoryId,
        authorId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        slugSet: ctx.slugSet,
        stats,
        counter: "makale",
      });
    } catch (e) {
      stats.errors.push(
        `makale#${row.id} (${ctx.site.slug}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

/** Tüm aktif HM editör sitelerinden Yekpare merkez akışına toplu senkron / backfill. */
export async function syncHmEditorContentToYekpare(opts?: {
  siteIds?: number[];
  dryRun?: boolean;
}): Promise<YekpareHmSyncResult> {
  const dryRun = opts?.dryRun === true;
  const stats: YekpareHmSyncResult = {
    sitesProcessed: 0,
    authorsUpserted: 0,
    authorsSkipped: 0,
    authorsMerged: 0,
    newsInserted: 0,
    newsUpdated: 0,
    newsSkipped: 0,
    newsDeduped: 0,
    makaleInserted: 0,
    makaleUpdated: 0,
    makaleSkipped: 0,
    makaleDeduped: 0,
    categoriesCreated: 0,
    authorLinksRepaired: 0,
    errors: [],
  };

  if (!dryRun) {
    await consolidatePortalAuthors(stats, dryRun);
    // Site slug önekli yanlış global kategorileri (ör. asg-ankara) siteye özel canonical slug'a taşır.
    await runConsolidateSitePrefixCategories().catch(() => null);
  }

  const newsCtx = await loadNewsContext();
  const categoriesById = new Map(
    [...newsCtx.categories.values()].map((c) => [
      c.id,
      { id: c.id, name: c.name, slug: c.slug, exclusiveSiteId: c.exclusiveSiteId ?? null },
    ]),
  );
  const blogCat = [...newsCtx.categories.values()].find((c) => c.slug === "blog");
  const blogCategoryId = blogCat?.id ?? null;

  let sites: HmNewsSiteRow[];
  if (opts?.siteIds?.length) {
    sites = await db
      .select()
      .from(hmNewsSitesTable)
      .where(and(inArray(hmNewsSitesTable.id, opts.siteIds), eq(hmNewsSitesTable.active, true)));
  } else {
    sites = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.active, true));
  }
  sites = filterSitesForYekpareSync(sites);

  const centralSlugs = await loadCentralSlugSet();
  const globalAuthorMap = new Map<string, number>();

  for (const site of sites) {
    stats.sitesProcessed += 1;
    const ctx = await buildSiteCtx(site, categoriesById, blogCategoryId, centralSlugs, globalAuthorMap);
    await syncSiteAuthors(site.id, ctx.authorMap, stats);
    if (!dryRun) {
      await syncSiteNews(ctx, stats, categoriesById);
      await syncSiteMakaleler(ctx, stats);
    }
  }

  if (!dryRun) {
    await repairCentralAuthorLinks(globalAuthorMap, stats, dryRun);
    await consolidatePortalAuthors(stats, dryRun);
  }

  return stats;
}

export async function syncSingleHmNewsToYekpare(siteId: number, newsId: number): Promise<void> {
  await syncHmEditorContentToYekpare({ siteIds: [siteId] });
  void newsId;
}

export async function syncSingleHmMakaleToYekpare(siteId: number, makaleId: number): Promise<void> {
  await syncHmEditorContentToYekpare({ siteIds: [siteId] });
  void makaleId;
}

/** Startup: idempotent HM→Yekpare backfill (SKIP_HM_YEKPARE_SYNC=1 ile kapalı). */
let startupSyncPromise: Promise<YekpareHmSyncResult | null> | null = null;

export function scheduleHmYekpareNewsStartupSync(): Promise<YekpareHmSyncResult | null> {
  if (process.env.SKIP_HM_YEKPARE_SYNC === "1") {
    return Promise.resolve(null);
  }
  if (startupSyncPromise) return startupSyncPromise;
  startupSyncPromise = syncHmEditorContentToYekpare()
    .catch((err) => {
      startupSyncPromise = null;
      throw err;
    });
  return startupSyncPromise;
}
