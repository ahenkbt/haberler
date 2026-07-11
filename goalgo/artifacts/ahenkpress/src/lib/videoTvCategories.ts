/**

 * Video TV: haber sitesi RSS kategorilerinden ayrı içerik sınıflandırması.

 * Admin kaynak formu, /yektube ve /video-galeri bu listeyle uyumlu olmalı.

 */



/** Sol menü / şeritte gösterilmeyecek haber RSS slugları (Video TV kategorisi değil) */

export const EXCLUDED_FROM_VIDEO_TV_NAV = new Set([

  "haber",

  "gundem",

  "ekonomi",

  "magazin",

  "dunya",

]);



/** Video TV gezinme sırası — YouTube ana kategorileriyle uyumlu */

export const VIDEO_TV_NAV_SLUGS = [

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



export type VideoTvNavSlug = (typeof VIDEO_TV_NAV_SLUGS)[number];



export const VIDEO_TV_CATEGORY_LABELS: Record<string, string> = {

  haberler: "Haberler ve Politika",

  sinema: "Film ve Animasyon",

  dizi: "Dizi",

  muzik: "Müzik",

  oyun: "Oyun",

  spor: "Spor",

  eglence: "Eğlence",

  komedi: "Komedi",

  bilim: "Bilim",

  teknoloji: "Bilim ve Teknoloji",

  egitim: "Eğitim",

  seyahat: "Seyahat ve Etkinlikler",

  otomobil: "Otomobiller ve Araçlar",

  "evcil-hayvan": "Evcil Hayvanlar",

  doga: "Doğa",

  "nasil-yapilir": "Nasıl Yapılır ve Stil",

  vlog: "Kişiler ve Bloglar",

  tarih: "Tarih",

  saglik: "Sağlık",

  cocuk: "Çocuk",

  aktivizm: "STK ve Aktivizm",

};



export const VIDEO_TV_CATEGORY_COLORS: Record<string, string> = {

  haberler: "#039D55",

  sinema: "#1565c0",

  dizi: "#ad1457",

  muzik: "#c62828",

  oyun: "#7b1fa2",

  spor: "#1976d2",

  eglence: "#e65100",

  komedi: "#f9a825",

  bilim: "#0288d1",

  teknoloji: "#00838f",

  egitim: "#4527a0",

  seyahat: "#558b2f",

  otomobil: "#37474f",

  "evcil-hayvan": "#6d4c41",

  doga: "#2e7d32",

  "nasil-yapilir": "#d81b60",

  vlog: "#5e35b1",

  tarih: "#6a1b9a",

  saglik: "#00838f",

  cocuk: "#f57c00",

  aktivizm: "#455a64",

};



export function slugifyVideoTvCategory(value: string): string {

  return value

    .trim()

    .toLowerCase()

    .replace(/ğ/g, "g")

    .replace(/ü/g, "u")

    .replace(/ş/g, "s")

    .replace(/ı/g, "i")

    .replace(/ö/g, "o")

    .replace(/ç/g, "c")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "");

}



/** Admin “Kategori” seçimi — haber RSS slugları yok */

export const VIDEO_TV_ADMIN_CATEGORY_OPTIONS: { value: string; label: string }[] = VIDEO_TV_NAV_SLUGS.map(

  (slug) => ({

    value: slug,

    label: VIDEO_TV_CATEGORY_LABELS[slug] ?? slug,

  }),

);



/** Sabit sıra + kaynaklardan gelen ek sluglar (admin özel kategori vb.) */

export function buildVideoTvNavSlugs(sourceCategorySlugs: string[]): string[] {

  const seen = new Set<string>();

  const out: string[] = [];

  for (const slug of VIDEO_TV_NAV_SLUGS) {

    if (EXCLUDED_FROM_VIDEO_TV_NAV.has(slug) || seen.has(slug)) continue;

    seen.add(slug);

    out.push(slug);

  }

  for (const raw of sourceCategorySlugs) {

    const slug = slugifyVideoTvCategory(raw);

    if (!slug || EXCLUDED_FROM_VIDEO_TV_NAV.has(slug) || seen.has(slug)) continue;

    seen.add(slug);

    out.push(slug);

  }

  return out;

}


