import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import {
  fetchEtkinlikEventDetail,
  type EtkinlikEventDetailResult,
} from "../lib/etkinlikEvents";
import { haritalarNavHref } from "@/lib/haritalarNav";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import "@/styles/bookingCoreTurizm.css";

function useDocumentMeta(title: string, description?: string | null) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "description");
        document.head.appendChild(el);
      }
      el.setAttribute("content", description.slice(0, 160));
    }
  }, [title, description]);
}

function formatEventDate(iso: string | null, tz: string): string {
  if (!iso) return "Tarih yakında";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString("tr-TR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: tz || "Europe/Istanbul",
    });
  } catch {
    return d.toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" });
  }
}

function formatPrice(event: EtkinlikEventDetailResult): string {
  if (event.isFree) return "Ücretsiz";
  if (event.minPrice != null && event.maxPrice != null && event.minPrice !== event.maxPrice) {
    return `${event.minPrice.toLocaleString("tr-TR")} – ${event.maxPrice.toLocaleString("tr-TR")} ${event.currency ?? "TRY"}`;
  }
  if (event.minPrice != null) {
    return `${event.minPrice.toLocaleString("tr-TR")} ${event.currency ?? "TRY"}`;
  }
  return "Biletli";
}

function venueHaritalarHref(event: EtkinlikEventDetailResult): string | null {
  if (event.haritalarUrl) return event.haritalarUrl;
  return haritalarNavHref({
    id: event.mapBusinessId,
    slug: event.mapBusinessSlug,
    lat: event.venueLat,
    lng: event.venueLng,
    city: event.venueCity,
  });
}

function venueDetailHref(event: EtkinlikEventDetailResult): string | null {
  if (event.sariSayfalarUrl) return event.sariSayfalarUrl;
  if (event.mapBusinessSlug || event.mapBusinessId) {
    return haritalarNavHref({
      id: event.mapBusinessId,
      slug: event.mapBusinessSlug,
      lat: event.venueLat,
      lng: event.venueLng,
      city: event.venueCity,
    });
  }
  return venueHaritalarHref(event);
}

function venueLine(event: EtkinlikEventDetailResult): string | null {
  const parts = [event.venueName, event.venueAddress, event.venueCity].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function TurizmEtkinlikDetailPage() {
  const [, params] = useRoute("/turizm/etkinlik/:slugOrId");
  const slugOrId = params?.slugOrId ?? "";
  const [event, setEvent] = useState<EtkinlikEventDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<{ source?: string; enriching?: boolean }>({});

  const pageTitle = event?.name ? `${event.name} | Etkinlik | Yekpare` : "Etkinlik | Yekpare";
  const metaDescription =
    event?.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    (event?.venueName ? `${event.name} — ${event.venueName}` : null);

  useDocumentMeta(pageTitle, metaDescription);

  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    void fetchEtkinlikEventDetail(slugOrId)
      .then((res) => {
        if (!res?.event) {
          setNotFound(true);
          setEvent(null);
          return;
        }
        setEvent(res.event);
        setMeta({ source: res.source, enriching: res.enriching });
        setNotFound(false);
      })
      .catch(() => {
        setNotFound(true);
        setEvent(null);
      })
      .finally(() => setLoading(false));
  }, [slugOrId]);

  const ticketHref = event?.ticketUrl || event?.url;
  const haritalarHref = useMemo(() => (event ? venueHaritalarHref(event) : null), [event]);
  const venueHref = useMemo(() => (event ? venueDetailHref(event) : null), [event]);
  const heroImage = event?.posterUrl || event?.imageUrls?.[0] || null;
  const gallery = event?.imageUrls?.length ? event.imageUrls : heroImage ? [heroImage] : [];
  const locationText = event ? venueLine(event) : null;

  const breadcrumbs = [
    { label: "Seyahat", href: TURIZM.hub },
    { label: "Etkinlik", href: TURIZM.stubs.etkinlik },
    ...(event ? [{ label: event.name }] : []),
  ];

  return (
    <BookingCoreShell module="konaklama" title={event?.name || "Etkinlik"}>
      <div className="bc-yekpare bc-detail bc-detail--etkinlik" data-page="turizm-etkinlik-detail">
        <div className="bc-detail__wrap">
          {loading ? (
            <div className="bc-detail__empty">
              <p>Etkinlik yükleniyor…</p>
            </div>
          ) : notFound || !event ? (
            <div className="bc-detail__empty">
              <h1>Etkinlik bulunamadı</h1>
              <p>Bu etkinlik kaldırılmış veya bağlantı hatalı olabilir.</p>
              <Link href={TURIZM.stubs.etkinlik}>← Etkinlik aramasına dön</Link>
            </div>
          ) : (
            <>
              <nav className="bc-detail__breadcrumb" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, i) => (
                  <span key={`${crumb.label}-${i}`} className="bc-detail__crumb">
                    {"href" in crumb && crumb.href ? (
                      <Link href={crumb.href}>{crumb.label}</Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 ? <ChevronRight className="bc-detail__crumb-sep" /> : null}
                  </span>
                ))}
              </nav>

              <header className="bc-detail__header">
                <div className="bc-detail__title-row">
                  <div>
                    <p className="bc-detail__type">Etkinlik</p>
                    <h1>{event.name}</h1>
                    <div className="bc-etkinlik-detail__meta-chips">
                      {event.category ? (
                        <span className="bc-etkinlik-detail__meta-chip">{event.category.name}</span>
                      ) : null}
                      {event.format ? (
                        <span className="bc-etkinlik-detail__meta-chip">{event.format.name}</span>
                      ) : null}
                      {event.isFree ? (
                        <span className="bc-etkinlik-detail__meta-chip bc-etkinlik-detail__meta-chip--free">
                          Ücretsiz
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="bc-etkinlik-detail__price-badge">{formatPrice(event)}</div>
                </div>
                <p className="bc-detail__location">
                  <Calendar className="bc-detail__loc-icon" />
                  {formatEventDate(event.startAt, event.timezone)}
                  {event.endAt ? ` · Bitiş: ${formatEventDate(event.endAt, event.timezone)}` : ""}
                </p>
                {locationText ? (
                  <p className="bc-detail__location">
                    <MapPin className="bc-detail__loc-icon" />
                    {locationText}
                  </p>
                ) : null}
              </header>

              <div className="bc-detail__grid">
                <main className="bc-detail__main">
                  {gallery.length > 0 ? (
                    <div className="bc-detail__gallery">
                      <div className="bc-detail__gallery-main">
                        <img src={gallery[0]} alt={event.name} />
                      </div>
                      {gallery.length > 1 ? (
                        <div className="bc-detail__gallery-thumbs">
                          {gallery.slice(0, 5).map((src, i) => (
                            <div key={`${src}-${i}`} className="bc-detail__thumb">
                              <img src={src} alt="" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="bc-detail__panel">
                    {meta.enriching ? (
                      <p className="bc-etkinlik-detail__enriching" role="status">
                        Etkinlik açıklaması zenginleştiriliyor…
                      </p>
                    ) : null}

                    <div className="bc-detail__section">
                      <h2>Etkinlik hakkında</h2>
                      {event.descriptionHtml ? (
                        <div
                          className="bc-etkinlik-detail__body"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.descriptionHtml) }}
                        />
                      ) : event.description ? (
                        <div className="bc-etkinlik-detail__body">
                          {event.description.split(/\n{2,}/).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="bc-detail__desc">
                          Bu etkinlik için ayrıntılı açıklama henüz eklenmedi. Bilet ve güncel bilgi için sağdaki
                          bağlantıyı kullanın.
                        </p>
                      )}
                    </div>

                    {event.tags.length ? (
                      <div className="bc-detail__section">
                        <h2>Etiketler</h2>
                        <div className="bc-etkinlik-detail__tag-row">
                          {event.tags.map((tag) => (
                            <span key={tag} className="bc-etkinlik-detail__tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </main>

                <aside className="bc-detail__sidebar">
                  <div className="bc-detail__book">
                    <div className="bc-detail__affiliate">
                      <div className="bc-detail__book-price">
                        <strong>{formatPrice(event)}</strong>
                      </div>
                      {ticketHref ? (
                        <a
                          href={ticketHref}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="bc-detail__book-btn bc-detail__affiliate-btn"
                        >
                          Bilet al
                        </a>
                      ) : null}
                      <p className="bc-detail__affiliate-note">
                        Bilet satın alma işlemi Etkinlik.io üzerinde tamamlanır. Yekpare ödeme almaz.
                      </p>
                      <p className="bc-detail__affiliate-disclaimer">Partner bağlantısı · yeni sekmede açılır</p>
                    </div>
                  </div>

                  {(event.venueName || event.venueCity || event.venueAddress) && (
                    <div className="bc-detail__side-card">
                      <h3>Mekan</h3>
                      {event.venueName ? (
                        venueHref ? (
                          <Link href={venueHref} className="bc-etkinlik-detail__venue-name bc-detail__contact-link">
                            {event.venueName}
                          </Link>
                        ) : (
                          <p className="bc-etkinlik-detail__venue-name">{event.venueName}</p>
                        )
                      ) : null}
                      {event.venueAddress ? <p className="bc-detail__desc">{event.venueAddress}</p> : null}
                      {event.venueCity && !event.venueAddress ? (
                        <p className="bc-detail__desc">{event.venueCity}</p>
                      ) : null}
                      {haritalarHref ? (
                        <Link href={haritalarHref} className="bc-detail__contact-link">
                          <MapPin className="bc-detail__contact-icon" /> Haritada aç
                        </Link>
                      ) : null}
                    </div>
                  )}
                </aside>
              </div>

              <footer className="bc-etkinlik-detail__footer">
                <Link href={TURIZM.stubs.etkinlik}>← Tüm etkinlikler</Link>
              </footer>
            </>
          )}
        </div>
      </div>
    </BookingCoreShell>
  );
}
