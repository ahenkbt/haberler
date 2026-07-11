import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { loadYoutubeIframeApi } from "@/lib/youtubeIframeApi";
import { destroyYoutubePlayer } from "@/lib/youtubePlayerCleanup";
import { youtubeStreamPlayUrl } from "@/lib/api";
import { useBackgroundPlaybackKeepAlive, useMediaSession } from "@/hooks/useMediaSession";
import { yektubeAssetUrl } from "@/lib/assetUrl";
import { STOP_ALL_MEDIA_EVENT, type StopAllMediaDetail } from "@/lib/mediaControl";
import { AUDIO_UNLOCK_EVENT, unlockAudio } from "@/lib/audioUnlock";

type MusicYtPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
};

function bindMusicResume(onResume: () => void): () => void {
  const resume = () => {
    if (document.visibilityState === "hidden") return;
    onResume();
  };
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) onResume();
  };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", resume);
  window.addEventListener("focus", resume);
  return () => {
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("pagehide", resume);
    window.removeEventListener("focus", resume);
  };
}

/** Gizli iframe — müzik birincil yol (Railway /play bypass). SW thread kullanılmaz. */
function MusicIframeFallback({
  videoId,
  playing,
  onEnded,
  onTimeUpdate,
  onFailed,
  onPlayingChange,
  controlRef,
}: {
  videoId: string;
  playing: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onFailed?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  controlRef?: MutableRefObject<{ play: () => void; pause: () => void } | null>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MusicYtPlayer | null>(null);
  const shouldPlayRef = useRef(playing);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onFailedRef = useRef(onFailed);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const endedFiredRef = useRef(false);
  const trackStartedAtRef = useRef(Date.now());
  shouldPlayRef.current = playing;
  onEndedRef.current = onEnded;
  onTimeUpdateRef.current = onTimeUpdate;
  onFailedRef.current = onFailed;
  onPlayingChangeRef.current = onPlayingChange;

  useEffect(() => {
    endedFiredRef.current = false;
    trackStartedAtRef.current = Date.now();
  }, [videoId]);

  const fireEndedOnce = () => {
    if (endedFiredRef.current) return;
    endedFiredRef.current = true;
    onEndedRef.current?.();
  };

  useEffect(() => {
    let cancelled = false;
    let inst: MusicYtPlayer | null = null;
    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      inst = new window.YT.Player(hostRef.current, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: 1,
        height: 1,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            playerRef.current = inst;
            if (controlRef) {
              controlRef.current = {
                play: () => {
                  try {
                    unlockAudio();
                    inst?.playVideo();
                  } catch {
                    /* ignore */
                  }
                },
                pause: () => {
                  try {
                    inst?.pauseVideo();
                  } catch {
                    /* ignore */
                  }
                },
              };
            }
            if (shouldPlayRef.current) {
              unlockAudio();
              try {
                inst?.playVideo();
              } catch {
                /* ignore */
              }
            }
          },
          onStateChange: (e: { data?: number }) => {
            const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
            const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
            const endedState = window.YT?.PlayerState?.ENDED ?? 0;
            if (e.data === playingState || e.data === bufferingState) {
              onPlayingChangeRef.current?.(true);
            } else if (e.data === endedState) {
              onPlayingChangeRef.current?.(false);
              fireEndedOnce();
            } else {
              onPlayingChangeRef.current?.(false);
            }
          },
          onError: () => {
            onFailedRef.current?.();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (controlRef) controlRef.current = null;
      onPlayingChangeRef.current?.(false);
      destroyYoutubePlayer(inst, hostRef.current);
    };
  }, [videoId, controlRef]);

  useEffect(() => {
    const resume = () => {
      const p = playerRef.current;
      if (!p || !shouldPlayRef.current) return;
      unlockAudio();
      try {
        const state = p.getPlayerState?.();
        const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
        const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
        if (state !== playingState && state !== bufferingState) p.playVideo();
      } catch {
        /* ignore */
      }
    };
    return bindMusicResume(resume);
  }, [videoId]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      unlockAudio();
      try {
        p.playVideo();
      } catch {
        /* ignore */
      }
    } else {
      p.pauseVideo();
      onPlayingChangeRef.current?.(false);
    }
  }, [playing, videoId]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const current = p.getCurrentTime?.() ?? 0;
        const total = p.getDuration?.() ?? 0;
        onTimeUpdateRef.current?.(current, total);
        const state = p.getPlayerState?.();
        const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
        const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
        const endedState = window.YT?.PlayerState?.ENDED ?? 0;
        const pausedState = window.YT?.PlayerState?.PAUSED ?? 2;
        onPlayingChangeRef.current?.(state === playingState || state === bufferingState);
        const playedMs = Date.now() - trackStartedAtRef.current;
        if (playedMs >= 4000 && total > 8 && current >= total - 1.25) {
          fireEndedOnce();
          return;
        }
        if (state === endedState) {
          fireEndedOnce();
          return;
        }
        if (
          shouldPlayRef.current &&
          state !== playingState &&
          state !== bufferingState &&
          state !== pausedState &&
          state !== endedState
        ) {
          unlockAudio();
          p.playVideo?.();
        }
      } catch {
        /* ignore */
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [playing, videoId]);

  return (
    <div ref={hostRef} className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0" aria-hidden />
  );
}

/** Müzik — iframe birincil; native /play yalnızca iframe başarısız olursa */
export function MusicBackgroundEngine({
  videoId,
  title,
  channelName,
  thumbnailUrl,
  playing,
  onEnded,
  onNext,
  onTimeUpdate,
}: {
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  playing: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldPlayRef = useRef(playing);
  shouldPlayRef.current = playing;
  const [retryGen, setRetryGen] = useState(0);
  const [useNativeStream, setUseNativeStream] = useState(false);
  const src = youtubeStreamPlayUrl(videoId, retryGen > 0, true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [iframePlaying, setIframePlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const iframeControlRef = useRef<{ play: () => void; pause: () => void } | null>(null);

  useEffect(() => {
    setRetryGen(0);
    setUseNativeStream(false);
    setDuration(0);
    setPosition(0);
    setIframePlaying(false);
  }, [videoId]);

  useEffect(() => {
    if (!useNativeStream) return;
    void fetch(`/api/video/youtube-stream/${encodeURIComponent(videoId)}?audio=1`).catch(() => undefined);
  }, [videoId, useNativeStream]);

  useEffect(() => {
    if (!useNativeStream) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (!playing) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    unlockAudio();
    audio.muted = false;
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        audio.muted = true;
        void audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
  }, [playing, src, videoId, useNativeStream]);

  useEffect(() => {
    if (!useNativeStream) return;
    const audio = audioRef.current;
    if (!audio) return;
    const onFail = () => {
      if (!shouldPlayRef.current) return;
      if (retryGen >= 2) {
        setUseNativeStream(false);
        setRetryGen(0);
        setIsPlaying(false);
        return;
      }
      setRetryGen((g) => g + 1);
    };
    audio.addEventListener("error", onFail);
    return () => audio.removeEventListener("error", onFail);
  }, [src, videoId, retryGen, useNativeStream]);

  useEffect(() => {
    if (!useNativeStream) return;
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio || !playing) return;
      audio.muted = false;
      void audio.play().catch(() => undefined);
    };
    unlock();
    window.addEventListener(AUDIO_UNLOCK_EVENT, unlock);
    return () => window.removeEventListener(AUDIO_UNLOCK_EVENT, unlock);
  }, [playing, src, videoId, useNativeStream]);

  useEffect(() => {
    if (useNativeStream) return;
    const resume = () => {
      if (!shouldPlayRef.current) return;
      unlockAudio();
      iframeControlRef.current?.play();
    };
    return bindMusicResume(resume);
  }, [useNativeStream, videoId]);

  useEffect(() => {
    const stop = (e: Event) => {
      const detail = (e as CustomEvent<StopAllMediaDetail>).detail;
      if (detail?.includeMusic === false) return;
      const audio = audioRef.current;
      if (!audio || audio.dataset.yektubeMusic !== "1") return;
      audio.pause();
      setIsPlaying(false);
    };
    window.addEventListener(STOP_ALL_MEDIA_EVENT, stop);
    return () => window.removeEventListener(STOP_ALL_MEDIA_EVENT, stop);
  }, []);

  const handleIframeTime = (time: number, total: number) => {
    setPosition(time);
    if (total > 0) setDuration(total);
    onTimeUpdate?.(time, total);
  };

  useMediaSession({
    title,
    artist: channelName,
    artworkUrl: thumbnailUrl ?? yektubeAssetUrl("yektube-icon.png"),
    playing: useNativeStream ? isPlaying && playing : playing && iframePlaying,
    duration: duration > 0 ? duration : undefined,
    position: duration > 0 ? position : undefined,
    mediaRef: useNativeStream ? audioRef : undefined,
    onPlay: () => {
      unlockAudio();
      if (!useNativeStream) {
        iframeControlRef.current?.play();
        setIframePlaying(true);
        return;
      }
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    },
    onPause: () => {
      if (!useNativeStream) {
        iframeControlRef.current?.pause();
        setIframePlaying(false);
        return;
      }
      audioRef.current?.pause();
      setIsPlaying(false);
    },
    onNext,
  });

  useBackgroundPlaybackKeepAlive(audioRef, playing && useNativeStream, {
    onStall: () => {
      if (!shouldPlayRef.current) return;
      if (retryGen >= 2) return;
      setRetryGen((g) => g + 1);
    },
  });

  const handleIframeFailed = () => {
    setUseNativeStream(true);
    setRetryGen(0);
  };

  if (!useNativeStream) {
    return (
      <MusicIframeFallback
        videoId={videoId}
        playing={playing}
        onEnded={onEnded}
        onTimeUpdate={handleIframeTime}
        onPlayingChange={setIframePlaying}
        onFailed={handleIframeFailed}
        controlRef={iframeControlRef}
      />
    );
  }

  return (
    <audio
      ref={audioRef}
      key={`${videoId}-${retryGen}`}
      src={src}
      playsInline
      preload="auto"
      data-yektube-music="1"
      className="pointer-events-none fixed -left-[9999px] top-0 h-[100px] w-[100px]"
      aria-hidden
      onPlay={() => setIsPlaying(true)}
      onPause={() => {
        if (!shouldPlayRef.current) setIsPlaying(false);
      }}
      onEnded={() => onEnded?.()}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        const total = el.duration || 0;
        setPosition(el.currentTime);
        if (total > 0) setDuration(total);
        onTimeUpdate?.(el.currentTime, total);
      }}
    />
  );
}

