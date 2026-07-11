import { buildYoutubeChannelSlug } from "./youtubeChannelHtmlMeta.js";

export type ScrapedCommunityPost = {
  postId: string;
  text: string;
  publishedText?: string;
  imageUrl?: string;
  videoId?: string;
  likeCount?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
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

function textFromRuns(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const o = node as { runs?: Array<{ text?: string }>; simpleText?: string; content?: string };
  if (typeof o.content === "string" && o.content.trim()) return o.content.trim();
  if (typeof o.simpleText === "string" && o.simpleText.trim()) return o.simpleText.trim();
  const parts = (o.runs ?? []).map((r) => r.text ?? "").join("");
  return parts.trim();
}

function thumbUrlFrom(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const thumbs = (node as { sources?: Array<{ url?: string }> }).sources;
  const url = thumbs?.[thumbs.length - 1]?.url?.trim() ?? "";
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url.replace(/^http:\/\//i, "https://");
}

function parsePostRenderer(item: Record<string, unknown>): ScrapedCommunityPost | null {
  const post = (item.backstagePostRenderer ?? item.postRenderer ?? item) as Record<string, unknown>;
  const postId =
    String(post.postId ?? post.id ?? item.postId ?? "").trim() ||
    String((post.navigationEndpoint as { browseEndpoint?: { browseId?: string } } | undefined)?.browseEndpoint?.browseId ?? "").trim();
  const text = textFromRuns(post.contentText ?? post.text ?? post.content);
  if (!text && !postId) return null;

  const publishedText = textFromRuns(post.publishedTimeText ?? post.timeText);
  const likeCount = textFromRuns(post.voteCount ?? post.likeCount);

  const imageBlock = post.backstageImageRenderer as { image?: unknown } | undefined;
  const imageUrl = thumbUrlFrom(imageBlock?.image);

  const attachment = post.backstageAttachmentRenderer as
    | { videoRenderer?: { videoId?: string } }
    | undefined;
  const videoId = attachment?.videoRenderer?.videoId?.trim();

  return {
    postId: postId || `post-${text.slice(0, 24).replace(/\s+/g, "-")}`,
    text: text.slice(0, 4000),
    publishedText: publishedText || undefined,
    imageUrl: imageUrl || undefined,
    videoId: videoId || undefined,
    likeCount: likeCount || undefined,
  };
}

function ytFindCommunityPosts(node: unknown, out: Record<string, unknown>[], depth = 18): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  for (const key of ["backstagePostThreadRenderer", "postThreadRenderer", "backstagePostRenderer", "postRenderer"]) {
    if (key in o) {
      const item = o[key] as Record<string, unknown>;
      if (key === "backstagePostThreadRenderer" || key === "postThreadRenderer") {
        const post = item.post as Record<string, unknown> | undefined;
        if (post) out.push({ backstagePostRenderer: post });
      } else {
        out.push(item);
      }
    }
  }

  for (const v of Object.values(o)) {
    ytFindCommunityPosts(v, out, depth - 1);
  }
}

async function fetchPage(url: string): Promise<string | null> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  return res.text();
}

/** YouTube kanal topluluk sekmesi — /community veya /posts */
export async function scrapeYoutubeChannelCommunity(
  channelInput: string,
  limit = 24,
): Promise<ScrapedCommunityPost[]> {
  const slug = buildYoutubeChannelSlug(channelInput);
  const paths = ["community", "posts"] as const;

  for (const suffix of paths) {
    const html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}/${suffix}`);
    if (!html) continue;

    const out: ScrapedCommunityPost[] = [];
    const seen = new Set<string>();

    const jsonData = extractYtInitialData(html);
    if (jsonData) {
      const renderers: Record<string, unknown>[] = [];
      ytFindCommunityPosts(jsonData, renderers);
      for (const item of renderers) {
        if (out.length >= limit) break;
        const parsed = parsePostRenderer(item);
        if (!parsed || (!parsed.text && !parsed.imageUrl && !parsed.videoId)) continue;
        const key = parsed.postId || parsed.text.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(parsed);
      }
    }

    if (out.length === 0) {
      const re = /"contentText"\:\{"runs"\:\[([\s\S]{0,800}?)\]\}[\s\S]{0,1200}?"publishedTimeText"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null && out.length < limit) {
        const runsRaw = m[1] ?? "";
        const text = decodeJsonText(runsRaw.replace(/"\,"text":"([^"]*)"/g, "$1 ").replace(/\\n/g, "\n")).trim();
        if (text.length < 4) continue;
        const key = text.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ postId: `scrape-${seen.size}`, text: text.slice(0, 4000) });
      }
    }

    if (out.length > 0) return out;
  }

  return [];
}
