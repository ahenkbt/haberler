import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronDown, ChevronUp, Subtitles, PictureInPicture2 } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { fetchSourceByRef, fetchSource, fetchYoutubeVideoMeta, fetchVideos, resolveVideo } from "@/lib/api";
import { decodeHtml } from "@/lib/constants";
import { formatCompactCount } from "@/lib/formatCount";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { loadYoutubeIframeApi } from "@/lib/youtubeIframeApi";
import { AddToPlaylistButton } from "@/components/AddToPlaylistButton";
import { ShareButton } from "@/components/ShareButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VideoReactionButtons } from "@/components/VideoReactionButtons";
import { WatchCommentsSection } from "@/components/WatchCommentsSection";
import { LiveChatPanel } from "@/components/LiveChatPanel";
import { IosPipGuideBanner } from "@/components/IosPipGuideBanner";
import { MemberAccountButton } from "@/components/MemberAccountButton";
import { WatchVideoSections } from "@/features/watch/WatchVideoSections";
import { cn } from "@/lib/cn";
import { useRecordWatch } from "@/hooks/useRecordWatch";
import { useWatchSeoHead } from "@/hooks/useWatchSeoHead";
import { useYoutubeEngagement } from "@/hooks/useYoutubeEngagement";
import { useYoutubeComments } from "@/hooks/useYoutubeComments";
import { useWatchRouteParams } from "@/hooks/useKanalRouteParams";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useOptionalMusicPlayer } from "@/features/music/MusicContext";
import { WatchDetailMetaBar, watchChannelHref } from "@/components/WatchDetailMetaBar";
import { useMobileHomeHeaderSlot } from "@/components/MobileHomeHeaderSlot";
import { isEmbedMode } from "@/lib/runtimeConfig";
import { readBackgroundPlayback, writeBackgroundPlayback } from "@/lib/yektubePlaybackPrefs";

function parseSourceIdFromRef(ref: string): number | null {
  const trimmed = ref.trim();
  const suffix = trimmed.match(/-(\d+)$/);
  if (!suffix?.[1]) return null;
  const n = parseInt(suffix[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const slugPart = trimmed.slice(0, trimmed.length - suffix[0].length);
  if (!slugPart || slugPart.endsWith("-")) return null;
  return n;
}

export function WatchPage() {
  const isMobile = useIsMobile();
  const { channelRef, videoId, valid } = useWatchRouteParams();
  const [descOpen, setDescOpen] = useState(false);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [backgroundOn, setBackgroundOn] = useState(() => readBackgroundPlayback());
  const { clear } = useOptionalMusicPlayer() ?? {};

  useEffect(() => {
    clear?.();
  }, [videoId, clear]);

  /** Masaüstü izleme: native başarısız olursa iframe yedeği daha hızlı açılsın */
  useEffect(() => {
    if (!isMobile && valid && videoId.length >= 6) {
      void loadYoutubeIframeApi();
    }
  }, [isMobile, valid, videoId]);

  const { data: sourceByRef, isLoading: sourceLoading } = useQuery({
    queryKey: ["watch-source", channelRef],
    queryFn: async () => {
      try {
        return await fetchSourceByRef(channelRef);
      } catch {
        return null;
      }
    },
    enabled: valid,
    retry: false,
  });

  const fallbackSourceId = useMemo(() => parseSourceIdFromRef(channelRef), [channelRef]);

  const { data: sourceById } = useQuery({
    queryKey: ["watch-source-id", fallbackSourceId],
    queryFn: () => fetchSource(fallbackSourceId!),
    enabled: valid && !sourceByRef && fallbackSourceId != null,
  });

  const source = sourceByRef ?? sourceById;
  const channelId = source?.id ?? fallbackSourceId ?? 0;

  const { data: video, isLoading: videoLoading } = useQuery({
    queryKey: ["watch-video", channelId, videoId],
    queryFn: async () => {
      if (channelId > 0) {
        const hit = await resolveVideo(channelId, videoId);
        if (hit) return hit;
      }
      const { items } = await fetchVideos({ search: videoId, limit: 8 });
      return items.find((v) => v.videoId === videoId) ?? null;
    },
    enabled: valid,
  });

  const { data: sourceFromVideo } = useQuery({
    queryKey: ["watch-source-from-video", video?.sourceId],
    queryFn: () => fetchSource(video!.sourceId!),
    enabled: !source && video?.sourceId != null && video.sourceId > 0,
  });

  const effectiveSource = source ?? sourceFromVideo;
  const effectiveChannelId = effectiveSource?.id ?? video?.sourceId ?? channelId;

  const isHosted = video?.platform === "yektube";
  const hostedSrc = video?.streamUrl ?? undefined;

  const { data: ytMeta, isLoading: ytMetaLoading } = useQuery({
    queryKey: ["watch-yt-meta", videoId],
    queryFn: () => fetchYoutubeVideoMeta(videoId),
    enabled: valid && !isHosted && videoId.length >= 6,
    staleTime: 10 * 60 * 1000,
  });

  const isLiveBroadcast = ytMeta?.liveBroadcastContent === "live";

  const { data: engagement, isLoading: engagementLoading } = useYoutubeEngagement(
    videoId,
    !isHosted && videoId.length >= 6,
  );
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isError: commentsError,
  } = useYoutubeComments(videoId, !isHosted && !isLiveBroadcast && videoId.length >= 6);
  const engagementUnavailable =
    !isHosted && videoId.length >= 6 && !engagementLoading && !engagement?.likeCount && !engagement?.viewCount;

  const watchComments = useMemo(() => {
    const fromComments = commentsData?.comments ?? [];
    const fromEngagement = engagement?.comments ?? [];
    const comments = fromComments.length > 0 ? fromComments : fromEngagement;
    const commentCount =
      comments.length > 0
        ? (commentsData?.commentCount ?? engagement?.commentCount ?? comments.length)
        : (commentsData?.commentCount ?? engagement?.commentCount ?? null);
    return { comments, commentCount };
  }, [commentsData, engagement]);

  useRecordWatch(video, effectiveChannelId);

  const title = decodeHtml(
    video?.title ?? ytMeta?.title ?? (videoLoading || sourceLoading || ytMetaLoading ? "Yükleniyor…" : videoId),
  );
  const channelName = effectiveSource?.name ?? video?.sourceName ?? video?.channelName ?? "Kanal";
  const description = (video?.description?.trim() || ytMeta?.description?.trim() || "").trim();
  const logoUrl = effectiveSource?.logoUrl?.trim() ?? ytMeta?.thumbnail?.trim();

  const pageUrl =
    typeof window !== "undefined" && effectiveChannelId > 0
      ? `${window.location.origin}${ytRoutes.watch(
          { id: effectiveChannelId, name: channelName },
          { videoId, title },
        )}`
      : typeof window !== "undefined"
        ? window.location.href
        : undefined;

  useWatchSeoHead({
    youtubeVideoId: videoId,
    dbVideoId: video?.id,
    displayTitle: title,
    displayDescription: description || undefined,
    channelName,
    thumbnail: video?.thumbnail ?? logoUrl ?? undefined,
    duration: video?.duration ?? undefined,
    publishedAt: video?.publishedAt ?? undefined,
    categorySlug: video?.categorySlug,
    pageUrl,
    enabled: valid && !videoLoading && title !== "Yükleniyor…",
  });

  const viewLabel =
    engagement?.viewCount != null ? `${formatCompactCount(engagement.viewCount)} görüntülenme` : null;
  const embed = isEmbedMode();
  const headerSlot = useMobileHomeHeaderSlot();
  const channelHref = watchChannelHref(effectiveSource, channelRef, effectiveChannelId);
  const titleLoading = videoLoading && !ytMeta?.title;
  const detailInTopChrome = embed || !isMobile;

  useLayoutEffect(() => {
    if (!valid) return;
    const setHeaderSlot = headerSlot?.setSlot;
    if (!setHeaderSlot || !detailInTopChrome) return;
    setHeaderSlot(
      <WatchDetailMetaBar
        title={title}
        channelName={channelName}
        channelHref={channelHref}
        logoUrl={logoUrl}
        viewLabel={viewLabel}
        loading={titleLoading}
        compact
        titleOnly
      />,
    );
    return () => setHeaderSlot(null);
  }, [
    valid,
    headerSlot?.setSlot,
    detailInTopChrome,
    title,
    channelName,
    channelHref,
    logoUrl,
    viewLabel,
    titleLoading,
  ]);

  if (!valid) {
    return <p className="p-4">Geçersiz video adresi.</p>;
  }

  /** Yalnızca gerçek canlı yayın — upcoming VOD yorumları gizlemez */
  const isLive = isLiveBroadcast;

  const backgroundToggle =
    !isHosted && !isLive ? (
      <button
        type="button"
        aria-pressed={backgroundOn}
        aria-label={backgroundOn ? "Arka planda oynat açık" : "Arka planda oynat / küçük ekran"}
        onClick={() => {
          const next = !backgroundOn;
          setBackgroundOn(next);
          writeBackgroundPlayback(next);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
          backgroundOn
            ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]"
            : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)]",
        )}
      >
        <PictureInPicture2 className="h-3.5 w-3.5" />
        {backgroundOn ? "Arka plan" : "PiP"}
      </button>
    ) : null;

  const embedBottomPad = embed && isMobile
    ? "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
    : "pb-6 lg:pb-8";

  return (
    <div className={cn("min-h-full yt-app-bg", embedBottomPad)}>
      {!embed ? (
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-1 border-b border-[var(--color-yt-border)] yt-panel px-1 py-1">
        <Link href={ytRoutes.home()} className="flex items-center gap-0.5 rounded-lg px-2 py-2 text-sm font-medium">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <MemberAccountButton compact />
      </div>
      ) : null}

      <div className="mx-auto flex max-w-[1750px] flex-col gap-4 px-0 lg:flex-row lg:gap-6 lg:p-6">
        <div className="min-w-0 flex-1">
          <div className="aspect-video w-full bg-black lg:overflow-hidden lg:rounded-xl">
            {videoLoading && !ytMeta?.title ? (
              <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/70">Video yükleniyor…</div>
            ) : (
              <YoutubePlayer
                videoId={videoId}
                title={title}
                channelName={channelName}
                thumbnailUrl={video?.thumbnail ?? ytMeta?.thumbnail ?? logoUrl ?? undefined}
                autoplay
                isLive={isLive && !isHosted}
                embedAllowed={video?.embedAllowed !== false}
                autoPiP={
                  !embed && (backgroundOn || (isMobile && readBackgroundPlayback()))
                }
                directSrc={hostedSrc}
                subtitlesOn={subtitlesOn && !isLive}
                className="h-full w-full"
              />
            )}
          </div>

          {isMobile && !isHosted ? <IosPipGuideBanner className="mx-4 mt-3 lg:hidden" /> : null}

          <div className="px-4 pt-3 lg:px-0">
            {!detailInTopChrome ? (
              <>
                {videoLoading ? (
                  <div className="h-6 w-3/4 animate-pulse rounded yt-skeleton" />
                ) : (
                  <h1 className="text-lg font-semibold leading-snug lg:text-xl">{title}</h1>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-yt-border)] pb-3">
                  <Link href={channelHref} className="flex min-w-0 items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full yt-avatar text-sm font-bold">
                        {channelName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{channelName}</p>
                      {viewLabel ? (
                        <p className="text-xs text-[var(--color-yt-muted)]">{viewLabel}</p>
                      ) : (
                        <p className="text-xs text-[var(--color-yt-muted)]">Kanala git</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {effectiveChannelId > 0 ? <SubscribeButton sourceId={effectiveChannelId} compact /> : null}
                    {!isHosted && !isLive ? (
                      <button
                        type="button"
                        aria-pressed={subtitlesOn}
                        onClick={() => setSubtitlesOn((v) => !v)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                          subtitlesOn
                            ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]"
                            : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)]",
                        )}
                      >
                        <Subtitles className="h-3.5 w-3.5" />
                        TR altyazı
                      </button>
                    ) : null}
                    {backgroundToggle}
                    <VideoReactionButtons youtubeVideoId={videoId} youtubeLikeCount={engagement?.likeCount} />
                    {video?.id ? <AddToPlaylistButton videoId={video.id} /> : null}
                    <ShareButton title={title} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-yt-border)] pb-3">
                  <Link href={channelHref} className="flex min-w-0 items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full yt-avatar text-sm font-bold">
                        {channelName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{channelName}</p>
                      {viewLabel ? (
                        <p className="text-xs text-[var(--color-yt-muted)]">{viewLabel}</p>
                      ) : (
                        <p className="text-xs text-[var(--color-yt-muted)]">Kanala git</p>
                      )}
                    </div>
                  </Link>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[var(--color-yt-border)] pb-3 pt-2">
                {effectiveChannelId > 0 ? <SubscribeButton sourceId={effectiveChannelId} compact /> : null}
                {!isHosted && !isLive ? (
                  <button
                    type="button"
                    aria-pressed={subtitlesOn}
                    onClick={() => setSubtitlesOn((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                      subtitlesOn
                        ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]"
                        : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)]",
                    )}
                  >
                    <Subtitles className="h-3.5 w-3.5" />
                    TR altyazı
                  </button>
                ) : null}
                {backgroundToggle}
                <VideoReactionButtons youtubeVideoId={videoId} youtubeLikeCount={engagement?.likeCount} />
                {video?.id ? <AddToPlaylistButton videoId={video.id} /> : null}
                <ShareButton title={title} />
              </div>
              </>
            )}

            {description ? (
              <div className="mt-3 rounded-xl yt-panel-muted p-3 text-sm text-[var(--color-yt-text)]">
                <p className={cn(!descOpen && "line-clamp-3", "whitespace-pre-wrap")}>{decodeHtml(description)}</p>
                {description.length > 160 ? (
                  <button
                    type="button"
                    onClick={() => setDescOpen((o) => !o)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold"
                  >
                    {descOpen ? (
                      <>
                        Daha az <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Devamını oku <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            ) : null}

            {isLive ? (
              <div className="mt-4 lg:hidden">
                <LiveChatPanel
                  youtubeVideoId={videoId}
                  isLive={isLive}
                  viewerCount={engagement?.viewCount}
                  compact
                />
              </div>
            ) : null}

            {!isLive ? (
              <WatchCommentsSection
                youtubeVideoId={videoId}
                comments={watchComments.comments}
                commentCount={watchComments.commentCount}
                loading={commentsLoading && watchComments.comments.length === 0}
                error={commentsError && watchComments.comments.length === 0}
              />
            ) : null}
          </div>

          <div className="lg:hidden">
            <WatchVideoSections
              videoId={videoId}
              dbVideoId={video?.id}
              channelName={channelName}
              isLive={isLive}
            />
          </div>
        </div>

        <aside className="hidden w-[402px] shrink-0 lg:block">
          {isLive ? (
            <LiveChatPanel
              youtubeVideoId={videoId}
              isLive={isLive}
              viewerCount={engagement?.viewCount}
            />
          ) : (
            <WatchVideoSections
              videoId={videoId}
              dbVideoId={video?.id}
              channelName={channelName}
              isLive={isLive}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
