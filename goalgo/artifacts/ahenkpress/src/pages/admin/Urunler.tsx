import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Package, Search, ShoppingCart } from "lucide-react";
import { Link } from "wouter";

interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: string;
  salePrice?: string;
  sku?: string;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
  featured: boolean;
  active: boolean;
}

interface ProductCategory { id: number; name: string; slug: string; }

const emptyForm = {
  name: "", slug: "", description: "", shortDescription: "",
  price: "", salePrice: "", sku: "", stock: "0",
  imageUrl: "", categoryId: "", featured: false, active: true,
};

export default function Urunler() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        fetch("/api/shop/products?limit=100").then(r => r.json()),
        fetch("/api/shop/categories").then(r => r.json()),
      ]);
      setProducts(prods.items ?? []);
      setCategories(cats ?? []);
    } catch { toast({ title: "Yüklenemedi", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      shortDescription: p.shortDescription ?? "",
      price: p.price, salePrice: p.salePrice ?? "",
      sku: p.sku ?? "", stock: String(p.stock),
      imageUrl: p.imageUrl ?? "", categoryId: p.categoryId ? String(p.categoryId) : "",
      featured: p.featured, active: p.active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.price) {
      toast({ title: "Ad, slug ve fiyat gerekli", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/shop/products/${editing.id}` : "/api/shop/products";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
          stock: parseInt(form.stock),
          categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: editing ? "Ürün güncellendi" : "Ürün eklendi" });
      setOpen(false);
      load();
    } catch { toast({ title: "Kaydedilemedi", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`/api/shop/products/${id}`, { method: "DELETE" });
      toast({ title: "Ürün silindi" });
      load();
    } catch { toast({ title: "Silinemedi", variant: "destructive" }); }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search)
  );

  return (
    <AdminLayout title="Ürünler">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} ürün</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Yeni Ürün
          </Button>
          <Button variant="outline" asChild><Link href="/admin/toplu-ice-aktar">Toplu İçe Aktar</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/urun-kategorileri">Kategoriler</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/siparisler">
            <ShoppingCart className="w-4 h-4 mr-1.5" />Siparişler
          </Link></Button>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm border">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..." className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">GÖRSEL</TableHead>
              <TableHead>ÜRÜN ADI</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>FİYAT</TableHead>
              <TableHead>STOK</TableHead>
              <TableHead>DURUM</TableHead>
              <TableHead className="text-right">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {search ? `"${search}" için ürün bulunamadı` : "Henüz ürün yok. İlk ürünü ekle →"}
              </TableCell></TableRow>
            ) : (
              filtered.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded border" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    {product.featured && <Badge variant="secondary" className="text-[10px] mt-0.5">Öne Çıkan</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono">{product.sku || "-"}</TableCell>
                  <TableCell>
                    {product.salePrice ? (
                      <div>
                        <span className="font-bold text-[#e61e25]">₺{parseFloat(product.salePrice).toFixed(2)}</span>
                        <span className="text-xs text-gray-400 line-through ml-1">₺{parseFloat(product.price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-bold">₺{parseFloat(product.price).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${product.stock === 0 ? "text-red-500" : product.stock < 5 ? "text-amber-600" : "text-green-600"}`}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "default" : "secondary"}
                      className={product.active ? "bg-green-100 text-green-800" : ""}>
                      {product.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(product.id, product.name)}>
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

      {/* Product Edit/Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Ürün Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ürün Adı *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: editing ? p.slug : autoSlug(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="mt-1 font-mono" />
              </div>
            </div>
            <div>
              <Label>Kısa Açıklama</Label>
              <Input value={form.shortDescription} onChange={e => setForm(p => ({ ...p, shortDescription: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Fiyat (₺) *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>İndirimli Fiyat (₺)</Label>
                <Input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(p => ({ ...p, salePrice: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Stok</Label>
                <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU / Barkod</Label>
                <Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} className="mt-1 font-mono" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kategori Yok</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Görsel URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={v => setForm(p => ({ ...p, featured: v }))} />
                <Label>Öne Çıkan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
                <Label>Aktif</Label>
              </div>
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
