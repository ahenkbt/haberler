/**
 * /bilgiagaci ana sayfasındaki statik linkler (öne çıkan konular + kategori örnekleri).
 * Bu başlıkların Vikipedi özetleri konum önbelleğine (location_wiki_cache, tür="topic")
 * tohumlanır; böylece /bilgiagaci ve linkleri DB'den servis edilir.
 *
 * Kaynak: ahenkpress/src/lib/wikiFeaturedTopics.ts + bilgiAgaciCategories.ts
 */

/** Öne çıkan konular (DEFAULT_FEATURED — wikiTitle öncelikli). */
const FEATURED_TOPIC_TITLES: string[] = [
  "Türkiye",
  "Ankara",
  "İstanbul",
  "Mustafa Kemal Atatürk",
  "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü",
  "İstiklâl Marşı",
  "Kumyangjang-ni Muharebesi",
  "Osmanlı İmparatorluğu",
  "30 Ağustos Zafer Bayramı",
  "29 Ekim Cumhuriyet Bayramı",
  "Yapay zekâ",
  "Bilim",
  "Teknoloji",
];

/** Kategori kartlarındaki örnek konular (bilgiAgaciCategories examples wikiTitle). */
const CATEGORY_EXAMPLE_TITLES: string[] = [
  // Gezi Seyahat
  "İstanbul", "Kapadokya", "Antalya", "Paris", "Roma", "Tokyo",
  // Bilim
  "Fizik", "Astronomi", "Biyoloji", "Kimya", "Matematik", "Kuantum mekaniği",
  // Tarih
  "Osmanlı İmparatorluğu", "Kurtuluş Savaşı", "Antik Çağ", "Roma İmparatorluğu",
  "Büyük Selçuklu İmparatorluğu", "Türkiye Cumhuriyeti tarihi",
  // Coğrafya
  "Türkiye", "Ankara", "İstanbul", "Anadolu", "Akdeniz", "Karadeniz", "Kapadokya",
  // Doğa
  "Orman", "Akdeniz iklimi", "Biyoçeşitlilik", "Ekosistem", "Yaban hayatı", "İklim değişikliği",
  // Teknoloji
  "Yapay zekâ", "İnternet", "Robotik", "Bilgisayar", "Siber güvenlik", "Uzay teknolojisi",
  // Kültür
  "Türk kültürü", "Mutfak", "Bayram", "Folklor", "Gelenek", "Anadolu",
  // Sanat
  "Edebiyat", "Müzik", "Mimarlık", "Resim", "Sinema", "Tiyatro",
  // Sağlık
  "Tıp", "Beslenme", "Bağışıklık sistemi", "Anatomi", "Halk sağlığı", "Psikoloji",
  // Ekonomi
  "Ekonomi", "Enflasyon", "Borsa", "Ticaret", "Girişimcilik", "Merkez bankası",
  // Spor
  "Futbol", "Olimpiyat Oyunları", "Basketbol", "Voleybol", "Atletizm", "Tenis",
  // Eğitim
  "Eğitim", "Üniversite", "Lise", "Yükseköğretim", "Öğretmen", "Pedagoji",
  // Felsefe
  "Felsefe", "Etik", "Mantık", "Platon", "Aristoteles", "Varoluşçuluk",
  // Medya
  "Gazetecilik", "Televizyon", "Radyo", "Basın", "Sosyal medya", "Haber",
];

/** Tekilleştirilmiş statik /bilgiagaci konu başlıkları. */
export const BILGI_AGACI_STATIC_TOPICS: string[] = Array.from(
  new Set(
    [...FEATURED_TOPIC_TITLES, ...CATEGORY_EXAMPLE_TITLES]
      .map((t) => t.trim())
      .filter(Boolean),
  ),
);
