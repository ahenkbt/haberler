/** Yekpare Otomotiv — modül rotaları ve nav yardımcıları */

export const OTOMOTIV = {
  hub: "/otomotiv",
  galeri: {
    home: "/otomotiv/galeri",
    detay: (slug: string) => `/otomotiv/galeri/${encodeURIComponent(slug)}`,
  },
  sifir: {
    home: "/otomotiv/sifir",
    detay: (slug: string) => `/otomotiv/sifir/${encodeURIComponent(slug)}`,
  },
  ikinciEl: {
    home: "/otomotiv/ikinci-el",
    detay: (slug: string) => `/otomotiv/ikinci-el/${encodeURIComponent(slug)}`,
  },
  yedekParca: {
    home: "/otomotiv/yedek-parca",
    detay: (slug: string) => `/otomotiv/yedek-parca/${encodeURIComponent(slug)}`,
  },
  cikma: {
    home: "/otomotiv/cikma",
    detay: (slug: string) => `/otomotiv/cikma/${encodeURIComponent(slug)}`,
  },
  servis: {
    home: "/otomotiv/servis",
    detay: (slug: string) => `/otomotiv/servis/${encodeURIComponent(slug)}`,
  },
  yikama: {
    home: "/otomotiv/yikama",
    detay: (slug: string) => `/otomotiv/yikama/${encodeURIComponent(slug)}`,
  },
  lastik: {
    home: "/otomotiv/lastik",
    detay: (slug: string) => `/otomotiv/lastik/${encodeURIComponent(slug)}`,
  },
  sigorta: {
    home: "/otomotiv/sigorta",
  },
  admin: "/admin/otomotiv",
  sigortaAdmin: "/admin/sigorta",
} as const;

export type OtomotivModuleKey =
  | "galeri"
  | "sifir"
  | "ikinciEl"
  | "yedekParca"
  | "cikma"
  | "servis"
  | "yikama"
  | "lastik"
  | "sigorta";

export const OTOMOTIV_MODULES: {
  key: OtomotivModuleKey;
  label: string;
  href: string;
  description: string;
}[] = [
  { key: "galeri", label: "Galeri", href: OTOMOTIV.galeri.home, description: "Sıfır ve 2. el araç vitrinleri" },
  { key: "sifir", label: "Sıfır", href: OTOMOTIV.sifir.home, description: "Sıfır km araç ilanları" },
  { key: "ikinciEl", label: "2. El", href: OTOMOTIV.ikinciEl.home, description: "İkinci el araç arama ve filtre" },
  { key: "yedekParca", label: "Yedek Parça", href: OTOMOTIV.yedekParca.home, description: "Orijinal ve yan sanayi parça kataloğu" },
  { key: "cikma", label: "Çıkma", href: OTOMOTIV.cikma.home, description: "Çıkma ve söküm parça ilanları" },
  { key: "servis", label: "Servis", href: OTOMOTIV.servis.home, description: "Oto tamir ve bakım randevusu" },
  { key: "yikama", label: "Yıkama", href: OTOMOTIV.yikama.home, description: "Oto yıkama paketleri ve randevu" },
  { key: "lastik", label: "Lastik", href: OTOMOTIV.lastik.home, description: "Lastik ürünleri ve montaj" },
  { key: "sigorta", label: "Sigorta", href: OTOMOTIV.sigorta.home, description: "Trafik ve kasko teklif yönlendirme" },
];

export const OTOMOTIV_FOOTER_MODULES: { label: string; href: string }[] = [
  { label: "Otomotiv Ana Sayfa", href: OTOMOTIV.hub },
  ...OTOMOTIV_MODULES.map((m) => ({ label: m.label, href: m.href })),
];

export const OTOMOTIV_NAV_SUBMENU: { label: string; href: string; exact?: boolean }[] = [
  { label: "Otomotiv", href: OTOMOTIV.hub, exact: true },
  ...OTOMOTIV_MODULES.map((m) => ({ label: m.label, href: m.href })),
];

export function isOtomotivNavActive(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  return p === "/otomotiv" || p.startsWith("/otomotiv/");
}

/** Alt sayfa kendi OtomotivSubNavBar'ını render eder — App.tsx OtomotivRoute çift şerit göstermesin */
export function pageOwnsOtomotivSubNav(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  if (p === OTOMOTIV.hub) return true;
  if (p === OTOMOTIV.sigorta.home) return true;
  if (p === OTOMOTIV.servis.home || p.startsWith(`${OTOMOTIV.servis.home}/`)) return true;
  return false;
}

export function isOtomotivSubmenuItemActive(path: string, item: { href: string; exact?: boolean }): boolean {
  const p = path.split("?")[0] ?? "";
  if (item.exact) return p === item.href;
  if (item.href === OTOMOTIV.hub) return p === "/otomotiv";
  return p === item.href || p.startsWith(`${item.href}/`);
}

export function isOtomotivSubNavItemActive(path: string, href: string, id?: string): boolean {
  const p = path.split("?")[0] ?? "";
  if (id === "hub" || href === OTOMOTIV.hub) return p === "/otomotiv";
  return isOtomotivSubmenuItemActive(p, { href });
}

export function otomotivModuleFromPath(path: string): OtomotivModuleKey | null {
  const p = path.split("?")[0] ?? "";
  if (p.startsWith("/otomotiv/galeri")) return "galeri";
  if (p.startsWith("/otomotiv/sifir")) return "sifir";
  if (p.startsWith("/otomotiv/ikinci-el")) return "ikinciEl";
  if (p.startsWith("/otomotiv/yedek-parca")) return "yedekParca";
  if (p.startsWith("/otomotiv/cikma")) return "cikma";
  if (p.startsWith("/otomotiv/servis")) return "servis";
  if (p.startsWith("/otomotiv/yikama")) return "yikama";
  if (p.startsWith("/otomotiv/lastik")) return "lastik";
  if (p.startsWith("/otomotiv/sigorta")) return "sigorta";
  return null;
}
