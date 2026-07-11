import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import {
  resolveTurkishProvinceWikiTitle,
  wikiTitleDriftsFromProvince,
} from "@/lib/turkishProvinces";
import { matchHaberHaritasiGlobalLocation } from "@/lib/haberHaritasiLocations";

export type NewsmapWikiSummary = {
  title: string;
  summary: string;
  image?: string;
  url?: string;
};

type WikiSummaryPayload = {
  title?: string;
  extract?: string;
  summary?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

type WikiLang = "tr" | "en";

export function resolveNewsmapWikiQueryLabel(locationLabel: string | null | undefined): string {
  const raw = String(locationLabel ?? "").trim();
  if (!raw) return "";
  const primary = raw.split(",")[0]?.trim() || raw;
  const districtSplit = primary.includes(" › ") ? primary.split(" › ").pop()?.trim() : primary;
  return districtSplit || primary;
}

function parseWikiSummaryPayload(
  payload: WikiSummaryPayload | null | undefined,
  fallbackTitle: string,
  lang: WikiLang,
): NewsmapWikiSummary | null {
  if (!payload) return null;
  const summary = String(payload.extract ?? payload.summary ?? "").trim();
  if (!summary) return null;
  const title = String(payload.title ?? fallbackTitle).trim() || fallbackTitle;
  return {
    title,
    summary,
    image: payload.thumbnail?.source || payload.originalimage?.source || undefined,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function fetchWikiSummaryDirect(
  title: string,
  lang: WikiLang,
  signal?: AbortSignal,
): Promise<NewsmapWikiSummary | null> {
  const { ok, data } = await fetchPublicJson<
    { success?: boolean; data?: WikiSummaryPayload } & WikiSummaryPayload
  >(
    apiUrl(`/api/wiki/summary/${encodeURIComponent(title)}?lang=${lang}`),
    { signal, timeoutMs: 10_000, retries: 1 },
  );
  if (!ok || !data) return null;
  const payload = data.success && data.data ? data.data : data;
  return parseWikiSummaryPayload(payload, title, lang);
}

async function fetchWikiSummaryViaSearch(
  query: string,
  lang: WikiLang,
  signal?: AbortSignal,
): Promise<NewsmapWikiSummary | null> {
  const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: Array<{ title?: string }> }>(
    apiUrl(`/api/wiki/search?q=${encodeURIComponent(query)}&limit=1&lang=${lang}`),
    { signal, timeoutMs: 10_000, retries: 1 },
  );
  if (!ok || !Array.isArray(data?.data) || data.data.length === 0) return null;
  const hitTitle = String(data.data[0]?.title ?? query).trim();
  if (!hitTitle) return null;
  return fetchWikiSummaryDirect(hitTitle, lang, signal);
}

async function fetchWikiSummaryForLang(
  query: string,
  lang: WikiLang,
  signal?: AbortSignal,
): Promise<NewsmapWikiSummary | null> {
  const provinceTitle = lang === "tr" ? resolveTurkishProvinceWikiTitle(query) : null;
  const directCandidates = Array.from(
    new Set(
      [provinceTitle, query, provinceTitle ? `${provinceTitle} ili` : null]
        .map((title) => String(title ?? "").trim())
        .filter((title) => title.length >= 2),
    ),
  );

  for (const title of directCandidates) {
    const direct = await fetchWikiSummaryDirect(title, lang, signal);
    if (direct) return direct;
  }

  const searchQuery = provinceTitle ?? query;
  const viaSearch = await fetchWikiSummaryViaSearch(searchQuery, lang, signal);
  if (!viaSearch) return null;
  if (provinceTitle && wikiTitleDriftsFromProvince(viaSearch.title, provinceTitle)) {
    const iliSummary = await fetchWikiSummaryDirect(`${provinceTitle} ili`, lang, signal);
    return iliSummary ?? null;
  }
  return viaSearch;
}

type BilgiLocationType = "il" | "ulke" | "sehir";

/** Etiketten yer türünü çıkar (il / ülke / şehir) — önbellek bölümlemesi için. */
function classifyBilgiLocationType(query: string): BilgiLocationType {
  if (resolveTurkishProvinceWikiTitle(query)) return "il";
  const globalHit = matchHaberHaritasiGlobalLocation(query);
  if (globalHit?.kind === "country") return "ulke";
  return "sehir";
}

type BilgiLocationApiResponse = {
  success?: boolean;
  data?: {
    title?: string;
    summary?: string;
    image?: string | null;
    url?: string | null;
  };
};

/**
 * Cache-through: önce DB (hızlı), yoksa sunucu Vikipedi'den çekip DB'ye kaydeder.
 * 81 il + dünya ülkeleri + şehirler bu tek uçtan çözülür ("özet bulunamadı" olmaz).
 */
async function fetchLocationWikiFromCache(
  query: string,
  signal?: AbortSignal,
): Promise<NewsmapWikiSummary | null> {
  const type = classifyBilgiLocationType(query);
  const { ok, data } = await fetchPublicJson<BilgiLocationApiResponse>(
    apiUrl(
      `/api/bilgi/location?slug=${encodeURIComponent(query)}&label=${encodeURIComponent(query)}&type=${type}&lang=tr`,
    ),
    { signal, timeoutMs: 12_000, retries: 1 },
  );
  if (!ok || !data?.success || !data.data) return null;
  const summary = String(data.data.summary ?? "").trim();
  if (!summary) return null;
  const title = String(data.data.title ?? query).trim() || query;
  return {
    title,
    summary,
    image: data.data.image || undefined,
    url: data.data.url || undefined,
  };
}

/**
 * Konum paneli Bilgi sekmesi — önce DB önbellekli uç (`/api/bilgi/location`),
 * uç yoksa/başarısızsa doğrudan Vikipedi (TR → EN) yedeği.
 */
export async function fetchNewsmapLocationWikiSummary(
  locationLabel: string | null | undefined,
  signal?: AbortSignal,
): Promise<NewsmapWikiSummary | null> {
  const query = resolveNewsmapWikiQueryLabel(locationLabel);
  if (query.length < 2) return null;

  try {
    const cached = await fetchLocationWikiFromCache(query, signal);
    if (cached) return cached;
  } catch {
    // Uç kullanılamıyorsa doğrudan Vikipedi yedeğine düş.
  }

  const trSummary = await fetchWikiSummaryForLang(query, "tr", signal);
  if (trSummary) return trSummary;

  return fetchWikiSummaryForLang(query, "en", signal);
}
