import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, Lightbulb, Music, Popcorn, Search, Signpost } from "lucide-react";
import { fetchVideos } from "@/lib/api";
import { readSessionFeedSeed } from "@/lib/sessionFeedSeed";
import { PullToRefresh } from "@/components/PullToRefresh";
import { VideoGridCard } from "@/components/VideoFeedItem";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dedupeFeedVideos, feedVideoKey } from "@/lib/dedupeVideos";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { filterVideosByKidsCategory, KIDS_CATEGORIES, type KidsCategory } from "@/lib/kidsFilter";
import { cn } from "@/lib/cn";
import { Link } from "wouter";
import { ytMainRoute } from "@/lib/routes";

const PAGE_SIZE = 24;
const KIDS_SLUG = "cocuk";

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  onerilen: Heart,
  muzik: Music,
  kesfet: Signpost,
  ogrenme: Lightbulb,
  sovlar: Popcorn,
};

function KidsCategoryNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
      {KIDS_CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id] ?? Heart;
        const selected = active === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className="group flex w-16 flex-col items-center gap-1 sm:w-20"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full border-2 transition-transform sm:h-16 sm:w-16",
                selected
                  ? "scale-110 border-[#ff6f00] bg-[#fff3e0] text-[#e65100] shadow-md"
                  : "border-transparent bg-white text-[#424242] group-hover:scale-105 group-hover:bg-[#fafafa]",
              )}
            >
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.2} />
            </span>
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wide sm:text-xs",
                selected ? "text-[#d50000]" : "text-transparent",
              )}
            >
              {cat.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function KidsPage() {
  const isMobile = useIsMobile();
  const [category, setCategory] = useState<KidsCategory["id"]>("onerilen");
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const feedSeed = useMemo(() => readSessionFeedSeed("yektube-kids-seed"), []);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["yektube-kids-feed", searchQ, feedSeed],
    queryFn: ({ pageParam = 0 }) =>
      fetchVideos({
        limit: PAGE_SIZE,
        offset: pageParam,
        excludeStories: true,
        categorySlug: KIDS_SLUG,
        search: searchQ.trim() || undefined,
        mixChannels: pageParam === 0 && !searchQ.trim(),
        seed: pageParam === 0 ? feedSeed : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const videos = useMemo(() => {
    const raw = dedupeFeedVideos(data?.pages.flatMap((p) => p.items) ?? []);
    return filterVideosByKidsCategory(raw, category);
  }, [data?.pages, category]);

  const loadMoreRef = useInfiniteScrollSentinel({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
  });

  const grid = (
    <>
      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-2xl bg-[#eeeeee]" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600">Çocuk videoları yüklenemedi.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-sm font-semibold text-[#1565c0] underline">
            Yeniden dene
          </button>
        </div>
      ) : null}

      {!isLoading && videos.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#757575]">Bu kategoride henüz video yok.</p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((v) => (
          <div key={feedVideoKey(v)}>
            <VideoGridCard video={v} />
          </div>
        ))}
      </div>

      <div ref={loadMoreRef} className="h-8" />
      {isFetchingNextPage ? <p className="py-4 text-center text-xs text-[#9e9e9e]">Daha fazla yükleniyor…</p> : null}
    </>
  );

  return (
    <div className="kids-page relative min-h-0 flex-1 overflow-x-hidden bg-[#fafafa]">
      {/* Dekoratif kenar desenleri */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%2212%22%20r%3D%223%22%20fill%3D%22%23ffd54f%22/%3E%3Ccircle%20cx%3D%2224%22%20cy%3D%2228%22%20r%3D%222%22%20fill%3D%22%234fc3f7%22/%3E%3C/svg%3E')] opacity-60 sm:w-16" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2210%22%20r%3D%222.5%22%20fill%3D%22%23ff8a65%22/%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2230%22%20r%3D%222%22%20fill%3D%22%23aed581%22/%3E%3C/svg%3E')] opacity-60 sm:w-16" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
        <header className="flex items-center gap-3 pb-4">
          <Link
            href={ytMainRoute("/cocuk")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff9800] text-white shadow-md"
            aria-label="Yektube Çocuk"
          >
            <span className="text-lg font-black">Y</span>
          </Link>
          <form
            className="flex min-w-0 flex-1 items-center overflow-hidden rounded-full border border-[#e0e0e0] bg-white shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQ(searchInput);
            }}
          >
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Yektube Çocuk'ta arayın"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[#212121] placeholder:text-[#9e9e9e] focus:outline-none"
            />
            <button
              type="submit"
              className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7c4dff] text-white"
              aria-label="Ara"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>
        </header>

        <KidsCategoryNav active={category} onChange={setCategory} />

        <div className="mt-6 rounded-3xl bg-white px-3 py-4 shadow-sm sm:px-6 sm:py-6">
          {isMobile ? (
            <PullToRefresh disabled={isLoading} onRefresh={async () => void refetch()}>
              {grid}
            </PullToRefresh>
          ) : (
            grid
          )}
        </div>
      </div>
    </div>
  );
}
