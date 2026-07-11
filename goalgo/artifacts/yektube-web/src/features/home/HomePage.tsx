import { useState, useEffect, useMemo, useLayoutEffect, useCallback } from "react";
import { useSearch, useLocation, Link } from "wouter";
import { useInfiniteQuery, useQuery, useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { fetchCategories, fetchVideos } from "@/lib/api";
import type { CategoryEntry } from "@/lib/api";
import { CategoryChips, FeedSkeleton } from "@/components/CategoryChips";
import { PullToRefresh } from "@/components/PullToRefresh";
import { VideoFeedItem, VideoGridCard } from "@/components/VideoFeedItem";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dedupeFeedVideos, feedVideoKey } from "@/lib/dedupeVideos";
import { filterVideosByCategory } from "@/lib/categoryMatch";
import { isLongFormVideo } from "@/lib/yektubeVideoClassify";
import { filterMusicVideos } from "@/lib/musicFilter";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { useMobileHomeHeaderSlot } from "@/components/MobileHomeHeaderSlot";
import { ytRoutes } from "@/lib/routes";
import { categoryLabel } from "@/lib/constants";
import type { YektubeVideo } from "@workspace/yektube-core";
import { readSessionFeedSeed, STATIC_SHELF_FEED_SEED } from "@/lib/sessionFeedSeed";
import { isEmbedMode, appendQueryParam } from "@/lib/runtimeConfig";

const PAGE_SIZE = 24;
const SHELF_SIZE_DEFAULT = 8;
const SHELF_SIZE_HABERLER = 15;

function shelfLimitForSlug(slug: string): number {
  return slug === "haberler" ? SHELF_SIZE_HABERLER : SHELF_SIZE_DEFAULT;
}

function shelfGridClass(slug: string): string {
  if (slug === "haberler") {
    return "grid grid-cols-2 gap-x-3 gap-y-6 px-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-4 lg:gap-y-8 lg:px-0";
  }
  return "grid grid-cols-2 gap-x-3 gap-y-6 px-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-8 lg:px-0";
}
const EMPTY_CATEGORIES: CategoryEntry[] = [];

const SHELF_CATEGORY_SLUGS = [
  "haberler",
  "sinema",
  "dizi",
  "muzik",
  "oyun",
  "spor",
  "eglence",
  "komedi",
  "bilim",
  "teknoloji",
  "doga",
  "belgesel",
  "cocuk",
  "egitim",
  "seyahat",
] as const;

function readCategoryFromSearch(search: string): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const k = new URLSearchParams(qs).get("k")?.trim();
  return k || "all";
}

function categoryHref(slug: string): string {
  const home = ytRoutes.home();
  if (!slug || slug === "all") return home;
  return appendQueryParam(home, "k", slug);
}

function CategoryShelf({
  slug,
  label,
  videos,
  shelfSize,
  onShowAll,
}: {
  slug: string;
  label: string;
  videos: YektubeVideo[];
  shelfSize: number;
  onShowAll: (slug: string) => void;
}) {
  if (videos.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2 px-3 lg:px-0">
        <h2 className="text-base font-bold text-[var(--color-yt-text)]">{label}</h2>
        <button
          type="button"
          onClick={() => onShowAll(slug)}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]"
        >
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className={shelfGridClass(slug)}>
        {videos.slice(0, shelfSize).map((v) => (
          <VideoGridCard key={feedVideoKey(v)} video={v} />
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const isMobile = useIsMobile();
  const embed = isEmbedMode();
  const headerSlot = useMobileHomeHeaderSlot();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState(() => readCategoryFromSearch(search));

  useEffect(() => {
    setCategory(readCategoryFromSearch(search));
  }, [search]);

  const onCategoryChange = useCallback(
    (id: string) => {
      setCategory(id);
      const home = ytRoutes.home();
      if (!id || id === "all") {
        setLocation(home);
        return;
      }
      setLocation(appendQueryParam(home, "k", id));
    },
    [setLocation],
  );

  const feedSeed = useMemo(() => readSessionFeedSeed(), []);
  const isMixedHome = category === "all";
  const isCategoryBrowse = !isMixedHome;

  const { data: categories = EMPTY_CATEGORIES } = useQuery({
    queryKey: ["yektube-categories"],
    queryFn: fetchCategories,
  });

  const shelfQueries = useQueries({
    queries: SHELF_CATEGORY_SLUGS.map((slug) => ({
      queryKey: ["yektube-category-shelf", slug],
      queryFn: () =>
        fetchVideos({
          limit: shelfLimitForSlug(slug),
          categorySlug: slug,
          excludeStories: true,
          mixChannels: true,
          seed: STATIC_SHELF_FEED_SEED,
        }),
      enabled: isMixedHome,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["yektube-v2-feed", category, feedSeed],
      queryFn: ({ pageParam = 0 }) =>
        fetchVideos({
          limit: PAGE_SIZE,
          offset: pageParam,
          excludeStories: true,
          mixChannels: pageParam === 0,
          categorySlug: category,
          seed: pageParam === 0 ? feedSeed : undefined,
        }),
      retry: 4,
      retryDelay: (i) => Math.min(2000 * (i + 1), 8000),
      refetchInterval: (query) => (query.state.error ? 8000 : false),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const loaded = pages.reduce((n, p) => n + p.items.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
      },
    });

  const videos = useMemo(() => {
    const raw = dedupeFeedVideos(data?.pages.flatMap((p) => p.items) ?? []).filter(isLongFormVideo);
    const scoped = isCategoryBrowse ? filterVideosByCategory(raw, category) : raw;
    if (category === "muzik") return filterMusicVideos(scoped);
    return scoped;
  }, [data?.pages, category, isCategoryBrowse]);

  const loadMoreRef = useInfiniteScrollSentinel({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage && !isLoading,
    onLoadMore: () => void fetchNextPage(),
  });

  useLayoutEffect(() => {
    const setHeaderSlot = headerSlot?.setSlot;
    if (!setHeaderSlot) return;
    if (embed) {
      setHeaderSlot(
        <CategoryChips categories={categories} activeId={category} onChange={onCategoryChange} sticky={false} className="shrink-0 border-b-0" />,
      );
      return () => setHeaderSlot(null);
    }
    if (!isMobile) return;
    setHeaderSlot(
      <CategoryChips categories={categories} activeId={category} onChange={onCategoryChange} sticky={false} className="shrink-0 border-b-0" />,
    );
    return () => setHeaderSlot(null);
  }, [isMobile, embed, headerSlot?.setSlot, categories, category, onCategoryChange]);

  const shelfSections = useMemo(() => {
    if (!isMixedHome) return [];
    return SHELF_CATEGORY_SLUGS.map((slug, i) => {
      const raw = shelfQueries[i]?.data?.items ?? [];
      const categoryScoped = filterVideosByCategory(raw, slug);
      const items = slug === "muzik" ? filterMusicVideos(categoryScoped) : categoryScoped.filter(isLongFormVideo);
      const fromApi = categories.find((c) => c.slug === slug);
      return {
        slug,
        label: fromApi?.label ?? categoryLabel(slug),
        videos: items,
        shelfSize: shelfLimitForSlug(slug),
      };
    }).filter((s) => s.videos.length > 0);
  }, [isMixedHome, shelfQueries, categories]);

  const shelvesLoading = isMixedHome && shelfQueries.some((q) => q.isLoading);

  const feedBody = (
    <>
      {isMixedHome && shelvesLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 px-3 lg:grid-cols-4 lg:px-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
          ))}
        </div>
      ) : null}

      {isMixedHome && !shelvesLoading
        ? shelfSections.map((s) => (
            <CategoryShelf
              key={s.slug}
              slug={s.slug}
              label={s.label}
              videos={s.videos}
              shelfSize={s.shelfSize}
              onShowAll={onCategoryChange}
            />
          ))
        : null}

      {isMixedHome && shelfSections.length > 0 ? (
        <h2 className="mb-3 px-3 text-base font-bold text-[var(--color-yt-text)] lg:px-0">Keşfet</h2>
      ) : null}

      {isLoading ? (
        isMobile ? (
          <FeedSkeleton />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
            ))}
          </div>
        )
      ) : null}

      {isError ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-red-600">Akış yüklenemedi. Sunucu başlatılıyor olabilir.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-sm font-medium underline">
            Yeniden dene
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && videos.length === 0 && isCategoryBrowse ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--color-yt-muted)] lg:py-12">
          Bu kategoride henüz video yok.{" "}
          <Link href={categoryHref("all")} className="font-medium underline">
            Tüm videolara dön
          </Link>
        </p>
      ) : null}

      {isMobile ? (
        <div className="max-w-[900px]">
          {videos.map((v) => (
            <VideoFeedItem key={feedVideoKey(v)} video={v} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoGridCard key={feedVideoKey(v)} video={v} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="h-10" />
      {isFetchingNextPage ? (
        <p className="py-4 text-center text-xs text-[var(--color-yt-muted)]">Daha fazla video yükleniyor…</p>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:p-6">
      {isMobile && !embed ? (
        <PullToRefresh
          className="min-h-0 flex-1"
          disabled={isLoading}
          onRefresh={async () => {
            await refetch();
          }}
        >
          {feedBody}
        </PullToRefresh>
      ) : (
        <>
          {!embed ? <CategoryChips categories={categories} activeId={category} onChange={onCategoryChange} /> : null}
          {feedBody}
        </>
      )}
    </div>
  );
}
