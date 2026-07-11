import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useState } from "react";
import {
  Plus,
  ImageIcon,
  Pencil,
  Trash2,
  Eye,
  Images,
  RefreshCw,
} from "lucide-react";

export default function FotoGaleri() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewGallery, setViewGallery] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", coverImage: "", status: "active" });
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addCaption, setAddCaption] = useState("");

  const { data: galleriesData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri"],
    queryFn: () => apiRequest("/api/foto-galeri").then(asArray),
  });
  const galleries = asArray(galleriesData);

  const { data: galleryItemsData } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri", viewGallery?.id, "items"],
    queryFn: () => apiRequest(`/api/foto-galeri/${viewGallery.id}/items`).then(asArray),
    enabled: !!viewGallery,
  });
  const galleryItems = asArray(galleryItemsData);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/foto-galeri", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] }); setShowCreate(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/foto-galeri/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] }); setEditItem(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/foto-galeri/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/foto-galeri"] }),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/foto-galeri/${viewGallery.id}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/foto-galeri", viewGallery?.id, "items"] }); setAddImageUrl(""); setAddCaption(""); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest(`/api/foto-galeri/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/foto-galeri", viewGallery?.id, "items"] }),
  });

  const resetForm = () => setForm({ title: "", description: "", coverImage: "", status: "active" });

  const openEdit = (g: any) => {
    setEditItem(g);
    setForm({ title: g.title, description: g.description, coverImage: g.coverImage, status: g.status });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <AdminLayout title="Foto Galeri">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Foto Galeri</h1>
            <p className="text-gray-500 text-sm mt-1">Fotoğraf galerilerini yönetin.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Galeri
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Yükleniyor...
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Images className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Henüz galeri yok</p>
            <p className="text-sm mt-1">İlk galeriyi oluşturun</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleries.map((g: any) => (
              <Card key={g.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {g.coverImage ? (
                    <img src={g.coverImage} alt={g.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Images className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={g.status === "active" ? "bg-green-500" : "bg-gray-400"}>
                      {g.status === "active" ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{g.title}</h3>
                  {g.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
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
                      className="text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm("Galeriyi silmek istediğinize emin misiniz?")) deleteMutation.mutate(g.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editItem} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Galeri Düzenle" : "Yeni Galeri Oluştur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Başlık *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Galeri başlığı" className="mt-1" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" className="mt-1" />
            </div>
            <div>
              <Label>Kapak Görseli URL</Label>
              <Input value={form.coverImage} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label>Durum</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); resetForm(); }}>İptal</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editItem ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Items Dialog */}
      <Dialog open={!!viewGallery} onOpenChange={(o) => { if (!o) setViewGallery(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewGallery?.title} — Fotoğraflar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add image */}
            <div className="flex gap-2">
              <Input
                placeholder="Fotoğraf URL (https://...)"
                value={addImageUrl}
                onChange={(e) => setAddImageUrl(e.target.value)}
              />
              <Input
                placeholder="Açıklama"
                value={addCaption}
                onChange={(e) => setAddCaption(e.target.value)}
                className="w-40"
              />
              <Button
                className="bg-primary hover:bg-primary/90 flex-shrink-0"
                onClick={() => addItemMutation.mutate({ imageUrl: addImageUrl, caption: addCaption })}
                disabled={!addImageUrl.trim() || addItemMutation.isPending}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {/* Image grid */}
            <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {(galleryItems as any[]).map((item: any) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100">
                  <img src={item.imageUrl} alt={item.caption} className="w-full h-full object-cover" />
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {item.caption}
                    </div>
                  )}
                  <button
                    onClick={() => { if (confirm("Sil?")) deleteItemMutation.mutate(item.id); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(galleryItems as any[]).length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Henüz fotoğraf yok</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
