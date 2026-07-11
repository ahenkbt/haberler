/**
 * Günlük Google Trends (Türkiye) — /api/search/trends
 * Birincil kaynak: Google Trends RSS (trends.google.com/trending?geo=TR&hl=tr).
 * Yedek: Google News RSS, isteğe bağlı SerpAPI.
 */
import { parseRssFeedItems } from "./rssFeedParse.js";
import { normalizeEnvValue } from "./mediaStorageConfig.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Eski daily feed 404 döner; güncel resmi feed trending/rss. */
const GOOGLE_TRENDS_RSS_CANDIDATES = [
  "https://trends.google.com/trending/rss?geo=TR&hl=tr",
  "https://trends.google.com/trending/rss?geo=TR",
  "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR&hl=tr",
] as const;
const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr";
const FETCH_TIMEOUT_MS = 12_000;
const MIN_PER_CATEGORY = 6;
const MAX_PER_CATEGORY = 20;

export type TrendCategoryId =
  | "trendler"
  | "siyaset"
  | "spor"
  | "eglence"
  | "ekonomi"
  | "toplum"
  | "aktuel"
  | "teknoloji";

export type TrendHeadline = {
  text: string;
  traffic?: string;
};

export type TrendCategory = {
  id: TrendCategoryId;
  label: string;
  headlines: TrendHeadline[];
};

export type DailyTrendsResponse = {
  date: string;
  fetchedAt: string;
  geo: string;
  source: "google_trends_rss" | "google_news_rss" | "serpapi_google_trends" | "fallback";
  categories: TrendCategory[];
};

type CacheEntry = { value: DailyTrendsResponse; at: number };
let cache: CacheEntry | null = null;

export const TREND_CATEGORY_DEFS: Array<{
  id: TrendCategoryId;
  label: string;
  keywords: string[];
}> = [
  { id: "trendler", label: "Trendler", keywords: [] },
  {
    id: "siyaset",
    label: "Siyaset",
    keywords: [
      "cumhurbaşkan",
      "erdoğan",
      "mhp",
      "chp",
      "tbmm",
      "seçim",
      "bakan",
      "parti",
      "meclis",
      "milletvekili",
      "hükümet",
      "muhalefet",
      "siyaset",
      "anayasa",
      "tbmm",
    ],
  },
  {
    id: "spor",
    label: "Spor",
    keywords: [
      "maç",
      "futbol",
      "galatasaray",
      "fenerbahçe",
      "beşiktaş",
      "trabzonspor",
      "süper lig",
      "basketbol",
      "nba",
      "uefa",
      "şampiyon",
      "gol",
      "milli takım",
      "spor",
      "voleybol",
    ],
  },
  {
    id: "eglence",
    label: "Eğlence",
    keywords: [
      "dizi",
      "film",
      "oyuncu",
      "şarkı",
      "konser",
      "netflix",
      "survivor",
      "ünlü",
      "sanatçı",
      "müzik",
      "türk dizisi",
      "sinema",
      "eğlence",
    ],
  },
  {
    id: "ekonomi",
    label: "Ekonomi",
    keywords: [
      "dolar",
      "euro",
      "borsa",
      "enflasyon",
      "faiz",
      "ekonomi",
      "altın",
      "btc",
      "kripto",
      "merkez bankası",
      "tcmb",
      "bist",
      "kur",
      "zam",
    ],
  },
  {
    id: "toplum",
    label: "Toplum",
    keywords: [
      "deprem",
      "okul",
      "eğitim",
      "sağlık",
      "hastane",
      "aile",
      "çocuk",
      "kadın",
      "üniversite",
      "öğrenci",
      "sosyal",
      "toplum",
    ],
  },
  {
    id: "aktuel",
    label: "Aktüel",
    keywords: [
      "haber",
      "gündem",
      "son dakika",
      "olay",
      "yangın",
      "kaza",
      "operasyon",
      "dava",
      "cinayet",
      "trafik",
    ],
  },
  {
    id: "teknoloji",
    label: "Teknoloji",
    keywords: [
      "apple",
      "samsung",
      "iphone",
      "yapay zeka",
      "chatgpt",
      "google",
      "microsoft",
      "teknoloji",
      "android",
      "oyun",
      "bilgisayar",
      "ai",
      "meta",
      "tesla",
    ],
  },
];

const FALLBACK_HEADLINES = [
  "istanbul hava durumu",
  "dolar kuru",
  "recep tayyip erdoğan",
  "galatasaray",
  "fenerbahçe",
  "son dakika haberleri",
  "deprem",
  "enflasyon",
  "yapay zeka",
  "netflix dizileri",
  "süper lig puan durumu",
  "altın fiyatları",
  "ankara haberleri",
  "izmir",
  "antalya",
  "bursa",
  "trabzonspor",
  "chp",
  "mhp",
  "tbmm",
  "merkez bankası faiz",
  "euro kuru",
  "türkiye seçim",
  "milli maç",
  "survivor",
  "iphone",
  "samsung",
  "okul tatili",
  "nöbetçi eczane",
  "trafik",
] as const;

function turkeyDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function decodeXmlText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractApproxTraffic(itemInner: string): string | undefined {
  const raw =
    itemInner.match(/<ht:approx_traffic[^>]*>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1] ??
    itemInner.match(/<approx_traffic[^>]*>([\s\S]*?)<\/approx_traffic>/i)?.[1];
  const traffic = decodeXmlText(raw ?? "");
  return traffic || undefined;
}

function parseGoogleTrendsRss(xml: string): TrendHeadline[] {
  const items = parseRssFeedItems(xml, 40);
  const out: TrendHeadline[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const text = item.title.trim();
    const key = text.toLocaleLowerCase("tr-TR");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push({
      text,
      traffic: extractApproxTraffic(item.rawInner),
    });
  }
  return out;
}

function parseGoogleNewsRss(xml: string): TrendHeadline[] {
  const items = parseRssFeedItems(xml, 40);
  const out: TrendHeadline[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const text = item.title.trim();
    const key = text.toLocaleLowerCase("tr-TR");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push({ text });
  }
  return out;
}

function matchesCategory(text: string, desc: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const hay = `${text} ${desc}`.toLocaleLowerCase("tr-TR");
  return keywords.some((kw) => hay.includes(kw.trim().toLocaleLowerCase("tr-TR")));
}

function rotatePool<T>(pool: T[], offset: number, count: number): T[] {
  if (!pool.length) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[(offset + i) % pool.length]!);
  }
  return out;
}

function buildCategoriesFromHeadlines(headlines: TrendHeadline[]): TrendCategory[] {
  const allTexts = headlines.map((h) => h.text);
  const dateOffset = new Date().getDate();

  return TREND_CATEGORY_DEFS.map((def, catIdx) => {
    let picked: TrendHeadline[] = [];

    if (def.id === "trendler") {
      picked = headlines.slice(0, MAX_PER_CATEGORY);
    } else {
      picked = headlines.filter((h) =>
        matchesCategory(h.text, h.traffic ?? "", def.keywords),
      );
    }

    if (picked.length < MIN_PER_CATEGORY) {
      const fillerOffset = dateOffset + catIdx * 3;
      const fillerTexts = rotatePool(
        allTexts.filter((t) => !picked.some((p) => p.text === t)),
        fillerOffset,
        MIN_PER_CATEGORY - picked.length,
      );
      const fillerHeadlines = fillerTexts.map((text) => ({ text }));
      picked = [...picked, ...fillerHeadlines];
    }

    return {
      id: def.id,
      label: def.label,
      headlines: picked.slice(0, MAX_PER_CATEGORY),
    };
  });
}

function buildFallbackResponse(): DailyTrendsResponse {
  const offset = new Date().getDate() % FALLBACK_HEADLINES.length;
  const rotated = rotatePool([...FALLBACK_HEADLINES], offset, FALLBACK_HEADLINES.length);
  const headlines = rotated.map((text) => ({ text }));
  return {
    date: turkeyDateKey(),
    fetchedAt: new Date().toISOString(),
    geo: readTrendsGeo(),
    source: "fallback",
    categories: buildCategoriesFromHeadlines(headlines),
  };
}

function readTrendsGeo(): string {
  return normalizeEnvValue(process.env.GOOGLE_TRENDS_GEO) || "TR";
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YekpareTrends/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildGoogleTrendsRssUrls(geo: string, hl = "tr"): string[] {
  if (geo !== "TR") {
    return [
      `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}&hl=${encodeURIComponent(hl)}`,
      `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`,
    ];
  }
  return [...GOOGLE_TRENDS_RSS_CANDIDATES];
}

async function fetchGoogleTrendsRss(geo: string): Promise<TrendHeadline[]> {
  const errors: string[] = [];
  for (const url of buildGoogleTrendsRssUrls(geo)) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        errors.push(`${url} → ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const headlines = parseGoogleTrendsRss(xml);
      if (!headlines.length) {
        errors.push(`${url} → boş`);
        continue;
      }
      return headlines;
    } catch (err) {
      errors.push(`${url} → ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Google Trends RSS başarısız: ${errors.join("; ")}`);
}

async function fetchGoogleNewsRss(): Promise<TrendHeadline[]> {
  const res = await fetchWithTimeout(GOOGLE_NEWS_RSS_URL);
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  const xml = await res.text();
  const headlines = parseGoogleNewsRss(xml);
  if (!headlines.length) throw new Error("Google News RSS boş");
  return headlines;
}

async function fetchSerpApiTrends(geo: string): Promise<TrendHeadline[] | null> {
  const key = normalizeEnvValue(process.env.SERPAPI_API_KEY);
  if (!key) return null;
  const params = new URLSearchParams({
    engine: "google_trends",
    data_type: "DAILY",
    geo,
    api_key: key,
  });
  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    daily_searches?: Array<{ query?: string; title?: string; traffic?: string }>;
    trending_searches?: Array<{ query?: string; title?: string; traffic?: string }>;
  };
  const rows = json.daily_searches ?? json.trending_searches ?? [];
  const headlines: TrendHeadline[] = [];
  for (const row of rows) {
    const text = String(row.query ?? row.title ?? "").trim();
    if (!text) continue;
    headlines.push({ text, traffic: row.traffic ? String(row.traffic) : undefined });
  }
  return headlines.length ? headlines : null;
}

export type HomeTrendTabId = "popular" | "isletme" | "seyahat" | "haber" | "oto" | "harita";

const HOME_TAB_KEYWORDS: Record<Exclude<HomeTrendTabId, "popular">, string[]> = {
  isletme: ["otel", "restoran", "kafe", "cafe", "market", "mağaza", "magaza", "kuaför", "eczane", "petshop", "servis", "galeri", "dükkan", "dukkan", "shop", "burger", "pizza"],
  seyahat: ["otel", "villa", "kapadokya", "turizm", "seyahat", "balon", "tatil", "uçak", "ucak", "resort", "cruise", "gezi"],
  haber: ["haber", "deprem", "seçim", "secim", "siyaset", "spor", "maç", "mac", "gol", "basketbol", "futbol", "galatasaray", "fenerbahçe", "beşiktaş", "besiktas", "trabzonspor", "hükümet", "hukumet", "cumhurbaşkan", "meclis", "skandal", "dava", "gündem", "son dakika"],
  oto: ["oto", "araba", "araç", "arac", "yedek", "parça", "parca", "servis", "galeri", "motor", "bmw", "mercedes", "togg", "otomobil"],
  harita: ["ankara", "istanbul", "izmir", "antalya", "bursa", "trabzon", "kalesi", "adana", "konya", "gaziantep", "eskişehir", "eskisehir", "muğla", "mugla", "bodrum", "fethiye"],
};

export function toHomeTrendCategories(payload: DailyTrendsResponse): Record<HomeTrendTabId, string[]> {
  const trendler =
    payload.categories.find((c) => c.id === "trendler")?.headlines.map((h) => h.text) ?? [];
  const all = trendler.length
    ? trendler
    : payload.categories.flatMap((c) => c.headlines.map((h) => h.text));

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const text of all) {
    const key = text.trim().toLocaleLowerCase("tr-TR");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(text.trim());
  }

  const categories: Record<HomeTrendTabId, string[]> = {
    popular: [...deduped],
    isletme: [],
    seyahat: [],
    haber: [],
    oto: [],
    harita: [],
  };

  for (const text of deduped) {
    const lower = text.toLocaleLowerCase("tr-TR");
    for (const tabId of Object.keys(HOME_TAB_KEYWORDS) as Array<Exclude<HomeTrendTabId, "popular">>) {
      if (HOME_TAB_KEYWORDS[tabId].some((kw) => lower.includes(kw))) {
        categories[tabId].push(text);
      }
    }
  }

  for (const cat of payload.categories) {
    if (cat.id === "trendler") continue;
    const target: HomeTrendTabId =
      cat.id === "siyaset" || cat.id === "spor" || cat.id === "aktuel" || cat.id === "toplum"
        ? "haber"
        : cat.id === "ekonomi"
          ? "haber"
          : "popular";
    for (const h of cat.headlines) {
      const text = h.text.trim();
      const key = text.toLocaleLowerCase("tr-TR");
      if (!text || categories[target].some((t) => t.toLocaleLowerCase("tr-TR") === key)) continue;
      categories[target].push(text);
    }
  }

  return categories;
}

/** Günlük trend listesi — bellek önbelleği 24 saat */
export async function runDailyTrends(forceRefresh = false): Promise<DailyTrendsResponse> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  const geo = readTrendsGeo();
  let headlines: TrendHeadline[] | null = null;
  let source: DailyTrendsResponse["source"] = "google_trends_rss";

  try {
    headlines = await fetchGoogleTrendsRss(geo);
    source = "google_trends_rss";
  } catch {
    headlines = null;
  }

  if (!headlines?.length) {
    try {
      headlines = await fetchGoogleNewsRss();
      if (headlines?.length) {
        source = "google_news_rss";
      }
    } catch {
      headlines = null;
    }
  }

  if (!headlines?.length) {
    try {
      headlines = await fetchSerpApiTrends(geo);
      if (headlines?.length) {
        source = "serpapi_google_trends";
      }
    } catch {
      headlines = null;
    }
  }

  const payload: DailyTrendsResponse = headlines?.length
    ? {
        date: turkeyDateKey(),
        fetchedAt: new Date().toISOString(),
        geo,
        source,
        categories: buildCategoriesFromHeadlines(headlines),
      }
    : buildFallbackResponse();

  cache = { value: payload, at: Date.now() };
  return payload;
}
