import {
  buildRotatedFallbackDaily,
  fetchWikiHomepageFeed,
  hasWikiDailyBlocks,
  type WikiHomepageFeed,
} from "@/lib/wikiHomepageFeed";
import { getTurkeyDateKey, pickDailyItem, turkeyMonthDayKey } from "@/lib/wikiDailyRotation";

export type BilgiAgaciDailySlotKind = "sehir" | "konu" | "kisi" | "bitki" | "gunluk";

export type BilgiAgaciCategoryId =
  | "gezi-seyahat"
  | "bilim"
  | "tarih"
  | "cografya"
  | "doga"
  | "teknoloji"
  | "kultur"
  | "sanat"
  | "saglik"
  | "ekonomi"
  | "spor"
  | "edebiyat"
  | "muzik"
  | "gastronomi"
  | "mimari"
  | "din"
  | "felsefe";

export type BilgiAgaciCategoryDef = {
  id: BilgiAgaciCategoryId;
  title: string;
  slug: string;
  icon: string;
  articles: PoolEntry[];
};

export type BilgiAgaciDailyItem = {
  slotKind: BilgiAgaciDailySlotKind;
  slotLabel: string;
  title: string;
  wikiTitle: string;
  categoryId: BilgiAgaciCategoryId;
  categoryTitle: string;
  categorySlug: string;
  categoryIcon: string;
};

type PoolEntry = { title: string; wikiTitle?: string; text?: string };

function article(title: string, wikiTitle?: string): PoolEntry {
  return wikiTitle ? { title, wikiTitle } : { title };
}

/** Konu slotu — yalnızca Türkiye'ye özgü tarihî konular. */
export const TURKEY_HISTORY_TOPICS: PoolEntry[] = [
  { title: "Kurtuluş Savaşı" },
  { title: "Osmanlı İmparatorluğu" },
  { title: "Çanakkale Savaşı" },
  { title: "Lozan Antlaşması" },
  { title: "Türk devletleri tarihi" },
  { title: "Malazgirt Savaşı" },
  { title: "İstanbul'un Fethi" },
  { title: "Türkiye Büyük Millet Meclisi" },
  { title: "Türkiye Cumhuriyeti'nin ilanı" },
  { title: "Anadolu Selçuklu Devleti" },
  { title: "Göktürk Kağanlığı" },
  { title: "Büyük Taarruz" },
  { title: "Sakarya Meydan Muharebesi" },
  { title: "Mondros Ateşkes Antlaşması" },
  { title: "Sevr Antlaşması" },
  { title: "Türk İnkılabı" },
  { title: "Saltanatın kaldırılması (1922)" },
  { title: "Halifeliğin kaldırılması" },
  { title: "Trablusgarp Savaşı" },
  { title: "Balkan Savaşları" },
  { title: "Tanzimat" },
  { title: "Meşrutiyet" },
  { title: "31 Mart Olayı" },
  { title: "Hititler" },
  { title: "Frigya" },
  { title: "Lidya" },
  { title: "Truva" },
  { title: "Erzurum Kongresi" },
  { title: "Sivas Kongresi" },
  { title: "Amasya Genelgesi" },
  { title: "Misak-ı Millî" },
  { title: "TBMM'nin açılışı" },
  { title: "Kars Antlaşması (1921)" },
  { title: "Mudanya Ateşkes Antlaşması" },
  { title: "Kapitülasyonların kaldırılması" },
  { title: "Harf Devrimi" },
  { title: "Kıbrıs Barış Harekâtı" },
];

/** Bitki slotu — Türkiye'ye özgü veya Anadolu florası. */
export const TURKEY_FLORA: PoolEntry[] = [
  { title: "Zeytin", wikiTitle: "Zeytin" },
  { title: "Ayçiçeği", wikiTitle: "Ayçiçeği" },
  { title: "Fındık", wikiTitle: "Fındık" },
  { title: "İncir", wikiTitle: "İncir" },
  { title: "Nar", wikiTitle: "Nar" },
  { title: "Kayısı", wikiTitle: "Kayısı" },
  { title: "Antep fıstığı", wikiTitle: "Antep fıstığı" },
  { title: "Kekik", wikiTitle: "Kekik" },
  { title: "Defne", wikiTitle: "Defne" },
  { title: "Safran", wikiTitle: "Safran" },
  { title: "Pamuk", wikiTitle: "Pamuk" },
  { title: "Buğday", wikiTitle: "Buğday" },
  { title: "Anadolu selvisi", wikiTitle: "Cupressus sempervirens" },
  { title: "Sümbül", wikiTitle: "Sümbül" },
  { title: "Isparta lavantası", wikiTitle: "Lavanta" },
  { title: "Anadolu dağ çiçeği", wikiTitle: "Cyclamen coum" },
  { title: "Anadolu lalesi", wikiTitle: "Tulipa armena" },
  { title: "Menengiç", wikiTitle: "Menengiç" },
  { title: "Sumak", wikiTitle: "Sumak" },
  { title: "Biberiye", wikiTitle: "Biberiye" },
];

type WorldOnThisDayEntry = PoolEntry & { monthDay?: string; text?: string };

/** Tarihte bugün slotu — dünya / genel tarih (Türkiye'ye özgü değil). */
export const WORLD_ON_THIS_DAY_TOPICS: WorldOnThisDayEntry[] = [
  { text: "1 Ocak — Gregoryen takviminin yürürlüğe girmesi", title: "Gregoryen takvim", wikiTitle: "Gregoryen takvim", monthDay: "01-01" },
  { text: "14 Temmuz — Bastille'in ele geçirilmesi", title: "Fransız Devrimi", wikiTitle: "Fransız Devrimi", monthDay: "07-14" },
  { text: "4 Temmuz — ABD Bağımsızlık Bildirgesi", title: "Amerikan Bağımsızlık Bildirgesi", wikiTitle: "Amerikan Bağımsızlık Bildirgesi", monthDay: "07-04" },
  { text: "9 Kasım — Berlin Duvarı'nın yıkılması", title: "Berlin Duvarı", wikiTitle: "Berlin Duvarı", monthDay: "11-09" },
  { text: "20 Temmuz — Apollo 11 Ay'a inişi", title: "Apollo 11", wikiTitle: "Apollo 11", monthDay: "07-20" },
  { text: "12 Nisan — Yuri Gagarin'in uzaya çıkışı", title: "Vostok 1", wikiTitle: "Vostok 1", monthDay: "04-12" },
  { text: "11 Eylül — Dünya Ticaret Merkezi saldırıları", title: "11 Eylül saldırıları", wikiTitle: "11 Eylül saldırıları", monthDay: "09-11" },
  { text: "26 Aralık — Güneş sisteminin keşfi (Kepler)", title: "Johannes Kepler", wikiTitle: "Johannes Kepler", monthDay: "12-26" },
  { text: "16 Haziran — İlk kadın uzay yolcusu Valentina Tereshkova", title: "Valentina Tereshkova", wikiTitle: "Valentina Tereshkova", monthDay: "06-16" },
  { text: "28 Ekim — New York Özgürlük Anıtı'nın açılışı", title: "Özgürlük Anıtı", wikiTitle: "Özgürlük Anıtı", monthDay: "10-28" },
  { text: "15 Nisan — Titanic'in batışı", title: "RMS Titanic", wikiTitle: "RMS Titanic", monthDay: "04-15" },
  { text: "6 Ağustos — Hiroşima'ya atom bombası", title: "Hiroşima'ya atom bombası saldırısı", wikiTitle: "Hiroşima'ya atom bombası saldırısı", monthDay: "08-06" },
  { text: "22 Kasım — John F. Kennedy suikastı", title: "John F. Kennedy suikastı", wikiTitle: "John F. Kennedy suikastı", monthDay: "11-22" },
  { text: "24 Ekim — Birleşmiş Milletler'in kuruluşu", title: "Birleşmiş Milletler", wikiTitle: "Birleşmiş Milletler", monthDay: "10-24" },
  { text: "8 Mayıs — II. Dünya Savaşı'nın Avrupa'da sona ermesi", title: "II. Dünya Savaşı", wikiTitle: "II. Dünya Savaşı", monthDay: "05-08" },
  { text: "18 Mart — Einstein'ın görelilik teorisini açıklaması", title: "Görelilik kuramı", wikiTitle: "Görelilik kuramı", monthDay: "03-18" },
  { text: "5 Kasım — Guy Fawkes ve İngiltere Parlamentosu komplosu", title: "Gunpowder Plot", wikiTitle: "Gunpowder Plot", monthDay: "11-05" },
  { text: "25 Aralık — Isaac Newton'un doğumu", title: "Isaac Newton", wikiTitle: "Isaac Newton", monthDay: "12-25" },
  { text: "21 Temmuz — İnsanlığın Ay'a ayak basması", title: "Ay", wikiTitle: "Ay", monthDay: "07-21" },
  { text: "17 Mart — Saint Patrick's Day", title: "Aziz Patrick Günü", wikiTitle: "Aziz Patrick Günü", monthDay: "03-17" },
  { title: "Sanayi Devrimi", wikiTitle: "Sanayi Devrimi" },
  { title: "Rönesans", wikiTitle: "Rönesans" },
  { title: "Aydınlanma Çağı", wikiTitle: "Aydınlanma Çağı" },
  { title: "Fransız Devrimi", wikiTitle: "Fransız Devrimi" },
  { title: "Amerikan Bağımsızlık Savaşı", wikiTitle: "Amerikan Bağımsızlık Savaşı" },
  { title: "I. Dünya Savaşı", wikiTitle: "I. Dünya Savaşı" },
  { title: "II. Dünya Savaşı", wikiTitle: "II. Dünya Savaşı" },
  { title: "Soğuk Savaş", wikiTitle: "Soğuk Savaş" },
  { title: "Berlin Duvarı", wikiTitle: "Berlin Duvarı" },
  { title: "Apollo 11", wikiTitle: "Apollo 11" },
  { title: "Magna Carta", wikiTitle: "Magna Carta" },
  { title: "Napolyon Bonapart", wikiTitle: "Napolyon Bonapart" },
  { title: "Kristof Kolomb", wikiTitle: "Kristof Kolomb" },
  { title: "Galileo Galilei", wikiTitle: "Galileo Galilei" },
  { title: "Charles Darwin", wikiTitle: "Charles Darwin" },
  { title: "Albert Einstein", wikiTitle: "Albert Einstein" },
  { title: "Marie Curie", wikiTitle: "Marie Curie" },
  { title: "Martin Luther King", wikiTitle: "Martin Luther King" },
  { title: "Nelson Mandela", wikiTitle: "Nelson Mandela" },
  { title: "Mısır piramitleri", wikiTitle: "Mısır piramitleri" },
  { title: "Roma İmparatorluğu", wikiTitle: "Roma İmparatorluğu" },
  { title: "Bizans İmparatorluğu", wikiTitle: "Bizans İmparatorluğu" },
  { title: "Haçlı Seferleri", wikiTitle: "Haçlı Seferleri" },
  { title: "Coğrafi keşifler", wikiTitle: "Coğrafi keşifler" },
];

const TURKISH_CITY_POOL: PoolEntry[] = [
  article("Ankara"),
  article("İstanbul"),
  article("İzmir"),
  article("Antalya"),
  article("Bursa"),
  article("Trabzon"),
  article("Konya"),
  article("Eskişehir"),
  article("Gaziantep"),
  article("Adana"),
  article("Samsun"),
  article("Kayseri"),
  article("Mardin"),
  article("Van"),
  article("Edirne"),
  article("Diyarbakır"),
  article("Şanlıurfa"),
  article("Rize"),
  article("Muğla"),
  article("Çanakkale"),
];

const TURKISH_PERSON_POOL: PoolEntry[] = [
  article("Mustafa Kemal Atatürk"),
  article("Fatih Sultan Mehmet"),
  article("Mevlana"),
  article("Yunus Emre"),
  article("Nazım Hikmet"),
  article("Barış Manço"),
  article("Aziz Sancar"),
  article("Orhan Pamuk"),
  article("Fazıl Say"),
  article("Nene Hatun"),
  article("Halide Edip Adıvar"),
  article("Cahit Arf"),
  article("Yaşar Kemal"),
  article("Elif Şafak"),
  article("Nuri Bilge Ceylan"),
  article("Zeki Müren"),
  article("Tarkan"),
  article("Hacı Bektaş Veli"),
];

/** Kategori havuzları — Türkiye ve genel Vikipedi maddeleri. */
export const BILGI_AGACI_CATEGORIES: BilgiAgaciCategoryDef[] = [
  {
    id: "gezi-seyahat",
    title: "Gezi Seyahat",
    slug: "gezi-seyahat",
    icon: "🧭",
    articles: [
      article("Kapadokya"),
      article("Pamukkale"),
      article("Efes"),
      article("Antalya"),
      article("İstanbul"),
      article("Bodrum"),
      article("Safranbolu"),
      article("Göreme"),
      article("Nemrut Dağı"),
      article("Sumela Manastırı"),
      article("Uludağ"),
      article("Kaş"),
      article("Fethiye"),
      article("Çeşme"),
      article("Ayder Yaylası"),
      article("Göbeklitepe"),
      article("Aspendos"),
      article("Side"),
      article("Alaçatı"),
      article("Uzungöl"),
      article("Patara"),
      article("Olympos"),
      article("Sultanahmet"),
      article("Galata Kulesi"),
      article("Topkapı Sarayı"),
    ],
  },
  {
    id: "bilim",
    title: "Bilim",
    slug: "bilim",
    icon: "🔬",
    articles: [
      article("Fizik"),
      article("Kimya"),
      article("Biyoloji"),
      article("Astronomi"),
      article("Matematik"),
      article("Kuantum mekaniği"),
      article("Evrim"),
      article("DNA"),
      article("Görelilik kuramı"),
      article("Periyodik tablo"),
      article("Hücre"),
      article("Fotosentez"),
      article("Yerçekimi"),
      article("Elektromanyetizma"),
      article("Genetik"),
      article("Büyük patlama"),
      article("Kara delik"),
      article("Aziz Sancar"),
      article("Cahit Arf"),
      article("TÜBİTAK"),
      article("CERN"),
      article("Nobel Ödülü"),
      article("Bilimsel yöntem"),
    ],
  },
  {
    id: "tarih",
    title: "Tarih",
    slug: "tarih",
    icon: "🏛️",
    articles: [...TURKEY_HISTORY_TOPICS],
  },
  {
    id: "cografya",
    title: "Coğrafya",
    slug: "cografya",
    icon: "🗺️",
    articles: [
      ...TURKISH_CITY_POOL,
      article("Türkiye"),
      article("Anadolu"),
      article("Akdeniz"),
      article("Karadeniz"),
      article("Ege Denizi"),
      article("Marmara Denizi"),
      article("Van Gölü"),
      article("Tuz Gölü"),
      article("Boğaziçi"),
      article("İstanbul Boğazı"),
      article("Toros Dağları"),
      article("Kaçkar Dağları"),
      article("Aras Nehri"),
      article("Fırat"),
      article("Dicle"),
      article("Kızılırmak"),
    ],
  },
  {
    id: "doga",
    title: "Doğa",
    slug: "doga",
    icon: "🌿",
    articles: [
      ...TURKEY_FLORA,
      article("Orman"),
      article("Biyoçeşitlilik"),
      article("Ekosistem"),
      article("İklim değişikliği"),
      article("Akdeniz iklimi"),
      article("Karadeniz iklimi"),
      article("Kurt"),
      article("Anadolu leoparı"),
      article("Flamingo"),
      article("Caretta caretta"),
      article("Kızılırmak Deltası"),
      article("Yaban keçisi"),
      article("Kartal"),
    ],
  },
  {
    id: "teknoloji",
    title: "Teknoloji",
    slug: "teknoloji",
    icon: "💡",
    articles: [
      article("Yapay zekâ"),
      article("İnternet"),
      article("Bilgisayar"),
      article("Robotik"),
      article("Siber güvenlik"),
      article("Uzay teknolojisi"),
      article("Akıllı telefon"),
      article("Yazılım"),
      article("Açık kaynak"),
      article("Blockchain"),
      article("5G"),
      article("Elektrikli otomobil"),
      article("3D yazıcı"),
      article("Bulut bilişim"),
      article("Makine öğrenmesi"),
      article("TÜBİTAK"),
      article("ASELSAN"),
      article("Baykar"),
      article("TUSAŞ"),
      article("TÜBİTAK UZAY"),
    ],
  },
  {
    id: "kultur",
    title: "Kültür",
    slug: "kultur",
    icon: "🎭",
    articles: [
      ...TURKISH_PERSON_POOL,
      article("Türk kültürü"),
      article("Türk mutfağı"),
      article("Türk dili"),
      article("Folklor"),
      article("Bayram"),
      article("Gelenek"),
      article("Anadolu"),
      article("Horon"),
      article("Zeybek"),
      article("Karagöz ve Hacivat"),
      article("Hacı Bektaş Veli"),
      article("Türk halk müziği"),
      article("Semah"),
      article("Düğün"),
    ],
  },
  {
    id: "sanat",
    title: "Sanat",
    slug: "sanat",
    icon: "🎨",
    articles: [
      article("Resim"),
      article("Müzik"),
      article("Sinema"),
      article("Tiyatro"),
      article("Heykel"),
      article("Opera"),
      article("Bale"),
      article("Fotoğraf"),
      article("Osman Hamdi Bey"),
      article("İbrahim Calli"),
      article("Abidin Dino"),
      article("Nuri Bilge Ceylan"),
      article("Orhan Pamuk"),
      article("Fazıl Say"),
      article("Topkapı Sarayı"),
      article("Ayasofya"),
      article("İznik çini"),
      article("Ebru"),
      article("Minyatür"),
      article("Çini"),
    ],
  },
  {
    id: "saglik",
    title: "Sağlık",
    slug: "saglik",
    icon: "⚕️",
    articles: [
      article("Tıp"),
      article("Beslenme"),
      article("Anatomi"),
      article("Bağışıklık sistemi"),
      article("Halk sağlığı"),
      article("Psikoloji"),
      article("Hastane"),
      article("Aşı"),
      article("Antibiyotik"),
      article("Kalp"),
      article("Beyin"),
      article("Diyabet"),
      article("Kanser"),
      article("Egzersiz"),
      article("Uyku"),
      article("Stres"),
      article("Sağlıklı yaşam"),
      article("Sağlık Bakanlığı (Türkiye)", "Sağlık Bakanlığı (Türkiye)"),
    ],
  },
  {
    id: "ekonomi",
    title: "Ekonomi",
    slug: "ekonomi",
    icon: "📈",
    articles: [
      article("Ekonomi"),
      article("Enflasyon"),
      article("Borsa"),
      article("Ticaret"),
      article("Girişimcilik"),
      article("Merkez bankası"),
      article("Türkiye Cumhuriyet Merkez Bankası"),
      article("Döviz kuru"),
      article("Sanayi"),
      article("Tarım"),
      article("İhracat"),
      article("Turizm"),
      article("KOBİ"),
      article("Vergi"),
      article("Bütçe"),
      article("Gayri safi yurtiçi hasıla"),
      article("İşsizlik"),
      article("Tüketici fiyat endeksi"),
    ],
  },
  {
    id: "spor",
    title: "Spor",
    slug: "spor",
    icon: "🏅",
    articles: [
      article("Futbol"),
      article("Basketbol"),
      article("Voleybol"),
      article("Tenis"),
      article("Atletizm"),
      article("Olimpiyat Oyunları"),
      article("Dünya Kupası"),
      article("Galatasaray SK"),
      article("Fenerbahçe SK"),
      article("Beşiktaş JK"),
      article("Trabzonspor"),
      article("Milli takım"),
      article("Türkiye millî futbol takımı"),
      article("Halter"),
      article("Güreş"),
      article("Yüzme"),
      article("Formula 1"),
      article("Bisiklet"),
    ],
  },
  {
    id: "edebiyat",
    title: "Edebiyat",
    slug: "edebiyat",
    icon: "📚",
    articles: [
      article("Roman"),
      article("Şiir"),
      article("Türk edebiyatı"),
      article("Orhan Pamuk"),
      article("Yaşar Kemal"),
      article("Nazım Hikmet"),
      article("Halide Edip Adıvar"),
      article("Yunus Emre"),
      article("Fuzuli"),
      article("Namık Kemal"),
      article("Tevfik Fikret"),
      article("Sabahattin Ali"),
      article("Elif Şafak"),
      article("Ahmet Hamdi Tanpınar"),
      article("Dostoyevski"),
      article("Shakespeare"),
      article("Homeros"),
      article("Divan edebiyatı"),
    ],
  },
  {
    id: "muzik",
    title: "Müzik",
    slug: "muzik",
    icon: "🎵",
    articles: [
      article("Müzik"),
      article("Türk halk müziği"),
      article("Türk sanat müziği"),
      article("Barış Manço"),
      article("Sezen Aksu"),
      article("Tarkan"),
      article("Zeki Müren"),
      article("Fazıl Say"),
      article("Mozart"),
      article("Beethoven"),
      article("Caz"),
      article("Rock müziği"),
      article("Pop müziği"),
      article("Klasik müzik"),
      article("Opera"),
      article("Bağlama"),
      article("Ney"),
      article("Kemençe"),
    ],
  },
  {
    id: "gastronomi",
    title: "Gastronomi",
    slug: "gastronomi",
    icon: "🍽️",
    articles: [
      article("Türk mutfağı"),
      article("Kebap"),
      article("Baklava"),
      article("Lahmacun"),
      article("Mantı"),
      article("Döner"),
      article("İskender kebap"),
      article("Adana kebabı"),
      article("Menemen"),
      article("Künefe"),
      article("Lokum"),
      article("Ayran"),
      article("Turşu"),
      article("Zeytinyağı"),
      article("Bal"),
      article("Peynir"),
      article("Simit"),
      article("Börek"),
    ],
  },
  {
    id: "mimari",
    title: "Mimari",
    slug: "mimari",
    icon: "🏗️",
    articles: [
      article("Mimarlık"),
      article("Ayasofya"),
      article("Sultanahmet Camii"),
      article("Selimiye Camii"),
      article("Topkapı Sarayı"),
      article("Dolmabahçe Sarayı"),
      article("Galata Kulesi"),
      article("Anıtkabir"),
      article("Mimar Sinan"),
      article("Osmanlı mimarisi"),
      article("Selçuklu mimarisi"),
      article("Bizans mimarisi"),
      article("Gotik mimari"),
      article("Modern mimari"),
      article("Brutalizm"),
      article("Süleymaniye Camii"),
      article("Yerebatan Sarnıcı"),
      article("Aspendos"),
    ],
  },
  {
    id: "din",
    title: "Din",
    slug: "din",
    icon: "🕌",
    articles: [
      article("İslam"),
      article("Hristiyanlık"),
      article("Yahudilik"),
      article("Budizm"),
      article("Hinduizm"),
      article("Kur'an"),
      article("Hz. Muhammed"),
      article("Mevlana"),
      article("Hacı Bektaş Veli"),
      article("Camii"),
      article("Kilise"),
      article("Sinagog"),
      article("Ramazan"),
      article("Kurban Bayramı"),
      article("Hac"),
      article("Oruç"),
      article("Diyanet İşleri Başkanlığı"),
      article("Tasavvuf"),
    ],
  },
  {
    id: "felsefe",
    title: "Felsefe",
    slug: "felsefe",
    icon: "💭",
    articles: [
      article("Felsefe"),
      article("Etik"),
      article("Mantık"),
      article("Epistemoloji"),
      article("Platon"),
      article("Aristoteles"),
      article("Sokrates"),
      article("Descartes"),
      article("Kant"),
      article("Nietzsche"),
      article("Sartre"),
      article("Varoluşçuluk"),
      article("Stoacılık"),
      article("Farabi"),
      article("İbn Sina"),
      article("Mevlana"),
      article("Aydınlanma Çağı"),
      article("Utilitarizm"),
    ],
  },
];

/** Günlük 5. sekme — sabit 4 kategori dışındaki havuzlar. */
const ROTATING_CATEGORY_IDS: BilgiAgaciCategoryId[] = [
  "gezi-seyahat",
  "bilim",
  "teknoloji",
  "sanat",
  "saglik",
  "ekonomi",
  "spor",
  "edebiyat",
  "muzik",
  "gastronomi",
  "mimari",
  "din",
  "felsefe",
];

const SLOT_CATEGORY_MAP: Record<
  Exclude<BilgiAgaciDailySlotKind, "gunluk">,
  { categoryId: BilgiAgaciCategoryId; pool: PoolEntry[]; slotLabel: string }
> = {
  sehir: { categoryId: "cografya", pool: TURKISH_CITY_POOL, slotLabel: "Şehir" },
  konu: { categoryId: "tarih", pool: TURKEY_HISTORY_TOPICS, slotLabel: "Konu" },
  kisi: { categoryId: "kultur", pool: TURKISH_PERSON_POOL, slotLabel: "Günün kişisi" },
  bitki: { categoryId: "doga", pool: TURKEY_FLORA, slotLabel: "Bitki" },
};

const FIFTH_SLOT_ROTATION: Array<{
  label: string;
  categoryId: BilgiAgaciCategoryId;
  resolve: (feed: WikiHomepageFeed, dateKey: string) => PoolEntry | null;
}> = [
  {
    label: "Günün Seçilmiş İçeriği",
    categoryId: "bilim",
    resolve: (feed) =>
      feed.featuredArticle?.title
        ? { title: feed.featuredArticle.title, wikiTitle: feed.featuredArticle.title }
        : null,
  },
  {
    label: "Günün kaliteli maddesi",
    categoryId: "edebiyat",
    resolve: (feed) =>
      feed.goodArticle?.title
        ? { title: feed.goodArticle.title, wikiTitle: feed.goodArticle.title }
        : null,
  },
  {
    label: "Günün görseli",
    categoryId: "sanat",
    resolve: (feed) =>
      feed.featuredPicture?.wikiTitle || feed.featuredPicture?.title
        ? {
            title: feed.featuredPicture!.title,
            wikiTitle: feed.featuredPicture!.wikiTitle ?? feed.featuredPicture!.title,
          }
        : null,
  },
  {
    label: "Tarihte Bugün",
    categoryId: "tarih",
    resolve: (_feed, dateKey) => resolveWorldOnThisDay(dateKey),
  },
  {
    label: "Bunları biliyor musunuz?",
    categoryId: "bilim",
    resolve: (feed, dateKey) => {
      const items = feed.didYouKnow?.items ?? [];
      if (!items.length) return null;
      const item = pickDailyItem(items, `${dateKey}:dyk`);
      const title = item.wikiTitle ?? item.text;
      return title ? { title: item.text, wikiTitle: title } : null;
    },
  },
];

const FIFTH_SLOT_FALLBACK: PoolEntry[] = [
  { title: "Türkiye" },
  { title: "Osmanlı İmparatorluğu" },
  { title: "İstanbul Boğazı" },
  { title: "Anıtkabir" },
  { title: "Ayasofya" },
];

export function findBilgiAgaciCategory(id: BilgiAgaciCategoryId): BilgiAgaciCategoryDef {
  return BILGI_AGACI_CATEGORIES.find((c) => c.id === id) ?? BILGI_AGACI_CATEGORIES[0]!;
}

function categoryMeta(categoryId: BilgiAgaciCategoryId): Pick<
  BilgiAgaciDailyItem,
  "categoryId" | "categoryTitle" | "categorySlug" | "categoryIcon"
> {
  const cat = findBilgiAgaciCategory(categoryId);
  return {
    categoryId: cat.id,
    categoryTitle: cat.title,
    categorySlug: cat.slug,
    categoryIcon: cat.icon,
  };
}

function toDailyItem(
  slotKind: BilgiAgaciDailySlotKind,
  slotLabel: string,
  entry: PoolEntry,
  categoryId: BilgiAgaciCategoryId,
): BilgiAgaciDailyItem {
  return {
    slotKind,
    slotLabel,
    title: entry.title,
    wikiTitle: entry.wikiTitle ?? entry.title,
    ...categoryMeta(categoryId),
  };
}

/**
 * Günlük kategori döngüsü:
 * - dateKey (TR saati YYYY-MM-DD) ile deterministik tohum
 * - Sabit sekmeler (şehir/konu/kişi/bitki): Türkiye havuzları + sabit kategori etiketi
 * - 5. sekme: ROTATING_CATEGORY_IDS içinden günlük kategori; havuzdan madde seçimi
 * - Wiki özel slotları (seçilmiş, DYK vb.) günün %40'ında; kalan günlerde kategori rotasyonu
 */
export function pickRotatingCategoryForDay(
  dateKey: string,
  offset = 0,
): BilgiAgaciCategoryDef {
  const picked = pickDailyItem(ROTATING_CATEGORY_IDS, `${dateKey}:cat:${offset}`);
  return findBilgiAgaciCategory(picked);
}

function resolveWorldOnThisDay(dateKey: string): PoolEntry {
  const monthDay = turkeyMonthDayKey();
  const dated = WORLD_ON_THIS_DAY_TOPICS.filter(
    (e): e is WorldOnThisDayEntry & { monthDay: string } =>
      Boolean(e.monthDay) && e.monthDay === monthDay,
  );
  if (dated.length > 0) {
    const picked = pickDailyItem(dated, `${dateKey}:world-otd`);
    return {
      title: picked.text ?? picked.title,
      wikiTitle: picked.wikiTitle ?? picked.title,
    };
  }
  const generalPool = WORLD_ON_THIS_DAY_TOPICS.filter((e) => !e.monthDay);
  const picked = pickDailyItem(
    generalPool.length > 0 ? generalPool : WORLD_ON_THIS_DAY_TOPICS,
    `${dateKey}:world-otd`,
  );
  return {
    title: picked.text ?? picked.title,
    wikiTitle: picked.wikiTitle ?? picked.title,
  };
}

function resolveFixedSlot(
  slotKind: Exclude<BilgiAgaciDailySlotKind, "gunluk">,
  feed: WikiHomepageFeed,
  dateKey: string,
): BilgiAgaciDailyItem {
  const { categoryId, pool, slotLabel } = SLOT_CATEGORY_MAP[slotKind];
  const seed = `${dateKey}:${slotKind}`;

  if (slotKind === "sehir") {
    const featured = feed.featuredArticle?.title?.trim();
    const fromFeatured =
      featured && pool.some((c) => c.title === featured)
        ? { title: featured, wikiTitle: featured }
        : null;
    const picked = fromFeatured ?? pickDailyItem(pool, seed);
    return toDailyItem(slotKind, slotLabel, picked, categoryId);
  }

  const picked = pickDailyItem(pool, seed);
  return toDailyItem(slotKind, slotLabel, picked, categoryId);
}

function resolveRotatingCategorySlot(dateKey: string): BilgiAgaciDailyItem {
  const category = pickRotatingCategoryForDay(dateKey, 0);
  const picked = pickDailyItem(category.articles, `${dateKey}:rotating`);
  return toDailyItem("gunluk", category.title, picked, category.id);
}

function resolveFifthSlot(feed: WikiHomepageFeed, dateKey: string): BilgiAgaciDailyItem {
  const useWikiSpecial = pickDailyItem([true, false, false, false, false], `${dateKey}:fifth-mode`);

  if (useWikiSpecial) {
    const rotation = pickDailyItem(FIFTH_SLOT_ROTATION, `${dateKey}:fifth-kind`);
    const resolved = rotation.resolve(feed, dateKey);
    const fallbackPool =
      rotation.label === "Tarihte Bugün"
        ? WORLD_ON_THIS_DAY_TOPICS.map(({ title, wikiTitle, text }) => ({
            title: text ?? title,
            wikiTitle: wikiTitle ?? title,
          }))
        : FIFTH_SLOT_FALLBACK;
    const entry = resolved ?? pickDailyItem(fallbackPool, `${dateKey}:fifth-fb`);
    return toDailyItem("gunluk", rotation.label, entry, rotation.categoryId);
  }

  return resolveRotatingCategorySlot(dateKey);
}

/** Günlük 5 başlık: şehir, konu, kişi, bitki + dönen kategori / özel slot. */
export function buildBilgiAgaciDailyItems(
  feed: WikiHomepageFeed,
  dateKey = getTurkeyDateKey(),
): BilgiAgaciDailyItem[] {
  return [
    resolveFixedSlot("sehir", feed, dateKey),
    resolveFixedSlot("konu", feed, dateKey),
    resolveFixedSlot("kisi", feed, dateKey),
    resolveFixedSlot("bitki", feed, dateKey),
    resolveFifthSlot(feed, dateKey),
  ];
}

/** Günün 5 farklı kategori etiketi (band üstü pill sırası). */
export function dailyCategoryPills(dateKey = getTurkeyDateKey()): BilgiAgaciCategoryDef[] {
  const fixed = (["sehir", "konu", "kisi", "bitki"] as const).map(
    (k) => findBilgiAgaciCategory(SLOT_CATEGORY_MAP[k].categoryId),
  );
  const fifth = pickRotatingCategoryForDay(dateKey, 1);
  return [...fixed, fifth];
}

export async function fetchBilgiAgaciDailyItems(): Promise<BilgiAgaciDailyItem[]> {
  const feed = await fetchWikiHomepageFeed();
  const displayFeed = hasWikiDailyBlocks(feed) ? feed : buildRotatedFallbackDaily();
  const dateKey = displayFeed.date || getTurkeyDateKey();
  return buildBilgiAgaciDailyItems(displayFeed, dateKey);
}
