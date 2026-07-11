import { useEffect, useRef } from "react";

export function useInfiniteScrollSentinel({
  enabled,
  onLoadMore,
  rootMargin = "400px",
}: {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin]);

  return ref;
}
