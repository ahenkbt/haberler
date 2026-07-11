import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { parseYoutubeVideoRef } from "@workspace/yektube-core";

const WATCH_PATH = /\/kanal\/([^/?#]+)\/([^/?#]+)\/?/;
const CHANNEL_PATH = /\/kanal\/([^/?#]+)\/?(?:$|[?#])/;

/** wouter Route eşleşmesinden veya URL'den kanal + video referansı okur */
export function useWatchRouteParams() {
  const ctx = useParams<{ channelId?: string; videoId?: string }>();
  const [location] = useLocation();

  return useMemo(() => {
    let channelRef = ctx?.channelId ?? "";
    let videoRef = ctx?.videoId ?? "";

    if (!channelRef || !videoRef) {
      const m = location.match(WATCH_PATH);
      if (m) {
        channelRef = decodeURIComponent(m[1]!);
        videoRef = decodeURIComponent(m[2]!);
      }
    } else {
      channelRef = decodeURIComponent(channelRef);
      videoRef = decodeURIComponent(videoRef);
    }

    const videoId = parseYoutubeVideoRef(videoRef);
    const valid = Boolean(channelRef.trim()) && Boolean(videoId.trim());

    return { channelRef: channelRef.trim(), videoRef, videoId, valid };
  }, [ctx?.channelId, ctx?.videoId, location]);
}

export function useChannelRouteParams() {
  const ctx = useParams<{ channelId?: string }>();
  const [location] = useLocation();

  return useMemo(() => {
    let channelRef = ctx?.channelId ?? "";
    if (!channelRef) {
      const m = location.match(CHANNEL_PATH);
      if (m) channelRef = decodeURIComponent(m[1]!);
    } else {
      channelRef = decodeURIComponent(channelRef);
    }
    channelRef = channelRef.trim();
    const valid = Boolean(channelRef);
    return { channelRef, valid };
  }, [ctx?.channelId, location]);
}
