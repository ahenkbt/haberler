import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Truck, Search, RefreshCw, ChevronDown, Phone, MapPin, Clock } from "lucide-react";

interface Order {
  id: number; orderNumber: string; customerName: string; customerPhone: string;
  customerAddress: string; status: string; totalAmount: string; paymentMethod: string;
  vendorId: number; vendorName?: string; createdAt: string; estimatedTime?: number;
  vendorNote?: string; notes?: string; items?: string; district?: string; city?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor", confirmed: "Onaylandı", preparing: "Hazırlanıyor",
  ready: "Hazır", picked_up: "Yolda", delivered: "Teslim Edildi", cancelled: "İptal Edildi",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800", ready: "bg-teal-100 text-teal-800",
  picked_up: "bg-indigo-100 text-indigo-800", delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
const ALL_STATUSES = Object.keys(STATUS_LABELS);

export default function TeslimatSiparisleri() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let url = "/api/delivery/orders?limit=200&withVendor=true";
    if (statusFilter) url += `&status=${statusFilter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const data = await fetch(url).then(r => r.json()).catch(() => []);
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (order: Order, newStatus: string) => {
    setUpdatingId(order.id);
    await fetch(`/api/delivery/orders/${order.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    setUpdatingId(null);
  };

  const parseItems = (items?: string) => {
    try { return items ? JSON.parse(items) : []; } catch { return []; }
  };

  return (
    <AdminLayout title="Teslimat Siparişleri">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">Teslimat Siparişleri</h1>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="Sipariş no, müşteri adı veya telefon…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">Tüm Durumlar</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={load} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">Filtrele</button>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_STATUSES.map(s => {
            const cnt = orders.filter(o => o.status === s).length;
            if (cnt === 0) return null;
            return (
              <button key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition ${statusFilter === s ? "border-orange-500" : "border-transparent"} ${STATUS_COLORS[s]}`}
              >
                {STATUS_LABELS[s]}: {cnt}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Sipariş bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(o => {
              const isExpanded = expanded === o.id;
              const parsedItems = parseItems(o.items);
              return (
                <div key={o.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* Header row */}
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpanded(isExpanded ? null : o.id)}
                  >
                    <div className="font-mono text-sm text-gray-600 min-w-[110px]">{o.orderNumber}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{o.customerName}</div>
                      {o.vendorName && <div className="text-xs text-gray-400">{o.vendorName}</div>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    <div className="text-sm font-bold text-gray-900">{parseFloat(o.totalAmount ?? "0").toFixed(2)}₺</div>
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {new Date(o.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Phone className="w-3.5 h-3.5" /> Müşteri Telefonu</div>
                          <a href={`tel:${o.customerPhone}`} className="text-blue-600 font-medium">{o.customerPhone}</a>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-gray-500 mb-1"><MapPin className="w-3.5 h-3.5" /> Adres</div>
                          <p className="text-gray-800">{o.customerAddress}{o.district ? `, ${o.district}` : ""}{o.city ? `, ${o.city}` : ""}</p>
                        </div>
                        {o.estimatedTime && (
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Clock className="w-3.5 h-3.5" /> Tahmini Süre</div>
                            <p className="text-gray-800">{o.estimatedTime} dk</p>
                          </div>
                        )}
                        <div>
                          <div className="text-gray-500 mb-1">Ödeme</div>
                          <p className="text-gray-800 capitalize">{o.paymentMethod}</p>
                        </div>
                      </div>

                      {/* Items */}
                      {parsedItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">SİPARİŞ İÇERİĞİ</p>
                          <div className="space-y-1">
                            {parsedItems.map((item: { name: string; quantity: number; price: number }, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-1.5 border">
                                <span className="text-gray-800">{item.quantity}x {item.name}</span>
                                <span className="text-gray-600 font-medium">{(item.price * item.quantity).toFixed(2)}₺</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {o.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                          <strong>Müşteri Notu:</strong> {o.notes}
                        </div>
                      )}

                      {/* Status update */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">DURUM GÜNCELLE</p>
                        <div className="flex flex-wrap gap-2">
                          {ALL_STATUSES.filter(s => s !== o.status).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(o, s)}
                              disabled={updatingId === o.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:opacity-80 disabled:opacity-40 ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700"}`}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
