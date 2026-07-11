import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListNews } from "@workspace/api-client-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { Search, Upload, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  loadYekpareCustomMedia,
  persistYekpareCustomMedia,
  uploadYekpareMediaFile,
  type YekpareMediaItem,
} from "@/lib/yekpareMediaLibrary";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
  /** Çoklu seçim: onConfirm ile birlikte kullanın. */
  multiSelect?: boolean;
  onConfirm?: (urls: string[]) => void;
};

export function YekpareMediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Yekpare medyadan seç",
  multiSelect = false,
  onConfirm,
}: Props) {
  const { data: news, isLoading } = useListNews();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState<YekpareMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustom(loadYekpareCustomMedia());
      setPicked([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    persistYekpareCustomMedia(custom);
  }, [custom, open]);

  const newsImages = useMemo(() => {
    if (!news) return [];
    return (news.items ?? [])
      .filter((n) => n.imageUrl)
      .map((n) => ({ url: n.imageUrl!, title: n.title }));
  }, [news]);

  const all = useMemo(() => [...custom, ...newsImages], [custom, newsImages]);
  const filtered = all.filter(
    (img) =>
      !search ||
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      img.url.toLowerCase().includes(search.toLowerCase()),
  );

  const pick = (url: string) => {
    if (multiSelect) {
      setPicked((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
      return;
    }
    onSelect(url);
    onOpenChange(false);
  };

  const confirmMulti = () => {
    if (!picked.length) return;
    if (onConfirm) {
      onConfirm(picked);
    } else {
      onSelect(picked[0]!);
    }
    onOpenChange(false);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        const { url, title } = await uploadYekpareMediaFile(file);
        setCustom((prev) => [{ url, title }, ...prev.filter((x) => x.url !== url)]);
        uploaded.push(url);
      }
      toast({ title: "Yüklendi", description: `${uploaded.length} görsel eklendi.` });
      if (multiSelect) {
        setPicked((prev) => [...uploaded, ...prev.filter((u) => !uploaded.includes(u))]);
      } else if (uploaded[0]) {
        onSelect(uploaded[0]);
        onOpenChange(false);
      }
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message.slice(0, 200) : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl">
        <div className="border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-xs text-muted-foreground">
            Yüklediğiniz görseller ve tüm sitelerin haber kapakları ortak havuzda listelenir.
            {multiSelect ? " Birden fazla görsel seçebilirsiniz." : null}
          </p>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple={multiSelect}
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="shrink-0 gap-1"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Yükle
            </Button>
          </div>
        </div>
        <div className="min-h-[220px] flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Görsel yok. Yukarıdan yükleyin veya yayınlanmış haberlere kapak görseli ekleyin.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((img, i) => {
                const selected = picked.includes(img.url);
                return (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border bg-muted/30 hover:ring-2 hover:ring-[#e61e25] focus:outline-none focus:ring-2 focus:ring-[#e61e25]",
                      multiSelect && selected && "ring-2 ring-[#e61e25]",
                    )}
                    onClick={() => pick(img.url)}
                    title={img.title}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {multiSelect && selected ? (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e61e25] text-white shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {multiSelect ? (
          <DialogFooter className="border-t px-6 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={picked.length === 0}
              onClick={confirmMulti}
            >
              Seçilenleri ekle ({picked.length})
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
