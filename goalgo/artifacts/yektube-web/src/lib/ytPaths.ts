import {
  usesYektubePublicPathLayout,
  yektubeDedicatedPublicPath,
  YEKTUBE_DEDICATED_KIDS_PATH,
  YEKTUBE_DEDICATED_LIVE_PATH,
  YEKTUBE_DEDICATED_MUSIC_PATH,
  YEKTUBE_DEDICATED_YEKLIVE_PATH,
  YEKTUBE_USER_PANEL_PATH,
  YEKTUBE_USER_STUDIO_PATH,
  channelPathSlug,
  videoPathSlug,
} from "@workspace/yektube-core";
import { appendQueryParam } from "@/lib/runtimeConfig";

export function isYtDedicatedHost(): boolean {
  if (typeof window === "undefined") return false;
  return usesYektubePublicPathLayout(window.location.hostname, window.location.pathname);
}

/** Ana akış öneki: yektube.com veya yekpare.net/yp → /yp */
export function ytMainPrefix(): string {
  return isYtDedicatedHost() ? yektubeDedicatedPublicPath() : "";
}

export function ytRouterBase(): string {
  if (typeof window !== "undefined") {
    const { hostname, pathname } = window.location;
    if (usesYektubePublicPathLayout(hostname, pathname)) return "";
  }
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return base || "/yektube-v2";
}

function joinMain(suffix: string): string {
  const main = ytMainPrefix();
  if (!suffix || suffix === "/") return main || "/";
  const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${main}${s}`.replace(/\/{2,}/g, "/");
}

export const ytRoutes = {
  home: () => joinMain("/"),
  shorts: () => joinMain("/yekcek"),
  shortsVideo: (videoId: string) => {
    const id = videoId.trim();
    const base = joinMain("/yekcek");
    return id ? appendQueryParam(base, "v", id) : base;
  },
  music: () => (isYtDedicatedHost() ? YEKTUBE_DEDICATED_MUSIC_PATH : joinMain("/muzik")),
  kids: () => (isYtDedicatedHost() ? YEKTUBE_DEDICATED_KIDS_PATH : joinMain("/cocuk")),
  live: () => (isYtDedicatedHost() ? YEKTUBE_DEDICATED_LIVE_PATH : joinMain("/canli")),
  liveChannel: (sourceOrId: { id: number; name: string } | number) => {
    const id = typeof sourceOrId === "object" ? sourceOrId.id : sourceOrId;
    return `${ytRoutes.live().replace(/\/+$/, "")}/kanal/${id}`;
  },
  yeklive: () => (isYtDedicatedHost() ? YEKTUBE_DEDICATED_YEKLIVE_PATH : joinMain("/yek-gonder")),
  yekGonderBroadcast: () => `${ytRoutes.yeklive().replace(/\/+$/, "")}/yayin`,
  yekGonderLiveWatch: (sessionId: string) =>
    `${ytRoutes.live().replace(/\/+$/, "")}/yayin/${encodeURIComponent(sessionId)}`,
  userPanel: () => (isYtDedicatedHost() ? YEKTUBE_USER_PANEL_PATH : joinMain("/hesabim")),
  userStudio: () => (isYtDedicatedHost() ? YEKTUBE_USER_STUDIO_PATH : joinMain("/studio")),
  subscriptions: () => joinMain("/abonelikler"),
  categories: () => joinMain("/kategoriler"),
  library: () => joinMain("/kutuphane"),
  staticPage: (slug: string) => joinMain(`/${slug.replace(/^\/+/, "")}`),
  staticPageGeneric: (slug: string) => joinMain(`/sayfa/${slug.replace(/^\/+/, "")}`),
  search: (q?: string) => {
    const base = joinMain("/ara");
    const query = q?.trim();
    return query ? appendQueryParam(base, "q", query) : base;
  },
  channel: (sourceOrId: { id: number; name: string } | number | string, name?: string) => {
    if (typeof sourceOrId === "object") {
      return joinMain(`/kanal/${channelPathSlug(sourceOrId.name, sourceOrId.id)}`);
    }
    if (name) return joinMain(`/kanal/${channelPathSlug(name, sourceOrId)}`);
    return joinMain(`/kanal/${sourceOrId}`);
  },
  watch: (
    sourceOrId: { id: number; name: string } | number | string,
    videoOrId: { videoId: string; title: string } | string,
    channelName?: string,
    videoTitle?: string,
  ) => {
    let channelSlug: string;
    if (typeof sourceOrId === "object") {
      channelSlug = channelPathSlug(sourceOrId.name, sourceOrId.id);
    } else if (channelName) {
      channelSlug = channelPathSlug(channelName, sourceOrId);
    } else {
      channelSlug = String(sourceOrId);
    }

    if (typeof videoOrId === "object") {
      return joinMain(`/kanal/${channelSlug}/${videoPathSlug(videoOrId.title, videoOrId.videoId)}`);
    }
    const title = videoTitle ?? "";
    const videoSlug = title ? videoPathSlug(title, videoOrId) : videoOrId;
    return joinMain(`/kanal/${channelSlug}/${encodeURIComponent(videoSlug)}`);
  },
  admin: () => joinMain("/admin"),
  adminSources: (opts?: { ekle?: boolean; live?: boolean }) => {
    const base = joinMain("/admin/kaynaklar");
    let href = base;
    if (opts?.ekle) href = appendQueryParam(href, "ekle", "1");
    if (opts?.live) href = appendQueryParam(href, "live", "1");
    return href;
  },
  studioAdd: (opts?: { live?: boolean; playlist?: boolean; upload?: boolean; yekcek?: boolean }) => {
    const base = joinMain("/studio/ekle");
    if (opts?.live) return appendQueryParam(base, "tur", "canli");
    if (opts?.playlist) return appendQueryParam(base, "tur", "playlist");
    if (opts?.yekcek) return appendQueryParam(base, "tur", "yekcek");
    if (opts?.upload) return appendQueryParam(base, "tur", "yukle");
    return base;
  },
  /** Harici Canlı TV (Yekpare) — yalnızca footer / cross-link */
  liveExternal: () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host.includes("yekpare.net")) {
        return "https://yekpare.net/canlitv";
      }
    }
    return "https://yekpare.net/canlitv";
  },
} as const;

/** wouter Route path — ana bölüm alt yolları */
export function ytMainRoute(suffix: string): string {
  return joinMain(suffix);
}
