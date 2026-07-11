import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, asArray } from "@/lib/queryClient";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { Link } from "wouter";
import { ExternalLink, Eye, ImageIcon, Images, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";

export default function EditorFotoGaleri() {
  const { site } = useHmEditor();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewGallery, setViewGallery] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", coverImage: "", status: "active" });
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addCaption, setAddCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const itemFileRef = useRef<HTMLInputElement>(null);

  const hmFotoPublic = site?.slug
    ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/foto-galeri`
    : "/foto-galeri";

  const { data: galleriesData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri", "hm-editor"],
    queryFn: () => apiRequest("/api/foto-galeri").then(asArray),
  });
  const galleries = asArray(galleriesData);

  const { data: galleryItemsData } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri", viewGallery?.id, "items", "hm-editor"],
    queryFn: () => apiRequest(`/api/foto-galeri/${viewGallery.id}/items`).then(asArray),
    enabled: !!viewGallery,
  });
  const galleryItems = asArray(galleryItemsData);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("/api/foto-galeri", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Galeri oluşturuldu" });
    },
    onError: () => toast({ title: "Oluşturulamadı", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest(`/api/foto-galeri/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] });
      setEditItem(null);
      resetForm();
      toast({ title: "Güncellendi" });
    },
    onError: () => toast({ title: "Güncellenemedi", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/foto-galeri/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] });
      toast({ title: "Silindi" });
    },
    onError: () => toast({ title: "Silinemedi", variant: "destructive" }),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`/api/foto-galeri/${viewGallery.id}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/foto-galeri", viewGallery?.id, "items"] });
      setAddImageUrl("");
      setAddCaption("");
      toast({ title: "Foto eklendi" });
    },
    onError: () => toast({ title: "Eklenemedi", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest(`/api/foto-galeri/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/foto-galeri", viewGallery?.id, "items"] }),
    onError: () => toast({ title: "Silinemedi", variant: "destructive" }),
  });

  const resetForm = () => setForm({ title: "", description: "", coverImage: "", status: "active" });

  const openEdit = (g: any) => {
    setEditItem(g);
    setForm({ title: g.title, description: g.description, coverImage: g.coverImage, status: g.status });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "Başlık gerekli", variant: "destructive" });
      return;
    }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const uploadImage = async (file: File | null, onUrl: (url: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Yalnızca görsel yükleyin", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      onUrl(url);
      toast({ title: "Görsel yüklendi" });
    } catch (err) {
      toast({ title: "Yüklenemedi", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <EditorLayout title="Foto galeri">
      <div className="max-w-5xl space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Galeriler <strong>portal genelinde</strong> tek listedir; bu ekrandan oluşturduğunuz albüm tüm sitede
          <code className="mx-1 rounded bg-white/80 px-1">/foto-galeri</code> ve haber sitenizde{" "}
          <code className="rounded bg-white/80 px-1">{hmFotoPublic}</code> altında görünür. İleri sürümde siteye özel
          galeri ayrımı eklenebilir.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Albümler</h2>
            <p className="text-sm text-slate-600">Oluştur, düzenle, görselleri URL ile ekle.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={hmFotoPublic} target="_blank" rel="noopener noreferrer">
                Vitrinde önizle
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Yeni galeri
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Yükleniyor…
          </div>
        ) : galleries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
            <Images className="w-14 h-14 mx-auto mb-3 opacity-40" />
            <p>Henüz galeri yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((g: any) => (
              <Card key={g.id} className="overflow-hidden border-slate-200">
                <div className="aspect-video bg-slate-100 relative">
                  {g.coverImage ? (
                    <img src={g.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Images className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={g.status === "active" ? "bg-emerald-600" : "bg-slate-500"}>
                      {g.status === "active" ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{g.title}</h3>
                    {g.description ? <p className="text-xs text-slate-600 line-clamp-2 mt-1">{g.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewGallery(g)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Görseller
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Bu galeriyi silmek istiyor musunuz?")) deleteMutation.mutate(g.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={showCreate || !!editItem}
          onOpenChange={(o) => {
            if (!o) {
              setShowCreate(false);
              setEditItem(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Galeriyi düzenle" : "Yeni galeri"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Başlık *</Label>
                <Input
                  className="mt-1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn. Spor manşetleri"
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input
                  className="mt-1"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Kapak görseli URL</Label>
                <Input
                  className="mt-1"
                  value={form.coverImage}
                  onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                  placeholder="https://…"
                />
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadImage(e.target.files?.[0] ?? null, (url) => setForm((f) => ({ ...f, coverImage: url })))} />
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled={uploading} onClick={() => coverFileRef.current?.click()}>
                  Dosyadan kapak yükle
                </Button>
              </div>
              <div>
                <Label>Durum</Label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); resetForm(); }}>
                  İptal
                </Button>
                <Button
                  className="bg-slate-900 text-white"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editItem ? "Kaydet" : "Oluştur"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewGallery} onOpenChange={(o) => !o && setViewGallery(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewGallery?.title} — Fotoğraflar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input ref={itemFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadImage(e.target.files?.[0] ?? null, setAddImageUrl)} />
                <Input
                  placeholder="Görsel URL (https://…)"
                  value={addImageUrl}
                  onChange={(e) => setAddImageUrl(e.target.value)}
                />
                <Input
                  placeholder="Açıklama"
                  className="sm:w-40"
                  value={addCaption}
                  onChange={(e) => setAddCaption(e.target.value)}
                />
                <Button
                  type="button"
                  className="bg-[#e61e25] hover:bg-[#c9181e] text-white shrink-0"
                  disabled={!addImageUrl.trim() || addItemMutation.isPending}
                  onClick={() => addItemMutation.mutate({ imageUrl: addImageUrl.trim(), caption: addCaption.trim() })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button type="button" variant="outline" className="shrink-0" disabled={uploading} onClick={() => itemFileRef.current?.click()}>
                  Dosyadan yükle
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-72 overflow-y-auto">
                {(galleryItems as any[]).map((item: any) => (
                  <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => {
                        if (confirm("Bu fotoğrafı sil?")) deleteItemMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {galleryItems.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    Henüz foto yok.
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </EditorLayout>
  );
}
