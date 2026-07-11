import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { yektubeThumbUrl } from "@/lib/api";

export type ThumbQuality = "hq" | "mq";

/** maxresdefault birçok videoda gri placeholder döner — kullanma */
function isBadStoredThumb(url: string | null | undefined): boolean {
  const t = url?.trim() ?? "";
  if (!t) return true;
  if (t.startsWith("data:")) return true;
  return /maxresdefault|120x90|oardefault/i.test(t);
}

/** DB'deki kapak bu videoya ait değilse (ör. haber kanalı görseli) kullanma */
function storedThumbMatchesVideo(videoId: string, url: string): boolean {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return false;
  const t = url.trim().toLowerCase();
  if (t.includes("ytimg.com") || t.includes("youtube.com/vi/") || t.includes("img.youtube.com")) {
    return t.includes(`/vi/${id.toLowerCase()}/`) || t.includes(`/vi/${id.toLowerCase}.`);
  }
  return true;
}

export function youtubeThumbCandidates(videoId: string, quality: ThumbQuality = "mq"): string[] {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return [];

  const primary = quality === "hq" ? "hqdefault" : "mqdefault";
  const secondary = quality === "hq" ? "mqdefault" : "hqdefault";

  return [
    yektubeThumbUrl(id, quality === "hq" ? "hq" : "mq"),
    `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${primary}.jpg`,
    `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${secondary}.jpg`,
    yektubeThumbUrl(id, "sd"),
    `https://i.ytimg.com/vi/${encodeURIComponent(id)}/default.jpg`,
  ];
}

export function videoThumbUrl(
  videoId: string,
  thumbnail?: string | null,
  quality: ThumbQuality = "mq",
): string {
  const list = youtubeThumbCandidates(videoId, quality);
  const stored = thumbnail?.trim();
  if (stored && !isBadStoredThumb(stored) && storedThumbMatchesVideo(videoId, stored)) return stored;
  return list[0] ?? "";
}

type Props = {
  videoId: string;
  thumbnail?: string | null;
  quality?: ThumbQuality;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function VideoThumb({ videoId, thumbnail, quality = "mq", alt = "", className, loading = "lazy" }: Props) {
  const candidates = useMemo(() => {
    const list = youtubeThumbCandidates(videoId, quality);
    const stored = thumbnail?.trim();
    if (stored && !isBadStoredThumb(stored) && storedThumbMatchesVideo(videoId, stored)) {
      return [stored, ...list.filter((u) => u !== stored)];
    }
    return list;
  }, [videoId, thumbnail, quality]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx] ?? candidates[0] ?? "";

  if (!src) {
    return (
      <div
        className={cn("flex items-center justify-center bg-[var(--color-yt-skeleton)] text-[var(--color-yt-muted)]", className)}
        aria-hidden
      >
        <span className="text-xs font-semibold">▶</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
