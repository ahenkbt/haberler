import { useMemo, useRef } from "react";
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
  resolveHaberHaritasiAllVideosHref,
  type HaberHaritasiLinkMode,
} from "@/lib/haberHaritasiLinks";
import type { NewsmapBottomBandTab } from "@/lib/haberHaritasiNewsmapBottomBand";
import { resolveBottomBandPanelTitle } from "@/lib/haberHaritasiHeadlineLabels";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

export type NewsmapBottomBandKindTab = "all" | "news" | "video" | "info";

type HmMapCityNewsPanelProps = {
  headlines: HmMapCityHeadline[];
  isLoading?: boolean;
  linkMode?: HaberHaritasiLinkMode;
  className?: string;
  /** Seçili konum etiketi — alt şerit başlığında gösterilir. */
  cityLabel?: string | null;
  onHeadlineClick?: (headline: HmMapCityHeadline) => void;
  onCityClick?: (headline: HmMapCityHeadline) => void;
  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */
  inMapOverlayMode?: boolean;
  onClearCity?: () => void;
  /** Alt bant dil sekmeleri — yalnızca newsmap. */
  showLangTabs?: boolean;
  langTab?: NewsmapBottomBandTab;
  onLangTabChange?: (tab: NewsmapBottomBandTab) => void;
  /** Alt bant içerik sekmeleri — Haberler / Videolar / Bilgi. */
  showKindTabs?: boolean;
  kindTab?: NewsmapBottomBandKindTab;
  onKindTabChange?: (tab: NewsmapBottomBandKindTab) => void;
  /** Konum boşken Bilgi / İşletmeler kısayolları. */
  onOpenBilgi?: () => void;
  onOpenBusinesses?: () => void;
  bilgiHref?: string | null;
  onShowAllClick?: () => void;
};

function formatHeadlineTime(publishedAt?: string | null): string {
  if (!publishedAt) return "";
  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return "";
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} sa`;
  return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function scrollStrip(el: HTMLDivElement | null, direction: -1 | 1) {
  if (!el) return;
  el.scrollBy({ left: direction * 260, behavior: "smooth" });
}

/** Haber haritası — harita altında yatay kaydırmalı son dakika haber şeridi. */
const BOTTOM_BAND_TABS: Array<{ key: NewsmapBottomBandTab; label: string }> = [
  { key: "turkce", label: "Türkçe" },
  { key: "global", label: "Global" },
];

const BOTTOM_BAND_KIND_TABS: Array<{ key: NewsmapBottomBandKindTab; label: string; icon: string }> = [
  { key: "all", label: "Tümü", icon: "🌍" },
  { key: "news", label: "Haberler", icon: "📰" },
  { key: "video", label: "Videolar", icon: "▶️" },
  { key: "info", label: "Bilgi", icon: "ℹ️" },
];

export function HmMapCityNewsPanel({
  headlines,
  isLoading = false,
  linkMode = "yekpare",
  className = "",
  cityLabel = null,
  onHeadlineClick,
  onCityClick,
  inMapOverlayMode = false,
  onClearCity,
  showLangTabs = false,
  langTab = "turkce",
  onLangTabChange,
  showKindTabs = false,
  kindTab = "all",
  onKindTabChange,
  onOpenBilgi,
  onOpenBusinesses,
  bilgiHref = null,
  onShowAllClick,
}: HmMapCityNewsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const allVideosHref = resolveHaberHaritasiAllVideosHref(linkMode, hmPublicHref);
  const worldBriefsHref = hmPublicHref("/kisa-kisa");

  return (
    <section
      className={`hm-map-city-news-panel shrink-0 border-t border-sky-100/90 bg-gradient-to-b from-white to-sky-50/40 px-3 py-2 shadow-[0_-6px_20px_rgba(14,165,233,0.07)] sm:px-4 ${className}`.trim()}
      aria-label="Son dakika haberleri"
    >
      <div className="mx-auto flex max-w-screen-xl flex-col gap-1.5">
        <div className="hm-map-city-news-panel__header flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Haber Haritası</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-xs font-black text-slate-900 sm:text-[13px]">
                {resolveBottomBandPanelTitle(cityLabel, langTab === "global" ? "global" : "turkce")}
              </h2>
              {showLangTabs ? (
                <div
                  className="hm-map-city-news-panel__lang-tabs flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200/90 bg-white/90 p-0.5 shadow-sm"
                  role="tablist"
                  aria-label="Haber dili"
                >
                  {BOTTOM_BAND_TABS.map((row) => (
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
            </div>
          </div>
          {showKindTabs ? (
            <div
              className="hm-map-city-news-panel__kind-tabs flex w-full flex-wrap items-center gap-1 sm:w-auto"
              role="tablist"
              aria-label="İçerik türü"
            >
              {BOTTOM_BAND_KIND_TABS.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  role="tab"
                  aria-selected={kindTab === row.key}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black transition ${
                    kindTab === row.key
                      ? row.key === "video"
                        ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                        : row.key === "info"
                          ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
                          : row.key === "news"
                            ? "border-rose-300 bg-rose-600 text-white shadow-sm"
                            : "border-sky-300 bg-sky-600 text-white shadow-sm"
                      : "border-slate-200/90 bg-white/90 text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => onKindTabChange?.(row.key)}
                >
                  <span aria-hidden="true">{row.icon}</span>
                  {row.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-1.5">
            {cityLabel && onClearCity ? (
              <button
                type="button"
                className="hm-map-city-news-panel__clear-city hidden sm:inline-flex"
                onClick={onClearCity}
              >
                Tümü
              </button>
            ) : null}
            <button
              type="button"
              className="hm-map-city-news-panel__nav-btn"
              aria-label="Önceki haberler"
              onClick={() => scrollStrip(scrollRef.current, -1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="hm-map-city-news-panel__nav-btn"
              aria-label="Sonraki haberler"
              onClick={() => scrollStrip(scrollRef.current, 1)}
            >
              ›
            </button>
            {inMapOverlayMode && onShowAllClick ? (
              <button
                type="button"
                className="hm-map-city-news-panel__all-link hidden sm:inline-flex"
                onClick={onShowAllClick}
              >
                Tüm haberleri gör
              </button>
            ) : (
              <Link href={allNewsHref} className="hm-map-city-news-panel__all-link hidden sm:inline-flex">
                Tüm haberleri gör
              </Link>
            )}
            {showLangTabs && langTab === "global" ? (
              <Link href={worldBriefsHref} className="hm-map-city-news-panel__all-link hidden sm:inline-flex">
                World Briefs
              </Link>
            ) : null}
            <Link
              href={allVideosHref}
              className="hm-map-city-news-panel__all-link hm-map-city-news-panel__all-link--video hidden md:inline-flex"
            >
              Video TV
            </Link>
          </div>
        </div>

        {kindTab === "info" ? (
          <div className="py-2">
            <p className="text-[11px] font-semibold text-slate-600">
              {cityLabel
                ? `${cityLabel} için Bilgi Ağacı ve konum bilgileri`
                : "Haritada bir konum seçin veya yakınlaştırın"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bilgiHref ? (
                <Link
                  href={bilgiHref}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  ℹ️ Bilgi Ağacı
                </Link>
              ) : onOpenBilgi ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                  onClick={onOpenBilgi}
                >
                  ℹ️ Bilgi Ağacı
                </button>
              ) : null}
              {onOpenBusinesses ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                  onClick={() => onOpenBusinesses()}
                >
                  🏪 İşletmeler
                </button>
              ) : null}
            </div>
          </div>
        ) : isLoading && headlines.length === 0 ? (
          <p className="py-2 text-[11px] font-semibold text-slate-500">Haberler yükleniyor…</p>
        ) : headlines.length === 0 ? (
          <div className="py-2">
            <p className="text-[11px] font-semibold text-slate-500">
              {langTab === "global"
                ? "Bu konumda İngilizce / küresel haber bulunamadı."
                : "Bu sekmede eşleşen haber veya video bulunamadı."}
            </p>
            {cityLabel ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bilgiHref ? (
                  <Link
                    href={bilgiHref}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100"
                  >
                    ℹ️ Bilgi Ağacı
                  </Link>
                ) : onOpenBilgi ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100"
                    onClick={onOpenBilgi}
                  >
                    ℹ️ Bilgi Ağacı
                  </button>
                ) : null}
                {onOpenBusinesses ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    onClick={() => onOpenBusinesses()}
                  >
                    🏪 İşletmeler
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="hm-map-city-news-panel__strip -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5"
            role="list"
          >
            {headlines.map((row) => {
              const timeLabel = formatHeadlineTime(row.publishedAt);
              const cardClass = `hm-map-city-news-panel__card group ${
                row.kind === "video" ? "hm-map-city-news-panel__card--video" : ""
              }`;
              const cardBody = (
                <>
                  <span className="hm-map-city-news-panel__thumb" aria-hidden="true">
                    {row.thumbnail ? (
                      <span
                        className="hm-map-city-news-panel__thumb-img"
                        style={{ backgroundImage: `url(${row.thumbnail})` }}
                      />
                    ) : row.flagEmoji ? (
                      <span className="hm-map-city-news-panel__thumb-emoji">{row.flagEmoji}</span>
                    ) : (
                      <span className="hm-map-city-news-panel__thumb-fallback">
                        {row.kind === "video" ? "▶" : "📰"}
                      </span>
                    )}
                    {row.kind === "video" ? (
                      <span className="hm-map-city-news-panel__play-badge" aria-hidden="true">
                        ▶
                      </span>
                    ) : null}
                  </span>
                  <span className="hm-map-city-news-panel__body">
                    <span className="hm-map-city-news-panel__meta">
                      <span
                        className={`hm-map-city-news-panel__tag ${
                          row.kind === "video" ? "hm-map-city-news-panel__tag--video" : ""
                        }${onCityClick ? " hm-map-city-news-panel__tag--clickable" : ""}`}
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
                        <span className="hm-map-city-news-panel__time">{timeLabel}</span>
                      ) : null}
                    </span>
                    <span className="hm-map-city-news-panel__title">{row.title}</span>
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
                    key={`${row.kind}-${row.city}-${row.href}`}
                    type="button"
                    role="listitem"
                    className={cardClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {cardBody}
                  </button>
                );
              }
              if (useInMapActivate || onHeadlineClick) {
                return (
                  <button
                    key={`${row.kind}-${row.city}-${row.href}`}
                    type="button"
                    role="listitem"
                    className={cardClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {cardBody}
                  </button>
                );
              }
              if (!navHref) {
                return (
                  <div
                    key={`${row.kind}-${row.city}-${row.href}`}
                    role="listitem"
                    className={`${cardClass} cursor-default opacity-90`}
                    title={formatHmMapCityHeadlineLabel(row)}
                  >
                    {cardBody}
                  </div>
                );
              }
              return (
                <WorldBriefLink
                  key={`${row.kind}-${row.city}-${row.href}`}
                  href={navHref}
                  role="listitem"
                  className={cardClass}
                  title={formatHmMapCityHeadlineLabel(row)}
                >
                  {cardBody}
                </WorldBriefLink>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 sm:hidden">
          {inMapOverlayMode && onShowAllClick ? (
            <button
              type="button"
              className="hm-map-city-news-panel__all-link hm-map-city-news-panel__all-link--compact"
              onClick={onShowAllClick}
            >
              Tüm haberleri gör →
            </button>
          ) : (
            <Link href={allNewsHref} className="hm-map-city-news-panel__all-link hm-map-city-news-panel__all-link--compact">
              Tüm haberleri gör →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
