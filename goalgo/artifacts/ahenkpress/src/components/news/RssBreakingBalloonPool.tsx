import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { HmBreakingRssFeedId } from "@/lib/newsSiteLayout";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import "./RssBreakingBalloonPool.css";

function balloonImageSrc(url: string | null | undefined): string {
  const value = String(url ?? "").trim();
  if (!value) return "";
  return resolveClientMediaSrc(value) || value;
}

export type RssBreakingBalloonItem = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
};

const BALLOON_CATEGORY_COLORS: Partial<Record<HmBreakingRssFeedId, string>> = {
  turkiye: "#e11d48",
  dunya: "#2563eb",
  ekonomi: "#059669",
  teknoloji: "#7c3aed",
  saglik: "#0d9488",
  spor: "#ea580c",
  yasam: "#db2777",
  otomobil: "#475569",
  para: "#ca8a04",
  egitim: "#0891b2",
  savunmaSanayi: "#4b5563",
};

function balloonCategoryColor(category: string, accent: string): string {
  const preset = BALLOON_CATEGORY_COLORS[category as HmBreakingRssFeedId];
  if (preset) return preset;
  if (!category.trim()) return accent;
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  const hues = ["#e11d48", "#2563eb", "#059669", "#7c3aed", "#0d9488", "#ea580c", "#db2777", "#ca8a04"];
  return hues[hash % hues.length] ?? accent;
}

const DESKTOP_SLOT_COUNT = 5;
const MOBILE_SLOT_COUNT = 2;
const POP_MS = 380;

type SlotState<T> = {
  item: T;
  cycle: number;
};

function pickNextItem<T extends RssBreakingBalloonItem>(
  pool: T[],
  takenIds: Set<string>,
  cursor: number,
): { item: T; nextCursor: number } | null {
  if (!pool.length) return null;
  for (let step = 0; step < pool.length; step += 1) {
    const index = (cursor + step) % pool.length;
    const candidate = pool[index];
    if (!takenIds.has(candidate.id) || pool.length === 1) {
      return { item: candidate, nextCursor: (index + 1) % pool.length };
    }
  }
  const fallback = pool[cursor % pool.length];
  return { item: fallback, nextCursor: (cursor + 1) % pool.length };
}

function buildInitialSlots<T extends RssBreakingBalloonItem>(pool: T[], slotCount: number): SlotState<T>[] {
  const count = Math.min(slotCount, pool.length);
  return Array.from({ length: count }, (_, index) => ({
    item: pool[index % pool.length],
    cycle: 0,
  }));
}

export function RssBreakingBalloonPool<T extends RssBreakingBalloonItem>({
  items,
  accent,
  hiddenIds,
  onSelect,
}: {
  items: T[];
  accent: string;
  hiddenIds: Set<string>;
  onSelect: (item: T) => void;
}) {
  const [slotCount, setSlotCount] = useState(DESKTOP_SLOT_COUNT);
  const [slots, setSlots] = useState<SlotState<T>[]>([]);
  const [manualPopKey, setManualPopKey] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const queueCursorRef = useRef(0);
  const poolSignature = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  const pool = useMemo(
    () => items.filter((item) => !hiddenIds.has(item.id)),
    [hiddenIds, items],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(media.matches);
    syncReducedMotion();
    media.addEventListener("change", syncReducedMotion);
    return () => media.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const syncSlotCount = () => setSlotCount(media.matches ? MOBILE_SLOT_COUNT : DESKTOP_SLOT_COUNT);
    syncSlotCount();
    media.addEventListener("change", syncSlotCount);
    return () => media.removeEventListener("change", syncSlotCount);
  }, []);

  useEffect(() => {
    if (!pool.length) {
      setSlots([]);
      queueCursorRef.current = 0;
      return;
    }
    const nextSlots = buildInitialSlots(pool, slotCount);
    setSlots(nextSlots);
    queueCursorRef.current = nextSlots.length % pool.length;
  }, [pool, poolSignature, slotCount]);

  const replaceSlot = useCallback(
    (slotIndex: number) => {
      setSlots((current) => {
        if (!pool.length || slotIndex < 0 || slotIndex >= current.length) return current;
        const takenIds = new Set(current.map((slot) => slot.item.id));
        takenIds.delete(current[slotIndex]?.item.id ?? "");
        const picked = pickNextItem(pool, takenIds, queueCursorRef.current);
        if (!picked) return current;
        queueCursorRef.current = picked.nextCursor;
        return current.map((slot, index) =>
          index === slotIndex
            ? { item: picked.item, cycle: slot.cycle + 1 }
            : slot,
        );
      });
    },
    [pool],
  );

  const handleCycleEnd = useCallback(
    (slotIndex: number, cycle: number) => {
      if (manualPopKey) return;
      setSlots((current) => {
        const slot = current[slotIndex];
        if (!slot || slot.cycle !== cycle || !pool.length) return current;
        const takenIds = new Set(current.map((entry) => entry.item.id));
        takenIds.delete(slot.item.id);
        const picked = pickNextItem(pool, takenIds, queueCursorRef.current);
        if (!picked) return current;
        queueCursorRef.current = picked.nextCursor;
        return current.map((entry, index) =>
          index === slotIndex
            ? { item: picked.item, cycle: entry.cycle + 1 }
            : entry,
        );
      });
    },
    [manualPopKey, pool],
  );

  const handleClick = useCallback(
    (item: T, slotIndex: number, cycle: number) => {
      const popKey = `${slotIndex}-${cycle}`;
      if (manualPopKey) return;
      setManualPopKey(popKey);
      window.setTimeout(() => {
        onSelect(item);
        setManualPopKey(null);
        replaceSlot(slotIndex);
      }, POP_MS);
    },
    [manualPopKey, onSelect, replaceSlot],
  );

  if (!pool.length) {
    return (
      <div className="rss-breaking-balloon-pool rss-breaking-balloon-pool--empty">
        <p className="rss-breaking-balloon-pool__empty">Gösterilecek haber balonu kalmadı.</p>
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {pool.slice(0, slotCount).map((item) => {
          const color = balloonCategoryColor(item.category, accent);
          const imageSrc = item.imageUrl ? balloonImageSrc(item.imageUrl) : null;
          return (
            <button
              key={item.id}
              type="button"
              className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ "--tw-ring-color": color } as CSSProperties}
              onClick={() => onSelect(item)}
              aria-label={`${item.title} haberini aç`}
            >
              {imageSrc ? (
                <img src={imageSrc} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center text-[10px] font-black uppercase tracking-wide text-white" style={{ background: color }}>
                  Haber
                </div>
              )}
              <div className="p-3">
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
                  style={{ background: color }}
                >
                  {item.categoryLabel}
                </span>
                <span className="mt-2 block text-sm font-black leading-snug text-slate-950">{item.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rss-breaking-balloon-pool" style={{ "--accent": accent } as CSSProperties}>
      <div className="rss-breaking-balloon-pool__sky" aria-hidden />
      <div
        className="rss-breaking-balloon-pool__grid"
        style={{ "--balloon-slots": String(slots.length || slotCount) } as CSSProperties}
      >
        {slots.map((slot, slotIndex) => {
          const color = balloonCategoryColor(slot.item.category, accent);
          const imageSrc = slot.item.imageUrl ? balloonImageSrc(slot.item.imageUrl) : null;
          const popKey = `${slotIndex}-${slot.cycle}`;
          const isManualPop = manualPopKey === popKey;
          return (
            <div key={`slot-${slotIndex}`} className="rss-breaking-balloon-slot">
              <button
                key={`${slotIndex}-${slot.item.id}-${slot.cycle}`}
                type="button"
                className={`rss-breaking-balloon is-live${imageSrc ? " has-photo" : ""}${isManualPop ? " is-popping" : ""}`}
                style={
                  {
                    "--balloon-color": color,
                    "--balloon-cycle-delay": `${slotIndex * 0.95}s`,
                  } as CSSProperties
                }
                onClick={() => handleClick(slot.item, slotIndex, slot.cycle)}
                onAnimationEnd={(event) => {
                  if (event.animationName !== "rss-balloon-lifecycle") return;
                  handleCycleEnd(slotIndex, slot.cycle);
                }}
                aria-label={`${slot.item.title} haberini aç`}
              >
                <span className="rss-breaking-balloon__body">
                  {imageSrc ? (
                    <img src={imageSrc} alt="" className="rss-breaking-balloon__photo" loading="lazy" />
                  ) : null}
                  <span className="rss-breaking-balloon__overlay" aria-hidden />
                  <span className="rss-breaking-balloon__shine" aria-hidden />
                  <span className="rss-breaking-balloon__content">
                    <span className="rss-breaking-balloon__label">{slot.item.categoryLabel}</span>
                    <span className="rss-breaking-balloon__title">{slot.item.title}</span>
                  </span>
                </span>
                <span className="rss-breaking-balloon__knot" aria-hidden />
                <span className="rss-breaking-balloon__string" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
