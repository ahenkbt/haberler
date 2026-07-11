import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { LOCAL_TRENDING_QUERIES } from "@/hooks/useSearchSuggestions";

const STALE_MS = 24 * 60 * 60 * 1000;

export type DailyTrendHeadline = {
  text: string;
  traffic?: string;
};

export type DailyTrendCategory = {
  id: string;
  label: string;
  headlines: DailyTrendHeadline[];
};

export type DailyTrendsPayload = {
  success: boolean;
  date?: string;
  fetchedAt?: string;
  geo?: string;
  source?: string;
  categories: DailyTrendCategory[];
};

function buildLocalTrendsFallback(): DailyTrendsPayload {
  return {
    success: true,
    source: "local",
    geo: "TR",
    fetchedAt: new Date().toISOString(),
    categories: [
      {
        id: "trendler",
        label: "Trendler",
        headlines: LOCAL_TRENDING_QUERIES.map((text) => ({ text })),
      },
    ],
  };
}

async function fetchDailyTrends(): Promise<DailyTrendsPayload> {
  const endpoints = ["/api/search/trends", "/api/trends/daily"];
  for (const path of endpoints) {
    const { ok, data } = await fetchPublicJson<DailyTrendsPayload & { categories?: DailyTrendCategory[] | Record<string, string[]> }>(
      apiUrl(path),
      { retries: 1 },
    );
    if (!ok || !data?.success) continue;

    if (Array.isArray(data.categories) && data.categories.length) {
      return { ...data, categories: data.categories };
    }

    if (data.categories && !Array.isArray(data.categories)) {
      const mapped = Object.entries(data.categories as Record<string, string[]>).map(([id, items]) => ({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        headlines: (items ?? []).map((text) => ({ text })),
      }));
      if (mapped.length) {
        return { ...data, categories: mapped };
      }
    }
  }
  return buildLocalTrendsFallback();
}

export function useHomeDailyTrends() {
  return useQuery({
    queryKey: ["home", "daily-trends"],
    queryFn: fetchDailyTrends,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });
}
