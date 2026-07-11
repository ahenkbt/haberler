/** Frontend kategori eşleştirme — API ile aynı kanonik slug mantığı (eski API yedek filtresi). */

const CATEGORY_CANONICAL_ALIASES: Record<string, readonly string[]> = {
  sinema: ["film-ve-animasyon", "film", "filmler", "sinema-filmleri"],
  muzik: ["music", "muzik-videolari"],
  eglence: ["eglence-videolari", "entertainment"],
  cocuk: ["kids", "cocuk-videolari"],
};

export function slugifyCategorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalCategorySlug(value: string | null | undefined): string {
  const norm = slugifyCategorySlug(value ?? "");
  if (!norm) return "";
  for (const [canonical, aliases] of Object.entries(CATEGORY_CANONICAL_ALIASES)) {
    if (norm === canonical || aliases.includes(norm)) return canonical;
  }
  return norm;
}

export function videoMatchesCategory(
  video: { categorySlug?: string | null },
  categorySlug: string | undefined | null,
): boolean {
  const filter = canonicalCategorySlug(categorySlug ?? "");
  if (!filter || filter === "all") return true;
  return canonicalCategorySlug(video.categorySlug) === filter;
}

export function filterVideosByCategory<T extends { categorySlug?: string | null }>(
  items: T[],
  categorySlug: string | undefined | null,
): T[] {
  const filter = canonicalCategorySlug(categorySlug ?? "");
  if (!filter || filter === "all") return items;
  return items.filter((v) => videoMatchesCategory(v, filter));
}
