/** YouTube watch URL veya ham metinden 11 karakterlik video ID çıkarır */
export function extractYoutubeVideoId(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(t) && !t.startsWith("UC")) return t;
  try {
    const url = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://www.youtube.com/${t.replace(/^\//, "")}`);
    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch" && parts[1]) {
      const id = parts[1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
      const id = parts[1];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (url.hostname.includes("youtu.be") && parts[0] && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) {
      return parts[0];
    }
  } catch {
    /* fall through */
  }
  const m = t.match(/(?:v=|\/vi\/|youtu\.be\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function isYoutubeLiveVideoId(id: string): boolean {
  const t = id.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(t) && !t.startsWith("UC");
}

export function isLiveStreamSource(row: {
  sourceType?: string | null;
  isLive?: boolean | null;
  channelId?: string | null;
  url?: string | null;
}): boolean {
  if (row.sourceType === "live" || row.isLive) return true;
  const cid = (row.channelId ?? "").trim();
  if (isYoutubeLiveVideoId(cid)) return true;
  const fromUrl = extractYoutubeVideoId(row.url);
  return Boolean(fromUrl && isYoutubeLiveVideoId(fromUrl));
}
