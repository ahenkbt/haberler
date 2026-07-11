import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { VideoItem } from "@/pages/public/CanliTv";
import { recommendationVideoTitle, isYekcekVideo } from "@/lib/yektubeVideoClassify";
import { yektubeWatchPath, yektubeYekcekPath } from "@/lib/yektubeUrls";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";

const COLS = 6;
const ROWS = 6;
export const NEWS_BOX_VIDEO_LIMIT = COLS * ROWS;

export function YektubeNewsVideoGrid({
  videos,
  pathHome,
  variant = "landscape",
  onMoreHref,
  onMoreClick,
  header,
  badge,
  emptyText,
}: {
  videos: VideoItem[];
  pathHome: string;
  variant?: "landscape" | "portrait";
  onMoreHref?: string;
  onMoreClick?: () => void;
  header: ReactNode;
  badge?: string;
  emptyText?: string;
}) {
  const slice = videos.slice(0, NEWS_BOX_VIDEO_LIMIT);
  if (slice.length === 0) {
    return emptyText ? (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">{header}</div>
        <p className="text-sm text-zinc-500">{emptyText}</p>
      </section>
    ) : null;
  }

  const aspect = variant === "portrait" ? "aspect-[9/16]" : "aspect-video";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">{header}</div>
        {badge ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#039D55]">{badge}</span>
        ) : null}
        {onMoreHref ? (
          <Link href={onMoreHref} className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-zinc-500 hover:text-[#039D55]">
            Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : onMoreClick ? (
          <button
            type="button"
            onClick={onMoreClick}
            className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-zinc-500 hover:text-[#039D55]"
          >
            Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {slice.map((v) => {
          const yekcek = isYekcekVideo(v);
          const href = yekcek
            ? yektubeYekcekPath(pathHome, v.videoId)
            : v.sourceId
              ? yektubeWatchPath(v.sourceId, v.videoId, pathHome)
              : null;
          const card = (
            <>
              <div className={`relative overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200/80 ${aspect}`}>
                <YektubeVideoThumb
                  videoId={v.videoId}
                  thumbnail={v.thumbnail}
                  variant={variant}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
                {v.duration ? (
                  <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-0.5 text-[10px] font-bold text-white">
                    {v.duration}
                  </span>
                ) : null}
                {yekcek ? (
                  <span className="absolute left-1 top-1 rounded bg-[#039D55] px-1 py-0.5 text-[8px] font-black uppercase text-white">
                    Yekçek
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-zinc-900 group-hover:text-[#039D55]">
                {recommendationVideoTitle(v.title, v.channelName)}
              </p>
              {v.channelName ? <p className="mt-0.5 truncate text-[10px] text-zinc-500">{v.channelName}</p> : null}
            </>
          );
          if (!href) {
            return (
              <div key={`${v.videoId}-${v.id}`} className="group min-w-0 opacity-60">
                {card}
              </div>
            );
          }
          return (
            <Link key={`${v.videoId}-${v.id}`} href={href} className="group min-w-0">
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
