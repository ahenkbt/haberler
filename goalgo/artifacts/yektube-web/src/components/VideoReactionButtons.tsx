import { useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCompactCount } from "@/lib/formatCount";
import {
  displayLikeCount,
  getVideoReaction,
  toggleVideoReaction,
  type VideoReaction,
} from "@/lib/videoEngagement";
import { hapticTap } from "@/lib/haptics";

export function VideoReactionButtons({
  youtubeVideoId,
  vertical,
  variant = "inline",
  youtubeLikeCount,
  className,
}: {
  youtubeVideoId: string;
  vertical?: boolean;
  variant?: "inline" | "overlay" | "panel";
  youtubeLikeCount?: number | null;
  className?: string;
}) {
  const [reaction, setReaction] = useState<VideoReaction | null>(() => getVideoReaction(youtubeVideoId));
  const displayedLikeCount = useMemo(
    () => displayLikeCount(youtubeLikeCount, reaction),
    [youtubeLikeCount, reaction],
  );
  const likeLabel = formatCompactCount(displayedLikeCount);

  const pick = (next: VideoReaction) => {
    hapticTap(8);
    setReaction(toggleVideoReaction(youtubeVideoId, next));
  };

  const circleClass = (active: boolean) => {
    if (variant === "panel") {
      return cn(
        "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
        active ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]" : "bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]",
      );
    }
    return cn(
      "flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm",
      active ? "bg-white text-black" : "bg-white/10",
    );
  };

  const labelClass =
    variant === "panel" ? "text-[10px] font-medium text-[var(--color-yt-text)]" : "text-[10px] font-medium text-white";

  if (vertical) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <button type="button" onClick={() => pick("like")} className="flex flex-col items-center gap-1" aria-label="Beğen">
          <span className={circleClass(reaction === "like")}>
            <ThumbsUp className={cn("h-5 w-5", reaction === "like" && "fill-current")} />
          </span>
          <span className={labelClass}>{likeLabel || "Beğen"}</span>
        </button>
        <button type="button" onClick={() => pick("dislike")} className="flex flex-col items-center gap-1" aria-label="Beğenme">
          <span className={circleClass(reaction === "dislike")}>
            <ThumbsDown className={cn("h-5 w-5", reaction === "dislike" && "fill-current")} />
          </span>
          <span className={labelClass}>Beğenme</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center overflow-hidden rounded-full border border-[var(--color-yt-border)]", className)}>
      <button
        type="button"
        onClick={() => pick("like")}
        className={cn(
          "flex items-center gap-1.5 border-r border-[var(--color-yt-border)] px-3 py-1.5 text-sm font-medium yt-row-hover",
          reaction === "like" && "yt-nav-active",
        )}
      >
        <ThumbsUp className={cn("h-4 w-4", reaction === "like" && "fill-current")} />
        {likeLabel ? `${likeLabel} beğeni` : "Beğen"}
      </button>
      <button
        type="button"
        onClick={() => pick("dislike")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium yt-row-hover",
          reaction === "dislike" && "yt-nav-active",
        )}
      >
        <ThumbsDown className={cn("h-4 w-4", reaction === "dislike" && "fill-current")} />
      </button>
    </div>
  );
}
