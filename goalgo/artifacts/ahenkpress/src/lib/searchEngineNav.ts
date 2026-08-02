import { KESFET_HUB_CARDS, KESFET_HUB_PATH } from "@/lib/kesfetDiscoverHub";
import { HARITALAR, isHaritalarSubNavItemActive } from "@/lib/haritalarRoutes";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { isPortalNewsPlatformHost } from "@/lib/portalPlatformPolicy";

export type SearchEngineModuleTile = {
  id: string;
  label: string;
  href: string;
  emoji: string;
};

export type SearchEngineCategoryPill = {
  id: string;
  label: string;
  href: string;
  emoji: string;
};

/** ?st kategori ?eridi ? tek kelime etiketler (/kesfet hub; Hizmetler yok). */
export const SEARCH_ENGINE_CATEGORY_PILLS: SearchEngineCategoryPill[] = [
  {
    id: "alisveris",
    label: "Al\u0131\u015Fveri\u015F",
    href: HARITALAR.super("alisveris"),
    emoji: "\uD83D\uDECD\uFE0F",
  },
  {
    id: "seyahat",
    label: "Seyahat",
    href: TURIZM.hub,
    emoji: "\u2708\uFE0F",
  },
  {
    id: "icerik",
    label: "\u0130\u00E7erik",
    href: "/haberler",
    emoji: "\uD83D\uDCF0",
  },
  {
    id: "sarisayfalar",
    label: "Sar\u0131 Sayfalar",
    href: HARITALAR.sariSayfalar,
    emoji: "\uD83D\uDCD2",
  },
  {
    id: "kesfet",
    label: "Ke\u015Ffet",
    href: KESFET_HUB_PATH,
    emoji: "\uD83E\uDDED",
  },
  {
    id: "haritalar",
    label: "Haritalar",
    href: HARITALAR.hub,
    emoji: "\uD83D\uDDFA\uFE0F",
  },
];

export function isSearchEngineCategoryPillActive(loc: string, pill: SearchEngineCategoryPill): boolean {
  const path = loc.split("?")[0] ?? "";

  switch (pill.id) {
    case "alisveris":
      return isHaritalarSubNavItemActive(loc, pill.href, "alisveris");
    case "seyahat":
      return isHaritalarSubNavItemActive(loc, pill.href, "turizm");
    case "icerik":
      return (
        path === "/haberler" ||
        path.startsWith("/haberler/") ||
        path === "/tum-haberler" ||
        path.startsWith("/tum-haberler/") ||
        path === "/yektube" ||
        path.startsWith("/yektube/") ||
        path === "/bilgiagaci" ||
        path.startsWith("/bilgiagaci/") ||
        path === "/habermerkezi" ||
        path.startsWith("/habermerkezi/")
      );
    case "haritalar":
      return isHaritalarSubNavItemActive(loc, pill.href, "hub");
    case "sarisayfalar":
      return isHaritalarSubNavItemActive(loc, pill.href, "firma_rehberi");
    case "kesfet":
      return isHaritalarSubNavItemActive(loc, pill.href, "kesfet");
    case "haberler":
      return (
        path === "/haberler" ||
        path.startsWith("/haberler/") ||
        path === "/tum-haberler" ||
        path.startsWith("/tum-haberler/")
      );
    case "videolar":
      return path === "/yektube" || path.startsWith("/yektube/") || path === "/canlitv" || path.startsWith("/canlitv/");
    case "newsmap":
      return path === "/newsmap" || path.startsWith("/newsmap/");
    case "habermerkezi":
      return path === "/habermerkezi" || path.startsWith("/habermerkezi/");
    default:
      return path === pill.href || path.startsWith(`${pill.href}/`);
  }
}

/** Full apps grid — tüm Keşfet hub kartları (AppsGridMenu kaynağı) */
export const SEARCH_ENGINE_ALL_MODULES: SearchEngineModuleTile[] = KESFET_HUB_CARDS.map((card) => ({
  id: card.id,
  label: card.title,
  href: card.href,
  emoji: card.emoji,
}));

export function isSearchEngineModuleTileActive(
  loc: string,
  mod: SearchEngineModuleTile,
): boolean {
  const path = loc.split("?")[0] ?? "";
  if (path === mod.href) return true;
  if (mod.href !== "/" && path.startsWith(`${mod.href}/`)) return true;
  return false;
}

/** Sayfa kendi tam ekran SearchEngineHeader'?n? render eder ? d?? chrome ekleme. */
export function isSelfContainedSearchEnginePage(path: string): boolean {
  const p = (path.split("?")[0] ?? "").trim();
  return p === "/" || p === "/demo" || p === "/ara";
}

const GLOBAL_CATEGORY_PILL_PREFIXES = [
  HARITALAR.hub,
  "/map",
  HARITALAR.chrome,
  HARITALAR.sariSayfalar,
  "/kesfet",
  "/servisler",
  "/turizm",
  "/firma-rehberi",
  "/haberler",
  "/tum-haberler",
  "/yektube",
  "/bilgiagaci",
  "/habermerkezi",
] as const;

/** Global kategori pill seridi ? mod?l chrome sayfalar?nda arama alt?nda. */
export function shouldShowGlobalCategoryPills(path: string): boolean {
  const p = (path.split("?")[0] ?? "").trim();
  if (isSelfContainedSearchEnginePage(p)) return false;
  if (shouldSkipSearchEnginePublicChrome(p)) return false;
  return GLOBAL_CATEGORY_PILL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** @deprecated Use isSelfContainedSearchEnginePage */
export function isSearchEngineChromePath(path: string): boolean {
  return isSelfContainedSearchEnginePage(path);
}

const SEARCH_ENGINE_CHROME_EXCLUDED_PREFIXES = [
  "/admin",
  "/editor",
  "/embed",
  "/pbx",
  "/tr/",
  "/surucu-paneli",
  "/kurye-paneli",
  "/usta-paneli",
  "/servis-paneli",
  "/kasiyer",
  "/servis-saglayici-paneli",
  "/turizm-paneli",
  "/ulasim-paneli",
  "/yektube",
  "/canlitv",
] as const;

/** Yektube bağımsız platform — Yekpare header/footer yok. */
export function isYektubeStandalonePath(path: string): boolean {
  const p = (path.split("?")[0] ?? "").trim().toLowerCase();
  return p === "/yektube" || p.startsWith("/yektube/") || p === "/canlitv" || p.startsWith("/canlitv/");
}

/** Y?netim / panel / white-label rotalar?nda arama header'? kullan?lmaz. */
export function shouldSkipSearchEnginePublicChrome(path: string): boolean {
  const p = (path.split("?")[0] ?? "").trim().toLowerCase();
  if (!p) return false;
  return SEARCH_ENGINE_CHROME_EXCLUDED_PREFIXES.some(
    (prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix),
  );
}

/** turk.eco üst menü — yalnızca haber, video, Newsmap, Haber Merkezi. */
export const PORTAL_NEWS_PLATFORM_PILLS: SearchEngineCategoryPill[] = [
  { id: "haberler", label: "Haberler", href: "/haberler", emoji: "📰" },
  { id: "videolar", label: "Videolar", href: "/yektube", emoji: "▶️" },
  { id: "newsmap", label: "Newsmap", href: "/newsmap", emoji: "🗺️" },
  { id: "habermerkezi", label: "Haber Merkezi", href: "/habermerkezi", emoji: "📡" },
];

export function resolveSearchEngineCategoryPills(): SearchEngineCategoryPill[] {
  if (typeof window !== "undefined" && isPortalNewsPlatformHost()) {
    return PORTAL_NEWS_PLATFORM_PILLS;
  }
  return SEARCH_ENGINE_CATEGORY_PILLS;
}
