import { Link } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import type { TravllaTour } from "../travllaTypes";
import { TRV } from "../travllaPaths";
import { formatTrvPrice, priceUnitLabel, trvImageFor } from "../travllaMedia";

type Props = {
  tour: TravllaTour;
  linkPrefix?: "tur" | "legacy";
};

export function TravllaTourCard({ tour, linkPrefix = "tur" }: Props) {
  const href =
    tour.href ||
    (linkPrefix === "legacy" && tour.type
      ? `/turizm/${tour.type}/${tour.slug}`
      : TRV.tur(tour.slug));
  const img =
    resolveClientMediaSrc(tour.image_url) ||
    trvImageFor(tour.city || tour.slug, tour.image_url);
  const price = tour.sale_price && Number(tour.sale_price) < Number(tour.price) ? tour.sale_price : tour.price;
  const days =
    tour.duration_days && tour.duration_nights
      ? `${tour.duration_days} gün, ${tour.duration_nights} gece`
      : tour.duration_days
        ? `${tour.duration_days} gün`
        : "Esnek program";

  return (
    <article className="trv-tour-card">
      <div className="trv-tour-media">
        <Link href={href}>
          <img src={img} alt={tour.title} loading="lazy" />
        </Link>
        <div className="trv-tour-bottom">
          <h3 style={{ margin: 0, color: "#066168", fontFamily: "Afacad, sans-serif" }}>
            <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
              <i className="flaticon-placeholder" style={{ marginRight: 6 }} />
              {tour.title}
            </Link>
          </h3>
        </div>
        <div className="trv-tour-hover">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
            <span
              style={{
                background: "var(--trv-primary)",
                color: "#fff",
                borderRadius: "999px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <i className="bi bi-calendar2-week" style={{ marginRight: 6 }} />
              {days}
            </span>
            <div style={{ textAlign: "right" }}>
              <div className="trv-tour-price">{formatTrvPrice(price, tour.price_unit).split(" /")[0]}</div>
              <span style={{ fontSize: "0.85rem" }}>{priceUnitLabel(tour.price_unit)}</span>
            </div>
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.75rem", fontFamily: "Afacad, sans-serif" }}>{tour.title}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <Link href={href} className="site-button outline">
                Rezervasyon
              </Link>
              <div className="trv-stars">
                <span style={{ color: "#fff", marginRight: 6, fontSize: "0.85rem" }}>
                  ({tour.review_count} yorum)
                </span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <i
                    key={s}
                    className={`las la-star${s <= Math.round(tour.rating || 0) ? "" : ""}`}
                    style={{ opacity: s <= Math.round(tour.rating || 0) ? 1 : 0.35 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
