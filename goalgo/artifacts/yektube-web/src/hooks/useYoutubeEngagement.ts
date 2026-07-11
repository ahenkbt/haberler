import { useQuery } from "@tanstack/react-query";
import { fetchYoutubeEngagement, type YoutubeVideoEngagement } from "@/lib/api";

export function useYoutubeEngagement(youtubeVideoId: string, enabled = true) {
  return useQuery<YoutubeVideoEngagement>({
    queryKey: ["youtube-engagement", youtubeVideoId],
    queryFn: () => fetchYoutubeEngagement(youtubeVideoId),
    enabled: enabled && youtubeVideoId.length >= 6,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * (attempt + 1), 4000),
  });
}
