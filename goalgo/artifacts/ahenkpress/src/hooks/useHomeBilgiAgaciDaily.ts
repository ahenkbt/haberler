import { useQuery } from "@tanstack/react-query";
import { fetchBilgiAgaciDailyItems, type BilgiAgaciDailyItem } from "@/lib/homeBilgiAgaciDaily";

const STALE_MS = 24 * 60 * 60 * 1000;

export function useHomeBilgiAgaciDaily() {
  return useQuery<BilgiAgaciDailyItem[]>({
    queryKey: ["home", "bilgi-agaci-daily"],
    queryFn: fetchBilgiAgaciDailyItems,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });
}
