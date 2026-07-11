import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DELIVERY_MODULES,
  deliveryCategoryBelongsToModule,
} from "@/lib/deliveryModuleGroups";
import { Plus, Pencil, Trash2, Tags, ChevronDown, ChevronRight, Layers, Package } from "lucide-react";

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type MainCat = { id: number; name: string; slug: string; icon: string; position: number; active: boolean; super_category?: string };
type SubCat  = { id: number; category_id: number; name: string; slug: string; icon: string; position: number; active: boolean };
type Template = { id: number; vendor_category_id: number; name: string; position: number; active: boolean };

export default function SiparisKategoriler() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"main" | "sub" | "templates">("main");

  /* ── seeding ── */
  const [seeding, setSeeding] = useState(false);
  async function seedExtended() {
    setSeeding(true);
    try {
      const r = await fetch("/api/delivery/seed-extended-categories", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        toast({ title: "Tüm kategoriler ve şablonlar eklendi!" });
        qc.invalidateQueries({ queryKey: ["/api/admin/vendor-categories"] });
        qc.invalidateQueries({ queryKey: ["/api/admin/vendor-subcategories"] });
        qc.invalidateQueries({ queryKey: ["/api/admin/product-templates"] });
      } else {
        toast({ title: "Hata", description: d.error, variant: "destructive" });
      }
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AdminLayout title="Mağaza Kategorileri">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tags className="w-5 h-5 text-orange-500" /> Sipariş & Mağaza Kategorileri
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Ana kategoriler, yemek alt tipleri ve ürün şablonlarını yönetin</p>
          </div>
          <Button onClick={seedExtended} disabled={seeding} variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs">
            {seeding ? "Ekleniyor..." : "🌱 Tüm Kategorileri Seed Et"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {[
            { key: "main", label: "Ana Kategoriler", icon: Tags },
            { key: "sub", label: "Alt Kategoriler (Yemek Tipleri)", icon: Layers },
            { key: "templates", label: "Ürün Şablonları", icon: Package },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${tab === key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "main"      && <MainCategoriesTab />}
        {tab === "sub"       && <SubCategoriesTab />}
        {tab === "templates" && <ProductTemplatesTab />}
      </div>
    </AdminLayout>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN CATEGORIES TAB
══════════════════════════════════════════════════════════════ */
function MainCategoriesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "", position: 0, superCategory: "siparis", active: true });

  const { data: catsData, isLoading } = useQuery<MainCat[]>({
    queryKey: ["/api/admin/vendor-categories"],
    queryFn: () => apiRequest("/api/admin/vendor-categories").then(asArray),
    staleTime: 30_000,
  });
  const cats = asArray(catsData);

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("/api/admin/vendor-categories", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-categories"] }); closeForm(); toast({ title: "Kategori oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => apiRequest(`/api/admin/vendor-categories/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-categories"] }); closeForm(); toast({ title: "Güncellendi" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/vendor-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-categories"] }); toast({ title: "Silindi" }); },
  });

  function openCreate() { setForm({ name: "", slug: "", icon: "", position: cats.length * 2, superCategory: "siparis", active: true }); setEditId(null); setShowForm(true); }
  function openEdit(c: MainCat) { setForm({ name: c.name, slug: c.slug, icon: c.icon || "", position: c.position || 0, superCategory: c.super_category || "siparis", active: c.active !== false }); setEditId(c.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, d: form });
    else createMut.mutate(form);
  }

  const siparisKats  = cats.filter(c => !c.super_category || c.super_category === "siparis" || c.super_category === "her_ikisi");
  const alisverisKats = cats.filter(c => c.super_category === "alisveris" || c.super_category === "her_ikisi");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Kategori
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">🛵 Sipariş Kategorileri ({siparisKats.length})</h2>
            <p className="mb-4 text-xs text-gray-600">
              Herkese açık vitrindeki Yemek, Market ve Yakındaki İşletmeler ayrımı kategori adı/slug değerlerinden otomatik belirlenir.
            </p>
            <div className="space-y-5">
              {DELIVERY_MODULES.map((mod) => {
                const grouped = siparisKats.filter((cat) => deliveryCategoryBelongsToModule(cat, mod.key));
                return (
                  <div key={mod.key}>
                    <h3 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                      <span>{mod.emoji}</span> {mod.label} ({grouped.length})
                    </h3>
                    <CategoryTable cats={grouped} onEdit={openEdit} onDelete={id => { if (confirm("Silinsin mi?")) deleteMut.mutate(id); }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">🛍️ Alışveriş Kategorileri ({alisverisKats.length})</h2>
            <CategoryTable cats={alisverisKats} onEdit={openEdit} onDelete={id => { if (confirm("Silinsin mi?")) deleteMut.mutate(id); }} />
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Kategoriyi Düzenle" : "Yeni Kategori"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div><label className="text-xs font-bold text-gray-600">Ad *</label>
              <Input value={form.name} onChange={e => { setF("name", e.target.value); if (!editId && !form.slug) setF("slug", slugify(e.target.value)); }} required />
            </div>
            <div><label className="text-xs font-bold text-gray-600">Slug *</label>
              <Input value={form.slug} onChange={e => setF("slug", e.target.value)} required />
            </div>
            <div><label className="text-xs font-bold text-gray-600">İkon (emoji)</label>
              <Input value={form.icon} onChange={e => setF("icon", e.target.value)} placeholder="🍕" maxLength={4} />
            </div>
            <div><label className="text-xs font-bold text-gray-600">Mağaza Türü *</label>
              <select value={form.superCategory} onChange={e => setF("superCategory", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="siparis">🛵 Sipariş (Teslimat)</option>
                <option value="alisveris">🛍️ Alışveriş (E-ticaret)</option>
                <option value="her_ikisi">🔀 Her İkisi</option>
              </select>
            </div>
            <div><label className="text-xs font-bold text-gray-600">Sıralama</label>
              <Input type="number" value={form.position} onChange={e => setF("position", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mc-active" checked={form.active} onChange={e => setF("active", e.target.checked)} className="w-4 h-4" />
              <label htmlFor="mc-active" className="text-xs font-bold text-gray-600">Aktif</label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{editId ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryTable({ cats, onEdit, onDelete }: { cats: MainCat[]; onEdit: (c: MainCat) => void; onDelete: (id: number) => void }) {
  if (cats.length === 0) return <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-xl border">Bu türde kategori yok</div>;
  return (
    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">İkon</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Ad</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Slug</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Sıra</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-20">Durum</th>
            <th className="px-4 py-3 w-24" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {cats.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xl">{c.icon || "📦"}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden md:table-cell">{c.slug}</td>
              <td className="px-4 py-3 text-gray-500">{c.position}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {c.active ? "Aktif" : "Pasif"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => onEdit(c)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB CATEGORIES TAB
══════════════════════════════════════════════════════════════ */
function SubCategoriesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "", position: 0 });
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const { data: catsData2 } = useQuery<MainCat[]>({
    queryKey: ["/api/admin/vendor-categories"],
    queryFn: () => apiRequest("/api/admin/vendor-categories").then(asArray),
    staleTime: 30_000,
  });
  const cats = asArray(catsData2);
  const { data: allSubsData } = useQuery<SubCat[]>({
    queryKey: ["/api/admin/vendor-subcategories"],
    queryFn: () => apiRequest("/api/admin/vendor-subcategories").then(asArray),
    staleTime: 30_000,
  });
  const allSubs = asArray(allSubsData);

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("/api/admin/vendor-subcategories", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-subcategories"] }); closeForm(); toast({ title: "Alt kategori oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => apiRequest(`/api/admin/vendor-subcategories/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-subcategories"] }); closeForm(); toast({ title: "Güncellendi" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/vendor-subcategories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/vendor-subcategories"] }); toast({ title: "Silindi" }); },
  });

  function openCreate(catId: number) {
    setSelectedCatId(catId);
    const subsForCat = allSubs.filter(s => s.category_id === catId);
    setForm({ name: "", slug: "", icon: "", position: subsForCat.length });
    setEditId(null); setShowForm(true);
  }
  function openEdit(s: SubCat) {
    setSelectedCatId(s.category_id);
    setForm({ name: s.name, slug: s.slug, icon: s.icon || "", position: s.position || 0 });
    setEditId(s.id); setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, d: form });
    else createMut.mutate({ ...form, categoryId: selectedCatId });
  }
  function toggleExpand(catId: number) {
    setExpandedCats(s => { const n = new Set(s); if (n.has(catId)) n.delete(catId); else n.add(catId); return n; });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Her ana kategorinin altına alt tip ekleyin. Örnek: <strong>Yemek</strong> → Burger, Pizza, Kebap... 
        Müşteriler sipariş sayfasında bu tip'e göre filtre yapabilir.
      </p>

      {cats.filter(c => !c.super_category || c.super_category === "siparis" || c.super_category === "her_ikisi").map(cat => {
        const subs = allSubs.filter(s => s.category_id === cat.id);
        const expanded = expandedCats.has(cat.id);
        return (
          <div key={cat.id} className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <button
              onClick={() => toggleExpand(cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon || "📦"}</span>
                <div className="text-left">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{subs.length} alt kategori</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); openCreate(cat.id); }}>
                  <Plus className="w-3 h-3 mr-1" /> Ekle
                </Button>
                {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t">
                {subs.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">Alt kategori yok. "Ekle" butonuna basın.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs w-10">İkon</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs">Ad</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs hidden sm:table-cell">Slug</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs w-12">Sıra</th>
                        <th className="px-4 py-2 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subs.sort((a, b) => a.position - b.position).map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-base">{s.icon || "•"}</td>
                          <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                          <td className="px-4 py-2 text-gray-400 font-mono text-xs hidden sm:table-cell">{s.slug}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{s.position}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Pencil className="w-3 h-3" /></Button>
                              <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => { if (confirm("Silinsin mi?")) deleteMut.mutate(s.id); }}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Alt Kategoriyi Düzenle" : "Yeni Alt Kategori"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div><label className="text-xs font-bold text-gray-600">Ad *</label>
              <Input value={form.name} onChange={e => { setF("name", e.target.value); if (!editId) setF("slug", slugify(e.target.value)); }} required />
            </div>
            <div><label className="text-xs font-bold text-gray-600">Slug *</label>
              <Input value={form.slug} onChange={e => setF("slug", e.target.value)} required />
            </div>
            <div><label className="text-xs font-bold text-gray-600">İkon (emoji)</label>
              <Input value={form.icon} onChange={e => setF("icon", e.target.value)} placeholder="🍔" maxLength={4} />
            </div>
            <div><label className="text-xs font-bold text-gray-600">Sıralama</label>
              <Input type="number" value={form.position} onChange={e => setF("position", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{editId ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT TEMPLATES TAB
══════════════════════════════════════════════════════════════ */
function ProductTemplatesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", position: 0 });
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const { data: catsData3 } = useQuery<MainCat[]>({
    queryKey: ["/api/admin/vendor-categories"],
    queryFn: () => apiRequest("/api/admin/vendor-categories").then(asArray),
    staleTime: 30_000,
  });
  const cats = asArray(catsData3);
  const { data: allTemplatesData } = useQuery<Template[]>({
    queryKey: ["/api/admin/product-templates"],
    queryFn: () => apiRequest("/api/admin/product-templates").then(asArray),
    staleTime: 30_000,
  });
  const allTemplates = asArray(allTemplatesData);

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("/api/admin/product-templates", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/product-templates"] }); closeForm(); toast({ title: "Şablon oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => apiRequest(`/api/admin/product-templates/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/product-templates"] }); closeForm(); toast({ title: "Güncellendi" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/product-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/product-templates"] }); toast({ title: "Silindi" }); },
  });

  function openCreate(catId: number) {
    setSelectedCatId(catId);
    const tmplsForCat = allTemplates.filter(t => t.vendor_category_id === catId);
    setForm({ name: "", position: tmplsForCat.length });
    setEditId(null); setShowForm(true);
  }
  function openEdit(t: Template) {
    setSelectedCatId(t.vendor_category_id);
    setForm({ name: t.name, position: t.position || 0 });
    setEditId(t.id); setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, d: form });
    else createMut.mutate({ ...form, vendorCategoryId: selectedCatId });
  }
  function toggleExpand(catId: number) {
    setExpandedCats(s => { const n = new Set(s); if (n.has(catId)) n.delete(catId); else n.add(catId); return n; });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Her işletme türü için varsayılan ürün kategorileri. İşletme açıldığında bu şablonlar menü kategorisi olarak kullanılabilir.
      </p>

      {cats.map(cat => {
        const tmpls = allTemplates.filter(t => t.vendor_category_id === cat.id);
        const expanded = expandedCats.has(cat.id);
        return (
          <div key={cat.id} className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <button
              onClick={() => toggleExpand(cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon || "📦"}</span>
                <div className="text-left">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{tmpls.length} ürün şablonu</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); openCreate(cat.id); }}>
                  <Plus className="w-3 h-3 mr-1" /> Ekle
                </Button>
                {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t">
                {tmpls.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">Ürün şablonu yok. "Ekle" butonuna basın veya "Seed Et" kullanın.</div>
                ) : (
                  <div className="p-3 flex flex-wrap gap-2">
                    {tmpls.sort((a, b) => a.position - b.position).map(t => (
                      <div key={t.id} className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 text-sm">
                        <span className="font-medium text-orange-800">{t.name}</span>
                        <button onClick={() => openEdit(t)} className="ml-1 text-gray-400 hover:text-orange-600"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => { if (confirm("Silinsin mi?")) deleteMut.mutate(t.id); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Şablonu Düzenle" : "Yeni Ürün Şablonu"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div><label className="text-xs font-bold text-gray-600">Şablon Adı *</label>
              <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Örn: Meyve & Sebze" required />
            </div>
            <div><label className="text-xs font-bold text-gray-600">Sıralama</label>
              <Input type="number" value={form.position} onChange={e => setF("position", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{editId ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
