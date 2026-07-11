import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MonitorPlay, Play, Radio } from "lucide-react";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import { isLongFormVideo, recommendationVideoTitle } from "@/lib/yektubeVideoClassify";
import { VIDEO_TV_CATEGORY_LABELS, VIDEO_TV_NAV_SLUGS } from "@/lib/videoTvCategories";
import { yektubeCanliTvPath, yektubeWatchPath } from "@/lib/yektubeUrls";
import { useEffect } from "react";

type VideoRow = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
  duration?: string | null;
  isStory?: boolean;
  categorySlug?: string;
};

const PAGE_LIMIT = 36;

async function fetchVideoTvFeed(categorySlug: string | null, seed: number): Promise<VideoRow[]> {
  const mixed = !categorySlug;
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
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
  const data = (await res.json()) as { items?: VideoRow[] };
  const items = data.items ?? [];
  if (mixed) return items;
  return items.filter((v) =>
    isLongFormVideo({ isStory: v.isStory, title: v.title, duration: v.duration ?? null }),
  );
}

function categoryTabLabel(slug: string): string {
  const full = VIDEO_TV_CATEGORY_LABELS[slug];
  if (!full) return slug;
  const short = full.split(" ve ")[0]?.split(" / ")[0]?.trim();
  return short && short.length <= 20 ? short : full.slice(0, 20);
}

/** `/tr/:slug/video-tv` — tüm haberler benzeri Video TV vitrini (v1 Yektube ızgarası). */
export default function HmVideoTvPage() {
  const hmCtx = useHmPublicLinkContextOptional();
  const hmTv = useHmVideoTvLayout();
  const h = useHmPublicHref();
  const pathHome = hmTv?.pathHome ?? h("/video-tv");
  const layoutPrefs = hmCtx?.layoutPrefs ?? parseNewsSiteLayoutFromJson(null);
  const accent = hmVitrinAccentHex(layoutPrefs.hmVitrinTheme ?? "default") ?? "#039D55";

  const tabSlugs = useMemo(() => ["", ...VIDEO_TV_NAV_SLUGS], []);
  const [activeSlug, setActiveSlug] = useState("");
  const categorySlug = activeSlug || null;
  const newsSeed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["/api/video/videos/hm-video-tv", categorySlug ?? "news", newsSeed],
    queryFn: () => fetchVideoTvFeed(categorySlug, newsSeed),
    staleTime: 3 * 60 * 1000,
  });

  useEffect(() => {
    if (!hmCtx?.slug) return;
    const canonicalPath = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/video-tv`;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `Video TV · ${hmCtx.displayName}`,
      description: `Güncel videolar — ${hmCtx.displayName}`,
      canonicalPath,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: layoutPrefs.logoUrl,
      logoUrl: layoutPrefs.logoUrl,
      faviconUrl: layoutPrefs.faviconUrl,
    });
  }, [hmCtx?.slug, hmCtx?.displayName, hmCtx?.domain, layoutPrefs.logoUrl, layoutPrefs.faviconUrl]);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Yektube</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900">
            <MonitorPlay className="h-7 w-7" style={{ color: accent }} />
            Video TV
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Güncel haber videoları — canlı yayın ve haber kanallarından karma akış.
          </p>
        </div>
        <Link
          href={yektubeCanliTvPath(pathHome)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-[#039D55]/40 hover:text-[#039D55]"
        >
          <Radio className="h-3.5 w-3.5" />
          Canlı TV
        </Link>
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Video kategorileri">
        {tabSlugs.map((slug) => {
          const active = slug === activeSlug;
          return (
            <button
              key={slug || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSlug(slug)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                active ? "text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              style={active ? { backgroundColor: accent } : undefined}
            >
              {slug ? categoryTabLabel(slug) : "Tümü"}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Bu kategoride henüz video yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((v) => {
            const sourceId = v.sourceId ?? 0;
            const href =
              sourceId > 0 ? yektubeWatchPath(sourceId, v.videoId, pathHome) : null;
            const title = recommendationVideoTitle(v.title, v.channelName);
            const card = (
              <>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
                  <YektubeVideoThumb
                    videoId={v.videoId}
                    thumbnail={v.thumbnail}
                    variant="landscape"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/15">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-90">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </span>
                  {v.duration ? (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {v.duration}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-[#039D55]">
                  {title}
                </p>
                {v.channelName ? (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{v.channelName}</p>
                ) : null}
              </>
            );
            return href ? (
              <Link key={v.id} href={href} className="group block min-w-0">
                {card}
              </Link>
            ) : (
              <div key={v.id} className="min-w-0 opacity-70">
                {card}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
