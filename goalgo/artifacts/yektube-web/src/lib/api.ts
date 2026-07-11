import type { YektubeSource, YektubeVideo } from "@workspace/yektube-core";
import { parseYoutubeVideoRef } from "@workspace/yektube-core";
import { fetchYoutubeCommentsViaInvidiousClient } from "@/lib/youtubeCommentsClientFallback";
import { fetchYoutubeEngagementViaClient } from "@/lib/youtubeEngagementClientFallback";

export type PaginatedVideos = { items: YektubeVideo[]; total: number; hasMore?: boolean };

async function fetchWithRetry(url: string, attempts = 5, delayMs = 1200): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    let r: Response;
    try {
      /* Tek denemenin sonsuza dek asılı kalması UI'yı donduruyordu — deneme başına sınır. */
      r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      if (i === attempts - 1) {
        if (last) return last;
        throw err;
      }
      await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
      continue;
    }
    last = r;
    if (r.ok && r.headers.get("x-yekpare-api-degraded") !== "1") {
      const clone = r.clone();
      try {
        const data = await clone.json();
        if (Array.isArray(data)) throw new Error("invalid");
        return r;
      } catch {
        if (i === attempts - 1) return r;
      }
    } else if (r.ok && r.headers.get("x-yekpare-api-degraded") === "1") {
      /* API geçici boş — yeniden dene */
    }
    if (i < attempts - 1) await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
  }
  return last!;
}

export type ChannelPlaylist = {
  playlistId: string;
  title: string;
  thumbnail?: string;
  sourceId?: number | null;
  previewVideos?: YektubeVideo[];
};

export async function fetchChannelPlaylists(
  sourceId: number,
): Promise<{ playlists: ChannelPlaylist[]; podcasts: ChannelPlaylist[] }> {
  const empty = { playlists: [] as ChannelPlaylist[], podcasts: [] as ChannelPlaylist[] };
  const loadOnce = async () => {
    const r = await fetch(`/api/video/sources/${sourceId}/playlists`, {
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!r.ok) return empty;
    const data = await r.json();
    return {
      playlists: (data.playlists ?? []) as ChannelPlaylist[],
      podcasts: (data.podcasts ?? []) as ChannelPlaylist[],
    };
  };
  try {
    const first = await loadOnce();
    if (first.playlists.length + first.podcasts.length > 0) return first;
    return await loadOnce();
  } catch {
    return empty;
  }
}

export type ChannelCommunityPost = {
  postId: string;
  text: string;
  publishedText?: string;
  imageUrl?: string;
  videoId?: string;
  likeCount?: string;
};

export async function fetchChannelCommunity(sourceId: number): Promise<ChannelCommunityPost[]> {
  try {
    const r = await fetch(`/api/video/sources/${sourceId}/community`);
    if (!r.ok) return [];
    const data = (await r.json()) as { posts?: ChannelCommunityPost[] };
    return data.posts ?? [];
  } catch {
    return [];
  }
}

/** ytimg yerine önbellekli proxy kapak */
export function yektubeThumbUrl(videoId: string, quality: "hq" | "mq" | "sd" = "mq"): string {
  const q = quality === "hq" ? "hq" : quality === "sd" ? "sd" : "mq";
  return `/api/video/thumb/${encodeURIComponent(videoId.trim())}.jpg?q=${q}`;
}

export function youtubeCaptionsTrUrl(youtubeVideoId: string): string {
  return `/api/video/youtube-captions/${encodeURIComponent(youtubeVideoId.trim())}/tr.vtt`;
}

export async function fetchVideos(params: {
  limit?: number;
  offset?: number;
  categorySlug?: string;
  sourceId?: number;
  excludeStories?: boolean;
  longFormOnly?: boolean;
  mixChannels?: boolean;
  newsFirst?: boolean;
  newsOnly?: boolean;
  enrichTitles?: boolean;
  search?: string;
  seed?: number;
  musicCatalogOnly?: boolean;
  strictCategory?: boolean;
  platform?: "instagram" | "tiktok" | "social";
}): Promise<PaginatedVideos> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 24));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.categorySlug && params.categorySlug !== "all") qs.set("categorySlug", params.categorySlug);
  if (params.sourceId) qs.set("sourceId", String(params.sourceId));
  if (params.excludeStories) qs.set("excludeStories", "true");
  if (params.longFormOnly) qs.set("longFormOnly", "true");
  if (params.mixChannels) qs.set("mixChannels", "true");
  if (params.newsFirst) qs.set("newsFirst", "true");
  if (params.newsOnly) qs.set("newsOnly", "true");
  if (params.enrichTitles) qs.set("enrichTitles", "true");
  if (params.musicCatalogOnly) qs.set("musicCatalogOnly", "true");
  if (params.strictCategory) qs.set("strictCategory", "true");
  if (params.platform) qs.set("platform", params.platform);
  if (params.search) qs.set("search", params.search);
  if (params.seed != null && params.seed > 0) qs.set("seed", String(params.seed));
  const r = await fetchWithRetry(`/api/video/videos?${qs}`);
  if (!r.ok) throw new Error("Videolar yüklenemedi");
  if (r.headers.get("x-yekpare-api-degraded") === "1") throw new Error("Videolar yüklenemedi");
  const data = await r.json();
  if (Array.isArray(data)) throw new Error("Videolar yüklenemedi");
  return { items: data.items ?? [], total: data.total ?? 0 };
}

export async function fetchShorts(params: {
  limit?: number;
  offset?: number;
  categorySlug?: string;
  sourceId?: number;
  startVideoId?: string;
  mixChannels?: boolean;
  seed?: number;
  excludeVideoIds?: string[];
}): Promise<PaginatedVideos> {
  const qs = new URLSearchParams({ limit: String(params.limit ?? 30) });
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.categorySlug && params.categorySlug !== "all") qs.set("categorySlug", params.categorySlug);
  if (params.sourceId) qs.set("sourceId", String(params.sourceId));
  if (params.startVideoId) qs.set("videoId", params.startVideoId);
  if (params.mixChannels) qs.set("mixChannels", "true");
  if (params.seed) qs.set("seed", String(params.seed));
  if (params.excludeVideoIds?.length) {
    qs.set("exclude", params.excludeVideoIds.slice(0, 80).join(","));
  }
  const r = await fetch(`/api/video/shorts?${qs}`, {
    cache: "no-store",
    credentials: "include",
    signal: AbortSignal.timeout(50_000),
  });
  if (!r.ok) throw new Error("Shorts yüklenemedi");
  if (r.headers.get("x-yekpare-api-degraded") === "1") throw new Error("Shorts yüklenemedi");
  const data = await r.json();
  const items = data.items ?? [];
  return {
    items,
    total: data.total ?? items.length,
    hasMore: data.hasMore ?? items.length > 0,
  };
}

export async function fetchSources(): Promise<YektubeSource[]> {
  const r = await fetch("/api/video/sources");
  if (!r.ok) throw new Error("Kaynaklar yüklenemedi");
  return (await r.json()) as YektubeSource[];
}

export async function fetchSource(id: number): Promise<YektubeSource> {
  const r = await fetch(`/api/video/sources/${id}`);
  if (!r.ok) throw new Error("Kanal bulunamadı");
  return (await r.json()) as YektubeSource;
}

export async function fetchSourceByRef(ref: string): Promise<YektubeSource> {
  const r = await fetch(`/api/video/sources/by-ref/${encodeURIComponent(ref)}`);
  if (!r.ok) throw new Error("Kanal bulunamadı");
  return (await r.json()) as YektubeSource;
}

export type CategoryEntry = { slug: string; label: string; videoCount: number };

const FALLBACK_CATEGORIES: CategoryEntry[] = [
  { slug: "haberler", label: "Haberler ve Politika", videoCount: 0 },
  { slug: "sinema", label: "Film ve Animasyon", videoCount: 0 },
  { slug: "dizi", label: "Dizi", videoCount: 0 },
  { slug: "muzik", label: "Müzik", videoCount: 0 },
  { slug: "oyun", label: "Oyun", videoCount: 0 },
  { slug: "spor", label: "Spor", videoCount: 0 },
  { slug: "eglence", label: "Eğlence", videoCount: 0 },
  { slug: "komedi", label: "Komedi", videoCount: 0 },
  { slug: "bilim", label: "Bilim", videoCount: 0 },
  { slug: "teknoloji", label: "Bilim ve Teknoloji", videoCount: 0 },
  { slug: "egitim", label: "Eğitim", videoCount: 0 },
  { slug: "seyahat", label: "Seyahat ve Etkinlikler", videoCount: 0 },
  { slug: "otomobil", label: "Otomobiller ve Araçlar", videoCount: 0 },
  { slug: "evcil-hayvan", label: "Evcil Hayvanlar", videoCount: 0 },
  { slug: "doga", label: "Doğa", videoCount: 0 },
  { slug: "nasil-yapilir", label: "Nasıl Yapılır ve Stil", videoCount: 0 },
  { slug: "vlog", label: "Kişiler ve Bloglar", videoCount: 0 },
  { slug: "tarih", label: "Tarih", videoCount: 0 },
  { slug: "saglik", label: "Sağlık", videoCount: 0 },
  { slug: "cocuk", label: "Çocuk", videoCount: 0 },
  { slug: "aktivizm", label: "STK ve Aktivizm", videoCount: 0 },
  { slug: "belgesel", label: "Belgesel", videoCount: 0 },
  { slug: "podcast", label: "Podcast", videoCount: 0 },
  { slug: "yemek", label: "Yemek", videoCount: 0 },
  { slug: "yemek-tarifleri", label: "Yemek Tarifleri", videoCount: 0 },
];

export async function fetchCategories(): Promise<CategoryEntry[]> {
  try {
    const r = await fetch("/api/video/categories");
    const data = (await r.json().catch(() => ({}))) as { items?: CategoryEntry[] };
    if (r.ok || r.headers.get("x-yekpare-api-degraded") === "1") {
      const items = data.items ?? [];
      if (items.length > 0) return items;
    }
  } catch {
    /* ağ hatası */
  }
  return FALLBACK_CATEGORIES;
}

export type LiveBroadcastsPayload = {
  sources: YektubeSource[];
  tvVideos: YektubeVideo[];
  channelLiveVideos: YektubeVideo[];
  videos: YektubeVideo[];
};

async function fallbackLiveFromSources(): Promise<LiveBroadcastsPayload> {
  const r = await fetch("/api/video/sources");
  if (!r.ok) throw new Error("Canlı yayınlar yüklenemedi");
  const all = (await r.json()) as YektubeSource[];
  const sources = all.filter((s) => s.active && (s.isLive || s.sourceType === "live"));
  const tvVideos: YektubeVideo[] = sources
    .filter((s) => {
      const cid = s.channelId?.trim() ?? "";
      return s.sourceType === "video" || /^[a-zA-Z0-9_-]{11}$/.test(cid);
    })
    .map((s) => ({
      id: -s.id,
      sourceId: s.id,
      platform: s.platform,
      videoId: s.channelId.trim(),
      title: s.name,
      channelName: s.name,
      thumbnail: s.logoUrl ?? `https://i.ytimg.com/vi/${s.channelId.trim()}/mqdefault.jpg`,
      categorySlug: s.categorySlug,
      isFeatured: false,
    }));
  return { sources, tvVideos, channelLiveVideos: [], videos: tvVideos };
}

export type LiveStatusPayload = {
  tvLiveCount: number;
  channelLiveCount: number;
  totalLiveCount: number;
  liveVideoIds: string[];
  updatedAt: string;
};

export async function fetchLiveStatus(): Promise<LiveStatusPayload> {
  const r = await fetch("/api/video/live/status", { cache: "no-store" });
  if (!r.ok) throw new Error("Canlı durum alınamadı");
  return (await r.json()) as LiveStatusPayload;
}

/** OG ön-render paylaşım URL'si — WhatsApp / Facebook önizlemesi */
export function watchOgShareUrl(opts: {
  pageUrl: string;
  title: string;
  description?: string;
  thumbnail?: string | null;
}): string {
  const qs = new URLSearchParams({
    url: opts.pageUrl,
    title: opts.title.slice(0, 200),
  });
  if (opts.description?.trim()) qs.set("description", opts.description.trim().slice(0, 500));
  if (opts.thumbnail?.trim()) qs.set("thumb", opts.thumbnail.trim());
  return `/api/video/og/watch?${qs.toString()}`;
}

function parseLiveBroadcastsPayload(data: LiveBroadcastsPayload): LiveBroadcastsPayload {
  return {
    sources: data.sources ?? [],
    tvVideos: data.tvVideos ?? data.videos ?? [],
    channelLiveVideos: data.channelLiveVideos ?? [],
    videos: data.videos ?? [...(data.tvVideos ?? []), ...(data.channelLiveVideos ?? [])],
  };
}

function liveBroadcastsHasItems(payload: LiveBroadcastsPayload): boolean {
  return payload.sources.length > 0 || payload.channelLiveVideos.length > 0;
}

export async function fetchLiveBroadcasts(): Promise<LiveBroadcastsPayload> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/video/live", { cache: "no-store" });
      if (r.ok && r.headers.get("x-yekpare-api-degraded") !== "1") {
        const payload = parseLiveBroadcastsPayload((await r.json()) as LiveBroadcastsPayload);
        if (liveBroadcastsHasItems(payload)) return payload;
      }
    } catch {
      /* yeniden dene veya kaynaklardan yedekle */
    }
    if (attempt < 2) await new Promise((res) => setTimeout(res, 900 * (attempt + 1)));
  }
  return fallbackLiveFromSources();
}

export async function fetchLiveBroadcastForSource(
  sourceId: number,
  refresh = false,
): Promise<{ videoId: string | null; ucChannelId: string | null }> {
  const q = refresh ? "?refresh=1" : "";
  try {
    const r = await fetch(`/api/video/sources/${sourceId}/live-broadcast${q}`, { cache: "no-store" });
    if (!r.ok) return { videoId: null, ucChannelId: null };
    const data = (await r.json()) as {
      ok?: boolean;
      videoId?: string | null;
      ucChannelId?: string | null;
    };
    if (!data.ok) return { videoId: null, ucChannelId: null };
    return { videoId: data.videoId ?? null, ucChannelId: data.ucChannelId ?? null };
  } catch {
    return { videoId: null, ucChannelId: null };
  }
}

export type YekGonderSession = {
  id: string;
  title: string;
  hostName: string;
  createdAt: number;
  viewerCount: number;
};

export async function fetchYekGonderSessions(): Promise<YekGonderSession[]> {
  try {
    const r = await fetch("/api/video/yek-gonder/sessions", { cache: "no-store" });
    if (!r.ok) return [];
    const data = (await r.json()) as { items?: YekGonderSession[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export type ChannelHtmlMeta = {
  ok?: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  channelName?: string;
  description?: string;
  subscriberText?: string;
};

export async function fetchChannelMeta(sourceId: number): Promise<ChannelHtmlMeta | null> {
  try {
    const r = await fetch(`/api/video/sources/${sourceId}/channel-html-meta`);
    if (!r.ok) return null;
    return (await r.json()) as ChannelHtmlMeta;
  } catch {
    return null;
  }
}

export async function searchVideos(q: string, limit = 32): Promise<YektubeVideo[]> {
  const query = q.trim();
  if (!query) return [];
  try {
    const r = await fetch(
      `/api/video/search?q=${encodeURIComponent(query)}&limit=${limit}&excludeStories=true`,
      { cache: "no-store" },
    );
    if (r.ok) {
      const data = await r.json();
      return (data.items ?? []) as YektubeVideo[];
    }
  } catch {
    /* DB araması başarısız — videolar uç noktasına düş */
  }
  const fallback = await fetch(
    `/api/video/videos?search=${encodeURIComponent(query)}&limit=${limit}&excludeStories=true`,
    { cache: "no-store" },
  );
  if (!fallback.ok) return [];
  const data = await fallback.json();
  if (Array.isArray(data)) return [];
  return (data.items ?? []) as YektubeVideo[];
}

export async function fetchSimilarVideos(videoDbId: number, limit = 12): Promise<YektubeVideo[]> {
  const r = await fetch(`/api/video/videos/${videoDbId}/similar?limit=${limit}`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data.items ?? []) as YektubeVideo[];
}

export async function fetchChannelVideos(
  videoDbId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedVideos & { hasMore?: boolean }> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 12));
  if (params.offset) qs.set("offset", String(params.offset));
  const r = await fetch(`/api/video/videos/${videoDbId}/channel-more?${qs}`);
  if (!r.ok) return { items: [], total: 0, hasMore: false };
  const data = await r.json();
  return { items: data.items ?? [], total: data.total ?? 0, hasMore: data.hasMore };
}

export async function fetchYoutubeVideoMeta(youtubeVideoId: string): Promise<{
  videoId: string;
  title: string;
  description: string;
  duration: string | null;
  thumbnail?: string;
  isLive?: boolean;
  liveBroadcastContent?: "live" | "upcoming" | "none";
} | null> {
  try {
    const r = await fetch(`/api/video/youtube-meta/${encodeURIComponent(youtubeVideoId)}`);
    if (r.ok) {
      return (await r.json()) as {
        videoId: string;
        title: string;
        description: string;
        duration: string | null;
        thumbnail?: string;
      };
    }
  } catch {
    /* middleware oEmbed yedeği de başarısız olabilir */
  }
  return null;
}

export type YoutubeVideoComment = {
  id: string;
  author: string;
  authorAvatarUrl?: string;
  text: string;
  publishedAt?: string;
  likeCount?: number;
};

export type YoutubeVideoEngagement = {
  videoId: string;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  comments: YoutubeVideoComment[];
  source: "api" | "scrape" | "mixed";
  liveChatEnabled?: boolean | null;
};

export async function fetchYoutubeEngagement(youtubeVideoId: string): Promise<YoutubeVideoEngagement> {
  const empty: YoutubeVideoEngagement = {
    videoId: youtubeVideoId,
    likeCount: null,
    commentCount: null,
    viewCount: null,
    comments: [],
    source: "api",
  };
  try {
    const r = await fetch(`/api/video/youtube-engagement/${encodeURIComponent(youtubeVideoId)}`, {
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
    });
    if (r.headers.get("x-yekpare-api-degraded") === "1") return empty;
    if (!r.ok) {
      const fromClient = await fetchYoutubeEngagementViaClient(youtubeVideoId);
      if (fromClient.likeCount != null || fromClient.viewCount != null || fromClient.comments.length > 0) {
        return {
          videoId: youtubeVideoId,
          likeCount: fromClient.likeCount,
          commentCount: fromClient.commentCount,
          viewCount: fromClient.viewCount,
          comments: fromClient.comments,
          source: "scrape",
        };
      }
      return empty;
    }
    const data = (await r.json()) as YoutubeVideoEngagement;
    const needsStats = data.likeCount == null && data.viewCount == null;
    const needsComments = !data.comments?.length;
    if (!needsStats && !needsComments) return data;
    const fromClient = await fetchYoutubeEngagementViaClient(youtubeVideoId);
    return {
      ...data,
      likeCount: data.likeCount ?? fromClient.likeCount ?? null,
      viewCount: data.viewCount ?? fromClient.viewCount ?? null,
      commentCount: data.commentCount ?? fromClient.commentCount ?? null,
      comments: data.comments?.length ? data.comments : fromClient.comments,
      source:
        data.source === "api" && (fromClient.likeCount != null || fromClient.viewCount != null)
          ? "mixed"
          : data.source,
    };
  } catch {
    try {
      const fromClient = await fetchYoutubeEngagementViaClient(youtubeVideoId);
      if (fromClient.likeCount != null || fromClient.viewCount != null || fromClient.comments.length > 0) {
        return {
          videoId: youtubeVideoId,
          likeCount: fromClient.likeCount,
          commentCount: fromClient.commentCount,
          viewCount: fromClient.viewCount,
          comments: fromClient.comments,
          source: "scrape",
        };
      }
    } catch {
      /* ignore */
    }
    return empty;
  }
}

export async function fetchYoutubeComments(youtubeVideoId: string): Promise<{
  videoId: string;
  comments: YoutubeVideoComment[];
  commentCount: number | null;
}> {
  const empty = { videoId: youtubeVideoId, comments: [] as YoutubeVideoComment[], commentCount: null };
  try {
    const r = await fetch(`/api/video/youtube-comments/${encodeURIComponent(youtubeVideoId)}`, {
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (r.ok) {
      const raw = (await r.json()) as
        | { videoId: string; comments: YoutubeVideoComment[]; commentCount: number | null }
        | YoutubeVideoComment[];
      if (Array.isArray(raw)) return empty;
      if (raw.comments?.length) return raw;
    } else if (r.status !== 404) {
      return empty;
    }
  } catch {
    /* fallback below */
  }
  try {
    const engagement = await fetchYoutubeEngagement(youtubeVideoId);
    if (engagement.comments?.length) {
      return {
        videoId: youtubeVideoId,
        comments: engagement.comments,
        commentCount: engagement.commentCount,
      };
    }
  } catch {
    /* ignore */
  }
  try {
    const fromInvidious = await fetchYoutubeCommentsViaInvidiousClient(youtubeVideoId);
    if (fromInvidious.comments.length > 0) return fromInvidious;
  } catch {
    /* ignore */
  }
  return empty;
}

export type YoutubeStreamInfo = {
  videoId: string;
  url: string;
  audioUrl?: string;
  mimeType: string;
  qualityLabel: string | null;
  expiresAt: number;
  source: "innertube" | "invidious" | "piped" | "youtubei" | "ytdl";
};

/** HTML5 oynatıcı — sunucu proxy (embed kapalı videolar için) */
export function youtubeStreamPlayUrl(
  youtubeVideoId: string,
  force = false,
  audioOnly = false,
  forLive = false,
): string {
  const params = new URLSearchParams();
  if (force) params.set("force", "1");
  if (audioOnly) params.set("audio", "1");
  if (forLive) params.set("live", "1");
  const qs = params.toString();
  return `/api/video/youtube-stream/${encodeURIComponent(youtubeVideoId)}/play${qs ? `?${qs}` : ""}`;
}

export async function fetchYoutubeStream(youtubeVideoId: string, force = false): Promise<YoutubeStreamInfo | null> {
  try {
    const qs = force ? "?force=1" : "";
    const r = await fetch(`/api/video/youtube-stream/${encodeURIComponent(youtubeVideoId)}${qs}`);
    if (!r.ok) return null;
    return (await r.json()) as YoutubeStreamInfo;
  } catch {
    return null;
  }
}

export async function fetchYoutubeLiveStream(
  youtubeVideoId: string,
  force = false,
): Promise<YoutubeStreamInfo | null> {
  try {
    const params = new URLSearchParams({ live: "1" });
    if (force) params.set("force", "1");
    const r = await fetch(`/api/video/youtube-stream/${encodeURIComponent(youtubeVideoId)}?${params}`);
    if (!r.ok) return null;
    return (await r.json()) as YoutubeStreamInfo;
  } catch {
    return null;
  }
}

/** DB'de kayıtlı videoyu kanal + video referansı ile bul — yanlış videoya düşmez */
export async function resolveVideo(sourceId: number, videoRef: string): Promise<YektubeVideo | null> {
  const ytId = parseYoutubeVideoRef(videoRef);
  if (!ytId || ytId.length < 6) return null;

  const { items } = await fetchVideos({
    sourceId,
    search: ytId,
    limit: 50,
  });
  const inChannel = items.find((v) => v.videoId === ytId);
  if (inChannel) return inChannel;

  const { items: global } = await fetchVideos({ search: ytId, limit: 12 });
  const exact = global.find((v) => v.videoId === ytId);
  if (!exact) return null;
  if (exact.sourceId != null && exact.sourceId !== sourceId) return null;
  return exact;
}

export type VideoSeoMeta = {
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  jsonLd: Record<string, unknown>;
  translated: boolean;
  source: "native" | "google-translate" | "cache" | "captions";
  locale: "tr-TR";
  inLanguage: "tr";
  configured: boolean;
};

/** Google Translate SEO meta — kullanıcı arayüzünde gösterilmez */
export async function fetchVideoSeoMeta(
  youtubeVideoId: string,
  opts: {
    dbId?: number;
    title?: string;
    description?: string;
    channelName?: string;
    thumbnail?: string;
    duration?: string;
    publishedAt?: string;
    categorySlug?: string;
    pageUrl?: string;
  } = {},
): Promise<VideoSeoMeta | null> {
  try {
    const qs = new URLSearchParams();
    if (opts.dbId) qs.set("dbId", String(opts.dbId));
    if (opts.title) qs.set("title", opts.title);
    if (opts.description) qs.set("description", opts.description);
    if (opts.channelName) qs.set("channelName", opts.channelName);
    if (opts.thumbnail) qs.set("thumbnail", opts.thumbnail);
    if (opts.duration) qs.set("duration", opts.duration);
    if (opts.publishedAt) qs.set("publishedAt", opts.publishedAt);
    if (opts.categorySlug) qs.set("categorySlug", opts.categorySlug);
    if (opts.pageUrl) qs.set("pageUrl", opts.pageUrl);
    const q = qs.toString();
    const r = await fetch(
      `/api/video/seo-meta/${encodeURIComponent(youtubeVideoId)}${q ? `?${q}` : ""}`,
      { credentials: "include" },
    );
    if (!r.ok) return null;
    return (await r.json()) as VideoSeoMeta;
  } catch {
    return null;
  }
}

export async function fetchCategoriesLegacy(): Promise<string[]> {
  const items = await fetchCategories();
  return items.map((c) => c.slug);
}
