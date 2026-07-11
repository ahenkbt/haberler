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

export { slugToWikiTitle, turkishWikiTitleCandidates } from "./wikiSlugTitle.js";
import { turkishWikiTitleCandidates } from "./wikiSlugTitle.js";

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

/** Slug segment → lookup key (underscore form, matches ENCYCLOPEDIA_SLUG_ALIASES). */
export function wikiAsciiSlugKey(slug: string): string {
  const decoded = decodeSlugParam(slug).replace(/[-_]/g, " ");
  return turkishToAscii(decoded).replace(/\s+/g, "_").replace(/_+/g, "_");
}

/** ASCII slug → candidate Wikipedia titles for API lookup. */
export function wikiTitleFromAsciiSlug(slug: string): string[] {
  return turkishWikiTitleCandidates(slug);
}
