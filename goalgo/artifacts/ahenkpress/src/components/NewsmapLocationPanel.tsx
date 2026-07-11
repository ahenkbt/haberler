import { useEffect, useMemo, useState } from "react";
import { MapPanelCloseButton } from "@/components/MapPanelCloseButton";
import { NewsmapLocationInfoPanel } from "@/components/NewsmapLocationInfoPanel";
import { NewsmapSidebarPanel } from "@/components/NewsmapSidebarPanel";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  fetchNewsmapLocationWikiSummary,
  type NewsmapWikiSummary,
} from "@/lib/newsmapLocationWiki";

export type NewsmapLocationPanelTab = "news" | "video" | "businesses" | "info";

const TABS: Array<{ key: NewsmapLocationPanelTab; label: string }> = [
  { key: "news", label: "Haberler" },
  { key: "video", label: "Videolar" },
  { key: "info", label: "Bilgi" },
  { key: "businesses", label: "İşletmeler" },
];

type NewsmapLocationPanelProps = {
  locationLabel: string | null;
  activeTab: NewsmapLocationPanelTab;
  onTabChange: (tab: NewsmapLocationPanelTab) => void;
  headlines: HmMapCityHeadline[];
  isLoading?: boolean;
  onHeadlineClick?: (headline: HmMapCityHeadline) => void;
  onCityClick?: (headline: HmMapCityHeadline) => void;
  inMapOverlayMode?: boolean;
  onClose?: () => void;
  businessesSlot?: React.ReactNode;
  infoSlot?: React.ReactNode;
  /** Alt satır — ülke veya bölge (ör. "Türkiye"). */
  countryLabel?: string | null;
  /** Hava durumu özeti (ör. "☀️ 24°C"). */
  weatherLabel?: string | null;
  weatherLoading?: boolean;
  /** Panorama / hero görselleri (konum zenginleştirmeden). */
  heroImageUrls?: string[];
  heroLoading?: boolean;
  bilgiHref?: string | null;
  newsCount?: number;
  videoCount?: number;
  /** Haber haritasında işletme sekmesini gizle (arka planda DB senkronu devam eder). */
  hideBusinessesTab?: boolean;
  /** Haber haritasında video sekmesini gizle — videolar alt kayar bantta. */
  hideVideosTab?: boolean;
  /** Şehir kartı başlığında hava durumu rozeti gösterme. */
  hideWeather?: boolean;
};

function parseLocationHeader(locationLabel: string | null, countryLabel?: string | null) {
  const raw = String(locationLabel ?? "").trim();
  if (!raw) {
    return { city: "Harita konumu", country: countryLabel?.trim() || null };
  }
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: countryLabel?.trim() || parts.slice(1).join(", "),
    };
  }
  return { city: raw, country: countryLabel?.trim() || null };
}

/** Haber haritası — yekpare şehir kartı: başlık, hero, sekmeler, zengin içerik. */
export function NewsmapLocationPanel({
  locationLabel,
  activeTab,
  onTabChange,
  headlines,
  isLoading = false,
  onHeadlineClick,
  onCityClick,
  inMapOverlayMode = false,
  onClose,
  businessesSlot = null,
  infoSlot = null,
  countryLabel = null,
  weatherLabel = null,
  weatherLoading = false,
  heroImageUrls = [],
  heroLoading = false,
  bilgiHref = null,
  newsCount,
  videoCount,
  hideBusinessesTab = false,
  hideVideosTab = false,
  hideWeather = false,
}: NewsmapLocationPanelProps) {
  const { city, country } = parseLocationHeader(locationLabel, countryLabel);
  const [wiki, setWiki] = useState<NewsmapWikiSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoResetKey = (locationLabel ?? "").split(",")[0]?.trim().toLocaleLowerCase("tr-TR") ?? "";

  useEffect(() => {
    setPhotoIdx(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoResetKey, heroImageUrls.join("|")]);

  /**
   * Etiket ("Ankara" ↔ "Ankara, Türkiye" ↔ "Çankaya") her rafine edildiğinde
   * wiki'yi sıfırlayıp yeniden çekme — şehir anahtarı değişmediyse mevcut özet kalsın.
   * Aksi halde bilgi kartı sürekli "yükleniyor"a dönüp titriyordu.
   */
  const wikiCityKey = (locationLabel ?? "").split(",")[0]?.trim().toLocaleLowerCase("tr-TR") ?? "";
  useEffect(() => {
    if (!wikiCityKey) {
      setWiki(null);
      setWikiLoading(false);
      return;
    }
    let cancelled = false;
    setWikiLoading(true);
    void fetchNewsmapLocationWikiSummary(wikiCityKey)
      .then((result) => {
        if (!cancelled) setWiki(result);
      })
      .catch(() => {
        if (!cancelled) setWiki(null);
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wikiCityKey]);

  const gallery = useMemo(() => {
    const urls = heroImageUrls.filter((url) => String(url || "").trim().length > 8);
    if (urls.length > 0) return urls;
    if (wiki?.image) return [wiki.image];
    return [];
  }, [heroImageUrls, wiki?.image]);

  const activePhoto = gallery[photoIdx] || gallery[0] || null;
  const sidebarMode = activeTab === "video" ? "video" : activeTab === "news" ? "news" : "all";
  const resolvedNewsCount = newsCount ?? headlines.filter((row) => row.kind === "news").length;
  const resolvedVideoCount = videoCount ?? headlines.filter((row) => row.kind === "video").length;

  const tabBadge = (tab: NewsmapLocationPanelTab): number | null => {
    if (tab === "news" && resolvedNewsCount > 0) return resolvedNewsCount;
    if (tab === "video" && resolvedVideoCount > 0) return resolvedVideoCount;
    return null;
  };

  const visibleTabs = TABS.filter((tab) => {
    if (hideBusinessesTab && tab.key === "businesses") return false;
    if (hideVideosTab && tab.key === "video") return false;
    return true;
  });

  const weatherPill = hideWeather
    ? null
    : weatherLoading
      ? "Hava durumu yükleniyor…"
      : weatherLabel?.trim() || null;

  return (
    <div className="newsmap-location-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="newsmap-location-panel__card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="newsmap-location-panel__header shrink-0">
          <div className="newsmap-location-panel__header-row">
            <div className="newsmap-location-panel__title-block min-w-0">
              <p className="newsmap-location-panel__city truncate">{city}</p>
              {country ? (
                <p className="newsmap-location-panel__country truncate">{country}</p>
              ) : null}
            </div>
            <div className="newsmap-location-panel__header-actions shrink-0">
              {weatherPill ? (
                <span className="newsmap-location-panel__weather">{weatherPill}</span>
              ) : null}
              {onClose ? (
                <MapPanelCloseButton onClick={onClose} className="haritalar-map-panel-close--inline-header" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="newsmap-location-panel__hero shrink-0">
          {activePhoto ? (
            <div className="newsmap-location-panel__hero-media relative h-36 w-full overflow-hidden bg-slate-100">
              <img
                src={activePhoto}
                alt={city}
                className="h-full w-full object-cover"
                onError={(ev) => {
                  (ev.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {gallery.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Önceki fotoğraf"
                    className="newsmap-location-panel__hero-nav newsmap-location-panel__hero-nav--prev"
                    onClick={() => setPhotoIdx((idx) => (idx - 1 + gallery.length) % gallery.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Sonraki fotoğraf"
                    className="newsmap-location-panel__hero-nav newsmap-location-panel__hero-nav--next"
                    onClick={() => setPhotoIdx((idx) => (idx + 1) % gallery.length)}
                  >
                    ›
                  </button>
                  <div className="newsmap-location-panel__hero-dots">
                    {gallery.map((_, idx) => (
                      <button
                        key={`newsmap-hero-dot-${idx}`}
                        type="button"
                        aria-label={`Fotoğraf ${idx + 1}`}
                        className={`newsmap-location-panel__hero-dot${idx === photoIdx ? " newsmap-location-panel__hero-dot--active" : ""}`}
                        onClick={() => setPhotoIdx(idx)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : heroLoading || (wikiLoading && !wiki) ? (
            <div className="newsmap-location-panel__hero-placeholder flex h-36 items-center justify-center bg-slate-50 px-6 text-center">
              <p className="text-xs font-semibold leading-relaxed text-slate-600">
                Şu anda bilgiler getiriliyor, lütfen bekleyiniz...
              </p>
            </div>
          ) : (
            <div className="newsmap-location-panel__hero-placeholder flex h-36 items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm">
                  📍
                </div>
                <p className="text-xs font-bold text-slate-600">Bu konum için fotoğraf bulunamadı.</p>
              </div>
            </div>
          )}
        </div>

        <div
          className="newsmap-location-panel__tabs shrink-0"
          role="tablist"
          aria-label="Konum içerik sekmeleri"
        >
          {visibleTabs.map((tab) => {
            const badge = tabBadge(tab.key);
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`newsmap-location-panel__tab${activeTab === tab.key ? " newsmap-location-panel__tab--active" : ""}`}
                onClick={() => onTabChange(tab.key)}
              >
                <span>{tab.label}</span>
                {badge != null ? (
                  <span className="newsmap-location-panel__tab-badge">{badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="newsmap-location-panel__body flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === "businesses" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{businessesSlot}</div>
          ) : activeTab === "info" ? (
            <div className="newsmap-location-panel__info-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
              {infoSlot ?? (
                <NewsmapLocationInfoPanel
                  locationLabel={locationLabel}
                  bilgiHref={bilgiHref}
                  variant="embedded"
                  wikiOverride={wiki}
                  wikiLoading={wikiLoading}
                />
              )}
            </div>
          ) : (
            <NewsmapSidebarPanel
              headlines={headlines}
              isLoading={isLoading}
              mode={sidebarMode}
              locationLabel={locationLabel}
              onHeadlineClick={onHeadlineClick}
              onCityClick={onCityClick}
              inMapOverlayMode={inMapOverlayMode}
              hideHeader
            />
          )}
        </div>
      </div>
    </div>
  );
}
