export type FirmaRehberiCategory = {
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
};

export type FirmaRehberiBusiness = {
  name: string;
  category: string;
  city: string;
  district: string;
  rating: string;
  reviews: string;
  badge: string;
  description: string;
  services: string[];
};

export const FIRMA_REHBERI_CATEGORIES: FirmaRehberiCategory[] = [
  {
    name: "Sağlık",
    icon: "⚕️",
    description: "Doktor, klinik, eczane ve bakım hizmetleri",
    subcategories: [
      "Aile Hekimleri",
      "Aile Sağlığı Merkezleri - Sağlık Ocakları",
      "Akupunktur",
      "Çocuk Doktorları",
      "Dahiliye Doktorları",
      "Dermatolog",
      "Diş Hekimleri",
      "Diyetisyenler",
      "Eczane",
      "Evde Bakım Hizmetleri",
      "Genel Cerrahi Doktorları",
      "Göz Doktorları",
      "Göz Hastaneleri ve Klinikleri",
      "Hastane",
      "Kulak Burun Boğaz Doktorları",
      "Poliklinikler",
    ],
  },
  {
    name: "Ev",
    icon: "🏠",
    description: "Ev, dekorasyon, nakliyat ve bakım çözümleri",
    subcategories: [
      "Antikacılar ve Antika Tamiri",
      "Bahçe Düzenleme ve Peyzaj",
      "Bahçe Mobilyaları",
      "Beyaz Eşya ve Elektronik Mağazaları",
      "Cam Balkon",
      "Çelik Kapı",
      "Çeyiz Mağazaları",
      "Çocuk- Bebek Mobilya ve Eşyaları",
      "Duşakabin",
      "Duvar Kağıdı",
      "Ev Tekstili",
      "Evden Eve Nakliyat",
      "Halı Yıkama",
      "Hazır Mutfak ve Banyo",
      "Koltuk Döşeme ve Döşemelik Kumaş",
      "Küçük Ev Aletleri",
      "Perde ve Jaluzi",
      "Su Bayileri",
      "Yatak ve Baza",
    ],
  },
  {
    name: "Hizmetler",
    icon: "🛠️",
    description: "Usta, danışmanlık, resmi işlem ve acil hizmetler",
    subcategories: [
      "Ambulans Hizmetleri",
      "Arabuluculuk",
      "Bankalar",
      "Boyacılar",
      "Çay Bahçesi",
      "Çay Ocağı",
      "Çilingir ve Anahtarcılar",
      "Dış Cephe Kaplama",
      "Doğal Gaz Tesisatçıları",
      "Elektrikçiler ve Elektrik Malzemeleri",
      "Gümrük Müşavirliği",
      "İnşaat Mühendisliği ve Müteahhitlik",
      "Karton - Kutu ve Oluklu Mukavva",
      "Menajerlik Ajansları",
      "Mobilya Boyama",
      "Noter",
      "Oto Tamircileri",
      "Psikoteknik Kursu",
      "Sanal Ofis",
      "Serbest Muhasebeci Mali Müşavirler",
      "Sıhhi Tesisatçı",
      "SRC Kursu",
      "Temizlik Şirketleri",
      "Terziler",
      "Yeminli Mali Müşavirler",
      "Yol Yardım - Oto Kurtarma",
    ],
  },
  {
    name: "Eğlence",
    icon: "🎭",
    description: "Mekan, organizasyon ve etkinlik noktaları",
    subcategories: [
      "Beach Club ve Plajlar",
      "Bilardo Salonları",
      "Birahaneler",
      "Bowling Salonları",
      "Cd - Dvd - Bilgisayar Oyunu Satışı ve Kiralama",
      "Düğün Salonları",
      "Gece Kulübü ve Barlar",
      "Gösteri Merkezleri",
      "Hayvanat Bahçeleri",
      "İnternet Kafeler ve Oyun Salonları",
      "Lunapark ve Eğlence Parkları",
      "Meyhaneler",
      "Paintball",
      "Parklar ve Oyun Alanları",
      "Parti ve Düğün Organizasyonu Şarap Evleri",
      "Sinemalar",
      "Tiyatrolar",
      "Türkü Evler",
    ],
  },
  {
    name: "Seyahat",
    icon: "✈️",
    description: "Tur, ulaşım, kiralama ve seyahat destekleri",
    subcategories: [
      "Araç Kiralama",
      "Boğaz Turu ve Mavi Tur",
      "Devre Mülk Hizmetleri",
      "Duty Free Alışveriş Noktaları",
      "Evcil Hayvan Pansiyonları",
      "Havaalanları",
      "Havayolları",
      "Kampingler",
      "Limanlar",
      "Marinalar",
      "Otobüs Terminalleri",
      "Otobüs ve Minibüs Kiralama",
      "Tekne Kiralama",
      "Tren İstasyonları",
      "Tur Şirketleri",
      "Turist Danışma Büroları",
      "Vapur ve Feribot İskeleleri",
      "Vize Takip Firmaları",
    ],
  },
];

export const FIRMA_REHBERI_POPULAR_CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Konya", "Adana"];

export const FIRMA_REHBERI_LOCATION_DISTRICTS: Record<string, string[]> = {
  İstanbul: ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Ataşehir", "Bakırköy"],
  Ankara: ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Altındağ"],
  İzmir: ["Konak", "Karşıyaka", "Bornova", "Buca", "Alsancak", "Bayraklı"],
  Bursa: ["Osmangazi", "Nilüfer", "Yıldırım", "Mudanya", "Gemlik"],
  Antalya: ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat"],
  Konya: ["Selçuklu", "Meram", "Karatay", "Ereğli"],
  Adana: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam"],
};

export const FIRMA_REHBERI_MAIN_CATEGORY_CHIPS = FIRMA_REHBERI_CATEGORIES.map((item) => ({
  name: item.name,
  icon: item.icon,
  description: item.description,
}));

export const FIRMA_REHBERI_TRANSFER_DESTINATIONS = [
  { key: "alisveris", label: "Alışveriş", href: "/alisveris", examples: "Mağaza, ürün vitrini" },
  { key: "siparis", label: "Sipariş", href: "/siparis", examples: "Cafe, restoran, paket servis" },
  { key: "ulasim", label: "Ulaşım", href: "/ulasim", examples: "Rentacar, taksi, kurye" },
  { key: "turizm", label: "Seyahat", href: "/turizm", examples: "Otel, tur, villa, tekne" },
];

export const FIRMA_REHBERI_FEATURED_BUSINESSES: FirmaRehberiBusiness[] = [
  {
    name: "Marmara Diş Kliniği",
    category: "Diş Hekimleri",
    city: "İstanbul",
    district: "Kadıköy",
    rating: "4,9",
    reviews: "248 yorum",
    badge: "Doğrulanmış",
    description: "Ağız ve diş sağlığı için online randevu alabileceğiniz örnek sarı sayfa kaydı.",
    services: ["Randevu", "Keşfet profili", "Harita"],
  },
  {
    name: "Başkent Halı Yıkama",
    category: "Halı Yıkama",
    city: "Ankara",
    district: "Çankaya",
    rating: "4,7",
    reviews: "126 yorum",
    badge: "Yerinde hizmet",
    description: "Ev hizmetleri kategorisinde servis bölgesi, fiyat ve talep formu ile listelenir.",
    services: ["Talep formu", "Servis bölgesi", "Hızlı dönüş"],
  },
  {
    name: "Ege Rentacar",
    category: "Araç Kiralama",
    city: "İzmir",
    district: "Alsancak",
    rating: "4,8",
    reviews: "183 yorum",
    badge: "Aktarılabilir",
    description: "Firma rehberinden Ulaşım veya Turizm servislerine aktarılabilecek örnek kayıt.",
    services: ["Ulaşım", "Turizm", "Rezervasyon"],
  },
];
