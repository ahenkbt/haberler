import { decodeHmDisplayText, formatTrDisplayLabel } from "@/lib/hmDisplayText";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { resolveCanonicalPortalCategorySlug } from "@/lib/portalCategorySlug";

export type HmRssCategoryTab = {
  label: string;
  slug: string;
};

/** RSS feed alias + site önekli slug'ları canonical slug altında tekilleştirir. */
export function dedupeHmCategoryTabsByCanonicalSlug(
  tabs: readonly HmRssCategoryTab[] | null | undefined,
  knownCanonicalSlugs: ReadonlySet<string> | null | undefined,
  siteSlugPrefixes: readonly string[] | null | undefined = [],
): HmRssCategoryTab[] {
  const source = Array.isArray(tabs) ? tabs : [];
  if (source.length === 0) return [];
  if (knownCanonicalSlugs == null) {
    return source.map((tab) => ({
      label: String(tab?.label ?? "").trim() || "TÜMÜ",
      slug: normalizeNewsCategorySlug(tab?.slug),
    }));
  }

  const canonicalSlugs =
    knownCanonicalSlugs instanceof Set ? knownCanonicalSlugs : new Set<string>();

  const prefixes = Array.isArray(siteSlugPrefixes) ? siteSlugPrefixes : [];
  const out: HmRssCategoryTab[] = [];
  const seen = new Set<string>();

  for (const tab of source) {
    if (!tab || typeof tab !== "object") continue;
    const rawSlug = normalizeNewsCategorySlug(tab.slug);
    if (!rawSlug) {
      if (seen.has("__all__")) continue;
      seen.add("__all__");
      out.push({ label: String(tab.label ?? "").trim() || "TÜMÜ", slug: "" });
      continue;
    }
    const canonical =
      resolveCanonicalPortalCategorySlug(rawSlug, canonicalSlugs, prefixes) || rawSlug;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const label = String(tab.label ?? "").trim() || canonical.toLocaleUpperCase("tr-TR");
    out.push({ label, slug: canonical });
  }

  return out;
}

function repairedCategoryLabelKey(label: unknown, slug: unknown): string {
  const repaired = decodeHmDisplayText(label).toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
  if (repaired) return repaired;
  return normalizeNewsCategorySlug(slug);
}

/** Mojibake etiketleri (D├╝NYA) doğru UTF-8 karşılığı (DÜNYA) altında birleştirir. */
export function dedupeHmCategoryTabsByRepairedLabel(
  tabs: readonly HmRssCategoryTab[] | null | undefined,
): HmRssCategoryTab[] {
  const source = Array.isArray(tabs) ? tabs : [];
  if (source.length === 0) return [];

  const byKey = new Map<string, HmRssCategoryTab>();
  for (const tab of source) {
    if (!tab || typeof tab !== "object") continue;
    const slug = normalizeNewsCategorySlug(tab.slug);
    if (!slug) {
      if (!byKey.has("__all__")) byKey.set("__all__", { label: "TÜMÜ", slug: "" });
      continue;
    }
    const key = repairedCategoryLabelKey(tab.label, slug);
    const label = formatTrDisplayLabel(decodeHmDisplayText(tab.label) || slug);
    const next: HmRssCategoryTab = { label, slug };
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, next);
      continue;
    }
    const prevBroken = decodeHmDisplayText(prev.label) !== prev.label.trim();
    const nextBroken = decodeHmDisplayText(tab.label) !== String(tab.label ?? "").trim();
    if (prevBroken && !nextBroken) byKey.set(key, next);
    else if (!prevBroken && nextBroken) continue;
    else if (prev.slug.length > next.slug.length) byKey.set(key, next);
  }

  const all = byKey.get("__all__");
  const rest = Array.from(byKey.entries())
    .filter(([key]) => key !== "__all__")
    .map(([, tab]) => tab);
  return all ? [all, ...rest] : rest;
}
