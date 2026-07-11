import { useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  MapPin,
  Navigation,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "wouter";
import { buildKonumaGoreHref } from "@/lib/konumaGoreUtils";
import {
  buildMapSearchHref,
  haritalarNavHref,
  haritalarPlaceHref,
  rewriteHaritalarPathToMap,
} from "@/lib/haritalarNav";
import { buildSariSayfalarListPath } from "@/lib/sariSayfalarUtils";
import type { SearchLocationContext } from "@/components/search/SearchLocationRightPanel";
import {
  buildHaritalarSections,
  detectHaritalarQueryIntent,
  type HaritalarQueryIntent,
  type HaritalarSearchItem,
  type HaritalarSectionDef,
  type HaritalarSectionKey,
} from "@/components/search/haritalarSearchBuckets";

type MapPreview = {
  latitude: number;
  longitude: number;
  label: string;
  href: string;
  zoom?: number;
} | null;

type HaritalarTabProps = {
  query: string;
  locationContext: SearchLocationContext | null;
  mapPreview: MapPreview;
  cityCount: number;
  cityQuickFacts?: unknown;
  cityItems: HaritalarSearchItem[];
  mapItems: HaritalarSearchItem[];
  sariSayfalarItems: HaritalarSearchItem[];
  hizmetItems: HaritalarSearchItem[];
  otomotivItems: HaritalarSearchItem[];
  tourismItems: HaritalarSearchItem[];
  yemekMarketItems: HaritalarSearchItem[];
  urunlerItems: HaritalarSearchItem[];
};

function mapEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.03}%2C${lng + 0.04}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function formatPrice(value: number | null | undefined): string | null {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

function resolveMapHref(item: HaritalarSearchItem): string {
  const lat = item.latitude;
  const lng = item.longitude;
  if (lat != null && lng != null) {
    return haritalarNavHref({
      id: item.id.replace(/^map-pin-/, ""),
      lat,
      lng,
      city: item.city ?? undefined,
    });
  }
  if (item.href.includes("/map") || item.href.includes("/haritalar")) {
    return rewriteHaritalarPathToMap(item.href);
  }
  return haritalarNavHref({ id: item.id.replace(/^map-pin-/, ""), city: item.city ?? undefined });
}

function resolveItemHref(item: HaritalarSearchItem): string {
  const href = String(item.href ?? "").trim();
  if (!href || href.startsWith("/kesfet/") || href.startsWith("/siparis") || href.startsWith("/turizm")) {
    return href;
  }
  if (href.includes("/haritalar") || href.includes("/map")) return rewriteHaritalarPathToMap(href);
  return href;
}

function HeroBadge({ children }: { children: ReactNode }) {
  return (
    <span className="usr-service-badge">
      <MapPin className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

function LocationHero({
  query,
  intent,
  locationContext,
  mapPreview,
  cityItem,
}: {
  query: string;
  intent: HaritalarQueryIntent;
  locationContext: SearchLocationContext | null;
  mapPreview: MapPreview;
  cityItem: HaritalarSearchItem | null;
}) {
  const city = locationContext?.city;
  const label =
    intent === "business"
      ? (locationContext?.businesses[0]?.name ?? query)
      : (city?.name ?? locationContext?.label ?? cityItem?.name ?? query);
  const img = city?.imageUrl ?? cityItem?.coverPhotoUrl ?? cityItem?.photoUrl ?? null;
  const lat = mapPreview?.latitude ?? city?.latitude ?? null;
  const lng = mapPreview?.longitude ?? city?.longitude ?? null;
  const cityName = city?.name ?? cityItem?.name ?? query;
  const mapHref =
    (mapPreview?.href ? rewriteHaritalarPathToMap(mapPreview.href) : null) ??
    (lat != null && lng != null
      ? haritalarPlaceHref({ name: label, lat, lng, zoom: city?.zoom ?? 12 })
      : buildMapSearchHref({ q: query, city: cityName, lat, lng, zoom: city?.zoom ?? 12 }));
  const guideHref = buildSariSayfalarListPath({ city: cityName });
  const orderHref = buildKonumaGoreHref({
    city: cityName,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    module: "food",
  });

  return (
    <article className="usr-haritalar-hero yekpare-home-glass">
      <div className="usr-haritalar-hero-grid">
        <div className="usr-haritalar-hero-main">
          <HeroBadge>
            {intent === "location" ? "Konum" : intent === "business" ? "İşletme" : "Harita"}
          </HeroBadge>
          {img ? (
            <div className="usr-haritalar-hero-media">
              <img src={img} alt="" loading="lazy" />
            </div>
          ) : null}
          <h2 className="usr-haritalar-hero-title">{label}</h2>
          {city?.region || city?.district ? (
            <p className="usr-haritalar-hero-meta">
              {[city.district, city.region ?? "Türkiye"].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className="usr-haritalar-hero-meta">Harita, işletmeler ve yerel hizmetler</p>
          )}
          {cityItem?.description || locationContext?.wiki?.description ? (
            <p className="usr-haritalar-hero-desc">
              {cityItem?.description ?? locationContext?.wiki?.description}
            </p>
          ) : null}
          <div className="usr-haritalar-hero-actions">
            <Link href={mapHref} className="usr-service-cta">
              Haritada Aç
            </Link>
            {intent === "location" ? (
              <>
                <Link href={guideHref} className="usr-service-cta secondary">
                  Şehir rehberi
                </Link>
                <Link href={orderHref} className="usr-service-cta secondary">
                  Sipariş
                </Link>
              </>
            ) : null}
            <Link href={`/map?q=${encodeURIComponent(query)}`} className="usr-service-cta secondary">
              Tam ekran
            </Link>
          </div>
        </div>
        {lat != null && lng != null ? (
          <div className="usr-haritalar-hero-map">
            <iframe
              title={`${label} harita önizlemesi`}
              src={mapEmbedUrl(lat, lng)}
              className="usr-map-embed"
              loading="lazy"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function BusinessMapCard({ item }: { item: HaritalarSearchItem }) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  const lat = item.latitude;
  const lng = item.longitude;
  const mapsHref = resolveMapHref(item);

  return (
    <article className="usr-haritalar-biz-card yekpare-home-glass">
      <div className="usr-haritalar-biz-row">
        {img ? (
          <div className="usr-haritalar-biz-thumb">
            <img src={img} alt="" loading="lazy" />
          </div>
        ) : (
          <div className="usr-haritalar-biz-thumb usr-haritalar-biz-thumb--fallback" aria-hidden>
            🏪
          </div>
        )}
        <div className="usr-haritalar-biz-body">
          <span className="usr-service-badge compact">
            <Building2 className="h-3 w-3" aria-hidden />
            {item.categoryName ?? item.typeLabel ?? "İşletme"}
          </span>
          <h3 className="usr-haritalar-card-title">
            <Link href={resolveItemHref(item)}>{item.name}</Link>
          </h3>
          {item.address || item.city ? (
            <p className="usr-haritalar-card-meta">{item.address ?? item.city}</p>
          ) : null}
          {item.rating ? (
            <span className="usr-service-rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {Number(item.rating).toFixed(1)}
              {item.userRatingsTotal
                ? ` (${Number(item.userRatingsTotal).toLocaleString("tr-TR")})`
                : ""}
            </span>
          ) : null}
          <div className="usr-haritalar-card-actions">
            <Link href={resolveItemHref(item)} className="usr-loc-link">
              Detay
            </Link>
            <Link href={mapsHref} className="usr-loc-link accent">
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Haritada
            </Link>
          </div>
        </div>
        {lat != null && lng != null ? (
          <div className="usr-haritalar-biz-mini-map">
            <iframe title={`${item.name} konumu`} src={mapEmbedUrl(lat, lng)} loading="lazy" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CompactResultCard({
  item,
  badge,
  cta,
}: {
  item: HaritalarSearchItem;
  badge: string;
  cta?: string;
}) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  const priceLabel = formatPrice(item.price);
  const mapsHref = resolveMapHref(item);

  return (
    <article className="usr-haritalar-result-card yekpare-home-glass">
      {img ? (
        <div className="usr-haritalar-result-thumb">
          <img src={img} alt="" loading="lazy" />
        </div>
      ) : null}
      <div className="usr-haritalar-result-body">
        <span className="usr-service-badge compact">{badge}</span>
        <h3 className="usr-haritalar-card-title">
          <Link href={resolveItemHref(item)}>{item.name}</Link>
        </h3>
        {item.subtitle || item.description ? (
          <p className="usr-haritalar-card-desc">{item.subtitle ?? item.description}</p>
        ) : null}
        <div className="usr-haritalar-result-meta">
          {item.rating ? (
            <span className="usr-service-rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {Number(item.rating).toFixed(1)}
            </span>
          ) : null}
          {priceLabel ? <span className="usr-service-price">{priceLabel}</span> : null}
          {item.city ? <span className="usr-haritalar-card-meta">{item.city}</span> : null}
        </div>
        <div className="usr-haritalar-card-actions">
          {cta ? (
            <Link href={resolveItemHref(item)} className="usr-service-cta compact">
              {cta}
            </Link>
          ) : null}
          <Link href={mapsHref} className="usr-loc-link accent">
            Haritada
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  section,
  limit = 6,
  renderCard,
}: {
  section: HaritalarSectionDef;
  limit?: number;
  renderCard: (item: HaritalarSearchItem) => ReactNode;
}) {
  if (!section.items.length) return null;
  const visible = section.items.slice(0, limit);
  return (
    <section
      id={`usr-haritalar-${section.key}`}
      className="usr-haritalar-section"
      aria-label={section.label}
    >
      <div className="usr-haritalar-section-head">
        <h3>
          <span aria-hidden>{section.emoji}</span> {section.label}
          <span className="usr-haritalar-count">{section.items.length.toLocaleString("tr-TR")}</span>
        </h3>
        <Link href={section.seeAllHref} className="usr-haritalar-see-all">
          Tümünü gör
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="usr-haritalar-results-grid">{visible.map((item) => renderCard(item))}</div>
    </section>
  );
}

function cardForSection(sectionKey: HaritalarSectionKey, item: HaritalarSearchItem): ReactNode {
  switch (sectionKey) {
    case "isletmeler":
      return <BusinessMapCard key={item.id} item={item} />;
    case "siparis":
      return (
        <CompactResultCard
          key={item.id}
          item={item}
          badge={item.typeLabel ?? "Sipariş"}
          cta="Sipariş Ver"
        />
      );
    case "oteller":
      return (
        <CompactResultCard key={item.id} item={item} badge="Otel" cta="Odaları Gör" />
      );
    case "rentacar":
      return (
        <CompactResultCard key={item.id} item={item} badge="Rent a Car" cta="Rezervasyon" />
      );
    case "etkinlik":
      return (
        <CompactResultCard key={item.id} item={item} badge="Etkinlik" cta="Biletler" />
      );
    case "urunler":
      return (
        <CompactResultCard key={item.id} item={item} badge="Ürün" cta="İncele" />
      );
    default:
      return (
        <CompactResultCard key={item.id} item={item} badge={item.typeLabel ?? "Seyahat"} cta="Detay" />
      );
  }
}

export function HaritalarTab({
  query,
  locationContext,
  mapPreview,
  cityCount,
  cityQuickFacts,
  cityItems,
  mapItems,
  sariSayfalarItems,
  hizmetItems,
  otomotivItems,
  tourismItems,
  yemekMarketItems,
  urunlerItems,
}: HaritalarTabProps) {
  const sections = useMemo(
    () =>
      buildHaritalarSections({
        query,
        locationContext,
        cityCount,
        cityQuickFacts,
        mapItems,
        sariSayfalarItems,
        hizmetItems,
        otomotivItems,
        tourismItems,
        yemekMarketItems,
        urunlerItems,
      }),
    [
      query,
      locationContext,
      cityCount,
      cityQuickFacts,
      mapItems,
      sariSayfalarItems,
      hizmetItems,
      otomotivItems,
      tourismItems,
      yemekMarketItems,
      urunlerItems,
    ],
  );

  const businessCount = sections.find((s) => s.key === "isletmeler")?.items.length ?? 0;
  const intent = detectHaritalarQueryIntent({
    query,
    locationContext,
    cityCount,
    cityQuickFacts,
    businessCount,
  });

  const [activeChip, setActiveChip] = useState<HaritalarSectionKey | "all">("all");

  const chips = sections.filter((s) => s.items.length > 0);
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const cityItem = cityItems[0] ?? null;

  const visibleSections =
    activeChip === "all" ? sections.filter((s) => s.items.length > 0) : sections.filter((s) => s.key === activeChip);

  if (!query.trim()) {
    return (
      <section className="usr-section" aria-label="Haritalar">
        <div className="usr-web-hint yekpare-home-glass">
          <MapPin className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          <p>Harita araması için bir konum veya işletme adı girin.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="usr-section usr-haritalar-tab" aria-label="Haritalar">
      <LocationHero
        query={query}
        intent={intent}
        locationContext={locationContext}
        mapPreview={mapPreview}
        cityItem={cityItem}
      />

      {chips.length > 0 ? (
        <nav className="usr-haritalar-chips" aria-label="Harita kategorileri">
          <button
            type="button"
            className={`usr-haritalar-chip${activeChip === "all" ? " active" : ""}`}
            onClick={() => setActiveChip("all")}
          >
            Tümü
            <span className="usr-haritalar-chip-count">{totalCount}</span>
          </button>
          {chips.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`usr-haritalar-chip${activeChip === section.key ? " active" : ""}`}
              onClick={() => setActiveChip(section.key)}
            >
              <span aria-hidden>{section.emoji}</span>
              {section.label}
              <span className="usr-haritalar-chip-count">{section.items.length}</span>
            </button>
          ))}
        </nav>
      ) : null}

      {visibleSections.length > 0 ? (
        <div className="usr-haritalar-sections">
          {visibleSections.map((section) => (
            <SectionBlock
              key={section.key}
              section={section}
              limit={activeChip === "all" ? 4 : 12}
              renderCard={(item) => cardForSection(section.key, item)}
            />
          ))}
        </div>
      ) : (
        <div className="usr-haritalar-empty yekpare-home-glass">
          <UtensilsCrossed className="h-5 w-5 opacity-50" aria-hidden />
          <p>
            <strong>{query}</strong> için henüz kategorize sonuç yok. Haritada aramayı deneyin veya
            yakındaki işletmeleri keşfedin.
          </p>
          <div className="usr-haritalar-hero-actions">
            <Link href={buildMapSearchHref({ q: query })} className="usr-service-cta">
              Haritada Ara
            </Link>
            <Link
              href={buildSariSayfalarListPath({ city: query })}
              className="usr-service-cta secondary"
            >
              İşletme Rehberi
            </Link>
          </div>
        </div>
      )}

      {activeChip === "all" && chips.length === 0 ? null : (
        <p className="usr-haritalar-footnote">
          Yekpare veri tabanından zenginleştirildi ·{" "}
          <Link href={buildMapSearchHref({ q: query })}>Tam harita</Link>
          {" · "}
          <Link href={`/map?q=${encodeURIComponent(query)}`}>Tam ekran harita</Link>
        </p>
      )}
    </section>
  );
}
