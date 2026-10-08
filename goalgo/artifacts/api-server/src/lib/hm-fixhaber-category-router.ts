/**
 * Fix Haber — RSS / kampanya kategori slug yönlendirme ve kategori sayfası genişletmesi.
 */
import { canonicalizeRssCategorySlug, rssCategorySlugsMatch } from "./hm-rss-category-aliases.js";
import {
  resolveHmTopicCategorySlug,
  type HmSiteCategoryCatalogRow,
} from "./hm-local-category-router.js";
import { categorySlugFromFixHaberFeed, isFixHaberSiteSlug } from "./hm-fixhaber-rss-feeds.js";
import { FIXHABER_SLUG } from "./hm-fixhaber-site.js";

function normalizeSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Standart RSS anahtarı → Fix Haber site slug. */
const CANONICAL_TO_FIXHABER: Record<string, string> = {
  gundem: "fixhaber-gundem",
  dunya: "fixhaber-dunya",
  ekonomi: "fixhaber-ekonomi",
  spor: "fixhaber-spor",
  teknoloji: "fixhaber-teknoloji",
  bilim: "fixhaber-bilim",
  bilisim: "fixhaber-yazilim",
  saglik: "fixhaber-saglik",
  otomobil: "fixhaber-otomobil-mobilite",
  magazin: "fixhaber-gundem",
  politika: "fixhaber-gundem",
  siyaset: "fixhaber-gundem",
  yasam: "fixhaber-gundem",
  egitim: "fixhaber-gundem",
  asayis: "fixhaber-gundem",
  oyun: "fixhaber-oyun",
  "yapay-zeka": "fixhaber-yapay-zeka",
  "siber-guvenlik": "fixhaber-siber-guvenlik",
  kripto: "fixhaber-kripto-blockchain",
  blockchain: "fixhaber-kripto-blockchain",
  uzay: "fixhaber-uzay-bilim",
  inceleme: "fixhaber-incelemeler",
  haberler: "fixhaber-haberler",
};

const LISTING_EXPANSION: Record<string, readonly string[]> = {
  "fixhaber-bilim": ["fixhaber-bilim", "fixhaber-uzay-bilim"],
  "fixhaber-donanim": [
    "fixhaber-donanim",
    "fixhaber-donanim-pc-laptop",
    "fixhaber-donanim-bilesenler",
    "fixhaber-teknoloji",
  ],
  "fixhaber-mobil": ["fixhaber-mobil", "fixhaber-mobil-telefonlar", "fixhaber-mobil-akilli-saatler"],
  "fixhaber-haberler": ["fixhaber-haberler", "fixhaber-teknoloji", "fixhaber-yapay-zeka"],
  "fixhaber-teknoloji": ["fixhaber-teknoloji", "fixhaber-yapay-zeka", "fixhaber-haberler"],
  "fixhaber-yazilim": ["fixhaber-yazilim", "fixhaber-siber-guvenlik"],
  "fixhaber-gundem": ["fixhaber-gundem", "fixhaber-haberler"],
};

function catalogHasSlug(catalog: HmSiteCategoryCatalogRow[] | null | undefined, slug: string): boolean {
  if (!catalog?.length) return true;
  const want = normalizeSlug(slug);
  return catalog.some((row) => normalizeSlug(row.slug) === want);
}

export function mapCanonicalSlugToFixHaber(raw: unknown): string {
  const slug = normalizeSlug(raw);
  if (!slug) return "fixhaber-haberler";
  if (slug.startsWith("fixhaber-")) return slug;
  const canon = canonicalizeRssCategorySlug(slug) || slug;
  return CANONICAL_TO_FIXHABER[canon] ?? CANONICAL_TO_FIXHABER[slug] ?? `fixhaber-${canon}`;
}

function refineFixHaberTopicSlug(
  title: string | null | undefined,
  spot: string | null | undefined,
  content: string | null | undefined,
): string {
  const text = `${title ?? ""} ${spot ?? ""} ${content ?? ""}`.toLocaleLowerCase("tr-TR");
  if (/\b(yapay zeka|openai|chatgpt|llm|gemini|claude)\b/i.test(text)) return "fixhaber-yapay-zeka";
  if (/\b(oyun|playstation|xbox|steam|nintendo|espor)\b/i.test(text)) return "fixhaber-oyun";
  if (/\b(kripto|bitcoin|ethereum|blockchain)\b/i.test(text)) return "fixhaber-kripto-blockchain";
  if (/\b(siber|hack|fidye yazilimi|ransomware)\b/i.test(text)) return "fixhaber-siber-guvenlik";
  if (/\b(iphone|android|telefon|akilli saat|galaxy|pixel)\b/i.test(text)) return "fixhaber-mobil";
  if (/\b(nvidia|amd|intel|ekran karti|islemci|anakart|ssd|ram)\b/i.test(text)) return "fixhaber-donanim";
  if (/\b(uzay|nasa|spacex|roket|gözlem|teleskop)\b/i.test(text)) return "fixhaber-uzay-bilim";
  const topic = resolveHmTopicCategorySlug(title, spot, content);
  return mapCanonicalSlugToFixHaber(topic);
}

export function resolveFixHaberImportCategorySlug(
  wantCategorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
  opts?: {
    feedUrl?: string | null;
    siteCategories?: HmSiteCategoryCatalogRow[] | null;
  },
): string {
  const fromFeed = opts?.feedUrl ? categorySlugFromFixHaberFeed(opts.feedUrl) : null;
  let slug = fromFeed ?? mapCanonicalSlugToFixHaber(wantCategorySlug);

  const generic = new Set(["fixhaber-haberler", "fixhaber-gundem", "fixhaber-teknoloji"]);
  const refined = refineFixHaberTopicSlug(title, spot, content);
  if (!generic.has(refined) && (generic.has(slug) || slug === refined)) {
    slug = refined;
  } else if (generic.has(slug) && slug === "fixhaber-haberler" && !generic.has(refined)) {
    slug = refined;
  }

  if (!catalogHasSlug(opts?.siteCategories, slug)) {
    const fallback = mapCanonicalSlugToFixHaber(wantCategorySlug);
    if (catalogHasSlug(opts?.siteCategories, fallback)) return fallback;
    if (catalogHasSlug(opts?.siteCategories, "fixhaber-haberler")) return "fixhaber-haberler";
  }
  return slug;
}

/** Kategori sayfası / hibrit liste — alt niş slug’ları dahil et. */
export function expandFixHaberListingCategorySlugs(
  categorySlug: string | null | undefined,
  siteSlug?: string | null,
): string[] {
  if (!isFixHaberSiteSlug(siteSlug)) return [];
  const slug = normalizeSlug(categorySlug);
  if (!slug) return [];
  const expanded = LISTING_EXPANSION[slug];
  if (expanded?.length) return [...expanded];
  return [slug];
}

export function fixHaberRssCategorySlugsMatch(itemSlug: unknown, wantSlug: unknown): boolean {
  const want = normalizeSlug(wantSlug);
  const item = normalizeSlug(itemSlug);
  if (!want || !item) return rssCategorySlugsMatch(itemSlug, wantSlug);
  if (rssCategorySlugsMatch(item, want)) return true;
  const expanded = LISTING_EXPANSION[want];
  if (expanded?.some((s) => rssCategorySlugsMatch(item, s))) return true;
  if (item.startsWith("fixhaber-") && want.startsWith("fixhaber-")) {
    return item === want || item.startsWith(`${want}-`) || want.startsWith(`${item}-`);
  }
  return mapCanonicalSlugToFixHaber(item) === mapCanonicalSlugToFixHaber(want);
}

export { FIXHABER_SLUG };
