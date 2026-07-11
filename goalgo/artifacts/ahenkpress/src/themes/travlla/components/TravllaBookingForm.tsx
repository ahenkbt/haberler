import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import type { TravllaBookingForm, TravllaTour } from "../travllaTypes";
import { formatTrvPrice, priceUnitLabel } from "../travllaMedia";
import { TRV } from "../travllaPaths";

type Props = {
  tour: TravllaTour;
};

const API = "/api";

export function TravllaBookingForm({ tour }: Props) {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<TravllaBookingForm>({
    name: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const price = Number(tour.sale_price || tour.price || 0);
  const nights =
    form.checkIn && form.checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000,
          ),
        )
      : 1;
  const total =
    tour.price_unit === "kişi" || tour.price_unit === "person"
      ? price * Number(form.guests || 1)
      : price * nights;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setErr("Ad ve telefon zorunludur.");
      return;
    }
    setSending(true);
    setErr("");
    const r = await fetch(`${API}/tourism/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: tour.id,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email || null,
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        guests: form.guests,
        notes: form.notes,
      }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "Bağlantı hatası" }));
    setSending(false);
    if (r.success && r.bookingRef) {
      if (r.demo) {
        try {
          sessionStorage.setItem(
            `trv-demo-booking:${r.bookingRef}`,
            JSON.stringify({
              booking_ref: r.bookingRef,
              listing_title: r.listingTitle || tour.title,
              customer_name: form.name,
              check_in: form.checkIn || null,
              check_out: form.checkOut || null,
              guests: Number(form.guests) || 1,
              total_price: r.total ?? total,
            }),
          );
        } catch {
          /* ignore */
        }
      }
      navigate(TRV.rezervasyon(r.bookingRef));
      return;
    }
    setErr(r.error || "Rezervasyon oluşturulamadı.");
  }

  return (
    <div className="trv-booking-card">
      <div className="trv-price-lg">{formatTrvPrice(tour.sale_price || tour.price, tour.price_unit)}</div>
      <p style={{ margin: "0 0 1rem", color: "var(--trv-body)", fontSize: "0.9rem" }}>
        Anında talep — işletme onayı sonrası dönüş yapılır.
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.65rem" }}>
        <input
          required
          placeholder="Ad Soyad *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="trv-field-input"
          style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.65rem 0.8rem" }}
        />
        <input
          required
          type="tel"
          placeholder="Telefon *"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.65rem 0.8rem" }}
        />
        <input
          type="email"
          placeholder="E-posta"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.65rem 0.8rem" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            type="date"
            value={form.checkIn}
            onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
            style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.55rem 0.65rem" }}
          />
          <input
            type="date"
            value={form.checkOut}
            min={form.checkIn}
            onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
            style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.55rem 0.65rem" }}
          />
        </div>
        <input
          type="number"
          min={1}
          max={20}
          value={form.guests}
          onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
          style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.65rem 0.8rem" }}
        />
        <textarea
          rows={2}
          placeholder="Notlarınız"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          style={{ border: "1px solid rgba(6,97,104,.15)", borderRadius: 10, padding: "0.65rem 0.8rem", resize: "vertical" }}
        />
        {total > 0 && (
          <div style={{ background: "#f0fdfa", borderRadius: 10, padding: "0.75rem", fontSize: "0.9rem" }}>
            Tahmini toplam: <strong>{total.toLocaleString("tr-TR")}₺</strong> ({priceUnitLabel(tour.price_unit)})
          </div>
        )}
        {err ? <p style={{ color: "#dc2626", margin: 0, fontSize: "0.85rem" }}>{err}</p> : null}
        <button type="submit" className="site-button" disabled={sending} style={{ width: "100%" }}>
          {sending ? "Gönderiliyor…" : "Rezervasyon Yap"}
        </button>
      </form>
    </div>
  );
}
