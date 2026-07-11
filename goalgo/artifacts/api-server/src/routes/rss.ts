import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  getNewsDbForRead,
  dualWriteInsert,
  dualWriteUpdate,
  dualWriteDelete,
  rssCampaignsTable,
  rssLogsTable,
  newsTable,
  categoriesTable,
} from "@workspace/db";
import {
  CreateRssCampaignBody,
  UpdateRssCampaignBody,
} from "@workspace/api-zod";
import {
  serializeRssCampaign,
  serializeRssLog,
} from "../lib/serializers";
import { slugify } from "../lib/news-context";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { fetchRssFeedXml } from "../lib/rssFeedFetch.js";
import { parseFeedItems } from "../lib/rssFeedParse.js";
import { repairCorruptedRssImportTitlesBatch } from "../lib/rssTitleRepair.js";
import { scheduleRssCampaignRun } from "../lib/rssCampaignRun.js";
import { extractRssContentEncoded, extractRssCoverImage } from "../lib/rssItemMedia.js";
import { fetchArticleContentHtml } from "../lib/rssArticleContent.js";
import { coerceNewsPublishedAt } from "../lib/rssPublishedDate.js";
import { repairRssImportDatesBatch } from "../lib/rssImportDateRepair.js";
import { repairHaberlerScrapedContentBatch } from "../lib/haberlerContentRepair.js";
import { sitePublicOrigin } from "../lib/site-public-origin";
import { PORTAL_BRAND_SHORT } from "../lib/portalBrand";
import { getActiveHmNewsSiteByDomainCompat, getActiveHmNewsSiteBySlugCompat } from "../lib/hm-site-compat";
import {
  getHmHiddenCategorySlugs,
  isHmLayoutModuleEnabled,
  readHmPublicLayout,
} from "../lib/hm-public-layout";
import { ensureRssCampaignSchema } from "../lib/ensure-rss-campaign-schema.js";
import {
  hmCategoryRssItemPublicLink,
  loadHmCategoryRssFeedItems,
} from "../lib/hm-category-rss-items.js";

const router: IRouter = Router();

function xmlEscape(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlCdata(raw: unknown): string {
  const safe = String(raw ?? "").replace(
    // XML 1.0 allows tab, newline, carriage return and chars from U+0020 upward.
    /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g,
    "",
  );
  return `<![CDATA[${safe.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function normalizeHmRssDomain(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").trim().toLowerCase();
  if (!d) return null;
  return d.replace(/^https?:\/\//, "").split("/")[0] ?? null;
}

function hmRssDomainLookupCandidates(raw: string | null | undefined): string[] {
  const host = normalizeHmRssDomain(raw)?.replace(/:\d+$/, "").replace(/\.$/, "").trim();
  if (!host) return [];
  const rootHost = host.replace(/^www\./, "");
  const hosts = Array.from(new Set([host, rootHost, `www.${rootHost}`].filter(Boolean)));
  const out = new Set<string>();
  for (const h of hosts) {
    out.add(h);
    out.add(`https://${h}`);
    out.add(`https://${h}/`);
    out.add(`http://${h}`);
    out.add(`http://${h}/`);
  }
  return Array.from(out);
}

function hmRssRequestHost(req: Request): string | null {
  const forwardedHost = String(req.get("x-forwarded-host") ?? "").split(",")[0]?.trim();
  return normalizeHmRssDomain(forwardedHost || req.get("host") || "");
}

function hmSiteOrigin(domain: string | null | undefined): string {
  const host = normalizeHmRssDomain(domain);
  return host ? `https://${host}` : sitePublicOrigin().replace(/\/+$/, "");
}

function absolutizeRssUrl(raw: string | null | undefined, siteOrigin: string): string | null {
  const u = String(raw ?? "").trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const base = u.startsWith("/api/media/") ? sitePublicOrigin().replace(/\/+$/, "") : siteOrigin;
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

/** Yekpare portal ana haber RSS (site_id IS NULL) — HM /rss/:site/:cat rotasından önce tanımlanmalı. */
async function servePortalHaberlerRss(
  res: import("express").Response,
  selfApiPath = "/api/rss/portal/haberler.xml",
): Promise<void> {
  const base = sitePublicOrigin().replace(/\/+$/, "");
  const channelLink = `${base}/haberler`;
  const feedSelf = `${base}${selfApiPath.startsWith("/") ? selfApiPath : `/${selfApiPath}`}`;
  const rows = await getNewsDbForRead()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.status, "published"), isNull(newsTable.siteId)))
    .orderBy(desc(newsTable.createdAt))
    .limit(50);

  const items = rows
    .map((item) => {
      const link = `${base}/haber/${encodeURIComponent(item.slug || String(item.id))}`;
      const articleContent = String(item.content || item.spot || item.title || "").trim();
      const descText = stripHtml(articleContent || item.title);
      const image = absolutizeRssUrl(item.imageUrl, base);
      return [
        "    <item>",
        `      <title>${xmlEscape(item.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <description>${xmlCdata(descText)}</description>`,
        `      <content:encoded>${xmlCdata(articleContent)}</content:encoded>`,
        `      <pubDate>${item.createdAt.toUTCString()}</pubDate>`,
        image ? `      <enclosure url="${xmlEscape(image)}" type="image/jpeg" />` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(`${PORTAL_BRAND_SHORT} Haberler`)}</title>
    <link>${xmlEscape(channelLink)}</link>
    <atom:link href="${xmlEscape(feedSelf)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(`${PORTAL_BRAND_SHORT} ana haber akışı — güncel haberler`)}</description>
    <language>tr-TR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(xml);
}

router.get("/rss/portal/haberler.xml", async (_req, res): Promise<void> => {
  await servePortalHaberlerRss(res, "/api/rss/portal/haberler.xml");
});

/** Geriye dönük alias — HM siteSlug rotasına düşmemesi için portal rotasından sonra değil önce kayıtlı. */
router.get("/rss/yekpare/haberler.xml", async (_req, res): Promise<void> => {
  await servePortalHaberlerRss(res, "/api/rss/portal/haberler.xml");
});

router.get("/rss/:siteSlug/:categorySlug.xml", async (req, res): Promise<void> => {
  const siteSlug = slugify(String(req.params.siteSlug ?? ""));
  const categorySlug = slugify(String(req.params.categorySlug ?? "").replace(/\.xml$/i, ""));
  if (!siteSlug || !categorySlug) {
    res.status(400).type("text/plain; charset=utf-8").send("siteSlug ve categorySlug gerekli");
    return;
  }

  const requestHost = hmRssRequestHost(req);
  const mappedSite = requestHost
    ? await getActiveHmNewsSiteByDomainCompat(hmRssDomainLookupCandidates(requestHost))
    : undefined;
  if (mappedSite && slugify(mappedSite.slug) !== siteSlug) {
    res.status(404).type("text/plain; charset=utf-8").send("Haber sitesi bu alan adına ait değil");
    return;
  }

  const site = mappedSite ?? (await getActiveHmNewsSiteBySlugCompat(siteSlug));
  if (!site) {
    res.status(404).type("text/plain; charset=utf-8").send("Haber sitesi bulunamadı");
    return;
  }
  const layout = await readHmPublicLayout(site.id);
  if (!isHmLayoutModuleEnabled(layout, "hmNewsRssLinksEnabled")) {
    res.status(404).type("text/plain; charset=utf-8").send("RSS beslemesi pasif");
    return;
  }
  const hiddenCategorySlugs = await getHmHiddenCategorySlugs(site.id);
  if (hiddenCategorySlugs.has(categorySlug)) {
    res.status(404).type("text/plain; charset=utf-8").send("Kategori yayında değil");
    return;
  }

  const [category] = await getNewsDbForRead()
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, categorySlug))
    .limit(1);
  if (!category || (category.exclusiveSiteId != null && category.exclusiveSiteId !== site.id)) {
    res.status(404).type("text/plain; charset=utf-8").send("Kategori bulunamadı");
    return;
  }

  const siteOrigin = hmSiteOrigin(site.domain);
  const channelLink = `${siteOrigin}/tr/${encodeURIComponent(site.slug)}/kategori/${encodeURIComponent(category.slug)}`;
  const feedSelf = `${siteOrigin}/api/rss/${encodeURIComponent(site.slug)}/${encodeURIComponent(category.slug)}.xml`;
  const hybridItems = await loadHmCategoryRssFeedItems({
    siteId: site.id,
    categorySlug: category.slug,
    limit: 50,
  });

  const channelDescription =
    stripHtml(site.description).slice(0, 300) ||
    `${category.name} kategorisindeki güncel haberler - ${site.displayName}`;
  const items = hybridItems
    .map((item) => {
      const link = hmCategoryRssItemPublicLink(item, siteOrigin, site.slug);
      const articleContent = String(item.spot || item.title || "").trim();
      const descText = stripHtml(articleContent || item.title);
      const image = absolutizeRssUrl(item.imageUrl, siteOrigin);
      const pubDate = item.publishedAt ? new Date(item.publishedAt) : new Date();
      const pubDateStr = Number.isFinite(pubDate.getTime()) ? pubDate.toUTCString() : new Date().toUTCString();
      return [
        "    <item>",
        `      <title>${xmlEscape(item.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <description>${xmlCdata(descText)}</description>`,
        `      <content:encoded>${xmlCdata(articleContent)}</content:encoded>`,
        `      <pubDate>${pubDateStr}</pubDate>`,
        image ? `      <enclosure url="${xmlEscape(image)}" type="image/jpeg" />` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(`${site.displayName} - ${category.name}`)}</title>
    <link>${xmlEscape(channelLink)}</link>
    <atom:link href="${xmlEscape(feedSelf)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(channelDescription)}</description>
    <language>tr-TR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(xml);
});

router.get("/rss/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const rows = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .orderBy(rssCampaignsTable.id);
  const totalActive = rows.filter((r) => r.active).length;
  const totalAdded = rows.reduce((s, r) => s + r.addedCount, 0);
  const next = new Date(Date.now() + 5 * 60 * 1000);
  res.json({
    items: rows.map(serializeRssCampaign),
    totalActive,
    totalAdded,
    nextRunAt: next.toISOString(),
  });
});

router.post("/rss/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const parsed = CreateRssCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await dualWriteInsert(rssCampaignsTable, {
    name: d.name,
    active: d.active ?? true,
    postType: d.postType,
    categorySlug: d.categorySlug,
    tags: d.tags ?? [],
    feeds: d.feeds ?? [],
    sourceType: d.sourceType,
    intervalMinutes: d.intervalMinutes ?? 30,
    daysWindow: d.daysWindow ?? 0,
    dailyLimit: d.dailyLimit ?? 0,
    downloadImages: d.downloadImages ?? false,
    headline: d.headline ?? false,
    breakingKeywords: d.breakingKeywords ?? [],
    minWords: d.minWords ?? 0,
    translateEnabled: d.translateEnabled ?? false,
    sourceLang: d.sourceLang ?? null,
    targetLang: d.targetLang ?? null,
    translateEngine: d.translateEngine ?? null,
    hmSiteIds: d.hmSiteIds?.length ? d.hmSiteIds : [],
    includeYekpareHaber: d.includeYekpareHaber ?? false,
    haberlerFilterByTags: d.haberlerFilterByTags ?? false,
  });
  res.status(201).json(serializeRssCampaign(row));
});

router.get("/rss/campaigns/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeRssCampaign(row));
});

router.put("/rss/campaigns/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateRssCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await dualWriteUpdate(
    rssCampaignsTable,
    {
      name: d.name,
      active: d.active ?? true,
      postType: d.postType,
      categorySlug: d.categorySlug,
      tags: d.tags ?? [],
      feeds: d.feeds ?? [],
      sourceType: d.sourceType,
      intervalMinutes: d.intervalMinutes ?? 30,
      daysWindow: d.daysWindow ?? 0,
      dailyLimit: d.dailyLimit ?? 0,
      downloadImages: d.downloadImages ?? false,
      headline: d.headline ?? false,
      breakingKeywords: d.breakingKeywords ?? [],
      minWords: d.minWords ?? 0,
      translateEnabled: d.translateEnabled ?? false,
      sourceLang: d.sourceLang ?? null,
      targetLang: d.targetLang ?? null,
      translateEngine: d.translateEngine ?? null,
      hmSiteIds: d.hmSiteIds?.length ? d.hmSiteIds : [],
      includeYekpareHaber: d.includeYekpareHaber ?? false,
      haberlerFilterByTags: d.haberlerFilterByTags ?? false,
    },
    eq(rssCampaignsTable.id, id),
  );
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeRssCampaign(row));
});

router.delete("/rss/campaigns/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await dualWriteDelete(rssLogsTable, eq(rssLogsTable.campaignId, id));
  await dualWriteDelete(rssCampaignsTable, eq(rssCampaignsTable.id, id));
  res.sendStatus(204);
});

router.post("/rss/campaigns/:id/toggle", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [current] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const [row] = await dualWriteUpdate(
    rssCampaignsTable,
    { active: !current.active },
    eq(rssCampaignsTable.id, id),
  );
  res.json(serializeRssCampaign(row));
});

router.post("/rss/campaigns/:id/run", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [campaign] = await getNewsDbForRead()
    .select({ id: rssCampaignsTable.id })
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const { alreadyRunning } = scheduleRssCampaignRun(id);
  res.status(202).json({
    accepted: true,
    added: 0,
    skipped: 0,
    errors: 0,
    message: alreadyRunning
      ? "Kampanya zaten çalışıyor; tamamlanınca İşlem Logları güncellenir."
      : "Kampanya arka planda çalıştırılıyor. Birkaç dakika sonra İşlem Logları ve EKLENEN sütununu kontrol edin.",
  });
});

router.post("/rss/direct-import", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { url, categorySlug, maxItems = 10, fetchFullArticle = true } = req.body;
  if (!url) { res.status(400).json({ error: "url gerekli" }); return; }

  let xmlText: string;
  try {
    const fetched = await fetchRssFeedXml(String(url));
    xmlText = fetched.xml;
  } catch (e: any) {
    res.status(502).json({ error: `RSS alınamadı: ${e.message}` });
    return;
  }

  const itemLimit = Math.min(30, Math.max(1, parseInt(String(maxItems), 10) || 10));
  const items = parseFeedItems(xmlText, itemLimit)
    .map((item) => ({
      title: item.title,
      description: item.descHtml || item.desc,
      contentEncoded: extractRssContentEncoded(item.rawInner),
      link: item.link,
      imageUrl: extractRssCoverImage(item.rawInner, item.descHtml || item.desc, item.link),
      publishedAt: coerceNewsPublishedAt(item.publishedAt),
    }))
    .filter((item) => item.title.length > 3);

  const [cat] = await getNewsDbForRead().select().from(categoriesTable).where(eq(categoriesTable.slug, categorySlug ?? "gundem"));
  let added = 0;
  for (const item of items) {
    try {
      const cleanTitle = item.title.replace(/<[^>]*>/g, "").trim().slice(0, 200);
      if (!cleanTitle) continue;

      const rssSpot = item.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().slice(0, 500) || "RSS'ten aktarılmıştır.";

      // İçerik önceliği: 1) content:encoded, 2) URL'den tam içerik, 3) description
      let fullContent = "";
      if (item.contentEncoded && item.contentEncoded.length > 200) {
        fullContent = item.contentEncoded
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/\s+on\w+="[^"]*"/gi, "")
          .replace(/href="javascript:[^"]*"/gi, 'href="#"')
          .trim();
      } else if (fetchFullArticle && item.link) {
        fullContent = await fetchArticleContentHtml(item.link);
      }

      const contentHtml = fullContent || `<p>${rssSpot}</p>`;

      await dualWriteInsert(newsTable, {
        title: cleanTitle,
        slug: slugify(cleanTitle) + "-" + Date.now() + "-" + added,
        spot: rssSpot,
        content: contentHtml,
        imageUrl: item.imageUrl ?? null,
        categoryId: cat?.id ?? null,
        status: "draft",
        isFeatured: false,
        isBreaking: false,
        tags: ["rss-import"],
        isEditorManual: false,
        createdAt: item.publishedAt,
        updatedAt: item.publishedAt,
      });
      added++;
    } catch { /* skip duplicates */ }
  }

  res.json({ added, total: items.length, message: `${added} haber eklendi (tam içerik ile)` });
});

/** Bozuk RSS başlıklarını kaynak URL'den geri yükler. */
router.post("/rss/repair-import-dates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const limit = Math.min(500, Math.max(1, Number((req.body as { limit?: number })?.limit) || 200));
  const dryRun = (req.body as { dryRun?: boolean })?.dryRun === true;
  const result = await repairRssImportDatesBatch({ limit, dryRun });
  res.json({ ok: true, dryRun, ...result });
});

router.post("/rss/repair-import-titles", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const limit = Math.min(500, Math.max(1, Number((req.body as { limit?: number })?.limit) || 200));
  const dryRun = (req.body as { dryRun?: boolean })?.dryRun === true;
  const result = await repairCorruptedRssImportTitlesBatch({ limit, dryRun });
  res.json({ ok: true, dryRun, ...result });
});

/** Haberler.com kazımasından kalan ilgili haber / footer HTML'ini temizler. */
router.post("/rss/repair-haberler-content", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body ?? {}) as { limit?: number; dryRun?: boolean; siteId?: number };
  const limit = Math.min(500, Math.max(1, Number(body.limit) || 200));
  const dryRun = body.dryRun === true;
  const siteId = body.siteId != null ? Number(body.siteId) : undefined;
  const result = await repairHaberlerScrapedContentBatch({
    limit,
    dryRun,
    siteId: siteId != null && Number.isFinite(siteId) ? siteId : undefined,
  });
  res.json({ ok: true, dryRun, ...result });
});

router.get("/rss/logs", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  await ensureRssCampaignSchema();
  const cidRaw = req.query.campaignId;
  const cidNum =
    typeof cidRaw === "string" ? parseInt(cidRaw, 10) : undefined;
  const where =
    cidNum && !Number.isNaN(cidNum)
      ? eq(rssLogsTable.campaignId, cidNum)
      : undefined;
  const rows = await getNewsDbForRead()
    .select()
    .from(rssLogsTable)
    .where(where)
    .orderBy(desc(rssLogsTable.createdAt))
    .limit(300);
  const campaigns = await getNewsDbForRead().select().from(rssCampaignsTable);
  const map = new Map(campaigns.map((c) => [c.id, c.name]));
  res.json(rows.map((r) => serializeRssLog(r, map.get(r.campaignId) ?? "")));
});

export default router;
