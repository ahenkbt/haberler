/**
 * turkatahaber.com & yerel.net.tr — yayınlanan kamu-yerel haberleri → ağdaki diğer HM siteleri.
 * Hedef: kurumsal olmayan, aynı kategori slug'ına sahip siteler (dedupe: rss kaynak / başlık).
 */
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { deriveCleanCategorySlug, isHmCorporateLayout, parseHmLayoutJson, resolveHmEditorCategoryId } from "./hm-editor-categories.js";
import { listKamuYerelMansetPoolCategorySlugs } from "./hm-cumha-kamu-yerel-catalog.js";
import {
  isKamuYerelHmSlug,
  KAMU_YEREL_CAMPAIGN_TAG,
  TURKATAHABER_SLUG,
  YERELNET_SLUG,
} from "./hm-kamu-yerel-sites.js";
import { buildRssImportNewsSlug } from "./rss-import-slug.js";
import { logger } from "./logger.js";
import {
  findDuplicateNews,
  newsHasCoverImage,
  shouldUpgradeMissingImage,
  type RssDedupeNewsRow,
} from "./rss-campaign-dedupe.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

export const KAMU_YEREL_SYNDICATION_TAG = "syndicated-kamu-yerel";

/** Günlük koşuda geriye dönük tarama penceresi (saat). */
export const KAMU_YEREL_SYNDICATE_LOOKBACK_HOURS = 36;

const SYNDICATABLE_CATEGORY_SLUGS = new Set(listKamuYerelMansetPoolCategorySlugs());

export type KamuYerelSyndicateResult = {
  sourceSiteIds: number[];
  destinations: number;
  copied: number;
  upgraded: number;
  skipped: number;
  message: string;
};

function layoutAcceptsKamuYerelSyndication(layout: Record<string, unknown>): boolean {
  if (layout.hmAcceptKamuYerelSyndication === false) return false;
  return true;
}

function newsEligibleForSyndication(row: {
  rssSourceUrl?: string | null;
  tags?: string[] | null;
  imageUrl?: string | null;
}): boolean {
  if (!newsHasCoverImage(row.imageUrl)) return false;
  const tags = Array.isArray(row.tags) ? row.tags.map((t) => String(t).toLowerCase()) : [];
  if (tags.includes(KAMU_YEREL_CAMPAIGN_TAG) || tags.includes(KAMU_YEREL_SYNDICATION_TAG)) return true;
  const src = String(row.rssSourceUrl ?? "").toLowerCase();
  return src.includes("cumha.com.tr");
}

function categorySlugForSyndication(rawSlug: string | null | undefined, siteSlug: string): string | null {
  const slug = deriveCleanCategorySlug(String(rawSlug ?? "").trim().toLowerCase(), siteSlug);
  if (!slug || !SYNDICATABLE_CATEGORY_SLUGS.has(slug)) return null;
  return slug;
}

export async function listKamuYerelSyndicationDestinationSiteIds(sourceSiteIds: number[]): Promise<
  Array<{ id: number; slug: string }>
> {
  const sourceSet = new Set(sourceSiteIds);
  const sites = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      layoutJson: hmNewsSitesTable.layoutJson,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable);
  const out: Array<{ id: number; slug: string }> = [];
  for (const site of sites) {
    if (!site.active || sourceSet.has(site.id) || isKamuYerelHmSlug(site.slug)) continue;
    const layout = parseHmLayoutJson(site.layoutJson);
    if (isHmCorporateLayout(layout)) continue;
    if (!layoutAcceptsKamuYerelSyndication(layout)) continue;
    out.push({ id: site.id, slug: site.slug });
  }
  return out;
}

export async function syndicateKamuYerelNewsToNetwork(opts?: {
  lookbackHours?: number;
}): Promise<KamuYerelSyndicateResult> {
  const lookbackHours = Math.max(1, Number(opts?.lookbackHours) || KAMU_YEREL_SYNDICATE_LOOKBACK_HOURS);
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const sites = await getNewsDbForRead().select().from(hmNewsSitesTable);
  const sources = sites.filter((s) => {
    const slug = String(s.slug ?? "").toLowerCase();
    return slug === TURKATAHABER_SLUG || slug === YERELNET_SLUG;
  });
  if (sources.length === 0) {
    return {
      sourceSiteIds: [],
      destinations: 0,
      copied: 0,
      upgraded: 0,
      skipped: 0,
      message: "turkatahaber / yerelnet kaynak sitesi yok",
    };
  }

  const sourceIds = sources.map((s) => s.id);
  const destinations = await listKamuYerelSyndicationDestinationSiteIds(sourceIds);
  if (destinations.length === 0) {
    return {
      sourceSiteIds: sourceIds,
      destinations: 0,
      copied: 0,
      upgraded: 0,
      skipped: 0,
      message: "hedef site yok",
    };
  }

  const catRows = await getNewsDbForRead()
    .select({
      id: categoriesTable.id,
      slug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable);
  const slugById = new Map<number, string>();
  for (const c of catRows) slugById.set(c.id, c.slug);

  const sourceNews = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(
      and(
        inArray(newsTable.siteId, sourceIds),
        eq(newsTable.status, "published"),
        gte(newsTable.updatedAt, since),
        isNotNull(newsTable.imageUrl),
      ),
    );

  const pool = sourceNews.filter(newsEligibleForSyndication);
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

    for (const item of pool) {
      const rawCatSlug = item.categoryId != null ? slugById.get(item.categoryId) : null;
      const syndicateSlug = categorySlugForSyndication(rawCatSlug, dest.slug);
      if (!syndicateSlug) {
        skipped += 1;
        continue;
      }
      const destCategoryId = await resolveHmEditorCategoryId(dest.id, syndicateSlug);
      if (destCategoryId == null) {
        skipped += 1;
        continue;
      }

      const sourceKey = item.rssSourceUrl ? normalizeRssSourceUrl(item.rssSourceUrl) : null;
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

      const slug = await buildRssImportNewsSlug({
        title: item.title,
        sourceUrl: sourceKey,
        siteId: dest.id,
      });
      const tags = Array.isArray(item.tags) ? [...item.tags] : [];
      if (!tags.includes(KAMU_YEREL_SYNDICATION_TAG)) tags.push(KAMU_YEREL_SYNDICATION_TAG);

      await dualWriteInsert(newsTable, {
        title: item.title,
        slug,
        spot: item.spot,
        content: item.content,
        imageUrl: item.imageUrl,
        categoryId: destCategoryId,
        status: "published",
        isFeatured: false,
        isBreaking: false,
        tags,
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

  const message = `${copied} kopyalandı, ${upgraded} görsel yükseltildi, ${skipped} atlandı (${destinations.length} hedef, ${pool.length} kaynak)`;
  logger.info(
    { sourceSiteIds: sourceIds, destinations: destinations.length, copied, upgraded, skipped, lookbackHours },
    "[kamu-yerel] ağ senkron",
  );
  return {
    sourceSiteIds: sourceIds,
    destinations: destinations.length,
    copied,
    upgraded,
    skipped,
    message,
  };
}
