/**
 * turkatahaber.com — Haberler.com Muhtar kategorisinden ~100 haber içe aktarımı.
 * Kaynak: https://www.haberler.com/muhtar/ (+ /s2/… sayfalama; robots uyumlu).
 * RSS (rss.haberler.com?kategori=muhtar) yalnızca ~8 öğe verdiği için HTML kazıma tercih edilir.
 */
import { eq } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  rssCampaignsTable,
} from "@workspace/db";
import {
  HABERLER_MUHTAR_CATEGORY_SLUG,
  HABERLER_MUHTAR_LISTING_BASE,
  listHaberlerMuhtarListingPages,
} from "./hm-cumha-kamu-yerel-catalog.js";
import { ensureKamuYerelSites } from "./hm-kamu-yerel-seed.js";
import { KAMU_YEREL_CAMPAIGN_TAG, TURKATAHABER_SLUG } from "./hm-kamu-yerel-sites.js";
import { normalizeHmSiteIds } from "./hm-rss-campaigns.js";
import { logger } from "./logger.js";
import { executeRssCampaignRun, type RssCampaignRunResult } from "./rssCampaignRun.js";

export const TURKATA_MUHTAR_CAMPAIGN_TAG = "turkata-muhtar-haberler";
export const TURKATA_MUHTAR_TARGET = 100;

export type TurkataMuhtarImportResult = {
  siteId: number | null;
  campaignId: number | null;
  seedCategories: number;
  run: RssCampaignRunResult | null;
  listingPages: string[];
  target: number;
};

function configureDualWriteForProd(): void {
  if (process.env.NEWS_DATABASE_URL?.trim() && !process.env.NEWS_DB_WRITE?.trim()) {
    process.env.NEWS_DB_WRITE = "dual";
  }
}

export function buildTurkataMuhtarCampaignFeeds(pageCount = 8): string[] {
  return listHaberlerMuhtarListingPages(pageCount);
}

export async function ensureTurkataMuhtarCampaign(siteId: number): Promise<number | null> {
  const tag = TURKATA_MUHTAR_CAMPAIGN_TAG;
  const name = "Türkata — Haberler.com Muhtar (100)";
  const feeds = buildTurkataMuhtarCampaignFeeds(8);
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable);
  const existing = rows.find((r: { name: string; tags: string[] | null }) => {
    const tags = Array.isArray(r.tags) ? r.tags.map((t: string) => String(t).toLowerCase()) : [];
    return tags.includes(tag) || r.name === name;
  });

  const values = {
    name,
    active: true,
    postType: "news",
    categorySlug: HABERLER_MUHTAR_CATEGORY_SLUG,
    // Kapak tercih edilir (downloadImages); require-image kaynakta ~20–30 ile sınırlı kalmasın.
    tags: [KAMU_YEREL_CAMPAIGN_TAG, tag, HABERLER_MUHTAR_CATEGORY_SLUG, TURKATAHABER_SLUG],
    feeds,
    sourceType: "haberler",
    intervalMinutes: 360,
    dailyLimit: 40,
    downloadImages: true,
    headline: false,
    hmSiteIds: [siteId],
    includeYekpareHaber: false,
  };

  if (existing) {
    const existingTargets = normalizeHmSiteIds(existing.hmSiteIds);
    const needs =
      existing.name !== values.name ||
      existing.active !== values.active ||
      existing.categorySlug !== values.categorySlug ||
      existing.sourceType !== values.sourceType ||
      !existingTargets.includes(siteId) ||
      existingTargets.some((id) => id !== siteId) ||
      JSON.stringify(existing.feeds) !== JSON.stringify(values.feeds) ||
      existing.downloadImages !== values.downloadImages ||
      existing.dailyLimit !== values.dailyLimit;
    if (needs) {
      await dualWriteUpdate(
        rssCampaignsTable,
        {
          name: values.name,
          active: values.active,
          categorySlug: values.categorySlug,
          tags: values.tags,
          feeds: values.feeds,
          sourceType: values.sourceType,
          intervalMinutes: values.intervalMinutes,
          dailyLimit: values.dailyLimit,
          downloadImages: values.downloadImages,
          hmSiteIds: values.hmSiteIds,
          includeYekpareHaber: false,
        },
        eq(rssCampaignsTable.id, existing.id),
      );
    }
    return existing.id;
  }

  const [inserted] = await dualWriteInsert(rssCampaignsTable, {
    ...values,
    daysWindow: 0,
    breakingKeywords: [],
    minWords: 0,
    translateEnabled: false,
    haberlerFilterByTags: false,
    addedCount: 0,
  });
  return inserted?.id ?? null;
}

async function resolveTurkataSiteId(): Promise<number | null> {
  const [row] = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, TURKATAHABER_SLUG))
    .limit(1);
  return row?.id ?? null;
}

/**
 * 1) kamu-yerel seed (muhtar kategori + layout allowlist)
 * 2) Haberler.com Muhtar scrape kampanyası
 * 3) kampanya çalıştır (kapak mirror + dual-write)
 */
export async function importTurkataMuhtarNews(opts?: {
  skipSeed?: boolean;
  skipRun?: boolean;
  pageCount?: number;
}): Promise<TurkataMuhtarImportResult> {
  configureDualWriteForProd();
  const listingPages = buildTurkataMuhtarCampaignFeeds(opts?.pageCount ?? 4);
  let seedCategories = 0;
  let siteId: number | null = null;

  if (!opts?.skipSeed) {
    const seed = await ensureKamuYerelSites();
    const turkata = seed.sites.find((s) => s.slug === TURKATAHABER_SLUG);
    siteId = turkata?.siteId ?? null;
    seedCategories = turkata?.categories ?? 0;
    if (turkata?.action === "error") {
      logger.warn({ detail: turkata.detail }, "[turkata-muhtar] seed failed");
    }
  }

  if (siteId == null) {
    siteId = await resolveTurkataSiteId();
  }

  if (siteId == null) {
    return {
      siteId: null,
      campaignId: null,
      seedCategories,
      run: null,
      listingPages,
      target: TURKATA_MUHTAR_TARGET,
    };
  }

  const campaignId = await ensureTurkataMuhtarCampaign(siteId);
  if (campaignId == null) {
    return {
      siteId,
      campaignId: null,
      seedCategories,
      run: null,
      listingPages,
      target: TURKATA_MUHTAR_TARGET,
    };
  }

  let run: RssCampaignRunResult | null = null;
  if (!opts?.skipRun) {
    run = await executeRssCampaignRun(campaignId, { forceHmSiteId: siteId });
    logger.info(
      { campaignId, siteId, ...run, listingBase: HABERLER_MUHTAR_LISTING_BASE },
      "[turkata-muhtar] campaign run",
    );
  }

  return {
    siteId,
    campaignId,
    seedCategories,
    run,
    listingPages,
    target: TURKATA_MUHTAR_TARGET,
  };
}
