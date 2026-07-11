import { useMemo } from "react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { cn } from "@/lib/cn";
import { videoThumbUrl } from "@/components/VideoThumb";

const CELL_COUNT = 10;

export function ChannelCoverMosaic({
  videos,
  className,
}: {
  videos: YektubeVideo[];
  className?: string;
}) {
  const cells = useMemo(() => {
    const urls: string[] = [];
    for (const v of videos) {
      const url = videoThumbUrl(v.videoId, v.thumbnail, "mq");
      if (url) urls.push(url);
      if (urls.length >= CELL_COUNT) break;
    }
    while (urls.length < CELL_COUNT) urls.push("");
    return urls;
  }, [videos]);

  return (
    <div
      className={cn(
        "grid w-full grid-cols-5 grid-rows-2 overflow-hidden bg-[var(--color-yt-thumb)]",
        className,
      )}
      aria-hidden
    >
      {cells.map((src, i) => (
        <div key={i} className="relative min-h-0 min-w-0 ring-[0.5px] ring-black/10">
          {src ? (
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading={i < 5 ? "eager" : "lazy"}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-yt-skeleton)]" />
          )}
        </div>
      ))}
    </div>
  );
}
