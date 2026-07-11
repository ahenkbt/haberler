import { useState } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { mapsDirectionsHref } from "./GeofillAddressButton";
import { TransportAddressPicker, combineTrAddressLine } from "./TransportAddressPicker";
import type { TrAddressValue } from "@/components/TrAddressFields";

const emptyTr = (): TrAddressValue => ({ city: "", district: "", mahalle: "" });

const MOVE_TYPES = [
  { id:"home",    label:"Ev Taşıma",    icon:"🏠" },
  { id:"office",  label:"Ofis Taşıma",  icon:"🏢" },
  { id:"storage", label:"Depolama",     icon:"📦" },
  { id:"piano",   label:"Piyano / Kasa",icon:"🎹" },
  { id:"cargo",   label:"Büyük Kargo",  icon:"🚢" },
  { id:"other",   label:"Diğer",        icon:"🚚" },
];

const FLOORS = ["Zemin","1","2","3","4","5","6","7","8+"];

export default function MovingTab() {
  const { user, token } = useCustomerAuth();
  const [done, setDone] = useState<{code:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [moveType, setMoveType] = useState("home");
  const [fromTr, setFromTr] = useState(emptyTr);
  const [fromDetail, setFromDetail] = useState("");
  const [toTr, setToTr] = useState(emptyTr);
  const [toDetail, setToDetail] = useState("");
  const [form, setForm] = useState({
    customerName: user?.name ?? "", customerPhone: "",
    scheduledAt: "", note: "",
    fromLat: undefined as number | undefined,
    fromLng: undefined as number | undefined,
    toLat: undefined as number | undefined,
    toLng: undefined as number | undefined,
  });
  const [extra, setExtra] = useState({ fromFloor:"Zemin", toFloor:"Zemin", hasElevator:false, rooms:"3+1", approxM2:"" });

  const fromAddress = combineTrAddressLine(fromTr, fromDetail);
  const toAddress = combineTrAddressLine(toTr, toDetail);

  async function submit() {
    if (!form.customerName || !form.customerPhone || !fromAddress || !toAddress || !form.scheduledAt) {
      alert("Ad, telefon, adresler ve taşıma tarihi zorunlu"); return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      requestType: "moving",
      extraData: { moveType, ...extra },
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      fromAddress,
      toAddress,
      scheduledAt: form.scheduledAt,
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
      <div className="text-5xl mb-4">🚚</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Nakliyat Talebi Alındı!</h3>
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
      <h2 className="font-bold text-lg mb-1 text-gray-900">🚚 Nakliyat</h2>
      <p className="text-sm text-gray-500 mb-5">Ev, ofis ve büyük eşya taşıma hizmetleri</p>

      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-2 block">Taşıma Tipi</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MOVE_TYPES.map(t => (
            <button key={t.id} onClick={() => setMoveType(t.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${moveType===t.id?"border-orange-400 bg-orange-50 text-orange-700":"border-gray-200 text-gray-600"}`}>
              <span className="text-xl">{t.icon}</span><span>{t.label}</span>
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
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Çıkış adresi (nereden) *</label>
          <TransportAddressPicker
            trValue={fromTr}
            onTrChange={setFromTr}
            detail={fromDetail}
            onDetailChange={setFromDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Mevcut adres"
            onGeofill={({ address, lat, lng }) => {
              setFromDetail(address);
              setForm((f) => ({ ...f, fromLat: lat, fromLng: lng }));
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kat (çıkış)</label>
            <select value={extra.fromFloor} onChange={e=>setExtra(x=>({...x,fromFloor:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {FLOORS.map(f=><option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Oda sayısı</label>
            <select value={extra.rooms} onChange={e=>setExtra(x=>({...x,rooms:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["Stüdyo","1+0","1+1","2+1","3+1","4+1","5+1","Daha büyük"].map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={extra.hasElevator} onChange={e=>setExtra(x=>({...x,hasElevator:e.target.checked}))} />
              🛗 Asansör var
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-semibold">Varış adresi (nereye) *</label>
          <TransportAddressPicker
            trValue={toTr}
            onTrChange={setToTr}
            detail={toDetail}
            onDetailChange={setToDetail}
            detailLabel="Sokak, bina, tarif"
            detailPlaceholder="Yeni adres"
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
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Kat (varış)</label>
          <select value={extra.toFloor} onChange={e=>setExtra(x=>({...x,toFloor:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {FLOORS.map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Taşıma Tarihi *</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(f=>({...f,scheduledAt:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ek Bilgi</label>
          <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Özel eşya, dikkat edilmesi gerekenler..." />
        </div>
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full mt-5 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-60">
        {loading ? "Gönderiliyor..." : "Nakliyat Teklifi İste"}
      </button>
    </div>
  );
}
