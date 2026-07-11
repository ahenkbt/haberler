import { buildYoutubeChannelSlug } from "./youtubeChannelHtmlMeta.js";

export type ScrapedYoutubeShort = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  channelName?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\'/g, "'");
}

function extractYtInitialData(html: string): Record<string, unknown> | null {
  const patterns = [
    /var\s+ytInitialData\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var\s|<\/script>)/,
    /ytInitialData\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var|window|<)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        const d = JSON.parse(m[1]) as Record<string, unknown>;
        if (d && typeof d === "object") return d;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

function titleFromRenderer(item: Record<string, unknown>): string {
  const lockupMeta = item.lockupMetadataViewModel as { title?: { content?: string } } | undefined;
  if (lockupMeta?.title?.content?.trim()) return lockupMeta.title.content.trim();

  const title = item.title as { runs?: Array<{ text?: string }>; simpleText?: string; content?: string } | undefined;
  if (typeof title?.content === "string" && title.content.trim()) return title.content.trim();
  if (title?.runs?.[0]?.text) return title.runs[0].text;
  if (title?.simpleText) return title.simpleText;

  const headline = item.headline as { simpleText?: string } | undefined;
  if (headline?.simpleText?.trim()) return headline.simpleText.trim();

  const ctx = item.rendererContext as { accessibilityContext?: { label?: string } } | undefined;
  const label = ctx?.accessibilityContext?.label?.trim() || "";
  if (label) {
    return label.replace(/\s+\d+\s+(saniye|dakika|minute|second|hour|saat).*$/i, "").trim();
  }
  return "";
}

function videoIdFromNode(item: Record<string, unknown>): string {
  if (typeof item.videoId === "string" && item.videoId.trim()) return item.videoId.trim();
  if (typeof item.contentId === "string" && /^[a-zA-Z0-9_-]{11}$/.test(item.contentId)) return item.contentId.trim();
  const onTap = item.onTap as { innertubeCommand?: { reelWatchEndpoint?: { videoId?: string } } } | undefined;
  const reelId = onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
  if (typeof reelId === "string" && reelId.trim()) return reelId.trim();
  return "";
}

function ytFindShortRenderers(node: unknown, out: Record<string, unknown>[], depth = 18): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  if (o.contentType === "LOCKUP_CONTENT_TYPE_SHORTS" && typeof o.contentId === "string") {
    out.push(o);
  }

  for (const key of [
    "reelItemRenderer",
    "shortsLockupViewModel",
    "gridVideoRenderer",
    "videoRenderer",
    "richItemRenderer",
    "compactVideoRenderer",
  ]) {
    if (key in o) {
      const item = o[key] as Record<string, unknown>;
      if (item && typeof item === "object") {
        if (videoIdFromNode(item)) out.push(item);
        const nested = item.content as Record<string, unknown> | undefined;
        const vr = nested?.videoRenderer as Record<string, unknown> | undefined;
        if (vr && videoIdFromNode(vr)) out.push(vr);
      }
    }
  }

  for (const v of Object.values(o)) {
    ytFindShortRenderers(v, out, depth - 1);
  }
}

function regexFallbackShorts(html: string, limit: number): ScrapedYoutubeShort[] {
  const out: ScrapedYoutubeShort[] = [];
  const seen = new Set<string>();

  const patterns = [
    /"contentType":"LOCKUP_CONTENT_TYPE_SHORTS"[\s\S]{0,1200}?"contentId":"([a-zA-Z0-9_-]{11})"/g,
    /"reelWatchEndpoint"\:\{"videoId":"([a-zA-Z0-9_-]{11})"/g,
    /\/shorts\/([a-zA-Z0-9_-]{11})/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const videoId = (m[1] || "").trim();
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      out.push({
        videoId,
        title: `Short ${videoId}`,
        publishedAt: "",
        thumbnail: `https://img.youtube.com/vi/${videoId}/oardefault.jpg`,
      });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }

  return out;
}

async function fetchPage(url: string): Promise<string | null> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) return null;
  return res.text();
}

function parseShortsFromHtml(html: string, limit: number): ScrapedYoutubeShort[] {
  const out: ScrapedYoutubeShort[] = [];
  const seen = new Set<string>();

  const jsonData = extractYtInitialData(html);
  if (jsonData) {
    const renderers: Record<string, unknown>[] = [];
    ytFindShortRenderers(jsonData, renderers);
    for (const item of renderers) {
      if (out.length >= limit) break;
      const videoId = videoIdFromNode(item);
      if (!videoId || seen.has(videoId)) continue;
      const title = titleFromRenderer(item).trim() || `Short ${videoId}`;
      seen.add(videoId);
      out.push({
        videoId,
        title: title.slice(0, 500),
        publishedAt: "",
        thumbnail: `https://img.youtube.com/vi/${videoId}/oardefault.jpg`,
      });
    }
  }

  if (out.length < limit) {
    for (const row of regexFallbackShorts(html, limit)) {
      if (seen.has(row.videoId)) continue;
      seen.add(row.videoId);
      out.push(row);
      if (out.length >= limit) break;
    }
  }

  return out;
}

/** Kanal /shorts sekmesinden kısa videolar */
export async function scrapeYoutubeChannelShorts(channelInput: string, limit = 40): Promise<ScrapedYoutubeShort[]> {
  const slug = buildYoutubeChannelSlug(channelInput);
  const html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}/shorts`);
  if (!html) return [];
  return parseShortsFromHtml(html, limit);
}

/** youtube.com/shorts — popüler / hit akışı */
export async function scrapeYoutubeTrendingShorts(limit = 30): Promise<ScrapedYoutubeShort[]> {
  const html = await fetchPage("https://www.youtube.com/shorts");
  if (!html) return [];
  return parseShortsFromHtml(html, limit);
}
