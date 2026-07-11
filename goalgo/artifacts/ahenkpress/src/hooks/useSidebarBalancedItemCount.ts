import { useLayoutEffect, useRef, useState, type RefObject } from "react";

const LG_MEDIA = "(min-width: 1024px)";

/** Tek satır (3 kart) yaklaşık yükseklik — gerçek kartlardan biraz düşük tutulur (daha fazla satır). */
const RSS_ROW_HEIGHT_PX = 192;
const RSS_BAND_CHROME_PX = 132;

type Options = {
  enabled: boolean;
  itemCount: number;
  minItems?: number;
  maxItems?: number;
  initialItems?: number;
  columnsPerRow?: number;
  /** Sidebar yüksekliğine ekstra satır (görsel denge). */
  bufferRows?: number;
};

function alignToColumns(n: number, columns: number, min: number, cap: number): number {
  if (columns <= 1) return Math.min(Math.max(n, min), cap);
  const aligned = Math.ceil(Math.max(n, min) / columns) * columns;
  return Math.min(aligned, cap);
}

function countFromSidebarHeight(
  sidebarHeight: number,
  columnsPerRow: number,
  minItems: number,
  cap: number,
  bufferRows: number,
): number {
  if (sidebarHeight < 80) return alignToColumns(minItems, columnsPerRow, minItems, cap);
  const available = Math.max(0, sidebarHeight - RSS_BAND_CHROME_PX);
  const rows = Math.max(2, Math.ceil(available / RSS_ROW_HEIGHT_PX) + bufferRows);
  const raw = rows * columnsPerRow;
  return alignToColumns(Math.min(cap, Math.max(minItems, raw)), columnsPerRow, minItems, cap);
}

/**
 * Sağ sidebar yüksekliğine göre sol listede gösterilecek öğe sayısını ayarlar (lg+).
 * Yalnızca sidebar izlenir; ana sütun ResizeObserver döngüsü (titreme) oluşturmaz.
 */
export function useSidebarBalancedItemCount(
  sidebarRef: RefObject<HTMLElement | null>,
  mainColumnRef: RefObject<HTMLElement | null>,
  options: Options,
): number {
  const minItems = options.minItems ?? 3;
  const maxItems = options.maxItems ?? 40;
  const columnsPerRow = Math.max(1, Math.floor(options.columnsPerRow ?? 1));
  const bufferRows = Math.max(0, Math.floor(options.bufferRows ?? 0));
  const cap = Math.min(maxItems, options.itemCount);
  const initialItems = Math.min(options.initialItems ?? 6, cap);

  const [count, setCount] = useState(() =>
    options.enabled
      ? alignToColumns(initialItems, columnsPerRow, minItems, cap)
      : cap,
  );

  const stableCountRef = useRef(count);

  useLayoutEffect(() => {
    if (!options.enabled || cap <= 0) {
      const next = cap;
      stableCountRef.current = next;
      setCount(next);
      return;
    }

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const mq = window.matchMedia(LG_MEDIA);
    let frame = 0;
    let ro: ResizeObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let refineTimer: ReturnType<typeof setTimeout> | null = null;
    let refineCount = 0;

    const computeCount = () =>
      countFromSidebarHeight(sidebar.offsetHeight, columnsPerRow, minItems, cap, bufferRows);

    const applyCount = (allowRefine: boolean) => {
      if (!mq.matches) {
        const next = alignToColumns(Math.min(cap, Math.max(minItems, initialItems)), columnsPerRow, minItems, cap);
        if (next !== stableCountRef.current) {
          stableCountRef.current = next;
          setCount(next);
        }
        return;
      }

      let next = computeCount();
      if (next !== stableCountRef.current) {
        stableCountRef.current = next;
        setCount(next);
      }

      if (!allowRefine || refineCount >= 2) return;
      const main = mainColumnRef.current;
      if (!main) return;

      refineTimer = setTimeout(() => {
        refineTimer = null;
        const targetH = sidebar.offsetHeight;
        const mainH = main.offsetHeight;
        if (targetH < 80 || mainH >= targetH - 56) return;

        setCount((prev) => {
          if (prev >= cap) return prev;
          const bumped = alignToColumns(prev + columnsPerRow, columnsPerRow, minItems, cap);
          if (bumped === prev) return prev;
          stableCountRef.current = bumped;
          refineCount += 1;
          return bumped;
        });
      }, 380);
    };

    const schedule = (allowRefine = false) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => applyCount(allowRefine));
      }, 140);
    };

    const onMq = () => {
      refineCount = 0;
      schedule(true);
    };
    mq.addEventListener("change", onMq);

    ro = new ResizeObserver(() => schedule(false));
    ro.observe(sidebar);

    schedule(true);
    const lateSync = setTimeout(() => schedule(true), 700);
    const lateSync2 = setTimeout(() => schedule(true), 1400);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (refineTimer) clearTimeout(refineTimer);
      clearTimeout(lateSync);
      clearTimeout(lateSync2);
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", onMq);
      ro?.disconnect();
    };
  }, [
    options.enabled,
    options.itemCount,
    minItems,
    maxItems,
    initialItems,
    columnsPerRow,
    bufferRows,
    cap,
    sidebarRef,
    mainColumnRef,
  ]);

  return alignToColumns(count, columnsPerRow, minItems, cap);
}
