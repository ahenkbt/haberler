type YoutubeVideoComment = {
  id: string;
  author: string;
  authorAvatarUrl?: string;
  text: string;
  publishedAt?: string;
  likeCount?: number;
};

const INVIDIOUS_CLIENT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
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

/** Railway Invidious zaman aşımı — tarayıcıdan doğrudan (CORS açık) */
export async function fetchYoutubeCommentsViaInvidiousClient(
  youtubeVideoId: string,
): Promise<{ videoId: string; comments: YoutubeVideoComment[]; commentCount: number | null }> {
  const empty = { videoId: youtubeVideoId, comments: [] as YoutubeVideoComment[], commentCount: null };
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
      const comments: YoutubeVideoComment[] = [];
      for (const c of data.comments ?? []) {
        const author = c.author?.trim();
        const text = stripHtmlText(c.content ?? c.contentHtml ?? "");
        if (!author || !text) continue;
        comments.push({
          id: c.commentId ?? `inv-client-${comments.length}`,
          author,
          authorAvatarUrl: c.authorThumbnails?.[0]?.url,
          text,
          publishedAt: c.publishedText ?? (c.published ? new Date(c.published * 1000).toISOString() : undefined),
          likeCount: c.likeCount,
        });
        if (comments.length >= 10) break;
      }
      if (comments.length > 0) {
        return {
          videoId: youtubeVideoId,
          comments,
          commentCount: data.commentCount ?? comments.length,
        };
      }
    } catch {
      /* sonraki instance */
    }
  }
  return empty;
}
