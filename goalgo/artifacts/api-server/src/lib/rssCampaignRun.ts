import { and, eq, gte, inArray, isNull, isNotNull } from "drizzle-orm";
import {
  getNewsDbForRead,
  dualWriteInsert,
  dualWriteUpdate,
  rssCampaignsTable,
  rssLogsTable,
  newsTable,
  categoriesTable,
  hmNewsSitesTable,
} from "@workspace/db";
import { slugify } from "./news-context";
import { normalizeRssSourceUrl } from "./rssImportDedupe";
import { isHaberlerComUrl, scrapeHaberlerComCampaignItems } from "./haberlerComScraper.js";
import { fetchArticleContentHtml } from "./rssArticleContent.js";
import { fetchRssFeedXml } from "./rssFeedFetch.js";
import { haberlerEtiketSlugFromUrl } from "./rssFeedResolve.js";
import { scrapeListingPageItems } from "./rssHtmlScrape.js";
import { parseFeedItems } from "./rssFeedParse.js";
import { coerceNewsPublishedAt, extractHtmlArticlePublishedAt } from "./rssPublishedDate.js";
import { extractRssContentEncoded, extractRssCoverImage } from "./rssItemMedia.js";
import { mirrorRssImportImageUrl } from "./portal-rss-image-mirror.js";
import { logger } from "./logger";
import { ensureRssCampaignSchema } from "./ensure-rss-campaign-schema.js";

export type RssCampaignRunResult = {
  added: number;
  skipped: number;
  errors: number;
  message?: string;
};

const runningCampaignIds = new Set<number>();

export function isRssCampaignRunInFlight(campaignId: number): boolean {
  return runningCampaignIds.has(campaignId);
}

function siteTargetKey(siteId: number | null): string {
  return siteId == null ? "__central__" : String(siteId);
}

function sanitizeRssHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .trim();
}

function resolveCampaignNewsTags(
  campaignTags: string[] | null | undefined,
  feedUrl: string,
): string[] {
  const out = new Set<string>();
  for (const t of campaignTags ?? []) {
    const s = String(t).trim().toLowerCase();
    if (s) out.add(s);
  }
  const haberlerTag = haberlerEtiketSlugFromUrl(feedUrl);
  if (haberlerTag) out.add(haberlerTag);
  return Array.from(out);
}

function resolveCampaignRssContent(item: {
  description: string;
  contentEncoded: string;
  rssSpot: string;
}): string {
  if (item.contentEncoded && item.contentEncoded.length > 200) {
    return sanitizeRssHtml(item.contentEncoded);
  }
  const desc = item.description.trim();
  if (desc.length > 80) {
    return desc.includes("<") ? sanitizeRssHtml(desc) : `<p>${item.rssSpot}</p>`;
  }
  return `<p>${item.rssSpot}</p>`;
}

async function loadExistingSourceUrlsBySite(
  siteTargets: (number | null)[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (const siteId of siteTargets) {
    const cond =
      siteId == null ? isNull(newsTable.siteId) : eq(newsTable.siteId, siteId);
    const rows = await getNewsDbForRead()
      .select({ rssSourceUrl: newsTable.rssSourceUrl })
      .from(newsTable)
      .where(and(cond, isNotNull(newsTable.rssSourceUrl)));
    const set = new Set<string>();
    for (const r of rows) {
      if (r.rssSourceUrl) set.add(r.rssSourceUrl);
    }
    out.set(siteTargetKey(siteId), set);
  }
  return out;
}

async function loadRecentTitlesBySite(
  siteTargets: (number | null)[],
): Promise<Map<string, Set<string>>> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const out = new Map<string, Set<string>>();
  for (const siteId of siteTargets) {
    const cond =
      siteId == null
        ? and(isNull(newsTable.siteId), gte(newsTable.createdAt, since))
        : and(eq(newsTable.siteId, siteId), gte(newsTable.createdAt, since));
    const rows = await getNewsDbForRead().select({ title: newsTable.title }).from(newsTable).where(cond);
    out.set(siteTargetKey(siteId), new Set(rows.map((r) => r.title)));
  }
  return out;
}

function isAlreadyImported(
  siteId: number | null,
  sourceUrl: string | null,
  title: string,
  sourceBySite: Map<string, Set<string>>,
  titlesBySite: Map<string, Set<string>>,
): boolean {
  const key = siteTargetKey(siteId);
  if (sourceUrl) {
    return sourceBySite.get(key)?.has(sourceUrl) ?? false;
  }
  return titlesBySite.get(key)?.has(title) ?? false;
}

function markImported(
  siteId: number | null,
  sourceUrl: string | null,
  title: string,
  sourceBySite: Map<string, Set<string>>,
  titlesBySite: Map<string, Set<string>>,
): void {
  const key = siteTargetKey(siteId);
  if (sourceUrl) {
    if (!sourceBySite.has(key)) sourceBySite.set(key, new Set());
    sourceBySite.get(key)!.add(sourceUrl);
  } else {
    if (!titlesBySite.has(key)) titlesBySite.set(key, new Set());
    titlesBySite.get(key)!.add(title);
  }
}

/** Kampanya RSS çalıştırması — panel vekil zaman aşımını önlemek için route'tan arka planda çağrılır. */
export async function executeRssCampaignRun(campaignId: number): Promise<RssCampaignRunResult> {
  await ensureRssCampaignSchema();
  const [campaign] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, campaignId));
  if (!campaign) {
    return { added: 0, skipped: 0, errors: 1, message: "Kampanya bulunamadı" };
  }

  const [cat] = await getNewsDbForRead()
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, campaign.categorySlug));

  const feedUrls: string[] = campaign.feeds ?? [];
  const rawHm = Array.isArray(campaign.hmSiteIds) ? (campaign.hmSiteIds as number[]) : [];
  const parsedHm = rawHm.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  const existing =
    parsedHm.length === 0
      ? []
      : await getNewsDbForRead()
          .select({ id: hmNewsSitesTable.id })
          .from(hmNewsSitesTable)
          .where(inArray(hmNewsSitesTable.id, parsedHm));
  const ok = new Set(existing.map((r) => r.id));
  const filteredHm = parsedHm.filter((id) => ok.has(id));
  const includeCentral = campaign.includeYekpareHaber === true;
  const siteTargets: (number | null)[] = [];
  if (includeCentral) siteTargets.push(null);
  for (const sid of filteredHm) siteTargets.push(sid);

  if (siteTargets.length === 0) {
    await dualWriteInsert(rssLogsTable,{
      campaignId,
      level: "warn",
      action: "run",
      message:
        "RSS hedefi yok: en az bir HM sitesi seçin veya «Yekpare Haber» (merkez akış) kutusunu işaretleyin.",
    });
    return {
      added: 0,
      skipped: 0,
      errors: 0,
      message: "Kampanyada hedef site / merkez akış seçilmedi.",
    };
  }

  let added = 0;
  let skipped = 0;
  let errors = 0;

  if (feedUrls.length === 0) {
    await dualWriteInsert(rssLogsTable,{
      campaignId,
      level: "warn",
      action: "run",
      message: "Kampanyaya henüz RSS feed URL'i eklenmemiş.",
    });
    return { added: 0, skipped: 0, errors: 0, message: "Kampanyaya RSS feed URL'i eklenmemiş." };
  }

  const sourceBySite = await loadExistingSourceUrlsBySite(siteTargets);
  const titlesBySite = await loadRecentTitlesBySite(siteTargets);

  const itemLimit = Math.min(30, campaign.dailyLimit > 0 ? campaign.dailyLimit : 20);
  const sourceType = String(campaign.sourceType ?? "rss").toLowerCase();
  const useHaberlerScrape = sourceType === "haberler";
  const useHtmlScrape = sourceType === "html";

  type CampaignItem = {
    title: string;
    description: string;
    contentEncoded: string;
    link: string;
    imageUrl: string | null;
    publishedAt: Date;
  };

  for (const feedUrl of feedUrls) {
    let campaignItems: CampaignItem[] = [];
    const newsTags = resolveCampaignNewsTags(
      Array.isArray(campaign.tags) ? (campaign.tags as string[]) : [],
      feedUrl,
    );

    const topicFilterTags =
      campaign.haberlerFilterByTags === true
        ? resolveCampaignNewsTags(
            Array.isArray(campaign.tags) ? (campaign.tags as string[]) : [],
            feedUrl,
          )
        : [];

    if (useHaberlerScrape || isHaberlerComUrl(feedUrl)) {
      if (useHaberlerScrape && !isHaberlerComUrl(feedUrl)) {
        errors++;
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "error",
          action: "run",
          message: `Haberler.com kazıma modu: geçersiz adres (${feedUrl}) — yalnızca haberler.com sayfaları`,
        });
        continue;
      }
      try {
        const scraped = await scrapeHaberlerComCampaignItems(feedUrl, {
          limit: itemLimit,
          timeoutMs: 18_000,
          topicFilterTags: topicFilterTags.length ? topicFilterTags : undefined,
        });
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "info",
          action: "run",
          message: `Haberler.com kazıma: ${feedUrl.trim()} → ${scraped.length} haber (RSS kullanılmadı)`,
        });
        campaignItems = scraped.map((row) => ({
          title: row.title,
          description: row.spot,
          contentEncoded: row.contentHtml,
          link: row.link,
          imageUrl: row.imageUrl ?? null,
          publishedAt: row.publishedAt,
        }));
      } catch (e: unknown) {
        errors++;
        const msg = e instanceof Error ? e.message : String(e);
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "error",
          action: "run",
          message: `Haberler.com kazıma başarısız (${feedUrl}): ${msg}`,
        });
        continue;
      }
    } else if (useHtmlScrape) {
      try {
        const scraped = await scrapeListingPageItems(feedUrl, { limit: itemLimit, timeoutMs: 15_000 });
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "info",
          action: "run",
          message: `HTML kazıma: ${feedUrl.trim()} → ${scraped.length} haber linki bulundu`,
        });
        campaignItems = await Promise.all(
          scraped.map(async (row) => {
            const fullHtml = await fetchArticleContentHtml(row.link);
            return {
              title: row.title,
              description: row.description,
              contentEncoded: fullHtml,
              link: row.link,
              imageUrl: row.imageUrl ?? null,
              publishedAt: coerceNewsPublishedAt(extractHtmlArticlePublishedAt(fullHtml)),
            };
          }),
        );
      } catch (e: unknown) {
        errors++;
        const msg = e instanceof Error ? e.message : String(e);
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "error",
          action: "run",
          message: `HTML kazıma başarısız (${feedUrl}): ${msg}`,
        });
        continue;
      }
    } else {
      let xmlText: string;
      try {
        const fetched = await fetchRssFeedXml(feedUrl, { timeoutMs: 12_000 });
        xmlText = fetched.xml;
        if (fetched.usedUrl !== feedUrl.trim()) {
          await dualWriteInsert(rssLogsTable,{
            campaignId,
            level: "info",
            action: "run",
            message: `Besleme adresi çözümlendi: ${feedUrl.trim()} → ${fetched.usedUrl}`,
          });
        }
      } catch (e: unknown) {
        errors++;
        const msg = e instanceof Error ? e.message : String(e);
        await dualWriteInsert(rssLogsTable,{
          campaignId,
          level: "error",
          action: "run",
          message: `Feed alınamadı (${feedUrl}): ${msg}`,
        });
        continue;
      }

      campaignItems = parseFeedItems(xmlText, itemLimit)
        .map((item) => ({
          title: item.title,
          description: item.descHtml || item.desc,
          contentEncoded: extractRssContentEncoded(item.rawInner),
          link: item.link,
          imageUrl:
            extractRssCoverImage(item.rawInner, item.descHtml || item.desc, item.link) ?? null,
          publishedAt: coerceNewsPublishedAt(item.publishedAt),
        }))
        .filter((i) => i.title.length > 3);
    }

    for (const item of campaignItems) {
      try {
        const cleanTitle = item.title.replace(/<[^>]*>/g, "").trim().slice(0, 200);
        if (!cleanTitle) {
          skipped++;
          continue;
        }

        const rssSpot =
          item.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().slice(0, 500) ||
          (isHaberlerComUrl(feedUrl) ? "Haberler.com'dan kazınmıştır." : "RSS'ten aktarılmıştır.");
        const sourceKey = normalizeRssSourceUrl(item.link);
        const targetsToAdd: (number | null)[] = [];

        for (const siteId of siteTargets) {
          if (isAlreadyImported(siteId, sourceKey, cleanTitle, sourceBySite, titlesBySite)) {
            skipped++;
            continue;
          }
          targetsToAdd.push(siteId);
        }
        if (targetsToAdd.length === 0) continue;

        const contentHtml = resolveCampaignRssContent({ ...item, rssSpot });
        const publishedAt = item.publishedAt;
        const imageUrl = await mirrorRssImportImageUrl(item.imageUrl, cleanTitle);

        for (const siteId of targetsToAdd) {
          const slugSuffix = `${Date.now()}-${added}-${siteId ?? "m"}-${Math.random().toString(36).slice(2, 7)}`;
          await dualWriteInsert(newsTable, {
            title: cleanTitle,
            slug: `${slugify(cleanTitle)}-${slugSuffix}`,
            spot: rssSpot,
            content: contentHtml,
            imageUrl: imageUrl ?? null,
            categoryId: cat?.id ?? null,
            status: "published",
            isFeatured: campaign.headline,
            isBreaking: campaign.headline,
            tags: newsTags.length ? newsTags : campaign.tags,
            siteId: siteId ?? null,
            rssSourceUrl: sourceKey,
            isEditorManual: false,
            createdAt: publishedAt,
            updatedAt: publishedAt,
          });
          markImported(siteId, sourceKey, cleanTitle, sourceBySite, titlesBySite);
          added++;
        }
      } catch {
        skipped++;
      }
    }
  }

  await dualWriteUpdate(
    rssCampaignsTable,
    { addedCount: campaign.addedCount + added, lastRunAt: new Date() },
    eq(rssCampaignsTable.id, campaignId),
  );

  const message =
    added > 0
      ? `${added} haber başarıyla eklendi (tam içerik ile)`
      : skipped > 0
        ? `${skipped} haber zaten vardı, yeni haber eklenmedi`
        : errors > 0
          ? `Haber eklenemedi — ${errors} feed hatası. İşlem loglarına bakın.`
          : "Feed'de eklenecek yeni haber bulunamadı";

  await dualWriteInsert(rssLogsTable,{
    campaignId,
    level: added > 0 ? "success" : errors > 0 ? "error" : "warn",
    action: "run",
    message: `${added} haber eklendi (tam içerik), ${skipped} atlandı`,
  });

  return { added, skipped, errors, message };
}

/** Vekil 504 önlemek için HTTP yanıtından önce döner; iş `executeRssCampaignRun` ile arka planda sürer. */
export function scheduleRssCampaignRun(campaignId: number): {
  accepted: boolean;
  alreadyRunning: boolean;
} {
  if (runningCampaignIds.has(campaignId)) {
    return { accepted: true, alreadyRunning: true };
  }
  runningCampaignIds.add(campaignId);
  void executeRssCampaignRun(campaignId)
    .then((result) => {
      logger.info({ campaignId, ...result }, "RSS kampanya çalışması bitti");
    })
    .catch((err) => {
      logger.error({ err, campaignId }, "RSS kampanya arka plan çalışması hatası");
      void dualWriteInsert(rssLogsTable,{
        campaignId,
        level: "error",
        action: "run",
        message: `Arka plan hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    })
    .finally(() => {
      runningCampaignIds.delete(campaignId);
    });
  return { accepted: true, alreadyRunning: false };
}
