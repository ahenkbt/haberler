import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Building2, Car, ChevronRight, Home, Map, Ship } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { Rail } from "@/pages/public/SiparisModulVitrin";
import { useTourismListings } from "@/themes/bookingcore/hooks/useTourismListings";
import type { TourismListing } from "@/themes/bookingcore/hooks/useTourismListings";
import { tourismSearchPath } from "@/themes/bookingcore/lib/listingRoutes";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

const SADE_ACCENT = "#039D55";

type HomeTravelTabId = "hotel" | "villa" | "tour" | "car" | "boat";

type CategoryChip = { name: string; icon: string; href?: string };

const HOME_TRAVEL_TABS: Array<{
  id: HomeTravelTabId;
  label: string;
  icon: typeof Building2;
  seeAllHref: string;
}> = [
  { id: "hotel", label: "Otel", icon: Building2, seeAllHref: tourismSearchPath("hotel") },
  { id: "villa", label: "Villa & Ev", icon: Home, seeAllHref: tourismSearchPath("villa") },
  { id: "tour", label: "Tur", icon: Map, seeAllHref: tourismSearchPath("tour") },
  { id: "car", label: "Araç", icon: Car, seeAllHref: tourismSearchPath("car") },
  { id: "boat", label: "Yat/Tekne", icon: Ship, seeAllHref: tourismSearchPath("boat") },
];

const HOME_TAB_CATEGORIES: Record<HomeTravelTabId, CategoryChip[]> = {
  hotel: [
    { name: "Antalya", icon: "🏖️" },
    { name: "İstanbul", icon: "🌉" },
    { name: "Bodrum", icon: "⛱️" },
    { name: "Kapadokya", icon: "🎈" },
    { name: "5 Yıldızlı", icon: "⭐" },
    { name: "Butik Otel", icon: "🏨" },
    { name: "Termal", icon: "♨️" },
    { name: "Deniz Kenarı", icon: "🌊" },
    { name: "Şehir Merkezi", icon: "🏙️" },
    { name: "Apart Otel", icon: "🛏️" },
  ],
  villa: [
    { name: "Deniz Manzaralı", icon: "🌅" },
    { name: "Havuzlu", icon: "🏊" },
    { name: "Bungalov", icon: "🛖" },
    { name: "Dağ Evi", icon: "⛰️" },
    { name: "Fethiye", icon: "🌴" },
    { name: "Kaş", icon: "🐚" },
    { name: "Marmaris", icon: "⛵" },
    { name: "Muğla", icon: "🏡" },
    { name: "Aile Dostu", icon: "👨‍👩‍👧" },
    { name: "Lüks Villa", icon: "✨" },
  ],
  tour: [
    { name: "Günübirlik", icon: "☀️" },
    { name: "Kültür Turu", icon: "🏛️" },
    { name: "Doğa Yürüyüşü", icon: "🥾" },
    { name: "Balon Turu", icon: "🎈" },
    { name: "Tekne Turu", icon: "⛵" },
    { name: "Gastronomi", icon: "🍽️" },
    { name: "Macera", icon: "🧗" },
    { name: "Destinasyonlar", icon: "🗺️", href: TURIZM.turlar.destinasyonlar },
    { name: "Kapadokya", icon: "🏜️" },
    { name: "Efes", icon: "🏺" },
  ],
  car: [
    { name: "Ekonomik", icon: "🚗" },
    { name: "SUV", icon: "🚙" },
    { name: "Lüks", icon: "✨" },
    { name: "Otomatik", icon: "⚙️" },
    { name: "Havalimanı", icon: "✈️" },
    { name: "Günlük", icon: "📅" },
    { name: "Haftalık", icon: "🗓️" },
    { name: "Antalya", icon: "🏖️" },
    { name: "İstanbul", icon: "🌉" },
    { name: "İzmir", icon: "🌊" },
  ],
  boat: [
    { name: "Mavi Tur", icon: "🌊" },
    { name: "Yat Kiralama", icon: "🛥️" },
    { name: "Günübirlik", icon: "☀️" },
    { name: "Bodrum", icon: "⛱️" },
    { name: "Fethiye", icon: "🌴" },
    { name: "Marmaris", icon: "⛵" },
    { name: "Kaş", icon: "🐚" },
    { name: "Gulet", icon: "⛵" },
    { name: "Tekne Turu", icon: "🚤" },
    { name: "Özel Tur", icon: "✨" },
  ],
};

const TAB_COPY: Record<
  HomeTravelTabId,
  { categoriesTitle: string; popularTitle: string; popularSubtitle?: string }
> = {
  hotel: {
    categoriesTitle: "Otel Kategorileri",
    popularTitle: "Popüler Oteller",
    popularSubtitle: "Konaklama ve otel ilanlarından öne çıkanlar",
  },
  villa: {
    categoriesTitle: "Villa & Ev Kategorileri",
    popularTitle: "Popüler Villalar",
    popularSubtitle: "Tatil evi ve villa kiralama seçenekleri",
  },
  tour: {
    categoriesTitle: "Tur Kategorileri",
    popularTitle: "Popüler Turlar",
    popularSubtitle: "Günübirlik ve paket tur ilanları",
  },
  car: {
    categoriesTitle: "Araç Kiralama",
    popularTitle: "Popüler Araçlar",
    popularSubtitle: "Günlük ve haftalık rent a car seçenekleri",
  },
  boat: {
    categoriesTitle: "Yat Tekne Kiralama",
    popularTitle: "Popüler Yat & Tekneler",
    popularSubtitle: "Yat, tekne ve gulet kiralama ilanları",
  },
};

const STATIC_ROUTE_CARDS: Record<
  HomeTravelTabId,
  Array<{ title: string; subtitle: string; icon: string; href: string }>
> = {
  hotel: [
    { title: "Antalya Otelleri", subtitle: "Deniz ve şehir konaklama", icon: "🏖️", href: `${TURIZM.konaklama.home}?city=Antalya` },
    { title: "İstanbul Otelleri", subtitle: "Şehir merkezi ve Boğaz", icon: "🌉", href: `${TURIZM.konaklama.home}?city=İstanbul` },
    { title: "Kapadokya Otelleri", subtitle: "Mağara ve butik oteller", icon: "🎈", href: `${TURIZM.konaklama.home}?city=Kapadokya` },
  ],
  villa: [
    { title: "Bodrum Villaları", subtitle: "Deniz manzaralı tatil evleri", icon: "⛱️", href: `${TURIZM.villaEv.home}?city=Bodrum` },
    { title: "Fethiye Villaları", subtitle: "Havuzlu ve doğa içi", icon: "🌴", href: `${TURIZM.villaEv.home}?city=Fethiye` },
    { title: "Kaş Villaları", subtitle: "Sakin koy ve villa", icon: "🐚", href: `${TURIZM.villaEv.home}?city=Kaş` },
  ],
  tour: [
    { title: "Kapadokya Turları", subtitle: "Balon ve vadiler", icon: "🎈", href: `${TURIZM.turlar.home}?city=Kapadokya` },
    { title: "Ege Turları", subtitle: "Antik kent ve koylar", icon: "🏛️", href: TURIZM.turlar.home },
    { title: "Destinasyonlar", subtitle: "Türkiye rotaları", icon: "🗺️", href: TURIZM.turlar.destinasyonlar },
  ],
  car: [
    { title: "Havalimanı Transfer", subtitle: "Araç kiralama", icon: "✈️", href: TURIZM.arac.home },
    { title: "Günlük Kiralama", subtitle: "Ekonomik ve SUV", icon: "🚗", href: TURIZM.arac.home },
    { title: "Haftalık Paket", subtitle: "Uzun dönem araç", icon: "🗓️", href: TURIZM.arac.home },
  ],
  boat: [
    { title: "Bodrum Mavi Tur", subtitle: "Günübirlik tekne", icon: "⛱️", href: TURIZM.yat.home },
    { title: "Fethiye Koyları", subtitle: "Mavi tur rotaları", icon: "🌊", href: `${TURIZM.yat.home}?city=Fethiye` },
    { title: "Yat Kiralama", subtitle: "Özel tekne ve gulet", icon: "🛥️", href: TURIZM.yat.home },
  ],
};

const CITY_CHIPS = new Set([
  "Antalya",
  "İstanbul",
  "Bodrum",
  "Kapadokya",
  "Fethiye",
  "Kaş",
  "Marmaris",
  "Muğla",
  "İzmir",
  "Efes",
]);

function money(value: number | string | null | undefined, digits = 0): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "Keşfet";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: digits,
  }).format(n);
}

function categoryHref(tab: HomeTravelTabId, chip: CategoryChip, seeAllHref: string): string {
  if (chip.href) return chip.href;
  if (CITY_CHIPS.has(chip.name)) {
    return `${seeAllHref}?city=${encodeURIComponent(chip.name)}`;
  }
  return `${seeAllHref}?q=${encodeURIComponent(chip.name)}`;
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

function TravelListingCard({ listing }: { listing: TourismListing }) {
  const img = resolveClientMediaSrc(listing.image_url ?? null);
  const href = listing.href || tourismSearchPath(listing.type);
  const price = Number(listing.sale_price || listing.price || 0);
  const rating = Number(listing.star_rating ?? listing.rating ?? 0);
  return (
    <Link
      href={String(href)}
      className="group w-44 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg sm:w-48"
    >
      <div className="relative h-28 overflow-hidden bg-sky-50 sm:h-32">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">🏨</div>
        )}
        {listing.is_featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-white">
            Öne çıkan
          </span>
        ) : null}
      </div>
      <div className="p-2.5 sm:p-3">
        <h4 className="line-clamp-2 text-xs font-black leading-snug text-slate-950 group-hover:text-[#039D55] sm:text-sm">
          {listing.title}
        </h4>
        {listing.city ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]">{listing.city}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="text-[10px] font-black text-[#039D55] sm:text-xs">
            {listing.map_business_fallback ? "Keşfet" : money(price)}
          </span>
          {rating > 0 ? (
            <span className="text-[10px] font-bold text-amber-500 sm:text-xs">★ {rating.toFixed(1)}</span>
          ) : null}
        </div>
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
      <div className="grid h-28 place-items-center bg-gradient-to-br from-sky-50 to-emerald-50 text-4xl sm:h-32">{icon}</div>
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

function useHomeTravelTabData(tab: HomeTravelTabId) {
  const { listings, loading } = useTourismListings({ type: tab, limit: 12 });
  const popular = useMemo(() => listings.slice(0, 12), [listings]);
  return { listings: popular, loading };
}

export function HomeTravelTabs() {
  const [tab, setTab] = useState<HomeTravelTabId>("hotel");
  const tabMeta = HOME_TRAVEL_TABS.find((t) => t.id === tab) ?? HOME_TRAVEL_TABS[0];
  const copy = TAB_COPY[tab];
  const { listings, loading } = useHomeTravelTabData(tab);

  const categoryChips = useMemo(
    () =>
      HOME_TAB_CATEGORIES[tab].map((chip) => ({
        ...chip,
        href: categoryHref(tab, chip, tabMeta.seeAllHref),
      })),
    [tab, tabMeta.seeAllHref],
  );

  const showListingRail = listings.length > 0;
  const showStaticRail = !loading && !showListingRail;
  const staticCards = STATIC_ROUTE_CARDS[tab];

  return (
    <section className="sixam-section mx-auto w-full max-w-[1440px] px-4 py-6">
      <div className="mb-4">
        <h2 className="text-[22px] font-black tracking-tight text-slate-950">Seyahat</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Otel, villa, tur, araç ve tekne — kategori ve popüler ilan vitrinleri.
        </p>
      </div>

      <div
        className="mb-5 flex rounded-2xl border border-emerald-100 bg-emerald-50/60 p-1"
        role="tablist"
        aria-label="Seyahat sekmeleri"
      >
        {HOME_TRAVEL_TABS.map(({ id, label, icon: Icon }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[10px] font-black transition sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
                selected ? "bg-white text-[#039D55] shadow-sm ring-1 ring-emerald-100" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="line-clamp-1">{label}</span>
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

        {showListingRail ? (
          <div>
            <RailHeading title={copy.popularTitle} subtitle={copy.popularSubtitle} seeAllHref={tabMeta.seeAllHref} />
            <Rail>
              {listings.map((listing) => (
                <TravelListingCard key={listing.id} listing={listing} />
              ))}
            </Rail>
          </div>
        ) : null}

        {loading && !showListingRail ? (
          <div>
            <RailHeading title={copy.popularTitle} subtitle={copy.popularSubtitle} seeAllHref={tabMeta.seeAllHref} />
            <Rail>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-52 w-44 shrink-0 animate-pulse rounded-2xl bg-slate-100 sm:w-48" />
              ))}
            </Rail>
          </div>
        ) : null}

        {showStaticRail ? (
          <div>
            <RailHeading title={copy.popularTitle} subtitle={copy.popularSubtitle} seeAllHref={tabMeta.seeAllHref} />
            <Rail>
              {staticCards.map((card) => (
                <StaticRouteCard key={card.title} {...card} />
              ))}
            </Rail>
          </div>
        ) : null}
      </div>
    </section>
  );
}
