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
  "hmPrimaryColor",
  "hmSecondaryColor",
  "hmVitrinTheme",
]);

/** Cumha tepe menü — hm-cumha-kamu-yerel-catalog KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS */
export const KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS = Object.freeze([
  "siyaset",
  "kamu",
  "stk",
  "yerel-yonetimler",
  "yerel",
  "gundem",
  "dunya",
  "spor",
  "teknoloji",
  "saglik",
  "roportajlar",
]);

const KAMU_YEREL_SLUGS = new Set(["turkatahaber", "yerelnet"]);

const LOGO_BY_SLUG = Object.freeze({
  turkatahaber: {
    logoUrl: "/turkata/turkata-logo.webp",
    faviconUrl: "/turkata/favicon.ico",
  },
  yerelnet: {
    logoUrl: "/yerel/yerel-logo.png",
    faviconUrl: "/yerel/yerel-logo.png",
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

/**
 * PHP uses hmNavOnly as /kategori page allowlist — must include tepe + bolge-*.
 * Never shrink a fuller allowlist back to tepe-only (that 404s /kategori/bolge-*).
 */
function navMatchesCatalog(nav) {
  if (!Array.isArray(nav) || nav.length < KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS.length) return false;
  const set = new Set(nav.map((s) => String(s ?? "").trim().toLowerCase()).filter(Boolean));
  for (const slug of KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS) {
    if (!set.has(slug)) return false;
  }
  return [...set].some((s) => s.startsWith("bolge-"));
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
  const faviconUrl = String(next.faviconUrl ?? "").trim();
  // Always pin brand assets — never leave Turkata mark/paths on yerel.net.tr.
  if (
    !logoUrl ||
    logoUrl !== brand.logoUrl ||
    logoUrl.toLowerCase().startsWith("data:image/") ||
    logoUrl.startsWith("/brand/turkata/") ||
    (key === "yerelnet" && logoUrl.startsWith("/turkata/"))
  ) {
    next.logoUrl = brand.logoUrl;
  }
  if (
    !faviconUrl ||
    faviconUrl !== brand.faviconUrl ||
    faviconUrl.toLowerCase().startsWith("data:image/") ||
    faviconUrl.startsWith("/brand/turkata/") ||
    (key === "yerelnet" && faviconUrl.startsWith("/turkata/"))
  ) {
    next.faviconUrl = brand.faviconUrl;
  }
  if (!navMatchesCatalog(next.hmNavOnlyCategorySlugs)) {
    // Ensure seed / sync owns the full page allowlist; only guarantee tepe markers here.
    const cur = Array.isArray(next.hmNavOnlyCategorySlugs)
      ? next.hmNavOnlyCategorySlugs.map((s) => String(s ?? "").trim().toLowerCase()).filter(Boolean)
      : [];
    const set = new Set(cur);
    for (const slug of KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS) set.add(slug);
    next.hmNavOnlyCategorySlugs = [...set];
  }
  return next;
}
