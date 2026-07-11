import { useEffect, useState } from "react";
import { emptyMarketplacePayload, type MarketplacePayload } from "./types";
import { fetchPublicJson } from "@/lib/fetchPublicJson";

const API = "/api";

function parseMarketplacePayload(raw: unknown): MarketplacePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { success?: boolean; data?: MarketplacePayload };
  if (d.success === false || !d.data) return null;
  return d.data;
}

async function fetchMarketplacePayload(search: URLSearchParams): Promise<MarketplacePayload | null> {
  const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: MarketplacePayload }>(
    `${API}/delivery/marketplace?${search.toString()}`,
  );
  if (!ok) return null;
  return parseMarketplacePayload(data);
}

export function useMarketplaceData(params?: { q?: string; category?: string; lang?: string; limit?: number }) {
  const [payload, setPayload] = useState<MarketplacePayload>(emptyMarketplacePayload);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const search = new URLSearchParams();
    search.set("lang", params?.lang ?? "tr");
    search.set("limit", String(params?.limit ?? 120));
    if (params?.q?.trim()) search.set("q", params.q.trim());
    if (params?.category) search.set("category", params.category);
    setLoading(true);

    void (async () => {
      try {
        let data = await fetchMarketplacePayload(search);
        const category = params?.category?.trim();
        if (
          !cancelled
          && category
          && data
          && !(data.products?.length)
          && Number(data.stats?.productCount ?? 0) === 0
        ) {
          const fallbackSearch = new URLSearchParams(search);
          fallbackSearch.delete("category");
          data = await fetchMarketplacePayload(fallbackSearch);
        }
        if (!cancelled) setPayload(data ?? emptyMarketplacePayload);
      } catch {
        if (!cancelled) setPayload(emptyMarketplacePayload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params?.q, params?.category, params?.lang, params?.limit]);

  return { payload, loading };
}
