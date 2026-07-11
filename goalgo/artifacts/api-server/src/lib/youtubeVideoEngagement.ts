import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import { logger } from "./logger.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const INNERTUBE_KEY_FALLBACK = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilhw_Y9_11qc8";
const YT_CONSENT = "CONSENT=YES+1";

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

type CacheEntry = { at: number; data: YoutubeVideoEngagement; emptyComments?: boolean };
const CACHE = new Map<string, CacheEntry>();
/** P0-3: stats cache 24h; comments shorter TTL. */
const CACHE_MS = 24 * 60 * 60 * 1000;
const EMPTY_COMMENTS_CACHE_MS = 90 * 1000;
/** Serve stale stats while revalidating in background (7d hard cap). */
const STALE_SERVE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;

/** YouTube Data API quota — skip API calls briefly after quota errors. */
let youtubeApiQuotaOpenUntil = 0;
let youtubeApiQuotaWarnedAt = 0;
const YOUTUBE_API_QUOTA_COOLDOWN_MS = 30 * 60 * 1000;

function isYoutubeApiQuotaOpen(): boolean {
  return Date.now() < youtubeApiQuotaOpenUntil;
}

function markYoutubeApiQuotaExceeded(): void {
  youtubeApiQuotaOpenUntil = Date.now() + YOUTUBE_API_QUOTA_COOLDOWN_MS;
  if (Date.now() - youtubeApiQuotaWarnedAt > 60_000) {
    youtubeApiQuotaWarnedAt = Date.now();
    logger.warn("[youtube-engagement] YouTube API quota exceeded — circuit open 30m, serving cache");
  }
}

function isYoutubeQuotaError(status: number, body: string): boolean {
  if (status === 429) return true;
  if (status !== 403) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("quotaexceeded") ||
    lower.includes("dailylimitexceeded") ||
    lower.includes("userratelimitexceeded")
  );
}

function trimEngagementCache(): void {
  if (CACHE.size < CACHE_MAX_ENTRIES) return;
  const oldest = CACHE.keys().next().value as string | undefined;
  if (oldest) CACHE.delete(oldest);
}

export type YoutubeEngagementCacheRead = {
  data: YoutubeVideoEngagement;
  fresh: boolean;
  stale: boolean;
};

/** Read cache without fetching upstream. */
export function readYoutubeVideoEngagementCache(videoId: string): YoutubeEngagementCacheRead | null {
  const id = videoId.trim();
  const cached = CACHE.get(id);
  if (!cached) return null;
  const age = Date.now() - cached.at;
  const hasStats =
    cached.data.likeCount != null ||
    cached.data.viewCount != null ||
    cached.data.comments.length > 0;
  const freshTtl = hasStats
    ? cached.emptyComments
      ? EMPTY_COMMENTS_CACHE_MS
      : CACHE_MS
    : EMPTY_COMMENTS_CACHE_MS;
  if (age > STALE_SERVE_MS) return null;
  return {
    data: cached.data,
    fresh: age < freshTtl,
    stale: age >= freshTtl,
  };
}

const inFlightRefresh = new Map<string, Promise<YoutubeVideoEngagement>>();

/** Background refresh — deduped per video id. */
export function refreshYoutubeVideoEngagementBackground(videoId: string): void {
  const id = videoId.trim();
  if (inFlightRefresh.has(id)) return;
  const promise = getYoutubeVideoEngagement(id).finally(() => {
    inFlightRefresh.delete(id);
  });
  inFlightRefresh.set(id, promise);
  void promise.catch((err) => {
    logger.debug({ err, videoId: id }, "[youtube-engagement] background refresh failed");
  });
}

function parseCountText(raw: string | undefined | null): number | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  const m = t.match(/^([\d.,]+)\s*([BbKkMm])?/);
  if (!m) return null;
  const num = parseFloat(m[1]!.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "B" && num < 1000) return Math.round(num * 1_000);
  if (suffix === "K") return Math.round(num * 1_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function textFromRuns(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as { simpleText?: string; content?: string; runs?: Array<{ text?: string }> };
  if (typeof o.simpleText === "string" && o.simpleText.trim()) return o.simpleText.trim();
  if (typeof o.content === "string" && o.content.trim()) return o.content.trim();
  if (Array.isArray(o.runs)) return o.runs.map((r) => r.text ?? "").join("").trim();
  return "";
}

function extractJsonObjectAfter(html: string, marker: string): Record<string, unknown> | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = idx + marker.length;
  if (html[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractYtInitialData(html: string): Record<string, unknown> | null {
  const fromBrace =
    extractJsonObjectAfter(html, "var ytInitialData = ") ??
    extractJsonObjectAfter(html, "ytInitialData = ") ??
    extractJsonObjectAfter(html, "window[\"ytInitialData\"] = ");
  if (fromBrace) return fromBrace;

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
        /* next */
      }
    }
  }
  return null;
}

function walkYtNode(node: unknown, visit: (o: Record<string, unknown>) => void, depth = 20): void {
  if (depth <= 0 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkYtNode(item, visit, depth - 1);
    return;
  }
  const o = node as Record<string, unknown>;
  visit(o);
  for (const v of Object.values(o)) walkYtNode(v, visit, depth - 1);
}

function parseCommentRenderer(cr: Record<string, unknown>, idx: number): YoutubeVideoComment | null {
  const author = textFromRuns(cr.authorText);
  const text = textFromRuns(cr.contentText);
  if (!author || !text) return null;
  const commentId = typeof cr.commentId === "string" ? cr.commentId : `scrape-${idx}`;
  const thumb = cr.authorThumbnail as { thumbnails?: Array<{ url?: string }> } | undefined;
  const likeCount = parseCountText(textFromRuns(cr.voteCount)) ?? undefined;
  const publishedAt = textFromRuns(cr.publishedTimeText) || undefined;
  return {
    id: commentId,
    author,
    authorAvatarUrl: thumb?.thumbnails?.[0]?.url,
    text,
    publishedAt,
    likeCount,
  };
}

function parseCommentViewModel(raw: Record<string, unknown>, idx: number): YoutubeVideoComment | null {
  const vm = (raw.commentViewModel ?? raw) as Record<string, unknown>;
  const props = vm.properties as Record<string, unknown> | undefined;
  const authorBtn = vm.authorButton as { buttonViewModel?: { title?: string } } | undefined;
  const authorFromBtn = authorBtn?.buttonViewModel?.title?.trim();

  const author =
    authorFromBtn ||
    textFromRuns(vm.authorText) ||
    textFromRuns(props?.authorText) ||
    textFromRuns((props?.author as Record<string, unknown> | undefined)?.displayName) ||
    (typeof vm.authorName === "string" ? vm.authorName : "");

  const contentNode =
    vm.contentText ??
    vm.commentText ??
    props?.contentText ??
    props?.commentText ??
    props?.content;

  const text =
    textFromRuns(contentNode) ||
    textFromRuns((contentNode as Record<string, unknown> | undefined)?.content) ||
    "";

  if (!author.trim() || !text.trim()) return null;
  const id =
    (typeof vm.commentId === "string" && vm.commentId) ||
    (typeof raw.commentId === "string" && raw.commentId) ||
    (typeof props?.commentId === "string" && props.commentId) ||
    `cvm-${idx}-${author.slice(0, 12)}`;
  const thumb =
    (vm.authorThumbnail as { thumbnails?: Array<{ url?: string }> } | undefined) ??
    (props?.authorThumbnail as { thumbnails?: Array<{ url?: string }> } | undefined);
  return {
    id,
    author: author.trim(),
    authorAvatarUrl: thumb?.thumbnails?.[0]?.url,
    text: text.trim(),
    publishedAt:
      textFromRuns(vm.publishedTimeText) ||
      textFromRuns(props?.publishedTimeText) ||
      textFromRuns(vm.relativeDateText) ||
      undefined,
    likeCount:
      parseCountText(textFromRuns(vm.likeCountText)) ??
      parseCountText(textFromRuns(props?.likeCountText)) ??
      undefined,
  };
}

function collectCommentsFromNode(
  node: unknown,
  comments: YoutubeVideoComment[],
  seen: Set<string>,
  max = 10,
): void {
  if (comments.length >= max) return;
  walkYtNode(node, (o) => {
    if (comments.length >= max) return;
    if (o.commentRenderer && typeof o.commentRenderer === "object") {
      const parsed = parseCommentRenderer(o.commentRenderer as Record<string, unknown>, comments.length);
      if (parsed && !seen.has(parsed.id)) {
        seen.add(parsed.id);
        comments.push(parsed);
      }
    }
    if (o.commentViewModel && typeof o.commentViewModel === "object") {
      const parsed = parseCommentViewModel(o.commentViewModel as Record<string, unknown>, comments.length);
      if (parsed && !seen.has(parsed.id)) {
        seen.add(parsed.id);
        comments.push(parsed);
      }
    }
  });
}

async function fetchInnertubeApiKey(): Promise<string> {
  try {
    const res = await fetch("https://www.youtube.com/", {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9", Cookie: YT_CONSENT },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const m = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return m[1];
  } catch {
    /* fallback */
  }
  return INNERTUBE_KEY_FALLBACK;
}

function extractCommentContinuation(data: Record<string, unknown>): string | null {
  let token: string | null = null;
  walkYtNode(data, (o) => {
    if (token) return;
    const ctr = o.continuationItemRenderer as
      | { continuationEndpoint?: { continuationCommand?: { token?: string } } }
      | undefined;
    const t1 = ctr?.continuationEndpoint?.continuationCommand?.token;
    if (t1) token = t1;
    const append = o.appendContinuationItemsAction as { continuation?: { token?: string } } | undefined;
    if (append?.continuation?.token) token = append.continuation.token;
    const reload = o.reloadContinuationItemsCommand as
      | { continuationEndpoint?: { continuationCommand?: { token?: string } } }
      | undefined;
    const t2 = reload?.continuationEndpoint?.continuationCommand?.token;
    if (t2) token = t2;
  });
  return token;
}

async function postInnertubeNext(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const key = await fetchInnertubeApiKey();
  const res = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      "Accept-Language": "tr-TR,tr;q=0.9",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
      Cookie: YT_CONSENT,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

const INVIDIOUS_COMMENT_TIMEOUT_MS = 10_000;

const INVIDIOUS_COMMENT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.privacyredirect.com",
  "https://invidious.nerdvpn.de",
  "https://vid.puffyan.us",
  "https://inv.tux.pizza",
  "https://invidious.protokolla.fi",
];

const PIPED_COMMENT_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.drgns.space",
];

function stripHtmlText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchCommentsViaPiped(videoId: string): Promise<YoutubeVideoComment[]> {
  const attempts = PIPED_COMMENT_INSTANCES.map(async (base) => {
    try {
      const res = await fetch(`${base}/comments/${encodeURIComponent(videoId)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(5_500),
      });
      if (!res.ok) return [] as YoutubeVideoComment[];
      const data = (await res.json()) as {
        comments?: Array<{
          commentId?: string;
          author?: string;
          thumbnail?: string;
          commentText?: string;
          comment?: string;
          likeCount?: number;
          commentTime?: string;
        }>;
      };
      const out: YoutubeVideoComment[] = [];
      for (const c of data.comments ?? []) {
        const author = c.author?.trim();
        const text = stripHtmlText(c.commentText ?? c.comment ?? "");
        if (!author || !text) continue;
        out.push({
          id: c.commentId ?? `piped-${out.length}`,
          author,
          authorAvatarUrl: c.thumbnail,
          text,
          publishedAt: c.commentTime,
          likeCount: c.likeCount,
        });
        if (out.length >= 10) break;
      }
      return out;
    } catch {
      return [] as YoutubeVideoComment[];
    }
  });

  return new Promise((resolve) => {
    let pending = attempts.length;
    let settled = false;
    if (pending === 0) {
      resolve([]);
      return;
    }
    for (const attempt of attempts) {
      void attempt.then((comments) => {
        if (settled) return;
        if (comments.length > 0) {
          settled = true;
          resolve(comments);
          return;
        }
        pending -= 1;
        if (pending === 0) resolve([]);
      });
    }
  });
}

async function fetchCommentsViaInvidious(videoId: string): Promise<YoutubeVideoComment[]> {
  const attempts = INVIDIOUS_COMMENT_INSTANCES.map(async (base) => {
    try {
      const res = await fetch(`${base}/api/v1/comments/${encodeURIComponent(videoId)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(INVIDIOUS_COMMENT_TIMEOUT_MS),
      });
      if (!res.ok) return [] as YoutubeVideoComment[];
      const data = (await res.json()) as {
        comments?: Array<{
          commentId?: string;
          author?: string;
          authorThumbnails?: Array<{ url?: string }>;
          content?: string;
          contentHtml?: string;
          published?: number;
          likeCount?: number;
          publishedText?: string;
        }>;
      };
      const out: YoutubeVideoComment[] = [];
      for (const c of data.comments ?? []) {
        const author = c.author?.trim();
        const text = stripHtmlText(c.content ?? c.contentHtml ?? "");
        if (!author || !text) continue;
        out.push({
          id: c.commentId ?? `inv-${out.length}`,
          author,
          authorAvatarUrl: c.authorThumbnails?.[0]?.url,
          text,
          publishedAt: c.publishedText ?? (c.published ? new Date(c.published * 1000).toISOString() : undefined),
          likeCount: c.likeCount,
        });
        if (out.length >= 10) break;
      }
      return out;
    } catch {
      return [] as YoutubeVideoComment[];
    }
  });

  return new Promise((resolve) => {
    let pending = attempts.length;
    let settled = false;
    if (pending === 0) {
      resolve([]);
      return;
    }
    for (const attempt of attempts) {
      void attempt.then((comments) => {
        if (settled) return;
        if (comments.length > 0) {
          settled = true;
          resolve(comments);
          return;
        }
        pending -= 1;
        if (pending === 0) resolve([]);
      });
    }
  });
}

async function fetchCommentsViaInnertube(videoId: string): Promise<YoutubeVideoComment[]> {
  const comments: YoutubeVideoComment[] = [];
  const seen = new Set<string>();

  const context = {
    client: { clientName: "WEB", clientVersion: "2.20250220.01.00", hl: "tr", gl: "TR" },
  };
  const androidContext = {
    client: {
      clientName: "ANDROID",
      clientVersion: "19.17.41",
      androidSdkVersion: 30,
      hl: "tr",
      gl: "TR",
    },
  };

  for (const ctx of [context, androidContext]) {
    try {
      const next = await postInnertubeNext({
        context: ctx,
        videoId,
        racyCheckOk: true,
        contentCheckOk: true,
      });
      if (next) collectCommentsFromNode(next, comments, seen);
      if (comments.length >= 3) return comments.slice(0, 10);
    } catch {
      /* sonraki istemci */
    }
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const res = await fetch(watchUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9", Cookie: YT_CONSENT },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return comments.slice(0, 10);
    const html = await res.text();
    const data = extractYtInitialData(html);
    if (data) {
      collectCommentsFromNode(data, comments, seen);
      const token = extractCommentContinuation(data);
      if (token) {
        const next = await postInnertubeNext({ context, continuation: token });
        if (next) collectCommentsFromNode(next, comments, seen);
      }
    }
  } catch (err) {
    logger.debug({ err, videoId }, "[youtubeVideoEngagement] innertube comments failed");
  }

  if (comments.length < 3) {
    try {
      const mod = await import("youtubei.js");
      const yt = await mod.Innertube.create({
        retrieve_player: false,
        generate_session_locally: true,
        lang: "tr",
        location: "TR",
      });
      const info = await yt.getInfo(videoId);
      type CommentThread = { contents?: Array<{ author?: { name?: string }; content?: { text?: string }; id?: string }> };
      const getComments = (info as unknown as { getComments?: () => Promise<CommentThread> }).getComments;
      if (getComments) {
        const thread = await Promise.race([
          getComments.call(info),
          new Promise<CommentThread | null>((resolve) => setTimeout(() => resolve(null), 15_000)),
        ]);
        if (thread?.contents) {
          for (const item of thread.contents) {
            if (comments.length >= 10) break;
            const author = item.author?.name?.trim();
            const text = item.content?.text?.trim();
            if (!author || !text) continue;
            const id = item.id ?? `yti-${comments.length}`;
            if (seen.has(id)) continue;
            seen.add(id);
            comments.push({ id, author, text });
          }
        }
      }
    } catch {
      /* youtubei.js comments unavailable */
    }
  }

  if (comments.length < 3) {
    const fromInvidious = await fetchCommentsViaInvidious(videoId);
    for (const c of fromInvidious) {
      if (comments.length >= 10) break;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        comments.push(c);
      }
    }
  }

  return comments.slice(0, 10);
}

export async function scrapeYoutubeVideoEngagement(videoId: string): Promise<Partial<YoutubeVideoEngagement>> {
  const urls = [
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    `https://www.youtube.com/shorts/${encodeURIComponent(videoId)}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          Cookie: YT_CONSENT,
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const data = extractYtInitialData(html);

      let likeCount: number | null = null;
      let commentCount: number | null = null;
      let viewCount: number | null = null;
      let liveChatEnabled: boolean | null = null;
      const comments: YoutubeVideoComment[] = [];
      const seenComments = new Set<string>();

      if (data) {
        walkYtNode(data, (o) => {
          if (o.liveChatRenderer && typeof o.liveChatRenderer === "object") {
            liveChatEnabled = true;
          }
          if (o.liveChatOfflineStateRenderer && typeof o.liveChatOfflineStateRenderer === "object") {
            liveChatEnabled = false;
          }
          const msg = textFromRuns((o.messageRenderer as { text?: unknown } | undefined)?.text);
          if (/live chat.*disabled|sohbet.*devre|chat replay is not available/i.test(msg)) {
            liveChatEnabled = false;
          }
          if (o.videoPrimaryInfoRenderer && typeof o.videoPrimaryInfoRenderer === "object") {
            const info = o.videoPrimaryInfoRenderer as Record<string, unknown>;
            const view = textFromRuns(info.viewCount);
            if (view) viewCount = parseCountText(view.split(" ")[0]) ?? viewCount;
          }

          if (o.factoidRenderer && typeof o.factoidRenderer === "object") {
            const f = o.factoidRenderer as { label?: { simpleText?: string }; value?: { simpleText?: string } };
            const label = f.label?.simpleText?.toLowerCase() ?? "";
            const val = f.value?.simpleText ?? "";
            if (label.includes("like") || label.includes("beğen")) {
              likeCount = parseCountText(val) ?? likeCount;
            }
            if (label.includes("comment") || label.includes("yorum")) {
              commentCount = parseCountText(val) ?? commentCount;
            }
          }

          if (o.toggleButtonRenderer && typeof o.toggleButtonRenderer === "object") {
            const tb = o.toggleButtonRenderer as Record<string, unknown>;
            const targetId = tb.targetId as string | undefined;
            const defaultText = textFromRuns(tb.defaultText);
            const accessibility = textFromRuns(tb.accessibility);
            const count =
              parseCountText(defaultText) ??
              parseCountText(accessibility?.match(/([\d.,]+\s*[BbKkMm]?)/)?.[1]);
            if (targetId === "watch-like" || /like|beğen/i.test(accessibility)) {
              if (count != null) likeCount = count;
            }
          }

          if (o.commentRenderer && typeof o.commentRenderer === "object") {
            const parsed = parseCommentRenderer(o.commentRenderer as Record<string, unknown>, comments.length);
            if (parsed && !seenComments.has(parsed.id)) {
              seenComments.add(parsed.id);
              comments.push(parsed);
            }
          }

          if (o.commentViewModel && typeof o.commentViewModel === "object") {
            const parsed = parseCommentViewModel(o.commentViewModel as Record<string, unknown>, comments.length);
            if (parsed && !seenComments.has(parsed.id)) {
              seenComments.add(parsed.id);
              comments.push(parsed);
            }
          }
        });
      }

      if (likeCount == null) {
        const likeMatch = html.match(/"label"\s*:\s*"([\d.,]+\s*(?:[BbKkMm]|bin)?)\s*(?:beğeni|like)/i);
        if (likeMatch) likeCount = parseCountText(likeMatch[1]);
      }
      if (commentCount == null) {
        const cMatch = html.match(/"commentsCount"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([\d.,]+)/);
        if (cMatch) commentCount = parseCountText(cMatch[1]);
      }
      if (liveChatEnabled == null) {
        if (/"isLiveChatEnabled"\s*:\s*false/.test(html)) liveChatEnabled = false;
        else if (/"isLiveChatEnabled"\s*:\s*true/.test(html)) liveChatEnabled = true;
      }

      if (likeCount != null || commentCount != null || comments.length > 0 || viewCount != null) {
        return {
          videoId,
          likeCount,
          commentCount,
          viewCount,
          comments: comments.slice(0, 10),
          liveChatEnabled,
        };
      }
    } catch (err) {
      logger.debug({ err, videoId, url }, "[youtubeVideoEngagement] scrape attempt failed");
    }
  }

  return { videoId, comments: [] };
}

async function fetchStatsViaPiped(
  videoId: string,
): Promise<Pick<YoutubeVideoEngagement, "likeCount" | "viewCount">> {
  for (const base of PIPED_COMMENT_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { views?: number; likes?: number };
      const viewCount = typeof data.views === "number" ? data.views : null;
      const likeCount = typeof data.likes === "number" ? data.likes : null;
      if (viewCount != null || likeCount != null) return { viewCount, likeCount };
    } catch {
      /* sonraki instance */
    }
  }
  return { likeCount: null, viewCount: null };
}

async function fetchStatsFromApi(
  videoId: string,
  apiKey: string,
): Promise<Pick<YoutubeVideoEngagement, "likeCount" | "commentCount" | "viewCount">> {
  if (isYoutubeApiQuotaOpen()) {
    return { likeCount: null, commentCount: null, viewCount: null };
  }
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics");
  statsUrl.searchParams.set("id", videoId);
  statsUrl.searchParams.set("key", apiKey);
  const res = await fetch(statsUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(4_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isYoutubeQuotaError(res.status, body)) markYoutubeApiQuotaExceeded();
    return { likeCount: null, commentCount: null, viewCount: null };
  }
  const statsJson = (await res.json()) as {
    items?: Array<{ statistics?: { likeCount?: string; commentCount?: string; viewCount?: string } }>;
  };
  const st = statsJson.items?.[0]?.statistics;
  return {
    likeCount: st?.likeCount != null ? parseInt(st.likeCount, 10) || null : null,
    commentCount: st?.commentCount != null ? parseInt(st.commentCount, 10) || null : null,
    viewCount: st?.viewCount != null ? parseInt(st.viewCount, 10) || null : null,
  };
}

async function fetchEngagementFromApi(
  videoId: string,
  apiKey: string,
): Promise<Partial<YoutubeVideoEngagement>> {
  if (isYoutubeApiQuotaOpen()) {
    return { likeCount: null, commentCount: null, viewCount: null, comments: [] };
  }
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics");
  statsUrl.searchParams.set("id", videoId);
  statsUrl.searchParams.set("key", apiKey);

  const commentsUrl = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  commentsUrl.searchParams.set("part", "snippet");
  commentsUrl.searchParams.set("videoId", videoId);
  commentsUrl.searchParams.set("maxResults", "10");
  commentsUrl.searchParams.set("order", "relevance");
  commentsUrl.searchParams.set("textFormat", "plainText");
  commentsUrl.searchParams.set("key", apiKey);

  const [statsRes, commentsRes] = await Promise.all([
    fetch(statsUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6_000) }),
    fetch(commentsUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6_000) }),
  ]);

  if (!statsRes.ok) {
    const body = await statsRes.text().catch(() => "");
    if (isYoutubeQuotaError(statsRes.status, body)) markYoutubeApiQuotaExceeded();
  }
  if (!commentsRes.ok) {
    const body = await commentsRes.text().catch(() => "");
    if (isYoutubeQuotaError(commentsRes.status, body)) markYoutubeApiQuotaExceeded();
  }

  let likeCount: number | null = null;
  let commentCount: number | null = null;
  let viewCount: number | null = null;
  const comments: YoutubeVideoComment[] = [];

  if (statsRes.ok) {
    const statsJson = (await statsRes.json()) as {
      items?: Array<{ statistics?: { likeCount?: string; commentCount?: string; viewCount?: string } }>;
    };
    const st = statsJson.items?.[0]?.statistics;
    if (st?.likeCount != null) likeCount = parseInt(st.likeCount, 10) || null;
    if (st?.commentCount != null) commentCount = parseInt(st.commentCount, 10) || null;
    if (st?.viewCount != null) viewCount = parseInt(st.viewCount, 10) || null;
  }

  if (commentsRes.ok) {
    const commentsJson = (await commentsRes.json()) as {
      items?: Array<{
        id?: string;
        snippet?: {
          topLevelComment?: {
            id?: string;
            snippet?: {
              authorDisplayName?: string;
              authorProfileImageUrl?: string;
              textDisplay?: string;
              textOriginal?: string;
              publishedAt?: string;
              likeCount?: number;
            };
          };
        };
      }>;
    };
    for (const item of commentsJson.items ?? []) {
      const sn = item.snippet?.topLevelComment?.snippet;
      if (!sn) continue;
      const text = (sn.textOriginal ?? sn.textDisplay ?? "").trim();
      const author = sn.authorDisplayName?.trim();
      if (!text || !author) continue;
      comments.push({
        id: item.snippet?.topLevelComment?.id ?? item.id ?? `api-${comments.length}`,
        author,
        authorAvatarUrl: sn.authorProfileImageUrl,
        text,
        publishedAt: sn.publishedAt,
        likeCount: sn.likeCount,
      });
    }
  } else {
    logger.debug(
      { videoId, status: commentsRes.status },
      "[youtubeVideoEngagement] commentThreads API unavailable",
    );
  }

  return { videoId, likeCount, commentCount, viewCount, comments };
}

function mergeCommentLists(
  base: YoutubeVideoComment[],
  ...lists: YoutubeVideoComment[][]
): YoutubeVideoComment[] {
  const out = [...base];
  const seen = new Set(out.map((c) => c.id));
  for (const list of lists) {
    for (const c of list) {
      if (out.length >= 10) break;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
  }
  return out;
}

async function withEngagementTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Invidious önce (tek başına ~4s sürebilir), sonra diğer kaynaklar */
async function fetchCommentsBestEffort(videoId: string, budgetMs: number): Promise<YoutubeVideoComment[]> {
  const invFirst = await withEngagementTimeout(
    fetchCommentsViaInvidious(videoId).catch(() => []),
    Math.min(budgetMs, 12_000),
    [] as YoutubeVideoComment[],
  );
  if (invFirst.length >= 2) return invFirst.slice(0, 10);

  const remainingMs = Math.max(4_000, budgetMs - 12_000);
  const slice = Math.max(5_000, Math.floor(remainingMs / 3));
  const [piped, tube, scraped] = await Promise.all([
    withEngagementTimeout(fetchCommentsViaPiped(videoId).catch(() => []), slice, []),
    withEngagementTimeout(fetchCommentsViaInnertube(videoId).catch(() => []), slice, []),
    withEngagementTimeout(
      scrapeYoutubeVideoEngagement(videoId)
        .then((r) => r.comments ?? [])
        .catch(() => []),
      slice,
      [],
    ),
  ]);
  return mergeCommentLists(invFirst, piped, tube, scraped).slice(0, 10);
}

const COMMENTS_ONLY_CACHE = new Map<string, { at: number; data: YoutubeVideoComment[] }>();
const COMMENTS_ONLY_CACHE_MS = 3 * 60 * 1000;

/** Yalnızca yorumlar — izleme sayfası (engagement ile aynı kaynaklar: API + innertube + kazıma). */
export async function getYoutubeVideoCommentsOnly(
  videoId: string,
): Promise<{ videoId: string; comments: YoutubeVideoComment[]; commentCount: number | null }> {
  const id = videoId.trim();
  const cached = COMMENTS_ONLY_CACHE.get(id);
  if (cached && Date.now() - cached.at < COMMENTS_ONLY_CACHE_MS && cached.data.length > 0) {
    return {
      videoId: id,
      comments: cached.data,
      commentCount: cached.data.length > 0 ? cached.data.length : null,
    };
  }

  let comments = await withEngagementTimeout(fetchCommentsBestEffort(id, 22_000), 23_000, [] as YoutubeVideoComment[]);

  if (comments.length < 2) {
    comments = await withEngagementTimeout(
      Promise.all([
        fetchCommentsViaInvidious(id),
        fetchCommentsViaPiped(id),
      ]).then(([inv, piped]) => mergeCommentLists(comments, inv, piped)),
      9_000,
      comments,
    );
  }

  if (comments.length < 1) {
    const apiKey = await resolveYoutubeApiKey();
    if (apiKey) {
      const fromApi = await withEngagementTimeout(
        fetchEngagementFromApi(id, apiKey).then((r) => r.comments ?? []),
        8_000,
        [] as YoutubeVideoComment[],
      );
      comments = mergeCommentLists(comments, fromApi);
    }
  }

  let commentCount: number | null = comments.length > 0 ? comments.length : null;
  if (comments.length < 1) {
    const engagement = await getYoutubeVideoEngagement(id);
    comments = engagement.comments;
    commentCount = engagement.commentCount ?? (comments.length > 0 ? comments.length : null);
  }

  if (comments.length > 0) {
    COMMENTS_ONLY_CACHE.set(id, { at: Date.now(), data: comments });
  }
  return {
    videoId: id,
    comments: comments.slice(0, 10),
    commentCount,
  };
}

export async function getYoutubeVideoEngagement(videoId: string): Promise<YoutubeVideoEngagement> {
  const id = videoId.trim();
  const cached = CACHE.get(id);
  if (cached) {
    const hasStats =
      cached.data.likeCount != null ||
      cached.data.viewCount != null ||
      cached.data.comments.length > 0;
    const ttl = hasStats
      ? cached.emptyComments
        ? EMPTY_COMMENTS_CACHE_MS
        : CACHE_MS
      : EMPTY_COMMENTS_CACHE_MS;
    if (Date.now() - cached.at < ttl) return cached.data;
  }

  const emptyResult = (): YoutubeVideoEngagement => ({
    videoId: id,
    likeCount: null,
    commentCount: null,
    viewCount: null,
    comments: [],
    source: "scrape",
    liveChatEnabled: null,
  });

  const result = await withEngagementTimeout(
    (async (): Promise<YoutubeVideoEngagement> => {
      const [commentsFromInv, apiKey, scraped] = await Promise.all([
        withEngagementTimeout(fetchCommentsViaInvidious(id), 12_000, [] as YoutubeVideoComment[]),
        withEngagementTimeout(resolveYoutubeApiKey(), 2_500, null as string | null),
        withEngagementTimeout(scrapeYoutubeVideoEngagement(id), 14_000, {} as Partial<YoutubeVideoEngagement>),
      ]);

      let source: YoutubeVideoEngagement["source"] = "scrape";
      let likeCount: number | null = scraped.likeCount ?? null;
      let commentCount: number | null = scraped.commentCount ?? null;
      let viewCount: number | null = scraped.viewCount ?? null;
      let liveChatEnabled: boolean | null = scraped.liveChatEnabled ?? null;
      let comments = commentsFromInv.length > 0 ? commentsFromInv : (scraped.comments ?? []);

      if (apiKey) {
        const stats = await withEngagementTimeout(fetchStatsFromApi(id, apiKey), 5_000, {
          likeCount: null,
          commentCount: null,
          viewCount: null,
        });
        if (stats.likeCount != null) likeCount = stats.likeCount;
        if (stats.commentCount != null) commentCount = stats.commentCount;
        if (stats.viewCount != null) viewCount = stats.viewCount;
        if (stats.likeCount != null || stats.viewCount != null) source = "api";
      }

      if (likeCount == null && viewCount == null) {
        const piped = await withEngagementTimeout(fetchStatsViaPiped(id), 8_000, {
          likeCount: null,
          viewCount: null,
        });
        if (piped.likeCount != null) likeCount = piped.likeCount;
        if (piped.viewCount != null) viewCount = piped.viewCount;
      }

      if (comments.length < 5) {
        const [fromApiComments, fromInnertube] = await Promise.all([
          apiKey
            ? withEngagementTimeout(
                fetchEngagementFromApi(id, apiKey).then((r) => r.comments ?? []),
                5_000,
                [] as YoutubeVideoComment[],
              )
            : Promise.resolve([] as YoutubeVideoComment[]),
          withEngagementTimeout(fetchCommentsViaInnertube(id), 5_000, [] as YoutubeVideoComment[]),
        ]);
        comments = mergeCommentLists(comments, fromApiComments, fromInnertube);
        if (fromApiComments.length > 0 || fromInnertube.length > 0) {
          source = source === "api" ? "mixed" : "scrape";
        }
        if (commentCount == null && fromApiComments.length > 0) {
          commentCount = fromApiComments.length;
        }
      }

      return {
        videoId: id,
        likeCount,
        commentCount,
        viewCount,
        comments: comments.slice(0, 10),
        source,
        liveChatEnabled,
      };
    })(),
    20_000,
    emptyResult(),
  );

  const hasData =
    result.likeCount != null ||
    result.viewCount != null ||
    result.commentCount != null ||
    result.comments.length > 0;
  if (hasData) {
    trimEngagementCache();
    CACHE.set(id, {
      at: Date.now(),
      data: result,
      emptyComments: result.comments.length === 0,
    });
  }
  return result;
}
