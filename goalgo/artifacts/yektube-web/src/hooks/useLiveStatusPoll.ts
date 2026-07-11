import { useQuery } from "@tanstack/react-query";
import { fetchLiveStatus } from "@/lib/api";
import { useYektubeModules } from "@/hooks/useYektubeModules";

/** Canlı yayın rozeti — 60 sn polling (Faz 6) */
export function useLiveStatusPoll() {
  const modules = useYektubeModules();
  return useQuery({
    queryKey: ["live-status"],
    queryFn: fetchLiveStatus,
    enabled: modules.live,
    refetchInterval: 60_000,
    staleTime: 45_000,
  });
}
