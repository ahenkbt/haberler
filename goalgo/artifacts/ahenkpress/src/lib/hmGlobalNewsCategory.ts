import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

/** İngilizce / uluslararası küresel RSS — yalnızca haber haritasında veya editör etkinleştirmesinde. */
export const HM_GLOBAL_NEWS_CATEGORY_SLUG = "global";

export const HM_OPT_IN_NEWS_CATEGORY_SLUGS = new Set<string>([HM_GLOBAL_NEWS_CATEGORY_SLUG]);

export function isHmGlobalNewsCategorySlug(raw: unknown): boolean {
  return normalizeNewsCategorySlug(raw) === HM_GLOBAL_NEWS_CATEGORY_SLUG;
}

export function isHmOptInNewsCategorySlug(raw: unknown): boolean {
  const slug = normalizeNewsCategorySlug(raw);
  return slug.length > 0 && HM_OPT_IN_NEWS_CATEGORY_SLUGS.has(slug);
}

export function isGlobalNewsCategoryEnabledOnSite(opts: {
  activatedSlugs?: string[] | null | undefined;
}): boolean {
  if (!opts.activatedSlugs?.length) return false;
  return opts.activatedSlugs.some((s) => isHmGlobalNewsCategorySlug(s));
}

/** Global kategori — yalnızca Türkçe dışı haberler (EN/AR/FR vb.). */
export function belongsInGlobalNewsCategory(
  title: string | null | undefined,
  spot?: string | null,
): boolean {
  const titleStr = String(title ?? "").trim();
  if (!titleStr) return false;
  const HEADLINE_TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
  const HEADLINE_TR_WORDS =
    /\b(ve|bir|için|ile|olan|olarak|de|da|den|dan|gibi|daha|son|haber|sondakika|türkiye|turkiye|kktc|kıbrıs|kibris)\b/i;
  const HEADLINE_EN_WORDS =
    /\b(the|and|for|with|from|news|breaking|live|report|says|world|global|update|today|latest)\b/i;
  const HEADLINE_FR_CHARS = /[àâäæçéèêëïîôùûüÿœ]/i;
  const HEADLINE_FR_WORDS =
    /\b(le|la|les|des|une|un|et|pour|avec|dans|sur|est|sont|aux|du|de|en|que|qui|cette|ces|nouvelle|france|monde|aujourd)\b/i;
  const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u0590-\u05FF]/;

  if (HEADLINE_FR_CHARS.test(titleStr) && HEADLINE_FR_WORDS.test(titleStr) && !HEADLINE_TR_CHARS.test(titleStr)) {
    return true;
  }
  if (HEADLINE_TR_CHARS.test(titleStr)) return false;
  if (HEADLINE_EN_WORDS.test(titleStr) && !HEADLINE_TR_WORDS.test(titleStr)) return true;
  const spotStr = String(spot ?? "").trim();
  if (HEADLINE_TR_CHARS.test(spotStr) || HEADLINE_TR_WORDS.test(spotStr)) return false;
  const combined = `${titleStr} ${spotStr}`;
  if (NON_LATIN_SCRIPT_RE.test(combined)) return true;
  const asciiLetters = titleStr.replace(/[^a-zA-Z\s]/g, "");
  if (asciiLetters.trim().length >= 6 && !HEADLINE_TR_CHARS.test(titleStr) && !HEADLINE_TR_WORDS.test(titleStr)) {
    if (/^[A-Za-z0-9\s'":;,.!?()-]+$/.test(titleStr.slice(0, 160))) return true;
  }
  return false;
}

/** Vitrin / menü — global yalnızca haber haritasında; kategori sekmesi/menüde gösterilmez. */
export function isGlobalNewsCategoryActiveInLayout(_activatedSlugs: string[] | null | undefined): boolean {
  return false;
}
