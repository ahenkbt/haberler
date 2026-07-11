import { useEffect, useId, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { loadYoutubeIframeApi } from "@/lib/youtubeIframeApi";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";

const VOL_KEY = "yektube-player-volume";

function readStoredVolume(): number {
  try {
    const raw = sessionStorage.getItem(VOL_KEY);
    if (raw == null) return 80;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 80;
    return Math.min(100, Math.max(0, n));
  } catch {
    return 80;
  }
}

function writeStoredVolume(n: number) {
  try {
    sessionStorage.setItem(VOL_KEY, String(n));
  } catch {
    /* ignore */
  }
}

type YtPlayerLike = {
  destroy: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  setVolume: (v: number) => void;
  getVolume: () => number;
  getPlayerState?: () => number;
  mute?: () => void;
  unMute?: () => void;
};

const IFRAME_PLAY_TIMEOUT_MS = 5500;

function isEmbedBlockedError(code: number | undefined): boolean {
  return code === 101 || code === 150 || code === 153;
}

function waitForHostLayout(el: HTMLElement | null): Promise<void> {
  if (!el || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    let attempts = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts >= 30) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function YektubeYoutubePlayer({
  videoId,
  title,
  className = "",
  variant = "watch",
  autoplay = true,
  onEmbedBlocked,
}: {
  videoId: string;
  title: string;
  className?: string;
  variant?: "watch" | "shorts";
  autoplay?: boolean;
  /** YouTube 101/150/153 — embed devre dışı */
  onEmbedBlocked?: () => void;
}) {
  const reactId = useId().replace(/:/g, "");
  const hostId = `yektube-yt-${reactId}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayerLike | null>(null);
  const onEmbedBlockedRef = useRef(onEmbedBlocked);
  const [volume, setVolume] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  onEmbedBlockedRef.current = onEmbedBlocked;

  const notifyEmbedBlocked = useCallback(() => {
    setEmbedBlocked(true);
    onEmbedBlockedRef.current?.();
  }, []);

  const applyVolume = useCallback((next: number, m: boolean) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (m) {
        p.mute?.();
        p.setVolume(0);
      } else {
        p.unMute?.();
        p.setVolume(next);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inst: YtPlayerLike | null = null;
    let playRetryTimer = 0;
    let playTimeoutTimer = 0;
    setEmbedBlocked(false);

    const schedulePlayRetry = (p: YtPlayerLike) => {
      window.clearTimeout(playRetryTimer);
      playRetryTimer = window.setTimeout(() => {
        if (cancelled) return;
        try {
          const playing = window.YT?.PlayerState?.PLAYING ?? 1;
          const buffering = window.YT?.PlayerState?.BUFFERING ?? 3;
          const state = p.getPlayerState?.();
          if (state !== playing && state !== buffering) p.playVideo?.();
        } catch {
          /* ignore */
        }
      }, 900);
    };

    void loadYoutubeIframeApi()
      .then(() => waitForHostLayout(hostRef.current))
      .then(() => {
        if (cancelled || !hostRef.current || !window.YT?.Player) return;
        const origin = window.location.origin;
        const isShorts = variant === "shorts";
        inst = new window.YT.Player(hostId, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            fs: isShorts ? 0 : 1,
            origin,
            ...(isShorts ? { loop: 1, playlist: videoId, mute: autoplay ? 1 : 0, controls: 0 } : {}),
          },
          events: {
            onReady: (e: { target: YtPlayerLike }) => {
              playerRef.current = e.target;
              const v = readStoredVolume();
              setVolume(v);
              try {
                if (isShorts && autoplay) {
                  e.target.mute?.();
                  e.target.playVideo?.();
                } else {
                  e.target.unMute?.();
                  e.target.setVolume(v);
                  if (autoplay) e.target.playVideo?.();
                }
                schedulePlayRetry(e.target);
              } catch {
                /* ignore */
              }
              if (autoplay) {
                playTimeoutTimer = window.setTimeout(() => {
                  if (cancelled) return;
                  try {
                    const playing = window.YT?.PlayerState?.PLAYING ?? 1;
                    const buffering = window.YT?.PlayerState?.BUFFERING ?? 3;
                    const state = e.target.getPlayerState?.();
                    if (state !== playing && state !== buffering) notifyEmbedBlocked();
                  } catch {
                    notifyEmbedBlocked();
                  }
                }, IFRAME_PLAY_TIMEOUT_MS);
              }
            },
            onStateChange: (e: { data?: number; target?: YtPlayerLike }) => {
              const playing = window.YT?.PlayerState?.PLAYING ?? 1;
              const buffering = window.YT?.PlayerState?.BUFFERING ?? 3;
              const unstarted = window.YT?.PlayerState?.UNSTARTED ?? -1;
              const paused = window.YT?.PlayerState?.PAUSED ?? 2;
              if (e.data === playing || e.data === buffering) {
                window.clearTimeout(playRetryTimer);
                window.clearTimeout(playTimeoutTimer);
                return;
              }
              if (autoplay && (e.data === unstarted || e.data === paused)) {
                try {
                  e.target?.playVideo?.();
                } catch {
                  /* ignore */
                }
              }
            },
            onError: (e: { data?: number }) => {
              if (isEmbedBlockedError(e?.data)) notifyEmbedBlocked();
            },
          },
        }) as unknown as YtPlayerLike;
        playerRef.current = inst;
      });

    return () => {
      cancelled = true;
      window.clearTimeout(playRetryTimer);
      window.clearTimeout(playTimeoutTimer);
      playerRef.current = null;
      try {
        inst?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [videoId, variant, autoplay, hostId, notifyEmbedBlocked]);

  useEffect(() => {
    applyVolume(volume, muted);
  }, [volume, muted, applyVolume, videoId]);

  const isShorts = variant === "shorts";

  return (
    <div
      className={`overflow-hidden bg-black ${isShorts ? "" : "rounded-xl shadow-sm ring-1 ring-zinc-200"} ${className}`.trim()}
    >
      <div
        className={`relative w-full overflow-hidden bg-black ${isShorts ? "h-full" : "aspect-video"}`}
      >
        <div
          ref={hostRef}
          id={hostId}
          className={`absolute inset-0 h-full w-full ${embedBlocked ? "invisible" : ""}`}
          title={title}
        />
        {!embedBlocked ? (
          <div className="pointer-events-none absolute bottom-11 right-2 z-[2] flex items-end justify-end sm:bottom-12 sm:right-2.5">
            <YektubePlayerMark coverYoutubeCorner playerVariant={isShorts ? "shorts" : "watch"} />
          </div>
        ) : null}
      </div>
      {!isShorts ? (
        <div className="flex items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-2">
          <button
            type="button"
            aria-label={muted ? "Sesi aç" : "Sessize al"}
            className="shrink-0 rounded-md p-1.5 text-zinc-700 hover:bg-zinc-200/80 transition-colors"
            onClick={() => setMuted((m) => !m)}
          >
            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            disabled={muted}
            aria-label="Ses seviyesi"
            className="flex-1 h-2 accent-[#039D55] disabled:opacity-40"
            onChange={(e) => {
              const n = Number(e.target.value);
              setVolume(n);
              writeStoredVolume(n);
              if (n > 0 && muted) setMuted(false);
            }}
          />
          <span className="text-xs font-bold tabular-nums text-zinc-500 w-8 text-right">{muted ? 0 : volume}</span>
        </div>
      ) : null}
    </div>
  );
}
