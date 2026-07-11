import { DELIVERY_MODULES } from "@/lib/deliveryModuleGroups";
import { isConfiguredPortalHost } from "@/lib/hmPortalHosts";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";
import { MAGAZA, MAGAZA_TOP_CATEGORIES } from "@/themes/sellzy/magazaRoutes";
import { OTOMOTIV, OTOMOTIV_MODULES } from "@/themes/otomotiv/otomotivRoutes";
import { TURIZM, TURIZM_MODULES } from "@/themes/turizm/turizmRoutes";

export type HmYekpareFeatureLink = {
  label: string;
  href: string;
};

export type HmYekpareFeatureCard = {
  id: string;
  label: string;
  emoji: string;
  href: string;
  color: string;
  desc: string;
  children: HmYekpareFeatureLink[];
};

export function yekparePortalHref(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return `${PORTAL_ORIGIN}${p}`;
  const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
  if (isConfiguredPortalHost(host)) return p;
  return `${PORTAL_ORIGIN}${p}`;
}

/** Yekpare menü kartları — harita/keşfet yalnızca yekpare.net hub'ında. */
export const HM_PORTAL_HUB_ONLY_YEKPARE_FEATURE_IDS = ["haritalar", "kesfet"] as const;

const HM_PORTAL_HUB_ONLY_YEKPARE_FEATURE_SET = new Set<string>(HM_PORTAL_HUB_ONLY_YEKPARE_FEATURE_IDS);

export function filterHmYekpareFeatureCards(portalHubOnly: boolean): HmYekpareFeatureCard[] {
  if (portalHubOnly) return HM_YEKPARE_FEATURE_CARDS;
  return HM_YEKPARE_FEATURE_CARDS.filter((card) => !HM_PORTAL_HUB_ONLY_YEKPARE_FEATURE_SET.has(card.id));
}

export const HM_YEKPARE_FEATURE_CARDS: HmYekpareFeatureCard[] = [
  {
    id: "siparis",
    label: "Sipariş",
    emoji: "🍽️",
    href: "/siparis",
    color: "#f97316",
    desc: "Yemek, market ve yakın işletmeler.",
    children: DELIVERY_MODULES.map((m) => ({ label: m.shortLabel, href: m.href })),
  },
  {
    id: "shop",
    label: "Alışveriş",
    emoji: "🛍️",
    href: MAGAZA.hub,
    color: "#a855f7",
    desc: "Binlerce ürün tek tıkta.",
    children: [
      { label: "Ürünler", href: MAGAZA.urunler },
      { label: "Mağazalar", href: MAGAZA.magazalar },
      { label: "Kategoriler", href: MAGAZA.kategoriler },
      ...MAGAZA_TOP_CATEGORIES.slice(0, 4).map((c) => ({
        label: c.label,
        href: MAGAZA.kategori(c.slug),
      })),
    ],
  },
  {
    id: "otomotiv",
    label: "Otomotiv",
    emoji: "🚗",
    href: OTOMOTIV.hub,
    color: "#0ea5e9",
    desc: "Araç, parça ve servis ilanları.",
    children: OTOMOTIV_MODULES.map((m) => ({ label: m.label, href: m.href })),
  },
  {
    id: "seyahat",
    label: "Seyahat",
    emoji: "✈️",
    href: TURIZM.hub,
    color: "#06b6d4",
    desc: "Uçak, bilet, otel ve rota.",
    children: [
      { label: "Etkinlik", href: TURIZM.stubs.etkinlik },
      { label: "VIP Transfer", href: TURIZM.stubs.servis },
      ...TURIZM_MODULES.map((m) => ({ label: m.label, href: m.href })),
      { label: "Uçuş", href: TURIZM.stubs.ucus },
    ],
  },
  {
    id: "ulasim",
    label: "Ulaşım",
    emoji: "🚚",
    href: "/ulasim",
    color: "#f59e0b",
    desc: "Kurye, taksi ve nakliye.",
    children: [
      { label: "Kurye", href: "/ulasim/kurye" },
      { label: "Taksi", href: "/ulasim/taksi" },
      { label: "Ortak yolculuk", href: "/ulasim/rideshare" },
      { label: "Çekici", href: "/ulasim/tow" },
      { label: "Nakliyat", href: "/ulasim/moving" },
      { label: "Kargo", href: "/ulasim/cargo" },
    ],
  },
  {
    id: "sari-sayfalar",
    label: "Sarı Sayfalar",
    emoji: "📒",
    href: "/kesfet/sarisayfalar",
    color: "#eab308",
    desc: "Firma rehberi ve ilanlar.",
    children: [
      { label: "Sarı Sayfalar", href: "/kesfet/sarisayfalar" },
      { label: "Firma rehberi", href: "/firma-rehberi" },
      { label: "Ürünler", href: "/firma-rehberi/urunler" },
      { label: "Hizmetler", href: "/firma-rehberi/hizmetler" },
    ],
  },
  {
    id: "kesfet",
    label: "Keşfet",
    emoji: "🧭",
    href: "/kesfet",
    color: "#38bdf8",
    desc: "Yakındaki mekan ve hizmetler.",
    children: [
      { label: "Keşfet", href: "/kesfet" },
      { label: "Liste", href: "/kesfet/liste" },
      { label: "Sarı Sayfalar", href: "/kesfet/sarisayfalar" },
      { label: "Konuma göre", href: "/konumagore" },
    ],
  },
  {
    id: "haritalar",
    label: "Haritalar",
    emoji: "🗺️",
    href: "/haritalar",
    color: "#22c55e",
    desc: "Harita üzerinde arama.",
    children: [
      { label: "Haritalar", href: "/haritalar" },
      { label: "Tam ekran harita", href: "/map" },
      { label: "Keşfet haritası", href: "/kesfet" },
    ],
  },
];
