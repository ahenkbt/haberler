import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Globe, Eye, Trash2, Star, RefreshCw, Search } from "lucide-react";

interface Listing {
  id: number; type: string; title: string; slug: string; city: string|null;
  price: string; price_unit: string; star_rating: number|null;
  status: string; is_featured: boolean; booking_count: number;
  rating: number; review_count: number; vendor_name: string|null;
  created_at: string;
}

const TYPE_LABELS: Record<string,string> = {
  hotel:"🏨 Otel", car:"🚗 Rent a Car", villa:"🏡 Villa & Ev", tour:"🗺️ Tur", boat:"⛵ Yat & Tekne",
};
const STATUS_LABELS: Record<string,string> = { active:"Aktif", inactive:"Pasif", deleted:"Silindi", pending:"Bekliyor" };
const STATUS_COLORS: Record<string,string> = {
  active:"bg-emerald-100 text-emerald-800", inactive:"bg-gray-100 text-gray-700",
  deleted:"bg-red-100 text-red-800", pending:"bg-amber-100 text-amber-800",
};

export default function TurizmIlanlar() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (typeFilter) q.set("type", typeFilter);
    if (statusFilter) q.set("status", statusFilter);
    const r = await fetch(`/api/tourism/admin/listings?${q}`).then(x=>x.json()).catch(()=>({listings:[],total:0}));
    setListings(r.listings || []);
    setTotal(r.total || 0);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { void load(1); }, [typeFilter, statusFilter]);

  const patch = async (id: number, body: object) => {
    await fetch(`/api/tourism/admin/listings/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    void load(page);
  };
  const del = async (id: number) => {
    if (!confirm("Bu ilanı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/tourism/admin/listings/${id}`, { method:"DELETE" });
    void load(page);
  };

  const filtered = listings.filter(l => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.vendor_name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Turizm İlanları">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">✈️ Turizm İlanları</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} ilan kayıtlı</p>
          </div>
          <button onClick={() => load(page)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..."
              className="pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400 w-48" />
          </div>
          <select value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400">
            <option value="">Tüm Türler</option>
            {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400">
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(TYPE_LABELS).map(([t,l]) => (
            <button key={t} onClick={()=>setTypeFilter(typeFilter===t?"":t)}
              className={`p-3 rounded-xl border text-center transition ${typeFilter===t ? "bg-cyan-50 border-cyan-300" : "bg-white border-gray-100 hover:bg-gray-50"}`}>
              <div className="text-lg">{l.split(" ")[0]}</div>
              <div className="text-xs font-bold text-gray-700 mt-1">{l.slice(3)}</div>
              <div className="text-gray-500 text-xs">{listings.filter(x=>x.type===t).length} ilan</div>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">İlan bulunamadı</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">İlan</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tür</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Şehir</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Fiyat</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Rezerv.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 max-w-xs truncate">{l.title}</div>
                        {l.vendor_name && <div className="text-xs text-gray-500">{l.vendor_name}</div>}
                        {l.is_featured && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600"><Star className="w-3 h-3 fill-amber-400" /> Öne Çıkan</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{TYPE_LABELS[l.type]}</td>
                      <td className="px-4 py-3 text-gray-600">{l.city || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {parseFloat(l.price).toLocaleString("tr-TR")}₺
                        <span className="text-gray-400 text-xs font-normal">/{l.price_unit}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{l.booking_count}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]||"bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[l.status]||l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={()=>patch(l.id,{status:l.status==="active"?"inactive":"active"})}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition ${l.status==="active" ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"}`}>
                            {l.status==="active" ? "Pasifleştir" : "Aktifleştir"}
                          </button>
                          <button onClick={()=>patch(l.id,{isFeatured:!l.is_featured})}
                            className="p-1.5 rounded-lg hover:bg-amber-50 transition" title="Öne Çıkar">
                            <Star className={`w-4 h-4 ${l.is_featured ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                          </button>
                          <a href={`/turizm/${l.type}/${l.slug}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition text-blue-500">
                            <Eye className="w-4 h-4" />
                          </a>
                          <button onClick={()=>del(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
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
