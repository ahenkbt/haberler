import { useEffect, useRef, useState, type RefObject } from "react";

export type UseInViewOptions = {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  initialInView?: boolean;
};

export type UseInViewResult = {
  ref: RefObject<HTMLDivElement | null>;
  inView: boolean;
};

export function useInView(opts: UseInViewOptions = {}): UseInViewResult {
  const { rootMargin = "400px 0px", threshold = 0, triggerOnce = true, initialInView = false } = opts;
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(initialInView);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          setInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) setInView(false);
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold, triggerOnce]);
  return { ref, inView };
}
