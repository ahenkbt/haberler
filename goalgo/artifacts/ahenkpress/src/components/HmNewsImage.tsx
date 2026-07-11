import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import {
  HM_NEWS_PLACEHOLDER_IMAGE,
  HM_NEWS_PLACEHOLDER_IMAGE_PNG,
  HM_NEWS_PLACEHOLDER_SVG,
} from "@/lib/hmNewsPlaceholder";
import { cn } from "@/lib/utils";

export function resolveHmNewsImageSrc(url: string | null | undefined): string {
  const u = String(url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
}

/** Kapak görseli var mı (manşet / öne çıkan filtreleri). */
export function newsItemHasCoverImage(
  item: Parameters<typeof resolveNewsItemImageUrl>[0],
): boolean {
  return Boolean(String(resolveNewsItemImageUrl(item) ?? "").trim());
}

export function filterNewsItemsWithCoverImage<T extends Parameters<typeof resolveNewsItemImageUrl>[0]>(
  items: readonly T[],
): T[] {
  return items.filter((item) => newsItemHasCoverImage(item));
}

/** Haber kartları — API/RSS farklı alan adlarından görsel URL. */
export function resolveNewsItemImageUrl(
  item:
    | {
        imageUrl?: string | null;
        featuredImage?: string | null;
        imageFallbackUrl?: string | null;
        image?: string | null;
        thumbnailUrl?: string | null;
        thumbnail?: string | null;
        enclosure?: { url?: string | null } | string | null;
      }
    | null
    | undefined,
): string {
  if (!item) return "";
  const enclosure =
    typeof item.enclosure === "string"
      ? item.enclosure
      : String(item.enclosure?.url ?? "").trim() || null;
  for (const raw of [item.imageUrl, item.featuredImage, item.image, item.thumbnailUrl, item.thumbnail, enclosure]) {
    const s = String(raw ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** WebP mirror hazır değilse veya yerel upload 404 ise harici kapak yedeği. */
export function resolveNewsItemImageFallbackUrl(
  item:
    | {
        imageUrl?: string | null;
        featuredImage?: string | null;
        imageFallbackUrl?: string | null;
        image?: string | null;
        thumbnailUrl?: string | null;
        thumbnail?: string | null;
        enclosure?: { url?: string | null } | string | null;
      }
    | null
    | undefined,
): string {
  if (!item) return "";
  const primary = resolveNewsItemImageUrl(item);
  const enclosure =
    typeof item.enclosure === "string"
      ? item.enclosure
      : String(item.enclosure?.url ?? "").trim() || null;
  for (const raw of [item.imageFallbackUrl, item.featuredImage, item.thumbnailUrl, item.thumbnail, item.image, enclosure]) {
    const s = String(raw ?? "").trim();
    if (!s || s === primary) continue;
    if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
      return s.startsWith("//") ? `https:${s}` : s;
    }
  }
  return "";
}

type HmNewsImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  /** Birincil src başarısız olursa (ör. WebP mirror 404) denenecek harici yedek URL. */
  fallbackSrc?: string | null;
  wrapperClassName?: string;
  /** Manset / above-the-fold — eager load, hızlı görünüm. */
  priority?: boolean;
};

export function HmNewsImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  wrapperClassName,
  loading,
  priority = false,
  fetchPriority,
  ...rest
}: HmNewsImageProps) {
  const resolvedPrimary = resolveHmNewsImageSrc(src);
  const resolvedFallback = resolveHmNewsImageSrc(fallbackSrc);
  const [activeSrc, setActiveSrc] = useState(resolvedPrimary || resolvedFallback);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!activeSrc);
  const [placeholderSrc, setPlaceholderSrc] = useState(HM_NEWS_PLACEHOLDER_IMAGE);

  useEffect(() => {
    const next = resolvedPrimary || resolvedFallback;
    setActiveSrc(next);
    setLoaded(false);
    setFailed(!next);
    setPlaceholderSrc(HM_NEWS_PLACEHOLDER_IMAGE);
  }, [resolvedPrimary, resolvedFallback]);

  useEffect(() => {
    if (!priority || !activeSrc) return;
    const img = new Image();
    img.decoding = "async";
    img.src = activeSrc;
    if (img.complete) {
      setLoaded(true);
      return;
    }
    img.onload = () => setLoaded(true);
    img.onerror = () => {
      if (resolvedFallback && resolvedFallback !== activeSrc) {
        setActiveSrc(resolvedFallback);
        setFailed(false);
        return;
      }
      setFailed(true);
    };
  }, [priority, activeSrc, resolvedFallback]);

  const showPlaceholder = !activeSrc || failed || (!priority && !loaded);
  const imgLoading = loading ?? (priority ? "eager" : "lazy");

  const onPlaceholderError = () => {
    setPlaceholderSrc((current) => {
      if (current === HM_NEWS_PLACEHOLDER_IMAGE) return HM_NEWS_PLACEHOLDER_IMAGE_PNG;
      if (current === HM_NEWS_PLACEHOLDER_IMAGE_PNG) return HM_NEWS_PLACEHOLDER_SVG;
      return current;
    });
  };

  const onImageError = () => {
    if (resolvedFallback && activeSrc !== resolvedFallback) {
      setActiveSrc(resolvedFallback);
      setLoaded(false);
      setFailed(false);
      return;
    }
    setFailed(true);
    setLoaded(false);
  };

  return (
    <span
      className={cn(
        "hm-news-image-root relative block h-full w-full overflow-hidden bg-white",
        wrapperClassName,
      )}
    >
      {showPlaceholder ? (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full bg-white object-contain object-center"
          onError={onPlaceholderError}
        />
      ) : null}
      {activeSrc && !failed ? (
        <img
          {...rest}
          src={activeSrc}
          alt={alt}
          loading={imgLoading}
          decoding="async"
          fetchPriority={priority ? "high" : fetchPriority}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            priority ? "opacity-100" : "transition-opacity duration-150",
            !priority && (loaded ? "opacity-100" : "opacity-0"),
            className,
          )}
          onLoad={() => {
            setLoaded(true);
            setFailed(false);
          }}
          onError={onImageError}
        />
      ) : null}
    </span>
  );
}
