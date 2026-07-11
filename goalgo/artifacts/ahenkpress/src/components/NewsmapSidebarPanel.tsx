import { useMemo } from "react";
import {
  formatHmMapCityHeadlineLabel,
  formatHmMapCityHeadlineTime,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import { MapPanelCloseButton } from "@/components/MapPanelCloseButton";
import {
  isNewsmapRssOnlyHeadline,
  resolveNewsmapHeadlineNavHref,
  type NewsmapHeadlineNavOpts,
} from "@/lib/haberHaritasiOverlaySourceUrl";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

import type { NewsmapBottomBandTab } from "@/lib/haberHaritasiNewsmapBottomBand";

type NewsmapSidebarPanelProps = {
  headlines: HmMapCityHeadline[];
  isLoading?: boolean;
  mode?: "all" | "news" | "video";
  linkMode?: HaberHaritasiLinkMode;
  locationLabel?: string | null;
  onHeadlineClick?: (headline: HmMapCityHeadline) => void;
  /** Konum rozeti — şehre git + konum paneli. */
  onCityClick?: (headline: HmMapCityHeadline) => void;
  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */
  inMapOverlayMode?: boolean;
  onClose?: () => void;
  /** Şehir kartı gövdesinde — üst başlık satırını gizle. */
  hideHeader?: boolean;
  /** Türkiye / Global haber sekmeleri — ülke görünümü. */
  showLangTabs?: boolean;
  langTab?: NewsmapBottomBandTab;
  onLangTabChange?: (tab: NewsmapBottomBandTab) => void;
};

function emptyMessageForMode(mode: "all" | "news" | "video"): string {
  if (mode === "video") return "Bu konumda video bulunamadı";
  if (mode === "news") return "Bu konumda haber bulunamadı";
  return "Bu konumda haber bulunamadı";
}

const SIDEBAR_LANG_TABS: Array<{ key: NewsmapBottomBandTab; label: string }> = [
  { key: "turkce", label: "Türkiye" },
  { key: "global", label: "Global" },
];

/** Haber haritası — sol panelde konuma göre haber/video listesi. */
export function NewsmapSidebarPanel({
  headlines,
  isLoading = false,
  mode = "all",
  linkMode = "yekpare",
  locationLabel = null,
  onHeadlineClick,
  onCityClick,
  inMapOverlayMode = false,
  onClose,
  hideHeader = false,
  showLangTabs = false,
  langTab = "turkce",
  onLangTabChange,
}: NewsmapSidebarPanelProps) {
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
  const modeLabel =
    mode === "video" ? "Video" : mode === "news" ? "Haberler" : "Haberler";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!hideHeader ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5"
          style={{
            borderBottom: "1px solid rgba(244,63,94,0.14)",
            background: "linear-gradient(135deg, #fff1f2 0%, #fff7ed 55%, #f8fafc 100%)",
            boxShadow: "0 2px 12px rgba(244,63,94,0.06)",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isLoading && headlines.length === 0 ? null : (
              <>
                <span
                  className="min-w-[28px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", boxShadow: "0 2px 10px rgba(225,29,72,0.25)" }}
                >
                  {headlines.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500">sonuç</span>
                {locationLabel ? (
                  <span className="truncate text-[11px] font-semibold text-rose-800">
                    · 📍 {locationLabel}
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showLangTabs ? (
              <div
                className="flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200/90 bg-white/90 p-0.5 shadow-sm"
                role="tablist"
                aria-label="Haber kapsamı"
              >
                {SIDEBAR_LANG_TABS.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    role="tab"
                    aria-selected={langTab === row.key}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide transition ${
                      langTab === row.key
                        ? row.key === "global"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-rose-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => onLangTabChange?.(row.key)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="hidden text-[10px] font-bold uppercase tracking-wide text-rose-600 sm:inline">
              {modeLabel}
            </span>
            {onClose ? (
              <MapPanelCloseButton
                onClick={onClose}
                className="haritalar-map-panel-close--inline-header"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className="flex-1 overflow-y-auto pt-1"
        style={{
          background: "linear-gradient(180deg, #fffafb 0%, #fff7ed 45%, #f8fafc 100%)",
          scrollbarWidth: "thin",
        }}
      >
        {isLoading && headlines.length === 0 ? (
          <div className="flex min-h-[10rem] items-center justify-center px-6 py-10">
            <p className="text-center text-xs font-semibold text-slate-500">İçerik yükleniyor…</p>
          </div>
        ) : headlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
              style={{ background: "linear-gradient(135deg, #ffe4e6, #ffedd5)", boxShadow: "0 4px 16px rgba(244,63,94,0.12)" }}
            >
              {mode === "video" ? "▶️" : "📰"}
            </div>
            <p className="text-sm font-bold text-slate-700">{emptyMessageForMode(mode)}</p>
            {locationLabel ? (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {locationLabel} bölgesinde eşleşen içerik yok. Haritayı kaydırarak başka bir konum deneyin.
              </p>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Haritayı yakınlaştırın veya konum arayın.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5 px-2 pb-3">
            {headlines.map((row) => {
              const timeLabel = formatHmMapCityHeadlineTime(row.publishedAt);
              const itemBody = (
                <>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                    {row.thumbnail ? (
                      <img src={row.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : row.flagEmoji ? (
                      <span className="text-2xl">{row.flagEmoji}</span>
                    ) : (
                      <span className="text-lg">{row.kind === "video" ? "▶" : "📰"}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          row.kind === "video"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-rose-100 text-rose-800"
                        }${onCityClick ? " cursor-pointer hover:ring-2 hover:ring-rose-300" : ""}`}
                        role={onCityClick ? "button" : undefined}
                        tabIndex={onCityClick ? 0 : undefined}
                        onClick={onCityClick ? (ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          onCityClick(row);
                        } : undefined}
                        onKeyDown={onCityClick ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            ev.stopPropagation();
                            onCityClick(row);
                          }
                        } : undefined}
                      >
                        {row.city}
                      </span>
                      {timeLabel ? (
                        <span className="text-[10px] font-semibold text-slate-400">{timeLabel}</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[12px] font-extrabold leading-snug text-slate-900">
                      {row.title}
                    </span>
                  </span>
                </>
              );
              const navHref = resolveNewsmapHeadlineNavHref(row, navOpts);
              const useInMapActivate =
                (inMapOverlayMode && Boolean(onHeadlineClick)) ||
                (Boolean(onHeadlineClick) && isNewsmapRssOnlyHeadline(row));
              return (
                <li key={`${row.kind}-${row.city}-${row.href}`}>
                  {inMapOverlayMode && onHeadlineClick ? (
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-rose-100 hover:bg-white hover:shadow-md"
                      title={formatHmMapCityHeadlineLabel(row)}
                      onClick={(ev) => {
                        ev.preventDefault();
                        onHeadlineClick?.(row);
                      }}
                    >
                      {itemBody}
                    </button>
                  ) : useInMapActivate || onHeadlineClick ? (
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-rose-100 hover:bg-white hover:shadow-md"
                      title={formatHmMapCityHeadlineLabel(row)}
                      onClick={(ev) => {
                        ev.preventDefault();
                        onHeadlineClick?.(row);
                      }}
                    >
                      {itemBody}
                    </button>
                  ) : navHref ? (
                    <a
                      href={navHref}
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-rose-100 hover:bg-white hover:shadow-md"
                      title={formatHmMapCityHeadlineLabel(row)}
                    >
                      {itemBody}
                    </a>
                  ) : (
                    <div
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left opacity-90"
                      title={formatHmMapCityHeadlineLabel(row)}
                    >
                      {itemBody}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
