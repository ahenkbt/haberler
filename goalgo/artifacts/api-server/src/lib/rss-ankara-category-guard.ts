/**
 * ASG/AHG uyumluluğu — asıl mantık `hm-local-category-router.ts`.
 * Ankara kategorisi yalnızca Ankara-yerel haberler için.
 */

import { categorySlugIsAnkara } from "./hm-vatanhaber-ankara-sync.js";
import {
  ASG_ANKARA_EDITOR_AI_RULES,
  isMisclassifiedPlaceCategoryItem,
  looksLikeAnkaraLocalContent,
  looksLikeNationalOrInternationalContent,
  resolveHmImportCategorySlug,
  resolveHmTopicCategorySlug,
} from "./hm-local-category-router.js";

export {
  ASG_ANKARA_EDITOR_AI_RULES,
  looksLikeAnkaraLocalContent,
  looksLikeNationalOrInternationalContent,
};

export function resolveAnkaraReplacementCategorySlug(
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  return resolveHmTopicCategorySlug(title, spot, content);
}

function isAnkaraLikeCategorySlug(slug: string): boolean {
  return categorySlugIsAnkara(slug, "asg") || slug === "yerel" || slug.endsWith("-yerel");
}

export function isMisclassifiedAnkaraItem(
  categorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): boolean {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (!isAnkaraLikeCategorySlug(slug)) return false;
  if (categorySlugIsAnkara(slug, "asg")) {
    return isMisclassifiedPlaceCategoryItem(slug, title, spot, content, { siteSlug: "asg" });
  }
  return !looksLikeAnkaraLocalContent(title, spot, content);
}

export function resolveAnkaraImportCategorySlug(
  wantCategorySlug: string | null | undefined,
  title: string | null | undefined,
  spot?: string | null,
  content?: string | null,
): string {
  return resolveHmImportCategorySlug(wantCategorySlug, title, spot, content, { siteSlug: "asg" });
}
