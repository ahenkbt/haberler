import { useState } from "react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { ExternalLink } from "lucide-react";
import { VideoThumb } from "@/components/VideoThumb";
import { cn } from "@/lib/cn";

function resolveSourceUrl(video: YektubeVideo): string {
  const desc = video.description?.trim();
  if (desc?.startsWith("http")) return desc;
  if (video.platform === "instagram") {
    return `https://www.instagram.com/reel/${video.videoId}/`;
  }
  if (video.platform === "tiktok") {
    return `https://www.tiktok.com/video/${video.videoId}`;
  }
  return desc ?? "#";
}

function embedUrl(video: YektubeVideo): string | null {
  if (video.platform === "instagram") {
    return `https://www.instagram.com/reel/${encodeURIComponent(video.videoId)}/embed/`;
  }
  if (video.platform === "tiktok") {
    return `https://www.tiktok.com/embed/v2/${encodeURIComponent(video.videoId)}`;
  }
  return null;
}

export function SocialShortPlayer({
  video,
  title,
  className,
  onBlocked,
}: {
  video: YektubeVideo;
  title: string;
  className?: string;
  onBlocked?: () => void;
}) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const src = embedUrl(video);
  const sourceUrl = resolveSourceUrl(video);

  if (!src || embedFailed || video.embedAllowed === false) {
    return (
      <div className={cn("relative flex h-full w-full flex-col items-center justify-center bg-black", className)}>
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-white">{title}</p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-black hover:bg-white"
          >
            <ExternalLink className="h-4 w-4" />
            {video.platform === "instagram" ? "Instagram'da izle" : "TikTok'ta izle"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={src}
      className={cn("h-full w-full border-0 bg-black", className)}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      loading="eager"
      onError={() => {
        setEmbedFailed(true);
        onBlocked?.();
      }}
    />
  );
}

export function isSocialShortVideo(video: Pick<YektubeVideo, "platform">): boolean {
  return video.platform === "instagram" || video.platform === "tiktok";
}
