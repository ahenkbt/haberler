export type ThumbnailVariant = "landscape" | "portrait";

const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYoutubeVideoId(videoId: string): boolean {
  return YT_ID.test(videoId.trim());
}

export function youtubeVideoThumbnail(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" | "mqdefault" | "sddefault" | "default" | "oardefault" | "hq720" = "mqdefault",
  host: "i.ytimg.com" | "img.youtube.com" = "i.ytimg.com",
): string {
  const id = videoId.trim();
  if (!isValidYoutubeVideoId(id)) return "";
  if (host === "i.ytimg.com") {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
  }
  if (quality === "oardefault" || quality === "hq720") {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
  }
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
}

export function normalizeYoutubeImageSrc(url: string | null | undefined): string {
  const t = (url ?? "").trim().replace(/\\u0026/g, "&");
  if (!t) return "";
  if (t.startsWith("//")) return `https:${t}`;
  return t.replace(/^http:\/\//i, "https://");
}

export function isUsableYoutubeCover(url: string | null | undefined): boolean {
  const t = normalizeYoutubeImageSrc(url);
  if (!t) return false;
  if (t.startsWith("data:")) return false;
  return true;
}

/** Bir video için denenecek kapak URL'leri — shorts için dikey öncelikli */
export function videoThumbnailCandidates(videoId: string, variant: ThumbnailVariant = "landscape"): string[] {
  const id = videoId.trim();
  if (!isValidYoutubeVideoId(id)) return [];

  const landscapeOrder = [
    "maxresdefault",
    "hqdefault",
    "mqdefault",
    "sddefault",
    "default",
    "oardefault",
    "hq720",
  ] as const;
  const portraitOrder = ["oardefault", "hq720", "maxresdefault", "hqdefault", "mqdefault", "sddefault", "default"] as const;
  const order = variant === "portrait" ? portraitOrder : landscapeOrder;

  const out: string[] = [];
  const push = (url: string) => {
    if (url && !out.includes(url)) out.push(url);
  };

  for (const q of order) {
    push(youtubeVideoThumbnail(id, q, "i.ytimg.com"));
    if (q !== "oardefault" && q !== "hq720") {
      push(youtubeVideoThumbnail(id, q, "img.youtube.com"));
    }
  }
  return out;
}

export function videoThumbnailSrc(
  videoId: string,
  thumbnail?: string | null,
  variant: ThumbnailVariant = "landscape",
): string {
  const generated = videoThumbnailCandidates(videoId, variant);
  const stored = isUsableYoutubeCover(thumbnail) ? normalizeYoutubeImageSrc(thumbnail) : "";
  if (stored && isValidYoutubeVideoId(videoId)) {
    const isYt = stored.includes("ytimg.com") || stored.includes("youtube.com/vi/") || stored.includes("img.youtube.com");
    if (isYt && !stored.toLowerCase().includes(`/vi/${videoId.trim().toLowerCase()}/`)) {
      return generated[0] ?? "";
    }
  }
  if (generated.length > 0) return generated[0]!;
  if (stored) return stored;
  return "";
}

export function nextVideoThumbnailSrc(
  videoId: string,
  currentSrc: string,
  variant: ThumbnailVariant = "landscape",
): string {
  const candidates = videoThumbnailCandidates(videoId, variant);
  const cur = normalizeYoutubeImageSrc(currentSrc).split("?")[0] ?? "";
  const idx = candidates.findIndex((c) => c.split("?")[0] === cur);
  if (idx >= 0 && idx + 1 < candidates.length) return candidates[idx + 1]!;
  if (idx < 0 && candidates.length > 0) return candidates[0]!;
  return "";
}

/** YouTube'un boş/gri placeholder görseli (~120×90) — gerçek kapak değil */
export function isLikelyYoutubePlaceholderThumb(img: HTMLImageElement): boolean {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 0 || h <= 0) return false;
  return w <= 130 && h <= 100;
}

export function advanceVideoThumbnail(
  videoId: string,
  img: HTMLImageElement,
  variant: ThumbnailVariant = "landscape",
): boolean {
  const next = nextVideoThumbnailSrc(videoId, img.src, variant);
  if (!next || next.split("?")[0] === img.src.split("?")[0]) return false;
  img.src = next;
  return true;
}

export function sourceCoverSrc(source: {
  logoUrl?: string | null;
  platform?: string;
  sourceType?: string;
  channelId?: string;
  isLive?: boolean;
}): string {
  if (isUsableYoutubeCover(source.logoUrl)) {
    return normalizeYoutubeImageSrc(source.logoUrl);
  }
  if (source.platform === "youtube") {
    if (source.sourceType === "video") {
      return youtubeVideoThumbnail(source.channelId || "", "hqdefault");
    }
    const vid = (source.channelId || "").trim();
    if (source.isLive || source.sourceType === "live") {
      if (isValidYoutubeVideoId(vid)) {
        return youtubeVideoThumbnail(vid, "hqdefault");
      }
    }
    if (source.sourceType === "channel" && isValidYoutubeVideoId(vid)) {
      return youtubeVideoThumbnail(vid, "hqdefault");
    }
  }
  return "";
}

export function sourceCoverFallbackSrc(
  source: { platform?: string; sourceType?: string; channelId?: string },
  currentSrc: string,
): string {
  if (source.platform !== "youtube" || source.sourceType !== "video") return "";
  const vid = (source.channelId || "").trim();
  if (!vid) return "";
  return nextVideoThumbnailSrc(vid, currentSrc) || "";
}

/** @deprecated use nextVideoThumbnailSrc */
export function fallbackThumbnailSrc(videoId: string, currentSrc: string): string {
  return nextVideoThumbnailSrc(videoId, currentSrc);
}
