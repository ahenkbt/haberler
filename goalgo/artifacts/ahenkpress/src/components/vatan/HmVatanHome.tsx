import { useRef } from "react";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { useVatanReveal } from "@/hooks/useVatanReveal";
import { VatanHero } from "@/components/vatan/home/VatanHero";
import { VatanSehitSorgu } from "@/components/vatan/home/VatanSehitSorgu";
import { VatanHafizaMekanlari } from "@/components/vatan/home/VatanHafizaMekanlari";
import { VatanDernekBand } from "@/components/vatan/home/VatanDernekBand";
import { VatanHaklarDestek } from "@/components/vatan/home/VatanHaklarDestek";
import { VatanMilliGunler } from "@/components/vatan/home/VatanMilliGunler";
import { VatanAtaturkKosesi } from "@/components/vatan/home/VatanAtaturkKosesi";
import { VatanTarihPanels } from "@/components/vatan/home/VatanTarihPanels";
import { VatanDestekOl } from "@/components/vatan/home/VatanDestekOl";

/**
 * Vatan bespoke homepage — fully static. No news, RSS, Google News, ads,
 * tickers or corporate modules are mounted here; nothing is fetched.
 */
export function HmVatanHome({ layoutPrefs, slug }: { layoutPrefs: NewsSiteLayoutPrefs; slug: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useVatanReveal(rootRef);

  return (
    <div ref={rootRef} className="vatan-home" data-vatan-home="">
      <VatanHero />
      <VatanSehitSorgu />
      <VatanHafizaMekanlari />
      <VatanDernekBand />
      <VatanHaklarDestek />
      <VatanMilliGunler />
      <VatanAtaturkKosesi />
      <VatanTarihPanels />
      <VatanDestekOl layoutPrefs={layoutPrefs} slug={slug} />
    </div>
  );
}

export default HmVatanHome;
