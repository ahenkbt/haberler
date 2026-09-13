import { useEffect, useState } from "react";

/** rAF-throttled `window.scrollY > threshold` boolean for the Vatan fixed header. */
export function useVatanScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(() =>
    typeof window !== "undefined" ? window.scrollY > threshold : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const next = window.scrollY > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return scrolled;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
