import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Settings,
  LayoutGrid,
  Sparkles,
  Newspaper,
  Users,
  Tags,
  FileText,
  Menu,
  Megaphone,
  Mail,
  Inbox,
  Images,
  Image as ImageIcon,
  Video,
  ScrollText,
} from "lucide-react";

export type EditorNavItem = { name: string; icon: LucideIcon; href: string };

export const editorNavItems: EditorNavItem[] = [
  { name: "Özet", icon: LayoutDashboard, href: "/editor" },
  { name: "Genel ayarlar", icon: Settings, href: "/editor/genel-ayarlar" },
  { name: "Vitrin ayarları", icon: LayoutGrid, href: "/editor/vitrin" },
  { name: "Slider / Bant", icon: Sparkles, href: "/editor/manset" },
  { name: "Haberler", icon: Newspaper, href: "/editor/haberler" },
  { name: "İletişim", icon: Mail, href: "/editor/iletisim" },
  { name: "Posta kutusu", icon: Inbox, href: "/editor/posta-kutusu" },
  { name: "Köşe makaleleri", icon: ScrollText, href: "/editor/makaleler" },
  { name: "Köşe yazarları", icon: Users, href: "/editor/kose-yazarlari" },
  { name: "Kategoriler", icon: Tags, href: "/editor/kategoriler" },
  { name: "Sayfalar", icon: FileText, href: "/editor/sayfalar" },
  { name: "Menüler", icon: Menu, href: "/editor/menuler" },
  { name: "Reklam alanları", icon: Megaphone, href: "/editor/reklam-alanlari" },
  { name: "Foto galeri", icon: Images, href: "/editor/foto-galeri" },
  { name: "Video galeri", icon: Video, href: "/editor/video-galeri" },
  { name: "Medya", icon: ImageIcon, href: "/editor/medya" },
];

export function editorNavIsActive(location: string, href: string): boolean {
  if (location === href) return true;
  if (href === "/editor") return location === "/editor";
  return location.startsWith(href + "/") || location === href;
}
