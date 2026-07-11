import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  Save, Loader2, Package, Tag, Settings, Trash2, Plus, Star, StarOff,
  Edit2, Check, X, RefreshCw, Image, Phone, Mail, MapPin, Clock, MessageCircle, Truck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  salePrice?: string;
  imageUrl?: string;
  categoryId?: number;
  featured: boolean;
  active: boolean;
  stock: number;
  shortDescription?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}

interface ShopSettings {
  storeName: string;
  storeDescription: string;
  bannerImageUrl: string;
  bannerSubtext: string;
  returnPolicy: string;
  shippingInfo: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  workingHours: string;
  whatsapp: string;
  featuredCategorySlug: string;
}

export default function MagazaYonetimi() {
  const { toast } = useToast();

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    storeName: "", storeDescription: "", bannerImageUrl: "", bannerSubtext: "",
    returnPolicy: "", shippingInfo: "", contactPhone: "", contactEmail: "",
    contactAddress: "", workingHours: "", whatsapp: "", featuredCategorySlug: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // New product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", salePrice: "", stock: "0", imageUrl: "", shortDescription: "", categoryId: "" });
  const [savingProduct, setSavingProduct] = useState(false);

  // New category form
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Edit product inline
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Product>>({});

  function slugify(str: string) {
    return str.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function loadData() {
    setLoading(true);
    try {
      const [prods, cats, settings] = await Promise.all([
        fetch("/api/shop/products?limit=200").then(r => r.json()),
        fetch("/api/shop/categories").then(r => r.json()),
        fetch("/api/shop/settings").then(r => r.json()),
      ]);
      setProducts(prods.items ?? []);
      setCategories(cats ?? []);
      setShopSettings({
        storeName: settings.storeName ?? "",
        storeDescription: settings.storeDescription ?? "",
        bannerImageUrl: settings.bannerImageUrl ?? "",
        bannerSubtext: settings.bannerSubtext ?? "",
        returnPolicy: settings.returnPolicy ?? "",
        shippingInfo: settings.shippingInfo ?? "",
        contactPhone: settings.contactPhone ?? "",
        contactEmail: settings.contactEmail ?? "",
        contactAddress: settings.contactAddress ?? "",
        workingHours: settings.workingHours ?? "",
        whatsapp: settings.whatsapp ?? "",
        featuredCategorySlug: settings.featuredCategorySlug ?? "",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Toggle featured
  async function toggleFeatured(product: Product) {
    await fetch(`/api/shop/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, featured: !product.featured }),
    });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, featured: !p.featured } : p));
    toast({ title: product.featured ? "Öne çıkarma kaldırıldı" : "Ürün öne çıkarıldı" });
  }

  // Toggle active
  async function toggleActive(product: Product) {
    await fetch(`/api/shop/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, active: !product.active }),
    });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
  }

  // Delete product
  async function deleteProduct(id: number) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/shop/products/${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
    toast({ title: "Ürün silindi" });
  }

  // Save inline edit
  async function saveEdit(product: Product) {
    const updated = { ...product, ...editValues };
    await fetch(`/api/shop/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...editValues } : p));
    setEditingProductId(null);
    toast({ title: "Ürün güncellendi" });
  }

  // Create product
  async function createProduct() {
    if (!newProduct.name || !newProduct.price) { toast({ title: "Ad ve fiyat zorunludur", variant: "destructive" }); return; }
    setSavingProduct(true);
    const body = {
      name: newProduct.name,
      slug: slugify(newProduct.name),
      price: newProduct.price,
      salePrice: newProduct.salePrice || null,
      stock: parseInt(newProduct.stock) || 0,
      imageUrl: newProduct.imageUrl || null,
      shortDescription: newProduct.shortDescription || null,
      categoryId: newProduct.categoryId ? parseInt(newProduct.categoryId) : null,
      featured: false, active: true,
    };
    const res = await fetch("/api/shop/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast({ title: "Ürün eklendi" });
      setNewProduct({ name: "", price: "", salePrice: "", stock: "0", imageUrl: "", shortDescription: "", categoryId: "" });
      setShowNewProduct(false);
      loadData();
    } else { toast({ title: "Hata oluştu", variant: "destructive" }); }
    setSavingProduct(false);
  }

  // Create category
  async function createCategory() {
    if (!newCatName) return;
    setSavingCat(true);
    await fetch("/api/shop/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, slug: slugify(newCatName), active: true }),
    });
    toast({ title: "Kategori eklendi" });
    setNewCatName("");
    setShowNewCategory(false);
    loadData();
    setSavingCat(false);
  }

  // Delete category
  async function deleteCategory(id: number) {
    if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/shop/categories/${id}`, { method: "DELETE" });
    setCategories(prev => prev.filter(c => c.id !== id));
    toast({ title: "Kategori silindi" });
  }

  // Save shop settings
  async function saveShopSettings() {
    setSavingSettings(true);
    const res = await fetch("/api/shop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shopSettings),
    });
    if (res.ok) {
      toast({ title: "Mağaza ayarları kaydedildi", description: "Değişiklikler mağaza sayfasına yansıdı." });
    } else {
      toast({ title: "Hata oluştu", variant: "destructive" });
    }
    setSavingSettings(false);
  }

  const featuredCount = products.filter(p => p.featured).length;

  return (
    <AdminLayout title="Mağaza Yönetimi">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mağaza Yönetimi</h1>
            <p className="text-gray-500 text-sm mt-1">{products.length} ürün · {categories.length} kategori · {featuredCount} öne çıkan</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
            <TabsTrigger value="products" className="gap-1.5"><Package className="w-4 h-4" />Ürünler</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="w-4 h-4" />Kategoriler</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" />Mağaza Ayarları</TabsTrigger>
          </TabsList>

          {/* ─── PRODUCTS TAB ─── */}
          <TabsContent value="products">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Ürün Listesi</h2>
              <Button size="sm" className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-1.5" onClick={() => setShowNewProduct(!showNewProduct)}>
                <Plus className="w-4 h-4" /> Yeni Ürün
              </Button>
            </div>

            {/* New product form */}
            {showNewProduct && (
              <div className="bg-white border rounded-xl p-6 mb-4 shadow-sm">
                <h3 className="font-bold mb-4 text-gray-800">Yeni Ürün Ekle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ürün Adı *</Label>
                    <Input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Ürün adı" className="mt-1" />
                  </div>
                  <div>
                    <Label>Fiyat (₺) *</Label>
                    <Input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="mt-1" />
                  </div>
                  <div>
                    <Label>İndirimli Fiyat (₺)</Label>
                    <Input type="number" value={newProduct.salePrice} onChange={e => setNewProduct(p => ({ ...p, salePrice: e.target.value }))} placeholder="Boş bırak = indirim yok" className="mt-1" />
                  </div>
                  <div>
                    <Label>Stok</Label>
                    <Input type="number" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Resim URL</Label>
                    <Input value={newProduct.imageUrl} onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <select value={newProduct.categoryId} onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Kategori seç</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Kısa Açıklama</Label>
                    <Input value={newProduct.shortDescription} onChange={e => setNewProduct(p => ({ ...p, shortDescription: e.target.value }))} placeholder="Ürün hakkında kısa bilgi" className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={createProduct} disabled={savingProduct} className="bg-[#e61e25] hover:bg-[#c9181e] text-white">
                    {savingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Kaydet
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewProduct(false)}>İptal</Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Henüz ürün yok</p>
                <Button className="mt-4 bg-[#e61e25] hover:bg-[#c9181e] text-white" size="sm" onClick={() => setShowNewProduct(true)}>
                  <Plus className="w-4 h-4 mr-1" /> İlk ürünü ekle
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Ürün</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Fiyat</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Stok</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Aktif</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Öne Çıkan</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(product => (
                      <tr key={product.id} className={`hover:bg-gray-50 ${!product.active ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-10 h-10 object-cover rounded" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <Image className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                            <div>
                              {editingProductId === product.id ? (
                                <Input
                                  value={editValues.name ?? product.name}
                                  onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                                  className="h-7 text-xs w-40"
                                />
                              ) : (
                                <p className="font-medium line-clamp-1">{product.name}</p>
                              )}
                              <p className="text-xs text-gray-400">#{product.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {editingProductId === product.id ? (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                value={editValues.price ?? product.price}
                                onChange={e => setEditValues(v => ({ ...v, price: e.target.value }))}
                                className="h-7 text-xs w-20"
                                placeholder="Fiyat"
                              />
                              <Input
                                type="number"
                                value={editValues.salePrice ?? product.salePrice ?? ""}
                                onChange={e => setEditValues(v => ({ ...v, salePrice: e.target.value || undefined }))}
                                className="h-7 text-xs w-20"
                                placeholder="İndirimli"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-[#e61e25]">₺{parseFloat(product.price).toFixed(2)}</span>
                              {product.salePrice && (
                                <span className="text-xs text-gray-400 line-through ml-1">₺{parseFloat(product.salePrice || "0")}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {editingProductId === product.id ? (
                            <Input
                              type="number"
                              value={editValues.stock ?? product.stock}
                              onChange={e => setEditValues(v => ({ ...v, stock: parseInt(e.target.value) }))}
                              className="h-7 text-xs w-16"
                            />
                          ) : (
                            <span className={product.stock === 0 ? "text-red-500 font-medium" : ""}>{product.stock}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch checked={product.active} onCheckedChange={() => toggleActive(product)} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleFeatured(product)}
                            className={`p-1 rounded transition-colors ${product.featured ? "text-yellow-500 hover:text-yellow-600" : "text-gray-300 hover:text-yellow-400"}`}
                          >
                            {product.featured ? <Star className="w-5 h-5 fill-yellow-500" /> : <StarOff className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {editingProductId === product.id ? (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => saveEdit(product)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => setEditingProductId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                  onClick={() => { setEditingProductId(product.id); setEditValues({}); }}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={() => deleteProduct(product.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ─── CATEGORIES TAB ─── */}
          <TabsContent value="categories">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Ürün Kategorileri</h2>
              <Button size="sm" className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-1.5" onClick={() => setShowNewCategory(!showNewCategory)}>
                <Plus className="w-4 h-4" /> Yeni Kategori
              </Button>
            </div>
            {showNewCategory && (
              <div className="bg-white border rounded-xl p-4 mb-4 flex gap-2 items-end shadow-sm">
                <div className="flex-1">
                  <Label>Kategori Adı</Label>
                  <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Örn: Elektronik" className="mt-1" onKeyDown={e => e.key === "Enter" && createCategory()} />
                </div>
                <Button onClick={createCategory} disabled={savingCat || !newCatName} className="bg-[#e61e25] hover:bg-[#c9181e] text-white">
                  {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ekle"}
                </Button>
                <Button variant="outline" onClick={() => setShowNewCategory(false)}>İptal</Button>
              </div>
            )}
            <div className="bg-white rounded-xl border overflow-hidden">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Henüz kategori yok</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Ad</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Ürün Sayısı</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categories.map(cat => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                        <td className="px-4 py-3 text-gray-500">{products.filter(p => p.categoryId === cat.id).length}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={() => deleteCategory(cat.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* ─── SETTINGS TAB ─── */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Store info */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Settings className="w-5 h-5 text-[#e61e25]" /> Mağaza Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Mağaza Adı</Label>
                    <Input value={shopSettings.storeName} onChange={e => setShopSettings(s => ({ ...s, storeName: e.target.value }))} placeholder="Mağaza adı" className="mt-1" />
                  </div>
                  <div>
                    <Label>Banner Resim URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={shopSettings.bannerImageUrl} onChange={e => setShopSettings(s => ({ ...s, bannerImageUrl: e.target.value }))} placeholder="https://..." />
                      {shopSettings.bannerImageUrl && (
                        <img src={shopSettings.bannerImageUrl} className="w-10 h-10 object-cover rounded border" alt="banner" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Banner her zaman koyu arka plan üzerine bindirilir, yazılar okunur.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Mağaza Açıklaması (Banner Alt Yazı)</Label>
                    <Textarea value={shopSettings.storeDescription} onChange={e => setShopSettings(s => ({ ...s, storeDescription: e.target.value }))} placeholder="Banner altında görünecek kısa açıklama" className="mt-1" rows={2} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-500" /> Öne Çıkan Kategori
                    </Label>
                    <select
                      value={shopSettings.featuredCategorySlug}
                      onChange={e => setShopSettings(s => ({ ...s, featuredCategorySlug: e.target.value }))}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Kategori seçin...</option>
                      {categories.filter(c => c.active).map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Mağaza ana sayfasında yeşil hero bölümünde öne çıkarılacak kategori.</p>
                  </div>
                </div>
              </div>

              {/* Return & Shipping */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Package className="w-5 h-5 text-[#e61e25]" /> Kargo & İade Politikası
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Kargo Bilgisi</Label>
                    <Textarea value={shopSettings.shippingInfo} onChange={e => setShopSettings(s => ({ ...s, shippingInfo: e.target.value }))} placeholder="Kargo süresi, ücretsiz kargo limiti vb." className="mt-1" rows={2} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> İade Şartları</Label>
                    <Textarea value={shopSettings.returnPolicy} onChange={e => setShopSettings(s => ({ ...s, returnPolicy: e.target.value }))} placeholder="İade politikanızı buraya yazın..." className="mt-1" rows={5} />
                    <p className="text-xs text-gray-400 mt-1">Bu metin mağaza sayfasında "İade Şartları" bölümünde görünür.</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Phone className="w-5 h-5 text-[#e61e25]" /> İletişim Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> Telefon</Label>
                    <Input value={shopSettings.contactPhone} onChange={e => setShopSettings(s => ({ ...s, contactPhone: e.target.value }))} placeholder="0212 000 00 00" className="mt-1" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> WhatsApp</Label>
                    <Input value={shopSettings.whatsapp} onChange={e => setShopSettings(s => ({ ...s, whatsapp: e.target.value }))} placeholder="905xxxxxxxxx" className="mt-1" />
                    <p className="text-xs text-gray-400 mt-1">Ülke kodu ile birlikte yazın (başında + olmadan)</p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> E-posta</Label>
                    <Input type="email" value={shopSettings.contactEmail} onChange={e => setShopSettings(s => ({ ...s, contactEmail: e.target.value }))} placeholder="magaza@ornek.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Çalışma Saatleri</Label>
                    <Input value={shopSettings.workingHours} onChange={e => setShopSettings(s => ({ ...s, workingHours: e.target.value }))} placeholder="Pzt-Cum: 09:00-18:00" className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Adres</Label>
                    <Textarea value={shopSettings.contactAddress} onChange={e => setShopSettings(s => ({ ...s, contactAddress: e.target.value }))} placeholder="Mağaza adresi" className="mt-1" rows={2} />
                  </div>
                </div>
              </div>

              <Button onClick={saveShopSettings} disabled={savingSettings} className="bg-[#e61e25] hover:bg-[#c9181e] text-white h-11 px-8 font-bold">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Tüm Ayarları Kaydet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
