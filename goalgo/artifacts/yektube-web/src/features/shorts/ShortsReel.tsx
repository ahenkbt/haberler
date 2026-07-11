import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { fetchShorts, youtubeStreamPlayUrl } from "@/lib/api";
import { readRecentYoutubeWatchIds } from "@/lib/recentWatchIds";
import { readLowBandwidthMode } from "@/lib/yektubePlaybackPrefs";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/hooks/useIsMobile";
import { stopAllHtmlMedia } from "@/lib/mediaControl";
import { readShortsLoopEnabled, writeShortsLoopEnabled } from "./shortsReelConfig";
import { ShortsVirtualList } from "./ShortsVirtualList";

export function ShortsReel() {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [location] = useLocation();
  const search = useSearch();
  const startVideoId = useMemo(() => {
    const q = search.startsWith("?") ? search.slice(1) : search;
    return new URLSearchParams(q).get("v")?.trim() ?? null;
  }, [search]);

  const [items, setItems] = useState<YektubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(() => readShortsLoopEnabled());
  const poolOffsetRef = useRef(0);
  const itemsRef = useRef<YektubeVideo[]>([]);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const loadShortsRef = useRef<(reset: boolean) => Promise<void>>(async () => undefined);
  const POOL_STEP = 240;
  /** Her Yekçek ziyaretinde yeni karışım */
  const sessionSeed = useMemo(
    () => Math.floor(Math.random() * 1_000_000_000),
    [location, search],
  );
  const excludeVideoIds = useMemo(() => readRecentYoutubeWatchIds(40), []);

  const reelHeight = isDesktop
    ? "h-[calc(100dvh-3.5rem)]"
    : "h-full min-h-0 flex-1";
  const reelBg = isDesktop ? "bg-[var(--color-yt-bg)]" : "bg-black";
  const loaderClassName = isDesktop ? "text-[var(--color-yt-muted)]" : "text-white";

  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => {
      const next = !prev;
      writeShortsLoopEnabled(next);
      return next;
    });
  }, []);

  useEffect(() => {
    stopAllHtmlMedia({ keepMusic: true });
  }, [activeIndex]);

  useEffect(() => {
    if (readLowBandwidthMode()) return;
    const next = items[activeIndex + 1];
    if (!next?.videoId) return;
    const href = youtubeStreamPlayUrl(next.videoId);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.remove();
    };
  }, [activeIndex, items]);

  const [loadingSlow, setLoadingSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingSlow(false);
      return;
    }
    const t = window.setTimeout(() => setLoadingSlow(true), 2500);
    return () => window.clearTimeout(t);
  }, [loading]);

  const loadShorts = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        poolOffsetRef.current = 0;
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }
      try {
        const seenIds = reset
          ? excludeVideoIds
          : [...new Set([...excludeVideoIds, ...itemsRef.current.map((v) => v.videoId)])];
        const data = await fetchShorts({
          limit: 30,
          offset: poolOffsetRef.current,
          startVideoId: reset ? startVideoId ?? undefined : undefined,
          mixChannels: true,
          seed: sessionSeed + poolOffsetRef.current,
          excludeVideoIds: seenIds,
        });
        let batch = data.items;
        if (reset && batch.length === 0) {
          const fallback = await fetchShorts({
            limit: 30,
            offset: poolOffsetRef.current + POOL_STEP,
            mixChannels: true,
            seed: sessionSeed + Math.floor(Math.random() * 1_000_000),
            excludeVideoIds: [],
          });
          batch = fallback.items;
        }
        setItems((prev) => {
          const next = reset ? batch : [...prev, ...batch.filter((v) => !prev.some((p) => p.videoId === v.videoId))];
          itemsRef.current = next;
          return next;
        });
        poolOffsetRef.current = (reset ? 0 : poolOffsetRef.current) + POOL_STEP;
        setHasMore(Boolean(data.hasMore) && batch.length > 0);
        hasMoreRef.current = Boolean(data.hasMore) && batch.length > 0;
      } catch {
        if (reset) setItems([]);
        setHasMore(false);
        hasMoreRef.current = false;
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [startVideoId, sessionSeed, excludeVideoIds],
  );

  loadShortsRef.current = loadShorts;

  useEffect(() => {
    void loadShorts(true);
  }, [loadShorts]);

  const handleNearEnd = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    void loadShorts(false);
  }, [loadShorts]);

  const handleNeedMoreItems = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    await loadShorts(false);
  }, [loadShorts]);

  const handleActiveIndexChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3", reelHeight, reelBg)}>
        <Loader2 className={cn("h-8 w-8 animate-spin", loaderClassName)} />
        {loadingSlow ? (
          <p className={cn("max-w-xs px-6 text-center text-sm", loaderClassName)}>
            Yekçek videoları hazırlanıyor… İlk açılış birkaç saniye sürebilir.
          </p>
        ) : null}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 text-center",
          reelHeight,
          reelBg,
          isDesktop ? "text-[var(--color-yt-text)]" : "text-white",
        )}
      >
        <p className="text-lg font-bold">Henüz Yekçek yok</p>
        <p className={cn("max-w-sm text-sm", isDesktop ? "text-[var(--color-yt-muted)]" : "text-zinc-400")}>
          Kısa videolar senkron edildiğinde burada görünür.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("yt-shorts-reel relative w-full", reelHeight, reelBg)}>
      <ShortsVirtualList
        items={items}
        loadingMore={loadingMore}
        isDesktop={isDesktop}
        loopEnabled={loopEnabled}
        onLoopToggle={toggleLoop}
        onActiveIndexChange={handleActiveIndexChange}
        onNearEnd={handleNearEnd}
        onNeedMoreItems={handleNeedMoreItems}
        initialVideoId={startVideoId}
        loaderClassName={loaderClassName}
      />
    </div>
  );
}
