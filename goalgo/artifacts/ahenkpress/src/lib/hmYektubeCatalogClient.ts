/** HM Video TV — same-origin Yektube katalog vekili (haber DB yazmaz). */

export const HM_YEKTUBE_VIDEOS_PATH = "/api/hm/yektube/videos";
export const HM_YEKTUBE_CATEGORIES_PATH = "/api/hm/yektube/categories";

export type HmYektubeCatalogVideo = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
  duration?: string | null;
  isStory?: boolean;
  categorySlug?: string;
  watchUrl?: string;
  provider?: string | null;
};

export function hmYektubeVideosQuery(opts: {
  limit?: number;
  categorySlug?: string | null;
  seed?: number | null;
}): string {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 36),
  });
  if (opts.categorySlug) params.set("categorySlug", opts.categorySlug);
  if (opts.seed != null && opts.seed > 0) params.set("seed", String(opts.seed));
  return `${HM_YEKTUBE_VIDEOS_PATH}?${params}`;
}

export async function fetchHmYektubeCatalog(opts: {
  limit?: number;
  categorySlug?: string | null;
  seed?: number | null;
}): Promise<HmYektubeCatalogVideo[]> {
  try {
    const res = await fetch(hmYektubeVideosQuery(opts), { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: HmYektubeCatalogVideo[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
