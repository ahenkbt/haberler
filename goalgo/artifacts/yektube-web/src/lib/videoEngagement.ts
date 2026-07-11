const REACTIONS_KEY = "yektube-v2:video-reactions";

export type VideoReaction = "like" | "dislike";

function readReactions(): Record<string, VideoReaction> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, VideoReaction>;
  } catch {
    /* ignore */
  }
  return {};
}

function writeReactions(map: Record<string, VideoReaction>): void {
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(map));
}

export function getVideoReaction(youtubeVideoId: string): VideoReaction | null {
  return readReactions()[youtubeVideoId] ?? null;
}

export function toggleVideoReaction(youtubeVideoId: string, reaction: VideoReaction): VideoReaction | null {
  const map = readReactions();
  const current = map[youtubeVideoId] ?? null;
  if (current === reaction) {
    delete map[youtubeVideoId];
    writeReactions(map);
    return null;
  }
  map[youtubeVideoId] = reaction;
  writeReactions(map);
  return reaction;
}

/** YouTube sayısı + yerel beğeni (YouTube’a gönderilmez, sadece arayüz). */
export function displayLikeCount(
  youtubeLikeCount: number | null | undefined,
  reaction: VideoReaction | null,
): number | null {
  if (youtubeLikeCount == null && reaction !== "like") return null;
  const base = youtubeLikeCount ?? 0;
  return reaction === "like" ? base + 1 : base;
}
