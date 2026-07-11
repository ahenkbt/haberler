/**
 * Türkçe hit sosyal medya kazıma — popüler TR hesapları ve hashtag'ler.
 * Videolar indirilmez; meta + kaynak URL ile Yekçek akışına eklenir.
 */

export type SocialHitPreset = {
  handle: string;
  name: string;
  categorySlug: string;
};

export const TURKISH_INSTAGRAM_HIT_ACCOUNTS: SocialHitPreset[] = [
  { handle: "cnnturk", name: "CNN Türk", categorySlug: "haberler" },
  { handle: "ntv", name: "NTV", categorySlug: "haberler" },
  { handle: "trthaber", name: "TRT Haber", categorySlug: "haberler" },
  { handle: "haberturk", name: "Habertürk", categorySlug: "haberler" },
  { handle: "sozcu.com.tr", name: "Sözcü", categorySlug: "haberler" },
  { handle: "ahaber", name: "A Haber", categorySlug: "haberler" },
  { handle: "fanatikcomtr", name: "Fanatik", categorySlug: "spor" },
  { handle: "sporx", name: "Sporx", categorySlug: "spor" },
  { handle: "fenerbahce", name: "Fenerbahçe", categorySlug: "spor" },
  { handle: "galatasaray", name: "Galatasaray", categorySlug: "spor" },
  { handle: "besiktas", name: "Beşiktaş", categorySlug: "spor" },
  { handle: "trtspor", name: "TRT Spor", categorySlug: "spor" },
  { handle: "mynet", name: "Mynet", categorySlug: "eglence" },
  { handle: "magazinnotu", name: "Magazin Notu", categorySlug: "eglence" },
  { handle: "blutv", name: "bluTV", categorySlug: "dizi" },
  { handle: "puhutv", name: "puhutv", categorySlug: "dizi" },
  { handle: "netflixturkiye", name: "Netflix Türkiye", categorySlug: "sinema" },
  { handle: "cagla.sikel", name: "Çağla Şikel", categorySlug: "yasam" },
  { handle: "hadise", name: "Hadise", categorySlug: "muzik" },
  { handle: "tarkan", name: "Tarkan", categorySlug: "muzik" },
];

export const TURKISH_TIKTOK_HIT_ACCOUNTS: SocialHitPreset[] = [
  { handle: "cnnturk", name: "CNN Türk", categorySlug: "haberler" },
  { handle: "ntv", name: "NTV", categorySlug: "haberler" },
  { handle: "trthaber", name: "TRT Haber", categorySlug: "haberler" },
  { handle: "haberturk", name: "Habertürk", categorySlug: "haberler" },
  { handle: "fanatik", name: "Fanatik", categorySlug: "spor" },
  { handle: "sporx", name: "Sporx", categorySlug: "spor" },
  { handle: "fenerbahce", name: "Fenerbahçe", categorySlug: "spor" },
  { handle: "galatasaray", name: "Galatasaray", categorySlug: "spor" },
  { handle: "besiktas", name: "Beşiktaş", categorySlug: "spor" },
  { handle: "trtspor", name: "TRT Spor", categorySlug: "spor" },
  { handle: "mynet", name: "Mynet", categorySlug: "eglence" },
  { handle: "blutv", name: "bluTV", categorySlug: "dizi" },
  { handle: "puhutv", name: "puhutv", categorySlug: "dizi" },
  { handle: "netflixturkiye", name: "Netflix Türkiye", categorySlug: "sinema" },
  { handle: "hadise", name: "Hadise", categorySlug: "muzik" },
  { handle: "tarkan", name: "Tarkan", categorySlug: "muzik" },
];

/** Türkçe keşfet / gündem hashtag'leri */
export const TURKISH_SOCIAL_HASHTAGS = [
  "turkiye",
  "turkiyem",
  "kesfet",
  "gundem",
  "haber",
  "spor",
  "muzik",
  "turkish",
  "turkce",
  "fyp",
  "viral",
  "komedi",
  "istanbul",
  "ankara",
  "izmir",
] as const;

export const SOCIAL_HIT_SOURCE_KEYS = {
  instagram: "__ig_tr_hit__",
  tiktok: "__tt_tr_hit__",
} as const;
