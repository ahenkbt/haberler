import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { adminFetchErrorHint } from "@/lib/apiBase";
import { vendorGoogleImportColumns } from "@/components/admin/GoogleIsletmeImportCard";
import { VendorGoogleImportHub } from "@/components/admin/VendorGoogleImportHub";
import { AdminMapPanelSyncToolbar } from "@/components/admin/AdminMapPanelSyncToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Power, Star, MapPin, Phone,
  ShoppingBag, CheckCircle, XCircle, Store, Mail, KeyRound, Sparkles, RefreshCcw, Loader2, Upload,
} from "lucide-react";

type VendorAdminFilter =
  | "all"
  | "active"
  | "opening"
  | "no_menu"
  | "no_contact"
  | "google_scrape"
  | "google_api";

function slugify(str: string) {
  return str.toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMPTY: any = {
  name: "", slug: "", description: "", vendorType: "ecommerce",
  phone: "", email: "", address: "", city: "", district: "",
  imageUrl: "", coverUrl: "", workingHours: "", shippingFee: "0",
  shippingTime: 3, freeShippingAbove: "", whatsapp: "",
  ownerName: "", ownerEmail: "", active: true, featured: false,
};

function panelLoginEmail(v: { ownerEmail?: string | null; email?: string | null }) {
  const o = String(v.ownerEmail ?? "").trim();
  const e = String(v.email ?? "").trim();
  return o || e || "";
}

export default function AlisverisIsletmeleri() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [vendorListFilter, setVendorListFilter] = useState<VendorAdminFilter>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const { data: vendorsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/vendors-admin", "ecommerce"],
    queryFn: () => apiRequest("/api/delivery/vendors-admin?type=ecommerce").then(asArray),
  });
  const vendors = asArray(vendorsData);

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("/api/delivery/vendors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] }); closeForm(); toast({ title: "Mağaza oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/delivery/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] }); closeForm(); toast({ title: "Mağaza güncellendi" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/delivery/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] }); toast({ title: "Silindi" }); },
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: any) => apiRequest(`/api/delivery/vendors/${id}`, { method: "PUT", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] }),
  });

  const [pwModal, setPwModal] = useState<{ id: number; name: string } | null>(null);
  const [pwInput, setPwInput] = useState("Yekpare");
  const [pwSaving, setPwSaving] = useState(false);
  const [aiBusyVendorId, setAiBusyVendorId] = useState<number | null>(null);
  const [newApiBusyVendorId, setNewApiBusyVendorId] = useState<number | null>(null);
  const [importBusyVendorId, setImportBusyVendorId] = useState<number | null>(null);

  async function savePassword() {
    if (!pwModal || !pwInput.trim() || pwInput.length < 4) return;
    setPwSaving(true);
    try {
      await apiRequest(`/api/admin/providers/${pwModal.id}/set-password`, { method: "POST", body: JSON.stringify({ password: pwInput }) });
      toast({ title: "Şifre güncellendi", description: `${pwModal.name}: panel şifresi kaydedildi.` });
      setPwModal(null);
      setPwInput("Yekpare");
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] });
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  function openCreate() { setForm({ ...EMPTY, vendorType: "ecommerce" }); setEditId(null); setShowForm(true); }
  function openEdit(v: any) { setForm({ ...v }); setEditId(v.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function handleNameBlur() { if (!editId && !form.slug) setF("slug", slugify(form.name)); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, data: form });
    else createMut.mutate(form);
  }

  const searchFiltered = vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.city || "").toLowerCase().includes(search.toLowerCase())
  );
  const filtered = searchFiltered.filter((v) => {
    if (vendorListFilter === "all") return true;
    if (vendorListFilter === "active") return v.active === true;
    if (vendorListFilter === "opening") return v.isOpen === false;
    if (vendorListFilter === "no_menu") return v.catalogMenuGap === true;
    if (vendorListFilter === "no_contact") return v.catalogContactGap === true;
    if (vendorListFilter === "google_scrape") return vendorGoogleImportColumns(v).scrape;
    if (vendorListFilter === "google_api") return vendorGoogleImportColumns(v).api;
    return true;
  });
  const vendorCounts = {
    all: vendors.length,
    active: vendors.filter((v) => v.active === true).length,
    opening: vendors.filter((v) => v.isOpen === false).length,
    no_menu: vendors.filter((v) => v.catalogMenuGap === true).length,
    no_contact: vendors.filter((v) => v.catalogContactGap === true).length,
    google_scrape: vendors.filter((v) => vendorGoogleImportColumns(v).scrape).length,
    google_api: vendors.filter((v) => vendorGoogleImportColumns(v).api).length,
  };

  async function runMerchantXmlImport(vendorId: number, vendorName: string) {
    if (!confirm(`${vendorName} (ID: ${vendorId}) mağazasına Merchant XML içe aktarılsın mı? Mevcut ürünler silinir.`)) return;
    setImportBusyVendorId(vendorId);
    try {
      const data = await apiRequest(`/api/delivery/admin/vendors/${vendorId}/import-merchant-rss`, {
        method: "POST",
        body: JSON.stringify({
          xmlUrl: "https://www.tahtakaletoptanticaret.com/export.xml",
          clearExisting: true,
        }),
      });
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] });
      toast({
        title: "XML içe aktarıldı",
        description: `${data.items ?? 0} ürün, ${data.categories ?? 0} kategori (parse: ${data.parsed ?? "?"})`,
      });
    } catch (e: unknown) {
      toast({
        title: "XML içe aktarma hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setImportBusyVendorId(null);
    }
  }

  async function runGenerateAbout(vendorId: number) {
    setAiBusyVendorId(vendorId);
    try {
      await apiRequest(`/api/delivery/admin/vendors/${vendorId}/generate-about`, { method: "POST", body: JSON.stringify({}) });
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] });
      toast({ title: "AI Hakkımızda güncellendi" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "AI içerik üretilemedi",
        description: msg + adminFetchErrorHint(msg),
        variant: "destructive",
      });
    } finally {
      setAiBusyVendorId(null);
    }
  }

  async function runGoogleNewApi(vendorId: number) {
    setNewApiBusyVendorId(vendorId);
    try {
      await apiRequest(`/api/delivery/admin/vendors/${vendorId}/enrich-google-new`, { method: "POST", body: JSON.stringify({}) });
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] });
      toast({ title: "New API zenginleştirme tamamlandı" });
    } catch (e: unknown) {
      toast({ title: "New API çalıştırılamadı", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setNewApiBusyVendorId(null);
    }
  }

  return (
    <AdminLayout title="Alışveriş Mağazaları">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" /> Alışveriş / E-Ticaret Mağazaları
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Online satış yapan mağazalar — giriş adresi &quot;Sahip E-posta&quot; veya işletme e-postası; şifreyi anahtar ikonundan atayın (sipariş işletmeleri ile aynı panel).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end items-center">
            <AdminMapPanelSyncToolbar
              vendorModule="ecommerce"
              invalidateQueryKeys={[["/api/delivery/vendors-admin", "ecommerce"]]}
            />
            <Button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Yeni Mağaza
            </Button>
          </div>
        </div>

        <VendorGoogleImportHub
          vendorType="ecommerce"
          onImported={() => qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ecommerce"] })}
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mağaza adı, şehir..." className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: "all" as const, label: "Tümü", count: vendorCounts.all },
            { key: "active" as const, label: "Aktif işletmeler", count: vendorCounts.active },
            { key: "opening" as const, label: "Açılış aşamasında", count: vendorCounts.opening },
            { key: "no_menu" as const, label: "Menü/ürünü olmayanlar", count: vendorCounts.no_menu },
            { key: "no_contact" as const, label: "İletişim bilgisi olmayanlar", count: vendorCounts.no_contact },
            { key: "google_scrape" as const, label: "Google kazıma", count: vendorCounts.google_scrape },
            { key: "google_api" as const, label: "Google API", count: vendorCounts.google_api },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVendorListFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                vendorListFilter === key
                  ? "border-purple-500 bg-purple-50 text-purple-800"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {label}
              <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-gray-500 tabular-nums">{count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Henüz alışveriş mağazası yok</p></div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(v => (
              <div key={v.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 shadow-sm ${!v.active ? "opacity-60" : ""}`}>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-purple-50">
                  {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-emerald-200 text-emerald-700"
                    title="Merchant XML içe aktar (Tahtakale export.xml)"
                    disabled={importBusyVendorId === Number(v.id)}
                    onClick={() => void runMerchantXmlImport(Number(v.id), v.name)}
                  >
                    {importBusyVendorId === Number(v.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-violet-200 text-violet-700"
                    title="AI içerik üret (Hakkımızda)"
                    disabled={aiBusyVendorId === Number(v.id)}
                    onClick={() => void runGenerateAbout(Number(v.id))}
                  >
                    {aiBusyVendorId === Number(v.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-sky-200 text-sky-700"
                    title="Google Places New API ile zenginleştir"
                    disabled={newApiBusyVendorId === Number(v.id)}
                    onClick={() => void runGoogleNewApi(Number(v.id))}
                  >
                    {newApiBusyVendorId === Number(v.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="hidden sm:flex flex-col gap-1 w-[100px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Kazıma</span>
                  <span className={vendorGoogleImportColumns(v).scrape ? "text-emerald-600" : "text-gray-300"}>
                    {vendorGoogleImportColumns(v).scrape ? "Evet" : "—"}
                  </span>
                  <span>API</span>
                  <span className={vendorGoogleImportColumns(v).api ? "text-sky-600" : "text-gray-300"}>
                    {vendorGoogleImportColumns(v).api ? "Evet" : "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{v.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono border-gray-300 text-gray-700">
                      Vendor ID: {v.id}
                    </Badge>
                    {v.featured && <Badge className="bg-amber-100 text-amber-700 border-0"><Star className="w-3 h-3 mr-1" />Öne Çıkan</Badge>}
                    <Badge className={v.active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                      {v.active ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {v.active ? "Aktif" : "Pasif"}
                    </Badge>
                    <Badge className="bg-blue-50 text-blue-600 border-0">⭐ {v.rating?.toFixed(1) || "0.0"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    {v.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</span>}
                    {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>}
                    {v.ownerName && <span className="flex items-center gap-1"><Store className="w-3 h-3" />{v.ownerName}</span>}
                    {panelLoginEmail(v) && (
                      <span className="flex items-center gap-1" title="servis-saglayici-giris">
                        <Mail className="w-3 h-3" />{panelLoginEmail(v)}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        v.panelPasswordSet
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]"
                          : "border-amber-200 bg-amber-50 text-amber-900 text-[10px]"
                      }
                    >
                      {v.panelPasswordSet ? "Panel şifresi var" : "Şifre atanmadı"}
                    </Badge>
                    <span className="text-gray-400">/{v.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleMut.mutate({ id: v.id, active: !v.active })}>
                    <Power className={`w-4 h-4 ${v.active ? "text-green-600" : "text-gray-400"}`} />
                  </Button>
                  <Button size="sm" variant="outline" title="Panel şifresi"
                    onClick={() => { setPwModal({ id: v.id, name: v.name }); setPwInput("Yekpare"); }}>
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm(`"${v.name}" silinsin mi?`)) deleteMut.mutate(v.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Mağazayı Düzenle" : "Yeni Alışveriş Mağazası"}</DialogTitle>
            {editId ? (
              <p className="text-xs text-gray-500 font-mono">Vendor ID: {editId}</p>
            ) : null}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {editId ? (
              <div>
                <label className="text-xs font-bold text-gray-600">Vendor ID</label>
                <Input value={String(editId)} readOnly disabled className="font-mono bg-gray-50" />
              </div>
            ) : null}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-gray-600">Mağaza Adı *</label>
                <Input value={form.name} onChange={e => setF("name", e.target.value)} onBlur={handleNameBlur} required /></div>
              <div><label className="text-xs font-bold text-gray-600">Slug (URL) *</label>
                <Input value={form.slug} onChange={e => setF("slug", e.target.value)} required /></div>
              <div className="sm:col-span-2"><label className="text-xs font-bold text-gray-600">Açıklama</label>
                <textarea value={form.description || ""} onChange={e => setF("description", e.target.value)} rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1 resize-none" /></div>
              <div><label className="text-xs font-bold text-gray-600">Telefon</label>
                <Input value={form.phone || ""} onChange={e => setF("phone", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">WhatsApp</label>
                <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", e.target.value)} placeholder="905xxxxxxxxx" /></div>
              <div><label className="text-xs font-bold text-gray-600">Şehir</label>
                <Input value={form.city || ""} onChange={e => setF("city", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">İlçe</label>
                <Input value={form.district || ""} onChange={e => setF("district", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Logo URL</label>
                <Input value={form.imageUrl || ""} onChange={e => setF("imageUrl", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Kapak URL</label>
                <Input value={form.coverUrl || ""} onChange={e => setF("coverUrl", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Kargo Ücreti (₺)</label>
                <Input type="number" value={form.shippingFee || "0"} onChange={e => setF("shippingFee", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Ücretsiz Kargo Üzeri (₺)</label>
                <Input type="number" value={form.freeShippingAbove || ""} onChange={e => setF("freeShippingAbove", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Kargo Süresi (gün)</label>
                <Input type="number" value={form.shippingTime || 3} onChange={e => setF("shippingTime", parseInt(e.target.value))} /></div>
              <div><label className="text-xs font-bold text-gray-600">Çalışma Saatleri</label>
                <Input value={form.workingHours || ""} onChange={e => setF("workingHours", e.target.value)} placeholder="09:00-22:00" /></div>
              <div><label className="text-xs font-bold text-gray-600">Sahip Adı</label>
                <Input value={form.ownerName || ""} onChange={e => setF("ownerName", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Sahip E-posta (panel girişi)</label>
                <Input value={form.ownerEmail || ""} onChange={e => setF("ownerEmail", e.target.value)} placeholder="Boşsa işletme e-postası kullanılır" /></div>
              <div><label className="text-xs font-bold text-gray-600">İşletme E-postası</label>
                <Input type="email" value={form.email || ""} onChange={e => setF("email", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.active} onChange={e => setF("active", e.target.checked)} /> Aktif
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.featured} onChange={e => setF("featured", e.target.checked)} /> Öne Çıkan
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700"
                disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwModal} onOpenChange={(v) => !v && setPwModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" /> Panel şifresi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{pwModal?.name}</span> — giriş:{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">/servis-saglayici-giris</code>
            </p>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Yeni şifre</label>
              <Input
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                placeholder="En az 4 karakter"
                onKeyDown={(e) => e.key === "Enter" && void savePassword()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button variant="outline" type="button" onClick={() => setPwModal(null)}>Vazgeç</Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={pwSaving || !pwInput.trim() || pwInput.length < 4}
                onClick={() => void savePassword()}
              >
                {pwSaving ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
