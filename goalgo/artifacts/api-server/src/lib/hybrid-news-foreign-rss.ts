import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import type { PortalRssItem } from "./portal-rss-fetch.js";

/** Editörün vitrininde tanımlı site/kutu feed id’leri — yabancı-only filtreden muaf. */
export function isHmConfiguredSiteRssFeedId(feedId: string): boolean {
  return /^hm-\d+-(site|box)-/i.test(String(feedId ?? "").trim());
}

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

/** Editör / newsmap — yalnızca yurtdışı RSS (TR yerel hariç). Site/kutu feed’leri muaf. */
export function filterForeignOnlyPortalHybridRssFeeds(
  feeds: PortalHybridRssFeedConfig[],
): PortalHybridRssFeedConfig[] {
  return feeds.filter((feed) => {
    const feedId = String(feed.id ?? "").trim();
    if (isHmConfiguredSiteRssFeedId(feedId)) return true;

    const cc = normalizeHybridRssCountryCode(feed.countryCode);
    const regionKey = String(feed.regionKey ?? "").trim().toLowerCase();
    const slug = normalizeHybridRssCategorySlug(feed.categorySlug);

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

/** RSS önbellek satırları — site içi feed muaf; TR yerel yekpare havuzu elenir. */
export function filterForeignOnlyPortalRssItems(
  items: PortalRssItem[],
  feedGeoById: PortalRssGeoLookup = {},
): PortalRssItem[] {
  return items.filter((item) => {
    const feedId = String(item.feedId ?? "").trim();
    if (isHmConfiguredSiteRssFeedId(feedId)) return true;

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
