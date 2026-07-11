import { useEffect, useRef, type RefObject } from "react";

type Options = {
  title: string;
  artist?: string;
  artworkUrl?: string;
  playing: boolean;
  duration?: number;
  position?: number;
  mediaRef?: RefObject<HTMLMediaElement | null>;
  /** @deprecated use mediaRef */
  videoRef?: RefObject<HTMLVideoElement | null>;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  enabled?: boolean;
};

export function useMediaSession({
  title,
  artist,
  artworkUrl,
  playing,
  duration,
  position,
  mediaRef,
  videoRef,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  enabled = true,
}: Options) {
  const resolvedRef = mediaRef ?? videoRef;
  const handlersRef = useRef({ onPlay, onPause, onNext, onPrevious, mediaRef: resolvedRef });
  handlersRef.current = { onPlay, onPause, onNext, onPrevious, mediaRef: resolvedRef };

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const ns = navigator.mediaSession;
    const artwork = artworkUrl?.trim();
    ns.metadata = new MediaMetadata({
      title: title || "Yektube",
      artist: artist || "Yektube",
      album: "Yektube",
      artwork: artwork
        ? [
            { src: artwork, sizes: "512x512", type: "image/jpeg" },
            { src: artwork, sizes: "128x128", type: "image/jpeg" },
          ]
        : [],
    });

    const play = () => {
      handlersRef.current.onPlay?.();
      const el = handlersRef.current.mediaRef?.current;
      if (el) void el.play().catch(() => undefined);
    };
    const pause = () => {
      handlersRef.current.onPause?.();
      handlersRef.current.mediaRef?.current?.pause();
    };
    const seekBy = (delta: number) => {
      const el = handlersRef.current.mediaRef?.current;
      if (!el || !Number.isFinite(el.duration)) return;
      el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration);
    };

    ns.setActionHandler("play", play);
    ns.setActionHandler("pause", pause);
    ns.setActionHandler("seekbackward", () => seekBy(-10));
    ns.setActionHandler("seekforward", () => seekBy(10));
    if (handlersRef.current.onNext) {
      try {
        ns.setActionHandler("nexttrack", () => handlersRef.current.onNext?.());
      } catch {
        /* nexttrack desteklenmiyor */
      }
    }
    if (handlersRef.current.onPrevious) {
      try {
        ns.setActionHandler("previoustrack", () => handlersRef.current.onPrevious?.());
      } catch {
        /* previoustrack desteklenmiyor */
      }
    }

    return () => {
      try {
        ns.setActionHandler("play", null);
        ns.setActionHandler("pause", null);
        ns.setActionHandler("seekbackward", null);
        ns.setActionHandler("seekforward", null);
        ns.setActionHandler("nexttrack", null);
        ns.setActionHandler("previoustrack", null);
      } catch {
        /* ignore */
      }
    };
  }, [enabled, title, artist, artworkUrl, onNext, onPrevious]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [enabled, playing]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!duration || duration <= 0 || !Number.isFinite(duration)) return;
    const pos = Math.min(Math.max(0, position ?? 0), duration);
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: pos,
        playbackRate: 1,
      });
    } catch {
      /* setPositionState desteklenmiyor */
    }
  }, [enabled, duration, position]);
}

type KeepAliveOptions = {
  /** currentTime ilerlemiyorsa (arka planda takılma) */
  onStall?: () => void;
  audioRef?: RefObject<HTMLAudioElement | null>;
};

/** Sekme/ekran kilitliyken sesin kesilmesini azaltır; takılmayı algılar. */
export function useBackgroundPlaybackKeepAlive(
  mediaRef: RefObject<HTMLMediaElement | null>,
  active: boolean,
  options?: KeepAliveOptions,
) {
  const onStallRef = useRef(options?.onStall);
  onStallRef.current = options?.onStall;
  const lastTimeRef = useRef(0);
  const stallTicksRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const resume = () => {
      const el = mediaRef.current;
      const audio = options?.audioRef?.current;
      if (el && !el.ended) {
        if (!el.muted) el.muted = false;
        if (el.paused) void el.play().catch(() => undefined);
      }
      if (audio && !audio.ended) {
        if (!audio.muted) audio.muted = false;
        if (audio.paused) void audio.play().catch(() => undefined);
      }
    };

    const onWaiting = () => resume();

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pagehide", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);

    const el = mediaRef.current;
    el?.addEventListener("waiting", onWaiting);
    el?.addEventListener("stalled", onWaiting);

    const interval = window.setInterval(() => {
      const node = mediaRef.current;
      if (!node || node.ended) {
        lastTimeRef.current = node?.currentTime ?? 0;
        stallTicksRef.current = 0;
        return;
      }
      if (node.paused) {
        resume();
        lastTimeRef.current = node.currentTime;
        stallTicksRef.current = 0;
        return;
      }

      const t = node.currentTime;
      const advanced = Math.abs(t - lastTimeRef.current) > 0.05;
      if (!advanced && node.readyState >= 2) {
        stallTicksRef.current += 1;
        if (stallTicksRef.current >= 2) {
          stallTicksRef.current = 0;
          onStallRef.current?.();
          resume();
        }
      } else {
        stallTicksRef.current = 0;
      }
      lastTimeRef.current = t;

      if (document.visibilityState !== "visible") resume();
    }, 1500);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pagehide", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.clearInterval(interval);
      el?.removeEventListener("waiting", onWaiting);
      el?.removeEventListener("stalled", onWaiting);
    };
  }, [mediaRef, active]);
}
