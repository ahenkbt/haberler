/** Admin + gezinme — Video TV ile uyumlu tam kategori listesi */
export const CATEGORY_LABELS: Record<string, string> = {
  haberler: "Haberler ve Politika",
  sinema: "Film ve Animasyon",
  dizi: "Dizi",
  "film-dizi": "Canlı Film & Dizi",
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
  "cocuk-animasyon": "Çocuk Animasyon",
  aktivizm: "STK ve Aktivizm",
  belgesel: "Belgesel",
  podcast: "Podcast",
  yemek: "Yemek",
  haber: "Haber",
  yasam: "Yaşam",
};

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export { videoThumbUrl, youtubeThumbCandidates } from "@/components/VideoThumb";
export type { ThumbQuality } from "@/components/VideoThumb";

export function decodeHtml(text: string): string {
  if (typeof document === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}
