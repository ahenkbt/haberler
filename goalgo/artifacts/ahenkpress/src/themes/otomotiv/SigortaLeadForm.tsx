import { useState } from "react";
import { Shield } from "lucide-react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { OTOMOTIV_SIGORTA_DISCLAIMER } from "./otomotivHubConfig";

export type SigortaLeadPrefill = {
  listingId?: number;
  listingTitle?: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
};

type Props = {
  prefill?: SigortaLeadPrefill;
  compact?: boolean;
};

/** Sigorta teklif lead formu — canlı fiyat yok; broker API entegrasyonu sonrası genişletilir */
export function SigortaLeadForm({ prefill, compact = false }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadType, setLeadType] = useState<"trafik" | "kasko" | "trafik_kasko">("kasko");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleHint = [prefill?.brand, prefill?.model, prefill?.year].filter(Boolean).join(" ");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(apiUrl("/api/otomotiv/sigorta/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: prefill?.listingId ?? null,
          lead_type: leadType,
          contact_name: name.trim(),
          contact_phone: phone.trim(),
          contact_email: email.trim() || null,
          vehicle_brand: prefill?.brand ?? null,
          vehicle_model: prefill?.model ?? null,
          vehicle_year: prefill?.year ?? null,
          message: message.trim() || (prefill?.listingTitle ? `İlan: ${prefill.listingTitle}` : null),
          source: prefill?.listingId ? "vehicle_listing" : "sigorta_page",
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Talep gönderilemedi");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="oto-sigorta-lead oto-sigorta-lead--done">
        <Shield aria-hidden className="oto-sigorta-lead__icon" />
        <p className="font-semibold text-[#1e3a5f]">Talebiniz alındı</p>
        <p className="text-sm text-gray-600 mt-1">
          Lisanslı sigorta acentemiz sizinle iletişime geçecektir. Poliçe ve ödeme işlemi acente ile yapılır.
        </p>
      </div>
    );
  }

  return (
    <form className={`oto-sigorta-lead${compact ? " oto-sigorta-lead--compact" : ""}`} onSubmit={(e) => void submit(e)}>
      <div className="oto-sigorta-lead__head">
        <Shield aria-hidden className="oto-sigorta-lead__icon" />
        <div>
          <h3>Sigorta teklifi al</h3>
          <p className="text-xs text-gray-500">Canlı fiyat broker API entegrasyonu sonrası. Şimdilik acente sizi arar.</p>
        </div>
      </div>

      {vehicleHint ? (
        <p className="oto-sigorta-lead__vehicle">
          Araç: <strong>{vehicleHint}</strong>
          {prefill?.listingTitle ? ` — ${prefill.listingTitle}` : null}
        </p>
      ) : null}

      <div className="oto-sigorta-lead__types">
        {(["kasko", "trafik", "trafik_kasko"] as const).map((t) => (
          <label key={t} className="oto-sigorta-lead__type">
            <input type="radio" name="leadType" value={t} checked={leadType === t} onChange={() => setLeadType(t)} />
            {t === "kasko" ? "Kasko" : t === "trafik" ? "Trafik" : "Trafik + Kasko"}
          </label>
        ))}
      </div>

      <div className="oto-sigorta-lead__fields">
        <input required placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} className="oto-sigorta-lead__input" />
        <input required type="tel" placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} className="oto-sigorta-lead__input" />
        <input type="email" placeholder="E-posta (isteğe bağlı)" value={email} onChange={(e) => setEmail(e.target.value)} className="oto-sigorta-lead__input" />
        {!compact ? (
          <textarea placeholder="Not (isteğe bağlı)" value={message} onChange={(e) => setMessage(e.target.value)} className="oto-sigorta-lead__textarea" rows={2} />
        ) : null}
      </div>

      {error ? <p className="oto-sigorta-lead__error">{error}</p> : null}

      <button type="submit" disabled={submitting} className="oto-hub__cta oto-hub__cta--primary oto-sigorta-lead__submit">
        {submitting ? "Gönderiliyor…" : "Teklif talebi gönder"}
      </button>

      <p className="oto-sigorta-lead__disclaimer">{OTOMOTIV_SIGORTA_DISCLAIMER}</p>
    </form>
  );
}
