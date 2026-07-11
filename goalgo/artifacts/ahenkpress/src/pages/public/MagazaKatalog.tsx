import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Grid3X3, Headphones, PackageSearch, Search, ShieldCheck, ShoppingBag, Star, Store, Truck } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { resolveMarketplaceStoreCardHref } from "@/lib/marketplaceStoreHref";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";
import { useSellzyLayout } from "@/themes/sellzy/SellzyMarketplaceLayout";
import { MAGAZA_TOP_CATEGORIES } from "@/themes/sellzy/magazaRoutes";
import { SADE_PUBLIC_POST_HERO_MAIN_CLASS } from "@/lib/yekpareSadeTheme";

const API = "/api";

type Mode = "products" | "categories" | "vendors";

type MarketplaceVendor = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  city?: string | null;
  district?: string | null;
  storefrontHref?: string;
  yekpareStoreHref?: string;
};

type MarketplaceProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  vendorName: string;
  vendorSlug: string;
  vendorImageUrl?: string | null;
  vendorRating?: number | null;
  href: string;
  storefrontHref: string;
  yekpareStoreHref?: string;
};

type CategoryNode = {
  id: number;
  name: string;
  slug?: string | null;
  children?: CategoryNode[];
};

type MarketplacePayload = {
  vendors: MarketplaceVendor[];
  categories: CategoryNode[];
  products: MarketplaceProduct[];
  pagination?: { limit: number; offset: number; total: number; hasMore: boolean };
  stats: { vendorCount: number; productCount: number; categoryCount: number };
};

const emptyPayload: MarketplacePayload = {
  vendors: [],
  categories: [],
  products: [],
  pagination: { limit: 0, offset: 0, total: 0, hasMore: false },
  stats: { vendorCount: 0, productCount: 0, categoryCount: 0 },
};

const PRODUCT_PAGE_SIZE = 120;

function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 })
    : "₺0";
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
}

function fallbackCategoryNodes(): CategoryNode[] {
  return MAGAZA_TOP_CATEGORIES.map((cat, index) => ({
    id: -(index + 1),
    name: cat.label,
    slug: cat.slug,
    children: [],
  }));
}

function parseMarketplacePayload(raw: unknown): MarketplacePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { success?: boolean; data?: MarketplacePayload };
  if (d.success === false || !d.data) return null;
  return d.data;
}

async function fetchMarketplacePayload(search: URLSearchParams): Promise<MarketplacePayload | null> {
  const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: MarketplacePayload }>(
    `${API}/delivery/marketplace?${search.toString()}`,
  );
  if (!ok) return null;
  return parseMarketplacePayload(data);
}

function hasMarketplaceContent(payload: MarketplacePayload): boolean {
  return (
    payload.categories.length > 0
    || payload.products.length > 0
    || payload.vendors.length > 0
    || Number(payload.stats?.productCount ?? 0) > 0
    || Number(payload.stats?.vendorCount ?? 0) > 0
    || Number(payload.stats?.categoryCount ?? 0) > 0
  );
}

function categoryKey(cat: CategoryNode): string {
  return cat.slug || String(cat.name).toLocaleLowerCase("tr-TR");
}

const pageCopy = {
  products: {
    kicker: "Pazaryeri ürünleri",
    title: "Tüm ürünleri keşfet",
    text: "Yekpare alışveriş mağazalarındaki ürünleri kategoriye, mağazaya ve arama niyetine göre tek katalogda incele.",
    icon: PackageSearch,
  },
  categories: {
    kicker: "Kategori vitrini",
    title: "Kategoriye göre alışveriş",
    text: "Kategori odaklı alışveriş akışıyla ürün gruplarını hızlıca aç, ilgili ürünlere ve mağazalara ulaş.",
    icon: Grid3X3,
  },
  vendors: {
    kicker: "Satıcı ağı",
    title: "Pazaryerindeki mağazalar",
    text: "Yekpare sağlayıcı panelinden yönetilen alışveriş mağazalarını ve vitrinlerini keşfet.",
    icon: Store,
  },
} satisfies Record<Mode, { kicker: string; title: string; text: string; icon: typeof Store }>;

export default function MagazaKatalog({
  mode,
  hideCatalogHeroSearch = true,
}: {
  mode: Mode;
  /** Yekpare Sade chrome arama varken katalog hero aramasını gizle */
  hideCatalogHeroSearch?: boolean;
}) {
  const shell = useSellzyLayout();
  const [location, navigate] = useLocation();
  const initialCategory = useMemo(() => new URLSearchParams(location.split("?")[1] ?? "").get("kategori") ?? "", [location]);
  const [payload, setPayload] = useState<MarketplacePayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const copy = pageCopy[mode];
  const Icon = copy.icon;

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setPageOffset(0);
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      lang: "tr",
      limit: String(PRODUCT_PAGE_SIZE),
      offset: String(pageOffset),
    });
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    if (pageOffset === 0) setLoading(true);
    else setLoadingMore(true);

    void (async () => {
      try {
        let next = await fetchMarketplacePayload(params);
        if (
          !cancelled
          && selectedCategory
          && next
          && !(next.products?.length)
          && Number(next.stats?.productCount ?? 0) === 0
        ) {
          const fallbackParams = new URLSearchParams(params);
          fallbackParams.delete("category");
          next = await fetchMarketplacePayload(fallbackParams);
        }
        if (cancelled) return;
        const resolved = next ?? emptyPayload;
        setPayload((prev) =>
          pageOffset > 0
            ? { ...resolved, products: [...prev.products, ...(resolved.products ?? [])] }
            : resolved,
        );
      } catch {
        if (!cancelled) setPayload(emptyPayload);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, selectedCategory, pageOffset]);

  const resolvedCategories = useMemo(() => {
    if (payload.categories.length > 0) return payload.categories;
    if (pageOffset === 0 && !query.trim() && !selectedCategory && shell.payload.categories.length > 0) {
      return shell.payload.categories as unknown as CategoryNode[];
    }
    return [];
  }, [payload.categories, shell.payload.categories, pageOffset, query, selectedCategory]);

  const topCategories = useMemo(() => {
    if (resolvedCategories.length) return resolvedCategories;
    return fallbackCategoryNodes();
  }, [resolvedCategories]);

  const searchCategories = useMemo(
    () => flattenCategories(resolvedCategories.length ? resolvedCategories : topCategories),
    [resolvedCategories, topCategories],
  );

  const stats = useMemo(() => {
    if (hasMarketplaceContent(payload)) return payload.stats;
    if (pageOffset === 0 && !query.trim() && !selectedCategory) {
      const shellStats = shell.payload.stats;
      if (shellStats.productCount || shellStats.vendorCount || shellStats.categoryCount) {
        return shellStats;
      }
    }
    return payload.stats;
  }, [payload, shell.payload.stats, pageOffset, query, selectedCategory]);

  const resolvedVendors = useMemo(() => {
    if (payload.vendors.length > 0) return payload.vendors;
    if (pageOffset === 0 && !query.trim() && !selectedCategory && shell.payload.vendors.length > 0) {
      return shell.payload.vendors as unknown as MarketplaceVendor[];
    }
    return payload.vendors;
  }, [payload.vendors, shell.payload.vendors, pageOffset, query, selectedCategory]);

  const showStats =
    loading
    || Number(stats.productCount ?? 0) > 0
    || Number(stats.vendorCount ?? 0) > 0
    || Number(stats.categoryCount ?? 0) > 0;

  return (
    <div className="w-full">
      <section className="border-b border-border bg-white">
        <SellzyContainer className="py-8">

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f766e]">
                <Icon className="h-4 w-4" />
                {copy.kicker}
              </div>
            <h1 className="max-w-3xl break-words text-3xl font-black leading-tight tracking-tight md:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">{copy.text}</p>
              {showStats ? (
                <div className="mt-5 grid max-w-xl grid-cols-3 gap-3">
                  {loading ? (
                    <>
                      <MiniMetricSkeleton />
                      <MiniMetricSkeleton />
                      <MiniMetricSkeleton />
                    </>
                  ) : (
                    <>
                      <MiniMetric value={stats.productCount} label="ürün" />
                      <MiniMetric value={stats.vendorCount} label="mağaza" />
                      <MiniMetric value={stats.categoryCount || topCategories.length} label="kategori" />
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {!hideCatalogHeroSearch ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPageOffset(0);
                setQuery((q) => q.trim());
              }}
              className="grid gap-2 rounded-[1.75rem] border-2 border-[#0f766e] bg-white p-2 shadow-sm md:grid-cols-[190px_1fr_auto]"
            >
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setPageOffset(0);
                  setSelectedCategory(e.target.value);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none"
              >
                <option value="">Tüm kategoriler</option>
                {searchCategories.map((cat) => (
                  <option key={cat.id} value={categoryKey(cat)}>{cat.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setPageOffset(0);
                    setQuery(e.target.value);
                  }}
                  className="min-h-12 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Ürün, mağaza veya kategori ara"
                />
              </label>
              <button className="rounded-2xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white hover:bg-[#0b5f59]" style={{ color: "#fff" }}>Ara</button>
            </form>
            ) : null}
          </div>
        </SellzyContainer>
      </section>

      <section className="border-b border-border bg-white">
        <SellzyContainer className="grid gap-3 py-4 sm:grid-cols-3">
          {[
            { icon: Truck, title: "Hızlı teslimat", text: "Mağaza bazlı kargo bilgisi" },
            { icon: ShieldCheck, title: "Güvenli satıcı", text: "Yekpare sağlayıcı altyapısı" },
            { icon: Headphones, title: "Canlı destek", text: "Panel ve mağaza desteği" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <item.icon className="h-6 w-6 text-[#0f766e]" />
              <span><span className="block text-sm font-black">{item.title}</span><span className="block text-xs font-semibold text-slate-400">{item.text}</span></span>
            </div>
          ))}
        </SellzyContainer>
      </section>

      <main className={`w-full pb-10 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        <SellzyContainer>
        {mode === "categories" ? (
          loading && !resolvedCategories.length ? (
            <CategorySkeletonGrid />
          ) : topCategories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(categoryKey(cat));
                  navigate(`/magaza/urunler?kategori=${encodeURIComponent(categoryKey(cat))}`);
                }}
                className="group min-w-0 rounded-[1.75rem] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-[#0f766e]">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h2 className="line-clamp-2 text-base font-black leading-snug group-hover:text-emerald-700">{cat.name}</h2>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {(cat.children ?? []).length} alt kategori
                </p>
                {(cat.children ?? []).length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(cat.children ?? []).slice(0, 4).map((child) => (
                      <span key={child.id} className="max-w-full rounded-full bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                        <span className="block max-w-[9rem] truncate">{child.name}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                  Ürünlere git <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
          ) : (
            <CatalogEmptyState mode={mode} />
          )
        ) : mode === "vendors" ? (
          loading && !resolvedVendors.length ? (
            <VendorSkeletonGrid />
          ) : resolvedVendors.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resolvedVendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
          ) : (
            <CatalogEmptyState mode={mode} />
          )
        ) : loading ? (
          <SkeletonGrid />
        ) : payload.products.length ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {payload.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {mode === "products" ? (
              <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-600">
                  {payload.products.length.toLocaleString("tr-TR")} / {(payload.pagination?.total ?? payload.stats.productCount).toLocaleString("tr-TR")} ürün gösteriliyor
                </p>
                {payload.pagination?.hasMore ? (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => setPageOffset((payload.pagination?.offset ?? 0) + (payload.pagination?.limit ?? PRODUCT_PAGE_SIZE))}
                    className="rounded-full bg-[#0f766e] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: "#fff" }}
                  >
                    {loadingMore ? "Yükleniyor..." : "Daha fazla ürün yükle"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <CatalogEmptyState mode={mode} />
        )}
        </SellzyContainer>
      </main>
    </div>
  );
}

function MiniMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xl font-black text-slate-950">{value.toLocaleString("tr-TR")}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function MiniMetricSkeleton() {
  return <div className="h-[4.5rem] animate-pulse rounded-2xl bg-slate-100" />;
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const img = resolveClientMediaSrc(product.imageUrl);
  const vendorImg = resolveClientMediaSrc(product.vendorImageUrl);
  const hasSale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={product.href || product.storefrontHref} className="relative block aspect-square bg-slate-50">
        {img ? <img src={img} alt={product.name} className="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-12 w-12 text-slate-200" /></div>}
        {hasSale ? <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">İndirim</span> : null}
      </Link>
      <div className="p-4">
        <Link href={resolveMarketplaceStoreCardHref({ slug: product.vendorSlug, storefrontHref: product.storefrontHref, yekpareStoreHref: product.yekpareStoreHref })} className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-2 hover:border-emerald-200">
          <div className="h-7 w-7 overflow-hidden rounded-full bg-slate-100">
            {vendorImg ? <img src={vendorImg} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">{product.vendorName}</span>
          {product.vendorRating ? <span className="inline-flex items-center gap-1 text-xs font-black text-amber-500"><Star className="h-3 w-3 fill-amber-400" />{Number(product.vendorRating).toFixed(1)}</span> : null}
        </Link>
        <Link href={product.href || product.storefrontHref} className="line-clamp-2 min-h-[2.5rem] break-words text-sm font-black leading-snug text-slate-950 group-hover:text-emerald-700">{product.name}</Link>
        {product.categoryName ? <p className="mt-1 text-xs font-semibold text-slate-400 line-clamp-1">{product.categoryName}</p> : null}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {hasSale ? <p className="text-xs font-bold text-slate-400 line-through">{currency(product.price)}</p> : null}
            <p className="break-words text-lg font-black leading-tight text-emerald-700">{currency(hasSale ? product.salePrice : product.price)}</p>
          </div>
          <Link href={product.href || product.storefrontHref} className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black leading-tight text-white hover:bg-emerald-600" style={{ color: "#fff" }}>İncele</Link>
        </div>
      </div>
    </article>
  );
}

function VendorCard({ vendor }: { vendor: MarketplaceVendor }) {
  const logo = resolveClientMediaSrc(vendor.imageUrl);
  const cover = resolveClientMediaSrc(vendor.coverUrl);
  const href = resolveMarketplaceStoreCardHref(vendor);
  return (
    <Link href={href} className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
      <div className="relative h-28 bg-slate-100">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
        <div className="absolute -bottom-6 left-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100">
          {logo ? <img src={logo} alt={vendor.name} className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-slate-400" />}
        </div>
      </div>
      <div className="p-4 pt-9">
        <h2 className="line-clamp-1 text-base font-black group-hover:text-emerald-700">{vendor.name}</h2>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-500">{vendor.description || [vendor.city, vendor.district].filter(Boolean).join(" / ") || "Yekpare mağazası"}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-emerald-700">
          Mağazaya git <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-96 animate-pulse rounded-[1.75rem] bg-white" />
      ))}
    </div>
  );
}

function CategorySkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-52 animate-pulse rounded-[1.75rem] bg-white" />
      ))}
    </div>
  );
}

function VendorSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-64 animate-pulse rounded-[1.75rem] bg-white" />
      ))}
    </div>
  );
}

function CatalogEmptyState({ mode }: { mode: Mode }) {
  const copy =
    mode === "categories"
      ? {
          title: "Henüz kategori vitrini oluşturulmadı",
          body: "Pazaryeri kategorileri yakında burada listelenecek. İlk mağazanızı açarak kataloğa ürün ekleyebilirsiniz.",
        }
      : mode === "vendors"
        ? {
            title: "Henüz listelenecek mağaza bulunamadı",
            body: "Yekpare pazaryerine katılarak ürünlerinizi binlerce kullanıcıya ulaştırın.",
          }
        : {
            title: "Henüz listelenecek ürün bulunamadı",
            body: "Aradığınız kriterlere uygun ürün yok. Filtreleri temizleyin veya satıcı olarak katılın.",
          };

  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
      <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="font-bold text-slate-800">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium">{copy.body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/magaza/satici-ol"
          className="inline-flex rounded-full bg-[#0f766e] px-5 py-2.5 text-sm font-black text-white hover:bg-[#0b5f59]"
          style={{ color: "#fff" }}
        >
          Satıcı olarak katıl
        </Link>
        <Link href="/magaza" className="inline-flex rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-200 hover:text-[#0f766e]">
          Mağaza anasayfası
        </Link>
      </div>
    </div>
  );
}
