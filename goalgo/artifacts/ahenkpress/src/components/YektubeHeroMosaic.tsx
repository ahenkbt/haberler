import type { ReactNode, SyntheticEvent } from "react";
import { advanceVideoThumbnail, isLikelyYoutubePlaceholderThumb, type ThumbnailVariant, videoThumbnailSrc } from "@/lib/youtubeThumbnails";
import type { VideoItem } from "@/pages/public/CanliTv";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

export { YektubeVideoThumb } from "@/components/YektubeVideoThumb";

export function videoThumbUrl(v: VideoItem, variant: ThumbnailVariant = "landscape"): string {
  return videoThumbnailSrc(v.videoId, v.thumbnail, variant);
}

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
export function buildMosaicSlots(list: VideoItem[]): (VideoItem | null)[] {
  const out: (VideoItem | null)[] = list.slice(0, 10).map((x) => x);
  while (out.length < 10) out.push(null);
  return out;
}

export function YektubeHeroMosaic({
  slots,
  title,
  subtitle,
  rightSlot,
}: {
  slots: (VideoItem | null)[];
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="relative w-full bg-emerald-950">
      <div className="grid aspect-[5/2] w-full min-h-[168px] max-h-[min(56vw,380px)] grid-cols-5 grid-rows-2 sm:min-h-[200px] sm:max-h-[360px] md:max-h-[400px]">
        {slots.map((v, i) => (
          <div key={i} className="relative min-h-0 min-w-0 ring-[0.5px] ring-emerald-900/40">
            {v ? (
              <img
                src={videoThumbUrl(v)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading={i < 6 ? "eager" : "lazy"}
                onLoad={(e) => handleVideoThumbLoad(v.videoId, e)}
                onError={(e) => handleVideoThumbError(v.videoId, e)}
              />
            ) : (
              <div
                className="absolute inset-0 bg-emerald-900"
                style={{ backgroundImage: "linear-gradient(135deg, #065f46 0%, #064e3b 100%)" }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-900/55 to-emerald-800/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] px-4 pb-5 pt-20 sm:px-6 sm:pb-7 sm:pt-24">
        <div className={YEKPARE_PAGE_CONTAINER_CLASS}>
          <h1
            className="text-[clamp(1.35rem,4.2vw,2.75rem)] font-black uppercase leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
            style={{
              textShadow:
                "0 0 3px rgba(0,0,0,1), 0 4px 32px rgba(0,0,0,.95), 0 2px 14px rgba(0,0,0,.9)",
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-3xl line-clamp-2 text-sm leading-snug text-white/90 sm:text-base [text-shadow:0_2px_12px_rgba(0,0,0,.85)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {rightSlot ? <div className="absolute right-2 top-2 z-[3] sm:right-3 sm:top-3">{rightSlot}</div> : null}
    </div>
  );
}
