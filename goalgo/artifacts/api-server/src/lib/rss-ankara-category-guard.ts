/**
 * Ankara kategorisi yalnızca Ankara-yerel haberler için (ASG / AHG).
 * Ulusal ve uluslararası haberler `ankara` slug'ına yazılmamalı.
 */

import { categorySlugIsAnkara } from "./hm-vatanhaber-ankara-sync.js";

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
  "kazan",
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

const NATIONAL_OR_WORLD_TERMS = [
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
  "tcmb",
  "merkez bankasi",
  "merkez bankası",
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
  return containsAnyTerm(text, NATIONAL_OR_WORLD_TERMS);
}

/** `ankara` kategorisinde ama ulusal/uluslararası veya yerel sinyal yok → gündem'e taşınmalı. */
export function isMisclassifiedAnkaraItem(
  categorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (!categorySlugIsAnkara(slug, "asg") && slug !== "yerel" && !slug.endsWith("-yerel")) return false;
  if (looksLikeAnkaraLocalContent(title, spot, content)) return false;
  return looksLikeNationalOrInternationalContent(title, spot, content);
}

/**
 * RSS içe aktarım / kampanya: hedef `ankara` ise yerel değilse alternatif slug döner.
 * `null` = haber atlanmalı (aşırı belirsiz).
 */
export function resolveAnkaraImportCategorySlug(
  wantCategorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  const want = String(wantCategorySlug ?? "").trim().toLowerCase();
  if (!categorySlugIsAnkara(want, "asg") && want !== "yerel" && !want.endsWith("-yerel")) {
    return want || "gundem";
  }
  if (looksLikeAnkaraLocalContent(title, spot, content)) return "ankara";
  if (looksLikeNationalOrInternationalContent(title, spot, content)) {
    const text = combinedText(title, spot, content);
    if (containsAnyTerm(text, ["dunya", "dünya", "yurtdisi", "yurtdışı"])) return "dunya";
    return "gundem";
  }
  return "gundem";
}

/** ASG/AHG editör + AI için kısa kural metni. */
export const ASG_ANKARA_EDITOR_AI_RULES =
  "Ankara kategorisine YALNIZCA Ankara ili / ilçeleri / başkent yerel haberleri yaz. " +
  "Ulusal siyaset, spor, ekonomi ve uluslararası haberleri Ankara kategorisine ekleme; uygun genel kategoriyi kullan (gündem, dünya, spor vb.).";
