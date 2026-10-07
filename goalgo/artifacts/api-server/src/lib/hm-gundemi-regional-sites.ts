/**
 * gundemi.org bölgesel HM haber siteleri — 8 alt alan.
 * Seed / wrangler / Hostinger paketleri bu katalogu paylaşır.
 */

export type GundemiYsMansetPreset = "odatv" | "sabah" | "takvim" | "mynet" | "nefes";

export type GundemiRegionalSiteDef = {
  slug: string;
  /** Cloudflare / DNS host (tek nokta). */
  domain: string;
  displayName: string;
  /** Logo metninde kullanılan bölge etiketi (küçük harf, Türkçe). */
  regionLabel: string;
  description: string;
  /** Yenişafak manşet preset — siteler arası vitrin ayrımı. */
  hmYsMansetPreset: GundemiYsMansetPreset;
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmYsSlogan: string;
  /** Statik logo yolu (SPA assets + Hostinger pack). */
  logoPath: string;
  /** Siteye özel kategori slug/ad çiftleri (global slug çakışmasın diye `gundemi-{slug}-` öneki). */
  regionalCategories: Array<{ slug: string; name: string; color: string }>;
  /** Örnek haber başlıkları (site boş kalmasın). */
  sampleHeadlines: Array<{ title: string; spot: string; categorySlug: string; featured?: boolean }>;
  /** Bölgesel RSS kampanya varsayılan beslemeleri. */
  rssFeeds: string[];
};

const LOGO = (slug: string) => `/gundemi/logos/${slug}-gundemi.png`;

export const GUNDEMI_ZONE = "gundemi.org";
export const GUNDEMI_PHP_ORIGIN_IP = "187.77.84.201";
export const GUNDEMI_REGIONAL_CAMPAIGN_TAG = "gundemi-bolge";
/** Apex + www → turkatahaber HM satırı (domain2); 9. boş site değil. */
export const GUNDEMI_APEX_TURKATA_ALIAS = "gundemi.org";
export const TURKATA_HM_SLUG = "turkatahaber";

export const GUNDEMI_REGIONAL_SITES: readonly GundemiRegionalSiteDef[] = [
  {
    slug: "ege-gundemi",
    domain: "ege.gundemi.org",
    displayName: "Ege Gündemi",
    regionLabel: "ege",
    description: "Ege Bölgesi’nin dijital haber platformu — İzmir, Manisa, Aydın, Muğla, Denizli ve çevresi.",
    hmYsMansetPreset: "odatv",
    hmPrimaryColor: "#0a6b7a",
    hmSecondaryColor: "#c00005",
    hmYsSlogan: "Ege’nin gündemi, buradan okunur.",
    logoPath: LOGO("ege"),
    regionalCategories: [
      { slug: "gundemi-ege-izmir", name: "İzmir", color: "#0a6b7a" },
      { slug: "gundemi-ege-manisa", name: "Manisa", color: "#0b3362" },
      { slug: "gundemi-ege-aydin", name: "Aydın", color: "#c00005" },
      { slug: "gundemi-ege-mugla", name: "Muğla", color: "#1a7a6d" },
    ],
    sampleHeadlines: [
      {
        title: "İzmir Körfezi’nde sabah ulaşımı yoğun geçti",
        spot: "Alsancak–Konak hattında sabah saatlerinde trafik yoğunluğu sürüyor.",
        categorySlug: "gundemi-ege-izmir",
        featured: true,
      },
      {
        title: "Manisa’da zeytin hasadı erken başladı",
        spot: "Üreticiler sıcak hava nedeniyle hasadı öne çekti.",
        categorySlug: "gundemi-ege-manisa",
      },
      {
        title: "Aydın’da turizm sezonu hazırlıkları sürüyor",
        spot: "Kuşadası ve Didim’de oteller rezervasyon temposunu artırdı.",
        categorySlug: "gundemi-ege-aydin",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "marmara-gundemi",
    domain: "marmara.gundemi.org",
    displayName: "Marmara Gündemi",
    regionLabel: "marmara",
    description: "Marmara Bölgesi haberleri — İstanbul, Bursa, Kocaeli, Tekirdağ ve çevresi.",
    hmYsMansetPreset: "sabah",
    hmPrimaryColor: "#0b2d5c",
    hmSecondaryColor: "#c00005",
    hmYsSlogan: "Marmara’dan Türkiye’ye gündem.",
    logoPath: LOGO("marmara"),
    regionalCategories: [
      { slug: "gundemi-marmara-istanbul", name: "İstanbul", color: "#0b2d5c" },
      { slug: "gundemi-marmara-bursa", name: "Bursa", color: "#1a4a7a" },
      { slug: "gundemi-marmara-kocaeli", name: "Kocaeli", color: "#c00005" },
      { slug: "gundemi-marmara-tekirdag", name: "Tekirdağ", color: "#0a5a6e" },
    ],
    sampleHeadlines: [
      {
        title: "İstanbul’da metro seferleri sabah yoğunluğuna hazır",
        spot: "Toplu taşıma hatlarında ek sefer planları açıklandı.",
        categorySlug: "gundemi-marmara-istanbul",
        featured: true,
      },
      {
        title: "Bursa’da sanayi üretiminde yeni yatırım adımı",
        spot: "Organize sanayi bölgelerinde kapasite artırımı gündemde.",
        categorySlug: "gundemi-marmara-bursa",
      },
      {
        title: "Kocaeli liman trafiği haftalık rekor kırdı",
        spot: "Konteyner elleçleme rakamları geçen yıla göre yükseldi.",
        categorySlug: "gundemi-marmara-kocaeli",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "karadeniz-gundemi",
    domain: "karadeniz.gundemi.org",
    displayName: "Karadeniz Gündemi",
    regionLabel: "karadeniz",
    description: "Karadeniz Bölgesi’nin haberi — Trabzon, Samsun, Rize, Ordu ve çevresi.",
    hmYsMansetPreset: "takvim",
    hmPrimaryColor: "#0d4f3c",
    hmSecondaryColor: "#c00005",
    hmYsSlogan: "Karadeniz’in sesi, gündemin nabzı.",
    logoPath: LOGO("karadeniz"),
    regionalCategories: [
      { slug: "gundemi-karadeniz-trabzon", name: "Trabzon", color: "#0d4f3c" },
      { slug: "gundemi-karadeniz-samsun", name: "Samsun", color: "#0b3362" },
      { slug: "gundemi-karadeniz-rize", name: "Rize", color: "#1a6b4a" },
      { slug: "gundemi-karadeniz-ordu", name: "Ordu", color: "#c00005" },
    ],
    sampleHeadlines: [
      {
        title: "Trabzon’da yağışlı hava ulaşıma etki etti",
        spot: "Sahil yolunda sürücülerden dikkatli seyir uyarısı yapıldı.",
        categorySlug: "gundemi-karadeniz-trabzon",
        featured: true,
      },
      {
        title: "Samsun limanı yük trafiğinde artış",
        spot: "İhracat konteynerleri geçen aya göre yükseldi.",
        categorySlug: "gundemi-karadeniz-samsun",
      },
      {
        title: "Rize’de çay hasadı takvimi güncellendi",
        spot: "Üretici birlikleri yeni dönem için planları paylaştı.",
        categorySlug: "gundemi-karadeniz-rize",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "icanadolu-gundemi",
    domain: "icanadolu.gundemi.org",
    displayName: "İç Anadolu Gündemi",
    regionLabel: "iç anadolu",
    description: "İç Anadolu Bölgesi haberleri — Ankara, Konya, Kayseri, Eskişehir ve çevresi.",
    hmYsMansetPreset: "mynet",
    hmPrimaryColor: "#8b5a2b",
    hmSecondaryColor: "#0b3362",
    hmYsSlogan: "İç Anadolu’nun gündemi tek adreste.",
    logoPath: LOGO("icanadolu"),
    regionalCategories: [
      { slug: "gundemi-icanadolu-ankara", name: "Ankara", color: "#0b3362" },
      { slug: "gundemi-icanadolu-konya", name: "Konya", color: "#8b5a2b" },
      { slug: "gundemi-icanadolu-kayseri", name: "Kayseri", color: "#c00005" },
      { slug: "gundemi-icanadolu-eskisehir", name: "Eskişehir", color: "#1a5a7a" },
    ],
    sampleHeadlines: [
      {
        title: "Ankara’da sabah saatlerinde trafikte yoğunluk",
        spot: "Çankaya ve Yenimahalle bağlantılarında yavaşlama görüldü.",
        categorySlug: "gundemi-icanadolu-ankara",
        featured: true,
      },
      {
        title: "Konya Ovası’nda sulama planı yenilendi",
        spot: "Çiftçilere sezon başı bilgilendirme toplantıları yapılıyor.",
        categorySlug: "gundemi-icanadolu-konya",
      },
      {
        title: "Kayseri’de sanayi istihdamı arttı",
        spot: "Organize bölgelerde yeni işe alım ilanları yayınlandı.",
        categorySlug: "gundemi-icanadolu-kayseri",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "doguanadolu-gundemi",
    domain: "doguanadolu.gundemi.org",
    displayName: "Doğu Anadolu Gündemi",
    regionLabel: "doğu anadolu",
    description: "Doğu Anadolu haberleri — Erzurum, Van, Malatya, Elazığ ve çevresi.",
    hmYsMansetPreset: "nefes",
    hmPrimaryColor: "#1a3a5c",
    hmSecondaryColor: "#c00005",
    hmYsSlogan: "Doğu Anadolu’dan güncel haber akışı.",
    logoPath: LOGO("doguanadolu"),
    regionalCategories: [
      { slug: "gundemi-doguanadolu-erzurum", name: "Erzurum", color: "#1a3a5c" },
      { slug: "gundemi-doguanadolu-van", name: "Van", color: "#0b5a7a" },
      { slug: "gundemi-doguanadolu-malatya", name: "Malatya", color: "#c00005" },
      { slug: "gundemi-doguanadolu-elazig", name: "Elazığ", color: "#6b3a1a" },
    ],
    sampleHeadlines: [
      {
        title: "Erzurum’da kış hazırlıkları öne çekildi",
        spot: "Belediye ekipleri karla mücadele planını gözden geçirdi.",
        categorySlug: "gundemi-doguanadolu-erzurum",
        featured: true,
      },
      {
        title: "Van Gölü çevresinde turizm hareketliliği",
        spot: "Hafta sonu konaklama talebinde artış gözlendi.",
        categorySlug: "gundemi-doguanadolu-van",
      },
      {
        title: "Malatya’da kayısı üreticileri sezonu değerlendirdi",
        spot: "Rekolte ve fiyat beklentileri masaya yatırıldı.",
        categorySlug: "gundemi-doguanadolu-malatya",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.wanhaber.com/rss/guncel",
    ],
  },
  {
    slug: "guneydogu-gundemi",
    domain: "guneydogu.gundemi.org",
    displayName: "Güneydoğu Gündemi",
    regionLabel: "güneydoğu",
    description: "Güneydoğu Anadolu haberleri — Gaziantep, Şanlıurfa, Diyarbakır, Mardin ve çevresi.",
    hmYsMansetPreset: "odatv",
    hmPrimaryColor: "#6b2d3c",
    hmSecondaryColor: "#0b3362",
    hmYsSlogan: "Güneydoğu’nun gündemi burada.",
    logoPath: LOGO("guneydogu"),
    regionalCategories: [
      { slug: "gundemi-guneydogu-gaziantep", name: "Gaziantep", color: "#6b2d3c" },
      { slug: "gundemi-guneydogu-sanliurfa", name: "Şanlıurfa", color: "#8b5a2b" },
      { slug: "gundemi-guneydogu-diyarbakir", name: "Diyarbakır", color: "#0b3362" },
      { slug: "gundemi-guneydogu-mardin", name: "Mardin", color: "#c00005" },
    ],
    sampleHeadlines: [
      {
        title: "Gaziantep’te ihracatçı firmalardan yeni hedef",
        spot: "Organik gıda ve tekstil kalemlerinde sipariş artışı bekleniyor.",
        categorySlug: "gundemi-guneydogu-gaziantep",
        featured: true,
      },
      {
        title: "Şanlıurfa’da tarımda sulama seferberliği",
        spot: "Çiftçilere damla sulama destekleri anlatıldı.",
        categorySlug: "gundemi-guneydogu-sanliurfa",
      },
      {
        title: "Diyarbakır’da kültür etkinlikleri takvimi açıklandı",
        spot: "Şehir merkezinde sergi ve konserler planlandı.",
        categorySlug: "gundemi-guneydogu-diyarbakir",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "akdeniz-gundemi",
    domain: "akdeniz.gundemi.org",
    displayName: "Akdeniz Gündemi",
    regionLabel: "akdeniz",
    description: "Akdeniz Bölgesi haberleri — Antalya, Adana, Mersin, Hatay ve çevresi.",
    hmYsMansetPreset: "sabah",
    hmPrimaryColor: "#0c4a6e",
    hmSecondaryColor: "#e85d04",
    hmYsSlogan: "Akdeniz’in sıcak gündemi.",
    logoPath: LOGO("akdeniz"),
    regionalCategories: [
      { slug: "gundemi-akdeniz-antalya", name: "Antalya", color: "#0c4a6e" },
      { slug: "gundemi-akdeniz-adana", name: "Adana", color: "#e85d04" },
      { slug: "gundemi-akdeniz-mersin", name: "Mersin", color: "#0b3362" },
      { slug: "gundemi-akdeniz-hatay", name: "Hatay", color: "#c00005" },
    ],
    sampleHeadlines: [
      {
        title: "Antalya’da turizm sezonu rezervasyonları yükseldi",
        spot: "Oteller erken rezervasyon kampanyalarını uzattı.",
        categorySlug: "gundemi-akdeniz-antalya",
        featured: true,
      },
      {
        title: "Adana’da tarım fuarı kapılarını açtı",
        spot: "Üreticiler yeni ekipman ve tohum çeşitlerini inceledi.",
        categorySlug: "gundemi-akdeniz-adana",
      },
      {
        title: "Mersin limanında konteyner trafiği arttı",
        spot: "Doğu Akdeniz hattında yük yoğunluğu sürüyor.",
        categorySlug: "gundemi-akdeniz-mersin",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/gundem",
    ],
  },
  {
    slug: "kibris-gundemi",
    domain: "kibris.gundemi.org",
    displayName: "Kıbrıs Gündemi",
    regionLabel: "kıbrıs",
    description: "Kıbrıs ve Doğu Akdeniz gündemi — Lefkoşa, Girne, Magosa ve çevresi.",
    hmYsMansetPreset: "takvim",
    hmPrimaryColor: "#0b4f6c",
    hmSecondaryColor: "#c9a227",
    hmYsSlogan: "Kıbrıs’ın gündemi, buradan takip edilir.",
    logoPath: LOGO("kibris"),
    regionalCategories: [
      { slug: "gundemi-kibris-lefkosa", name: "Lefkoşa", color: "#0b4f6c" },
      { slug: "gundemi-kibris-girne", name: "Girne", color: "#0b3362" },
      { slug: "gundemi-kibris-magosa", name: "Mağusa", color: "#c9a227" },
      { slug: "gundemi-kibris-gazimagusa", name: "Gazi Mağusa", color: "#c00005" },
    ],
    sampleHeadlines: [
      {
        title: "Lefkoşa’da ulaşım düzenlemesi yürürlüğe girdi",
        spot: "Merkez güzergâhlarda yeni sinyalizasyon test edildi.",
        categorySlug: "gundemi-kibris-lefkosa",
        featured: true,
      },
      {
        title: "Girne sahilinde turizm hareketliliği sürüyor",
        spot: "Hafta sonu konaklama doluluk oranları yükseldi.",
        categorySlug: "gundemi-kibris-girne",
      },
      {
        title: "Mağusa limanında yolcu trafiği arttı",
        spot: "Feribot seferlerinde ek kapasite planlanıyor.",
        categorySlug: "gundemi-kibris-magosa",
      },
    ],
    rssFeeds: [
      "https://www.dirilispostasi.com/rss/yerel-haber",
      "https://www.dirilispostasi.com/rss/dunya",
    ],
  },
];

export function listGundemiRegionalDomains(): string[] {
  return GUNDEMI_REGIONAL_SITES.map((s) => s.domain);
}

export function listGundemiRegionalSlugs(): string[] {
  return GUNDEMI_REGIONAL_SITES.map((s) => s.slug);
}

export function findGundemiRegionalSite(slugOrDomain: string): GundemiRegionalSiteDef | undefined {
  const key = String(slugOrDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return GUNDEMI_REGIONAL_SITES.find((s) => s.slug === key || s.domain === key);
}

/** layout_json iskeleti — phpTheme + yenisafak + bölge renkleri. */
export function buildGundemiRegionalLayoutJson(site: GundemiRegionalSiteDef): Record<string, unknown> {
  const categorySlugs = site.regionalCategories.map((c) => c.slug);
  return {
    phpTheme: true,
    frontend: "php",
    hmVitrinTheme: "yenisafak",
    hmYsMansetPreset: site.hmYsMansetPreset,
    hmPrimaryColor: site.hmPrimaryColor,
    hmSecondaryColor: site.hmSecondaryColor,
    logoUrl: site.logoPath,
    faviconUrl: site.logoPath,
    hmYsSlogan: site.hmYsSlogan,
    hmFooterAboutHtml: site.description,
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
