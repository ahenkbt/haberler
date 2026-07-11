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
import {
  ExternalLink,
  Eye,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";

export default function EditorVideoGaleri() {
  const { site } = useHmEditor();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewGallery, setViewGallery] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", coverImage: "", status: "active" });
  const [addVideoUrl, setAddVideoUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addThumb, setAddThumb] = useState("");
  const [uploading, setUploading] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const hmVideoTv = site?.slug
    ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/video-tv`
    : "/yektube";
  const legacyGalleryPath = (id: number) => `/video-galeri/${id}`;

  const { data: galleriesData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/video-galeri", "hm-editor"],
    queryFn: () => apiRequest("/api/video-galeri").then(asArray),
  });
  const galleries = asArray(galleriesData);

  const { data: galleryItemsData } = useQuery<any[]>({
    queryKey: ["/api/video-galeri", viewGallery?.id, "items", "hm-editor"],
    queryFn: () => apiRequest(`/api/video-galeri/${viewGallery.id}/items`).then(asArray),
    enabled: !!viewGallery,
  });
  const galleryItems = asArray(galleryItemsData);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("/api/video-galeri", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-galeri"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Galeri oluşturuldu" });
    },
    onError: () => toast({ title: "Oluşturulamadı", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest(`/api/video-galeri/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-galeri"] });
      setEditItem(null);
      resetForm();
      toast({ title: "Güncellendi" });
    },
    onError: () => toast({ title: "Güncellenemedi", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/video-galeri/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-galeri"] });
      toast({ title: "Silindi" });
    },
    onError: () => toast({ title: "Silinemedi", variant: "destructive" }),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`/api/video-galeri/${viewGallery.id}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-galeri", viewGallery?.id, "items"] });
      setAddVideoUrl("");
      setAddTitle("");
      setAddThumb("");
      toast({ title: "Video eklendi" });
    },
    onError: () => toast({ title: "Eklenemedi", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest(`/api/video-galeri/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-galeri", viewGallery?.id, "items"] }),
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

  const uploadMedia = async (file: File | null, onUrl: (url: string) => void, kind: "image" | "video") => {
    if (!file) return;
    if (kind === "image" && !file.type.startsWith("image/")) {
      toast({ title: "Yalnızca görsel yükleyin", variant: "destructive" });
      return;
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      toast({ title: "Yalnızca video yükleyin", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url, title } = await uploadYekpareMediaFile(file);
      onUrl(url);
      if (kind === "video" && !addTitle.trim()) setAddTitle(title);
      toast({ title: kind === "video" ? "Video yüklendi" : "Görsel yüklendi" });
    } catch (err) {
      toast({ title: "Yüklenemedi", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <EditorLayout title="Video galeri">
      <div className="max-w-5xl space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Video galerileri <strong>portal genelinde</strong> tek listedir. Bu ekrandan eklediğiniz videolar embed
          URL ile saklanır. Eski adres <code className="mx-1 rounded bg-white/80 px-1">/video-galeri/:id</code>{" "}
          sayısal id için Yektube kanalına yönlendirilir; kanal id’si ile galeri kaydı aynı değilse yalnızca{" "}
          <strong>Video TV</strong> vitrinini kullanın.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Galeriler</h2>
            <p className="text-sm text-slate-600">Oluştur, düzenle, videoları URL ile ekle.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={hmVideoTv} target="_blank" rel="noopener noreferrer">
                Video TV vitrini
                <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/yektube" target="_blank" rel="noopener noreferrer">
                Yektube
                <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[#e61e25] text-white hover:bg-[#c9181e]"
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Yeni galeri
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
            Yükleniyor…
          </div>
        ) : galleries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
            <Video className="mx-auto mb-3 h-14 w-14 opacity-40" />
            <p>Henüz galeri yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((g: any) => (
              <Card key={g.id} className="overflow-hidden border-slate-200">
                <div className="relative aspect-video bg-slate-100">
                  {g.coverImage ? (
                    <img src={g.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PlayCircle className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge className={g.status === "active" ? "bg-emerald-600" : "bg-slate-500"}>
                      {g.status === "active" ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{g.title}</h3>
                    {g.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{g.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewGallery(g)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Videolar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Bu galeriyi silmek istiyor musunuz?")) deleteMutation.mutate(g.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    <Link
                      className="text-[#e61e25] underline-offset-2 hover:underline"
                      href={legacyGalleryPath(g.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      /video-galeri/{g.id}
                    </Link>
                    {` — kök adreste sayısal id Yektube kanalına yönlendirilir.`}
                  </p>
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
              <DialogTitle>{editItem ? "Galeriyi düzenle" : "Yeni video galerisi"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Başlık *</Label>
                <Input
                  className="mt-1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Galeri başlığı"
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
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadMedia(e.target.files?.[0] ?? null, (url) => setForm((f) => ({ ...f, coverImage: url })), "image")} />
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    setEditItem(null);
                    resetForm();
                  }}
                >
                  İptal
                </Button>
                <Button
                  className="bg-[#e61e25] text-white hover:bg-[#c9181e]"
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
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewGallery?.title} — Videolar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={(e) => void uploadMedia(e.target.files?.[0] ?? null, setAddVideoUrl, "video")} />
                <Input
                  placeholder="Video URL (YouTube, Vimeo, mp4…)"
                  value={addVideoUrl}
                  onChange={(e) => setAddVideoUrl(e.target.value)}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Başlık" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
                  <Input placeholder="Kapak URL" value={addThumb} onChange={(e) => setAddThumb(e.target.value)} />
                  <Button
                    type="button"
                    className="shrink-0 bg-[#e61e25] text-white hover:bg-[#c9181e]"
                    disabled={!addVideoUrl.trim() || addItemMutation.isPending}
                    onClick={() =>
                      addItemMutation.mutate({
                        videoUrl: addVideoUrl.trim(),
                        title: addTitle.trim(),
                        thumbnailUrl: addThumb.trim(),
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="shrink-0" disabled={uploading} onClick={() => videoFileRef.current?.click()}>
                    Dosyadan video yükle
                  </Button>
                </div>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {(galleryItems as any[]).map((item: any) => (
                  <div key={item.id} className="group flex items-center gap-3 rounded-lg border p-2">
                    <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PlayCircle className="m-3 h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title || "Video"}</p>
                      <p className="truncate text-xs text-slate-400">{item.videoUrl}</p>
                    </div>
                    <button
                      type="button"
                      className="p-1 text-red-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      onClick={() => {
                        if (confirm("Bu videoyu sil?")) deleteItemMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {galleryItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Video className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    Henüz video yok.
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
