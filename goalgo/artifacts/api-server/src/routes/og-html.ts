/**
 * Botların (WhatsApp, Facebook, X) okuduğu statik HTML + OG meta.
 * Paylaşılan URL hâlâ SPA kökündedir; edge/nginx ile bu endpoint’e yönlendirme yapılabilir.
 * Örnek: `GET /api/public/og-html?path=/siparis/satici/ornek` — path yalnızca site içi, SSRF yok.
 */
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, getNewsDbForRead, hmMakalelerTable, mapBusinessesTable, newsTable, vendorsTable } from "@workspace/db";
import { sitePublicOrigin } from "../lib/site-public-origin.js";
import { PORTAL_SITE_NAME } from "../lib/portalBrand.js";
import { getActiveHmNewsSiteByDomainCompat, getActiveHmNewsSiteBySlugCompat } from "../lib/hm-site-compat";
import { resolveNewsArticleBySlug } from "../lib/news-page-bundle.js";
import { getEncyclopediaArticleShareMeta } from "./wiki.js";
import { loadPortalHybridRssFeeds } from "../lib/portal-hybrid-config.js";
import { getPortalRssItemById, refreshAllPortalRssFeeds, refreshPortalRssFeed } from "../lib/portal-rss-cache.js";
import {
  jsonLdScriptTag,
  mapBusinessJsonLd,
  newsArticleJsonLd,
  tourismListingJsonLd,
  vendorJsonLd,
  encyclopediaArticleJsonLd,
  blogPostingJsonLd,
  blogListJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  productJsonLd,
} from "../lib/portal-json-ld.js";
import { marketplaceProductPublicPath } from "../lib/marketplaceProductSitemap.js";
import { parseSeoVerificationJson, type SeoVerification } from "../lib/seo-verification.js";

const router: IRouter = Router();

const SITE_TAIL = ` ${PORTAL_SITE_NAME} — yekpare.net`;

type HmSiteOgRow = {
  id: number;
  slug: string;
  domain?: string | null;
  displayName: string;
  description?: string | null;
  layoutJson?: string | null;
  verificationJson?: string | null;
};

function verificationMetaHtml(verification: SeoVerification | null | undefined): string {
  if (!verification) return "";
  let tags = "";
  const google = String(verification.googleSiteVerification ?? "").trim();
  const bing = String(verification.bingSiteVerification ?? "").trim();
  const yandex = String(verification.yandexVerification ?? "").trim();
  if (google) tags += `\n<meta name="google-site-verification" content="${esc(google)}" />`;
  if (bing) tags += `\n<meta name="msvalidate.01" content="${esc(bing)}" />`;
  if (yandex) tags += `\n<meta name="yandex-verification" content="${esc(yandex)}" />`;
  for (const tag of verification.customMetaTags ?? []) {
    const name = String(tag.name ?? "").trim();
    const content = String(tag.content ?? "").trim();
    if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name) || !content) continue;
    tags += `\n<meta name="${esc(name)}" content="${esc(content)}" />`;
  }
  return tags;
}

function hmSiteSeoVerification(site: HmSiteOgRow): SeoVerification | null {
  return parseSeoVerificationJson(site.verificationJson);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripHtml(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeHmSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function publicOrigin(raw: unknown): string {
  const fallback = sitePublicOrigin().replace(/\/+$/, "");
  const s = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!s) return fallback;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return fallback;
    return u.origin;
  } catch {
    return fallback;
  }
}

function absImage(origin: string, url: string | null | undefined): string {
  const u = String(url ?? "").trim();
  if (!u) return `${origin}/opengraph.jpg`;
  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      const parsed = new URL(u);
      if (parsed.protocol === "http:") parsed.protocol = "https:";
      return parsed.toString();
    } catch {
      return u.replace(/^http:\/\//i, "https://");
    }
  }
  if (u.startsWith("/api/media/")) return `${sitePublicOrigin().replace(/\/+$/, "")}${u}`;
  return `${origin}${u.startsWith("/") ? u : `/${u}`}`;
}

function normalizeDomain(raw: unknown): string | null {
  let d = String(raw ?? "").trim().toLowerCase().replace(/\\/g, "/");
  if (!d) return null;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(d)) {
      d = new URL(d).hostname;
    } else {
      d = d.split(/[/?#]/)[0] ?? "";
    }
  } catch {
    d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0] ?? "";
  }
  return d.replace(/:\d+$/, "").replace(/\.$/, "").trim() || null;
}

function domainLookupCandidates(raw: unknown): string[] {
  const host = normalizeDomain(raw);
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

function originHost(rawOrigin: string): string | null {
  try {
    return normalizeDomain(new URL(rawOrigin).hostname);
  } catch {
    return normalizeDomain(rawOrigin);
  }
}

function requestHost(req: Request): string | null {
  const forwardedHost = String(req.get("x-forwarded-host") ?? "").split(",")[0]?.trim();
  return normalizeDomain(forwardedHost || req.get("host") || "");
}

async function hmSiteMappedToAnyHost(hosts: Array<string | null>): Promise<HmSiteOgRow | null> {
  const candidates = new Set<string>();
  for (const host of hosts) {
    for (const candidate of domainLookupCandidates(host)) candidates.add(candidate);
  }
  if (candidates.size === 0) return null;
  return (await getActiveHmNewsSiteByDomainCompat(Array.from(candidates))) ?? null;
}

function hmSiteOrigin(site: HmSiteOgRow, fallbackOrigin: string): string {
  const domain = normalizeDomain(site.domain);
  return domain ? `https://${domain}` : fallbackOrigin;
}

function parseLayout(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function textField(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s ? s : null;
}

function firstImageFromItems(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.active === false) continue;
    const image = textField(o.imageUrl ?? o.image);
    if (image) return image;
  }
  return null;
}

function layoutOgImage(layout: Record<string, unknown>): string | null {
  return (
    textField(layout.logoUrl ?? layout.logo) ??
    firstImageFromItems(layout.corporateSliderItems) ??
    firstImageFromItems(layout.corporateBandItems)
  );
}

async function latestNewsImage(siteId: number): Promise<string | null> {
  const [row] = await getNewsDbForRead()
    .select({ imageUrl: newsTable.imageUrl })
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), eq(newsTable.status, "published"), isNotNull(newsTable.imageUrl)))
    .orderBy(desc(newsTable.createdAt))
    .limit(1);
  return textField(row?.imageUrl);
}

async function rssShareMeta(itemId: string, siteId: number | null): Promise<{
  title: string;
  description: string;
  imageUrl: string | null;
} | null> {
  const id = String(itemId ?? "").trim();
  if (!id) return null;

  const feeds = await loadPortalHybridRssFeeds(siteId, "all");
  let match = await getPortalRssItemById(id, feeds);
  if (!match) {
    await refreshAllPortalRssFeeds(feeds);
    match = await getPortalRssItemById(id, feeds);
  }
  if (match && !String(match.item.contentHtml ?? "").trim()) {
    const feed = feeds.find((row) => row.id === match!.item.feedId);
    if (feed?.enabled && feed.url) {
      await refreshPortalRssFeed(feed);
      match = await getPortalRssItemById(id, feeds);
    }
  }
  if (!match) return null;

  return {
    title: match.item.title,
    description: clip(stripHtml(match.item.spot || match.item.contentHtml || match.item.title), 300) || match.item.title,
    imageUrl: textField(match.item.imageUrl),
  };
}

async function hmSiteOgImage(site: HmSiteOgRow, origin: string): Promise<string> {
  const layout = parseLayout(site.layoutJson);
  const image = layoutOgImage(layout) ?? (await latestNewsImage(site.id));
  return absImage(origin, image);
}

function hmDescription(site: HmSiteOgRow): string {
  return clip(stripHtml(site.description || `${site.displayName} güncel haberler, duyurular ve köşe yazıları`), 300);
}

function normalizeExtraPageSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function findHmExtraPageOg(layout: Record<string, unknown>, tail: string): { title: string; description: string | null } | null {
  const slug = normalizeExtraPageSlug(tail.startsWith("/") ? tail.slice(1) : tail);
  if (!slug) return null;
  const pages = layout.hmExtraPages;
  if (!Array.isArray(pages)) return null;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const row = page as Record<string, unknown>;
    if (row.enabled === false) continue;
    const pageSlug = normalizeExtraPageSlug(String(row.slug ?? ""));
    if (pageSlug !== slug) continue;
    const title = String(row.title ?? "").trim() || slug.replace(/-/g, " ");
    const body = String(row.bodyHtml ?? row.html ?? "").trim();
    const description = body ? clip(stripHtml(body), 300) : null;
    return { title, description };
  }
  return null;
}

function titleForHmTail(tail: string, siteName: string, layout?: Record<string, unknown>): string {
  if (layout) {
    const extra = findHmExtraPageOg(layout, tail);
    if (extra) return `${extra.title} · ${siteName}`;
  }
  if (tail === "/" || tail === "") return siteName;
  if (tail === "/tum-haberler") return `Tüm haberler · ${siteName}`;
  if (tail === "/yazarlar") return `Köşe yazarları · ${siteName}`;
  if (tail === "/kunye") return `Künye · ${siteName}`;
  if (tail === "/iletisim") return `İletişim · ${siteName}`;
  if (tail === "/reklam") return `Reklam · ${siteName}`;
  if (tail === "/abonelik") return `Abonelik · ${siteName}`;
  if (tail === "/rss-baglantilari") return `RSS beslemeleri · ${siteName}`;
  if (tail === "/sitene-ekle") return `Sitene ekle · ${siteName}`;
  const cat = /^\/kategori\/([^/]+)$/.exec(tail)?.[1];
  if (cat) return `${safeDecode(cat).replace(/-/g, " ")} · ${siteName}`;
  const page = /^\/sayfa\/([^/]+)$/.exec(tail)?.[1];
  if (page) return `${safeDecode(page).replace(/-/g, " ")} · ${siteName}`;
  return `${siteName} — Haber`;
}

function shellHtml(opts: {
  origin: string;
  path: string;
  title: string;
  description: string;
  image: string;
  siteName?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  seoVerification?: SeoVerification | null;
}): string {
  const url = `${opts.origin}${opts.path}`;
  const t = esc(opts.title);
  const d = esc(opts.description);
  const img = esc(opts.image);
  const u = esc(url);
  const siteName = esc(opts.siteName || "Yekpare");
  const type = opts.type || "website";
  const ld =
    opts.jsonLd != null
      ? jsonLdScriptTag(Array.isArray(opts.jsonLd) ? opts.jsonLd : [opts.jsonLd])
      : "";
  const verificationTags = verificationMetaHtml(opts.seoVerification);
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${t}</title>
<meta name="description" content="${d}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="${u}"/>
<link rel="alternate" type="text/plain" href="${esc(opts.origin.replace(/\/+$/, ""))}/llms.txt" title="LLMs"/>${verificationTags}
<meta property="og:type" content="${type}"/>
<meta property="og:url" content="${u}"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:secure_url" content="${img}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${t}"/>
<meta property="og:locale" content="tr_TR"/>
<meta property="og:site_name" content="${siteName}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:url" content="${u}"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<meta name="twitter:image" content="${img}"/>
${ld}
</head>
<body>
<article>
<h1>${t}</h1>
<p>${d}</p>
<p><a href="${u}">${u}</a></p>
</article>
</body>
</html>`;
}

router.get("/public/og-html", async (req, res): Promise<void> => {
  const rawPath = String(req.query.path ?? "").trim();
  if (!rawPath.startsWith("/") || rawPath.length > 400 || rawPath.includes("://") || rawPath.includes("..")) {
    res.status(400).type("text/plain").send("path: güvenli site içi yol gerekli");
    return;
  }
  const path = rawPath.split("?")[0] ?? rawPath;
  const origin = publicOrigin(req.query.origin);

  try {
    const mMapPlace = /^\/maps\/place\/([^/]+)\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d{1,2})z(?:\/.*)?$/i.exec(path);
    if (mMapPlace) {
      const placeName = safeDecode(mMapPlace[1] ?? "").replace(/\+/g, " ").trim() || "Konum";
      const lat = Number(mMapPlace[2]);
      const lng = Number(mMapPlace[3]);
      const zoom = Number(mMapPlace[4]);
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path,
          title: `${placeName} Haritası — Yekpare`,
          description: `${placeName} konumunu Yekpare Haritalar tam ekran görünümünde açın.`,
          image: `${origin.replace(/\/+$/, "")}/opengraph.jpg`,
          siteName: "Yekpare Haritalar",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Map",
            name: `${placeName} Haritası`,
            url: `${origin}${path}`,
            spatialCoverage: {
              "@type": "Place",
              name: placeName,
              geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
            },
            zoomLevel: zoom,
            isPartOf: { "@type": "WebSite", name: "Yekpare", url: origin.replace(/\/+$/, "") },
          },
        }),
      );
      return;
    }

    const mHmPath = /^\/tr\/([^/]+)(?:\/(.*))?$/.exec(path);
    const originHmSite = await hmSiteMappedToAnyHost([originHost(origin), requestHost(req)]);
    let hmSite: HmSiteOgRow | null = null;
    let hmTail = "";
    if (mHmPath) {
      const siteSlug = normalizeHmSlug(safeDecode(mHmPath[1] ?? ""));
      if (originHmSite) {
        if (normalizeHmSlug(originHmSite.slug) !== siteSlug) {
          res.status(404).type("text/plain").send("not found");
          return;
        }
        hmSite = originHmSite;
      } else {
        hmSite = (await getActiveHmNewsSiteBySlugCompat(siteSlug)) ?? null;
      }
      hmTail = mHmPath[2] ? `/${mHmPath[2]}` : "/";
      if (!hmSite) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
    } else {
      hmSite = originHmSite;
      hmTail = path || "/";
    }

    if (hmSite) {
      const canonicalOrigin = hmSiteOrigin(hmSite, origin);
      const hmSeoVerification = hmSiteSeoVerification(hmSite);
      const mRssArticle = /^\/haberler\/rss\/([^/]+)$/.exec(hmTail);
      if (mRssArticle) {
        const itemId = safeDecode(mRssArticle[1] ?? "").trim();
        const rss = await rssShareMeta(itemId, hmSite.id);
        if (!rss) {
          res.status(404).type("text/plain").send("not found");
          return;
        }
        const fallbackImage = await hmSiteOgImage(hmSite, canonicalOrigin);
        res
          .status(200)
          .type("html")
          .send(
            shellHtml({
              origin: canonicalOrigin,
              path,
              title: rss.title,
              description: rss.description,
              image: rss.imageUrl ? absImage(canonicalOrigin, rss.imageUrl) : fallbackImage,
              siteName: hmSite.displayName,
              type: "article",
              seoVerification: hmSeoVerification,
            }),
          );
        return;
      }

      const mArticle = /^\/haber\/([^/]+)$/.exec(hmTail);
      if (mArticle) {
        const articleSlug = safeDecode(mArticle[1] ?? "").trim();
        const article = await resolveNewsArticleBySlug(articleSlug, hmSite.id);
        if (!article) {
          res.status(404).type("text/plain").send("not found");
          return;
        }

        const desc = clip(stripHtml(article.spot || article.content || article.title), 300) || article.title;
        const fallbackImage = await hmSiteOgImage(hmSite, canonicalOrigin);
        res
          .status(200)
          .type("html")
          .send(
            shellHtml({
              origin: canonicalOrigin,
              path,
              title: `${article.title} · ${hmSite.displayName}`,
              description: desc,
              image: article.imageUrl ? absImage(canonicalOrigin, article.imageUrl) : fallbackImage,
              siteName: hmSite.displayName,
              type: "article",
              seoVerification: hmSeoVerification,
            }),
          );
        return;
      }

      const mEnc = /^\/bilgiagaci\/(.+)$/.exec(hmTail);
      if (mEnc) {
        const wikiSlug = safeDecode(mEnc[1] ?? "").trim().replace(/_/g, " ");
        const encMeta = await getEncyclopediaArticleShareMeta(wikiSlug, "tr");
        if (!encMeta) {
          res.status(404).type("text/plain").send("not found");
          return;
        }
        const desc = clip(encMeta.summary || encMeta.title, 300);
        const fallbackImage = await hmSiteOgImage(hmSite, canonicalOrigin);
        res
          .status(200)
          .type("html")
          .send(
            shellHtml({
              origin: canonicalOrigin,
              path,
              title: `${encMeta.title} · ${hmSite.displayName}`,
              description: desc,
              image: encMeta.imageUrl ? absImage(canonicalOrigin, encMeta.imageUrl) : fallbackImage,
              siteName: hmSite.displayName,
              type: "article",
              seoVerification: hmSeoVerification,
            }),
          );
        return;
      }

      const layout = parseLayout(hmSite.layoutJson);
      const extraPage = findHmExtraPageOg(layout, hmTail);
      const title = titleForHmTail(hmTail, hmSite.displayName, layout);
      const description = extraPage?.description ?? hmDescription(hmSite);
      res
        .status(200)
        .type("html")
        .send(
          shellHtml({
            origin: canonicalOrigin,
            path,
            title,
            description,
            image: await hmSiteOgImage(hmSite, canonicalOrigin),
            siteName: hmSite.displayName,
            seoVerification: hmSeoVerification,
          }),
        );
      return;
    }

    const mPortalRss = /^\/haberler\/rss\/([^/]+)$/.exec(path);
    if (mPortalRss) {
      const itemId = safeDecode(mPortalRss[1] ?? "").trim();
      const rss = await rssShareMeta(itemId, null);
      if (!rss) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const image = rss.imageUrl ? absImage(origin, rss.imageUrl) : `${origin.replace(/\/+$/, "")}/opengraph.jpg`;
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path,
          title: `${rss.title} — Yekpare Haber`,
          description: rss.description,
          image,
          siteName: "Yekpare Haber",
          type: "article",
        }),
      );
      return;
    }

    const PORTAL_LANDINGS: Record<string, { title: string; description: string }> = {
      "/kesfet": {
        title: "Keşfet — Harita ve İşletmeler",
        description:
          "Türkiye genelinde işletmeleri haritada keşfedin; restoran, kafe, mağaza ve hizmet sağlayıcı profilleri.",
      },
      "/haberler": {
        title: "Haberler — Yekpare",
        description: "Güncel Türkiye ve dünya haberleri, kategoriler ve öne çıkan manşetler.",
      },
      "/siparis": {
        title: "Online Sipariş — Yekpare",
        description: "Yemek, market ve paket servis siparişi verin; işletme menülerini inceleyin.",
      },
      "/alisveris": {
        title: "Mağazalar — Yekpare",
        description: "Online mağazalar, ürün kataloğu ve e-ticaret alışverişi.",
      },
      "/turizm": {
        title: "Turizm — Yekpare",
        description: "Otel, villa, tur, rent a car ve yat kiralama ilanları; online rezervasyon.",
      },
      "/bilgiagaci": {
        title: "Ansiklopedi — Yekpare",
        description:
          "Türkçe Wikipedia tabanlı ansiklopedi; şehirler, tarih, bilim, kültür ve gündem konularında arama yapın.",
      },
    };
    const landing = PORTAL_LANDINGS[path];
    if (landing) {
      const landingJsonLd =
        path === "/bilgiagaci"
          ? collectionPageJsonLd({
              origin,
              path,
              name: landing.title,
              description: landing.description,
              image: `${origin.replace(/\/+$/, "")}/opengraph.jpg`,
            })
          : {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: landing.title,
              description: landing.description,
              url: `${origin}${path}`,
              isPartOf: { "@type": "WebSite", name: "Yekpare", url: origin.replace(/\/+$/, "") },
            };
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path,
          title: landing.title,
          description: landing.description,
          image: `${origin.replace(/\/+$/, "")}/opengraph.jpg`,
          siteName: "Yekpare",
          jsonLd: landingJsonLd,
        }),
      );
      return;
    }

    const mProduct = /^\/magaza\/urun\/([^/]+)$/.exec(path);
    if (mProduct) {
      const slugRaw = safeDecode(mProduct[1] ?? "").trim();
      const idMatch = slugRaw.match(/^(\d+)/);
      const productId = idMatch ? Number(idMatch[1]) : NaN;
      if (!Number.isFinite(productId) || productId <= 0) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const pr = await db.execute(sql`
        SELECT
          mi.id, mi.name, mi.description, mi.price, mi.sale_price, mi.image_url, mi.stock,
          v.name AS vendor_name, v.slug AS vendor_slug, v.rating AS vendor_rating,
          v.review_count AS vendor_review_count
        FROM vendor_menu_items mi
        JOIN vendors v ON v.id = mi.vendor_id
        WHERE mi.id = ${productId}
          AND mi.active = true
          AND v.active = true
          AND v.vendor_type = 'ecommerce'
        LIMIT 1
      `);
      const row = pr.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const name = String(row.name ?? "Ürün");
      const pPath = marketplaceProductPublicPath(productId, name);
      const price = Number.parseFloat(String(row.price ?? "0").replace(",", "."));
      const sale = row.sale_price != null && row.sale_price !== ""
        ? Number.parseFloat(String(row.sale_price).replace(",", "."))
        : null;
      const desc = clip(stripHtml(String(row.description ?? name)), 300) || name;
      const image = absImage(origin, String(row.image_url ?? ""));
      const vendorSlug = String(row.vendor_slug ?? "");
      const vendorName = String(row.vendor_name ?? "");
      const stock = row.stock != null ? Number(row.stock) : 99;
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: pPath,
          title: `${name} — ${vendorName || "Mağaza"}`,
          description: desc,
          image,
          siteName: vendorName || "Yekpare Mağaza",
          jsonLd: productJsonLd({
            origin,
            path: pPath,
            name,
            description: desc,
            image,
            sku: `YK-${productId}`,
            brand: vendorName,
            price: Number.isFinite(price) ? price : null,
            salePrice: Number.isFinite(Number(sale)) ? sale : null,
            availability: stock > 0 ? "InStock" : "OutOfStock",
            sellerName: vendorName,
            sellerUrl: vendorSlug ? `${origin}/magaza/magaza/${encodeURIComponent(vendorSlug)}` : null,
            aggregateRating:
              row.vendor_rating != null && Number(row.vendor_rating) > 0
                ? {
                    ratingValue: Number(row.vendor_rating),
                    reviewCount: Number(row.vendor_review_count ?? 0),
                  }
                : null,
          }),
        }),
      );
      return;
    }

    const mMagazaStore = /^\/magaza\/magaza\/([^/]+)$/.exec(path);
    if (mMagazaStore) {
      const slug = safeDecode(mMagazaStore[1] ?? "").trim().toLowerCase();
      const [v] = await db
        .select()
        .from(vendorsTable)
        .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
        .limit(1);
      if (!v || String(v.vendorType ?? "").toLowerCase() !== "ecommerce") {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const kPath = `/magaza/magaza/${encodeURIComponent(v.slug || slug)}`;
      const snippet = clip(String(v.description ?? "").replace(/<[^>]+>/g, " "), 200);
      const loc = clip([v.district, v.city].filter(Boolean).join(", "), 80);
      const rating =
        v.rating != null && Number(v.rating) > 0 ? ` · ${Number(v.rating).toFixed(1)} puan` : "";
      const desc = clip([snippet || "Online mağaza ve ürünler", loc ? `${loc}.` : null, rating].filter(Boolean).join(" "), 300);
      const title = `${v.name} — Mağaza`;
      const image = absImage(origin, v.coverUrl || v.imageUrl);
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: kPath,
          title,
          description: desc,
          image,
          siteName: v.name,
          jsonLd: vendorJsonLd({
            origin,
            path: kPath,
            name: v.name,
            description: v.description,
            image,
            phone: v.phone,
            address: v.address,
            city: v.city,
            district: v.district,
            lat: v.lat,
            lng: v.lng,
            rating: v.rating,
            reviewCount: v.reviewCount,
            isShop: true,
          }),
        }),
      );
      return;
    }

    const mSip = /^\/siparis\/satici\/([^/]+)$/.exec(path);
    const mMag = /^\/alisveris\/magaza\/([^/]+)$/.exec(path);
    const slugV = mSip?.[1] ?? mMag?.[1];
    if (slugV) {
      const slug = decodeURIComponent(slugV).toLowerCase();
      const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, slug)).limit(1);
      if (!v || !v.active) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const vt = String(v.vendorType ?? "").toLowerCase();
      const isShop = vt === "ecommerce" || Boolean(mMag);
      const kind = isShop ? "Online mağaza ve ürünler" : "Online menü, paket servis ve sipariş";
      const snippet = clip(String(v.description ?? "").replace(/<[^>]+>/g, " "), 200);
      const loc = clip([v.district, v.city].filter(Boolean).join(", "), 80);
      const rating =
        v.rating != null && Number(v.rating) > 0
          ? ` · ${Number(v.rating).toFixed(1)} puan`
          : "";
      const desc = clip(
        [snippet || kind, loc ? `${loc}.` : null, kind + rating].filter(Boolean).join(" "),
        300,
      );
      const title = `${v.name} — ${isShop ? "Mağaza" : "Sipariş"}`;
      const image = absImage(origin, v.coverUrl || v.imageUrl);
      res
        .status(200)
        .type("html")
        .send(
          shellHtml({
            origin,
            path,
            title,
            description: desc,
            image,
            siteName: v.name,
            jsonLd: vendorJsonLd({
              origin,
              path,
              name: v.name,
              description: v.description,
              image,
              phone: v.phone,
              address: v.address,
              city: v.city,
              district: v.district,
              lat: v.lat,
              lng: v.lng,
              rating: v.rating,
              reviewCount: v.reviewCount,
              isShop,
            }),
          }),
        );
      return;
    }

    const mKesfet = /^\/kesfet\/([^/]+)$/.exec(path);
    if (mKesfet && mKesfet[1] !== "premium-basarili") {
      const slug = decodeURIComponent(mKesfet[1]).toLowerCase();
      const [b] = await db
        .select()
        .from(mapBusinessesTable)
        .where(and(eq(mapBusinessesTable.slug, slug), eq(mapBusinessesTable.isActive, true)))
        .limit(1);
      if (!b) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      // Salt kazınan (doğrulanmamış/premium olmayan/vendorsuz) işletme özel sayfa almaz;
      // tam ekran harita penceresine yönlendir.
      const [linkedVendor] = b.ownerId || b.isPremium
        ? []
        : await db
            .select({ id: vendorsTable.id })
            .from(vendorsTable)
            .where(and(eq(vendorsTable.linkedMapBusinessId, b.id), eq(vendorsTable.active, true)))
            .limit(1);
      const hasPublicProfile = Boolean(b.ownerId) || b.isPremium === true || Boolean(linkedVendor);
      if (!hasPublicProfile) {
        const mp = new URLSearchParams();
        if (b.latitude != null && b.longitude != null) {
          mp.set("lat", String(b.latitude));
          mp.set("lng", String(b.longitude));
          mp.set("zoom", "17");
        }
        if (b.name) mp.set("location", b.name);
        if (b.googlePlaceId) mp.set("place_id", b.googlePlaceId);
        const qs = mp.toString();
        res.redirect(302, qs ? `/map?${qs}` : "/map");
        return;
      }
      const kPath = `/kesfet/${encodeURIComponent(b.slug || slug)}`;
      const snippet = clip(stripHtml(b.description), 200);
      const loc = clip(b.address ?? "", 100);
      const desc = clip([snippet || `${b.name} — işletme profili`, loc].filter(Boolean).join(" "), 300);
      const image = absImage(origin, b.coverPhotoUrl || b.photoUrl);
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: kPath,
          title: `${b.name} — Keşfet`,
          description: desc,
          image,
          siteName: b.name,
          jsonLd: mapBusinessJsonLd({
            origin,
            path: kPath,
            name: b.name,
            description: b.description,
            image,
            phone: b.phone,
            address: b.address,
            lat: b.latitude,
            lng: b.longitude,
            rating: b.rating,
          }),
        }),
      );
      return;
    }

    const mHaber = /^\/haber\/([^/]+)$/.exec(path);
    if (mHaber) {
      const articleSlug = safeDecode(mHaber[1] ?? "").trim();
      const [article] = await getNewsDbForRead()
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, articleSlug), isNull(newsTable.siteId), eq(newsTable.status, "published")))
        .limit(1);
      if (!article) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const hPath = `/haber/${encodeURIComponent(article.slug)}`;
      const desc = clip(stripHtml(article.spot || article.title), 300);
      const image = absImage(origin, article.imageUrl);
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: hPath,
          title: `${article.title} — Yekpare Haber`,
          description: desc,
          image,
          siteName: "Yekpare",
          type: "article",
          jsonLd: newsArticleJsonLd({
            origin,
            path: hPath,
            headline: article.title,
            description: article.spot,
            image,
            datePublished: article.createdAt,
            dateModified: article.updatedAt,
          }),
        }),
      );
      return;
    }

    const mTur = /^\/turizm\/([^/]+)\/([^/]+)$/.exec(path);
    if (mTur) {
      const type = safeDecode(mTur[1] ?? "").trim();
      const listingSlug = safeDecode(mTur[2] ?? "").trim().toLowerCase();
      const r = await db.execute(sql`
        SELECT title, slug, type, description, image_url, city, price, sale_price, price_unit
        FROM tourism_listings
        WHERE slug = ${listingSlug} AND status = 'active'
        LIMIT 1
      `);
      const row = r.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const tPath = `/turizm/${encodeURIComponent(String(row.type || type))}/${encodeURIComponent(listingSlug)}`;
      const title = `${String(row.title ?? "Turizm")} — Yekpare Turizm`;
      const desc = clip(stripHtml(String(row.description ?? "")), 300);
      const image = absImage(origin, String(row.image_url ?? ""));
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: tPath,
          title,
          description: desc,
          image,
          siteName: "Yekpare Turizm",
          jsonLd: tourismListingJsonLd({
            origin,
            path: tPath,
            title: String(row.title ?? ""),
            description: String(row.description ?? ""),
            image,
            type: String(row.type ?? type),
            city: String(row.city ?? ""),
            price: Number(row.sale_price || row.price || 0) || null,
            priceUnit: String(row.price_unit ?? ""),
          }),
        }),
      );
      return;
    }

    const mAns = /^\/bilgiagaci\/([^/]+)$/.exec(path);
    if (mAns) {
      const wikiSlug = safeDecode(mAns[1] ?? "").trim();
      const wikiTitle = wikiSlug.replace(/_/g, " ");
      const meta = await getEncyclopediaArticleShareMeta(wikiTitle, "tr");
      if (!meta) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const aPath = `/bilgiagaci/${encodeURIComponent(wikiSlug)}`;
      const image = meta.imageUrl ? absImage(origin, meta.imageUrl) : `${origin.replace(/\/+$/, "")}/opengraph.jpg`;
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: aPath,
          title: `${meta.title} — Ansiklopedi`,
          description: clip(meta.summary, 300),
          image,
          siteName: "Yekpare Ansiklopedi",
          type: "article",
          jsonLd: encyclopediaArticleJsonLd({
            origin,
            path: aPath,
            headline: meta.title,
            description: meta.summary,
            image,
          }),
        }),
      );
      return;
    }

    const mBlogListSip = /^\/siparis\/satici\/([^/]+)\/blog$/.exec(path);
    const mBlogListMag = /^\/alisveris\/magaza\/([^/]+)\/blog$/.exec(path);
    const listVendorSlug = mBlogListSip?.[1] ?? mBlogListMag?.[1];
    if (listVendorSlug) {
      const vSlug = decodeURIComponent(listVendorSlug).trim().toLowerCase();
      const isShop = Boolean(mBlogListMag);
      const [v] = await db
        .select({
          id: vendorsTable.id,
          name: vendorsTable.name,
          description: vendorsTable.description,
          coverUrl: vendorsTable.coverUrl,
          imageUrl: vendorsTable.imageUrl,
        })
        .from(vendorsTable)
        .where(and(eq(vendorsTable.slug, vSlug), eq(vendorsTable.active, true)))
        .limit(1);
      if (!v) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const st = await db.execute(sql`SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${v.id} LIMIT 1`);
      const enabled = Boolean((st.rows?.[0] as { enabled?: boolean } | undefined)?.enabled);
      if (!enabled) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const pr = await db.execute(sql`
        SELECT slug, title, published_at
        FROM vendor_blog_posts
        WHERE vendor_id = ${v.id} AND published = true
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT 20
      `);
      const posts = (pr.rows ?? []) as Array<{ slug: string; title: string; published_at?: string | null }>;
      const basePath = isShop
        ? `/alisveris/magaza/${encodeURIComponent(vSlug)}`
        : `/siparis/satici/${encodeURIComponent(vSlug)}`;
      const bListPath = `${basePath}/blog`;
      const title = `${v.name} — Blog`;
      const snippet = clip(stripHtml(String(v.description ?? "")), 160);
      const desc = clip(
        posts.length
          ? `${v.name} blog: ${posts.slice(0, 3).map((p) => p.title).join(", ")}`
          : snippet || `${v.name} mağaza blogu — güncel yazılar.`,
        300,
      );
      const image = absImage(origin, v.coverUrl || v.imageUrl);
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: bListPath,
          title,
          description: desc,
          image,
          siteName: v.name,
          jsonLd: blogListJsonLd({
            origin,
            path: bListPath,
            name: title,
            description: desc,
            image,
            posts: posts.map((p) => ({
              headline: p.title,
              url: `${origin.replace(/\/+$/, "")}${basePath}/blog/${encodeURIComponent(p.slug)}`,
              datePublished: p.published_at,
            })),
          }),
        }),
      );
      return;
    }

    const mBlogSip = /^\/siparis\/satici\/([^/]+)\/blog\/([^/]+)$/.exec(path);
    const mBlogMag = /^\/alisveris\/magaza\/([^/]+)\/blog\/([^/]+)$/.exec(path);
    const blogVendorSlug = mBlogSip?.[1] ?? mBlogMag?.[1];
    const blogPostSlug = mBlogSip?.[2] ?? mBlogMag?.[2];
    if (blogVendorSlug && blogPostSlug) {
      const vSlug = decodeURIComponent(blogVendorSlug).trim();
      const pSlug = decodeURIComponent(blogPostSlug).trim();
      const [v] = await db
        .select({ id: vendorsTable.id, name: vendorsTable.name })
        .from(vendorsTable)
        .where(and(eq(vendorsTable.slug, vSlug), eq(vendorsTable.active, true)))
        .limit(1);
      if (!v) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const pr = await db.execute(sql`
        SELECT slug, title, excerpt, cover_image_url, published_at
        FROM vendor_blog_posts
        WHERE vendor_id = ${v.id} AND slug = ${pSlug} AND published = true
        LIMIT 1
      `);
      const post = pr.rows[0] as Record<string, unknown> | undefined;
      if (!post) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const basePath = mBlogMag ? `/alisveris/magaza/${encodeURIComponent(vSlug)}` : `/siparis/satici/${encodeURIComponent(vSlug)}`;
      const bPath = `${basePath}/blog/${encodeURIComponent(pSlug)}`;
      const title = `${String(post.title ?? "Blog")} — ${v.name}`;
      const desc = clip(stripHtml(String(post.excerpt ?? post.title ?? "")), 300);
      const image = absImage(origin, String(post.cover_image_url ?? ""));
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: bPath,
          title,
          description: desc,
          image,
          siteName: v.name,
          type: "article",
          jsonLd: blogPostingJsonLd({
            origin,
            path: bPath,
            headline: String(post.title ?? ""),
            description: String(post.excerpt ?? ""),
            image,
            datePublished: post.published_at as string | Date | null,
            authorName: v.name,
          }),
        }),
      );
      return;
    }

    const BILGI_PAGES: Record<string, { title: string; description: string; faq: Array<{ question: string; answer: string }> }> = {
      "yekpare-nedir": {
        title: "Yekpare Nedir?",
        description:
          "Yekpare; haber, video, harita keşfet, online sipariş, alışveriş ve turizm rezervasyonunu tek platformda sunan Türkiye dijital süper uygulamasıdır.",
        faq: [
          { question: "Yekpare ücretsiz mi?", answer: "Evet, kullanıcılar için ücretsizdir." },
          { question: "Yekpare hangi şehirlerde geçerli?", answer: "Türkiye genelinde kullanılabilir." },
        ],
      },
      "online-siparis-nasil-verilir": {
        title: "Yekpare'de Online Sipariş Nasıl Verilir?",
        description: "Yekpare sipariş modülünde işletme seçimi, menüden ürün ekleme ve teslimat ile sipariş verme.",
        faq: [
          { question: "Minimum sipariş tutarı var mı?", answer: "İşletmeye göre değişir." },
        ],
      },
      "isletme-kesfet-rehberi": {
        title: "Yekpare Keşfet: İşletme Bulma Rehberi",
        description: "Harita ve arama ile restoran, mağaza ve hizmet işletmelerini keşfetme rehberi.",
        faq: [
          { question: "Keşfet URL formatı nedir?", answer: "yekpare.net/kesfet/{isletme-slug}" },
        ],
      },
      "ai-cagri-merkezi-nedir": {
        title: "Yekpare AI ve AI Çağrı Merkezi Nedir?",
        description: "Yekpare AI asistanı ve işletmeler için yapay zeka destekli çağrı merkezi hizmeti.",
        faq: [
          { question: "Yekpare AI ücretsiz mi?", answer: "Evet, site ziyaretçileri için ücretsizdir." },
        ],
      },
      "isletme-sayfasi-ozel-domain": {
        title: "İşletme Sayfası ve Özel Domain",
        description: "Yekpare işletme vitrinleri, mini web sitesi ve onaylı özel alan adı (custom domain) bağlama.",
        faq: [
          { question: "Özel domain nasıl bağlanır?", answer: "Servis sağlayıcı paneli → DNS doğrulama → yayına alma." },
        ],
      },
      "ulasim-kurye-taksi-cekici": {
        title: "Yekpare Ulaşım: Kurye, Taksi, Çekici",
        description: "Kurye, taksi, ortak yolculuk, çekici, nakliyat ve kargo talepleri. yekpare.net/ulasim",
        faq: [
          { question: "Taksi nasıl çağrılır?", answer: "yekpare.net/ulasim → Taksi → alış/varış konumu." },
        ],
      },
      "haber-merkezi-nedir": {
        title: "Yekpare Haber Merkezi Nedir?",
        description: "Bağımsız haber siteleri; özel domain ile white-label yayın altyapısı.",
        faq: [
          { question: "Haber sitesi nasıl açılır?", answer: "Yönetim panelinden Haber Siteleri bölümünden oluşturulur." },
        ],
      },
      "haritalar-nedir": {
        title: "Yekpare Haritalar Ne İşe Yarar?",
        description: "Konum bazlı işletme keşfi ve tam ekran harita deneyimi.",
        faq: [
          { question: "Haritalar URL?", answer: "yekpare.net/haritalar ve yekpare.net/kesfet" },
        ],
      },
    };
    const mBilgi = /^\/bilgi\/([^/]+)$/.exec(path);
    if (mBilgi) {
      const bilgiSlug = safeDecode(mBilgi[1] ?? "").trim();
      const bp = BILGI_PAGES[bilgiSlug];
      if (!bp) {
        res.status(404).type("text/plain").send("not found");
        return;
      }
      const bPath = `/bilgi/${encodeURIComponent(bilgiSlug)}`;
      res.status(200).type("html").send(
        shellHtml({
          origin,
          path: bPath,
          title: `${bp.title} — Yekpare`,
          description: bp.description,
          image: `${origin.replace(/\/+$/, "")}/opengraph.jpg`,
          siteName: "Yekpare",
          jsonLd: faqPageJsonLd(bp.faq),
        }),
      );
      return;
    }

    res.status(404).type("text/plain").send("unsupported path");
  } catch {
    res.status(500).type("text/plain").send("error");
  }
});

export default router;
