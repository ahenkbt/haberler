import type { HmMapCityContentMatch, HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { normalizeHmMapCityKey } from "@/lib/hmMapCityNews";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { YEKPARE_NEWSMAP_PATH } from "@/lib/hmHaritalarRoutes";

/** Kanonik deep link sorgu anahtarı — `?news=…` */
export const NEWSMAP_DEEP_LINK_PARAM = "news";

/** Geriye dönük alias — `?highlight=…` */
export const NEWSMAP_DEEP_LINK_PARAM_ALT = "highlight";

export function parseNewsmapDeepLinkId(search: string): string | null {
  const raw = String(search ?? "").replace(/^\?/, "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const value = params.get(NEWSMAP_DEEP_LINK_PARAM) || params.get(NEWSMAP_DEEP_LINK_PARAM_ALT);
  return value?.trim() || null;
}

export function buildNewsmapDeepLinkHref(
  newsKey: string,
  opts?: { hmPublicHref?: (path: string) => string; basePath?: string },
): string {
  const basePath = opts?.basePath ?? YEKPARE_NEWSMAP_PATH;
  const base = opts?.hmPublicHref ? opts.hmPublicHref(basePath) : basePath;
  const params = new URLSearchParams();
  params.set(NEWSMAP_DEEP_LINK_PARAM, newsKey);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Anasayfa modülü / kart tıklaması için stabil anahtar (href tercih). */
export function newsmapDeepLinkKeyFromHeadline(headline: Pick<HmMapCityHeadline, "href" | "city" | "title">): string {
  const href = String(headline.href ?? "").trim();
  if (href) return href;
  return `${normalizeHmMapCityKey(headline.city)}::${headline.title}`;
}

export function headlineFromContentMatch(
  cityLabel: string,
  match: HmMapCityContentMatch,
  extras?: {
    countryCode?: string;
    flagEmoji?: string;
    isTurkish?: boolean;
    geoLat?: number;
    geoLng?: number;
  },
): HmMapCityHeadline {
  const countryCode = extras?.countryCode;
  return {
    city: cityLabel,
    title: match.title,
    href: match.href,
    publishedAt: match.publishedAt,
    kind: match.kind,
    thumbnail: match.thumbnail,
    videoId: match.videoId ?? undefined,
    sourceId: match.sourceId ?? undefined,
    countryCode,
    flagEmoji: extras?.flagEmoji ?? (countryCode ? countryCodeToFlagEmoji(countryCode) : undefined),
    isTurkish: extras?.isTurkish,
    geoLat: extras?.geoLat,
    geoLng: extras?.geoLng,
    spot: match.spot ?? null,
    content: match.content ?? null,
    source: match.source,
    rssSourceUrl: match.rssSourceUrl ?? null,
    originUrl: match.originUrl ?? null,
    sourceSiteUrl: match.sourceSiteUrl ?? null,
    publishedOnSiteId: match.publishedOnSiteId ?? null,
    sourceSiteSlug: match.sourceSiteSlug ?? null,
    feedLabel: match.feedLabel ?? null,
  };
}

export function findNewsmapHeadlineByDeepLinkId(
  id: string,
  headlines: HmMapCityHeadline[],
): HmMapCityHeadline | null {
  const raw = String(id ?? "").trim();
  if (!raw || headlines.length === 0) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const candidates = new Set([raw, decoded]);
  for (const headline of headlines) {
    if (candidates.has(headline.href)) return headline;
    if (candidates.has(newsmapDeepLinkKeyFromHeadline(headline))) return headline;
  }

  const norm = normalizeHmMapCityKey(decoded);
  if (norm) {
    const byCity = headlines.find((h) => normalizeHmMapCityKey(h.city) === norm);
    if (byCity) return byCity;
  }

  return null;
}
