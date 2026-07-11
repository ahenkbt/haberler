import { Link } from "wouter";
import { MessageCircle, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { VideoItem } from "@/pages/public/CanliTv";
import { yektubeWatchPath } from "@/lib/yektubeUrls";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";

function formatShortCount(n?: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} B`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")} B`;
  return String(n);
}

type Props = {
  video: VideoItem;
  pathHome: string;
  variant?: "desktop" | "mobile";
};

export function YektubeShortsActionRail({ video, pathHome, variant = "desktop" }: Props) {
  const watchHref =
    video.sourceId != null ? yektubeWatchPath(video.sourceId, video.videoId, pathHome) : null;
  const isMobile = variant === "mobile";

  const btnClass = isMobile
    ? "flex flex-col items-center gap-0.5 text-white"
    : "flex flex-col items-center gap-1 text-white";
  const iconWrap = isMobile
    ? "flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 transition-colors";

  return (
    <div
      className={
        isMobile
          ? "pointer-events-auto absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4"
          : "flex shrink-0 flex-col items-center gap-5 self-end pb-8"
      }
    >
      <button type="button" className={btnClass} aria-label="Beğen">
        <span className={iconWrap}>
          <ThumbsUp className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-medium">{formatShortCount(null)}</span>
      </button>
      <button type="button" className={btnClass} aria-label="Beğenme">
        <span className={iconWrap}>
          <ThumbsDown className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-medium">Beğenme</span>
      </button>
      <button type="button" className={btnClass} aria-label="Yorumlar">
        <span className={iconWrap}>
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-medium">—</span>
      </button>
      <button type="button" className={btnClass} aria-label="Paylaş">
        <span className={iconWrap}>
          <Share2 className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-medium">Paylaş</span>
      </button>
      {watchHref ? (
        <Link href={watchHref} className={btnClass} aria-label="Kanal">
          <span className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/80">
            <YektubeVideoThumb
              videoId={video.videoId}
              thumbnail={video.thumbnail}
              variant="portrait"
              className="h-full w-full object-cover"
            />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
