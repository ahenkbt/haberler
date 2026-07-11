import { buildYoutubeChannelSlug } from "./youtubeChannelHtmlMeta.js";

export type ScrapedYoutubePlaylist = {
  playlistId: string;
  title: string;
  thumbnail?: string;
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

function titleFromNode(item: Record<string, unknown>): string {
  const lockupMeta = item.lockupMetadataViewModel as { title?: { content?: string } } | undefined;
  if (lockupMeta?.title?.content?.trim()) return lockupMeta.title.content.trim();

  const title = item.title as { runs?: Array<{ text?: string }>; simpleText?: string; content?: string } | undefined;
  if (typeof title?.content === "string" && title.content.trim()) return title.content.trim();
  if (title?.simpleText?.trim()) return title.simpleText.trim();
  if (title?.runs?.[0]?.text?.trim()) return title.runs[0].text.trim();

  const headline = item.headline as { simpleText?: string; runs?: Array<{ text?: string }> } | undefined;
  if (headline?.simpleText?.trim()) return headline.simpleText.trim();
  if (headline?.runs?.[0]?.text?.trim()) return headline.runs[0].text.trim();
  return "";
}

function thumbFromNode(item: Record<string, unknown>): string {
  const contentImage = item.contentImage as
    | {
        collectionThumbnailViewModel?: {
          primaryThumbnail?: { thumbnailViewModel?: { image?: { sources?: Array<{ url?: string }> } } };
        };
      }
    | undefined;
  const fromLockup =
    contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.[0]?.url;
  if (typeof fromLockup === "string" && fromLockup.trim()) {
    const url = fromLockup.trim();
    return url.startsWith("//") ? `https:${url}` : url.replace(/^http:\/\//i, "https://");
  }

  const thumbRoot = item.thumbnail as
    | { thumbnails?: Array<{ url?: string }> }
    | Array<{ url?: string }>
    | undefined;
  const list = Array.isArray(thumbRoot) ? thumbRoot : thumbRoot?.thumbnails;
  if (!Array.isArray(list) || list.length === 0) return "";
  const last = list[list.length - 1];
  const url = typeof last?.url === "string" ? last.url.trim() : "";
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url.replace(/^http:\/\//i, "https://");
}

function playlistIdFromNode(item: Record<string, unknown>): string {
  if (typeof item.contentId === "string" && item.contentId.startsWith("PL")) return item.contentId.trim();
  if (typeof item.playlistId === "string" && item.playlistId.trim()) return item.playlistId.trim();
  if (typeof item.contentId === "string" && item.contentId.startsWith("PL")) return item.contentId.trim();
  const nav = item.navigationEndpoint as { watchEndpoint?: { playlistId?: string } } | undefined;
  const fromNav = nav?.watchEndpoint?.playlistId?.trim();
  if (fromNav) return fromNav;
  return "";
}

function ytFindPlaylistRenderers(node: unknown, out: Record<string, unknown>[], depth = 16): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  const contentType = o.contentType;
  const contentId = typeof o.contentId === "string" ? o.contentId.trim() : "";
  if (contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST" && contentId.startsWith("PL")) {
    out.push(o);
  }

  for (const key of ["gridPlaylistRenderer", "playlistRenderer", "compactPlaylistRenderer"]) {
    if (key in o) {
      const item = o[key] as Record<string, unknown>;
      if (playlistIdFromNode(item)) out.push(item);
    }
  }

  if (typeof o.contentId === "string" && o.contentId.startsWith("PL") && titleFromNode(o)) {
    out.push(o);
  }

  for (const v of Object.values(o)) {
    ytFindPlaylistRenderers(v, out, depth - 1);
  }
}

function regexFallbackPlaylists(html: string, limit: number): ScrapedYoutubePlaylist[] {
  const out: ScrapedYoutubePlaylist[] = [];
  const seen = new Set<string>();

  const patterns = [
    /lockupMetadataViewModel"\:\{"title"\:\{"content":"((?:\\.|[^"\\])*)"\}[\s\S]{0,4000}?"contentId":"(PL[^"]+)"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_PLAYLIST"/g,
    /"playlistId":"(PL[^"]{10,})"[\s\S]{0,2000}?"title":\{"simpleText":"((?:\\.|[^"\\])*)"/g,
    /"playlistId":"(PL[^"]{10,})"[\s\S]{0,2000}?"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/g,
    /"title":\{"content":"((?:\\.|[^"\\])*)"\}[\s\S]{0,2500}?"contentId":"(PL[^"]+)"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_PLAYLIST"/g,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const re = patterns[i];
    const titleFirst = i === 0 || i === 3;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const playlistId = (titleFirst ? m[2] : m[1] || "").trim();
      const title = decodeJsonText(titleFirst ? m[1] : m[2] || "");
      if (!playlistId || !title || seen.has(playlistId)) continue;
      seen.add(playlistId);
      out.push({ playlistId, title: title.slice(0, 200) });
      if (out.length >= limit) return out;
    }
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

/**
 * YouTube kanal /playlists veya /podcasts sayfasından HTML kazıma.
 */
export async function scrapeYoutubeChannelPlaylists(
  channelInput: string,
  pathSuffix: "playlists" | "podcasts",
  limit = 50,
): Promise<ScrapedYoutubePlaylist[]> {
  const slug = buildYoutubeChannelSlug(channelInput);
  const html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}/${pathSuffix}`);
  if (!html) return [];

  const out: ScrapedYoutubePlaylist[] = [];
  const seen = new Set<string>();

  const jsonData = extractYtInitialData(html);
  if (jsonData) {
    const renderers: Record<string, unknown>[] = [];
    ytFindPlaylistRenderers(jsonData, renderers);
    for (const item of renderers) {
      if (out.length >= limit) break;
      const playlistId = playlistIdFromNode(item);
      if (!playlistId.startsWith("PL") || seen.has(playlistId)) continue;
      const title = titleFromNode(item).trim();
      if (!title) continue;
      seen.add(playlistId);
      const thumbnail = thumbFromNode(item);
      out.push({
        playlistId,
        title: title.slice(0, 200),
        ...(thumbnail ? { thumbnail } : {}),
      });
    }
  }

  if (out.length < limit) {
    for (const row of regexFallbackPlaylists(html, limit)) {
      if (seen.has(row.playlistId)) continue;
      seen.add(row.playlistId);
      out.push(row);
      if (out.length >= limit) break;
    }
  }

  return out;
}
