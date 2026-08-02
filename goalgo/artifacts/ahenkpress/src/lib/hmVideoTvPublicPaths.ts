import {
  isDefaultPortalHost,
  isHmVideoTvAllowed,
  isKhHmSite,
  isKnownHmCustomHost,
  isYekparePortalHubOnly,
} from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { normalizeHmVitrinTheme, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { yektubeWatchPath } from "@/lib/yektubeUrls";

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0] ?? "";
}

/**
 * Editör haber sitesi vitrininde Video TV site markası (Yektube değil).
 * Kurumsal vitrin ve yekpare.net hub hariç.
 */
export function isHmEditorNewsVideoTvSite(
  host: string,
  slug?: string | null,
  layoutPrefs?: NewsSiteLayoutPrefs | null,
): boolean {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!s || s === "yekpare") return false;
  if (isYekparePortalHubOnly(host, s)) return false;
  if (layoutPrefs && normalizeHmVitrinTheme(layoutPrefs.hmVitrinTheme) === "corporate") return false;
  if (isKhHmSite(host, s)) return true;
  const h = normalizeHost(host);
  if (h && isKnownHmCustomHost(h)) return true;
  if (isHmVideoTvAllowed(host, s)) return true;
  if (isDefaultPortalHost(h) && s) return true;
  return false;
}

/** Özel alanda kök `/video` (kısa URL); turk.eco’da `/tr/{slug}/video`. */
export function resolveHmVideoTvPathHome(host: string, slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "/video";
  const h = normalizeHost(host);
  if (isDefaultPortalHost(h)) {
    return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s)}/video`;
  }
  return "/video";
}

/** Özel alan — `/yektube` → `/video` yönlendirmesi. */
export function isHmVideoTvShortPublicPath(host: string, slug?: string | null): boolean {
  const h = normalizeHost(host);
  if (!h || isDefaultPortalHost(h)) return false;
  return isHmEditorNewsVideoTvSite(h, slug);
}

/** Vitrin modüllerinde kanal/video bağlantısı. */
export function hmPublicVideoTvWatchHref(
  sourceId: number,
  videoId: string,
  opts: { host: string; slug?: string | null; href: (path: string) => string; layoutPrefs?: NewsSiteLayoutPrefs | null },
): string {
  if (!isHmEditorNewsVideoTvSite(opts.host, opts.slug, opts.layoutPrefs)) {
    return opts.href(`/video-tv/kanal/${sourceId}/${encodeURIComponent(videoId)}`);
  }
  const home = resolveHmVideoTvPathHome(opts.host, String(opts.slug ?? ""));
  return opts.href(yektubeWatchPath(sourceId, videoId, home));
}

export function hmPublicVideoTvHomeHref(opts: {
  host: string;
  slug?: string | null;
  href: (path: string) => string;
  layoutPrefs?: NewsSiteLayoutPrefs | null;
}): string {
  if (!isHmEditorNewsVideoTvSite(opts.host, opts.slug, opts.layoutPrefs)) {
    return opts.href("/video-tv");
  }
  return opts.href(resolveHmVideoTvPathHome(opts.host, String(opts.slug ?? "")));
}
