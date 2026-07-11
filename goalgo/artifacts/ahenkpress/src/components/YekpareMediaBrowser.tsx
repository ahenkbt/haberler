import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListNews } from "@workspace/api-client-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Search, Copy, Grid3X3, LayoutList, ExternalLink, Upload, Loader2 } from "lucide-react";
import {
  loadYekpareCustomMedia,
  persistYekpareCustomMedia,
  uploadYekpareMediaFile,
  type YekpareMediaItem,
} from "@/lib/yekpareMediaLibrary";

/**
 * Ortak Yekpare medya kütüphanesi (admin Medya + editör Medya).
 * Özel yüklemeler `localStorage`; haber kapakları API’den — hepsi tek havuzda birleşir.
 */
export function YekpareMediaBrowser() {
  const { data: news, isLoading } = useListNews();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [customImages, setCustomImages] = useState<YekpareMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomImages(loadYekpareCustomMedia());
  }, []);

  useEffect(() => {
    persistYekpareCustomMedia(customImages);
  }, [customImages]);

  const newsImages = useMemo(() => {
    if (!news) return [];
    const seen = new Set<string>();
    const out: { url: string; title: string }[] = [];
    for (const n of news.items ?? []) {
      const raw = (n.imageUrl ?? "").trim();
      if (!raw) continue;
      const key = raw.split("?")[0].trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ url: raw, title: n.title });
    }
    return out;
  }, [news]);

  const allImages = useMemo(() => {
    const seen = new Set<string>();
    const out: { url: string; title: string }[] = [];
    for (const x of [...customImages, ...newsImages]) {
      const k = x.url.split("?")[0].trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }, [customImages, newsImages]);

  const filtered = allImages.filter(
    (img) =>
      !search ||
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      img.url.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      toast({ title: "URL kopyalandı" });
    });
  };

  const handleAdd = () => {
    if (!addUrl.trim()) {
      toast({ title: "Hata", description: "URL zorunludur", variant: "destructive" });
      return;
    }
    setCustomImages((prev) => [{ url: addUrl.trim(), title: addTitle || addUrl.trim() }, ...prev]);
    setAddUrl("");
    setAddTitle("");
    toast({ title: "Medya eklendi" });
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel dosyaları seçin.", variant: "destructive" });
      return;
    }
    void (async () => {
      setUploading(true);
      try {
        const { url, title } = await uploadYekpareMediaFile(file);
        setCustomImages((prev) => [{ url, title }, ...prev]);
        toast({ title: "Görsel yüklendi" });
      } catch (err) {
        toast({
          title: "Yükleme başarısız",
          description: err instanceof Error ? err.message.slice(0, 200) : String(err),
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    })();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Yekpare medya</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} görsel · tüm siteler ortak</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="rounded-md border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Görsellerde ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center overflow-hidden rounded-md border">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`p-2 transition-colors ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`p-2 transition-colors ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-16 text-center">
                <ImagePlus className="h-10 w-10 text-gray-300" />
                <h3 className="font-medium text-gray-700">Görsel bulunamadı</h3>
                <p className="text-sm text-gray-500">Sağdan URL ekleyebilir veya dosya yükleyebilirsiniz.</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filtered.map((img) => (
                  <div
                    key={img.url}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-gray-100 transition-colors hover:border-[#e61e25]"
                    onClick={() => setPreview(img)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreview(img);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23d1d5db' font-size='12'%3EGörsel Yok%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(img.url);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-gray-100"
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(img.url, "_blank");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-gray-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((img) => (
                  <div key={img.url} className="flex items-center gap-3 p-3 transition-colors hover:bg-gray-50">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-gray-900">{img.title}</p>
                      <p className="line-clamp-1 font-mono text-xs text-gray-400">{img.url}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setPreview(img)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => handleCopy(img.url)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Upload className="h-4 w-4 text-[#e61e25]" />
              Bilgisayardan yükle
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleFilePick} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Yükleniyor…" : "Görsel seç (JPEG, PNG, GIF, WebP)"}
            </Button>
            <p className="mt-2 text-xs text-gray-500">Sunucuya kaydedilir; haber ve logo alanlarında kullanın.</p>
          </div>

          <div className="rounded-md border bg-white p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <ImagePlus className="h-4 w-4 text-[#e61e25]" />
              URL ile görsel ekle
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Görsel URL</Label>
                <Input placeholder="https://..." value={addUrl} onChange={(e) => setAddUrl(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Açıklama (isteğe bağlı)</Label>
                <Input placeholder="Görsel açıklaması" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} className="text-sm" />
              </div>
              {addUrl ? (
                <img
                  src={addUrl}
                  alt="Önizleme"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <Button className="w-full bg-[#e61e25] text-white hover:bg-[#c9181e]" onClick={handleAdd} disabled={!addUrl.trim()}>
                Ekle
              </Button>
            </div>
          </div>

          <div className="space-y-1 rounded-md border bg-gray-50 p-4 text-sm text-gray-500">
            <p className="font-medium text-gray-700">Haber görselleri</p>
            <p>Yayınlanmış haberlerdeki kapak görselleri otomatik listelenir.</p>
            <p className="text-xs">{newsImages.length} haber görseli.</p>
          </div>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="line-clamp-1 pr-8">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="space-y-4">
              <img src={preview.url} alt={preview.title} className="max-h-[60vh] w-full rounded-lg bg-gray-100 object-contain" />
              <div className="flex items-center gap-2">
                <Input value={preview.url} readOnly className="flex-1 font-mono text-xs" />
                <Button variant="outline" onClick={() => handleCopy(preview.url)}>
                  <Copy className="mr-1 h-4 w-4" />
                  Kopyala
                </Button>
                <Button variant="outline" onClick={() => window.open(preview.url, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
