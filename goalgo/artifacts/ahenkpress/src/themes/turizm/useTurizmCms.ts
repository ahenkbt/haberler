import { useEffect, useState } from "react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { mergeTurizmCms } from "./mergeTurizmCms";
import type { TurizmCategorySlug } from "./turizmCategoryIntroConfig";
import type { MergedTurizmCms, TurizmCmsPayload } from "./turizmCmsTypes";

export function useTurizmCms(slug: TurizmCategorySlug): {
  cms: MergedTurizmCms;
  loading: boolean;
  reload: () => void;
} {
  const [apiData, setApiData] = useState<TurizmCmsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch(apiUrl(`/api/tourism/cms/${encodeURIComponent(slug)}`))
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as TurizmCmsPayload;
      })
      .catch(() => null)
      .then((data) => {
        if (!cancelled) {
          setApiData(data);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tick]);

  return {
    cms: mergeTurizmCms(slug, apiData),
    loading,
    reload: () => setTick((t) => t + 1),
  };
}
