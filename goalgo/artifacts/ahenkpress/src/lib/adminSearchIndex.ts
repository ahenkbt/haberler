import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  CalendarDays,
  Car,
  Cloud,
  CreditCard,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Map,
  Megaphone,
  Newspaper,
  Package,
  PhoneCall,
  Phone,
  Plane,
  Search,
  ScrollText,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Youtube,
} from "lucide-react";
import { adminNavSections } from "./adminNavSections";

export type AdminSearchEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
  icon: LucideIcon;
  section?: string;
};

function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c");
}

function entry(
  partial: Omit<AdminSearchEntry, "keywords"> & { keywords?: string[] },
): AdminSearchEntry {
  const baseKeywords = [
    partial.title,
    partial.description,
    partial.section ?? "",
    partial.href,
    ...(partial.keywords ?? []),
  ];
  return {
    ...partial,
    keywords: Array.from(new Set(baseKeywords.map((k) => normalizeTr(k)).filter(Boolean))),
  };
}

/** Nav menüsü + sık aranan ayarlar / entegrasyonlar. */
export const ADMIN_SEARCH_INDEX: AdminSearchEntry[] = [
  ...adminNavSections.flatMap((section) =>
    section.items.map((item) =>
      entry({
        id: `nav-${item.href}`,
        title: item.name,
        description: `${section.title} — ${item.name}`,
        href: item.href,
        icon: item.icon,
        section: section.title,
        keywords: [section.title, section.id, item.permission],
      }),
    ),
  ),
  entry({
    id: "gemini-api",
    title: "Google Gemini API anahtarı",
    description: "Yekpare AI ve içerik robotu için Gemini — Genel Ayarlar → Entegrasyonlar",
    href: "/admin/ayarlar?tab=entegrasyon#gemini-api-key",
    icon: Sparkles,
    section: "Entegrasyonlar",
    keywords: [
      "gemini",
      "google ai",
      "yapay zeka",
      "yekpare ai",
      "api anahtari",
      "api key",
      "entegrasyon",
      "openai",
      "deepseek",
    ],
  }),
  entry({
    id: "yekpare-ai-widget",
    title: "Yekpare AI (site rehberi)",
    description: "Ziyaretçi sohbet kutusu — Gemini anahtarı ile çalışır",
    href: "/admin/ayarlar?tab=entegrasyon#gemini-api-key",
    icon: Bot,
    section: "Yekpare AI",
    keywords: ["sohbet", "chat", "asistan", "rehber", "widget", "yekpare ai"],
  }),
  entry({
    id: "seo-sitemap",
    title: "SEO ve site haritası",
    description: "Google doğrulama, sitemap.xml, llms.txt — Genel Ayarlar → SEO",
    href: "/admin/ayarlar?tab=seo",
    icon: Search,
    section: "SEO",
    keywords: ["sitemap", "google search console", "dogrulama", "geo", "llms", "robots"],
  }),
  entry({
    id: "openai-settings",
    title: "OpenAI API ayarları",
    description: "AI İçerik Robotu ve haber üretimi",
    href: "/admin/ai-icerik-robotu",
    icon: Bot,
    section: "Yapay zekâ",
    keywords: ["openai", "gpt", "icerik robotu", "haber ai"],
  }),
  entry({
    id: "anasayfa-modul",
    title: "Anasayfa modül sırası",
    description: "Vitrin bölümlerini aç/kapat ve sırala",
    href: "/admin/anasayfa-modulleri",
    icon: LayoutTemplate,
    section: "Görünüm",
    keywords: ["vitrin", "modul", "anasayfa", "bolum"],
  }),
  entry({
    id: "kullanicilar-panel",
    title: "Kullanıcılar ve panel hesapları",
    description: "Yönetici ve alt yönetici izinleri",
    href: "/admin/panel-hesaplari",
    icon: Users,
    section: "Yönetim",
    keywords: ["kullanici", "hesap", "izin", "yetki", "admin"],
  }),
  entry({
    id: "magaza-siparis",
    title: "Mağaza ve siparişler",
    description: "E-ticaret mağazaları ve sipariş listesi",
    href: "/admin/siparisler",
    icon: ShoppingCart,
    section: "Alışveriş",
    keywords: ["magaza", "e-ticaret", "siparis", "alisveris", "urun"],
  }),
  entry({
    id: "yemek-siparis",
    title: "Yemek ve teslimat siparişleri",
    description: "Restoran / market sipariş yönetimi",
    href: "/admin/teslimat-siparisleri",
    icon: Truck,
    section: "Sipariş",
    keywords: ["yemek", "market", "teslimat", "restoran", "kurye"],
  }),
  entry({
    id: "turizm-rez",
    title: "Turizm rezervasyonları",
    description: "Otel, tur ve seyahat rezervasyonları",
    href: "/admin/turizm-rezervasyonlar",
    icon: CalendarDays,
    section: "Turizm",
    keywords: ["turizm", "otel", "rezervasyon", "seyahat", "villa"],
  }),
  entry({
    id: "haber-yazar",
    title: "Haberler ve yazarlar",
    description: "Haber listesi ve köşe yazarları",
    href: "/admin/haberler",
    icon: Newspaper,
    section: "İçerik",
    keywords: ["haber", "yazar", "kose", "manset", "icerik"],
  }),
  entry({
    id: "genel-ayarlar",
    title: "Genel ayarlar",
    description: "Site adı, logo, iletişim, entegrasyonlar",
    href: "/admin/ayarlar",
    icon: Package,
    section: "Ayarlar",
    keywords: ["ayar", "site adi", "logo", "iletisim", "entegrasyon"],
  }),
  entry({
    id: "tema",
    title: "Tema ayarları",
    description: "Renkler ve public tema",
    href: "/admin/tema-ayarlari",
    icon: Settings,
    section: "Görünüm",
    keywords: ["tema", "renk", "görünüm"],
  }),
  entry({
    id: "global-map-news",
    title: "Küresel harita haberleri",
    description: "Newsmap için dünya geneli RSS kaynakları",
    href: "/admin/global-map-news",
    icon: Globe,
    section: "Harita",
    keywords: ["newsmap", "rss", "küresel", "dünya", "harita", "global"],
  }),
  entry({
    id: "harita-kesfet",
    title: "Harita ve keşfet",
    description: "Harita kategorileri ve öne çıkan işletmeler",
    href: "/admin/haritalar-yonetimi",
    icon: Map,
    section: "Harita",
    keywords: ["harita", "kesfet", "isletme", "konum"],
  }),
  entry({
    id: "hm-siteler",
    title: "Haber merkezi siteleri",
    description: "HM özel alan ve haber siteleri",
    href: "/admin/haber-siteleri",
    icon: Globe,
    section: "Haber Merkezi",
    keywords: ["haber merkezi", "hm", "ozel alan", "domain"],
  }),
  entry({
    id: "hm-telif-sayfalari",
    title: "HM telif sayfaları",
    description: "Haber sitesi telif hakkı ve kullanım şartları varsayılan metni",
    href: "/admin/hm-telif-sayfalari",
    icon: ScrollText,
    section: "Haber Merkezi",
    keywords: ["telif", "kullanim", "haber sitesi", "hm", "rss", "5651"],
  }),
  entry({
    id: "odeme",
    title: "Ödeme ayarları",
    description: "Stripe ve ödeme entegrasyonları",
    href: "/admin/odeme-ayarlari",
    icon: CreditCard,
    section: "Ödeme",
    keywords: ["odeme", "stripe", "premium"],
  }),
  entry({
    id: "yektube",
    title: "Video TV (Yektube)",
    description: "Hızlı senkron — tam yönetim için Yektube Studio",
    href: "/admin/video-tv",
    icon: Youtube,
    section: "Video",
    keywords: ["yektube", "video", "youtube", "studio", "yekçek"],
  }),
  entry({
    id: "ai-call",
    title: "Yekpare AI Call",
    description: "Çağrı merkezi ve sesli asistan",
    href: "/admin/yekpare-ai-call",
    icon: PhoneCall,
    section: "Çağrı merkezi",
    keywords: ["cagri", "call center", "ses", "sip"],
  }),
  entry({
    id: "verimor",
    title: "Verimor Bulutsantralim",
    description: "Dahili no, şifre, domain — API key olmadan softphone",
    href: "/admin/yekpare-ai-call/verimor",
    icon: Cloud,
    section: "Çağrı merkezi",
    keywords: ["verimor", "bulutsantralim", "bulut santral", "dahili", "softphone", "sip", "webrtc", "pbx", "agent"],
  }),
  entry({
    id: "3cx",
    title: "3CX PBX",
    description: "Configuration API — FQDN, OAuth client, otomatik dahili",
    href: "/admin/yekpare-ai-call/3cx",
    icon: Phone,
    section: "Çağrı merkezi",
    keywords: ["3cx", "pbx", "xapi", "configuration api", "webrtc", "dahili", "softphone", "fqdn"],
  }),
  entry({
    id: "verimor-agent",
    title: "Verimor agentler",
    description: "Yekpare kullanıcı + Verimor dahili tanımla",
    href: "/admin/yekpare-ai-call/temsilci",
    icon: Users,
    section: "Çağrı merkezi",
    keywords: ["verimor", "agent", "temsilci", "dahili", "personel"],
  }),
  entry({
    id: "verimor-kampanya",
    title: "Verimor kampanyalar",
    description: "Outbound kampanya oluştur ve başlat",
    href: "/admin/yekpare-ai-call/kampanya",
    icon: Megaphone,
    section: "Çağrı merkezi",
    keywords: ["verimor", "kampanya", "outbound", "arama listesi"],
  }),
  entry({
    id: "duyuru",
    title: "Platform duyuruları",
    description: "Anasayfa ve platform duyuruları",
    href: "/admin/platform-duyurular",
    icon: Megaphone,
    section: "Duyuru",
    keywords: ["duyuru", "bildirim", "anasayfa"],
  }),
  entry({
    id: "siparis-isletme",
    title: "Dükkan işletmeleri",
    description: "Yemek ve market işletmeleri",
    href: "/admin/siparis-isletmeleri",
    icon: UtensilsCrossed,
    section: "Sipariş",
    keywords: ["dukkan", "isletme", "restoran"],
  }),
  entry({
    id: "alisveris-magaza",
    title: "Alışveriş mağazaları",
    description: "E-ticaret mağaza listesi",
    href: "/admin/alisveris-isletmeleri",
    icon: Store,
    section: "Alışveriş",
    keywords: ["magaza", "store", "ecommerce"],
  }),
  entry({
    id: "turizm-firma",
    title: "Turizm firma yönetimi",
    description: "Turizm firmaları ve ilanlar",
    href: "/admin/turizm-yonetimi",
    icon: Building2,
    section: "Turizm",
    keywords: ["turizm", "firma", "ilan"],
  }),
  entry({
    id: "turizm-ilan",
    title: "Turizm ilanları",
    description: "Otel, tur, rent a car ilanları",
    href: "/admin/turizm-ilanlar",
    icon: Plane,
    section: "Turizm",
    keywords: ["otel", "tur", "rent a car", "yat"],
  }),
  entry({
    id: "otomotiv-yonetim",
    title: "Otomotiv yönetimi",
    description: "Galeri, parça, servis, lastik işletmeleri",
    href: "/admin/otomotiv",
    icon: Car,
    section: "Otomotiv",
    keywords: ["otomotiv", "galeri", "parca", "servis", "lastik", "arac"],
  }),
  entry({
    id: "sigorta-yonetim",
    title: "Sigorta yönetimi",
    description: "Trafik ve kasko lead, acente onay, broker API",
    href: "/admin/sigorta",
    icon: Shield,
    section: "Otomotiv",
    keywords: ["sigorta", "kasko", "trafik", "acente", "lead", "broker"],
  }),
  entry({
    id: "dashboard",
    title: "Kontrol paneli",
    description: "Yönetim ana sayfası ve özet",
    href: "/admin",
    icon: LayoutDashboard,
    section: "Genel",
    keywords: ["dashboard", "ozet", "anasayfa", "panel"],
  }),
];

export function searchAdminIndex(query: string, limit = 12): AdminSearchEntry[] {
  const q = normalizeTr(query.trim());
  if (!q || q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = ADMIN_SEARCH_INDEX.map((entry) => {
    let score = 0;
    const titleN = normalizeTr(entry.title);
    const descN = normalizeTr(entry.description);
    const hrefN = normalizeTr(entry.href);
    if (titleN.includes(q)) score += 12;
    if (descN.includes(q)) score += 6;
    if (hrefN.includes(q)) score += 4;
    for (const kw of entry.keywords) {
      if (kw.includes(q)) score += 5;
      for (const t of tokens) {
        if (t.length < 2) continue;
        if (kw.includes(t)) score += 2;
        if (titleN.includes(t)) score += 3;
      }
    }
    return { entry, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "tr"));
  return scored.slice(0, limit).map((x) => x.entry);
}
