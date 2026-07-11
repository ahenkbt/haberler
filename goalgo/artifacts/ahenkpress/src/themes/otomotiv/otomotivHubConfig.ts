/**
 * OTO-HUB — Otomotiv Ekosistemi (PDF strateji + Yekpare uygulama planı)
 *
 * PDF 3 sütun: Araç Pazarı | Yedek Parça | Servis Ağı (+ Sigorta dikeyi)
 * PDF yol haritası: Faz 1 Veri+İlan → Faz 2 Araç → Faz 3 Parça → Faz 4 Randevu → Faz 5 Sigorta → Faz 6 Ölçek
 *
 * Platform modeli (Yekpare footer ile uyumlu):
 * - Listeleme ve rehber platformu; ödeme aracısı / satıcı / sigortacı değildir.
 * - Araç satışı, kapora, parça bedeli, randevu ve poliçe ödemesi doğrudan ilgili işletme / lisanslı acente ile yapılır.
 *
 * Kapsam dışı (PDF’de geçse bile uygulanmaz — işletme / acente sorumluluğu):
 * - Escrow / havuz hesap / güvenli ödeme altyapısı (iyzico BDDK havuz vb.)
 * - Yekpare üzerinden ödeme tahsilatı, poliçe düzenleme veya canlı teklif (broker API olmadan)
 */
import { OTOMOTIV } from "./otomotivRoutes";

export type OtomotivRoadmapPhase = {
  id: string;
  title: string;
  status: "done" | "active" | "planned";
  items: string[];
};

/** OTO-HUB PDF + Yekpare listeleme modeli — admin ve geliştirici referansı */
export const OTOMOTIV_ROADMAP: OtomotivRoadmapPhase[] = [
  {
    id: "faz-1",
    title: "Faz 1 — Veri Motoru & İlan Altyapısı",
    status: "done",
    items: [
      "Rotalar /otomotiv/*, hub, sub-nav, header link",
      "DB: vehicle_brands, vehicle_models, otomotiv_businesses, otomotiv_listings",
      "DB: otomotiv_service_categories (6 grup taksonomi), otomotiv_appointment_slots (iskelet)",
      "API /api/otomotiv/*",
      "Ayrı admin panel /admin/otomotiv — işletme türüne göre dinamik sekmeler",
      "Listeleme disclaimer: ödeme doğrudan işletmeyle; Yekpare ödeme aracısı değildir",
    ],
  },
  {
    id: "faz-2",
    title: "Faz 2 — Araç Pazarı (Listings)",
    status: "active",
    items: [
      "Modül: Araç Pazarı — Sıfır & 2. El (B2C galeri + C2C sahibinden)",
      "Araç sınıfları: Otomobil, Ticari, Arazi, Minibüs, Kamyon, Otobüs, Motosiklet",
      "Public liste/detay, marka-model-yıl-km-fiyat filtre",
      "360° görsel, tramer/boya/değişen/donanım filtreleri (hedef)",
      "Karşılaştırma motoru (4 araç) — temel",
      "Haritalardan otomotiv_businesses toplu import",
      "Doping / öne çıkan ilan geliri (listeleme aboneliği)",
      "Kapora ve satış bedeli: ilgili galeri / ilan sahibi ile (Yekpare dışı)",
    ],
  },
  {
    id: "faz-3",
    title: "Faz 3 — Parça Listeleme & Kargo Bilgisi",
    status: "planned",
    items: [
      "Modül: Yedek Parça — Orijinal, yan sanayi, çıkma (listeleme vitrini)",
      "VIN/şasi sorgusu → uyumlu parça listesi (veri motoru)",
      "Çıkma parça teklif sistemi (talep → satıcı teklif, iletişim işletmede)",
      "Desi bazlı kargo bilgisi: Yurtiçi, Aras, MNG (Geliver — işletme kargo ayarı)",
      "Parçacı abonelik / listeleme paketleri (satış komisyonu yok — ödeme işletmede)",
      "Kapsam dışı: havuz hesap / escrow / platform ödeme tahsilatı",
    ],
  },
  {
    id: "faz-4",
    title: "Faz 4 — Randevu & CRM Paneli",
    status: "planned",
    items: [
      "Modül: Servis Ağı — 6 grup taksonomi, tamir/yıkama/lastik/ekspertiz/çekici",
      "Canlı takvim — gerçek zamanlı müsaitlik",
      "Hizmet seçimi + fiyat gösterimi (randevu; tahsilat işletmede)",
      "Dijital servis karnesi / plaka bazlı hatırlatmalar (muayene, yağ km)",
      "SaaS abonelik — servis/yıkama randevu paneli",
      "Kapsam dışı: ön ödeme/kapora tahsilat modülü (işletme kendi POS’u ile)",
    ],
  },
  {
    id: "faz-5",
    title: "Faz 5 — Sigorta (Trafik + Kasko)",
    status: "planned",
    items: [
      "Modül: /otomotiv/sigorta — trafik & kasko teklif yönlendirme (listeleme / lead)",
      "Araç ilanı detay: yaklaşık sigorta bedeli → lisanslı acenteye lead (broker API entegrasyonu sonrası)",
      "Garajım: araç + poliçe bitiş hatırlatıcı (30/15/7 gün)",
      "Anlaşmalı servisler çapraz kampanya (admin sihirbazı — kasko + yıkama vb.)",
      "Acente paneli: lead yönetimi, poliçe PDF, komisyon raporu (stub), müşteri chat",
      "Admin: broker API anahtarları, acente onay (levha/evrak), komisyon oranı config",
      "DB: sigorta_agents, sigorta_leads, sigorta_policies (iskelet)",
      "Kapsam dışı: Yekpare sigortacı değildir; poliçe/ödeme lisanslı acente ile",
      "Kapsam dışı: canlı fiyat teklifi broker API olmadan (sahte quote yok)",
    ],
  },
  {
    id: "faz-6",
    title: "Faz 6 — Farklılaştırıcılar & Ölçek",
    status: "planned",
    items: [
      "Ustaya Sor — topluluk Q&A → servis cevap → randevu yönlendirme",
      "Yolda Kaldım — konum bazlı çekici/yol yardım listesi",
      "Karşılaştırma motoru (lastik, servis fiyat listeleri)",
      "Kurumsal galeri / parçacı listeleme paketleri",
      "Mobil-first PWA vitrin",
      "Mikroservis ayrımı: listings, appointments, parts-catalog, sigorta-leads",
      "SEO, analytics, toplu Haritalar senkron",
    ],
  },
];

export const OTOMOTIV_MODULES_VISION = {
  aracPazari: {
    label: "Araç Pazarı",
    description: "Sıfır & 2. El — galeri ve sahibinden ilanları; satış işletmeyle",
    href: OTOMOTIV.galeri.home,
    icon: "🚗",
  },
  yedekParca: {
    label: "Yedek Parça",
    description: "Orijinal, yan sanayi, çıkma — VIN uyumluluk; ödeme parçacıda",
    href: OTOMOTIV.yedekParca.home,
    icon: "🔩",
  },
  hizmetAgi: {
    label: "Servis Ağı",
    description: "Tamir, yıkama, lastik, ekspertiz, çekici — randevu işletmede",
    href: OTOMOTIV.servis.home,
    icon: "🔧",
  },
  sigorta: {
    label: "Sigorta",
    description: "Trafik & kasko teklif yönlendirme — poliçe lisanslı acente ile",
    href: OTOMOTIV.sigorta.home,
    icon: "🛡️",
  },
} as const;

/** PDF ekosistem sütunları — hub bölüm sırası */
export const OTOMOTIV_HUB_PILLARS = [
  OTOMOTIV_MODULES_VISION.aracPazari,
  OTOMOTIV_MODULES_VISION.yedekParca,
  OTOMOTIV_MODULES_VISION.hizmetAgi,
  OTOMOTIV_MODULES_VISION.sigorta,
] as const;

/** Sigorta modülü — kullanıcı vitrin kartları (Faz 5) */
export const SIGORTA_FEATURE_CARDS = [
  {
    icon: "🛡️",
    title: "Trafik & Kasko",
    description: "Teklif talebi lisanslı sigorta acentesine yönlendirilir — Yekpare sigortacı değildir.",
  },
  {
    icon: "🚗",
    title: "Araç ilanından teklif",
    description: "İlan detayından sigorta lead formu — canlı fiyat broker API entegrasyonu sonrası.",
  },
  {
    icon: "📅",
    title: "Garajım hatırlatıcı",
    description: "Poliçe bitiş tarihi 30 / 15 / 7 gün önce bildirim (gelecek faz).",
  },
  {
    icon: "🤝",
    title: "Anlaşmalı kampanyalar",
    description: "Kasko + yıkama gibi çapraz teklifler — admin yapılandırması ile.",
  },
] as const;

export const OTOMOTIV_SIGORTA_DISCLAIMER =
  "Sigorta teklif ve poliçe işlemleri Yekpare'de listelenen lisanslı sigorta acenteleri / sigorta firmaları ile yapılır. Yekpare sigortacı veya ödeme aracısı değildir; yalnızca yönlendirme ve lead iletimi sağlar.";

/** PDF gelir modeli — Yekpare tarafında yalnızca listeleme / abonelik geliri */
export const OTOMOTIV_REVENUE_MODEL = [
  "İlan & doping — B2C/C2C listeleme aboneliği (%40 hedef)",
  "Parçacı abonelik / listeleme paketleri (%30 hedef)",
  "SaaS abonelik — servis/yıkama randevu paneli (%20 hedef)",
  "Sigorta lead / acente listeleme + partner yönlendirme (%10 hedef, tahsilat acentede)",
] as const;

export const OTOMOTIV_HERO_BG =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80";

export type OtomotivCategorySlug =
  | "hub"
  | "galeri"
  | "sifir"
  | "ikinci-el"
  | "yedek-parca"
  | "cikma"
  | "servis"
  | "yikama"
  | "lastik"
  | "sigorta";

export type OtomotivCategoryHeroConfig = {
  title: string;
  subtitle: string;
  bg: string;
};

export const CATEGORY_HERO: Record<OtomotivCategorySlug, OtomotivCategoryHeroConfig> = {
  hub: {
    title: "Otomotiv dünyası tek adreste",
    subtitle: "Galeri, parça, servis ve sigorta yönlendirme — abonelikle listelenen işletmeler. Ödeme doğrudan ilgili firmayla.",
    bg: OTOMOTIV_HERO_BG,
  },
  galeri: {
    title: "Oto galerileri keşfedin",
    subtitle: "Sıfır ve 2. el araç ilanları — fiyat, km ve fotoğraflarla. Satış galeri ile.",
    bg: "https://images.unsplash.com/photo-1583121274602-3e2820ac50fb?w=1920&q=80",
  },
  sifir: {
    title: "Sıfır km araçlar",
    subtitle: "Yetkili bayi ve galeri sıfır araç vitrinleri.",
    bg: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1920&q=80",
  },
  "ikinci-el": {
    title: "2. el araç arama",
    subtitle: "Marka, model, yıl ve fiyat filtreleriyle ikinci el ilanlar.",
    bg: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1920&q=80",
  },
  "yedek-parca": {
    title: "Yedek parça kataloğu",
    subtitle: "Uyumluluk ve stok bilgisi — satın alma listelenen parçacı ile.",
    bg: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1920&q=80",
  },
  cikma: {
    title: "Çıkma parça ilanları",
    subtitle: "Söküm ve çıkma parçalar — teklif ve ödeme ilgili firmayla.",
    bg: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=1920&q=80",
  },
  servis: {
    title: "Oto tamir & servis",
    subtitle: "Randevu slotları, hizmet listesi ve fiyatlar — ödeme serviste.",
    bg: "https://images.unsplash.com/photo-1487754180451-c256fbb1553a?w=1920&q=80",
  },
  yikama: {
    title: "Oto yıkama paketleri",
    subtitle: "İç, dış ve detay yıkama — randevu ve ödeme işletmede.",
    bg: "https://images.unsplash.com/photo-1607860108855-64acf2078ed8?w=1920&q=80",
  },
  lastik: {
    title: "Lastik & montaj",
    subtitle: "Lastik ürünleri, balans ve montaj randevusu.",
    bg: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
  },
  sigorta: {
    title: "Trafik & Kasko Sigortası",
    subtitle: "Teklif talebi lisanslı acenteye yönlendirilir — poliçe ve ödeme acente ile.",
    bg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&q=80",
  },
};

export const OTOMOTIV_DISCLAIMER =
  "Yekpare otomotiv modülünde listelenen araç, parça ve hizmetler abonelikle yer alan işletmelere aittir. Satış, kapora, randevu ve ödeme doğrudan ilgili işletme veya ilan sahibiyle yapılır; Yekpare listeleme ve rehber platformudur, ödeme aracısı veya satıcı değildir.";

export const OTOMOTIV_HUB_VALUE_CARDS = [
  {
    icon: "🚗",
    title: "Araç Pazarı",
    description: "Sıfır & 2. el ilanları — satış doğrudan galeri / sahibinden.",
    href: OTOMOTIV.galeri.home,
  },
  {
    icon: "🔩",
    title: "Yedek & çıkma parça",
    description: "VIN uyumluluk ve teklif — ödeme listelenen parçacıda.",
    href: OTOMOTIV.yedekParca.home,
  },
  {
    icon: "🔧",
    title: "Servis ağı",
    description: "6 grup, 28+ uzmanlık — randevu ve ödeme işletmede.",
    href: OTOMOTIV.servis.home,
  },
  {
    icon: "🛡️",
    title: "Sigorta",
    description: "Trafik & kasko lead — poliçe lisanslı acente ile.",
    href: OTOMOTIV.sigorta.home,
  },
  {
    icon: "📋",
    title: "Listeleme modeli",
    description: "Keşif Yekpare'de; satış, randevu ve poliçe ilgili firmada.",
    href: OTOMOTIV.hub,
  },
];

export function getOtomotivCategoryHero(slug: OtomotivCategorySlug): OtomotivCategoryHeroConfig {
  return CATEGORY_HERO[slug];
}
