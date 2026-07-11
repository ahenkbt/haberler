/** Spor kategorisi yanlış atamasını tespit — haber başlık/özet/gövdesinde spor sinyali yoksa spor değildir. */

const TR_LOWER = (value: string): string => String(value ?? "").toLocaleLowerCase("tr-TR");

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
  "euroleague",
  "nba",
  "nfl",
  "motogp",
  "voleybol",
  "hentbol",
  "buz hokey",
];

function containsAnyTerm(text: string, terms: readonly string[]): boolean {
  if (!text) return false;
  for (const term of terms) {
    if (term && text.includes(term)) return true;
  }
  return false;
}

export function looksLikeSportsContent(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const text = TR_LOWER([title, spot, content].filter(Boolean).join(" "));
  if (!text.trim()) return false;
  return containsAnyTerm(text, SPORTS_TERMS);
}

/** spor slug'ında ama içerik spor değil → gündem'e taşınmalı */
export function isMisclassifiedSporItem(
  categorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (slug !== "spor") return false;
  return !looksLikeSportsContent(title, spot, content);
}
