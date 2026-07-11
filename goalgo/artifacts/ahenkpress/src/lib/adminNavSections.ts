import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  FileBox,
  Users,
  Image as ImageIcon,
  Bot,
  Rss,
  Youtube,
  Settings,
  LayoutTemplate,
  MonitorPlay,
  Presentation,
  Tags,
  UploadCloud,
  ListOrdered,
  CreditCard,
  Store,
  FileSearch,
  Briefcase,
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  Truck,
  Ticket,
  Map,
  Star,
  Building2,
  Plane,
  CalendarDays,
  Car,
  Shield,
  MessageCircle,
  PhoneCall,
  Headphones,
  Package,
  Mail,
  Inbox,
  Megaphone,
  Info,
  Library,
  Images,
  Video,
  Layers,
  Globe,
  PenLine,
  ScrollText,
  SlidersHorizontal,
  Cloud,
  Phone,
} from "lucide-react";
import type { PanelPermissionId } from "./panelPermissionsCatalog";

export type AdminNavItem = {
  name: string;
  icon: LucideIcon;
  href: string;
  permission: PanelPermissionId;
  /** Menü görünürlüğü: listedeki herhangi bir izin yeterli */
  anyPermissions?: PanelPermissionId[];
  /** Yalnızca tam yetkili yönetici */
  fullAdminOnly?: boolean;
};

export type AdminNavSection = { id: string; title: string; items: AdminNavItem[] };

/** Sol menü + kontrol paneli hızlı bağlantıları için tek kaynak. */
export const adminNavSections: AdminNavSection[] = [
  {
    id: "icerik",
    title: "İçerik yönetimi",
    items: [
      { name: "Kontrol Paneli", icon: LayoutDashboard, href: "/admin", permission: "dashboard" },
      { name: "İçerik Havuzu", icon: Layers, href: "/admin/icerik-havuzu", permission: "hm_sites" },
      { name: "Haber siteleri (HM)", icon: Globe, href: "/admin/haber-siteleri", permission: "hm_sites" },
      { name: "HM telif sayfaları", icon: ScrollText, href: "/admin/hm-telif-sayfalari", permission: "haberler", anyPermissions: ["hm_sites", "haberler"] },
      { name: "Haberler", icon: Newspaper, href: "/admin/haberler", permission: "haberler" },
      { name: "Manşet Yönetimi", icon: Star, href: "/admin/manset-yonetimi", permission: "haberler" },
      { name: "Bant Yönetimi", icon: MonitorPlay, href: "/admin/bant-yonetimi", permission: "haberler" },
      { name: "Reklam Alanları", icon: Presentation, href: "/admin/reklam-alanlari", permission: "site_ayarlari" },
      { name: "Kategoriler", icon: Tags, href: "/admin/haber-kategorileri", permission: "haberler" },
      { name: "Blog Yazıları", icon: FileText, href: "/admin/blog-yazilari", permission: "haberler" },
      { name: "Sayfalar", icon: FileBox, href: "/admin/sayfalar", permission: "haberler" },
      { name: "Köşe Yazarları", icon: Users, href: "/admin/kose-yazarlari", permission: "haberler" },
      { name: "Medya", icon: ImageIcon, href: "/admin/medya", permission: "haberler" },
      { name: "Ansiklopedi", icon: Library, href: "/admin/ansiklopedi-yonetimi", permission: "haberler" },
      { name: "AI İçerik Robotu", icon: Bot, href: "/admin/ai-icerik-robotu", permission: "haberler" },
      { name: "Köşe makaleleri (HM)", icon: ScrollText, href: "/admin/hm-kose-makaleler", permission: "hm_sites" },
      { name: "AHB köşe içe aktar (HM)", icon: PenLine, href: "/admin/hm-kose-ice-aktar", permission: "hm_sites" },
      { name: "Haber aktar (AHB JSON)", icon: UploadCloud, href: "/admin/hm-haber-ice-aktar", permission: "hm_sites" },
      { name: "RSS Haberleri", icon: Rss, href: "/admin/rss-haberleri", permission: "haberler" },
      { name: "RSS Kampanyaları", icon: Rss, href: "/admin/rss-kampanyalari", permission: "haberler" },
      { name: "Foto Galeri", icon: Images, href: "/admin/foto-galeri", permission: "haberler" },
      { name: "Video Galeri", icon: Video, href: "/admin/video-galeri", permission: "haberler" },
      { name: "Video TV", icon: Youtube, href: "/admin/video-tv", permission: "haberler" },
      { name: "Yekpare Haberler (vitrin)", icon: SlidersHorizontal, href: "/admin/yekpare-haberler", permission: "haberler" },
      { name: "Resmi İlanlar", icon: FileSearch, href: "/admin/resmi-ilanlar", permission: "haritalar" },
      { name: "Toplu içe aktar (Haber / RSS)", icon: UploadCloud, href: "/admin/toplu-ice-aktar", permission: "haberler" },
    ],
  },
  {
    id: "mekan",
    title: "Mekan & dükkan yönetimi",
    items: [
      { name: "Dükkan İşletmeleri", icon: UtensilsCrossed, href: "/admin/siparis-isletmeleri", permission: "teslimat" },
      { name: "Dükkan Kategorileri", icon: Tags, href: "/admin/siparis-kategoriler", permission: "teslimat" },
      { name: "Vitrin Bannerları", icon: Presentation, href: "/admin/siparis-bannerlari", permission: "teslimat" },
      { name: "Menü & Ürünler", icon: ClipboardList, href: "/admin/siparis-menu-items", permission: "teslimat" },
      { name: "Teslimat Siparişleri", icon: Truck, href: "/admin/teslimat-siparisleri", permission: "teslimat" },
      { name: "Kupon Kodları", icon: Ticket, href: "/admin/kupon-kodlari", permission: "teslimat" },
    ],
  },
  {
    id: "alisveris",
    title: "Alışveriş yönetimi",
    items: [
      { name: "Alışveriş Mağazaları", icon: Store, href: "/admin/alisveris-isletmeleri", permission: "teslimat" },
      { name: "Siparişler", icon: ListOrdered, href: "/admin/siparisler", permission: "teslimat" },
      { name: "Ödeme Ayarları", icon: CreditCard, href: "/admin/odeme-ayarlari", permission: "premium" },
    ],
  },
  {
    id: "harita",
    title: "Harita & keşfet",
    items: [
      { name: "Harita & Kategoriler", icon: Map, href: "/admin/haritalar-yonetimi", permission: "haritalar" },
      { name: "Küresel Harita Haberleri", icon: Globe, href: "/admin/global-map-news", permission: "haritalar" },
      { name: "Öne Çıkan İşletmeler", icon: Star, href: "/admin/one-cikan-isletmeler", permission: "haritalar" },
    ],
  },
  {
    id: "turizm",
    title: "Turizm & seyahat",
    items: [
      { name: "Firma & İlan Yönetimi", icon: Building2, href: "/admin/turizm-yonetimi", permission: "turizm" },
      { name: "Turizm İlanları", icon: Plane, href: "/admin/turizm-ilanlar", permission: "turizm" },
      { name: "Rezervasyonlar", icon: CalendarDays, href: "/admin/turizm-rezervasyonlar", permission: "turizm" },
    ],
  },
  {
    id: "otomotiv",
    title: "Otomotiv ekosistemi",
    items: [
      { name: "Otomotiv Yönetimi", icon: Car, href: "/admin/otomotiv", permission: "otomotiv" },
      { name: "Sigorta Yönetimi", icon: Shield, href: "/admin/sigorta", permission: "otomotiv" },
    ],
  },
  {
    id: "ulasim",
    title: "Ulaşım & bildirim",
    items: [
      { name: "Ulaşım Yönetimi", icon: Car, href: "/admin/transport", permission: "ulasim" },
      { name: "WhatsApp Bildirimleri", icon: MessageCircle, href: "/admin/whatsapp-ayarlari", permission: "comms" },
    ],
  },
  {
    id: "cagri-merkezi",
    title: "Çağrı merkezi",
    items: [
      { name: "Yekpare AI Call", icon: PhoneCall, href: "/admin/yekpare-ai-call", permission: "comms" },
      { name: "Verimor Bulutsantralim", icon: Cloud, href: "/admin/yekpare-ai-call/verimor", permission: "comms" },
      { name: "3CX PBX", icon: Phone, href: "/admin/yekpare-ai-call/3cx", permission: "comms" },
      { name: "Klasik PBX", icon: Headphones, href: "/admin/pbx", permission: "comms" },
    ],
  },
  {
    id: "site",
    title: "Görünüm & site",
    items: [
      { name: "Panel hesapları", icon: Users, href: "/admin/panel-hesaplari", permission: "dashboard", fullAdminOnly: true },
      { name: "Genel Ayarlar", icon: Package, href: "/admin/ayarlar", permission: "site_ayarlari" },
      { name: "Servis sağlayıcılar — başvurular", icon: Briefcase, href: "/admin/servis-saglayicilar", permission: "servis_saglayicilar" },
      { name: "İş ortağı başvuruları", icon: ShoppingCart, href: "/admin/is-ortaklari", permission: "is_ortaklari" },
      { name: "Kariyer başvuruları", icon: Briefcase, href: "/admin/kariyer-basvurulari", permission: "kariyer" },
      { name: "Tema Ayarları", icon: Settings, href: "/admin/tema-ayarlari", permission: "site_ayarlari" },
      { name: "Yekpare Haberler (vitrin)", icon: SlidersHorizontal, href: "/admin/yekpare-haberler", permission: "site_ayarlari" },
      { name: "Anasayfa Tasarımı", icon: LayoutTemplate, href: "/admin/anasayfa-tasarim", permission: "site_ayarlari" },
      { name: "Anasayfa Modülleri", icon: LayoutTemplate, href: "/admin/anasayfa-modulleri", permission: "site_ayarlari" },
      { name: "İletişim Mesajları", icon: Mail, href: "/admin/iletisim-mesajlari", permission: "iletisim" },
      { name: "Posta & anasayfa duyuru", icon: Inbox, href: "/admin/posta-ve-duyurular", permission: "comms" },
      { name: "Platform Duyuruları", icon: Megaphone, href: "/admin/platform-duyurular", permission: "duyurular" },
      { name: "Destek Talepleri", icon: MessageCircle, href: "/admin/destek-talepleri", permission: "destek" },
      { name: "Lisans & Hakkında", icon: Info, href: "/admin/lisans", permission: "site_ayarlari" },
    ],
  },
];

export function adminNavItemIsActive(location: string, href: string): boolean {
  if (location === href) return true;
  if (href === "/admin") return false;
  return location.startsWith(href);
}

export function adminNavSectionIdsOpenForLocation(location: string): string[] {
  return adminNavSections
    .filter((sec) => sec.items.some((it) => adminNavItemIsActive(location, it.href)))
    .map((sec) => sec.id);
}

/** Tam yetkili: her şey; alt yönetici: yalnızca seçilen izinler + tam yetkiliye özel menü yok. */
function adminNavItemPermissionKeys(item: AdminNavItem): PanelPermissionId[] {
  return item.anyPermissions?.length ? item.anyPermissions : [item.permission];
}

export function adminNavItemVisible(
  item: AdminNavItem,
  opts: { panelFullAdmin: boolean; permissions: string[] | null },
): boolean {
  if (opts.panelFullAdmin) return true;
  if (item.fullAdminOnly) return false;
  const p = opts.permissions;
  if (!p || p.length === 0) return false;
  return adminNavItemPermissionKeys(item).some((perm) => p.includes(perm));
}

export function adminNavSectionsFiltered(opts: { panelFullAdmin: boolean; permissions: string[] | null }): AdminNavSection[] {
  return adminNavSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => adminNavItemVisible(it, opts)),
    }))
    .filter((sec) => sec.items.length > 0);
}

const EXTRA_ADMIN_PATH_RULES: { prefix: string; permission: PanelPermissionId; anyPermissions?: PanelPermissionId[] }[] = [
  { prefix: "/admin/hm-telif-sayfalari", permission: "haberler", anyPermissions: ["hm_sites", "haberler"] },
  { prefix: "/admin/hm-kose-makaleler", permission: "hm_sites" },
  { prefix: "/admin/hm-haber-ice-aktar", permission: "hm_sites" },
  { prefix: "/admin/haber-havuzu", permission: "hm_sites" },
  { prefix: "/admin/magaza-yonetimi", permission: "teslimat" },
  { prefix: "/admin/urunler", permission: "teslimat" },
  { prefix: "/admin/urun-kategorileri", permission: "teslimat" },
  { prefix: "/admin/kasiyer", permission: "teslimat" },
  { prefix: "/admin/hizli-kurulum", permission: "site_ayarlari" },
];

/** Menüde olmayan veya alt rota için gerekli izin. */
export function requiredPanelAccessForPath(
  location: string,
): { kind: "full" } | { kind: "perm"; perm: PanelPermissionId } | { kind: "anyPerm"; perms: PanelPermissionId[] } {
  const path = location.split("?")[0] || location;
  if (!path.startsWith("/admin")) return { kind: "perm", perm: "dashboard" };
  if (path.startsWith("/admin/panel-hesaplari")) return { kind: "full" };
  const flat = adminNavSections.flatMap((s) => s.items);
  let best: AdminNavItem | null = null;
  for (const it of flat) {
    if (path === it.href || (it.href !== "/admin" && path.startsWith(it.href))) {
      if (!best || it.href.length > best.href.length) best = it;
    }
  }
  if (best) {
    if (best.fullAdminOnly) return { kind: "full" };
    if (best.anyPermissions?.length) return { kind: "anyPerm", perms: best.anyPermissions };
    return { kind: "perm", perm: best.permission };
  }
  let bestExtra: (typeof EXTRA_ADMIN_PATH_RULES)[number] | null = null;
  for (const r of EXTRA_ADMIN_PATH_RULES) {
    if (path.startsWith(r.prefix)) {
      if (!bestExtra || r.prefix.length > bestExtra.prefix.length) bestExtra = r;
    }
  }
  if (bestExtra) {
    if (bestExtra.anyPermissions?.length) return { kind: "anyPerm", perms: bestExtra.anyPermissions };
    return { kind: "perm", perm: bestExtra.permission };
  }
  return { kind: "perm", perm: "dashboard" };
}

export function canAccessAdminPath(
  location: string,
  access: { loaded: boolean; panelFullAdmin: boolean; permissions: string[] | null },
): boolean {
  if (!access.loaded) return true;
  if (access.panelFullAdmin) return true;
  const req = requiredPanelAccessForPath(location);
  if (req.kind === "full") return false;
  const p = access.permissions;
  if (!p || p.length === 0) return false;
  if (req.kind === "anyPerm") return req.perms.some((perm) => p.includes(perm));
  return p.includes(req.perm);
}
