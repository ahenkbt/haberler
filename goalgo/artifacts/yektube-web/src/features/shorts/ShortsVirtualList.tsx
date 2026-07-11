import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { FixedSizeList, type ListChildComponentProps, type ListOnScrollProps } from "react-window";
import { Loader2 } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { cn } from "@/lib/cn";
import { hapticTap } from "@/lib/haptics";
import { stopAllHtmlMedia } from "@/lib/mediaControl";
import { enableShortsSound } from "@/lib/audioUnlock";
import { ShortsSlide } from "./ShortsSlide";
import { SHORTS_VIRTUAL_OVERSCAN } from "./shortsReelConfig";

type RowData = {
  items: YektubeVideo[];
  activeIndex: number;
  isDesktop: boolean;
  loopEnabled: boolean;
  onLoopToggle: () => void;
  onEnded: () => void;
  loadingMore: boolean;
  loaderClassName: string;
};

function ShortsVirtualRow({ index, style, data }: ListChildComponentProps<RowData>) {
  if (index >= data.items.length) {
    return (
      <div style={style} className="flex items-center justify-center">
        <Loader2 className={cn("h-6 w-6 animate-spin", data.loaderClassName)} />
      </div>
    );
  }

  const video = data.items[index]!;
  const isActive = index === data.activeIndex;

  return (
    <div style={style} className="flex snap-start snap-always items-center justify-center">
      <ShortsSlide
        video={video}
        isActive={isActive}
        isDesktop={data.isDesktop}
        loopEnabled={data.loopEnabled}
        onLoopToggle={data.onLoopToggle}
        onEnded={isActive ? data.onEnded : undefined}
      />
    </div>
  );
}

const ShortsVirtualOuter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div
    ref={ref}
    {...props}
    className={cn(
      props.className,
      "yt-shorts-scroller snap-y snap-mandatory scroll-smooth overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-stop:always] [&::-webkit-scrollbar]:hidden",
    )}
  />
));
ShortsVirtualOuter.displayName = "ShortsVirtualOuter";

export type ShortsVirtualListProps = {
  items: YektubeVideo[];
  loadingMore: boolean;
  isDesktop: boolean;
  loopEnabled: boolean;
  onLoopToggle: () => void;
  onActiveIndexChange: (index: number) => void;
  onNearEnd: () => void;
  onNeedMoreItems?: () => Promise<void>;
  initialVideoId?: string | null;
  className?: string;
  loaderClassName?: string;
};

export function ShortsVirtualList({
  items,
  loadingMore,
  isDesktop,
  loopEnabled,
  onLoopToggle,
  onActiveIndexChange,
  onNearEnd,
  onNeedMoreItems,
  initialVideoId,
  className,
  loaderClassName = "text-white",
}: ShortsVirtualListProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const snapTimerRef = useRef(0);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const apply = () => {
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    onActiveIndexChange(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  useEffect(() => {
    stopAllHtmlMedia({ keepMusic: true });
  }, [activeIndex]);

  useEffect(() => {
    const onGesture = () => enableShortsSound();
    window.addEventListener("pointerdown", onGesture, { passive: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, []);

  useEffect(() => {
    if (initialScrollDoneRef.current || !initialVideoId || items.length === 0 || viewport.height < 1) return;
    const idx = items.findIndex((v) => v.videoId === initialVideoId);
    if (idx < 0) return;
    initialScrollDoneRef.current = true;
    listRef.current?.scrollToItem(idx, "start");
    setActiveIndex(idx);
    activeIndexRef.current = idx;
  }, [initialVideoId, items, viewport.height]);

  useEffect(() => {
    if (items.length === 0) return;
    if (activeIndex >= items.length - 4) onNearEnd();
  }, [activeIndex, items.length, onNearEnd]);

  const goToNextShort = useCallback(() => {
    const next = activeIndexRef.current + 1;
    if (next < items.length) {
      listRef.current?.scrollToItem(next, "start");
      setActiveIndex(next);
      activeIndexRef.current = next;
      return;
    }
    if (!onNeedMoreItems) return;
    void onNeedMoreItems().then(() => {
      window.setTimeout(() => {
        const idx = activeIndexRef.current + 1;
        if (idx >= items.length) return;
        listRef.current?.scrollToItem(idx, "start");
        setActiveIndex(idx);
        activeIndexRef.current = idx;
      }, 120);
    });
  }, [items.length, onNeedMoreItems]);

  const handleScroll = useCallback(
    ({ scrollOffset }: ListOnScrollProps) => {
      if (viewport.height < 1) return;
      const idx = Math.min(
        items.length - 1,
        Math.max(0, Math.round(scrollOffset / viewport.height)),
      );
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx;
        setActiveIndex(idx);
      }
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        listRef.current?.scrollToItem(activeIndexRef.current, "start");
      }, 140);
    },
    [items.length, viewport.height],
  );

  const prevIndexRef = useRef(0);
  useEffect(() => {
    if (activeIndex !== prevIndexRef.current && items.length > 0) {
      hapticTap(10);
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex, items.length]);

  useEffect(
    () => () => {
      window.clearTimeout(snapTimerRef.current);
    },
    [],
  );

  const itemCount = items.length + (loadingMore ? 1 : 0);

  const rowData = useMemo<RowData>(
    () => ({
      items,
      activeIndex,
      isDesktop,
      loopEnabled,
      onLoopToggle,
      onEnded: goToNextShort,
      loadingMore,
      loaderClassName,
    }),
    [items, activeIndex, isDesktop, loopEnabled, onLoopToggle, goToNextShort, loadingMore, loaderClassName],
  );

  if (viewport.height < 1 || viewport.width < 1) {
    return <div ref={measureRef} className={cn("h-full w-full", className)} />;
  }

  return (
    <div ref={measureRef} className={cn("h-full w-full", className)}>
      <FixedSizeList
        ref={listRef}
        width={viewport.width}
        height={viewport.height}
        itemCount={itemCount}
        itemSize={viewport.height}
        itemData={rowData}
        overscanCount={SHORTS_VIRTUAL_OVERSCAN}
        outerElementType={ShortsVirtualOuter}
        onScroll={handleScroll}
      >
        {ShortsVirtualRow}
      </FixedSizeList>
    </div>
  );
}
