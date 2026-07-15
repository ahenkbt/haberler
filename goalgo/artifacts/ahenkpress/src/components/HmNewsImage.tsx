import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
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

/**
 * Haber görselleri: kaynak URL varsa hemen göster.
 * «Görseli Hazırlanmaktadır» varsayılanı gösterilmez (yüklenene kadar boş/arkaplan).
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
  const [activeSrc, setActiveSrc] = useState(resolvedPrimary || resolvedFallback);
  const [failed, setFailed] = useState(!(resolvedPrimary || resolvedFallback));

  useEffect(() => {
    const next = resolvedPrimary || resolvedFallback;
    setActiveSrc(next);
    setFailed(!next);
  }, [resolvedPrimary, resolvedFallback]);

  const imgLoading = loading ?? (priority ? "eager" : "lazy");

  const onImageError = () => {
    if (resolvedFallback && activeSrc !== resolvedFallback) {
      setActiveSrc(resolvedFallback);
      setFailed(false);
      return;
    }
    setFailed(true);
  };

  return (
    <span
      className={cn(
        "hm-news-image-root relative block h-full w-full overflow-hidden bg-slate-100",
        wrapperClassName,
      )}
    >
      {activeSrc && !failed ? (
        <img
          {...rest}
          src={activeSrc}
          alt={alt}
          loading={imgLoading}
          decoding="async"
          fetchPriority={priority ? "high" : fetchPriority}
          className={cn("absolute inset-0 h-full w-full object-cover opacity-100", className)}
          onLoad={() => setFailed(false)}
          onError={onImageError}
        />
      ) : null}
    </span>
  );
}
