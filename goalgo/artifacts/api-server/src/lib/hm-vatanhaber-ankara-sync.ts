/**
 * Vatanhaber Ankara (yalnızca resimli haberler) → diğer HM haber sitelerinin Ankara kategorisi.
 *
 * Kaynak: vatanhaber.net /kategori/ankara — DB’deki vatanhaber siteId satırları
 * (rss_source_url / kanonik link / başlık benzerliği ile dedupe).
 * Hedef: kurumsal olmayan, `ankara` kategorisi (veya ankara kutu RSS’i) olan siteler;
 * vatanhaber kendisi hariç.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
  type HmNewsSiteRow,
} from "@workspace/db";
import {
  deriveCleanCategorySlug,
  isHmCorporateLayout,
  parseHmLayoutJson,
  resolveHmEditorCategoryId,
} from "./hm-editor-categories.js";
import { slugify } from "./news-context.js";
import { logger } from "./logger.js";
import {
  findDuplicateNews,
  newsHasCoverImage,
  shouldUpgradeMissingImage,
  VATANHABER_ANKARA_LISTING_URL,
  VATANHABER_SITE_SLUG,
  type RssDedupeNewsRow,
} from "./rss-campaign-dedupe.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

export const VATANHABER_ANKARA_CAMPAIGN_NAME = "Vatanhaber Ankara (resimli) → diğer siteler";

export function isVatanhaberSiteRow(row: {
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): boolean {
  const slug = String(row.slug ?? "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (slug === VATANHABER_SITE_SLUG) return true;
  const domains = [row.domain, row.domain2, row.domain3]
    .map((d) => String(d ?? "").trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
  return domains.some((d) => d === "vatanhaber.net" || d.endsWith(".vatanhaber.net"));
}

function layoutHasAnkaraSignal(layout: Record<string, unknown>): boolean {
  const activated = Array.isArray(layout.hmActivatedCategorySlugs)
    ? layout.hmActivatedCategorySlugs.map((s) => String(s).toLowerCase())
    : [];
  if (activated.some((s) => s === "ankara" || s.endsWith("-ankara"))) return true;
  const rows = [
    ...(Array.isArray(layout.hmNewsSiteRssFeedRows) ? layout.hmNewsSiteRssFeedRows : []),
    ...(Array.isArray(layout.hmNewsBreakingRssFeedRows) ? layout.hmNewsBreakingRssFeedRows : []),
  ];
  return rows.some((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const r = raw as { categoryKey?: unknown; id?: unknown };
    const key = String(r.categoryKey ?? r.id ?? "").trim().toLowerCase();
    return key === "ankara";
  });
}

export function categorySlugIsAnkara(rawSlug: string, siteSlug: string): boolean {
  const slug = String(rawSlug ?? "").trim().toLowerCase();
  const clean = deriveCleanCategorySlug(slug, siteSlug);
  return clean === "ankara" || slug === "ankara" || slug.endsWith("-ankara");
}

export function siteLooksLikeAnkaraDestination(opts: {
  slug: string;
  layout: Record<string, unknown>;
  categorySlugs: string[];
}): boolean {
  if (isHmCorporateLayout(opts.layout)) return false;
  if (opts.categorySlugs.some((s) => categorySlugIsAnkara(s, opts.slug))) return true;
  if (layoutHasAnkaraSignal(opts.layout)) return true;
  return false;
}

export type VatanhaberAnkaraSyncResult = {
  sourceSiteId: number | null;
  destinations: number;
  copied: number;
  upgraded: number;
  skipped: number;
  message: string;
};

function canonicalVatanhaberUrl(
  _site: Pick<HmNewsSiteRow, "domain" | "slug">,
  news: {
    rssSourceUrl?: string | null;
    slug?: string | null;
  },
): string | null {
  const fromRss = news.rssSourceUrl ? normalizeRssSourceUrl(news.rssSourceUrl) : null;
  if (fromRss) return fromRss;
  const slug = String(news.slug ?? "").trim();
  if (!slug) return VATANHABER_ANKARA_LISTING_URL;
  return normalizeRssSourceUrl(`https://vatanhaber.net/haber/${encodeURIComponent(slug)}`);
}

async function loadAnkaraCategoryIds(siteId: number | null): Promise<number[]> {
  const rows = await getNewsDbForRead()
    .select({
      id: categoriesTable.id,
      slug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable);
  const ids: number[] = [];
  for (const row of rows) {
    const exclusiveOk = row.exclusiveSiteId == null || row.exclusiveSiteId === siteId;
    if (!exclusiveOk) continue;
    if (categorySlugIsAnkara(row.slug, "") || categorySlugIsAnkara(row.slug, "vatanhaber")) {
      ids.push(row.id);
    }
  }
  return ids;
}

export async function listAnkaraDestinationSiteIds(excludeSiteIds: number[]): Promise<
  Array<{ id: number; slug: string }>
> {
  const sites = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      layoutJson: hmNewsSitesTable.layoutJson,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable);
  const cats = await getNewsDbForRead()
    .select({
      slug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable);
  const exclude = new Set(excludeSiteIds);
  const out: Array<{ id: number; slug: string }> = [];
  for (const site of sites) {
    if (!site.active || exclude.has(site.id) || isVatanhaberSiteRow(site)) continue;
    const layout = parseHmLayoutJson(site.layoutJson);
    if (isHmCorporateLayout(layout)) continue;
    const categorySlugs = cats
      .filter((c) => c.exclusiveSiteId == null || c.exclusiveSiteId === site.id)
      .map((c) => c.slug);
    if (!siteLooksLikeAnkaraDestination({ slug: site.slug, layout, categorySlugs })) continue;
    out.push({ id: site.id, slug: site.slug });
  }
  return out;
}

export async function copyVatanhaberAnkaraNewsToHmSites(): Promise<VatanhaberAnkaraSyncResult> {
  const sites = await getNewsDbForRead().select().from(hmNewsSitesTable);
  const source = sites.find((s) => isVatanhaberSiteRow(s));
  if (!source) {
    return {
      sourceSiteId: null,
      destinations: 0,
      copied: 0,
      upgraded: 0,
      skipped: 0,
      message: "vatanhaber sitesi bulunamadı",
    };
  }

  const ankaraIds = await loadAnkaraCategoryIds(source.id);
  if (ankaraIds.length === 0) {
    return {
      sourceSiteId: source.id,
      destinations: 0,
      copied: 0,
      upgraded: 0,
      skipped: 0,
      message: "vatanhaber Ankara kategorisi yok",
    };
  }

  const destinations = await listAnkaraDestinationSiteIds([source.id]);
  if (destinations.length === 0) {
    return {
      sourceSiteId: source.id,
      destinations: 0,
      copied: 0,
      upgraded: 0,
      skipped: 0,
      message: "Ankara kategorili hedef site yok",
    };
  }

  const sourceNews = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(
      and(
        eq(newsTable.siteId, source.id),
        eq(newsTable.status, "published"),
        inArray(newsTable.categoryId, ankaraIds),
        isNotNull(newsTable.imageUrl),
      ),
    );

  const imaged = sourceNews.filter((n) => newsHasCoverImage(n.imageUrl));
  let copied = 0;
  let upgraded = 0;
  let skipped = 0;

  for (const dest of destinations) {
    const destRows = await getNewsDbForRead()
      .select({
        id: newsTable.id,
        rssSourceUrl: newsTable.rssSourceUrl,
        title: newsTable.title,
        imageUrl: newsTable.imageUrl,
      })
      .from(newsTable)
      .where(eq(newsTable.siteId, dest.id));
    const bag: RssDedupeNewsRow[] = destRows.map((r) => ({
      id: r.id,
      rssSourceUrl: r.rssSourceUrl,
      title: r.title,
      imageUrl: r.imageUrl,
    }));
    const destCategoryId = await resolveHmEditorCategoryId(dest.id, "ankara");

    for (const item of imaged) {
      const sourceKey = canonicalVatanhaberUrl(source, item);
      const dup = findDuplicateNews(bag, sourceKey, item.title);
      if (dup) {
        if (shouldUpgradeMissingImage(dup.imageUrl, item.imageUrl)) {
          await dualWriteUpdate(
            newsTable,
            {
              imageUrl: item.imageUrl,
              spot: item.spot ?? undefined,
              content: item.content || undefined,
              rssSourceUrl: sourceKey ?? dup.rssSourceUrl ?? undefined,
              updatedAt: new Date(),
            },
            eq(newsTable.id, dup.id),
          );
          dup.imageUrl = item.imageUrl;
          upgraded += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      const slugSuffix = `${Date.now()}-${copied}-${dest.id}-${Math.random().toString(36).slice(2, 7)}`;
      await dualWriteInsert(newsTable, {
        title: item.title,
        slug: `${slugify(item.title)}-${slugSuffix}`,
        spot: item.spot,
        content: item.content,
        imageUrl: item.imageUrl,
        categoryId: destCategoryId ?? item.categoryId,
        status: "published",
        isFeatured: false,
        isBreaking: false,
        tags: Array.isArray(item.tags) ? item.tags : [],
        siteId: dest.id,
        rssSourceUrl: sourceKey,
        isEditorManual: false,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      });
      bag.push({
        id: -copied,
        rssSourceUrl: sourceKey,
        title: item.title,
        imageUrl: item.imageUrl,
      });
      copied += 1;
    }
  }

  const message = `${copied} kopyalandı, ${upgraded} görsel yükseltildi, ${skipped} atlandı (${destinations.length} hedef)`;
  logger.info(
    { sourceSiteId: source.id, destinations: destinations.length, copied, upgraded, skipped },
    "[vatanhaber-ankara] senkron",
  );
  return {
    sourceSiteId: source.id,
    destinations: destinations.length,
    copied,
    upgraded,
    skipped,
    message,
  };
}
