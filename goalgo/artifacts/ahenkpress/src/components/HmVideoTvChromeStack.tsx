import { useLayoutEffect, useRef } from "react";
import { HmPublicNewsNavStrip } from "@/components/HmPublicNewsNavStrip";
import { HmVideoTvEditorSiteLogoSlot } from "@/components/HmVideoTvEditorSiteLogoSlot";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmChromeContainedShellClass, isHmHeaderChromeContained } from "@/lib/hmChromeLayout";

type Props = {
  stickyTopPx: number;
};

/**
 * Video TV: editör logosu solda; menü şeridi sağda (tek sticky blok, son dakika yok).
 */
export function HmVideoTvChromeStack({ stickyTopPx }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const contained = isHmHeaderChromeContained(ctx?.layoutPrefs ?? null);
  const stackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return undefined;
    const root = el.closest(".hm-vitrin-root") as HTMLElement | null;
    const applyHeight = () => {
      const px = Math.ceil(el.getBoundingClientRect().height);
      if (px <= 0) return;
      const value = `${px}px`;
      if (root) root.style.setProperty("--hm-video-tv-chrome-height", value);
      document.documentElement.style.setProperty("--hm-video-tv-chrome-height", value);
    };
    applyHeight();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", applyHeight);
      return () => window.removeEventListener("resize", applyHeight);
    }
    const ro = new ResizeObserver(applyHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const grid = (
    <div className="hm-video-tv-chrome-stack__grid w-full min-w-0">
      <div className="hm-video-tv-chrome-stack__logo">
        <HmVideoTvEditorSiteLogoSlot />
      </div>
      <div className="hm-video-tv-chrome-stack__nav min-w-0">
        <HmPublicNewsNavStrip stickyTopPx={0} pinOnVideoTv embedInVideoTvChrome />
      </div>
    </div>
  );

  return (
    <div
      ref={stackRef}
      className="hm-video-tv-chrome-stack sticky z-[52] w-full shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-[8px]"
      style={{ top: stickyTopPx }}
    >
      {contained ? (
        <div className={hmChromeContainedShellClass("py-0")}>{grid}</div>
      ) : (
        <div className="hm-video-tv-chrome-stack__shell mx-auto w-full max-w-screen-xl px-0 sm:px-4">{grid}</div>
      )}
    </div>
  );
}
