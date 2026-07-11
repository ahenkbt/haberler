import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Tag } from "lucide-react";

interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  position: number;
  active: boolean;
}

export default function UrunKategorileri() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/categories");
      setCategories(await res.json());
    } catch { toast({ title: "Yüklenemedi", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", slug: "", description: "", imageUrl: "" }); setOpen(true); };
  const openEdit = (cat: ProductCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", imageUrl: cat.imageUrl ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast({ title: "Ad ve slug gerekli", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/shop/categories/${editing.id}` : "/api/shop/categories";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: editing ? "Güncellendi" : "Eklendi" });
      setOpen(false);
      load();
    } catch { toast({ title: "Kaydedilemedi", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`/api/shop/categories/${id}`, { method: "DELETE" });
      toast({ title: "Silindi" });
      load();
    } catch { toast({ title: "Silinemedi", variant: "destructive" }); }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <AdminLayout title="Ürün Kategorileri">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ürün Kategorileri</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} kategori</p>
        </div>
        <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" />Yeni Kategori
        </Button>
      </div>

      <div className="bg-white rounded-md shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KATEGORİ ADI</TableHead>
              <TableHead>SLUG</TableHead>
              <TableHead>AÇIKLAMA</TableHead>
              <TableHead>DURUM</TableHead>
              <TableHead className="text-right">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Henüz kategori yok. İlk kategoriyi ekleyin.
              </TableCell></TableRow>
            ) : (
              categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono">{cat.slug}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs truncate">{cat.description || "-"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.active ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(cat.id, cat.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Kategori Düzenle" : "Yeni Kategori Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Kategori Adı *</Label>
              <Input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value, slug: editing ? p.slug : autoSlug(e.target.value) })); }} className="mt-1" />
            </div>
            <div>
              <Label>Slug (URL) *</Label>
              <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="mt-1 font-mono" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Resim URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>İptal</Button>
              <Button className="flex-1 bg-[#e61e25] hover:bg-[#c9181e] text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Güncelle" : "Ekle")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
