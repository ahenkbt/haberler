import { decodeHtmlEntities } from "./decodeHtmlEntities.js";

/** Kullanıcıya gösterilen düz metin — HTML entity'leri çözümler. */
export function sanitizeDisplayText(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

/** API JSON yanıtlarında HTML entity decode uygulanacak alan adları (ahenkpress ile uyumlu). */
export const DISPLAY_TEXT_KEYS = new Set([
  "title",
  "name",
  "label",
  "spot",
  "excerpt",
  "summary",
  "categoryName",
  "displayName",
  "description",
  "feedLabel",
  "authorName",
  "regionLabel",
  "shortTitle",
  "heading",
  "latestTitle",
  "pageTitle",
  "menuLabel",
  "subtitle",
  "caption",
  "headline",
  "kicker",
  "lead",
  "teaser",
  "snippet",
  "businessName",
  "companyName",
  "storeName",
  "productName",
  "brandName",
  "channelName",
  "videoTitle",
  "itemTitle",
  "newsTitle",
  "announcementTitle",
  "seoTitle",
  "seoDescription",
  "metaDescription",
  "metaTitle",
  "question",
  "answer",
  "formattedAddress",
  "addressLine",
  "cityName",
  "districtName",
  "provinceName",
  "locationLabel",
  "placeName",
  "categoryLabel",
  "tagline",
  "slogan",
  "subject",
  "message",
  "contentText",
  "plainText",
  "text",
  "altText",
  "bannerText",
  "siteName",
  "siteDisplayName",
  "publisherName",
  "sourceName",
  "sourceLabel",
  "heroTitle",
  "heroSubtitle",
  "sectionTitle",
  "blockTitle",
  "cardTitle",
  "navLabel",
  "linkLabel",
  "buttonLabel",
  "exclusiveSiteName",
  "campaignTitle",
  "eventTitle",
  "listingTitle",
  "neighborhoodName",
  "districtLabel",
  "cityLabel",
  "provinceLabel",
  "countryLabel",
  "venueName",
  "serviceName",
  "moduleTitle",
  "widgetTitle",
  "tabLabel",
  "breadcrumbLabel",
  "groupTitle",
  "groupHeading",
]);

const STRING_ARRAY_TEXT_KEYS = new Set(["tags", "keywords", "labels"]);

/** JSON API yanıtlarında bilinen metin alanlarını temizler. */
export function sanitizeDisplayFields<T>(value: T, key?: string, depth = 0): T {
  if (depth > 16) return value;
  if (typeof value === "string") {
    if (key && DISPLAY_TEXT_KEYS.has(key)) {
      return sanitizeDisplayText(value) as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (key && STRING_ARRAY_TEXT_KEYS.has(key)) {
      return value.map((item) =>
        typeof item === "string" ? sanitizeDisplayText(item) : sanitizeDisplayFields(item, undefined, depth + 1),
      ) as T;
    }
    return value.map((item) => sanitizeDisplayFields(item, undefined, depth + 1)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDisplayFields(v, k, depth + 1);
    }
    return out as T;
  }
  return value;
}
