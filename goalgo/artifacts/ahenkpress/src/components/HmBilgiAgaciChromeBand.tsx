import { BilgiAgaciSubNavBar } from "@/components/BilgiAgaciSubNavBar";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HM_BILGI_AGACI_CHROME_BAND_HEIGHT_PX } from "@/lib/bilgiAgaciHmRoutes";
import { hmChromeContainedShellClass, isHmHeaderChromeContained } from "@/lib/hmChromeLayout";

type Props = {
  stickyTopPx: number;
};

/**
 * HM vitrin: Bilgi Ağacı kategori pill şeridi — ana menü şeridinin hemen altında sticky.
 * Ortalı site düzeninde ana içerik kabuğuyla aynı 1280px genişlikte hizalanır.
 */
export function HmBilgiAgaciChromeBand({ stickyTopPx }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const contained = layoutPrefs ? isHmHeaderChromeContained(layoutPrefs) : false;

  const subNav = <BilgiAgaciSubNavBar sticky={false} className="hm-bilgi-agaci-chrome__subnav" />;

  if (contained) {
    return (
      <div
        className="hm-bilgi-agaci-chrome hm-bilgi-agaci-chrome--contained sticky z-[51] w-full shrink-0"
        style={{ top: stickyTopPx }}
      >
        <div className={hmChromeContainedShellClass("hm-bilgi-agaci-chrome__plate")}>{subNav}</div>
      </div>
    );
  }

  return (
    <div
      className="hm-bilgi-agaci-chrome sticky z-[51] w-full shrink-0"
      style={{ top: stickyTopPx }}
    >
      <div className="mx-auto max-w-screen-xl px-3 sm:px-4">{subNav}</div>
    </div>
  );
}

export { HM_BILGI_AGACI_CHROME_BAND_HEIGHT_PX };
