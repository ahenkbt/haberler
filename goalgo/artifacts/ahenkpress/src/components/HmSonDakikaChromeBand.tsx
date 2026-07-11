import { HmHeaderSonDakikaTicker, useHmHeaderSonDakikaItems } from "@/components/HmHeaderSonDakikaTicker";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmEffectiveLayoutPrefs } from "@/contexts/HmChromeThemeContext";
import {
  hmChromeContainedShellClass,
  isHmHeaderChromeContained,
  hmTickerVariantLightFromGlassSurface,
  resolveHmTickerGlassSurface,
} from "@/lib/hmChromeLayout";

type Props = {
  stickyTopPx: number;
  /** Video TV chrome yığını içinde: dış sticky kaldırılır. */
  embedInVideoTvChrome?: boolean;
};

/** HM vitrin: son dakika bandı — menü şeridinin hemen altında sticky; piyasa/hava şeridiyle aynı cam kapsül. */
export function HmSonDakikaChromeBand({ stickyTopPx, embedInVideoTvChrome = false }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const chromeLayoutPrefs = useHmEffectiveLayoutPrefs() ?? layoutPrefs;
  const enabled = layoutPrefs?.hmNewsBreakingBandEnabled !== false;
  const corporateHeader = layoutPrefs?.hmVitrinTheme === "corporate";
  const list = useHmHeaderSonDakikaItems("breaking");

  if (!enabled || corporateHeader || !layoutPrefs || list.length === 0) return null;

  const glassSurface = resolveHmTickerGlassSurface(chromeLayoutPrefs, "breaking");
  const contained = isHmHeaderChromeContained(chromeLayoutPrefs);
  const ticker = (
    <HmHeaderSonDakikaTicker
      variantLight={hmTickerVariantLightFromGlassSurface(glassSurface)}
      surface="chrome-band"
      mode="breaking"
    />
  );

  const plate = (
    <div className="hm-son-dakika-chrome__plate h-9 min-h-9 max-h-9 overflow-hidden rounded-full">
      {ticker}
    </div>
  );

  if (embedInVideoTvChrome) {
    return (
      <div className="hm-son-dakika-chrome hm-son-dakika-chrome--video-tv-embed w-full shrink-0 py-1.5">
        {plate}
      </div>
    );
  }

  if (contained) {
    return (
      <div
        className="hm-son-dakika-chrome hm-son-dakika-chrome--contained sticky z-[51] w-full shrink-0 py-1.5"
        style={{ top: stickyTopPx }}
      >
        <div className={hmChromeContainedShellClass()}>{plate}</div>
      </div>
    );
  }

  return (
    <div
      className="hm-son-dakika-chrome sticky z-[51] w-full shrink-0 py-1.5"
      style={{ top: stickyTopPx }}
    >
      <div className={`${corporateHeader ? "w-full px-3" : "mx-auto max-w-screen-xl px-3 sm:px-4"}`}>{plate}</div>
    </div>
  );
}
