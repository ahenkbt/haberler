import type { TurizmCategorySlug } from "./turizmCategoryIntroConfig";
import { TURIZM } from "./turizmRoutes";

const INTRO = "/turizm/category-intro";

export const FLIGHT_HERO_BG =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80";

export const BUS_HERO_BG =
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920&q=80";

export const SERVIS_HERO_BG =
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1920&q=80";

export type TurizmHubCampaignTab = {
  id: string;
  label: string;
};

export const TURIZM_HUB_CAMPAIGN_TABS: TurizmHubCampaignTab[] = [
  { id: "all", label: "Öne Çıkan" },
  { id: "ucus", label: "Uçak" },
  { id: "servis", label: "VIP Transfer" },
  { id: "otel", label: "Otel" },
  { id: "tur", label: "Tur" },
];

export type TurizmHubValueCard = {
  icon: string;
  title: string;
  description: string;
};

export const FLIGHT_VALUE_CARDS: TurizmHubValueCard[] = [
  {
    icon: "✈️",
    title: "Fiyat karşılaştır",
    description: "Aviasales ve CollectAPI fiyatlarını tek ekranda karşılaştırın; satın alma yetkili acente üzerinden.",
  },
  {
    icon: "📋",
    title: "İşletmeyle doğrudan",
    description: "Rezervasyon ve ödeme listelenen acente veya havayolu partneriyle yapılır; Yekpare satıcı değildir.",
  },
  {
    icon: "🎧",
    title: "Platform desteği",
    description: "Teknik sorun ve ilan bildirimleri için Yekpare Destek; uçuş operasyonu ilgili firmada.",
  },
];

export const FLIGHT_WHY_YEKPARE: TurizmHubValueCard[] = [
  {
    icon: "💰",
    title: "Şeffaf fiyat",
    description: "Gizli ücret yok; karşılaştırmalı liste ile net fiyat görün.",
  },
  {
    icon: "⚡",
    title: "Hızlı arama",
    description: "IATA kodu veya Google Places ile saniyeler içinde rota seçin.",
  },
  {
    icon: "🌍",
    title: "İç & dış hat",
    description: "Türkiye ve dünya genelinde yüzlerce rota.",
  },
  {
    icon: "📱",
    title: "Mobil uyumlu",
    description: "Telefon ve tabletten kolay bilet arama deneyimi.",
  },
];

export type TurizmHubActionCard = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

export const FLIGHT_MANAGE_ACTIONS: TurizmHubActionCard[] = [
  {
    icon: "🤖",
    title: "AI asistan",
    description: "Rota ve tarih önerileri alın.",
    href: TURIZM.hub,
  },
  {
    icon: "🎫",
    title: "Online check-in",
    description: "Uçuşunuzdan önce check-in yapın.",
    href: "#check-in",
  },
  {
    icon: "🔍",
    title: "PNR sorgulama",
    description: "Rezervasyon kodunuzla uçuş bilgisi görün.",
    href: "#pnr",
  },
  {
    icon: "↩️",
    title: "Bilet iptal",
    description: "İptal ve iade koşullarını inceleyin.",
    href: "#iptal",
  },
];

export type TurizmHubRouteCard = {
  origin: string;
  originCode?: string;
  destination: string;
  destCode?: string;
  priceTry: number;
  image: string;
  href: string;
};

export const POPULAR_FLIGHTS_DOMESTIC: TurizmHubRouteCard[] = [
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Antalya",
    destCode: "AYT",
    priceTry: 1678,
    image: `${INTRO}/beach.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=AYT`,
  },
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "İzmir",
    destCode: "ADB",
    priceTry: 1245,
    image: `${INTRO}/resort.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=ADB`,
  },
  {
    origin: "Ankara",
    originCode: "ESB",
    destination: "Antalya",
    destCode: "AYT",
    priceTry: 1890,
    image: `${INTRO}/beach.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=ESB&destination=AYT`,
  },
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Trabzon",
    destCode: "TZX",
    priceTry: 2100,
    image: `${INTRO}/mountain.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=TZX`,
  },
  {
    origin: "İzmir",
    originCode: "ADB",
    destination: "İstanbul",
    destCode: "IST",
    priceTry: 1180,
    image: `${INTRO}/flight.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=ADB&destination=IST`,
  },
  {
    origin: "Antalya",
    originCode: "AYT",
    destination: "İstanbul",
    destCode: "IST",
    priceTry: 1590,
    image: `${INTRO}/flight.jpg`,
    href: `${TURIZM.stubs.ucus}?origin=AYT&destination=IST`,
  },
];

export const POPULAR_FLIGHTS_INTERNATIONAL: TurizmHubRouteCard[] = [
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Paris",
    destCode: "CDG",
    priceTry: 4890,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=CDG`,
  },
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Londra",
    destCode: "LHR",
    priceTry: 5200,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=LHR`,
  },
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Dubai",
    destCode: "DXB",
    priceTry: 3650,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=DXB`,
  },
  {
    origin: "İstanbul",
    originCode: "IST",
    destination: "Berlin",
    destCode: "BER",
    priceTry: 4100,
    image: "https://images.unsplash.com/photo-1560969184-10fe6639e044?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=IST&destination=BER`,
  },
  {
    origin: "İzmir",
    originCode: "ADB",
    destination: "Amsterdam",
    destCode: "AMS",
    priceTry: 4780,
    image: "https://images.unsplash.com/photo-1534351590666-13e3e96fdad6?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=ADB&destination=AMS`,
  },
  {
    origin: "Antalya",
    originCode: "AYT",
    destination: "Münih",
    destCode: "MUC",
    priceTry: 3920,
    image: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=600&q=80",
    href: `${TURIZM.stubs.ucus}?origin=AYT&destination=MUC`,
  },
];

export type TurizmHubLinkColumn = {
  title: string;
  links: { label: string; href: string }[];
};

export const FLIGHT_DESTINATION_COLUMNS: TurizmHubLinkColumn[] = [
  {
    title: "Popüler şehirler",
    links: [
      { label: "İstanbul uçak bileti", href: `${TURIZM.stubs.ucus}?origin=IST&destination=AYT` },
      { label: "Antalya uçak bileti", href: `${TURIZM.stubs.ucus}?origin=AYT&destination=IST` },
      { label: "İzmir uçak bileti", href: `${TURIZM.stubs.ucus}?origin=ADB&destination=IST` },
      { label: "Ankara uçak bileti", href: `${TURIZM.stubs.ucus}?origin=ESB&destination=IST` },
    ],
  },
  {
    title: "Yurt dışı",
    links: [
      { label: "Paris uçuşları", href: `${TURIZM.stubs.ucus}?origin=IST&destination=CDG` },
      { label: "Londra uçuşları", href: `${TURIZM.stubs.ucus}?origin=IST&destination=LHR` },
      { label: "Dubai uçuşları", href: `${TURIZM.stubs.ucus}?origin=IST&destination=DXB` },
      { label: "Berlin uçuşları", href: `${TURIZM.stubs.ucus}?origin=IST&destination=BER` },
    ],
  },
  {
    title: "Havalimanları",
    links: [
      { label: "IST — İstanbul", href: `${TURIZM.stubs.ucus}?origin=IST&destination=AYT` },
      { label: "SAW — Sabiha Gökçen", href: `${TURIZM.stubs.ucus}?origin=SAW&destination=AYT` },
      { label: "ESB — Ankara", href: `${TURIZM.stubs.ucus}?origin=ESB&destination=AYT` },
      { label: "AYT — Antalya", href: `${TURIZM.stubs.ucus}?origin=AYT&destination=IST` },
    ],
  },
  {
    title: "Yardım",
    links: [
      { label: "Check-in", href: "#check-in" },
      { label: "PNR sorgulama", href: "#pnr" },
      { label: "Bilet iptal", href: "#iptal" },
      { label: "Sık sorulan sorular", href: TURIZM.turlar.sss },
    ],
  },
];

export const BUS_FEATURE_BOXES: TurizmHubValueCard[] = [
  {
    icon: "🎧",
    title: "Platform desteği",
    description: "İlan ve teknik sorunlar için Yekpare Destek; bilet işlemleri listelenen firmada.",
  },
  {
    icon: "📋",
    title: "Doğrudan işletme",
    description: "Ödeme ve rezervasyon listelenen otobüs firması veya partneriyle yapılır.",
  },
  {
    icon: "💺",
    title: "Güncel fiyat listesi",
    description: "CollectAPI ile karşılaştırmalı sefer fiyatları; nihai satın alma firmada tamamlanır.",
  },
  {
    icon: "⚡",
    title: "Kolay arama",
    description: "Rota ve tarih seçerek listelenen firmalara hızlıca ulaşın.",
  },
];

export const BUS_PARTNERS: { name: string; logo?: string }[] = [
  { name: "Metro Turizm" },
  { name: "Pamukkale" },
  { name: "Kamil Koç" },
  { name: "Ulusoy" },
  { name: "Varan" },
  { name: "Nilüfer" },
  { name: "Anadolu" },
  { name: "Efe Tur" },
];

export const SERVIS_FEATURE_BOXES: TurizmHubValueCard[] = [
  {
    icon: "🚘",
    title: "Şoförlü VIP araç",
    description: "Sedan, Vito ve SUV segmentlerinde listelenen transfer firmaları.",
  },
  {
    icon: "✈️",
    title: "Havalimanı karşılama",
    description: "Uçuş numarası ve meet & greet seçenekleri firma profilinde belirtilir.",
  },
  {
    icon: "💰",
    title: "Firma fiyatları",
    description: "KDV dahil fiyatlar ilgili transfer firması tarafından yayınlanır.",
  },
  {
    icon: "📋",
    title: "Doğrudan rezervasyon",
    description: "Ödeme ve sözleşme listelenen VIP transfer firmasıyla yapılır; Yekpare satıcı değildir.",
  },
];

export const SERVIS_PARTNERS: { name: string; logo?: string }[] = [
  { name: "VIP Transfer" },
  { name: "Airport Express" },
  { name: "Lux Ride" },
  { name: "City Chauffeur" },
  { name: "Elite Vito" },
  { name: "Prime Sedan" },
];

export const POPULAR_BUS_ROUTES: TurizmHubRouteCard[] = [
  {
    origin: "İstanbul",
    destination: "Ankara",
    priceTry: 500,
    image: `${INTRO}/bus.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=İstanbul&destination=Ankara`,
  },
  {
    origin: "Ankara",
    destination: "İzmir",
    priceTry: 650,
    image: `${INTRO}/busExpress.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=Ankara&destination=İzmir`,
  },
  {
    origin: "İstanbul",
    destination: "Antalya",
    priceTry: 890,
    image: `${INTRO}/busNight.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=İstanbul&destination=Antalya`,
  },
  {
    origin: "Bursa",
    destination: "İstanbul",
    priceTry: 280,
    image: `${INTRO}/bus.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=Bursa&destination=İstanbul`,
  },
  {
    origin: "İzmir",
    destination: "İstanbul",
    priceTry: 720,
    image: `${INTRO}/busVip.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=İzmir&destination=İstanbul`,
  },
  {
    origin: "Ankara",
    destination: "Trabzon",
    priceTry: 950,
    image: `${INTRO}/bus.jpg`,
    href: `${TURIZM.stubs.otobus}?origin=Ankara&destination=Trabzon`,
  },
];

export function formatTryPrice(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} TL`;
}

export type TurizmCategoryHeroConfig = {
  title: string;
  subtitle: string;
  bg: string;
};

/** Kategori hub / listeleme sayfaları için soluk hero arka planları */
export const CATEGORY_HERO: Record<TurizmCategorySlug, TurizmCategoryHeroConfig> = {
  hub: {
    title: "Tur, konaklama ve ulaşım",
    subtitle: "Modül seçerek devam edin — her bölüm kendi vitrininde açılır.",
    bg: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80",
  },
  konaklama: {
    title: "Otel & konaklama ara",
    subtitle: "Türkiye genelinde oteller, butik tesisler ve konaklama seçenekleri.",
    bg: `${INTRO}/resort.jpg`,
  },
  "villa-ev": {
    title: "Villa & ev kiralama",
    subtitle: "Günlük ve haftalık villa, apart ve tatil evi ilanları.",
    bg: `${INTRO}/poolVilla.jpg`,
  },
  turlar: {
    title: "Tur & paket gezi ara",
    subtitle: "Rehberli turlar, günübirlik aktiviteler ve paket geziler.",
    bg: `${INTRO}/culture.jpg`,
  },
  arac: {
    title: "Araç kiralama ara",
    subtitle: "Günlük ve haftalık araç kiralama — havalimanı ve şehir teslim.",
    bg: `${INTRO}/economyCar.jpg`,
  },
  yat: {
    title: "Yat & tekne kiralama",
    subtitle: "Ege ve Akdeniz kıyılarında günlük ve haftalık tekne kiralama.",
    bg: `${INTRO}/gulet.jpg`,
  },
  ucus: {
    title: "Ucuz uçak bileti ara",
    subtitle: "İç ve dış hat uçuş fiyatlarını karşılaştırın.",
    bg: FLIGHT_HERO_BG,
  },
  servis: {
    title: "VIP Transfer",
    subtitle: "Havalimanı karşılama, şehirlerarası ve saatlik şoförlü araç — net fiyat, KDV dahil.",
    bg: SERVIS_HERO_BG,
  },
  otobus: {
    title: "Otobüs bileti ara",
    subtitle: "Türkiye genelinde şehirlerarası seferler — CollectAPI fiyatları.",
    bg: BUS_HERO_BG,
  },
  etkinlik: {
    title: "Etkinlik & aktivite ara",
    subtitle: "Konser, spor, müze ve biletli etkinlikler tek aramada.",
    bg: `${INTRO}/event.jpg`,
  },
  "gezi-seyahat": {
    title: "Gezi & seyahat rehberleri",
    subtitle: "Türkiye ve dünya rotaları, şehir rehberleri ve keşif içerikleri.",
    bg: `${INTRO}/travel.jpg`,
  },
};

export function getCategoryHero(slug: TurizmCategorySlug): TurizmCategoryHeroConfig {
  return CATEGORY_HERO[slug];
}

/** Etkinlik boş durumda gösterilecek partner / kategori önerileri */
export const ETKINLIK_PARTNER_SUGGESTIONS = [
  {
    title: "Konser & Müzik",
    description: "Canlı sahne ve festival biletleri",
    image: `${INTRO}/event.jpg`,
    category: "konser" as const,
  },
  {
    title: "Spor Etkinlikleri",
    description: "Maç ve turnuva biletleri",
    image: `${INTRO}/adventure.jpg`,
    category: "spor" as const,
  },
  {
    title: "Müze & Sergi",
    description: "Müze geçişleri ve sergiler",
    image: `${INTRO}/culture.jpg`,
    category: "muze" as const,
  },
  {
    title: "Festival",
    description: "Açık hava ve yaz festivalleri",
    image: `${INTRO}/food.jpg`,
    category: "festival" as const,
  },
  {
    title: "Tiyatro",
    description: "Sahne oyunları ve performanslar",
    image: `${INTRO}/culture.jpg`,
    category: "tiyatro" as const,
  },
  {
    title: "Stand-up",
    description: "Komedi geceleri ve gösteriler",
    image: `${INTRO}/event.jpg`,
    category: "stand-up" as const,
  },
];

/** Blog satırı başlıkları (kategori bazlı) */
export const CATEGORY_BLOG_ROW_TITLE: Partial<Record<TurizmCategorySlug, string>> = {
  hub: "Seyahat rehberleri",
  konaklama: "Konaklama ipuçları",
  "villa-ev": "Villa tatili rehberi",
  turlar: "Tur önerileri",
  arac: "Araç kiralama rehberi",
  yat: "Tekne tatili",
  ucus: "Uçuş rehberleri",
  servis: "VIP transfer ipuçları",
  otobus: "Otobüs seyahati",
  etkinlik: "Etkinlik önerileri",
  "gezi-seyahat": "Keşif rotaları",
};
