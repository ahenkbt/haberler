/** Haritalar / Keşfet harita — üst süper kategori alt menüsü */

export const HARITALAR = {
  /** Tam ekran harita — konum/işletme odaklı varsayılan giriş */
  hub: "/map",
  /** Masaüstü harita chrome (eski /haritalar rotası) */
  chrome: "/haritalar",
  kesfet: "/kesfet",
  sariSayfalar: "/kesfet/sarisayfalar",
  super: (value: string) => `/map?superCategory=${encodeURIComponent(value)}`,
} as const;

export const HARITALAR_SUPER_NAV = [
  { id: "mekan_dukkan", label: "Mekan & Dükkan", superCategory: "mekan_dukkan" },
  { id: "alisveris", label: "Alışveriş", superCategory: "alisveris" },
  { id: "hizmet", label: "Hizmet", superCategory: "hizmet" },
  { id: "turizm", label: "Turizm", superCategory: "turizm" },
  { id: "kamu", label: "Kamu", superCategory: "kamu" },
  { id: "firma_rehberi", label: "Sarı Sayfalar", superCategory: "firma_rehberi" },
] as const;

export type HaritalarSuperNavId = (typeof HARITALAR_SUPER_NAV)[number]["id"];

const MEKAN_LISTE_PATH = "/kesfet/liste";

function isHaritalarMapPath(path: string): boolean {
  return path === HARITALAR.hub || path === "/map";
}

/** Üst kategori şeridi — yalnızca Haritalar pill /haritalar kullanır. */
export function haritalarSuperNavHref(item: (typeof HARITALAR_SUPER_NAV)[number]): string {
  switch (item.id) {
    case "mekan_dukkan":
      return MEKAN_LISTE_PATH;
    case "kamu":
      return HARITALAR.super(item.superCategory);
    case "alisveris":
      return "/magaza";
    case "hizmet":
      return "/servisler";
    case "turizm":
      return "/turizm";
    case "firma_rehberi":
      return HARITALAR.sariSayfalar;
  }
}

/** Wouter `useLocation` pathname + `useSearch` query — superCategory eşleşmesi için. */
export function haritalarLocationWithSearch(pathname: string, search = ""): string {
  const path = pathname.split("?")[0] ?? pathname;
  const q = search.replace(/^\?/, "").trim();
  return q ? `${path}?${q}` : path;
}

export function parseHaritalarSuperCategory(loc: string): string | null {
  const q = loc.includes("?") ? loc.split("?")[1] ?? "" : "";
  if (!q) return null;
  const params = new URLSearchParams(q);
  return params.get("superCategory") || params.get("super") || null;
}

export function isHaritalarSubNavItemActive(loc: string, href: string, id?: string): boolean {
  const path = loc.split("?")[0] ?? "";
  if (id === "hub" || href === HARITALAR.hub) {
    return isHaritalarMapPath(path) && !parseHaritalarSuperCategory(loc);
  }
  if (id === "mekan_dukkan" || href === MEKAN_LISTE_PATH) {
    return path === MEKAN_LISTE_PATH || path.startsWith(`${MEKAN_LISTE_PATH}/`);
  }
  if (id === "kesfet") {
    if (path === HARITALAR.kesfet) return true;
    if (!path.startsWith("/kesfet/")) return false;
    if (path.startsWith(MEKAN_LISTE_PATH)) return false;
    if (path === HARITALAR.sariSayfalar || path.startsWith(`${HARITALAR.sariSayfalar}/`)) {
      return false;
    }
    return true;
  }
  if (id === "alisveris" || href === "/magaza" || href === "/alisveris") {
    return (
      path === "/magaza" ||
      path.startsWith("/magaza/") ||
      path === "/alisveris" ||
      path.startsWith("/alisveris/")
    );
  }
  if (id === "hizmet" || href === "/servisler") {
    return path === "/servisler" || path.startsWith("/servisler/");
  }
  if (id === "turizm" || href === "/turizm") {
    return path === "/turizm" || path.startsWith("/turizm/");
  }
  if (id === "firma_rehberi" || href === HARITALAR.sariSayfalar) {
    return (
      path === HARITALAR.sariSayfalar ||
      path.startsWith(`${HARITALAR.sariSayfalar}/`) ||
      path === "/firma-rehberi" ||
      path.startsWith("/firma-rehberi/")
    );
  }
  if (href.startsWith("/haritalar?") || href.startsWith("/map?")) {
    const superCat = parseHaritalarSuperCategory(href);
    if (!superCat) return false;
    return isHaritalarMapPath(path) && parseHaritalarSuperCategory(loc) === superCat;
  }
  return path === href || path.startsWith(`${href}/`);
}
