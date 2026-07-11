import { useState, useEffect } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

interface TransportRequest {
  id: number; requestType: string; fromAddress: string; toAddress?: string;
  status: string; trackingCode?: string; createdAt: string; customerName: string;
}

interface RideBooking {
  id: number; offerId: number; seats: number; totalPrice: string;
  status: string; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:        "bg-yellow-100 text-yellow-700",
  accepted:       "bg-blue-100 text-blue-700",
  arrived_pickup: "bg-purple-100 text-purple-700",
  picked_up:      "bg-indigo-100 text-indigo-700",
  in_transit:     "bg-cyan-100 text-cyan-700",
  delivered:      "bg-green-100 text-green-700",
  cancelled:      "bg-red-100 text-red-700",
  rated:          "bg-gray-100 text-gray-700",
  confirmed:      "bg-green-100 text-green-700",
};

const STATUS_TR: Record<string, string> = {
  pending:"Bekliyor", accepted:"Kabul Edildi", arrived_pickup:"Gelindi",
  picked_up:"Alındı", in_transit:"Yolda", delivered:"Teslim Edildi",
  cancelled:"İptal", rated:"Tamamlandı", confirmed:"Onaylandı",
};

const TYPE_ICONS: Record<string, string> = {
  taxi:"🚕", courier:"📦", tow:"🛻", moving:"🚚", rideshare:"🚗",
};

export default function MyTripsTab() {
  const { token } = useCustomerAuth();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [bookings, setBookings] = useState<RideBooking[]>([]);
  const [tab, setTab] = useState<"requests"|"bookings">("requests");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    async function load() {
      setLoading(true);
      const [rRes, bRes] = await Promise.all([
        fetch("/api/transport/requests/my", { headers: { Authorization:`Bearer ${token}` } }),
        fetch("/api/transport/bookings/my", { headers: { Authorization:`Bearer ${token}` } }),
      ]);
      if (rRes.ok) setRequests(await rRes.json());
      if (bRes.ok) setBookings(await bRes.json());
      setLoading(false);
    }
    load();
  }, [token]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["requests","bookings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab===t?"bg-orange-600 text-white":"bg-white border border-gray-200 text-gray-600"}`}>
            {t === "requests" ? "📦 Taleplerim" : "🎫 Rezervasyonlarım"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : tab === "requests" ? (
        requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p>Henüz talebiniz yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{TYPE_ICONS[r.requestType] ?? "🚗"}</span>
                      <span className="font-semibold text-gray-900 capitalize">{r.requestType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_TR[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">📍 {r.fromAddress}</p>
                    {r.toAddress && <p className="text-sm text-gray-600">🎯 {r.toAddress}</p>}
                    {r.trackingCode && (
                      <p className="text-xs text-gray-400 mt-1">Takip: <strong className="text-orange-600">{r.trackingCode}</strong></p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</p>
                    {r.trackingCode && (
                      <a href={`/takip/${r.trackingCode}`}
                        className="mt-2 inline-block text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">
                        Takip Et →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        bookings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🎫</div>
            <p>Henüz rezervasyonunuz yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🚗</span>
                      <span className="font-semibold text-gray-900">Sefer #{b.offerId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_TR[b.status] ?? b.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">💺 {b.seats} koltuk</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(b.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">₺{b.totalPrice}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
