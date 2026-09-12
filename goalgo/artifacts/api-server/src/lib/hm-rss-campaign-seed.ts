/**
 * SHA + Vatanhaber Ankara kampanyalarını DB’de idempotent oluşturur / günceller.
 * Admin: Editör paneli → RSS Kampanyaları (ASG / AHG / ilgili siteler).
 */
import { eq } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  rssCampaignsTable,
} from "@workspace/db";
import { normalizeHmSiteIds } from "./hm-rss-campaigns.js";
import {
  isShaCampaign,
  MIDNIGHT_TR_CAMPAIGN_TAG,
  SHA_CAMPAIGN_NAME,
  SHA_CAMPAIGN_TAG,
  shaFeedUrls,
} from "./hm-sha-rss-feeds.js";
import { listAnkaraDestinationSiteIds, VATANHABER_ANKARA_CAMPAIGN_NAME, isVatanhaberSiteRow } from "./hm-vatanhaber-ankara-sync.js";
import {
  VATANHABER_ANKARA_CAMPAIGN_TAG,
  VATANHABER_ANKARA_LISTING_URL,
  VATANHABER_SITE_SLUG,
} from "./rss-campaign-dedupe.js";
import { logger } from "./logger.js";

export type HmSharedRssSeedResult = {
  shaCampaignId: number | null;
  vatanhaberCampaignId: number | null;
  asgSiteId: number | null;
  ahgSiteId: number | null;
  ankaraTargets: number[];
};

function siteMatchesSlug(
  row: { slug?: string | null; domain?: string | null; domain2?: string | null; domain3?: string | null },
  slug: string,
): boolean {
  const s = String(row.slug ?? "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (s === slug) return true;
  const domains = [row.domain, row.domain2, row.domain3]
    .map((d) => String(d ?? "").trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
  if (slug === "asg") {
    return domains.some((d) => d.includes("ankarasehirgazetesi"));
  }
  if (slug === "ankarahabergundemi") {
    return domains.some((d) => d.includes("ankarahabergundemi"));
  }
  if (slug === VATANHABER_SITE_SLUG) {
    return domains.some((d) => d.includes("vatanhaber.net"));
  }
  return false;
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function sameFeedSet(a: unknown, b: string[]): boolean {
  const left = (Array.isArray(a) ? a : []).map((x) => String(x).trim()).filter(Boolean);
  if (left.length !== b.length) return false;
  return left.every((u, i) => u === b[i]);
}

async function upsertCampaign(opts: {
  match: (row: { name: string; tags: string[] | null; feeds: unknown }) => boolean;
  values: {
    name: string;
    active: boolean;
    postType: string;
    categorySlug: string;
    tags: string[];
    feeds: string[];
    sourceType: string;
    intervalMinutes: number;
    dailyLimit: number;
    downloadImages: boolean;
    headline: boolean;
    hmSiteIds: number[];
    includeYekpareHaber: boolean;
  };
}): Promise<number | null> {
  if (opts.values.hmSiteIds.length === 0) return null;
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable);
  const existing = rows.find((r) =>
    opts.match({ name: r.name, tags: r.tags as string[] | null, feeds: r.feeds }),
  );
  if (existing) {
    const needsUpdate =
      existing.name !== opts.values.name ||
      existing.active !== opts.values.active ||
      existing.categorySlug !== opts.values.categorySlug ||
      existing.sourceType !== opts.values.sourceType ||
      existing.intervalMinutes !== opts.values.intervalMinutes ||
      existing.dailyLimit !== opts.values.dailyLimit ||
      existing.downloadImages !== opts.values.downloadImages ||
      !sameFeedSet(existing.feeds, opts.values.feeds) ||
      !sameIdSet(normalizeHmSiteIds(existing.hmSiteIds), opts.values.hmSiteIds);
    if (needsUpdate) {
      await dualWriteUpdate(
        rssCampaignsTable,
        {
          name: opts.values.name,
          active: opts.values.active,
          categorySlug: opts.values.categorySlug,
          tags: opts.values.tags,
          feeds: opts.values.feeds,
          sourceType: opts.values.sourceType,
          intervalMinutes: opts.values.intervalMinutes,
          dailyLimit: opts.values.dailyLimit,
          downloadImages: opts.values.downloadImages,
          hmSiteIds: opts.values.hmSiteIds,
          includeYekpareHaber: false,
        },
        eq(rssCampaignsTable.id, existing.id),
      );
    }
    return existing.id;
  }

  const [inserted] = await dualWriteInsert(rssCampaignsTable, {
    ...opts.values,
    daysWindow: 0,
    breakingKeywords: [],
    minWords: 0,
    translateEnabled: false,
    haberlerFilterByTags: false,
    addedCount: 0,
  });
  return inserted?.id ?? null;
}

export async function ensureHmSharedRssCampaigns(): Promise<HmSharedRssSeedResult> {
  const sites = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable);

  const asg = sites.find((s) => s.active && siteMatchesSlug(s, "asg"));
  const ahg = sites.find((s) => s.active && siteMatchesSlug(s, "ankarahabergundemi"));
  const vatanhaber = sites.find((s) => s.active && (siteMatchesSlug(s, VATANHABER_SITE_SLUG) || isVatanhaberSiteRow(s)));
  const shaTargets = [asg?.id, ahg?.id].filter((id): id is number => Number.isFinite(id) && id! > 0);
  const ankaraTargets = vatanhaber
    ? (await listAnkaraDestinationSiteIds([vatanhaber.id])).map((s) => s.id)
    : [];

  const shaCampaignId = await upsertCampaign({
    match: (row) => isShaCampaign(row) || row.name === SHA_CAMPAIGN_NAME,
    values: {
      name: SHA_CAMPAIGN_NAME,
      active: true,
      postType: "news",
      categorySlug: "gundem",
      tags: [SHA_CAMPAIGN_TAG, MIDNIGHT_TR_CAMPAIGN_TAG],
      feeds: shaFeedUrls(),
      sourceType: "rss",
      intervalMinutes: 1440,
      dailyLimit: 80,
      downloadImages: true,
      headline: false,
      hmSiteIds: shaTargets,
      includeYekpareHaber: false,
    },
  });

  const vatanhaberCampaignId = await upsertCampaign({
    match: (row) => {
      const tags = Array.isArray(row.tags) ? row.tags.map((t) => String(t).toLowerCase()) : [];
      if (tags.includes(VATANHABER_ANKARA_CAMPAIGN_TAG)) return true;
      if (row.name === VATANHABER_ANKARA_CAMPAIGN_NAME) return true;
      const feeds = Array.isArray(row.feeds) ? row.feeds : [];
      return feeds.some((f) => String(f).toLowerCase().includes("vatanhaber.net/kategori/ankara"));
    },
    values: {
      name: VATANHABER_ANKARA_CAMPAIGN_NAME,
      active: true,
      postType: "news",
      categorySlug: "ankara",
      tags: [VATANHABER_ANKARA_CAMPAIGN_TAG, "require-image", MIDNIGHT_TR_CAMPAIGN_TAG],
      feeds: [VATANHABER_ANKARA_LISTING_URL],
      sourceType: "html",
      intervalMinutes: 1440,
      dailyLimit: 40,
      downloadImages: false,
      headline: false,
      hmSiteIds: ankaraTargets,
      includeYekpareHaber: false,
    },
  });

  logger.info(
    {
      shaCampaignId,
      vatanhaberCampaignId,
      asgSiteId: asg?.id ?? null,
      ahgSiteId: ahg?.id ?? null,
      ankaraTargets,
    },
    "[hm-rss-seed] SHA + Vatanhaber Ankara kampanyaları hazır",
  );

  return {
    shaCampaignId,
    vatanhaberCampaignId,
    asgSiteId: asg?.id ?? null,
    ahgSiteId: ahg?.id ?? null,
    ankaraTargets,
  };
}

export { shaTargetsAreDualSite } from "./hm-rss-campaigns.js";
