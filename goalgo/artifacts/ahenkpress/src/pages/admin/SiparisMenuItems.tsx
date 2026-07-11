import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, ClipboardList } from "lucide-react";

export default function SiparisMenuItems() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("vendorId");
      const id = String(q ?? "").trim();
      if (/^\d+$/.test(id)) setVendorFilter(id);
    } catch {
      /* noop */
    }
  }, []);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    vendorId: "", name: "", description: "", price: "0", salePrice: "",
    imageUrl: "", preparationTime: 15, active: true,
    isVegan: false, isSpicy: false, isPopular: false,
  });

  const { data: itemsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/menu-items-all", vendorFilter, search],
    queryFn: () =>
      apiRequest(`/api/delivery/menu-items-all${vendorFilter ? `?vendorId=${vendorFilter}` : ""}${search ? `${vendorFilter ? "&" : "?"}search=${encodeURIComponent(search)}` : ""}`).then(asArray),
    staleTime: 20_000,
  });
  const items = asArray(itemsData);

  const { data: vendorsData } = useQuery<any[]>({
    queryKey: ["/api/delivery/vendors-admin", "delivery-only"],
    queryFn: () => apiRequest("/api/delivery/vendors-admin?type=delivery").then(asArray),
    staleTime: 60_000,
  });
  const vendors = asArray(vendorsData);

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("/api/delivery/menu-items", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/menu-items-all"] }); closeForm(); toast({ title: "Ürün oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => apiRequest(`/api/delivery/menu-items/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/menu-items-all"] }); closeForm(); toast({ title: "Güncellendi" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/delivery/menu-items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/menu-items-all"] }); toast({ title: "Silindi" }); },
  });

  function openCreate() {
    setForm({ vendorId: "", name: "", description: "", price: "0", salePrice: "", imageUrl: "", preparationTime: 15, active: true, isVegan: false, isSpicy: false, isPopular: false });
    setEditId(null); setShowForm(true);
  }
  function openEdit(item: any) { setForm({ ...item, vendorId: String(item.vendorId || ""), salePrice: item.salePrice || "" }); setEditId(item.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function normalizeMoney(v: string) {
    const s = String(v ?? "").trim().replace(/\s/g, "");
    if (!s) return "0";
    if (s.includes(",")) {
      const [a, b] = s.split(",", 2);
      const intPart = (a ?? "").replace(/\./g, "");
      const decPart = b ?? "";
      return decPart ? `${intPart || "0"}.${decPart}` : intPart || "0";
    }
    return s.replace(/,/g, ".");
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const d = {
      ...form,
      vendorId: parseInt(form.vendorId, 10),
      price: normalizeMoney(String(form.price)),
      salePrice: form.salePrice ? normalizeMoney(String(form.salePrice)) : null,
    };
    if (editId) updateMut.mutate({ id: editId, d });
    else createMut.mutate(d);
  }

  const vendorMap: Record<number, string> = {};
  (vendors as any[]).forEach(v => { vendorMap[v.id] = v.name; });

  return (
    <AdminLayout title="Menü Ürünleri">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" /> Menü Ürünleri
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Sipariş işletmelerinin menü ürünleri</p>
          </div>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni Ürün
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün adı..." className="pl-9" />
          </div>
          <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white min-w-[160px]">
            <option value="">Tüm işletmeler</option>
            {(vendors as any[]).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Menü ürünü bulunamadı</p></div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ürün</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">İşletme</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fiyat</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Etiket</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item: any) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-base flex-shrink-0">🍽️</div>}
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.description && <div className="text-xs text-gray-400 truncate max-w-[180px]">{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{vendorMap[item.vendorId] || `#${item.vendorId}`}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">₺{Number(item.price).toFixed(2)}</div>
                      {item.salePrice && <div className="text-xs text-green-600">İndirim: ₺{Number(item.salePrice).toFixed(2)}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.isVegan && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Vegan</Badge>}
                        {item.isSpicy && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Acılı</Badge>}
                        {item.isPopular && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Popüler</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`"${item.name}" silinsin mi?`)) deleteMut.mutate(item.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 text-right">{items.length} ürün</p>
      </div>

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Ürünü Düzenle" : "Yeni Menü Ürünü"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div><label className="text-xs font-bold text-gray-600">İşletme *</label>
              <select value={form.vendorId} onChange={e => setF("vendorId", e.target.value)} required
                className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white">
                <option value="">-- İşletme Seç --</option>
                {(vendors as any[]).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-bold text-gray-600">Ürün Adı *</label>
              <Input value={form.name} onChange={e => setF("name", e.target.value)} required /></div>
            <div><label className="text-xs font-bold text-gray-600">Açıklama</label>
              <textarea value={form.description || ""} onChange={e => setF("description", e.target.value)} rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm mt-1 resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-gray-600">Fiyat (₺) *</label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setF("price", e.target.value)} required /></div>
              <div><label className="text-xs font-bold text-gray-600">İndirimli Fiyat (₺)</label>
                <Input type="number" step="0.01" value={form.salePrice} onChange={e => setF("salePrice", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Hazırlık Süresi (dk)</label>
                <Input type="number" value={form.preparationTime} onChange={e => setF("preparationTime", parseInt(e.target.value))} /></div>
            </div>
            <div><label className="text-xs font-bold text-gray-600">Görsel URL</label>
              <Input value={form.imageUrl || ""} onChange={e => setF("imageUrl", e.target.value)} /></div>
            <div className="flex flex-wrap gap-4">
              {[["active","Aktif"],["isVegan","Vegan"],["isSpicy","Acılı"],["isPopular","Popüler"]].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={e => setF(k, e.target.checked)} />{label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{editId ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
