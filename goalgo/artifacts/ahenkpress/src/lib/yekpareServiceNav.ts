/**
 * Yekpare Sade chrome — ana header ile aynı sıra ve etiketler.
 * Canonical: Keşfet, Sipariş (Yemek/Market/Yakınımdakiler altında), … (site-nav MAIN_NAV_KEY_ORDER)
 */
export type SixAmMartModuleKey = "food" | "grocery" | "pharmacy" | "rental" | "parcel" | "shop";

export const YEKPARE_SERVICE_MODULE_ORDER: SixAmMartModuleKey[] = [
  "food",
  "grocery",
  "pharmacy",
  "rental",
  "parcel",
  "shop",
];

export const YEKPARE_SERVICE_MODULE_META: Record<
  SixAmMartModuleKey,
  { label: string; title: string; href: string; description: string }
> = {
  food: {
    label: "Yemek",
    title: "Yemek",
    href: "/yemek",
    description: "Restoran, cafe ve paket servis.",
  },
  grocery: {
    label: "Market",
    title: "Market",
    href: "/market",
    description: "Market ve yerel sipariş işletmeleri.",
  },
  pharmacy: {
    label: "Yakınımdakiler",
    title: "Yakınımdakiler",
    href: "/isletmeler",
    description: "Yerel hizmet, teknik ihtiyaç ve hızlı tedarik.",
  },
  rental: {
    label: "Seyahat",
    title: "Seyahat",
    href: "/turizm",
    description: "Otel, villa, tur ve araç kiralama.",
  },
  parcel: {
    label: "Ulaşım",
    title: "Ulaşım",
    href: "/ulasim",
    description: "Kurye, taksi, nakliye ve kargo.",
  },
  shop: {
    label: "Alışveriş",
    title: "Alışveriş",
    href: "/magaza",
    description: "Pazaryeri, ürünler ve mağazalar.",
  },
};

export const YEKPARE_PLATFORM_NAV = [
  { label: "Keşfet", href: "/kesfet" },
  { label: "Haritalar", href: "/haritalar" },
] as const;

/** Ana menüde platform linklerinden sonra — ansiklopedi vitrini */
export const YEKPARE_BILGI_AGACI_NAV = { label: "Bilgi Ağacı", href: "/bilgiagaci" } as const;

/** Anasayfa service rail — çekirdek modüller + platform; Haber Merkezi / AI sonda */
export const YEKPARE_HOME_SERVICE_RAIL_HREFS = [
  ...YEKPARE_SERVICE_MODULE_ORDER.map((k) => YEKPARE_SERVICE_MODULE_META[k].href),
  ...YEKPARE_PLATFORM_NAV.map((x) => x.href),
  "/habermerkezi",
  "/ai-cagri-merkezi",
] as const;

export const YEKPARE_FOOTER_SERVICE_MODULES = YEKPARE_SERVICE_MODULE_ORDER.map((key) => ({
  label: YEKPARE_SERVICE_MODULE_META[key].label,
  href: YEKPARE_SERVICE_MODULE_META[key].href,
}));

/** Üst menü Sipariş dropdown — yemek, market, yakınımdakiler + hub aktif durumu */
export function isSiparisNavActive(location: string): boolean {
  const p = location.split("?")[0] ?? "";
  if (p === "/siparis" || p.startsWith("/siparis/")) return true;
  if (p === "/yemek" || p.startsWith("/yemek/")) return true;
  if (p === "/market" || p.startsWith("/market/")) return true;
  if (p === "/isletmeler" || p.startsWith("/isletmeler/")) return true;
  return false;
}

/** SadePublicChrome nav — yol üzerinden aktif modül */
export function resolveSixAmMartActiveFromPath(
  location: string,
): SixAmMartModuleKey | undefined {
  const [path, search = ""] = location.split("?");
  const p = path ?? "";
  if (p === "/yemek" || p.startsWith("/yemek/")) return "food";
  if (p === "/market" || p.startsWith("/market/")) return "grocery";
  if (p === "/isletmeler" || p.startsWith("/isletmeler/")) return "pharmacy";
  if (p === "/otomotiv" || p.startsWith("/otomotiv/")) return undefined;
  if (p === "/turizm" || p.startsWith("/turizm/")) return "rental";
  if (p === "/ulasim" || p.startsWith("/ulasim/")) return "parcel";
  if (p.startsWith("/magaza")) return "shop";
  if (p === "/siparis" || p.startsWith("/siparis/")) {
    const cat = new URLSearchParams(search).get("kategori");
    if (cat === "yemek") return "food";
    return "grocery";
  }
  return undefined;
}
