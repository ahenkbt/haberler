import { useMemo } from "react";
import { Link } from "wouter";
import { WorldBriefLink } from "@/components/WorldBriefLink";
import {
  formatHmMapCityHeadlineLabel,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import {
  isNewsmapRssOnlyHeadline,
  resolveNewsmapHeadlineNavHref,
  type NewsmapHeadlineNavOpts,
} from "@/lib/haberHaritasiOverlaySourceUrl";
import {
  resolveHaberHaritasiAllNewsHref,
  type HaberHaritasiLinkMode,
} from "@/lib/haberHaritasiLinks";
import { resolveTickerStripLabel } from "@/lib/haberHaritasiHeadlineLabels";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

type HaberHaritasiSonDakikaTickerProps = {
  headlines: HmMapCityHeadline[];
  isLoading?: boolean;
  linkMode: HaberHaritasiLinkMode;
  variant?: "overlay" | "toolbar";
  className?: string;
  onHeadlineClick?: (headline: HmMapCityHeadline) => void;
  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */
  inMapOverlayMode?: boolean;
  onShowAllClick?: () => void;
  /** Alt bant sekmesi — ticker etiket dili. */
  stripLang?: "turkce" | "global";
};

/** Son dakika şeridi — harita üstü overlay veya toolbar satırı (boydan boya). */
export function HaberHaritasiSonDakikaTicker({
  headlines,
  isLoading = false,
  linkMode,
  variant = "toolbar",
  className = "",
  onHeadlineClick,
  inMapOverlayMode = false,
  onShowAllClick,
  stripLang = "turkce",
}: HaberHaritasiSonDakikaTickerProps) {
  const hmPublicHref = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const navOpts = useMemo(
    (): NewsmapHeadlineNavOpts => ({
      linkMode,
      hmPublicHref,
      currentSiteId: hmCtx?.siteId ?? null,
    }),
    [linkMode, hmPublicHref, hmCtx?.siteId],
  );
  const allNewsHref = resolveHaberHaritasiAllNewsHref(linkMode, hmPublicHref);
  const stripLabel = resolveTickerStripLabel(stripLang);

  const tickerItems: HmMapCityHeadline[] =
    headlines.length > 0
      ? headlines
      : isLoading
        ? [{ city: "…", title: "Son haberler yükleniyor", href: allNewsHref, flagEmoji: "📡", kind: "news" }]
        : [{ city: "Son Dakika", title: "Konum eşleşen içerik bekleniyor", href: allNewsHref, flagEmoji: "🌍", kind: "news" }];

  const loop = [...tickerItems, ...tickerItems];
  const rootClass =
    variant === "overlay"
      ? "haber-haritasi-sondakika-ticker haber-haritasi-sondakika-ticker--overlay pointer-events-none absolute inset-x-0 top-0 z-[1003]"
      : "haber-haritasi-sondakika-ticker haber-haritasi-sondakika-ticker--toolbar w-full shrink-0";

  return (
    <div className={`${rootClass} ${className}`.trim()} aria-label="Son dakika haberleri">
      <div
        className={`haber-haritasi-sondakika-ticker__inner pointer-events-auto${
          variant === "toolbar" ? " haber-haritasi-sondakika-ticker__inner--toolbar w-full rounded-none" : ""
        }`}
      >
        <span className="haber-haritasi-sondakika-ticker__label shrink-0">{stripLabel}</span>
        <div className="haber-haritasi-sondakika-ticker__track min-w-0 flex-1 overflow-hidden">
          <div className="haber-haritasi-sondakika-ticker__marquee flex w-max items-center gap-6">
            {loop.map((row, idx) => {
              const itemClass =
                "inline-flex max-w-[min(520px,70vw)] items-center gap-2 text-[11px] font-semibold text-white/95 hover:text-white";
              const inner = (
                <>
                  {row.flagEmoji ? (
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                      {row.flagEmoji}
                    </span>
                  ) : null}
                  <span className="shrink-0 rounded bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                    {row.city}
                  </span>
                  <span className="truncate">
                    {row.kind === "video" ? "▶ " : ""}
                    {row.title}
                  </span>
                </>
              );
              const navHref = resolveNewsmapHeadlineNavHref(row, navOpts);
              const useInMapActivate =
                (inMapOverlayMode && Boolean(onHeadlineClick)) ||
                (Boolean(onHeadlineClick) && isNewsmapRssOnlyHeadline(row));
              if (inMapOverlayMode && onHeadlineClick) {
                return (
                  <button
                    key={`${row.city}-${row.href}-${idx}`}
                    type="button"
                    className={itemClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {inner}
                  </button>
                );
              }
              if (useInMapActivate || onHeadlineClick) {
                return (
                  <button
                    key={`${row.city}-${row.href}-${idx}`}
                    type="button"
                    className={itemClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {inner}
                  </button>
                );
              }
              if (!navHref) {
                return (
                  <span
                    key={`${row.city}-${row.href}-${idx}`}
                    className={`${itemClass} cursor-default opacity-90`}
                    title={formatHmMapCityHeadlineLabel(row)}
                  >
                    {inner}
                  </span>
                );
              }
              return (
                <WorldBriefLink
                  key={`${row.city}-${row.href}-${idx}`}
                  href={navHref}
                  className={itemClass}
                  title={formatHmMapCityHeadlineLabel(row)}
                >
                  {inner}
                </WorldBriefLink>
              );
            })}
          </div>
        </div>
        {inMapOverlayMode && onShowAllClick ? (
          <button
            type="button"
            className="haber-haritasi-sondakika-ticker__more shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/90 hover:text-white"
            onClick={(ev) => {
              ev.preventDefault();
              onShowAllClick();
            }}
          >
            Tümü →
          </button>
        ) : (
          <Link
            href={allNewsHref}
            className="haber-haritasi-sondakika-ticker__more shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/90 hover:text-white"
          >
            Tümü →
          </Link>
        )}
      </div>
    </div>
  );
}
