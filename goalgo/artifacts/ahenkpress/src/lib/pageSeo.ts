/** Tarayıcı / istemci tarafı sosyal önizleme ve arama snippet’i. Not: WhatsApp vb. bazı botlar yalnızca ilk HTML’i okur; tam uyum için SSR veya edge OG şablonu gerekir. */

import { hmPwaManifestApiPath } from "@/lib/hmPublicLinks";
import {
  PORTAL_BRAND_SHORT,
  PORTAL_ORIGIN,
  PORTAL_SEARCH_TAGLINE,
  PORTAL_SITE_FULL_TITLE,
  PORTAL_SITE_NAME,
  PORTAL_SITE_TITLE_SUFFIX,
  normalizePortalDisplayName,
} from "@/lib/portalBrand";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { KESFET_HUB_HERO_SUBTITLE } from "@/lib/kesfetDiscoverHub";

const DEFAULT_ORIGIN = PORTAL_ORIGIN;
const DEFAULT_OG_IMAGE = `${DEFAULT_ORIGIN}/opengraph.jpg`;

const DEFAULT_TAGLINE = PORTAL_SEARCH_TAGLINE;

export { PORTAL_SEARCH_TAGLINE };

export type PortalSeoSettings = {
  siteName?: string | null;
  tagline?: string | null;
};

let cachedPortalSeoSettings: PortalSeoSettings | null = null;

export function cachePortalSeoSettings(settings: PortalSeoSettings | null | undefined): void {
  cachedPortalSeoSettings = settings
    ? {
        siteName: settings.siteName ?? null,
        tagline: settings.tagline ?? null,
      }
    : null;
}

function portalSeoDefaults(settings?: PortalSeoSettings | null) {
  const siteName = normalizePortalDisplayName(settings?.siteName) || PORTAL_SITE_NAME;
  const rawTagline = settings?.tagline?.trim();
  const tagline =
    rawTagline && !/süper\s*app|super\s*app|süper\s*uygulama|tek\s*platform/i.test(rawTagline)
      ? rawTagline
      : PORTAL_SEARCH_TAGLINE;
  const title = PORTAL_SITE_FULL_TITLE;
  const ogSiteName = siteName || PORTAL_BRAND_SHORT;
  const siteHost = portalSeoHost();
  const siteTail = ` ${siteName} — ${siteHost}`;
  return { siteName, tagline, title, ogSiteName, siteTail };
}

function portalSeoHost(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname.replace(/^www\./i, "");
  }
  try {
    return new URL(DEFAULT_ORIGIN).hostname.replace(/^www\./i, "");
  } catch {
    return "yekpare.net";
  }
}

export function applyPortalSiteSeo(settings?: PortalSeoSettings | null): void {
  if (typeof document === "undefined") return;
  const d = portalSeoDefaults(settings);
  document.title = d.title;
  upsertMeta("name", "title", d.title);
  upsertMeta("name", "description", d.tagline);
  upsertMeta("name", "geo.region", "TR");
  upsertMeta("name", "geo.placename", "Türkiye");
  upsertMeta("property", "og:title", d.title);
  upsertMeta("property", "og:description", d.tagline);
  upsertMeta("property", "og:url", `${origin()}/`);
  upsertMeta("property", "og:image", DEFAULT_OG_IMAGE);
  upsertMeta("property", "og:site_name", d.ogSiteName);
  upsertMeta("name", "twitter:title", d.title);
  upsertMeta("name", "twitter:description", d.tagline);
  upsertMeta("name", "twitter:image", DEFAULT_OG_IMAGE);
  upsertMeta("name", "twitter:url", `${origin()}/`);
  const link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (link) link.href = `${origin()}/`;
}

function siteTailForShare(settings?: PortalSeoSettings | null): string {
  return portalSeoDefaults(settings ?? cachedPortalSeoSettings).siteTail;
}

const SITE_TAIL = ` ${PORTAL_SITE_NAME} — ${portalSeoHost()}`;

const HTML_DEFAULT = {
  title: PORTAL_SITE_FULL_TITLE,
  description: DEFAULT_TAGLINE,
};

export type HmSeoVerification = {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  customMetaTags?: { name: string; content: string }[];
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const sel = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function appendManagedHmVerificationMeta(name: string, content: string) {
  document.head.querySelectorAll('meta[data-yekpare-verification="portal"]').forEach((el) => el.remove());
  document.head.querySelectorAll(`meta[name="${name}"]`).forEach((el) => el.remove());
  const el = document.createElement("meta");
  el.setAttribute("name", name);
  el.setAttribute("content", content);
  el.setAttribute("data-hm-verification", "1");
  document.head.appendChild(el);
}

export function applyHmSiteVerificationMeta(v: HmSeoVerification | null | undefined): void {
  if (typeof document === "undefined") return;
  document.head.querySelectorAll('meta[data-hm-verification="1"]').forEach((el) => el.remove());
  document.head.querySelectorAll('meta[data-yekpare-verification="portal"]').forEach((el) => el.remove());

  const google = String(v?.googleSiteVerification ?? "").trim();
  const bing = String(v?.bingSiteVerification ?? "").trim();
  const yandex = String(v?.yandexVerification ?? "").trim();
  if (google) appendManagedHmVerificationMeta("google-site-verification", google);
  if (bing) appendManagedHmVerificationMeta("msvalidate.01", bing);
  if (yandex) appendManagedHmVerificationMeta("yandex-verification", yandex);

  for (const tag of v?.customMetaTags ?? []) {
    const name = String(tag.name ?? "").trim();
    const content = String(tag.content ?? "").trim();
    if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name) || !content) continue;
    appendManagedHmVerificationMeta(name, content);
  }
}

export function applyHmCategoryRssLink(title: string, href: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const id = "hm-category-rss-feed";
  const existing = document.head.querySelector(`link[data-hm-rss="${id}"]`) as HTMLLinkElement | null;
  const cleanHref = String(href ?? "").trim();
  if (!cleanHref) {
    existing?.remove();
    return;
  }
  const link = existing ?? document.createElement("link");
  link.rel = "alternate";
  link.type = "application/rss+xml";
  link.title = title;
  link.href = cleanHref;
  link.setAttribute("data-hm-rss", id);
  if (!existing) document.head.appendChild(link);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Kısa, tek satırlık özet (HTML veya düz metin). */
export function seoPlainSnippet(raw: string | null | undefined, maxLen = 180): string {
  const t = stripHtml(String(raw ?? "")).replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function origin(): string {
  if (typeof window === "undefined") return DEFAULT_ORIGIN;
  return window.location.origin || DEFAULT_ORIGIN;
}

function absUrl(pathOrUrl: string, imageUrl?: string | null, baseOrigin = origin()): string {
  const u = String(imageUrl ?? "").trim();
  if (!u) return DEFAULT_OG_IMAGE;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = (baseOrigin || origin()).replace(/\/+$/, "");
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

/** HM paylaşım görseli — site logosu; Yekpare opengraph.jpg kullanılmaz. */
function hmShareImageUrl(baseOrigin: string, ...candidates: (string | null | undefined)[]): string {
  const base = baseOrigin.replace(/\/+$/, "");
  for (const raw of candidates) {
    const u = String(raw ?? "").trim();
    if (!u) continue;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `${base}${u.startsWith("/") ? u : `/${u}`}`;
  }
  return `${base}/apple-touch-icon.png`;
}

/**
 * Paylaşım ve Google snippet’inde önce işletme/ürün tanıtımı; Yekpare ifadesi açıklamanın en sonunda.
 */
export function applySocialShareMeta(opts: {
  title: string;
  /** İşletme veya sayfa tanıtımı (Yekpare eklenmez — fonksiyon sona ekler). */
  descriptionPrimary: string;
  canonicalPath: string;
  imageUrl?: string | null;
}): void {
  if (typeof document === "undefined") return;
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${origin()}${path}`;
  let primary = seoPlainSnippet(opts.descriptionPrimary, 220);
  if (!primary) primary = opts.title;
  const fullDesc = `${primary}${siteTailForShare()}`.slice(0, 320);

  document.title = opts.title;

  upsertMeta("name", "title", opts.title);
  upsertMeta("name", "description", fullDesc);

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:title", opts.title);
  upsertMeta("property", "og:description", fullDesc);
  upsertMeta("property", "og:image", absUrl(path, opts.imageUrl));
  upsertMeta("property", "og:locale", "tr_TR");
  upsertMeta("property", "og:site_name", PORTAL_BRAND_SHORT);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:url", url);
  upsertMeta("name", "twitter:title", opts.title);
  upsertMeta("name", "twitter:description", fullDesc);
  upsertMeta("name", "twitter:image", absUrl(path, opts.imageUrl));

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

function upsertLink(rel: string, href: string, extra?: { sizes?: string; type?: string; id?: string }) {
  const id = extra?.id ?? rel;
  let el = document.head.querySelector(`link[data-hm-branding="${id}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("data-hm-branding", id);
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (extra?.sizes) el.setAttribute("sizes", extra.sizes);
  else el.removeAttribute("sizes");
  if (extra?.type) el.type = extra.type;
  else el.removeAttribute("type");
}

function syncExistingBrowserIcons(href: string): void {
  if (!href) return;
  document.head
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((node) => {
      const link = node as HTMLLinkElement;
      link.href = href;
    });
}

/** Tek manifest linki — index.html'deki Yekpare `/manifest.json` çift kaydı ve yanlış sıra önlenir. */
function upsertHmManifestLink(href: string): void {
  const links = Array.from(document.head.querySelectorAll('link[rel="manifest"]')) as HTMLLinkElement[];
  let primary = links[0] ?? null;
  for (let i = 1; i < links.length; i += 1) {
    links[i]?.remove();
  }
  if (!primary) {
    primary = document.createElement("link");
    primary.rel = "manifest";
    document.head.appendChild(primary);
  }
  primary.href = href;
  primary.setAttribute("data-hm-branding", "manifest");
}

/** HM sitesinde sekme ikonu / PWA manifest — logo varsa Yekpare varsayılanı yerine site logosu. */
export function applyHmSiteBranding(opts: {
  logoUrl?: string | null;
  siteOrigin?: string | null;
  /** Özel alan vekili için manifest sorgusu (örn. ankarasehirgazetesi.com). */
  domain?: string | null;
  /** PWA yükleme diyaloğu kısa adı (`apple-mobile-web-app-title`). */
  siteDisplayName?: string | null;
}): void {
  if (typeof document === "undefined") return;
  const base =
    typeof opts.siteOrigin === "string" && opts.siteOrigin.trim().length > 0
      ? opts.siteOrigin.trim().replace(/\/+$/, "")
      : origin();
  const logo = String(opts.logoUrl ?? "").trim();
  const iconHref = logo ? absUrl("/", logo, base) : null;
  const manifestPath = hmPwaManifestApiPath(opts.domain ?? null);

  upsertHmManifestLink(`${base}${manifestPath}`);

  const displayName = String(opts.siteDisplayName ?? "").trim();
  if (displayName) {
    upsertMeta("name", "apple-mobile-web-app-title", displayName);
  }

  if (iconHref) {
    upsertLink("icon", iconHref, { sizes: "192x192", type: "image/png", id: "icon-192" });
    upsertLink("icon", iconHref, { sizes: "48x48", type: "image/png", id: "icon-48" });
    upsertLink("apple-touch-icon", iconHref, { sizes: "180x180", id: "apple-touch" });
    syncExistingBrowserIcons(iconHref);
    return;
  }

  upsertLink("icon", `${base}/icon-192.svg`, { sizes: "192x192", type: "image/svg+xml", id: "icon-192" });
  upsertLink("icon", `${base}/favicon-48.png`, { sizes: "48x48", type: "image/png", id: "icon-48" });
  upsertLink("apple-touch-icon", `${base}/apple-touch-icon.png`, { sizes: "180x180", id: "apple-touch" });
  syncExistingBrowserIcons(`${base}/favicon-48.png`);
}

/** Haber merkezi vitrin / özel alan: tarayıcı sekmesi ve OG’de site adı (Yekpare şablonu yok). */
export function applyHmNewsSiteHomeMeta(opts: {
  siteName: string;
  description?: string | null;
  canonicalPath: string;
  /** Özel alan adı kökeni; yoksa `origin()` kullanılır. */
  canonicalOrigin?: string | null;
  /** Varsayılan: `${siteName} — Haber` */
  browserTitle?: string | null;
  /** Site logosu veya sayfaya özel görsel. Boşsa Yekpare varsayılan görseli son çare olarak kullanılır. */
  imageUrl?: string | null;
  /** Site logosu; sekme ikonu boşsa varsayılan olarak bu kullanılır. */
  logoUrl?: string | null;
  /** Sekme ikonu; boşsa `logoUrl`, o da boşsa `imageUrl` kullanılır. */
  faviconUrl?: string | null;
}): void {
  if (typeof document === "undefined") return;
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const base =
    typeof opts.canonicalOrigin === "string" && opts.canonicalOrigin.trim().length > 0
      ? opts.canonicalOrigin.trim().replace(/\/+$/, "")
      : origin();
  const url = `${base}${path}`;
  const primary = seoPlainSnippet(opts.description ?? opts.siteName, 220) || opts.siteName;
  const title = (opts.browserTitle != null && String(opts.browserTitle).trim().length > 0
    ? String(opts.browserTitle).trim()
    : `${opts.siteName} — Haber`);
  const image = hmShareImageUrl(base, opts.imageUrl, opts.logoUrl, opts.faviconUrl);

  let manifestDomain: string | null = null;
  try {
    manifestDomain = new URL(base).hostname.replace(/^www\./, "");
  } catch {
    manifestDomain = null;
  }
  const tabIcon =
    (opts.faviconUrl != null && String(opts.faviconUrl).trim().length > 0
      ? String(opts.faviconUrl).trim()
      : null) ??
    (opts.logoUrl != null && String(opts.logoUrl).trim().length > 0 ? String(opts.logoUrl).trim() : null) ??
    opts.imageUrl;
  applyHmSiteBranding({ logoUrl: tabIcon, siteOrigin: base, domain: manifestDomain, siteDisplayName: opts.siteName });

  document.title = title;
  upsertMeta("name", "title", title);
  upsertMeta("name", "description", primary.slice(0, 320));

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", primary.slice(0, 300));
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:locale", "tr_TR");
  upsertMeta("property", "og:site_name", opts.siteName);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:url", url);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", primary.slice(0, 200));
  upsertMeta("name", "twitter:image", image);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;

  upsertHmGeoMeta();
  applyHmPublisherStructuredData({
    siteName: opts.siteName,
    siteUrl: base,
    siteDescription: opts.description,
    logoUrl: opts.logoUrl ?? opts.faviconUrl ?? opts.imageUrl,
  });
}

/** Türkiye GEO meta — HM sitelerinde portal varsayılanının üzerine yazar. */
export function upsertHmGeoMeta(): void {
  if (typeof document === "undefined") return;
  upsertMeta("name", "geo.region", "TR");
  upsertMeta("name", "geo.placename", "Türkiye");
}

/** Google site logosu / AI atıfı — Organization + WebSite + Haber Merkezi yazılımı. */
export function applyHmPublisherStructuredData(opts: {
  siteName: string;
  siteUrl: string;
  siteDescription?: string | null;
  logoUrl?: string | null;
}): void {
  if (typeof document === "undefined") return;
  const base = opts.siteUrl.replace(/\/+$/, "");
  const logo = hmShareImageUrl(base, opts.logoUrl);
  document.head.querySelectorAll('script[data-yekpare-portal-jsonld="1"]').forEach((el) => el.remove());
  applyJsonLd(
    [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: opts.siteName,
        url: base,
        logo: { "@type": "ImageObject", url: logo, width: 512, height: 512 },
        image: logo,
        description: seoPlainSnippet(opts.siteDescription ?? opts.siteName, 300) || undefined,
        areaServed: { "@type": "Country", name: "Türkiye" },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: opts.siteName,
        url: base,
        publisher: { "@id": `${base}/#organization` },
        inLanguage: "tr-TR",
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Yekpare Haber Merkezi",
        applicationCategory: "NewsApplication",
        operatingSystem: "Web",
        url: "https://yekpare.net/bilgi/haber-merkezi-nedir",
        description:
          "Bu site Yekpare Haber Merkezi white-label haber yayın yazılımı ile yönetilmektedir.",
        author: {
          "@type": "Organization",
          name: "Ahenk Bilgi Teknolojileri",
          url: "https://ahenk.net.tr",
        },
        isPartOf: {
          "@type": "WebApplication",
          name: "Yekpare",
          url: "https://yekpare.net",
        },
      },
    ],
    "publisher",
  );
}

/** Haber merkezi haber detayı — sekme başlığı ve OG. */
export function applyHmNewsArticleMeta(opts: {
  siteName: string;
  articleTitle: string;
  description?: string | null;
  canonicalPath: string;
  canonicalOrigin?: string | null;
  imageUrl?: string | null;
  siteIconUrl?: string | null;
}): void {
  if (typeof document === "undefined") return;
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const base =
    typeof opts.canonicalOrigin === "string" && opts.canonicalOrigin.trim().length > 0
      ? opts.canonicalOrigin.trim().replace(/\/+$/, "")
      : origin();
  const url = `${base}${path}`;
  const primary = seoPlainSnippet(opts.description ?? opts.articleTitle, 220) || opts.articleTitle;
  const title = `${opts.articleTitle} · ${opts.siteName}`;
  let manifestDomain: string | null = null;
  try {
    manifestDomain = new URL(base).hostname.replace(/^www\./, "");
  } catch {
    manifestDomain = null;
  }
  applyHmSiteBranding({
    logoUrl: opts.siteIconUrl ?? null,
    siteOrigin: base,
    domain: manifestDomain,
    siteDisplayName: opts.siteName,
  });

  document.title = title;
  upsertMeta("name", "title", title);
  upsertMeta("name", "description", primary.slice(0, 320));

  upsertMeta("property", "og:type", "article");
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:title", opts.articleTitle);
  upsertMeta("property", "og:description", primary.slice(0, 300));
  const shareImage = hmShareImageUrl(base, opts.imageUrl, opts.siteIconUrl);
  upsertMeta("property", "og:image", shareImage);
  upsertMeta("property", "og:locale", "tr_TR");
  upsertMeta("property", "og:site_name", opts.siteName);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:url", url);
  upsertMeta("name", "twitter:title", opts.articleTitle);
  upsertMeta("name", "twitter:description", primary.slice(0, 200));
  upsertMeta("name", "twitter:image", shareImage);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function applyProductStructuredData(opts: {
  name: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  sku?: string | null;
  brand?: string | null;
  price?: number | null;
  salePrice?: number | null;
  availability?: "InStock" | "OutOfStock";
  sellerName?: string | null;
  sellerUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}): void {
  if (typeof document === "undefined") return;
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const price = opts.salePrice != null && opts.salePrice > 0 ? opts.salePrice : opts.price;
  const image = opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined;
  applyJsonLd(
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: opts.name,
      url,
      description: seoPlainSnippet(opts.description ?? opts.name, 500) || undefined,
      image,
      sku: opts.sku?.trim() || undefined,
      brand: opts.brand?.trim() ? { "@type": "Brand", name: opts.brand.trim() } : undefined,
      inLanguage: "tr-TR",
      ...(price != null && price > 0
        ? {
            offers: {
              "@type": "Offer",
              price: price.toFixed(2),
              priceCurrency: "TRY",
              availability: `https://schema.org/${opts.availability ?? "InStock"}`,
              url,
              seller: opts.sellerName?.trim()
                ? { "@type": "Organization", name: opts.sellerName.trim(), url: opts.sellerUrl ?? undefined }
                : undefined,
            },
          }
        : {}),
      ...(opts.rating != null && opts.rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(opts.rating).toFixed(1),
              reviewCount: Math.max(0, Number(opts.reviewCount ?? 0)),
              bestRating: "5",
              worstRating: "1",
            },
          }
        : {}),
    },
    "product",
  );
}

/** Schema.org JSON-LD — Google ve yapay zeka özetleri için istemci tarafı. */
export function applyJsonLd(
  data: Record<string, unknown> | Record<string, unknown>[] | null,
  scope = "page",
): void {
  if (typeof document === "undefined") return;
  const selector =
    data == null && scope === "page"
      ? 'script[data-yekpare-jsonld]'
      : `script[data-yekpare-jsonld="${scope}"]`;
  document.head.querySelectorAll(selector).forEach((el) => el.remove());
  if (!data) return;
  const payload = Array.isArray(data) ? data : [data];
  for (const item of payload) {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-yekpare-jsonld", scope);
    el.textContent = JSON.stringify(item);
    document.head.appendChild(el);
  }
}

export type BreadcrumbItem = { name: string; path: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  const base = origin().replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => {
      const p = item.path.startsWith("/") ? item.path : `/${item.path}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: seoPlainSnippet(item.name, 120),
        item: `${base}${p}`,
      };
    }),
  };
}

function applyJsonLdWithBreadcrumbs(primary: Record<string, unknown>, breadcrumbs?: BreadcrumbItem[]): void {
  if (breadcrumbs?.length) applyJsonLd([primary, buildBreadcrumbJsonLd(breadcrumbs)]);
  else applyJsonLd(primary);
}

export function applyVendorStructuredData(opts: {
  name: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  isShop?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const schemaType = opts.isShop ? "Store" : "Restaurant";
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${url}#business`,
    name: opts.name,
    url,
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
    telephone: opts.phone?.trim() || undefined,
    address: opts.address?.trim()
      ? {
          "@type": "PostalAddress",
          streetAddress: opts.address.trim(),
          addressLocality: opts.district?.trim() || opts.city?.trim() || undefined,
          addressRegion: opts.city?.trim() || undefined,
          addressCountry: "TR",
        }
      : undefined,
  };
  if (opts.lat != null && opts.lng != null && Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
    ld.geo = { "@type": "GeoCoordinates", latitude: opts.lat, longitude: opts.lng };
  }
  if (opts.rating != null && Number(opts.rating) > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(opts.rating).toFixed(1),
      reviewCount: Math.max(0, Number(opts.reviewCount ?? 0)),
      bestRating: "5",
      worstRating: "1",
    };
  }
  applyJsonLdWithBreadcrumbs(ld, opts.breadcrumbs);
}

export function applyNewsArticleStructuredData(opts: {
  headline: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  authorName?: string | null;
  publisherName?: string;
  publisherUrl?: string | null;
  publisherLogoUrl?: string | null;
}): void {
  const base = (opts.publisherUrl?.trim() || origin()).replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const publisherLogo = opts.publisherLogoUrl
    ? absUrl(path, opts.publisherLogoUrl, base)
    : `${base}/icon-512.png`;
  applyJsonLd(
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "@id": `${base}${path}#article`,
      headline: seoPlainSnippet(opts.headline, 200),
      description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
      image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
      datePublished: opts.datePublished != null ? new Date(opts.datePublished).toISOString() : undefined,
      dateModified:
        opts.dateModified != null
          ? new Date(opts.dateModified).toISOString()
          : opts.datePublished != null
            ? new Date(opts.datePublished).toISOString()
            : undefined,
      author: opts.authorName?.trim()
        ? { "@type": "Person", name: opts.authorName.trim() }
        : { "@type": "Organization", name: opts.publisherName?.trim() || PORTAL_BRAND_SHORT },
      publisher: {
        "@type": "Organization",
        name: opts.publisherName?.trim() || PORTAL_BRAND_SHORT,
        url: base,
        logo: { "@type": "ImageObject", url: publisherLogo, width: 512, height: 512 },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${base}${path}` },
      inLanguage: "tr-TR",
    },
    "article",
  );
}

export function applyMapBusinessStructuredData(opts: {
  name: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name: opts.name,
    url,
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
    telephone: opts.phone?.trim() || undefined,
  };
  if (opts.lat != null && opts.lng != null && Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
    ld.geo = { "@type": "GeoCoordinates", latitude: opts.lat, longitude: opts.lng };
  }
  if (opts.rating != null && Number(opts.rating) > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(opts.rating).toFixed(1),
      reviewCount: Math.max(0, Number(opts.reviewCount ?? 0)),
      bestRating: "5",
      worstRating: "1",
    };
  }
  applyJsonLd(ld);
}

export function applyEncyclopediaArticleStructuredData(opts: {
  headline: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  applyJsonLd({
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${base}${path}#article`,
    headline: seoPlainSnippet(opts.headline, 200),
    name: seoPlainSnippet(opts.headline, 200),
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
    url: `${base}${path}`,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: BILGI_AGACI_DISPLAY_NAME, url: `${base}/bilgiagaci` },
    publisher: { "@type": "Organization", name: PORTAL_BRAND_SHORT, url: base },
  });
}

export function applyTourismStructuredData(opts: {
  title: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  listingType?: string | null;
  city?: string | null;
  price?: number | null;
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const t = String(opts.listingType ?? "hotel").toLowerCase();
  const schemaType =
    t === "hotel" || t === "villa" ? "LodgingBusiness" : t === "tour" ? "TouristTrip" : "LocalBusiness";
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${url}#listing`,
    name: opts.title,
    url,
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
  };
  if (opts.city?.trim()) {
    ld.address = { "@type": "PostalAddress", addressLocality: opts.city.trim(), addressCountry: "TR" };
  }
  if (opts.price != null && Number(opts.price) > 0) {
    ld.offers = { "@type": "Offer", price: Number(opts.price), priceCurrency: "TRY", url };
  }
  applyJsonLd(ld);
}

export function applyBlogListStructuredData(opts: {
  name: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  posts?: Array<{ path: string; headline: string; datePublished?: string | Date | null }>;
  breadcrumbs?: BreadcrumbItem[];
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    name: seoPlainSnippet(opts.name, 200),
    url,
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: PORTAL_BRAND_SHORT, url: base },
  };
  if (opts.posts?.length) {
    ld.blogPost = opts.posts.slice(0, 20).map((p) => {
      const pPath = p.path.startsWith("/") ? p.path : `/${p.path}`;
      return {
        "@type": "BlogPosting",
        headline: seoPlainSnippet(p.headline, 200),
        url: `${base}${pPath}`,
        datePublished: p.datePublished != null ? new Date(p.datePublished).toISOString() : undefined,
      };
    });
  }
  applyJsonLdWithBreadcrumbs(ld, opts.breadcrumbs);
}

export function applyCollectionPageStructuredData(opts: {
  name: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  items?: Array<{ name: string; path: string; description?: string | null }>;
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    name: seoPlainSnippet(opts.name, 200),
    url,
    description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
    image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: PORTAL_BRAND_SHORT, url: base },
  };
  if (opts.items?.length) {
    ld.mainEntity = {
      "@type": "ItemList",
      itemListElement: opts.items.slice(0, 12).map((item, i) => {
        const itemPath = item.path.startsWith("/") ? item.path : `/${item.path}`;
        return {
          "@type": "ListItem",
          position: i + 1,
          name: seoPlainSnippet(item.name, 120),
          url: `${base}${itemPath}`,
          description: item.description ? seoPlainSnippet(item.description, 200) : undefined,
        };
      }),
    };
  }
  applyJsonLd(ld);
}

export function applyBlogPostStructuredData(opts: {
  headline: string;
  description?: string | null;
  canonicalPath: string;
  imageUrl?: string | null;
  datePublished?: string | Date | null;
  authorName?: string | null;
  breadcrumbs?: BreadcrumbItem[];
}): void {
  const base = origin().replace(/\/+$/, "");
  const path = opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`;
  const url = `${base}${path}`;
  const pub = opts.datePublished != null ? new Date(opts.datePublished).toISOString() : undefined;
  applyJsonLdWithBreadcrumbs(
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#post`,
      headline: seoPlainSnippet(opts.headline, 200),
      description: seoPlainSnippet(opts.description ?? "", 500) || undefined,
      image: opts.imageUrl ? absUrl(path, opts.imageUrl, base) : undefined,
      datePublished: pub,
      dateModified: pub,
      url,
      author: opts.authorName?.trim() ? { "@type": "Organization", name: opts.authorName.trim() } : undefined,
      publisher: { "@type": "Organization", name: opts.authorName?.trim() || PORTAL_BRAND_SHORT, url: base },
      inLanguage: "tr-TR",
    },
    opts.breadcrumbs,
  );
}

export function applyFaqStructuredData(items: Array<{ question: string; answer: string }>): void {
  if (!items.length) return;
  applyJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}

export type YekpareServiceSchemaItem = {
  name: string;
  path: string;
  description: string;
  serviceType?: string;
};

/** Yekpare.net Organization + WebSite + Service grafiği (GEO / marka sorguları). */
export function buildYekpareOrganizationJsonLd(baseOrigin?: string): Record<string, unknown> {
  const base = (baseOrigin ?? origin()).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: PORTAL_BRAND_SHORT,
    alternateName: ["Yekpare Arama Motoru", "Yekpare.net", "yekpare.net"],
    url: base,
    logo: { "@type": "ImageObject", url: `${base}/icon-512.png` },
    description:
      "Türkiye'nin yerli arama motoru. Haber, video, harita, sipariş, alışveriş, firma rehberi ve turizm hizmetlerini tek aramada keşfedin.",
    areaServed: { "@type": "Country", name: "Türkiye" },
    address: { "@type": "PostalAddress", addressCountry: "TR" },
    foundingLocation: { "@type": "Place", name: "Türkiye" },
    parentOrganization: {
      "@type": "Organization",
      name: "Ahenk Bilgi Teknolojileri",
      url: "https://ahenk.net.tr",
    },
    knowsAbout: [
      "online yemek siparişi",
      "market siparişi",
      "e-ticaret alışveriş",
      "turizm rezervasyonu",
      "kurye ve taksi",
      "çekici ve nakliye",
      "harita ve işletme keşfi",
      "haber portalı",
      "haber merkezi",
      "işletme özel domain",
      "bilgi ağacı",
      "ansiklopedi",
      "yapay zeka asistanı",
      "ai çağrı merkezi",
    ],
  };
}

export function buildYekpareWebSiteJsonLd(baseOrigin?: string): Record<string, unknown> {
  const base = (baseOrigin ?? origin()).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: PORTAL_BRAND_SHORT,
    alternateName: "Yekpare Arama Motoru",
    url: base,
    inLanguage: "tr-TR",
    publisher: { "@id": `${base}/#organization` },
    about: { "@id": `${base}/#organization` },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/ara?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
      {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/haberler?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
      {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/kesfet?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    ],
  };
}

export function buildYekpareServiceJsonLd(
  item: YekpareServiceSchemaItem,
  baseOrigin?: string,
): Record<string, unknown> {
  const base = (baseOrigin ?? origin()).replace(/\/+$/, "");
  const path = item.path.startsWith("/") ? item.path : `/${item.path}`;
  const url = `${base}${path}`;
  const slug = path.replace(/\//g, "-").replace(/^-|-$/g, "") || "service";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: item.name,
    serviceType: item.serviceType ?? item.name,
    url,
    description: seoPlainSnippet(item.description, 500),
    provider: { "@id": `${base}/#organization` },
    areaServed: { "@type": "Country", name: "Türkiye" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      serviceLocation: { "@type": "Country", name: "Türkiye" },
    },
    isRelatedTo: { "@id": `${base}/#website` },
    identifier: slug,
  };
}

export const YEKPARE_CORE_SERVICE_SCHEMA: YekpareServiceSchemaItem[] = [
  {
    name: "Yemek Siparişi",
    path: "/yemek",
    serviceType: "FoodDelivery",
    description: "Restoran ve paket servis işletmelerinden online yemek siparişi, teslimat ve sipariş takibi.",
  },
  {
    name: "Market Siparişi",
    path: "/market",
    serviceType: "GroceryDelivery",
    description: "Market ve gıda ürünleri siparişi, hızlı teslimat.",
  },
  {
    name: "Alışveriş",
    path: "/magaza",
    serviceType: "OnlineStore",
    description: "Çok satıcılı e-ticaret pazaryeri, mağaza vitrinleri ve ürün kataloğu.",
  },
  {
    name: "Seyahat ve Turizm",
    path: "/turizm",
    serviceType: "TravelAgency",
    description: "Otel, villa, tur ve araç kiralama ilanları; online rezervasyon talebi.",
  },
  {
    name: "Keşfet",
    path: "/kesfet",
    serviceType: "LocalBusinessDirectory",
    description: KESFET_HUB_HERO_SUBTITLE,
  },
  {
    name: "Haritalar",
    path: "/haritalar",
    serviceType: "MapService",
    description: "İnteraktif harita, konum arama ve tam ekran harita deneyimi.",
  },
  {
    name: "Haberler",
    path: "/haberler",
    serviceType: "NewsMediaOrganization",
    description: "Güncel haber akışı, kategoriler ve haber merkezi siteleri.",
  },
  {
    name: "Bilgi Ağacı",
    path: "/bilgiagaci",
    serviceType: "EducationalOrganization",
    description: "Bilgi Ağacı bilgi portalı; bilim, tarih, coğrafya, kültür ve günlük ansiklopedi maddeleri için konu keşfi.",
  },
  {
    name: "Ulaşım",
    path: "/ulasim",
    serviceType: "DeliveryService",
    description: "Kurye, taksi, ortak yolculuk, çekici, nakliyat ve kargo talepleri.",
  },
  {
    name: "Yekpare AI",
    path: "/ai-cagri-merkezi",
    serviceType: "CustomerService",
    description: "Yapay zeka asistanı ve işletmeler için AI çağrı merkezi.",
  },
  {
    name: "Haber Merkezi",
    path: "/habermerkezi",
    serviceType: "NewsMediaOrganization",
    description: "Bağımsız haber siteleri; özel domain ile white-label yayın.",
  },
  {
    name: "YekTube",
    path: "/yektube",
    serviceType: "VideoObject",
    description: "Video kanalları, canlı TV ve haber videoları.",
  },
  {
    name: "Firma Rehberi",
    path: "/firma-rehberi",
    serviceType: "LocalBusinessDirectory",
    description: "İşletme, ürün ve hizmet ilanları rehberi.",
  },
];

export function applyYekpareEntityGraph(opts?: {
  services?: YekpareServiceSchemaItem[];
  faq?: Array<{ question: string; answer: string }>;
  breadcrumbs?: BreadcrumbItem[];
  aboutPage?: { headline: string; description: string; canonicalPath: string };
}): void {
  const base = origin().replace(/\/+$/, "");
  const graph: Record<string, unknown>[] = [
    buildYekpareOrganizationJsonLd(base),
    buildYekpareWebSiteJsonLd(base),
    ...(opts?.services ?? YEKPARE_CORE_SERVICE_SCHEMA).map((s) => buildYekpareServiceJsonLd(s, base)),
  ];
  if (opts?.aboutPage) {
    const path = opts.aboutPage.canonicalPath.startsWith("/")
      ? opts.aboutPage.canonicalPath
      : `/${opts.aboutPage.canonicalPath}`;
    graph.push({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${base}${path}#page`,
      name: seoPlainSnippet(opts.aboutPage.headline, 200),
      description: seoPlainSnippet(opts.aboutPage.description, 500),
      url: `${base}${path}`,
      inLanguage: "tr-TR",
      isPartOf: { "@id": `${base}/#website` },
      about: { "@id": `${base}/#organization` },
      mainEntity: { "@id": `${base}/#organization` },
      publisher: { "@id": `${base}/#organization` },
    });
  }
  if (opts?.faq?.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${base}/#faq`,
      isPartOf: opts?.aboutPage
        ? {
            "@id": `${base}${opts.aboutPage.canonicalPath.startsWith("/") ? opts.aboutPage.canonicalPath : `/${opts.aboutPage.canonicalPath}`}#page`,
          }
        : { "@id": `${base}/#website` },
      mainEntity: opts.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  if (opts?.breadcrumbs?.length) {
    graph.push(buildBreadcrumbJsonLd(opts.breadcrumbs));
  }
  applyJsonLd(graph);
}

export function resetSeoToSiteDefaults(settings?: PortalSeoSettings | null): void {
  if (typeof document === "undefined") return;
  applyJsonLd(null);
  applyHmCategoryRssLink("", null);
  applyHmSiteVerificationMeta(null);
  applyPortalSiteSeo(settings ?? cachedPortalSeoSettings);
}
