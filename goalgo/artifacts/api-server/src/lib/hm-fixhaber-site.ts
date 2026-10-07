/**
 * Fix Haber (fix.tc) — teknoloji & bilim HM katalogu (Yenişafak PHP tema).
 * Seed / wrangler / Hostinger ops bu dosyayı paylaşır.
 */

export const FIXHABER_SLUG = "fixhaber";
export const FIXHABER_DOMAIN = "fix.tc";
export const FIXHABER_ZONE = "fix.tc";
export const FIXHABER_PHP_ORIGIN_IP = "187.77.84.201";
export const FIXHABER_CAMPAIGN_TAG = "fixhaber";

/** Statik logo (SPA assets + Hostinger pack). */
export const FIXHABER_LOGO_PATH = "/fix/fix-haber-logo.png";
/** Globe crop — favicon / app icon. */
export const FIXHABER_FAVICON_PATH = "/fix/fix-haber-favicon.png";

export type FixHaberCategoryDef = { slug: string; name: string; color: string };

export type FixHaberSiteDef = {
  slug: typeof FIXHABER_SLUG;
  domain: typeof FIXHABER_DOMAIN;
  displayName: string;
  description: string;
  hmYsMansetPreset: "odatv" | "sabah" | "takvim" | "mynet" | "nefes";
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmYsSlogan: string;
  logoPath: string;
  faviconPath: string;
  categories: FixHaberCategoryDef[];
  sampleHeadlines: Array<{ title: string; spot: string; categorySlug: string; featured?: boolean }>;
  rssFeeds: string[];
};

/** Üst menü: HABERLER, MOBİL, DONANIM, İNCELEMELER, YAZILIM, OYUN (+ tema «Daha Fazla»). */
export const FIXHABER_NAV_ONLY_CATEGORY_SLUGS = [
  "fixhaber-haberler",
  "fixhaber-mobil",
  "fixhaber-donanim",
  "fixhaber-incelemeler",
  "fixhaber-yazilim",
  "fixhaber-oyun",
] as const;

/** Alt kategoriler, niş ve içerik tipleri — vitrin menüsünde «Daha Fazla» altında. */
export const FIXHABER_NAV_HIDDEN_CATEGORY_SLUGS = [
  "fixhaber-mobil-telefonlar",
  "fixhaber-mobil-akilli-saatler",
  "fixhaber-donanim-pc-laptop",
  "fixhaber-donanim-bilesenler",
  "fixhaber-yapay-zeka",
  "fixhaber-otomobil-mobilite",
  "fixhaber-akilli-ev-iot",
  "fixhaber-siber-guvenlik",
  "fixhaber-uzay-bilim",
  "fixhaber-kripto-blockchain",
  "fixhaber-rehberler",
  "fixhaber-listeler",
  "fixhaber-videolar",
  "fixhaber-teknoloji",
] as const;

/**
 * Teknoloji / bilim RSS beslemeleri (kampanya `feeds`).
 * TR: NTV, Diriliş, Birgün, TRT Haber · Global: Ars, The Verge, TechCrunch.
 */
export const FIXHABER_RSS_FEEDS = [
  "https://www.ntv.com.tr/teknoloji.rss",
  "https://www.ntv.com.tr/otomobil.rss",
  "https://www.dirilispostasi.com/rss/teknoloji",
  "https://www.dirilispostasi.com/rss/teknoloji-ve-bilim",
  "https://www.birgun.net/rss/kategori/teknoloji-28",
  "https://www.birgun.net/rss/kategori/bilim-40",
  "https://www.birgun.net/rss/kategori/bilisim-25",
  "https://www.trthaber.com/teknoloji_articles.rss",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://www.theverge.com/rss/index.xml",
  "https://techcrunch.com/feed/",
] as const;

export const FIXHABER_CATEGORIES: FixHaberCategoryDef[] = [
  { slug: "fixhaber-haberler", name: "Haberler", color: "#002B5C" },
  { slug: "fixhaber-mobil", name: "Mobil", color: "#0a5a6e" },
  { slug: "fixhaber-mobil-telefonlar", name: "Telefonlar", color: "#0c6b82" },
  { slug: "fixhaber-mobil-akilli-saatler", name: "Akıllı Saatler", color: "#0e7c96" },
  { slug: "fixhaber-donanim", name: "Donanım", color: "#1a4a7a" },
  { slug: "fixhaber-donanim-pc-laptop", name: "PC / Laptop", color: "#245a8a" },
  { slug: "fixhaber-donanim-bilesenler", name: "Bileşenler", color: "#2e6a9a" },
  { slug: "fixhaber-yazilim", name: "Yazılım & Uygulamalar", color: "#1a5a3a" },
  { slug: "fixhaber-oyun", name: "Oyun", color: "#D20000" },
  { slug: "fixhaber-incelemeler", name: "İncelemeler", color: "#6b4c2a" },
  { slug: "fixhaber-yapay-zeka", name: "Yapay Zeka", color: "#4c1d95" },
  { slug: "fixhaber-otomobil-mobilite", name: "Otomobil / Mobilite", color: "#374151" },
  { slug: "fixhaber-akilli-ev-iot", name: "Akıllı Ev & IoT", color: "#0f766e" },
  { slug: "fixhaber-siber-guvenlik", name: "Siber Güvenlik", color: "#991b1b" },
  { slug: "fixhaber-uzay-bilim", name: "Uzay & Bilim", color: "#1e3a8a" },
  { slug: "fixhaber-kripto-blockchain", name: "Kripto & Blockchain", color: "#b45309" },
  { slug: "fixhaber-rehberler", name: "Nasıl Yapılır / Rehberler", color: "#4b5563" },
  { slug: "fixhaber-listeler", name: "Listeler / Öneriler", color: "#525252" },
  { slug: "fixhaber-videolar", name: "Videolar", color: "#7c2d12" },
  /** RSS yolu `teknoloji` → site kategorisi (menüde gizli, haberler ile hizalı). */
  { slug: "fixhaber-teknoloji", name: "Teknoloji", color: "#0a5a6e" },
];

export const FIXHABER_SITE: FixHaberSiteDef = {
  slug: FIXHABER_SLUG,
  domain: FIXHABER_DOMAIN,
  displayName: "Fix Haber",
  description: "Fix Haber — teknoloji, bilim ve dijital dünyanın Türkçe haber merkezi.",
  hmYsMansetPreset: "odatv",
  hmPrimaryColor: "#002B5C",
  hmSecondaryColor: "#D20000",
  hmYsSlogan: "Teknoloji ve bilim haberleri",
  logoPath: FIXHABER_LOGO_PATH,
  faviconPath: FIXHABER_FAVICON_PATH,
  categories: FIXHABER_CATEGORIES,
  sampleHeadlines: [
    {
      title: "Yapay zeka gündeminde yeni model duyurusu merakla bekleniyor",
      spot: "Sektör temsilcileri kısa süre içinde resmi açıklama yapılabileceğini belirtti.",
      categorySlug: "fixhaber-yapay-zeka",
      featured: true,
    },
    {
      title: "Akıllı telefon pazarında yeni amiral gemisi modeller yarışıyor",
      spot: "Kamera, pil ve yapay zeka özellikleri öne çıkan cihazlar vitrinde.",
      categorySlug: "fixhaber-mobil-telefonlar",
    },
    {
      title: "Uzay ajansından bilim misyonuna ilişkin güncelleme paylaşıldı",
      spot: "Araştırmacılar görev takviminin önümüzdeki hafta netleşeceğini söyledi.",
      categorySlug: "fixhaber-uzay-bilim",
    },
  ],
  rssFeeds: [...FIXHABER_RSS_FEEDS],
};

export const FIXHABER_KUNYE = Object.freeze({
  lead: "Fix Haber, teknoloji, bilim ve dijital dünyanın Türkçe haber sitesidir.",
  yayin: "FIX HABER",
  genelMudur: "Mustafa Özdemir",
  yayinYonetmeni: "Nail Türkoğlu",
  yaziIsleri: "Melek Acar",
  address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
  phone: "0532 229 18 92",
  email: "bilgi@fix.tc",
  tuzel: "Fix Haber",
  yayinIlkeleri:
    "Editörün yazdığı haberler bu sitede yayımlanır. Ajans ve RSS beslemeleri başlık, özet ve kaynak bağlantısıyla sınırlıdır.",
});

export const FIXHABER_HAKKIMIZDA_HTML = [
  "<p>Fix Haber (fix.tc), teknoloji, bilim ve dijital dünyanın Türkçe haber sitesidir.</p>",
  "<p>Teknoloji ve bilim haberleri</p>",
  '<h2 id="yayin-ilkeleri">Yayın ilkeleri</h2>',
  `<p>${FIXHABER_KUNYE.yayinIlkeleri}</p>`,
].join("\n");

export function listFixHaberCategorySlugs(): string[] {
  return FIXHABER_CATEGORIES.map((c) => c.slug);
}

export function listFixHaberDomains(): string[] {
  return [FIXHABER_DOMAIN, `www.${FIXHABER_DOMAIN}`];
}

export function isFixHaberHost(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return h === FIXHABER_DOMAIN;
}

export function findFixHaberSite(slugOrDomain: string): FixHaberSiteDef | undefined {
  const key = String(slugOrDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (key === FIXHABER_SLUG || key === FIXHABER_DOMAIN) return FIXHABER_SITE;
  return undefined;
}

/** layout_json — phpTheme + yenisafak + logo/favicon + marka renkleri. */
export function buildFixHaberLayoutJson(site: FixHaberSiteDef = FIXHABER_SITE): Record<string, unknown> {
  const categorySlugs = listFixHaberCategorySlugs();
  return {
    phpTheme: true,
    frontend: "php",
    hmVitrinTheme: "yenisafak",
    hmYsMansetPreset: site.hmYsMansetPreset,
    hmPrimaryColor: site.hmPrimaryColor,
    hmSecondaryColor: site.hmSecondaryColor,
    logoUrl: site.logoPath,
    faviconUrl: site.faviconPath,
    hmYsSlogan: site.hmYsSlogan,
    hmYsKunye: { ...FIXHABER_KUNYE },
    hmFooterAboutHtml: FIXHABER_HAKKIMIZDA_HTML,
    hmNewsYsTickerEnabled: true,
    hmNewsYsMansetEnabled: true,
    hmNewsYsSideHeadlinesEnabled: true,
    hmNewsYsCategoryBlocksEnabled: true,
    hmNewsYsVideoBandEnabled: true,
    hmNewsYsAuthorsEnabled: true,
    hmNewsYsMostReadEnabled: true,
    hmNewsYsGalleryEnabled: true,
    hmNewsBreakingBandEnabled: true,
    hmNewsSliderEnabled: true,
    hmNewsHeaderMenuEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsCategorySectionsEnabled: true,
    hmCategorySortSlugs: categorySlugs,
    hmNavOnlyCategorySlugs: [...FIXHABER_NAV_ONLY_CATEGORY_SLUGS],
    hmNavHiddenCategorySlugs: [...FIXHABER_NAV_HIDDEN_CATEGORY_SLUGS],
    hmNewsHomeModuleItemCounts: { ysAuthors: 13 },
    hybridRssEnabled: true,
    showPlatformNav: false,
  };
}
