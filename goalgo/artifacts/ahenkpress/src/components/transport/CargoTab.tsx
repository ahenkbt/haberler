import { useState } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { mapsDirectionsHref } from "./GeofillAddressButton";
import { TransportAddressPicker, combineTrAddressLine } from "./TransportAddressPicker";
import type { TrAddressValue } from "@/components/TrAddressFields";

const emptyTr = (): TrAddressValue => ({ city: "", district: "", mahalle: "" });

const CARGO_TYPES = [
  { id: "palet", label: "Palet / Koli", icon: "📦" },
  { id: "parsiyel", label: "Parsiyel yük", icon: "🚛" },
  { id: "komple", label: "Komple araç", icon: "🚚" },
  { id: "diger", label: "Diğer", icon: "📮" },
];

export default function CargoTab() {
  const { user, token } = useCustomerAuth();
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cargoKind, setCargoKind] = useState("palet");
  const [fromTr, setFromTr] = useState(emptyTr);
  const [fromDetail, setFromDetail] = useState("");
  const [toTr, setToTr] = useState(emptyTr);
  const [toDetail, setToDetail] = useState("");
  const [form, setForm] = useState({
    customerName: user?.name ?? "",
    customerPhone: "",
    note: "",
    scheduledAt: "",
    fromLat: undefined as number | undefined,
    fromLng: undefined as number | undefined,
    toLat: undefined as number | undefined,
    toLng: undefined as number | undefined,
  });

  const fromAddress = combineTrAddressLine(fromTr, fromDetail);
  const toAddress = combineTrAddressLine(toTr, toDetail);

  async function submit() {
    if (!form.customerName || !form.customerPhone || !fromAddress || !toAddress) {
      window.alert("Ad, telefon, yükleme ve teslim adresi zorunludur");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      requestType: "cargo",
      extraData: { cargoKind },
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      fromAddress,
      toAddress,
      note: form.note,
      scheduledAt: form.scheduledAt,
    };
    if (form.fromLat != null && form.fromLng != null) {
      payload.fromLat = form.fromLat;
      payload.fromLng = form.fromLng;
    }
    if (form.toLat != null && form.toLng != null) {
      payload.toLat = form.toLat;
      payload.toLng = form.toLng;
    }
    const res = await fetch("/api/transport/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) setDone({ code: data.trackingCode });
    else window.alert(data.error || "Hata");
    setLoading(false);
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">📮</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Kargo talebi alındı</h3>
        <div className="bg-orange-50 rounded-xl px-6 py-3 inline-block mb-4">
          <p className="text-xs text-orange-600 font-medium">TAKİP KODU</p>
          <p className="text-2xl font-bold text-orange-700">{done.code}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <a href={`/takip/${done.code}`} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-700">
            Takip et
          </a>
          <button type="button" onClick={() => setDone(null)} className="border border-gray-200 px-6 py-2 rounded-xl text-sm">
            Yeni talep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-bold text-lg mb-1 text-gray-900">📮 Kargo & palet</h2>
      <p className="text-sm text-gray-500 mb-5">Şehirler arası veya şehir içi yük taşıma talebi</p>

      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-2 block">Yük tipi</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CARGO_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCargoKind(t.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                cargoKind === t.id ? "border-purple-400 bg-purple-50 text-purple-800" : "border-gray-200 text-gray-600"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ad Soyad *</label>
            <input
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
            <input
              value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              placeholder="05xx xxx xx xx"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Yükleme adresi *</label>
          <TransportAddressPicker
            trValue={fromTr}
            onTrChange={setFromTr}
            detail={fromDetail}
            onDetailChange={setFromDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Yük nereden alınsın?"
            onGeofill={({ address, lat, lng }) => {
              setFromDetail(address);
              setForm((f) => ({ ...f, fromLat: lat, fromLng: lng }));
            }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Teslim adresi *</label>
          <TransportAddressPicker
            trValue={toTr}
            onTrChange={setToTr}
            detail={toDetail}
            onDetailChange={setToDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Nereye teslim?"
            onGeofill={({ address, lat, lng }) => {
              setToDetail(address);
              setForm((f) => ({ ...f, toLat: lat, toLng: lng }));
            }}
          />
        </div>
        {mapsDirectionsHref(fromAddress, toAddress) && (
          <a
            href={mapsDirectionsHref(fromAddress, toAddress)!}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-medium text-blue-600 hover:underline"
          >
            Güzergâhı haritada aç
          </a>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Plan (opsiyonel)</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ağırlık / hacim notu</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              placeholder="Örn. 12 palet, forklift gerekli…"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full mt-5 bg-purple-700 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 disabled:opacity-60"
      >
        {loading ? "Gönderiliyor…" : "Kargo talebi oluştur"}
      </button>
    </div>
  );
}
