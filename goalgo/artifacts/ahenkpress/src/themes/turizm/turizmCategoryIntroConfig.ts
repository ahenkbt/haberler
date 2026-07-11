import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import { TURIZM } from "./turizmRoutes";

export type TurizmCategorySlug =
  | "hub"
  | "yat"
  | "konaklama"
  | "villa-ev"
  | "turlar"
  | "arac"
  | "ucus"
  | "servis"
  | "otobus"
  | "etkinlik"
  | "gezi-seyahat";

export type TurizmIntroCard = {
  title: string;
  description: string;
  image: string;
  href?: string;
  filter?: Partial<ListingFilterState>;
};

export type TurizmIntroSection = {
  title: string;
  description: string;
  cards: TurizmIntroCard[];
};

export type TurizmCategoryIntroConfig = {
  slug: TurizmCategorySlug;
  pageDescription?: string;
  sections: TurizmIntroSection[];
};

const CATEGORY_INTRO_BASE = "/turizm/category-intro";

const IMG = {
  gulet: `${CATEGORY_INTRO_BASE}/gulet.jpg`,
  sail: `${CATEGORY_INTRO_BASE}/sail.jpg`,
  catamaran: `${CATEGORY_INTRO_BASE}/catamaran.jpg`,
  motor: `${CATEGORY_INTRO_BASE}/motor.jpg`,
  luxuryBoat: `${CATEGORY_INTRO_BASE}/luxuryBoat.jpg`,
  crew: `${CATEGORY_INTRO_BASE}/crew.jpg`,
  captain: `${CATEGORY_INTRO_BASE}/captain.jpg`,
  bareboat: `${CATEGORY_INTRO_BASE}/bareboat.jpg`,
  boutique: `${CATEGORY_INTRO_BASE}/boutique.jpg`,
  resort: `${CATEGORY_INTRO_BASE}/resort.jpg`,
  apart: `${CATEGORY_INTRO_BASE}/apart.jpg`,
  thermal: `${CATEGORY_INTRO_BASE}/thermal.jpg`,
  family: `${CATEGORY_INTRO_BASE}/family.jpg`,
  spa: `${CATEGORY_INTRO_BASE}/spa.jpg`,
  beach: `${CATEGORY_INTRO_BASE}/beach.jpg`,
  city: `${CATEGORY_INTRO_BASE}/city.jpg`,
  poolVilla: `${CATEGORY_INTRO_BASE}/poolVilla.jpg`,
  seaView: `${CATEGORY_INTRO_BASE}/seaView.jpg`,
  mountain: `${CATEGORY_INTRO_BASE}/mountain.jpg`,
  culture: `${CATEGORY_INTRO_BASE}/culture.jpg`,
  nature: `${CATEGORY_INTRO_BASE}/nature.jpg`,
  dayTrip: `${CATEGORY_INTRO_BASE}/dayTrip.jpg`,
  multiDay: `${CATEGORY_INTRO_BASE}/multiDay.jpg`,
  balloon: `${CATEGORY_INTRO_BASE}/balloon.jpg`,
  food: `${CATEGORY_INTRO_BASE}/food.jpg`,
  adventure: `${CATEGORY_INTRO_BASE}/adventure.jpg`,
  economyCar: `${CATEGORY_INTRO_BASE}/economyCar.jpg`,
  suv: `${CATEGORY_INTRO_BASE}/suv.jpg`,
  van: `${CATEGORY_INTRO_BASE}/van.jpg`,
  luxuryCar: `${CATEGORY_INTRO_BASE}/luxuryCar.jpg`,
  flight: `${CATEGORY_INTRO_BASE}/flight.jpg`,
  bus: `${CATEGORY_INTRO_BASE}/bus.jpg`,
  event: `${CATEGORY_INTRO_BASE}/event.jpg`,
  business: `${CATEGORY_INTRO_BASE}/businessClass.jpg`,
  familyFlight: `${CATEGORY_INTRO_BASE}/familyFlight.jpg`,
  lastMinute: `${CATEGORY_INTRO_BASE}/lastMinute.jpg`,
  busVip: `${CATEGORY_INTRO_BASE}/busVip.jpg`,
  busMinibus: `${CATEGORY_INTRO_BASE}/busMinibus.jpg`,
  busNight: `${CATEGORY_INTRO_BASE}/busNight.jpg`,
  busExpress: `${CATEGORY_INTRO_BASE}/busExpress.jpg`,
  travel: `${CATEGORY_INTRO_BASE}/travel.jpg`,
  servisAirport:
    "https://images.unsplash.com/photo-1436450412880-aaa09fa0e810?w=800&q=80",
  servisIntercity:
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
  servisHourly:
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
  servisDaily:
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
};

export const TURIZM_CATEGORY_INTRO: Record<TurizmCategorySlug, TurizmCategoryIntroConfig> = {
  hub: {
    slug: "hub",
    pageDescription: "Tur, konaklama ve ulaşım — Yekpare Seyahat vitrini.",
    sections: [],
  },
  yat: {
    slug: "yat",
    pageDescription: "Ege ve Akdeniz kıyılarında günlük ve haftalık yat, gulet ve tekne kiralama ilanları.",
    sections: [
      {
        title: "Tekne tipine göre kiralama seçenekleri",
        description:
          "Gulet, yelkenli, katamaran veya motoryat — tatil planınıza ve grup büyüklüğünüze uygun tekneyi seçin.",
        cards: [
          {
            title: "Gulet Kiralama",
            description: "Geniş güverteli, konforlu ve geleneksel Ege-Akdeniz deneyimi.",
            image: IMG.gulet,
            filter: { features: ["Gulet"] },
          },
          {
            title: "Yelkenli Kiralama",
            description: "Rüzgarla ilerleyen, deneyimli denizciler için ideal seçenekler.",
            image: IMG.sail,
            filter: { features: ["Yelkenli"] },
          },
          {
            title: "Katamaran Kiralama",
            description: "Geniş alan, stabil seyir — aile ve arkadaş grupları için.",
            image: IMG.catamaran,
            filter: { features: ["Katamaran"] },
          },
          {
            title: "Motoryat Kiralama",
            description: "Hızlı ulaşım, modern donanım ve lüks konfor bir arada.",
            image: IMG.motor,
            filter: { features: ["Motoryat"] },
          },
        ],
      },
      {
        title: "Tekne tatili için alternatif kiralama seçenekleri",
        description:
          "Mürettebatlı lüks tekne deneyiminden kaptansız bareboat kiralamaya kadar farklı hizmet modelleri.",
        cards: [
          {
            title: "Lüks Tekne",
            description: "Premium donanım ve üst düzey konfor sunan seçenekler.",
            image: IMG.luxuryBoat,
            filter: { sort: "price_desc" },
          },
          {
            title: "Mürettebatlı",
            description: "Aşçı ve servis ekibiyle tam pansiyon deniz tatili.",
            image: IMG.crew,
            filter: { amenities: ["Mürettebatlı"] },
          },
          {
            title: "Kaptanlı",
            description: "Deneyimli kaptan eşliğinde güvenli ve rahat seyir.",
            image: IMG.captain,
            filter: { amenities: ["Kaptanlı"] },
          },
          {
            title: "Kaptansız",
            description: "Ehliyet sahipleri için özgür rota ve esnek program.",
            image: IMG.bareboat,
            filter: { amenities: ["Kaptansız"] },
          },
        ],
      },
    ],
  },
  konaklama: {
    slug: "konaklama",
    pageDescription: "Türkiye genelinde oteller, butik tesisler ve konaklama seçenekleri.",
    sections: [
      {
        title: "Konaklama tipine göre seçenekler",
        description: "Butik otelden resort tesisine, tatil tarzınıza uygun konaklama türünü keşfedin.",
        cards: [
          {
            title: "Butik Otel",
            description: "Özgün tasarım ve kişisel hizmet sunan butik tesisler.",
            image: IMG.boutique,
            filter: { amenities: ["Butik"] },
          },
          {
            title: "Resort",
            description: "Havuz, plaj ve aktivitelerle dolu tatil köyü deneyimi.",
            image: IMG.resort,
            filter: { amenities: ["Resort"] },
          },
          {
            title: "Apart Otel",
            description: "Mutfaklı odalar ve uzun konaklamalar için pratik çözüm.",
            image: IMG.apart,
            filter: { amenities: ["Apart"] },
          },
          {
            title: "Termal Tesis",
            description: "Sağlık ve wellness odaklı termal otel seçenekleri.",
            image: IMG.thermal,
            filter: { amenities: ["Termal"] },
          },
        ],
      },
      {
        title: "Tatil tarzınıza göre oteller",
        description: "Aile tatili, spa kaçamağı veya şehir keşfi — ihtiyacınıza göre filtreleyin.",
        cards: [
          {
            title: "Aile Oteli",
            description: "Çocuk dostu tesisler ve geniş oda seçenekleri.",
            image: IMG.family,
            filter: { amenities: ["Aile dostu"] },
          },
          {
            title: "Spa & Wellness",
            description: "Masaj, hamam ve detoks programları sunan oteller.",
            image: IMG.spa,
            filter: { amenities: ["Spa"] },
          },
          {
            title: "Sahil Oteli",
            description: "Denize sıfır veya kumsal erişimli konaklama.",
            image: IMG.beach,
            filter: { amenities: ["Plaj"] },
          },
          {
            title: "Şehir Oteli",
            description: "Merkezi konumda iş ve keşif için ideal oteller.",
            image: IMG.city,
            filter: { stars: [4, 5] },
          },
        ],
      },
    ],
  },
  "villa-ev": {
    slug: "villa-ev",
    pageDescription: "Günlük ve haftalık villa, apart ve ev kiralama ilanları.",
    sections: [
      {
        title: "Villa tipine göre kiralama seçenekleri",
        description: "Havuzlu villadan deniz manzaralı seçeneklere, ihtiyacınıza uygun evi bulun.",
        cards: [
          {
            title: "Havuzlu Villa",
            description: "Özel havuz ve bahçe ile tam mahremiyet.",
            image: IMG.poolVilla,
            filter: { amenities: ["Havuz"] },
          },
          {
            title: "Deniz Manzaralı",
            description: "Panoramik deniz manzarası sunan villalar.",
            image: IMG.seaView,
            filter: { amenities: ["Deniz manzarası"] },
          },
          {
            title: "Dağ Evi",
            description: "Doğa içinde sakin ve huzurlu konaklama.",
            image: IMG.mountain,
            filter: { features: ["Dağ evi"] },
          },
          {
            title: "Şehir Merkezi",
            description: "Merkeze yakın apart ve daire kiralama.",
            image: IMG.city,
            filter: { features: ["Merkez"] },
          },
        ],
      },
      {
        title: "Grup ve süreye göre alternatifler",
        description: "Aile tatili, arkadaş grupları veya uzun dönem konaklama için uygun seçenekler.",
        cards: [
          {
            title: "Aile Villası",
            description: "Geniş odalar ve çocuk dostu alanlar.",
            image: IMG.family,
            filter: { capacityMin: "6" },
          },
          {
            title: "Grup Konaklama",
            description: "8 kişi ve üzeri gruplar için ferah villalar.",
            image: IMG.poolVilla,
            filter: { capacityMin: "10" },
          },
          {
            title: "Haftalık Kiralama",
            description: "7 gün ve üzeri konaklamalarda avantajlı fiyatlar.",
            image: IMG.seaView,
            filter: { sort: "price_asc" },
          },
          {
            title: "Uzun Dönem",
            description: "Aylık ve sezonluk kiralama seçenekleri.",
            image: IMG.apart,
            filter: { sort: "recommended" },
          },
        ],
      },
    ],
  },
  turlar: {
    slug: "turlar",
    pageDescription: "Rehberli turlar, paket geziler ve günübirlik aktiviteler.",
    sections: [
      {
        title: "Tur türüne göre seçenekler",
        description: "Kültür, doğa ve macera turları — ilgi alanınıza göre keşfedin.",
        cards: [
          {
            title: "Kültür Turları",
            description: "Müze, antik kent ve tarihi mekân odaklı rotalar.",
            image: IMG.culture,
            filter: { features: ["Kültür"] },
          },
          {
            title: "Doğa Turları",
            description: "Milli park, vadi ve doğa yürüyüşü programları.",
            image: IMG.nature,
            filter: { features: ["Doğa"] },
          },
          {
            title: "Günübirlik",
            description: "Tek günde tamamlanan pratik gezi paketleri.",
            image: IMG.dayTrip,
            filter: { features: ["Günübirlik"] },
          },
          {
            title: "Çok Günlü Paket",
            description: "Konaklamalı ve ulaşımlı tam paket turlar.",
            image: IMG.multiDay,
            filter: { features: ["Paket"] },
          },
        ],
      },
      {
        title: "Popüler tur kategorileri",
        description: "En çok tercih edilen tur temaları ve deneyimler.",
        cards: [
          {
            title: "Balon Turu",
            description: "Kapadokya ve benzeri destinasyonlarda hava balonu.",
            image: IMG.balloon,
            filter: { features: ["Balon"] },
          },
          {
            title: "Tekne Turu",
            description: "Koy turları ve mavi yolculuk programları.",
            image: IMG.crew,
            filter: { features: ["Tekne"] },
          },
          {
            title: "Gastronomi",
            description: "Yerel lezzetler ve mutfak atölyeleri.",
            image: IMG.food,
            filter: { features: ["Gastronomi"] },
          },
          {
            title: "Macera",
            description: "Rafting, zipline ve outdoor aktiviteler.",
            image: IMG.adventure,
            filter: { features: ["Macera"] },
          },
        ],
      },
    ],
  },
  arac: {
    slug: "arac",
    pageDescription: "Günlük ve haftalık araç kiralama ilanları — havalimanı ve şehir teslim.",
    sections: [
      {
        title: "Araç sınıfına göre kiralama",
        description: "Ekonomik sınıftan lüks segmente, bütçenize uygun aracı seçin.",
        cards: [
          {
            title: "Ekonomik",
            description: "Şehir içi kullanım için uygun fiyatlı modeller.",
            image: IMG.economyCar,
            filter: { features: ["Ekonomik"] },
          },
          {
            title: "SUV",
            description: "Geniş bagaj ve arazi için ideal araçlar.",
            image: IMG.suv,
            filter: { features: ["SUV"] },
          },
          {
            title: "Aile",
            description: "7 kişilik geniş iç hacimli modeller.",
            image: IMG.van,
            filter: { features: ["Aile"] },
          },
          {
            title: "Lüks",
            description: "Premium segment ve üst donanımlı araçlar.",
            image: IMG.luxuryCar,
            filter: { features: ["Lüks"] },
          },
        ],
      },
      {
        title: "Kiralama şekline göre alternatifler",
        description: "Günlük, haftalık veya havalimanı teslim — esnek kiralama modelleri.",
        cards: [
          {
            title: "Günlük Kiralama",
            description: "Kısa süreli şehir ve tatil kullanımı.",
            image: IMG.economyCar,
            filter: { sort: "price_asc" },
          },
          {
            title: "Haftalık Kiralama",
            description: "7 gün ve üzeri avantajlı fiyatlar.",
            image: IMG.suv,
            filter: { sort: "recommended" },
          },
          {
            title: "Havalimanı Teslim",
            description: "Varış noktasında hızlı teslim alma.",
            image: IMG.luxuryCar,
            filter: { amenities: ["Havalimanı"] },
          },
          {
            title: "Tek Yön",
            description: "Farklı şehirde bırakma imkânı sunan seçenekler.",
            image: IMG.van,
            filter: { features: ["Tek yön"] },
          },
        ],
      },
    ],
  },
  ucus: {
    slug: "ucus",
    pageDescription: "İç ve dış hat uçuş fiyatlarını karşılaştırın; bileti partner sitesinde tamamlayın.",
    sections: [
      {
        title: "Uçuş türüne göre arama",
        description: "Rota ve tarih seçerek en uygun uçuş seçeneklerini bulun.",
        cards: [
          {
            title: "İç Hat",
            description: "Türkiye içi şehirler arası uçuşlar.",
            image: IMG.flight,
            href: `${TURIZM.stubs.ucus}?origin=IST&destination=AYT`,
          },
          {
            title: "Dış Hat",
            description: "Yurt dışı destinasyonlara direkt ve aktarmalı uçuşlar.",
            image: IMG.flight,
            href: `${TURIZM.stubs.ucus}?origin=IST&destination=CDG`,
          },
          {
            title: "Aktarmalı",
            description: "Daha uygun fiyatlı çok bacaklı rotalar.",
            image: IMG.flight,
            href: TURIZM.stubs.ucus,
          },
          {
            title: "Direkt Uçuş",
            description: "Aktarmasız, hızlı ulaşım seçenekleri.",
            image: IMG.flight,
            href: TURIZM.stubs.ucus,
          },
        ],
      },
      {
        title: "Seyahat tarzına göre",
        description: "Ekonomi, business veya aile paketi — ihtiyacınıza göre filtreleyin.",
        cards: [
          {
            title: "Ekonomi",
            description: "Bütçe dostu kabin sınıfı seçenekleri.",
            image: IMG.flight,
            href: TURIZM.stubs.ucus,
          },
          {
            title: "Business",
            description: "Konforlu kabin ve öncelikli hizmetler.",
            image: IMG.business,
            href: TURIZM.stubs.ucus,
          },
          {
            title: "Aile Paketi",
            description: "Çocuklu aileler için uygun rotalar.",
            image: IMG.familyFlight,
            href: TURIZM.stubs.ucus,
          },
          {
            title: "Son Dakika",
            description: "Yakın tarihli uygun fiyatlı uçuşlar.",
            image: IMG.lastMinute,
            href: TURIZM.stubs.ucus,
          },
        ],
      },
    ],
  },
  otobus: {
    slug: "otobus",
    pageDescription: "Şehirlerarası otobüs ve ulaşım araması — partner sitesinde fiyat karşılaştırması.",
    sections: [
      {
        title: "Güzergaha göre ulaşım",
        description: "Kalkış ve varış noktanıza göre sefer seçeneklerini keşfedin.",
        cards: [
          {
            title: "Şehirlerarası",
            description: "Büyük şehirler arası düzenli seferler.",
            image: IMG.bus,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "Turistik Hat",
            description: "Tatil bölgelerine sezonluk otobüs rotaları.",
            image: IMG.beach,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "Gece Seferi",
            description: "Uyuyarak gittiğiniz gece otobüsleri.",
            image: IMG.busNight,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "Ekspres",
            description: "Az duraklı hızlı hatlar.",
            image: IMG.busExpress,
            href: TURIZM.stubs.otobus,
          },
        ],
      },
      {
        title: "Konfor seviyesine göre",
        description: "Standart, VIP veya minibüs — yolculuk konforunuza göre seçin.",
        cards: [
          {
            title: "Standart",
            description: "Ekonomik ve sık sefer seçenekleri.",
            image: IMG.bus,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "2+1 Koltuk",
            description: "Geniş koltuk aralığı ile rahat yolculuk.",
            image: IMG.bus,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "VIP",
            description: "Üst düzey konfor ve ikramlı seferler.",
            image: IMG.busVip,
            href: TURIZM.stubs.otobus,
          },
          {
            title: "Minibüs",
            description: "Küçük gruplar için özel transfer.",
            image: IMG.busMinibus,
            href: TURIZM.stubs.otobus,
          },
        ],
      },
    ],
  },
  servis: {
    slug: "servis",
    pageDescription: "VIP transfer, havalimanı karşılama ve şoförlü araç — net fiyat, KDV dahil.",
    sections: [
      {
        title: "Transfer tipine göre",
        description: "Tek yön, gidiş-dönüş, saatlik veya günlük VIP araç kiralama.",
        cards: [
          {
            title: "Havalimanı transfer",
            description: "Uçuş takibi ve meet & greet ile karşılama.",
            image: IMG.servisAirport,
            href: TURIZM.stubs.servis,
          },
          {
            title: "Şehirlerarası",
            description: "İstanbul–Ankara, Antalya–Alanya gibi VIP hatlar.",
            image: IMG.servisIntercity,
            href: TURIZM.stubs.servis,
          },
          {
            title: "Saatlik kiralama",
            description: "Şehir içi toplantı ve etkinlikler için saatlik Vito/SUV.",
            image: IMG.servisHourly,
            href: TURIZM.stubs.servis,
          },
          {
            title: "Günlük şoför",
            description: "Tüm gün özel şoförlü araç hizmeti.",
            image: IMG.servisDaily,
            href: TURIZM.stubs.servis,
          },
        ],
      },
      {
        title: "Segmente göre",
        description: "Premium Sedan, VIP Vito veya Lüks SUV — kişi ve bagaj kapasitesine göre seçin.",
        cards: [
          {
            title: "Premium Sedan",
            description: "1–3 kişi için konforlu sedan transfer.",
            image: IMG.busVip,
            href: TURIZM.stubs.servis,
          },
          {
            title: "VIP Vito",
            description: "6 kişiye kadar geniş bagaj alanı.",
            image: IMG.busMinibus,
            href: TURIZM.stubs.servis,
          },
          {
            title: "Lüks SUV",
            description: "Üst segment araçlar ve ekstra konfor.",
            image: IMG.bus,
            href: TURIZM.stubs.servis,
          },
          {
            title: "Limuzin",
            description: "Özel gün ve protokol transferleri.",
            image: IMG.busNight,
            href: TURIZM.stubs.servis,
          },
        ],
      },
    ],
  },
  etkinlik: {
    slug: "etkinlik",
    pageDescription: "Konser, müze, aktivite ve biletli etkinlikler — partner sitelerinde satın alın.",
    sections: [
      {
        title: "Etkinlik türüne göre",
        description: "Konserden spora, şehirdeki biletli etkinlikleri keşfedin.",
        cards: [
          {
            title: "Konser",
            description: "Canlı müzik ve sahne gösterileri.",
            image: IMG.event,
            href: `${TURIZM.stubs.etkinlik}?category=konser`,
          },
          {
            title: "Spor",
            description: "Maç, turnuva ve spor etkinlikleri.",
            image: IMG.adventure,
            href: `${TURIZM.stubs.etkinlik}?category=spor`,
          },
          {
            title: "Müze",
            description: "Müze geçişleri ve sergi biletleri.",
            image: IMG.culture,
            href: `${TURIZM.stubs.etkinlik}?category=muze`,
          },
          {
            title: "Festival",
            description: "Yaz festivalleri ve açık hava etkinlikleri.",
            image: IMG.food,
            href: `${TURIZM.stubs.etkinlik}?category=festival`,
          },
        ],
      },
      {
        title: "Aktivite kategorileri",
        description: "Rehberli turlar, doğa aktiviteleri ve deneyim paketleri.",
        cards: [
          {
            title: "Rehberli Tur",
            description: "Yerel rehber eşliğinde şehir ve müze turları.",
            image: IMG.culture,
            href: TURIZM.stubs.etkinlik,
          },
          {
            title: "Doğa Aktivitesi",
            description: "Trekking, dalış ve outdoor deneyimler.",
            image: IMG.nature,
            href: TURIZM.stubs.etkinlik,
          },
          {
            title: "Tema Park",
            description: "Aileler için eğlence parkı biletleri.",
            image: IMG.family,
            href: TURIZM.stubs.etkinlik,
          },
          {
            title: "Gastronomi",
            description: "Yemek turları ve mutfak atölyeleri.",
            image: IMG.food,
            href: TURIZM.stubs.etkinlik,
          },
        ],
      },
    ],
  },
  "gezi-seyahat": {
    slug: "gezi-seyahat",
    pageDescription: "Türkiye ve dünya rotaları, şehir rehberleri ve keşif içerikleri.",
    sections: [
      {
        title: "Bölgeye göre keşif",
        description: "Türkiye kıyılarından dünya başkentlerine uzanan rotalar.",
        cards: [
          {
            title: "Türkiye Kıyıları",
            description: "Ege, Akdeniz ve Karadeniz sahil rotaları.",
            image: IMG.travel,
            href: "/gezi-seyahat?bolge=turkiye",
          },
          {
            title: "Kapadokya",
            description: "Peri bacaları, balon ve vadiler.",
            image: IMG.balloon,
            href: "/bilgiagaci/kategori/gezi-seyahat?q=Kapadokya",
          },
          {
            title: "Avrupa",
            description: "Paris, Roma ve popüler Avrupa şehirleri.",
            image: IMG.culture,
            href: "/gezi-seyahat?region=avrupa",
          },
          {
            title: "Asya",
            description: "Tokyo, Bali ve Uzak Doğu keşifleri.",
            image: IMG.travel,
            href: "/gezi-seyahat?region=asya",
          },
        ],
      },
      {
        title: "Seyahat tarzına göre",
        description: "Kültür, doğa, gastronomi ve macera odaklı rehberler.",
        cards: [
          {
            title: "Kültür Rotası",
            description: "Müze, antik kent ve tarihi duraklar.",
            image: IMG.culture,
            href: TURIZM.turlar.home,
          },
          {
            title: "Doğa Kaçamağı",
            description: "Milli parklar ve yürüyüş rotaları.",
            image: IMG.nature,
            href: TURIZM.turlar.home,
          },
          {
            title: "Gastronomi",
            description: "Yerel lezzet durakları ve mutfak rehberleri.",
            image: IMG.food,
            href: "/bilgiagaci/kategori/gezi-seyahat",
          },
          {
            title: "Macera",
            description: "Outdoor aktiviteler ve adrenalin rotaları.",
            image: IMG.adventure,
            href: TURIZM.turlar.home,
          },
        ],
      },
    ],
  },
};

export function getTurizmCategoryIntro(slug: TurizmCategorySlug): TurizmCategoryIntroConfig {
  return TURIZM_CATEGORY_INTRO[slug];
}

/** Üst intro satırında gösterilecek maksimum kart sayısı */
export const MAIN_INTRO_MAX = 4;

export function turizmIntroTitleToSlug(title: string): string {
  return title
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

export function turizmBlogHref(title: string, slug?: string | null): string {
  const s = slug?.trim() || turizmIntroTitleToSlug(title);
  return `/turizm/blog/${encodeURIComponent(s)}`;
}

/** İlk MAIN_INTRO_MAX kartı tek satır intro; geri kalanları sidebar promos */
export function splitIntroConfig(config: TurizmCategoryIntroConfig): {
  mainSections: TurizmIntroSection[];
  sidebarCards: TurizmIntroCard[];
} {
  const flat: TurizmIntroCard[] = config.sections.flatMap((s) => s.cards);
  const mainCards = flat.slice(0, MAIN_INTRO_MAX);
  const sidebarCards = flat.slice(MAIN_INTRO_MAX);

  const mainSections: TurizmIntroSection[] =
    mainCards.length > 0
      ? [
          {
            title: "",
            description: "",
            cards: mainCards,
          },
        ]
      : [];

  return { mainSections, sidebarCards };
}
