import { KESFET_SCRAPER_BACKFILL_CATEGORIES, type KesfetScraperBackfillCategory } from "./map-scraper-categories.js";

export type KesfetBackfillRegion = "turkiye" | "kktc" | "azerbaycan" | "global";

export type DynamicKesfetBackfillCity = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  region: KesfetBackfillRegion;
};

/** Sarı Sayfalar özel işletme kategorileri — kamu kayıtları hariç. */
export const NEWSMAP_SARI_SAYFALAR_SCRAPE_CATEGORIES: KesfetScraperBackfillCategory[] =
  KESFET_SCRAPER_BACKFILL_CATEGORIES.filter((cat) => cat.public !== true);

function normalizeImportDedupeText(value: string): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Koordinattan bölge — haber haritası küresel kapsam (Türkiye sınırı yok). */
export function inferKesfetBackfillRegion(lat: number, lng: number): KesfetBackfillRegion {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "global";
  if (lat >= 35.5 && lat <= 42.5 && lng >= 25.5 && lng <= 45.0) return "turkiye";
  if (lat >= 34.9 && lat <= 35.85 && lng >= 32.5 && lng <= 34.95) return "kktc";
  if (lat >= 38.3 && lat <= 42.0 && lng >= 44.5 && lng <= 51.0) return "azerbaycan";
  return "global";
}

export function buildDynamicKesfetBackfillCity(label: string, lat: number, lng: number): DynamicKesfetBackfillCity {
  const region = inferKesfetBackfillRegion(lat, lng);
  const normLabel = String(label || "Map location").trim().slice(0, 48) || "Map location";
  return {
    key: `public:${region}:${normalizeImportDedupeText(normLabel).replace(/\s+/g, "-")}:${lat.toFixed(2)}:${lng.toFixed(2)}`,
    label: normLabel,
    lat,
    lng,
    region,
  };
}

export function resolveNewsmapScrapeCategories(categorySlugs?: string[] | null): KesfetScraperBackfillCategory[] {
  const slugs = (categorySlugs ?? [])
    .map((slug) => String(slug ?? "").trim())
    .filter(Boolean);
  if (slugs.length === 0) return NEWSMAP_SARI_SAYFALAR_SCRAPE_CATEGORIES;
  const allowed = new Set(slugs);
  return NEWSMAP_SARI_SAYFALAR_SCRAPE_CATEGORIES.filter((cat) => allowed.has(cat.slug));
}
