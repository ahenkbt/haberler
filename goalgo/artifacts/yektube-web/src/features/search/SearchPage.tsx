import { useSearch } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ytRoutes } from "@/lib/routes";
import { useLocation } from "wouter";
import { searchVideos } from "@/lib/api";
import { VideoFeedItem, VideoGridCard } from "@/components/VideoFeedItem";
import { FeedSkeleton } from "@/components/CategoryChips";
import { useIsMobile } from "@/hooks/useIsMobile";

export function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const qs = searchString.startsWith("?") ? searchString.slice(1) : searchString;
  const query = new URLSearchParams(qs).get("q") ?? "";
  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query);
  }, [query]);

  const { data: videos = [], isLoading, isError } = useQuery({
    queryKey: ["yektube-v2-search", query],
    queryFn: () => searchVideos(query),
    enabled: query.trim().length > 0,
  });

  return (
    <div className="lg:p-6">
      <form
        className="border-b border-[var(--color-yt-border)] px-3 py-2 lg:mb-4 lg:max-w-2xl lg:rounded-full lg:border lg:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLocation(ytRoutes.search(input.trim()));
        }}
      >
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Video, kanal veya oynatma listesi ara…"
          className="w-full bg-transparent py-2 text-sm outline-none"
          autoFocus
        />
      </form>

      {!query.trim() ? (
        <p className="px-4 py-8 text-sm text-[var(--color-yt-muted)]">Aramak için bir kelime yazın.</p>
      ) : isLoading ? (
        isMobile ? (
          <FeedSkeleton count={3} />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
            ))}
          </div>
        )
      ) : isError && videos.length === 0 ? (
        <p className="px-4 py-8 text-sm text-[var(--color-yt-muted)]">Arama şu an kullanılamıyor. Biraz sonra tekrar deneyin.</p>
      ) : videos.length === 0 ? (
        <p className="px-4 py-8 text-sm text-[var(--color-yt-muted)]">“{query}” için sonuç bulunamadı.</p>
      ) : (
        <div>
          <p className="px-4 py-2 text-xs font-medium text-[var(--color-yt-muted)] lg:px-0">
            {videos.length} sonuç
          </p>
          {isMobile ? (
            <div className="max-w-[900px]">
              {videos.map((v) => (
                <VideoFeedItem key={`${v.id}-${v.videoId}`} video={v} />
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((v) => (
                <VideoGridCard key={`${v.id}-${v.videoId}`} video={v} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col yt-panel">
      <form
        className="flex items-center gap-2 border-b border-[var(--color-yt-border)] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
        onSubmit={(e) => {
          e.preventDefault();
          setLocation(ytRoutes.search(q.trim()));
          onClose();
        }}
      >
        <button type="button" onClick={onClose} className="shrink-0 text-sm font-medium text-[var(--color-yt-muted)]">
          İptal
        </button>
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Video, kanal veya oynatma listesi ara…"
          className="min-w-0 flex-1 rounded-full yt-input px-4 py-2 text-sm outline-none"
        />
      </form>
    </div>
  );
}
