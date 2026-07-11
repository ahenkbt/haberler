import { useMemo } from "react";
import { Link } from "wouter";
import { normalizeYoutubeImageSrc, youtubeVideoThumbnail } from "@/lib/youtubeThumbnails";
import { channelColor, type Source } from "@/pages/public/CanliTv";
import { yektubeCanliTvPath } from "@/lib/yektubeUrls";
import { resolveLiveVideoId } from "@/lib/yektubeLiveEmbed";

function logoSrc(source: Source): string {
  const logo = normalizeYoutubeImageSrc(source.logoUrl);
  if (logo) return logo;
  const vid = resolveLiveVideoId(source);
  return vid ? youtubeVideoThumbnail(vid, "hqdefault") : "";
}

/** Karışık kanal logoları — 5×2 mozaik, tüm canlı kanallardan döngüsel */
export function CanliTvMixedLogoMosaic({
  channels,
  selectedId,
  pathHome,
}: {
  channels: Source[];
  selectedId?: number;
  pathHome: string;
}) {
  const cells = useMemo(() => {
    if (channels.length === 0) return [];
    const shuffled = [...channels].sort(
      (a, b) => ((a.id * 2654435761) ^ (b.name.length * 97)) - ((b.id * 2654435761) ^ (a.name.length * 97)),
    );
    return Array.from({ length: 10 }, (_, i) => {
      const ch = shuffled[i % shuffled.length];
      return {
        key: `${ch.id}-${i}`,
        channel: ch,
        href: yektubeCanliTvPath(pathHome, ch.id),
        active: selectedId === ch.id,
      };
    });
  }, [channels, pathHome, selectedId]);

  if (cells.length === 0) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Canlı kanallar</p>
      <div className="grid grid-cols-5 grid-rows-2 gap-1.5 sm:gap-2">
        {cells.map(({ key, channel, href, active }) => {
          const img = logoSrc(channel);
          const color = channelColor(channel.name);
          return (
            <Link
              key={key}
              href={href}
              title={channel.name}
              className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                active
                  ? "border-[#039D55] ring-2 ring-[#039D55]/25"
                  : "border-emerald-50 hover:border-[#039D55]/40"
              }`}
            >
              {img ? (
                <img src={img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-black sm:text-xl"
                  style={{
                    color,
                    background: `linear-gradient(135deg, ${color}33 0%, #f3f4f6 100%)`,
                  }}
                >
                  {channel.name.charAt(0)}
                </div>
              )}
              <span className="absolute left-0.5 top-0.5 rounded bg-[#039D55] px-1 py-px text-[7px] font-bold uppercase text-white">
                Canlı
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
