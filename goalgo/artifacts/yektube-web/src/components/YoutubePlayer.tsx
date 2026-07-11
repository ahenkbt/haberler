import { useCallback, useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
} from "lucide-react";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";
import { useBackgroundPlaybackKeepAlive, useMediaSession } from "@/hooks/useMediaSession";
import { useAutoPictureInPicture, usePictureInPicture } from "@/hooks/usePictureInPicture";
import { loadYoutubeIframeApi } from "@/lib/youtubeIframeApi";
import { destroyYoutubePlayer } from "@/lib/youtubePlayerCleanup";
import { youtubeStreamPlayUrl, fetchYoutubeLiveStream, youtubeCaptionsTrUrl } from "@/lib/api";
import { yektubeAssetUrl } from "@/lib/assetUrl";
import { cn } from "@/lib/cn";
import { readLowBandwidthMode, readBackgroundPlayback, readPlaybackVolume } from "@/lib/yektubePlaybackPrefs";
import { PlayerVolumeControl } from "@/components/PlayerVolumeControl";
import {
  AUDIO_UNLOCK_EVENT,
  SHORTS_SOUND_EVENT,
  enableShortsSound,
  prefersUnmutedPlayback,
  unlockAudio,
} from "@/lib/audioUnlock";
import { STOP_ALL_MEDIA_EVENT, type StopAllMediaDetail } from "@/lib/mediaControl";

type Props = {
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  className?: string;
  onBlocked?: () => void;
  showChrome?: boolean;
  isLive?: boolean;
  /** false ise iframe denenmez — sadece doğrudan akış */
  embedAllowed?: boolean;
  /** Yektube barındırılmış video — YouTube akışı atlanır */
  directSrc?: string;
  /** Müzik modu — mobilde sessize alma, ses öncelikli */
  audioMode?: boolean;
  /** Kontrollü duraklat (mini oynatıcı) */
  paused?: boolean;
  /** Parça bittiğinde (müzik sırası) */
  onEnded?: () => void;
  /** Mobilde uygulama arka plana geçince PiP dene */
  autoPiP?: boolean;
  /** Yekçek — native başarısız olursa iframe yedeği (embed izinliyse) */
  shortsMode?: boolean;
  /** Yekçek — aynı videoyu döngüye al (varsayılan kapalı → auto-next) */
  shortsLoop?: boolean;
  /** Türkçe altyazı tercihi (iframe cc_load_policy / native track) */
  subtitlesOn?: boolean;
};

type YtPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  unMute: () => void;
  mute: () => void;
  setVolume: (v: number) => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (s: number, allow: boolean) => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => YtPlayer;
      PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING?: number; CUED?: number; UNSTARTED?: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Native proxy takılırsa iframe'e dönmeden önce bekleme süresi */
const NATIVE_BOOT_TIMEOUT_MS = 7000;
/** iframe oynatma başlamazsa native yedeğe geç (izleme — embed yavaş açılabilir) */
const IFRAME_PLAY_TIMEOUT_MS = 10000;
/** Yekçek — native proxy'de daha kısa bekleme */
const SHORTS_NATIVE_BOOT_TIMEOUT_MS = 2800;
/** Yekçek — iframe oynatma başlamazsa native / sonraki slayt */
const SHORTS_IFRAME_PLAY_TIMEOUT_MS = 3200;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Mobil tarayıcı / dar viewport — sessiz autoplay ve iframe-first tercihi */
function isMobilePlaybackDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 1023px)").matches ||
    /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  );
}

function PlayerBrand({ shortsMode = false }: { shortsMode?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[2] flex",
        shortsMode
          ? "bottom-11 right-2 items-end justify-end sm:bottom-12 sm:right-2.5"
          : "bottom-11 right-2 items-end justify-end sm:bottom-12 sm:right-2.5",
      )}
    >
      <YektubePlayerMark
        coverYoutubeCorner
        playerVariant={shortsMode ? "shorts" : "watch"}
        className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
      />
    </div>
  );
}

function NativeStreamPlayer({
  src,
  audioSrc,
  videoId,
  title,
  channelName,
  thumbnailUrl,
  autoplay,
  className,
  showChrome,
  isLive,
  onError,
  audioMode,
  paused,
  onEnded,
  autoPiP,
  shortsMode,
  shortsLoop,
  subtitlesOn = false,
  onStreamReady,
}: {
  src: string;
  /** Canlı DASH — video-only + ayrı ses akışı */
  audioSrc?: string;
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  className?: string;
  showChrome?: boolean;
  isLive?: boolean;
  onError?: () => void;
  audioMode?: boolean;
  paused?: boolean;
  onEnded?: () => void;
  autoPiP?: boolean;
  shortsMode?: boolean;
  shortsLoop?: boolean;
  subtitlesOn?: boolean;
  onStreamReady?: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const errorTimerRef = useRef(0);
  const splitAudio = Boolean(audioSrc);
  const [playing, setPlaying] = useState(Boolean(autoplay && !paused));
  const [muted, setMuted] = useState(
    () => Boolean(shortsMode && autoplay && !prefersUnmutedPlayback(false, shortsMode)),
  );
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [volume, setVolume] = useState(() => readPlaybackVolume());
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fs, setFs] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [showStalledPlay, setShowStalledPlay] = useState(false);

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;
    if (splitAudio) {
      v.muted = true;
      if (a) {
        a.volume = volume;
        a.muted = muted || volume === 0;
      }
      return;
    }
    v.volume = volume;
    v.muted = muted || volume === 0;
  }, [volume, muted, splitAudio]);

  const applyVolumeLevel = useCallback(
    (level: number) => {
      const v = videoRef.current;
      const a = audioRef.current;
      setVolume(level);
      setMuted(level === 0);
      if (level > 0) unlockAudio();
      if (splitAudio && a) {
        a.volume = level;
        a.muted = level === 0;
        if (v) v.muted = true;
      } else if (v) {
        v.volume = level;
        v.muted = level === 0;
      }
    },
    [splitAudio],
  );

  const setMutedState = useCallback(
    (muteFlag: boolean) => {
      setMuted(muteFlag);
      if (!muteFlag) unlockAudio();
      const v = videoRef.current;
      const a = audioRef.current;
      if (splitAudio && a) {
        a.muted = muteFlag || volume === 0;
      } else if (v) {
        v.muted = muteFlag || volume === 0;
      }
    },
    [splitAudio, volume],
  );

  useEffect(() => {
    setBuffering(true);
    setPlaying(false);
    setShowStalledPlay(false);
  }, [src, audioSrc]);

  useEffect(() => {
    if (playing || shortsMode) {
      setShowStalledPlay(false);
      return;
    }
    const delayMs = shortsMode ? 4000 : 2500;
    const timer = window.setTimeout(() => setShowStalledPlay(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [playing, shortsMode, src, audioSrc]);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!splitAudio || !v || !a) return;

    const syncAudio = () => {
      if (Math.abs(a.currentTime - v.currentTime) > 0.35) {
        try {
          a.currentTime = v.currentTime;
        } catch {
          /* ignore seek on live edge */
        }
      }
    };

    v.addEventListener("timeupdate", syncAudio);
    v.addEventListener("seeking", syncAudio);
    return () => {
      v.removeEventListener("timeupdate", syncAudio);
      v.removeEventListener("seeking", syncAudio);
    };
  }, [splitAudio, src, audioSrc]);

  useEffect(() => {
    if (!autoplay || paused || !onError) return;
    /** Sunucu tarafı stream çözümlemesi — embed kapalı videolarda kısa zaman aşımı */
    const stuckMs = shortsMode ? SHORTS_NATIVE_BOOT_TIMEOUT_MS : isLive ? 8000 : NATIVE_BOOT_TIMEOUT_MS;
    const timer = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.error) return;
      const stuck = v.currentTime < 0.05 && v.readyState < 2;
      const failed = v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
      if (stuck || failed) onError();
    }, stuckMs);
    return () => window.clearTimeout(timer);
  }, [src, autoplay, paused, onError, shortsMode, isLive]);

  const attemptPlay = useCallback(async () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || paused) return;
    if (!splitAudio) {
      v.muted = false;
      setMuted(false);
    }
    try {
      await v.play();
      if (splitAudio && a) await a.play().catch(() => undefined);
      setPlaying(true);
      setBuffering(false);
      if (shortsMode) enableShortsSound();
      setNeedsUnmute(false);
      return;
    } catch {
      /* sessiz otomatik oynatma */
    }
    if (splitAudio) {
      v.muted = true;
      setMuted(true);
      try {
        await v.play();
        if (a) await a.play().catch(() => undefined);
        setPlaying(true);
        setBuffering(false);
      } catch {
        setPlaying(false);
      }
      return;
    }
    v.muted = true;
    setMuted(true);
    try {
      await v.play();
      setPlaying(true);
      setBuffering(false);
    } catch {
      setPlaying(false);
    }
  }, [paused, splitAudio, shortsMode]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!autoplay) return;

    if (v.readyState >= 2 && !v.paused && v.currentTime > 0.35) return;
    void attemptPlay();
  }, [src, autoplay, paused, audioMode, attemptPlay]);

  useEffect(() => {
    const applyUnlocked = () => {
      if (!prefersUnmutedPlayback(audioMode, shortsMode)) return;
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      setMuted(false);
      setNeedsUnmute(false);
      if (autoplay && !paused) void v.play().catch(() => setPlaying(false));
    };

    applyUnlocked();
    window.addEventListener(AUDIO_UNLOCK_EVENT, applyUnlocked);
    window.addEventListener(SHORTS_SOUND_EVENT, applyUnlocked);
    return () => {
      window.removeEventListener(AUDIO_UNLOCK_EVENT, applyUnlocked);
      window.removeEventListener(SHORTS_SOUND_EVENT, applyUnlocked);
    };
  }, [audioMode, shortsMode, autoplay, paused, src]);

  useEffect(() => {
    if (!audioMode || paused) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    void v.play().catch(() => setPlaying(false));
  }, [audioMode, paused, src]);

  useEffect(() => {
    const stop = (e: Event) => {
      const detail = (e as CustomEvent<StopAllMediaDetail>).detail;
      if (detail?.musicOnly) return;
      const v = videoRef.current;
      if (!v) return;
      v.pause();
      v.muted = true;
      setPlaying(false);
    };
    window.addEventListener(STOP_ALL_MEDIA_EVENT, stop);
    return () => window.removeEventListener(STOP_ALL_MEDIA_EVENT, stop);
  }, []);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {
          /* ignore */
        }
      }
      if (a) {
        try {
          a.pause();
          a.removeAttribute("src");
          a.load();
        } catch {
          /* ignore */
        }
      }
    };
  }, [src, audioSrc]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;
    if (v.paused) {
      unlockAudio();
      if (!splitAudio) {
        v.muted = false;
        setMuted(false);
      }
      void v
        .play()
        .then(async () => {
          if (splitAudio && a) await a.play().catch(() => undefined);
          setPlaying(true);
        })
        .catch(() => setPlaying(false));
    } else {
      v.pause();
      a?.pause();
      setPlaying(false);
    }
  }, [splitAudio]);

  const toggleFs = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const tryPip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* ignore */
    }
  }, []);

  useMediaSession({
    title,
    artist: channelName,
    artworkUrl: thumbnailUrl ?? yektubeAssetUrl("yektube-icon.png"),
    playing,
    duration: isLive ? undefined : duration,
    position: isLive ? undefined : progress,
    videoRef,
    onPlay: () => {
      const v = videoRef.current;
      if (!v) return;
      void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    },
    onPause: () => {
      videoRef.current?.pause();
      setPlaying(false);
    },
  });

  useBackgroundPlaybackKeepAlive(videoRef, readBackgroundPlayback() && playing && !paused, {
    onStall: () => {
      if (onError) onError();
    },
    audioRef,
  });
  const { enterPiP, supported: pipSupported } = usePictureInPicture(videoRef);
  useAutoPictureInPicture(
    videoRef,
    readBackgroundPlayback() && (Boolean(autoPiP) || Boolean(isLive)) && playing && !paused,
  );

  return (
    <div ref={shellRef} className={cn("yt-player-wrap group relative overflow-hidden bg-black", className)}>
      {autoPiP && pipSupported ? (
        <button
          type="button"
          aria-label="Küçük ekranda oynat"
          onClick={() => void enterPiP()}
          className="absolute right-2 top-2 z-[4] flex items-center gap-1 rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm md:hidden"
        >
          <PictureInPicture2 className="h-4 w-4" />
          Küçük ekran
        </button>
      ) : null}
      <video
        ref={videoRef}
        src={src}
        title={title}
        poster={thumbnailUrl}
        className={cn("h-full w-full", showChrome === false ? "object-cover" : "object-contain")}
        playsInline
        preload="auto"
        loop={Boolean(shortsLoop)}
        muted={splitAudio || muted}
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          setBuffering(false);
          if (shortsMode && muted && !prefersUnmutedPlayback(false, shortsMode)) setNeedsUnmute(true);
        }}
        onPause={() => {
          if (autoplay && !paused && typeof document !== "undefined" && document.visibilityState !== "visible") {
            window.setTimeout(() => void attemptPlay(), 250);
            return;
          }
          setPlaying(false);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => {
          setBuffering(false);
          onStreamReady?.();
          if (autoplay && !paused) void attemptPlay();
        }}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          if (!shortsLoop) onEnded?.();
        }}
        onError={() => {
          window.clearTimeout(errorTimerRef.current);
          errorTimerRef.current = window.setTimeout(() => onError?.(), 2500);
        }}
      >
        {subtitlesOn && videoId ? (
          <track kind="subtitles" src={youtubeCaptionsTrUrl(videoId)} srcLang="tr" label="Türkçe" default />
        ) : null}
      </video>
      {audioSrc ? (
        <audio ref={audioRef} src={audioSrc} preload="auto" className="hidden" aria-hidden />
      ) : null}
      {buffering && autoplay && !playing ? (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : null}
      {!playing && !shortsMode && (showChrome === false || showStalledPlay) ? (
        <button
          type="button"
          aria-label="Oynat"
          onClick={togglePlay}
          className="absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
        >
          <Play className="h-16 w-16 fill-white text-white opacity-90" />
        </button>
      ) : null}
      {needsUnmute && shortsMode && playing ? (
        <button
          type="button"
          aria-label="Sesi aç"
          onClick={() => {
            enableShortsSound();
            const v = videoRef.current;
            if (v) {
              v.muted = false;
              setMuted(false);
            }
            setNeedsUnmute(false);
          }}
          className="absolute right-3 top-14 z-[4] rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
        >
          Sesi aç
        </button>
      ) : null}
      {isLive ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[3] rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          CANLI
        </div>
      ) : null}
      <PlayerBrand shortsMode={shortsMode} />
      {showChrome !== false ? (
        <div className="absolute inset-x-0 bottom-0 z-[20] bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2 pt-8 pr-[7.5rem] opacity-100 transition-opacity max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {!isLive ? (
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={progress}
              aria-label="İlerleme"
              className="mb-2 h-1 w-full accent-white"
              onChange={(e) => {
                const t = Number(e.target.value);
                setProgress(t);
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
            />
          ) : null}
          <div className="flex items-center gap-2 text-white">
            <button type="button" aria-label={playing ? "Duraklat" : "Oynat"} onClick={togglePlay} className="rounded p-1 hover:bg-white/15">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <span className="text-xs tabular-nums">
              {isLive ? formatTime(progress) : `${formatTime(progress)} / ${formatTime(duration)}`}
            </span>
            <PlayerVolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={applyVolumeLevel}
              onMutedChange={setMutedState}
            />
            <div className="ml-auto flex shrink-0 gap-1">
              {pipSupported ? (
                <button type="button" aria-label="Küçük ekran" onClick={() => void (enterPiP() || tryPip())} className="rounded p-1 hover:bg-white/15">
                  <PictureInPicture2 className="h-4 w-4" />
                </button>
              ) : null}
              <button type="button" aria-label={fs ? "Tam ekrandan çık" : "Tam ekran"} onClick={() => void toggleFs()} className="relative z-[21] rounded p-1 hover:bg-white/15">
                {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ytVolumePercent(level: number): number {
  return Math.round(Math.min(1, Math.max(0, level)) * 100);
}

function YoutubeApiPlayer({
  videoId,
  title,
  channelName,
  thumbnailUrl,
  autoplay,
  className,
  showChrome,
  isLive,
  onBlocked,
  audioMode,
  paused,
  onEnded,
  shortsMode,
  shortsLoop,
  subtitlesOn = false,
}: Props & {
  onBlocked?: () => void;
  audioMode?: boolean;
  paused?: boolean;
  onEnded?: () => void;
  shortsMode?: boolean;
  shortsLoop?: boolean;
  subtitlesOn?: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  const onBlockedRef = useRef(onBlocked);
  const [ready, setReady] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fs, setFs] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [volume, setVolume] = useState(() => readPlaybackVolume());
  const [muted, setMuted] = useState(
    () =>
      Boolean(
        autoplay &&
          !prefersUnmutedPlayback(audioMode, shortsMode) &&
          (shortsMode || isMobilePlaybackDevice()),
      ),
  );
  const volumeRef = useRef(volume);
  const shortsLoopRef = useRef(shortsLoop);

  volumeRef.current = volume;
  onEndedRef.current = onEnded;
  onBlockedRef.current = onBlocked;
  shortsLoopRef.current = shortsLoop;

  const notifyEmbedBlocked = useCallback(() => {
    setEmbedBlocked(true);
    onBlockedRef.current?.();
  }, []);

  const applyYtVolume = useCallback((level: number, muteFlag?: boolean) => {
    const p = playerRef.current;
    if (!p) return;
    const mute = muteFlag ?? level === 0;
    try {
      if (mute) p.mute?.();
      else {
        p.unMute?.();
        p.setVolume?.(ytVolumePercent(level));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inst: YtPlayer | null = null;
    setEmbedBlocked(false);

    const applySound = (p: YtPlayer | null | undefined) => {
      if (!p || !prefersUnmutedPlayback(audioMode, shortsMode)) return;
      try {
        p.unMute?.();
        p.setVolume?.(ytVolumePercent(volumeRef.current));
        setNeedsUnmute(false);
        setMuted(false);
      } catch {
        /* ignore */
      }
    };

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      const origin = window.location.origin;
      inst = new window.YT.Player(hostRef.current, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          enablejsapi: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          origin,
          ...(subtitlesOn ? { cc_load_policy: 1, cc_lang_pref: "tr" } : {}),
          ...(autoplay && !prefersUnmutedPlayback(audioMode, shortsMode) && (shortsMode || isMobilePlaybackDevice())
            ? { mute: 1 }
            : {}),
          ...(shortsMode && shortsLoop ? { loop: 1, playlist: videoId } : {}),
        },
        events: {
          onReady: (e: { target?: YtPlayer & { unMute?: () => void; setVolume?: (n: number) => void } }) => {
            setReady(true);
            const p = e.target ?? inst;
            const wantSound = prefersUnmutedPlayback(audioMode, shortsMode);
            const mutedAutoplay =
              autoplay && !paused && !wantSound && (shortsMode || isMobilePlaybackDevice());

            if (shortsMode && autoplay && !paused) {
              try {
                if (mutedAutoplay) p?.mute?.();
                p?.playVideo?.();
                if (wantSound) {
                  applySound(p);
                } else {
                  setMuted(true);
                  setNeedsUnmute(true);
                }
                setNeedsTap(false);
              } catch {
                setNeedsTap(true);
              }
            } else {
              if (mutedAutoplay) {
                try {
                  p?.mute?.();
                  setMuted(true);
                  setNeedsUnmute(true);
                } catch {
                  /* ignore */
                }
              } else {
                applySound(p);
              }
              if (p && !paused && (autoplay || wantSound)) {
                try {
                  p.playVideo();
                } catch {
                  /* ignore */
                }
              }
            }

            const scheduleTapPrompt = (delayMs: number) => {
              window.setTimeout(() => {
                try {
                  const state = p?.getPlayerState?.();
                  const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
                  const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
                  if (state === playingState || state === bufferingState) {
                    setNeedsTap(false);
                    return;
                  }
                  setNeedsTap(true);
                } catch {
                  setNeedsTap(true);
                }
              }, delayMs);
            };
            scheduleTapPrompt(900);
            scheduleTapPrompt(2800);
          },
          onStateChange: (e: { data?: number; target?: YtPlayer }) => {
            const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
            const endedState = window.YT?.PlayerState?.ENDED ?? 0;
            const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
            setPlaying(e.data === playingState || e.data === bufferingState);
            if (e.data === playingState) setNeedsTap(false);
            if (e.data === endedState) {
              if (shortsLoopRef.current) {
                try {
                  const p = e.target ?? playerRef.current;
                  p?.seekTo?.(0, true);
                  p?.playVideo?.();
                  if (prefersUnmutedPlayback(false, shortsMode)) {
                    p?.unMute?.();
                    p?.setVolume?.(ytVolumePercent(volumeRef.current));
                    setNeedsUnmute(false);
                  }
                } catch {
                  /* ignore */
                }
              } else {
                onEndedRef.current?.();
              }
            }
          },
          onError: (e: { data?: number }) => {
            if (e?.data === 101 || e?.data === 150 || e?.data === 153) notifyEmbedBlocked();
          },
        },
      });
      playerRef.current = inst;
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
      destroyYoutubePlayer(inst, hostRef.current);
    };
  }, [videoId, autoplay, audioMode, paused, shortsMode, shortsLoop, notifyEmbedBlocked]);

  useEffect(() => {
    if (!autoplay || paused) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const p = playerRef.current;
      if (!p) {
        if (shortsMode) notifyEmbedBlocked();
        else setNeedsTap(true);
        return;
      }
      try {
        const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
        const bufferingState = window.YT?.PlayerState?.BUFFERING ?? 3;
        const pausedState = window.YT?.PlayerState?.PAUSED ?? 2;
        const cuedState = window.YT?.PlayerState?.CUED ?? 5;
        const unstartedState = window.YT?.PlayerState?.UNSTARTED ?? -1;
        const state = p.getPlayerState?.();
        if (state === playingState || state === bufferingState) return;
        if (!shortsMode && (state === pausedState || state === cuedState || state === unstartedState)) {
          setNeedsTap(true);
          return;
        }
        notifyEmbedBlocked();
      } catch {
        if (shortsMode) notifyEmbedBlocked();
        else setNeedsTap(true);
      }
    }, shortsMode ? SHORTS_IFRAME_PLAY_TIMEOUT_MS : IFRAME_PLAY_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [videoId, autoplay, paused, shortsMode, notifyEmbedBlocked]);

  useEffect(() => {
    const onUnlock = () => {
      const p = playerRef.current;
      if (!p || !ready) return;
      try {
        p.unMute?.();
        p.setVolume?.(ytVolumePercent(volumeRef.current));
        setNeedsUnmute(false);
        setMuted(false);
        if (!paused) p.playVideo();
      } catch {
        /* ignore */
      }
    };
    const onShortsSound = () => onUnlock();
    window.addEventListener(AUDIO_UNLOCK_EVENT, onUnlock);
    window.addEventListener(SHORTS_SOUND_EVENT, onShortsSound);
    return () => {
      window.removeEventListener(AUDIO_UNLOCK_EVENT, onUnlock);
      window.removeEventListener(SHORTS_SOUND_EVENT, onShortsSound);
    };
  }, [ready, paused]);

  useEffect(() => {
    if (!ready) return;
    applyYtVolume(volume, muted);
  }, [ready, volume, muted, applyYtVolume]);

  useEffect(() => {
    if (!readBackgroundPlayback() || !ready) return;
    const resume = () => {
      if (document.visibilityState === "visible" || paused) return;
      try {
        playerRef.current?.playVideo();
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pagehide", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pagehide", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [ready, paused]);

  useEffect(() => {
    const stop = (e: Event) => {
      const detail = (e as CustomEvent<StopAllMediaDetail>).detail;
      if (detail?.musicOnly) return;
      try {
        playerRef.current?.pauseVideo();
        playerRef.current?.mute?.();
      } catch {
        /* ignore */
      }
      setPlaying(false);
    };
    window.addEventListener(STOP_ALL_MEDIA_EVENT, stop);
    return () => window.removeEventListener(STOP_ALL_MEDIA_EVENT, stop);
  }, []);

  useMediaSession({
    title,
    artist: channelName,
    artworkUrl: thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    playing: playing && !paused,
    onPlay: () => {
      try {
        playerRef.current?.playVideo();
        setPlaying(true);
      } catch {
        /* ignore */
      }
    },
    onPause: () => {
      try {
        playerRef.current?.pauseVideo();
      } catch {
        /* ignore */
      }
      setPlaying(false);
    },
  });

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (paused) {
      try {
        p.pauseVideo();
        p.mute?.();
      } catch {
        /* ignore */
      }
    } else if (autoplay || audioMode) {
      try {
        p.playVideo();
      } catch {
        /* ignore */
      }
    }
  }, [paused, ready, autoplay, audioMode]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };

  const toggleFs = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      onBlocked?.();
    }
  };

  return (
    <div ref={shellRef} className={cn("yt-player-wrap group relative overflow-hidden bg-black", className)}>
      <div className="yt-iframe-crop">
        <div
          ref={hostRef}
          className={`h-full w-full ${embedBlocked ? "invisible" : ""}`}
          title={title}
        />
      </div>
      {!embedBlocked ? <PlayerBrand shortsMode={shortsMode} /> : null}
      {isLive ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[3] rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          CANLI
        </div>
      ) : null}
      {needsTap && ready ? (
        <button
          type="button"
          aria-label="Oynat"
          onClick={() => {
            unlockAudio();
            try {
              playerRef.current?.unMute?.();
              playerRef.current?.setVolume?.(ytVolumePercent(volumeRef.current));
              playerRef.current?.playVideo();
              setNeedsTap(false);
              setMuted(false);
            } catch {
              /* ignore */
            }
          }}
          className="absolute inset-0 z-[4] flex items-center justify-center bg-black/35"
        >
          <Play className="h-16 w-16 fill-white text-white opacity-95" />
        </button>
      ) : null}
      {needsUnmute && ready && playing ? (
        <button
          type="button"
          aria-label="Sesi aç"
          onClick={() => {
            enableShortsSound();
            try {
              playerRef.current?.unMute?.();
              playerRef.current?.setVolume?.(ytVolumePercent(volumeRef.current));
              setNeedsUnmute(false);
              setMuted(false);
            } catch {
              /* ignore */
            }
          }}
          className="absolute right-3 top-14 z-[4] rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
        >
          Sesi aç
        </button>
      ) : null}
      {showChrome !== false && ready ? (
        <div className="absolute inset-x-0 bottom-0 z-[20] bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2 pt-8 pr-[7.5rem] opacity-100 transition-opacity max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <div className="flex items-center gap-2 text-white">
            <button type="button" aria-label={playing ? "Duraklat" : "Oynat"} onClick={togglePlay} className="rounded p-1 hover:bg-white/15">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <PlayerVolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={(level) => {
                setVolume(level);
                applyYtVolume(level, false);
                setMuted(false);
              }}
              onMutedChange={(next) => {
                setMuted(next);
                applyYtVolume(volume, next);
              }}
            />
            <div className="ml-auto flex shrink-0 gap-1">
              <button type="button" aria-label={fs ? "Tam ekrandan çık" : "Tam ekran"} onClick={() => void toggleFs()} className="relative z-[21] rounded p-1 hover:bg-white/15">
                {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlockedPlayer({
  title,
  videoId,
  className,
  onRetry,
}: {
  title: string;
  videoId?: string;
  className?: string;
  onRetry: () => void;
}) {
  return (
    <div className={cn("relative flex aspect-video flex-col items-center justify-center bg-black px-6 text-center text-white", className)}>
      <p className="text-sm font-medium sm:text-base">Bu video şu anda Yektube&apos;de oynatılamıyor.</p>
      <p className="mt-1 max-w-md text-xs text-white/70">{title}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
        >
          Tekrar dene
        </button>
        {videoId ? (
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            YouTube&apos;da aç
          </a>
        ) : null}
      </div>
      <PlayerBrand />
    </div>
  );
}

export function YoutubePlayer(props: Props) {
  if (props.directSrc) {
    return (
      <NativeStreamPlayer
        src={props.directSrc}
        videoId={props.videoId}
        title={props.title}
        channelName={props.channelName}
        thumbnailUrl={props.thumbnailUrl ?? yektubeAssetUrl("yektube-icon.png")}
        autoplay={props.autoplay}
        className={props.className}
        showChrome={props.showChrome ?? true}
        isLive={false}
        audioMode={props.audioMode}
        paused={props.paused}
        onEnded={props.onEnded}
        autoPiP={props.autoPiP}
        subtitlesOn={props.subtitlesOn}
      />
    );
  }
  return <YoutubeStreamPlayer {...props} />;
}

/**
 * Oynatıcı modu — iframe birincil (resmi IFrame API).
 * Yekçek: her zaman iframe dene; embedAllowed=false ise hızlı native yedeği.
 */
function resolveYoutubePlayerMode(allowIframe: boolean, shortsMode?: boolean): "native" | "iframe" {
  if (shortsMode) return "iframe";
  return allowIframe ? "iframe" : "native";
}

function YoutubeStreamPlayer({
  videoId,
  title,
  channelName,
  thumbnailUrl,
  autoplay = false,
  className,
  onBlocked,
  showChrome = true,
  isLive = false,
  embedAllowed = true,
  audioMode = false,
  paused = false,
  onEnded,
  autoPiP = false,
  shortsMode = false,
  shortsLoop = false,
  subtitlesOn = false,
}: Props) {
  const allowIframe = embedAllowed !== false;
  const lowBandwidth = readLowBandwidthMode();
  /** Yekçek — az deneme, takılı kalma; embed kapalı videolarda biraz daha fazla native denemesi */
  const maxNativeRetries = shortsMode
    ? allowIframe
      ? 2
      : 3
    : lowBandwidth
      ? allowIframe
        ? 3
        : 8
      : allowIframe
        ? 2
        : 10;

  const [mode, setMode] = useState<"native" | "iframe" | "blocked">(() =>
    resolveYoutubePlayerMode(allowIframe, shortsMode),
  );
  const [retryGen, setRetryGen] = useState(0);
  const [dashAudioSrc, setDashAudioSrc] = useState<string | undefined>();
  const [nativeBooting, setNativeBooting] = useState(() => !allowIframe || mode === "native");
  const nativeFailRef = useRef<() => void>(() => undefined);
  const nativeCycleDoneRef = useRef(false);

  useEffect(() => {
    const nextMode = resolveYoutubePlayerMode(allowIframe, shortsMode);
    setMode(nextMode);
    setRetryGen(0);
    setDashAudioSrc(undefined);
    setNativeBooting(nextMode === "native");
    nativeCycleDoneRef.current = false;
  }, [videoId, allowIframe, shortsMode]);

  useEffect(() => {
    if (mode !== "native" || isLive) {
      setNativeBooting(false);
      return;
    }
    setNativeBooting(true);
    const bootMs = shortsMode ? SHORTS_NATIVE_BOOT_TIMEOUT_MS : NATIVE_BOOT_TIMEOUT_MS;
    const timer = window.setTimeout(() => {
      setNativeBooting(false);
      nativeFailRef.current();
    }, bootMs);
    return () => window.clearTimeout(timer);
  }, [videoId, mode, isLive, retryGen, shortsMode]);

  useEffect(() => {
    if (isLive || mode !== "native") return;
    let cancelled = false;
    void fetch(`/api/video/youtube-stream/${encodeURIComponent(videoId)}${retryGen > 0 ? "?force=1" : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((info: { audioUrl?: string } | null) => {
        if (cancelled) return;
        setDashAudioSrc(
          info?.audioUrl ? youtubeStreamPlayUrl(videoId, retryGen > 0, true, false) : undefined,
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [videoId, isLive, mode, retryGen]);

  useEffect(() => {
    if (!isLive || mode !== "native") {
      setDashAudioSrc(undefined);
      return;
    }
    let cancelled = false;
    void fetchYoutubeLiveStream(videoId, retryGen > 0).then((info) => {
      if (cancelled) return;
      setDashAudioSrc(
        info?.audioUrl ? youtubeStreamPlayUrl(videoId, retryGen > 0, true, true) : undefined,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [videoId, isLive, mode, retryGen]);

  const playSrc = youtubeStreamPlayUrl(videoId, retryGen > 0, false, isLive);
  const thumb = thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

  const handleRetry = useCallback(() => {
    setMode(resolveYoutubePlayerMode(allowIframe, shortsMode));
    setRetryGen((n) => n + 1);
    setNativeBooting(!allowIframe && !shortsMode);
  }, [allowIframe, shortsMode]);

  const handleNativeError = useCallback(() => {
    if (retryGen < maxNativeRetries) {
      setRetryGen((n) => n + 1);
      return;
    }
    if (shortsMode) {
      onBlocked?.();
      return;
    }
    if (allowIframe) {
      if (nativeCycleDoneRef.current) {
        setMode("blocked");
        onBlocked?.();
        return;
      }
      nativeCycleDoneRef.current = true;
      setMode("iframe");
      setRetryGen(0);
      return;
    }
    setMode("blocked");
    onBlocked?.();
  }, [retryGen, maxNativeRetries, allowIframe, onBlocked, shortsMode]);

  nativeFailRef.current = handleNativeError;

  useEffect(() => {
    if (mode === "blocked" && shortsMode) onBlocked?.();
  }, [mode, shortsMode, onBlocked]);

  if (mode === "blocked") {
    if (shortsMode) return null;
    return <BlockedPlayer title={title} videoId={videoId} className={className} onRetry={handleRetry} />;
  }

  if (mode === "iframe" && (allowIframe || shortsMode)) {
    return (
      <YoutubeApiPlayer
        videoId={videoId}
        title={title}
        channelName={channelName}
        thumbnailUrl={thumbnailUrl}
        autoplay={autoplay}
        className={className}
        showChrome={showChrome}
        isLive={isLive}
        audioMode={audioMode}
        paused={paused}
        onEnded={onEnded}
        shortsMode={shortsMode}
        shortsLoop={shortsLoop}
        subtitlesOn={subtitlesOn}
        onBlocked={() => {
          if (shortsMode) {
            setMode("native");
            setRetryGen(0);
            setNativeBooting(true);
            return;
          }
          if (nativeCycleDoneRef.current) {
            setMode("blocked");
            onBlocked?.();
            return;
          }
          if (isLive) {
            if (retryGen < 3) {
              setRetryGen((n) => n + 1);
              return;
            }
            setMode("blocked");
            onBlocked?.();
            return;
          }
          if (retryGen < maxNativeRetries) {
            setMode("native");
            setRetryGen((n) => n + 1);
            return;
          }
          setMode("blocked");
          onBlocked?.();
        }}
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      <NativeStreamPlayer
        key={`${videoId}-${retryGen}-${dashAudioSrc ? "dash" : "mux"}`}
        src={playSrc}
        audioSrc={dashAudioSrc}
        videoId={videoId}
        title={title}
        channelName={channelName}
        thumbnailUrl={thumb}
        autoplay={autoplay}
        className="h-full w-full"
        showChrome={showChrome}
        isLive={isLive}
        audioMode={audioMode}
        paused={paused}
        onEnded={onEnded}
        autoPiP={autoPiP}
        shortsMode={shortsMode}
        shortsLoop={shortsLoop}
        subtitlesOn={subtitlesOn}
        onStreamReady={() => setNativeBooting(false)}
        onError={handleNativeError}
      />
      {nativeBooting ? (
        <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/55 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {!shortsMode ? (
            <p className="mt-3 max-w-[16rem] text-center text-xs text-white/85">
              Video hazırlanıyor… (dışa kapalı videolar biraz daha uzun sürebilir)
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
