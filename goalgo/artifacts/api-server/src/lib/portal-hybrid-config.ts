import { eq, isNull, or } from "drizzle-orm";
import { categoriesTable, db, getNewsDbForRead, siteSettingsTable } from "@workspace/db";
import { parseHmLayoutRecord } from "./hm-layout-json.js";
import { allowCrossSiteManualNewsFromLayout, hiddenHmPoolNewsIdsFromLayout, hiddenHmRssItemIdsFromLayout, hmRssIntegrationModeFromLayout, yekparePoolReceiveEnabledFromLayout, yekparePoolSendEnabledFromLayout } from "./hm-public-layout.js";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { isExcludedCumhaKoeseFeedUrl } from "./rssCumhaExclude.js";

export type PortalHybridRssFeedConfig = {
  id: string;
  categorySlug: string;
  label: string;
  url: string;
  enabled: boolean;
  maxItems: number;
  /** Newsmap — feed merkez koordinatları */
  geoLat?: number | null;
  geoLng?: number | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
};

export type HmHybridRssScope = "site" | "box" | "all";

const BOX_RSS_MAX_ITEMS = 10;
const SITE_RSS_MAX_ITEMS = 12;
const PORTAL_RSS_MAX_ITEMS = 20;

function normalizeRssUrl(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t || !/^https?:\/\//i.test(t)) return "";
  return t.slice(0, 500);
}

function normalizeSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}

function normalizeFeedIdSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function normalizeId(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return t || fallback;
}

export function normalizePortalHybridRssFeeds(raw: unknown): PortalHybridRssFeedConfig[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PortalHybridRssFeedConfig[] = [];

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = normalizeId(row.id, `portal-rss-${index + 1}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const categorySlug = normalizeSlug(row.categorySlug);
    const label = String(row.label ?? "").trim().slice(0, 80) || categorySlug || "RSS";
    const url = normalizeRssUrl(row.url);
    const enabled = row.enabled === false ? false : true;
    const maxRaw = Number(row.maxItems ?? PORTAL_RSS_MAX_ITEMS);
    const maxItems = Number.isFinite(maxRaw)
      ? Math.min(24, Math.max(1, Math.round(maxRaw)))
      : PORTAL_RSS_MAX_ITEMS;

    if (!categorySlug || !url) continue;
    if (isExcludedCumhaKoeseFeedUrl(url)) continue;
    out.push({ id, categorySlug, label, url, enabled, maxItems });
  }

  return out;
}

function categorySlugCandidates(rawCategoryKey: unknown, rawId: unknown, rawLabel: unknown): string[] {
  const categoryKeySlug = normalizeSlug(rawCategoryKey);
  const idSlug = normalizeFeedIdSlug(rawId);
  const labelSlug = normalizeSlug(rawLabel);
  const out = [categoryKeySlug, labelSlug, idSlug].filter(Boolean);
  if (out.includes("kultur-sanat")) out.push("kultur");
  return Array.from(new Set(out));
}

function resolveHmBreakingRssCategoryKey(row: Record<string, unknown>): string {
  return String(row.categoryKey ?? row.id ?? "").trim();
}

function resolveFeedCategorySlug(
  rawCategoryKey: unknown,
  rawId: unknown,
  rawLabel: unknown,
  categorySlugLookup: Map<string, string>,
  index: number,
): string {
  const candidates = categorySlugCandidates(rawCategoryKey, rawId, rawLabel);
  for (const candidate of candidates) {
    const mapped = categorySlugLookup.get(candidate);
    if (mapped) return mapped;
  }
  return candidates.find(Boolean) || `rss-${index + 1}`;
}

/** Frontend `defaultHmBreakingRssFeeds` ile uyumlu varsayılan RSS URL haritası. */
const HM_DEFAULT_BREAKING_RSS_FEEDS: Record<string, string> = {
  turkiye: "https://www.ntv.com.tr/turkiye.rss",
  dunya: "https://www.ntv.com.tr/dunya.rss",
  ekonomi: "https://www.ntv.com.tr/ekonomi.rss",
  teknoloji: "https://www.ntv.com.tr/teknoloji.rss",
  saglik: "https://www.ntv.com.tr/saglik.rss",
  spor: "",
  yasam: "https://www.ntv.com.tr/yasam.rss",
  otomobil: "https://www.ntv.com.tr/otomobil.rss",
  para: "https://www.ntv.com.tr/ntvpara.rss",
  egitim: "https://www.ntv.com.tr/egitim.rss",
  savunmaSanayi: "https://www.dirilispostasi.com/rss/savunma-sanayi",
};

const HM_PRESET_BREAKING_RSS_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "turkiye", label: "Türkiye" },
  { id: "dunya", label: "Dünya" },
  { id: "ekonomi", label: "Ekonomi" },
  { id: "teknoloji", label: "Teknoloji" },
  { id: "saglik", label: "Sağlık" },
  { id: "spor", label: "Spor" },
  { id: "yasam", label: "Yaşam" },
  { id: "otomobil", label: "Otomobil" },
  { id: "para", label: "Para" },
  { id: "egitim", label: "Eğitim" },
  { id: "savunmaSanayi", label: "Savunma Sanayi" },
];

async function loadHmCategorySlugLookup(siteId: number): Promise<Map<string, string>> {
  const rows = await getNewsDbForRead()
    .select({
      slug: categoriesTable.slug,
      name: categoriesTable.name,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId)));

  const lookup = new Map<string, string>();
  for (const row of rows.sort((a, b) => (b.exclusiveSiteId === siteId ? 1 : 0) - (a.exclusiveSiteId === siteId ? 1 : 0))) {
    const slug = normalizeSlug(row.slug);
    const nameSlug = normalizeSlug(row.name);
    if (slug) lookup.set(slug, slug);
    if (nameSlug) lookup.set(nameSlug, slug);
  }
  return lookup;
}

function normalizeHmBreakingRssRows(
  rawRows: unknown,
  legacyFeeds: unknown,
  siteId: number,
  scope: "site" | "box",
  categorySlugLookup: Map<string, string>,
): PortalHybridRssFeedConfig[] {
  const seen = new Set<string>();
  const out: PortalHybridRssFeedConfig[] = [];
  const add = (
    rawId: unknown,
    rawLabel: unknown,
    rawUrl: unknown,
    rawCategoryKey: unknown,
    index: number,
  ) => {
    const localId = normalizeId(rawId, `rss-${index + 1}`);
    const url = normalizeRssUrl(rawUrl);
    if (!localId || !url || seen.has(localId)) return;
    if (isExcludedCumhaKoeseFeedUrl(url)) return;
    seen.add(localId);
    const categorySlug = resolveFeedCategorySlug(rawCategoryKey, rawId, rawLabel, categorySlugLookup, index);
    const label = String(rawLabel ?? "").trim().slice(0, 80) || categorySlug;
    out.push({
      id: `hm-${siteId}-${scope}-${localId}`,
      categorySlug,
      label,
      url,
      enabled: true,
      maxItems: scope === "site" ? SITE_RSS_MAX_ITEMS : BOX_RSS_MAX_ITEMS,
    });
  };

  if (Array.isArray(rawRows) && rawRows.length > 0) {
    rawRows.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const row = item as Record<string, unknown>;
      add(row.id, row.label, row.url, resolveHmBreakingRssCategoryKey(row), index);
    });
  }

  // Site içi RSS: boş liste = kaynak yok. Kutu (box) legacy kırılım feed’lerine düşmesin.
  if (out.length === 0 && scope === "site") {
    return out;
  }

  if (out.length === 0) {
    const legacyMap =
      legacyFeeds && typeof legacyFeeds === "object" && !Array.isArray(legacyFeeds)
        ? (legacyFeeds as Record<string, unknown>)
        : HM_DEFAULT_BREAKING_RSS_FEEDS;

    HM_PRESET_BREAKING_RSS_CATEGORIES.forEach((category, index) => {
      const url = normalizeRssUrl(legacyMap[category.id] ?? HM_DEFAULT_BREAKING_RSS_FEEDS[category.id]);
      if (!url) return;
      add(category.id, category.label, url, category.id, index);
    });
  }

  return out;
}

function mergeHmScopedRssRows(
  primaryRows: PortalHybridRssFeedConfig[],
  fallbackRows: PortalHybridRssFeedConfig[],
): PortalHybridRssFeedConfig[] {
  const seen = new Set<string>();
  const out: PortalHybridRssFeedConfig[] = [];

  for (const feed of [...primaryRows, ...fallbackRows]) {
    const urlKey = normalizeRssUrl(feed.url).toLowerCase();
    const key = `${feed.categorySlug}:${urlKey || feed.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(feed);
  }

  return out;
}

function hmPortalRssRowsFromLayout(
  layout: Record<string, unknown>,
  siteId: number,
  categorySlugLookup: Map<string, string>,
): PortalHybridRssFeedConfig[] {
  const portalFeeds = normalizePortalHybridRssFeeds(layout.portalHybridRssFeeds);
  return portalFeeds.map((feed, index) => ({
    ...feed,
    id: feed.id.startsWith(`hm-${siteId}-`) ? feed.id : `hm-${siteId}-site-${feed.id}`,
    categorySlug:
      categorySlugLookup.get(feed.categorySlug) ??
      categorySlugLookup.get(normalizeSlug(feed.label)) ??
      feed.categorySlug,
    maxItems: SITE_RSS_MAX_ITEMS,
    enabled: feed.enabled !== false,
  }));
}

export async function loadPortalHybridRssFeeds(
  siteId?: number | null,
  scope: HmHybridRssScope = "site",
): Promise<PortalHybridRssFeedConfig[]> {
  if (siteId != null && Number.isFinite(siteId) && siteId > 0) {
    const site = await getHmNewsSiteByIdCompat(Math.floor(siteId));
    const layout = parseHmLayoutRecord(site?.layoutJson ?? null);
    const id = Math.floor(siteId);
    const categorySlugLookup = await loadHmCategorySlugLookup(id);
    const boxRows = () =>
      normalizeHmBreakingRssRows(layout.hmNewsBreakingRssFeedRows, layout.hmNewsBreakingRssFeeds, id, "box", categorySlugLookup);
    const siteRows = () =>
      // Site scope: yalnızca hmNewsSiteRssFeedRows — kutu feed’leri / legacy breaking fallback karışmaz.
      normalizeHmBreakingRssRows(layout.hmNewsSiteRssFeedRows, null, id, "site", categorySlugLookup);
    const portalLayoutRows = () => hmPortalRssRowsFromLayout(layout, id, categorySlugLookup);
    if (scope === "box") return mergeHmScopedRssRows(boxRows(), []);
    if (scope === "site") return mergeHmScopedRssRows(siteRows(), portalLayoutRows());
    return mergeHmScopedRssRows(mergeHmScopedRssRows(siteRows(), boxRows()), portalLayoutRows());
  }

  const [row] = await db.select({ newsLayoutJson: siteSettingsTable.newsLayoutJson }).from(siteSettingsTable).limit(1);
  const layout = parseHmLayoutRecord(row?.newsLayoutJson ?? null);
  return normalizePortalHybridRssFeeds(layout.portalHybridRssFeeds);
}

export function feedMatchesCategorySlug(feedCategorySlug: string, wantSlug: string): boolean {
  const feedSlug = feedCategorySlug.trim().toLowerCase();
  const slug = wantSlug.trim().toLowerCase();
  if (!slug) return true;
  if (feedSlug === slug) return true;
  if (feedSlug.endsWith(`-${slug}`)) return true;
  return false;
}

export function enabledPortalHybridRssFeeds(
  feeds: PortalHybridRssFeedConfig[],
  categorySlug?: string,
): PortalHybridRssFeedConfig[] {
  const slug = categorySlug?.trim().toLowerCase();
  return feeds.filter((feed) => {
    if (!feed.enabled || !feed.url) return false;
    if (!slug) return true;
    return feedMatchesCategorySlug(feed.categorySlug, slug) || normalizeSlug(feed.label) === slug;
  });
}

export function isHybridRssEnabledInLayout(layout: Record<string, unknown>): boolean {
  return layout.hybridRssEnabled === true;
}

function parseActivatedCategorySlugs(layout: Record<string, unknown>): string[] {
  const raw = (layout as { hmActivatedCategorySlugs?: unknown }).hmActivatedCategorySlugs;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    const s = String(v ?? "").trim().toLowerCase();
    if (s) out.push(s);
  }
  return Array.from(new Set(out));
}

/**
 * Kurumsal (corporate/kurumsal vitrin teması) site mi?
 * Varsayılan kategori aktivasyonu buna göre değişir:
 *  - Haber sitesi: genel kategoriler varsayılan AKTİF.
 *  - Kurumsal site: genel kategoriler varsayılan PASİF (yalnızca kendi kategorileri + manuel haberleri).
 */
export function isCorporateHmLayout(layout: Record<string, unknown>): boolean {
  const t = String((layout as { hmVitrinTheme?: unknown }).hmVitrinTheme ?? "").trim().toLowerCase();
  return t === "corporate" || t === "kurumsal";
}

export async function resolveHmHybridRssAccess(siteId: number): Promise<{
  siteId: number;
  slug: string;
  active: boolean;
  hybridRssEnabled: boolean;
  activatedCategorySlugs: string[];
  hiddenRssItemIds: string[];
  hiddenPoolNewsIds: number[];
  isCorporate: boolean;
  allowCrossSiteManualNews: boolean;
  rssIntegrationMode: import("./hm-public-layout.js").HmRssIntegrationMode;
  yekparePoolReceiveEnabled: boolean;
  yekparePoolSendEnabled: boolean;
} | null> {
  if (!Number.isFinite(siteId) || siteId <= 0) return null;
  const site = await getHmNewsSiteByIdCompat(siteId);
  if (!site) return null;
  const layout = parseHmLayoutRecord(site.layoutJson);
  return {
    siteId: site.id,
    slug: site.slug,
    active: site.active !== false,
    hybridRssEnabled: isHybridRssEnabledInLayout(layout),
    activatedCategorySlugs: parseActivatedCategorySlugs(layout),
    hiddenRssItemIds: hiddenHmRssItemIdsFromLayout(layout),
    hiddenPoolNewsIds: hiddenHmPoolNewsIdsFromLayout(layout),
    isCorporate: isCorporateHmLayout(layout),
    allowCrossSiteManualNews: allowCrossSiteManualNewsFromLayout(layout),
    rssIntegrationMode: hmRssIntegrationModeFromLayout(layout),
    yekparePoolReceiveEnabled: yekparePoolReceiveEnabledFromLayout(layout),
    yekparePoolSendEnabled: yekparePoolSendEnabledFromLayout(layout),
  };
}
