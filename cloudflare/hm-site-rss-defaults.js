/**
 * Site içi RSS varsayılanları — tüm HM editör siteleri.
 * Editör panelden değiştirilebilir; Neon rev ile bir kerelik uygulanır.
 * «Site içi RSS» (hybridRssEnabled) bu rev ile açıkılır.
 */

export const HM_SITE_RSS_DEFAULTS_REV = "20260727site1";

/** Kullanıcının verdiği kategori sırası ve adresler (aynı kategoriye birden fazla URL). */
export const DEFAULT_HM_SITE_RSS_FEED_ROWS = [
  {
    id: "asayis",
    categoryKey: "asayis",
    label: "Asayiş",
    url: "https://www.dirilispostasi.com/rss/asayis",
  },
  {
    id: "dunya",
    categoryKey: "dunya",
    label: "Dünya",
    url: "https://www.dirilispostasi.com/rss/dunya",
  },
  {
    id: "gundem",
    categoryKey: "gundem",
    label: "Gündem",
    url: "https://www.dirilispostasi.com/rss/gundem",
  },
  {
    id: "gundem-genel",
    categoryKey: "gundem",
    label: "Gündem",
    url: "https://www.dirilispostasi.com/rss/genel",
  },
  {
    id: "gundem-guncel",
    categoryKey: "gundem",
    label: "Gündem",
    url: "https://www.dirilispostasi.com/rss/guncel",
  },
  {
    id: "yerel",
    categoryKey: "yerel",
    label: "Yerel",
    url: "https://www.dirilispostasi.com/rss/yerel-haber",
  },
  {
    id: "yerel-yozgat",
    categoryKey: "yerel",
    label: "Yerel",
    url: "https://www.yozgatmedya.com.tr/rss/yozgat",
  },
  {
    id: "yerel-wanhaber",
    categoryKey: "yerel",
    label: "Yerel",
    url: "https://www.wanhaber.com/rss/guncel",
  },
  {
    id: "teknoloji",
    categoryKey: "teknoloji",
    label: "Teknoloji",
    url: "https://www.dirilispostasi.com/rss/teknoloji",
  },
  {
    id: "teknoloji-bilim",
    categoryKey: "teknoloji",
    label: "Teknoloji",
    url: "https://www.dirilispostasi.com/rss/teknoloji-ve-bilim",
  },
  {
    id: "yasam",
    categoryKey: "yasam",
    label: "Yaşam",
    url: "https://www.dirilispostasi.com/rss/saglik",
  },
  {
    id: "magazin",
    categoryKey: "magazin",
    label: "Magazin",
    url: "https://www.dirilispostasi.com/rss/magazin",
  },
  {
    id: "otomobil",
    categoryKey: "otomobil",
    label: "Otomobil",
    url: "https://www.dirilispostasi.com/rss/otomobil",
  },
  {
    id: "egitim",
    categoryKey: "egitim",
    label: "Eğitim",
    url: "https://www.dirilispostasi.com/rss/egitim",
  },
  {
    id: "saglik",
    categoryKey: "saglik",
    label: "Sağlık",
    url: "https://www.dirilispostasi.com/rss/saglik",
  },
];

export function cloneDefaultHmSiteRssFeedRows() {
  return DEFAULT_HM_SITE_RSS_FEED_ROWS.map((row) => ({ ...row }));
}
