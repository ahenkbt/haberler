import { Link } from "wouter";
import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Headset, MoveUpRight, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { yekpareEcommerceStoreHref } from "@/lib/marketplaceStoreHref";
import { getCategoryEmoji } from "./categoryEmoji";
import { SellzyContainer } from "./SellzyContainer";
import type { SellzyBanner, SellzyBlogPost, SellzyBrand, SellzyCategory, SellzyProduct, SellzyPromoBanner } from "./types";

function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 })
    : "₺0";
}

/** Ported from Sellzy apps/web/src/components/home/SupportInfo.tsx */
export function SellzySupportInfo() {
  const items = [
    { icon: Truck, title: "Ücretsiz kargo", description: "Seçili mağazalarda 250 TL üzeri siparişlerde" },
    { icon: Headset, title: "7/24 destek", description: "Canlı destek ve sipariş takibi her an yanınızda" },
    { icon: RefreshCcw, title: "30 gün iade", description: "Koşullu iade süreci ile güvenli alışveriş" },
    { icon: ShieldCheck, title: "Güvenli ödeme", description: "3D Secure ödeme altyapısı (stub)" },
  ];
  return (
    <section className="w-full pb-6 pt-3 md:pb-8 md:pt-4 lg:pb-10 lg:pt-5">
      <SellzyContainer>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:gap-4">
          {items.map((item) => (
            <div key={item.title} className="flex w-full flex-col items-center justify-center gap-3 rounded-[16px] border border-gray-300 bg-white p-4 lg:p-4 xl:p-5">
              <span className="inline-flex shrink-0 items-center justify-center size-[52px] lg:size-[44px] xl:size-[56px] bg-warning-lighter rounded-full">
                <item.icon className="size-[26px] lg:size-[22px] xl:size-[32px] text-light-primary-text/80" />
              </span>
              <div className="flex flex-col gap-1.5 items-center text-center w-full">
                <h5 className="text-[18px] lg:text-[16px] xl:text-[20px] font-bold text-light-primary-text">{item.title}</h5>
                <p className="text-[15px] lg:text-[13px] xl:text-[16px] text-light-secondary-text">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Polished horizontal category rail — emoji icons, no subcategory counts */
export function SellzyShopByCategory({ categories, loading }: { categories: SellzyCategory[]; loading?: boolean }) {
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const topCategories = useMemo(
    () => categories.filter((cat) => cat.name?.trim()).slice(0, 24),
    [categories],
  );

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
  }, [api]);

  if (loading) {
    return (
      <section className="py-8 md:py-12 w-full">
        <SellzyContainer>
          <div className="rounded-[20px] border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/50 p-4 sm:p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-emerald-100/70" />
                <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="hidden sm:flex gap-2">
                <div className="size-10 animate-pulse rounded-full bg-slate-100" />
                <div className="size-10 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="flex gap-3 overflow-hidden pb-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-[92px] shrink-0 animate-pulse rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <div className="mx-auto mb-2 size-12 rounded-2xl bg-emerald-50" />
                  <div className="mx-auto h-3 w-14 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </SellzyContainer>
      </section>
    );
  }

  if (!topCategories.length) return null;

  return (
    <section className="py-8 md:py-12 w-full">
      <SellzyContainer>
        <div className="overflow-hidden rounded-[20px] border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/50 p-4 sm:p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-light-primary-text sm:text-2xl md:text-[28px] md:leading-tight">
                Alışveriş Kategorileri
              </h3>
              <p className="mt-1 text-sm text-light-secondary-text">Departmanlardan hızlıca ürünlere geç</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                aria-label="Önceki kategoriler"
                disabled={!canPrev}
                onClick={() => api?.scrollPrev()}
                className={`inline-flex size-10 items-center justify-center rounded-full border transition-colors ${
                  canPrev
                    ? "border-emerald-200 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                }`}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Sonraki kategoriler"
                disabled={!canNext}
                onClick={() => api?.scrollNext()}
                className={`inline-flex size-10 items-center justify-center rounded-full border transition-colors ${
                  canNext
                    ? "border-transparent bg-primary text-white shadow-sm hover:bg-primary/90"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                }`}
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          <Carousel setApi={setApi} opts={{ align: "start", dragFree: true }} className="w-full touch-pan-x">
            <CarouselContent className="-ml-3 sm:-ml-4">
              {topCategories.map((cat) => {
                const slug = cat.slug || String(cat.name).toLocaleLowerCase("tr-TR");
                const emoji = getCategoryEmoji(cat.name, cat.slug);
                return (
                  <CarouselItem key={cat.id} className="pl-3 sm:pl-4 basis-[92px] sm:basis-[108px] md:basis-[116px]">
                    <Link
                      href={`/magaza/kategori/${encodeURIComponent(slug)}`}
                      className="group flex w-full flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-emerald-200"
                    >
                      <span
                        className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[26px] leading-none transition-colors group-hover:bg-emerald-100 sm:size-[52px] sm:text-[28px]"
                        aria-hidden
                      >
                        {emoji}
                      </span>
                      <span className="line-clamp-2 min-h-[2.5rem] w-full text-center text-[11px] font-semibold leading-tight text-light-primary-text group-hover:text-primary sm:text-xs">
                        {cat.name}
                      </span>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          <div className="mt-5 flex justify-center sm:justify-start">
            <Link
              href="/magaza/kategoriler"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-emerald-50"
            >
              Tüm kategoriler
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-white">
                <ArrowUpRight className="size-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Ported from Sellzy apps/web/src/components/common/products/ProductCard.tsx (default variant) */
export function SellzyProductCard({ product }: { product: SellzyProduct }) {
  const price = product.salePrice ?? product.price;
  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const discount = product.discountPercent ?? (hasDiscount ? Math.round((1 - price / product.price) * 100) : 0);
  const img = resolveClientMediaSrc(product.imageUrl);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-md transition-shadow h-full flex flex-col">
      <Link href={product.href} className="relative block aspect-square bg-[#F4F3F5] p-4">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Görsel yok</div>
        )}
        {discount > 0 ? (
          <span className="absolute top-3 left-3 bg-error text-white text-xs font-bold px-2 py-1 rounded-full">-{discount}%</span>
        ) : null}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        {product.categoryName ? (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{product.categoryName}</span>
        ) : null}
        <Link href={product.href} className="font-semibold text-foreground line-clamp-2 hover:text-primary">{product.name}</Link>
        <div className="mt-auto flex items-center gap-2">
          <span className="text-lg font-bold text-primary">{currency(price)}</span>
          {hasDiscount ? <span className="text-sm text-muted-foreground line-through">{currency(product.price)}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function SellzyProductGrid({
  title,
  subtitle,
  products,
  href,
  loading,
  bgColor,
}: {
  title: string;
  subtitle?: string;
  products: SellzyProduct[];
  href?: string;
  loading?: boolean;
  bgColor?: string;
}) {
  if (loading) {
    return (
      <section className="py-10 md:py-14 w-full" style={bgColor ? { backgroundColor: bgColor } : undefined}>
        <SellzyContainer>
          <div className="h-8 w-48 bg-white/50 animate-pulse rounded mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        </SellzyContainer>
      </section>
    );
  }
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full" style={bgColor ? { backgroundColor: bgColor } : undefined}>
      <SellzyContainer>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-light-primary-text text-[32px] leading-[48px]">{title}</h3>
            {subtitle ? <p className="text-light-secondary-text">{subtitle}</p> : null}
          </div>
          {href ? (
            <Link href={href} className="text-lg font-bold text-primary hover:underline flex items-center gap-1">
              Tümünü gör <ArrowUpRight className="size-4" />
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {products.slice(0, 10).map((p) => (
            <SellzyProductCard key={p.id} product={p} />
          ))}
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Ported from Sellzy HomePromoBanners.tsx */
export function SellzyPromoBanners({ banners }: { banners: SellzyPromoBanner[] }) {
  if (!banners.length) return null;
  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className={`grid grid-cols-1 gap-6 ${banners.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {banners.map((banner) => (
            <div
              key={banner.id}
              style={{ backgroundColor: banner.bgColor || "#f3f4f6" }}
              className="relative overflow-hidden rounded-[24px] p-8 min-h-[250px] flex flex-col justify-between group"
            >
              <div className="relative z-20 max-w-[60%]">
                {banner.name ? <p className="text-sm font-semibold text-gray-800 mb-2">{banner.name}</p> : null}
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{banner.title}</h3>
                {(banner.description || banner.subtitle) ? (
                  <p className="text-sm md:text-base text-gray-600 mb-6 leading-relaxed">{banner.description || banner.subtitle}</p>
                ) : null}
                <Link
                  href={banner.buttonHref || banner.href}
                  className="inline-flex w-fit items-center gap-2 bg-white hover:bg-gray-50 px-6 py-2.5 rounded-full text-sm font-semibold text-gray-900 shadow-sm"
                >
                  {banner.buttonTitle || "Keşfet"}
                  <MoveUpRight className="size-4" />
                </Link>
              </div>
              {banner.imageUrl ? (
                <div className="absolute bottom-4 right-4 w-[140px] md:w-[180px] z-10">
                  <img src={resolveClientMediaSrc(banner.imageUrl)} alt="" className="object-contain w-full" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Ported from Sellzy LatestBlogsClient.tsx */
export function SellzyLatestBlogs({ posts }: { posts: SellzyBlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[32px] font-bold text-light-primary-text leading-[48px]">Son blog yazıları</h2>
            <Link href="/magaza/blog" className="text-[24px] font-bold text-light-primary-text hover:text-primary">Tümü</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((blog) => (
              <div key={blog.id} className="bg-white border border-light-divider rounded-[16px] overflow-hidden flex flex-col group hover:shadow-xl transition-shadow">
                <Link href={blog.href} className="px-6 pt-6 block">
                  <div className="relative h-[250px] w-full rounded-[16px] overflow-hidden bg-gray-100">
                    {blog.imageUrl ? (
                      <img src={resolveClientMediaSrc(blog.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : null}
                  </div>
                </Link>
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <div className="bg-warning/16 px-2 py-px rounded-full w-max">
                    <span className="text-[12px] text-warning-dark">{blog.categoryName || "Pazaryeri"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-light-secondary-text">
                    <Calendar className="size-4 shrink-0" />
                    {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString("tr-TR") : "Yeni"}
                  </div>
                  <Link href={blog.href} className="font-bold text-lg text-light-primary-text line-clamp-2 hover:text-primary">{blog.title}</Link>
                  <p className="text-sm text-light-secondary-text line-clamp-2">{blog.excerpt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Ported from Sellzy beauty/ShopByBrands */
export function SellzyBrandStrip({ brands }: { brands: SellzyBrand[] }) {
  if (!brands.length) return null;
  return (
    <section className="py-10 md:py-14 w-full bg-white">
      <SellzyContainer>
        <h3 className="font-bold text-light-primary-text text-[32px] mb-8">Öne çıkan markalar</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={brand.href?.startsWith("/") ? brand.href : yekpareEcommerceStoreHref(brand.slug)}
              className="flex items-center justify-center rounded-2xl border border-light-divider bg-white p-6 hover:border-primary hover:shadow-md transition-all min-h-[100px]"
            >
              {brand.logoUrl ? (
                <img src={resolveClientMediaSrc(brand.logoUrl)} alt={brand.name} className="max-h-12 object-contain" />
              ) : (
                <span className="font-bold text-primary">{brand.name}</span>
              )}
            </Link>
          ))}
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Tabbed products — ported from Sellzy OurProductsClient pattern */
export function SellzyProductTabs({
  products,
  bestSelling,
  newest,
  deals,
  loading,
}: {
  products: SellzyProduct[];
  bestSelling: SellzyProduct[];
  newest: SellzyProduct[];
  deals: SellzyProduct[];
  loading?: boolean;
}) {
  const tabs = useMemo(
    () => [
      { key: "all", label: "Tümü", items: products },
      { key: "best", label: "Çok satanlar", items: bestSelling },
      { key: "new", label: "Yeni", items: newest },
      { key: "deals", label: "Fırsatlar", items: deals },
    ],
    [products, bestSelling, newest, deals],
  );
  const [active, setActive] = useState("all");
  const current = tabs.find((t) => t.key === active)?.items ?? products;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full bg-white">
      <SellzyContainer>
        <h3 className="font-bold text-light-primary-text text-[32px] mb-6">Ürünlerimiz</h3>
        <div className="flex flex-wrap gap-2 mb-8 border-b border-light-divider pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                active === tab.key ? "bg-primary text-white" : "bg-muted text-foreground hover:bg-primary/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />)
            : current.slice(0, 10).map((p) => <SellzyProductCard key={`${active}-${p.id}`} product={p} />)}
        </div>
      </SellzyContainer>
    </section>
  );
}

export type { SellzyBanner };
