import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveUsableClientMediaSrc } from "@/lib/newsCoverSrc";
import {
  HM_NEWS_PLACEHOLDER_IMAGE,
  HM_NEWS_PLACEHOLDER_SVG,
} from "@/lib/hmNewsPlaceholder";
import { firstUsableNewsImageUrl, isUnusableNewsImageUrl } from "@/lib/unusableNewsImageUrl";
import { cn } from "@/lib/utils";

export function resolveHmNewsImageSrc(url: string | null | undefined): string {
  return resolveUsableClientMediaSrc(url);
}

function firstRawNewsImageUrl(
  item: Parameters<typeof resolveNewsItemImageUrl>[0],
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

/** Kapak görseli var mı (manşet / öne çıkan filtreleri). Render’da kalan URL de kapak sayılır. */
export function newsItemHasCoverImage(
  item: Parameters<typeof resolveNewsItemImageUrl>[0],
): boolean {
  return Boolean(firstRawNewsImageUrl(item));
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
  return firstUsableNewsImageUrl([
    item.imageUrl,
    item.featuredImage,
    item.image,
    item.thumbnailUrl,
    item.thumbnail,
    enclosure,
  ]);
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
    if (!s || s === primary || isUnusableNewsImageUrl(s)) continue;
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

/**
 * Haber görselleri: kaynak yoksa, Render’da kaldıysa veya yükleme kırılırsa
 * «Görseli Hazırlanmaktadır» varsayılanı gösterilir.
 */
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
  const [activeSrc, setActiveSrc] = useState(
    resolvedPrimary || resolvedFallback || HM_NEWS_PLACEHOLDER_IMAGE,
  );

  useEffect(() => {
    setActiveSrc(resolvedPrimary || resolvedFallback || HM_NEWS_PLACEHOLDER_IMAGE);
  }, [resolvedPrimary, resolvedFallback]);

  const imgLoading = loading ?? (priority ? "eager" : "lazy");

  const onImageError = () => {
    if (resolvedFallback && activeSrc !== resolvedFallback) {
      setActiveSrc(resolvedFallback);
      return;
    }
    if (activeSrc !== HM_NEWS_PLACEHOLDER_IMAGE) {
      setActiveSrc(HM_NEWS_PLACEHOLDER_IMAGE);
      return;
    }
    if (activeSrc !== HM_NEWS_PLACEHOLDER_SVG) {
      setActiveSrc(HM_NEWS_PLACEHOLDER_SVG);
    }
  };

  return (
    <span
      className={cn(
        "hm-news-image-root relative block h-full w-full overflow-hidden bg-slate-100",
        wrapperClassName,
      )}
    >
      {activeSrc ? (
        <img
          {...rest}
          src={activeSrc}
          alt={alt}
          loading={imgLoading}
          decoding="async"
          fetchPriority={priority ? "high" : fetchPriority}
          className={cn("absolute inset-0 h-full w-full object-cover opacity-100", className)}
          onError={onImageError}
        />
      ) : null}
    </span>
  );
}
