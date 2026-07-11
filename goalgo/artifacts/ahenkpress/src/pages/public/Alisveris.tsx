import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Headset, Heart, MapPin, Menu, RefreshCcw, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Truck, UserRound } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { resolveMarketplaceStoreCardHref } from "@/lib/marketplaceStoreHref";
import { SADE_PUBLIC_POST_HERO_MAIN_CLASS } from "@/lib/yekpareSadeTheme";

const API = "/api";

interface VendorCategory {
  id: number; name: string; slug: string; icon: string;
}

interface Vendor {
  id: number; name: string; slug: string; description: string;
  categoryId: number; imageUrl: string; coverUrl: string;
  city: string; district: string;
  shippingFee: string; freeShippingAbove: string; shippingTime: number;
  deliveryFee: string; deliveryTime: number;
  rating: number; reviewCount: number; isOpen: boolean; featured: boolean;
  vendorType: string; tags: string[];
  storefrontHref?: string;
  yekpareStoreHref?: string;
}

const ECOM_CATEGORIES = [
  { slug: "giyim",      name: "Giyim & Moda",   icon: "👕" },
  { slug: "elektronik", name: "Elektronik",      icon: "📱" },
  { slug: "ev-yasam",   name: "Ev & Yaşam",      icon: "🏠" },
  { slug: "kozmetik",   name: "Kozmetik",         icon: "💄" },
  { slug: "kitap",      name: "Kitap & Hobi",    icon: "📚" },
  { slug: "spor",       name: "Spor",             icon: "⚽" },
  { slug: "oyuncak",    name: "Oyuncak",          icon: "🧸" },
  { slug: "supermarket",name: "Süpermarket",      icon: "🛒" },
];

interface FeaturedBusiness {
  id: string; name: string; photoUrl: string; coverPhotoUrl: string; rating: number;
  description: string; categoryName: string; categoryIcon: string;
}

export default function Alisveris() {
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [activeCategory, setActiveCategory] = useState("hepsi");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/map/homepage-businesses?superCategory=alisveris")
      .then(r => r.json())
      .then(d => setFeaturedBusinesses(Array.isArray(d?.data) ? d.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/delivery/categories`).then(r => r.json()).then((all: VendorCategory[]) => {
      const slugs = ECOM_CATEGORIES.map(c => c.slug);
      setCategories(all.filter(c => slugs.includes(c.slug)));
    }).catch(() => {});
  }, []);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    let url = `${API}/delivery/vendors?type=ecommerce&limit=50`;
    if (activeCategory !== "hepsi") url += `&category=${activeCategory}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const data = await fetch(url).then(r => r.json()).catch(() => []);
    setVendors(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [activeCategory, search]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); loadVendors(); };
  const featuredVendors = useMemo(() => vendors.filter((v) => v.featured), [vendors]);
  const regularVendors = useMemo(() => vendors.filter((v) => !v.featured), [vendors]);
  const allCategoryRows = categories.length > 0 ? categories : ECOM_CATEGORIES;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3">
          <Link href="/alisveris" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Store className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">Yekpare</span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">Mağazalar</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
            <Menu className="h-4 w-4 text-slate-400" />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="max-w-[190px] bg-transparent text-sm font-bold text-slate-700 outline-none"
            >
              <option value="hepsi">Tüm mağazalar</option>
              {allCategoryRows.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
            <span className="h-6 w-px bg-slate-200" />
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Ürün, marka veya mağaza ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700" style={{ color: "#fff" }}>
              Ara
            </button>
          </form>

          <Link href="/servis-saglayici-giris" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex">
            <UserRound className="mr-1.5 h-4 w-4" />
            Mağaza Paneli
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#f3fbf7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.2),transparent_28%),radial-gradient(circle_at_12%_22%,rgba(250,204,21,0.25),transparent_26%)]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Yekpare Alışveriş Pazaryeri
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              Binlerce ürün ve güvenilir mağaza tek Yekpare&apos;de
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-600 md:text-lg">
              Elektronik, moda, ev &amp; yaşam, market ve yerel mağazalardan alışveriş yap; ürünleri karşılaştır, güvenle sipariş ver.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/magaza" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800" style={{ color: "#fff" }}>
                Alışverişe başla
                <ArrowRight className="h-4 w-4 text-white" />
              </Link>
              <a href="#stores" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-emerald-300" style={{ color: "#1f2937" }}>
                Fırsatları keşfet
              </a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl">
              <Metric value={vendors.length} label="mağaza" />
              <Metric value={featuredVendors.length} label="öne çıkan" />
              <Metric value={allCategoryRows.length} label="kategori" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(featuredVendors.length ? featuredVendors : vendors).slice(0, 4).map((vendor, index) => (
              <VendorCard key={vendor.id} vendor={vendor} compact={index > 1} />
            ))}
            {loading && vendors.length === 0 ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-h-52 animate-pulse rounded-[2rem] bg-white/70" />
            )) : null}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-2.5 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, label: "Ücretsiz kargo" },
            { icon: Headset, label: "7/24 destek" },
            { icon: RefreshCcw, label: "30 gün iade" },
            { icon: ShieldCheck, label: "Güvenli ödeme" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <item.icon className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-black text-slate-800">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <main id="stores" className={`mx-auto max-w-[1440px] px-4 pb-6 md:pb-7 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        <section className="space-y-4">
          <SectionHeader title="Kategoriye Göre Mağazalar" href="/magaza" linkText="Ürünlere git" />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            <button
              onClick={() => setActiveCategory("hepsi")}
              className={`rounded-3xl border p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                activeCategory === "hepsi" ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white"
              }`}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700">🏬</div>
              <p className="text-sm font-black text-slate-900">Tüm Mağazalar</p>
            </button>
            {allCategoryRows.slice(0, 9).map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`rounded-3xl border p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  activeCategory === cat.slug ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white"
                }`}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700">{cat.icon || "🛍️"}</div>
                <p className="text-sm font-black text-slate-900 line-clamp-2">{cat.name}</p>
              </button>
            ))}
          </div>
        </section>

        {featuredBusinesses.length > 0 ? (
          <section className="space-y-4">
            <SectionHeader title="Harita Vitrinindeki Alışveriş İşletmeleri" href="/kesfet?superCategory=alisveris" linkText="Keşfet" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredBusinesses.slice(0, 8).map((business) => (
                <FeaturedBusinessCard key={business.id} business={business} />
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
                <div className="h-44 animate-pulse bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {featuredVendors.length > 0 ? (
              <section className="space-y-4">
                <SectionHeader title="Öne Çıkan Mağazalar" href="/magaza" linkText="Ürün Pazaryeri" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featuredVendors.map(vendor => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </div>
              </section>
            ) : null}
            <section className="space-y-4">
              <SectionHeader title={featuredVendors.length > 0 ? "Tüm Mağazalar" : "Mağazalar"} href="/magaza" linkText="Ürün Pazaryeri" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(regularVendors.length ? regularVendors : vendors).map(vendor => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
            </section>
          </>
        )}

        <div className="grid overflow-hidden rounded-[2rem] border border-emerald-100 bg-[#f4fbf7] text-slate-950 shadow-sm lg:grid-cols-[0.85fr_1.15fr]">
          <div className="p-7 md:p-10">
            <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-[#0f766e]">
              Yekpare satıcı ağı
            </div>
            <h2 className="text-3xl font-black text-slate-950">Mağazanı Yekpare'de aç</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Ürün kataloğunu, mağaza vitrinin ve sipariş akışını tek panelden yönet.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 border-t border-emerald-100 bg-white p-7 md:border-l md:border-t-0 md:p-10 sm:flex-row sm:items-center">
            <Link href="/is-ortagi/basvuru" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white hover:bg-[#0b5f59]">
              Mağaza Aç
              <ArrowRight className="h-4 w-4 text-white" />
            </Link>
            <Link href="/servis-saglayici-giris" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-[#0f766e] hover:bg-emerald-50">
              Panel Girişi
            </Link>
          </div>
        </div>
      </main>

      {/* Sipariş takibi — sayfa sonu (footer üstü hissi) */}
      <section aria-label="Sipariş takibi" className="border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <OrderTrackSearch compact />
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-2xl font-black text-slate-950">{value.toLocaleString("tr-TR")}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function SectionHeader({ title, href, linkText }: { title: string; href: string; linkText: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-800" style={{ color: "#047857" }}>
        {linkText}
        <ArrowRight className="h-4 w-4 text-emerald-700" />
      </Link>
    </div>
  );
}

function FeaturedBusinessCard({ business }: { business: FeaturedBusiness }) {
  const img = resolveClientMediaSrc(business.coverPhotoUrl || business.photoUrl);
  return (
    <Link href={`/kesfet/isletme/${business.id}`} className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-36 bg-slate-100">
        {img ? (
          <img src={img} alt={business.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">{business.categoryIcon || "🛒"}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-xs font-black text-white">
          Harita vitrini
        </span>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="truncate font-black">{business.name}</p>
          <p className="text-xs font-semibold text-white/80">{business.categoryName}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">{business.description || "Yekpare harita vitrinindeki alışveriş işletmesi."}</p>
        {business.rating > 0 ? (
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            {business.rating.toFixed(1)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
      <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="font-bold">Bu kategoride henüz mağaza yok</p>
      <p className="mt-2 text-sm">Yakında daha fazla satıcı eklenecek.</p>
    </div>
  );
}

function VendorCard({ vendor, compact }: { vendor: Vendor; compact?: boolean }) {
  const shippingFee = parseFloat(vendor.shippingFee ?? "0");
  const freeShippingAbove = vendor.freeShippingAbove ? parseFloat(vendor.freeShippingAbove) : null;
  const { isFavorite, toggleFavorite, user } = useCustomerAuth();
  const fav = isFavorite(vendor.id);
  const imageSrc = resolveClientMediaSrc(vendor.coverUrl || vendor.imageUrl);
  const logoSrc = resolveClientMediaSrc(vendor.imageUrl);
  const href = resolveMarketplaceStoreCardHref(vendor);
  const location = [vendor.city, vendor.district].filter(Boolean).join(" / ");

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={href} className={`relative block bg-slate-100 ${compact ? "h-44" : "h-40"}`}>
        {imageSrc ? (
          <img src={imageSrc} alt={vendor.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🏪</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
        {vendor.featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-xs font-black text-white">
            Öne çıkan
          </span>
        ) : null}
        {user ? (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); void toggleFavorite(vendor.id); }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition"
            style={{ background: fav ? "#e61e25" : "rgba(255,255,255,0.9)" }}
            title={fav ? "Favorilerden çıkar" : "Favorilere ekle"}>
            <Heart className="h-4 w-4" style={{ color: fav ? "#fff" : "#e61e25", fill: fav ? "#fff" : "none" }} />
          </button>
        ) : null}
        {!vendor.isOpen ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
            <span className="rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white">Açılış aşamasında</span>
          </div>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-white bg-white">
            {logoSrc ? <img src={logoSrc} alt={vendor.name} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 text-white">
            <p className="truncate font-black">{vendor.name}</p>
            <p className="text-xs font-semibold text-white/80">{location || "Yekpare mağazası"}</p>
          </div>
        </div>
      </Link>
      <div className="p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">{vendor.description || "Yekpare pazaryerindeki mağaza vitrini."}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {Number(vendor.rating || 0).toFixed(1)}
              <span className="text-slate-400">({vendor.reviewCount || 0})</span>
            </span>
            {shippingFee === 0 || (freeShippingAbove && freeShippingAbove <= 0) ? (
              <span className="inline-flex items-center gap-1 text-emerald-700"><Truck className="h-3.5 w-3.5" /> Ücretsiz</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {shippingFee}₺</span>
            )}
          </div>
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100" style={{ color: "#047857" }}>
            Mağazaya Git
            <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
          </Link>
        </div>
        {freeShippingAbove && freeShippingAbove > 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            {freeShippingAbove}₺ üzeri ücretsiz kargo
          </p>
        ) : null}
        {vendor.city ? (
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-400">
            <MapPin className="h-3.5 w-3.5" /> {location || vendor.city}
          </div>
        ) : null}
      </div>
    </article>
  );
}
