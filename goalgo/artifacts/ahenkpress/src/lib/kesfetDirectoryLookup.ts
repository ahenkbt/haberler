import { KESFET_DISCOVER_GROUPS, type KesfetDiscoverGroup } from "./kesfetDiscoverCategories";

export type KesfetDirectoryKeywordEntry = {
  name: string;
  slug: string;
  keyword: string;
  group: string;
};

export function normalizeKesfetDirectorySearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function listKesfetDirectoryEntries(
  groups: KesfetDiscoverGroup[] = KESFET_DISCOVER_GROUPS,
): KesfetDirectoryKeywordEntry[] {
  const seen = new Set<string>();
  const entries: KesfetDirectoryKeywordEntry[] = [];
  for (const group of groups) {
    for (const sub of group.subcategories ?? []) {
      const name = (sub.name ?? "").trim();
      if (!name) continue;
      const dedupeKey = name.toLocaleLowerCase("tr-TR");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push({
        name,
        slug: sub.slug,
        keyword: sub.googleKeyword || name,
        group: group.label,
      });
    }
  }
  return entries;
}

/** Popüler arama / Sarı Sayfalar alt kategorisi — statik gruplar her zaman yedek olarak kullanılır. */
export function findKesfetDirectoryKeywordEntry(
  query: string,
  groups?: KesfetDiscoverGroup[],
): KesfetDirectoryKeywordEntry | null {
  const normalizedQuery = normalizeKesfetDirectorySearch(query);
  if (!normalizedQuery) return null;

  const sources: KesfetDiscoverGroup[][] = [];
  if (groups?.length) sources.push(groups);
  sources.push(KESFET_DISCOVER_GROUPS);

  for (const source of sources) {
    const entries = listKesfetDirectoryEntries(source);
    for (const entry of entries) {
      const nName = normalizeKesfetDirectorySearch(entry.name);
      const nKeyword = normalizeKesfetDirectorySearch(entry.keyword);
      if (nName === normalizedQuery || nKeyword === normalizedQuery) return entry;
    }
    // Kısmi eşleşme yalnızca otomatik tamamlama için; "oto" gibi kısa sorguları
    // "Oto Tamircileri" anahtar kelimesine çevirip sıfır sonuç döndürmesin diye burada kullanılmaz.
  }
  return null;
}

export type KesfetSearchSuggestRow = {
  id: string;
  label: string;
  group?: string;
  keyword?: string;
  categoryId?: string;
};

/** NE? alanı — map_categories + Keşfet dizini; yazdıkça filtreler. */
export function filterKesfetSearchSuggestions(
  query: string,
  rows: KesfetSearchSuggestRow[],
  limit = 8,
): KesfetSearchSuggestRow[] {
  const normalizedQuery = normalizeKesfetDirectorySearch(query);
  if (!normalizedQuery) return rows.slice(0, limit);
  const hits = rows.filter((row) => {
    const haystack = normalizeKesfetDirectorySearch(
      `${row.label} ${row.keyword ?? ""} ${row.group ?? ""}`,
    );
    return (
      haystack.includes(normalizedQuery)
      || normalizedQuery.includes(haystack.split(" ")[0] ?? "")
      || normalizeKesfetDirectorySearch(row.label).startsWith(normalizedQuery)
    );
  });
  return hits.slice(0, limit);
}

export function resolveKesfetKeywordsParam(
  query: string,
  directoryCategoryKeyword = "",
  groups?: KesfetDiscoverGroup[],
): string | null {
  const entry = findKesfetDirectoryKeywordEntry(query, groups);
  if (entry) return entry.keyword || entry.name;
  const catKw = directoryCategoryKeyword.trim();
  if (
    catKw &&
    normalizeKesfetDirectorySearch(query) === normalizeKesfetDirectorySearch(catKw)
  ) {
    return catKw;
  }
  return null;
}
