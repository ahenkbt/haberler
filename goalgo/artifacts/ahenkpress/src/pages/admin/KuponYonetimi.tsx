import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";

interface Coupon {
  id: number; code: string; vendorId?: number | null;
  discountType: string; discountValue: string;
  minOrderAmount?: string | null; maxUses?: number | null;
  usedCount: number; expiresAt?: string | null; active: boolean;
  createdAt: string;
}

const EMPTY_FORM = { code: "", discountType: "percent", discountValue: "", minOrderAmount: "", maxUses: "", expiresAt: "" };

export default function KuponYonetimi() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const d = await fetch("/api/delivery/coupons").then(r => r.json()).catch(() => []);
    setCoupons(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.code || !form.discountValue) { setError("Kod ve indirim değeri zorunlu."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/delivery/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minOrderAmount: form.minOrderAmount || null,
          maxUses: form.maxUses || null,
          expiresAt: form.expiresAt || null,
        }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || "Hata"); return; }
      await load();
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    } finally { setSaving(false); }
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/delivery/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !c.active } : x));
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm("Bu kuponu silmek istiyor musunuz?")) return;
    await fetch(`/api/delivery/coupons/${id}`, { method: "DELETE" });
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  return (
    <AdminLayout title="Kupon Kodu Yönetimi">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Kupon Kodları</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition"
          >
            <Plus className="w-4 h-4" /> Yeni Kupon
          </button>
        </div>

        {/* Create form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Yeni Kupon Oluştur</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Kupon Kodu *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="Örn: HOSGELDIN20"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">İndirim Türü</label>
                    <select
                      value={form.discountType}
                      onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="percent">Yüzde (%)</option>
                      <option value="fixed">Sabit Tutar (₺)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">İndirim Değeri *</label>
                    <input
                      type="number" min="0"
                      value={form.discountValue}
                      onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder={form.discountType === "percent" ? "20" : "50"}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Min. Sipariş Tutarı (₺)</label>
                    <input
                      type="number" min="0"
                      value={form.minOrderAmount}
                      onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                      placeholder="100"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Maks. Kullanım</label>
                    <input
                      type="number" min="1"
                      value={form.maxUses}
                      onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                      placeholder="Sınırsız"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Son Kullanım Tarihi</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor…" : "Kuponu Oluştur"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz kupon yok. İlk kuponu oluşturun.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Kod</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">İndirim</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Kullanım</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Son Tarih</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Durum</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition ${!c.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-700">
                      {c.discountType === "percent" ? `%${c.discountValue}` : `${c.discountValue}₺`}
                      {c.minOrderAmount && <span className="text-gray-400 text-xs ml-1">(min {c.minOrderAmount}₺)</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(c)} title={c.active ? "Pasife Al" : "Aktifleştir"}>
                        {c.active
                          ? <ToggleRight className="w-5 h-5 text-green-500 mx-auto" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400 mx-auto" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteCoupon(c.id)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
