type YoutubeVideoComment = {
  id: string;
  author: string;
  authorAvatarUrl?: string;
  text: string;
  publishedAt?: string;
  likeCount?: number;
};

export type ClientYoutubeEngagement = {
  likeCount: number | null;
  viewCount: number | null;
  commentCount: number | null;
  comments: YoutubeVideoComment[];
};

const PIPED_CLIENT_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.adminforge.de",
];

const INVIDIOUS_CLIENT_INSTANCES = [
  "https://yewtu.be",
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
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

/** Railway zaman aşımı — tarayıcıdan Piped / Invidious ile istatistik + yorum */
export async function fetchYoutubeEngagementViaClient(
  youtubeVideoId: string,
): Promise<ClientYoutubeEngagement> {
  const empty: ClientYoutubeEngagement = {
    likeCount: null,
    viewCount: null,
    commentCount: null,
    comments: [],
  };

  let likeCount: number | null = null;
  let viewCount: number | null = null;
  let commentCount: number | null = null;
  let comments: YoutubeVideoComment[] = [];

  for (const base of PIPED_CLIENT_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${encodeURIComponent(youtubeVideoId)}`, {
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { views?: number; likes?: number };
      if (typeof data.views === "number") viewCount = data.views;
      if (typeof data.likes === "number") likeCount = data.likes;
      if (viewCount != null || likeCount != null) break;
    } catch {
      /* sonraki instance */
    }
  }

  for (const base of INVIDIOUS_CLIENT_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${encodeURIComponent(youtubeVideoId)}`, {
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        viewCount?: number;
        likeCount?: number;
        commentCount?: number;
      };
      if (viewCount == null && typeof data.viewCount === "number") viewCount = data.viewCount;
      if (likeCount == null && typeof data.likeCount === "number") likeCount = data.likeCount;
      if (commentCount == null && typeof data.commentCount === "number") commentCount = data.commentCount;
      if (viewCount != null || likeCount != null) break;
    } catch {
      /* sonraki instance */
    }
  }

  if (comments.length < 1) {
    for (const base of INVIDIOUS_CLIENT_INSTANCES) {
      try {
        const res = await fetch(`${base}/api/v1/comments/${encodeURIComponent(youtubeVideoId)}`, {
          signal: AbortSignal.timeout(12_000),
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          commentCount?: number;
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
        for (const c of data.comments ?? []) {
          const author = c.author?.trim();
          const text = stripHtmlText(c.content ?? c.contentHtml ?? "");
          if (!author || !text) continue;
          comments.push({
            id: c.commentId ?? `inv-eng-${comments.length}`,
            author,
            authorAvatarUrl: c.authorThumbnails?.[0]?.url,
            text,
            publishedAt: c.publishedText ?? (c.published ? new Date(c.published * 1000).toISOString() : undefined),
            likeCount: c.likeCount,
          });
          if (comments.length >= 10) break;
        }
        if (comments.length > 0) {
          commentCount = data.commentCount ?? comments.length;
          break;
        }
      } catch {
        /* sonraki instance */
      }
    }
  }

  if (likeCount == null && viewCount == null && comments.length === 0) return empty;
  return { likeCount, viewCount, commentCount, comments };
}
