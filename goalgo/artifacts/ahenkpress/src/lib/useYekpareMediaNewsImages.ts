import { useQuery } from "@tanstack/react-query";
import { getListNewsQueryKey, useListNews } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/apiBase";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { readHmJwt, readHmSite } from "@/lib/hmSession";

type NewsImageRow = { imageUrl?: string | null; title: string };

/**
 * Medya seçici: HM editörde Neon kenar `/api/hm/editor/news` (Container beklemez).
 * Portal / admin: `/api/news` (siteId varsa site kapsamlı).
 */
export function useYekpareMediaNewsImages() {
  const hm = useHmEditorOptional();
  const token = hm?.token ?? (typeof window !== "undefined" ? readHmJwt() : null);
  const siteId = hm?.site?.id ?? (typeof window !== "undefined" ? readHmSite()?.id : undefined);
  const useEdge = Boolean(token && siteId);

  const editorQuery = useQuery({
    queryKey: ["/api/hm/editor/news", "yekpare-media-pool", siteId],
    queryFn: async () => {
      const t = token;
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/editor/news?limit=120"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 200) || `HTTP ${r.status}`);
      return r.json() as Promise<{ items?: NewsImageRow[] }>;
    },
    enabled: useEdge,
    staleTime: 60_000,
    retry: 1,
  });

  const portalParams = siteId
    ? { limit: 80, siteId, status: "published" as const }
    : { limit: 80, status: "published" as const };

  const portalQuery = useListNews(portalParams, {
    query: {
      queryKey: getListNewsQueryKey(portalParams),
      enabled: !useEdge,
      staleTime: 60_000,
      retry: 1,
    },
  });

  return {
    data: useEdge ? editorQuery.data : portalQuery.data,
    isLoading: useEdge ? editorQuery.isLoading : portalQuery.isLoading,
    isError: useEdge ? editorQuery.isError : portalQuery.isError,
  };
}
