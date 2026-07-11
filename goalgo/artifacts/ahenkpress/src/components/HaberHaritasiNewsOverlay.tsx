import { useEffect, useMemo, type CSSProperties } from "react";
import { Link } from "wouter";
import { ExternalLink, X } from "lucide-react";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  formatHmMapCityHeadlineExcerpt,
  formatHmMapCityHeadlineTime,
} from "@/lib/hmMapCityNews";
import { resolveNewsmapOverlaySourceUrl } from "@/lib/haberHaritasiOverlaySourceUrl";
import { classifyNewsmapBottomBandHeadline } from "@/lib/haberHaritasiNewsmapBottomBand";
import { resolveHeadlineBreakingLabel } from "@/lib/haberHaritasiHeadlineLabels";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HaberHaritasiVideoEmbed } from "@/components/HaberHaritasiVideoEmbed";
import { NewsArticleBody } from "@/components/NewsArticleBody";
import { useNewsmapOverlayArticle } from "@/hooks/useNewsmapOverlayArticle";
import {
  newsmapOverlayHasFullBody,
  resolveNewsmapOverlayVideoId,
  resolveNewsmapOverlayVideoSourceUrl,
} from "@/lib/newsmapOverlayArticle";
import { resolveClientMediaSrc } from "@/lib/apiBase";

type HaberHaritasiNewsOverlayProps = {
  headline: HmMapCityHeadline | null;
  onClose: () => void;
  onBeforeNavigate?: (headline: HmMapCityHeadline) => void;
  /** Newsmap — haber/video tam içerik harita üstünde, site dışına çıkma. */
  fullArticleMode?: boolean;
  /** Konum alt bağlantıları — yan panel sekmelerini açar. */
  onOpenLocationNews?: (cityLabel: string, headline: HmMapCityHeadline) => void;
  onOpenLocationVideos?: (cityLabel: string, headline: HmMapCityHeadline) => void;
  onOpenLocationBusinesses?: (cityLabel: string, headline: HmMapCityHeadline) => void;
  onOpenLocationInfo?: (cityLabel: string, headline: HmMapCityHeadline) => void;
  /** Konum etiketine tıklanınca — haritada o şehre git + panel aç. */
  onLocationActivate?: (headline: HmMapCityHeadline) => void;
};

function stopMapEvent(ev: React.MouseEvent | React.KeyboardEvent) {
  ev.stopPropagation();
}

/** Haber haritası — harita üstü yüzen haber/video kartı (site içi navigasyon yok). */
export function HaberHaritasiNewsOverlay({
  headline,
  onClose,
  onBeforeNavigate,
  fullArticleMode = false,
  onOpenLocationNews,
  onOpenLocationVideos,
  onOpenLocationBusinesses,
  onOpenLocationInfo,
  onLocationActivate,
}: HaberHaritasiNewsOverlayProps) {
  const hmCtx = useHmPublicLinkContextOptional();
  const hmPublicHref = useHmPublicHref();
  const siteId = hmCtx?.siteId ?? null;
  const { data: articleData, isPending: articleLoading } = useNewsmapOverlayArticle(
    headline,
    siteId,
    fullArticleMode,
  );

  useEffect(() => {
    if (!headline) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [headline, onClose]);

  const resolvedVideoId = useMemo(
    () => (headline ? resolveNewsmapOverlayVideoId(headline) : null),
    [headline],
  );

  useEffect(() => {
    if (!headline || headline.kind !== "video" || !resolvedVideoId) return;
    onBeforeNavigate?.(headline);
  }, [headline, onBeforeNavigate, resolvedVideoId]);

  const heroImage = useMemo(() => {
    const raw = articleData?.imageUrl || headline?.thumbnail || null;
    if (!raw) return null;
    return resolveClientMediaSrc(raw) || raw;
  }, [articleData?.imageUrl, headline?.thumbnail]);

  if (!headline) return null;

  const isVideo = headline.kind === "video";
  const inMapBoxMode = fullArticleMode;
  const timeLabel = formatHmMapCityHeadlineTime(headline.publishedAt);
  const excerpt = formatHmMapCityHeadlineExcerpt(headline);
  const externalSourceUrl = !isVideo
    ? resolveNewsmapOverlaySourceUrl(headline, hmPublicHref ?? undefined, {
        linkMode: hmCtx ? "hm-editor" : "yekpare",
        currentSiteId: siteId,
      })
    : null;
  const videoSourceUrl = isVideo
    ? resolveNewsmapOverlayVideoSourceUrl(headline, hmPublicHref ?? undefined)
    : null;
  const isGlobalWorldBrief = !isVideo && classifyNewsmapBottomBandHeadline(headline) === "global";
  const worldBriefsHref = hmPublicHref("/kisa-kisa");
  const sourceLabel =
    articleData?.feedLabel?.trim() ||
    headline.feedLabel?.trim() ||
    (isVideo ? "YekTube" : headline.source === "rss" ? "RSS" : null);
  const showVideoEmbed = isVideo && Boolean(resolvedVideoId);
  const locationLabel = String(headline.city ?? "").trim();
  const showLocationLinks = Boolean(
    locationLabel &&
      (onOpenLocationNews || onOpenLocationVideos || onOpenLocationBusinesses || onOpenLocationInfo),
  );

  const articleTitle = articleData?.title?.trim() || headline.title;
  const articleSpot = articleData?.spot?.trim() || excerpt || null;
  const articleBodyHtml = articleData?.bodyHtml ?? null;
  const showFullBody = inMapBoxMode && !isVideo && newsmapOverlayHasFullBody(articleData ?? null);

  return (
    <div
      className={`haber-haritasi-news-overlay${
        inMapBoxMode ? " haber-haritasi-news-overlay--full-article" : ""
      }${inMapBoxMode && isVideo ? " haber-haritasi-news-overlay--video-box" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={isVideo ? "Video oynatıcı" : "Haber detayı"}
      onClick={stopMapEvent}
      onMouseDown={stopMapEvent}
    >
      <button
        type="button"
        className="haber-haritasi-news-overlay__scrim"
        aria-label="Kapat"
        onClick={(ev) => {
          stopMapEvent(ev);
          onClose();
        }}
      />
      <article
        className={`haber-haritasi-news-overlay__card${
          showVideoEmbed ? " haber-haritasi-news-overlay__card--video-embed" : ""
        }${inMapBoxMode ? " haber-haritasi-news-overlay__card--full-article" : ""}${
          inMapBoxMode && isVideo ? " haber-haritasi-news-overlay__card--video-box" : ""
        }`}
      >
        <button
          type="button"
          className="haber-haritasi-news-overlay__close"
          aria-label="Kapat"
          onClick={(ev) => {
            stopMapEvent(ev);
            onClose();
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {showVideoEmbed ? (
          <HaberHaritasiVideoEmbed videoId={resolvedVideoId!} title={headline.title} />
        ) : heroImage ? (
          <div
            className="haber-haritasi-news-overlay__media"
            style={{ backgroundImage: `url(${heroImage})` }}
            role="img"
            aria-label={articleTitle}
          >
            {isVideo ? <span className="haber-haritasi-news-overlay__play" aria-hidden="true">▶</span> : null}
          </div>
        ) : null}

        <div className="haber-haritasi-news-overlay__body">
          <div className="haber-haritasi-news-overlay__meta">
            <span
              className={`haber-haritasi-news-overlay__tag ${
                isVideo ? "haber-haritasi-news-overlay__tag--video" : ""
              }`}
            >
              {resolveHeadlineBreakingLabel(headline)}
            </span>
            <span className="haber-haritasi-news-overlay__location">
              {onLocationActivate ? (
                <button
                  type="button"
                  className="haber-haritasi-news-overlay__location-btn"
                  onClick={(ev) => {
                    stopMapEvent(ev);
                    onLocationActivate(headline);
                  }}
                >
                  {headline.flagEmoji ? `${headline.flagEmoji} ` : ""}
                  {headline.city}
                </button>
              ) : (
                <>
                  {headline.flagEmoji ? `${headline.flagEmoji} ` : ""}
                  {headline.city}
                </>
              )}
            </span>
            {timeLabel ? <span className="haber-haritasi-news-overlay__time">{timeLabel}</span> : null}
          </div>

          <h3 className="haber-haritasi-news-overlay__title">{articleTitle}</h3>

          {inMapBoxMode ? (
            <>
              {isVideo ? (
                articleSpot ? <p className="haber-haritasi-news-overlay__spot">{articleSpot}</p> : null
              ) : (
                <>
                  {articleLoading && !articleBodyHtml ? (
                    <p className="haber-haritasi-news-overlay__loading">Haber yükleniyor…</p>
                  ) : null}
                  {articleSpot ? (
                    <p className="haber-haritasi-news-overlay__spot">{articleSpot}</p>
                  ) : null}
                  {showFullBody && articleBodyHtml ? (
                    <NewsArticleBody
                      html={articleBodyHtml}
                      className="haber-haritasi-news-overlay__article-body yekpare-rich-content yekpare-news-body prose prose-sm max-w-none text-slate-700 leading-relaxed
                        prose-p:mb-[0.85em] prose-img:rounded-lg prose-img:w-full prose-img:my-3
                        [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg"
                      style={{ "--article-link": "#0284c7" } as CSSProperties}
                    />
                  ) : !articleLoading && articleSpot ? null : !articleLoading && excerpt ? (
                    <p className="haber-haritasi-news-overlay__excerpt">{excerpt}</p>
                  ) : null}
                </>
              )}
            </>
          ) : !showVideoEmbed && excerpt ? (
            <p className="haber-haritasi-news-overlay__excerpt">{excerpt}</p>
          ) : null}

          {!inMapBoxMode && sourceLabel ? (
            <p className="haber-haritasi-news-overlay__source">Kaynak: {sourceLabel}</p>
          ) : null}

          {!inMapBoxMode ? (
            <div className="haber-haritasi-news-overlay__actions">
              {isVideo && headline.href ? (
                <Link
                  href={headline.href}
                  className="haber-haritasi-news-overlay__cta haber-haritasi-news-overlay__cta--video"
                  onClick={(ev) => {
                    stopMapEvent(ev);
                    onBeforeNavigate?.(headline);
                  }}
                >
                  YekTube&apos;da aç →
                </Link>
              ) : null}

              {externalSourceUrl ? (
                <a
                  href={externalSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="haber-haritasi-news-overlay__cta haber-haritasi-news-overlay__cta--external"
                  onClick={stopMapEvent}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Kaynağı yeni sekmede aç
                </a>
              ) : null}

              {isGlobalWorldBrief ? (
                <Link
                  href={worldBriefsHref}
                  className="haber-haritasi-news-overlay__cta haber-haritasi-news-overlay__cta--world-briefs"
                  onClick={(ev) => {
                    stopMapEvent(ev);
                    onBeforeNavigate?.(headline);
                  }}
                >
                  World Briefs →
                </Link>
              ) : null}
            </div>
          ) : null}

          {inMapBoxMode ? (
            <div className="haber-haritasi-news-overlay__footer">
              {isVideo && videoSourceUrl ? (
                <a
                  href={videoSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="haber-haritasi-news-overlay__source-link"
                  onClick={stopMapEvent}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Kaynak: {sourceLabel || "YekTube"}</span>
                </a>
              ) : externalSourceUrl ? (
                <a
                  href={externalSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="haber-haritasi-news-overlay__source-link"
                  onClick={stopMapEvent}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Kaynak{sourceLabel ? `: ${sourceLabel}` : ""}
                  </span>
                </a>
              ) : sourceLabel ? (
                <p className="haber-haritasi-news-overlay__source-footnote">Kaynak: {sourceLabel}</p>
              ) : null}
            </div>
          ) : null}

          {showLocationLinks ? (
            <div className="haber-haritasi-news-overlay__location-links">
              <p className="haber-haritasi-news-overlay__location-links-title">
                {locationLabel} — keşfet
              </p>
              <div className="haber-haritasi-news-overlay__location-links-row">
                {onOpenLocationNews ? (
                  <button
                    type="button"
                    className="haber-haritasi-news-overlay__location-link"
                    onClick={(ev) => {
                      stopMapEvent(ev);
                      onOpenLocationNews(locationLabel, headline);
                    }}
                  >
                    Haberler
                  </button>
                ) : null}
                {onOpenLocationVideos ? (
                  <button
                    type="button"
                    className="haber-haritasi-news-overlay__location-link"
                    onClick={(ev) => {
                      stopMapEvent(ev);
                      onOpenLocationVideos(locationLabel, headline);
                    }}
                  >
                    Videolar
                  </button>
                ) : null}
                {onOpenLocationBusinesses ? (
                  <button
                    type="button"
                    className="haber-haritasi-news-overlay__location-link"
                    onClick={(ev) => {
                      stopMapEvent(ev);
                      onOpenLocationBusinesses(locationLabel, headline);
                    }}
                  >
                    İşletmeler
                  </button>
                ) : null}
                {onOpenLocationInfo ? (
                  <button
                    type="button"
                    className="haber-haritasi-news-overlay__location-link"
                    onClick={(ev) => {
                      stopMapEvent(ev);
                      onOpenLocationInfo(locationLabel, headline);
                    }}
                  >
                    Şehir bilgi
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
