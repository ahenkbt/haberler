import { useCallback, useState } from "react";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { formatCompactCount } from "@/lib/formatCount";
import type { YoutubeVideoComment } from "@/lib/api";
import { VideoCommentComposer } from "@/components/VideoCommentComposer";
import { ChatMessageList } from "@/components/LiveChatPanel";
import { loadLocalComments } from "@/lib/videoComments";
import { formatCommentTime } from "@/lib/videoComments";

function CommentRow({ comment }: { comment: YoutubeVideoComment }) {
  return (
    <div className="flex gap-3 py-3">
      {comment.authorAvatarUrl ? (
        <img src={comment.authorAvatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-avatar text-xs font-bold">
          {comment.author.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold">{comment.author}</span>
          {comment.publishedAt ? (
            <span className="text-xs text-[var(--color-yt-muted)]">{formatCommentTime(comment.publishedAt)}</span>
          ) : null}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{comment.text}</p>
        {comment.likeCount != null && comment.likeCount > 0 ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-yt-muted)]">
            <ThumbsUp className="h-3 w-3" />
            {formatCompactCount(comment.likeCount)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function WatchCommentsSection({
  youtubeVideoId,
  comments,
  commentCount,
  loading,
  error,
  hideComposer,
}: {
  youtubeVideoId: string;
  title?: string;
  comments: YoutubeVideoComment[];
  commentCount: number | null;
  source?: string;
  loading?: boolean;
  error?: boolean;
  hideComposer?: boolean;
}) {
  const [localTick, setLocalTick] = useState(0);
  const refreshLocal = useCallback(() => setLocalTick((n) => n + 1), []);
  const localComments = loadLocalComments(youtubeVideoId);
  void localTick;

  const countLabel =
    comments.length + localComments.length > 0
      ? commentCount != null
        ? formatCompactCount(commentCount)
        : String(comments.length + localComments.length)
      : "";

  return (
    <section
      className="relative z-[1] mt-6 scroll-mt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      aria-labelledby="watch-comments-heading"
    >
      <h2 id="watch-comments-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="h-5 w-5" />
        Yorumlar
        {countLabel ? <span className="text-base font-normal text-[var(--color-yt-muted)]">{countLabel}</span> : null}
      </h2>

      {!hideComposer ? (
        <div className="mb-4">
          <VideoCommentComposer youtubeVideoId={youtubeVideoId} onPosted={refreshLocal} />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 rounded-xl border border-[var(--color-yt-border)] yt-panel p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full yt-skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded yt-skeleton" />
                <div className="h-3 w-full animate-pulse rounded yt-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 || localComments.length > 0 ? (
        <div className="divide-y divide-[var(--color-yt-border)] rounded-xl border border-[var(--color-yt-border)] yt-panel px-4">
          {localComments.map((c) => (
            <CommentRow
              key={c.id}
              comment={{
                id: c.id,
                author: c.author,
                text: c.text,
                publishedAt: c.publishedAt,
              }}
            />
          ))}
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-yt-border)] yt-panel p-4 text-sm text-[var(--color-yt-muted)]">
          <p>
            {error
              ? "YouTube yorumları şu anda alınamadı. Yorum yazabilir veya biraz sonra tekrar deneyebilirsiniz."
              : "Bu video için gösterilecek yorum bulunamadı. İlk yorumu siz yazabilirsiniz."}
          </p>
          <div className="mt-3">
            <ChatMessageList apiComments={[]} localComments={[]} />
          </div>
        </div>
      )}
    </section>
  );
}
