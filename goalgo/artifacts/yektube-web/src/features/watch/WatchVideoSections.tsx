import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { YektubeVideo } from "@workspace/yektube-core";
import { fetchChannelVideos, fetchSimilarVideos } from "@/lib/api";
import { VideoWatchListItem } from "@/components/VideoFeedItem";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { isLongFormVideo } from "@/lib/yektubeVideoClassify";

function RecommendedSection({ dbVideoId }: { dbVideoId?: number }) {
  const { data: similar = [], isLoading } = useQuery({
    queryKey: ["watch-recommended", dbVideoId],
    queryFn: () => fetchSimilarVideos(dbVideoId!, 20),
    enabled: Boolean(dbVideoId),
  });

  if (!dbVideoId) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 px-4 text-base font-semibold lg:px-0">Önerilen videolar</h2>
      {isLoading ? (
        <div className="space-y-2 px-4 lg:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg yt-skeleton" />
          ))}
        </div>
      ) : similar.length === 0 ? (
        <p className="px-4 text-sm text-[var(--color-yt-muted)] lg:px-0">Henüz öneri yok.</p>
      ) : (
        <div className="space-y-1 px-2 lg:px-0">
          {similar.filter(isLongFormVideo).map((v) => (
            <VideoWatchListItem key={`rec-${v.id}-${v.videoId}`} video={v} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelMoreSection({ dbVideoId, channelName }: { dbVideoId?: number; channelName: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["watch-channel-more", dbVideoId],
    queryFn: ({ pageParam = 0 }) => fetchChannelVideos(dbVideoId!, { limit: 12, offset: pageParam }),
    enabled: Boolean(dbVideoId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      return pages.reduce((n, p) => n + p.items.length, 0);
    },
  });

  const items = (data?.pages.flatMap((p) => p.items) ?? []).filter(isLongFormVideo);

  const loadMoreRef = useInfiniteScrollSentinel({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
  });

  if (!dbVideoId) return null;

  return (
    <section className="mt-8 border-t border-[var(--color-yt-border)] pt-6">
      <h2 className="mb-3 px-4 text-base font-semibold lg:px-0">{channelName} — diğer videolar</h2>
      {isLoading ? (
        <div className="space-y-2 px-4 lg:px-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg yt-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 text-sm text-[var(--color-yt-muted)] lg:px-0">Bu kanaldan başka video yok.</p>
      ) : (
        <>
          <div className="space-y-1 px-2 lg:px-0">
            {items.map((v: YektubeVideo) => (
              <VideoWatchListItem key={`ch-${v.id}`} video={v} showDate />
            ))}
          </div>
          <div ref={loadMoreRef} className="h-8" />
          {isFetchingNextPage ? (
            <p className="py-3 text-center text-xs text-[var(--color-yt-muted)]">Yükleniyor…</p>
          ) : null}
        </>
      )}
    </section>
  );
}

export function WatchVideoSections({
  videoId,
  dbVideoId,
  channelName,
  isLive,
}: {
  videoId: string;
  dbVideoId?: number;
  channelName: string;
  isLive?: boolean;
}) {
  if (isLive) return null;

  return (
    <>
      <RecommendedSection dbVideoId={dbVideoId} />
      <ChannelMoreSection dbVideoId={dbVideoId} channelName={channelName} />
    </>
  );
}
