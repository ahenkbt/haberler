import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Camera,
  Car,
  Cpu,
  FileText,
  FlaskConical,
  Globe2,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  List,
  Mail,
  Mountain,
  Newspaper,
  PenLine,
  Phone,
  Plane,
  PlayCircle,
  Scale,
  Shield,
  Sparkles,
  Trophy,
  TrendingUp,
  Utensils,
  Video,
  Zap,
} from "lucide-react";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

const SLUG_ICONS: Record<string, LucideIcon> = {
  gundem: Newspaper,
  turkiye: Landmark,
  ankara: Building2,
  istanbul: Building2,
  izmir: Building2,
  ekonomi: TrendingUp,
  para: TrendingUp,
  finans: TrendingUp,
  spor: Trophy,
  futbol: Trophy,
  basketbol: Trophy,
  dunya: Globe2,
  global: Globe2,
  teknoloji: Cpu,
  bilim: FlaskConical,
  saglik: Heart,
  yasam: Home,
  kultur: BookOpen,
  sanat: Sparkles,
  magazin: Sparkles,
  egitim: GraduationCap,
  savunma: Shield,
  "savunma-sanayi": Shield,
  otomobil: Car,
  seyahat: Plane,
  turizm: Mountain,
  yemek: Utensils,
  tarim: Mountain,
  enerji: Zap,
  cevre: Mountain,
  hava: Zap,
  politika: Landmark,
  siyaset: Landmark,
  adliye: Scale,
  emniyet: Shield,
  blog: PenLine,
  video: Video,
  galeri: Camera,
  foto: Camera,
  kose: PenLine,
  yazar: PenLine,
  yazarlar: PenLine,
  iletisim: Phone,
  kunye: FileText,
  reklam: Mail,
  abonelik: Mail,
  telif: FileText,
  "tum-haberler": List,
  anasayfa: Home,
  home: Home,
  sondakika: Newspaper,
  yektube: PlayCircle,
  "video-tv": PlayCircle,
};

const LABEL_ICONS: Record<string, LucideIcon> = {
  anasayfa: Home,
  "tum haberler": List,
  yazarlar: PenLine,
  yektube: PlayCircle,
  gundem: Newspaper,
  ekonomi: TrendingUp,
  spor: Trophy,
  dunya: Globe2,
  teknoloji: Cpu,
  kultur: BookOpen,
};

function matchSlugIcon(slug: string): LucideIcon | null {
  if (SLUG_ICONS[slug]) return SLUG_ICONS[slug]!;
  for (const [key, icon] of Object.entries(SLUG_ICONS)) {
    if (slug.includes(key) || key.includes(slug)) return icon;
  }
  return null;
}

function matchLabelIcon(name: string): LucideIcon | null {
  const norm = name.trim().toLocaleLowerCase("tr-TR");
  if (LABEL_ICONS[norm]) return LABEL_ICONS[norm]!;
  for (const [key, icon] of Object.entries(LABEL_ICONS)) {
    if (norm.includes(key)) return icon;
  }
  for (const [key, icon] of Object.entries(SLUG_ICONS)) {
    if (norm.includes(key.replace(/-/g, " ")) || norm.includes(key)) return icon;
  }
  return null;
}

/** Kategori slug veya etiketinden Lucide nav ikonu (HmSumbulCategoryNavStrip ile uyumlu). */
export function resolveHmCategoryLucideIcon(slugRaw: unknown, nameRaw?: unknown): LucideIcon {
  const slug = normalizeNewsCategorySlug(slugRaw) || normalizeNewsCategorySlug(nameRaw);
  if (slug) {
    const matched = matchSlugIcon(slug);
    if (matched) return matched;
  }
  const name = String(nameRaw ?? slugRaw ?? "").trim();
  if (name) {
    const matched = matchLabelIcon(name);
    if (matched) return matched;
  }
  return Newspaper;
}
