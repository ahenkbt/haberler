import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Pause, Play, SkipForward, X } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { decodeHtml } from "@/lib/constants";
import { VideoThumb } from "@/components/VideoThumb";
import { videoChannelLabel, videoWatchHref } from "@/lib/videoLinks";
import { useMusicPlayer } from "@/features/music/MusicContext";
import { MusicBackgroundEngine } from "@/components/MusicBackgroundEngine";
import { MusicBackgroundHint } from "@/components/MusicBackgroundHint";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MusicMiniPlayer({ className = "" }: { className?: string }) {
  const { current, playNext, clear } = useMusicPlayer();
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;

  const handleEnded = useCallback(() => {
    playNextRef.current();
  }, []);

  useEffect(() => {
    setPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  }, [current?.videoId]);

  if (!current?.videoId) return null;

  const title = decodeHtml(current.title ?? "");
  const channel = videoChannelLabel(current);
  const watchHref = videoWatchHref(current);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <RouteErrorBoundary label="music-player">
    <div
      className={`relative z-50 w-full max-w-full shrink-0 border-t border-[var(--color-yt-border)] bg-[var(--color-yt-surface)] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom,0px)] ${className}`}
    >
      <MusicBackgroundHint playing={playing} />

      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-yt-border)]"
        aria-hidden
      >
        <div
          className="h-full bg-[var(--color-yt-primary)] transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <MusicBackgroundEngine
        key={current.videoId}
        videoId={current.videoId}
        title={title}
        channelName={channel}
        thumbnailUrl={current.thumbnail ?? undefined}
        playing={playing}
        onEnded={handleEnded}
        onNext={handleEnded}
        onTimeUpdate={(time, total) => {
          setCurrentTime(time);
          if (total > 0) setDuration(total);
        }}
      />

      <div className="flex items-center gap-3 px-3 py-2">
        {watchHref ? (
          <Link
            href={watchHref}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
            aria-label={`${title} — video olarak aç`}
          >
            <VideoThumb
              videoId={current.videoId}
              thumbnail={current.thumbnail}
              quality="mq"
              className="h-full w-full object-cover"
            />
          </Link>
        ) : (
          <VideoThumb
            videoId={current.videoId}
            thumbnail={current.thumbnail}
            quality="mq"
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        )}
        {watchHref ? (
          <Link href={watchHref} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-[var(--color-yt-muted)]">
              {channel}
              {duration > 0 ? (
                <span className="ml-2 tabular-nums">
                  {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
                </span>
              ) : null}
            </p>
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-[var(--color-yt-muted)]">
              {channel}
              {duration > 0 ? (
                <span className="ml-2 tabular-nums">
                  {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
                </span>
              ) : null}
            </p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={playing ? "Duraklat" : "Oynat"}
            onClick={() => setPlaying((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-full yt-panel-hover"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label="Sonraki"
            onClick={playNext}
            className="flex h-10 w-10 items-center justify-center rounded-full yt-panel-hover"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          {watchHref ? (
            <Link
              href={watchHref}
              className="hidden rounded-full px-3 py-1.5 text-xs font-semibold yt-btn-primary sm:inline-flex"
            >
              Video
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              setPlaying(false);
              clear();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full yt-panel-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    </RouteErrorBoundary>
  );
}

export function MusicTrackRow({
  video,
  queue,
  index,
}: {
  video: YektubeVideo;
  queue: YektubeVideo[];
  index: number;
}) {
  const { current, play } = useMusicPlayer();
  const active = current?.id === video.id;
  const title = decodeHtml(video.title);
  const channel = videoChannelLabel(video);
  const watchHref = videoWatchHref(video);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${active ? "yt-nav-active" : "yt-row-hover"}`}
    >
      <button
        type="button"
        onClick={() => play(video, queue)}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--color-yt-thumb)]"
        aria-label={`${title} — oynat`}
      >
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white">
          {index + 1}
        </span>
      </button>
      <button type="button" onClick={() => play(video, queue)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-[var(--color-yt-muted)]">{channel}</p>
      </button>
      {video.duration ? (
        <span className="shrink-0 text-xs text-[var(--color-yt-muted)]">{video.duration}</span>
      ) : null}
      {watchHref ? (
        <Link href={watchHref} className="shrink-0 text-xs font-medium text-[var(--color-yt-muted)] hover:underline">
          Aç
        </Link>
      ) : null}
    </div>
  );
}
