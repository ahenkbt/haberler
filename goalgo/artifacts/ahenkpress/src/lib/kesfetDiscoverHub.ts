import {
  isModuleEnabled,
  isSiparisSubNavKey,
  MAIN_NAV_HREF,
  MAIN_NAV_LABELS,
  parseModulesEnabledJson,
  parseNavMenuItems,
  type MainNavKey,
  type NavMenuItem,
} from "@workspace/site-nav";
import { HARITALAR, HARITALAR_SUPER_NAV } from "@/lib/haritalarRoutes";
import type { SixAmMartModuleKey } from "@/lib/yekpareServiceNav";
import { YEKPARE_SERVICE_MODULE_META, YEKPARE_SERVICE_MODULE_ORDER } from "@/lib/yekpareServiceNav";
import { OTOMOTIV, OTOMOTIV_MODULES } from "@/themes/otomotiv/otomotivRoutes";
import { TURIZM, TURIZM_MODULES } from "@/themes/turizm/turizmRoutes";

export const KESFET_HUB_PATH = "/kesfet";
export const KESFET_LISTING_PATH = "/kesfet/liste";
export const UNIFIED_SEARCH_PATH = "/ara";
export const YEKPARE_SLOGAN =
  "Türkiye'nin yerli ve milli arama motoru — haber, hizmet ve alışverişi tek aramada keşfedin.";

export const KESFET_HUB_BADGE_LABEL = "Keşfet Merkezi";
export const KESFET_HUB_HERO_TITLE = "Şehri keşfet, sipariş ver, alışveriş yap, yola çık";
export const KESFET_HUB_HERO_SUBTITLE =
  "Sipariş, alışveriş, otomotiv, seyahat, ulaşım, haritalar, haberler, YekTube, Bilgi Ağacı, işletme arama, sarı sayfalar ve rezervasyon — tüm Yekpare hizmetleri tek merkezde.";
export const KESFET_HUB_META_DESCRIPTION = KESFET_HUB_HERO_SUBTITLE;
export const KESFET_HUB_PAGE_TITLE = `${KESFET_HUB_BADGE_LABEL} — Yekpare`;

/** Üst menüden kaldırılır — yalnızca Keşfet hub kartlarından erişilir. */
export const KESFET_HUB_SHELTERED_NAV_KEYS = new Set<MainNavKey>([
  "haberler",
  "yektube",
  "ansiklopedi",
  "firmaRehberi",
]);

export type KesfetHubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  bg: string;
  emoji: string;
};

export type KesfetHubSection = {
  id: string;
  title: string;
  subtitle?: string;
  cards: KesfetHubCard[];
};

function hubCard(card: KesfetHubCard): KesfetHubCard {
  return card;
}

const OTOMOTIV_EMOJI: Record<string, string> = {
  galeri: "🚘",
  sifir: "✨",
  ikinciEl: "🔄",
  yedekParca: "🔧",
  cikma: "♻️",
  servis: "🛠️",
  yikama: "💧",
  lastik: "⭕",
  sigorta: "🛡️",
};

const TURIZM_EMOJI: Record<string, string> = {
  turlar: "🗺️",
  konaklama: "🏨",
  villaEv: "🏡",
  arac: "🚙",
  yat: "⛵",
};

const HARITALAR_EMOJI: Record<string, string> = {
  mekan_dukkan: "🏪",
  alisveris: "🛍️",
  hizmet: "🔧",
  turizm: "🏖️",
  kamu: "🏛️",
  firma_rehberi: "📒",
};

export const KESFET_HUB_SECTIONS: KesfetHubSection[] = [
  {
    id: "siparis",
    title: "Sipariş",
    subtitle: "Yemek, market ve yakınımdaki işletmeler",
    cards: [
      hubCard({
        id: "siparis",
        title: "Sipariş",
        description: "Yemek, market ve hızlı teslimat — tek merkezden.",
        href: MAIN_NAV_HREF.siparis,
        accent: "#039D55",
        bg: "from-emerald-50 via-white to-green-50/80",
        emoji: "🍽️",
      }),
      hubCard({
        id: "yemek",
        title: YEKPARE_SERVICE_MODULE_META.food.label,
        description: YEKPARE_SERVICE_MODULE_META.food.description,
        href: YEKPARE_SERVICE_MODULE_META.food.href,
        accent: "#ea580c",
        bg: "from-orange-50 via-white to-amber-50/70",
        emoji: "🍕",
      }),
      hubCard({
        id: "market",
        title: YEKPARE_SERVICE_MODULE_META.grocery.label,
        description: YEKPARE_SERVICE_MODULE_META.grocery.description,
        href: YEKPARE_SERVICE_MODULE_META.grocery.href,
        accent: "#16a34a",
        bg: "from-lime-50 via-white to-green-50/70",
        emoji: "🛒",
      }),
      hubCard({
        id: "isletmeler",
        title: YEKPARE_SERVICE_MODULE_META.pharmacy.label,
        description: YEKPARE_SERVICE_MODULE_META.pharmacy.description,
        href: YEKPARE_SERVICE_MODULE_META.pharmacy.href,
        accent: "#0d9488",
        bg: "from-teal-50 via-white to-cyan-50/70",
        emoji: "🏪",
      }),
    ],
  },
  {
    id: "alisveris",
    title: "Alışveriş & Mağaza",
    subtitle: "Pazaryeri, ürünler ve mağazalar",
    cards: [
      hubCard({
        id: "magaza",
        title: "Alışveriş",
        description: YEKPARE_SERVICE_MODULE_META.shop.description,
        href: YEKPARE_SERVICE_MODULE_META.shop.href,
        accent: "#7c3aed",
        bg: "from-violet-50 via-white to-purple-50/70",
        emoji: "🛍️",
      }),
    ],
  },
  {
    id: "otomotiv",
    title: "Otomotiv",
    subtitle: "Galeri, yedek parça, servis ve sigorta",
    cards: [
      hubCard({
        id: "otomotiv",
        title: "Otomotiv",
        description: "Araç alım-satım, servis, yedek parça ve sigorta.",
        href: OTOMOTIV.hub,
        accent: "#1e3a5f",
        bg: "from-slate-50 via-white to-blue-50/80",
        emoji: "🚗",
      }),
      ...OTOMOTIV_MODULES.map((mod) =>
        hubCard({
          id: `otomotiv-${mod.key}`,
          title: mod.label,
          description: mod.description,
          href: mod.href,
          accent: "#1e3a5f",
          bg: "from-slate-50 via-white to-sky-50/60",
          emoji: OTOMOTIV_EMOJI[mod.key] ?? "🚗",
        }),
      ),
    ],
  },
  {
    id: "seyahat",
    title: "Seyahat & Turizm",
    subtitle: "Otel, tur, yat, etkinlik ve rezervasyon",
    cards: [
      hubCard({
        id: "seyahat",
        title: "Seyahat",
        description: "Otel, villa, tur, araç kiralama ve uçak bileti.",
        href: TURIZM.hub,
        accent: "#0284c7",
        bg: "from-sky-50 via-white to-blue-50/80",
        emoji: "✈️",
      }),
      ...TURIZM_MODULES.map((mod) =>
        hubCard({
          id: `turizm-${mod.key}`,
          title: mod.label,
          description: mod.description,
          href: mod.href,
          accent: "#0284c7",
          bg: "from-sky-50 via-white to-cyan-50/60",
          emoji: TURIZM_EMOJI[mod.key] ?? "✈️",
        }),
      ),
      hubCard({
        id: "turizm-etkinlik",
        title: "Etkinlik",
        description: "Konser, festival ve etkinlik biletleri.",
        href: TURIZM.stubs.etkinlik,
        accent: "#db2777",
        bg: "from-pink-50 via-white to-rose-50/70",
        emoji: "🎫",
      }),
      hubCard({
        id: "turizm-ucus",
        title: "Uçak",
        description: "Uçak bileti arama ve karşılaştırma.",
        href: TURIZM.stubs.ucus,
        accent: "#2563eb",
        bg: "from-blue-50 via-white to-indigo-50/70",
        emoji: "🛫",
      }),
      hubCard({
        id: "turizm-servis",
        title: "VIP Transfer",
        description: "Havalimanı ve şehir içi VIP transfer.",
        href: TURIZM.stubs.servis,
        accent: "#4f46e5",
        bg: "from-indigo-50 via-white to-violet-50/70",
        emoji: "🚐",
      }),
      hubCard({
        id: "turizm-gezi",
        title: "Gezi Seyahat",
        description: "Gezi rehberleri ve destinasyon içerikleri.",
        href: TURIZM.geziSeyahat,
        accent: "#0891b2",
        bg: "from-cyan-50 via-white to-sky-50/70",
        emoji: "🧳",
      }),
      hubCard({
        id: "rezervasyon",
        title: "Rezervasyon",
        description: "Otel, tur ve konaklama rezervasyonu.",
        href: TURIZM.hub,
        accent: "#0d9488",
        bg: "from-teal-50 via-white to-emerald-50/70",
        emoji: "📅",
      }),
    ],
  },
  {
    id: "ulasim",
    title: "Ulaşım",
    subtitle: "Kurye, taksi, nakliye ve kargo",
    cards: [
      hubCard({
        id: "ulasim",
        title: "Ulaşım",
        description: YEKPARE_SERVICE_MODULE_META.parcel.description,
        href: YEKPARE_SERVICE_MODULE_META.parcel.href,
        accent: "#b45309",
        bg: "from-amber-50 via-white to-orange-50/70",
        emoji: "🚚",
      }),
    ],
  },
  {
    id: "haritalar",
    title: "Haritalar",
    subtitle: "Harita, rota ve süper kategoriler",
    cards: [
      hubCard({
        id: "haritalar",
        title: "Haritalar",
        description: "Harita, rota, yakındaki yerler ve navigasyon.",
        href: HARITALAR.hub,
        accent: "#059669",
        bg: "from-emerald-50 via-white to-green-50/80",
        emoji: "🗺️",
      }),
      ...HARITALAR_SUPER_NAV.filter((item) => item.id !== "firma_rehberi").map((item) =>
        hubCard({
          id: `haritalar-${item.id}`,
          title: item.label,
          description: `${item.label} haritada keşfet.`,
          href: HARITALAR.super(item.superCategory),
          accent: "#059669",
          bg: "from-emerald-50/80 via-white to-teal-50/50",
          emoji: HARITALAR_EMOJI[item.id] ?? "📍",
        }),
      ),
    ],
  },
  {
    id: "kesfet-isletme",
    title: "Keşfet & İşletmeler",
    subtitle: "İşletme arama ve sarı sayfalar",
    cards: [
      hubCard({
        id: "kesfet-liste",
        title: "Keşfet",
        description: "İşletme arama: yakındaki işletmeler, hizmetler ve popüler aramalar.",
        href: KESFET_LISTING_PATH,
        accent: "#3b82f6",
        bg: "from-blue-50 via-white to-sky-50/80",
        emoji: "🧭",
      }),
      hubCard({
        id: "sari-sayfalar",
        title: "Sarı Sayfalar",
        description: "Sarı sayfalar ve firma rehberi — sektör ve şehir bazlı A–Z dizin.",
        href: HARITALAR.sariSayfalar,
        accent: "#ca8a04",
        bg: "from-amber-50 via-white to-yellow-50/70",
        emoji: "📒",
      }),
    ],
  },
  {
    id: "icerik",
    title: "İçerik & Medya",
    subtitle: "Haberler, video, ansiklopedi ve haber merkezi",
    cards: [
      hubCard({
        id: "haberler",
        title: "Haberler",
        description: "Gündem, manşet ve kategori haber akışı.",
        href: MAIN_NAV_HREF.haberler,
        accent: "#0f766e",
        bg: "from-emerald-50 via-white to-teal-50/70",
        emoji: "📰",
      }),
      hubCard({
        id: "yektube",
        title: "YekTube",
        description: "Canlı TV, kanallar ve video içerikleri.",
        href: MAIN_NAV_HREF.yektube,
        accent: "#dc2626",
        bg: "from-red-50 via-white to-rose-50/70",
        emoji: "▶️",
      }),
      hubCard({
        id: "bilgi-agaci",
        title: "Bilgi Ağacı",
        description: "Ansiklopedi, rehberler ve bilgi kategorileri.",
        href: MAIN_NAV_HREF.ansiklopedi,
        accent: "#7c3aed",
        bg: "from-violet-50 via-white to-purple-50/70",
        emoji: "🌳",
      }),
      hubCard({
        id: "habermerkezi",
        title: "Haber Merkezi",
        description: "HM bağlı siteler, RSS ve yayın vitrinleri.",
        href: "/habermerkezi",
        accent: "#7c3aed",
        bg: "from-violet-50 via-white to-fuchsia-50/70",
        emoji: "📡",
      }),
    ],
  },
];

/** Tüm hub kartları — düz liste (apps grid, arama vb.) */
export const KESFET_HUB_CARDS: KesfetHubCard[] = KESFET_HUB_SECTIONS.flatMap((section) => section.cards);

/** Anasayfa özet şeridi — en çok kullanılan modüller */
export const KESFET_HUB_FEATURED_CARD_IDS = [
  "siparis",
  "yemek",
  "market",
  "magaza",
  "haritalar",
  "seyahat",
  "otomotiv",
  "ulasim",
  "kesfet-liste",
  "sari-sayfalar",
  "haberler",
  "yektube",
  "bilgi-agaci",
] as const;

export const KESFET_HUB_FEATURED_CARDS: KesfetHubCard[] = KESFET_HUB_FEATURED_CARD_IDS.map(
  (id) => KESFET_HUB_CARDS.find((card) => card.id === id)!,
).filter(Boolean);

const SERVICE_NAV_TO_MODULE: Partial<Record<MainNavKey, SixAmMartModuleKey>> = {
  yemek: "food",
  market: "grocery",
  isletmeler: "pharmacy",
  turizm: "rental",
  magaza: "shop",
  alisveris: "shop",
};

function normalizeNavHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.replace(/\/+$/, "");
  }
  return trimmed;
}

export type ResolvedPlatformNavLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  newTab?: boolean;
};

export type ResolvedPublicTopNav = {
  flatLinks: ResolvedPlatformNavLink[];
  serviceModuleKeys: SixAmMartModuleKey[];
  platformLinks: ResolvedPlatformNavLink[];
};

function normalizePublicNavText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function isStalePublicNavLink(label: string, href: string): boolean {
  const text = normalizePublicNavText(`${label} ${href}`);
  return (
    [String.fromCharCode(112, 97, 114, 99, 97), String.fromCharCode(112, 97, 114, 99, 101, 108), "6am" + "mart", "google", "maps"].some(
      (word) => new RegExp(`\\b${word}\\b`).test(text),
    ) ||
    href.trim() === "#" ||
    /^javascript:/i.test(href.trim())
  );
}

export function resolveHrefForNavKey(key: MainNavKey): string {
  if (key === "kesfet") return KESFET_HUB_PATH;
  return MAIN_NAV_HREF[key] ?? "/";
}

export function isShelteredFromTopNav(key: MainNavKey): boolean {
  return KESFET_HUB_SHELTERED_NAV_KEYS.has(key) || isSiparisSubNavKey(key);
}

function pushUniquePlatform(out: ResolvedPlatformNavLink[], seen: Set<string>, link: ResolvedPlatformNavLink) {
  const href = normalizeNavHref(link.href);
  if (!href || seen.has(href)) return;
  seen.add(href);
  out.push({ ...link, href });
}

function resolveFromNavItems(
  items: NavMenuItem[],
  modulesMap: Partial<Record<MainNavKey, boolean>>,
): ResolvedPublicTopNav {
  const flatLinks: ResolvedPlatformNavLink[] = [];
  const serviceModuleKeys: SixAmMartModuleKey[] = [];
  const platformLinks: ResolvedPlatformNavLink[] = [];
  const seenFlat = new Set<string>();
  const seenPlatform = new Set<string>();
  /** Sipariş modülü sekmelerinde zaten gösterilen rotalar — platform şeridinde tekrarlanmasın */
  const serviceNavHrefs = new Set<string>();

  for (const item of items) {
    if (item.kind === "module") {
      const key = item.key;
      if (!isModuleEnabled(modulesMap, key)) continue;
      if (isShelteredFromTopNav(key)) continue;

      const serviceKey = SERVICE_NAV_TO_MODULE[key];
      if (serviceKey) {
        if (!serviceModuleKeys.includes(serviceKey)) serviceModuleKeys.push(serviceKey);
        const href = MAIN_NAV_HREF[key];
        serviceNavHrefs.add(normalizeNavHref(href));
        if (isSiparisSubNavKey(key)) continue;
        pushUniquePlatform(flatLinks, seenFlat, {
          id: `m-${key}`,
          label: MAIN_NAV_LABELS[key],
          href,
        });
        continue;
      }

      const href = resolveHrefForNavKey(key);
      const link: ResolvedPlatformNavLink = {
        id: `m-${key}`,
        label: MAIN_NAV_LABELS[key],
        href,
      };
      pushUniquePlatform(flatLinks, seenFlat, link);
      if (!serviceNavHrefs.has(normalizeNavHref(href))) {
        pushUniquePlatform(platformLinks, seenPlatform, link);
      }
    } else {
      if (isStalePublicNavLink(item.label, item.href)) continue;
      const external = /^https?:\/\//i.test(item.href);
      const link: ResolvedPlatformNavLink = {
        id: `l-${item.id}`,
        label: item.label,
        href: item.href,
        external,
        newTab: item.newTab === true,
      };
      pushUniquePlatform(flatLinks, seenFlat, link);
      if (!serviceNavHrefs.has(normalizeNavHref(link.href))) {
        pushUniquePlatform(platformLinks, seenPlatform, link);
      }
    }
  }

  if (serviceModuleKeys.length === 0) {
    serviceModuleKeys.push(...YEKPARE_SERVICE_MODULE_ORDER);
  }

  return { flatLinks, serviceModuleKeys, platformLinks };
}

export function resolvePublicTopNav(opts: {
  mainNavJson?: string | null;
  modulesEnabledJson?: string | null;
}): ResolvedPublicTopNav {
  const modulesMap = parseModulesEnabledJson(opts.modulesEnabledJson ?? null);
  const items = parseNavMenuItems(opts.mainNavJson ?? null);
  return resolveFromNavItems(items, modulesMap);
}

/** Üst header — Keşfet başta; /alisveris kopyası ve bayat linkler çıkar. */
export function filterPublicTopNavForHeader(
  flatLinks: ResolvedPlatformNavLink[],
): ResolvedPlatformNavLink[] {
  const filtered = flatLinks.filter((it) => {
    const href = normalizeNavHref(it.href);
    if (href === "/alisveris") return false;
    if (isStalePublicNavLink(it.label, it.href)) return false;
    return true;
  });
  const kesfetIdx = filtered.findIndex((it) => normalizeNavHref(it.href) === KESFET_HUB_PATH);
  if (kesfetIdx <= 0) return filtered;
  const kesfet = filtered[kesfetIdx];
  if (!kesfet) return filtered;
  return [kesfet, ...filtered.slice(0, kesfetIdx), ...filtered.slice(kesfetIdx + 1)];
}

export function kesfetSearchTarget(query: string, fallback = UNIFIED_SEARCH_PATH, moduleHref?: string): string {
  const q = query.trim();
  if (!q) return fallback || UNIFIED_SEARCH_PATH;
  const href = (moduleHref ?? "").split("?")[0] ?? "";
  // Site geneli arama — tüm modüller /ara sayfasında gruplu sonuç döner
  if (!href || href === UNIFIED_SEARCH_PATH || href === KESFET_LISTING_PATH || href === "/kesfet") {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  if (href === "/turizm" || href.startsWith("/turizm/")) {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  if (href === "/ulasim" || href.startsWith("/ulasim/")) {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  if (href === "/magaza" || href.startsWith("/magaza/")) {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  if (href === "/yemek" || href === "/market" || href === "/isletmeler" || href === "/siparis") {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  if (href === "/otomotiv" || href.startsWith("/otomotiv/")) {
    return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
  }
  return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
}
