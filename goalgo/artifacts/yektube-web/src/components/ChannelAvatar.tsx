import { useMemo, useState } from "react";
import type { YektubeSource } from "@workspace/yektube-core";
import { cn } from "@/lib/cn";
import { youtubeThumbCandidates } from "@/components/VideoThumb";

type SourceLike = Pick<YektubeSource, "logoUrl" | "channelId" | "platform" | "sourceType" | "name">;

export function channelAvatarCandidates(source: SourceLike): string[] {
  const out: string[] = [];
  const logo = source.logoUrl?.trim();
  if (logo) out.push(logo);

  const cid = source.channelId?.trim() ?? "";
  if (source.platform === "youtube" && source.sourceType === "video" && /^[a-zA-Z0-9_-]{11}$/.test(cid)) {
    out.push(...youtubeThumbCandidates(cid, "mq"));
  }

  return [...new Set(out.filter(Boolean))];
}

type Props = {
  source: SourceLike;
  className?: string;
  fallbackClassName?: string;
};

/** Kanal profil/kapak avatarı — ytimg yedeği + referrerPolicy */
export function ChannelAvatar({ source, className, fallbackClassName }: Props) {
  const candidates = useMemo(() => channelAvatarCandidates(source), [source]);
  const [idx, setIdx] = useState(0);
  const src = candidates[idx] ?? "";

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center yt-avatar font-bold",
          fallbackClassName ?? className,
        )}
        aria-hidden
      >
        {(source.name?.trim() || "?").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i))}
    />
  );
}
