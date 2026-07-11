/** Hızlı arama önerileri — /api/search/suggest (<300ms hedef) */
import { db, getNewsDbForRead, newsTable } from "@workspace/db";
import {
  mapBusinessesTable,
  mapCitiesTable,
  vendorsTable,
} from "@workspace/db";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { buildSearchAutocompleteAiSuggestions } from "./geminiSearchService.js";
import { expandPlatformSearchTerms } from "./platform-unified-search.js";

export type SearchSuggestionType =
  | "query"
  | "popular"
  | "news"
  | "business"
  | "city"
  | "vendor"
  | "ai";

export type SearchSuggestion = {
  text: string;
  type: SearchSuggestionType;
  url?: string;
  icon?: string;
};

export type SearchSuggestResponse = {
  suggestions: SearchSuggestion[];
};

/** Yandex tarzı input ghost tamamlama — önek eşleşmesi */
const GHOST_COMPLETION_QUERIES = [
  "istanbul",
  "izmir",
  "ankara",
  "antalya",
  "bursa",
  "recep tayyip erdoğan",
  "kemal kılıçdaroğlu",
  "devlet bahçeli",
  "galatasaray",
  "fenerbahçe",
  "beşiktaş",
  "trabzonspor",
  "dolar kuru",
  "altın fiyatları",
  "hava durumu",
] as const;

const POPULAR_QUERIES = [
  "ankara kalesi",
  "istanbul otel",
  "antalya restoran",
  "izmir kafe",
  "bursa kebab",
  "trabzon otel",
  "kapadokya balon",
  "oto servis",
  "yedek parça",
  "market sipariş",
  "villa kiralama",
  "ankara haberleri",
  "yemek sipariş",
  "oto galeri",
  "kuaför",
  "eczane",
  "petshop",
  "mobilya mağaza",
] as const;

const AI_SUGGEST_BUDGET_MS = 220;

function normalizeSuggestQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function mapUrl(text: string, city?: string): string {
  const params = new URLSearchParams({ q: text });
  if (city?.trim()) params.set("city", city.trim());
  return `/map?${params.toString()}`;
}

function searchUrl(text: string): string {
  return `/ara?q=${encodeURIComponent(text)}`;
}

function dedupeSuggestions(items: SearchSuggestion[], limit: number): SearchSuggestion[] {
  const seen = new Set<string>();
  const out: SearchSuggestion[] = [];
  for (const item of items) {
    const key = item.text.toLocaleLowerCase("tr-TR");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function filterGhostCompletions(q: string, limit: number): SearchSuggestion[] {
  const norm = q.trim().toLocaleLowerCase("tr-TR");
  if (!norm) return [];
  const prefix = GHOST_COMPLETION_QUERIES.filter((item) =>
    item.toLocaleLowerCase("tr-TR").startsWith(norm),
  );
  const contains = GHOST_COMPLETION_QUERIES.filter(
    (item) =>
      !item.toLocaleLowerCase("tr-TR").startsWith(norm) &&
      item.toLocaleLowerCase("tr-TR").includes(norm),
  );
  return [...prefix, ...contains].slice(0, limit).map((text) => ({
    text,
    type: "query" as const,
    url: searchUrl(text),
    icon: "search",
  }));
}

function filterPopularQueries(q: string, limit: number): SearchSuggestion[] {
  const norm = q.toLocaleLowerCase("tr-TR");
  const matches = POPULAR_QUERIES.filter((item) =>
    !norm ? true : item.toLocaleLowerCase("tr-TR").includes(norm),
  );
  return matches.slice(0, limit).map((text) => ({
    text,
    type: "popular" as const,
    url: searchUrl(text),
    icon: "trending",
  }));
}

async function fetchNewsSuggestions(q: string, limit: number): Promise<SearchSuggestion[]> {
  const terms = expandPlatformSearchTerms(q).slice(0, 3);
  if (!terms.length) return [];
  const newsOr = terms.flatMap((term) => [
    ilike(newsTable.title, `%${term}%`),
    ilike(newsTable.spot, `%${term}%`),
  ]);
  try {
    const rows = await getNewsDbForRead()
      .select({
        title: newsTable.title,
        slug: newsTable.slug,
        id: newsTable.id,
      })
      .from(newsTable)
      .where(and(eq(newsTable.status, "published"), or(...newsOr)!))
      .orderBy(desc(newsTable.isFeatured), desc(newsTable.createdAt))
      .limit(limit);
    return rows.map((row) => {
      const text = String(row.title ?? "").trim();
      return {
        text,
        type: "news" as const,
        url: searchUrl(text),
        icon: "news",
      };
    }).filter((s) => s.text);
  } catch {
    return [];
  }
}

async function fetchBusinessSuggestions(q: string, limit: number): Promise<SearchSuggestion[]> {
  const terms = expandPlatformSearchTerms(q).slice(0, 3);
  if (!terms.length) return [];
  const clauses: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    clauses.push(
      ilike(mapBusinessesTable.name, pattern),
      ilike(mapBusinessesTable.description, pattern),
    );
  }
  try {
    const rows = await db
      .select({
        name: mapBusinessesTable.name,
        slug: mapBusinessesTable.slug,
        id: mapBusinessesTable.id,
        latitude: mapBusinessesTable.latitude,
        longitude: mapBusinessesTable.longitude,
      })
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.isActive, true), or(...clauses)!))
      .orderBy(desc(mapBusinessesTable.isPremium), desc(mapBusinessesTable.userRatingsTotal))
      .limit(limit);
    return rows.map((row) => {
      const text = String(row.name ?? "").trim();
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      const params = new URLSearchParams({ q: text, nav: String(row.id) });
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
        params.set("zoom", "17");
      }
      return {
        text,
        type: "business" as const,
        url: `/map?${params.toString()}`,
        icon: "business",
      };
    }).filter((s) => s.text);
  } catch {
    return [];
  }
}

async function fetchCitySuggestions(q: string, limit: number): Promise<SearchSuggestion[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  try {
    const rows = await db
      .select({ name: mapCitiesTable.name })
      .from(mapCitiesTable)
      .where(ilike(mapCitiesTable.name, `${term}%`))
      .orderBy(mapCitiesTable.name)
      .limit(limit);
    return rows.map((row) => {
      const text = String(row.name ?? "").trim();
      return {
        text,
        type: "city" as const,
        url: mapUrl(text, text),
        icon: "city",
      };
    }).filter((s) => s.text);
  } catch {
    return [];
  }
}

async function fetchVendorSuggestions(q: string, limit: number): Promise<SearchSuggestion[]> {
  const terms = expandPlatformSearchTerms(q).slice(0, 2);
  if (!terms.length) return [];
  const vendorOr = terms.flatMap((term) => [
    ilike(vendorsTable.name, `%${term}%`),
    ilike(vendorsTable.city, `%${term}%`),
  ]);
  try {
    const rows = await db
      .select({ name: vendorsTable.name })
      .from(vendorsTable)
      .where(and(eq(vendorsTable.active, true), or(...vendorOr)!))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.rating))
      .limit(limit);
    return rows.map((row) => {
      const text = String(row.name ?? "").trim();
      return {
        text,
        type: "vendor" as const,
        url: searchUrl(text),
        icon: "vendor",
      };
    }).filter((s) => s.text);
  } catch {
    return [];
  }
}

async function fetchAiSuggestions(q: string, limit: number): Promise<SearchSuggestion[]> {
  if (q.trim().length < 3 || limit <= 0) return [];
  try {
    const texts = await Promise.race([
      buildSearchAutocompleteAiSuggestions(q, limit),
      new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([]), AI_SUGGEST_BUDGET_MS);
      }),
    ]);
    return texts.map((text) => ({
      text,
      type: "ai" as const,
      url: searchUrl(text),
      icon: "ai",
    }));
  } catch {
    return [];
  }
}

/** GET /api/search/suggest — hızlı birleşik öneri listesi */
export async function runSearchSuggest(input: {
  q: string;
  limit?: number;
}): Promise<SearchSuggestResponse> {
  const q = normalizeSuggestQuery(input.q);
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 12);

  if (!q) {
    return {
      suggestions: filterPopularQueries("", Math.min(limit, 6)),
    };
  }

  const typedQuery: SearchSuggestion = {
    text: q,
    type: "query",
    url: searchUrl(q),
    icon: "search",
  };

  const perSource = Math.max(2, Math.ceil(limit / 4));
  const aiBudget = Math.max(1, Math.min(2, limit - 3));

  const [ghost, popular, news, businesses, cities, vendors, ai] = await Promise.all([
    Promise.resolve(filterGhostCompletions(q, 3)),
    Promise.resolve(filterPopularQueries(q, 2)),
    fetchNewsSuggestions(q, perSource),
    fetchBusinessSuggestions(q, perSource),
    fetchCitySuggestions(q, 2),
    fetchVendorSuggestions(q, 2),
    fetchAiSuggestions(q, aiBudget),
  ]);

  const suggestions = dedupeSuggestions(
    [typedQuery, ...ghost, ...popular, ...news, ...businesses, ...cities, ...vendors, ...ai],
    limit,
  );

  return { suggestions };
}
