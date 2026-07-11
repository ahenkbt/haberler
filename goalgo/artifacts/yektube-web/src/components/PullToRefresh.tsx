import { useCallback, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { hapticSuccess } from "@/lib/haptics";

const THRESHOLD = 72;

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    setPull(0);
    try {
      await onRefresh();
      hapticSuccess();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    const el = scrollerRef.current;
    if (!el || el.scrollTop > 0) return;
    pulling.current = true;
    startY.current = e.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || disabled || refreshing) return;
    const el = scrollerRef.current;
    if (!el || el.scrollTop > 0) {
      setPull(0);
      return;
    }
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 0) {
      setPull(Math.min(dy * 0.45, THRESHOLD + 24));
      if (dy > 8) e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull >= THRESHOLD && !refreshing) void runRefresh();
    else setPull(0);
  };

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center transition-opacity"
        style={{
          height: Math.max(pull, refreshing ? 48 : 0),
          opacity: refreshing || pull > 8 ? 1 : 0,
        }}
      >
        <div className="flex items-end pb-2">
          <Loader2
            className={cn("h-6 w-6 text-zinc-500", (refreshing || progress >= 1) && "animate-spin")}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain"
        style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined, transition: pulling.current ? "none" : "transform 0.2s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
