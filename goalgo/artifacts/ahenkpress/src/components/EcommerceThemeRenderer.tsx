import { useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  BadgePercent,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";
import type { StoreCategoryNode } from "@/components/StoreCategoryAccordion";
import { VendorBlogStorefrontSection, type VendorBlogPostRow } from "@/components/VendorBlogPreviewSection";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { resolveVendorThemeConfig } from "@/lib/vendorThemes";

export const ECOMMERCE_RENDERER_THEME_KEYS = [
  "foodmart",
  "sellzy-store",
  "nest-market",
  "pixio-shop",
  "kartify-shop",
  "listinghub-shop",
  "kartify-gadget",
  "kartify-mega-mart",
  "kartify-organic-store",
  "kartify-style-tech",
  "kartify-electro",
  "kartify-baby-shop",
] as const;

export type EcommerceRendererThemeKey = (typeof ECOMMERCE_RENDERER_THEME_KEYS)[number];

export function isEcommerceRendererTheme(key: string | null | undefined): key is EcommerceRendererThemeKey {
  return ECOMMERCE_RENDERER_THEME_KEYS.includes(String(key ?? "").trim().toLowerCase() as EcommerceRendererThemeKey);
}

type VendorLike = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  shippingFee?: string | null;
  freeShippingAbove?: string | null;
  shippingTime?: number | null;
  minOrderAmount?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isOpen: boolean;
};

export type EcommerceRendererProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  salePrice: string | null;
  imageUrl?: string | null;
  menuCategoryId: number;
  ecommerceCategoryId: number | null;
  isPopular: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
};

type CartItem = {
  product: EcommerceRendererProduct;
  qty: number;
};

type Props = {
  themeKey: EcommerceRendererThemeKey;
  themeConfig?: Record<string, string> | null;
  vendor: VendorLike;
  aboutText: string;
  products: EcommerceRendererProduct[];
  filteredProducts: EcommerceRendererProduct[];
  sidebarTree: StoreCategoryNode[];
  activeEcomCategory: number | null;
  activeTopCategoryId: number | null;
  mobileSubcategories: StoreCategoryNode[];
  expandedCategories: Set<number>;
  search: string;
  contentTab: "products" | "overview";
  cart: CartItem[];
  totalItems: number;
  total: number;
  waAvailable: boolean;
  discoverHref?: string | null;
  onSearchChange: (value: string) => void;
  onContentTabChange: (tab: "products" | "overview") => void;
  onSelectCategory: (id: number | null) => void;
  onToggleCategoryExpand: (id: number) => void;
  onAddToCart: (product: EcommerceRendererProduct) => void;
  onRemoveFromCart: (id: number) => void;
  onOpenCart: () => void;
  onOpenWhatsApp: () => void;
  onToggleLike: () => void;
  liked: boolean;
  blogBasePath?: string;
  blogEnabled?: boolean;
  blogPreviewPosts?: VendorBlogPostRow[];
  blogPreviewLoading?: boolean;
};

type ThemeProfile = {
  eyebrow: string;
  headline: string;
  subtitle: string;
  accent: string;
  surface: string;
  heroClass: string;
  cardMode: "marketplace" | "grocery" | "editorial" | "compact" | "tech" | "organic" | "baby" | "listing";
};

const THEME_PROFILES: Record<EcommerceRendererThemeKey, ThemeProfile> = {
  foodmart: {
    eyebrow: "Market vitrini",
    headline: "Taze ürünler ve hızlı alışveriş",
    subtitle: "Geniş arama, kategori rafları, fırsat kartları ve güvenli sepet akışıyla gerçek e-ticaret mağazası.",
    accent: "#3BB77E",
    surface: "bg-[#f7fff9]",
    heroClass: "from-[#ecf7e8] via-white to-[#fff4cf] text-slate-950",
    cardMode: "grocery",
  },
  "sellzy-store": {
    eyebrow: "Mağaza vitrini",
    headline: "Ürünleri net ve güven veren bir alışveriş sitesinde sergileyin",
    subtitle: "Kategori menüsü, ürün rafları ve kampanya alanlarıyla profesyonel mağaza deneyimi.",
    accent: "#10b981",
    surface: "bg-slate-50",
    heroClass: "from-emerald-950 via-slate-900 to-emerald-700 text-white",
    cardMode: "marketplace",
  },
  "nest-market": {
    eyebrow: "Taze market",
    headline: "Günlük ihtiyaçlar için ferah kategori akışı",
    subtitle: "Geniş arama, departman kartları ve okunaklı market rafı düzeni.",
    accent: "#3bb77e",
    surface: "bg-[#f6fbf4]",
    heroClass: "from-[#ecf7e8] via-white to-[#fff7d7] text-slate-950",
    cardMode: "grocery",
  },
  "pixio-shop": {
    eyebrow: "Butik vitrin",
    headline: "Moda ve lifestyle için görsel vitrin",
    subtitle: "Büyük görseller, koleksiyon şeritleri ve butik ürün kartları.",
    accent: "#ea580c",
    surface: "bg-orange-50",
    heroClass: "from-zinc-950 via-stone-900 to-orange-800 text-white",
    cardMode: "editorial",
  },
  "kartify-shop": {
    eyebrow: "Kartlı hızlı satış",
    headline: "Kart odaklı kampanya mağazası",
    subtitle: "Hızlı keşif, kompakt kampanya alanları ve modern ürün kartları.",
    accent: "#4f46e5",
    surface: "bg-indigo-50",
    heroClass: "from-indigo-950 via-slate-900 to-violet-700 text-white",
    cardMode: "compact",
  },
  "listinghub-shop": {
    eyebrow: "Rehber + mağaza",
    headline: "İşletme bilgisiyle güçlenen ürün listesi",
    subtitle: "İşletme profili, iletişim kartları ve temiz liste görünümü.",
    accent: "#0ea5e9",
    surface: "bg-sky-50",
    heroClass: "from-slate-950 via-sky-950 to-sky-700 text-white",
    cardMode: "listing",
  },
  "kartify-gadget": {
    eyebrow: "Teknoloji vitrini",
    headline: "Yeni nesil teknoloji rafları",
    subtitle: "Aksesuar ve cihaz ürünleri için net, mavi tonlu alışveriş vitrini.",
    accent: "#2563eb",
    surface: "bg-blue-50",
    heroClass: "from-blue-950 via-slate-950 to-cyan-800 text-white",
    cardMode: "tech",
  },
  "kartify-mega-mart": {
    eyebrow: "Büyük mağaza",
    headline: "Çok kategorili fırsat pazarı",
    subtitle: "Yoğun kampanya bantları, departman kutuları ve hızlı alışveriş ızgarası.",
    accent: "#f97316",
    surface: "bg-orange-50",
    heroClass: "from-slate-950 via-orange-950 to-orange-600 text-white",
    cardMode: "marketplace",
  },
  "kartify-organic-store": {
    eyebrow: "Organik mağaza",
    headline: "Doğal ürünler için yumuşak vitrin",
    subtitle: "Organik market hissi veren pastel kategori adaları ve güven mesajları.",
    accent: "#65a30d",
    surface: "bg-lime-50",
    heroClass: "from-lime-100 via-white to-emerald-100 text-lime-950",
    cardMode: "organic",
  },
  "kartify-style-tech": {
    eyebrow: "Stil ve teknoloji",
    headline: "Stil ve teknolojiyi birlikte sergile",
    subtitle: "Kontrastlı editorial bloklar, modern koleksiyon kartları ve enerjik ürün akışı.",
    accent: "#7c3aed",
    surface: "bg-violet-50",
    heroClass: "from-zinc-950 via-violet-950 to-fuchsia-800 text-white",
    cardMode: "editorial",
  },
  "kartify-electro": {
    eyebrow: "Elektronik fırsatlar",
    headline: "Elektronik fırsatları için teknik vitrin",
    subtitle: "Koyu kahraman alanı, teknik özellik hissi ve yatay cihaz listeleri.",
    accent: "#0ea5e9",
    surface: "bg-slate-100",
    heroClass: "from-slate-950 via-blue-950 to-cyan-800 text-white",
    cardMode: "tech",
  },
  "kartify-baby-shop": {
    eyebrow: "Bebek mağazası",
    headline: "Minikler için sıcak ve renkli mağaza",
    subtitle: "Pastel baloncuklar, yumuşak kartlar ve aile dostu alışveriş akışı.",
    accent: "#f472b6",
    surface: "bg-pink-50",
    heroClass: "from-pink-100 via-white to-sky-100 text-pink-950",
    cardMode: "baby",
  },
};

function money(value: string | null | undefined): number {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function productImage(product: EcommerceRendererProduct): string {
  return resolveClientMediaSrc(product.imageUrl) || "";
}

function categoryPreview(tree: StoreCategoryNode[]): StoreCategoryNode[] {
  return tree.slice(0, 8);
}

function StoreTabs({
  contentTab,
  onContentTabChange,
  waAvailable,
  onOpenWhatsApp,
  blogEnabled,
  blogBasePath,
}: Pick<Props, "contentTab" | "onContentTabChange" | "waAvailable" | "onOpenWhatsApp" | "blogEnabled" | "blogBasePath">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onContentTabChange("products")}
        className={`rounded-full px-4 py-2 text-xs font-black transition ${contentTab === "products" ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
      >
        Ürünler
      </button>
      <button
        type="button"
        onClick={() => onContentTabChange("overview")}
        className={`rounded-full px-4 py-2 text-xs font-black transition ${contentTab === "overview" ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
      >
        Mağaza Bilgisi
      </button>
      {blogEnabled && blogBasePath ? (
        <Link
          href={`${blogBasePath}/blog`}
          className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
        >
          📝 Blog
        </Link>
      ) : null}
      {waAvailable ? (
        <button
          type="button"
          onClick={onOpenWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#20bd5a]"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </button>
      ) : null}
    </div>
  );
}

function SearchBox({ search, onSearchChange }: Pick<Props, "search" | "onSearchChange">) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold outline-none transition focus:border-[var(--vendor-accent)] focus:ring-4 focus:ring-slate-200/70"
        placeholder="Bu mağazada ürün ara..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      {search ? (
        <button type="button" onClick={() => onSearchChange("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  vendorOpen,
  cart,
  onAddToCart,
  onRemoveFromCart,
  mode,
}: {
  product: EcommerceRendererProduct;
  vendorOpen: boolean;
  cart: CartItem[];
  onAddToCart: Props["onAddToCart"];
  onRemoveFromCart: Props["onRemoveFromCart"];
  mode: ThemeProfile["cardMode"];
}) {
  const inCart = cart.find((item) => item.product.id === product.id);
  const price = money(product.price);
  const salePrice = product.salePrice ? money(product.salePrice) : null;
  const discountPct = salePrice && price > 0 ? Math.round((1 - salePrice / price) * 100) : null;
  const image = productImage(product);
  const listMode = mode === "listing" || mode === "tech";
  const editorial = mode === "editorial";

  return (
    <article
      className={[
        "ecom-theme-card group overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
        listMode ? "grid grid-cols-[112px_minmax(0,1fr)] rounded-2xl sm:grid-cols-[150px_minmax(0,1fr)]" : "rounded-3xl",
        mode === "baby" ? "border-pink-100" : "",
        mode === "organic" ? "border-lime-100" : "",
        editorial ? "rounded-none" : "",
      ].join(" ")}
    >
      <div className={`${listMode ? "aspect-square h-full" : editorial ? "aspect-[4/5]" : "aspect-square"} relative bg-slate-100`}>
        {image ? (
          <img
            src={image}
            alt={product.name}
            className={`h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 ${editorial ? "object-cover p-0" : ""}`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            <Package className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {discountPct ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white">-{discountPct}%</span>
        ) : product.isPopular ? (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2 py-1 text-[11px] font-black text-white">Popüler</span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          <Sparkles className="h-3 w-3" /> Seçili ürün
        </div>
        <h3 className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-950 sm:text-base">{product.name}</h3>
        {product.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{product.description}</p> : null}
        <div className="mt-auto pt-3">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            {salePrice ? (
              <>
                <span className="break-words text-xl font-black leading-tight text-[var(--vendor-accent)]">{salePrice.toFixed(0)}₺</span>
                <span className="pb-0.5 text-xs font-bold text-slate-400 line-through">{price.toFixed(0)}₺</span>
              </>
            ) : (
              <span className="break-words text-xl font-black leading-tight text-slate-950">{price.toFixed(0)}₺</span>
            )}
          </div>
          {!vendorOpen ? (
            <div className="flex items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-black text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> Açılış aşamasında
            </div>
          ) : inCart ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => onRemoveFromCart(product.id)} className="h-8 w-8 rounded-lg bg-white font-black text-slate-700 shadow-sm">−</button>
              <span className="text-sm font-black text-slate-950">{inCart.qty}</span>
              <button type="button" onClick={() => onAddToCart(product)} className="h-8 w-8 rounded-lg bg-[var(--vendor-accent)] font-black text-white" style={{ color: "#fff" }}>+</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--vendor-accent)] px-2 py-2.5 text-center text-xs font-black leading-tight text-white transition hover:opacity-90"
              style={{ color: "#fff" }}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Sepete Ekle
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductGrid(props: Pick<Props, "filteredProducts" | "cart" | "vendor" | "onAddToCart" | "onRemoveFromCart" | "search" | "products" | "onSearchChange"> & { mode: ThemeProfile["cardMode"] }) {
  const { filteredProducts, cart, vendor, onAddToCart, onRemoveFromCart, search, products, onSearchChange, mode } = props;
  if (filteredProducts.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-lg font-black text-slate-950">{search.trim() && products.length > 0 ? "Aramana uygun ürün bulunamadı" : "Bu mağazada ürünler yakında yayında"}</h3>
        <p className="mt-2 text-sm text-slate-500">
          {search.trim() && products.length > 0 ? "Farklı bir kelime deneyebilir veya tüm ürünleri görüntüleyebilirsin." : "Mağaza katalog hazırlığını tamamladığında ürünler burada görünecek."}
        </p>
        {search.trim() && products.length > 0 ? (
          <button type="button" onClick={() => onSearchChange("")} className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white">
            Aramayı temizle
          </button>
        ) : null}
      </div>
    );
  }

  const gridClass =
    mode === "listing" || mode === "tech"
      ? mode === "tech"
        ? "grid grid-cols-1 gap-5 xl:grid-cols-2"
        : "grid grid-cols-1 gap-5"
      : mode === "editorial"
        ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={gridClass}>
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          vendorOpen={vendor.isOpen}
          cart={cart}
          onAddToCart={onAddToCart}
          onRemoveFromCart={onRemoveFromCart}
          mode={mode}
        />
      ))}
    </div>
  );
}

function CategoryChips({ sidebarTree, activeTopCategoryId, activeEcomCategory, mobileSubcategories, onSelectCategory }: Pick<Props, "sidebarTree" | "activeTopCategoryId" | "activeEcomCategory" | "mobileSubcategories" | "onSelectCategory">) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeEcomCategory === null ? "bg-[var(--vendor-accent)] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Tümü
        </button>
        {sidebarTree.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeTopCategoryId === cat.id ? "bg-[var(--vendor-accent)] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {mobileSubcategories.length > 0 && activeTopCategoryId != null ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelectCategory(activeTopCategoryId)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${activeEcomCategory === activeTopCategoryId ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
          >
            Tümü
          </button>
          {mobileSubcategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${activeEcomCategory === cat.id ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StorefrontHeader({
  props,
  profile,
}: {
  props: Props;
  profile: ThemeProfile;
}) {
  const logo = resolveClientMediaSrc(props.vendor.imageUrl);
  const cartLabel = props.totalItems > 0 ? `${props.totalItems} ürün · ${props.total.toFixed(0)}₺` : "Sepetim";
  const [activeId, setActiveId] = useState<number | null>(props.sidebarTree[0]?.id ?? null);
  const active = props.sidebarTree.find((cat) => cat.id === activeId) ?? props.sidebarTree[0] ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-bold">
          <span className="inline-flex items-center gap-2 text-white/85"><Truck className="h-3.5 w-3.5 text-amber-300" /> Kargo, sipariş takibi ve mağaza desteği</span>
          <span className="text-white/65">Tam kapsamlı e-ticaret vitrini</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-[280px]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {logo ? <img src={logo} alt={props.vendor.name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--vendor-accent)]">Online mağaza</p>
            <h1 className="truncate text-lg font-black text-slate-950">{props.vendor.name}</h1>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <SearchBox search={props.search} onSearchChange={props.onSearchChange} />
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto lg:justify-end">
          <button type="button" onClick={() => props.onSelectCategory(null)} className="shrink-0 rounded-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
            Kategoriler
          </button>
          <button type="button" onClick={() => props.onContentTabChange("products")} className="shrink-0 rounded-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
            Ürünler
          </button>
          <button type="button" onClick={() => props.onContentTabChange("overview")} className="shrink-0 rounded-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
            Mağaza
          </button>
          {props.blogEnabled && props.blogBasePath ? (
            <Link
              href={`${props.blogBasePath}/blog`}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-50"
            >
              📝 Blog
            </Link>
          ) : null}
          <button type="button" className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
            <UserRound className="mr-1 inline h-4 w-4" /> Hesabım
          </button>
          <button type="button" onClick={props.onToggleLike} className="shrink-0 rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 hover:border-rose-200 hover:text-rose-500" aria-label="Beğen">
            <Heart className={`h-4 w-4 ${props.liked ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
          <button type="button" onClick={props.onOpenCart} className="shrink-0 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm" style={{ color: "#fff" }}>
            <ShoppingCart className="mr-1.5 inline h-4 w-4" /> {cartLabel}
          </button>
        </nav>
      </div>

      <div className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 overflow-visible px-4 py-2 text-sm font-black">
          {props.sidebarTree.length > 0 ? (
            <div className="group relative shrink-0">
              <button type="button" className="inline-flex items-center gap-2 rounded-none bg-[var(--vendor-accent)] px-4 py-2.5 text-sm font-black text-white shadow-sm" style={{ color: "#fff" }}>
                <Menu className="h-4 w-4" /> Kategorilere göre alışveriş
              </button>
              <div className="invisible absolute left-0 top-full z-50 mt-2 w-[min(880px,calc(100vw-2rem))] rounded-3xl border border-slate-200 bg-white p-3 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
                <div className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
                  <div className="max-h-[420px] overflow-auto rounded-2xl bg-slate-50 p-2">
                    {props.sidebarTree.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseEnter={() => setActiveId(cat.id)}
                        onFocus={() => setActiveId(cat.id)}
                        onClick={() => props.onSelectCategory(cat.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black leading-snug ${
                          active?.id === cat.id ? "bg-white text-[var(--vendor-accent)] shadow-sm" : "text-slate-700 hover:bg-white hover:text-[var(--vendor-accent)]"
                        }`}
                      >
                        <span className="min-w-0 whitespace-normal break-words">
                          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-[var(--vendor-accent)]"><Package className="h-4 w-4" /></span>
                          {cat.name}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    ))}
                  </div>
                  <StorefrontCategoryPanel category={active} onSelectCategory={props.onSelectCategory} />
                </div>
              </div>
            </div>
          ) : null}
          <button type="button" onClick={() => props.onContentTabChange("products")} className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-100">Tüm ürünler</button>
          <button type="button" onClick={() => props.onContentTabChange("overview")} className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-100">Mağaza bilgisi</button>
          {props.waAvailable ? <button type="button" onClick={props.onOpenWhatsApp} className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-100">WhatsApp</button> : null}
        </div>
      </div>
    </header>
  );
}

function MegaCategoryBar({
  props,
  compact = false,
}: {
  props: Props;
  compact?: boolean;
}) {
  const cats = categoryPreview(props.sidebarTree);
  if (cats.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--vendor-accent)] text-white">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-950">Alışveriş Kategorileri</h2>
          <p className="text-xs font-semibold text-slate-500">Departmanlardan hızlıca ürünlere geç</p>
        </div>
      </div>
      <div className={`grid gap-0 ${compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"}`}>
        {cats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => props.onSelectCategory(cat.id)}
            className={`group min-w-0 border-b border-r border-slate-100 p-4 text-left transition hover:bg-slate-50 ${props.activeTopCategoryId === cat.id ? "bg-[var(--vendor-accent)]/10" : ""}`}
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-500 group-hover:bg-[var(--vendor-accent)] group-hover:text-white">
              <Package className="h-4 w-4" />
            </span>
            <span className="block truncate text-sm font-black text-slate-950">{cat.name}</span>
            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{cat.children.length ? `${cat.children.length} alt kategori` : "Tüm ürünler"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StorefrontMegaCategoryMenu({ props }: { props: Props }) {
  const [activeId, setActiveId] = useState<number | null>(props.sidebarTree[0]?.id ?? null);
  const active = props.sidebarTree.find((cat) => cat.id === activeId) ?? props.sidebarTree[0] ?? null;

  if (props.sidebarTree.length === 0) return null;

  return (
    <aside className="group relative z-20 hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
      <div className="rounded-t-3xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Kategoriler</div>
      <div className="max-h-[520px] overflow-auto p-2">
        <button
          type="button"
          onClick={() => props.onSelectCategory(null)}
          className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-black leading-snug ${
            props.activeEcomCategory === null ? "bg-[var(--vendor-accent)] text-white" : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          Tüm ürünler
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </button>
        {props.sidebarTree.map((cat) => {
          const activeRow = active?.id === cat.id || props.activeTopCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onMouseEnter={() => setActiveId(cat.id)}
              onFocus={() => setActiveId(cat.id)}
              onClick={() => props.onSelectCategory(cat.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black leading-snug transition ${
                activeRow ? "bg-[var(--vendor-accent)]/10 text-[var(--vendor-accent)]" : "text-slate-700 hover:bg-slate-50 hover:text-[var(--vendor-accent)]"
              }`}
            >
              <span className="min-w-0 whitespace-normal break-words">
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-[var(--vendor-accent)]">
                  <Package className="h-4 w-4" />
                </span>
                {cat.name}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
      <div className="invisible absolute left-[calc(100%+12px)] top-0 z-40 w-[min(720px,calc(100vw-340px))] rounded-3xl border border-slate-200 bg-white p-4 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
        <StorefrontCategoryPanel category={active} onSelectCategory={props.onSelectCategory} />
      </div>
    </aside>
  );
}

function StorefrontCategoryPanel({ category, onSelectCategory }: { category: StoreCategoryNode | null; onSelectCategory: Props["onSelectCategory"] }) {
  if (!category) return null;
  const children = category.children ?? [];

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-col gap-2 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--vendor-accent)]">Alt kategori menüsü</p>
          <h3 className="break-words text-2xl font-black leading-tight text-slate-950">{category.name}</h3>
        </div>
        <button type="button" onClick={() => onSelectCategory(category.id)} className="shrink-0 rounded-full bg-[var(--vendor-accent)] px-4 py-2 text-xs font-black text-white hover:opacity-90" style={{ color: "#fff" }}>
          Bu kategoriyi aç
        </button>
      </div>
      {children.length > 0 ? (
        <div className="grid max-h-[360px] gap-4 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
          {children.slice(0, 12).map((child) => (
            <div key={child.id} className="min-w-0 rounded-2xl border border-slate-100 p-3">
              <button type="button" onClick={() => onSelectCategory(child.id)} className="block w-full text-left text-sm font-black leading-snug text-slate-900 hover:text-[var(--vendor-accent)]">
                <span className="whitespace-normal break-words">{child.name}</span>
              </button>
              {child.children.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {child.children.slice(0, 6).map((grandchild) => (
                    <button
                      key={grandchild.id}
                      type="button"
                      onClick={() => onSelectCategory(grandchild.id)}
                      className="block w-full rounded-xl px-2 py-1.5 text-left text-xs font-semibold leading-snug text-slate-500 hover:bg-slate-50 hover:text-[var(--vendor-accent)]"
                    >
                      <span className="whitespace-normal break-words">{grandchild.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">
          Bu kategoride ürünleri görüntülemek için kategoriyi seç.
        </div>
      )}
    </div>
  );
}

function ThemeHero({
  props,
  profile,
}: {
  props: Props;
  profile: ThemeProfile;
}) {
  const cfg = resolveVendorThemeConfig(props.themeKey, props.themeConfig ?? undefined);
  const heroTitle = cfg.heroTitle || profile.headline || props.vendor.name;
  const heroSubtitle = cfg.heroSubtitle || profile.subtitle;
  const promoBadge = cfg.promoBadge || profile.eyebrow;
  const shippingFree = money(props.vendor.shippingFee) === 0;
  const heroProducts = props.products.slice(0, 3);

  return (
    <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${profile.heroClass} shadow-sm`}>
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_12%,white,transparent_20%),radial-gradient(circle_at_86%_18%,var(--vendor-accent),transparent_22%)]" />
      <div className={`relative grid gap-8 p-6 md:p-9 ${heroProducts.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-center" : ""}`}>
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/18 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] backdrop-blur-sm">{promoBadge}</span>
            <span className="rounded-full bg-white/14 px-4 py-2 text-xs font-black backdrop-blur-sm">{props.products.length} ürün</span>
          </div>
          <h2 className="max-w-3xl break-words text-3xl font-black leading-tight tracking-tight md:text-5xl">{heroTitle}</h2>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed opacity-80 md:text-base">{heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => props.onContentTabChange("products")} className="rounded-full bg-[var(--vendor-accent)] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90" style={{ color: "#fff" }}>
              Ürünleri Keşfet
            </button>
            <button type="button" onClick={props.onOpenCart} className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-slate-100">
              Sepetim {props.totalItems > 0 ? `· ${props.total.toFixed(0)}₺` : ""}
            </button>
          </div>
          <div className="mt-6 grid gap-3 text-xs font-bold sm:grid-cols-3">
            <div className="rounded-2xl bg-white/14 p-3 backdrop-blur-sm"><Star className="mb-1 h-4 w-4 text-amber-300" /> {Number(props.vendor.rating ?? 0).toFixed(1)} puan · {props.vendor.reviewCount ?? 0} yorum</div>
            <div className="rounded-2xl bg-white/14 p-3 backdrop-blur-sm"><Truck className="mb-1 h-4 w-4" /> {shippingFree ? "Ücretsiz kargo" : `${props.vendor.shippingFee ?? "0"}₺ kargo`}</div>
            <div className="rounded-2xl bg-white/14 p-3 backdrop-blur-sm"><ShieldCheck className="mb-1 h-4 w-4" /> Yekpare güvenli sipariş</div>
          </div>
        </div>
        {heroProducts.length > 0 ? (
          <div className="grid gap-3">
            {heroProducts.map((product) => {
              const image = productImage(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => props.onAddToCart(product)}
                  className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-3xl bg-white p-4 text-left text-slate-950 shadow-xl"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    {image ? <img src={image} alt={product.name} className="h-full w-full object-contain p-2" /> : <Package className="m-auto h-full w-8 text-slate-300" />}
                  </div>
                  <div className="min-w-0 self-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--vendor-accent)]">Öne çıkan ürün</p>
                    <p className="line-clamp-2 break-words text-sm font-black leading-snug sm:text-base">{product.name}</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{money(product.salePrice ?? product.price).toFixed(0)}₺</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CampaignTiles({ props, profile }: { props: Props; profile: ThemeProfile }) {
  const shippingFree = money(props.vendor.shippingFee) === 0;
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white md:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Haftanın vitrini</p>
        <h2 className="mt-2 text-2xl font-black">Kampanyalar, yeni ürünler ve çok satanlar aynı mağaza akışında.</h2>
        <p className="mt-2 text-sm font-semibold text-white/65">{profile.subtitle}</p>
      </div>
      <div className="rounded-[1.75rem] bg-[var(--vendor-accent)] p-5 text-white">
        <Truck className="mb-3 h-6 w-6" />
        <p className="text-sm font-black">{shippingFree ? "Bu mağazada ücretsiz kargo" : props.vendor.freeShippingAbove ? `${props.vendor.freeShippingAbove}₺ üzeri ücretsiz kargo` : `${props.vendor.shippingFee ?? "0"}₺ kargo`}</p>
        <p className="mt-2 text-xs font-semibold text-white/75">{props.vendor.shippingTime ?? 3} iş günü içinde kargoya verilmesi hedeflenir.</p>
      </div>
    </section>
  );
}

function ProductShelf({
  title,
  subtitle,
  products,
  props,
  mode,
}: {
  title: string;
  subtitle: string;
  products: EcommerceRendererProduct[];
  props: Props;
  mode: ThemeProfile["cardMode"];
}) {
  if (products.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--vendor-accent)]">Mağaza rafı</p>
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
        </div>
        <button type="button" onClick={() => props.onContentTabChange("products")} className="inline-flex items-center gap-1 self-start rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
          Tümünü gör <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            vendorOpen={props.vendor.isOpen}
            cart={props.cart}
            onAddToCart={props.onAddToCart}
            onRemoveFromCart={props.onRemoveFromCart}
            mode={mode}
          />
        ))}
      </div>
    </section>
  );
}

function StorefrontFooter({ props, profile }: { props: Props; profile: ThemeProfile }) {
  const location = [props.vendor.district, props.vendor.city].filter(Boolean).join(", ");
  return (
    <section className={`overflow-hidden rounded-[2rem] bg-gradient-to-br ${profile.heroClass}`}>
      <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Mağaza bilgisi</p>
          <h2 className="mt-2 text-2xl font-black">{props.vendor.name}</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed opacity-75">{props.aboutText || profile.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-black">
            <span className="rounded-full bg-white/14 px-4 py-2 backdrop-blur-sm"><ShieldCheck className="mr-1 inline h-4 w-4" /> Güvenli sipariş</span>
            <span className="rounded-full bg-white/14 px-4 py-2 backdrop-blur-sm"><Truck className="mr-1 inline h-4 w-4" /> Kargo bilgisi açık</span>
            {location ? <span className="rounded-full bg-white/14 px-4 py-2 backdrop-blur-sm"><MapPin className="mr-1 inline h-4 w-4" /> {location}</span> : null}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 text-slate-950">
          <h3 className="text-sm font-black">Sipariş ve iletişim</h3>
          <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            {props.vendor.phone ? <a href={`tel:${props.vendor.phone}`} className="flex items-center gap-2 text-[var(--vendor-accent)]"><Phone className="h-4 w-4" /> {props.vendor.phone}</a> : null}
            <button type="button" onClick={props.onOpenCart} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-sm font-black text-white" style={{ color: "#fff" }}>
              <ShoppingCart className="h-4 w-4" /> Sepeti aç
            </button>
            {props.waAvailable ? (
              <button type="button" onClick={props.onOpenWhatsApp} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-black text-white" style={{ color: "#fff" }}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Overview({ props, profile }: { props: Props; profile: ThemeProfile }) {
  const location = [props.vendor.district, props.vendor.city].filter(Boolean).join(", ");
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--vendor-accent)]">Hakkımızda</span>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{props.vendor.name}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {props.aboutText || "Bu mağaza henüz tanıtım metni eklemedi. Ürünleri, iletişim bilgileri ve sipariş seçenekleri bu vitrinden yönetilir."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <Truck className="mb-2 h-5 w-5 text-[var(--vendor-accent)]" />
            <div className="text-sm font-black text-slate-950">Teslimat</div>
            <div className="text-xs text-slate-500">{props.vendor.shippingTime ?? 3} iş günü hedefi</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <BadgePercent className="mb-2 h-5 w-5 text-[var(--vendor-accent)]" />
            <div className="text-sm font-black text-slate-950">Kargo fırsatı</div>
            <div className="text-xs text-slate-500">{props.vendor.freeShippingAbove ? `${props.vendor.freeShippingAbove}₺ üzeri ücretsiz` : "Mağaza koşullarına göre"}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-[var(--vendor-accent)]" />
            <div className="text-sm font-black text-slate-950">Güvenli akış</div>
            <div className="text-xs text-slate-500">Yekpare sepet ve sipariş takibi</div>
          </div>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">İletişim</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {props.vendor.phone ? <a href={`tel:${props.vendor.phone}`} className="flex items-center gap-2 font-bold text-[var(--vendor-accent)]"><Phone className="h-4 w-4" /> {props.vendor.phone}</a> : null}
            {location ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {location}</p> : null}
            {props.discoverHref ? <Link href={props.discoverHref} className="inline-flex items-center gap-1 font-bold text-slate-900">Keşfet profilini aç <ChevronRight className="h-4 w-4" /></Link> : null}
          </div>
          {props.waAvailable ? (
            <button type="button" onClick={props.onOpenWhatsApp} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-black text-white" style={{ color: "#fff" }}>
              <MessageCircle className="h-4 w-4" /> WhatsApp&apos;tan yaz
            </button>
          ) : null}
        </div>
        <div className={`rounded-3xl bg-gradient-to-br ${profile.heroClass} p-5 shadow-sm`}>
          <h3 className="text-sm font-black">Sipariş takibi</h3>
          <p className="mt-1 text-xs opacity-75">Mevcut sipariş numaranı girerek durumunu kontrol edebilirsin.</p>
          <div className="mt-4 rounded-2xl bg-white p-3 text-slate-950">
            <OrderTrackSearch compact />
          </div>
        </div>
        <VendorBlogStorefrontSection
          blogBasePath={props.blogBasePath ?? ""}
          blogEnabled={Boolean(props.blogEnabled)}
          blogPreviewPosts={props.blogPreviewPosts ?? []}
          blogPreviewLoading={Boolean(props.blogPreviewLoading)}
          className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"
        />
      </aside>
    </div>
  );
}

function Departments({
  props,
  rounded = "rounded-3xl",
}: {
  props: Props;
  rounded?: string;
}) {
  const cats = categoryPreview(props.sidebarTree);
  if (cats.length === 0) return null;
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cats.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => props.onSelectCategory(cat.id)}
          className={`${rounded} border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--vendor-accent)]/10 text-sm font-black text-[var(--vendor-accent)]">
            <Package className="h-5 w-5" />
          </div>
          <h3 className="line-clamp-1 text-sm font-black text-slate-950">{cat.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{cat.children.length ? `${cat.children.length} alt kategori` : "Ürünleri keşfet"}</p>
        </button>
      ))}
    </section>
  );
}

function OpeningBanner({ vendor, discoverHref }: Pick<Props, "vendor" | "discoverHref">) {
  if (vendor.isOpen) return null;
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-black">Bu mağaza açılış aşamasındadır</p>
          <p className="text-xs font-semibold opacity-80">Şu an sipariş alınmamaktadır. Yakında online alışveriş hizmeti başlayacak.</p>
        </div>
        {discoverHref ? <Link href={discoverHref} className="sm:ml-auto rounded-full bg-amber-600 px-4 py-2 text-xs font-black text-white">Harita sayfası</Link> : null}
      </div>
    </div>
  );
}

export function EcommerceThemeRenderer(props: Props) {
  const profile = THEME_PROFILES[props.themeKey];
  const cfg = resolveVendorThemeConfig(props.themeKey, props.themeConfig ?? undefined);
  const accent = cfg.accentColor || profile.accent;
  const marketplace = props.themeKey === "sellzy-store" || props.themeKey === "kartify-shop" || props.themeKey === "kartify-mega-mart";
  const listing = props.themeKey === "listinghub-shop";
  const nest = props.themeKey === "foodmart" || props.themeKey === "nest-market";
  const pixio = props.themeKey === "pixio-shop" || props.themeKey === "kartify-style-tech";
  const baby = props.themeKey === "kartify-baby-shop";
  const organic = props.themeKey === "kartify-organic-store";
  const electro = props.themeKey === "kartify-electro" || props.themeKey === "kartify-gadget";
  const dealProducts = props.products.filter((product) => product.salePrice).slice(0, 10);
  const popularProducts = props.products.filter((product) => product.isPopular).slice(0, 10);
  const featuredProducts = props.products.filter((product) => product.isPopular || product.salePrice).slice(0, 10);
  const newProducts = [...props.products].slice(-10).reverse();
  const shelfProducts = featuredProducts.length > 0 ? featuredProducts : newProducts;

  const controls = (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StoreTabs
          contentTab={props.contentTab}
          onContentTabChange={props.onContentTabChange}
          waAvailable={props.waAvailable}
          onOpenWhatsApp={props.onOpenWhatsApp}
          blogEnabled={props.blogEnabled}
          blogBasePath={props.blogBasePath}
        />
        <button type="button" onClick={props.onOpenCart} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--vendor-accent)] px-4 py-3 text-sm font-black text-white shadow-sm ring-1 ring-white/20" style={{ color: "#fff" }}>
          <ShoppingCart className="h-4 w-4" /> {props.totalItems > 0 ? `${props.totalItems} ürün · ${props.total.toFixed(0)}₺` : "Sepetim"}
        </button>
      </div>
      {props.contentTab === "products" ? <CategoryChips {...props} /> : null}
    </div>
  );

  return (
    <div className={`ecom-theme-renderer min-h-screen ${profile.surface}`} data-ecom-renderer-theme={props.themeKey} style={{ ["--vendor-accent" as string]: accent }}>
      <StorefrontHeader props={props} profile={profile} />
      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 md:py-7">
        <OpeningBanner vendor={props.vendor} discoverHref={props.discoverHref} />
        <ThemeHero props={props} profile={profile} />
        {props.contentTab === "products" ? <MegaCategoryBar props={props} compact={listing || electro} /> : null}
        {props.contentTab === "products" ? (
          <>
            <CampaignTiles props={props} profile={profile} />
            <ProductShelf
              title={featuredProducts.length > 0 ? "Popüler ürünler" : "Yeni eklenen ürünler"}
              subtitle="Ana sayfa rafında hızlı keşif ve sepete ekleme akışı."
              products={shelfProducts}
              props={props}
              mode={profile.cardMode}
            />
            <ProductShelf
              title="Günün fırsatları"
              subtitle="İndirimli gerçek mağaza ürünleri ayrı kampanya rafında görünür."
              products={dealProducts}
              props={props}
              mode={profile.cardMode}
            />
            <ProductShelf
              title="Çok satanlar"
              subtitle="Mağazanın öne çıkardığı ürünler ikinci güçlü raf olarak görünür."
              products={popularProducts}
              props={props}
              mode={profile.cardMode}
            />
            <ProductShelf
              title="Yeni gelenler"
              subtitle="Mağazaya en son eklenen ürünler ayrı bir e-ticaret bölümü olarak listelenir."
              products={newProducts}
              props={props}
              mode={profile.cardMode}
            />
          </>
        ) : null}

        {marketplace ? (
          <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <StorefrontMegaCategoryMenu props={props} />
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">{controls}</div>
              {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : (
                <>
                  <Departments props={props} />
                  <ProductGrid {...props} mode={profile.cardMode} />
                </>
              )}
            </div>
          </section>
        ) : listing ? (
          <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">{props.vendor.name}</h2>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600">{props.aboutText || profile.subtitle}</p>
                <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                  {props.vendor.phone ? <a href={`tel:${props.vendor.phone}`} className="flex items-center gap-2 text-[var(--vendor-accent)]"><Phone className="h-4 w-4" /> {props.vendor.phone}</a> : null}
                  {[props.vendor.district, props.vendor.city].filter(Boolean).length ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[props.vendor.district, props.vendor.city].filter(Boolean).join(", ")}</p> : null}
                </div>
              </div>
              <StorefrontMegaCategoryMenu props={props} />
            </aside>
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">{controls}</div>
              {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : <ProductGrid {...props} mode="listing" />}
            </div>
          </section>
        ) : nest || organic || baby ? (
          <section className="space-y-5">
            <div className={`rounded-[2.5rem] border border-white bg-white/85 p-5 shadow-sm ${baby ? "border-pink-100" : organic ? "border-lime-100" : ""}`}>{controls}</div>
            {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : (
              <>
                <Departments props={props} rounded={baby ? "rounded-[2rem]" : "rounded-3xl"} />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <ProductGrid {...props} mode={profile.cardMode} />
                  <aside className="hidden space-y-4 lg:block">
                    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-black text-slate-950">{organic ? "Doğal seçim" : baby ? "Aile dostu mağaza" : "Market avantajları"}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{profile.subtitle}</p>
                    </div>
                    <div className="rounded-[2rem] bg-[var(--vendor-accent)]/10 p-5 text-slate-900">
                      <ShieldCheck className="mb-2 h-5 w-5 text-[var(--vendor-accent)]" />
                      <p className="text-sm font-black">Yekpare sepet ve sipariş takibi aktif</p>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </section>
        ) : pixio ? (
          <section className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-none border-y border-slate-900/10 bg-white p-5 shadow-sm">{controls}</div>
              <div className="rounded-none bg-slate-950 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Koleksiyon</p>
                <h2 className="mt-2 text-2xl font-black">Yeni sezon ve öne çıkan ürünler</h2>
              </div>
            </div>
            {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : <ProductGrid {...props} mode={profile.cardMode} />}
          </section>
        ) : electro ? (
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-cyan-200 bg-white p-5 shadow-sm">{controls}</div>
            {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : (
              <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="hidden space-y-4 xl:block">
                  <StorefrontMegaCategoryMenu props={props} />
                  <div className="rounded-[2rem] bg-slate-950 p-5 text-white">
                    <h3 className="text-lg font-black">Teknik vitrin</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">Elektronik ürünlerde yatay kartlar, fiyat ve hızlı sepet aksiyonlarını öne çıkarır.</p>
                  </div>
                </aside>
                <ProductGrid {...props} mode="tech" />
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">{controls}</div>
            {props.contentTab === "overview" ? <Overview props={props} profile={profile} /> : (
              <>
                <Departments props={props} />
                <ProductGrid {...props} mode={profile.cardMode} />
              </>
            )}
          </section>
        )}
        <StorefrontFooter props={props} profile={profile} />
      </main>
    </div>
  );
}
