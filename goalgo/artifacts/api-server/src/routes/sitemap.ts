import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, isNull, isNotNull, notInArray, or, sql } from "drizzle-orm";
import {
  db,
  getNewsDbForRead,
  newsTable,
  mapBusinessesTable,
  categoriesTable,
  hmNewsSitesTable,
  hmMakalelerTable,
  vendorsTable,
  authorsTable,
} from "@workspace/db";
import { TR_PROVINCE_NAMES_81 } from "../lib/turkishProvinces.js";
import { sitePublicOrigin, resolvePortalRequestOrigin } from "../lib/site-public-origin";
import { isPortalHostname, PORTAL_BRAND_SHORT } from "../lib/portalBrand";
import {
  buildYektubeStaticSitemapXml,
  buildYektubeVideoSitemapXml,
  countYektubeVideosForSitemap,
  countYektubeVideosOnSitemapPage,
  YEKTUBE_SITEMAP_PAGE_SIZE,
} from "../lib/yektubeVideoSitemap.js";
import {
  buildMarketplaceProductSitemapXml,
  countMarketplaceProductsForSitemap,
  countMarketplaceProductsOnSitemapPage,
  MARKETPLACE_SITEMAP_PAGE_SIZE,
} from "../lib/marketplaceProductSitemap.js";
import { getActiveHmNewsSiteBySlugCompat, getActiveHmNewsSiteByDomainCompat } from "../lib/hm-site-compat";
import { getHmHiddenCategoryIds, getHmHiddenCategorySlugs, isHmLayoutModuleEnabled, readHmPublicLayout } from "../lib/hm-public-layout";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG, isHmOptInNewsCategorySlug } from "../lib/hm-global-news-category.js";
import {
  deriveCleanCategorySlug,
  filterHmPublicCategoryRows,
  isHmCorporateLayout,
  resolveHmCorporateAuthorsEnabledFromLayout,
  resolveHmPublicActiveGlobalSlugs,
} from "../lib/hm-editor-categories.js";
import { normalizeNewsCategorySlug } from "../lib/categorySort.js";
import { isKoseArticle, buildKoseArticlePublicPath } from "../lib/kose-article.js";
import {
  buildNewsUrlXmlBlock,
  mapJoinedNewsSitemapRow,
  NEWS_URLSET_ATTRS,
  type NewsSitemapRow,
} from "../lib/news-sitemap-xml.js";
import { filterNewsSitemapRows } from "../lib/sitemap-validation.js";

const router: IRouter = Router();

/** Merkez havuz kategorileri — HM sitemap/RSS'te site haberi olmasa da indexlenir. */
const HM_PORTAL_POOL_SITEMAP_CATEGORIES = new Set<string>([HM_GLOBAL_NEWS_CATEGORY_SLUG]);

/** Yinelenen DB kategori slug'ları → kanonik sitemap dosya adı. */
const PORTAL_CATEGORY_SITEMAP_SLUG_CANONICAL: Record<string, string> = {
  "asayi-s": "asayis",
};

function isPortalCategorySitemapAliasSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(PORTAL_CATEGORY_SITEMAP_SLUG_CANONICAL, slug.toLowerCase());
}

function dedupeNewsSitemapRows(rows: NewsSitemapRow[]): NewsSitemapRow[] {
  return filterNewsSitemapRows(rows);
}

const portalPublishedNewsWhere = and(
  eq(newsTable.status, "published"),
  isNull(newsTable.siteId),
  eq(newsTable.siteOnly, false),
);

function canonicalPortalCategorySitemapSlug(rawSlug: string): string {
  const slug = String(rawSlug ?? "").trim();
  if (!slug) return "";
  return PORTAL_CATEGORY_SITEMAP_SLUG_CANONICAL[slug.toLowerCase()] ?? slug;
}

async function loadPortalSitemapCategoryItems(): Promise<Array<{ slug: string; name: string | null }>> {
  const rows = await db
    .selectDistinct({ slug: categoriesTable.slug, name: categoriesTable.name })
    .from(newsTable)
    .innerJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(portalPublishedNewsWhere);

  const byCanonical = new Map<string, { slug: string; name: string | null }>();
  for (const row of rows) {
    const raw = String(row.slug ?? "").trim();
    if (!raw) continue;
    const canonical = canonicalPortalCategorySitemapSlug(raw);
    const norm = normalizeNewsCategorySlug(canonical);
    const existing = byCanonical.get(norm);
    if (!existing || canonical === raw) {
      byCanonical.set(norm, { slug: canonical, name: row.name ?? null });
    }
  }
  const candidates = [...byCanonical.values()].sort((a, b) => a.slug.localeCompare(b.slug, "tr"));
  const out: Array<{ slug: string; name: string | null }> = [];
  for (const cat of candidates) {
    const articles = await loadPortalPoolCategoryArticles(cat.slug, 1);
    if (articles.length > 0) out.push(cat);
  }
  return out;
}

function normalizeRequestHost(req: import("express").Request): string | null {
  const fwd = String(req.get("x-forwarded-host") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  const raw = (fwd || String(req.get("host") ?? "")).trim().toLowerCase();
  const h = raw.replace(/^www\./, "").split(":")[0]?.trim();
  return h || null;
}

function domainLookupCandidates(raw: string | null): string[] {
  if (!raw) return [];
  const h = raw.toLowerCase().replace(/^www\./, "");
  const set = new Set<string>([h, raw.toLowerCase()]);
  if (!raw.toLowerCase().startsWith("www.")) set.add(`www.${h}`);
  return Array.from(set);
}

function isPortalHostForSitemap(host: string | null): boolean {
  return isPortalHostname(host);
}

function hmSiteOrigin(domain: string | null | undefined, fallback: string): string {
  const d = String(domain ?? "").trim();
  if (!d) return fallback;
  try {
    return new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`).origin;
  } catch {
    return fallback;
  }
}

function hmSitemapUrlDomain(
  req: import("express").Request,
  site: { domain: string | null | undefined; domain2?: string | null; domain3?: string | null },
): string | null {
  const requestHost = normalizeRequestHost(req);
  if (isPortalHostForSitemap(requestHost)) return null;
  if (!requestHost) return null;
  const reqHost = requestHost.replace(/^www\./, "");
  for (const d of [site.domain, site.domain2, site.domain3]) {
    const raw = String(d ?? "").trim();
    if (!raw) continue;
    try {
      const origin = hmSiteOrigin(raw, `https://${requestHost}`);
      const siteHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
      if (reqHost === siteHost) return raw;
    } catch {
      /* fall through */
    }
  }
  return null;
}

function sendSitemapIndex(res: import("express").Response, locs: string[]): void {
  const today = new Date().toISOString().split("T")[0];
  const uniqueLocs = Array.from(new Set(locs.filter(Boolean)));
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(
    `${xmlHeader()}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueLocs.map((loc) => `  <sitemap><loc>${escXml(loc)}</loc><lastmod>${today}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>`,
  );
}

function xmlHeader() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n';
}

function escXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlXmlEntry(
  loc: string,
  opts?: { lastmod?: string | Date | null; priority?: string; changefreq?: string },
): string {
  const lastmod = opts?.lastmod ? new Date(opts.lastmod).toISOString().split("T")[0] : "";
  const priority = opts?.priority ?? "0.6";
  const changefreq = opts?.changefreq ?? "weekly";
  return [
    "  <url>",
    `    <loc>${escXml(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function sendUrlset(res: import("express").Response, urls: string): void {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(`${xmlHeader()}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
}

/** Turizm ilanı türü → güncel public rota segmenti. */
function tourismListingPublicPath(type: string, slug: string): string {
  const s = String(slug ?? "").trim();
  const t = String(type ?? "hotel").trim().toLowerCase();
  if (!s) return "/turizm";
  switch (t) {
    case "tour":
    case "tur":
    case "turlar":
      return `/turizm/tur/${encodeURIComponent(s)}`;
    case "villa":
    case "space":
    case "uzay":
      return `/turizm/villa-ev/${encodeURIComponent(s)}`;
    case "car":
    case "arac":
    case "rentacar":
      return `/turizm/arac-kiralama/${encodeURIComponent(s)}`;
    case "boat":
    case "yat":
    case "tekne":
      return `/turizm/yat-turlari/${encodeURIComponent(s)}`;
    case "hotel":
    case "otel":
    case "konaklama":
    default:
      return `/turizm/konaklama/${encodeURIComponent(s)}`;
  }
}

function ecommerceVendorPublicPath(slug: string): string {
  return `/magaza/magaza/${encodeURIComponent(slug)}`;
}

function otomotivBusinessPublicPath(businessType: string | null | undefined, slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "/otomotiv";
  const t = String(businessType ?? "").toLowerCase();
  const encoded = encodeURIComponent(s);
  if (t === "galeri") return `/otomotiv/galeri/${encoded}`;
  if (t === "yedek_parca") return `/otomotiv/yedek-parca/${encoded}`;
  if (t === "cikma") return `/otomotiv/cikma/${encoded}`;
  if (t === "servis") return `/otomotiv/servis/${encoded}`;
  if (t === "yikama") return `/otomotiv/yikama/${encoded}`;
  if (t === "lastik") return `/otomotiv/lastik/${encoded}`;
  return `/otomotiv/servis/${encoded}`;
}

function otomotivListingPublicPath(businessType: string | null | undefined, listingSlug: string): string {
  const s = String(listingSlug ?? "").trim();
  if (!s) return "/otomotiv";
  const t = String(businessType ?? "").toLowerCase();
  const encoded = encodeURIComponent(s);
  if (t === "galeri" || t === "genel") return `/otomotiv/galeri/${encoded}`;
  if (t === "yedek_parca") return `/otomotiv/yedek-parca/${encoded}`;
  if (t === "cikma") return `/otomotiv/cikma/${encoded}`;
  return `/otomotiv/ikinci-el/${encoded}`;
}

function sarisayfalarPublicPath(slug: string | null | undefined, id: string | number): string {
  const s = String(slug ?? "").trim();
  if (s) return `/kesfet/sarisayfalar/${encodeURIComponent(s)}`;
  return `/kesfet/sarisayfalar/${encodeURIComponent(String(id))}`;
}

function wikiSlugFromTitle(title: string): string {
  return encodeURIComponent(String(title ?? "").trim().replace(/ /g, "_"));
}

function stripTags(s: string | null | undefined, max = 800): string {
  const t = String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function yekpareArticleUrl(slug: string, base: string): string {
  return `${base.replace(/\/+$/, "")}/haber/${encodeURIComponent(slug)}`;
}

function hmArticleUrl(siteSlug: string, articleSlug: string, domain: string | null, base: string): string {
  return hmPublicContentUrl(siteSlug, `/haber/${encodeURIComponent(articleSlug)}`, domain, base);
}

function hmCategoryUrl(siteSlug: string, catSlug: string, domain: string | null, base: string): string {
  return hmPublicContentUrl(siteSlug, `/kategori/${encodeURIComponent(catSlug)}`, domain, base);
}

function hmPublicContentUrl(siteSlug: string, tail: string, domain: string | null, base: string): string {
  const tailNorm = tail.startsWith("/") ? tail : `/${tail}`;
  const d = (domain ?? "").trim();
  if (d) {
    try {
      const origin = new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`).origin;
      return `${origin.replace(/\/+$/, "")}${tailNorm}`;
    } catch {
      /* fall through */
    }
  }
  return `${base.replace(/\/+$/, "")}/${HM_PREFIX}/${encodeURIComponent(siteSlug)}${tailNorm}`;
}

const newsSitemapSelectFields = {
  slug: newsTable.slug,
  title: newsTable.title,
  spot: newsTable.spot,
  imageUrl: newsTable.imageUrl,
  tags: newsTable.tags,
  updatedAt: newsTable.updatedAt,
  createdAt: newsTable.createdAt,
  categorySlug: categoriesTable.slug,
  categoryName: categoriesTable.name,
};

async function loadPortalPoolCategoryArticles(catSlug: string, limit = 2000): Promise<NewsSitemapRow[]> {
  const slug = String(catSlug ?? "").trim().toLowerCase();
  if (!slug) return [];
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
  if (!cat) return [];
  return db
    .select(newsSitemapSelectFields)
    .from(newsTable)
    .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(newsTable.status, "published"),
        isNull(newsTable.siteId),
        eq(newsTable.siteOnly, false),
        eq(newsTable.categoryId, cat.id),
      ),
    )
    .orderBy(desc(newsTable.updatedAt))
    .limit(limit)
    .then((rows) => rows.map(mapJoinedNewsSitemapRow));
}

async function loadHmCategorySitemapArticles(
  siteId: number,
  catSlug: string,
  limit = 2000,
): Promise<NewsSitemapRow[]> {
  const slug = String(catSlug ?? "").trim().toLowerCase();
  if (!slug) return [];
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
  if (!cat) return [];

  const siteArticles: NewsSitemapRow[] = await db
    .select(newsSitemapSelectFields)
    .from(newsTable)
    .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(
      and(eq(newsTable.status, "published"), eq(newsTable.siteId, siteId), eq(newsTable.categoryId, cat.id)),
    )
    .orderBy(desc(newsTable.updatedAt))
    .limit(limit)
    .then((rows) => rows.map(mapJoinedNewsSitemapRow));

  if (!HM_PORTAL_POOL_SITEMAP_CATEGORIES.has(slug)) return siteArticles;

  const portalArticles = await loadPortalPoolCategoryArticles(slug, limit);
  const seen = new Set(siteArticles.map((row) => row.slug));
  const merged: NewsSitemapRow[] = [...siteArticles];
  for (const row of portalArticles) {
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    merged.push(row);
  }
  merged.sort((a, b) => {
    const aTs = (a.updatedAt ?? a.createdAt)?.getTime?.() ?? 0;
    const bTs = (b.updatedAt ?? b.createdAt)?.getTime?.() ?? 0;
    return bTs - aTs;
  });
  return merged.slice(0, limit);
}

const HM_PREFIX = "tr";

const HM_STATIC_SITEMAP_PATHS: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/sondakika", priority: "0.9", changefreq: "hourly" },
  { path: "/tum-haberler", priority: "0.8", changefreq: "daily" },
  { path: "/yazarlar", priority: "0.6", changefreq: "weekly" },
  { path: "/kunye", priority: "0.4", changefreq: "monthly" },
  { path: "/iletisim", priority: "0.4", changefreq: "monthly" },
  { path: "/ara", priority: "0.5", changefreq: "weekly" },
  { path: "/foto-galeri", priority: "0.5", changefreq: "weekly" },
];

function newsSitemapMediaOrigin(base: string, loc: string): string {
  const b = String(base ?? "").replace(/\/+$/, "");
  if (b) return b;
  try {
    return new URL(loc).origin;
  } catch {
    return "";
  }
}

function hmEnabledExtraPages(layout: Record<string, unknown>): Array<{ slug: string; title: string }> {
  const raw = layout.hmExtraPages;
  if (!Array.isArray(raw)) return [];
  const out: Array<{ slug: string; title: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const page = item as { enabled?: boolean; slug?: string; title?: string };
    if (page.enabled === false) continue;
    const slug = String(page.slug ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!slug) continue;
    out.push({ slug, title: String(page.title ?? slug).trim() || slug });
  }
  return out;
}

async function resolveHmSitemapCategorySlugs(site: HmSiteSitemapRow): Promise<string[]> {
  const layout = await readHmPublicLayout(site.id);
  const hidden = await getHmHiddenCategorySlugs(site.id);
  const slugSet = new Set<string>();

  const allCats = await db
    .select({ slug: categoriesTable.slug, exclusiveSiteId: categoriesTable.exclusiveSiteId })
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, site.id)));

  const publicCats = filterHmPublicCategoryRows(allCats, site.id, site.slug, layout);
  for (const cat of publicCats) {
    const clean = deriveCleanCategorySlug(cat.slug, site.slug).toLowerCase();
    if (!clean || hidden.has(clean) || isPortalCategorySitemapAliasSlug(clean)) continue;
    const canonical = canonicalPortalCategorySitemapSlug(clean).toLowerCase();
    if (!canonical || hidden.has(canonical)) continue;
    slugSet.add(canonical);
  }

  const siteCatRows = await db
    .selectDistinct({ catSlug: categoriesTable.slug })
    .from(newsTable)
    .innerJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id)));
  for (const row of siteCatRows) {
    const clean = deriveCleanCategorySlug(String(row.catSlug ?? ""), site.slug).toLowerCase();
    if (!clean || hidden.has(clean) || isPortalCategorySitemapAliasSlug(clean)) continue;
    const canonical = canonicalPortalCategorySitemapSlug(clean).toLowerCase();
    if (!canonical || hidden.has(canonical)) continue;
    slugSet.add(canonical);
  }

  const globalSlugs = allCats
    .filter((c) => c.exclusiveSiteId == null)
    .map((c) => normalizeNewsCategorySlug(c.slug))
    .filter(Boolean);
  const activeGlobal = resolveHmPublicActiveGlobalSlugs(layout, globalSlugs);
  for (const catSlug of activeGlobal) {
    if (hidden.has(catSlug) || isPortalCategorySitemapAliasSlug(catSlug)) continue;
    const articles = dedupeNewsSitemapRows(await loadHmCategorySitemapArticles(site.id, catSlug, 5));
    if (articles.length > 0) slugSet.add(catSlug);
  }

  for (const catSlug of HM_PORTAL_POOL_SITEMAP_CATEGORIES) {
    if (hidden.has(catSlug) || slugSet.has(catSlug)) continue;
    const portalArticles = dedupeNewsSitemapRows(await loadPortalPoolCategoryArticles(catSlug, 5));
    if (portalArticles.length === 0) continue;
    slugSet.add(catSlug);
  }

  const verified = new Set<string>();
  for (const catSlug of slugSet) {
    const articles = dedupeNewsSitemapRows(await loadHmCategorySitemapArticles(site.id, catSlug, 1));
    if (articles.length > 0) verified.add(catSlug);
  }
  return [...verified].sort((a, b) => a.localeCompare(b, "tr"));
}

function hmSupplementarySitemapLocs(origin: string, siteSlug: string): string[] {
  const enc = encodeURIComponent(siteSlug);
  return [
    `${origin}/news-hm-${enc}-makale.xml`,
    `${origin}/news-hm-${enc}-yazarlar.xml`,
    `${origin}/news-hm-${enc}-sayfalar.xml`,
  ];
}
function newsUrlXmlBlock(
  loc: string,
  row: NewsSitemapRow,
  publicationName: string,
  withNewsExtension: boolean,
  opts?: { priority?: string; changefreq?: string; mediaOrigin?: string },
): string {
  return buildNewsUrlXmlBlock(loc, row, publicationName, withNewsExtension, opts);
}

/* — Yekpare ana haber havuzu (site_id IS NULL) — */
router.get("/news-yekpare.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const pubName = PORTAL_BRAND_SHORT;
    const mediaOrigin = base.replace(/\/+$/, "");
    const articles = dedupeNewsSitemapRows(
      await db
        .select(newsSitemapSelectFields)
        .from(newsTable)
        .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
        .where(portalPublishedNewsWhere)
        .orderBy(desc(newsTable.updatedAt))
        .limit(2000)
        .then((rows) => rows.map(mapJoinedNewsSitemapRow)),
    );
    if (articles.length === 0) {
      sendUrlset(res, "");
      return;
    }
    const urls = articles
      .map((a) =>
        newsUrlXmlBlock(yekpareArticleUrl(a.slug, base), a, pubName, true, { mediaOrigin }),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Yekpare: kategori başına — */
router.get("/news-yekpare-cat-:catSlug.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const catSlug = String(req.params.catSlug ?? "").trim();
    if (!catSlug) {
      res.status(400).send("catSlug");
      return;
    }
    const aliasCanonical = PORTAL_CATEGORY_SITEMAP_SLUG_CANONICAL[catSlug.toLowerCase()];
    if (aliasCanonical) {
      res.redirect(301, `/news-yekpare-cat-${encodeURIComponent(aliasCanonical)}.xml`);
      return;
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, catSlug));
    if (!cat) {
      res.status(404).send("category");
      return;
    }
    const articles = dedupeNewsSitemapRows(
      await db
        .select(newsSitemapSelectFields)
        .from(newsTable)
        .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
        .where(
          and(portalPublishedNewsWhere, eq(newsTable.categoryId, cat.id)),
        )
        .orderBy(desc(newsTable.updatedAt))
        .limit(2000)
        .then((rows) => rows.map(mapJoinedNewsSitemapRow)),
    );

    const pubName = `${PORTAL_BRAND_SHORT} — ${cat.name ?? catSlug}`;
    if (articles.length === 0) {
      sendUrlset(res, "");
      return;
    }
    const mediaOrigin = base.replace(/\/+$/, "");
    const urls = articles
      .map((a) =>
        newsUrlXmlBlock(yekpareArticleUrl(a.slug, base), a, pubName, true, { mediaOrigin }),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — HM site: tek kategori (örn. `/news-hm/suha/gundem.xml`) — */
router.get("/news-hm/:hmSlug/:catFile", async (req, res): Promise<void> => {
  try {
    const catFile = String(req.params.catFile ?? "");
    if (!catFile.endsWith(".xml")) {
      res.status(404).send("not found");
      return;
    }
    const catSlug = catFile.replace(/\.xml$/i, "").trim();
    const hmSlug = String(req.params.hmSlug ?? "").trim();
    if (!hmSlug || !catSlug) {
      res.status(400).send("slug");
      return;
    }
    const site = await getActiveHmNewsSiteBySlugCompat(hmSlug);
    if (!site) {
      sendUrlset(res, "");
      return;
    }
    const hiddenCategorySlugs = await getHmHiddenCategorySlugs(site.id);
    if (hiddenCategorySlugs.has(catSlug.toLowerCase())) {
      sendUrlset(res, "");
      return;
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, catSlug));
    if (!cat) {
      sendUrlset(res, "");
      return;
    }
    const articles = dedupeNewsSitemapRows(await loadHmCategorySitemapArticles(site.id, catSlug, 2000));

    const pubName = `${site.displayName || site.slug} — ${cat.name ?? catSlug}`;
    if (articles.length === 0) {
      sendUrlset(res, "");
      return;
    }
    const portalBase = resolvePortalRequestOrigin(req);
    const mediaOrigin = newsSitemapMediaOrigin(portalBase, hmSiteOrigin(site.domain, portalBase));
    const urls = articles
      .map((a) =>
        newsUrlXmlBlock(
          hmArticleUrl(site.slug, a.slug, hmSitemapUrlDomain(req, site), portalBase),
          a,
          pubName,
          true,
          { mediaOrigin },
        ),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — HM site: köşe / makale — */
router.get("/news-hm-:hmSlug-makale.xml", async (req, res): Promise<void> => {
  try {
    const hmSlug = String(req.params.hmSlug ?? "").trim();
    if (!hmSlug) {
      res.status(400).send("slug");
      return;
    }
    const site = await getActiveHmNewsSiteBySlugCompat(hmSlug);
    if (!site) {
      sendUrlset(res, "");
      return;
    }
    const urlDomain = hmSitemapUrlDomain(req, site);
    const portalBase = resolvePortalRequestOrigin(req);
    const mediaOrigin = newsSitemapMediaOrigin(portalBase, hmSiteOrigin(site.domain, portalBase));

    const makaleRows = await db
      .select({
        slug: hmMakalelerTable.slug,
        title: hmMakalelerTable.title,
        spot: hmMakalelerTable.spot,
        imageUrl: hmMakalelerTable.imageUrl,
        updatedAt: hmMakalelerTable.updatedAt,
        createdAt: hmMakalelerTable.createdAt,
      })
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.status, "published"), eq(hmMakalelerTable.siteId, site.id)))
      .orderBy(desc(hmMakalelerTable.updatedAt))
      .limit(2000);

    const koseNewsRows = await db
      .select({
        ...newsSitemapSelectFields,
        authorId: newsTable.authorId,
        rssSourceUrl: newsTable.rssSourceUrl,
      })
      .from(newsTable)
      .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
      .where(and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id)))
      .orderBy(desc(newsTable.updatedAt))
      .limit(2000);

    const pubName = site.displayName || site.slug;
    const seen = new Set<string>();
    const blocks: string[] = [];

    for (const row of makaleRows) {
      const slug = String(row.slug ?? "").trim();
      if (!slug) continue;
      const key = slug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const fake: NewsSitemapRow = {
        slug,
        title: row.title,
        spot: row.spot,
        imageUrl: row.imageUrl,
        tags: null,
        categorySlug: "makale",
        categoryName: "Makale",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      const loc = hmPublicContentUrl(site.slug, buildKoseArticlePublicPath(slug), urlDomain, portalBase);
      blocks.push(newsUrlXmlBlock(loc, fake, pubName, true, { mediaOrigin, priority: "0.65" }));
    }

    for (const row of koseNewsRows) {
      if (!isKoseArticle(row)) continue;
      const mapped = mapJoinedNewsSitemapRow(row);
      const slug = String(mapped.slug ?? "").trim();
      if (!slug) continue;
      const key = slug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const loc = hmPublicContentUrl(site.slug, buildKoseArticlePublicPath(slug), urlDomain, portalBase);
      blocks.push(newsUrlXmlBlock(loc, mapped, pubName, true, { mediaOrigin, priority: "0.65" }));
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${blocks.join("\n")}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — HM site: yazarlar — */
router.get("/news-hm-:hmSlug-yazarlar.xml", async (req, res): Promise<void> => {
  try {
    const hmSlug = String(req.params.hmSlug ?? "").trim();
    if (!hmSlug) {
      res.status(400).send("slug");
      return;
    }
    const site = await getActiveHmNewsSiteBySlugCompat(hmSlug);
    if (!site) {
      sendUrlset(res, "");
      return;
    }
    const layout = await readHmPublicLayout(site.id);
    if (isHmCorporateLayout(layout) && !resolveHmCorporateAuthorsEnabledFromLayout(layout)) {
      sendUrlset(res, "");
      return;
    }
    const urlDomain = hmSitemapUrlDomain(req, site);
    const portalBase = resolvePortalRequestOrigin(req);
    const hubLoc = hmPublicContentUrl(site.slug, "/yazarlar", urlDomain, portalBase);
    const hubUrl = urlXmlEntry(hubLoc, { changefreq: "weekly", priority: "0.6" });

    const authorIdRows = await db
      .selectDistinct({ authorId: hmMakalelerTable.authorId })
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, site.id),
          eq(hmMakalelerTable.status, "published"),
          isNotNull(hmMakalelerTable.authorId),
        ),
      );
    const authorIds = new Set<number>();
    for (const row of authorIdRows) {
      const id = Number(row.authorId);
      if (Number.isFinite(id) && id > 0) authorIds.add(id);
    }

    const koseAuthorRows = await db
      .select({
        authorId: newsTable.authorId,
        rssSourceUrl: newsTable.rssSourceUrl,
        categorySlug: categoriesTable.slug,
      })
      .from(newsTable)
      .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
      .where(and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id), isNotNull(newsTable.authorId)));
    for (const row of koseAuthorRows) {
      if (!isKoseArticle(row)) continue;
      const id = Number(row.authorId);
      if (Number.isFinite(id) && id > 0) authorIds.add(id);
    }

    if (authorIds.size === 0) {
      sendUrlset(res, hubUrl);
      return;
    }

    const authorRows = await db
      .select({ id: authorsTable.id, name: authorsTable.name })
      .from(authorsTable)
      .where(inArray(authorsTable.id, [...authorIds]))
      .orderBy(desc(authorsTable.id));

    const authorUrls = authorRows
      .filter((a) => String(a.name ?? "").trim())
      .map((a) =>
        urlXmlEntry(hmPublicContentUrl(site.slug, `/yazar/${a.id}`, urlDomain, portalBase), {
          changefreq: "weekly",
          priority: "0.55",
        }),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${hubUrl}\n${authorUrls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — HM site: kurumsal / statik sayfalar — */
router.get("/news-hm-:hmSlug-sayfalar.xml", async (req, res): Promise<void> => {
  try {
    const hmSlug = String(req.params.hmSlug ?? "").trim();
    if (!hmSlug) {
      res.status(400).send("slug");
      return;
    }
    const site = await getActiveHmNewsSiteBySlugCompat(hmSlug);
    if (!site) {
      sendUrlset(res, "");
      return;
    }
    const layout = await readHmPublicLayout(site.id);
    const urlDomain = hmSitemapUrlDomain(req, site);
    const portalBase = resolvePortalRequestOrigin(req);
    const seen = new Set<string>();
    const urls: string[] = [];

    for (const { path, priority, changefreq } of HM_STATIC_SITEMAP_PATHS) {
      const loc = hmPublicContentUrl(site.slug, path, urlDomain, portalBase);
      if (seen.has(loc)) continue;
      seen.add(loc);
      urls.push(urlXmlEntry(loc, { priority, changefreq }));
    }

    for (const page of hmEnabledExtraPages(layout)) {
      const loc = hmPublicContentUrl(site.slug, `/${encodeURIComponent(page.slug)}`, urlDomain, portalBase);
      if (seen.has(loc)) continue;
      seen.add(loc);
      urls.push(urlXmlEntry(loc, { changefreq: "monthly", priority: "0.45" }));
    }

    sendUrlset(res, urls.join("\n"));
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — HM site: tüm yayınlar + kategori URL’leri — */
router.get("/news-hm-:hmSlug.xml", async (req, res): Promise<void> => {
  try {
    const hmSlug = String(req.params.hmSlug ?? "").trim();
    if (!hmSlug) {
      res.status(400).send("slug");
      return;
    }
    const site = await getActiveHmNewsSiteBySlugCompat(hmSlug);
    if (!site) {
      res.status(404).send("site");
      return;
    }
    const hiddenCategoryIds = await getHmHiddenCategoryIds(site.id);
    const hiddenCategorySlugs = await getHmHiddenCategorySlugs(site.id);
    const hiddenCond =
      hiddenCategoryIds.length > 0
        ? or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))
        : undefined;
    const siteArticles: NewsSitemapRow[] = await db
      .select(newsSitemapSelectFields)
      .from(newsTable)
      .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
      .where(
        hiddenCond
          ? and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id), hiddenCond)
          : and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id)),
      )
      .orderBy(desc(newsTable.updatedAt))
      .limit(2000)
      .then((rows) => rows.map(mapJoinedNewsSitemapRow));

    const portalGlobalArticles = hiddenCategorySlugs.has(HM_GLOBAL_NEWS_CATEGORY_SLUG)
      ? []
      : await loadPortalPoolCategoryArticles(HM_GLOBAL_NEWS_CATEGORY_SLUG, 500);
    const articleSeen = new Set(siteArticles.map((row) => row.slug));
    const articles: NewsSitemapRow[] = [...siteArticles];
    for (const row of portalGlobalArticles) {
      if (articleSeen.has(row.slug)) continue;
      articleSeen.add(row.slug);
      articles.push(row);
    }

    const pubName = site.displayName || site.slug;
    const urlDomain = hmSitemapUrlDomain(req, site);
    const portalBase = resolvePortalRequestOrigin(req);
    const mediaOrigin = newsSitemapMediaOrigin(portalBase, hmSiteOrigin(site.domain, portalBase));
    const articlesDeduped = dedupeNewsSitemapRows(articles);
    const urls = articlesDeduped
      .map((a) =>
        newsUrlXmlBlock(hmArticleUrl(site.slug, a.slug, urlDomain, portalBase), a, pubName, true, {
          mediaOrigin,
        }),
      )
      .join("\n");

    const catRows = await db
      .selectDistinct({ id: categoriesTable.id, slug: categoriesTable.slug, name: categoriesTable.name })
      .from(newsTable)
      .innerJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
      .where(
        hiddenCond
          ? and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id), hiddenCond)
          : and(eq(newsTable.status, "published"), eq(newsTable.siteId, site.id)),
      );

    const catSlugSet = new Set(catRows.map((row) => String(row.slug ?? "").trim().toLowerCase()).filter(Boolean));
    if (
      portalGlobalArticles.length > 0 &&
      !hiddenCategorySlugs.has(HM_GLOBAL_NEWS_CATEGORY_SLUG) &&
      !catSlugSet.has(HM_GLOBAL_NEWS_CATEGORY_SLUG)
    ) {
      const [globalCat] = await db
        .select({ id: categoriesTable.id, slug: categoriesTable.slug, name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, HM_GLOBAL_NEWS_CATEGORY_SLUG))
        .limit(1);
      if (globalCat) catRows.push(globalCat);
    }

    const catUrls = catRows
      .map((c) => {
        const loc = hmCategoryUrl(site.slug, c.slug, urlDomain, portalBase);
        const fake: NewsSitemapRow = {
          slug: c.slug,
          title: `${c.name ?? c.slug} — ${pubName}`,
          spot: `${c.name ?? c.slug} kategorisi`,
          imageUrl: null,
          tags: null,
          categorySlug: c.slug,
          categoryName: c.name ?? c.slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return newsUrlXmlBlock(loc, fake, pubName, false);
      })
      .join("\n");

    const staticUrls = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/sondakika", priority: "0.9", changefreq: "hourly" },
      { path: "/tum-haberler", priority: "0.8", changefreq: "daily" },
      { path: "/yazarlar", priority: "0.6", changefreq: "weekly" },
      { path: "/kunye", priority: "0.4", changefreq: "monthly" },
      { path: "/iletisim", priority: "0.4", changefreq: "monthly" },
    ]
      .map(({ path, priority, changefreq }) =>
        urlXmlEntry(hmPublicContentUrl(site.slug, path, urlDomain, portalBase), { priority, changefreq }),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${staticUrls}\n${catUrls}\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Eski: genel haber (tüm siteler karışık) — geriye dönük — */
router.get("/news.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const mediaOrigin = base.replace(/\/+$/, "");
    const articles = dedupeNewsSitemapRows(
      await db
        .select(newsSitemapSelectFields)
        .from(newsTable)
        .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
        .where(portalPublishedNewsWhere)
        .orderBy(desc(newsTable.updatedAt))
        .limit(1000)
        .then((rows) => rows.map(mapJoinedNewsSitemapRow)),
    );
    if (articles.length === 0) {
      sendUrlset(res, "");
      return;
    }

    const urls = articles
      .map((a) =>
        newsUrlXmlBlock(yekpareArticleUrl(a.slug, base), a, PORTAL_BRAND_SHORT, true, { mediaOrigin }),
      )
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Keşfet / harita işletmeleri — */
router.get("/businesses.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const businesses = await db
      .select({
        slug: mapBusinessesTable.slug,
        id: mapBusinessesTable.id,
        name: mapBusinessesTable.name,
        photoUrl: mapBusinessesTable.photoUrl,
        coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
        updatedAt: mapBusinessesTable.updatedAt,
      })
      .from(mapBusinessesTable)
      // Yalnız doğrulanmış (sahipli), premium veya aktif vendor'lu işletmeler özel sayfa
      // alır → sitemap'e yalnız onlar girer; salt kazınanlar haritada gösterilir.
      .where(and(
        eq(mapBusinessesTable.isActive, true),
        or(
          sql`${mapBusinessesTable.ownerId} IS NOT NULL`,
          eq(mapBusinessesTable.isPremium, true),
          sql`EXISTS (SELECT 1 FROM vendors v WHERE v.linked_map_business_id = ${mapBusinessesTable.id} AND COALESCE(v.active, TRUE) = TRUE)`,
        ),
      ))
      .orderBy(desc(mapBusinessesTable.updatedAt))
      .limit(5000);

    const urls = businesses
      .map((b) => {
        const slug = b.slug || String(b.id);
        const loc = `${base}/kesfet/${encodeURIComponent(slug)}`;
        const image = String(b.coverPhotoUrl ?? b.photoUrl ?? "").trim();
        const lastmod = b.updatedAt ? new Date(b.updatedAt).toISOString().split("T")[0] : "";
        const titleEsc = escXml(String(b.name ?? slug).slice(0, 200));
        const lines = [
          "  <url>",
          `    <loc>${escXml(loc)}</loc>`,
          "    <changefreq>monthly</changefreq>",
          "    <priority>0.5</priority>",
          lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        ];
        if (image) {
          lines.push("    <image:image>");
          lines.push(`      <image:loc>${escXml(image.startsWith("http") ? image : `${base}${image.startsWith("/") ? image : `/${image}`}`)}</image:loc>`);
          lines.push(`      <image:title>${titleEsc}</image:title>`);
          lines.push("    </image:image>");
        }
        lines.push("  </url>");
        return lines.filter(Boolean).join("\n");
      })
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`${xmlHeader()}<urlset ${NEWS_URLSET_ATTRS}>\n${urls}\n</urlset>`);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Sipariş işletmeleri (/siparis/satici/...) — */
router.get("/vendors-siparis.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const rows = await db
      .select({ slug: vendorsTable.slug, updatedAt: vendorsTable.updatedAt })
      .from(vendorsTable)
      .where(and(eq(vendorsTable.active, true), eq(vendorsTable.vendorType, "delivery")))
      .orderBy(desc(vendorsTable.updatedAt))
      .limit(5000);

    const urls = rows
      .map((v) =>
        urlXmlEntry(`${base}/siparis/satici/${encodeURIComponent(v.slug)}`, {
          lastmod: v.updatedAt,
          changefreq: "weekly",
          priority: "0.7",
        }),
      )
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Alışveriş mağazaları (geriye dönük /alisveris + kanonik /magaza) — */
router.get("/vendors-alisveris.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const rows = await db
      .select({ slug: vendorsTable.slug, updatedAt: vendorsTable.updatedAt })
      .from(vendorsTable)
      .where(and(eq(vendorsTable.active, true), eq(vendorsTable.vendorType, "ecommerce")))
      .orderBy(desc(vendorsTable.updatedAt))
      .limit(5000);

    const urls = rows
      .flatMap((v) => [
        urlXmlEntry(`${base}${ecommerceVendorPublicPath(v.slug)}`, {
          lastmod: v.updatedAt,
          changefreq: "weekly",
          priority: "0.75",
        }),
        urlXmlEntry(`${base}/alisveris/magaza/${encodeURIComponent(v.slug)}`, {
          lastmod: v.updatedAt,
          changefreq: "weekly",
          priority: "0.65",
        }),
      ])
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Mağaza vitrinleri (kanonik /magaza/magaza/...) — */
router.get("/vendors-magaza.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const rows = await db
      .select({ slug: vendorsTable.slug, updatedAt: vendorsTable.updatedAt })
      .from(vendorsTable)
      .where(and(eq(vendorsTable.active, true), eq(vendorsTable.vendorType, "ecommerce")))
      .orderBy(desc(vendorsTable.updatedAt))
      .limit(5000);

    const urls = rows
      .map((v) =>
        urlXmlEntry(`${base}${ecommerceVendorPublicPath(v.slug)}`, {
          lastmod: v.updatedAt,
          changefreq: "weekly",
          priority: "0.75",
        }),
      )
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Turizm ilanları (/turizm/:type/:slug) — */
router.get("/turizm.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const result = await db.execute(sql`
      SELECT slug, type, updated_at
      FROM tourism_listings
      WHERE status = 'active'
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 5000
    `);
    const urls = (result.rows as Array<{ slug: string; type: string; updated_at: Date | string | null }>)
      .map((row) => {
        const type = String(row.type ?? "hotel").trim() || "hotel";
        const slug = String(row.slug ?? "").trim();
        if (!slug) return "";
        return urlXmlEntry(`${base}${tourismListingPublicPath(type, slug)}`, {
          lastmod: row.updated_at,
          changefreq: "weekly",
          priority: "0.65",
        });
      })
      .filter(Boolean)
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    sendUrlset(res, "");
  }
});

/* — İşletme blog yazıları — */
router.get("/vendor-blogs.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const listRows = await db.execute(sql`
      SELECT DISTINCT v.slug, v.vendor_type, v.updated_at
      FROM vendors v
      INNER JOIN vendor_blog_settings s ON s.vendor_id = v.id AND s.enabled = true
      WHERE v.active = true
      ORDER BY v.updated_at DESC NULLS LAST
      LIMIT 2000
    `);
    const postRows = await db.execute(sql`
      SELECT v.slug, v.vendor_type, p.slug AS post_slug, p.published_at, p.updated_at
      FROM vendor_blog_posts p
      INNER JOIN vendors v ON v.id = p.vendor_id
      INNER JOIN vendor_blog_settings s ON s.vendor_id = v.id AND s.enabled = true
      WHERE p.published = true AND v.active = true
      ORDER BY p.published_at DESC NULLS LAST, p.id DESC
      LIMIT 5000
    `);
    const list = (listRows.rows ?? []) as Array<{
      slug: string;
      vendor_type: string | null;
      updated_at: string | Date | null;
    }>;
    const posts = (postRows.rows ?? []) as Array<{
      slug: string;
      vendor_type: string | null;
      post_slug: string;
      published_at: string | Date | null;
      updated_at: string | Date | null;
    }>;

    const blogPrefix = (vendorType: string | null, slug: string) =>
      String(vendorType ?? "").toLowerCase() === "ecommerce"
        ? `magaza/magaza/${encodeURIComponent(slug)}`
        : `siparis/satici/${encodeURIComponent(slug)}`;

    const listUrls = list
      .map((row) =>
        urlXmlEntry(`${base}/${blogPrefix(row.vendor_type, row.slug)}/blog`, {
          lastmod: row.updated_at,
          changefreq: "weekly",
          priority: "0.55",
        }),
      )
      .join("\n");
    const postUrls = posts
      .map((row) =>
        urlXmlEntry(
          `${base}/${blogPrefix(row.vendor_type, row.slug)}/blog/${encodeURIComponent(row.post_slug)}`,
          {
            lastmod: row.updated_at || row.published_at,
            changefreq: "weekly",
            priority: "0.6",
          },
        ),
      )
      .join("\n");
    sendUrlset(res, [listUrls, postUrls].filter(Boolean).join("\n"));
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Köşe yazarları (/yazar/:id) — */
router.get("/authors.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const rows = await db
      .selectDistinct({ id: authorsTable.id, name: authorsTable.name })
      .from(authorsTable)
      .innerJoin(newsTable, eq(newsTable.authorId, authorsTable.id))
      .where(
        and(
          eq(newsTable.status, "published"),
          isNull(newsTable.siteId),
          eq(newsTable.siteOnly, false),
          isNull(authorsTable.hmSiteId),
          isNotNull(newsTable.authorId),
        ),
      )
      .orderBy(desc(authorsTable.id))
      .limit(2000);

    const urls = rows
      .filter((a) => String(a.name ?? "").trim())
      .map((a) =>
        urlXmlEntry(`${base}/yazar/${a.id}`, {
          changefreq: "weekly",
          priority: "0.55",
        }),
      )
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Bilgi Ağacı — öne çıkan konular + 81 il — */
router.get("/bilgiagaci.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const slugSet = new Set<string>();

    slugSet.add(wikiSlugFromTitle("Türkiye"));

    for (const province of TR_PROVINCE_NAMES_81) {
      slugSet.add(wikiSlugFromTitle(province));
    }

    try {
      const rows = await getNewsDbForRead().execute(
        sql`SELECT wiki_featured FROM wiki_settings WHERE id = 1`,
      );
      const featured = (rows.rows[0] as { wiki_featured?: unknown } | undefined)?.wiki_featured;
      if (Array.isArray(featured)) {
        for (const item of featured) {
          const title =
            typeof item === "string"
              ? item
              : item && typeof item === "object" && "title" in item
                ? String((item as { title?: string }).title ?? "")
                : item && typeof item === "object" && "wikiTitle" in item
                  ? String((item as { wikiTitle?: string }).wikiTitle ?? "")
                  : "";
          if (title.trim()) slugSet.add(wikiSlugFromTitle(title.trim()));
        }
      }
    } catch {
      /* wiki_settings yoksa yalnızca iller */
    }

    const urls = [...slugSet]
      .map((slug) =>
        urlXmlEntry(`${base}/bilgiagaci/${slug}`, {
          changefreq: "monthly",
          priority: "0.6",
        }),
      )
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    sendUrlset(res, "");
  }
});

router.get("/ansiklopedi.xml", (_req, res): void => {
  res.redirect(301, "/api/sitemap/bilgiagaci.xml");
});

/* — Sarı Sayfalar / firma rehberi işletmeleri (/kesfet/sarisayfalar/...) — */
router.get("/sarisayfalar.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const result = await db.execute(sql`
      SELECT id, slug, updated_at
      FROM map_businesses
      WHERE is_active = true
        AND (
          homepage_super_category = 'firma_rehberi'
          OR store_type LIKE 'firma_rehberi%'
          OR import_source = 'insaatfirmalarim'
        )
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 5000
    `);
    const urls = (result.rows as Array<{ id: string | number; slug: string | null; updated_at: Date | string | null }>)
      .map((row) =>
        urlXmlEntry(`${base}${sarisayfalarPublicPath(row.slug, row.id)}`, {
          lastmod: row.updated_at,
          changefreq: "monthly",
          priority: "0.55",
        }),
      )
      .join("\n");
    sendUrlset(res, urls);
  } catch {
    sendUrlset(res, "");
  }
});

/* — Otomotiv işletmeleri ve ilanları — */
router.get("/otomotiv.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    const businessRows = await db.execute(sql`
      SELECT slug, business_type, updated_at
      FROM otomotiv_businesses
      WHERE status = 'active' AND COALESCE(slug, '') <> ''
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 3000
    `);
    const listingRows = await db.execute(sql`
      SELECT ol.slug, ob.business_type, ol.updated_at
      FROM otomotiv_listings ol
      INNER JOIN otomotiv_businesses ob ON ob.id = ol.business_id AND ob.status = 'active'
      WHERE ol.status = 'active' AND COALESCE(ol.slug, '') <> ''
      ORDER BY ol.updated_at DESC NULLS LAST, ol.id DESC
      LIMIT 5000
    `);
    const businesses = (businessRows.rows ?? []) as Array<{
      slug: string;
      business_type: string | null;
      updated_at: Date | string | null;
    }>;
    const listings = (listingRows.rows ?? []) as Array<{
      slug: string;
      business_type: string | null;
      updated_at: Date | string | null;
    }>;
    const businessUrls = businesses
      .map((row) =>
        urlXmlEntry(`${base}${otomotivBusinessPublicPath(row.business_type, row.slug)}`, {
          lastmod: row.updated_at,
          changefreq: "weekly",
          priority: "0.6",
        }),
      )
      .join("\n");
    const listingUrls = listings
      .map((row) =>
        urlXmlEntry(`${base}${otomotivListingPublicPath(row.business_type, row.slug)}`, {
          lastmod: row.updated_at,
          changefreq: "weekly",
          priority: "0.65",
        }),
      )
      .join("\n");
    sendUrlset(res, [businessUrls, listingUrls].filter(Boolean).join("\n"));
  } catch {
    sendUrlset(res, "");
  }
});


async function countPortalAuthorsForSitemap(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(DISTINCT ${authorsTable.id})::int` })
    .from(authorsTable)
    .innerJoin(newsTable, eq(newsTable.authorId, authorsTable.id))
    .where(
      and(
        eq(newsTable.status, "published"),
        isNull(newsTable.siteId),
        eq(newsTable.siteOnly, false),
        isNull(authorsTable.hmSiteId),
        isNotNull(newsTable.authorId),
      ),
    );
  return Number(row?.count ?? 0);
}

async function countOtomotivSitemapUrls(): Promise<number> {
  const r = await db.execute(sql`
    SELECT (
      (SELECT count(*)::int FROM otomotiv_businesses WHERE status = 'active' AND COALESCE(slug, '') <> '')
      +
      (SELECT count(*)::int FROM otomotiv_listings ol
        INNER JOIN otomotiv_businesses ob ON ob.id = ol.business_id AND ob.status = 'active'
        WHERE ol.status = 'active' AND COALESCE(ol.slug, '') <> '')
    ) AS count
  `);
  return Number((r.rows?.[0] as { count?: number } | undefined)?.count ?? 0);
}

async function countSarisayfalarSitemapUrls(): Promise<number> {
  const r = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM map_businesses
    WHERE is_active = true
      AND (
        homepage_super_category = 'firma_rehberi'
        OR store_type LIKE 'firma_rehberi%'
        OR import_source = 'insaatfirmalarim'
      )
  `);
  return Number((r.rows?.[0] as { count?: number } | undefined)?.count ?? 0);
}

async function hmSupplementarySitemapLocsFiltered(
  site: HmSiteSitemapRow,
  origin: string,
): Promise<string[]> {
  const enc = encodeURIComponent(site.slug);
  const locs: string[] = [];
  const [makaleRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmMakalelerTable)
    .where(and(eq(hmMakalelerTable.status, "published"), eq(hmMakalelerTable.siteId, site.id)));
  if (Number(makaleRow?.count ?? 0) > 0) locs.push(`${origin}/news-hm-${enc}-makale.xml`);

  const layout = await readHmPublicLayout(site.id);
  const authorsEnabled = !isHmCorporateLayout(layout) || resolveHmCorporateAuthorsEnabledFromLayout(layout);
  if (authorsEnabled) {
    const [authorRow] = await db
      .select({ count: sql<number>`count(DISTINCT ${hmMakalelerTable.authorId})::int` })
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, site.id),
          eq(hmMakalelerTable.status, "published"),
          isNotNull(hmMakalelerTable.authorId),
        ),
      );
    if (Number(authorRow?.count ?? 0) > 0) locs.push(`${origin}/news-hm-${enc}-yazarlar.xml`);
  }

  locs.push(`${origin}/news-hm-${enc}-sayfalar.xml`);
  return locs;
}

type SitemapListItem = { label: string; url: string };
type SitemapListGroup = { title: string; items: SitemapListItem[] };

type HmSiteSitemapRow = {
  id: number;
  slug: string;
  displayName: string | null;
  domain: string | null;
};

async function hmDomainSitemapLocs(site: HmSiteSitemapRow, origin: string): Promise<string[]> {
  const catSlugs = await resolveHmSitemapCategorySlugs(site);
  const locs = [
    `${origin}/news-hm-${encodeURIComponent(site.slug)}.xml`,
    ...(await hmSupplementarySitemapLocsFiltered(site, origin)),
  ];
  for (const catSlug of catSlugs) {
    locs.push(
      `${origin}/news-hm/${encodeURIComponent(site.slug)}/${encodeURIComponent(catSlug)}.xml`,
    );
  }
  return locs;
}

function isChildSitemapXmlLoc(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (!pathname.endsWith(".xml")) return false;
    if (/\/sitemap\.xml$/i.test(pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function filterSitemapIndexLocs(urls: string[], indexOrigin: string): string[] {
  const origin = indexOrigin.replace(/\/+$/, "");
  return Array.from(
    new Set(
      urls.filter((u) => {
        if (!u || !isChildSitemapXmlLoc(u)) return false;
        try {
          return new URL(u).origin.replace(/\/+$/, "") === origin;
        } catch {
          return false;
        }
      }),
    ),
  );
}

async function buildGscDomainHintGroups(hmSites: HmSiteSitemapRow[], base: string): Promise<SitemapListGroup[]> {
  const groups: SitemapListGroup[] = [];
  for (const site of hmSites) {
    const domain = String(site.domain ?? "").trim();
    if (!domain) continue;
    const domainOrigin = hmSiteOrigin(domain, base);
    const domainLocs = await hmDomainSitemapLocs(site, domainOrigin);
    const siteLabel = site.displayName?.trim() || site.slug;
    groups.push({
      title: `Google Search Console — ${siteLabel} (özel alan adı)`,
      items: [
        {
          label: `${siteLabel} — ana site haritası (GSC / Bing / Yandex'e ekleyin)`,
          url: `${domainOrigin}/sitemap.xml`,
        },
        ...domainLocs.map((url) => {
          const leaf = url.split("/").pop()?.replace(/\.xml$/i, "") ?? url;
          let label = `${siteLabel} — ${leaf}`;
          if (leaf.startsWith(`news-hm-${site.slug}-makale`)) label = `${siteLabel} — köşe / makale`;
          else if (leaf.startsWith(`news-hm-${site.slug}-yazarlar`)) label = `${siteLabel} — yazarlar`;
          else if (leaf.startsWith(`news-hm-${site.slug}-sayfalar`)) label = `${siteLabel} — kurumsal sayfalar`;
          else if (leaf.startsWith("news-hm-")) label = `${siteLabel} — tüm haberler`;
          return { label, url };
        }),
      ],
    });
  }
  return groups;
}

async function buildHmDomainSitemapCatalog(
  site: HmSiteSitemapRow,
  origin: string,
): Promise<{ indexUrl: string; groups: SitemapListGroup[] }> {
  const siteLabel = site.displayName?.trim() || site.slug;
  const locs = await hmDomainSitemapLocs(site, origin);
  const items: SitemapListItem[] = locs.map((url) => {
    const leaf = url.split("/").pop()?.replace(/\.xml$/i, "") ?? url;
    let label = `${siteLabel} — ${leaf.split("/").pop()}`;
    if (leaf === `news-hm-${site.slug}`) label = `${siteLabel} — tüm haberler`;
    else if (leaf === `news-hm-${site.slug}-makale`) label = `${siteLabel} — köşe / makale`;
    else if (leaf === `news-hm-${site.slug}-yazarlar`) label = `${siteLabel} — yazarlar`;
    else if (leaf === `news-hm-${site.slug}-sayfalar`) label = `${siteLabel} — kurumsal sayfalar`;
    return { label, url };
  });
  return {
    indexUrl: `${origin}/sitemap.xml`,
    groups: [{ title: `Site haritası — ${siteLabel}`, items }],
  };
}

async function buildSitemapCatalog(baseInput?: string): Promise<{ indexUrl: string; groups: SitemapListGroup[] }> {
  const base = (baseInput ?? sitePublicOrigin()).replace(/\/+$/, "");
  const cats = await loadPortalSitemapCategoryItems();
  const hmSites = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));

  const groups: SitemapListGroup[] = [
    {
      title: "Genel",
      items: [
        { label: "Ana sitemap dizini", url: `${base}/sitemap.xml` },
        { label: "Statik sayfalar", url: `${base}/sitemap-static.xml` },
      ],
    },
    {
      title: `${PORTAL_BRAND_SHORT} haberleri`,
      items: [
        { label: `Tüm ${PORTAL_BRAND_SHORT} haberleri`, url: `${base}/news-yekpare.xml` },
        ...cats.map((c) => ({
          label: c.name?.trim() || c.slug,
          url: `${base}/news-yekpare-cat-${encodeURIComponent(c.slug)}.xml`,
        })),
      ],
    },
  ];

  for (const site of hmSites) {
    if (
      String(site.domain ?? "").trim() ||
      String(site.domain2 ?? "").trim() ||
      String(site.domain3 ?? "").trim()
    ) {
      continue;
    }
    const siteLabel = site.displayName?.trim() || site.slug;
    const catSlugs = await resolveHmSitemapCategorySlugs(site);
    const supplementary = await hmSupplementarySitemapLocsFiltered(site, base);
    const items: SitemapListItem[] = [
      {
        label: `${siteLabel} — tüm haberler`,
        url: `${base}/news-hm-${encodeURIComponent(site.slug)}.xml`,
      },
      ...supplementary.map((url) => {
        const leaf = url.split("/").pop()?.replace(/\.xml$/i, "") ?? url;
        let label = `${siteLabel} — ${leaf}`;
        if (leaf === `news-hm-${site.slug}-makale`) label = `${siteLabel} — köşe / makale`;
        else if (leaf === `news-hm-${site.slug}-yazarlar`) label = `${siteLabel} — yazarlar`;
        else if (leaf === `news-hm-${site.slug}-sayfalar`) label = `${siteLabel} — kurumsal sayfalar`;
        return { label, url };
      }),
    ];
    for (const catSlug of catSlugs) {
      items.push({
        label: `${catSlug} (${siteLabel})`,
        url: `${base}/news-hm/${encodeURIComponent(site.slug)}/${encodeURIComponent(catSlug)}.xml`,
      });
    }
    groups.push({ title: `Haber merkezi — ${siteLabel}`, items });
  }

  const [authorCount, otomotivCount, sarisayfalarCount] = await Promise.all([
    countPortalAuthorsForSitemap(),
    countOtomotivSitemapUrls(),
    countSarisayfalarSitemapUrls(),
  ]);
  const otherItems: SitemapListItem[] = [
    { label: "Tüm haber kaynakları (birleşik)", url: `${base}/news.xml` },
    { label: "Keşfet işletmeleri", url: `${base}/businesses.xml` },
    { label: "Sipariş işletmeleri", url: `${base}/vendors-siparis.xml` },
    { label: "Mağaza vitrinleri (kanonik)", url: `${base}/vendors-magaza.xml` },
    { label: "Alışveriş mağazaları (eski yol)", url: `${base}/vendors-alisveris.xml` },
    { label: "Turizm ilanları", url: `${base}/turizm.xml` },
    { label: "Bilgi Ağacı konuları", url: `${base}/bilgiagaci.xml` },
    { label: "İşletme blogları", url: `${base}/vendor-blogs.xml` },
  ];
  if (sarisayfalarCount > 0) {
    otherItems.splice(2, 0, { label: "Sarı Sayfalar işletmeleri", url: `${base}/sarisayfalar.xml` });
  }
  if (otomotivCount > 0) {
    otherItems.splice(2, 0, { label: "Otomotiv işletmeleri ve ilanları", url: `${base}/otomotiv.xml` });
  }
  if (authorCount > 0) {
    otherItems.push({ label: "Köşe yazarları", url: `${base}/authors.xml` });
  }
  groups.push({ title: "Diğer içerik", items: otherItems });

  const productTotal = await countMarketplaceProductsForSitemap();
  if (productTotal > 0) {
    const productPages = Math.max(1, Math.ceil(productTotal / MARKETPLACE_SITEMAP_PAGE_SIZE));
    const productItems: SitemapListItem[] = [];
    for (let p = 1; p <= productPages; p++) {
      const pageCount = await countMarketplaceProductsOnSitemapPage(p);
      if (pageCount === 0) continue;
      productItems.push({
        label: p === 1 ? "Pazaryeri ürünleri" : `Pazaryeri ürünleri — sayfa ${p}`,
        url: `${base}/products-${p}.xml`,
      });
    }
    if (productItems.length > 0) {
      groups.push({ title: "Alışveriş — ürünler", items: productItems });
    }
  }

  return { indexUrl: `${base}/sitemap.xml`, groups };
}

async function yektubeVideoSitemapItems(base: string): Promise<SitemapListItem[]> {
  const total = await countYektubeVideosForSitemap();
  if (total === 0) return [];
  const pages = Math.max(1, Math.ceil(total / YEKTUBE_SITEMAP_PAGE_SIZE));
  const items: SitemapListItem[] = [{ label: "Yektube bölüm sayfaları", url: `${base}/yektube-static.xml` }];
  const maxPages = Math.min(pages, 100);
  for (let p = 1; p <= maxPages; p++) {
    const pageCount = await countYektubeVideosOnSitemapPage(p);
    if (pageCount === 0) continue;
    items.push({ label: `Yektube videoları — sayfa ${p}`, url: `${base}/yektube-videos-${p}.xml` });
  }
  return items;
}

async function buildSitemapCatalogWithYektube(baseInput?: string): Promise<{ indexUrl: string; groups: SitemapListGroup[] }> {
  const catalog = await buildSitemapCatalog(baseInput);
  const base = (baseInput ?? sitePublicOrigin()).replace(/\/+$/, "");
  const yektubeItems = await yektubeVideoSitemapItems(base);
  if (yektubeItems.length > 0) {
    catalog.groups.push({ title: "Yektube (video arama / GEO TR)", items: yektubeItems });
  }
  return catalog;
}

async function buildRssCatalog(): Promise<SitemapListGroup[]> {
  const base = sitePublicOrigin().replace(/\/+$/, "");
  const groups: SitemapListGroup[] = [
    {
      title: PORTAL_BRAND_SHORT,
      items: [{ label: `${PORTAL_BRAND_SHORT} haberleri (RSS)`, url: `${base}/api/rss/portal/haberler.xml` }],
    },
  ];

  const hmSites = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));

  const hmCatPairs = await db
    .selectDistinct({
      siteId: hmNewsSitesTable.id,
      hmSlug: hmNewsSitesTable.slug,
      catSlug: categoriesTable.slug,
      catName: categoriesTable.name,
    })
    .from(newsTable)
    .innerJoin(hmNewsSitesTable, eq(newsTable.siteId, hmNewsSitesTable.id))
    .innerJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(and(eq(newsTable.status, "published"), eq(hmNewsSitesTable.active, true)));

  for (const site of hmSites) {
    const layout = await readHmPublicLayout(site.id);
    if (!isHmLayoutModuleEnabled(layout, "hmNewsRssLinksEnabled")) continue;
    const hidden = await getHmHiddenCategorySlugs(site.id);
    const siteLabel = site.displayName?.trim() || site.slug;
    const domain = String(site.domain ?? "").trim();
    let feedBase = base;
    if (domain) {
      try {
        feedBase = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).origin;
      } catch {
        feedBase = base;
      }
    }
    const items: SitemapListItem[] = [];
    for (const pair of hmCatPairs) {
      if (pair.siteId !== site.id) continue;
      const catSlug = String(pair.catSlug ?? "").trim().toLowerCase();
      if (!catSlug || hidden.has(catSlug)) continue;
      items.push({
        label: pair.catName?.trim() || pair.catSlug,
        url: `${feedBase}/api/rss/${encodeURIComponent(site.slug)}/${encodeURIComponent(pair.catSlug)}.xml`,
      });
    }
    if (items.length > 0) {
      groups.push({ title: `Haber merkezi — ${siteLabel}`, items });
    }
  }

  return groups;
}

/* — Sitemap + RSS listesi (JSON, site haritaları sayfası) — */
router.get("/list.json", async (req, res): Promise<void> => {
  try {
    const requestHost = normalizeRequestHost(req);
    let catalog: { indexUrl: string; groups: SitemapListGroup[] };
    let rssGroups: SitemapListGroup[];

    if (requestHost && !isPortalHostForSitemap(requestHost)) {
      const site = await getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(requestHost));
      if (site) {
        const origin = hmSiteOrigin(site.domain, `https://${requestHost}`);
        catalog = await buildHmDomainSitemapCatalog(site, origin);
        const allRss = await buildRssCatalog();
        const siteLabel = site.displayName?.trim() || site.slug;
        rssGroups = allRss.filter((g) => g.title.includes(siteLabel));
      } else {
        const [baseCatalog, rss] = await Promise.all([buildSitemapCatalogWithYektube(), buildRssCatalog()]);
        catalog = baseCatalog;
        rssGroups = rss;
      }
    } else {
      const base = resolvePortalRequestOrigin(req);
      const [baseCatalog, rss, hmSites] = await Promise.all([
        buildSitemapCatalogWithYektube(base),
        buildRssCatalog(),
        db
          .select({
            id: hmNewsSitesTable.id,
            slug: hmNewsSitesTable.slug,
            displayName: hmNewsSitesTable.displayName,
            domain: hmNewsSitesTable.domain,
            domain2: hmNewsSitesTable.domain2,
            domain3: hmNewsSitesTable.domain3,
          })
          .from(hmNewsSitesTable)
          .where(eq(hmNewsSitesTable.active, true)),
      ]);
      const gscHints = await buildGscDomainHintGroups(hmSites, base);
      catalog = { ...baseCatalog, groups: [...baseCatalog.groups, ...gscHints] };
      rssGroups = rss;
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
    res.json({ ...catalog, rssGroups });
  } catch {
    res.status(500).json({ error: "Sitemap listesi alınamadı" });
  }
});

/* — Sitemap index — */
router.get("/index.xml", async (req, res): Promise<void> => {
  try {
    const requestHost = normalizeRequestHost(req);
    if (requestHost && !isPortalHostForSitemap(requestHost)) {
      const site = await getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(requestHost));
      if (site) {
        const origin = hmSiteOrigin(site.domain, `https://${requestHost}`);
        const locs = await hmDomainSitemapLocs(site, origin);
        sendSitemapIndex(res, locs);
        return;
      }
    }

    const base = resolvePortalRequestOrigin(req);
    const catalog = await buildSitemapCatalogWithYektube(base);
    const sitemapLocs = catalog.groups.flatMap((g) => g.items.map((i) => i.url));
    sendSitemapIndex(res, filterSitemapIndexLocs(sitemapLocs, base));
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

/* — Yektube video sitemap (Google / Yandex Video) — */
router.get("/yektube-static.xml", async (req, res): Promise<void> => {
  try {
    const base = resolvePortalRequestOrigin(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buildYektubeStaticSitemapXml(base));
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

router.get("/yektube-videos-:page.xml", async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.params.page ?? "1"), 10) || 1);
    const base = resolvePortalRequestOrigin(req);
    const xml = await buildYektubeVideoSitemapXml(base, page);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    res.send(xml);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

router.get("/products-:page.xml", async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.params.page ?? "1"), 10) || 1);
    const base = resolvePortalRequestOrigin(req);
    const xml = await buildMarketplaceProductSitemapXml(base, page);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
    res.send(xml);
  } catch {
    res.status(500).send("Sitemap hatası");
  }
});

export default router;
