import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { fetchShorts } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/hooks/useIsMobile";
import { readShortsLoopEnabled, writeShortsLoopEnabled } from "./shortsReelConfig";
import { ShortsVirtualList } from "./ShortsVirtualList";

export function ChannelShortsReel({ sourceId }: { sourceId: number }) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [items, setItems] = useState<YektubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(() => readShortsLoopEnabled());
  const poolOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const loadShortsRef = useRef<(reset: boolean) => Promise<void>>(async () => undefined);
  const POOL_STEP = 120;

  const reelHeight = isDesktop
    ? "h-[calc(100dvh-3.5rem)]"
    : "h-[calc(100dvh-3rem-3.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]";
  const reelBg = isDesktop ? "bg-[var(--color-yt-bg)]" : "bg-black";
  const loaderClassName = isDesktop ? "text-[var(--color-yt-muted)]" : "text-white";

  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => {
      const next = !prev;
      writeShortsLoopEnabled(next);
      return next;
    });
  }, []);

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
        const data = await fetchShorts({
          limit: 30,
          offset: poolOffsetRef.current,
          sourceId,
        });
        const batch = data.items;
        setItems((prev) => {
          if (reset) return batch;
          const seen = new Set(prev.map((v) => v.videoId));
          return [...prev, ...batch.filter((v) => !seen.has(v.videoId))];
        });
        poolOffsetRef.current += POOL_STEP;
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
    [sourceId],
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

  const handleActiveIndexChange = useCallback((_index: number) => {
    /* kanal reel — yalnızca sanal liste iç durumu */
  }, []);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center", reelHeight, reelBg)}>
        <Loader2 className={cn("h-8 w-8 animate-spin", loaderClassName)} />
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
          Bu kanalda 3 dakikadan kısa video bulunamadı.
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
        loaderClassName={loaderClassName}
      />
    </div>
  );
}
