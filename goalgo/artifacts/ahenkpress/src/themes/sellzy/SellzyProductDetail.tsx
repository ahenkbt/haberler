/**
 * Ported from Sellzy apps/web product/[slug]/page.tsx structure:
 * Breadcrumb, ProductGallery, ProductInfo, SupportInfo, ProductTabs, ProductReviews, RelatedProducts
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as CrumbIcon,
  GitCompare,
  Minus,
  Package,
  Plus,
  Share2,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { SellzyContainer } from "./SellzyContainer";
import { SellzySupportInfo } from "./SellzyHomeSections";
import { SellzyProductCard } from "./SellzyHomeSections";
import type { SellzyProduct } from "./types";

export type SellzyProductDetailData = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  sku?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryId?: number | null;
  averageRating?: number;
  numReviews?: number;
  colors?: Array<{ name: string; value: string }>;
  sizes?: Array<{ name: string }>;
  href: string;
  vendor: {
    id: number;
    name: string;
    slug: string;
    storefrontHref: string;
    rating?: number | null;
  };
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string;
    userName: string;
    createdAt: string;
  }>;
};

type RelatedProduct = SellzyProduct;

function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 })
    : "₺0";
}

function marketplaceVendorHref(slug: string): string {
  const s = String(slug ?? "").trim();
  return s ? `/magaza/magaza/${encodeURIComponent(s)}` : "/magaza/magazalar";
}

function SellzyRatings({ rating, totalReviews }: { rating: number; totalReviews?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
        return (
          <span key={star} className="relative inline-block size-4">
            <Star className="size-4 text-gray-200 fill-gray-200" />
            {fill > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <Star className="size-4 text-warning fill-[#FFB800]" />
              </span>
            ) : null}
          </span>
        );
      })}
      {totalReviews != null ? <span className="text-sm text-muted-foreground ml-1">({totalReviews})</span> : null}
    </div>
  );
}

/** Ported from Sellzy ProductGallery.tsx */
function SellzyProductGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainRef, emblaMain] = useEmblaCarousel({ loop: true });
  const [thumbRef, emblaThumb] = useEmblaCarousel({ containScroll: "keepSnaps", dragFree: true });

  const onThumbClick = useCallback(
    (index: number) => {
      emblaMain?.scrollTo(index);
    },
    [emblaMain],
  );

  const onSelect = useCallback(() => {
    if (!emblaMain || !emblaThumb) return;
    const idx = emblaMain.selectedScrollSnap();
    setSelectedIndex(idx);
    emblaThumb.scrollTo(idx);
  }, [emblaMain, emblaThumb]);

  useEffect(() => {
    if (!emblaMain) return;
    onSelect();
    emblaMain.on("select", onSelect);
    emblaMain.on("reInit", onSelect);
  }, [emblaMain, onSelect]);

  if (!images.length) {
    return (
      <div className="flex items-center justify-center aspect-square rounded-2xl border border-border bg-light-bg">
        <Package className="size-24 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[500px]">
      <div className="xl:w-[114px] w-full order-2 xl:order-1 shrink-0">
        <div className="overflow-hidden xl:h-full" ref={thumbRef}>
          <div className="flex xl:flex-col flex-row gap-4">
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => onThumbClick(index)}
                className={cn(
                  "relative flex-none xl:size-[114px] size-20 overflow-hidden border-[1.5px] shrink-0 rounded-xl transition-all",
                  selectedIndex === index ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={src} alt="" className="w-full h-full object-contain p-2 bg-light-bg rounded-md" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="xl:flex-1 order-1 xl:order-2 min-w-0">
        <div className="relative rounded-2xl border border-border overflow-hidden bg-light-bg group aspect-square xl:aspect-auto xl:h-full">
          <div className="overflow-hidden h-full" ref={mainRef}>
            <div className="flex h-full">
              {images.map((src, index) => (
                <div key={index} className="flex-[0_0_100%] min-w-0 relative h-full flex items-center justify-center">
                  <img src={src} alt="" className="w-full h-full object-contain p-6" />
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => emblaMain?.scrollPrev()} className="absolute left-6 top-1/2 -translate-y-1/2 size-12 flex items-center justify-center rounded-full bg-white/80 shadow opacity-0 group-hover:opacity-100 z-10">
            <ChevronLeft className="size-6" />
          </button>
          <button type="button" onClick={() => emblaMain?.scrollNext()} className="absolute right-6 top-1/2 -translate-y-1/2 size-12 flex items-center justify-center rounded-full bg-white/80 shadow opacity-0 group-hover:opacity-100 z-10">
            <ChevronRight className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ported from Sellzy ProductInfo.tsx (adapted for Yekpare cart) */
function SellzyProductInfo({ product }: { product: SellzyProductDetailData }) {
  const [, navigate] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] ?? null);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? null);
  const [qty, setQty] = useState(1);

  const price = product.price;
  const salePrice = product.salePrice;
  const displayPrice = salePrice && salePrice > 0 ? salePrice : price;
  const discount = salePrice && price > salePrice ? Math.round((1 - salePrice / price) * 100) : 0;
  const stock = product.stock == null ? 99 : Number(product.stock);
  const maxQty = Math.min(Math.max(stock, 1), 10);
  const variantLabel = [selectedColor?.name, selectedSize?.name].filter(Boolean).join(" / ");

  const addToCart = (checkout = false) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: String(price),
        salePrice: salePrice != null ? String(salePrice) : null,
        imageUrl: product.imageUrl ?? null,
        slug: product.slug,
        stock,
        vendorId: product.vendor?.id ?? undefined,
        vendorName: product.vendor.name,
        storefrontHref: product.vendor.storefrontHref,
      },
      qty,
      variantLabel || undefined,
    );
    if (checkout) {
      navigate("/magaza/sepet");
      return;
    }
    toast({ title: "Sepete eklendi", description: product.name });
  };

  return (
    <div className="bg-white border border-light-divider flex flex-col gap-6 items-start p-6 rounded-3xl size-full">
      <div className="flex flex-col gap-6 items-start w-full">
        <div className="flex gap-2.5 items-center">
          {discount > 0 ? (
            <div className="flex justify-center items-center bg-warning-lighter px-2 py-0.5 rounded-sm">
              <span className="font-medium text-sm text-black">İNDİRİM</span>
            </div>
          ) : null}
          <p className="font-bold text-xs text-info uppercase">Yeni</p>
        </div>
        {product.vendor?.name ? (
          <Link
            href={product.vendor.storefrontHref || marketplaceVendorHref(product.vendor.slug)}
            className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-light-divider bg-[#f4f6f8] px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Store className="size-4 shrink-0 text-primary" />
            <span className="font-semibold text-light-primary-text">{product.vendor.name}</span>
            {product.vendor.rating != null && Number(product.vendor.rating) > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {Number(product.vendor.rating).toFixed(1)}
              </span>
            ) : null}
          </Link>
        ) : null}
        <h1 className="font-bold text-[32px] text-light-primary-text leading-tight">{product.name}</h1>
        <SellzyRatings rating={product.averageRating ?? product.vendor.rating ?? 4.5} totalReviews={product.numReviews ?? 0} />
        <div className="flex items-center gap-3">
          <p className="font-bold text-2xl text-light-primary-text">{currency(displayPrice)}</p>
          {salePrice && salePrice < price ? (
            <>
              <div className="w-px h-6 bg-light-disabled-text/20" />
              <p className="text-2xl text-light-disabled-text line-through">{currency(price)}</p>
              <div className="bg-warning px-2 py-0.5 rounded-sm"><span className="font-medium text-sm">%{discount} İNDİRİM</span></div>
            </>
          ) : null}
        </div>
      </div>
      <div className="border-t border-dashed border-light-disabled-text/30 w-full" />
      {product.colors?.length ? (
        <div className="flex flex-col gap-4 w-full">
          <p className="font-semibold text-base">Renk: <span className="font-normal">{selectedColor?.name}</span></p>
          <div className="flex gap-2">
            {product.colors.map((color) => (
              <button key={color.name} type="button" onClick={() => setSelectedColor(color)} className={cn("size-10 rounded-full border-2 p-1 bg-white", selectedColor?.name === color.name ? "border-primary" : "border-transparent")}>
                <div className="w-full h-full rounded-full border border-border" style={{ backgroundColor: color.value }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {product.sizes?.length ? (
        <div className="flex flex-col gap-4 w-full">
          <p className="font-semibold text-base">Beden: <span className="font-normal">{selectedSize?.name}</span></p>
          <div className="flex flex-wrap gap-3">
            {product.sizes.map((size) => (
              <button key={size.name} type="button" onClick={() => setSelectedSize(size)} className={cn("h-10 min-w-[70px] px-4 rounded-full font-semibold text-sm", selectedSize?.name === size.name ? "bg-primary text-white" : "border border-border text-light-primary-text bg-white")}>
                {size.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 w-full">
        <p className="font-semibold text-base">Miktar</p>
        <div className="flex flex-col xl:flex-row items-start gap-4 w-full">
          <div className="border border-border flex items-center justify-between px-4 py-3 rounded-full w-full sm:w-44 h-12 bg-white">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="hover:text-primary"><Minus className="size-5" /></button>
            <span className="font-semibold">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="hover:text-primary"><Plus className="size-5" /></button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full flex-1">
            <Button onClick={() => addToCart(true)} disabled={stock <= 0} className="w-full sm:flex-1 h-12 rounded-full bg-warning hover:bg-warning/90 text-foreground font-semibold">Hemen al</Button>
            <Button onClick={() => addToCart(false)} disabled={stock <= 0} className="w-full sm:flex-1 h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold gap-2">
              <ShoppingCart className="size-5" /> Sepete ekle
            </Button>
          </div>
        </div>
      </div>
      <div className="border-t border-dashed border-light-disabled-text/30 w-full" />
      <div className="flex items-center gap-4 w-full">
        <button type="button" onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => undefined)} className="flex items-center gap-2 text-secondary hover:opacity-80">
          <Share2 className="size-5" /><span>Paylaş</span>
        </button>
        <div className="w-px h-3 bg-border" />
        <button type="button" className="flex items-center gap-2 text-secondary hover:opacity-80">
          <GitCompare className="size-5" /><span>Karşılaştır</span>
        </button>
      </div>
      <div className="flex flex-col gap-4 w-full text-sm">
        <div className="flex gap-4"><span className="font-semibold w-28 shrink-0">Ücretsiz kargo</span><span className="text-light-secondary-text">Tahmini teslimat 5-7 gün</span></div>
        {product.sku ? <div className="flex gap-4"><span className="font-semibold w-28 shrink-0">SKU</span><span className="text-light-secondary-text">{product.sku}</span></div> : null}
        {product.categoryName ? <div className="flex gap-4"><span className="font-semibold w-28 shrink-0">Kategori</span><span className="text-light-secondary-text">{product.categoryName}</span></div> : null}
      </div>
    </div>
  );
}

/** Simplified ProductTabs from Sellzy */
function SellzyProductTabs({ product }: { product: SellzyProductDetailData }) {
  const [tab, setTab] = useState<"description" | "additional">("description");
  const rows = [
    ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
    ...(product.categoryName ? [{ label: "Kategori", value: product.categoryName }] : []),
    ...(product.colors?.length ? [{ label: "Renkler", value: product.colors.map((c) => c.name).join(", ") }] : []),
    ...(product.sizes?.length ? [{ label: "Bedenler", value: product.sizes.map((s) => s.name).join(", ") }] : []),
    { label: "Stok", value: (product.stock ?? 0) > 0 ? `${product.stock} adet` : "Tükendi" },
    { label: "Puan", value: `${(product.averageRating ?? 0).toFixed(1)} / 5 (${product.numReviews ?? 0} yorum)` },
  ];

  return (
    <div className="py-12">
      <div className="flex flex-wrap gap-2 bg-white rounded-lg w-fit mb-8">
        {(["description", "additional"] as const).map((id) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("md:px-8 md:py-3 px-4 py-2 rounded-full text-base font-medium transition-all", tab === id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-gray-100")}>
            {id === "description" ? "Açıklama" : "Ek bilgiler"}
          </button>
        ))}
      </div>
      <div className="w-full border border-border rounded-3xl overflow-hidden bg-white">
        <div className="bg-gray-200 px-6 py-4 border-b border-border">
          <h2 className="font-bold text-xl">{tab === "description" ? "Ürün açıklaması" : "Ek bilgiler"}</h2>
        </div>
        <div className="p-6 sm:p-8">
          {tab === "description" ? (
            product.description ? (
              <div className="text-base text-light-secondary-text leading-7 whitespace-pre-wrap">{product.description}</div>
            ) : (
              <p className="text-muted-foreground">Bu ürün için açıklama henüz eklenmemiş.</p>
            )
          ) : (
            <div className="flex flex-col">
              {rows.map((row, idx) => (
                <div key={row.label}>
                  <div className="flex items-center gap-4 py-3.5">
                    <span className="font-semibold w-40 shrink-0">{row.label}</span>
                    <span className="text-light-secondary-text flex-1">{row.value}</span>
                  </div>
                  {idx < rows.length - 1 ? <div className="h-px bg-border" /> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Simplified ProductReviews — read-only + stub form */
function SellzyProductReviews({ product }: { product: SellzyProductDetailData }) {
  const reviews = product.reviews ?? [];
  const avg = product.averageRating ?? 0;
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const k = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    if (k >= 1 && k <= 5) dist[k]++;
  });

  return (
    <section className="py-12 border-t border-border">
      <h3 className="text-[32px] font-bold text-light-primary-text mb-8">Müşteri yorumları</h3>
      <div className="grid lg:grid-cols-[280px_1fr] gap-10">
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <p className="text-5xl font-bold text-primary">{avg.toFixed(1)}</p>
          <SellzyRatings rating={avg} />
          <p className="text-sm text-muted-foreground mt-2">{product.numReviews ?? reviews.length} değerlendirme</p>
          <div className="mt-6 space-y-2 text-left text-sm">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-4">{star}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: `${reviews.length ? (dist[star as keyof typeof dist] / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-muted-foreground">{dist[star as keyof typeof dist]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {reviews.length ? reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="font-semibold">{review.userName}</p>
                <SellzyRatings rating={review.rating} />
              </div>
              <p className="text-sm text-light-secondary-text leading-6">{review.comment}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(review.createdAt).toLocaleDateString("tr-TR")}</p>
            </article>
          )) : (
            <p className="text-muted-foreground rounded-2xl border border-dashed border-border p-8 text-center">Henüz yorum yok. İlk yorumu siz yazın (yakında).</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SellzyRelatedProducts({ products }: { products: RelatedProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  if (!products.length) return null;
  return (
    <section className="py-20">
      <SellzyContainer>
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-[32px] font-bold text-light-primary-text">İlgili ürünler</h3>
          <div className="flex gap-4">
            <button type="button" onClick={() => emblaApi?.scrollPrev()} className="size-12 rounded-full border border-border bg-white hover:bg-primary hover:text-white transition-all flex items-center justify-center"><ChevronLeft /></button>
            <button type="button" onClick={() => emblaApi?.scrollNext()} className="size-12 rounded-full border border-border bg-white hover:bg-primary hover:text-white transition-all flex items-center justify-center"><ChevronRight /></button>
          </div>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-6">
            {products.map((p) => (
              <div key={p.id} className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] xl:flex-[0_0_20%] pl-6 min-w-0">
                <SellzyProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

export function SellzyProductDetailPage({
  product,
  related,
}: {
  product: SellzyProductDetailData;
  related: RelatedProduct[];
}) {
  const images = (product.images?.length ? product.images : [product.imageUrl]).filter(Boolean).map((s) => resolveClientMediaSrc(s) || "") as string[];

  return (
    <main className="w-full bg-white pb-6 pt-3 md:pb-10 md:pt-4">
      <SellzyContainer>
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-light-secondary-text">
          <Link href="/magaza" className="hover:text-primary">Pazaryeri</Link>
          <CrumbIcon className="size-3.5" />
          <Link href={product.vendor.storefrontHref || marketplaceVendorHref(product.vendor.slug)} className="hover:text-primary">{product.vendor.name}</Link>
          {product.categoryName ? (
            <>
              <CrumbIcon className="size-3.5" />
              <Link href={product.categorySlug ? `/magaza/kategori/${product.categorySlug}` : "/magaza/urunler"} className="hover:text-primary">{product.categoryName}</Link>
            </>
          ) : null}
          <CrumbIcon className="size-3.5" />
          <span className="text-light-primary-text truncate max-w-[240px]">{product.name}</span>
        </nav>
        <section className="pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <SellzyProductGallery images={images} />
            </div>
            <div className="lg:col-span-5">
              <SellzyProductInfo product={product} />
            </div>
          </div>
        </section>
        <SellzySupportInfo />
        <SellzyProductTabs product={product} />
        <SellzyProductReviews product={product} />
        <SellzyRelatedProducts products={related} />
      </SellzyContainer>
    </main>
  );
}
