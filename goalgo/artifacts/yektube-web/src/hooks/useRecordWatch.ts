import { useEffect } from "react";
import type { YektubeVideo } from "@workspace/yektube-core";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { recordWatchHistory } from "@/lib/memberApi";
import { pushGuestHistory } from "@/lib/guestStorage";
import { trackRecentYoutubeWatch } from "@/lib/recentWatchIds";

/** İzleme sayfasında geçmişe kaydet (üye veya misafir). */
export function useRecordWatch(video: YektubeVideo | null | undefined, sourceId: number) {
  const { member } = useMemberAuth();

  useEffect(() => {
    if (!video?.id || !video.videoId) return;
    trackRecentYoutubeWatch(video.videoId);
    if (member) {
      void recordWatchHistory({
        videoId: video.id,
        sourceId,
        youtubeVideoId: video.videoId,
      }).catch(() => undefined);
    } else {
      pushGuestHistory(video, sourceId);
    }
  }, [member, video?.id, video?.videoId, sourceId]);
}
