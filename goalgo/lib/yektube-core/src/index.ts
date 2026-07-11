/** Yektube v2 public routes */
export const YEKTUBE_V2_HOME = "/yektube-v2";

/** Legacy v1 — redirects during migration */
export const YEKTUBE_V1_HOME = "/yektube";

export const YEKTUBE_CANLI_TV = "/canlitv";

export type YektubeTabId = "home" | "shorts" | "create" | "subscriptions" | "library";

export type YektubeVideo = {
  id: number;
  sourceId?: number | null;
  platform: string;
  videoId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  channelName?: string | null;
  /** Kaynak (kanal) görünen adı — URL slug için channelName yerine kullanın */
  sourceName?: string | null;
  publishedAt?: string | null;
  duration?: string | null;
  categorySlug: string;
  isFeatured: boolean;
  active?: boolean;
  embedAllowed?: boolean;
  isStory?: boolean;
  /** yektube platform — doğrudan MP4/WebM oynatma URL'si */
  streamUrl?: string | null;
};

export type YektubeSource = {
  id: number;
  name: string;
  platform: string;
  sourceType: string;
  channelId: string;
  url?: string | null;
  logoUrl?: string | null;
  categorySlug: string;
  active: boolean;
  isLive: boolean;
  videoCount?: number;
  /** true: YouTube Data API; false: RSS + HTML kazıma */
  useYoutubeApi?: boolean;
};

export type YektubeView =
  | "home"
  | "shorts"
  | "subscriptions"
  | "library"
  | "search"
  | "watch"
  | "channel"
  | "live";

export const YEKTUBE_VIEW_SLUGS: Record<Exclude<YektubeView, "home" | "watch" | "channel" | "live">, string> = {
  shorts: "yekcek",
  subscriptions: "abonelikler",
  library: "kutuphane",
  search: "ara",
};

function resolveHome(home?: string | null): string {
  const h = (home ?? YEKTUBE_V2_HOME).trim();
  if (!h) return YEKTUBE_V2_HOME;
  return h.replace(/\/+$/, "") || YEKTUBE_V2_HOME;
}

export function yektubeHomePath(home?: string | null): string {
  return resolveHome(home);
}

export function yektubeSectionPath(
  view: keyof typeof YEKTUBE_VIEW_SLUGS,
  home?: string | null,
): string {
  const base = resolveHome(home);
  const slug = YEKTUBE_VIEW_SLUGS[view];
  return `${base}/${slug}`;
}

export function yektubeChannelPath(sourceId: number | string, home?: string | null): string {
  return `${resolveHome(home)}/kanal/${sourceId}`;
}

export function yektubeWatchPath(
  sourceId: number | string,
  youtubeVideoId: string,
  home?: string | null,
): string {
  return `${resolveHome(home)}/kanal/${sourceId}/${encodeURIComponent(youtubeVideoId)}`;
}

export function yektubeSearchPath(home?: string | null, query?: string | null): string {
  const path = `${resolveHome(home)}/ara`;
  const q = query?.trim();
  if (!q) return path;
  return `${path}?q=${encodeURIComponent(q)}`;
}

export function yektubeCanliTvPath(home?: string | null, sourceId?: number | string | null): string {
  const h = resolveHome(home);
  const root = h === YEKTUBE_V2_HOME || h.endsWith("/yektube-v2") ? YEKTUBE_CANLI_TV : `${h}/canlitv`;
  if (sourceId != null && String(sourceId).trim() !== "") {
    return `${root}/kanal/${sourceId}`;
  }
  return root;
}

export function parseYektubeV2Path(
  pathname: string,
  home?: string | null,
): { view: YektubeView; channelId?: string; videoId?: string; query?: string } {
  const base = resolveHome(home);
  if (pathname === base || pathname === `${base}/`) {
    return { view: "home" };
  }
  let rest = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1) : pathname.replace(/^\//, "");
  rest = rest.replace(/\/+$/, "");
  const [section, a, b] = rest.split("/");

  switch (section) {
    case "yekcek":
      return { view: "shorts" };
    case "abonelikler":
      return { view: "subscriptions" };
    case "kutuphane":
      return { view: "library" };
    case "ara":
      return { view: "search" };
    case "kanal":
      if (a && b) return { view: "watch", channelId: a, videoId: decodeURIComponent(b) };
      if (a) return { view: "channel", channelId: a };
      return { view: "home" };
    default:
      return { view: "home" };
  }
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export { isYektubeV2Enabled } from "./featureFlag";
export {
  YEKTUBE_HOST,
  YEKTUBE_WWW_HOST,
  YEKTUBE_ORIGIN,
  YEKTUBE_PORTAL_MIRROR_ORIGIN,
  yektubePortalMirrorUrl,
  normalizeYektubeHostKey,
  listYektubeDedicatedHostKeys,
  isYektubeDedicatedHost,
  isYektubePortalSurfaceHost,
  isYektubeSurfacePathname,
  usesYektubePublicPathLayout,
  mapPathToYektubePortal,
  yektubeRouterBaseForHost,
  yektubeDedicatedPublicPath,
  YEKTUBE_DEDICATED_PUBLIC_PATH,
  YEKTUBE_DEDICATED_MUSIC_PATH,
  YEKTUBE_DEDICATED_KIDS_PATH,
  YEKTUBE_DEDICATED_LIVE_PATH,
  YEKTUBE_DEDICATED_YEKLIVE_PATH,
  YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH,
  YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH,
  mapToYektubeDedicatedUrl,
  mapToYektubePublicUrl,
  mapToHmYektubeEmbedUrl,
  isYektubeCanonicalRedirectEnabled,
  YEKTUBE_USER_PANEL_PATH,
  YEKTUBE_USER_STUDIO_PATH,
  yektubeDedicatedTopLevelPaths,
  yektubeDedicatedCorsOrigins,
} from "./yektubeBrand";
export {
  YEKTUBE_V2_PUBLIC_BASE,
  mapPathToYektubeV2,
  mapHmVideoTvRestToPortalPath,
  mapV1SectionSuffixToV2,
  mapLegacyYektubePathToCanonical,
} from "./migratePaths";
export {
  slugifyText,
  channelPathSlug,
  videoPathSlug,
  parseYoutubeVideoRef,
  isNumericChannelRef,
} from "./slugify";
