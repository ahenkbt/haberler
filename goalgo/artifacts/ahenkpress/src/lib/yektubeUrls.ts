/** Yektube (eski Video TV) herkese açık rotalar — paylaşım ve yerleştirme ile aynı taban */

export const YEKTUBE_HOME = "/yektube";

/** Tüm canlı yayın kanallarının playlist sayfası */
export const YEKTUBE_CANLI_TV = "/canlitv";

function resolveHome(home?: string | null): string {
  const h = (home ?? YEKTUBE_HOME).trim();
  if (!h) return YEKTUBE_HOME;
  return h.replace(/\/+$/, "") || YEKTUBE_HOME;
}

/** `home` örn. `/tr/site-slug/video-tv` — Haber merkezi gömülü Video TV. */
export function yektubeChannelPath(sourceId: number | string, home?: string | null): string {
  const base = resolveHome(home);
  return `${base}/kanal/${sourceId}`;
}

export function yektubeWatchPath(sourceId: number | string, youtubeVideoId: string, home?: string | null): string {
  const base = resolveHome(home);
  return `${base}/kanal/${sourceId}/${encodeURIComponent(youtubeVideoId)}`;
}

export function yektubePlaylistPath(sourceId: number | string, home?: string | null): string {
  const base = resolveHome(home);
  return `${base}/playlist/${sourceId}`;
}

/** Yekçek akışı — isteğe bağlı başlangıç videosu */
export function yektubeYekcekPath(home?: string | null, videoId?: string | null): string {
  const base = resolveHome(home);
  const path = `${base}/yekcek`;
  const vid = videoId?.trim();
  if (!vid) return path;
  return `${path}?v=${encodeURIComponent(vid)}`;
}

/** Yektube video arama sayfası */
export function yektubeSearchPath(home?: string | null, query?: string | null): string {
  const base = resolveHome(home);
  const path = `${base}/ara`;
  const q = query?.trim();
  if (!q) return path;
  return `${path}?q=${encodeURIComponent(q)}`;
}

/** Canlı yayın playlist — HM: `/tr/.../video-tv/canlitv`, Yekpare: `/canlitv` */
export function yektubeCanliTvPath(home?: string | null, sourceId?: number | string | null): string {
  const h = (home ?? YEKTUBE_HOME).trim().replace(/\/+$/, "") || YEKTUBE_HOME;
  const root = h === YEKTUBE_HOME || h.endsWith("/yektube") ? YEKTUBE_CANLI_TV : `${h}/canlitv`;
  if (sourceId != null && String(sourceId).trim() !== "") {
    return `${root}/kanal/${sourceId}`;
  }
  return root;
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
