import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { CheckCircle, Calendar, Users, Phone } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import "@/styles/bookingCoreTurizm.css";

type BookingRow = {
  booking_ref: string;
  listing_title: string;
  listing_type?: string;
  customer_name: string;
  customer_phone?: string;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number;
  total_price?: number | string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
};

export default function BookingCoreRezervasyonOnay() {
  const [, params] = useRoute("/turizm/rezervasyon/:ref");
  const ref = params?.ref || "";
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/tourism/bookings/${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBooking(d))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [ref]);

  return (
    <BookingCoreShell module="konaklama" title="Rezervasyon Onayı">
      <div className="bc-stub" style={{ maxWidth: 640, margin: "0 auto" }}>
        {loading ? (
          <p>Yükleniyor…</p>
        ) : !booking ? (
          <>
            <p>Rezervasyon bulunamadı veya süresi dolmuş olabilir.</p>
            <Link href={TURIZM.hub} className="bc-stub__back">
              ← Seyahat ana sayfa
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 text-emerald-700">
              <CheckCircle className="w-10 h-10" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Rezervasyonunuz alındı</h2>
                <p className="text-sm text-gray-600">Referans kodu: <strong>{booking.booking_ref}</strong></p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 text-sm">
              <p><strong>{booking.listing_title}</strong></p>
              <p className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" /> {booking.customer_name}
                {booking.guests ? ` · ${booking.guests} kişi` : ""}
              </p>
              {booking.customer_phone ? (
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" /> {booking.customer_phone}
                </p>
              ) : null}
              {(booking.check_in || booking.check_out) ? (
                <p className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {booking.check_in || "—"}
                  {booking.check_out ? ` → ${booking.check_out}` : ""}
                </p>
              ) : null}
              {booking.total_price ? (
                <p className="font-bold text-blue-700 pt-2 border-t">
                  Toplam: {Number(booking.total_price).toLocaleString("tr-TR")} ₺
                </p>
              ) : null}
              <p className="text-xs text-gray-500">
                Durum:{" "}
                {booking.status === "confirmed"
                  ? "Onaylandı"
                  : booking.status === "pending"
                    ? "Bekliyor"
                    : booking.status || "Bekliyor"}
                {" · "}
                Ödeme:{" "}
                {booking.payment_status === "paid"
                  ? "Ödendi"
                  : booking.payment_method === "offline"
                    ? "Yerinde / offline (bekliyor)"
                    : "Bekliyor"}
              </p>
            </div>
            <Link href={TURIZM.hub} className="bc-stub__back mt-6 inline-block">
              ← Seyahat ana sayfa
            </Link>
          </>
        )}
      </div>
    </BookingCoreShell>
  );
}
