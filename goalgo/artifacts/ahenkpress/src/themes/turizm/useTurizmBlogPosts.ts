import { useEffect, useState } from "react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import type { TurizmBlogPostListItem } from "./turizmCmsTypes";

export function useTurizmBlogPosts(limit = 12, category?: string): {
  posts: TurizmBlogPostListItem[];
  loading: boolean;
} {
  const [posts, setPosts] = useState<TurizmBlogPostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);

    void apiFetch(apiUrl(`/api/tourism/blog?${params}`))
      .then(async (res) => {
        if (!res.ok) return { posts: [] as TurizmBlogPostListItem[] };
        return (await res.json()) as { posts?: TurizmBlogPostListItem[] };
      })
      .catch(() => ({ posts: [] as TurizmBlogPostListItem[] }))
      .then((data) => {
        if (!cancelled) {
          setPosts(data.posts ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit, category]);

  return { posts, loading };
}

export function formatTurizmBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
