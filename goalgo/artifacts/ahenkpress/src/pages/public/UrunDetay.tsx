import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useCart } from "@/hooks/useCart";
import {
  ShoppingCart, ArrowLeft, Star, Package, Truck, Shield,
  RotateCcw, Plus, Minus, Check, ChevronRight, Zap, Heart,
  Share2, Phone, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number; name: string; slug: string;
  description?: string | null; shortDescription?: string | null;
  price: string; salePrice?: string | null;
  imageUrl?: string | null; images?: string[] | null;
  categoryId?: number | null; tags?: string[] | null;
  featured: boolean; stock: number; sku?: string | null;
}

interface Category { id: number; name: string; slug: string }
interface RelatedProduct { id: number; name: string; slug: string; price: string; salePrice?: string | null; imageUrl?: string | null; stock: number }

const SIZE_TAGS = ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "small", "medium", "large", "36", "37", "38", "39", "40", "41", "42", "43", "44"];
const COLOR_TAGS = ["kırmızı", "mavi", "yeşil", "siyah", "beyaz", "sarı", "turuncu", "mor", "pembe", "gri", "kahverengi", "lacivert", "gümüş", "altın", "bej"];

function detectVariantType(tags: string[]): { sizes: string[]; colors: string[] } {
  const lc = tags.map(t => t.toLowerCase().trim());
  const sizes = tags.filter(t => SIZE_TAGS.includes(t.toLowerCase().trim()));
  const colors = tags.filter(t => COLOR_TAGS.includes(t.toLowerCase().trim()));
  void lc;
  return { sizes, colors };
}

export default function UrunDetay() {
  const { slug } = useParams<{ slug: string }>();
  const { data: settings } = useGetSiteSettings();
  const [, navigate] = useLocation();
  const { addItem, count } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [added, setAdded] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/shop/products/slug/${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(async (p: Product | null) => {
        if (!p) return;
        setProduct(p);
        setSelectedImage(0);

        if (p.categoryId) {
          const [catRes, relRes] = await Promise.all([
            fetch(`/api/shop/categories`).then(r => r.json()),
            fetch(`/api/shop/products?categoryId=${p.categoryId}&limit=8`).then(r => r.json()),
          ]);
          const cats: Category[] = catRes;
          setCategory(cats.find(c => c.id === p.categoryId) ?? null);
          setRelated((relRes.items ?? []).filter((rp: RelatedProduct) => rp.id !== p.id).slice(0, 4));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#e61e25] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-center px-4">
      <Package className="w-16 h-16 text-gray-200" />
      <h1 className="text-2xl font-black text-gray-700">Ürün Bulunamadı</h1>
      <p className="text-gray-400">Aradığınız ürün mevcut değil veya kaldırılmış.</p>
      <Link href="/magaza" className="bg-[#e61e25] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#c9181e]">
        ← Mağazaya Dön
      </Link>
    </div>
  );

  const price = parseFloat(product.price);
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const displayPrice = salePrice ?? price;
  const discount = salePrice && price > salePrice ? Math.round((1 - salePrice / price) * 100) : 0;
  const allImages = [product.imageUrl, ...(product.images ?? [])].filter(Boolean) as string[];
  const tags = product.tags ?? [];
  const { sizes, colors } = detectVariantType(tags);
  const otherTags = tags.filter(t => !sizes.includes(t) && !colors.includes(t));
  const maxQty = Math.min(product.stock || 10, 10);

  const handleAddToCart = (goToCheckout = false) => {
    const variant = [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined;
    addItem({ id: product.id, name: product.name, price: product.price, salePrice: product.salePrice, imageUrl: product.imageUrl, slug: product.slug, stock: product.stock }, qty, variant);
    if (goToCheckout) { navigate("/odeme"); return; }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    toast({ title: "Sepete eklendi!", description: `${product.name} ${qty} adet sepete eklendi.` });
  };

  const canAdd = product.stock > 0 && (sizes.length === 0 || selectedSize) && (colors.length === 0 || selectedColor);

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-zinc-900 text-zinc-300 text-xs py-1.5 px-4">
        <div className="container mx-auto flex justify-between">
          <span></span>
          <Link href="/admin" className="hover:text-white">Yönetim Paneli</Link>
        </div>
      </div>
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            <span className="text-[#e61e25]">{settings?.logoText1 || "Yek"}</span>
            <span>{settings?.logoText2 || "pare"}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/magaza" className="relative p-2 hover:bg-gray-100 rounded-full">
              <ShoppingCart className="w-6 h-6" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#e61e25] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <nav className="bg-[#e61e25]">
          <div className="container mx-auto px-4">
            <ul className="flex gap-6 h-9 text-xs font-bold uppercase text-white items-center">
              <li><Link href="/" className="hover:text-red-200">Anasayfa</Link></li>
              <li><Link href="/magaza" className="hover:text-red-200">Alışveriş</Link></li>
              {category && <li><button onClick={() => navigate(`/magaza?kategori=${category.slug}`)} className="hover:text-red-200">{category.name}</button></li>}
              <li><span className="opacity-70 truncate max-w-32">{product.name}</span></li>
            </ul>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
          <Link href="/magaza" className="hover:text-[#e61e25]">Alışveriş</Link>
          {category && <>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate(`/magaza?kategori=${category.slug}`)} className="hover:text-[#e61e25]">{category.name}</button>
          </>}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-semibold truncate max-w-48">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="relative bg-white rounded-2xl border overflow-hidden aspect-square mb-3">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                  onError={e => { (e.target as HTMLImageElement).src = ""; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <Package className="w-20 h-20 text-gray-200" />
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-[#e61e25] text-white text-sm font-black px-3 py-1.5 rounded-full shadow-md">
                  %{discount} İndirim
                </div>
              )}
              {product.featured && (
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded-full">⭐ Önerilen</div>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-black/70 text-white font-bold text-lg px-6 py-3 rounded-xl">Stok Tükendi</span>
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === i ? "border-[#e61e25]" : "border-transparent hover:border-gray-300"}`}>
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {category && (
              <span className="text-xs font-bold text-[#e61e25] uppercase tracking-wider mb-2">{category.name}</span>
            )}
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">{product.shortDescription}</p>
            )}

            {/* Price */}
            <div className="mb-5">
              {salePrice ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-[#e61e25]">₺{salePrice.toFixed(2)}</span>
                  <span className="text-xl text-gray-400 line-through">₺{price.toFixed(2)}</span>
                  <span className="bg-[#e61e25]/10 text-[#e61e25] text-sm font-black px-2 py-0.5 rounded-lg">%{discount} tasarruf</span>
                </div>
              ) : (
                <span className="text-4xl font-black text-[#e61e25]">₺{price.toFixed(2)}</span>
              )}
              <p className="text-xs text-gray-400 mt-1">KDV dahil fiyat</p>
            </div>

            {/* Stock */}
            <div className={`flex items-center gap-2 text-sm font-semibold mb-5 ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-red-500"}`} />
              {product.stock > 0 ? `${product.stock > 10 ? "Stokta var" : `Son ${product.stock} adet`}` : "Stok tükendi"}
            </div>

            {/* Size selector */}
            {sizes.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-700 mb-2 block">BEDEN {selectedSize ? `— ${selectedSize}` : "(Seçiniz)"}</label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(selectedSize === s ? "" : s)}
                      className={`w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all ${selectedSize === s ? "border-[#e61e25] bg-[#e61e25] text-white" : "border-gray-200 hover:border-[#e61e25]"}`}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-700 mb-2 block">RENK {selectedColor ? `— ${selectedColor}` : "(Seçiniz)"}</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(c => (
                    <button key={c} onClick={() => setSelectedColor(selectedColor === c ? "" : c)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold capitalize transition-all ${selectedColor === c ? "border-[#e61e25] bg-[#e61e25] text-white" : "border-gray-200 hover:border-[#e61e25]"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-700 mb-2 block">MİKTAR</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 rounded-xl overflow-hidden">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-black text-lg">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">Toplam: <strong className="text-gray-700">₺{(displayPrice * qty).toFixed(2)}</strong></span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <Button
                className={`h-13 text-base font-black rounded-xl gap-2 transition-all ${added ? "bg-green-600 hover:bg-green-700" : "bg-[#e61e25] hover:bg-[#c9181e]"} text-white`}
                onClick={() => handleAddToCart(false)}
                disabled={!canAdd}
              >
                {added ? <><Check className="w-5 h-5" /> Sepete Eklendi!</> : <><ShoppingCart className="w-5 h-5" /> Sepete Ekle</>}
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-bold rounded-xl gap-2 border-2 hover:border-[#e61e25] hover:text-[#e61e25]"
                onClick={() => handleAddToCart(true)}
                disabled={!canAdd}
              >
                <Zap className="w-4 h-4" /> Hemen Satın Al
              </Button>
            </div>

            {!canAdd && product.stock > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                {sizes.length > 0 && !selectedSize ? "Lütfen beden seçin. " : ""}
                {colors.length > 0 && !selectedColor ? "Lütfen renk seçin." : ""}
              </p>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
              <div className="bg-gray-50 rounded-xl p-3">
                <Truck className="w-5 h-5 text-[#e61e25] mx-auto mb-1" />
                <span className="font-semibold">Hızlı Kargo</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <Shield className="w-5 h-5 text-[#e61e25] mx-auto mb-1" />
                <span className="font-semibold">Güvenli Ödeme</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <RotateCcw className="w-5 h-5 text-[#e61e25] mx-auto mb-1" />
                <span className="font-semibold">14 Gün İade</span>
              </div>
            </div>

            {/* SKU */}
            {product.sku && <p className="text-xs text-gray-400 mt-4">Ürün Kodu: {product.sku}</p>}

            {/* Tags */}
            {otherTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {otherTags.map(t => (
                  <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="bg-white rounded-2xl border p-6 mb-8">
            <h2 className="font-black text-lg mb-4">Ürün Açıklaması</h2>
            <div className={`text-sm text-gray-600 leading-relaxed ${!showFullDesc ? "max-h-40 overflow-hidden relative" : ""}`}>
              {product.description.split("\n").map((line, i) => <p key={i} className="mb-2">{line}</p>)}
              {!showFullDesc && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />}
            </div>
            {product.description.length > 300 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-[#e61e25] text-sm font-semibold hover:underline mt-2">
                {showFullDesc ? "Daha az göster ↑" : "Tamamını oku ↓"}
              </button>
            )}
          </div>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black">Benzer Ürünler</h2>
                <div className="w-10 h-1 bg-[#e61e25] mt-1.5" />
              </div>
              {category && (
                <button onClick={() => navigate(`/magaza?kategori=${category.slug}`)} className="text-sm text-[#e61e25] hover:underline font-semibold flex items-center gap-1">
                  Tümünü Gör <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(rp => {
                const rPrice = parseFloat(rp.price);
                const rSale = rp.salePrice ? parseFloat(rp.salePrice) : null;
                return (
                  <Link key={rp.id} href={`/magaza/urun/${rp.slug}`}
                    className="bg-white rounded-xl border overflow-hidden hover:shadow-md hover:border-[#e61e25] transition-all group flex flex-col">
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {rp.imageUrl ? (
                        <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-xs font-semibold line-clamp-2 flex-1 mb-2 text-gray-800">{rp.name}</p>
                      <div>
                        {rSale ? (
                          <><span className="text-[#e61e25] font-black text-sm">₺{rSale.toFixed(2)}</span>
                          <span className="text-gray-400 text-[10px] line-through ml-1">₺{rPrice.toFixed(2)}</span></>
                        ) : <span className="text-[#e61e25] font-black text-sm">₺{rPrice.toFixed(2)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom buy bar (mobile) */}
      {product.stock > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 flex gap-3 md:hidden z-40">
          <div className="flex-1">
            {salePrice ? (
              <><span className="text-[#e61e25] font-black text-lg">₺{salePrice.toFixed(2)}</span>
              <span className="text-gray-400 text-xs line-through ml-1">₺{price.toFixed(2)}</span></>
            ) : <span className="text-[#e61e25] font-black text-lg">₺{price.toFixed(2)}</span>}
          </div>
          <Button className={`flex-1 font-black ${added ? "bg-green-600" : "bg-[#e61e25] hover:bg-[#c9181e]"} text-white`}
            onClick={() => handleAddToCart(false)} disabled={!canAdd}>
            {added ? "Eklendi ✓" : "Sepete Ekle"}
          </Button>
          <Button variant="outline" className="shrink-0 font-bold border-[#e61e25] text-[#e61e25]"
            onClick={() => handleAddToCart(true)} disabled={!canAdd}>
            Satın Al
          </Button>
        </div>
      )}
      <div className="h-16 md:hidden" />
    </div>
  );
}
