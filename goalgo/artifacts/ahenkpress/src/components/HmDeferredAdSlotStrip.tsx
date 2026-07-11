import { useEffect, useState } from "react";
import { HmAdSlotStrip } from "@/components/HmAdSlotStrip";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

const DEFER_MS = 1_800;

type Props = {
  slotKey: string;
  siteId: number | null;
  slug: string;
  domain?: string | null;
  layoutPrefs: NewsSiteLayoutPrefs;
  className?: string;
};

/** Reklam şeritleri — haber içeriği önce; reklam görselleri idle sonrası. */
export function HmDeferredAdSlotStrip(props: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: DEFER_MS });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = window.setTimeout(run, DEFER_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;
  return <HmAdSlotStrip {...props} />;
}
