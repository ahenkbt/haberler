import { useState } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { mapsDirectionsHref } from "./GeofillAddressButton";
import { TransportAddressPicker, combineTrAddressLine } from "./TransportAddressPicker";
import type { TrAddressValue } from "@/components/TrAddressFields";

const emptyTr = (): TrAddressValue => ({ city: "", district: "", mahalle: "" });

const TOW_REASONS = [
  { id:"breakdown", label:"Arıza / Motordan Ses", icon:"⚙️" },
  { id:"accident",  label:"Kaza",                icon:"💥" },
  { id:"flat",      label:"Lastik Patlak",        icon:"🔧" },
  { id:"battery",   label:"Akü Bitti",            icon:"🔋" },
  { id:"fuel",      label:"Yakıt Bitti",          icon:"⛽" },
  { id:"other",     label:"Diğer",               icon:"🆘" },
];

export default function TowTab() {
  const { user, token } = useCustomerAuth();
  const [done, setDone] = useState<{code:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("breakdown");
  const [fromTr, setFromTr] = useState(emptyTr);
  const [fromDetail, setFromDetail] = useState("");
  const [toTr, setToTr] = useState(emptyTr);
  const [toDetail, setToDetail] = useState("");
  const [form, setForm] = useState({
    customerName: user?.name ?? "", customerPhone: "",
    note: "",
    fromLat: undefined as number | undefined,
    fromLng: undefined as number | undefined,
    toLat: undefined as number | undefined,
    toLng: undefined as number | undefined,
  });

  const fromAddress = combineTrAddressLine(fromTr, fromDetail);
  const toAddress = combineTrAddressLine(toTr, toDetail);

  async function submit() {
    if (!form.customerName || !form.customerPhone || !fromAddress) {
      alert("Ad, telefon ve araç konumu zorunlu"); return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      requestType: "tow",
      extraData: { reason },
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      fromAddress,
      toAddress,
      note: form.note,
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
      headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) setDone({ code: data.trackingCode });
    else alert(data.error || "Hata");
    setLoading(false);
  }

  if (done) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="text-5xl mb-4">🛻</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Çekici Talebi Alındı!</h3>
      <p className="text-gray-600 mb-4">En yakın çekici yönlendiriliyor.</p>
      <div className="bg-orange-50 rounded-xl px-6 py-3 inline-block mb-4">
        <p className="text-xs text-orange-600 font-medium">TAKİP KODU</p>
        <p className="text-2xl font-bold text-orange-700">{done.code}</p>
      </div>
      <div className="flex gap-3 justify-center">
        <a href={`/takip/${done.code}`} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-medium">Takip Et</a>
        <button onClick={() => setDone(null)} className="border border-gray-200 px-6 py-2 rounded-xl text-sm">Yeni Talep</button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-bold text-lg mb-1 text-gray-900">🛻 Çekici Çağır</h2>
      <p className="text-sm text-gray-500 mb-5">Arıza veya kaza — hızlı yardım yolda</p>

      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-2 block">Sorun Nedir?</label>
        <div className="grid grid-cols-3 gap-2">
          {TOW_REASONS.map(r => (
            <button key={r.id} onClick={() => setReason(r.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${reason===r.id?"border-red-400 bg-red-50 text-red-700":"border-gray-200 hover:border-gray-300 text-gray-600"}`}>
              <span className="text-xl">{r.icon}</span><span className="text-center leading-tight">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ad Soyad *</label>
            <input value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
            <input value={form.customerPhone} onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="05xx xxx xx xx" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Aracın konumu *</label>
          <TransportAddressPicker
            trValue={fromTr}
            onTrChange={setFromTr}
            detail={fromDetail}
            onDetailChange={setFromDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Aracınızın bulunduğu tam tarif"
            onGeofill={({ address, lat, lng }) => {
              setFromDetail(address);
              setForm((f) => ({ ...f, fromLat: lat, fromLng: lng }));
            }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Çekilecek servis / adres (opsiyonel)</label>
          <TransportAddressPicker
            trValue={toTr}
            onTrChange={setToTr}
            detail={toDetail}
            onDetailChange={setToDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Hangi servise veya adrese çekilsin?"
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
            Google Haritalar’da çekici güzergâhı
          </a>
        )}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Araç ve Not</label>
          <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Araç markası, modeli, ek bilgi..." />
        </div>
      </div>

      <div className="mt-4 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
        🆘 Acil durumda <strong>112</strong> veya <strong>155</strong>'i arayın
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full mt-4 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60">
        {loading ? "Gönderiliyor..." : "🛻 Çekici Çağır"}
      </button>
    </div>
  );
}
