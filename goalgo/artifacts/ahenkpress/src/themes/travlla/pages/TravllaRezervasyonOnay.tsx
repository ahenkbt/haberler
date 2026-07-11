import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TRV } from "../travllaPaths";

type BookingRow = {
  booking_ref: string;
  listing_title: string;
  customer_name: string;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number;
  total_price?: number | string;
  status?: string;
};

export default function TravllaRezervasyonOnay() {
  const [, params] = useRoute("/turizm/rezervasyon/:ref");
  const ref = params?.ref || "";
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/tourism/bookings/${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBooking(d);
          return;
        }
        try {
          const cached = sessionStorage.getItem(`trv-demo-booking:${ref}`);
          if (cached) setBooking(JSON.parse(cached) as BookingRow);
        } catch {
          setBooking(null);
        }
      })
      .catch(() => {
        try {
          const cached = sessionStorage.getItem(`trv-demo-booking:${ref}`);
          setBooking(cached ? (JSON.parse(cached) as BookingRow) : null);
        } catch {
          setBooking(null);
        }
      })
      .finally(() => setLoading(false));
  }, [ref]);

  return (
    <TravllaShell page="detail">
      <TravllaInnerBanner
        title="Rezervasyon Onayı"
        crumbs={[
          { label: "Seyahat", href: TRV.home },
          { label: "Rezervasyon" },
        ]}
      />
      <div className="container" style={{ padding: "2rem 0 3rem", maxWidth: 720 }}>
        <div className="trv-detail-panel">
          {loading ? (
            <p>Yükleniyor…</p>
          ) : !booking ? (
            <>
              <p>Rezervasyon kaydı bulunamadı.</p>
              <Link href={TRV.turlar} className="site-button">
                Turlara dön
              </Link>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: "Afacad, sans-serif", color: "var(--trv-primary)", marginTop: 0 }}>
                Talebiniz alındı
              </h2>
              <p>
                <strong>{booking.customer_name}</strong>, rezervasyon talebiniz işletmeye iletildi. Kısa süre içinde
                dönüş yapılacaktır.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "1.25rem 0" }}>
                <li>
                  <strong>Rezervasyon kodu:</strong> {booking.booking_ref}
                </li>
                <li>
                  <strong>Tur / ilan:</strong> {booking.listing_title}
                </li>
                {booking.check_in ? (
                  <li>
                    <strong>Tarih:</strong> {booking.check_in}
                    {booking.check_out ? ` → ${booking.check_out}` : ""}
                  </li>
                ) : null}
                {booking.guests ? (
                  <li>
                    <strong>Kişi:</strong> {booking.guests}
                  </li>
                ) : null}
                {booking.total_price ? (
                  <li>
                    <strong>Tahmini tutar:</strong> {Number(booking.total_price).toLocaleString("tr-TR")}₺
                  </li>
                ) : null}
              </ul>
              <Link href={TRV.home} className="site-button">
                Seyahat ana sayfası
              </Link>
            </>
          )}
        </div>
      </div>
    </TravllaShell>
  );
}
