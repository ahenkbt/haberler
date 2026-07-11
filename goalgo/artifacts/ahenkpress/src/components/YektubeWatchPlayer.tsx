import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { YektubeYoutubePlayer } from "@/components/YektubeYoutubePlayer";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { yektubeStreamPlayUrl } from "@/lib/yektubeStreamPlay";

type Mode = "poster" | "iframe" | "native";

function streamPlayUrl(videoId: string, attempt: number): string {
  return yektubeStreamPlayUrl(videoId, attempt);
}

function NativeStreamPlayer({
  videoId,
  title,
  className = "",
  attempt,
  onFail,
}: {
  videoId: string;
  title: string;
  className?: string;
  attempt: number;
  onFail: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;

    const tryPlay = async () => {
      v.load();
      try {
        v.muted = false;
        await v.play();
        return;
      } catch {
        /* mobil tarayıcı sessiz otomatik oynatmayı dener */
      }
      if (cancelled) return;
      v.muted = true;
      try {
        await v.play();
      } catch {
        if (!cancelled) onFail();
      }
    };

    void tryPlay();
    return () => {
      cancelled = true;
    };
  }, [videoId, attempt, onFail]);

  const youtubeHref = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-zinc-200 ${className}`.trim()}
    >
      <video
        ref={videoRef}
        key={`${videoId}-${attempt}`}
        src={streamPlayUrl(videoId, attempt)}
        title={title}
        className="h-full w-full object-contain"
        controls
        playsInline
        autoPlay
        onError={onFail}
      />
      <a
        href={youtubeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm hover:bg-black/85"
      >
        <ExternalLink className="h-3 w-3" />
        YouTube
      </a>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end p-2 sm:p-3">
        <YektubePlayerMark coverYoutubeCorner playerVariant="watch" />
      </div>
    </div>
  );
}

/**
 * Site içi oynatıcı — iframe birincil; embed engellenirse (101/150/153) native proxy yedeği.
 * embedAllowed=false ise yalnızca native proxy denenir.
 */
export function YektubeWatchPlayer({
  videoId,
  title,
  thumbnail,
  className = "",
  autoplay = false,
  embedAllowed = true,
}: {
  videoId: string;
  title: string;
  thumbnail?: string | null;
  className?: string;
  autoplay?: boolean;
  embedAllowed?: boolean;
}) {
  const allowIframe = embedAllowed !== false;
  const preferIframeFirst = allowIframe;

  const [mode, setMode] = useState<Mode>(() => {
    if (!autoplay) return "poster";
    return preferIframeFirst ? "iframe" : "native";
  });
  const [attempt, setAttempt] = useState(0);
  const maxNativeRetries = allowIframe ? 2 : 6;
  const displayTitle = decodeHtmlEntities(title);

  useEffect(() => {
    setMode(!autoplay ? "poster" : preferIframeFirst ? "iframe" : "native");
    setAttempt(0);
  }, [videoId, autoplay, preferIframeFirst]);

  const handleNativeFail = useCallback(() => {
    if (attempt < maxNativeRetries) {
      setAttempt((n) => n + 1);
      return;
    }
    setMode("poster");
  }, [attempt, maxNativeRetries]);

  const handleEmbedBlocked = useCallback(() => {
    if (attempt < maxNativeRetries) {
      setAttempt((n) => n + 1);
      setMode("native");
      return;
    }
    setMode("poster");
  }, [attempt, maxNativeRetries]);

  const startPlayback = useCallback(() => {
    setAttempt(0);
    setMode(preferIframeFirst ? "iframe" : "native");
  }, [preferIframeFirst]);

  if (mode === "iframe" && allowIframe) {
    return (
      <YektubeYoutubePlayer
        videoId={videoId}
        title={displayTitle}
        className={className}
        autoplay
        onEmbedBlocked={handleEmbedBlocked}
      />
    );
  }

  if (mode === "native") {
    return (
      <NativeStreamPlayer
        videoId={videoId}
        title={displayTitle}
        className={className}
        attempt={attempt}
        onFail={handleNativeFail}
      />
    );
  }

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 shadow-sm ring-1 ring-zinc-200 ${className}`.trim()}
    >
      <YektubeVideoThumb
        videoId={videoId}
        thumbnail={thumbnail}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <button
          type="button"
          onClick={startPlayback}
          className="group flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl ring-2 ring-white/50 transition-transform hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]"
          aria-label="Oynat"
        >
          <Play className="ml-1 h-8 w-8 fill-zinc-900 text-zinc-900 sm:h-9 sm:w-9" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end p-2 sm:p-3">
        <YektubePlayerMark coverYoutubeCorner playerVariant="watch" />
      </div>
    </div>
  );
}
