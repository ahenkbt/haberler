import type { YektubeVideo } from "@workspace/yektube-core";
import { ytRoutes } from "@/lib/routes";
import { Link } from "wouter";
import { VideoThumb } from "@/components/VideoThumb";
import { cn } from "@/lib/cn";
import { videoChannelLabel, videoWatchHref } from "@/lib/videoLinks";

function watchHref(video: YektubeVideo): string | undefined {
  return videoWatchHref(video);
}

export function VideoFeedItem({
  video,
  className,
}: {
  video: YektubeVideo;
  className?: string;
}) {
  const channel = videoChannelLabel(video);
  const initial = channel.charAt(0).toUpperCase();
  const href = watchHref(video);

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-yt-thumb)]">
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="h-full w-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {video.duration}
          </span>
        ) : null}
      </div>
      <div className="flex gap-3 px-3 py-3 lg:px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-avatar text-sm font-bold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-medium leading-snug">{video.title}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-yt-muted)]">
            {channel}
            {video.publishedAt ? ` · ${video.publishedAt}` : ""}
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("block border-b border-[var(--color-yt-border)] yt-panel lg:border-0", className)}>
        {body}
      </Link>
    );
  }
  return <div className={cn("border-b border-[var(--color-yt-border)]", className)}>{body}</div>;
}

export function VideoGridCard({ video }: { video: YektubeVideo }) {
  const href = watchHref(video);
  const inner = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
            {video.duration}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-avatar text-xs font-bold">
          {(video.channelName ?? "Y").charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-yt-muted)]">{videoChannelLabel(video)}</p>
        </div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {inner}
      </Link>
    );
  }
  return <div className="min-w-0">{inner}</div>;
}

export function RelatedVideoRow({ video }: { video: YektubeVideo }) {
  return <VideoWatchListItem video={video} />;
}

export function VideoWatchListItem({
  video,
  showDate = false,
}: {
  video: YektubeVideo;
  showDate?: boolean;
}) {
  const href = watchHref(video);
  const channel = videoChannelLabel(video);
  const meta = [channel];
  if (showDate && video.publishedAt) meta.push(video.publishedAt);
  else if (video.duration) meta.push(video.duration);

  const row = (
    <div className="flex gap-3 rounded-xl p-2 yt-row-hover">
      <div className="relative aspect-video w-[168px] shrink-0 overflow-hidden rounded-xl bg-[var(--color-yt-thumb)] sm:w-[42%] sm:max-w-[220px]">
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="h-full w-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1 py-0.5 text-[10px] font-semibold text-white">
            {video.duration}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug sm:text-[15px]">{video.title}</p>
        <p className="mt-1.5 line-clamp-1 text-xs text-[var(--color-yt-muted)]">{meta.join(" · ")}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{row}</Link>;
  return row;
}
