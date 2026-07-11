/**
 * Instagram Reels & TikTok — metadata kazıma (video indirilmez; kaynak URL kullanılır).
 */

export type SocialPlatform = "instagram" | "tiktok";

export type ScrapedSocialVideo = {
  videoId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  sourceUrl: string;
  authorName?: string;
  authorHandle?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  publishedAt?: string;
  duration?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function pickMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeHtmlEntities(m2[1].trim()) : null;
}

export async function fetchSocialHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function formatSocialSeoDescription(meta: ScrapedSocialVideo): string {
  const payload = {
    sourceUrl: meta.sourceUrl,
    authorName: meta.authorName ?? null,
    authorHandle: meta.authorHandle ?? null,
    viewCount: meta.viewCount ?? null,
    likeCount: meta.likeCount ?? null,
    commentCount: meta.commentCount ?? null,
    shareCount: meta.shareCount ?? null,
    publishedAt: meta.publishedAt ?? null,
    caption: meta.description ?? null,
  };
  return JSON.stringify(payload);
}

export function parseEngagementFromText(text: string): {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
} {
  const out: { viewCount?: number; likeCount?: number; commentCount?: number } = {};
  const views = text.match(/([\d.,]+)\s*(?:views?|görüntülenme|izlenme)/i)?.[1];
  const likes = text.match(/([\d.,]+)\s*(?:likes?|beğeni)/i)?.[1];
  const comments = text.match(/([\d.,]+)\s*(?:comments?|yorum)/i)?.[1];
  if (views) out.viewCount = parseCountToken(views);
  if (likes) out.likeCount = parseCountToken(likes);
  if (comments) out.commentCount = parseCountToken(comments);
  return out;
}

function parseCountToken(raw: string): number | undefined {
  const t = raw.trim().replace(/\./g, "").replace(/,/g, ".");
  const m = t.match(/^([\d.]+)\s*([KMBkmb])?$/);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "K") n *= 1_000;
  if (suffix === "M") n *= 1_000_000;
  if (suffix === "B") n *= 1_000_000_000;
  return Math.round(n);
}

export function parseInstagramInput(input: string): {
  kind: "reel" | "profile";
  id: string;
  url: string;
  handle?: string;
} | null {
  const raw = input.trim();
  if (!raw) return null;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = `https://www.instagram.com/${raw.replace(/^@+/, "")}`;

  const reel = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (reel?.[1]) {
    const shortcode = reel[1];
    return {
      kind: "reel",
      id: shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
    };
  }

  const profile = url.match(/instagram\.com\/(?:reels\/)?@?([A-Za-z0-9._]+)/i);
  if (profile?.[1] && !["reel", "p", "tv", "explore", "accounts"].includes(profile[1].toLowerCase())) {
    const handle = profile[1];
    return {
      kind: "profile",
      id: handle,
      handle,
      url: `https://www.instagram.com/${handle}/reels/`,
    };
  }

  const bare = raw.replace(/^@+/, "").split(/[/?#]/)[0];
  if (bare && /^[A-Za-z0-9._]{2,30}$/.test(bare)) {
    return {
      kind: "profile",
      id: bare,
      handle: bare,
      url: `https://www.instagram.com/${bare}/reels/`,
    };
  }
  return null;
}

export function parseTiktokInput(input: string): {
  kind: "video" | "profile";
  id: string;
  url: string;
  handle?: string;
} | null {
  const raw = input.trim();
  if (!raw) return null;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = raw.startsWith("@")
      ? `https://www.tiktok.com/${raw}`
      : `https://www.tiktok.com/@${raw.replace(/^@+/, "")}`;
  }

  const video = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (video?.[1]) {
    return {
      kind: "video",
      id: video[1],
      url: url.split("?")[0],
    };
  }

  const short = url.match(/(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/i);
  if (short?.[1]) {
    return { kind: "video", id: short[1], url };
  }

  const profile = url.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (profile?.[1]) {
    const handle = profile[1];
    return {
      kind: "profile",
      id: handle,
      handle,
      url: `https://www.tiktok.com/@${handle}`,
    };
  }

  const bare = raw.replace(/^@+/, "").split(/[/?#]/)[0];
  if (bare && /^[A-Za-z0-9._]{2,24}$/.test(bare)) {
    return {
      kind: "profile",
      id: bare,
      handle: bare,
      url: `https://www.tiktok.com/@${bare}`,
    };
  }
  return null;
}

type OembedPayload = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  html?: string;
};

export async function fetchOembed(platform: SocialPlatform, pageUrl: string): Promise<OembedPayload | null> {
  const base =
    platform === "instagram"
      ? "https://www.instagram.com/oembed/?url="
      : "https://www.tiktok.com/oembed?url=";
  const res = await fetch(`${base}${encodeURIComponent(pageUrl)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as OembedPayload | null;
}

export async function resolveTiktokCanonicalUrl(inputUrl: string): Promise<string> {
  if (/tiktok\.com\/@[^/]+\/video\/\d+/i.test(inputUrl)) return inputUrl.split("?")[0];
  try {
    const res = await fetch(inputUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    return res.url.split("?")[0] || inputUrl;
  } catch {
    return inputUrl;
  }
}

export function extractInstagramReelShortcodes(html: string, limit = 50): string[] {
  const found = new Set<string>();
  const patterns = [
    /instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]{5,15})/g,
    /"shortcode"\s*:\s*"([A-Za-z0-9_-]{5,15})"/g,
    /"code"\s*:\s*"([A-Za-z0-9_-]{5,15})"/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const code = m[1];
      if (code && code.length >= 5) found.add(code);
      if (found.size >= limit) break;
    }
    if (found.size >= limit) break;
  }
  return [...found].slice(0, limit);
}

export function extractTiktokVideoIds(html: string, limit = 50): string[] {
  return extractTiktokVideoRefs(html, limit).map((r) => r.videoId);
}

export type TiktokVideoRef = {
  videoId: string;
  sourceUrl: string;
  authorHandle?: string;
};

export function extractTiktokVideoRefs(html: string, limit = 50): TiktokVideoRef[] {
  const found = new Map<string, TiktokVideoRef>();
  const patterns = [
    /tiktok\.com\/@([A-Za-z0-9._]+)\/video\/(\d{10,25})/g,
    /\/@([A-Za-z0-9._]+)\/video\/(\d{10,25})/g,
    /"id"\s*:\s*"(\d{10,25})"/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      if (re.source.includes("@")) {
        const handle = m[1];
        const videoId = m[2];
        if (!videoId) continue;
        found.set(videoId, {
          videoId,
          sourceUrl: `https://www.tiktok.com/@${handle}/video/${videoId}`,
          authorHandle: `@${handle}`,
        });
      } else {
        const videoId = m[1];
        if (!videoId) continue;
        found.set(videoId, {
          videoId,
          sourceUrl: `https://www.tiktok.com/video/${videoId}`,
        });
      }
      if (found.size >= limit) break;
    }
    if (found.size >= limit) break;
  }
  return [...found.values()].slice(0, limit);
}

export async function scrapeInstagramHashtagReels(
  tag: string,
  limit = 30,
): Promise<ScrapedSocialVideo[]> {
  const clean = tag.replace(/^#+/, "").trim();
  if (!clean) return [];
  const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(clean)}/`;
  let html = "";
  try {
    html = await fetchSocialHtml(url);
  } catch {
    return [];
  }
  const shortcodes = extractInstagramReelShortcodes(html, limit);
  const out: ScrapedSocialVideo[] = [];
  for (const code of shortcodes) {
    const meta = await scrapeInstagramReelMeta(code);
    if (meta) out.push(meta);
  }
  return out;
}

export async function scrapeTiktokHashtagVideos(tag: string, limit = 30): Promise<ScrapedSocialVideo[]> {
  const clean = tag.replace(/^#+/, "").trim();
  if (!clean) return [];
  const url = `https://www.tiktok.com/tag/${encodeURIComponent(clean)}`;
  let html = "";
  try {
    html = await fetchSocialHtml(url);
  } catch {
    return [];
  }
  const refs = extractTiktokVideoRefs(html, limit);
  const out: ScrapedSocialVideo[] = [];
  for (const ref of refs) {
    const meta = await scrapeTiktokVideoMeta(ref);
    if (meta) out.push(meta);
  }
  return out;
}

export async function scrapeInstagramProfileReels(
  handle: string,
  limit = 20,
): Promise<ScrapedSocialVideo[]> {
  const clean = handle.replace(/^@+/, "").trim();
  if (!clean) return [];
  const url = `https://www.instagram.com/${encodeURIComponent(clean)}/reels/`;
  let html = "";
  try {
    html = await fetchSocialHtml(url);
  } catch {
    return [];
  }
  const shortcodes = extractInstagramReelShortcodes(html, limit);
  const out: ScrapedSocialVideo[] = [];
  for (const code of shortcodes) {
    const meta = await scrapeInstagramReelMeta(code);
    if (meta) out.push({ ...meta, authorHandle: meta.authorHandle ?? `@${clean}` });
  }
  return out;
}

export async function scrapeTiktokProfileVideos(handle: string, limit = 20): Promise<ScrapedSocialVideo[]> {
  const clean = handle.replace(/^@+/, "").trim();
  if (!clean) return [];
  const url = `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
  let html = "";
  try {
    html = await fetchSocialHtml(url);
  } catch {
    return [];
  }
  const refs = extractTiktokVideoRefs(html, limit);
  const out: ScrapedSocialVideo[] = [];
  for (const ref of refs) {
    const meta = await scrapeTiktokVideoMeta({
      ...ref,
      sourceUrl: ref.sourceUrl.includes("@") ? ref.sourceUrl : `https://www.tiktok.com/@${clean}/video/${ref.videoId}`,
    });
    if (meta) out.push({ ...meta, authorHandle: meta.authorHandle ?? `@${clean}` });
  }
  return out;
}

export function engagementScore(meta: ScrapedSocialVideo): number {
  return (
    (meta.viewCount ?? 0) +
    (meta.likeCount ?? 0) * 12 +
    (meta.commentCount ?? 0) * 6 +
    (meta.shareCount ?? 0) * 8
  );
}

export async function scrapeInstagramReelMeta(shortcode: string): Promise<ScrapedSocialVideo | null> {
  const sourceUrl = `https://www.instagram.com/reel/${shortcode}/`;
  const oembed = await fetchOembed("instagram", sourceUrl);
  if (oembed?.title || oembed?.thumbnail_url) {
    const engagement = parseEngagementFromText(oembed.title ?? "");
    return {
      videoId: shortcode,
      title: (oembed.title ?? `@${oembed.author_name ?? "instagram"} · Reel`).slice(0, 500),
      description: oembed.title ?? undefined,
      thumbnail: oembed.thumbnail_url,
      sourceUrl,
      authorName: oembed.author_name,
      authorHandle: oembed.author_name ? `@${oembed.author_name}` : undefined,
      ...engagement,
    };
  }

  try {
    const html = await fetchSocialHtml(sourceUrl);
    const title = pickMeta(html, "og:title") ?? pickMeta(html, "twitter:title");
    const description = pickMeta(html, "og:description") ?? pickMeta(html, "description");
    const thumbnail = pickMeta(html, "og:image");
    if (!title && !thumbnail) return null;
    const engagement = parseEngagementFromText(`${title ?? ""} ${description ?? ""}`);
    return {
      videoId: shortcode,
      title: (title ?? `Instagram Reel ${shortcode}`).slice(0, 500),
      description: description ?? undefined,
      thumbnail: thumbnail ?? undefined,
      sourceUrl,
      ...engagement,
    };
  } catch {
    return null;
  }
}

export async function scrapeTiktokVideoMeta(input: {
  videoId: string;
  sourceUrl: string;
}): Promise<ScrapedSocialVideo | null> {
  let sourceUrl = input.sourceUrl;
  if (!/tiktok\.com\/@[^/]+\/video\//i.test(sourceUrl)) {
    sourceUrl = await resolveTiktokCanonicalUrl(sourceUrl);
  }

  const oembed = await fetchOembed("tiktok", sourceUrl);
  if (oembed?.title || oembed?.thumbnail_url) {
    const handleMatch = oembed.author_url?.match(/@([A-Za-z0-9._]+)/);
    const engagement = parseEngagementFromText(oembed.title ?? "");
    const videoId =
      sourceUrl.match(/\/video\/(\d+)/)?.[1] ??
      input.videoId.match(/^\d{10,25}$/)?.[0] ??
      input.videoId;
    return {
      videoId,
      title: (oembed.title ?? "TikTok video").slice(0, 500),
      description: oembed.title ?? undefined,
      thumbnail: oembed.thumbnail_url,
      sourceUrl,
      authorName: oembed.author_name,
      authorHandle: handleMatch ? `@${handleMatch[1]}` : undefined,
      ...engagement,
    };
  }

  try {
    const html = await fetchSocialHtml(sourceUrl);
    const title = pickMeta(html, "og:title") ?? pickMeta(html, "twitter:title");
    const description = pickMeta(html, "og:description");
    const thumbnail = pickMeta(html, "og:image");
    const videoId = sourceUrl.match(/\/video\/(\d+)/)?.[1] ?? input.videoId;
    if (!title && !thumbnail) return null;
    const engagement = parseEngagementFromText(`${title ?? ""} ${description ?? ""}`);
    return {
      videoId,
      title: (title ?? `TikTok ${videoId}`).slice(0, 500),
      description: description ?? undefined,
      thumbnail: thumbnail ?? undefined,
      sourceUrl,
      ...engagement,
    };
  } catch {
    return null;
  }
}
