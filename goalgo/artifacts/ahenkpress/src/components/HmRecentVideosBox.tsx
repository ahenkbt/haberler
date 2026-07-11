import { useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Play } from "lucide-react";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { isLongFormVideo, recommendationVideoTitle } from "@/lib/yektubeVideoClassify";
import { VIDEO_TV_CATEGORY_LABELS, VIDEO_TV_NAV_SLUGS } from "@/lib/videoTvCategories";

export const HM_RECENT_VIDEOS_COLS = 4;
export const HM_RECENT_VIDEOS_ROWS = 2;
export const HM_RECENT_VIDEOS_LIMIT = HM_RECENT_VIDEOS_COLS * HM_RECENT_VIDEOS_ROWS;

type RecentVideo = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
  duration?: string | null;
  isStory?: boolean;
};

type Props = {
  videoTvHref: (sourceId: number, videoId: string) => string;
  listHref: string;
  accent?: string;
};

async function fetchRecentVideos(categorySlug: string | null, seed: number): Promise<RecentVideo[]> {
  const mixed = !categorySlug;
  const params = new URLSearchParams({
    limit: String(HM_RECENT_VIDEOS_LIMIT),
    excludeStories: "true",
  });
  if (categorySlug) {
    params.set("categorySlug", categorySlug);
    params.set("longFormOnly", "true");
  } else {
    params.set("newsOnly", "true");
    params.set("mixChannels", "true");
    params.set("seed", String(seed));
  }
  const res = await fetch(`/api/video/videos?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: RecentVideo[] };
  const items = data.items ?? [];
  if (mixed) return items;
  return items.filter((v) =>
    isLongFormVideo({ isStory: v.isStory, title: v.title, duration: v.duration ?? null }),
  );
}

const TAB_SLUGS = ["", ...VIDEO_TV_NAV_SLUGS.slice(0, 15)] as const;

function categoryLabel(slug: string): string {
  if (!slug) return "Tümü";
  const full = VIDEO_TV_CATEGORY_LABELS[slug];
  if (!full) return slug;
  const short = full.split(" ve ")[0]?.split(" / ")[0]?.trim();
  return short && short.length <= 18 ? short : full.slice(0, 18);
}

function RecentVideoCard({
  video,
  videoTvHref,
  compact = false,
}: {
  video: RecentVideo;
  videoTvHref: Props["videoTvHref"];
  compact?: boolean;
}) {
  const sourceId = video.sourceId ?? 0;
  const href = sourceId > 0 ? videoTvHref(sourceId, video.videoId) : null;
  const title = recommendationVideoTitle(video.title, video.channelName);
  const card = (
    <>
      <div
        className={
          compact
            ? "relative h-[72px] w-full overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200/80"
            : "relative aspect-video overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80"
        }
      >
        <YektubeVideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          variant="landscape"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span
            className={`flex items-center justify-center rounded-full bg-black/55 text-white opacity-90 shadow ${
              compact ? "h-6 w-6" : "h-8 w-8"
            }`}
          >
            <Play className={`fill-current ${compact ? "ml-0.5 h-3 w-3" : "ml-0.5 h-3.5 w-3.5"}`} />
          </span>
        </span>
        {video.duration ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 text-[8px] font-bold text-white">
            {video.duration}
          </span>
        ) : null}
      </div>
      <p
        className={`line-clamp-2 font-semibold leading-snug text-slate-800 ${
          compact ? "mt-1 text-[10px]" : "mt-1.5 text-[11px]"
        }`}
      >
        {title}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {card}
      </Link>
    );
  }

  return <div className="min-w-0">{card}</div>;
}

function MobileVideoSkeleton() {
  return (
    <div className="hm-recent-videos-scroll flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 md:hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[128px] shrink-0 space-y-1">
          <div className="h-[72px] animate-pulse rounded-md bg-slate-100" />
          <div className="h-2.5 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function DesktopVideoSkeleton() {
  return (
    <div className="hidden gap-3 md:grid md:grid-cols-4">
      {Array.from({ length: HM_RECENT_VIDEOS_LIMIT }).map((_, i) => (
        <div key={i} className="aspect-video animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function VideoGrid({
  videos,
  videoTvHref,
  isFetching,
}: {
  videos: RecentVideo[];
  videoTvHref: Props["videoTvHref"];
  isFetching: boolean;
}) {
  let body: ReactNode;

  if (videos.length === 0) {
    body = <p className="py-8 text-center text-sm text-slate-500">Bu kategoride video yok.</p>;
  } else {
    body = (
      <>
        <div
          className="hm-recent-videos-scroll flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
          aria-label="Son eklenen videolar"
        >
          {videos.map((v) => (
            <div key={v.id} className="w-[128px] shrink-0 snap-start">
              <RecentVideoCard video={v} videoTvHref={videoTvHref} compact />
            </div>
          ))}
        </div>
        <div className="hidden md:grid md:grid-cols-4 md:gap-3">
          {videos.map((v) => (
            <RecentVideoCard key={v.id} video={v} videoTvHref={videoTvHref} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={isFetching ? "opacity-70 transition-opacity" : undefined} aria-busy={isFetching}>
      {body}
    </div>
  );
}

export function HmRecentVideosBox({ videoTvHref, listHref, accent = "#039D55" }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>("");
  const categorySlug = activeSlug || null;
  const newsSeed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);

  const { data: videos = [], isLoading, isFetching } = useQuery({
    queryKey: ["/api/video/videos/hm-recent", categorySlug ?? "news", newsSeed],
    queryFn: () => fetchRecentVideos(categorySlug, newsSeed),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const displayVideos = useMemo(() => videos.slice(0, HM_RECENT_VIDEOS_LIMIT), [videos]);
  const showInitialSkeleton = isLoading && displayVideos.length === 0;

  if (!showInitialSkeleton && displayVideos.length === 0 && !categorySlug) {
    return null;
  }

  return (
    <section
      className="hm-recent-videos-box mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-hm-home-module="recentVideosSidebar"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Son Eklenen Videolar</h2>
        <Link href={listHref} className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 hover:text-[#039D55]">
          Video TV <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="hm-recent-videos-layout grid gap-0 md:grid-cols-[minmax(148px,176px)_minmax(0,1fr)]">
        <aside className="hm-recent-videos-cats border-b border-slate-100 md:border-b-0 md:border-r md:border-slate-100">
          <nav
            className="flex gap-1 overflow-x-auto p-2 md:max-h-[340px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:p-2"
            aria-label="Video kategorileri"
          >
            {TAB_SLUGS.map((slug) => {
              const active = slug === activeSlug;
              return (
                <button
                  key={slug || "all"}
                  type="button"
                  onClick={() => setActiveSlug(slug)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors md:w-full ${
                    active
                      ? "bg-[#039D55]/10 text-[#039D55]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={active ? { color: accent, backgroundColor: `${accent}18` } : undefined}
                >
                  {categoryLabel(slug)}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 p-3 sm:p-4">
          {showInitialSkeleton ? (
            <>
              <MobileVideoSkeleton />
              <DesktopVideoSkeleton />
            </>
          ) : (
            <VideoGrid videos={displayVideos} videoTvHref={videoTvHref} isFetching={isFetching && !isLoading} />
          )}
        </div>
      </div>
    </section>
  );
}
