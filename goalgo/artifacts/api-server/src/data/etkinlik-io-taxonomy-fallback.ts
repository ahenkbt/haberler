/** Etkinlik.io V2 taxonomy fallback — API erişilemezken UI boş kalmasın diye. */
export type EtkinlikTaxonomyItem = { id: number; name: string; slug: string };

/** openapi.yaml örnekleri + yaygın kategoriler (canlı liste /categories ile güncellenir). */
export const ETKINLIK_IO_CATEGORIES_FALLBACK: EtkinlikTaxonomyItem[] = [
  { id: 1423, name: "Alternatif Müzik", slug: "alternatif-muzik" },
  { id: 456, name: "Bilişim", slug: "bilisim" },
  { id: 59, name: "Konser", slug: "konser" },
  { id: 4015, name: "Aşçılık ve Mutfak", slug: "ascilik-ve-mutfak" },
  { id: 120, name: "Spor", slug: "spor" },
  { id: 88, name: "Müze", slug: "muze" },
  { id: 210, name: "Sergi", slug: "sergi" },
  { id: 305, name: "Tiyatro", slug: "tiyatro" },
  { id: 412, name: "Sinema", slug: "sinema" },
  { id: 501, name: "Festival", slug: "festival" },
  { id: 620, name: "Stand-up", slug: "stand-up" },
  { id: 730, name: "Çocuk", slug: "cocuk" },
  { id: 840, name: "Eğitim", slug: "egitim" },
  { id: 950, name: "Workshop", slug: "workshop" },
];

export const ETKINLIK_IO_FORMATS_FALLBACK: EtkinlikTaxonomyItem[] = [
  { id: 15, name: "Çalıştay", slug: "calistay" },
  { id: 5, name: "Eğitim", slug: "egitim" },
  { id: 21, name: "Konferans", slug: "konferans" },
  { id: 8, name: "Konser", slug: "konser" },
  { id: 12, name: "Festival", slug: "festival" },
  { id: 3, name: "Sergi", slug: "sergi" },
  { id: 18, name: "Tiyatro", slug: "tiyatro" },
  { id: 9, name: "Spor", slug: "spor" },
];

/** Yekpare vitrininde ekstra kartlar — etkinlik.io dışı partner yönlendirmeleri. */
export const YEKPARE_ETKINLIK_EXTRAS: EtkinlikTaxonomyItem[] = [
  { id: -1, name: "Rehberli Tur", slug: "yekpare-rehberli-tur" },
  { id: -2, name: "Doğa Aktivitesi", slug: "yekpare-doga" },
  { id: -3, name: "Tema Park", slug: "yekpare-tema-park" },
];
