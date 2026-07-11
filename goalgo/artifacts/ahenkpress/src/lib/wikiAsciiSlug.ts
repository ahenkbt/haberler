import { turkishWikiTitleCandidates } from "./wikiSlugTitle";

/** Decode percent-encoding (at most twice). */
function decodeSlugParam(raw: string): string {
  let s = String(raw ?? "").trim();
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
  return s;
}

/** Turkish and Latin letters → ASCII (matches API norm key without stripping word chars). */
export function turkishToAscii(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

/**
 * Wikipedia title → Bilgi Ağacı URL slug (ASCII only, lowercase, spaces → hyphens).
 * Müzik → muzik, Seri penaltı vuruşları → seri-penalti-vuruslari
 */
export function toWikiAsciiSlug(title: string): string {
  const decoded = decodeSlugParam(title).replace(/_/g, " ");
  const ascii = turkishToAscii(decoded);
  return ascii
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug segment → lookup key (underscore form, matches API ENCYCLOPEDIA_SLUG_ALIASES). */
export function wikiAsciiSlugKey(slug: string): string {
  const decoded = decodeSlugParam(slug).replace(/[-_]/g, " ");
  return turkishToAscii(decoded).replace(/\s+/g, "_").replace(/_+/g, "_");
}

/** ASCII slug → candidate Wikipedia titles for API lookup. */
export function wikiTitleFromAsciiSlug(slug: string): string[] {
  return turkishWikiTitleCandidates(slug);
}

/** True when slug already uses canonical ASCII form (no Turkish chars / encoding). */
export function isCanonicalWikiAsciiSlug(slug: string): boolean {
  const raw = String(slug ?? "");
  if (!raw || /%[0-9A-Fa-f]{2}/.test(raw)) return false;
  if (/[İIığüşöçĞÜŞÖÇÂÎÛâîû]/.test(raw)) return false;
  return raw === toWikiAsciiSlug(raw);
}
