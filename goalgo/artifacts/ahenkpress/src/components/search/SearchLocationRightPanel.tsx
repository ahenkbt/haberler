import { BookOpen, Building2, MapPin, Star } from "lucide-react";
import { Link } from "wouter";
import { haritalarNavHref } from "@/lib/haritalarNav";

export type SearchLocationCityCard = {
  id: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
  href: string;
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number | null;
  district?: string | null;
  region?: string | null;
};

export type SearchLocationBusinessCard = {
  id: string;
  name: string;
  href: string;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  categoryName?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SearchLocationWikiCard = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  href: string;
};

export type SearchLocationMapPreview = {
  latitude: number;
  longitude: number;
  label: string;
  href: string;
  zoom?: number;
};

export type SearchLocationContext = {
  locationIntent: boolean;
  label: string;
  city?: SearchLocationCityCard | null;
  district?: string | null;
  businesses: SearchLocationBusinessCard[];
  wiki?: SearchLocationWikiCard | null;
  mapPreview?: SearchLocationMapPreview | null;
  cityGuideHref?: string | null;
  cityOrderHref?: string | null;
};

function mapEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.03}%2C${lng + 0.04}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function CityCard({
  city,
  wikiHref,
  cityGuideHref,
  cityOrderHref,
}: {
  city: SearchLocationCityCard;
  wikiHref?: string | null;
  cityGuideHref?: string | null;
  cityOrderHref?: string | null;
}) {
  const img = city.imageUrl;
  const title = city.district ? `${city.district}, ${city.name}` : city.name;

  return (
    <article className="usr-loc-card usr-loc-city usr-loc-city--hero yekpare-home-glass">
      <span className="usr-service-badge">
        <MapPin className="h-3 w-3" aria-hidden />
        Konum
      </span>
      {img ? (
        <div className="usr-loc-media usr-loc-media--hero">
          <img src={img} alt="" loading="lazy" />
        </div>
      ) : null}
      <div className="usr-loc-body">
        <h3 className="usr-loc-title usr-loc-title--hero">{title}</h3>
        {city.region ? <p className="usr-loc-meta">{city.region} · il</p> : <p className="usr-loc-meta">il</p>}
        {city.description ? <p className="usr-loc-desc">{city.description}</p> : null}
        <div className="usr-loc-city-actions">
          <Link href={city.href} className="usr-service-cta">
            Haritada Aç
          </Link>
          {cityGuideHref ? (
            <Link href={cityGuideHref} className="usr-service-cta secondary">
              Şehir rehberi
            </Link>
          ) : null}
          {wikiHref ? (
            <Link href={wikiHref} className="usr-service-cta secondary">
              Şehir bilgi
            </Link>
          ) : null}
          {cityOrderHref ? (
            <Link href={cityOrderHref} className="usr-service-cta secondary">
              Sipariş
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BusinessCard({ biz }: { biz: SearchLocationBusinessCard }) {
  const img = biz.coverPhotoUrl ?? biz.photoUrl;
  const mapsHref =
    biz.latitude != null && biz.longitude != null
      ? haritalarNavHref({ id: biz.id.replace(/^map-pin-/, ""), lat: biz.latitude, lng: biz.longitude })
      : biz.href;

  return (
    <article className="usr-loc-card usr-loc-business yekpare-home-glass">
      <div className="usr-loc-business-row">
        <div className="usr-loc-business-thumb">
          {img ? (
            <img src={img} alt="" loading="lazy" />
          ) : (
            <span className="usr-loc-business-fallback" aria-hidden>
              🏪
            </span>
          )}
        </div>
        <div className="usr-loc-business-main">
          <span className="usr-service-badge compact">
            <Building2 className="h-3 w-3" aria-hidden />
            İşletme
          </span>
          <h3 className="usr-loc-title">
            <Link href={biz.href}>{biz.name}</Link>
          </h3>
          {biz.categoryName ? <p className="usr-loc-meta">{biz.categoryName}</p> : null}
          {biz.address || biz.city ? (
            <p className="usr-loc-desc">{biz.address ?? biz.city}</p>
          ) : null}
          {biz.rating ? (
            <span className="usr-service-rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {Number(biz.rating).toFixed(1)}
              {biz.userRatingsTotal ? ` (${Number(biz.userRatingsTotal).toLocaleString("tr-TR")})` : ""}
            </span>
          ) : null}
          <div className="usr-loc-business-actions">
            <Link href={biz.href} className="usr-loc-link">
              Detay
            </Link>
            <Link href={mapsHref} className="usr-loc-link accent">
              Haritada
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function WikiCard({ wiki, prominent }: { wiki: SearchLocationWikiCard; prominent?: boolean }) {
  const img = wiki.imageUrl;
  return (
    <article className={`usr-loc-card usr-loc-wiki yekpare-home-glass${prominent ? " usr-loc-wiki--prominent" : ""}`}>
      <span className="usr-service-badge">
        <BookOpen className="h-3 w-3" aria-hidden />
        Bilgi Ağacı
      </span>
      <div className="usr-loc-wiki-row">
        {img ? (
          <div className="usr-loc-wiki-thumb">
            <img src={img} alt="" loading="lazy" />
          </div>
        ) : null}
        <div className="usr-loc-body">
          <h3 className="usr-loc-title">
            <Link href={wiki.href}>{wiki.title}</Link>
          </h3>
          {wiki.description ? <p className="usr-loc-desc">{wiki.description}</p> : null}
          <Link href={wiki.href} className="usr-loc-link accent">
            Bilgi Ağacı'nda Oku
          </Link>
        </div>
      </div>
    </article>
  );
}

function MiniMapCard({ preview, prominent }: { preview: SearchLocationMapPreview; prominent?: boolean }) {
  return (
    <article className={`usr-loc-card usr-loc-map yekpare-home-glass${prominent ? " usr-loc-map--prominent" : ""}`}>
      <span className="usr-service-badge">
        <MapPin className="h-3 w-3" aria-hidden />
        Mini Harita
      </span>
      <div className="usr-map-embed-wrap">
        <iframe
          title={`${preview.label} harita önizlemesi`}
          src={mapEmbedUrl(preview.latitude, preview.longitude)}
          className="usr-map-embed"
          loading="lazy"
        />
      </div>
      <div className="usr-loc-body">
        <h3 className="usr-loc-title">{preview.label}</h3>
        <Link href={preview.href} className="usr-service-cta">
          Haritada Keşfet
        </Link>
      </div>
    </article>
  );
}

export function SearchLocationRightPanel({
  context,
  cityQuery = false,
}: {
  context: SearchLocationContext;
  cityQuery?: boolean;
}) {
  const businesses = cityQuery ? [] : context.businesses;
  const hasContent =
    Boolean(context.city) ||
    businesses.length > 0 ||
    Boolean(context.wiki) ||
    Boolean(context.mapPreview);

  if (!hasContent) return null;

  return (
    <aside className="usr-loc-panel" aria-label="Konum kartları">
      <div className="usr-loc-panel-head">
        <MapPin className="h-4 w-4" style={{ color: "var(--usr-accent)" }} aria-hidden />
        <h2>{context.label}</h2>
      </div>
      <div className={`usr-loc-panel-stack${cityQuery ? " usr-loc-panel-stack--city" : ""}`}>
        {context.city ? (
          <CityCard
            city={context.city}
            wikiHref={context.wiki?.href}
            cityGuideHref={context.cityGuideHref}
            cityOrderHref={context.cityOrderHref}
          />
        ) : null}
        {context.mapPreview ? <MiniMapCard preview={context.mapPreview} prominent={cityQuery} /> : null}
        {context.wiki ? <WikiCard wiki={context.wiki} prominent={cityQuery} /> : null}
        {businesses.map((biz) => (
          <BusinessCard key={biz.id} biz={biz} />
        ))}
      </div>
    </aside>
  );
}

/** Landmark: label (Ankara Kalesi) ≠ bağlı il adı (Ankara). */
export function isLandmarkLocationContext(ctx: SearchLocationContext | null | undefined): boolean {
  if (!ctx?.locationIntent || !ctx.label?.trim()) return false;
  const cityName = ctx.city?.name?.trim();
  if (!cityName) return false;
  return ctx.label.trim().toLocaleLowerCase("tr-TR") !== cityName.toLocaleLowerCase("tr-TR");
}

/** Şehir / ilçe / landmark aramaları — işletme anahtar kelimesi aramaları değil. */
export function isCityLocationHeroQuery(input: {
  locationContext?: SearchLocationContext | null;
  cityCount: number;
  cityQuickFacts?: unknown;
}): boolean {
  if (input.cityCount > 0) return true;
  if (input.cityQuickFacts) return true;
  const ctx = input.locationContext;
  if (!ctx?.locationIntent) return false;
  if (isLandmarkLocationContext(ctx)) return true;
  return Boolean(ctx.city || ctx.district);
}

export function shouldShowLocationPanel(input: {
  locationContext?: SearchLocationContext | null;
  mapPreview?: SearchLocationMapPreview | null;
  cityCount: number;
  cityQuickFacts?: unknown;
}): boolean {
  return isCityLocationHeroQuery(input);
}
