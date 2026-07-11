export function normalizeNewsCategorySlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** camelCase RSS anahtarlarını okunabilir slug adaylarına çevirir (savunmaSanayi ÔåÆ savunma-sanayi). */
export function splitCamelCaseCategoryToken(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text || !/[A-Z]/.test(text)) return text;
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2");
}

export function hmCategorySlug(...values: unknown[]): string {
  for (const value of values) {
    const slug = normalizeNewsCategorySlug(value);
    if (slug) return slug;
    const camel = splitCamelCaseCategoryToken(value);
    if (camel !== value) {
      const fromCamel = normalizeNewsCategorySlug(camel);
      if (fromCamel) return fromCamel;
    }
  }
  return "";
}

export function hmCategorySlugCandidates(...values: unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const raw = String(value ?? "").trim();
    const variants = raw ? [raw, splitCamelCaseCategoryToken(raw)] : [value];
    for (const variant of variants) {
      const slug = normalizeNewsCategorySlug(variant);
      if (slug) seen.add(slug);
    }
  }
  return Array.from(seen);
}

export function humanizeNewsCategorySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ") || "Kategori";
}
