import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import type { PortalRssItem } from "./portal-rss-fetch.js";

/** Yekpare / NTV vb. yerel kategori akışları — editör ve haritada DB'den gelir, RSS'ten değil. */
const TURKISH_DOMESTIC_RSS_CATEGORY_SLUGS = new Set([
  "turkiye",
  "turkey",
  "gundem",
  "siyaset",
  "ekonomi",
  "spor",
  "yasam",
  "saglik",
  "teknoloji",
  "otomobil",
  "para",
  "egitim",
  "savunma-sanayi",
  "savunmasanayi",
  "kultur",
  "kultur-sanat",
  "magazin",
  "3-sayfa",
  "son-dakika",
  "sondakika",
]);

/** Yabancı dil haberler `global` kategorisinde; `dunya` Türkçe dünya kutusunda kalır. */
const FOREIGN_RSS_CATEGORY_SLUGS = new Set(["global", "world"]);

function normalizeHybridRssCountryCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

function normalizeHybridRssCategorySlug(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function isForeignHybridRssGeo(countryCode: string, regionKey: string): boolean {
  if (countryCode && countryCode !== "TR" && countryCode !== "CY") return true;
  if (regionKey.startsWith("global-")) return true;
  return false;
}

/** Editör / newsmap — yalnızca yurtdışı RSS feed'leri (TR + yerel kategoriler hariç). */
export function filterForeignOnlyPortalHybridRssFeeds(
  feeds: PortalHybridRssFeedConfig[],
): PortalHybridRssFeedConfig[] {
  return feeds.filter((feed) => {
    const cc = normalizeHybridRssCountryCode(feed.countryCode);
    const regionKey = String(feed.regionKey ?? "").trim().toLowerCase();
    const slug = normalizeHybridRssCategorySlug(feed.categorySlug);
    const feedId = String(feed.id ?? "").trim();

    if (cc === "TR" || cc === "CY") return false;
    if (regionKey.startsWith("tr-")) return false;
    if (FOREIGN_RSS_CATEGORY_SLUGS.has(slug)) return true;
    if (isForeignHybridRssGeo(cc, regionKey)) return true;
    if (feedId.startsWith("gmn-")) return true;
    if (TURKISH_DOMESTIC_RSS_CATEGORY_SLUGS.has(slug)) return false;
    return false;
  });
}

type PortalRssGeoLookup = Record<
  string,
  {
    countryCode?: string | null;
    regionKey?: string | null;
  } | null
>;

/** RSS önbellek satırları — Türkiye / Türkçe yerel akışları editör DB'sinden gelir. */
export function filterForeignOnlyPortalRssItems(
  items: PortalRssItem[],
  feedGeoById: PortalRssGeoLookup = {},
): PortalRssItem[] {
  return items.filter((item) => {
    const feedId = String(item.feedId ?? "").trim();
    const geo = feedGeoById[feedId];
    const cc = normalizeHybridRssCountryCode(geo?.countryCode);
    const regionKey = String(geo?.regionKey ?? "").trim().toLowerCase();
    const slug = normalizeHybridRssCategorySlug(item.categorySlug);

    if (cc === "TR" || cc === "CY") return false;
    if (regionKey.startsWith("tr-")) return false;
    if (FOREIGN_RSS_CATEGORY_SLUGS.has(slug)) return true;
    if (isForeignHybridRssGeo(cc, regionKey)) return true;
    if (feedId.startsWith("gmn-")) return true;
    if (TURKISH_DOMESTIC_RSS_CATEGORY_SLUGS.has(slug)) return false;
    return false;
  });
}
