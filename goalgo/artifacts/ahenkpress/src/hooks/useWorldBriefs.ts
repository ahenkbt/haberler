import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

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
  imageUrl?: string | null;
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

export type WorldBriefsResponse = {
  continents: WorldBriefContinentGroup[];
  totalItems: number;
  feedCount: number;
  checkedAt: string;
};

const STALE_MS = 2 * 60 * 1000;

export function worldBriefsQueryKey(perFeed?: number, siteId?: number | null) {
  return ["/api/news/world-briefs", perFeed ?? 3, siteId ?? "portal"] as const;
}

async function fetchWorldBriefs(
  perFeed: number,
  siteId?: number | null,
  signal?: AbortSignal,
): Promise<WorldBriefsResponse> {
  const qs = new URLSearchParams({ perFeed: String(perFeed), warm: "1" });
  if (siteId != null && siteId > 0) qs.set("siteId", String(siteId));
  const result = await fetchPublicJson<WorldBriefsResponse>(apiUrl(`/api/news/world-briefs?${qs}`), { signal });
  if (!result.ok || !result.data) {
    return { continents: [], totalItems: 0, feedCount: 0, checkedAt: new Date().toISOString() };
  }
  return result.data;
}

export function useWorldBriefs(perFeed = 3, enabled = true) {
  const hmCtx = useHmPublicLinkContextOptional();
  const siteId = hmCtx?.siteId != null && hmCtx.siteId > 0 ? hmCtx.siteId : null;
  return useQuery({
    queryKey: worldBriefsQueryKey(perFeed, siteId),
    queryFn: ({ signal }) => fetchWorldBriefs(perFeed, siteId, signal),
    staleTime: STALE_MS,
    gcTime: STALE_MS * 3,
    enabled,
  });
}
