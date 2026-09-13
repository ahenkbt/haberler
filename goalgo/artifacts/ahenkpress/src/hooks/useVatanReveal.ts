import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "@/hooks/useVatanScrolled";

/**
 * One `IntersectionObserver` per subtree: every `.vatan-reveal` inside `rootRef`
 * gets `is-in` once, staggered by its `--i` custom property (set via `data-reveal-i`).
 * Under reduced motion the observer is never created and everything is visible.
 */
export function useVatanReveal(rootRef: RefObject<HTMLElement | null>, deps: readonly unknown[] = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".vatan-reveal"));
    if (nodes.length === 0) return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      for (const n of nodes) n.classList.add("is-in");
      return undefined;
    }

    for (const n of nodes) {
      const i = n.dataset.revealI;
      if (i != null && i !== "") n.style.setProperty("--i", i);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    for (const n of nodes) {
      if (n.classList.contains("is-in")) continue;
      io.observe(n);
    }
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, ...deps]);
}
