/** turk.eco portal — haber merkezi + video + arama; süper app modül anahtarları kapalı. */

export const PORTAL_RETIRED_MODULE_KEYS = [
  "turizm",
  "firmaRehberi",
  "kesfet",
] as const;

export const PORTAL_DEFAULT_MODULES_JSON = JSON.stringify({
  haberler: true,
  yektube: true,
  haritalar: true,
  ansiklopedi: true,
  iletisim: true,
  turizm: false,
  firmaRehberi: false,
  kesfet: false,
});

export const PORTAL_DEFAULT_MAIN_NAV_JSON = JSON.stringify({
  v: 1,
  items: [
    { type: "module", key: "haberler" },
    { type: "module", key: "yektube" },
    { type: "link", id: "newsmap", label: "Newsmap", href: "/newsmap" },
    { type: "link", id: "habermerkezi", label: "Haber Merkezi", href: "/habermerkezi" },
  ],
});

export const PORTAL_DEFAULT_FOOTER_NAV_JSON = JSON.stringify([
  "haberler",
  "yektube",
  "haritalar",
  "iletisim",
]);

/** Anasayfa: yalnızca arama + haber vitrinleri. */
export const PORTAL_DEFAULT_HOME_SECTIONS_JSON = JSON.stringify([
  { id: "hero_search", enabled: true },
  { id: "featured_news", enabled: true },
  { id: "popular_cities", enabled: false },
  { id: "featured_businesses", enabled: false },
  { id: "recent_businesses", enabled: false },
  { id: "services_grid", enabled: false },
  { id: "quick_links", enabled: false },
]);

export const PORTAL_DEFAULT_FOOTER_TEXT =
  "Türk Ekosistemi; haber, video, Newsmap ve Haber Merkezi ile Türkiye'nin dijital haber vitrinidir.";
