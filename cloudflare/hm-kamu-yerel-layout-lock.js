/**
 * turkatahaber.com & yerel.net.tr — editör layout kaydında kilitli alanlar.
 * Katalog: goalgo/.../hm-kamu-yerel-layout-lock.ts ile hizalı.
 */

export const KAMU_YEREL_LAYOUT_LOCK_KEYS = Object.freeze([
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
]);

/** Cumha tepe menü — hm-cumha-kamu-yerel-catalog KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS */
export const KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS = Object.freeze([
  "yerel",
  "cumhurbaskanligi",
  "bakanliklar",
  "tbmm",
  "siyasi-partiler",
  "yerel-yonetimler",
  "mulki-idare",
  "toplum-ve-yasam",
  "daha",
  "sivil-toplum-kuruluslari",
  "kamu-kurumlari",
]);

const KAMU_YEREL_SLUGS = new Set(["turkatahaber", "yerelnet"]);

const LOGO_BY_SLUG = Object.freeze({
  turkatahaber: {
    logoUrl: "/brand/turkata/turkata-logo-light.png",
    faviconUrl: "/brand/turkata/favicon.ico",
  },
  yerelnet: {
    logoUrl: "/brand/turkata/turkata-mark.png",
    faviconUrl: "/brand/turkata/turkata-mark.png",
  },
});

export function isKamuYerelHmSlug(slug) {
  return KAMU_YEREL_SLUGS.has(
    String(slug ?? "")
      .trim()
      .toLowerCase(),
  );
}

export function stripKamuYerelLockedLayoutIncoming(slug, incoming) {
  if (!isKamuYerelHmSlug(slug)) return incoming;
  const out = { ...incoming };
  for (const k of KAMU_YEREL_LAYOUT_LOCK_KEYS) delete out[k];
  return out;
}

function navMatchesCatalog(nav) {
  if (!Array.isArray(nav) || nav.length !== KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS.length) return false;
  for (let i = 0; i < KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS.length; i += 1) {
    if (String(nav[i]) !== KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS[i]) return false;
  }
  return true;
}

/** Kayıt sonrası: inline logo veya generic menüyü düzelt. */
export function repairKamuYerelLayoutAfterMerge(slug, merged) {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!KAMU_YEREL_SLUGS.has(key)) return merged;
  const next = { ...merged };
  const brand = LOGO_BY_SLUG[key];
  const logoUrl = String(next.logoUrl ?? "").trim();
  if (!logoUrl || logoUrl.toLowerCase().startsWith("data:image/") || logoUrl.startsWith("/turkata/")) {
    next.logoUrl = brand.logoUrl;
    next.faviconUrl = brand.faviconUrl;
  }
  if (!navMatchesCatalog(next.hmNavOnlyCategorySlugs)) {
    next.hmNavOnlyCategorySlugs = [...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS];
  }
  return next;
}
