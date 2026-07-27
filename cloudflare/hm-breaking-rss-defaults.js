/**
 * Kutu içi RSS varsayılanları — tüm HM editör siteleri.
 * Editör panelden değiştirilebilir; Neon rev ile bir kerelik uygulanır.
 */

export const HM_BREAKING_RSS_DEFAULTS_REV = "20260727sporskor1";

/** Kullanıcının verdiği sıra ve adresler. */
export const DEFAULT_HM_BREAKING_RSS_FEED_ROWS = [
  {
    id: "sonDakika",
    categoryKey: "sonDakika",
    label: "Son Dakika",
    url: "https://www.ntv.com.tr/son-dakika.rss",
  },
  {
    id: "turkiye",
    categoryKey: "turkiye",
    label: "Türkiye",
    url: "https://www.ntv.com.tr/turkiye.rss",
  },
  {
    id: "egitim",
    categoryKey: "egitim",
    label: "Eğitim",
    url: "https://www.ntv.com.tr/egitim.rss",
  },
  {
    id: "ekonomi",
    categoryKey: "ekonomi",
    label: "Ekonomi",
    url: "https://www.ntv.com.tr/ekonomi.rss",
  },
  {
    id: "para",
    categoryKey: "para",
    label: "Para",
    url: "https://www.ntv.com.tr/ntvpara.rss",
  },
  {
    id: "yasam",
    categoryKey: "yasam",
    label: "Yaşam",
    url: "https://www.ntv.com.tr/yasam.rss",
  },
  {
    id: "dunya",
    categoryKey: "dunya",
    label: "Dünya",
    url: "https://www.ntv.com.tr/dunya.rss",
  },
  {
    id: "teknoloji",
    categoryKey: "teknoloji",
    label: "Teknoloji",
    url: "https://www.ntv.com.tr/teknoloji.rss",
  },
  {
    id: "saglik",
    categoryKey: "saglik",
    label: "Sağlık",
    url: "https://www.ntv.com.tr/saglik.rss",
  },
  {
    id: "otomobil",
    categoryKey: "otomobil",
    label: "Otomobil",
    url: "https://www.ntv.com.tr/otomobil.rss",
  },
  {
    id: "spor",
    categoryKey: "spor",
    label: "Spor",
    url: "https://www.ntv.com.tr/sporskor.rss",
  },
  {
    id: "futbol",
    categoryKey: "futbol",
    label: "Futbol",
    url: "https://www.spordepor.com/rss/futbol",
  },
  {
    id: "basketbol",
    categoryKey: "basketbol",
    label: "Basketbol",
    url: "https://www.spordepor.com/rss/basketbol",
  },
  {
    id: "tenis",
    categoryKey: "tenis",
    label: "Tenis",
    url: "https://www.spordepor.com/rss/tenis",
  },
  {
    id: "voleybol",
    categoryKey: "voleybol",
    label: "Voleybol",
    url: "https://www.spordepor.com/rss/voleybol",
  },
  {
    id: "ozel-haber",
    categoryKey: "ozel-haber",
    label: "Özel Haber",
    url: "https://www.spordepor.com/rss/ozel-haber",
  },
  {
    id: "savunmaSanayi",
    categoryKey: "savunmaSanayi",
    label: "Savunma Sanayi",
    url: "https://www.dirilispostasi.com/rss/savunma-sanayi",
  },
];

export function cloneDefaultHmBreakingRssFeedRows() {
  return DEFAULT_HM_BREAKING_RSS_FEED_ROWS.map((row) => ({ ...row }));
}
