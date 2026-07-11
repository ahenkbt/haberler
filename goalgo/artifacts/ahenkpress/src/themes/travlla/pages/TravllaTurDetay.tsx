import { useState } from "react";
import { Link, useRoute } from "wouter";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet } from "@/lib/pageSeo";
import { useEffect } from "react";
import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TravllaBookingForm } from "../components/TravllaBookingForm";
import { TravllaTourCard } from "../components/TravllaTourCard";
import { useTravllaTour, useTravllaTours } from "../hooks/useTravllaApi";
import { TRV } from "../travllaPaths";
import { formatTrvPrice, trvImageFor } from "../travllaMedia";

export default function TravllaTurDetay() {
  const [, params] = useRoute("/turizm/tur/:slug");
  const slug = params?.slug || "";
  const { tour, loading } = useTravllaTour(slug);
  const { tours: related } = useTravllaTours({ limit: 4, type: "tour" });
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const gallery = (tour?.gallery?.length ? tour.gallery : tour?.image_url ? [tour.image_url] : [])
    .map((u) => resolveClientMediaSrc(u) || trvImageFor(tour?.city || slug, u))
    .filter(Boolean);

  useEffect(() => {
    if (!tour) return;
    const path = TRV.tur(tour.slug);
    applySocialShareMeta({
      title: `${tour.title} — Yekpare Turizm`,
      descriptionPrimary: seoPlainSnippet(tour.description) || `${tour.title} tur paketi.`,
      canonicalPath: path,
      imageUrl: gallery[0] || tour.image_url,
    });
    return () => resetSeoToSiteDefaults();
  }, [tour, gallery]);

  if (loading) {
    return (
      <TravllaShell page="detail">
        <div className="trv-empty">Yükleniyor…</div>
      </TravllaShell>
    );
  }

  if (!tour) {
    return (
      <TravllaShell page="detail">
        <div className="trv-empty">
          <p>Tur bulunamadı.</p>
          <Link href={TRV.turlar} className="site-button">
            Turlara dön
          </Link>
        </div>
      </TravllaShell>
    );
  }

  const relatedOthers = related.filter((t) => t.slug !== tour.slug).slice(0, 3);

  return (
    <TravllaShell page="detail">
      <TravllaInnerBanner
        title={tour.title}
        crumbs={[
          { label: "Seyahat", href: TRV.home },
          { label: "Turlar", href: TRV.turlar },
          { label: tour.title },
        ]}
      />
      <div className="container trv-detail-layout">
        <div>
          <div className="trv-detail-panel">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <div className="trv-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i key={s} className="las la-star" style={{ opacity: s <= Math.round(tour.rating || 0) ? 1 : 0.35 }} />
                  ))}
                  <span style={{ marginLeft: 8 }}>
                    {tour.rating?.toFixed(1)} ({tour.review_count} yorum)
                  </span>
                </div>
                {tour.city ? (
                  <p style={{ margin: "0.35rem 0 0" }}>
                    <i className="flaticon-placeholder" /> {tour.city}
                    {tour.district ? `, ${tour.district}` : ""}
                  </p>
                ) : null}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--trv-primary)" }}>
                  {formatTrvPrice(tour.sale_price || tour.price, tour.price_unit)}
                </div>
              </div>
            </div>

            {gallery.length > 0 ? (
              <>
                <button type="button" onClick={() => setLightboxOpen(true)} style={{ border: 0, padding: 0, width: "100%", cursor: "zoom-in" }}>
                  <img src={gallery[activeImg]} alt={tour.title} className="trv-gallery-main" />
                </button>
                {gallery.length > 1 && (
                  <div className="trv-gallery-thumbs">
                    {gallery.map((img, i) => (
                      <button key={img} type="button" className={i === activeImg ? "active" : ""} onClick={() => setActiveImg(i)}>
                        <img src={img} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {tour.description ? (
              <div style={{ marginTop: "1.25rem" }}>
                <h2 style={{ fontFamily: "Afacad, sans-serif", color: "var(--trv-heading)" }}>Tur hakkında</h2>
                <p>{tour.description}</p>
              </div>
            ) : null}

            {tour.amenities && tour.amenities.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <h3 style={{ fontFamily: "Afacad, sans-serif" }}>Dahil olanlar</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {tour.amenities.map((a) => (
                    <span
                      key={a}
                      style={{
                        background: "#efffff",
                        border: "1px solid rgba(6,97,104,.12)",
                        borderRadius: 999,
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tour.itinerary && tour.itinerary.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <h3 style={{ fontFamily: "Afacad, sans-serif" }}>Güzergâh</h3>
                <ul className="trv-itinerary">
                  {tour.itinerary.map((row) => (
                    <li key={row.day}>
                      <div className="day">{row.day}</div>
                      <div>
                        <strong>{row.title}</strong>
                        <p style={{ margin: "0.25rem 0 0" }}>{row.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tour.reviews && tour.reviews.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <h3 style={{ fontFamily: "Afacad, sans-serif" }}>Yorumlar</h3>
                {tour.reviews.map((r, i) => (
                  <div key={`${r.author}-${i}`} className="trv-review">
                    <div className="trv-stars" style={{ marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <i key={s} className="las la-star" style={{ opacity: s <= r.rating ? 1 : 0.35 }} />
                      ))}
                      <strong style={{ marginLeft: 8 }}>{r.author}</strong>
                    </div>
                    <p style={{ margin: 0 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {relatedOthers.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <h2 style={{ fontFamily: "Afacad, sans-serif", color: "var(--trv-heading)" }}>Benzer turlar</h2>
              <div className="trv-tour-grid">
                {relatedOthers.map((t) => (
                  <TravllaTourCard key={t.id} tour={t} />
                ))}
              </div>
            </div>
          )}
        </div>

        <TravllaBookingForm tour={tour} />
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={activeImg}
        slides={gallery.map((src) => ({ src }))}
      />
    </TravllaShell>
  );
}
