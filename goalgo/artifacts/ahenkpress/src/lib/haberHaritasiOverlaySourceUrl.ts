import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { isExternalNewsHref } from "@/lib/hybridNewsHref";

export type NewsmapOverlaySourceHeadline = Pick<
  HmMapCityHeadline,
  | "kind"
  | "source"
  | "href"
  | "rssSourceUrl"
  | "originUrl"
  | "sourceSiteUrl"
  | "publishedOnSiteId"
>;

function absolutePublicPath(path: string, hmPublicHref?: (path: string) => string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "";
  const resolved = hmPublicHref ? hmPublicHref(raw.startsWith("/") ? raw : `/${raw}`) : raw;
  if (isExternalNewsHref(resolved)) return resolved;
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    return resolved.startsWith("/") ? `${origin}${resolved}` : `${origin}/${resolved}`;
  }
  return resolved.startsWith("/") ? resolved : `/${resolved}`;
}

function isInternalHybridRssRef(rssSourceUrl: string | null | undefined): boolean {
  const raw = String(rssSourceUrl ?? "").trim();
  return raw.startsWith("yekpare-hm-pool:") || raw.startsWith("yekpare-hm-sync:");
}

function isInternalRssPreviewPath(href: string): boolean {
  return /\/haberler\/rss\//i.test(String(href ?? "").trim());
}

function isInternalHaberArticlePath(href: string): boolean {
  return /^\/haber\//i.test(String(href ?? "").trim()) || /\/haber\//i.test(String(href ?? "").trim());
}

/**
 * Harita overlay — RSS havuzundan gelen, site DB'sinde yayınlanmamış haber.
 * Bazen `source` eksik kalır veya `href` yanlışlıkla `/haber/{slug}` olur.
 */
export function isNewsmapRssOnlyHeadline(
  headline: Pick<HmMapCityHeadline, "kind" | "source" | "href" | "rssSourceUrl">,
): boolean {
  if (headline.kind === "video") return false;
  if (headline.source === "rss") return true;
  const href = String(headline.href ?? "").trim();
  if (isInternalRssPreviewPath(href)) return true;
  const rssUrl = String(headline.rssSourceUrl ?? "").trim();
  if (rssUrl && isExternalNewsHref(rssUrl)) return true;
  return false;
}

/** Site DB makalesi — overlay'de site-içi /haber/ navigasyonu güvenli. */
export function isNewsmapDbPublishedArticleHeadline(
  headline: Pick<HmMapCityHeadline, "kind" | "source" | "href" | "rssSourceUrl">,
): boolean {
  if (headline.kind === "video") return false;
  return !isNewsmapRssOnlyHeadline(headline);
}

export type NewsmapHeadlineNavOpts = {
  linkMode?: HaberHaritasiLinkMode;
  hmPublicHref?: (path: string) => string;
  currentSiteId?: number | null;
};

function isHmEditorNav(opts?: NewsmapHeadlineNavOpts): boolean {
  return opts?.linkMode === "hm-editor" && typeof opts.hmPublicHref === "function";
}

function resolveHmEditorInternalArticleHref(
  hrefRaw: string,
  opts: NewsmapHeadlineNavOpts,
): string | null {
  const href = String(hrefRaw ?? "").trim();
  if (!href || isExternalNewsHref(href) || isInternalRssPreviewPath(href)) return null;
  if (!isInternalHaberArticlePath(href)) return null;
  const path = href.startsWith("/") ? href : `/${href}`;
  return opts.hmPublicHref!(path);
}

/** Haber haritası kartları — RSS-only satırlar asla site-içi haber URL'si kullanmaz. */
export function resolveNewsmapHeadlineNavHref(
  headline: HmMapCityHeadline,
  opts?: NewsmapHeadlineNavOpts,
): string | null {
  if (headline.kind === "video") {
    const href = String(headline.href ?? "").trim();
    if (!href) return null;
    if (isHmEditorNav(opts) && href.startsWith("/") && !isExternalNewsHref(href)) {
      return opts!.hmPublicHref!(href);
    }
    return href;
  }
  if (isNewsmapRssOnlyHeadline(headline)) return null;

  const href = String(headline.href ?? "").trim();
  const originUrl = String(headline.originUrl ?? "").trim();
  const siteId = opts?.currentSiteId ?? null;
  const publishedOn = headline.publishedOnSiteId ?? null;

  if (isHmEditorNav(opts) && isNewsmapDbPublishedArticleHeadline(headline)) {
    const local = resolveHmEditorInternalArticleHref(href, opts!);
    if (local) return local;
    if (siteId != null && publishedOn === siteId && href && !isExternalNewsHref(href)) {
      const path = href.startsWith("/") ? href : `/${href}`;
      return opts!.hmPublicHref!(path);
    }
  }

  if (originUrl && isExternalNewsHref(originUrl)) {
    if (!isHmEditorNav(opts)) return originUrl;
    if (publishedOn != null && siteId != null && publishedOn !== siteId) return originUrl;
    if (!href || isNewsmapRssOnlyHeadline(headline)) return originUrl;
  }

  if (href) {
    if (isHmEditorNav(opts) && href.startsWith("/") && !isExternalNewsHref(href)) {
      return opts!.hmPublicHref!(href.startsWith("/") ? href : `/${href}`);
    }
    return href;
  }
  return null;
}

/** Overlay «Kaynağı yeni sekmede aç» — RSS orijinali veya yayınlanmış site-içi makale. */
export function resolveNewsmapOverlaySourceUrl(
  headline: NewsmapOverlaySourceHeadline,
  hmPublicHref?: (path: string) => string,
  opts?: Pick<NewsmapHeadlineNavOpts, "linkMode" | "currentSiteId">,
): string | null {
  if (headline.kind === "video") return null;

  const siteId = opts?.currentSiteId ?? null;
  const publishedOn = headline.publishedOnSiteId ?? null;
  const hmEditor = opts?.linkMode === "hm-editor" && typeof hmPublicHref === "function";

  const originUrl = String(headline.originUrl ?? "").trim();
  if (originUrl && isExternalNewsHref(originUrl)) {
    if (!hmEditor || (publishedOn != null && siteId != null && publishedOn !== siteId)) {
      return originUrl;
    }
  }

  const rssUrl = String(headline.rssSourceUrl ?? "").trim();
  if (isNewsmapRssOnlyHeadline(headline)) {
    return rssUrl && isExternalNewsHref(rssUrl) ? rssUrl : null;
  }

  if (isInternalHybridRssRef(rssUrl)) {
    return null;
  }

  const href = String(headline.href ?? "").trim();

  if (headline.source === "db" || !headline.source) {
    if (href && !isInternalRssPreviewPath(href) && isInternalHaberArticlePath(href)) {
      return absolutePublicPath(href, hmPublicHref);
    }
    if (href && !isInternalRssPreviewPath(href) && !isInternalHaberArticlePath(href)) {
      return absolutePublicPath(href, hmPublicHref);
    }
    return null;
  }

  if (headline.source === "rss" || isInternalRssPreviewPath(href)) {
    return rssUrl && isExternalNewsHref(rssUrl) ? rssUrl : null;
  }

  if (href && isExternalNewsHref(href)) return href;
  if (href && !isInternalRssPreviewPath(href)) {
    return absolutePublicPath(href, hmPublicHref);
  }
  return null;
}
