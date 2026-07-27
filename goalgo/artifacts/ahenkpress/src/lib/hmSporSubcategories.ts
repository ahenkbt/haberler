/** SPOR kutusu iç kategorileri + 2 büyük + 4 kutu düzeni. */

export const HM_SPOR_BOX_LEAD_COUNT = 2;
export const HM_SPOR_BOX_CARD_COUNT = 4;
export const HM_SPOR_BOX_TOTAL = HM_SPOR_BOX_LEAD_COUNT + HM_SPOR_BOX_CARD_COUNT;

/** «Tümü» sekmesi varsayılan RSS kaynağı. */
export const HM_SPOR_ALL_FEED_URL = "https://www.ntv.com.tr/sporskor.rss";

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
  {
    id: "all",
    label: "Tümü",
    categorySlug: "spor",
    feedUrl: HM_SPOR_ALL_FEED_URL,
  },
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
  (row): row is HmSporSubcategory & { feedUrl: string } => row.id !== "all" && Boolean(row.feedUrl),
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
  return slug === "spor" || slug === "sport" || slug === "sporskor" || isSporSubcategorySlug(slug);
}

/** NTV Spor Skor satırı mı? («Tümü» önceliği). */
export function isNtvSporSkorItem(item: {
  id?: string | number | null;
  href?: string | null;
  rssSourceUrl?: string | null;
  originUrl?: string | null;
  feedLabel?: string | null;
  categorySlug?: string | null;
}): boolean {
  const blob = [
    item.rssSourceUrl,
    item.href,
    item.originUrl,
    item.id,
    item.feedLabel,
    item.categorySlug,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  if (blob.includes("ntv.com.tr") && blob.includes("sporskor")) return true;
  if (blob.includes("sporskor.rss")) return true;
  return false;
}

/** «Tümü»: önce NTV Spor Skor, sonra diğer spor; tam 6’ya tamamla. */
export function pickSporAllBoxItems<T extends Parameters<typeof isNtvSporSkorItem>[0]>(
  primary: readonly T[],
  fallback: readonly T[] = [],
  limit: number = HM_SPOR_BOX_TOTAL,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const keyOf = (item: T) => {
    const id = String(item.id ?? "").trim();
    if (id) return `id:${id}`;
    const href = String(item.href ?? item.rssSourceUrl ?? item.originUrl ?? "").trim();
    if (href) return `href:${href}`;
    return "";
  };
  const push = (item: T | undefined) => {
    if (!item || out.length >= limit) return;
    const key = keyOf(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  const pool = [...primary, ...fallback];
  for (const item of pool) {
    if (isNtvSporSkorItem(item)) push(item);
  }
  for (const item of pool) {
    if (!isNtvSporSkorItem(item)) push(item);
  }
  return out;
}
