import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api";
import { CATEGORY_LABELS, categoryLabel } from "@/lib/constants";

const STATIC_ADMIN_SLUGS = Object.keys(CATEGORY_LABELS);

/** Admin formları — sabit tam liste + API'den gelen ek slug'lar */
export function useAdminCategoryOptions() {
  const { data: fromApi = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const slug of STATIC_ADMIN_SLUGS) {
      map.set(slug, categoryLabel(slug));
    }
    for (const c of fromApi) {
      const slug = c.slug?.trim();
      if (!slug) continue;
      map.set(slug, c.label?.trim() || categoryLabel(slug));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "tr"))
      .map(([value, label]) => ({ value, label }));
  }, [fromApi]);
}
