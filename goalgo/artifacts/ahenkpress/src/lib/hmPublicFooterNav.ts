import { HM_STANDARD_NEWS_CATEGORIES } from "@/lib/hmStandardNewsCategories";

/** Haber merkezi vitrin footer’ında gösterilen sabit kategori slug’ları (API’den gelenlerle birleştirilebilir). */
export const HM_PUBLIC_FOOTER_CATEGORY_LINKS: { label: string; slug: string }[] = [
  ...HM_STANDARD_NEWS_CATEGORIES,
  { label: "Kültür", slug: "kultur" },
  { label: "Yaşam", slug: "yasam" },
  { label: "Sağlık", slug: "saglik" },
  { label: "Magazin", slug: "magazin" },
];
