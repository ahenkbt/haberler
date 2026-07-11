import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { resolveHeadlineBreakingLabel } from "@/lib/haberHaritasiHeadlineLabels";
import { truncateHmMapNewsText, type HaberHaritasiContentKind } from "@/lib/hmMapCityNews";
import type { HaberHaritasiLocation } from "@/lib/haberHaritasiLocations";

export function escapeHaberHaritasiMarkerHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type HaberHaritasiMarkerContent = {
  title: string;
  kind?: HaberHaritasiContentKind;
  thumbnail?: string | null;
  feedLabel?: string | null;
};

function buildContentBadgeHtml(content: HaberHaritasiMarkerContent): string {
  const isVideo = content.kind === "video";
  const kicker = resolveHeadlineBreakingLabel({
    title: content.title,
    feedLabel: content.feedLabel ?? null,
    kind: isVideo ? "video" : "news",
  });
  const badgeClass = isVideo
    ? "hm-map-marker-content-badge hm-map-marker-content-badge--video"
    : "hm-map-marker-content-badge hm-map-marker-content-badge--news";
  const thumb = content.thumbnail?.trim();
  const thumbHtml =
    isVideo && thumb
      ? `<span class="hm-map-marker-content-badge__thumb" style="background-image:url('${escapeHaberHaritasiMarkerHtml(thumb)}')"></span>`
      : isVideo
        ? `<span class="hm-map-marker-content-badge__play" aria-hidden="true">▶</span>`
        : "";
  return (
    `<div class="${badgeClass}" title="${escapeHaberHaritasiMarkerHtml(content.title)}">` +
    `${thumbHtml}` +
    `<span class="hm-map-marker-content-badge__body">` +
    `<span class="hm-map-marker-content-badge__kicker">${kicker}</span>` +
    `<span class="hm-map-marker-content-badge__text">${escapeHaberHaritasiMarkerHtml(truncateHmMapNewsText(content.title, 52))}</span>` +
    `</span></div>`
  );
}

export type HaberHaritasiMarkerIconOptions = {
  /** Haber rozeti yerine yalnızca pin — newsmap tam ekran görünümü. */
  pinOnly?: boolean;
  /** Yakın zoom callout — rozet + pin yok, yalnızca yüzen kart. */
  calloutOnly?: boolean;
  /** Aynı konumda birden fazla haber/video — küme sayacı. */
  count?: number;
};

export function buildHaberHaritasiMarkerIconHtml(
  location: Pick<HaberHaritasiLocation, "countryCode" | "label">,
  content?: HaberHaritasiMarkerContent | null,
  options?: HaberHaritasiMarkerIconOptions,
): { html: string; iconSize: [number, number]; iconAnchor: [number, number]; className: string } {
  const flag = countryCodeToFlagEmoji(location.countryCode);
  const flagHtml = `<span class="hm-map-marker-flag-emoji" aria-hidden="true">${flag}</span>`;
  const pinOnly = options?.pinOnly === true;
  const calloutOnly = options?.calloutOnly === true;
  const count = Number(options?.count);
  const countBadge =
    Number.isFinite(count) && count > 1
      ? `<span class="hm-map-marker-pin__count" aria-label="${count} haber">${count}</span>`
      : "";

  if (!content?.title) {
    return {
      html: `<div class="hm-map-marker-pin">${flagHtml}${countBadge}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "haber-haritasi-pin",
    };
  }

  const withContentClass = content.kind === "video" ? " haber-haritasi-pin--with-video" : " haber-haritasi-pin--with-news";
  const hasThumb = content.kind === "video" && Boolean(content.thumbnail?.trim());
  const calloutWidth = hasThumb ? 168 : 152;
  const calloutHeight = 52;

  if (calloutOnly) {
    return {
      html: buildContentBadgeHtml(content),
      iconSize: [calloutWidth, calloutHeight],
      iconAnchor: [calloutWidth / 2, calloutHeight - 4],
      className: `haber-haritasi-pin haber-haritasi-pin--callout-only${withContentClass}`,
    };
  }

  if (pinOnly) {
    const pinClass =
      content.kind === "video"
        ? "hm-map-marker-pin hm-map-marker-pin--with-video"
        : "hm-map-marker-pin hm-map-marker-pin--with-news";
    return {
      html: `<div class="${pinClass}">${flagHtml}${countBadge}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: `haber-haritasi-pin haber-haritasi-pin--pin-only${withContentClass}`,
    };
  }

  return {
    html:
      `<div class="hm-map-marker-stack">` +
      buildContentBadgeHtml(content) +
      `<div class="hm-map-marker-pin hm-map-marker-pin--with-news">${flagHtml}</div>` +
      `</div>`,
    iconSize: content.kind === "video" && content.thumbnail ? [168, 62] : [152, 62],
    iconAnchor: content.kind === "video" && content.thumbnail ? [84, 56] : [76, 56],
    className: `haber-haritasi-pin haber-haritasi-pin--with-content${withContentClass}`,
  };
}

/** @deprecated use HaberHaritasiMarkerContent */
export type HaberHaritasiMarkerNews = HaberHaritasiMarkerContent;
