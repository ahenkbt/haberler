import { and, desc, eq, sql } from "drizzle-orm";
import { db, portalRssItemsTable } from "@workspace/db";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { GLOBAL_MAP_NEWS_CONTINENTS } from "./global-map-news-feeds.js";
import { loadPortalDbNews } from "./hybrid-news-merge.js";
import { sanitizeCumhaRssSpot } from "./rssCumhaExclude.js";
import { rssSourceNameFromUrl } from "./portal-rss-fetch.js";
import { isTurkishWorldBriefContent } from "./turkishContent.js";

const DUNYA_CATEGORY_SLUG = "dunya";
const DEFAULT_ITEMS_PER_FEED = 3;
const MAX_ITEMS_PER_FEED = 8;
const DB_RETENTION_MS = 7 * 24 * 60 * 60_000;

export type WorldBriefItem = {
  id: string;
  title: string;
  spot: string | null;
  href: string;
  publishedAt: string;
  sourceName: string;
  feedLabel: string;
  countryCode: string | null;
  countryName: string | null;
  continent: string;
  imageUrl: string | null;
};

export type WorldBriefCountryGroup = {
  code: string;
  name: string;
  items: WorldBriefItem[];
};

export type WorldBriefContinentGroup = {
  id: string;
  label: string;
  items: WorldBriefItem[];
  countries: WorldBriefCountryGroup[];
};

export type WorldBriefsPayload = {
  continents: WorldBriefContinentGroup[];
  totalItems: number;
  feedCount: number;
  checkedAt: string;
};

/** @deprecated Harita bölgesel RSS — dünya kutusu artık Türkçe `dunya` kategorisini kullanır. */
export function isWorldBriefGlobalMapFeed(row: { regionKey?: string | null; enabled?: boolean }): boolean {
  if (row.enabled === false) return false;
  const regionKey = String(row.regionKey ?? "").trim();
  return !regionKey;
}

function normalizePerFeedLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ITEMS_PER_FEED;
  return Math.min(Math.max(Math.round(n), 1), MAX_ITEMS_PER_FEED);
}

function isTurkishDunyaBriefItem(
  title: string,
  spot?: string | null,
  lang?: string | null,
  sourceName?: string | null,
): boolean {
  return isTurkishWorldBriefContent(title, spot, lang, sourceName);
}

function filterWorldBriefItems(items: WorldBriefItem[]): WorldBriefItem[] {
  return items.filter((item) =>
    isTurkishWorldBriefContent(item.title, item.spot, null, item.sourceName || item.feedLabel),
  );
}

function continentLabel(id: string): string {
  return GLOBAL_MAP_NEWS_CONTINENTS.find((row) => row.id === id)?.label ?? "Dünya";
}

function dbItemToWorldBrief(item: {
  id: number;
  title: string;
  spot?: string | null;
  href: string;
  publishedAt?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
}): WorldBriefItem | null {
  const title = decodeHtmlEntities(item.title);
  if (!isTurkishDunyaBriefItem(title, item.spot, null, item.categoryName)) return null;
  const spotRaw = item.spot ? sanitizeCumhaRssSpot(decodeHtmlEntities(item.spot), item.href) : "";
  return {
    id: `db:${item.id}`,
    title,
    spot: spotRaw || null,
    href: item.href,
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    sourceName: item.categoryName?.trim() || "Dünya",
    feedLabel: item.categoryName?.trim() || "Dünya",
    countryCode: null,
    countryName: null,
    continent: "global",
    imageUrl: item.imageUrl?.trim() ? item.imageUrl.trim() : null,
  };
}

function rssRowToWorldBrief(row: typeof portalRssItemsTable.$inferSelect): WorldBriefItem | null {
  const title = decodeHtmlEntities(row.title);
  const link = String(row.link ?? "").trim();
  const sourceName = row.sourceName?.trim() || rssSourceNameFromUrl(link) || null;
  if (!isTurkishDunyaBriefItem(title, row.spot, row.lang, sourceName)) return null;
  const spotRaw = row.spot ? sanitizeCumhaRssSpot(decodeHtmlEntities(row.spot), link) : "";
  const countryCode = row.countryCode?.trim() ? row.countryCode.trim().toUpperCase() : null;
  const countryName = row.regionLabel?.trim() || row.sourceName?.trim() || null;
  return {
    id: row.itemKey || `rss:${row.id}`,
    title,
    spot: spotRaw || null,
    href: link || `/haberler/rss/${encodeURIComponent(row.itemKey)}`,
    publishedAt: row.publishedAt.toISOString(),
    sourceName: row.sourceName?.trim() || rssSourceNameFromUrl(link) || "Dünya",
    feedLabel: row.sourceName?.trim() || "Dünya",
    countryCode,
    countryName,
    continent: "global",
    imageUrl: row.imageUrl?.trim() ? row.imageUrl.trim() : null,
  };
}

/** Türkçe dünya kategorisi — portal RSS + DB; yabancı dil `global` kategorisine taşınır. */
export async function loadWorldBriefs(opts?: {
  perFeed?: number;
  warmCache?: boolean;
}): Promise<WorldBriefsPayload> {
  void opts?.warmCache;
  const perFeed = normalizePerFeedLimit(opts?.perFeed);
  const fetchLimit = Math.min(perFeed * 40, 320);
  const cutoff = new Date(Date.now() - DB_RETENTION_MS);

  const [rssRows, dbBundle] = await Promise.all([
    db
      .select()
      .from(portalRssItemsTable)
      .where(
        and(
          eq(portalRssItemsTable.categorySlug, DUNYA_CATEGORY_SLUG),
          sql`${portalRssItemsTable.cachedAt} > ${cutoff}`,
        ),
      )
      .orderBy(desc(portalRssItemsTable.publishedAt))
      .limit(fetchLimit),
    loadPortalDbNews({ categorySlug: DUNYA_CATEGORY_SLUG, limit: fetchLimit, offset: 0 }),
  ]);

  const seen = new Set<string>();
  const allItems: WorldBriefItem[] = [];

  const pushItem = (item: WorldBriefItem | null) => {
    if (!item) return;
    const key = item.href.trim().toLowerCase() || item.id;
    if (seen.has(key)) return;
    seen.add(key);
    allItems.push(item);
  };

  for (const row of rssRows) pushItem(rssRowToWorldBrief(row));
  for (const row of dbBundle.items) {
    pushItem(
      dbItemToWorldBrief({
        id: row.id,
        title: row.title,
        spot: row.spot,
        href: `/haber/${row.slug}`,
        publishedAt: row.createdAt,
        categoryName: row.categoryName,
        imageUrl: row.imageUrl,
      }),
    );
  }

  allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const turkishItems = filterWorldBriefItems(allItems);

  const countriesByCode = new Map<string, WorldBriefCountryGroup>();
  const continentItems: WorldBriefItem[] = [];

  for (const item of turkishItems) {
    const code = item.countryCode?.trim().toUpperCase() ?? "";
    const name = item.countryName?.trim() || (code ? code : "");
    if (code && name) {
      const group = countriesByCode.get(code) ?? { code, name, items: [] };
      if (group.items.length < perFeed * 3) group.items.push(item);
      countriesByCode.set(code, group);
    } else if (continentItems.length < perFeed * 4) {
      continentItems.push(item);
    }
  }

  const countries = [...countriesByCode.values()]
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  const continents: WorldBriefContinentGroup[] =
    turkishItems.length === 0
      ? []
      : [
          {
            id: "global",
            label: continentLabel("global"),
            items: continentItems.slice(0, perFeed * 4),
            countries,
          },
        ];

  return {
    continents,
    totalItems: turkishItems.length,
    feedCount: countries.length + (continentItems.length > 0 ? 1 : 0),
    checkedAt: new Date().toISOString(),
  };
}

export { GLOBAL_MAP_NEWS_CONTINENTS };
