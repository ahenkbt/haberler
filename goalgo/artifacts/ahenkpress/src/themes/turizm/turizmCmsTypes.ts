import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import type { TurizmCategorySlug, TurizmIntroCard, TurizmIntroSection } from "./turizmCategoryIntroConfig";

export type TurizmCmsIntroCardRow = {
  id: number;
  category_slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: "main" | "sidebar";
  section_title: string | null;
  section_description: string | null;
  filter_json: Partial<ListingFilterState> | null;
  sort_order: number;
  blog_slug: string | null;
};

export type TurizmCmsBannerRow = {
  id: number;
  category_slug: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
  sort_order: number;
};

export type TurizmCmsFeaturedPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category_slug: string | null;
  published_at: string | null;
};

export type TurizmCmsPayload = {
  categorySlug: string;
  introCards: TurizmCmsIntroCardRow[];
  banners: TurizmCmsBannerRow[];
  featuredPosts: TurizmCmsFeaturedPost[];
};

export type TurizmBlogPostListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cover_image_url: string | null;
  category_slug: string | null;
  is_featured: boolean;
  published_at: string | null;
};

export type TurizmBlogPostDetail = TurizmBlogPostListItem & {
  body_html: string | null;
};

export const TURIZM_BLOG_CATEGORY_DISPLAY: Record<string, string> = {
  servis: "VIP TRANSFER",
  ucus: "UÇUŞ",
  otobus: "OTOBÜS",
  etkinlik: "ETKİNLİK",
  konaklama: "KONAKLAMA",
  "villa-ev": "VİLLA & EV",
  turlar: "TUR",
  arac: "ARAÇ KİRALAMA",
  yat: "YAT & TEKNE",
  "gezi-seyahat": "GEZİ & SEYAHAT",
};

export function turizmBlogCategoryLabel(categorySlug: string | null | undefined): string {
  if (!categorySlug) return "SEYAHAT";
  return TURIZM_BLOG_CATEGORY_DISPLAY[categorySlug] ?? categorySlug.toUpperCase();
}

export type MergedTurizmCms = {
  pageDescription?: string;
  mainSections: TurizmIntroSection[];
  sidebarCards: TurizmIntroCard[];
  banners: TurizmCmsBannerRow[];
  featuredPosts: TurizmCmsFeaturedPost[];
  slug: TurizmCategorySlug;
};
