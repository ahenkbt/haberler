import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { buildMapSearchHref, rewriteHaritalarPathToMap } from "@/lib/haritalarNav";
const DEBOUNCE_MS = 200;

/** Yandex tarzı input ghost tamamlama — önek eşleşmesi */
export const GHOST_COMPLETION_QUERIES = [
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

/** API yanıtı gelene kadar anında gösterilecek yerel trend listesi */
export const LOCAL_TRENDING_QUERIES = [
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

/** Yandex-style trend tab row — Yekpare kategorileri */
export const TREND_CATEGORY_TABS = [
  { id: "popular", label: "POPÜLER", keywords: [] as string[] },
  { id: "isletme", label: "İşletme", keywords: ["otel", "restoran", "kafe", "market", "mağaza", "kuaför", "eczane", "petshop", "servis", "galeri"] },
  { id: "seyahat", label: "Seyahat", keywords: ["otel", "villa", "kapadokya", "turizm", "seyahat", "balon"] },
  { id: "haber", label: "Haber", keywords: ["haber"] },
  { id: "oto", label: "Otomotiv", keywords: ["oto", "yedek", "parça", "servis", "galeri"] },
  { id: "harita", label: "Haritalar", keywords: ["ankara", "istanbul", "izmir", "antalya", "bursa", "trabzon", "kalesi"] },
] as const;

export function filterTrendingByTab(tabId: string): string[] {
  if (tabId === "popular") return [...LOCAL_TRENDING_QUERIES];
  const tab = TREND_CATEGORY_TABS.find((t) => t.id === tabId);
  if (!tab?.keywords.length) return [...LOCAL_TRENDING_QUERIES];
  return LOCAL_TRENDING_QUERIES.filter((q) => {
    const lower = q.toLocaleLowerCase("tr-TR");
    return tab.keywords.some((kw) => lower.includes(kw));
  });
}

export const SEARCH_MODULE_CHIPS = [
  { id: "isletme", label: "İşletme", emoji: "🏪", href: "/kesfet/liste" },
  { id: "siparis", label: "Sipariş", emoji: "🍽️", href: "/siparis" },
  { id: "seyahat", label: "Seyahat", emoji: "✈️", href: "/turizm" },
  { id: "oto", label: "Otomotiv", emoji: "🚗", href: "/otomotiv" },
  { id: "sari", label: "Sarı Sayfalar", emoji: "📒", href: "/kesfet/sarisayfalar" },
  { id: "icerik", label: "İçerik", emoji: "📰", href: "/haberler" },
  { id: "haritalar", label: "Haritalar", emoji: "🗺️", href: "/map" },
] as const;

export const SUGGEST_SECTION_ORDER: Array<{ key: string; label: string; types: string[] }> = [
  { key: "recent", label: "Son aramalar", types: ["recent"] },
  { key: "popular", label: "POPÜLER", types: ["popular"] },
  { key: "isletme", label: "İşletme", types: ["business", "vendor"] },
  { key: "konum", label: "Konum & Haritalar", types: ["city"] },
  { key: "icerik", label: "İçerik", types: ["news"] },
  { key: "ai", label: "AI öneri", types: ["ai"] },
  { key: "query", label: "Arama", types: ["query"] },
];

export function groupSuggestionsBySection(items: SearchSuggestionItem[]): Array<{
  section: (typeof SUGGEST_SECTION_ORDER)[number];
  items: SearchSuggestionItem[];
}> {
  const used = new Set<string>();
  const out: Array<{ section: (typeof SUGGEST_SECTION_ORDER)[number]; items: SearchSuggestionItem[] }> = [];
  for (const section of SUGGEST_SECTION_ORDER) {
    const matched = items.filter((item) => {
      const key = item.text.toLocaleLowerCase("tr-TR");
      if (used.has(key)) return false;
      if (!section.types.includes(item.type)) return false;
      used.add(key);
      return true;
    });
    if (matched.length) out.push({ section, items: matched });
  }
  const leftovers = items.filter((item) => !used.has(item.text.toLocaleLowerCase("tr-TR")));
  if (leftovers.length) {
    out.push({
      section: { key: "other", label: "Diğer", types: [] },
      items: leftovers,
    });
  }
  return out;
}

export type SearchSuggestionItem = {
  text: string;
  type: string;
  url?: string;
  icon?: string;
};

type SuggestResponse = {
  success?: boolean;
  suggestions?: SearchSuggestionItem[];
};

function searchUrl(text: string, type?: string): string {
  const q = text.trim();
  if (!q) return "/map";
  if (type === "city") {
    return buildMapSearchHref({ city: q, zoom: 12 });
  }
  if (type === "business" || type === "vendor") {
    return buildMapSearchHref({ q });
  }
  return `/ara?q=${encodeURIComponent(q)}`;
}

export function resolveSuggestionHref(item: SearchSuggestionItem): string {
  const text = item.text.trim();
  if (item.url) {
    if (item.url.includes("/haritalar")) return rewriteHaritalarPathToMap(item.url);
    return item.url;
  }
  if (item.type === "city") return buildMapSearchHref({ city: text, zoom: 12 });
  if (item.type === "business" || item.type === "vendor") return buildMapSearchHref({ q: text });
  return searchUrl(text, item.type);
}

export function localTrendingSuggestions(query: string, limit = 8): SearchSuggestionItem[] {
  const norm = query.trim().toLocaleLowerCase("tr-TR");
  if (!norm) {
    return LOCAL_TRENDING_QUERIES.slice(0, limit).map((text) => ({
      text,
      type: "popular",
      url: `/ara?q=${encodeURIComponent(text)}`,
      icon: "trending",
    }));
  }
  const ghostPrefix: string[] = [];
  const ghostContains: string[] = [];
  for (const item of GHOST_COMPLETION_QUERIES) {
    const lower = item.toLocaleLowerCase("tr-TR");
    if (lower.startsWith(norm)) ghostPrefix.push(item);
    else if (lower.includes(norm)) ghostContains.push(item);
  }
  const prefixMatches: string[] = [];
  const containsMatches: string[] = [];
  for (const item of LOCAL_TRENDING_QUERIES) {
    const lower = item.toLocaleLowerCase("tr-TR");
    if (lower.startsWith(norm)) prefixMatches.push(item);
    else if (lower.includes(norm)) containsMatches.push(item);
  }
  const matches = [...ghostPrefix, ...prefixMatches, ...ghostContains, ...containsMatches];
  const unique = [...new Set(matches)];
  return unique.slice(0, limit).map((text) => ({
    text,
    type: ghostPrefix.includes(text) || ghostContains.includes(text) ? "query" : "popular",
    url: `/ara?q=${encodeURIComponent(text)}`,
    icon: "trending",
  }));
}

export function pickDefaultTrendingGhost(): string {
  const idx = new Date().getDate() % LOCAL_TRENDING_QUERIES.length;
  return LOCAL_TRENDING_QUERIES[idx] ?? LOCAL_TRENDING_QUERIES[0];
}

function normalizeRemoteSuggestion(item: SearchSuggestionItem): SearchSuggestionItem {
  const text = item.text.trim();
  const url = item.url ? rewriteHaritalarPathToMap(item.url) : undefined;
  if (url) return { ...item, text, url };
  if (item.type === "city") return { ...item, text, url: buildMapSearchHref({ city: text, zoom: 12 }) };
  if (item.type === "business" || item.type === "vendor") {
    return { ...item, text, url: buildMapSearchHref({ q: text }) };
  }
  if (item.type === "popular") return { ...item, text, url: `/ara?q=${encodeURIComponent(text)}` };
  return { ...item, text };
}

export function useSearchSuggestions(query: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>(() =>
    enabled ? localTrendingSuggestions(query) : [],
  );
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    const localPreview = localTrendingSuggestions(query);
    if (!trimmed || localPreview.length > 0) {
      setSuggestions(localPreview);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      const params = new URLSearchParams({ limit: "8" });
      if (trimmed) params.set("q", trimmed);

      void fetchPublicJson<SuggestResponse>(apiUrl(`/api/search/suggest?${params}`), {
        signal: controller.signal,
        retries: 1,
      })
        .then(({ ok, data }) => {
          if (controller.signal.aborted) return;
          const remoteRaw =
            ok && data?.success && Array.isArray(data.suggestions) ? data.suggestions : [];
          const remote = remoteRaw.map(normalizeRemoteSuggestion);
          setSuggestions(remote.length ? remote : localPreview);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions(localPreview);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, enabled]);

  return { suggestions, loading };
}

export const RECENT_SEARCHES_KEY = "yekpare-recent-searches";
export const RECENT_SEARCHES_MAX = 6;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): void {
  const q = query.trim();
  if (!q || typeof window === "undefined") return;
  const prev = readRecentSearches().filter((item) => item.toLocaleLowerCase("tr-TR") !== q.toLocaleLowerCase("tr-TR"));
  const next = [q, ...prev].slice(0, RECENT_SEARCHES_MAX);
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function recentSearchSuggestions(recent: string[]): SearchSuggestionItem[] {
  return recent.map((text) => ({
    text,
    type: "recent",
    url: `/ara?q=${encodeURIComponent(text)}`,
    icon: "recent",
  }));
}
