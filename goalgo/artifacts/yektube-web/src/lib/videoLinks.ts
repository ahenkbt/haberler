import type { YektubeVideo } from "@workspace/yektube-core";
import { ytRoutes } from "@/lib/routes";

/** Kanal slug'ı için kaynak adını tercih et (YouTube kanal adı ≠ kaynak adı) */
export function videoChannelLabel(video: YektubeVideo): string {
  return video.sourceName?.trim() || video.channelName?.trim() || "Yektube";
}

export function videoWatchHref(video: YektubeVideo): string | undefined {
  if (!video.videoId?.trim()) return undefined;
  const channelName = videoChannelLabel(video);
  const sourceId = video.sourceId != null && video.sourceId > 0 ? video.sourceId : 0;
  return ytRoutes.watch(
    { id: sourceId, name: channelName },
    { videoId: video.videoId, title: video.title ?? video.videoId },
  );
}
