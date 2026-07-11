import { useState } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { AuthModal } from "../AuthModal";
import { mapsDirectionsHref } from "./GeofillAddressButton";
import { TransportAddressPicker, combineTrAddressLine } from "./TransportAddressPicker";
import type { TrAddressValue } from "@/components/TrAddressFields";

const emptyTr = (): TrAddressValue => ({ city: "", district: "", mahalle: "" });

export default function TaxiTab() {
  const { user, token } = useCustomerAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [done, setDone] = useState<{ code: string; id: number } | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!form.customerName || !form.customerPhone || !fromAddress) {
      alert("Ad, telefon ve alış adresi zorunlu");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      requestType: "taxi",
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
    if (res.ok) {
      setDone({ code: data.trackingCode, id: data.id });
    } else alert(data.error || "Hata oluştu");
    setLoading(false);
  }

  if (done)
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">🚕</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Taksi Talep Alındı!</h3>
        <p className="text-gray-600 mb-4">Size en yakın müsait sürücü atanacak.</p>
        <div className="bg-orange-50 rounded-xl px-6 py-3 inline-block mb-4">
          <p className="text-xs text-orange-600 font-medium">TAKİP KODU</p>
          <p className="text-2xl font-bold text-orange-700">{done.code}</p>
        </div>
        <div className="flex gap-3 justify-center mt-2">
          <a href={`/takip/${done.code}`} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-700">
            Takip Et
          </a>
          <button onClick={() => setDone(null)} className="border border-gray-200 px-6 py-2 rounded-xl text-sm">
            Yeni Talep
          </button>
        </div>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-bold text-lg mb-1 text-gray-900">🚕 Taksi Çağır</h2>
      <p className="text-sm text-gray-500 mb-5">Hızlı ve güvenli ulaşım — sürücü size atanır</p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ad Soyad *</label>
            <input
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              placeholder="Adınız"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
            <input
              value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              placeholder="05xx xxx xx xx"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Alış *</label>
          <TransportAddressPicker
            trValue={fromTr}
            onTrChange={setFromTr}
            detail={fromDetail}
            onDetailChange={setFromDetail}
            detailLabel="Sokak, bina, tarif (tam adres)"
            detailPlaceholder="Nerede alınsın?"
            onGeofill={({ address, lat, lng }) => {
              setFromDetail(address);
              setForm((f) => ({ ...f, fromLat: lat, fromLng: lng }));
            }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Gidilecek</label>
          <TransportAddressPicker
            trValue={toTr}
            onTrChange={setToTr}
            detail={toDetail}
            onDetailChange={setToDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Nereye gidilsin?"
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
            Google Haritalar’da adres tarifi (yeni sekme)
          </a>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Planlı Saat (opsiyonel)</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Not</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Özel istek..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full mt-5 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60"
      >
        {loading ? "Gönderiliyor..." : "Taksi Çağır"}
      </button>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
