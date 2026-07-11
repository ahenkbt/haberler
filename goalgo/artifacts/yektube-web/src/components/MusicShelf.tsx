import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ExternalLink, Play } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { decodeHtml } from "@/lib/constants";
import { VideoThumb } from "@/components/VideoThumb";
import { useMusicPlayer } from "@/features/music/MusicContext";
import { unlockAudio } from "@/lib/audioUnlock";
import { videoWatchHref } from "@/lib/videoLinks";
import { cn } from "@/lib/cn";

export function MusicShelf({
  title,
  videos,
  queue,
  variant = "square",
  className,
}: {
  title: string;
  videos: YektubeVideo[];
  queue?: YektubeVideo[];
  variant?: "square" | "wide" | "circle";
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { play } = useMusicPlayer();
  const playQueue = queue ?? videos;

  if (videos.length === 0) return null;

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handlePlay = (video: YektubeVideo) => {
    unlockAudio();
    play(video, playQueue);
  };

  return (
    <section className={cn("mb-8 min-w-0 max-w-full", className)}>
      <div className="mb-3 flex items-center justify-between gap-2 px-4 lg:px-6">
        <h2 className="min-w-0 truncate text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Önceki"
            onClick={() => scroll(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Sonraki"
            onClick={() => scroll(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex min-w-0 max-w-full gap-4 overflow-x-auto px-4 pb-2 scrollbar-none lg:px-6">
        {videos.map((video) => {
          const titleText = decodeHtml(video.title);
          const subtitle = video.channelName ?? "Müzik";
          const watchHref = videoWatchHref(video);
          const cardW = variant === "wide" ? "w-56" : variant === "circle" ? "w-28" : "w-40";
          const aspect =
            variant === "wide" ? "aspect-video" : variant === "circle" ? "aspect-square rounded-full" : "aspect-square";
          return (
            <div key={`${video.id}-${video.videoId}`} className={cn("group shrink-0", cardW)}>
              <button
                type="button"
                onClick={() => handlePlay(video)}
                className="block w-full text-left"
              >
                <div className={cn("relative overflow-hidden rounded-lg bg-[var(--color-yt-thumb)]", aspect, variant === "circle" && "rounded-full")}>
                  <VideoThumb
                    videoId={video.videoId}
                    thumbnail={video.thumbnail}
                    quality="hq"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
                    <Play className="h-10 w-10 fill-white text-white" />
                  </span>
                </div>
              </button>
              <div className="mt-2 flex items-start gap-1">
                {watchHref ? (
                  <Link href={watchHref} className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold hover:underline">
                    {titleText}
                  </Link>
                ) : (
                  <p className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold">{titleText}</p>
                )}
                {watchHref ? (
                  <Link
                    href={watchHref}
                    aria-label="Videoyu aç"
                    className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--color-yt-muted)] hover:bg-[var(--color-yt-chip)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
              <p className="line-clamp-1 text-xs text-[var(--color-yt-muted)]">{subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MusicQuickPicks({
  title,
  videos,
  queue,
}: {
  title: string;
  videos: YektubeVideo[];
  queue?: YektubeVideo[];
}) {
  const { play } = useMusicPlayer();
  const playQueue = queue ?? videos;
  if (videos.length === 0) return null;

  const handlePlay = (video: YektubeVideo) => {
    unlockAudio();
    play(video, playQueue);
  };

  return (
    <section className="mb-8 min-w-0 px-4 lg:px-6">
      <h2 className="mb-3 text-xl font-bold tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => {
          const titleText = decodeHtml(video.title);
          const subtitle = video.channelName ?? "Müzik";
          return (
            <button
              key={`${video.id}-${video.videoId}`}
              type="button"
              onClick={() => handlePlay(video)}
              className="group flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[var(--color-yt-chip)]"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                <VideoThumb
                  videoId={video.videoId}
                  thumbnail={video.thumbnail}
                  quality="mq"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{titleText}</p>
                <p className="truncate text-xs text-[var(--color-yt-muted)]">{subtitle}</p>
              </div>
              {video.duration ? <span className="shrink-0 text-xs text-[var(--color-yt-muted)]">{video.duration}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
