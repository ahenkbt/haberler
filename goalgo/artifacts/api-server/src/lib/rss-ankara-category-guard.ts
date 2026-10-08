/**
 * Ankara kategorisi yalnızca Ankara-yerel haberler için (ASG / AHG).
 * Ulusal ve uluslararası haberler `ankara` slug'ına yazılmamalı.
 */

import { categorySlugIsAnkara } from "./hm-vatanhaber-ankara-sync.js";
import { looksLikeSportsContent } from "./rss-spor-category-guard.js";

const TR_LOWER = (value: unknown): string => String(value ?? "").toLocaleLowerCase("tr-TR");

const ANKARA_LOCAL_TERMS = [
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
  "tbmm",
  "meclis",
  "kızılay",
  "kizilay",
  "ulucanlar",
  "ankara büyükşehir",
  "ankara buyuksehir",
  "abb ",
  "melih gökçek",
  "mamak belediye",
  "çankaya belediye",
  "cankaya belediye",
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
  "yapay zeka",
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

const NATIONAL_OR_WORLD_TERMS = [
  ...DUNYA_TERMS,
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
];

/** Öncelik sırası: ilk eşleşen canonical slug döner. */
const TOPIC_SLUG_RULES: ReadonlyArray<{ slug: string; terms: readonly string[] }> = [
  { slug: "dunya", terms: DUNYA_TERMS },
  { slug: "ekonomi", terms: EKONOMI_TERMS },
  { slug: "teknoloji", terms: TEKNOLOJI_TERMS },
  { slug: "saglik", terms: SAGLIK_TERMS },
  { slug: "siyaset", terms: SIYASET_TERMS },
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

/** Başlık/gövdede Ankara-yerel sinyali var mı? */
export function looksLikeAnkaraLocalContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const text = combinedText(title, spot, content);
  if (!text.trim()) return false;
  return containsAnyTerm(text, ANKARA_LOCAL_TERMS);
}

/** Ulusal veya uluslararası odaklı haber mi (Ankara kategorisi için uygun değil)? */
export function looksLikeNationalOrInternationalContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const text = combinedText(title, spot, content);
  if (!text.trim()) return false;
  if (looksLikeAnkaraLocalContent(title, spot, content)) return false;
  if (looksLikeSportsContent(title, spot, content)) return true;
  return containsAnyTerm(text, NATIONAL_OR_WORLD_TERMS);
}

/**
 * Ankara dışına taşınacak haber için hedef kategori slug'ı (ASG/AHG canonical).
 * Pozitif Ankara-yerel sinyal yoksa spor/ekonomi/dünya vb. anahtar kelimeye göre eşler.
 */
export function resolveAnkaraReplacementCategorySlug(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  if (looksLikeSportsContent(title, spot, content)) return "spor";
  const text = combinedText(title, spot, content);
  for (const rule of TOPIC_SLUG_RULES) {
    if (containsAnyTerm(text, rule.terms)) return rule.slug;
  }
  return "gundem";
}

function isAnkaraLikeCategorySlug(slug: string): boolean {
  return (
    categorySlugIsAnkara(slug, "asg") || slug === "yerel" || slug.endsWith("-yerel")
  );
}

/**
 * `ankara` kategorisinde ama pozitif Ankara-yerel sinyal yok → uygun genel kategoriye taşınmalı.
 */
export function isMisclassifiedAnkaraItem(
  categorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (!isAnkaraLikeCategorySlug(slug)) return false;
  return !looksLikeAnkaraLocalContent(title, spot, content);
}

/**
 * RSS içe aktarım / kampanya: hedef `ankara` ise yerel değilse alternatif slug döner.
 */
export function resolveAnkaraImportCategorySlug(
  wantCategorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  const want = String(wantCategorySlug ?? "").trim().toLowerCase();
  if (!isAnkaraLikeCategorySlug(want)) {
    return want || "gundem";
  }
  if (looksLikeAnkaraLocalContent(title, spot, content)) return "ankara";
  return resolveAnkaraReplacementCategorySlug(title, spot, content);
}

/** ASG/AHG editör + AI için kısa kural metni. */
export const ASG_ANKARA_EDITOR_AI_RULES =
  "Ankara kategorisine YALNIZCA Ankara ili, ilçeleri veya başkentle doğrudan ilgili YEREL haberleri yaz; " +
  "metinde Ankara/başkent/ilçe veya yerel kurum sinyali olmalı. " +
  "Borsa, ekonomi, dünya, teknoloji, sağlık, siyaset, spor gibi ulusal veya uluslararası konuları Ankara kategorisine ekleme; " +
  "uygun kategoriyi kullan (gündem, ekonomi, dünya, spor, teknoloji, sağlık, siyaset).";
