import { TURIZM } from "@/themes/turizm/turizmRoutes";

export type TourismListingRow = {
  id?: number;
  type: string;
  slug: string;
  href?: string | null;
};

/** Yekpare turizm modül rotalarına göre detay linki */
export function tourismListingHref(row: TourismListingRow): string {
  if (row.href) return row.href;
  switch (row.type) {
    case "hotel":
      return TURIZM.konaklama.detay(row.slug);
    case "villa":
      return TURIZM.villaEv.detay(row.slug);
    case "car":
      return TURIZM.arac.detay(row.slug);
    case "boat":
      return TURIZM.yat.detay(row.slug);
    case "tour":
      return TURIZM.turlar.tur(row.slug);
    case "vip":
      return `${TURIZM.stubs.servis}/${encodeURIComponent(row.slug)}`;
    default:
      return TURIZM.konaklama.detay(row.slug);
  }
}

export function tourismSearchPath(tab: string): string {
  switch (tab) {
    case "hotel":
      return TURIZM.konaklama.home;
    case "villa":
    case "space":
      return TURIZM.villaEv.home;
    case "tour":
      return TURIZM.turlar.home;
    case "car":
      return TURIZM.arac.home;
    case "event":
      return TURIZM.stubs.etkinlik;
    case "flight":
      return TURIZM.stubs.ucus;
    case "boat":
      return TURIZM.yat.home;
    case "bus":
      return TURIZM.stubs.servis;
    case "vip":
    case "servis":
      return TURIZM.stubs.servis;
    default:
      return TURIZM.hub;
  }
}

export const BC_SEARCH_TABS = [
  { key: "hotel", label: "Otel", icon: "🏨" },
  { key: "servis", label: "VIP Transfer", icon: "🚘" },
  { key: "villa", label: "Villa / Ev", icon: "🏡" },
  { key: "tour", label: "Tur", icon: "🗺️" },
  { key: "car", label: "Araba", icon: "🚗" },
  { key: "boat", label: "Yat/Tekne", icon: "⛵" },
  { key: "flight", label: "Uçak", icon: "✈️" },
] as const;
