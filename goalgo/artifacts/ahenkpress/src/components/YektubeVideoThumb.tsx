import type { SyntheticEvent } from "react";
import {
  advanceVideoThumbnail,
  isLikelyYoutubePlaceholderThumb,
  type ThumbnailVariant,
  videoThumbnailSrc,
} from "@/lib/youtubeThumbnails";

type Props = {
  videoId: string;
  thumbnail?: string | null;
  variant?: ThumbnailVariant;
  className?: string;
  loading?: "eager" | "lazy";
  alt?: string;
};

export function handleVideoThumbError(
  videoId: string,
  e: SyntheticEvent<HTMLImageElement>,
  variant: ThumbnailVariant = "landscape",
) {
  if (advanceVideoThumbnail(videoId, e.currentTarget, variant)) return;
  e.currentTarget.style.opacity = "0.35";
}

export function handleVideoThumbLoad(
  videoId: string,
  e: SyntheticEvent<HTMLImageElement>,
  variant: ThumbnailVariant = "landscape",
) {
  const img = e.currentTarget;
  if (!isLikelyYoutubePlaceholderThumb(img)) {
    img.style.opacity = "";
    return;
  }
  if (advanceVideoThumbnail(videoId, img, variant)) return;
  img.style.opacity = "0.35";
}

export function YektubeVideoThumb({
  videoId,
  thumbnail,
  variant = "landscape",
  className = "h-full w-full object-cover",
  loading = "lazy",
  alt = "",
}: Props) {
  const src = videoThumbnailSrc(videoId, thumbnail, variant);
  if (!src) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-zinc-200 to-zinc-300`.trim()}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={(e) => handleVideoThumbLoad(videoId, e, variant)}
      onError={(e) => handleVideoThumbError(videoId, e, variant)}
    />
  );
}
