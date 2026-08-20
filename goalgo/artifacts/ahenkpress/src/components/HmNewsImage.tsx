import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { HM_NEWS_PLACEHOLDER_SVG, isUsableNewsCoverSrc } from "@/lib/hmNewsPlaceholder";
import { cn } from "@/lib/utils";

export function resolveHmNewsImageSrc(url: string | null | undefined): string {
  const u = String(url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
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
    if (s && isUsableNewsCoverSrc(s)) return s;
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
    if (!isUsableNewsCoverSrc(s)) continue;
    if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
      return s.startsWith("//") ? `https:${s}` : s;
    }
  }
  return "";
}

/** Kapak görseli var mı (manşet / öne çıkan / anasayfa kartları). Varsayılan placeholder kapak sayılmaz. */
export function newsItemHasCoverImage(
  item: Parameters<typeof resolveNewsItemImageUrl>[0],
): boolean {
  const primary = resolveNewsItemImageUrl(item);
  if (isUsableNewsCoverSrc(primary)) return true;
  return isUsableNewsCoverSrc(resolveNewsItemImageFallbackUrl(item));
}

export function filterNewsItemsWithCoverImage<T extends Parameters<typeof resolveNewsItemImageUrl>[0]>(
  items: readonly T[],
): T[] {
  return items.filter((item) => newsItemHasCoverImage(item));
}

type NewsImageItem = Parameters<typeof resolveNewsItemImageUrl>[0];

type HmNewsImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  /** Birincil src başarısız olursa (ör. WebP mirror 404) denenecek harici yedek URL. */
  fallbackSrc?: string | null;
  /** Verilirse src + RSS orijinal yedek otomatik çözülür. */
  item?: NewsImageItem;
  wrapperClassName?: string;
  /** Manset / above-the-fold — eager load, hızlı görünüm. */
  priority?: boolean;
};

function isLocalMediaUploadSrc(url: string): boolean {
  return /\/api\/media\/uploads\//i.test(url);
}

function isExternalHttpSrc(url: string): boolean {
  return /^https?:\/\//i.test(url) && !isLocalMediaUploadSrc(url);
}

/**
 * Yerel /api/media 404 (R2 TLS) bekletmesin: RSS/CDN orijinali varsa onu önce göster.
 */
export function pickFastNewsImageSrc(primary: string, fallback: string): string {
  if (isLocalMediaUploadSrc(primary) && isExternalHttpSrc(fallback)) return fallback;
  return primary || fallback;
}

/**
 * Haber görselleri: kaynak URL varsa hemen göster.
 * Yerel upload 404 ise harici RSS yedeğine, o da kırılırsa
 * «Görsel Hazırlanmaktadır» varsayılanına düş.
 */
export function HmNewsImage({
  src,
  fallbackSrc,
  item,
  alt = "",
  className,
  wrapperClassName,
  loading,
  priority = false,
  fetchPriority,
  ...rest
}: HmNewsImageProps) {
  const fromItem = item ? resolveNewsItemImageUrl(item) : "";
  const fallbackFromItem = item ? resolveNewsItemImageFallbackUrl(item) : "";
  const resolvedPrimary = resolveHmNewsImageSrc(src || fromItem);
  const resolvedFallback = resolveHmNewsImageSrc(fallbackSrc || fallbackFromItem);
  const initial = pickFastNewsImageSrc(resolvedPrimary, resolvedFallback);
  const [activeSrc, setActiveSrc] = useState(initial);
  const [failed, setFailed] = useState(!initial);

  useEffect(() => {
    const next = pickFastNewsImageSrc(resolvedPrimary, resolvedFallback);
    setActiveSrc(next);
    setFailed(!next);
  }, [resolvedPrimary, resolvedFallback]);

  const imgLoading = loading ?? (priority ? "eager" : "lazy");
  const showPlaceholder = !activeSrc || failed;

  const onImageError = () => {
    const other =
      activeSrc === resolvedFallback ? resolvedPrimary : resolvedFallback;
    if (other && other !== activeSrc) {
      setActiveSrc(other);
      setFailed(false);
      return;
    }
    setFailed(true);
  };

  return (
    <span
      className={cn(
        "hm-news-image-root relative block h-full w-full overflow-hidden",
        showPlaceholder ? "bg-white" : "bg-slate-100",
        wrapperClassName,
      )}
    >
      {showPlaceholder ? (
        <img
          src={HM_NEWS_PLACEHOLDER_SVG}
          alt=""
          decoding="async"
          className={cn("absolute inset-0 h-full w-full object-contain", className, "object-contain")}
        />
      ) : (
        <img
          {...rest}
          src={activeSrc}
          alt={alt}
          loading={imgLoading}
          decoding={priority ? "sync" : "async"}
          referrerPolicy="no-referrer"
          fetchPriority={priority ? "high" : fetchPriority}
          className={cn(
            "absolute inset-0 h-full w-full object-cover opacity-100",
            className,
          )}
          onLoad={() => {
            setFailed(false);
          }}
          onError={onImageError}
          ref={(el) => {
            if (!el?.complete) return;
            if (el.naturalWidth > 0) {
              setFailed(false);
            } else {
              onImageError();
            }
          }}
        />
      )}
    </span>
  );
}
