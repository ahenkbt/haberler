import {
  isCanonicalWikiAsciiSlug,
  toWikiAsciiSlug,
  wikiAsciiSlugKey,
  wikiTitleFromAsciiSlug,
} from "./wikiAsciiSlug";

export {
  isCanonicalWikiAsciiSlug,
  toWikiAsciiSlug,
  wikiAsciiSlugKey,
  wikiTitleFromAsciiSlug,
} from "./wikiAsciiSlug";

/**
 * Türkçe ansiklopedi başlık/slug karşılaştırması — ASCII I (Istanbul) ile Türkçe İ (İstanbul) aynı anahtar.
 * toLocaleLowerCase("tr-TR") kullanılmaz; I→ı / İ→i ayrımı eşleşmeyi bozar.
 */
export function normalizeWikiTitleKey(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ansiklopedi URL slug → Vikipedi API başlığı adayları. */
export function wikiSlugToApiTitle(slug: string): string {
  let s = String(slug ?? "").trim();
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(s)) break;
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  const spaced = s.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "";
  if (spaced === spaced.toLowerCase()) {
    return spaced
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const lower = word.toLocaleLowerCase("tr-TR");
        return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
      })
      .join(" ");
  }
  return spaced;
}

/** URL slug ile Vikipedi başlığı aynı konuyu mu gösteriyor. */
export function wikiArticleSlugsMatch(urlSlug: string, wikiTitleOrSlug: string): boolean {
  const asciiA = toWikiAsciiSlug(wikiSlugToApiTitle(urlSlug));
  const asciiB = toWikiAsciiSlug(wikiTitleOrSlug);
  if (asciiA && asciiB && asciiA === asciiB) return true;
  const a = wikiSlugToApiTitle(urlSlug);
  const b = wikiSlugToApiTitle(wikiTitleOrSlug);
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeWikiTitleKey(a) === normalizeWikiTitleKey(b);
}

/** Vikipedi başlığı → site içi ASCII slug (Türkçe karakter yok). */
export function wikiTitleToUrlSlug(title: string): string {
  return toWikiAsciiSlug(title);
}

/** Ansiklopedi slug → sıralı Vikipedi API başlık adayları. */
export function wikiArticleApiCandidates(slug: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: string) => {
    const t = String(value ?? "").trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const slugKey = slug.replace(/[-_]/g, "_").toLowerCase();
  const SLUG_ALIASES: Record<string, string> = {
    ataturk: "Mustafa Kemal Atatürk",
    yapay_zeka: "Yapay zekâ",
    izmir: "İzmir",
    ankara: "Ankara",
    emniyet_genel_mudurlugu: "Emniyet Genel Müdürlüğü",
    ulusal_egemenlik_ve_cocuk_bayrami: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  };
  const alias = SLUG_ALIASES[slugKey.replace(/-/g, "_")];
  if (alias) add(alias);

  add(slug);
  for (const candidate of wikiTitleFromAsciiSlug(slug)) add(candidate);
  add(wikiSlugToApiTitle(slug));
  return out;
}

/** Legacy / Türkçe slug → canonical ASCII slug. */
export function canonicalWikiUrlSlug(slug: string): string {
  return toWikiAsciiSlug(wikiSlugToApiTitle(slug));
}
