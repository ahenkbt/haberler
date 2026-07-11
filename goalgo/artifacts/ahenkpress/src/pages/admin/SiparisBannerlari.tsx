import { useRef, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, ExternalLink } from "lucide-react";

const ADMIN_API = "/api/delivery/admin/module-banners";

const MODULE_OPTIONS: Array<{ key: string; label: string; page: string }> = [
  { key: "siparis", label: "Yekpare Sipariş (genel)", page: "/siparis" },
  { key: "food", label: "Yekpare Yemek", page: "/yemek" },
  { key: "market", label: "Yekpare Market", page: "/market" },
  { key: "nearby", label: "Yekpare Yakınımdakiler", page: "/isletmeler" },
];

type BannerRow = {
  id: number;
  module: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: number;
  active: boolean;
};

type BannerForm = {
  module: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  active: boolean;
};

const EMPTY_FORM: BannerForm = { module: "siparis", title: "", imageUrl: "", linkUrl: "", position: 0, active: true };

export default function SiparisBannerlari() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<BannerRow[]>({
    queryKey: [ADMIN_API],
    queryFn: () => apiRequest(ADMIN_API).then(asArray),
    staleTime: 15_000,
  });
  const banners = asArray(data);
  const visible = moduleFilter === "all" ? banners : banners.filter((b) => b.module === moduleFilter);

  const invalidate = () => qc.invalidateQueries({ queryKey: [ADMIN_API] });

  const createMut = useMutation({
    mutationFn: (d: BannerForm) => apiRequest(ADMIN_API, { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { invalidate(); closeForm(); toast({ title: "Banner eklendi" }); },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: BannerForm }) =>
      apiRequest(`${ADMIN_API}/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { invalidate(); closeForm(); toast({ title: "Banner güncellendi" }); },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`${ADMIN_API}/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Banner silindi" }); },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM, module: moduleFilter === "all" ? "siparis" : moduleFilter, position: visible.length });
    setEditId(null);
    setShowForm(true);
  }
  function openEdit(b: BannerRow) {
    setForm({
      module: b.module,
      title: b.title ?? "",
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? "",
      position: b.position,
      active: b.active,
    });
    setEditId(b.id);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }
  function submit() {
    if (!form.imageUrl.trim()) {
      toast({ title: "Görsel gerekli", description: "Bir görsel yükleyin veya görsel adresi girin.", variant: "destructive" });
      return;
    }
    if (editId != null) updateMut.mutate({ id: editId, d: form });
    else createMut.mutate(form);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast({ title: "Görsel yüklendi" });
    } catch (e) {
      toast({ title: "Yükleme hatası", description: e instanceof Error ? e.message : "Görsel yüklenemedi", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const moduleLabel = (key: string) => MODULE_OPTIONS.find((m) => m.key === key)?.label ?? key;

  return (
    <AdminLayout title="Vitrin Bannerları">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-500" /> Vitrin Kampanya Bannerları
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Yemek, Market, Yakınımdakiler ve genel Sipariş sayfalarında gösterilen kampanya görsellerini yönetin.
              Banner eklenmeyen sayfalarda standart görseller gösterilir.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Yeni Banner
          </Button>
        </div>

        {/* Modül filtresi */}
        <div className="flex gap-1 border-b flex-wrap">
          {[{ key: "all", label: "Tümü" }, ...MODULE_OPTIONS].map((m) => (
            <button
              key={m.key}
              onClick={() => setModuleFilter(m.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${moduleFilter === m.key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-14 text-center">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-700">Bu bölümde henüz banner yok</p>
            <p className="mt-1 text-sm text-gray-500">
              "Yeni Banner" ile kampanya görseli ekleyin; vitrin sayfasında hemen görünür.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((b) => (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative h-36 bg-gray-50">
                  <img
                    src={resolveClientMediaSrc(b.imageUrl)}
                    alt={b.title ?? ""}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {!b.active && (
                    <span className="absolute left-2 top-2 rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-bold text-white">Pasif</span>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-700 shadow-sm">
                    Sıra: {b.position}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-orange-600">{moduleLabel(b.module)}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-gray-900">{b.title || "Başlıksız banner"}</p>
                  {b.linkUrl ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{b.linkUrl}</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-gray-400">Bağlantısız görsel</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => { if (window.confirm("Bu banner silinsin mi?")) deleteMut.mutate(b.id); }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Sil
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId != null ? "Bannerı Düzenle" : "Yeni Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Gösterileceği Sayfa *</label>
              <select
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label} — {m.page}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Banner Görseli *</label>
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="/api/media/uploads/… veya https://…"
                />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-3.5 w-3.5" /> {uploading ? "Yükleniyor…" : "Yükle"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {form.imageUrl && (
                <img
                  src={resolveClientMediaSrc(form.imageUrl)}
                  alt=""
                  className="mt-2 max-h-36 w-full rounded-lg border border-gray-100 object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <p className="mt-1 text-[11px] text-gray-400">Önerilen oran: geniş yatay (örn. 1200×400). Tek banner tam genişlik, birden fazlası yatay şerit olarak gösterilir.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Başlık (isteğe bağlı)</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Örn: Haftanın kampanyası"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Bağlantı (isteğe bağlı)</label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                placeholder="/yemek?kategori=Pizza veya https://…"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-gray-500">Sıra</label>
                <Input
                  type="number"
                  value={String(form.position)}
                  onChange={(e) => setForm((f) => ({ ...f, position: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                <span className="text-sm font-semibold text-gray-700">{form.active ? "Yayında" : "Pasif"}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={createMut.isPending || updateMut.isPending}
                onClick={submit}
              >
                {editId != null ? "Kaydet" : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
