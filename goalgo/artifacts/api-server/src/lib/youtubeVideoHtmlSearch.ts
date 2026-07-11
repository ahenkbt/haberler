import { extractYtInitialData } from "./youtubeInitialData.js";
import type { YoutubeSearchHit } from "./youtubeVideoSearch.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type TextRun = { text?: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } };

function decodeJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\'/g, "'");
}

function titleFromRenderer(item: Record<string, unknown>): string {
  const title = item.title as { runs?: TextRun[]; simpleText?: string; content?: string } | undefined;
  if (typeof title?.content === "string" && title.content.trim()) return title.content.trim();
  if (title?.runs?.[0]?.text?.trim()) return title.runs[0].text.trim();
  if (title?.simpleText?.trim()) return title.simpleText.trim();
  return "";
}

function channelFromRenderer(item: Record<string, unknown>): { channelTitle: string; channelId: string } {
  let channelTitle = "";
  let channelId = "";

  const sources = [item.longBylineText, item.shortBylineText, item.ownerText] as Array<
    { runs?: TextRun[] } | undefined
  >;
  for (const src of sources) {
    for (const run of src?.runs ?? []) {
      const bid = run.navigationEndpoint?.browseEndpoint?.browseId?.trim();
      if (bid?.startsWith("UC") && !channelId) channelId = bid;
      const text = run.text?.trim();
      if (text && !channelTitle) channelTitle = text;
    }
  }

  return { channelTitle, channelId };
}

function thumbnailFromRenderer(item: Record<string, unknown>, videoId: string): string {
  const thumb = item.thumbnail as { thumbnails?: Array<{ url?: string }> } | undefined;
  const url = thumb?.thumbnails?.[thumb.thumbnails.length - 1]?.url?.trim();
  if (url) return url.replace(/\\u0026/g, "&");
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function ytFindVideoRenderers(node: unknown, out: Record<string, unknown>[], depth = 16): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  for (const key of ["videoRenderer", "gridVideoRenderer", "richItemRenderer"]) {
    if (!(key in o)) continue;
    const item = o[key] as Record<string, unknown>;
    if (typeof item?.videoId === "string") {
      out.push(item);
      continue;
    }
    const nested = item?.content as Record<string, unknown> | undefined;
    const vr = nested?.videoRenderer as Record<string, unknown> | undefined;
    if (typeof vr?.videoId === "string") out.push(vr);
  }

  for (const v of Object.values(o)) {
    ytFindVideoRenderers(v, out, depth - 1);
  }
}

function regexFallbackVideos(html: string, limit: number): YoutubeSearchHit[] {
  const out: YoutubeSearchHit[] = [];
  const seen = new Set<string>();
  const re =
    /"videoRenderer"\:\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,4000}?"title"\:\{"runs"\:\[\{"text":"((?:\\.|[^"\\])*)"\}/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const videoId = m[1]?.trim();
    const title = decodeJsonText(m[2] ?? "");
    if (!videoId || !title || seen.has(videoId)) continue;
    seen.add(videoId);
    out.push({
      videoId,
      title: title.slice(0, 500),
      channelTitle: title.slice(0, 200),
      channelId: "",
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchSearchPage(query: string): Promise<string | null> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  try {
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
  } catch {
    return null;
  }
}

/** YouTube web arama — API anahtarı veya kota olmadan haber haritası yedek kazıması. */
export async function scrapeYoutubeVideoSearch(query: string, maxResults = 12): Promise<YoutubeSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = Math.min(Math.max(maxResults, 1), 50);
  const html = await fetchSearchPage(trimmed);
  if (!html) return [];

  const out: YoutubeSearchHit[] = [];
  const seen = new Set<string>();

  const jsonData = extractYtInitialData(html);
  if (jsonData) {
    const renderers: Record<string, unknown>[] = [];
    ytFindVideoRenderers(jsonData, renderers);
    for (const item of renderers) {
      if (out.length >= limit) break;
      const videoId = typeof item.videoId === "string" ? item.videoId.trim() : "";
      if (!videoId || seen.has(videoId)) continue;

      const title = titleFromRenderer(item);
      if (!title) continue;

      const { channelTitle, channelId } = channelFromRenderer(item);
      seen.add(videoId);
      out.push({
        videoId,
        title: title.slice(0, 500),
        channelTitle: (channelTitle || title).slice(0, 200),
        channelId,
        thumbnail: thumbnailFromRenderer(item, videoId),
      });
    }
  }

  if (out.length < limit) {
    for (const hit of regexFallbackVideos(html, limit)) {
      if (seen.has(hit.videoId)) continue;
      seen.add(hit.videoId);
      out.push(hit);
      if (out.length >= limit) break;
    }
  }

  return out;
}
