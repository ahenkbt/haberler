/**
 * Sunucu tarafı içerik-tabanlı kategori koruması.
 *
 * Bazı RSS beslemeleri SPOR olarak etiketlenmiş halde siyaset/politika haberlerini
 * SPOR kutusuna sızdırıyor (feed/kategori etiketi "spor" olsa bile içerik siyaset).
 * Başlığı açıkça siyaset olan ve hiçbir spor sinyali taşımayan öğeleri SPOR
 * kategorisinden çıkarırız. Ayrıca RSS feedLabel standart başka bir kategoriyi
 * işaret ediyorsa (ör. Politika → spor slug) öğe reddedilir.
 * Frontend `hmCategoryContentGuard.ts` ile aynı mantık — curl/API tüketicileri korunsun.
 */

import { HM_STANDARD_NEWS_CATEGORIES } from "./hm-standard-news-categories.js";
import { normalizeNewsCategorySlug } from "./categorySort.js";
import { looksLikeSportsContent } from "./rss-spor-category-guard.js";

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

function normalizeFeedLabelSlug(raw: unknown): string {
  return normalizeNewsCategorySlug(raw);
}

/** RSS feed etiketi standart başka bir kategoriyi işaret ediyorsa. */
export function feedLabelIndicatesOtherStandardCategory(
  feedLabel: unknown,
  wantCategorySlug: string,
): boolean {
  const want = normalizeNewsCategorySlug(wantCategorySlug);
  if (!want) return false;
  const labelSlug = normalizeFeedLabelSlug(feedLabel);
  if (!labelSlug || labelSlug === want || feedSlugMatchesWant(labelSlug, want)) return false;
  return STANDARD_CATEGORY_SLUGS.has(labelSlug);
}

const TR_LOWER = (value: unknown): string => String(value ?? "").toLocaleLowerCase("tr-TR");

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
  spot?: unknown;
  content?: unknown;
  categoryName?: unknown;
  feedLabel?: unknown;
  source?: unknown;
  id?: unknown;
};


function guardText(item: CategoryGuardItem): string {
  return TR_LOWER(
    [item?.title, item?.spot, item?.categoryName, item?.feedLabel].filter(Boolean).join(" "),
  );
}

/** Başlığı açıkça siyaset olup spor sinyali taşımayan öğe SPOR'dan çıkarılmalı mı? */
export function isLikelyPoliticsNotSports(item: CategoryGuardItem): boolean {
  const title = TR_LOWER(item?.title);
  const text = guardText(item);
  if (!title && !text) return false;
  if (containsAnyTerm(title, SPORTS_TERMS) || containsAnyTerm(text, SPORTS_TERMS)) return false;
  return containsAnyTerm(title, POLITICS_TERMS) || containsAnyTerm(text, POLITICS_TERMS);
}

/** Öğe, istenen kategori için içerik korumasını geçiyor mu? */
export function passesHmCategoryContentGuard(item: CategoryGuardItem, wantCategorySlug: string): boolean {
  const want = String(wantCategorySlug ?? "").trim().toLowerCase();
  if (!want) return true;
  const isRss = item?.source === "rss" || String(item?.id ?? "").trim().startsWith("rss:");
  if (
    isRss &&
    STANDARD_CATEGORY_SLUGS.has(want) &&
    feedLabelIndicatesOtherStandardCategory(item?.feedLabel, want)
  ) {
    return false;
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

/** Liste için kategori koruması — istenen slug yoksa aynen döner. */
export function filterHmCategoryContentGuard<T extends CategoryGuardItem>(
  items: T[],
  wantCategorySlug: string | null | undefined,
): T[] {
  const want = String(wantCategorySlug ?? "").trim().toLowerCase();
  if (!want) return items;
  return items.filter((item) => passesHmCategoryContentGuard(item, want));
}
