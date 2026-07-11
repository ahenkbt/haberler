import { Link } from "wouter";
import type { YektubeVideo } from "@workspace/yektube-core";
import { decodeHtml } from "@/lib/constants";
import { VideoThumb } from "@/components/VideoThumb";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { SocialShortPlayer, isSocialShortVideo } from "@/components/SocialShortPlayer";
import { ShortsActionRail } from "@/components/ShortsActionRail";
import { SubscribeButton } from "@/components/SubscribeButton";
import { ytRoutes } from "@/lib/routes";
import { readBackgroundPlayback } from "@/lib/yektubePlaybackPrefs";
import { cn } from "@/lib/cn";

export function ShortsSlide({
  video,
  isActive,
  isDesktop,
  loopEnabled,
  onLoopToggle,
  onEnded,
}: {
  video: YektubeVideo;
  isActive: boolean;
  isDesktop: boolean;
  loopEnabled: boolean;
  onLoopToggle: () => void;
  onEnded?: () => void;
}) {
  const isMobile = !isDesktop;
  const title = decodeHtml(video.title);
  const channel = decodeHtml(video.channelName ?? "Yektube");
  const handle = `@${channel.replace(/\s+/g, "")}`;

  const handleEnded = loopEnabled ? undefined : onEnded;

  const player = (
    <div
      className={cn(
        "relative overflow-hidden bg-black",
        isDesktop
          ? "h-[min(calc(100dvh-7rem),780px)] w-auto aspect-[9/16] rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.12)]"
          : "mx-auto aspect-[9/16] h-full max-h-full w-full max-w-[480px]",
      )}
    >
      {isActive ? (
        isSocialShortVideo(video) ? (
          <SocialShortPlayer
            key={`${video.platform}-${video.videoId}`}
            video={video}
            title={title}
            className="absolute inset-0 h-full w-full"
            onBlocked={onEnded}
          />
        ) : (
          <YoutubePlayer
            key={`${video.videoId}-${loopEnabled ? "loop" : "next"}`}
            videoId={video.videoId}
            title={title}
            channelName={channel}
            thumbnailUrl={video.thumbnail ?? undefined}
            autoplay
            showChrome={false}
            shortsMode
            shortsLoop={loopEnabled}
            embedAllowed={video.embedAllowed !== false}
            autoPiP={isMobile && readBackgroundPlayback()}
            className="absolute inset-0 h-full w-full"
            onEnded={handleEnded}
            onBlocked={onEnded}
          />
        )
      ) : (
        <>
          <VideoThumb
            videoId={video.videoId}
            thumbnail={video.thumbnail}
            quality="mq"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-4 pt-16">
        <div className="flex flex-wrap items-center gap-2">
          {video.sourceId ? (
            <Link
              href={ytRoutes.channel({ id: video.sourceId!, name: video.channelName ?? "kanal" })}
              className="text-sm font-bold text-white hover:underline"
            >
              {handle}
            </Link>
          ) : (
            <span className="text-sm font-bold text-white">{handle}</span>
          )}
          {video.sourceId && isDesktop ? (
            <SubscribeButton sourceId={video.sourceId} compact className="!py-1 !text-xs" />
          ) : null}
        </div>
        <h2 className="mt-2 line-clamp-3 text-sm font-medium text-white">{title}</h2>
      </div>

      {!isDesktop ? (
        <div className="absolute bottom-28 right-2 z-30">
          <ShortsActionRail
            youtubeVideoId={video.videoId}
            title={title}
            variant="overlay"
            loopEnabled={loopEnabled}
            onLoopToggle={onLoopToggle}
          />
        </div>
      ) : null}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="flex items-end justify-center gap-5 px-4">
        {player}
        <ShortsActionRail
          youtubeVideoId={video.videoId}
          title={title}
          variant="panel"
          loopEnabled={loopEnabled}
          onLoopToggle={onLoopToggle}
        />
      </div>
    );
  }

  return player;
}

/** Snap kaydırması korunur; ağır içerik mount edilmez */
export function ShortsSlidePlaceholder({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto bg-black",
        isDesktop
          ? "h-[min(calc(100dvh-7rem),780px)] w-auto aspect-[9/16] rounded-2xl"
          : "aspect-[9/16] h-full max-h-full w-full max-w-[480px]",
      )}
      aria-hidden
    />
  );
}
