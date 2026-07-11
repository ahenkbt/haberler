import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, MapPin, Star, Clock, Tag, Heart, Flame, Store,
  ChevronRight, ChevronLeft, ShoppingBag, Smartphone, BadgePercent,
} from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { SadeLocationPickerModal } from "@/components/SadeLocationPickerModal";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import {
  DELIVERY_MODULES,
  type DeliveryBusinessModule,
  deliveryCategoryBelongsToModule,
  deliveryVendorBelongsToModule,
} from "@/lib/deliveryModuleGroups";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { SADE_HERO_EYEBROW_CLASS, SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_PAGE_BG_SIPARIS, SADE_PUBLIC_POST_HERO_MAIN_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";

const API = "/api";
const LOC_KEY = "yekpare_siparis_location_v4";
const LOC_KEY_LEGACY = "goalgo_user_location";

/* 6amMart açık tema renkleri */
const GREEN = "#039D55";
const GREEN_DEEP = "#026034";
const GREEN_LIGHT = "#EBFDF2";

/* ─── Tipler ─── */
export interface SiparisVendor {
  id: number; name: string; slug: string; description: string;
  storefrontHref?: string;
  categoryId: number; imageUrl: string; coverUrl: string;
  city: string; district: string; address: string;
  deliveryFee: string; minOrderAmount: string; deliveryTime: number;
  rating: number; reviewCount: number; isOpen: boolean; featured: boolean;
  tags: string[]; createdAt?: string;
}
interface VendorCategory {
  id: number; name: string; slug: string; icon: string; imageUrl?: string | null; position: number; superCategory?: string;
}
type Vendor = SiparisVendor;
export interface RailItem {
  id: number; name: string; description?: string | null;
  price: string; salePrice?: string | null; imageUrl?: string | null; isPopular?: boolean;
  vendorId: number; vendorName: string; vendorSlug: string;
  vendorRating: number; vendorReviewCount: number;
  vendorCity?: string | null; vendorDistrict?: string | null;
  vendorIsOpen?: boolean; vendorDeliveryTime?: number; vendorImageUrl?: string | null;
}

export interface ModuleBanner {
  id: number; module: string; title?: string | null; imageUrl: string; linkUrl?: string | null; position: number;
}

/** Admin yönetimli vitrin bannerları (yoksa boş liste — statik görseller devrede kalır). */
export function useModuleBanners(moduleKey: string): ModuleBanner[] {
  const [banners, setBanners] = useState<ModuleBanner[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/delivery/module-banners?module=${encodeURIComponent(moduleKey)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) setBanners(Array.isArray(d) ? d.filter((b) => b && b.imageUrl) : []);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleKey]);
  return banners;
}

/** Kampanya banner şeridi: tek görsel geniş bant, çoklu görsel yatay ray. */
export function AdminBannerRail({ banners }: { banners: ModuleBanner[] }) {
  if (banners.length === 0) return null;
  const renderBanner = (b: ModuleBanner, wide: boolean) => {
    const img = resolveClientMediaSrc(b.imageUrl);
    const inner = (
      <div
        className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${wide ? "w-full" : "w-[320px] shrink-0 md:w-[420px]"}`}
      >
        <img
          src={img}
          alt={b.title || "Kampanya"}
          className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${wide ? "max-h-72 min-h-[140px]" : "h-40 md:h-48"}`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        {b.title && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {b.title}
          </span>
        )}
      </div>
    );
    if (b.linkUrl) {
      const external = /^https?:\/\//i.test(b.linkUrl);
      return external ? (
        <a key={b.id} href={b.linkUrl} className={wide ? "block" : "shrink-0"} target="_blank" rel="noopener noreferrer">{inner}</a>
      ) : (
        <Link key={b.id} href={b.linkUrl} className={wide ? "block" : "shrink-0"}>{inner}</Link>
      );
    }
    return <div key={b.id} className={wide ? "" : "shrink-0"}>{inner}</div>;
  };
  if (banners.length === 1) return <section>{renderBanner(banners[0], true)}</section>;
  return (
    <section>
      <div className="yekpare-scrollbar flex gap-3 overflow-x-auto pb-2">
        {banners.map((b) => renderBanner(b, false))}
      </div>
    </section>
  );
}

interface SavedLocation {
  filterOn: boolean; city: string; district: string; mahalle?: string; timestamp?: number;
}

function loadSavedLocation(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    if (!raw) return null;
    const loc = JSON.parse(raw) as SavedLocation;
    const age = Date.now() - (loc.timestamp ?? 0);
    if (age > 24 * 60 * 60 * 1000) { localStorage.removeItem(LOC_KEY); return null; }
    if (!loc.filterOn || !loc.city?.trim()) return null;
    return loc;
  } catch { return null; }
}
function saveLocation(loc: Omit<SavedLocation, "timestamp">) {
  try {
    localStorage.setItem(LOC_KEY, JSON.stringify({ ...loc, filterOn: true, timestamp: Date.now() }));
    localStorage.removeItem(LOC_KEY_LEGACY);
  } catch { /* yok say */ }
}

function tl(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  if (!Number.isFinite(n)) return "0₺";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}₺`;
}
function discountPercent(price: string, salePrice?: string | null): number | null {
  const p = parseFloat(price); const s = parseFloat(String(salePrice ?? ""));
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0 || s >= p) return null;
  return Math.round(((p - s) / p) * 100);
}
function deliveryFeeLabel(fee: string) {
  const n = parseFloat(fee ?? "0");
  return n === 0 ? "Ücretsiz teslimat" : `${n.toFixed(0)}₺ teslimat`;
}

/* ─── Modül vitrini metinleri (6amMart yemek / market / eczane akışı esas alındı) ─── */
const VITRIN_CONFIG: Record<DeliveryBusinessModule, {
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  categoriesTitle: string;
  recommendedTitle: string;
  offersTitle: string;
  popularItemsTitle: string;
  popularItemsSubtitle?: string;
  bestTitle: string;
  newStoresTitle: string;
  storesTitle: string;
  storeWord: string;
  emptyTitle: string;
  emptyText: string;
  fallbackCategories: Array<{ name: string; icon: string }>;
}> = {
  food: {
    heroTitle: "Canın ne çekiyor?",
    heroSubtitle: "Restoran, kafe, pastane, simit ve börek işletmelerinden sofrana sıcak lezzetler",
    searchPlaceholder: "Yemek veya restoran ara...",
    categoriesTitle: "Yemek Kategorileri",
    recommendedTitle: "Önerilen Restoranlar",
    offersTitle: "Günün Yemek Fırsatları",
    popularItemsTitle: "Yakınındaki Popüler Lezzetler",
    bestTitle: "En Çok Beğenilen Lezzetler",
    newStoresTitle: "Yeni Açılan Restoranlar",
    storesTitle: "Restoranlar",
    storeWord: "restoran",
    emptyTitle: "Bu bölgede henüz yemek işletmesi yok",
    emptyText: "Restoran, kafe, pastane veya benzer yemek işletmeleri eklendikçe burada listelenir.",
    fallbackCategories: [
      { name: "Restoran", icon: "🍽️" }, { name: "Kebap", icon: "🍢" }, { name: "Pide & Lahmacun", icon: "🫓" },
      { name: "Döner", icon: "🌯" }, { name: "Burger", icon: "🍔" }, { name: "Pizza", icon: "🍕" },
      { name: "Çiğ Köfte", icon: "🌶️" }, { name: "Köfte", icon: "🧆" }, { name: "Tavuk", icon: "🍗" },
      { name: "Ev Yemekleri", icon: "🍲" }, { name: "Çorba", icon: "🥣" }, { name: "Salata", icon: "🥗" },
      { name: "Deniz Ürünleri", icon: "🐟" }, { name: "Kahvaltı", icon: "🍳" }, { name: "Büfe & Tost", icon: "🥪" },
      { name: "Kafe", icon: "☕" }, { name: "Pastane", icon: "🍰" }, { name: "Tatlı", icon: "🍮" },
      { name: "Künefe & Baklava", icon: "🥮" }, { name: "Dondurma", icon: "🍨" }, { name: "Simit", icon: "🥨" },
      { name: "Börek", icon: "🥐" }, { name: "Vegan", icon: "🥬" },
    ],
  },
  market: {
    heroTitle: "Günlük ihtiyaçların kapında",
    heroSubtitle: "Market, manav, kuruyemiş, kasap, şarküteri, fırın, su ve içecek işletmeleri tek vitrinde",
    searchPlaceholder: "Ürün veya market ara...",
    categoriesTitle: "Market Kategorileri",
    recommendedTitle: "Önerilen Marketler",
    offersTitle: "İndirimli Ürünler",
    popularItemsTitle: "En Popüler Ürünler",
    popularItemsSubtitle: "Konumuna en yakın işletmelerden taze ve kaliteli ürünler",
    bestTitle: "En Çok Beğenilen Ürünler",
    newStoresTitle: "Yeni Açılan Marketler",
    storesTitle: "Marketler",
    storeWord: "market",
    emptyTitle: "Bu bölgede henüz market işletmesi yok",
    emptyText: "Market, manav, kasap, şarküteri, fırın, su veya içecek işletmeleri eklendikçe burada listelenir.",
    fallbackCategories: [
      { name: "Market", icon: "🛒" }, { name: "Manav", icon: "🥦" }, { name: "Kuruyemiş", icon: "🥜" },
      { name: "Aktar", icon: "🌿" }, { name: "Tavuk", icon: "🍗" }, { name: "Kasap", icon: "🥩" },
      { name: "Şarküteri", icon: "🧀" }, { name: "Fırın", icon: "🍞" }, { name: "Yufka", icon: "🫓" },
      { name: "Su", icon: "💧" }, { name: "İçecek", icon: "🥤" }, { name: "Balıkçı", icon: "🐟" },
    ],
  },
  nearby: {
    heroTitle: "Yakınındaki işletmeler kapında",
    heroSubtitle: "Yapı market, elektronik, giyim, petshop, kozmetik, çiçekçi ve daha fazlası",
    searchPlaceholder: "Ürün veya işletme ara...",
    categoriesTitle: "İşletme Kategorileri",
    recommendedTitle: "Önerilen İşletmeler",
    offersTitle: "Fırsat Ürünleri",
    popularItemsTitle: "Yakınındaki Popüler Ürünler",
    bestTitle: "En Çok Beğenilen Ürünler",
    newStoresTitle: "Yeni Katılan İşletmeler",
    storesTitle: "İşletmeler",
    storeWord: "işletme",
    emptyTitle: "Bu bölgede henüz kayıtlı işletme yok",
    emptyText: "Yemek ve market dışındaki yerel işletmeler eklendikçe bu vitrinde listelenir.",
    fallbackCategories: [
      { name: "Yapı Market", icon: "🛠️" }, { name: "Elektronik", icon: "📱" },
      { name: "Giyim", icon: "👕" }, { name: "Moda", icon: "👗" }, { name: "Petshop", icon: "🐾" },
      { name: "Kozmetik", icon: "💄" }, { name: "Hediyelik", icon: "🎁" }, { name: "Bijuteri", icon: "💍" },
      { name: "Çiçekçi", icon: "💐" }, { name: "Ayakkabıcı", icon: "👟" }, { name: "Nalburiye", icon: "🔩" },
    ],
  },
};

type ModuleQuickAction =
  | { kind: "scroll"; label: string }
  | { kind: "fastDelivery"; label: string }
  | { kind: "link"; label: string; href: string };

const MODULE_QUICK_ACTIONS: Record<DeliveryBusinessModule, ModuleQuickAction[]> = {
  food: [
    { kind: "scroll", label: "Yakınımdaki restoranlar" },
    { kind: "scroll", label: "Paket servis" },
  ],
  market: [
    { kind: "scroll", label: "Yakınımdaki marketler" },
    { kind: "fastDelivery", label: "Hızlı teslimat" },
  ],
  nearby: [
    { kind: "link", label: "Haritada göster", href: "/haritalar" },
    { kind: "link", label: "İşletme ekle", href: "/isletme-basvuru" },
  ],
};

const GLASS_PILL =
  "inline-flex items-center justify-center rounded-[12px] border border-white/60 bg-white/45 px-3 py-2 text-xs font-black text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white/80 hover:text-[#039D55] sm:px-4 sm:py-2.5";

/* ─── Bölüm başlığı: sol başlık + sağda "Tümünü Gör" ─── */
export function SectionHeading({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 md:text-sm">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: GREEN }}
        >
          Tümünü Gör <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ─── Yatay kaydırmalı ray + ok butonları ─── */
export function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <div className="group/rail relative">
      <button
        type="button" aria-label="Geri kaydır" onClick={() => scroll(-1)}
        className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 sm:flex"
      >
        <ChevronLeft className="h-4 w-4 text-gray-600" />
      </button>
      <div ref={ref} className="yekpare-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2">
        {children}
      </div>
      <button
        type="button" aria-label="İleri kaydır" onClick={() => scroll(1)}
        className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 sm:flex"
      >
        <ChevronRight className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  );
}

/* ─── Yuvarlak kategori kartı (6amMart kategori rayı görünümü) ─── */
function CategoryCircle({ name, icon, imageUrl, active, onClick }: {
  name: string; icon?: string; imageUrl?: string | null; active?: boolean; onClick: () => void;
}) {
  const img = resolveClientMediaSrc(imageUrl ?? "");
  return (
    <button type="button" onClick={onClick} className="group flex w-24 shrink-0 flex-col items-center gap-2">
      <span
        className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border bg-white text-3xl shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ borderColor: active ? GREEN : "#eef0f3", boxShadow: active ? `0 0 0 2px ${GREEN}` : undefined }}
      >
        {img ? (
          <img src={img} alt={name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <span>{icon || "🏷️"}</span>
        )}
      </span>
      <span className={`line-clamp-2 text-center text-xs font-semibold leading-tight ${active ? "" : "text-gray-700"}`} style={active ? { color: GREEN } : undefined}>
        {name}
      </span>
    </button>
  );
}

/* ─── Mağaza kartı (6amMart StoreCard görünümü) ─── */
export function StoreCard({ vendor, compact }: { vendor: Vendor; compact?: boolean }) {
  const { isFavorite, toggleFavorite, user } = useCustomerAuth();
  const fav = isFavorite(vendor.id);
  const href = vendor.storefrontHref || `/siparis/satici/${vendor.slug}`;
  const isExternal = /^https?:\/\//i.test(href);
  const coverSrc = resolveClientMediaSrc(vendor.coverUrl || vendor.imageUrl);
  const logoSrc = resolveClientMediaSrc(vendor.imageUrl);
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const cover = coverFailed ? "" : coverSrc;
  const logo = logoFailed ? "" : logoSrc;

  const card = (
    <div className={`group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${compact ? "w-60 shrink-0" : "w-full"}`}>
      <div className={`relative overflow-hidden bg-gray-100 ${compact ? "h-32" : "h-40"}`}>
        {cover ? (
          <img src={cover} alt={vendor.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={() => setCoverFailed(true)} />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl" style={{ background: GREEN_LIGHT }}>🏪</div>
        )}
        {vendor.featured && (
          <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: GREEN }}>
            <Flame className="h-2.5 w-2.5" /> Öne Çıkan
          </span>
        )}
        {user && (
          <button
            type="button" aria-label="Favorilere ekle"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleFavorite(vendor.id); }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition"
            style={{ background: fav ? "#e61e25" : "rgba(255,255,255,0.9)" }}
          >
            <Heart className="h-3.5 w-3.5" style={{ color: fav ? "#fff" : "#e61e25", fill: fav ? "#fff" : "none" }} />
          </button>
        )}
        {!vendor.isOpen && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">Yakında Açılıyor</span>
          </div>
        )}
        <span className="absolute -bottom-4 left-3 grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-cover" onError={() => setLogoFailed(true)} />
          ) : (
            <Store className="h-5 w-5 text-gray-400" />
          )}
        </span>
      </div>
      <div className="p-3 pt-5">
        <h3 className="line-clamp-1 text-sm font-bold leading-tight text-gray-900">{vendor.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="line-clamp-1">{[vendor.district, vendor.city].filter(Boolean).join(", ") || "Türkiye"}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-0.5 font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {vendor.rating.toFixed(1)}
            <span className="font-normal text-gray-400">({vendor.reviewCount})</span>
          </span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {vendor.deliveryTime} dk</span>
          <span className="flex items-center gap-0.5"><Tag className="h-3 w-3" /> {deliveryFeeLabel(vendor.deliveryFee)}</span>
        </div>
      </div>
    </div>
  );

  if (isExternal) return <a href={href} className="block">{card}</a>;
  return <Link href={href}>{card}</Link>;
}

/* ─── Dikey ürün kartı (6amMart ProductCard görünümü) ─── */
export function ItemCardVertical({ item }: { item: RailItem }) {
  const img = resolveClientMediaSrc(item.imageUrl ?? "");
  const pct = discountPercent(item.price, item.salePrice);
  const href = `/siparis/satici/${item.vendorSlug}`;
  return (
    <Link href={href}>
      <div className="group w-44 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative h-32 overflow-hidden bg-gray-50">
          {img ? (
            <img src={img} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl" style={{ background: GREEN_LIGHT }}>🛍️</div>
          )}
          {pct != null && (
            <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: GREEN }}>
              %{pct} indirim
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{item.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{item.vendorName}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(item.vendorRating ?? 0).toFixed(1)}
            <span className="font-normal text-gray-400">({item.vendorReviewCount ?? 0})</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {pct != null && <span className="text-[11px] text-gray-400 line-through">{tl(item.price)}</span>}
            <span className="text-sm font-black" style={{ color: GREEN_DEEP }}>{tl(pct != null ? item.salePrice : item.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Yatay ürün kartı (6amMart yemek modülündeki iki sıralı ray görünümü) ─── */
function ItemCardHorizontal({ item }: { item: RailItem }) {
  const img = resolveClientMediaSrc(item.imageUrl ?? "");
  const pct = discountPercent(item.price, item.salePrice);
  return (
    <Link href={`/siparis/satici/${item.vendorSlug}`}>
      <div className="flex w-80 shrink-0 cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50">
          {img ? (
            <img src={img} alt={item.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="grid h-full w-full place-items-center text-2xl" style={{ background: GREEN_LIGHT }}>🍽️</div>
          )}
          {pct != null && (
            <span className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: GREEN }}>
              %{pct}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{item.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{item.vendorName}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(item.vendorRating ?? 0).toFixed(1)}
            <span className="font-normal text-gray-400">({item.vendorReviewCount ?? 0})</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            {pct != null && <span className="text-[11px] text-gray-400 line-through">{tl(item.price)}</span>}
            <span className="text-sm font-black" style={{ color: GREEN_DEEP }}>{tl(pct != null ? item.salePrice : item.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Öne çıkan işletme kartı (6amMart eczane modülü "Featured Store" görünümü) ─── */
function FeaturedStoreWide({ vendor }: { vendor: Vendor }) {
  const href = vendor.storefrontHref || `/siparis/satici/${vendor.slug}`;
  const isExternal = /^https?:\/\//i.test(href);
  const logo = resolveClientMediaSrc(vendor.imageUrl || vendor.coverUrl);
  const inner = (
    <div className="flex w-80 shrink-0 cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" style={{ background: "#E4FFF3" }}>
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white bg-white shadow-sm">
        {logo ? (
          <img src={logo} alt={vendor.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Store className="h-6 w-6 text-gray-400" />
        )}
      </span>
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{vendor.name}</h3>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="line-clamp-1">{[vendor.district, vendor.city].filter(Boolean).join(", ") || "Türkiye"}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
          <span className="flex items-center gap-0.5 font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {vendor.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {vendor.deliveryTime} dk</span>
        </div>
      </div>
    </div>
  );
  if (isExternal) return <a href={href} className="block">{inner}</a>;
  return <Link href={href}>{inner}</Link>;
}

/* ─── İkili tanıtım bannerı (6amMart statik banner çifti görünümü) ─── */
function PromoBannerPair({ storeWord, onSeeAll }: { storeWord: string; onSeeAll: () => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="relative flex min-h-[150px] flex-col justify-center overflow-hidden rounded-2xl p-6" style={{ background: `linear-gradient(120deg, ${GREEN_DEEP}, ${GREEN})` }}>
        <span className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <span className="absolute -bottom-10 right-12 h-24 w-24 rounded-full bg-white/10" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Hızlı teslimat</p>
        <h3 className="mt-1 max-w-[260px] text-lg font-black leading-snug text-white">Siparişin kapına gelsin, vakit kaybetme</h3>
        <button type="button" onClick={onSeeAll} className="mt-3 w-fit rounded-full bg-white px-4 py-2 text-xs font-bold transition hover:bg-gray-100" style={{ color: GREEN_DEEP }}>
          Hemen Sipariş Ver
        </button>
      </div>
      <div className="relative flex min-h-[150px] flex-col justify-center overflow-hidden rounded-2xl border border-gray-100 p-6" style={{ background: GREEN_LIGHT }}>
        <span className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full" style={{ background: "rgba(3,157,85,0.12)" }} />
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: GREEN }}>İşletme sahibi misin?</p>
        <h3 className="mt-1 max-w-[280px] text-lg font-black leading-snug text-gray-900">Sen de {storeWord} vitrinine katıl, satışa başla</h3>
        <a href="/servis-saglayici-giris" className="mt-3 w-fit rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90" style={{ background: GREEN }}>
          İşletmeni Ekle
        </a>
      </div>
    </div>
  );
}

/* ─── Geniş kampanya bannerı ─── */
function WideCampaignBanner({ onSeeAll, title, text }: { onSeeAll: () => void; title: string; text: string }) {
  return (
    <div className="relative flex flex-col items-start justify-center gap-2 overflow-hidden rounded-2xl p-6 md:flex-row md:items-center md:justify-between" style={{ background: `linear-gradient(100deg, ${GREEN_DEEP}, ${GREEN} 70%, #0DCB72)` }}>
      <span className="absolute -left-8 -bottom-10 h-36 w-36 rounded-full bg-white/10" />
      <span className="absolute right-24 -top-10 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-center gap-2 text-white">
          <BadgePercent className="h-5 w-5" />
          <h3 className="text-lg font-black md:text-xl">{title}</h3>
        </div>
        <p className="mt-1 max-w-xl text-sm text-white/85">{text}</p>
      </div>
      <button type="button" onClick={onSeeAll} className="relative w-fit shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-gray-100" style={{ color: GREEN_DEEP }}>
        Fırsatları Keşfet
      </button>
    </div>
  );
}

/* ─── Mobil uygulama bannerı (6amMart uygulama bölümü görünümü) ─── */
function AppDownloadBanner() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: GREEN_LIGHT }}>
          <Smartphone className="h-7 w-7" style={{ color: GREEN }} />
        </span>
        <div>
          <h3 className="text-base font-black text-gray-900 md:text-lg">Yekpare cebinde, sipariş bir dokunuş uzağında</h3>
          <p className="mt-0.5 text-sm text-gray-500">Uygulamayı telefonuna ekle; kampanyaları ve sipariş durumunu anında takip et.</p>
        </div>
      </div>
      <a href="/uygulamayi-indir" className="w-fit shrink-0 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: GREEN }}>
        Uygulamayı İndir
      </a>
    </div>
  );
}

/* ─── Ana bileşen ─── */
export default function SiparisModulVitrin({
  moduleKey,
  hideModuleHeroSearch = false,
}: {
  moduleKey: DeliveryBusinessModule;
  /** Header arama varken hero içindeki tekrarlayan arama kutusunu gizle */
  hideModuleHeroSearch?: boolean;
}) {
  const cfg = VITRIN_CONFIG[moduleKey];
  const moduleMeta = DELIVERY_MODULES.find((m) => m.key === moduleKey);
  const { data: siteSettings } = useGetSiteSettings();
  const adminBanners = useModuleBanners(moduleKey);

  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [offerItems, setOfferItems] = useState<RailItem[]>([]);
  const [popularItems, setPopularItems] = useState<RailItem[]>([]);

  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [categoryTextFilter, setCategoryTextFilter] = useState("");
  const [storeTab, setStoreTab] = useState<"all" | "new" | "popular" | "top">("all");

  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [locationFilterOn, setLocationFilterOn] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [fastDeliveryFilter, setFastDeliveryFilter] = useState(false);
  const [publicLocLabel, setPublicLocLabel] = useState("Konumun");

  const storesRef = useRef<HTMLDivElement>(null);
  const scrollToStores = useCallback(() => {
    storesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const effCity = locationFilterOn ? city : "";
  const effDistrict = locationFilterOn ? district : "";

  const applyPublicLocation = useCallback((loc: PublicLocationState | null) => {
    if (!loc?.city?.trim()) {
      setPublicLocLabel("Konumun");
      return;
    }
    setCity(loc.city.trim());
    setDistrict(loc.district.trim());
    setNeighborhood("");
    setLocationFilterOn(true);
    saveLocation({ filterOn: true, city: loc.city.trim(), district: loc.district.trim(), mahalle: "" });
    setPublicLocLabel(formatPublicLocationLabel(loc, "Konumun"));
  }, []);

  /* İlk açılış: URL parametreleri + kayıtlı konum */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kat = params.get("kategori");
    const sehir = params.get("sehir");
    if (kat) setCategoryTextFilter(kat);
    const saved = loadSavedLocation();
    if (saved) {
      setCity(saved.city); setDistrict(saved.district || ""); setNeighborhood(saved.mahalle || "");
      setLocationFilterOn(true);
      setPublicLocLabel([saved.district, saved.city].filter(Boolean).join(", ") || "Konumun");
    } else if (sehir) {
      setCity(sehir); setLocationFilterOn(true);
      setPublicLocLabel(sehir);
    } else {
      applyPublicLocation(readPublicLocation());
    }
  }, [applyPublicLocation]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      applyPublicLocation((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, [applyPublicLocation]);

  /* Kategoriler */
  useEffect(() => {
    fetch(`${API}/delivery/categories?module=${encodeURIComponent(moduleKey)}`)
      .then((r) => r.json())
      .then((all: VendorCategory[]) => {
        const rows = (Array.isArray(all) ? all : [])
          .filter((c) => (c as any).superCategory === "siparis" || !(c as any).superCategory || (c as any).superCategory === "her_ikisi")
          .filter((c) => deliveryCategoryBelongsToModule(c, moduleKey))
          .sort((a, b) => a.position - b.position);
        setCategories(rows);
      })
      .catch(() => setCategories([]));
  }, [moduleKey]);

  /* İşletmeler */
  useEffect(() => {
    setVendorsLoading(true);
    let url = `${API}/delivery/vendors?type=delivery&limit=80&module=${encodeURIComponent(moduleKey)}`;
    if (effCity) url += `&city=${encodeURIComponent(effCity)}`;
    if (effDistrict) url += `&district=${encodeURIComponent(effDistrict)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const rows = (Array.isArray(d) ? d : []) as Vendor[];
        // API zaten modüle göre filtreler; kategori listesi yüklüyse sızıntıya karşı ikinci kontrol yapılır.
        setVendors(
          categories.length === 0
            ? rows
            : rows.filter(
                (v) =>
                  categories.some((c) => String(c.id) === String(v.categoryId)) ||
                  deliveryVendorBelongsToModule(v, categories, moduleKey),
              ),
        );
      })
      .catch(() => setVendors([]))
      .finally(() => setVendorsLoading(false));
    // categories yüklendiğinde sızıntı filtresi tazelensin diye categories bağımlılıkta
  }, [moduleKey, effCity, effDistrict, categories]);

  /* Ürün rayları */
  useEffect(() => {
    const base = `${API}/delivery/module-items?module=${encodeURIComponent(moduleKey)}${effCity ? `&city=${encodeURIComponent(effCity)}` : ""}`;
    fetch(`${base}&discounted=1&limit=20`)
      .then((r) => r.json())
      .then((d) => setOfferItems(Array.isArray(d) ? d : []))
      .catch(() => setOfferItems([]));
    fetch(`${base}&limit=24`)
      .then((r) => r.json())
      .then((d) => setPopularItems(Array.isArray(d) ? d : []))
      .catch(() => setPopularItems([]));
  }, [moduleKey, effCity]);

  /* Konum kaydet/temizle */
  function clearLocation() {
    localStorage.removeItem(LOC_KEY);
    localStorage.removeItem(LOC_KEY_LEGACY);
    setCity(""); setDistrict(""); setNeighborhood("");
    setLocationFilterOn(false);
    setPublicLocLabel("Konumun");
  }

  function handleQuickAction(action: ModuleQuickAction) {
    if (action.kind === "link") return;
    setActiveCategoryId(null);
    setCategoryTextFilter("");
    setCommittedSearch("");
    if (action.kind === "fastDelivery") {
      setFastDeliveryFilter(true);
      setStoreTab("all");
    } else {
      setFastDeliveryFilter(false);
    }
    scrollToStores();
  }

  /* Vitrin dilimleri */
  const recommended = useMemo(() => {
    const featured = vendors.filter((v) => v.featured && v.isOpen);
    const rest = vendors.filter((v) => !v.featured && v.isOpen);
    return [...featured, ...rest].slice(0, 12);
  }, [vendors]);

  const newStores = useMemo(() => {
    return [...vendors]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 12);
  }, [vendors]);

  const featuredWide = useMemo(() => {
    const featured = vendors.filter((v) => v.featured);
    return (featured.length > 0 ? featured : [...vendors].sort((a, b) => b.rating - a.rating)).slice(0, 10);
  }, [vendors]);

  const bestItems = useMemo(() => {
    return [...popularItems].sort((a, b) => Number(b.vendorRating ?? 0) - Number(a.vendorRating ?? 0)).slice(0, 16);
  }, [popularItems]);

  /* Alttaki işletme listesi: sekme + kategori + arama */
  const storeList = useMemo(() => {
    let rows = [...vendors];
    if (activeCategoryId != null) rows = rows.filter((v) => v.categoryId === activeCategoryId);
    const text = (categoryTextFilter || committedSearch).trim().toLocaleLowerCase("tr-TR");
    if (text) {
      rows = rows.filter((v) =>
        [v.name, v.description, v.city, v.district, ...(Array.isArray(v.tags) ? v.tags : [])]
          .filter(Boolean)
          .some((field) => String(field).toLocaleLowerCase("tr-TR").includes(text)),
      );
    }
    if (fastDeliveryFilter) {
      rows = rows.filter((v) => Number(v.deliveryTime ?? 999) <= 45);
      rows.sort((a, b) => Number(a.deliveryTime ?? 999) - Number(b.deliveryTime ?? 999));
    } else if (storeTab === "new") {
      rows.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else if (storeTab === "popular") {
      rows.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (storeTab === "top") {
      rows.sort((a, b) => b.rating - a.rating);
    }
    return rows;
  }, [vendors, activeCategoryId, categoryTextFilter, committedSearch, storeTab, fastDeliveryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCommittedSearch(search);
    setCategoryTextFilter("");
    setActiveCategoryId(null);
    scrollToStores();
  };

  const selectCategory = (cat: VendorCategory | null) => {
    setActiveCategoryId(cat ? cat.id : null);
    setCategoryTextFilter("");
    setCommittedSearch("");
    scrollToStores();
  };
  const selectFallbackCategory = (name: string) => {
    setActiveCategoryId(null);
    setCommittedSearch("");
    setCategoryTextFilter(name);
    scrollToStores();
  };

  /* DB kategorileri + DB'de karşılığı olmayan standart modül kategorileri (tam kategori seti) */
  const extraCategories = useMemo(() => {
    if (categories.length === 0) return [] as Array<{ name: string; icon: string }>;
    const dbNames = categories.map((c) => c.name.toLocaleLowerCase("tr-TR"));
    return cfg.fallbackCategories.filter((f) => {
      const fname = f.name.toLocaleLowerCase("tr-TR");
      return !dbNames.some((n) => n.includes(fname) || fname.includes(n));
    });
  }, [categories, cfg]);

  const locLabel = locationFilterOn && city ? [neighborhood, district, city].filter(Boolean).join(", ") : null;
  const storeTabs: Array<{ key: typeof storeTab; label: string }> = [
    { key: "all", label: "Tümü" },
    { key: "new", label: "Yeni Katılanlar" },
    { key: "popular", label: "Popüler" },
    { key: "top", label: "En Çok Puanlanan" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FCFCFD" }}>
      {/* ÜST BANNER + ARAMA — arama kartı hero içinde, negatif overlap yok */}
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <section className={`${SADE_PUBLIC_HERO_SURFACE_CLASS} w-full`} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_SIPARIS)}>
          <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} text-center`}>
            <p className={SADE_HERO_EYEBROW_CLASS}>{moduleMeta?.label ?? ""}</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-4xl">{cfg.heroTitle}</h1>
            <p className="mt-2 max-w-2xl mx-auto text-sm font-semibold text-slate-600 md:text-base">{cfg.heroSubtitle}</p>
          {!hideModuleHeroSearch ? (
          <div className="relative z-[1] mx-auto mt-6 max-w-3xl rounded-[18px] border border-white/70 bg-white/45 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl md:mt-8">
            <form
              onSubmit={handleSearch}
              className="flex flex-row items-stretch gap-2"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-white/95 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm sm:px-4 sm:py-3">
                <Search className="h-4 w-4 shrink-0 text-[#039D55]" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder={cfg.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center rounded-[12px] bg-[#039D55] px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-[#028a4a] sm:min-w-[88px] sm:px-6 sm:py-3"
                style={{ color: "#fff" }}
              >
                Ara
              </button>
            </form>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="flex min-w-0 max-w-full items-center gap-2 rounded-[12px] border border-white/60 bg-white/55 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white/75 sm:px-4 sm:py-2.5"
              >
                <MapPin className="h-4 w-4 shrink-0 text-[#039D55]" />
                <span className="truncate">{locationFilterOn && locLabel ? locLabel : publicLocLabel}</span>
              </button>
              {MODULE_QUICK_ACTIONS[moduleKey].map((action) =>
                action.kind === "link" ? (
                  <Link key={action.label} href={action.href} className={GLASS_PILL}>
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className={GLASS_PILL}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
            {locationFilterOn ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-[11px] font-semibold text-[#0f766e] underline-offset-2 hover:underline"
                >
                  Tüm Türkiye — konum filtresini kapat
                </button>
              </div>
            ) : null}
          </div>
          ) : (
            <div className="relative z-[1] mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 md:mt-6">
              {MODULE_QUICK_ACTIONS[moduleKey].map((action) =>
                action.kind === "link" ? (
                  <Link key={action.label} href={action.href} className={GLASS_PILL}>
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className={GLASS_PILL}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          )}
          {!hideModuleHeroSearch ? (
          <SadeLocationPickerModal
            open={locationPickerOpen}
            onClose={() => setLocationPickerOpen(false)}
            mapsSettings={siteSettings ?? null}
            fallbackLabel="Konumun"
          />
          ) : null}
        </div>
      </section>
      </div>

      <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} pb-12 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        {/* 0 — ADMIN KAMPANYA BANNERLARI (panelden eklenir; yoksa statik görseller devrede) */}
        <AdminBannerRail banners={adminBanners} />

        {/* 1 — KATEGORİ RAYI */}
        <section>
          <SectionHeading title={cfg.categoriesTitle} onSeeAll={scrollToStores} />
          <Rail>
            {categories.map((cat) => (
              <CategoryCircle
                key={cat.id}
                name={cat.name}
                icon={cat.icon}
                imageUrl={(cat as any).imageUrl}
                active={activeCategoryId === cat.id}
                onClick={() => selectCategory(activeCategoryId === cat.id ? null : cat)}
              />
            ))}
            {(categories.length > 0 ? extraCategories : cfg.fallbackCategories).map((cat) => (
              <CategoryCircle
                key={cat.name}
                name={cat.name}
                icon={cat.icon}
                active={categoryTextFilter === cat.name}
                onClick={() => selectFallbackCategory(cat.name)}
              />
            ))}
          </Rail>
        </section>

        {/* 2 — POPÜLER ÜRÜNLER / LEZZETLER: tüm modüllerde üstte, 6amMart "Today's Trends" gibi */}
        {popularItems.length > 0 && (
          <section>
            <SectionHeading title={cfg.popularItemsTitle} subtitle={cfg.popularItemsSubtitle} onSeeAll={scrollToStores} />
            <Rail>
              {popularItems.map((item) => <ItemCardVertical key={item.id} item={item} />)}
            </Rail>
          </section>
        )}

        {/* 3 — ÖNERİLEN İŞLETMELER */}
        {(vendorsLoading || recommended.length > 0) && (
          <section>
            <SectionHeading title={cfg.recommendedTitle} onSeeAll={scrollToStores} />
            <Rail>
              {vendorsLoading
                ? [...Array(5)].map((_, i) => <div key={i} className="h-56 w-60 shrink-0 animate-pulse rounded-2xl bg-gray-100" />)
                : recommended.map((v) => <StoreCard key={v.id} vendor={v} compact />)}
            </Rail>
          </section>
        )}

        {/* 4 — İKİLİ TANITIM BANNERI (market & işletmeler akışında üstte, yemek akışında altta) */}
        {moduleKey !== "food" && <PromoBannerPair storeWord={cfg.storeWord} onSeeAll={scrollToStores} />}

        {/* 5 — İNDİRİMLİ ÜRÜNLER */}
        {offerItems.length > 0 && (
          <section>
            <SectionHeading title={cfg.offersTitle} onSeeAll={scrollToStores} />
            <Rail>
              {offerItems.map((item) => <ItemCardVertical key={item.id} item={item} />)}
            </Rail>
          </section>
        )}

        {/* 7 — GENİŞ KAMPANYA BANNERI */}
        <WideCampaignBanner
          onSeeAll={scrollToStores}
          title="Kampanyalı işletmeleri kaçırma"
          text="İndirimli ürünler, ücretsiz teslimat ve öne çıkan işletme fırsatları bu vitrinde."
        />

        {/* 8 — EN ÇOK BEĞENİLENLER */}
        {bestItems.length > 0 && (
          <section>
            <SectionHeading title={cfg.bestTitle} onSeeAll={scrollToStores} />
            {moduleKey === "food" ? (
              <div className="yekpare-scrollbar grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2">
                {bestItems.map((item) => <ItemCardHorizontal key={item.id} item={item} />)}
              </div>
            ) : (
              <Rail>
                {bestItems.map((item) => <ItemCardVertical key={item.id} item={item} />)}
              </Rail>
            )}
          </section>
        )}

        {/* 9 — İŞLETMELER: öne çıkan işletmeler geniş kart rayı */}
        {moduleKey === "nearby" && featuredWide.length > 0 && (
          <section>
            <SectionHeading title="Öne Çıkan İşletmeler" onSeeAll={scrollToStores} />
            <Rail>
              {featuredWide.map((v) => <FeaturedStoreWide key={v.id} vendor={v} />)}
            </Rail>
          </section>
        )}

        {/* 10 — YENİ KATILANLAR */}
        {newStores.length > 0 && (
          <section>
            <SectionHeading title={cfg.newStoresTitle} onSeeAll={() => { setStoreTab("new"); scrollToStores(); }} />
            <Rail>
              {newStores.map((v) => <StoreCard key={v.id} vendor={v} compact />)}
            </Rail>
          </section>
        )}

        {/* 11 — YEMEK AKIŞINDA İKİLİ BANNER ALTTA */}
        {moduleKey === "food" && <PromoBannerPair storeWord={cfg.storeWord} onSeeAll={scrollToStores} />}

        {/* 12 — UYGULAMA BANNERI */}
        <AppDownloadBanner />

        {/* 13 — TÜM İŞLETMELER LİSTESİ */}
        <section ref={storesRef} className="scroll-mt-24">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-gray-900 md:text-xl">
              {storeList.length > 0
                ? `${storeList.length} ${cfg.storeWord.charAt(0).toLocaleUpperCase("tr-TR")}${cfg.storeWord.slice(1)}`
                : cfg.storesTitle}
            </h2>
            <div className="flex flex-wrap gap-2">
              {storeTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStoreTab(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${storeTab === tab.key ? "text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  style={storeTab === tab.key ? { background: GREEN } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kategori filtre şeridi */}
          {(categories.length > 0 || cfg.fallbackCategories.length > 0) && (
            <div className="yekpare-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => { setActiveCategoryId(null); setCategoryTextFilter(""); setCommittedSearch(""); }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeCategoryId == null && !categoryTextFilter ? "text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                style={activeCategoryId == null && !categoryTextFilter ? { background: GREEN } : undefined}
              >
                Hepsi
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(activeCategoryId === cat.id ? null : cat)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeCategoryId === cat.id ? "text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                  style={activeCategoryId === cat.id ? { background: GREEN } : undefined}
                >
                  {cat.icon && <span>{cat.icon}</span>} {cat.name}
                </button>
              ))}
              {(categories.length > 0 ? extraCategories : cfg.fallbackCategories).map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => selectFallbackCategory(cat.name)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${categoryTextFilter === cat.name ? "text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                  style={categoryTextFilter === cat.name ? { background: GREEN } : undefined}
                >
                  <span>{cat.icon}</span> {cat.name}
                </button>
              ))}
            </div>
          )}

          {vendorsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  <div className="h-40 bg-gray-200" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : storeList.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {storeList.map((v) => <StoreCard key={v.id} vendor={v} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-16 text-center">
              <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-gray-300" />
              <p className="text-lg font-bold text-gray-800">
                {locLabel ? `${locLabel} çevresinde sonuç bulunamadı` : cfg.emptyTitle}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{cfg.emptyText}</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                {(activeCategoryId != null || categoryTextFilter || committedSearch) && (
                  <button
                    type="button"
                    onClick={() => { setActiveCategoryId(null); setCategoryTextFilter(""); setCommittedSearch(""); setSearch(""); }}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ background: GREEN }}
                  >
                    Filtreleri Temizle
                  </button>
                )}
                {locationFilterOn && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Tüm Şehirleri Göster
                  </button>
                )}
                <a
                  href="/servis-saglayici-giris"
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: GREEN_DEEP }}
                >
                  İşletmeni Ekle
                </a>
              </div>
            </div>
          )}
        </section>

        {/* 14 — DİĞER VİTRİNLERE GEÇİŞ */}
        <section>
          <SectionHeading title="Diğer Vitrinler" />
          <div className="grid gap-3 md:grid-cols-2">
            {DELIVERY_MODULES.filter((m) => m.key !== moduleKey).map((m) => (
              <Link
                key={m.key}
                href={m.href}
                className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: GREEN_LIGHT }}>
                  {m.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-gray-900">{m.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-500">{m.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-black" style={{ color: GREEN }}>
                    Vitrine git <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
