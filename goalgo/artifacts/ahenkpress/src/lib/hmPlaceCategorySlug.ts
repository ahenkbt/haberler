import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

const HM_PLACE_LOCALITY_SLUGS = new Set([
  "ankara",
  "istanbul",
  "izmir",
  "antalya",
  "bursa",
  "adana",
  "gaziantep",
  "konya",
  "trabzon",
  "diyarbakir",
  "kirsehir",
]);

/** İl/yerel kategori sayfalarında karışık ulusal haber yedeği kullanılmaz. */
export function isHmPlaceCategorySlug(categorySlug: string | null | undefined): boolean {
  const slug = normalizeNewsCategorySlug(categorySlug);
  if (!slug) return false;
  if (slug === "yerel" || slug.endsWith("-yerel")) return true;
  if (slug === "bolge" || slug.includes("bolge")) return true;
  if (HM_PLACE_LOCALITY_SLUGS.has(slug)) return true;
  for (const key of HM_PLACE_LOCALITY_SLUGS) {
    if (slug.endsWith(`-${key}`)) return true;
  }
  return false;
}
