import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, FileText, Globe, Eye, Copy } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type Page = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "published" | "draft";
  createdAt: string;
};

const STORAGE_KEY = "ahenkpress_pages";

function loadPages(): Page[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: "1",
      title: "Hakkımızda",
      slug: "hakkimizda",
      content: "Yekpare hakkında bilgi sayfası.",
      status: "published",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "İletişim",
      slug: "iletisim",
      content: "İletişim bilgileri ve formu.",
      status: "published",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Künye",
      slug: "kunye",
      content: "Yayın künye bilgileri.",
      status: "draft",
      createdAt: new Date().toISOString(),
    },
    {
      id: "4",
      title: "Gizlilik Politikası",
      slug: "gizlilik-politikasi",
      content: "Kullanıcı gizlilik politikamız.",
      status: "published",
      createdAt: new Date().toISOString(),
    },
  ];
}

function savePages(pages: Page[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Sayfalar() {
  const [pages, setPages] = useState<Page[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const { toast } = useToast();

  useEffect(() => {
    setPages(loadPages());
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setSlug("");
    setContent("");
    setStatus("published");
    setOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditing(page);
    setTitle(page.title);
    setSlug(page.slug);
    setContent(page.content);
    setStatus(page.status);
    setOpen(true);
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!editing) setSlug(slugify(v));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Hata", description: "Başlık zorunludur", variant: "destructive" });
      return;
    }
    let updated: Page[];
    if (editing) {
      updated = pages.map((p) =>
        p.id === editing.id ? { ...p, title, slug, content, status } : p
      );
      toast({ title: "Sayfa güncellendi" });
    } else {
      const newPage: Page = {
        id: Date.now().toString(),
        title,
        slug: slug || slugify(title),
        content,
        status,
        createdAt: new Date().toISOString(),
      };
      updated = [...pages, newPage];
      toast({ title: "Sayfa oluşturuldu" });
    }
    savePages(updated);
    setPages(updated);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu sayfayı silmek istediğinize emin misiniz?")) return;
    const updated = pages.filter((p) => p.id !== id);
    savePages(updated);
    setPages(updated);
    toast({ title: "Sayfa silindi" });
  };

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(`/${slug}`).then(() => {
      toast({ title: "Kopyalandı", description: `/${slug}` });
    });
  };

  return (
    <AdminLayout title="Sayfalar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sayfalar</h1>
          <p className="text-sm text-gray-500 mt-1">{pages.length} sayfa</p>
        </div>
        <Button
          className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4" />
          Yeni Sayfa
        </Button>
      </div>

      <div className="bg-white rounded-md shadow-sm border">
        {pages.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-gray-300" />
            <h3 className="font-medium text-gray-700">Henüz sayfa yok</h3>
            <Button onClick={openCreate} variant="outline" size="sm">
              İlk Sayfayı Oluştur
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-gray-900">
                      {page.title}
                    </h3>
                    <Badge
                      className={`text-[10px] ${
                        page.status === "published"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                      variant="outline"
                    >
                      {page.status === "published" ? "Yayında" : "Taslak"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <button
                      className="font-mono hover:text-blue-600 flex items-center gap-1"
                      onClick={() => handleCopySlug(page.slug)}
                    >
                      /{page.slug}
                      <Copy className="w-3 h-3" />
                    </button>
                    <span>·</span>
                    <span>
                      {format(new Date(page.createdAt), "d MMM yyyy", { locale: tr })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-blue-600"
                    onClick={() => openEdit(page)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => handleDelete(page.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sayfayı Düzenle" : "Yeni Sayfa Oluştur"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                Başlık
              </Label>
              <Input
                placeholder="Sayfa başlığı"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                URL Yolu (Slug)
              </Label>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-r-0 rounded-l-md px-3 py-2 text-sm text-gray-500">
                  /
                </span>
                <Input
                  className="rounded-l-none font-mono text-sm"
                  placeholder="url-yolu"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                İçerik
              </Label>
              <Textarea
                placeholder="Sayfa içeriği..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                Durum
              </Label>
              <div className="flex gap-2">
                {(["published", "draft"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                      status === s
                        ? s === "published"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-600 text-white border-gray-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {s === "published" ? "Yayında" : "Taslak"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              onClick={handleSave}
            >
              {editing ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
