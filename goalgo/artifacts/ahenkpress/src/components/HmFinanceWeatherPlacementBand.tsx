import { HmHeaderFinanceWeatherStrip } from "@/components/HmHeaderFinanceWeatherStrip";
import { HmPublicNewsNavSearch } from "@/components/HmPublicNewsNavSearch";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import {
  hmChromeContainedShellClass,
  hmTickerVariantLightFromGlassSurface,
  isHmHeaderChromeContained,
  resolveHmTickerGlassSurface,
} from "@/lib/hmChromeLayout";
import {
  normalizeHmVitrinTheme,
  resolveFinanceWeatherBelowMenu,
  resolveFinanceWeatherInSidebar,
  resolveTickerFinanceEnabled,
  resolveTickerWeatherEnabled,
} from "@/lib/newsSiteLayout";

type Props = {
  stickyTopPx?: number;
  /** Menü altı tam genişlik şerit */
  variant: "below-menu" | "sidebar";
  className?: string;
};

/** Piyasa / hava bandı — editör `tickerPlacement` konumuna göre. */
export function HmFinanceWeatherPlacementBand({ stickyTopPx, variant, className = "" }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const chromeLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const corporateHeader = layoutPrefs?.hmVitrinTheme === "corporate";
  const isSumbulTheme = normalizeHmVitrinTheme(layoutPrefs?.hmVitrinTheme) === "sumbul";
  const placementOk =
    variant === "below-menu"
      ? resolveFinanceWeatherBelowMenu(layoutPrefs)
      : resolveFinanceWeatherInSidebar(layoutPrefs);

  if (!layoutPrefs || corporateHeader || !placementOk) return null;
  if (
    variant === "below-menu" &&
    !isSumbulTheme &&
    !resolveTickerFinanceEnabled(layoutPrefs) &&
    !resolveTickerWeatherEnabled(layoutPrefs)
  ) {
    return null;
  }

  const financeGlassSurface = resolveHmTickerGlassSurface(chromeLayoutPrefs, "finance");
  const financeStripLightText = hmTickerVariantLightFromGlassSurface(financeGlassSurface);
  const contained = isHmHeaderChromeContained(chromeLayoutPrefs);

  const strip = (
    <div
      className={`hm-finance-weather-band hm-finance-weather-band--${variant} ${className}`.trim()}
      data-hm-ticker-placement={variant}
    >
      <HmHeaderFinanceWeatherStrip variantLight={financeStripLightText} />
    </div>
  );

  if (variant === "sidebar") {
    const navOnLight = !financeStripLightText;
    const pillIdleBg = navOnLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.12)";
    const pillText = navOnLight ? "#334155" : "rgba(255,255,255,0.92)";

    return (
      <div className={`hm-finance-weather-sidebar-stack space-y-3 ${className}`.trim()}>
        <div className="hm-vitrin-sidebar-panel hm-finance-weather-band-wrap rounded-xl p-3 shadow">
          <HmHeaderFinanceWeatherStrip
            variantLight={financeStripLightText}
            hideSearch
            layout="sidebar"
          />
        </div>
        {!isSumbulTheme ? (
          <div className="hm-vitrin-sidebar-panel hm-sidebar-search-panel rounded-xl p-3 shadow">
            <HmPublicNewsNavSearch
              navOnLight={navOnLight}
              pillIdleBg={pillIdleBg}
              pillText={pillText}
              inputId="hm-sidebar-search-input"
              className="hm-sidebar-search-panel__search w-full"
            />
          </div>
        ) : null}
      </div>
    );
  }

  const inner = contained ? <div className={hmChromeContainedShellClass()}>{strip}</div> : strip;

  return (
    <div
      className="hm-finance-weather-band-chrome sticky z-[43] w-full shrink-0 border-b border-slate-200/80 bg-white/95 py-1.5 backdrop-blur-sm"
      style={stickyTopPx != null ? { top: stickyTopPx } : undefined}
    >
      {contained ? inner : <div className="mx-auto w-full max-w-screen-xl px-3 sm:px-4">{inner}</div>}
    </div>
  );
}
