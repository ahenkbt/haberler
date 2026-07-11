export interface FeaturedTopic {
  title: string;
  emoji: string;
  desc: string;
  wikiTitle?: string;
}

/** Son satırı 3 sütunlu gridde dengelemek için ek konular */
export const FEATURED_ROW_FILLER: FeaturedTopic[] = [
  { title: "Bilim", emoji: "🔬", desc: "Evren, doğa ve yaşamı anlama çabası" },
  { title: "Teknoloji", emoji: "💡", desc: "Bilimsel bilginin pratik uygulamaları" },
];

export const DEFAULT_FEATURED: FeaturedTopic[] = [
  { title: "Türkiye", emoji: "🇹🇷", desc: "Resmi adı Türkiye Cumhuriyeti olan ülke" },
  { title: "Ankara", emoji: "🏛️", desc: "Türkiye Cumhuriyeti'nin başkenti" },
  { title: "İstanbul", emoji: "🏙️", desc: "Türkiye'nin en kalabalık şehri" },
  { title: "Mustafa Kemal Atatürk", emoji: "🎖️", desc: "Türkiye Cumhuriyeti'nin kurucusu" },
  { title: "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü", emoji: "🕯️", desc: "Çanakkale deniz zaferi ve şehitler" },
  { title: "İstiklâl Marşı", emoji: "🎵", desc: "Millî marşımız" },
  { title: "Kumyangjang-ni Muharebesi", emoji: "🎖️", desc: "Kore'de Türk tugayının zaferi" },
  { title: "Osmanlı İmparatorluğu", emoji: "📜", desc: "1299-1922 arası süren imparatorluk", wikiTitle: "Osmanlı İmparatorluğu" },
  { title: "Zafer Bayramı", emoji: "🏆", desc: "30 Ağustos zaferi", wikiTitle: "30 Ağustos Zafer Bayramı" },
  { title: "Cumhuriyet Bayramı", emoji: "🇹🇷", desc: "29 Ekim", wikiTitle: "29 Ekim Cumhuriyet Bayramı" },
  { title: "Yapay zekâ", emoji: "🤖", desc: "Bilgisayar biliminin araştırma alanı" },
  ...FEATURED_ROW_FILLER,
];

function topicKey(t: FeaturedTopic): string {
  return t.title.toLocaleLowerCase("tr-TR");
}

/** 3 sütunlu gridde son satırı orantılı tutar; DB'de 10 konu olsa bile doldurur. */
export function normalizeFeaturedGrid(topics: FeaturedTopic[]): FeaturedTopic[] {
  const base = topics.length > 0 ? topics : DEFAULT_FEATURED;
  const remainder = base.length % 3;
  if (remainder === 0) return base;

  const seen = new Set(base.map(topicKey));
  const pool = [...FEATURED_ROW_FILLER, ...DEFAULT_FEATURED].filter((t) => !seen.has(topicKey(t)));
  return [...base, ...pool.slice(0, 3 - remainder)];
}

export function topicWikiTitle(t: FeaturedTopic): string {
  return (t.wikiTitle || t.title).trim();
}
