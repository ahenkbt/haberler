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
  Video,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  PlayCircle,
} from "lucide-react";

export default function VideoGaleri() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewGallery, setViewGallery] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", coverImage: "", status: "active" });
  const [addVideoUrl, setAddVideoUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addThumb, setAddThumb] = useState("");

  const { data: galleriesData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/video-galeri"],
    queryFn: () => apiRequest("/api/video-galeri").then(asArray),
  });
  const galleries = asArray(galleriesData);

  const { data: galleryItemsData } = useQuery<any[]>({
    queryKey: ["/api/video-galeri", viewGallery?.id, "items"],
    queryFn: () => apiRequest(`/api/video-galeri/${viewGallery.id}/items`).then(asArray),
    enabled: !!viewGallery,
  });
  const galleryItems = asArray(galleryItemsData);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/video-galeri", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-galeri"] }); setShowCreate(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/video-galeri/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-galeri"] }); setEditItem(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/video-galeri/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-galeri"] }),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/video-galeri/${viewGallery.id}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-galeri", viewGallery?.id, "items"] }); setAddVideoUrl(""); setAddTitle(""); setAddThumb(""); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest(`/api/video-galeri/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-galeri", viewGallery?.id, "items"] }),
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
    <AdminLayout title="Video Galeri">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Galeri</h1>
            <p className="text-gray-500 text-sm mt-1">Video galerilerini yönetin.</p>
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
            <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Henüz galeri yok</p>
            <p className="text-sm mt-1">İlk video galerisini oluşturun</p>
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
                      <PlayCircle className="w-10 h-10 text-gray-300" />
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
                      Videolar
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
            <DialogTitle>{editItem ? "Galeri Düzenle" : "Yeni Video Galerisi Oluştur"}</DialogTitle>
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
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full mt-1 border rounded-md px-3 py-2 text-sm">
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
            <DialogTitle>{viewGallery?.title} — Videolar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="Video URL (YouTube, Vimeo, mp4...)" value={addVideoUrl} onChange={(e) => setAddVideoUrl(e.target.value)} />
              <div className="flex gap-2">
                <Input placeholder="Video Başlığı" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
                <Input placeholder="Kapak URL" value={addThumb} onChange={(e) => setAddThumb(e.target.value)} />
                <Button
                  className="bg-primary hover:bg-primary/90 flex-shrink-0"
                  onClick={() => addItemMutation.mutate({ videoUrl: addVideoUrl, title: addTitle, thumbnailUrl: addThumb })}
                  disabled={!addVideoUrl.trim() || addItemMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(galleryItems as any[]).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg group">
                  <div className="w-16 h-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-6 h-6 text-gray-300 m-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title || "Video"}</p>
                    <p className="text-xs text-gray-400 truncate">{item.videoUrl}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("Sil?")) deleteItemMutation.mutate(item.id); }}
                    className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(galleryItems as any[]).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Henüz video yok</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
