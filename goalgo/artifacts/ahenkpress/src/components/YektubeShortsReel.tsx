import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { VideoItem } from "@/pages/public/CanliTv";
import { YektubeShortsSlide } from "@/components/YektubeShortsSlide";
import { YektubeShortsActionRail } from "@/components/YektubeShortsActionRail";

type ShortsReelProps = {
  pathHome: string;
  categorySlug?: string;
  sourceId?: number;
};

export function YektubeShortsReel({ pathHome, categorySlug, sourceId }: ShortsReelProps) {
  const search = useSearch();
  const startVideoId = useMemo(() => {
    const raw =
      search && search.length > 0
        ? search
        : typeof window !== "undefined"
          ? window.location.search
          : "";
    const q = raw.startsWith("?") ? raw.slice(1) : raw;
    const params = new URLSearchParams(q);
    return params.get("v")?.trim() || params.get("videoId")?.trim() || null;
  }, [search]);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const offsetRef = useRef(0);

  const loadShorts = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          limit: "30",
          offset: String(reset ? 0 : offsetRef.current),
        });
        if (categorySlug && categorySlug !== "all") params.set("categorySlug", categorySlug);
        if (sourceId && sourceId > 0) params.set("sourceId", String(sourceId));
        if (startVideoId) params.set("videoId", startVideoId);
        const res = await fetch(`/api/video/shorts?${params}`);
        const data = (await res.json()) as {
          items?: VideoItem[];
          hasMore?: boolean;
        };
        const batch = data.items ?? [];
        setItems((prev) => {
          if (reset) return batch;
          const seen = new Set(prev.map((v) => v.videoId));
          return [...prev, ...batch.filter((v) => !seen.has(v.videoId))];
        });
        offsetRef.current = (reset ? 0 : offsetRef.current) + batch.length;
        setHasMore(Boolean(data.hasMore) && batch.length > 0);
      } catch {
        if (reset) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [categorySlug, sourceId, startVideoId],
  );

  useEffect(() => {
    void loadShorts(true);
  }, [loadShorts]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = slideRefs.current[idx];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!startVideoId || items.length === 0) return;
    const idx = items.findIndex((v) => v.videoId === startVideoId);
    const target = idx >= 0 ? idx : 0;
    setActiveIndex(target);
    requestAnimationFrame(() => scrollToIndex(target));
  }, [startVideoId, items, scrollToIndex]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const idx = slideRefs.current.findIndex((el) => el === entry.target);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      { root, threshold: [0.55, 0.75, 0.9] },
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    if (!hasMore || loadingMore || items.length === 0) return;
    if (activeIndex >= items.length - 4) {
      void loadShorts(false);
    }
  }, [activeIndex, hasMore, items.length, loadShorts, loadingMore]);

  const skipUnplayable = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return;
      scrollToIndex(index + 1);
    },
    [items.length, scrollToIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, items.length, scrollToIndex]);

  const activeVideo = items[activeIndex];

  if (loading) {
    return (
      <div className="flex h-[min(100dvh,720px)] min-h-[480px] items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#039D55]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[min(100dvh,720px)] min-h-[480px] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <p className="text-lg font-bold">Henüz Yekçek yok</p>
        <p className="max-w-sm text-sm text-zinc-400">
          Yönetim panelinden &quot;Hit Yekçek Çek&quot; ile kanallardan kısa videolar içe aktarılabilir.
        </p>
      </div>
    );
  }

  return (
    <div className="yektube-shorts-reel relative flex h-[min(100dvh-3rem,900px)] min-h-[520px] w-full justify-center bg-black max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 lg:h-[calc(100dvh-8rem)]">
      <div className="flex h-full w-full max-w-[min(100%,1100px)] items-stretch justify-center gap-0 px-0 lg:gap-6 lg:px-4">
        <div
          ref={containerRef}
          className="h-full w-full max-w-[480px] flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((video, index) => (
            <section
              key={video.videoId}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="relative flex h-full min-h-full w-full snap-start snap-always items-center justify-center bg-black lg:justify-end lg:pr-0"
            >
              <div className="flex h-full w-full max-w-[480px] items-center justify-center lg:max-w-none">
                <YektubeShortsSlide
                  video={video}
                  isActive={index === activeIndex}
                  pathHome={pathHome}
                  onUnplayable={() => skipUnplayable(index)}
                />
                {index === activeIndex ? (
                  <YektubeShortsActionRail video={video} pathHome={pathHome} variant="mobile" />
                ) : null}
              </div>
            </section>
          ))}
          {loadingMore ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#039D55]" />
            </div>
          ) : null}
        </div>

        {activeVideo ? (
          <YektubeShortsActionRail video={activeVideo} pathHome={pathHome} variant="desktop" />
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 flex-col gap-2 xl:right-6 xl:flex">
        <button
          type="button"
          aria-label="Önceki"
          disabled={activeIndex <= 0}
          onClick={() => scrollToIndex(activeIndex - 1)}
          className="pointer-events-auto rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Sonraki"
          disabled={activeIndex >= items.length - 1}
          onClick={() => scrollToIndex(activeIndex + 1)}
          className="pointer-events-auto rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
