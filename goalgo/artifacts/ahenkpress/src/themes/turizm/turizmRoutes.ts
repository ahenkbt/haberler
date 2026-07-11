/** Yekpare turizm — modül rotaları */
export const TURIZM = {
  hub: "/turizm",
  geziSeyahat: "/bilgiagaci/kategori/gezi-seyahat",
  turlar: {
    home: "/turizm/turlar",
    liste: "/turizm/turlar/liste",
    tur: (slug: string) => `/turizm/tur/${encodeURIComponent(slug)}`,
    destinasyonlar: "/turizm/destinasyonlar",
    destinasyon: (slug: string) => `/turizm/destinasyon/${encodeURIComponent(slug)}`,
    rezervasyon: (ref: string) => `/turizm/rezervasyon/${encodeURIComponent(ref)}`,
    blog: "/turizm/turlar/blog",
    galeri: "/turizm/turlar/galeri",
    sss: "/turizm/turlar/sss",
    fiyat: "/turizm/turlar/fiyatlandirma",
    karsilastirma: "/turizm/turlar/karsilastirma",
    ekip: "/turizm/turlar/ekip",
  },
  konaklama: {
    home: "/turizm/konaklama",
    detay: (slug: string) => `/turizm/konaklama/${encodeURIComponent(slug)}`,
  },
  arac: {
    home: "/turizm/arac-kiralama",
    detay: (slug: string) => `/turizm/arac-kiralama/${encodeURIComponent(slug)}`,
  },
  yat: {
    home: "/turizm/yat-turlari",
    detay: (slug: string) => `/turizm/yat-turlari/${encodeURIComponent(slug)}`,
  },
  /** Booking Core Space → Yekpare Villa & Ev kiralama */
  villaEv: {
    home: "/turizm/villa-ev",
    detay: (slug: string) => `/turizm/villa-ev/${encodeURIComponent(slug)}`,
  },
  stubs: {
    etkinlik: "/turizm/etkinlik",
    etkinlikDetay: (slugOrId: string) => `/turizm/etkinlik/${encodeURIComponent(slugOrId)}`,
    ucus: "/turizm/ucus",
    servis: "/turizm/servis",
    /** @deprecated otobüs bileti → VIP servis; yönlendirme için tutulur */
    otobus: "/turizm/otobus",
  },
  blog: "/turizm/blog",
  blogPost: (slug: string) => `/turizm/blog/${encodeURIComponent(slug)}`,
} as const;

export type TurizmModuleKey = "turlar" | "konaklama" | "villaEv" | "arac" | "yat";

export const TURIZM_MODULES: {
  key: TurizmModuleKey;
  label: string;
  href: string;
  description: string;
}[] = [
  {
    key: "turlar",
    label: "Turlar",
    href: TURIZM.turlar.home,
    description: "Tur paketleri, destinasyonlar ve rezervasyon",
  },
  {
    key: "konaklama",
    label: "Otel",
    href: TURIZM.konaklama.home,
    description: "Otel, butik otel ve konaklama seçenekleri",
  },
  {
    key: "villaEv",
    label: "Villa / Ev",
    href: TURIZM.villaEv.home,
    description: "Tatil villası, apart ve ev kiralama",
  },
  {
    key: "arac",
    label: "Araç Kiralama",
    href: TURIZM.arac.home,
    description: "Günlük ve haftalık araç kiralama",
  },
  {
    key: "yat",
    label: "Yat Tekne Kiralama",
    href: TURIZM.yat.home,
    description: "Yat ve tekne kiralama",
  },
];

/** Yekpare footer MODÜLLER sütunu (Sade tema) — TurizmSubNavBar ile aynı sıra ve etiketler */
export const TURIZM_FOOTER_MODULES: { label: string; href: string }[] = [
  { label: "VIP Transfer", href: TURIZM.stubs.servis },
  { label: "Turlar", href: TURIZM.turlar.home },
  { label: "Otel", href: TURIZM.konaklama.home },
  { label: "Villa / Ev", href: TURIZM.villaEv.home },
  { label: "Araç Kiralama", href: TURIZM.arac.home },
  { label: "Yat Tekne Kiralama", href: TURIZM.yat.home },
  { label: "Gezi Seyahat", href: TURIZM.geziSeyahat },
];

/** TurizmSubNavBar pill şeridi + eski tema AppNav geriye dönük alt menü */
export const TURIZM_NAV_SUBMENU: { label: string; href: string; exact?: boolean }[] = [
  { label: "Seyahat Ana Sayfa", href: TURIZM.hub, exact: true },
  { label: "VIP Transfer", href: TURIZM.stubs.servis },
  { label: "Turlar", href: TURIZM.turlar.home },
  { label: "Otel", href: TURIZM.konaklama.home },
  { label: "Villa / Ev", href: TURIZM.villaEv.home },
  { label: "Araç Kiralama", href: TURIZM.arac.home },
  { label: "Yat Tekne Kiralama", href: TURIZM.yat.home },
  { label: "Uçak Bileti", href: TURIZM.stubs.ucus },
  { label: "Etkinlik", href: TURIZM.stubs.etkinlik },
  { label: "Gezi Seyahat", href: TURIZM.geziSeyahat, exact: true },
];

export function isTurizmNavActive(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  return p === "/turizm" || p.startsWith("/turizm/");
}

export function isTurizmSubmenuItemActive(path: string, item: { href: string; exact?: boolean }): boolean {
  const p = path.split("?")[0] ?? "";
  if (item.exact) return p === item.href;
  if (item.href === TURIZM.turlar.home) {
    return (
      p.startsWith("/turizm/turlar") ||
      p.startsWith("/turizm/tur/") ||
      p.startsWith("/turizm/destinasyon") ||
      p.startsWith("/turizm/rezervasyon")
    );
  }
  if (item.href === TURIZM.geziSeyahat) {
    return p === TURIZM.geziSeyahat || p.startsWith("/gezi-seyahat");
  }
  if (item.href === TURIZM.hub) {
    return p === "/turizm";
  }
  return p === item.href || p.startsWith(`${item.href}/`);
}

/** TurizmSubNavBar — tüm modül + uçuş/otobüs/etkinlik rotaları için aktif durum */
export function isTurizmSubNavItemActive(path: string, href: string, id?: string): boolean {
  const p = path.split("?")[0] ?? "";
  if (id === "hub" || href === TURIZM.hub) return p === "/turizm";
  if (id === "gezi" || href === TURIZM.geziSeyahat) {
    return p === TURIZM.geziSeyahat || p.startsWith("/gezi-seyahat");
  }
  if (id === "servis" || href === TURIZM.stubs.servis) {
    return p === TURIZM.stubs.servis || p.startsWith("/turizm/servis/");
  }
  if (id === "etkinlik" || href === TURIZM.stubs.etkinlik) {
    return p === TURIZM.stubs.etkinlik || p.startsWith("/turizm/etkinlik/");
  }
  return isTurizmSubmenuItemActive(p, { href });
}

/** Alt sayfa kendi TurizmSubNavBar'ını render eder — App.tsx TurizmRoute çift şerit göstermesin */
export function pageOwnsTurizmSubNav(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  if (p === TURIZM.hub) return true;
  if (p === TURIZM.stubs.ucus) return true;
  if (p === TURIZM.stubs.servis || p.startsWith("/turizm/servis/")) return true;
  if (p === TURIZM.stubs.otobus) return true;
  if (p === TURIZM.stubs.etkinlik) return true;
  return false;
}

export function turizmModuleFromPath(path: string): TurizmModuleKey | null {
  const p = path.split("?")[0] ?? "";
  if (
    p.startsWith("/turizm/turlar") ||
    p.startsWith("/turizm/tur/") ||
    p.startsWith("/turizm/destinasyon") ||
    p.startsWith("/turizm/rezervasyon")
  )
    return "turlar";
  if (p.startsWith("/turizm/konaklama") || p === "/turizm/hotel") return "konaklama";
  if (p.startsWith("/turizm/villa-ev") || p === "/turizm/villa" || p === "/turizm/space" || p === "/turizm/uzay")
    return "villaEv";
  if (p.startsWith("/turizm/arac-kiralama") || p === "/turizm/car") return "arac";
  if (p.startsWith("/turizm/yat-turlari") || p === "/turizm/boat") return "yat";
  return null;
}
