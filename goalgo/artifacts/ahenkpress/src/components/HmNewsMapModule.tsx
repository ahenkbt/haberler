import { useMemo } from "react";
import { Link } from "wouter";
import { MapPinned } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useHmMapCityNews } from "@/hooks/useHmMapCityNews";
import {
  formatHmMapCityHeadlineTime,
  normalizeHmMapCityKey,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import { buildHaberHaritasiCoordIndex } from "@/lib/haberHaritasiGeoFilter";
import {
  buildNewsmapDeepLinkHref,
  newsmapDeepLinkKeyFromHeadline,
} from "@/lib/haberHaritasiDeepLink";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import { resolveHeadlineBreakingLabel } from "@/lib/haberHaritasiHeadlineLabels";
import { filterNewsmapBottomBandHeadlines } from "@/lib/haberHaritasiNewsmapBottomBand";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { YEKPARE_NEWSMAP_PATH } from "@/lib/hmHaritalarRoutes";
import { apiUrl } from "@/lib/apiBase";
import "@/styles/hmNewsMapModule.css";

const TR_PREVIEW_BOUNDS = {
  south: 35.8,
  north: 42.2,
  west: 25.8,
  east: 44.8,
};

/** Türkiye bbox — OSM embed (staticmap.openstreetmap.de sık sık boş döner). */
const TR_PREVIEW_OSM_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=25.8%2C35.8%2C44.8%2C42.2&layer=mapnik";

type IlCenter = { adi: string; lat: number; lng: number; zoom: number };

function latLngToPreviewPosition(lat: number, lng: number): { left: string; top: string } {
  const x =
    ((lng - TR_PREVIEW_BOUNDS.west) / (TR_PREVIEW_BOUNDS.east - TR_PREVIEW_BOUNDS.west)) * 100;
  const y =
    ((TR_PREVIEW_BOUNDS.north - lat) / (TR_PREVIEW_BOUNDS.north - TR_PREVIEW_BOUNDS.south)) * 100;
  return {
    left: `${Math.max(5, Math.min(95, x)).toFixed(1)}%`,
    top: `${Math.max(8, Math.min(92, y)).toFixed(1)}%`,
  };
}

async function fetchTurkeyIlCenters(signal?: AbortSignal): Promise<IlCenter[]> {
  const res = await fetch(apiUrl("/map/turkey-il-centers"), { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    success?: boolean;
    data?: Array<{ adi?: string; lat?: number; lng?: number; zoom?: number }>;
  };
  if (!data.success || !Array.isArray(data.data)) return [];
  return data.data
    .map((row) => ({
      adi: String(row.adi ?? "").trim(),
      lat: Number(row.lat),
      lng: Number(row.lng),
      zoom: Number(row.zoom) || 10,
    }))
    .filter((row) => row.adi && Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

type HmNewsMapModuleProps = {
  siteId?: number | null;
  linkMode?: HaberHaritasiLinkMode;
  limit?: number;
  className?: string;
  accent?: string;
  title?: string;
};

/** Anasayfa gömülü haber haritası — mini önizleme + newsmap deep link. */
export function HmNewsMapModule({
  siteId = null,
  linkMode = "yekpare",
  limit = 8,
  className = "",
  accent = "#0284c7",
  title = "Haber Haritası",
}: HmNewsMapModuleProps) {
  const hmPublicHref = useHmPublicHref();
  const ilCentersQuery = useQuery({
    queryKey: ["/api/map/turkey-il-centers", "hm-news-map-module"],
    queryFn: ({ signal }) => fetchTurkeyIlCenters(signal),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const ilCenters = ilCentersQuery.data ?? [];
  const news = useHmMapCityNews(siteId, true, ilCenters, linkMode, hmPublicHref, { newsmap: true });
  const coordIndex = useMemo(() => buildHaberHaritasiCoordIndex(ilCenters), [ilCenters]);

  // Anasayfa modülü yalnızca Türkçe haberler göstersin (alt bant "Türkçe" sekmesiyle aynı sınıflandırma).
  const turkishHeadlines = useMemo(
    () => filterNewsmapBottomBandHeadlines(news.headlines, "turkce", limit),
    [news.headlines, limit],
  );
  const headlines = turkishHeadlines.slice(0, limit);
  const mapPins = useMemo(() => {
    return headlines
      .map((row) => {
        const coord = coordIndex.get(normalizeHmMapCityKey(row.city));
        if (!coord) return null;
        return { row, pos: latLngToPreviewPosition(coord.lat, coord.lng) };
      })
      .filter((x): x is { row: HmMapCityHeadline; pos: { left: string; top: string } } => x != null);
  }, [headlines, coordIndex]);

  const fullMapHref = hmPublicHref ? hmPublicHref(YEKPARE_NEWSMAP_PATH) : YEKPARE_NEWSMAP_PATH;

  if (!news.isLoading && headlines.length === 0) return null;

  return (
    <section
      className={`hm-news-map-module hm-vitrin-card ${className}`.trim()}
      aria-label={title}
      data-hm-home-module="newsMapModule"
    >
      <div className="hm-news-map-module__header">
        <div className="min-w-0">
          <p className="hm-news-map-module__eyebrow" style={{ color: accent }}>
            <MapPinned className="inline h-3.5 w-3.5" aria-hidden="true" /> Konum bazlı haberler
          </p>
          <h2 className="hm-news-map-module__title">{title}</h2>
          <p className="hm-news-map-module__subtitle">Son 24 saat</p>
        </div>
        <Link href={fullMapHref} className="hm-news-map-module__open-all">
          Tüm haritayı aç →
        </Link>
      </div>

      <div className="hm-news-map-module__body">
        <div className="hm-news-map-module__preview" aria-hidden={headlines.length === 0}>
          <iframe
            className="hm-news-map-module__preview-map"
            title=""
            src={TR_PREVIEW_OSM_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {mapPins.map(({ row, pos }) => (
            <Link
              key={`${row.kind}-${row.city}-${row.href}`}
              href={buildNewsmapDeepLinkHref(newsmapDeepLinkKeyFromHeadline(row), { hmPublicHref })}
              className={`hm-news-map-module__pin hm-news-map-module__pin--${row.kind}`}
              style={{ left: pos.left, top: pos.top }}
              title={row.title}
            >
              <span className="hm-news-map-module__pin-dot" />
              <span className="hm-news-map-module__pin-label">{row.city}</span>
            </Link>
          ))}
          {news.isLoading && headlines.length === 0 ? (
            <p className="hm-news-map-module__loading">Harita haberleri yükleniyor…</p>
          ) : null}
        </div>

        <div className="hm-news-map-module__list" role="list">
          {news.isLoading && headlines.length === 0
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={`sk-${i}`} className="hm-news-map-module__item hm-news-map-module__item--skeleton" />
              ))
            : headlines.slice(0, 5).map((row) => (
                <Link
                  key={row.href}
                  href={buildNewsmapDeepLinkHref(newsmapDeepLinkKeyFromHeadline(row), { hmPublicHref })}
                  role="listitem"
                  className={`hm-news-map-module__item hm-news-map-module__item--${row.kind}`}
                >
                  <span className="hm-news-map-module__item-tag">
                    {resolveHeadlineBreakingLabel(row)}
                  </span>
                  <span className="hm-news-map-module__item-city">{row.city}</span>
                  <span className="hm-news-map-module__item-title">{row.title}</span>
                  {row.publishedAt ? (
                    <span className="hm-news-map-module__item-time">
                      {formatHmMapCityHeadlineTime(row.publishedAt)}
                    </span>
                  ) : null}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
