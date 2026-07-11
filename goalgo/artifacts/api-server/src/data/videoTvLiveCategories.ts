/** Canlı TV arama / içe aktarma kategorileri */
export type LiveTvSearchCategory = {
  key: string;
  label: string;
  categorySlug: string;
  defaultQuery: string;
  /** Ek YouTube arama sorguları — aynı categorySlug ile içe aktarılır */
  extraQueries?: string[];
};

export const LIVE_FILM_DIZI_SLUG = "film-dizi";

export const LIVE_TV_SEARCH_CATEGORIES: LiveTvSearchCategory[] = [
  { key: "haber", label: "Haber", categorySlug: "haberler", defaultQuery: "haber" },
  { key: "yasam", label: "Yaşam", categorySlug: "eglence", defaultQuery: "yaşam" },
  {
    key: "film-dizi",
    label: "Canlı Film & Dizi",
    categorySlug: LIVE_FILM_DIZI_SLUG,
    defaultQuery: "türk sineması",
    extraQueries: ["dizi"],
  },
  { key: "radyo", label: "Radyo", categorySlug: "muzik", defaultQuery: "radyo" },
  { key: "doga", label: "Doğa", categorySlug: "doga", defaultQuery: "doğa" },
  { key: "komedi", label: "Komedi", categorySlug: "komedi", defaultQuery: "komedi" },
];

export function liveSearchCategoryByKey(key: string): LiveTvSearchCategory | undefined {
  const k = key.trim().toLowerCase();
  return LIVE_TV_SEARCH_CATEGORIES.find((c) => c.key === k || c.categorySlug === k);
}
