import { buildYoutubeChannelSlug } from "./youtubeChannelHtmlMeta.js";
import { extractYtInitialData } from "./youtubeInitialData.js";

export type ScrapedYoutubeVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
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

function titleFromRenderer(item: Record<string, unknown>): string {
  const lockupMeta = item.lockupMetadataViewModel as { title?: { content?: string } } | undefined;
  if (lockupMeta?.title?.content?.trim()) return lockupMeta.title.content.trim();

  const title = item.title as { runs?: Array<{ text?: string }>; simpleText?: string; content?: string } | undefined;
  if (typeof title?.content === "string" && title.content.trim()) return title.content.trim();
  if (title?.runs?.[0]?.text) return title.runs[0].text;
  if (title?.simpleText) return title.simpleText;

  const ctx = item.rendererContext as { accessibilityContext?: { label?: string } } | undefined;
  const label = ctx?.accessibilityContext?.label?.trim() || "";
  if (label) {
    return label.replace(/\s+\d+\s+(saniye|dakika|minute|second|hour|saat).*$/i, "").trim();
  }
  return "";
}

function publishedFromRenderer(item: Record<string, unknown>): string {
  const pub = item.publishedTimeText as { simpleText?: string } | undefined;
  return pub?.simpleText?.trim() || "";
}

function videoIdFromNode(item: Record<string, unknown>): string {
  if (typeof item.videoId === "string" && item.videoId.trim()) return item.videoId.trim();
  if (typeof item.contentId === "string" && /^[a-zA-Z0-9_-]{11}$/.test(item.contentId)) return item.contentId.trim();
  return "";
}

function ytFindVideoRenderers(node: unknown, out: Record<string, unknown>[], depth = 16): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  if (o.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && typeof o.contentId === "string") {
    out.push(o);
  }

  for (const key of ["videoRenderer", "gridVideoRenderer", "playlistVideoRenderer", "richItemRenderer"]) {
    if (key in o) {
      const item = o[key] as Record<string, unknown>;
      if (typeof item?.videoId === "string") {
        out.push(item);
      } else {
        const nested = item?.content as Record<string, unknown> | undefined;
        const vr = nested?.videoRenderer as Record<string, unknown> | undefined;
        if (typeof vr?.videoId === "string") out.push(vr);
      }
    }
  }
  for (const v of Object.values(o)) {
    ytFindVideoRenderers(v, out, depth - 1);
  }
}

function regexFallbackVideos(html: string, limit: number): ScrapedYoutubeVideo[] {
  const out: ScrapedYoutubeVideo[] = [];
  const seen = new Set<string>();

  const patterns = [
    /lockupMetadataViewModel"\:\{"title"\:\{"content":"((?:\\.|[^"\\])*)"\}[\s\S]{0,4000}?"contentId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_VIDEO"/g,
    /"accessibilityContext"\:\{"label":"((?:\\.|[^"\\])*)"\}[\s\S]{0,2500}?"contentId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_VIDEO"/g,
    /"title":\{"content":"((?:\\.|[^"\\])*)"\}[\s\S]{0,2500}?"contentId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_VIDEO"/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const title = decodeJsonText(m[1] || "");
      const videoId = (m[2] || "").trim();
      if (!videoId || !title || seen.has(videoId)) continue;
      seen.add(videoId);
      out.push({
        videoId,
        title: title.slice(0, 500),
        publishedAt: "",
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
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
      Cookie: "CONSENT=YES+1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  return res.text();
}

/**
 * YouTube kanal /videos sayfasından HTML kazıma ile video listesi (RSS yedeği).
 */
export async function scrapeYoutubeChannelVideos(
  channelInput: string,
  limit = 50,
): Promise<ScrapedYoutubeVideo[]> {
  const slug = buildYoutubeChannelSlug(channelInput);
  const html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}/videos`);
  if (!html) return [];

  const out: ScrapedYoutubeVideo[] = [];
  const seen = new Set<string>();

  const jsonData = extractYtInitialData(html);
  if (jsonData) {
    const renderers: Record<string, unknown>[] = [];
    ytFindVideoRenderers(jsonData, renderers);
    for (const item of renderers) {
      if (out.length >= limit) break;
      const videoId = videoIdFromNode(item);
      if (!videoId || seen.has(videoId)) continue;
      const title = titleFromRenderer(item).trim();
      if (!title) continue;
      seen.add(videoId);
      out.push({
        videoId,
        title: title.slice(0, 500),
        publishedAt: publishedFromRenderer(item),
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      });
    }
  }

  if (out.length < limit) {
    for (const row of regexFallbackVideos(html, limit)) {
      if (seen.has(row.videoId)) continue;
      seen.add(row.videoId);
      out.push(row);
      if (out.length >= limit) break;
    }
  }

  return out;
}
