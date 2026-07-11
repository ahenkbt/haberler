import { useQuery } from "@tanstack/react-query";
import { fetchYoutubeStream } from "@/lib/api";

export function useYoutubeStream(youtubeVideoId: string, enabled = true, force = false) {
  return useQuery({
    queryKey: ["youtube-stream", youtubeVideoId, force ? "force" : "normal"],
    queryFn: () => fetchYoutubeStream(youtubeVideoId, force),
    enabled: enabled && youtubeVideoId.length >= 6,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 600,
    refetchOnMount: "always",
  });
}
