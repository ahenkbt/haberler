import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import type { VideoItem } from "@/pages/public/CanliTv";
import { YektubeYoutubePlayer } from "@/components/YektubeYoutubePlayer";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { displayVideoTitle } from "@/lib/yektubeVideoClassify";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { yektubeWatchPath } from "@/lib/yektubeUrls";
import { yektubeStreamPlayUrl } from "@/lib/yektubeStreamPlay";

type Phase = "poster" | "native" | "iframe" | "retry";

type Props = {
  video: VideoItem;
  isActive: boolean;
  pathHome: string;
  onUnplayable?: () => void;
};

function ShortsNativePlayer({
  videoId,
  title,
  attempt,
  onFail,
}: {
  videoId: string;
  title: string;
  attempt: number;
  onFail: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    const bootTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (v.currentTime < 0.05 && v.readyState < 2) onFail();
    }, 4500);

    const tryPlay = async () => {
      v.load();
      try {
        v.muted = true;
        await v.play();
        return;
      } catch {
        /* mobil tarayıcı sessiz otomatik oynatmayı dener */
      }
      if (cancelled) return;
      try {
        await v.play();
      } catch {
        if (!cancelled) onFail();
      }
    };

    void tryPlay();
    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
    };
  }, [videoId, attempt, onFail]);

  return (
    <video
      ref={videoRef}
      key={`${videoId}-${attempt}`}
      src={yektubeStreamPlayUrl(videoId, attempt)}
      title={title}
      className="absolute inset-0 h-full w-full object-cover lg:rounded-2xl"
      controls
      playsInline
      autoPlay
      loop
      onError={onFail}
    />
  );
}

export function YektubeShortsSlide({ video, isActive, pathHome, onUnplayable }: Props) {
  const allowIframe = video.embedAllowed !== false;
  const [phase, setPhase] = useState<Phase>("poster");
  const [attempt, setAttempt] = useState(0);
  const title = decodeHtmlEntities(displayVideoTitle(video.title, video.channelName));
  const channelName = video.channelName || "Yektube";
  const watchSourceId = video.sourceId ?? null;

  useEffect(() => {
    setPhase("poster");
    setAttempt(0);
  }, [video.videoId]);

  useEffect(() => {
    if (!isActive) {
      setPhase("poster");
      return;
    }
    /** Yekçek — iframe birincil; embed engellenirse (101/150/153) native proxy yedeği */
    setPhase(allowIframe ? "iframe" : "native");
    setAttempt(0);
  }, [isActive, video.videoId, allowIframe]);

  const handleNativeFail = useCallback(() => {
    if (attempt < 2) {
      setAttempt((n) => n + 1);
      return;
    }
    if (onUnplayable) onUnplayable();
    else setPhase("retry");
  }, [attempt, onUnplayable]);

  const handleEmbedBlocked = useCallback(() => {
    setAttempt(0);
    setPhase("native");
  }, []);

  const showNative = phase === "native" && isActive;
  const showIframe = phase === "iframe" && isActive && allowIframe;
  const showRetry = phase === "retry" && isActive;

  return (
    <div className="relative aspect-[9/16] h-full max-h-full w-full max-w-[480px] overflow-hidden bg-zinc-900 lg:rounded-2xl lg:shadow-2xl lg:ring-1 lg:ring-white/10">
      {showNative ? (
        <ShortsNativePlayer
          videoId={video.videoId}
          title={title}
          attempt={attempt}
          onFail={handleNativeFail}
        />
      ) : showIframe ? (
        <YektubeYoutubePlayer
          key={`${video.videoId}-${attempt}`}
          videoId={video.videoId}
          title={title}
          variant="shorts"
          autoplay
          className="absolute inset-0 h-full w-full rounded-none lg:rounded-2xl ring-0"
          onEmbedBlocked={handleEmbedBlocked}
        />
      ) : (
        <>
          <YektubeVideoThumb
            videoId={video.videoId}
            thumbnail={video.thumbnail}
            variant="portrait"
            loading={isActive ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover lg:rounded-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 lg:rounded-2xl" />
          {showRetry ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 px-4 lg:rounded-2xl">
              <p className="text-center text-sm font-medium text-white">Oynatılamadı</p>
              <button
                type="button"
                onClick={() => {
                  setAttempt(0);
                  setPhase(allowIframe ? "iframe" : "native");
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-zinc-900"
              >
                Tekrar dene
              </button>
              <button
                type="button"
                onClick={() => onUnplayable?.()}
                className="text-[10px] font-bold text-white/70 underline"
              >
                Sonraki
              </button>
            </div>
          ) : null}
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 pt-20 lg:rounded-b-2xl">
        <div className="pointer-events-auto flex items-center gap-2">
          {watchSourceId ? (
            <Link
              href={yektubeWatchPath(watchSourceId, video.videoId, pathHome)}
              className="truncate text-sm font-bold text-white hover:underline"
            >
              @{channelName.replace(/\s+/g, "")}
            </Link>
          ) : (
            <span className="truncate text-sm font-bold text-white">@{channelName.replace(/\s+/g, "")}</span>
          )}
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-zinc-900">
            Abone ol
          </span>
        </div>
        <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white">{title}</h2>
      </div>
    </div>
  );
}
