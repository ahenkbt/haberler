import { useMemo } from "react";
import { Link } from "wouter";
import { useQueries, useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { fetchCategories, fetchVideos, type CategoryEntry } from "@/lib/api";
import { categoryLabel } from "@/lib/constants";
import { ytRoutes } from "@/lib/routes";
import { VideoThumb } from "@/components/VideoThumb";

const EMPTY: CategoryEntry[] = [];

function categoryBrowseHref(slug: string): string {
  const home = ytRoutes.home();
  const join = home.includes("?") ? "&" : "?";
  return `${home}${join}k=${encodeURIComponent(slug)}`;
}

function CategoryCard({
  slug,
  label,
  videoCount,
  videoId,
  thumbnail,
}: {
  slug: string;
  label: string;
  videoCount: number;
  videoId?: string;
  thumbnail?: string | null;
}) {
  return (
    <Link
      href={categoryBrowseHref(slug)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-yt-border)] yt-panel transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-yt-skeleton)]">
        {videoId ? (
          <VideoThumb
            videoId={videoId}
            thumbnail={thumbnail}
            quality="hq"
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-yt-skeleton)] to-[var(--color-yt-border)]">
            <LayoutGrid className="h-10 w-10 text-[var(--color-yt-muted)] opacity-40" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-yt-text)] group-hover:underline">
          {label}
        </p>
        {videoCount > 0 ? (
          <p className="text-xs text-[var(--color-yt-muted)]">{videoCount.toLocaleString("tr-TR")} video</p>
        ) : (
          <p className="text-xs text-[var(--color-yt-muted)]">Henüz video yok</p>
        )}
      </div>
    </Link>
  );
}

export function CategoriesPage() {
  const { data: categories = EMPTY, isLoading, isError, refetch } = useQuery({
    queryKey: ["yektube-categories"],
    queryFn: fetchCategories,
  });

  const previewQueries = useQueries({
    queries: categories.map((cat) => ({
      queryKey: ["yektube-category-preview", cat.slug],
      queryFn: () =>
        fetchVideos({
          limit: 1,
          categorySlug: cat.slug,
          excludeStories: true,
        }),
      staleTime: 10 * 60 * 1000,
      enabled: Boolean(cat.slug),
    })),
  });

  const items = useMemo(
    () =>
      categories
        .map((cat, i) => {
          const latest = previewQueries[i]?.data?.items?.[0];
          return {
            slug: cat.slug,
            label: cat.label || categoryLabel(cat.slug),
            videoCount: cat.videoCount,
            videoId: latest?.videoId,
            thumbnail: latest?.thumbnail,
          };
        })
        .sort((a, b) => b.videoCount - a.videoCount || a.label.localeCompare(b.label, "tr")),
    [categories, previewQueries],
  );

  return (
    <div className="min-h-full px-4 py-4 lg:px-6 lg:py-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-yt-skeleton)]">
          <LayoutGrid className="h-5 w-5 text-[var(--color-yt-text)]" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Kategoriler</h1>
          <p className="text-sm text-[var(--color-yt-muted)]">Tüm içerik kategorilerini keşfedin</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[var(--color-yt-border)]">
              <div className="aspect-video animate-pulse yt-skeleton" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded yt-skeleton" />
                <div className="h-3 w-1/2 animate-pulse rounded yt-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600">Kategoriler yüklenemedi.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-sm font-medium underline">
            Yeniden dene
          </button>
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <CategoryCard
              key={item.slug}
              slug={item.slug}
              label={item.label}
              videoCount={item.videoCount}
              videoId={item.videoId}
              thumbnail={item.thumbnail}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">Henüz kategori tanımlı değil.</p>
      ) : null}
    </div>
  );
}
