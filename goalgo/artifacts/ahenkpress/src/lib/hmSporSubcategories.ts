/** SPOR kutusu iç kategorileri (Spor Depor RSS) + 2 büyük + 4 kutu düzeni. */

export const HM_SPOR_BOX_LEAD_COUNT = 2;
export const HM_SPOR_BOX_CARD_COUNT = 4;
export const HM_SPOR_BOX_TOTAL = HM_SPOR_BOX_LEAD_COUNT + HM_SPOR_BOX_CARD_COUNT;

export type HmSporSubcategoryId = "all" | "futbol" | "basketbol" | "tenis" | "voleybol" | "ozel-haber";

export type HmSporSubcategory = {
  id: HmSporSubcategoryId;
  label: string;
  /** Hybrid API categorySlug — «all» için spor. */
  categorySlug: string;
  feedUrl?: string;
};

/** Tek yön: bu slug’lar «spor» kutusuna düşer; spor feed’i alt kategoriye düşmez. */
export const HM_SPOR_SUBCATEGORY_SLUGS = [
  "futbol",
  "basketbol",
  "tenis",
  "voleybol",
  "ozel-haber",
  "ozelhaber",
] as const;

export const HM_SPOR_SUBCATEGORIES: readonly HmSporSubcategory[] = [
  { id: "all", label: "Tümü", categorySlug: "spor" },
  {
    id: "futbol",
    label: "Futbol",
    categorySlug: "futbol",
    feedUrl: "https://www.spordepor.com/rss/futbol",
  },
  {
    id: "basketbol",
    label: "Basketbol",
    categorySlug: "basketbol",
    feedUrl: "https://www.spordepor.com/rss/basketbol",
  },
  {
    id: "tenis",
    label: "Tenis",
    categorySlug: "tenis",
    feedUrl: "https://www.spordepor.com/rss/tenis",
  },
  {
    id: "voleybol",
    label: "Voleybol",
    categorySlug: "voleybol",
    feedUrl: "https://www.spordepor.com/rss/voleybol",
  },
  {
    id: "ozel-haber",
    label: "Özel Haber",
    categorySlug: "ozel-haber",
    feedUrl: "https://www.spordepor.com/rss/ozel-haber",
  },
] as const;

export const HM_SPOR_SUBCATEGORY_RSS_ROWS = HM_SPOR_SUBCATEGORIES.filter(
  (row): row is HmSporSubcategory & { feedUrl: string } => Boolean(row.feedUrl),
).map((row) => ({
  id: row.id,
  categoryKey: row.id,
  label: row.label,
  url: row.feedUrl,
}));

export function isSporSubcategorySlug(raw: unknown): boolean {
  const slug = String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (HM_SPOR_SUBCATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function isSporHomeBoxSlug(raw: unknown): boolean {
  const slug = String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "spor" || slug === "sport" || isSporSubcategorySlug(slug);
}
