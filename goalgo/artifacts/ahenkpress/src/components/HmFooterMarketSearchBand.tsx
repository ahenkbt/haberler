import type { CSSProperties } from "react";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import {
  hmChromeContainedShellClass,
  hmTickerVariantLightFromGlassSurface,
  isHmHeaderChromeContained,
  resolveHmHeaderChromeLightText,
  resolveHmTickerGlassSurface,
} from "@/lib/hmChromeLayout";
import { HmHeaderFinanceWeatherStrip } from "@/components/HmHeaderFinanceWeatherStrip";
import { HmPublicNewsNavSearch } from "@/components/HmPublicNewsNavSearch";
import {
  normalizeHmVitrinTheme,
  resolveTickerFinanceEnabled,
  resolveTickerWeatherEnabled,
} from "@/lib/newsSiteLayout";

/** Mobilde footer üstü piyasa + arama bandı (masaüstünde header'da kalır). */
export function HmFooterMarketSearchBand() {
  const ctx = useHmPublicLinkContextOptional();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const chromeLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const corporateHeader = layoutPrefs?.hmVitrinTheme === "corporate";
  const isSumbulTheme = normalizeHmVitrinTheme(layoutPrefs?.hmVitrinTheme) === "sumbul";
  const showFinanceWeather =
    !corporateHeader &&
    (isSumbulTheme ||
      resolveTickerFinanceEnabled(layoutPrefs) ||
      resolveTickerWeatherEnabled(layoutPrefs));
  const useLightText = resolveHmHeaderChromeLightText(chromeLayoutPrefs);
  const financeGlassSurface = resolveHmTickerGlassSurface(chromeLayoutPrefs, "finance");
  const financeStripLightText = hmTickerVariantLightFromGlassSurface(financeGlassSurface);
  const headerSearchNavOnLight = !useLightText;
  const headerSearchPillIdleBg = headerSearchNavOnLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.12)";
  const headerSearchPillText = headerSearchNavOnLight ? "#475569" : "rgba(255,255,255,0.88)";
  const contained = isHmHeaderChromeContained(layoutPrefs);

  if (!showFinanceWeather && !corporateHeader) {
    if (isSumbulTheme) return null;
    return (
      <div className="hm-footer-market-band w-full shrink-0 border-t border-slate-200/80 bg-slate-50/95 md:hidden">
        <div className={contained ? hmChromeContainedShellClass("px-3 py-2.5 sm:px-4") : "mx-auto max-w-screen-xl px-3 py-2.5 sm:px-4"}>
          <HmPublicNewsNavSearch
            navOnLight
            pillIdleBg="rgba(255,255,255,0.96)"
            pillText="#475569"
            inputId="hm-footer-search-input"
            className="hm-footer-market-band__search w-full max-w-xl"
          />
        </div>
      </div>
    );
  }

  if (corporateHeader) {
    return (
      <div className="hm-footer-market-band w-full shrink-0 border-t border-slate-200/80 bg-white md:hidden">
        <div className={contained ? hmChromeContainedShellClass("px-3 py-2.5 sm:px-4") : "mx-auto max-w-screen-xl px-3 py-2.5 sm:px-4"}>
          <HmPublicNewsNavSearch
            navOnLight={headerSearchNavOnLight}
            pillIdleBg={headerSearchPillIdleBg}
            pillText={headerSearchPillText}
            inputId="hm-corporate-footer-search-input"
            className="hm-footer-market-band__search w-full max-w-xl"
          />
        </div>
      </div>
    );
  }

  const plateStyle: CSSProperties = {
    borderTopColor: useLightText ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.1)",
  };

  return (
    <div
      className={`hm-footer-market-band w-full shrink-0 border-t md:hidden ${
        useLightText ? "bg-[var(--hm-header-bg,#0f172a)] text-white" : "bg-slate-50 text-slate-900"
      }`}
      style={plateStyle}
    >
      <div className={contained ? hmChromeContainedShellClass("px-3 py-2 sm:px-4") : "mx-auto max-w-screen-xl px-3 py-2 sm:px-4"}>
        <HmHeaderFinanceWeatherStrip variantLight={financeStripLightText} />
      </div>
    </div>
  );
}
