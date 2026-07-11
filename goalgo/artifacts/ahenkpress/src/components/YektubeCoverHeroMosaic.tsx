import type { ReactNode, SyntheticEvent } from "react";
import { Link } from "wouter";
import { fallbackThumbnailSrc, normalizeYoutubeImageSrc } from "@/lib/youtubeThumbnails";
import { channelColor } from "@/pages/public/CanliTv";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

export type CoverHeroSlot = {
  id: number;
  title: string;
  imageUrl?: string | null;
  href?: string;
  active?: boolean;
};

function buildSlots<T>(items: T[], count = 10): (T | null)[] {
  const out: (T | null)[] = items.slice(0, count).map((x) => x);
  while (out.length < count) out.push(null);
  return out;
}

function thumbOnError(videoId: string | undefined, e: SyntheticEvent<HTMLImageElement>) {
  if (!videoId) return;
  const next = fallbackThumbnailSrc(videoId, e.currentTarget.src);
  if (next) e.currentTarget.src = next;
  else e.currentTarget.style.display = "none";
}

/** Üst kapak: 5×2 mozaik — video küçük resimleri veya kapak görselleri */
export function YektubeCoverHeroMosaic({
  items,
  imageUrls,
  imageVideoIds,
  title,
  subtitle,
  rightSlot,
}: {
  /** Logo/kapak hücreleri (tıklanabilir) */
  items?: CoverHeroSlot[];
  /** Seçili kanal video mozaik görselleri (10 hücre) */
  imageUrls?: string[];
  imageVideoIds?: (string | undefined)[];
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}) {
  const useThumbs = imageUrls && imageUrls.length > 0;
  const thumbSlots = useThumbs ? buildSlots(imageUrls) : null;
  const itemSlots = !useThumbs && items ? buildSlots(items) : null;

  return (
    <div className="relative w-full bg-emerald-950">
      <div className="grid aspect-[5/2] w-full min-h-[168px] max-h-[min(56vw,380px)] grid-cols-5 grid-rows-2 sm:min-h-[200px] sm:max-h-[360px] md:max-h-[400px]">
        {useThumbs && thumbSlots
          ? thumbSlots.map((src, i) => (
              <div key={i} className="relative min-h-0 min-w-0 ring-[0.5px] ring-emerald-900/40">
                {src ? (
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={i < 6 ? "eager" : "lazy"}
                    onError={(e) => thumbOnError(imageVideoIds?.[i], e)}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-emerald-900"
                    style={{ backgroundImage: "linear-gradient(135deg, #065f46 0%, #064e3b 100%)" }}
                  />
                )}
              </div>
            ))
          : itemSlots?.map((slot, i) => {
          const img = slot?.imageUrl ? normalizeYoutubeImageSrc(slot.imageUrl) : "";
          const color = slot ? channelColor(slot.title) : "#065f46";
          const cell = (
            <div className="relative min-h-0 min-w-0 ring-[0.5px] ring-emerald-900/40">
              {slot && img ? (
                <img
                  src={img}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                    slot.active ? "opacity-100" : "opacity-90 group-hover:opacity-100"
                  }`}
                  loading={i < 6 ? "eager" : "lazy"}
                />
              ) : slot ? (
                <div
                  className="absolute inset-0 flex items-center justify-center text-2xl font-black sm:text-3xl"
                  style={{
                    color,
                    background: `linear-gradient(135deg, ${color}55 0%, #064e3b 100%)`,
                  }}
                >
                  {slot.title.charAt(0)}
                </div>
              ) : (
                <div
                  className="absolute inset-0 bg-emerald-900"
                  style={{ backgroundImage: "linear-gradient(135deg, #065f46 0%, #064e3b 100%)" }}
                />
              )}
              {slot?.active ? (
                <span className="absolute left-1 top-1 z-[2] rounded bg-[#039D55] px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                  Canlı
                </span>
              ) : null}
            </div>
          );

          if (slot?.href) {
            return (
              <Link key={slot.id} href={slot.href} className="group block min-h-0 min-w-0">
                {cell}
              </Link>
            );
          }
          return <div key={i}>{cell}</div>;
        })}
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
            <p className="mt-2 max-w-3xl line-clamp-3 text-sm leading-relaxed text-emerald-50/90 sm:line-clamp-4 sm:text-base">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {rightSlot ? <div className="pointer-events-none absolute right-3 top-3 z-[2] sm:right-5 sm:top-5">{rightSlot}</div> : null}
    </div>
  );
}
