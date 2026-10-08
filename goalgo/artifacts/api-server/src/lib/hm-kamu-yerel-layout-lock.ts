/**
 * turkatahaber.com & yerel.net.tr — layout_json alanları Cumha kamu-yerel kataloğuna kilitlenir.
 * STABILIZE: ensure/seed MUST NOT wipe live logos, healthy merged nav, or rich /daha
 * promo pages back to empty/yekpare/skinny catalog defaults.
 */
import {
  KAMU_YEREL_DAHA_PAGE_SLUG,
  KAMU_YEREL_DAHA_PROMO_MARKER,
  KAMU_YEREL_ILLER_PAGE_SLUG,
  listKamuYerelCategoryPageAllowSlugs,
  listKamuYerelNavHiddenCategorySlugs,
  listKamuYerelNavTopCategorySlugs,
} from "./hm-cumha-kamu-yerel-catalog.js";
import { hmLayoutLogoUsesInlineDataUrl } from "./hm-domain-lookup.js";
import type { KamuYerelSiteDef } from "./hm-kamu-yerel-sites.js";
import { YERELNET_SLUG } from "./hm-kamu-yerel-sites.js";

export const KAMU_YEREL_LAYOUT_LOCK_KEYS = [
  "hmNavOnlyCategorySlugs",
  "hmNavHiddenCategorySlugs",
  "hmCorporateMenuItems",
  "hmCategorySortSlugs",
  "hmNewsSiteRssFeedRows",
  "hmRssSourcePacks",
  "hmRssKarmaDefaultsRev",
  "logoUrl",
  "faviconUrl",
  "mansetCategorySlug",
  "hmNewsExtraCategories",
  "hmExtraPages",
  "portalHybridRssFeeds",
  "hmNewsBreakingRssFeedRows",
  "hmPrimaryColor",
  "hmSecondaryColor",
  "hmVitrinTheme",
] as const;

const NAV_PRESERVE_KEYS = new Set([
  "hmNavOnlyCategorySlugs",
  "hmNavHiddenCategorySlugs",
  "hmCorporateMenuItems",
  "hmCategorySortSlugs",
]);

const LEGACY_GENERIC_NAV = new Set([
  "gundem",
  "ekonomi",
  "egitim",
  "saglik",
  "yasam",
  "dunya",
  "politika",
  "spor",
  "teknoloji",
]);

const CUMHA_NAV_MARKERS = new Set([
  "cumhurbaskanligi",
  "bakanliklar",
  "tbmm",
  "kamu-kurumlari",
  "mulki-idare",
  "siyasi-partiler",
]);

/** Live turkatahaber tepe menü (Siyaset/Kamu/STK/…) — do not classify as legacy wipe target. */
const LIVE_MERGED_NAV_MARKERS = new Set(["siyaset", "kamu", "stk", "roportajlar"]);

export function parseLayoutNavSlugs(layoutJson: string | null | undefined): string[] | null {
  const raw = String(layoutJson ?? "").trim();
  if (!raw) return null;
  try {
    const layout = JSON.parse(raw) as { hmNavOnlyCategorySlugs?: unknown };
    const nav = layout?.hmNavOnlyCategorySlugs;
    if (!Array.isArray(nav)) return null;
    return nav.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/** Healthy live merged nav already on production — protect from catalog reset. */
export function isHealthyLiveMergedNav(nav: string[] | null | undefined): boolean {
  if (!nav?.length) return false;
  const set = new Set(nav.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
  for (const m of LIVE_MERGED_NAV_MARKERS) {
    if (!set.has(m)) return false;
  }
  if (set.size < 20) return false;
  if (![...set].some((s) => s.startsWith("bolge-")) && set.size < 40) return false;
  return true;
}

export function isLegacyGenericHmNav(nav: string[] | null | undefined): boolean {
  if (!nav?.length) return true;
  if (isHealthyLiveMergedNav(nav)) return false;
  if (nav.some((s) => CUMHA_NAV_MARKERS.has(s))) return false;
  if (nav.some((s) => LIVE_MERGED_NAV_MARKERS.has(s))) return false;
  const genericHits = nav.filter((s) => LEGACY_GENERIC_NAV.has(s)).length;
  return genericHits >= 3;
}

export function navSlugsMatchCatalog(nav: string[] | null | undefined): boolean {
  if (!nav?.length) return false;
  if (isHealthyLiveMergedNav(nav)) return true;
  const expected = listKamuYerelCategoryPageAllowSlugs();
  if (nav.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i += 1) {
    if (nav[i] !== expected[i]) return false;
  }
  const top = listKamuYerelNavTopCategorySlugs();
  for (const slug of top) {
    if (!nav.includes(slug)) return false;
  }
  return true;
}

export type KamuYerelLogoExpectation = {
  logoPath: string;
  faviconPath: string;
};

/** Working brand logo — https:// or site ASSETS path. Empty/data:/wrong yekpare mark = broken. */
export function isUsableKamuYerelLogoUrl(logoUrl: string | null | undefined): boolean {
  const url = String(logoUrl ?? "").trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:image/")) return false;
  if (lower.includes("yekpare") && !lower.includes("turkata")) return false;
  if (url.startsWith("/brand/turkata/") && !url.includes("turkata-logo")) return false;
  if (lower.startsWith("https://") || lower.startsWith("http://")) return true;
  if (url.startsWith("/") && !url.startsWith("/brand/turkata/")) return true;
  return false;
}

export function kamuYerelLogoNeedsRepair(
  layoutJson: string | null | undefined,
  expect: KamuYerelLogoExpectation,
): boolean {
  if (hmLayoutLogoUsesInlineDataUrl(layoutJson)) return true;
  const raw = String(layoutJson ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as { logoUrl?: unknown; faviconUrl?: unknown };
    const logoUrl = String(layout?.logoUrl ?? "").trim();
    if (!logoUrl || logoUrl.toLowerCase().startsWith("data:image/")) return true;
    if (logoUrl.startsWith("/brand/turkata/") && !logoUrl.includes("turkata-logo")) return true;
    // Preserve working https:// and relative brand logos even if path ≠ catalog default.
    if (isUsableKamuYerelLogoUrl(logoUrl)) return false;
    if (logoUrl !== expect.logoPath) return true;
  } catch {
    return true;
  }
  return false;
}

function parseExtraPages(layout: Record<string, unknown>): Record<string, unknown>[] {
  const pages = Array.isArray(layout.hmExtraPages) ? layout.hmExtraPages : [];
  return pages.filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && !Array.isArray(p));
}

function dahaBodyFromPages(pages: Record<string, unknown>[]): string {
  const dahaPage = pages.find(
    (p) =>
      String(p.slug ?? "")
        .trim()
        .toLowerCase() === KAMU_YEREL_DAHA_PAGE_SLUG,
  );
  return String(dahaPage?.bodyHtml ?? "");
}

export function dahaExtraPageHasPromo(bodyHtml: string | null | undefined): boolean {
  const body = String(bodyHtml ?? "");
  return body.includes(KAMU_YEREL_DAHA_PROMO_MARKER) && body.includes("hm-daha-site-grid");
}

function kamuYerelExtraPagesNeedRepair(layoutJson: string | null | undefined): boolean {
  const raw = String(layoutJson ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    const pages = parseExtraPages(layout);
    const slugs = new Set(
      pages
        .map((p) =>
          String(p.slug ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
    if (!slugs.has(KAMU_YEREL_DAHA_PAGE_SLUG) || !slugs.has(KAMU_YEREL_ILLER_PAGE_SLUG)) return true;
    const body = dahaBodyFromPages(pages);
    if (!dahaExtraPageHasPromo(body)) return true;
    // Stale promo still listing TUKAV or separate Uluslararası block — upgrade.
    if (body.includes("tukav.org") || body.includes("daha-uluslararasi")) return true;
    const menu = Array.isArray(layout.hmCorporateMenuItems) ? layout.hmCorporateMenuItems : [];
    const daha = menu.find(
      (m) =>
        !!m &&
        typeof m === "object" &&
        !Array.isArray(m) &&
        String((m as { id?: unknown }).id ?? "").toLowerCase() === "ky-cat-daha",
    ) as { href?: unknown } | undefined;
    const href = String(daha?.href ?? "")
      .trim()
      .toLowerCase();
    if (href !== `/${KAMU_YEREL_DAHA_PAGE_SLUG}`) return true;
    return false;
  } catch {
    return true;
  }
}

/** Tepe menü / logo / RSS katalog dışına çıktı mı? */
export function kamuYerelLayoutNeedsCatalogRepair(
  layoutJson: string | null | undefined,
  expect: KamuYerelLogoExpectation,
): boolean {
  const nav = parseLayoutNavSlugs(layoutJson);
  if (!navSlugsMatchCatalog(nav)) return true;
  if (isLegacyGenericHmNav(nav)) return true;
  if (kamuYerelLogoNeedsRepair(layoutJson, expect)) return true;
  if (kamuYerelExtraPagesNeedRepair(layoutJson)) return true;
  return false;
}

/**
 * Merge catalog lock fields onto existing layout.
 * Preserve healthy live nav + usable logos; upgrade skinny/TUKAV /daha bodies.
 */
export function applyKamuYerelLayoutLock(
  existing: Record<string, unknown>,
  canonical: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing };
  const existingNav = Array.isArray(existing.hmNavOnlyCategorySlugs)
    ? existing.hmNavOnlyCategorySlugs.map((s) => String(s).trim()).filter(Boolean)
    : null;
  const preserveNav = isHealthyLiveMergedNav(existingNav);
  const existingLogo = String(existing.logoUrl ?? "").trim();
  const preserveLogo = isUsableKamuYerelLogoUrl(existingLogo);
  const existingPages = parseExtraPages(existing);
  const existingBody = dahaBodyFromPages(existingPages);
  const existingDahaOk =
    dahaExtraPageHasPromo(existingBody) &&
    !existingBody.includes("tukav.org") &&
    !existingBody.includes("daha-uluslararasi");

  for (const key of KAMU_YEREL_LAYOUT_LOCK_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(canonical, key)) continue;
    if (preserveNav && NAV_PRESERVE_KEYS.has(key)) continue;
    if (preserveLogo && (key === "logoUrl" || key === "faviconUrl")) {
      if (key === "faviconUrl" && !String(existing.faviconUrl ?? "").trim()) {
        merged[key] = canonical[key];
      }
      continue;
    }
    if (key === "hmExtraPages" && existingDahaOk) {
      const slugs = new Set(
        existingPages.map((p) =>
          String(p.slug ?? "")
            .trim()
            .toLowerCase(),
        ),
      );
      if (slugs.has(KAMU_YEREL_DAHA_PAGE_SLUG) && slugs.has(KAMU_YEREL_ILLER_PAGE_SLUG)) {
        continue;
      }
    }
    merged[key] = canonical[key];
  }

  if (!existingDahaOk && Object.prototype.hasOwnProperty.call(canonical, "hmExtraPages")) {
    merged.hmExtraPages = canonical.hmExtraPages;
  }

  return merged;
}

export function stripKamuYerelLockedLayoutIncoming(
  slug: string | null | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (key !== "turkatahaber" && key !== YERELNET_SLUG) return incoming;
  const out = { ...incoming };
  for (const k of KAMU_YEREL_LAYOUT_LOCK_KEYS) {
    delete out[k];
  }
  return out;
}

export function kamuYerelLogoExpectation(def: KamuYerelSiteDef): KamuYerelLogoExpectation {
  return { logoPath: def.logoPath, faviconPath: def.faviconPath };
}

/** Beklenen gizli nav slugs — katalog ile hizalı. */
export function expectedKamuYerelNavHiddenSlugs(): string[] {
  return listKamuYerelNavHiddenCategorySlugs();
}
