/** Yekpare Mağaza — pazaryeri alt navigasyon rotaları (e-ticaret üst kategorileri) */

export const MAGAZA = {
  hub: "/magaza",
  kategoriler: "/magaza/kategoriler",
  urunler: "/magaza/urunler",
  magazalar: "/magaza/magazalar",
  kampanyalar: "/magaza/kampanyalar",
  kategori: (slug: string) => `/magaza/kategori/${encodeURIComponent(slug)}`,
} as const;

export type MagazaCategoryKey =
  | "elektronik"
  | "moda"
  | "evYasam"
  | "cocuk"
  | "kozmetik"
  | "spor"
  | "market";

/** ecommerce-product-categories TOP_ORDER ile uyumlu üst kategori slug'ları */
export const MAGAZA_TOP_CATEGORIES: {
  key: MagazaCategoryKey;
  label: string;
  slug: string;
}[] = [
  { key: "elektronik", label: "Elektronik", slug: "elektronik-ve-teknoloji" },
  { key: "moda", label: "Moda", slug: "giyim-moda-ve-aksesuar" },
  { key: "evYasam", label: "Ev & Yaşam", slug: "ev-yasam-kirtasiye-ve-ofis" },
  { key: "cocuk", label: "Çocuk", slug: "anne-bebek-ve-oyuncak" },
  { key: "kozmetik", label: "Kozmetik", slug: "kozmetik-ve-kisisel-bakim" },
  { key: "spor", label: "Spor", slug: "spor-ve-outdoor" },
  { key: "market", label: "Market", slug: "supermarket-ve-gida" },
];

export const MAGAZA_FOOTER_CATEGORIES = MAGAZA_TOP_CATEGORIES.map((c) => ({
  label: c.label,
  href: MAGAZA.kategori(c.slug),
}));

/** Alt sayfa kendi MagazaSubNavBar'ını render eder — MagazaRoute çift şerit göstermesin */
export function pageOwnsMagazaSubNav(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  return p === MAGAZA.hub;
}

export function isMagazaSubNavItemActive(path: string, href: string, id?: string): boolean {
  const p = path.split("?")[0] ?? "";
  if (id === "hub" || href === MAGAZA.hub) return p === MAGAZA.hub;
  if (id === "kategoriler" || href === MAGAZA.kategoriler) {
    return p === MAGAZA.kategoriler;
  }
  if (id === "urunler" || href === MAGAZA.urunler) {
    return p === MAGAZA.urunler || p.startsWith("/magaza/urun/");
  }
  if (id === "magazalar" || href === MAGAZA.magazalar) {
    return (
      p === MAGAZA.magazalar
      || p === "/magaza/saticilar"
      || p.startsWith("/magaza/magaza/")
    );
  }
  if (href.startsWith("/magaza/kategori/")) {
    return p === href || p.startsWith(`${href}/`);
  }
  return p === href || p.startsWith(`${href}/`);
}

export function isMagazaNavActive(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  return p === MAGAZA.hub || p.startsWith("/magaza/");
}
