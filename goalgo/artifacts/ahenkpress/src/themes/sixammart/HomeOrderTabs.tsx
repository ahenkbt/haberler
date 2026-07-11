import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, MapPin, Store, Utensils } from "lucide-react";
import {
  deliveryCategoryBelongsToModule,
  deliveryVendorBelongsToModule,
  DELIVERY_MODULES,
  type DeliveryBusinessModule,
} from "@/lib/deliveryModuleGroups";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import {
  ItemCardVertical,
  Rail,
  type RailItem,
  type SiparisVendor,
  StoreCard as SiparisStoreCard,
} from "@/pages/public/SiparisModulVitrin";

const API = "/api";
const SADE_ACCENT = "#039D55";

type HomeOrderTabId = DeliveryBusinessModule;

type CategoryChip = { name: string; icon: string; href?: string };

type VendorCategory = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
  position?: number;
  superCategory?: string | null;
};

type NearbyBusiness = {
  id: string;
  name: string;
  photoUrl?: string | null;
  categoryName?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  storefrontHref?: string | null;
  discoverHref?: string | null;
  slug?: string | null;
};

const HOME_ORDER_TABS: Array<{
  id: HomeOrderTabId;
  label: string;
  icon: typeof Utensils;
  moduleHref: string;
  seeAllHref: string;
}> = [
  { id: "food", label: "Yemek", icon: Utensils, moduleHref: "/yemek", seeAllHref: "/yemek" },
  { id: "market", label: "Market", icon: Store, moduleHref: "/market", seeAllHref: "/market" },
  { id: "nearby", label: "Yakınımdakiler", icon: MapPin, moduleHref: "/isletmeler", seeAllHref: "/kesfet" },
];

const HOME_TAB_CATEGORIES: Record<HomeOrderTabId, CategoryChip[]> = {
  food: [
    { name: "Yemek & Restoran", icon: "🍽️" },
    { name: "Simit & Börek", icon: "🥨" },
    { name: "Pastane & Tatlıcı", icon: "🍰" },
    { name: "Kebap", icon: "🍢" },
    { name: "Pide & Lahmacun", icon: "🫓" },
    { name: "Döner", icon: "🌯" },
    { name: "Burger", icon: "🍔" },
    { name: "Pizza", icon: "🍕" },
    { name: "Çiğ Köfte", icon: "🌶️" },
    { name: "Köfte", icon: "🧆" },
    { name: "Tavuk", icon: "🍗" },
    { name: "Ev Yemekleri", icon: "🍲" },
    { name: "Çorba", icon: "🥣" },
  ],
  market: [
    { name: "Temel gıda", icon: "🛒" },
    { name: "Manav", icon: "🥦" },
    { name: "İçecek", icon: "🥤" },
    { name: "Temizlik", icon: "🧴" },
    { name: "Kişisel bakım", icon: "🧼" },
    { name: "Bebek", icon: "👶" },
    { name: "Evcil hayvan", icon: "🐾" },
    { name: "Kasap", icon: "🥩" },
    { name: "Fırın", icon: "🍞" },
    { name: "Kuruyemiş", icon: "🥜" },
  ],
  nearby: [
    { name: "Restoranlar", icon: "🍽️", href: "/kesfet?q=restoran" },
    { name: "Kafeler", icon: "☕", href: "/kesfet?q=kafe" },
    { name: "Marketler", icon: "🛒", href: "/kesfet?q=market" },
    { name: "Eczaneler", icon: "💊", href: "/kesfet?q=eczane" },
    { name: "Oteller", icon: "🏨", href: "/turizm/hotel" },
    { name: "Bankalar", icon: "🏦", href: "/kesfet?q=banka" },
    { name: "Benzin", icon: "⛽", href: "/kesfet?q=benzin" },
    { name: "Kuaför", icon: "💇", href: "/kesfet?q=kuaför" },
  ],
};

const TAB_COPY: Record<
  HomeOrderTabId,
  { categoriesTitle: string; popularTitle: string; popularSubtitle?: string }
> = {
  food: {
    categoriesTitle: "Yemek Kategorileri",
    popularTitle: "Yakınındaki Popüler Lezzetler",
    popularSubtitle: "Restoran ve lezzet işletmelerinden öne çıkanlar",
  },
  market: {
    categoriesTitle: "Market Kategorileri",
    popularTitle: "Popüler Market Ürünleri",
    popularSubtitle: "Yakınındaki marketlerden taze ve indirimli ürünler",
  },
  nearby: {
    categoriesTitle: "Yakınındaki Kategoriler",
    popularTitle: "Popüler İşletmeler",
    popularSubtitle: "Keşfet ve harita üzerinden yakın işletmeler",
  },
};

function categoryHref(tab: HomeOrderTabId, chip: CategoryChip, moduleHref: string): string {
  if (chip.href) return chip.href;
  return `${moduleHref}?kategori=${encodeURIComponent(chip.name)}`;
}

function HomeCategoryChip({ name, icon, href }: CategoryChip & { href: string }) {
  return (
    <Link href={href} className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 sm:w-24 sm:gap-2">
      <span className="grid h-[60px] w-[60px] place-items-center rounded-full border border-emerald-100 bg-white text-2xl shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-[#039D55] group-hover:shadow-md sm:h-20 sm:w-20 sm:text-3xl">
        {icon}
      </span>
      <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-slate-700 group-hover:text-[#039D55] sm:text-xs">
        {name}
      </span>
    </Link>
  );
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
        {subtitle ? <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500 sm:text-sm">{subtitle}</p> : null}
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

function NearbyBusinessCard({ item }: { item: NearbyBusiness }) {
  const img = resolveClientMediaSrc(item.photoUrl ?? null);
  const href =
    item.storefrontHref || item.discoverHref || (item.slug ? `/kesfet/${item.slug}` : "/kesfet");
  const rating = Number(item.rating ?? 0);
  return (
    <Link
      href={String(href)}
      className="group w-44 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg sm:w-48"
    >
      <div className="relative h-28 overflow-hidden bg-emerald-50 sm:h-32">
        {img ? (
          <img src={img} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">🏪</div>
        )}
      </div>
      <div className="p-2.5 sm:p-3">
        <h4 className="line-clamp-1 text-xs font-black text-slate-950 group-hover:text-[#039D55] sm:text-sm">{item.name}</h4>
        {item.categoryName ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]">{item.categoryName}</p>
        ) : null}
        {rating > 0 ? (
          <p className="mt-1 text-[10px] font-bold text-amber-500 sm:text-xs">
            ★ {rating.toFixed(1)}
            {item.userRatingsTotal ? ` (${Number(item.userRatingsTotal).toLocaleString("tr-TR")})` : ""}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function useHomeOrderTabData(tab: HomeOrderTabId) {
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [vendors, setVendors] = useState<SiparisVendor[]>([]);
  const [popularItems, setPopularItems] = useState<RailItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/delivery/categories?module=${encodeURIComponent(tab)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((all: VendorCategory[]) => {
        const rows = (Array.isArray(all) ? all : [])
          .filter((c) => c.superCategory === "siparis" || !c.superCategory || c.superCategory === "her_ikisi")
          .filter((c) => deliveryCategoryBelongsToModule(c, tab))
          .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
        setCategories(rows);
      })
      .catch(() => setCategories([]));
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    const url = `${API}/delivery/vendors?type=delivery&limit=24&module=${encodeURIComponent(tab)}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const rows = (Array.isArray(d) ? d : []) as SiparisVendor[];
        setVendors(
          categories.length === 0
            ? rows
            : rows.filter(
                (v) =>
                  categories.some((c) => String(c.id) === String(v.categoryId)) ||
                  deliveryVendorBelongsToModule(v, categories, tab),
              ),
        );
      })
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [tab, categories]);

  useEffect(() => {
    fetch(`${API}/delivery/module-items?module=${encodeURIComponent(tab)}&limit=16`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPopularItems(Array.isArray(d) ? d : []))
      .catch(() => setPopularItems([]));
  }, [tab]);

  const recommended = useMemo(() => {
    const featured = vendors.filter((v) => v.featured && v.isOpen);
    const rest = vendors.filter((v) => !v.featured && v.isOpen);
    return [...featured, ...rest].slice(0, 12);
  }, [vendors]);

  return { categories, vendors, popularItems, recommended, loading };
}

export function HomeOrderTabs({ nearbyBusinesses = [] }: { nearbyBusinesses?: NearbyBusiness[] }) {
  const [tab, setTab] = useState<HomeOrderTabId>("food");
  const tabMeta = HOME_ORDER_TABS.find((t) => t.id === tab) ?? HOME_ORDER_TABS[0];
  const copy = TAB_COPY[tab];
  const { categories, popularItems, recommended, loading } = useHomeOrderTabData(tab);

  const categoryChips = useMemo(() => {
    const staticChips = HOME_TAB_CATEGORIES[tab].map((chip) => ({
      ...chip,
      href: categoryHref(tab, chip, tabMeta.moduleHref),
    }));
    if (categories.length === 0) return staticChips;
    const dbNames = categories.map((c) => c.name.toLocaleLowerCase("tr-TR"));
    const dbChips = categories.slice(0, 8).map((cat) => ({
      name: cat.name,
      icon: cat.icon || "🏷️",
      href: `${tabMeta.moduleHref}?kategori=${encodeURIComponent(cat.name)}`,
    }));
    const extras = staticChips.filter((chip) => {
      const fname = chip.name.toLocaleLowerCase("tr-TR");
      return !dbNames.some((n) => n.includes(fname) || fname.includes(n));
    });
    return [...dbChips, ...extras];
  }, [categories, tab, tabMeta.moduleHref]);

  const showProductRail = popularItems.length > 0;
  const showVendorRail = !showProductRail && (loading || recommended.length > 0);
  const showNearbyRail = tab === "nearby" && nearbyBusinesses.length > 0 && !showProductRail && !showVendorRail;

  return (
    <section className="sixam-section mx-auto w-full max-w-[1440px] px-4 py-6">
      <div className="mb-4">
        <h2 className="text-[22px] font-black tracking-tight text-slate-950">Sipariş</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Yemek, market ve yakınındaki işletmeler — kategori ve popüler vitrinler.
        </p>
      </div>

      <div
        className="mb-5 flex rounded-2xl border border-emerald-100 bg-emerald-50/60 p-1"
        role="tablist"
        aria-label="Sipariş sekmeleri"
      >
        {HOME_ORDER_TABS.map(({ id, label, icon: Icon }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black transition sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                selected ? "bg-white text-[#039D55] shadow-sm ring-1 ring-emerald-100" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-6">
        <div>
          <RailHeading title={copy.categoriesTitle} seeAllHref={tabMeta.seeAllHref} />
          <Rail>
            {categoryChips.map((chip) => (
              <HomeCategoryChip key={chip.name} name={chip.name} icon={chip.icon} href={chip.href} />
            ))}
          </Rail>
        </div>

        {showProductRail ? (
          <div>
            <RailHeading
              title={copy.popularTitle}
              subtitle={copy.popularSubtitle}
              seeAllHref={tabMeta.seeAllHref}
            />
            <Rail>
              {popularItems.slice(0, 12).map((item) => (
                <ItemCardVertical key={item.id} item={item} />
              ))}
            </Rail>
          </div>
        ) : null}

        {showVendorRail ? (
          <div>
            <RailHeading
              title={tab === "food" ? "Önerilen Restoranlar" : tab === "market" ? "Önerilen Marketler" : copy.popularTitle}
              subtitle={showProductRail ? undefined : copy.popularSubtitle}
              seeAllHref={tabMeta.seeAllHref}
            />
            <Rail>
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="h-52 w-44 shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-60" />
                  ))
                : recommended.map((vendor) => <SiparisStoreCard key={vendor.id} vendor={vendor} compact />)}
            </Rail>
          </div>
        ) : null}

        {showNearbyRail ? (
          <div>
            <RailHeading title={copy.popularTitle} subtitle={copy.popularSubtitle} seeAllHref={tabMeta.seeAllHref} />
            <Rail>
              {nearbyBusinesses.slice(0, 12).map((biz) => (
                <NearbyBusinessCard key={biz.id} item={biz} />
              ))}
            </Rail>
          </div>
        ) : null}

        {!loading && !showProductRail && !showVendorRail && !showNearbyRail ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
            Bu sekmede henüz vitrin içeriği yok.{" "}
            <Link href={tabMeta.moduleHref} className="font-black text-[#039D55] hover:underline">
              {DELIVERY_MODULES.find((m) => m.key === tab)?.shortLabel ?? "Modüle git"}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
