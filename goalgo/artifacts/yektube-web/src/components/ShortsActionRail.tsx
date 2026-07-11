import { useState } from "react";
import { MessageCircle, PictureInPicture2, Repeat, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCompactCount } from "@/lib/formatCount";
import { ShareButton } from "@/components/ShareButton";
import { VideoReactionButtons } from "@/components/VideoReactionButtons";
import { useYoutubeEngagement } from "@/hooks/useYoutubeEngagement";
import { WatchCommentsSection } from "@/components/WatchCommentsSection";
import { readBackgroundPlayback, writeBackgroundPlayback } from "@/lib/yektubePlaybackPrefs";

type ShortsActionVariant = "overlay" | "panel";

export function ShortsActionRail({
  youtubeVideoId,
  title,
  variant = "overlay",
  enabled = true,
  loopEnabled = false,
  onLoopToggle,
}: {
  youtubeVideoId: string;
  title: string;
  variant?: ShortsActionVariant;
  enabled?: boolean;
  loopEnabled?: boolean;
  onLoopToggle?: () => void;
}) {
  const isPanel = variant === "panel";
  const { data: engagement, isLoading: engagementLoading } = useYoutubeEngagement(youtubeVideoId, enabled);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [backgroundOn, setBackgroundOn] = useState(() => readBackgroundPlayback());
  const commentLabel = engagement?.commentCount != null ? formatCompactCount(engagement.commentCount) : "Yorum";

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 flex-col items-center gap-5",
          isPanel ? "pb-6 text-[var(--color-yt-text)]" : "text-white",
        )}
      >
        <VideoReactionButtons
          youtubeVideoId={youtubeVideoId}
          vertical
          variant={variant}
          youtubeLikeCount={engagement?.likeCount}
        />
        {onLoopToggle ? (
          <button
            type="button"
            onClick={onLoopToggle}
            className={cn("flex flex-col items-center gap-1", isPanel ? "text-[var(--color-yt-text)]" : "text-white")}
            aria-label={loopEnabled ? "Döngü açık" : "Videoyu döngüye al"}
            aria-pressed={loopEnabled}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                loopEnabled
                  ? isPanel
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-500 text-white"
                  : isPanel
                    ? "bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]"
                    : "bg-white/10 backdrop-blur-sm",
              )}
            >
              <Repeat className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium">{loopEnabled ? "Döngü" : "Tekrar"}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            const next = !backgroundOn;
            setBackgroundOn(next);
            writeBackgroundPlayback(next);
          }}
          className={cn("flex flex-col items-center gap-1", isPanel ? "text-[var(--color-yt-text)]" : "text-white")}
          aria-label={backgroundOn ? "Arka planda oynat açık" : "Arka planda oynat kapalı"}
          aria-pressed={backgroundOn}
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              backgroundOn
                ? isPanel
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-500 text-white"
                : isPanel
                  ? "bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]"
                  : "bg-white/10 backdrop-blur-sm",
            )}
          >
            <PictureInPicture2 className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium">{backgroundOn ? "Arka plan" : "PiP"}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className={cn("flex flex-col items-center gap-1", isPanel ? "text-[var(--color-yt-text)]" : "text-white")}
          aria-label="Yorumlar"
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              isPanel ? "bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]" : "bg-white/10 backdrop-blur-sm",
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium">{commentLabel}</span>
        </button>
        <ShareButton title={title} vertical variant={variant} />
      </div>

      {commentsOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="Kapat" onClick={() => setCommentsOpen(false)} />
          <div className="relative z-10 max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-yt-border)] yt-panel p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Yorumlar</h3>
              <button type="button" onClick={() => setCommentsOpen(false)} className="rounded-full p-2 yt-row-hover" aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <WatchCommentsSection
              youtubeVideoId={youtubeVideoId}
              comments={engagement?.comments ?? []}
              commentCount={engagement?.commentCount ?? null}
              loading={engagementLoading}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
