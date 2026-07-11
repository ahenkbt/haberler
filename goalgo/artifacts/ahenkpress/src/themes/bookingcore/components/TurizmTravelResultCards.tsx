import { Link } from "wouter";
import type { BusResult, FlightResult } from "../lib/travelpayouts";
import type { EtkinlikEventResult } from "../lib/etkinlikEvents";
import { etkinlikDetailPath } from "../lib/etkinlikEvents";
import { ETKINLIK_PARTNER_SUGGESTIONS } from "@/themes/turizm/turizmHubConfig";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

function formatFlightDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function formatEventDate(iso: string | null, tz: string): string {
  if (!iso) return "Tarih yakında";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: tz || "Europe/Istanbul",
    });
  } catch {
    return d.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
  }
}

function sourceLabel(source: string | null): string {
  if (source === "mixed") return "Aviasales + CollectAPI";
  if (source === "collectapi") return "CollectAPI Seyahat";
  if (source === "travelpayouts") return "Aviasales (Travelpayouts)";
  return "";
}

export function TurizmFlightResultCards({
  results,
  loading,
  source,
}: {
  results: FlightResult[];
  loading: boolean;
  source: string | null;
}) {
  if (loading) {
    return (
      <div className="bc-travel-results">
        <p className="bc-travel-results__status">Uçuşlar aranıyor…</p>
        <div className="bc-travel-results__skeletons">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bc-travel-card bc-travel-card--skeleton" />
          ))}
        </div>
      </div>
    );
  }
  if (!results.length) return null;
  return (
    <div className="bc-travel-results">
      {source ? (
        <p className="bc-travel-results__meta">
          {results.length} sonuç · Kaynak: {sourceLabel(source)}
        </p>
      ) : null}
      <ul className="bc-travel-card-list">
        {results.map((f, i) => (
          <li key={`${f.departureAt}-${f.origin}-${i}`} className="bc-travel-card bc-travel-card--flight">
            <div className="bc-travel-card__body">
              <div className="bc-travel-card__route">
                <strong>
                  {f.origin} → {f.destination}
                </strong>
                <span className="bc-travel-card__badge">
                  {f.transfers === 0 ? "Direkt" : f.transfers != null ? `${f.transfers} aktarma` : "Uçuş"}
                </span>
              </div>
              <p className="bc-travel-card__detail">
                {formatFlightDate(f.departureAt)}
                {f.airline ? ` · ${f.airline}` : ""}
              </p>
            </div>
            <div className="bc-travel-card__action">
              <strong className="bc-travel-card__price">
                {f.price.toLocaleString("tr-TR")} {f.currency}
              </strong>
              <a href={f.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-travel-card__btn">
                Bileti al
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TurizmBusResultCards({
  results,
  loading,
}: {
  results: BusResult[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bc-travel-results">
        <p className="bc-travel-results__status">Otobüs seferleri aranıyor…</p>
        <div className="bc-travel-results__skeletons">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bc-travel-card bc-travel-card--skeleton" />
          ))}
        </div>
      </div>
    );
  }
  if (!results.length) return null;
  return (
    <div className="bc-travel-results">
      <p className="bc-travel-results__meta">{results.length} sefer · CollectAPI Seyahat</p>
      <ul className="bc-travel-card-list">
        {results.map((b, i) => (
          <li key={`${b.departureAt}-${i}`} className="bc-travel-card bc-travel-card--bus">
            <div className="bc-travel-card__body">
              <div className="bc-travel-card__route">
                <strong>
                  {b.origin} → {b.destination}
                </strong>
                {b.busType ? <span className="bc-travel-card__badge">{b.busType}</span> : null}
              </div>
              <p className="bc-travel-card__detail">
                {b.departureAt ? `Kalkış: ${b.departureAt}` : ""}
                {b.arrivalAt ? ` · Varış: ${b.arrivalAt}` : ""}
                {b.duration ? ` · ${b.duration}` : ""}
                {b.company ? ` · ${b.company}` : ""}
              </p>
            </div>
            <div className="bc-travel-card__action">
              <strong className="bc-travel-card__price">
                {b.price.toLocaleString("tr-TR")} {b.currency}
              </strong>
              {b.affiliateUrl ? (
                <a href={b.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-travel-card__btn">
                  Bileti al
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TurizmEventResultCards({
  results,
  loading,
  configured,
  city = "İstanbul",
  affiliateUrl,
  compact = false,
}: {
  results: EtkinlikEventResult[];
  loading: boolean;
  configured: boolean;
  city?: string;
  affiliateUrl?: string | null;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="bc-travel-results">
        <p className="bc-travel-results__status">Etkinlikler yükleniyor…</p>
        <div className="bc-travel-results__skeletons bc-travel-results__skeletons--grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bc-travel-event-card bc-travel-event-card--skeleton" />
          ))}
        </div>
      </div>
    );
  }
  if (!results.length) {
    const cityParam = encodeURIComponent(city.trim() || "İstanbul");
    return (
      <div className="bc-travel-results">
        <div className="bc-empty">
          <p>Bu kriterlere uygun etkinlik bulunamadı.</p>
          <p>Filtreleri genişletin, farklı bir şehir deneyin veya partner sitelerine göz atın.</p>
        </div>
        <div className="bc-etkinlik-suggest-grid" aria-label="Popüler etkinlik kategorileri">
          {ETKINLIK_PARTNER_SUGGESTIONS.map((item) => {
            const internalHref = `${TURIZM.stubs.etkinlik}?city=${cityParam}&category=${encodeURIComponent(item.category)}`;
            const href = affiliateUrl || internalHref;
            const external = Boolean(affiliateUrl);
            return (
              <a
                key={item.title}
                href={href}
                className="bc-etkinlik-suggest-card"
                {...(external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
              >
                <div className="bc-etkinlik-suggest-card__media">
                  <img src={item.image} alt="" loading="lazy" />
                </div>
                <div className="bc-etkinlik-suggest-card__body">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="bc-travel-results">
      {!compact ? (
        configured ? (
          <p className="bc-travel-results__meta">Etkinlik.io kataloğu</p>
        ) : (
          <p className="bc-travel-results__meta bc-travel-results__meta--muted">Partner yönlendirme · Etkinlik.io yapılandırılmadı</p>
        )
      ) : null}
      <ul className="bc-travel-event-grid">
        {results.map((e) => {
          const detailHref = etkinlikDetailPath(e);
          const ticketHref = e.ticketUrl || e.url;
          return (
          <li key={e.id}>
            <article className="bc-travel-event-card">
              <Link href={detailHref} className="bc-travel-event-card__media">
                {e.posterUrl ? (
                  <img src={e.posterUrl} alt="" loading="lazy" />
                ) : (
                  <span className="bc-travel-event-card__placeholder" aria-hidden>
                    🎫
                  </span>
                )}
                {e.category ? <span className="bc-travel-event-card__cat">{e.category.name}</span> : null}
              </Link>
              <div className="bc-travel-event-card__body">
                <h3>
                  <Link href={detailHref}>{e.name}</Link>
                </h3>
                <p className="bc-travel-event-card__date">{formatEventDate(e.startAt, e.timezone)}</p>
                {e.venueName ? (
                  <p className="bc-travel-event-card__venue">
                    {e.venueName}
                    {e.venueCity ? ` · ${e.venueCity}` : ""}
                  </p>
                ) : null}
                <div className="bc-travel-event-card__foot">
                  <span className="bc-travel-event-card__price">{e.isFree ? "Ücretsiz" : "Biletli"}</span>
                  <div className="bc-travel-event-card__actions">
                    <Link href={detailHref} className="bc-travel-card__btn bc-travel-card__btn--ghost">
                      Detay
                    </Link>
                    <a href={ticketHref} target="_blank" rel="noopener noreferrer sponsored" className="bc-travel-card__btn">
                      Bilet al
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
