import { useQuery } from "@tanstack/react-query";
import { fetchSidebarStaticPages } from "@/lib/staticPagesApi";

export function useSidebarStaticPages() {
  return useQuery({
    queryKey: ["yektube-sidebar-pages"],
    queryFn: fetchSidebarStaticPages,
    staleTime: 120_000,
    select: (data) => data.pages.filter((p) => p.sidebarLabel),
  });
}
