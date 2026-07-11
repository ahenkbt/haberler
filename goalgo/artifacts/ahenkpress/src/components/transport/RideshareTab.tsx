import { useState, useEffect } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { AuthModal } from "../AuthModal";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import type { TrAddressValue } from "@/components/TrAddressFields";
import { TransportAddressPicker, combineTrAddressLine } from "./TransportAddressPicker";
import { ULASIM_QUICK_TR_STORAGE_KEY } from "@/lib/ulasimQuickLocation";

interface Offer {
  id: number; driverId: number; fromCity: string; toCity: string;
  fromAddress?: string; toAddress?: string; departureTime: string;
  totalSeats: number; availableSeats: number; pricePerSeat: string;
  description?: string; allowSmoke: boolean; allowPet: boolean; allowLuggage: boolean;
  status: string;
}

const emptyTr = (): TrAddressValue => ({ city: "", district: "", mahalle: "" });

function initialSearchFromTr(): TrAddressValue {
  try {
    const raw = localStorage.getItem(ULASIM_QUICK_TR_STORAGE_KEY);
    if (!raw) return emptyTr();
    const v = JSON.parse(raw) as Partial<TrAddressValue>;
    const city = String(v.city || "").trim();
    if (!city) return emptyTr();
    return { city, district: String(v.district || ""), mahalle: String(v.mahalle || "") };
  } catch {
    return emptyTr();
  }
}

export default function RideshareTab() {
  const { data: siteSettings } = useGetSiteSettings();
  const { user, token } = useCustomerAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFromTr, setSearchFromTr] = useState(initialSearchFromTr);
  const [searchToTr, setSearchToTr] = useState(emptyTr);
  const [date, setDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [bookingDone, setBookingDone] = useState<string | null>(null);

  const [routeFromTr, setRouteFromTr] = useState(emptyTr);
  const [routeToTr, setRouteToTr] = useState(emptyTr);
  const [meetTr, setMeetTr] = useState(emptyTr);
  const [meetDetail, setMeetDetail] = useState("");
  const [destTr, setDestTr] = useState(emptyTr);
  const [destDetail, setDestDetail] = useState("");

  const [form, setForm] = useState({
    departureTime: "", totalSeats: 3, pricePerSeat: "", description: "",
    allowSmoke: false, allowPet: false, allowLuggage: true,
  });

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchFromTr.city) params.set("from", searchFromTr.city);
    if (searchToTr.city) params.set("to", searchToTr.city);
    if (date) params.set("date", date);
    const res = await fetch(`/api/transport/rides?${params}`);
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { search(); }, []);

  async function bookOffer(offerId: number) {
    if (!token) { setShowAuth(true); return; }
    const res = await fetch(`/api/transport/rides/${offerId}/book`, {
      method: "POST", headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ seats: 1 }),
    });
    const data = await res.json();
    if (res.ok) { setBookingDone(`Rezervasyon ${data.id} oluşturuldu!`); search(); }
    else alert(data.error || "Hata oluştu");
  }

  async function createOffer() {
    if (!token) { setShowAuth(true); return; }
    if (!routeFromTr.city || !routeToTr.city) {
      alert("Kalkış ve varış ili seçin"); return;
    }
    const fromAddress = combineTrAddressLine(meetTr, meetDetail);
    const toAddress = combineTrAddressLine(destTr, destDetail);
    const res = await fetch("/api/transport/rides", {
      method: "POST", headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        fromCity: routeFromTr.city,
        toCity: routeToTr.city,
        fromAddress: fromAddress || undefined,
        toAddress: toAddress || undefined,
        departureTime: form.departureTime,
        totalSeats: form.totalSeats,
        pricePerSeat: form.pricePerSeat,
        description: form.description,
        allowSmoke: form.allowSmoke,
        allowPet: form.allowPet,
        allowLuggage: form.allowLuggage,
      }),
    });
    const data = await res.json();
    if (res.ok) { setShowCreate(false); search(); setBookingDone("Seferiniz oluşturuldu!"); }
    else alert(data.error || "Hata oluştu");
  }

  return (
    <div>
      {bookingDone && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 flex items-center gap-2">
          <span>✅</span><span>{bookingDone}</span>
          <button onClick={() => setBookingDone(null)} className="ml-auto text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {/* Arama */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">🔍 Sefer Ara</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nereden?</label>
            <LocationPickerGooglePrimary
              mapsSettings={siteSettings ?? null}
              compactGoogle
              googleLabel="1) Google"
              value={searchFromTr}
              onChange={setSearchFromTr}
              showSokak={false}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nereye?</label>
            <LocationPickerGooglePrimary
              mapsSettings={siteSettings ?? null}
              compactGoogle
              googleLabel="1) Google"
              value={searchToTr}
              onChange={setSearchToTr}
              showSokak={false}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tarih</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1" />
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <button onClick={search} className="flex-1 bg-orange-600 text-white py-2 rounded-xl font-medium hover:bg-orange-700 transition-colors">
            Ara
          </button>
          <button onClick={() => { if(!user){setShowAuth(true);return;} setShowCreate(true); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors text-sm">
            + Sefer Ekle
          </button>
        </div>
      </div>

      {/* Sefer Ekle Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Sefer Oluştur</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold">Güzergâh — nereden *</label>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <LocationPickerGooglePrimary
                    mapsSettings={siteSettings ?? null}
                    compactGoogle
                    value={routeFromTr}
                    onChange={setRouteFromTr}
                    showSokak={false}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold">Güzergâh — nereye *</label>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <LocationPickerGooglePrimary
                    mapsSettings={siteSettings ?? null}
                    compactGoogle
                    value={routeToTr}
                    onChange={setRouteToTr}
                    showSokak={false}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold">Buluşma noktası</label>
                <TransportAddressPicker
                  trValue={meetTr}
                  onTrChange={setMeetTr}
                  detail={meetDetail}
                  onDetailChange={setMeetDetail}
                  detailLabel="Sokak, bina, tarif"
                  detailPlaceholder="Kalkış / buluşma adresi"
                  onGeofill={({ address }) => {
                    setMeetDetail(address);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-semibold">Varış tarafı tarif (opsiyonel)</label>
                <TransportAddressPicker
                  trValue={destTr}
                  onTrChange={setDestTr}
                  detail={destDetail}
                  onDetailChange={setDestDetail}
                  detailLabel="Sokak, bina, tarif"
                  detailPlaceholder="İniş veya varış detayı"
                  onGeofill={({ address }) => {
                    setDestDetail(address);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tarih & Saat *</label>
                  <input type="datetime-local" value={form.departureTime} onChange={e=>setForm(f=>({...f,departureTime:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Koltuk sayısı</label>
                  <input type="number" min={1} max={7} value={form.totalSeats} onChange={e=>setForm(f=>({...f,totalSeats:parseInt(e.target.value)}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Koltuk başı fiyat (₺) *</label>
                  <input type="number" value={form.pricePerSeat} onChange={e=>setForm(f=>({...f,pricePerSeat:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="250" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Açıklama</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2 flex gap-4 flex-wrap">
                  {[{key:"allowSmoke" as const,label:"🚬 Sigara"},{key:"allowPet" as const,label:"🐾 Evcil hayvan"},{key:"allowLuggage" as const,label:"🧳 Bagaj"}].map(({key,label}) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm">İptal</button>
              <button onClick={createOffer} className="flex-1 bg-orange-600 text-white rounded-xl py-2 font-medium text-sm hover:bg-orange-700">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Sefer listesi */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🚗</div>
          <p>Sefer bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-gray-900">{offer.fromCity}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold text-lg text-gray-900">{offer.toCity}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    🕐 {new Date(offer.departureTime).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </p>
                  {offer.fromAddress && <p className="text-xs text-gray-400 mt-0.5">📍 {offer.fromAddress}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">💺 {offer.availableSeats}/{offer.totalSeats} koltuk</span>
                    {offer.allowSmoke && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">🚬</span>}
                    {offer.allowPet && <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">🐾</span>}
                    {offer.allowLuggage && <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full">🧳</span>}
                  </div>
                  {offer.description && <p className="text-xs text-gray-500 mt-2">{offer.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-orange-600">₺{offer.pricePerSeat}</p>
                  <p className="text-xs text-gray-400 mb-3">/ koltuk</p>
                  {offer.availableSeats > 0 ? (
                    <button onClick={() => bookOffer(offer.id)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
                      Rezerve Et
                    </button>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full">Dolu</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
