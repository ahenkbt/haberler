/**
 * HM editör RSS kampanyasının yazdığı haberleri siler.
 * Ankara Haber Gündemi + sehirhaberajansi.com.tr tek seferlik temizlik.
 */
import { and, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import {
  dualWriteDelete,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
  rssCampaignsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import {
  collectFeedHosts,
  rssCampaignOwnedByHmSite,
} from "./hm-rss-campaigns.js";

const AHG_SLUG = "ankarahabergundemi";
const AHG_HOST = "ankarahabergundemi.com";
const SHA_HOST = "sehirhaberajansi.com.tr";
const PURGE_REV = "ahg-sha-rss-news-20260817a";

function siteMatchesAhg(row: {
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): boolean {
  const slug = String(row.slug ?? "").trim().toLowerCase();
  if (slug === AHG_SLUG) return true;
  const domains = [row.domain, row.domain2, row.domain3]
    .map((d) => String(d ?? "").trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
  return domains.some((d) => d === AHG_HOST || d.endsWith(`.${AHG_HOST}`));
}

function rssUrlMatchSql(hosts: string[]): SQL | undefined {
  const unique = Array.from(new Set(hosts.map((h) => h.toLowerCase().replace(/^www\./, "")).filter(Boolean)));
  if (!unique.length) return undefined;
  const parts = unique.map((h) => ilike(newsTable.rssSourceUrl, `%${h}%`));
  if (parts.length === 1) return parts[0];
  return or(...parts);
}

export async function deleteImportedRssNewsForHmSite(opts: {
  siteId: number;
  extraHosts?: string[];
  campaignFeeds?: unknown;
}): Promise<{ deleted: boolean; hosts: string[] }> {
  const hosts = collectFeedHosts(opts.campaignFeeds);
  for (const h of opts.extraHosts ?? []) {
    const n = String(h ?? "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");
    if (n && !hosts.includes(n)) hosts.push(n);
  }
  const urlMatch = rssUrlMatchSql(hosts);
  if (!urlMatch) return { deleted: false, hosts };

  await dualWriteDelete(
    newsTable,
    and(
      eq(newsTable.siteId, opts.siteId),
      eq(newsTable.isEditorManual, false),
      isNotNull(newsTable.rssSourceUrl),
      urlMatch,
    ),
  );
  return { deleted: true, hosts };
}

export async function deleteNewsImportedByRssCampaign(opts: {
  siteId: number;
  campaign: { id: number; feeds?: unknown; addedCount?: number | null };
}): Promise<{ ok: true; hosts: string[] }> {
  const extraHosts = [SHA_HOST];
  const { hosts } = await deleteImportedRssNewsForHmSite({
    siteId: opts.siteId,
    extraHosts,
    campaignFeeds: opts.campaign.feeds,
  });
  await dualWriteUpdate(
    rssCampaignsTable,
    { addedCount: 0 },
    eq(rssCampaignsTable.id, opts.campaign.id),
  );
  return { ok: true, hosts };
}

let ahgPurgePromise: Promise<{ ok: boolean; deletedSites: number; reason?: string }> | null = null;

async function purgeAhgRssCampaignNewsNow(): Promise<{
  ok: boolean;
  deletedSites: number;
  reason?: string;
}> {
  const sites = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      layoutJson: hmNewsSitesTable.layoutJson,
    })
    .from(hmNewsSitesTable);
  const ahgSites = sites.filter(siteMatchesAhg);
  if (!ahgSites.length) return { ok: false, deletedSites: 0, reason: "ahg-site-missing" };

  const campaigns = await getNewsDbForRead().select().from(rssCampaignsTable);
  let deletedSites = 0;

  for (const site of ahgSites) {
    let layout: Record<string, unknown> = {};
    try {
      layout = site.layoutJson ? (JSON.parse(String(site.layoutJson)) as Record<string, unknown>) : {};
    } catch {
      layout = {};
    }
    if (String(layout.ahgRssCampaignNewsPurgeRev || "") === PURGE_REV) continue;

    const siteCampaigns = campaigns.filter((c) => rssCampaignOwnedByHmSite(c, site.id));
    const feedHosts = new Set<string>([SHA_HOST]);
    for (const c of siteCampaigns) {
      for (const h of collectFeedHosts(c.feeds)) feedHosts.add(h);
    }

    await deleteImportedRssNewsForHmSite({
      siteId: site.id,
      extraHosts: Array.from(feedHosts),
      campaignFeeds: [],
    });

    for (const c of siteCampaigns) {
      await dualWriteUpdate(rssCampaignsTable, { addedCount: 0 }, eq(rssCampaignsTable.id, c.id));
    }

    const next = { ...layout, ahgRssCampaignNewsPurgeRev: PURGE_REV };
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: JSON.stringify(next) },
      eq(hmNewsSitesTable.id, site.id),
    );
    deletedSites += 1;
  }

  logger.info({ deletedSites, rev: PURGE_REV }, "[hm-rss] AHG RSS kampanya haberleri temizlendi");
  return { ok: true, deletedSites };
}

/** Süreç başına bir kez — editör RSS listesi / Container açılışı. */
export function purgeAhgRssCampaignNewsOnce(): Promise<{
  ok: boolean;
  deletedSites: number;
  reason?: string;
}> {
  if (!ahgPurgePromise) {
    ahgPurgePromise = purgeAhgRssCampaignNewsNow().catch((err) => {
      ahgPurgePromise = null;
      logger.warn({ err }, "[hm-rss] AHG RSS haber temizliği başarısız");
      return { ok: false, deletedSites: 0, reason: String((err as Error)?.message || err).slice(0, 200) };
    });
  }
  return ahgPurgePromise;
}

/** Test / tanı: layout rev henüz yazılmamış sitelerde silme koşulu. */
export const AHG_RSS_NEWS_PURGE_REV = PURGE_REV;
export const AHG_SHA_RSS_HOST = SHA_HOST;

export function sqlSiteOwnsCampaign(siteId: number) {
  return sql`${siteId} = ANY(${rssCampaignsTable.hmSiteIds})`;
}
