/**
 * Fix Haber (fix.tc) — Yenişafak PHP tema HM katalogu.
 * Seed / wrangler / Hostinger ops bu dosyayı paylaşır.
 */

export const FIXHABER_SLUG = "fixhaber";
export const FIXHABER_DOMAIN = "fix.tc";
export const FIXHABER_ZONE = "fix.tc";
export const FIXHABER_PHP_ORIGIN_IP = "187.77.84.201";
export const FIXHABER_CAMPAIGN_TAG = "fixhaber";

export type FixHaberSiteDef = {
  slug: typeof FIXHABER_SLUG;
  domain: typeof FIXHABER_DOMAIN;
  displayName: string;
  description: string;
  hmYsMansetPreset: "odatv" | "sabah" | "takvim" | "mynet" | "nefes";
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmYsSlogan: string;
  categories: Array<{ slug: string; name: string; color: string }>;
  sampleHeadlines: Array<{ title: string; spot: string; categorySlug: string; featured?: boolean }>;
  rssFeeds: string[];
};

export const FIXHABER_SITE: FixHaberSiteDef = {
  slug: FIXHABER_SLUG,
  domain: FIXHABER_DOMAIN,
  displayName: "Fix Haber",
  description: "Fix Haber — Türkiye gündemini Türkçe aktaran dijital haber sitesi.",
  hmYsMansetPreset: "odatv",
  hmPrimaryColor: "#0b3d5c",
  hmSecondaryColor: "#c00005",
  hmYsSlogan: "Fix Haber",
  categories: [
    { slug: "fixhaber-gundem", name: "Gündem", color: "#0b3d5c" },
    { slug: "fixhaber-ekonomi", name: "Ekonomi", color: "#1a5a3a" },
    { slug: "fixhaber-dunya", name: "Dünya", color: "#1a4a7a" },
    { slug: "fixhaber-spor", name: "Spor", color: "#c00005" },
    { slug: "fixhaber-teknoloji", name: "Teknoloji", color: "#0a5a6e" },
    { slug: "fixhaber-yasam", name: "Yaşam", color: "#6b4c2a" },
  ],
  sampleHeadlines: [
    {
      title: "Gündemde öne çıkan gelişmeler yakından takip ediliyor",
      spot: "Editör masası sabah brifinginde günün başlıklarını değerlendirdi.",
      categorySlug: "fixhaber-gundem",
      featured: true,
    },
    {
      title: "Piyasalarda haftanın ilk işlem günü sakin başladı",
      spot: "Yatırımcılar veri akışını izlerken işlem hacmi dengeli seyretti.",
      categorySlug: "fixhaber-ekonomi",
    },
    {
      title: "Teknoloji gündeminde yeni ürün duyurusu bekleniyor",
      spot: "Sektör kaynakları kısa süre içinde resmi açıklama yapılabileceğini belirtti.",
      categorySlug: "fixhaber-teknoloji",
    },
  ],
  rssFeeds: [
    "https://www.dirilispostasi.com/rss/gundem",
    "https://www.trthaber.com/gundem_articles.rss",
  ],
};

export const FIXHABER_KUNYE = Object.freeze({
  lead: "Fix Haber, Türkiye gündemini Türkçe aktaran dijital haber sitesidir.",
  yayin: "FIX HABER",
  genelMudur: "Mustafa Özdemir",
  yayinYonetmeni: "Nail Türkoğlu",
  yaziIsleri: "Melek Acar",
  address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
  phone: "0532 229 18 92",
  email: "bilgi@fix.tc",
  tuzel: "Fix Haber",
  yayinIlkeleri:
    "Editörün yazdığı haberler bu sitede yayımlanır. Ajans beslemeleri başlık, özet ve kaynak bağlantısıyla sınırlıdır.",
});

export const FIXHABER_HAKKIMIZDA_HTML = [
  "<p>Fix Haber (fix.tc), Türkiye gündemini Türkçe aktaran dijital haber sitesidir.</p>",
  "<p>Fix Haber</p>",
  '<h2 id="yayin-ilkeleri">Yayın ilkeleri</h2>',
  `<p>${FIXHABER_KUNYE.yayinIlkeleri}</p>`,
].join("\n");

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

/** layout_json — phpTheme + yenisafak; logo yok (metin marka / PHP varsayılanı). */
export function buildFixHaberLayoutJson(site: FixHaberSiteDef = FIXHABER_SITE): Record<string, unknown> {
  const categorySlugs = site.categories.map((c) => c.slug);
  return {
    phpTheme: true,
    frontend: "php",
    hmVitrinTheme: "yenisafak",
    hmYsMansetPreset: site.hmYsMansetPreset,
    hmPrimaryColor: site.hmPrimaryColor,
    hmSecondaryColor: site.hmSecondaryColor,
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
    hmNavOnlyCategorySlugs: categorySlugs,
    hybridRssEnabled: true,
    showPlatformNav: false,
  };
}
