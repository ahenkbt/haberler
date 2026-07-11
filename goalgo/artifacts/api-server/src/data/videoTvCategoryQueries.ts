/**
 * Kategori başına YouTube arama sorguları (Türkiye odaklı).
 * API ile kanal keşfi için kullanılır.
 */
export const VIDEO_TV_CATEGORY_SLUGS = [
  "haberler",
  "sinema",
  "dizi",
  "muzik",
  "oyun",
  "spor",
  "eglence",
  "komedi",
  "bilim",
  "teknoloji",
  "egitim",
  "seyahat",
  "otomobil",
  "evcil-hayvan",
  "doga",
  "nasil-yapilir",
  "vlog",
  "tarih",
  "saglik",
  "cocuk",
] as const;

export type VideoTvCategorySlug = (typeof VIDEO_TV_CATEGORY_SLUGS)[number];

export const CATEGORY_CHANNEL_SEARCH_QUERIES: Record<string, string[]> = {
  haberler: ["haber türkiye", "gündem türkiye", "son dakika haber", "canlı haber türkiye"],
  sinema: ["sinema türkiye", "film fragman türkçe", "box office türkiye", "netflix türkiye"],
  dizi: ["dizi türkiye", "yerli dizi", "dizi fragman türkçe", "puhutv dizi"],
  muzik: ["müzik türkiye", "türk pop resmi", "türkçe şarkı resmi", "netd müzik"],
  oyun: ["türk oyun kanalı", "minecraft türkiye", "valorant türkiye", "türk youtuber oyun"],
  spor: ["spor türkiye", "futbol türkiye", "bein sports türkiye", "spor haber"],
  eglence: ["eğlence türkiye", "türk youtuber", "challenge türkiye", "vlog eğlence"],
  komedi: ["komedi türkiye", "stand up türkiye", "mizah türkçe", "kafalar"],
  bilim: ["bilim türkiye", "popüler bilim türkçe", "evrim ağacı", "bilim kanalı türkçe"],
  teknoloji: ["teknoloji türkiye", "telefon inceleme türkçe", "yazılım türkiye", "donanım türkiye"],
  egitim: ["eğitim türkiye", "yks türkçe", "ders anlatım türkçe", "üniversite sınav"],
  seyahat: ["seyahat türkiye", "gezi vlog türkiye", "tatil türkiye", "turizm türkiye"],
  otomobil: ["otomobil türkiye", "araba inceleme türkçe", "motor türkiye", "otomobil haber"],
  "evcil-hayvan": ["evcil hayvan türkiye", "köpek eğitimi türkçe", "kedi türkiye", "hayvan belgesel"],
  doga: ["doğa belgesel türkçe", "national geographic türkiye", "wildlife türkçe", "belgesel türkiye"],
  "nasil-yapilir": ["yemek tarifi türkiye", "nasıl yapılır türkçe", "moda türkiye", "stil türkiye"],
  vlog: ["vlog türkiye", "günlük vlog türk", "lifestyle türkiye", "kişisel vlog"],
  tarih: ["tarih türkiye", "osmanlı tarihi türkçe", "türk tarihi kanal", "tarih belgesel"],
  saglik: ["sağlık türkiye", "doktor türkçe", "fitness türkiye", "beslenme türkçe"],
  cocuk: [
    "çocuk türkiye",
    "çizgi film türkçe",
    "eğitici çocuk türkçe",
    "trt çocuk",
    "youtube kids türkçe",
    "niloya türkçe",
    "rafadan tayfa",
    "çocuk şarkıları türkçe",
    "peppa pig türkçe",
    "cocomelon türkçe",
  ],
};

/** Podcast odaklı kanal araması — kategori başına */
export const CATEGORY_PODCAST_SEARCH_QUERIES: Record<string, string[]> = {
  haberler: ["haber podcast türkiye", "gündem podcast türkçe", "siyaset podcast"],
  sinema: ["sinema podcast türkiye", "film podcast türkçe"],
  dizi: ["dizi podcast türkiye", "dizi inceleme podcast"],
  muzik: ["müzik podcast türkiye", "sohbet podcast türkçe"],
  oyun: ["oyun podcast türkiye", "esports podcast türkçe"],
  spor: ["spor podcast türkiye", "futbol podcast türkçe"],
  eglence: ["eğlence podcast türkiye", "sohbet podcast türkçe", "101 podcast"],
  komedi: ["komedi podcast türkiye", "stand up podcast"],
  bilim: ["bilim podcast türkiye", "popüler bilim podcast"],
  teknoloji: ["teknoloji podcast türkiye", "yazılım podcast türkçe"],
  egitim: ["eğitim podcast türkiye", "kitap podcast türkçe"],
  seyahat: ["seyahat podcast türkiye", "gezi podcast"],
  otomobil: ["otomobil podcast türkiye", "araba podcast"],
  "evcil-hayvan": ["hayvan podcast türkiye", "veteriner podcast"],
  doga: ["doğa podcast türkiye", "belgesel podcast"],
  "nasil-yapilir": ["yemek podcast türkiye", "aşçı podcast"],
  vlog: ["vlog podcast türkiye", "günlük podcast"],
  tarih: ["tarih podcast türkiye", "osmanlı podcast"],
  saglik: ["sağlık podcast türkiye", "doktor podcast türkçe"],
  cocuk: ["çocuk podcast türkiye", "masal podcast"],
};

/** Shorts odaklı kanal araması */
export const CATEGORY_SHORTS_SEARCH_QUERIES: Record<string, string[]> = {
  muzik: ["shorts müzik türkiye", "türkçe shorts müzik"],
  spor: ["shorts spor türkiye", "futbol shorts türkçe"],
  eglence: ["shorts eğlence türkiye", "türk youtuber shorts"],
  komedi: ["shorts komedi türkiye", "mizah shorts"],
  oyun: ["shorts oyun türkiye", "gaming shorts türkçe"],
  haberler: ["shorts haber türkiye", "gündem shorts"],
  cocuk: ["shorts çocuk türkiye", "çizgi film shorts"],
};
