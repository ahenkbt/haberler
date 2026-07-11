import { hmCategorySlug, normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG, belongsInGlobalNewsCategory } from "@/lib/hmGlobalNewsCategory";
import { HM_STANDARD_NEWS_CATEGORIES } from "@/lib/hmStandardNewsCategories";

const STANDARD_CATEGORY_SLUGS = new Set(
  HM_STANDARD_NEWS_CATEGORIES.map((row) => normalizeNewsCategorySlug(row.slug)).filter(Boolean),
);

function feedSlugMatchesWant(feedSlug: string, wantSlug: string): boolean {
  const feed = feedSlug.trim().toLowerCase();
  const want = wantSlug.trim().toLowerCase();
  if (!want) return true;
  if (feed === want) return true;
  if (feed.endsWith(`-${want}`)) return true;
  return false;
}

/** RSS feed etiketi standart başka bir kategoriyi işaret ediyorsa (yanlış ingest slug'ına güvenme). */
export function feedLabelIndicatesOtherStandardCategory(
  feedLabel: unknown,
  wantCategorySlug: string,
): boolean {
  const want = normalizeNewsCategorySlug(wantCategorySlug);
  if (!want) return false;
  const labelSlug = hmCategorySlug(feedLabel);
  if (!labelSlug || labelSlug === want || feedSlugMatchesWant(labelSlug, want)) return false;
  return STANDARD_CATEGORY_SLUGS.has(labelSlug);
}

/**
 * İçerik tabanlı kategori koruması.
 *
 * Bazı RSS beslemeleri (ör. genel "gündem" feed'i SPOR olarak etiketlenmiş) siyaset/politika
 * haberlerini SPOR kutusuna sızdırıyor. Feed etiketi doğru olsa bile, başlığı açıkça siyaset olan
 * ve hiçbir spor sinyali taşımayan öğeleri SPOR kategorisinden çıkarırız. Yalnız SPOR'a uygulanır;
 * diğer kategoriler etkilenmez (çapraz kirlenme riski yok).
 */

const TR_LOWER = (value: string): string =>
  String(value ?? "").toLocaleLowerCase("tr-TR");

/** Siyaset/politika güçlü sinyalleri (başlık). */
const POLITICS_TERMS = [
  "siyaset",
  "politika",
  "secim",
  "seçim",
  "meclis",
  "tbmm",
  "bakan",
  "bakanlik",
  "bakanlık",
  "cumhurbaskan",
  "cumhurbaşkan",
  "milletvekili",
  "muhalefet",
  "iktidar",
  "kabine",
  "ak parti",
  "akp",
  "chp",
  "mhp",
  "nato",
  "parti",
  "iyi parti",
  "dem parti",
  "saadet partisi",
  "koalisyon",
  "kongre",
  "grup toplantisi",
  "grup toplantısı",
  "erdogan",
  "erdoğan",
  "ozel",
  "özel",
  "bahceli",
  "bahçeli",
  "il baskan",
  "il başkan",
  "genel baskan",
  "genel başkan",
  "mahkeme",
  "butlan",
  "ihrac",
  "ihraç",
  "protesto",
  "kayyum",
  "vekil",
  "kilicdaroglu",
  "kılıçdaroğlu",
  "imamoglu",
  "imamoğlu",
];

/** Spor güçlü sinyalleri (başlık) — varsa siyaset korumasını geçersiz kılar. */
const SPORTS_TERMS = [
  "mac",
  "maç",
  "gol",
  "lig",
  "super lig",
  "süper lig",
  "transfer",
  "sampiyon",
  "şampiyon",
  "futbol",
  "basketbol",
  "voleybol",
  "teknik direktor",
  "teknik direktör",
  "puan",
  "fikstur",
  "fikstür",
  "derbi",
  "kadro",
  "hakem",
  "penalti",
  "penaltı",
  "galibiyet",
  "maglubiyet",
  "mağlubiyet",
  "beraberlik",
  "forma",
  "stat",
  "uefa",
  "fifa",
  "tff",
  "milli takim",
  "milli takım",
  "tenis",
  "formula",
  "moto",
  "boks",
  "gures",
  "güreş",
  "atletizm",
  "olimpiyat",
  "spor toto",
  "fenerbahce",
  "fenerbahçe",
  "galatasaray",
  "besiktas",
  "beşiktaş",
  "trabzonspor",
  "sampiyonlar ligi",
  "şampiyonlar ligi",
];

function containsAnyTerm(text: string, terms: readonly string[]): boolean {
  if (!text) return false;
  for (const term of terms) {
    if (term && text.includes(term)) return true;
  }
  return false;
}

type CategoryGuardItem = {
  title?: unknown;
  categoryName?: unknown;
  spot?: unknown;
  content?: unknown;
  feedLabel?: unknown;
  source?: unknown;
  id?: unknown;
};

/** Başlık/spot/gövdede spor sinyali var mı? (recategorize + SPOR filtresi ile aynı mantık) */
export function looksLikeSportsContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const text = TR_LOWER([title, spot, content].filter(Boolean).join(" "));
  if (!text.trim()) return false;
  return containsAnyTerm(text, SPORTS_TERMS);
}

function guardText(item: CategoryGuardItem): string {
  return TR_LOWER(
    [item?.title, item?.spot, item?.categoryName, item?.feedLabel].filter(Boolean).join(" "),
  );
}

/** Başlığı açıkça siyaset olup spor sinyali taşımayan öğe SPOR'dan çıkarılmalı mı? */
export function isLikelyPoliticsNotSports(item: CategoryGuardItem): boolean {
  const title = TR_LOWER(String(item?.title ?? ""));
  const text = guardText(item);
  if (!title && !text) return false;
  if (containsAnyTerm(title, SPORTS_TERMS) || containsAnyTerm(text, SPORTS_TERMS)) return false;
  return containsAnyTerm(title, POLITICS_TERMS) || containsAnyTerm(text, POLITICS_TERMS);
}

/**
 * Öğe, istenen kategori için içerik korumasını geçiyor mu?
 * SPOR: yalnızca spor sinyali taşıyan öğeler geçer (recategorize ile uyumlu).
 */
export function passesCategoryContentGuard(item: CategoryGuardItem, wantCategorySlug: string): boolean {
  const want = normalizeNewsCategorySlug(wantCategorySlug);
  const isRss =
    item?.source === "rss" || String(item?.id ?? "").trim().startsWith("rss:");
  if (
    isRss &&
    STANDARD_CATEGORY_SLUGS.has(want) &&
    feedLabelIndicatesOtherStandardCategory(item?.feedLabel, want)
  ) {
    return false;
  }
  if (want === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
    return belongsInGlobalNewsCategory(String(item?.title ?? ""), String(item?.spot ?? ""));
  }
  if (want === "spor") {
    return looksLikeSportsContent(
      String(item?.title ?? ""),
      String(item?.spot ?? ""),
      String(item?.content ?? ""),
    );
  }
  return true;
}
