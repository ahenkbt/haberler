import { useQuery } from "@tanstack/react-query";
import { fetchYoutubeComments, type YoutubeVideoComment } from "@/lib/api";

export type YoutubeCommentsResult = {
  videoId: string;
  comments: YoutubeVideoComment[];
  commentCount: number | null;
};

export function useYoutubeComments(youtubeVideoId: string, enabled = true) {
  return useQuery<YoutubeCommentsResult>({
    queryKey: ["youtube-comments", youtubeVideoId],
    queryFn: () => fetchYoutubeComments(youtubeVideoId),
    enabled: enabled && youtubeVideoId.length >= 6,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1200 * (attempt + 1), 3500),
  });
}
