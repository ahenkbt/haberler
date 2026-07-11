import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { unlockAudio } from "@/lib/audioUnlock";
import { stopAllHtmlMedia, stopMusicHtmlMedia } from "@/lib/mediaControl";

type PlayerState = {
  current: YektubeVideo | null;
  queue: YektubeVideo[];
};

type MusicContextValue = PlayerState & {
  play: (video: YektubeVideo, queue?: YektubeVideo[]) => void;
  playNext: () => void;
  clear: () => void;
  setCatalog: (tracks: YektubeVideo[]) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

function pickNextTrack(
  current: YektubeVideo,
  queue: YektubeVideo[],
  catalog: YektubeVideo[],
): YektubeVideo | null {
  const pool = queue.length > 1 ? queue : catalog.length > 0 ? catalog : queue;
  if (pool.length === 0) return null;
  const idx = pool.findIndex((v) => v.id === current.id || v.videoId === current.videoId);
  const start = idx >= 0 ? idx : 0;
  for (let step = 1; step <= pool.length; step += 1) {
    const next = pool[(start + step) % pool.length]!;
    if (next.videoId !== current.videoId) return next;
  }
  const others = pool.filter((v) => v.videoId !== current.videoId);
  if (others.length > 0) {
    return others[Math.floor(Math.random() * others.length)]!;
  }
  return null;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({ current: null, queue: [] });
  const catalogRef = useRef<YektubeVideo[]>([]);
  const advanceLockRef = useRef(false);
  const lastAdvanceAtRef = useRef(0);

  const play = useCallback((video: YektubeVideo, nextQueue?: YektubeVideo[]) => {
    unlockAudio();
    stopAllHtmlMedia({ keepMusic: true });
    setState((s) => {
      if (nextQueue?.length) return { current: video, queue: nextQueue };
      const queue = s.queue.some((v) => v.id === video.id)
        ? s.queue
        : [video, ...s.queue.filter((v) => v.id !== video.id)];
      return { current: video, queue };
    });
  }, []);

  const setCatalog = useCallback((tracks: YektubeVideo[]) => {
    catalogRef.current = tracks;
  }, []);

  const playNext = useCallback(() => {
    const now = Date.now();
    if (advanceLockRef.current || now - lastAdvanceAtRef.current < 900) return;
    advanceLockRef.current = true;
    lastAdvanceAtRef.current = now;

    setState((s) => {
      if (!s.current) return s;
      const next = pickNextTrack(s.current, s.queue, catalogRef.current);
      if (!next || (next.id === s.current.id && next.videoId === s.current.videoId)) return s;
      unlockAudio();
      return { ...s, current: next };
    });

    window.setTimeout(() => {
      advanceLockRef.current = false;
    }, 900);
  }, []);

  const clear = useCallback(() => {
    stopMusicHtmlMedia();
    setState({ current: null, queue: [] });
  }, []);

  const value = useMemo(
    () => ({ ...state, play, playNext, clear, setCatalog }),
    [state, play, playNext, clear, setCatalog],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusicPlayer(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusicPlayer must be used within MusicProvider");
  return ctx;
}

/** Müzik bağlamı yoksa sessizce atla (izleme / yekçek sayfaları) */
export function useOptionalMusicPlayer(): MusicContextValue | null {
  return useContext(MusicContext);
}
