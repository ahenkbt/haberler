/**
 * HM haber siteleri — yerel kategori yönlendirme (global kural).
 *
 * Yerel (il/ilçe) haber:
 *   1) Sitede o yer adlı kategori varsa (ör. ankara, istanbul) → oraya
 *   2) Yoksa bölge kategorisi (bolge / bölge) → oraya
 *   3) Yoksa → yerel
 *
 * Ulusal/uluslararası konu (borsa, ekonomi, dünya, spor vb.) → şehir kategorisine değil,
 * konu kategorisine (RSS içe aktarım, kampanya, portal, AI editör).
 *
 * DEPLOY: api-server yeniden başlatması yeterli; ek migration yok.
 */

import { eq, isNull, or } from "drizzle-orm";
import { categoriesTable, db } from "@workspace/db";
import { categorySlugIsAnkara } from "./hm-vatanhaber-ankara-sync.js";
import { looksLikeSportsContent } from "./rss-spor-category-guard.js";

export type HmSiteCategoryCatalogRow = {
  slug: string;
  name?: string | null;
};

const TR_LOWER = (value: unknown): string => String(value ?? "").toLocaleLowerCase("tr-TR");

type LocalityProfile = {
  key: string;
  terms: readonly string[];
  slugAliases: readonly string[];
};

/** İl/şehir yerel sinyali — öncelik sırası: ilk eşleşen profil kazanır. */
const HM_LOCALITY_PROFILES: readonly LocalityProfile[] = [
  {
    key: "ankara",
    slugAliases: ["ankara"],
    terms: [
      "ankara",
      "başkent",
      "baskent",
      "çankaya",
      "cankaya",
      "keçiören",
      "kecioren",
      "mamak",
      "yenimahalle",
      "etimesgut",
      "sincan",
      "altındağ",
      "altindag",
      "pursaklar",
      "gölbaşı",
      "golbasi",
      "polatlı",
      "polatli",
      "akyurt",
      "kahramankazan",
      "nallıhan",
      "nallihan",
      "beypazarı",
      "beypazari",
      "çubuk",
      "cubuk",
      "elmadağ",
      "elmadag",
      "kızılcahamam",
      "kizilcahamam",
      "şereflikoçhisar",
      "sereflikochisar",
      "ayaş",
      "ayas",
      "bala",
      "evren",
      "hacettepe",
      "odtu",
      "odtü",
      "metu",
      "kızılay",
      "kizilay",
      "ulucanlar",
      "ankara büyükşehir",
      "ankara buyuksehir",
      "abb ",
      "mamak belediye",
      "çankaya belediye",
      "cankaya belediye",
    ],
  },
  {
    key: "istanbul",
    slugAliases: ["istanbul"],
    terms: [
      "istanbul",
      "kadıköy",
      "kadikoy",
      "üsküdar",
      "uskudar",
      "beşiktaş ilçe",
      "besiktas ilce",
      "fatih",
      "beyoğlu",
      "beyoglu",
      "ataşehir",
      "atasehir",
      "pendik",
      "maltepe",
      "sultanbeyli",
      "istanbul büyükşehir",
      "istanbul buyuksehir",
      "ibb ",
      "eyüpsultan",
      "eyupsultan",
      "sarıyer",
      "sariyer",
      "beykoz",
      "tuzla",
      "kartal",
      "ümraniye",
      "umraniye",
    ],
  },
  {
    key: "izmir",
    slugAliases: ["izmir"],
    terms: [
      "izmir",
      "konak",
      "bornova",
      "karşıyaka",
      "karsiyaka",
      "buca",
      "çiğli",
      "cigli",
      "gaziemir",
      "bayraklı",
      "bayrakli",
      "menemen",
      "torbalı",
      "torbali",
      "izmir büyükşehir",
      "izmir buyuksehir",
    ],
  },
  {
    key: "antalya",
    slugAliases: ["antalya"],
    terms: ["antalya", "muratpaşa", "muratpasa", "kepez", "konyaaltı", "konyaalti", "alanya", "manavgat"],
  },
  {
    key: "bursa",
    slugAliases: ["bursa"],
    terms: ["bursa", "nilüfer", "nilufer", "osmangazi", "yıldırım", "yildirim", "gemlik"],
  },
  {
    key: "adana",
    slugAliases: ["adana"],
    terms: ["adana", "seyhan", "çukurova", "cukurova", "yüreğir", "yuregir"],
  },
  {
    key: "gaziantep",
    slugAliases: ["gaziantep"],
    terms: ["gaziantep", "şahinbey", "sahinbey", "şehitkamil", "sehitkamil"],
  },
  {
    key: "konya",
    slugAliases: ["konya"],
    terms: ["konya", "selçuklu", "selcuklu", "meram", "karatay"],
  },
  {
    key: "trabzon",
    slugAliases: ["trabzon"],
    terms: ["trabzon", "ortahisar", "akçaabat", "akcaabat"],
  },
  {
    key: "diyarbakir",
    slugAliases: ["diyarbakir", "diyarbakır"],
    terms: ["diyarbakır", "diyarbakir", "kayapınar", "kayapinar", "sur ilçe"],
  },
  {
    key: "kirsehir",
    slugAliases: ["kirsehir", "kırşehir"],
    terms: [
      "kırşehir",
      "kirsehir",
      "mucur",
      "kaman",
      "çiçekdağı",
      "cicekdagi",
      "akpınar",
      "akpinar",
      "boztepe",
    ],
  },
];

const DUNYA_TERMS = [
  "dunya",
  "dünya",
  "uluslararasi",
  "uluslararası",
  "yurtdisi",
  "yurtdışı",
  "abd ",
  " amerika",
  "rusya",
  "ukrayna",
  "israil",
  "filistin",
  "gazze",
  "avrupa birligi",
  "avrupa birliği",
  "cin ",
  "çin ",
  "japonya",
  "almanya",
  "fransa",
  "ingiltere",
  "suriye",
  "irak",
  "iran ",
  "lubnan",
  "lübnan",
  "dünya bankası",
  "dunya bankasi",
];

const EKONOMI_TERMS = [
  "borsa",
  "bist",
  "ekonomi",
  "enflasyon",
  "faiz",
  "dolar",
  "euro",
  "tcmb",
  "merkez bankasi",
  "merkez bankası",
  "borsa istanbul",
  "hisse",
  "kur ",
  "altin fiyat",
  "altın fiyat",
  "tüfe",
  "tufe",
  "cari acik",
  "cari açık",
  "ihracat",
  "ithalat",
  "vergi",
  "bütçe",
  "butce",
];

/** Sinema / gişe — "dijital platform" gibi ifadeler teknoloji kuralına düşmesin. */
const GISE_SINEMA_TERMS = [
  "gişe",
  "gise",
  "sinema",
  "beyaz perde",
  "vizyondan",
  "box office",
  "film festival",
  "film festivali",
];

const TEKNOLOJI_TERMS = [
  "teknoloji",
  "yazilim",
  "yazılım",
  "yapay zeka",
  "artificial intelligence",
  "siber",
  "hack",
  "apple",
  "google",
  "microsoft",
  "iphone",
  "android",
  "chip",
  "startup",
  "dijital",
  "internet",
  "sosyal medya",
  "meta ",
  "openai",
  "chatgpt",
];

const SAGLIK_TERMS = [
  "saglik",
  "sağlık",
  "hastane",
  "doktor",
  "hekim",
  "ameliyat",
  "hastalik",
  "hastalık",
  "ilac",
  "ilaç",
  "asi ",
  "aşı ",
  "saglik bakanligi",
  "sağlık bakanlığı",
  "pandemi",
  "virus",
  "kanser",
  "tedavi",
];

const SIYASET_TERMS = [
  "siyaset",
  "cumhurbaskani",
  "cumhurbaşkanı",
  "bakan ",
  "bakanlık",
  "bakanlik",
  "parti ",
  "milletvekili",
  "secim",
  "seçim",
  "hukumet",
  "hükümet",
  "muhalefet",
  "tbmm",
  "meclis",
  "anayasa",
  "yargitay",
  "yargıtay",
  "danistay",
  "danıştay",
];

const TOPIC_SLUG_RULES: ReadonlyArray<{ slug: string; terms: readonly string[] }> = [
  { slug: "dunya", terms: DUNYA_TERMS },
  { slug: "ekonomi", terms: EKONOMI_TERMS },
  { slug: "teknoloji", terms: TEKNOLOJI_TERMS },
  { slug: "saglik", terms: SAGLIK_TERMS },
  { slug: "siyaset", terms: SIYASET_TERMS },
];

/** Başka il/ulusal spor veya konu sinyali (Ankara-yerel değilken). */
const OTHER_CITY_OR_NATIONAL_TERMS = [
  "super lig",
  "süper lig",
  "galatasaray",
  "fenerbahce",
  "fenerbahçe",
  "besiktas",
  "beşiktaş",
  "trabzonspor",
  "istanbul",
  "izmir",
  "antalya",
  "bursa",
  "adana",
  "gaziantep",
  "konya",
  "diyarbakir",
  "diyarbakır",
  "van ",
  "edirne",
  "trabzon",
  "samsun",
  "mersin",
  "türkiye geneli",
  "turkiye geneli",
  "tüm türkiye",
  "tum turkiye",
  "81 il",
  "milli egitim bakanligi",
  "milli eğitim bakanlığı",
  ...EKONOMI_TERMS,
  ...TEKNOLOJI_TERMS,
  ...SAGLIK_TERMS,
  ...SIYASET_TERMS,
  ...DUNYA_TERMS,
];

function containsAnyTerm(text: string, terms: readonly string[]): boolean {
  if (!text) return false;
  for (const term of terms) {
    if (term && text.includes(term)) return true;
  }
  return false;
}

function combinedText(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  return TR_LOWER([title, spot, content].filter(Boolean).join(" "));
}

function normalizeCatalogSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function stripSitePrefixFromSlug(slug: string, siteSlug?: string | null): string {
  const s = normalizeCatalogSlug(slug);
  const site = normalizeCatalogSlug(siteSlug);
  if (site && s.startsWith(`${site}-`)) return s.slice(site.length + 1);
  return s;
}

/** Metinde hangi il/şehir yerel sinyali var (ilk eşleşen profil). */
export function detectHmLocalityKey(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string | null {
  const text = combinedText(title, spot, content);
  if (!text.trim()) return null;
  for (const profile of HM_LOCALITY_PROFILES) {
    if (containsAnyTerm(text, profile.terms)) return profile.key;
  }
  return null;
}

export function looksLikeAnkaraLocalContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  return detectHmLocalityKey(title, spot, content) === "ankara";
}

/** Ulusal/uluslararası veya Ankara dışı il odağı (Ankara kategorisi için uygun değil). */
export function looksLikeNationalOrInternationalContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const text = combinedText(title, spot, content);
  if (!text.trim()) return false;
  if (looksLikeAnkaraLocalContent(title, spot, content)) return false;
  if (looksLikeSportsContent(title, spot, content)) return true;
  return containsAnyTerm(text, OTHER_CITY_OR_NATIONAL_TERMS);
}

/** Konu haberi için hedef slug (spor, ekonomi, dünya, …). */
export function resolveHmTopicCategorySlug(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  if (looksLikeSportsContent(title, spot, content)) return "spor";
  const text = combinedText(title, spot, content);
  if (containsAnyTerm(text, GISE_SINEMA_TERMS)) return "gundem";
  for (const rule of TOPIC_SLUG_RULES) {
    if (containsAnyTerm(text, rule.terms)) return rule.slug;
  }
  return "gundem";
}

function catalogRowMatchesLocality(
  row: HmSiteCategoryCatalogRow,
  localityKey: string,
  siteSlug?: string | null,
): boolean {
  const profile = HM_LOCALITY_PROFILES.find((p) => p.key === localityKey);
  const aliases = new Set<string>([localityKey, ...(profile?.slugAliases ?? [])]);
  const slug = normalizeCatalogSlug(row.slug);
  const clean = stripSitePrefixFromSlug(slug, siteSlug);
  if (aliases.has(clean) || aliases.has(slug)) return true;
  for (const alias of aliases) {
    if (slug === alias || slug.endsWith(`-${alias}`) || clean.endsWith(`-${alias}`)) return true;
  }
  const name = TR_LOWER(row.name);
  for (const alias of aliases) {
    if (name.includes(alias)) return true;
  }
  return false;
}

function findRegionalCategorySlug(catalog: HmSiteCategoryCatalogRow[]): string | null {
  for (const row of catalog) {
    const slug = normalizeCatalogSlug(row.slug);
    const name = TR_LOWER(row.name);
    if (slug === "bolge" || slug.includes("bolge") || name.includes("bölge") || name.includes("bolge")) {
      return slug;
    }
  }
  return null;
}

function findYerelCategorySlug(catalog: HmSiteCategoryCatalogRow[]): string {
  for (const row of catalog) {
    const slug = normalizeCatalogSlug(row.slug);
    if (slug === "yerel" || slug.endsWith("-yerel")) return slug;
  }
  return "yerel";
}

/**
 * Yerel haber için site kataloguna göre slug: şehir → bölge → yerel.
 */
export function pickHmLocalCategorySlug(
  catalog: HmSiteCategoryCatalogRow[] | null | undefined,
  localityKey: string,
  siteSlug?: string | null,
): string {
  const rows = catalog ?? [];
  for (const row of rows) {
    if (catalogRowMatchesLocality(row, localityKey, siteSlug)) {
      return normalizeCatalogSlug(row.slug);
    }
  }
  const bolge = findRegionalCategorySlug(rows);
  if (bolge) return bolge;
  return findYerelCategorySlug(rows);
}

export function isHmPlaceCategorySlug(
  categorySlug: string | null | undefined,
  siteSlug?: string | null,
): boolean {
  const slug = normalizeCatalogSlug(categorySlug);
  if (!slug) return false;
  if (isLocalBucketSlug(slug)) return true;
  return slugLocalityKey(slug, siteSlug) != null;
}

function slugLocalityKey(
  slug: string,
  siteSlug?: string | null,
): string | null {
  const clean = stripSitePrefixFromSlug(slug, siteSlug);
  for (const profile of HM_LOCALITY_PROFILES) {
    if (clean === profile.key) return profile.key;
    for (const alias of profile.slugAliases) {
      if (clean === alias || clean.endsWith(`-${alias}`)) return profile.key;
    }
  }
  if (categorySlugIsAnkara(slug, siteSlug ?? "asg")) return "ankara";
  return null;
}

function isLocalBucketSlug(slug: string): boolean {
  const s = normalizeCatalogSlug(slug);
  if (s === "yerel" || s.endsWith("-yerel")) return true;
  if (s === "bolge" || s.includes("bolge")) return true;
  return slugLocalityKey(s) != null;
}

export function isMisclassifiedPlaceCategoryItem(
  categorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
  opts?: { siteSlug?: string | null },
): boolean {
  const slug = normalizeCatalogSlug(categorySlug);
  const placeKey = slugLocalityKey(slug, opts?.siteSlug);
  if (!placeKey) return false;

  const headlineText = combinedText(title, spot, null);
  if (headlineText.trim()) {
    const headlineKey = detectHmLocalityKey(title, spot, null);
    if (headlineKey === placeKey) return false;
    if (headlineKey != null) return true;
    if (looksLikeSportsContent(title, spot, null)) return true;
    if (looksLikeNationalOrInternationalContent(title, spot, null)) return true;
    return true;
  }

  return detectHmLocalityKey(title, spot, content) !== placeKey;
}

/**
 * RSS / kampanya / portal içe aktarım — kategori slug'ını global yerel kurala göre düzeltir.
 */
export function resolveHmImportCategorySlug(
  wantCategorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
  opts?: {
    siteCategories?: HmSiteCategoryCatalogRow[] | null;
    siteSlug?: string | null;
  },
): string {
  const want = normalizeCatalogSlug(wantCategorySlug) || "gundem";
  const localityKey = detectHmLocalityKey(title, spot, content);
  const catalog = opts?.siteCategories ?? null;
  const siteSlug = opts?.siteSlug ?? null;

  const wantPlaceKey = slugLocalityKey(want, siteSlug);

  if (wantPlaceKey) {
    if (localityKey === wantPlaceKey) {
      if (catalog?.length) {
        return pickHmLocalCategorySlug(catalog, localityKey, siteSlug);
      }
      return wantPlaceKey === "ankara" ? "ankara" : want;
    }
    return resolveHmTopicCategorySlug(title, spot, content);
  }

  if (localityKey && isLocalBucketSlug(want)) {
    if (catalog?.length) {
      return pickHmLocalCategorySlug(catalog, localityKey, siteSlug);
    }
    return localityKey === "ankara" ? "ankara" : want === "yerel" || want.endsWith("-yerel") ? "yerel" : want;
  }

  if (localityKey && (want === "gundem" || want === "haber")) {
    if (catalog?.length) {
      return pickHmLocalCategorySlug(catalog, localityKey, siteSlug);
    }
    if (localityKey === "ankara") return "ankara";
  }

  return want;
}

/** Editör + AI — tüm HM siteleri için yerel kategori özeti. */
export const HM_LOCAL_CATEGORY_EDITOR_AI_RULES =
  "Yerel (il/ilçe) haberleri: sitede o şehrin adlı kategorisi varsa oraya yaz; yoksa bölge, o da yoksa yerel kategorisini kullan. " +
  "Borsa, ekonomi, dünya, spor, teknoloji, sağlık, siyaset gibi ulusal veya uluslararası konuları şehir/yerel kategorilerine yazma; uygun konu kategorisini seç.";

export const ASG_ANKARA_EDITOR_AI_RULES =
  "Ankara kategorisine YALNIZCA Ankara ili, ilçeleri veya başkentle doğrudan ilgili YEREL haberleri yaz; " +
  "metinde Ankara/başkent/ilçe veya yerel kurum sinyali olmalı. " +
  "Borsa, ekonomi, dünya, teknoloji, sağlık, siyaset, spor gibi ulusal veya uluslararası konuları Ankara kategorisine ekleme; " +
  "uygun kategoriyi kullan (gündem, ekonomi, dünya, spor, teknoloji, sağlık, siyaset).";

/** turkatahaber.com & yerel.net.tr — Cumha kamu-yerel taksonomisi. */
export const KAMU_YEREL_CUMHA_EDITOR_AI_RULES =
  "Türkata Haber / Yerel.net (Cumha kamu-yerel): haberi Cumha RSS kategori ve lokasyon slug'larına göre sınıflandır " +
  "(kamu kurumları, yerel yönetimler, valilik/kaymakamlık, il-ilçe teşkilatları, 81 il veya tepe kamu-yerel menü kategorileri). " +
  "Ulusal gündem/siyaset/spor/ekonomi haberlerini yalnızca yerel/kamu sinyali varsa ilgili il veya kamu kategorisine yaz; aksi halde uygun ulusal kategoriyi seç. " +
  "Aynı Cumha kaynağını tekrar yazma; özgünleştir ve kaynak RSS kategorisiyle tutarlı kal.";

const siteCategoryCatalogCache = new Map<number, HmSiteCategoryCatalogRow[]>();

/** Site kategori katalogu (slug + ad) — yerel yönlendirme için. */
export async function loadHmSiteCategoryCatalog(siteId: number): Promise<HmSiteCategoryCatalogRow[]> {
  if (!Number.isFinite(siteId) || siteId <= 0) return [];
  const cached = siteCategoryCatalogCache.get(siteId);
  if (cached) return cached;
  // Panel Neon — exclusive_site_id is Worker id (1132), not PHP (230).
  const rows = await db
    .select({ slug: categoriesTable.slug, name: categoriesTable.name })
    .from(categoriesTable)
    .where(
      or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId)),
    );
  const catalog = rows
    .map((r) => ({
      slug: normalizeCatalogSlug(r.slug),
      name: r.name ?? null,
    }))
    .filter((r) => r.slug.length > 0);
  siteCategoryCatalogCache.set(siteId, catalog);
  return catalog;
}

export function clearHmSiteCategoryCatalogCacheForTests(): void {
  siteCategoryCatalogCache.clear();
}
