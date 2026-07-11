import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSidebarBalancedItemCount } from "@/hooks/useSidebarBalancedItemCount";

type HmSidebarBalancedGridProps<T> = {
  enabled?: boolean;
  className?: string;
  mainClassName?: string;
  sidebarClassName?: string;
  items: T[];
  minItems?: number;
  maxItems?: number;
  initialItems?: number;
  columnsPerRow?: number;
  bufferRows?: number;
  /** Sabit haber adedi (ör. anasayfa 12); verilirse öğe sayısı dengelemesi kapalı, kutu yüksekliği sidebar ile hizalanır. */
  fixedVisibleCount?: number;
  mainHeader: ReactNode;
  mainFooter?: ReactNode;
  renderItems: (visible: T[]) => ReactNode;
  sidebar: ReactNode;
};

/** Haber / kurumsal vitrin: sol haber listesi yüksekliği sağ sidebar ile hizalanır. */
export function HmSidebarBalancedGrid<T>({
  enabled = true,
  className = "",
  mainClassName = "",
  sidebarClassName = "",
  items,
  minItems = 3,
  maxItems = 40,
  initialItems = 6,
  columnsPerRow = 1,
  bufferRows = 0,
  fixedVisibleCount,
  mainHeader,
  mainFooter,
  renderItems,
  sidebar,
}: HmSidebarBalancedGridProps<T>) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainColRef = useRef<HTMLDivElement>(null);
  const [mainMinHeight, setMainMinHeight] = useState<number | undefined>();

  const balancedCount = useSidebarBalancedItemCount(sidebarRef, mainColRef, {
    enabled: enabled && fixedVisibleCount == null,
    itemCount: items.length,
    minItems,
    maxItems,
    initialItems,
    columnsPerRow,
    bufferRows,
  });

  const visibleCount =
    fixedVisibleCount != null && fixedVisibleCount > 0
      ? Math.min(fixedVisibleCount, items.length)
      : balancedCount;

  const visible = items.slice(0, visibleCount);

  useLayoutEffect(() => {
    if (!enabled) {
      setMainMinHeight(undefined);
      return;
    }

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const mq = window.matchMedia("(min-width: 1024px)");
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let ro: ResizeObserver | null = null;

    const syncMinHeight = () => {
      if (!mq.matches) {
        setMainMinHeight(undefined);
        return;
      }
      const h = sidebar.offsetHeight;
      if (h > 0) setMainMinHeight(h);
    };

    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(syncMinHeight, 120);
    };

    ro = new ResizeObserver(schedule);
    ro.observe(sidebar);
    schedule();

    const t1 = setTimeout(syncMinHeight, 500);
    const t2 = setTimeout(syncMinHeight, 1200);
    mq.addEventListener("change", schedule);

    return () => {
      if (debounce) clearTimeout(debounce);
      clearTimeout(t1);
      clearTimeout(t2);
      mq.removeEventListener("change", schedule);
      ro?.disconnect();
    };
  }, [enabled, visibleCount, sidebar]);

  const mainStyle: CSSProperties | undefined =
    mainMinHeight != null && mainMinHeight > 0 ? { minHeight: mainMinHeight } : undefined;

  return (
    <div className={`hm-sidebar-balanced-layout ${className}`.trim()}>
      <div
        ref={mainColRef}
        className={`hm-sidebar-balanced-layout__main flex min-h-0 flex-col ${mainClassName}`.trim()}
        style={mainStyle}
      >
        {mainHeader}
        <div className="flex min-h-0 flex-1 flex-col" data-hm-news-list>
          {renderItems(visible)}
        </div>
        {mainFooter}
      </div>
      <div ref={sidebarRef} className={`hm-sidebar-balanced-layout__sidebar ${sidebarClassName}`.trim()}>
        {sidebar}
      </div>
    </div>
  );
}
