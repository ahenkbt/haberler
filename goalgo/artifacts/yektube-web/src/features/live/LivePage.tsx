import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ChevronRight, Radio } from "lucide-react";
import { fetchLiveBroadcasts, fetchLiveBroadcastForSource, fetchYekGonderSessions } from "@/lib/api";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { LiveChatPanel } from "@/components/LiveChatPanel";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useYoutubeEngagement } from "@/hooks/useYoutubeEngagement";
import { ytRoutes } from "@/lib/routes";
import { dedupeLiveSources, filterBlockedLiveBirthSources, groupLiveSourcesByCategory, isBlockedLiveBirthContent, liveCategoryShelfSlug, parseLiveChannelParam, resolveLiveVideoId } from "@/lib/yektubeLive";
import type { YektubeSource, YektubeVideo } from "@workspace/yektube-core";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { VideoThumb } from "@/components/VideoThumb";
import { categoryLabel, decodeHtml } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { isEmbedMode } from "@/lib/runtimeConfig";

const LIVE_PLAYLIST_INNER = "yt-live-playlist-inner";

function normalizeSourceName(name: string): string {
  return decodeHtml(name).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function pickDefaultLiveSource(sources: YektubeSource[]): YektubeSource | null {
  if (sources.length === 0) return null;
  const sozcu = sources.find((s) => /sozcu|sözcü/.test(normalizeSourceName(s.name)));
  return sozcu ?? sources[0] ?? null;
}

function LiveChannelStreamEmbed({
  source,
  title,
  className,
}: {
  source: YektubeSource;
  title: string;
  className?: string;
}) {
  const uc = source.channelId?.trim() ?? "";
  if (!uc.startsWith("UC") || uc.length < 22) return null;
  const src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(uc)}&autoplay=1`;
  return (
    <iframe
      title={title}
      src={src}
      className={cn("aspect-video w-full max-h-[min(68vw,720px)] bg-black", className)}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}

function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white bg-red-600",
        className,
      )}
    >
      Canlı
    </span>
  );
}

function LiveChannelCoverPanel({
  source,
  videoId,
  className,
}: {
  source: YektubeSource;
  videoId?: string | null;
  className?: string;
}) {
  const thumbId = videoId ?? source.channelId?.trim();
  const channelCover = source.logoUrl && !isVideoStreamThumb(source.logoUrl) ? source.logoUrl : null;

  return (
    <div
      className={cn(
        "flex h-[min(calc(100vh-12rem),680px)] min-h-[320px] flex-col overflow-hidden rounded-xl border border-[var(--color-yt-border)] yt-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-yt-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Radio className="h-3 w-3" />
            Canlı
          </span>
          <span className="truncate text-sm font-semibold">{decodeHtml(source.name)}</span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-black">
        {channelCover ? (
          <img src={channelCover} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
        ) : thumbId ? (
          <VideoThumb videoId={thumbId} thumbnail={source.logoUrl} quality="hq" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChannelAvatar source={source} className="h-32 w-32 rounded-full" fallbackClassName="h-32 w-32 rounded-full text-4xl" />
          </div>
        )}
      </div>
    </div>
  );
}

function LiveRightSidebar({
  activeCategory,
  sources,
  featured,
  featuredVideoId,
  tvVideos,
  chatEnabled,
  viewerCount,
}: {
  activeCategory: string;
  sources: YektubeSource[];
  featured: YektubeSource;
  featuredVideoId: string;
  tvVideos: YektubeVideo[];
  chatEnabled?: boolean | null;
  viewerCount?: number | null;
}) {
  const categoryChannels = useMemo(() => {
    if (activeCategory === "all") return [];
    return sources.filter((s) => liveCategoryShelfSlug(s.categorySlug, s.name) === activeCategory);
  }, [sources, activeCategory]);

  return (
    <aside className="w-full shrink-0 lg:w-[402px] lg:sticky lg:top-4 self-start">
      {activeCategory !== "all" ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{categoryLabel(activeCategory)}</h2>
            <span className="text-xs text-[var(--color-yt-muted)]">{categoryChannels.length}</span>
          </div>
          <div className="flex max-h-[min(calc(100vh-10rem),680px)] flex-col gap-3 overflow-y-auto pr-1">
            {categoryChannels.length > 0 ? (
              categoryChannels.map((s) => (
                <LiveTvCard
                  key={s.id}
                  source={s}
                  active={s.id === featured.id}
                  videoId={resolveLiveVideoId(s, tvVideos)}
                  layout="sidebar"
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-[var(--color-yt-muted)]">Bu kategoride kanal yok.</p>
            )}
          </div>
        </>
      ) : chatEnabled === false ? (
        <LiveChannelCoverPanel source={featured} videoId={featuredVideoId} />
      ) : (
        <LiveChatPanel
          youtubeVideoId={featuredVideoId}
          isLive
          viewerCount={viewerCount}
          sidebar
          chatEnabled={chatEnabled}
          fallback={<LiveChannelCoverPanel source={featured} videoId={featuredVideoId} />}
        />
      )}
    </aside>
  );
}

function LiveSection({
  title,
  children,
  href,
}: {
  title: string;
  children: ReactNode;
  href?: string;
}) {
  return (
    <section className="px-4 py-4 lg:px-6">
      <div className={LIVE_PLAYLIST_INNER}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {href ? (
            <Link href={href} className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]">
              Tümünü göster
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function isVideoStreamThumb(url: string | null | undefined): boolean {
  const t = url?.trim().toLowerCase() ?? "";
  return t.includes("ytimg.com/vi/") || t.includes("youtube.com/vi/") || t.includes("img.youtube.com/vi/");
}

function LiveTvCard({
  source,
  active,
  videoId,
  layout = "grid",
}: {
  source: YektubeSource;
  active?: boolean;
  videoId?: string | null;
  /** grid — vitrin; carousel — yatay kaydırma; sidebar — sıradakiler sütunu */
  layout?: "grid" | "carousel" | "sidebar";
}) {
  const thumbId = videoId ?? source.channelId?.trim();
  const channelCover = source.logoUrl && !isVideoStreamThumb(source.logoUrl) ? source.logoUrl : null;
  const href = ytRoutes.liveChannel(source);
  const sidebar = layout === "sidebar";
  const carousel = layout === "carousel";

  return (
    <Link
      href={href}
      className={cn(
        "group block min-w-0",
        carousel ? "w-[260px] shrink-0 snap-start sm:w-[280px]" : "",
        sidebar ? "w-full" : "",
        active && "ring-2 ring-red-600/80 ring-offset-2 ring-offset-[var(--color-yt-bg)] rounded-xl",
      )}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-thumb)]">
        {channelCover ? (
          <img
            src={channelCover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : thumbId ? (
          <VideoThumb
            videoId={thumbId}
            thumbnail={source.logoUrl}
            quality="mq"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center yt-panel-muted">
            <ChannelAvatar source={source} className="h-16 w-16 rounded-full" fallbackClassName="h-16 w-16 rounded-full text-xl" />
          </div>
        )}
        <LiveBadge />
      </div>
      <div className={cn("mt-3 flex gap-3", sidebar && "mt-2")}>
        <ChannelAvatar
          source={source}
          className={cn("shrink-0 rounded-full object-cover", sidebar ? "h-8 w-8" : "h-9 w-9")}
          fallbackClassName={cn("shrink-0 rounded-full text-sm", sidebar ? "h-8 w-8" : "h-9 w-9")}
        />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{decodeHtml(source.name)}</p>
          <p className="mt-0.5 text-xs text-[var(--color-yt-muted)]">TV · Canlı yayın</p>
        </div>
      </div>
    </Link>
  );
}

function LiveCategoryPlaylistSection({
  label,
  items,
  featuredId,
  tvVideos,
}: {
  label: string;
  items: YektubeSource[];
  featuredId?: number;
  tvVideos: YektubeVideo[];
}) {
  return (
    <section className="px-4 py-4 lg:px-6">
      <div className={LIVE_PLAYLIST_INNER}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">{label}</h2>
          <span className="text-xs text-[var(--color-yt-muted)]">{items.length} kanal</span>
        </div>

        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scrollbar-thin">
          {items.map((s) => (
            <LiveTvCard
              key={s.id}
              source={s}
              active={s.id === featuredId}
              videoId={resolveLiveVideoId(s, tvVideos)}
              layout="carousel"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveVideoCard({ video }: { video: YektubeVideo }) {
  const title = decodeHtml(video.title);
  const channel = decodeHtml(video.channelName ?? "Yektube");
  const href =
    video.sourceId != null
      ? ytRoutes.watch(
          { id: video.sourceId, name: video.channelName ?? "kanal" },
          { videoId: video.videoId, title: video.title },
        )
      : undefined;

  const body = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-thumb)]">
        <VideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          quality="mq"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <LiveBadge />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-avatar text-sm font-bold">
          {channel.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-yt-muted)]">{channel}</p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {body}
      </Link>
    );
  }
  return <div className="min-w-0">{body}</div>;
}

function YekGonderLiveCard({
  id,
  title,
  hostName,
  viewerCount,
}: {
  id: string;
  title: string;
  hostName: string;
  viewerCount: number;
}) {
  return (
    <Link href={ytRoutes.yekGonderLiveWatch(id)} className="group block min-w-0">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-red-700/90 to-zinc-900">
        <Radio className="h-12 w-12 text-white/90" />
        <LiveBadge />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600/15 text-red-600">
          <Radio className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{decodeHtml(title)}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-yt-muted)]">
            {decodeHtml(hostName)} · {viewerCount} izleyici
          </p>
        </div>
      </div>
    </Link>
  );
}

function groupVideosByCategory(videos: YektubeVideo[]): Array<{ slug: string; label: string; items: YektubeVideo[] }> {
  const map = new Map<string, YektubeVideo[]>();
  for (const v of videos) {
    const slug = liveCategoryShelfSlug(v.categorySlug, v.channelName ?? v.sourceName);
    const list = map.get(slug) ?? [];
    list.push(v);
    map.set(slug, list);
  }
  return [...map.entries()]
    .map(([slug, items]) => ({
      slug,
      label: slug === "diger" ? "Diğer canlı yayınlar" : categoryLabel(slug),
      items,
    }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function LivePage() {
  const isMobile = useIsMobile();
  const embed = isEmbedMode();
  const params = useParams<{ channelId?: string }>();
  const paramId = parseLiveChannelParam(params.channelId);
  const [, setLocation] = useLocation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["yektube-live"],
    queryFn: fetchLiveBroadcasts,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: yekGonderSessions = [] } = useQuery({
    queryKey: ["yek-gonder-sessions"],
    queryFn: fetchYekGonderSessions,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const tvSources = useMemo(
    () => filterBlockedLiveBirthSources(dedupeLiveSources(data?.sources ?? [])),
    [data?.sources],
  );
  const tvVideos = useMemo(
    () =>
      (data?.tvVideos ?? []).filter(
        (v) => !isBlockedLiveBirthContent({ name: v.channelName, title: v.title, channelName: v.channelName }),
      ),
    [data?.tvVideos],
  );
  const channelLiveVideos = useMemo(
    () =>
      (data?.channelLiveVideos ?? []).filter(
        (v) => !isBlockedLiveBirthContent({ name: v.channelName, title: v.title, channelName: v.channelName }),
      ),
    [data?.channelLiveVideos],
  );
  const tvSourceCategories = useMemo(() => groupLiveSourcesByCategory(tvSources), [tvSources]);

  const featured = useMemo(() => {
    if (paramId != null) return tvSources.find((s) => s.id === paramId) ?? pickDefaultLiveSource(tvSources);
    return pickDefaultLiveSource(tvSources);
  }, [tvSources, paramId]);

  useEffect(() => {
    if (paramId != null || tvSources.length === 0) return;
    const defaultSource = pickDefaultLiveSource(tvSources);
    if (!defaultSource) return;
    setLocation(ytRoutes.liveChannel(defaultSource), { replace: true });
  }, [paramId, tvSources, setLocation]);

  const featuredVideoId = featured ? resolveLiveVideoId(featured, tvVideos) : null;
  const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(null);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const activeVideoId = resolvedVideoId ?? featuredVideoId;

  const refreshLiveBroadcast = useCallback(
    async (refresh = false) => {
      if (!featured) return null;
      setResolving(true);
      setResolveFailed(false);
      try {
        const result = await fetchLiveBroadcastForSource(featured.id, refresh);
        if (result.videoId) {
          setResolvedVideoId(result.videoId);
          return result.videoId;
        }
        setResolveFailed(true);
        return null;
      } finally {
        setResolving(false);
      }
    },
    [featured],
  );

  useEffect(() => {
    setResolvedVideoId(null);
    setResolveFailed(false);
    if (!featured) return;
    if (featuredVideoId) return;
    void refreshLiveBroadcast(true);
  }, [featured?.id, featuredVideoId, refreshLiveBroadcast]);

  const categoryRows = useMemo(() => groupVideosByCategory(channelLiveVideos), [channelLiveVideos]);
  const { data: engagement } = useYoutubeEngagement(activeVideoId ?? "", Boolean(activeVideoId));
  const [activeCategory, setActiveCategory] = useState("all");
  const categoryTabs = useMemo(() => {
    const tabs = [{ id: "all", label: "Tümü" }];
    for (const { slug, items } of tvSourceCategories) {
      if (items.length > 0) tabs.push({ id: slug, label: categoryLabel(slug) });
    }
    return tabs;
  }, [tvSourceCategories]);

  if (isLoading) {
    return (
      <div className="yt-live-playlist-page flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        <div className={`${LIVE_PLAYLIST_INNER} space-y-6`}>
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="aspect-video flex-1 animate-pulse rounded-2xl yt-skeleton" />
            <div className="hidden h-72 w-full animate-pulse rounded-2xl yt-skeleton xl:block xl:w-[320px]" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <div>
          <p className="text-sm text-red-600">Canlı yayınlar yüklenemedi.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-sm font-medium underline">
            Yeniden dene
          </button>
        </div>
      </div>
    );
  }

  const empty = tvSources.length === 0 && channelLiveVideos.length === 0 && yekGonderSessions.length === 0;

  return (
    <div className="yt-live-playlist-page min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-6">
      {featured && !activeVideoId && !resolving ? (
        <section className="border-b border-[var(--color-yt-border)] px-4 py-6 lg:px-6">
          <div className={`${LIVE_PLAYLIST_INNER} space-y-4`}>
            {featured.channelId?.trim().startsWith("UC") ? (
              <div className="overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-[var(--color-yt-border)]">
                <LiveChannelStreamEmbed source={featured} title={decodeHtml(featured.name)} />
              </div>
            ) : (
              <p className="text-center text-sm text-[var(--color-yt-muted)]">
                {decodeHtml(featured.name)} için canlı video kimliği bulunamadı.
              </p>
            )}
            {resolveFailed ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void refreshLiveBroadcast(true)}
                  className="rounded-full bg-[var(--color-yt-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Yayını yenile
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {featured && resolving && !activeVideoId ? (
        <section className="border-b border-[var(--color-yt-border)] px-4 py-8 lg:px-6">
          <div className={`${LIVE_PLAYLIST_INNER} aspect-video max-h-[min(68vw,720px)] animate-pulse rounded-xl yt-skeleton`} />
        </section>
      ) : null}

      {featured && activeVideoId ? (
        <section className="border-b border-[var(--color-yt-border)] px-4 py-4 lg:px-6 lg:py-5">
          <div className={LIVE_PLAYLIST_INNER}>
            {categoryTabs.length > 1 ? (
              <div className="mb-0 flex gap-1 overflow-x-auto border-b border-[var(--color-yt-border)] pb-0 scrollbar-none">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={cn(
                      "shrink-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors sm:px-4 sm:text-xs",
                      activeCategory === tab.id
                        ? "border-[var(--color-yt-primary)] text-[var(--color-yt-text)]"
                        : "text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-[var(--color-yt-border)]">
                  <YoutubePlayer
                    key={activeVideoId}
                    videoId={activeVideoId}
                    title={decodeHtml(featured.name)}
                    channelName={featured.name}
                    thumbnailUrl={featured.logoUrl ?? undefined}
                    autoplay={!isMobile && !embed}
                    isLive
                    embedAllowed
                    autoPiP={false}
                    className="aspect-video w-full max-h-[min(68vw,720px)]"
                    onBlocked={() => {
                      void refreshLiveBroadcast(true);
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2.5 sm:mt-4 sm:gap-3">
                  <ChannelAvatar source={featured} className="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9" fallbackClassName="h-8 w-8 rounded-full text-sm sm:h-9 sm:w-9" />
                  <p className="truncate text-sm font-bold sm:text-base">{decodeHtml(featured.name)}</p>
                </div>
              </div>
              <LiveRightSidebar
                activeCategory={activeCategory}
                sources={tvSources}
                featured={featured}
                featuredVideoId={activeVideoId}
                tvVideos={tvVideos}
                chatEnabled={engagement?.liveChatEnabled}
                viewerCount={engagement?.viewCount}
              />
            </div>
          </div>
        </section>
      ) : null}

      {tvSourceCategories.length > 0 ? (
        tvSourceCategories.map(({ slug, items }) => (
          <LiveCategoryPlaylistSection
            key={slug}
            label={categoryLabel(slug)}
            items={items}
            featuredId={featured?.id}
            tvVideos={tvVideos}
          />
        ))
      ) : null}

      {yekGonderSessions.length > 0 ? (
        <LiveSection title="Yek Gönder">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {yekGonderSessions.map((s) => (
              <YekGonderLiveCard
                key={s.id}
                id={s.id}
                title={s.title}
                hostName={s.hostName}
                viewerCount={s.viewerCount}
              />
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--color-yt-muted)]">
            Kendi yayınını başlat:{" "}
            <Link href={ytRoutes.yekGonderBroadcast()} className="font-medium underline">
              Yek Gönder Stüdyo
            </Link>
          </p>
        </LiveSection>
      ) : null}

      {categoryRows.map(({ slug, label, items }) => (
        <LiveSection key={slug} title={label}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {items.slice(0, 8).map((v) => (
              <LiveVideoCard key={`${v.sourceId}-${v.videoId}`} video={v} />
            ))}
          </div>
        </LiveSection>
      ))}

      {empty ? (
        <p className="px-4 py-16 text-center text-sm text-[var(--color-yt-muted)] lg:px-6">
          Şu an listelenecek canlı yayın yok.
        </p>
      ) : null}
    </div>
  );
}
