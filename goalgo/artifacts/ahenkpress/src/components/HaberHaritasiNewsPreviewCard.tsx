import { X } from "lucide-react";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { formatHmMapCityHeadlineTime } from "@/lib/hmMapCityNews";
import { resolveHeadlineBreakingLabel } from "@/lib/haberHaritasiHeadlineLabels";

type HaberHaritasiNewsPreviewCardProps = {
  headline: HmMapCityHeadline | null;
  onClose: () => void;
  onReadMore: (headline: HmMapCityHeadline) => void;
};

function stopMapEvent(ev: React.MouseEvent | React.KeyboardEvent) {
  ev.stopPropagation();
}

/** Haber haritası — harita üstü kompakt haber/video bilgi kartı (1. adım). */
export function HaberHaritasiNewsPreviewCard({
  headline,
  onClose,
  onReadMore,
}: HaberHaritasiNewsPreviewCardProps) {
  if (!headline) return null;

  const isVideo = headline.kind === "video";
  const timeLabel = formatHmMapCityHeadlineTime(headline.publishedAt);
  const ctaLabel = isVideo ? "Videoyu izle" : "Haberi oku";

  const openOverlay = (ev: React.MouseEvent | React.KeyboardEvent) => {
    stopMapEvent(ev);
    onReadMore(headline);
  };

  return (
    <div
      className="haber-haritasi-news-preview"
      role="complementary"
      aria-label="Haber özeti"
      onClick={stopMapEvent}
      onMouseDown={stopMapEvent}
    >
      <article
        className="haber-haritasi-news-preview__card haber-haritasi-news-preview__card--clickable"
        role="button"
        tabIndex={0}
        onClick={openOverlay}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openOverlay(ev);
          }
        }}
      >
        <button
          type="button"
          className="haber-haritasi-news-preview__close"
          aria-label="Kapat"
          onClick={(ev) => {
            stopMapEvent(ev);
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {headline.thumbnail ? (
          <div
            className="haber-haritasi-news-preview__thumb"
            style={{ backgroundImage: `url(${headline.thumbnail})` }}
            role="img"
            aria-label={headline.title}
          >
            {isVideo ? (
              <span className="haber-haritasi-news-preview__play" aria-hidden="true">
                ▶
              </span>
            ) : null}
          </div>
        ) : (
          <div className="haber-haritasi-news-preview__thumb haber-haritasi-news-preview__thumb--fallback">
            <span aria-hidden="true">{isVideo ? "▶" : "📰"}</span>
          </div>
        )}

        <div className="haber-haritasi-news-preview__body">
          <div className="haber-haritasi-news-preview__meta">
            <span
              className={`haber-haritasi-news-preview__tag ${
                isVideo ? "haber-haritasi-news-preview__tag--video" : ""
              }`}
            >
              {resolveHeadlineBreakingLabel(headline)}
            </span>
            <span className="haber-haritasi-news-preview__location">
              {headline.flagEmoji ? `${headline.flagEmoji} ` : ""}
              {headline.city}
            </span>
            {timeLabel ? (
              <span className="haber-haritasi-news-preview__time">{timeLabel}</span>
            ) : null}
          </div>

          <h3 className="haber-haritasi-news-preview__title">{headline.title}</h3>

          <button
            type="button"
            className={`haber-haritasi-news-preview__cta ${
              isVideo ? "haber-haritasi-news-preview__cta--video" : ""
            }`}
            onClick={openOverlay}
          >
            {ctaLabel} →
          </button>
        </div>
      </article>
    </div>
  );
}
