import { KESFET_HUB_CARDS, KESFET_HUB_PATH } from "@/lib/kesfetDiscoverHub";
import { HARITALAR, isHaritalarSubNavItemActive } from "@/lib/haritalarRoutes";
import { MAIN_NAV_HREF } from "@workspace/site-nav";
import { OTOMOTIV } from "@/themes/otomotiv/otomotivRoutes";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

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
    id: "siparis",
    label: "Sipari\u015F",
    href: MAIN_NAV_HREF.siparis,
    emoji: "\uD83C\uDF7D\uFE0F",
  },
  {
    id: "alisveris",
    label: "Al\u0131\u015Fveri\u015F",
    href: MAIN_NAV_HREF.magaza,
    emoji: "\uD83D\uDECD\uFE0F",
  },
  {
    id: "otomotiv",
    label: "Otomotiv",
    href: OTOMOTIV.hub,
    emoji: "\uD83D\uDE97",
  },
  {
    id: "seyahat",
    label: "Seyahat",
    href: TURIZM.hub,
    emoji: "\u2708\uFE0F",
  },
  {
    id: "ulasim",
    label: "Ula\u015F\u0131m",
    href: MAIN_NAV_HREF.ulasim,
    emoji: "\uD83D\uDE9A",
  },
  {
    id: "icerik",
    label: "\u0130\u00E7erik",
    href: MAIN_NAV_HREF.haberler,
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
    case "siparis":
      return (
        path === "/siparis" ||
        path.startsWith("/siparis/") ||
        path === "/yemek" ||
        path.startsWith("/yemek/") ||
        path === "/market" ||
        path.startsWith("/market/") ||
        path === "/isletmeler" ||
        path.startsWith("/isletmeler/")
      );
    case "alisveris":
      return isHaritalarSubNavItemActive(loc, pill.href, "alisveris");
    case "otomotiv":
      return path === "/otomotiv" || path.startsWith("/otomotiv/");
    case "seyahat":
      return isHaritalarSubNavItemActive(loc, pill.href, "turizm");
    case "ulasim":
      return path === "/ulasim" || path.startsWith("/ulasim/");
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
  "/magaza",
  "/market",
  "/yemek",
  "/siparis",
  "/turizm",
  "/alisveris",
  "/isletmeler",
  "/ulasim",
  "/otomotiv",
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
