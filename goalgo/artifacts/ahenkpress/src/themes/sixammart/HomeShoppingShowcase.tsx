import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Car,
  ChevronRight,
  Heart,
  Home,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { Rail } from "@/pages/public/SiparisModulVitrin";

const API = "/api";
const SADE_ACCENT = "#039D55";
const SHOWCASE_LIMIT = 12;

type MarketplaceProduct = {
  id: number | string;
  name: string;
  imageUrl?: string | null;
  price?: number | string | null;
  salePrice?: number | string | null;
  discountPercent?: number | null;
  vendorName?: string | null;
  categoryName?: string | null;
  href?: string | null;
};

const HOME_SHOPPING_CATEGORIES: Array<{
  label: string;
  icon: typeof ShoppingBag;
  href: string;
  categorySlug: string;
}> = [
  { label: "Tüm ürünler", icon: ShoppingBag, href: "/magaza", categorySlug: "" },
  {
    label: "Elektronik",
    icon: Smartphone,
    href: "/magaza?kategori=elektronik-ve-teknoloji",
    categorySlug: "elektronik-ve-teknoloji",
  },
  {
    label: "Moda",
    icon: Shirt,
    href: "/magaza?kategori=giyim-moda-ve-aksesuar",
    categorySlug: "giyim-moda-ve-aksesuar",
  },
  {
    label: "Ev & Yaşam",
    icon: Home,
    href: "/magaza?kategori=ev-yasam-kirtasiye-ve-ofis",
    categorySlug: "ev-yasam-kirtasiye-ve-ofis",
  },
  {
    label: "Oto & Aksesuar",
    icon: Car,
    href: "/magaza?kategori=oto-aksesuar-yapi-market-ve-bahce",
    categorySlug: "oto-aksesuar-yapi-market-ve-bahce",
  },
  {
    label: "Sağlık & Wellness",
    icon: Sparkles,
    href: "/magaza?kategori=kozmetik-ve-kisisel-bakim",
    categorySlug: "kozmetik-ve-kisisel-bakim",
  },
];

const FALLBACK_ROUTE_CARDS = [
  { title: "Mağazaya git", subtitle: "Tüm ürün ve mağazalar", icon: "🛍️", href: "/magaza" },
  { title: "Elektronik", subtitle: "Telefon ve teknoloji", icon: "📱", href: "/magaza?kategori=elektronik-ve-teknoloji" },
  { title: "Moda", subtitle: "Giyim ve aksesuar", icon: "👗", href: "/magaza?kategori=giyim-moda-ve-aksesuar" },
  { title: "Ev & Yaşam", subtitle: "Mobilya ve dekorasyon", icon: "🛋️", href: "/magaza?kategori=ev-yasam-kirtasiye-ve-ofis" },
  { title: "Kampanyalar", subtitle: "İndirim ve kuponlar", icon: "🏷️", href: "/magaza/kampanyalar" },
];

function money(value: number | string | null | undefined, digits = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: digits })
    : "₺0";
}

function productKey(product: MarketplaceProduct): string {
  return String(product.id ?? product.href ?? product.name);
}

function extractProductPool(data: Record<string, unknown>): MarketplaceProduct[] {
  const newest = Array.isArray(data.newest) ? (data.newest as MarketplaceProduct[]) : [];
  const dailyDeals = Array.isArray(data.dailyDeals) ? (data.dailyDeals as MarketplaceProduct[]) : [];
  const featured = Array.isArray(data.featuredProducts) ? (data.featuredProducts as MarketplaceProduct[]) : [];
  const allProducts = Array.isArray(data.products) ? (data.products as MarketplaceProduct[]) : [];
  return [...dailyDeals, ...featured, ...newest, ...allProducts];
}

function shuffleArray<T>(items: T[]): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function interleavePools(pools: MarketplaceProduct[][]): MarketplaceProduct[] {
  const maxLen = Math.max(0, ...pools.map((p) => p.length));
  const mixed: MarketplaceProduct[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    for (const pool of pools) {
      if (pool[i]) mixed.push(pool[i]);
    }
  }
  return mixed;
}

async function fetchMarketplacePool(categorySlug = "", limit = 16): Promise<MarketplaceProduct[]> {
  const params = new URLSearchParams({ lang: "tr", limit: String(limit), randomize: "1" });
  if (categorySlug) params.set("category", categorySlug);
  const res = await fetch(`${API}/delivery/marketplace?${params}`);
  if (!res.ok) return [];
  const json = await res.json();
  const data = (json?.data ?? {}) as Record<string, unknown>;
  return extractProductPool(data);
}

function useHomeShoppingShowcaseData() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const categorySlugs = HOME_SHOPPING_CATEGORIES.map((c) => c.categorySlug).filter(Boolean);

    Promise.all([
      fetchMarketplacePool("", 24),
      ...categorySlugs.map((slug) => fetchMarketplacePool(slug, 6)),
    ])
      .then((pools) => {
        if (cancelled) return;
        const interleaved = interleavePools(pools);
        const seen = new Set<string>();
        const unique: MarketplaceProduct[] = [];
        for (const product of interleaved) {
          const key = productKey(product);
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(product);
        }
        setProducts(shuffleArray(unique).slice(0, SHOWCASE_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}

function RailHeading({
  title,
  subtitle,
  seeAllHref,
}: {
  title: string;
  subtitle?: string;
  seeAllHref: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-black text-slate-950 sm:text-lg">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      <Link
        href={seeAllHref}
        className="flex shrink-0 items-center gap-0.5 text-xs font-black sm:text-sm"
        style={{ color: SADE_ACCENT }}
      >
        Tümünü Gör <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Link>
    </div>
  );
}

function ShoppingProductCard({ product }: { product: MarketplaceProduct }) {
  const img = resolveClientMediaSrc(product.imageUrl ?? null);
  const price = Number(product.price ?? 0);
  const sale = Number(product.salePrice ?? 0);
  const hasSale = sale > 0 && sale < price;
  const href = product.href || "/magaza";
  return (
    <Link
      href={String(href)}
      className="group w-36 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg sm:w-44"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50 sm:h-32 sm:aspect-auto">
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105 sm:object-cover sm:p-0"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">🛒</div>
        )}
        {hasSale ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]">
            Fırsat
          </span>
        ) : null}
        <span className="absolute right-1.5 top-1.5 hidden rounded-full bg-white/90 p-1 text-slate-400 shadow-sm sm:block">
          <Heart className="h-3 w-3" />
        </span>
      </div>
      <div className="p-2 sm:p-2.5">
        <h4 className="line-clamp-2 min-h-[2.25rem] text-[11px] font-black leading-snug text-slate-950 group-hover:text-[#039D55] sm:min-h-0 sm:line-clamp-1 sm:text-xs">
          {product.name}
        </h4>
        <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]">
          {product.vendorName || product.categoryName || "Yekpare mağaza"}
        </p>
        <p className="mt-1 text-xs font-black text-[#039D55] sm:text-sm">{money(hasSale ? sale : price)}</p>
      </div>
    </Link>
  );
}

function StaticRouteCard({
  title,
  subtitle,
  icon,
  href,
}: {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group w-44 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg sm:w-48"
    >
      <div className="grid h-28 place-items-center bg-gradient-to-br from-emerald-50 to-amber-50 text-4xl sm:h-32">{icon}</div>
      <div className="p-2.5 sm:p-3">
        <h4 className="line-clamp-1 text-xs font-black text-slate-950 group-hover:text-[#039D55] sm:text-sm">{title}</h4>
        <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold text-slate-400 sm:text-[11px]">{subtitle}</p>
        <span className="mt-1 inline-flex text-[10px] font-black text-[#039D55] sm:text-xs">
          Keşfet <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export function HomeShoppingShowcase() {
  const { products, loading } = useHomeShoppingShowcaseData();
  const fallbackCards = useMemo(() => shuffleArray(FALLBACK_ROUTE_CARDS).slice(0, 5), []);

  const showProductRail = products.length > 0;
  const showStaticRail = !loading && !showProductRail;

  return (
    <section className="sixam-section mx-auto w-full max-w-[1440px] px-4 py-6">
      <div className="mb-4">
        <h2 className="text-[22px] font-black tracking-tight text-slate-950">Alışveriş</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Pazaryeri ürünleri — kategorilerden karma öne çıkan seçkiler.
        </p>
      </div>

      <div className="yekpare-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {HOME_SHOPPING_CATEGORIES.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:border-[#039D55] hover:text-[#039D55] sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-xs"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </div>

      {showProductRail ? (
        <div>
          <RailHeading
            title="Öne çıkan ürünler"
            subtitle="Her kategoriden karma seçki — her ziyarette yenilenir"
            seeAllHref="/magaza"
          />
          <Rail>
            {products.map((product) => (
              <ShoppingProductCard key={productKey(product)} product={product} />
            ))}
          </Rail>
        </div>
      ) : null}

      {loading && !showProductRail ? (
        <div>
          <RailHeading
            title="Öne çıkan ürünler"
            subtitle="Her kategoriden karma seçki — her ziyarette yenilenir"
            seeAllHref="/magaza"
          />
          <Rail>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-52 w-36 shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-44" />
            ))}
          </Rail>
        </div>
      ) : null}

      {showStaticRail ? (
        <div>
          <RailHeading
            title="Öne çıkan ürünler"
            subtitle="Mağaza kategorilerini keşfet"
            seeAllHref="/magaza"
          />
          <Rail>
            {fallbackCards.map((card) => (
              <StaticRouteCard key={card.title} {...card} />
            ))}
          </Rail>
        </div>
      ) : null}
    </section>
  );
}
