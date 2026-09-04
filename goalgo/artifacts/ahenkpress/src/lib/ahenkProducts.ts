import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";

export type AhenkProductTile = {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  href: string;
  image: string;
  featured?: boolean;
  external?: boolean;
};

export const AHENK_ASISTAN_IMG = "/ahenk-asistan-ai/hero.png";
export const AHENK_WHATSAPP_INFO = "/ahenk-asistan-ai/whatsapp-cagri-merkezi.jpg";
export const AHENK_WHATSAPP_IMG = "/ahenk-asistan-ai/whatsapp-hero.png";

/** Ürünlerimiz vitrini — görselli kartlar. */
export const AHENK_PRODUCTS: AhenkProductTile[] = [
  {
    slug: "asistan-ai",
    title: "Ahenk Asistan AI",
    kicker: "7/24 otonom satış",
    excerpt:
      "Gelen çağrı, sipariş, rezervasyon ve WhatsApp’ı insan doğallığında yanıtlar. Mutfak, kurye, kasa ve yöneticiye anlık rol bildirimi.",
    href: "/asistan-ai",
    image: AHENK_ASISTAN_IMG,
    featured: true,
  },
  {
    slug: "whatsapp-cagri-merkezi",
    title: "WhatsApp çağrı merkezi",
    kicker: "Toplu mesaj + AI chat",
    excerpt:
      "Toplu WhatsApp, kişiye özel hitap, yapay zeka canlı chat ve otomatik arama kampanyası. ElevenLabs, OpenAI, Gemini, Geliver.",
    href: "/whatsapp-cagri-merkezi",
    image: AHENK_WHATSAPP_IMG,
    featured: true,
  },
  {
    slug: "polis-ai",
    title: "Polis AI",
    kicker: "Yapım aşamasında",
    excerpt:
      "Akıllı şehir ve bireysel güvenlik. Tek tuşla yardım, 112 bildirimi, hukuk rehberi. App Store ve Play Store çok yakında.",
    href: "/polis-ai",
    image: "/ahenk-polis-ai/hero.png",
  },
  {
    slug: "yekpare",
    title: "yekpare.net",
    kicker: "Hazır web sitesi",
    excerpt:
      "Ahenk BT’nin hazır site ekosistemi. Ücretsiz liste, harita, sarı sayfalar, sipariş ve rezervasyon ağı.",
    href: "/yekpare",
    image: AHENK_PHOTOS.yekpare,
  },
  {
    slug: "aiaddin",
    title: "Aiaddin.net",
    kicker: "Kurumsal AI IDE",
    excerpt: "Tarayıcıda Monaco, gerçek terminal ve Composer ajanı. Detay ve paketler aiaddin.net’de.",
    href: "/aiaddin",
    image: AHENK_PHOTOS.code,
  },
  {
    slug: "pbx-crm",
    title: "PBX CRM çağrı merkezi",
    kicker: "ÇM CRM · Peri",
    excerpt:
      "Yapay zeka destekli çağrı merkezi CRM. Listeli arama, FreePBX, veri kazıma, Peri asistan. pbx.goalgo.org",
    href: "/cagri-merkezi-crm",
    image: AHENK_PHOTOS.callCenter,
  },
  {
    slug: "haber-merkezi",
    title: "Haber Merkezi",
    kicker: "White-label gazete",
    excerpt: "Manşet, RSS, yazar, tema ve özel alan adı. Kendi gazeteniz, sunucu ve domain dahil paket.",
    href: "/haber-merkezi",
    image: AHENK_PHOTOS.news,
  },
  {
    slug: "yektube",
    title: "YekTube",
    kicker: "Video ve canlı TV",
    excerpt: "Kanallar, canlı yayın ve oynatma listeleri. Haber ve marka videoları için yerli yayın katmanı.",
    href: "/yektube",
    image: AHENK_PHOTOS.yektube,
  },
  {
    slug: "haberler",
    title: "Haberler",
    kicker: "Günlük vitrin",
    excerpt: "Son dakika, kategori akışı ve haber vitrini.",
    href: "/haberler",
    image: AHENK_PHOTOS.news,
  },
  {
    slug: "haber-haritasi",
    title: "Haber haritası",
    kicker: "Newsmap",
    excerpt: "Coğrafyaya pinlenen haber keşfi. Türkiye ve dünya akışı haritada.",
    href: "/newsmap",
    image: AHENK_PHOTOS.newsmap,
  },
  {
    slug: "web-yazilimi",
    title: "Web yazılımı",
    kicker: "Tüm sektörler",
    excerpt:
      "Avukat, doktor, restoran, haber, emlak ve kurumsal siteler. QR menü, POS, randevu — 1–3 günde teslim.",
    href: "/web-yazilimi",
    image: AHENK_PHOTOS.corporate,
  },
];
