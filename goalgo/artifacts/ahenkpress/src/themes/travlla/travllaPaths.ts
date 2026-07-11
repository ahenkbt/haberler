/** @deprecated use TURIZM from @/themes/turizm/turizmRoutes */
import { TURIZM } from "@/themes/turizm/turizmRoutes";

export const TRV = {
  home: TURIZM.hub,
  turlar: TURIZM.turlar.liste,
  tur: TURIZM.turlar.tur,
  destinasyonlar: TURIZM.turlar.destinasyonlar,
  destinasyon: TURIZM.turlar.destinasyon,
  rezervasyon: TURIZM.turlar.rezervasyon,
  arac: TURIZM.arac.home,
  otel: TURIZM.konaklama.home,
  villa: TURIZM.konaklama.home,
  tekne: TURIZM.yat.home,
} as const;
