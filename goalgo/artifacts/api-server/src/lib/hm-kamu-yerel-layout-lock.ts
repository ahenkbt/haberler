/**
 * turkatahaber.com & yerel.net.tr — layout_json alanları Cumha kamu-yerel kataloğuna kilitlenir.
 * Editör kaydı veya eski PHP migration menüsü bu alanları ezmemeli.
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
import { isValidLayoutHexColor } from "./hm-php-concept-colors.js";
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
  // 2026-10-08: hmPrimaryColor / hmSecondaryColor kilitli DEĞİL — editörün "Site rengi"
  // seçimi korunur; applyKamuYerelLayoutLock yalnızca eksik/geçersizse kanonik rengi yazar.
  "hmVitrinTheme",
] as const;

/** Konsept renkleri: kilit değil, yalnızca eksik/geçersizse onarılır. */
export const KAMU_YEREL_COLOR_FILL_KEYS = ["hmPrimaryColor", "hmSecondaryColor"] as const;

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
  // Birleşik tepe (gundem/dunya/spor LEGACY_GENERIC'de — buraya koyma)
  "siyaset",
  "kamu",
  "stk",
  "yerel-yonetimler",
  "roportajlar",
  // legacy Cumha tepe slug'ları (eski layout'lar)
  "daha",
  "toplum-ve-yasam",
  "cumhurbaskanligi",
  "bakanliklar",
  "tbmm",
  "kamu-kurumlari",
  "mulki-idare",
  "siyasi-partiler",
]);

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

export function isLegacyGenericHmNav(nav: string[] | null | undefined): boolean {
  if (!nav?.length) return true;
  if (nav.some((s) => CUMHA_NAV_MARKERS.has(s))) return false;
  const genericHits = nav.filter((s) => LEGACY_GENERIC_NAV.has(s)).length;
  return genericHits >= 3;
}

export function navSlugsMatchCatalog(nav: string[] | null | undefined): boolean {
  if (!nav?.length) return false;
  // PHP page allowlist must include every kamu-yerel slug (bolge-* + iller), not only tepe menü.
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
    const faviconUrl = String(layout?.faviconUrl ?? "").trim();
    if (!logoUrl || logoUrl.toLowerCase().startsWith("data:image/")) return true;
    if (logoUrl.startsWith("/brand/turkata/")) return true;
    if (logoUrl !== expect.logoPath) return true;
    if (faviconUrl && faviconUrl !== expect.faviconPath && faviconUrl.startsWith("/brand/turkata/")) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

function kamuYerelExtraPagesNeedRepair(layoutJson: string | null | undefined): boolean {
  const raw = String(layoutJson ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as {
      hmExtraPages?: unknown;
      hmCorporateMenuItems?: unknown;
    };
    const pages = Array.isArray(layout.hmExtraPages) ? layout.hmExtraPages : [];
    const slugs = new Set(
      pages
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && !Array.isArray(p))
        .map((p) =>
          String(p.slug ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
    if (!slugs.has(KAMU_YEREL_DAHA_PAGE_SLUG) || !slugs.has(KAMU_YEREL_ILLER_PAGE_SLUG)) return true;
    const dahaPage = pages.find(
      (p) =>
        !!p &&
        typeof p === "object" &&
        !Array.isArray(p) &&
        String((p as { slug?: unknown }).slug ?? "")
          .trim()
          .toLowerCase() === KAMU_YEREL_DAHA_PAGE_SLUG,
    ) as { bodyHtml?: unknown } | undefined;
    const dahaBody = String(dahaPage?.bodyHtml ?? "");
    if (
      !dahaBody.includes(KAMU_YEREL_DAHA_PROMO_MARKER) ||
      !dahaBody.includes("hm-daha-site-grid") ||
      !dahaBody.includes("ankara.gundemi.org") ||
      !dahaBody.includes("ankara.fix.tc") ||
      !dahaBody.includes("vatanhaber.net")
    ) {
      return true;
    }
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

export function applyKamuYerelLayoutLock(
  existing: Record<string, unknown>,
  canonical: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing };
  for (const key of KAMU_YEREL_LAYOUT_LOCK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(canonical, key)) {
      merged[key] = canonical[key];
    }
  }
  for (const key of KAMU_YEREL_COLOR_FILL_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(canonical, key) &&
      !isValidLayoutHexColor(merged[key])
    ) {
      merged[key] = canonical[key];
    }
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
