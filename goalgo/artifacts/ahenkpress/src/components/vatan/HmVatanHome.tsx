import { useMemo, useRef } from "react";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { useVatanReveal } from "@/hooks/useVatanReveal";
import {
  resolveVatanHero,
  resolveVatanMosaicTiles,
  resolveVatanVisibleHomeModules,
  vatanHomeNumeral,
  type VatanHomeModuleId,
} from "@/lib/hmVatanEditorHome";
import { VatanHero } from "@/components/vatan/home/VatanHero";
import { VatanSehitSorgu } from "@/components/vatan/home/VatanSehitSorgu";
import { VatanHafizaMekanlari } from "@/components/vatan/home/VatanHafizaMekanlari";
import { VatanDernekBand } from "@/components/vatan/home/VatanDernekBand";
import { VatanHaklarDestek } from "@/components/vatan/home/VatanHaklarDestek";
import { VatanMilliGunler } from "@/components/vatan/home/VatanMilliGunler";
import { VatanAtaturkKosesi } from "@/components/vatan/home/VatanAtaturkKosesi";
import { VatanTarihPanels } from "@/components/vatan/home/VatanTarihPanels";
import { VatanDestekOl } from "@/components/vatan/home/VatanDestekOl";

const NUMBERED: ReadonlySet<VatanHomeModuleId> = new Set([
  "mosaic",
  "dernek",
  "rights",
  "nationalDays",
  "ataturk",
  "wars",
  "donation",
]);

/**
 * Vatan homepage. Copy/assets stay evergreen; order, slider, mosaic and
 * donation surfaces read the same layoutPrefs the editor already saves.
 */
export function HmVatanHome({ layoutPrefs, slug }: { layoutPrefs: NewsSiteLayoutPrefs; slug: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useVatanReveal(rootRef);
  const hero = useMemo(() => resolveVatanHero(layoutPrefs), [layoutPrefs]);
  const mosaicTiles = useMemo(() => resolveVatanMosaicTiles(layoutPrefs), [layoutPrefs]);
  const modules = useMemo(() => resolveVatanVisibleHomeModules(layoutPrefs), [layoutPrefs]);
  const numerals = useMemo(() => {
    const map = new Map<VatanHomeModuleId, string>();
    let n = 0;
    for (const id of modules) {
      if (!NUMBERED.has(id)) continue;
      map.set(id, vatanHomeNumeral(n));
      n += 1;
    }
    return map;
  }, [modules]);

  return (
    <div ref={rootRef} className="vatan-home" data-vatan-home="">
      {modules.map((id) => {
        switch (id) {
          case "hero":
            return <VatanHero key={id} hero={hero} />;
          case "sehitSearch":
            return <VatanSehitSorgu key={id} />;
          case "mosaic":
            return <VatanHafizaMekanlari key={id} tiles={mosaicTiles} numeral={numerals.get(id)} />;
          case "dernek":
            return <VatanDernekBand key={id} numeral={numerals.get(id)} />;
          case "rights":
            return <VatanHaklarDestek key={id} numeral={numerals.get(id)} />;
          case "nationalDays":
            return <VatanMilliGunler key={id} numeral={numerals.get(id)} />;
          case "ataturk":
            return <VatanAtaturkKosesi key={id} numeral={numerals.get(id)} />;
          case "wars":
            return <VatanTarihPanels key={id} numeral={numerals.get(id)} />;
          case "donation":
            return <VatanDestekOl key={id} layoutPrefs={layoutPrefs} slug={slug} numeral={numerals.get(id)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export default HmVatanHome;
