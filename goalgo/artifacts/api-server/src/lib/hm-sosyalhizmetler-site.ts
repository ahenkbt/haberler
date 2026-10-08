/**
 * Sosyal Hizmetler Haber (sosyalhizmetler.tr) — sosyal hizmetler HM katalogu (Yenişafak PHP tema).
 * Seed / wrangler / Hostinger ops bu dosyayı paylaşır.
 */

export const SOSYALHIZMETLER_SLUG = "sosyalhizmetler";
export const SOSYALHIZMETLER_DOMAIN = "sosyalhizmetler.tr";
export const SOSYALHIZMETLER_ZONE = "sosyalhizmetler.tr";
export const SOSYALHIZMETLER_PHP_ORIGIN_IP = "187.77.84.201";
export const SOSYALHIZMETLER_CAMPAIGN_TAG = "sosyalhizmetler";

export const SOSYALHIZMETLER_LOGO_PATH = "/sh/sosyal-hizmetler-logo.png";
export const SOSYALHIZMETLER_FAVICON_PATH = "/sh/sosyal-hizmetler-favicon.png";

export type SosyalHizmetlerCategoryDef = { slug: string; name: string; color: string };

export type SosyalHizmetlerSiteDef = {
  slug: typeof SOSYALHIZMETLER_SLUG;
  domain: typeof SOSYALHIZMETLER_DOMAIN;
  displayName: string;
  description: string;
  hmYsMansetPreset: "odatv" | "sabah" | "takvim" | "mynet" | "nefes";
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmYsSlogan: string;
  logoPath: string;
  faviconPath: string;
  categories: SosyalHizmetlerCategoryDef[];
  sampleHeadlines: Array<{ title: string; spot: string; categorySlug: string; featured?: boolean }>;
  rssFeeds: string[];
};

/** Üst menü — vatandaş ve profesyonel odaklı ana kategoriler. */
export const SOSYALHIZMETLER_NAV_ONLY_CATEGORY_SLUGS = [
  "sh-gundem",
  "sh-aile-cocuk",
  "sh-yasli-bakim",
  "sh-engelli-hizmetleri",
  "sh-sosyal-yardimlar",
  "sh-kamu-duyurulari",
  "sh-rehberler",
] as const;

/** Alt menü / niş — «Daha Fazla» altında. */
export const SOSYALHIZMETLER_NAV_HIDDEN_CATEGORY_SLUGS = [
  "sh-sektor-haberleri",
  "sh-istihdam-sosyal-guvenlik",
  "sh-saglik-sosyal-hizmet",
  "sh-videolar",
] as const;

/**
 * Sosyal politika, sağlık, kamu duyuruları — RSS kampanya beslemeleri.
 */
export const SOSYALHIZMETLER_RSS_FEEDS = [
  "https://www.trthaber.com/gundem_articles.rss",
  "https://www.trthaber.com/saglik_articles.rss",
  "https://www.dirilispostasi.com/rss/gundem",
  "https://www.dirilispostasi.com/rss/saglik",
  "https://www.birgun.net/rss/kategori/gundem-1",
  "https://www.birgun.net/rss/kategori/saglik-33",
  "https://www.ntv.com.tr/gundem.rss",
  "https://www.ntv.com.tr/turkiye.rss",
] as const;

export const SOSYALHIZMETLER_CATEGORIES: SosyalHizmetlerCategoryDef[] = [
  { slug: "sh-gundem", name: "Gündem", color: "#0d6b5c" },
  { slug: "sh-aile-cocuk", name: "Aile ve Çocuk", color: "#0a5a6e" },
  { slug: "sh-yasli-bakim", name: "Yaşlı Bakımı", color: "#1a4a7a" },
  { slug: "sh-engelli-hizmetleri", name: "Engelli Hizmetleri", color: "#374151" },
  { slug: "sh-sosyal-yardimlar", name: "Sosyal Yardımlar", color: "#c45c00" },
  { slug: "sh-kamu-duyurulari", name: "SHGM / Kamu Duyuruları", color: "#0b3362" },
  { slug: "sh-rehberler", name: "Rehberler", color: "#4b5563" },
  { slug: "sh-sektor-haberleri", name: "Sektör Haberleri", color: "#1a5a3a" },
  { slug: "sh-istihdam-sosyal-guvenlik", name: "İstihdam / Sosyal Güvenlik", color: "#245a8a" },
  { slug: "sh-saglik-sosyal-hizmet", name: "Sağlık ve Sosyal Hizmet", color: "#991b1b" },
  { slug: "sh-videolar", name: "Videolar", color: "#7c2d12" },
];

export const SOSYALHIZMETLER_INTRO =
  "Bir Sosyal Hizmetler Haber Sitesi için kategori yapısı, hem hizmetten yararlanan vatandaşların aradıklarını kolayca bulabilmelerini hem de bu alanda çalışan profesyonellerin gelişmeleri takip edebilmelerini sağlamalıdır.";

export const SOSYALHIZMETLER_SITE: SosyalHizmetlerSiteDef = {
  slug: SOSYALHIZMETLER_SLUG,
  domain: SOSYALHIZMETLER_DOMAIN,
  displayName: "Sosyal Hizmetler Haber",
  description:
    "Sosyal Hizmetler Haber — aile, çocuk, yaşlı bakımı, engelli hizmetleri, sosyal yardımlar ve kamu duyurularında güncel haber ve rehberler.",
  hmYsMansetPreset: "sabah",
  hmPrimaryColor: "#0d6b5c",
  hmSecondaryColor: "#c45c00",
  hmYsSlogan: "Sosyal hizmetlerde güncel haber ve rehber",
  logoPath: SOSYALHIZMETLER_LOGO_PATH,
  faviconPath: SOSYALHIZMETLER_FAVICON_PATH,
  categories: SOSYALHIZMETLER_CATEGORIES,
  sampleHeadlines: [
    {
      title: "Sosyal yardım başvurularında yeni bilgilendirme hattı devrede",
      spot: "Vatandaşlar başvuru süreci ve gerekli belgeler hakkında tek numaradan yönlendiriliyor.",
      categorySlug: "sh-sosyal-yardimlar",
      featured: true,
    },
    {
      title: "Engelli bireylere yönelik gündüz bakım merkezi kapasitesi artırıldı",
      spot: "İl müdürlükleri personel ve fiziki altyapı planını güncelledi.",
      categorySlug: "sh-engelli-hizmetleri",
    },
    {
      title: "Sağlık ve sosyal hizmet entegrasyonunda pilot uygulama genişliyor",
      spot: "Evde bakım ve rehabilitasyon hizmetlerinde ortak veri akışı test ediliyor.",
      categorySlug: "sh-saglik-sosyal-hizmet",
    },
  ],
  rssFeeds: [...SOSYALHIZMETLER_RSS_FEEDS],
};

export const SOSYALHIZMETLER_KUNYE = Object.freeze({
  lead: "Sosyal Hizmetler Haber, sosyal hizmetler alanındaki gelişmeleri vatandaş ve profesyoneller için derler.",
  yayin: "SOSYAL HİZMETLER HABER",
  genelMudur: "Mustafa Özdemir",
  yayinYonetmeni: "Nail Türkoğlu",
  yaziIsleri: "Melek Acar",
  address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
  phone: "0532 229 18 92",
  email: "bilgi@sosyalhizmetler.tr",
  tuzel: "Sosyal Hizmetler Haber",
  yayinIlkeleri:
    "Editörün yazdığı haberler bu sitede yayımlanır. Ajans ve RSS beslemeleri başlık, özet ve kaynak bağlantısıyla sınırlıdır.",
});

export const SOSYALHIZMETLER_HAKKIMIZDA_HTML = [
  `<p>${SOSYALHIZMETLER_INTRO}</p>`,
  `<p><strong>${SOSYALHIZMETLER_SITE.displayName}</strong> (${SOSYALHIZMETLER_DOMAIN}), sosyal yardımlar, aile ve çocuk, yaşlı bakımı, engelli hizmetleri ile kamu duyurularını tek çatı altında sunar.</p>`,
  `<p>${SOSYALHIZMETLER_SITE.hmYsSlogan}</p>`,
  '<h2 id="yayin-ilkeleri">Yayın ilkeleri</h2>',
  `<p>${SOSYALHIZMETLER_KUNYE.yayinIlkeleri}</p>`,
].join("\n");

export function listSosyalHizmetlerCategorySlugs(): string[] {
  return SOSYALHIZMETLER_CATEGORIES.map((c) => c.slug);
}

export function listSosyalHizmetlerDomains(): string[] {
  return [SOSYALHIZMETLER_DOMAIN, `www.${SOSYALHIZMETLER_DOMAIN}`];
}

export function isSosyalHizmetlerHost(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return h === SOSYALHIZMETLER_DOMAIN;
}

export function findSosyalHizmetlerSite(slugOrDomain: string): SosyalHizmetlerSiteDef | undefined {
  const key = String(slugOrDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (key === SOSYALHIZMETLER_SLUG || key === SOSYALHIZMETLER_DOMAIN) return SOSYALHIZMETLER_SITE;
  return undefined;
}

export function buildSosyalHizmetlerLayoutJson(
  site: SosyalHizmetlerSiteDef = SOSYALHIZMETLER_SITE,
): Record<string, unknown> {
  const categorySlugs = listSosyalHizmetlerCategorySlugs();
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
    hmYsKunye: { ...SOSYALHIZMETLER_KUNYE },
    hmFooterAboutHtml: SOSYALHIZMETLER_HAKKIMIZDA_HTML,
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
    hmNavOnlyCategorySlugs: [...SOSYALHIZMETLER_NAV_ONLY_CATEGORY_SLUGS],
    hmNavHiddenCategorySlugs: [...SOSYALHIZMETLER_NAV_HIDDEN_CATEGORY_SLUGS],
    hmNewsHomeModuleItemCounts: { ysAuthors: 13 },
    hybridRssEnabled: true,
    showPlatformNav: false,
  };
}
