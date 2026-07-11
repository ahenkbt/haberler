import { asc, desc, eq, sql } from "drizzle-orm";
import { db, globalMapNewsFeedsTable, type GlobalMapNewsFeed } from "@workspace/db";
import { buildNewsmapRegionalRssFeedRows } from "../data/newsmapRegionalRssFeeds.js";
import { resolveGlobalMapFeedCategorySlug } from "./hm-global-news-category.js";
import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";

const GLOBAL_MAP_RSS_MAX_ITEMS = 15;

export const GLOBAL_MAP_NEWS_CONTINENTS = [
  { id: "global", label: "Küresel" },
  { id: "europe", label: "Avrupa" },
  { id: "asia", label: "Asya" },
  { id: "middle-east", label: "Orta Doğu" },
  { id: "africa", label: "Afrika" },
  { id: "americas", label: "Amerika" },
  { id: "oceania", label: "Okyanusya" },
] as const;

export type GlobalMapNewsContinentId = (typeof GLOBAL_MAP_NEWS_CONTINENTS)[number]["id"];
export type GlobalMapNewsCategory = "news" | "video" | "both";
export type GlobalMapNewsScope = "global" | "continent" | "country";

export type GlobalMapNewsFeedRow = {
  id: number;
  name: string;
  url: string;
  continent: string;
  countryCode: string | null;
  countryName: string | null;
  category: GlobalMapNewsCategory;
  scope: GlobalMapNewsScope;
  enabled: boolean;
  priority: number;
  lat: number | null;
  lng: number | null;
  regionKey: string | null;
  regionLabel: string | null;
  createdAt: string;
};

export type GlobalMapNewsCountryGroup = {
  code: string;
  name: string;
  feeds: GlobalMapNewsFeedRow[];
};

export type GlobalMapNewsContinentGroup = {
  id: string;
  label: string;
  feeds: GlobalMapNewsFeedRow[];
  countries: GlobalMapNewsCountryGroup[];
};

function normalizeRssUrl(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t || !/^https?:\/\//i.test(t)) return "";
  return t.slice(0, 500);
}

function normalizeCategory(raw: unknown): GlobalMapNewsCategory {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "video") return "video";
  if (v === "both") return "both";
  return "news";
}

function normalizeScope(raw: unknown): GlobalMapNewsScope {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "global") return "global";
  if (v === "continent") return "continent";
  return "country";
}

function normalizeContinent(raw: unknown): string {
  const v = String(raw ?? "").trim().toLowerCase();
  if (GLOBAL_MAP_NEWS_CONTINENTS.some((row) => row.id === v)) return v;
  return "global";
}

function categorySlugForFeed(row: Pick<GlobalMapNewsFeed, "category" | "regionKey" | "countryCode">): string {
  return resolveGlobalMapFeedCategorySlug({
    category: row.category,
    regionKey: row.regionKey,
    countryCode: row.countryCode,
  });
}

export function mapGlobalMapNewsFeedRow(row: GlobalMapNewsFeed): GlobalMapNewsFeedRow {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    continent: row.continent,
    countryCode: row.countryCode ?? null,
    countryName: row.countryName ?? null,
    category: normalizeCategory(row.category),
    scope: normalizeScope(row.scope),
    enabled: row.enabled,
    priority: row.priority,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    regionKey: row.regionKey ?? null,
    regionLabel: row.regionLabel ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt ?? ""),
  };
}

function normalizeGeoCoord(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function toPortalHybridRssFeedConfig(row: GlobalMapNewsFeed): PortalHybridRssFeedConfig {
  const category = normalizeCategory(row.category);
  return {
    id: `gmn-${row.id}`,
    categorySlug: categorySlugForFeed(row),
    label: row.name,
    url: row.url,
    enabled: row.enabled,
    maxItems: GLOBAL_MAP_RSS_MAX_ITEMS,
    geoLat: row.lat ?? null,
    geoLng: row.lng ?? null,
    regionKey: row.regionKey ?? null,
    regionLabel: row.regionLabel ?? null,
    countryCode: row.countryCode ?? null,
  };
}

export function mergePortalHybridRssFeedLists(
  primary: PortalHybridRssFeedConfig[],
  extra: PortalHybridRssFeedConfig[],
): PortalHybridRssFeedConfig[] {
  const seen = new Set<string>();
  const out: PortalHybridRssFeedConfig[] = [];

  for (const feed of [...primary, ...extra]) {
    const urlKey = normalizeRssUrl(feed.url).toLowerCase();
    const key = `${feed.categorySlug}:${urlKey || feed.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(feed);
  }

  return out;
}

export async function listGlobalMapNewsFeeds(): Promise<GlobalMapNewsFeed[]> {
  return db
    .select()
    .from(globalMapNewsFeedsTable)
    .orderBy(desc(globalMapNewsFeedsTable.priority), asc(globalMapNewsFeedsTable.name));
}

export async function loadEnabledGlobalMapNewsFeeds(): Promise<PortalHybridRssFeedConfig[]> {
  const rows = await db
    .select()
    .from(globalMapNewsFeedsTable)
    .where(eq(globalMapNewsFeedsTable.enabled, true))
    .orderBy(desc(globalMapNewsFeedsTable.priority), asc(globalMapNewsFeedsTable.name));
  return rows
    .map((row) => toPortalHybridRssFeedConfig(row))
    .filter((feed) => feed.enabled && feed.url);
}

export function groupGlobalMapNewsFeeds(rows: GlobalMapNewsFeedRow[]): GlobalMapNewsContinentGroup[] {
  const byContinent = new Map<string, GlobalMapNewsFeedRow[]>();
  for (const row of rows) {
    const key = normalizeContinent(row.continent);
    const list = byContinent.get(key) ?? [];
    list.push(row);
    byContinent.set(key, list);
  }

  return GLOBAL_MAP_NEWS_CONTINENTS.map((continent) => {
    const feeds = byContinent.get(continent.id) ?? [];
    const continentFeeds = feeds.filter((row) => !row.countryCode?.trim());
    const countryMap = new Map<string, GlobalMapNewsCountryGroup>();

    for (const row of feeds) {
      const code = String(row.countryCode ?? "").trim().toUpperCase();
      if (!code) continue;
      const existing = countryMap.get(code) ?? {
        code,
        name: String(row.countryName ?? code).trim() || code,
        feeds: [],
      };
      existing.feeds.push(row);
      countryMap.set(code, existing);
    }

    const countries = Array.from(countryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "tr-TR"),
    );

    return {
      id: continent.id,
      label: continent.label,
      feeds: continentFeeds,
      countries,
    };
  });
}

export type GlobalMapNewsFeedInput = {
  name: string;
  url: string;
  continent: string;
  countryCode?: string | null;
  countryName?: string | null;
  category?: GlobalMapNewsCategory;
  scope?: GlobalMapNewsScope;
  enabled?: boolean;
  priority?: number;
  lat?: number | null;
  lng?: number | null;
  regionKey?: string | null;
  regionLabel?: string | null;
};

export function parseGlobalMapNewsFeedInput(body: Record<string, unknown>): GlobalMapNewsFeedInput | null {
  const name = String(body.name ?? "").trim().slice(0, 120);
  const url = normalizeRssUrl(body.url);
  const continent = normalizeContinent(body.continent);
  if (!name || !url) return null;

  const countryCode = body.countryCode != null ? String(body.countryCode).trim().toUpperCase().slice(0, 2) : "";
  const countryName = body.countryName != null ? String(body.countryName).trim().slice(0, 80) : "";
  const regionKey = body.regionKey != null ? String(body.regionKey).trim().slice(0, 64) : "";
  const regionLabel = body.regionLabel != null ? String(body.regionLabel).trim().slice(0, 80) : "";

  return {
    name,
    url,
    continent,
    countryCode: countryCode || null,
    countryName: countryName || null,
    category: normalizeCategory(body.category),
    scope: normalizeScope(body.scope ?? (countryCode ? "country" : continent === "global" ? "global" : "continent")),
    enabled: body.enabled === false ? false : true,
    priority: Number.isFinite(Number(body.priority)) ? Math.round(Number(body.priority)) : 0,
    lat: normalizeGeoCoord(body.lat),
    lng: normalizeGeoCoord(body.lng),
    regionKey: regionKey || null,
    regionLabel: regionLabel || null,
  };
}

export async function countGlobalMapNewsFeedsByUrl(url: string, excludeId?: number): Promise<number> {
  const normalized = normalizeRssUrl(url).toLowerCase();
  if (!normalized) return 0;
  const rows = await db
    .select({ id: globalMapNewsFeedsTable.id })
    .from(globalMapNewsFeedsTable)
    .where(sql`lower(trim(${globalMapNewsFeedsTable.url})) = ${normalized}`);
  return rows.filter((row) => excludeId == null || row.id !== excludeId).length;
}

/** İlk deploy: migration 0095 tabloyu oluşturur; kaynak satırları admin seed ile gelir — boşsa otomatik doldur. */
export async function ensureGlobalMapNewsFeedsSeeded(): Promise<{ inserted: number; total: number; regionalInserted: number }> {
  const existing = await listGlobalMapNewsFeeds();
  let inserted = 0;

  if (existing.length === 0) {
    const seedModule = await import("../data/globalMapNewsFeedsSeed.json", { with: { type: "json" } });
    const seedRows = seedModule.default as Record<string, unknown>[];
    const seen = new Set<string>();

    for (const raw of seedRows) {
      const input = parseGlobalMapNewsFeedInput(raw);
      if (!input) continue;
      const urlKey = input.url.toLowerCase();
      if (seen.has(urlKey)) continue;
      seen.add(urlKey);
      await db.insert(globalMapNewsFeedsTable).values({
        name: input.name,
        url: input.url,
        continent: input.continent,
        countryCode: input.countryCode,
        countryName: input.countryName,
        category: input.category ?? "news",
        scope: input.scope ?? "country",
        enabled: input.enabled !== false,
        priority: input.priority ?? 0,
        lat: input.lat,
        lng: input.lng,
        regionKey: input.regionKey,
        regionLabel: input.regionLabel,
      });
      inserted += 1;
    }
  }

  const regional = await ensureNewsmapRegionalRssFeedsSeeded();
  const total = (await listGlobalMapNewsFeeds()).length;
  return { inserted, total, regionalInserted: regional.inserted };
}

/** 81 il + KKTC + komşu bölgeler — region_key veya URL ile idempotent upsert. */
export async function ensureNewsmapRegionalRssFeedsSeeded(): Promise<{ inserted: number; updated: number; total: number }> {
  const existing = await listGlobalMapNewsFeeds();
  const byUrl = new Map(existing.map((row) => [row.url.trim().toLowerCase(), row]));
  const byRegionKey = new Map(
    existing.filter((row) => row.regionKey?.trim()).map((row) => [String(row.regionKey).trim(), row]),
  );

  let inserted = 0;
  let updated = 0;

  for (const raw of buildNewsmapRegionalRssFeedRows()) {
    const input = parseGlobalMapNewsFeedInput(raw as Record<string, unknown>);
    if (!input?.regionKey || input.lat == null || input.lng == null) continue;

    const urlKey = input.url.toLowerCase();
    const regionKey = input.regionKey;
    const prevByRegion = byRegionKey.get(regionKey);
    const prevByUrl = byUrl.get(urlKey);
    const prev = prevByRegion ?? prevByUrl;

    if (prev) {
      const needsUpdate =
        prev.lat !== input.lat ||
        prev.lng !== input.lng ||
        (prev.regionKey ?? "") !== regionKey ||
        (prev.regionLabel ?? "") !== (input.regionLabel ?? "") ||
        prev.url.trim().toLowerCase() !== urlKey;
      if (needsUpdate) {
        await db
          .update(globalMapNewsFeedsTable)
          .set({
            name: input.name,
            url: input.url,
            continent: input.continent,
            countryCode: input.countryCode,
            countryName: input.countryName,
            category: input.category ?? "news",
            scope: input.scope ?? "country",
            enabled: input.enabled !== false,
            priority: input.priority ?? 0,
            lat: input.lat,
            lng: input.lng,
            regionKey: input.regionKey,
            regionLabel: input.regionLabel,
          })
          .where(eq(globalMapNewsFeedsTable.id, prev.id));
        updated += 1;
      }
      continue;
    }

    await db.insert(globalMapNewsFeedsTable).values({
      name: input.name,
      url: input.url,
      continent: input.continent,
      countryCode: input.countryCode,
      countryName: input.countryName,
      category: input.category ?? "news",
      scope: input.scope ?? "country",
      enabled: input.enabled !== false,
      priority: input.priority ?? 40,
      lat: input.lat,
      lng: input.lng,
      regionKey: input.regionKey,
      regionLabel: input.regionLabel,
    });
    inserted += 1;
    byUrl.set(urlKey, { id: -1 } as GlobalMapNewsFeed);
    byRegionKey.set(regionKey, { id: -1 } as GlobalMapNewsFeed);
  }

  const total = (await listGlobalMapNewsFeeds()).length;
  return { inserted, updated, total };
}
