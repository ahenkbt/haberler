import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { RefreshCw, Search, Calendar, Phone, User, ChevronDown } from "lucide-react";

interface Booking {
  id: number; booking_ref: string; listing_type: string; listing_title: string;
  customer_name: string; customer_phone: string; customer_email: string|null;
  check_in: string|null; check_out: string|null; guests: number; nights: number|null;
  total_price: string; status: string; notes: string|null; vendor_name: string|null;
  created_at: string;
}

const STATUS_LABELS: Record<string,string> = {
  pending:"Bekliyor", confirmed:"Onaylandı", cancelled:"İptal", completed:"Tamamlandı",
};
const STATUS_COLORS: Record<string,string> = {
  pending:"bg-amber-100 text-amber-800", confirmed:"bg-emerald-100 text-emerald-800",
  cancelled:"bg-red-100 text-red-800", completed:"bg-blue-100 text-blue-800",
};
const TYPE_LABELS: Record<string,string> = {
  hotel:"🏨 Otel", car:"🚗 Rent a Car", villa:"🏡 Villa & Ev", tour:"🗺️ Tur", boat:"⛵ Yat & Tekne",
};

export default function TurizmRezervasyonlar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number|null>(null);

  const load = async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (statusFilter) q.set("status", statusFilter);
    if (typeFilter) q.set("type", typeFilter);
    const r = await fetch(`/api/tourism/admin/bookings?${q}`).then(x=>x.json()).catch(()=>({bookings:[],total:0}));
    setBookings(r.bookings || []);
    setTotal(r.total || 0);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { void load(1); }, [statusFilter, typeFilter]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/tourism/admin/bookings/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    void load(page);
  };

  const filtered = bookings.filter(b => !search ||
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.customer_phone.includes(search) ||
    b.booking_ref.includes(search.toUpperCase()) ||
    b.listing_title?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { total: bookings.length, pending: bookings.filter(b=>b.status==="pending").length, confirmed: bookings.filter(b=>b.status==="confirmed").length };

  return (
    <AdminLayout title="Turizm Rezervasyonları">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">📅 Turizm Rezervasyonları</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} rezervasyon toplam</p>
          </div>
          <button onClick={()=>load(page)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Toplam", val:counts.total, color:"bg-gray-100 text-gray-800" },
            { label:"Bekleyen", val:counts.pending, color:"bg-amber-100 text-amber-800" },
            { label:"Onaylanan", val:counts.confirmed, color:"bg-emerald-100 text-emerald-800" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{s.val}</div>
              <div className="text-gray-500 text-sm mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ad, telefon, kod..."
              className="pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400 w-52" />
          </div>
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value); setPage(1);}}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400">
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value); setPage(1);}}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400">
            <option value="">Tüm Türler</option>
            {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500">Rezervasyon bulunamadı</p>
            </div>
          ) : filtered.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 text-sm">{b.customer_name}</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{b.booking_ref}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]||"bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[b.status]||b.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 truncate">{TYPE_LABELS[b.listing_type]||b.listing_type} · {b.listing_title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span><Phone className="w-3 h-3 inline mr-0.5" />{b.customer_phone}</span>
                    {b.check_in && <span><Calendar className="w-3 h-3 inline mr-0.5" />{b.check_in}{b.check_out ? ` — ${b.check_out}` : ""}</span>}
                    <span><User className="w-3 h-3 inline mr-0.5" />{b.guests} kişi</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-gray-900">{parseFloat(b.total_price).toLocaleString("tr-TR")}₺</div>
                  <div className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("tr-TR")}</div>
                </div>
                <button onClick={()=>setExpanded(expanded===b.id?null:b.id)} className="ml-2 text-gray-400 hover:text-gray-600 transition">
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded===b.id?"rotate-180":""}`} />
                </button>
              </div>

              {expanded === b.id && (
                <div className="border-t border-gray-50 px-4 py-4 bg-gray-50/50">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                    {b.customer_email && <div><span className="text-gray-500">E-posta: </span>{b.customer_email}</div>}
                    {b.vendor_name && <div><span className="text-gray-500">Tedarikçi: </span>{b.vendor_name}</div>}
                    {b.nights && <div><span className="text-gray-500">Gece: </span>{b.nights}</div>}
                    {b.notes && <div className="sm:col-span-2"><span className="text-gray-500">Not: </span>{b.notes}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["pending","confirmed","completed","cancelled"].map(s => (
                      <button key={s} onClick={()=>updateStatus(b.id,s)} disabled={b.status===s}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${STATUS_COLORS[s]||"bg-gray-100 text-gray-700"} hover:opacity-80`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button disabled={page===1} onClick={()=>load(page-1)} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Önceki</button>
            <span className="px-4 py-2 text-sm text-gray-600">Sayfa {page} / {Math.ceil(total/20)}</span>
            <button disabled={page*20>=total} onClick={()=>load(page+1)} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Sonraki →</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
