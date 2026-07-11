import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Gift,
  Home,
  LocateFixed,
  Lock,
  MapPin,
  Megaphone,
  Navigation,
  Newspaper,
  Package,
  Search,
  UserPlus,
} from "lucide-react";
import {
  FIRMA_REHBERI_CATEGORIES,
  FIRMA_REHBERI_FEATURED_BUSINESSES,
  FIRMA_REHBERI_MAIN_CATEGORY_CHIPS,
  FIRMA_REHBERI_POPULAR_CITIES,
  FIRMA_REHBERI_TRANSFER_DESTINATIONS,
} from "@/lib/firmaRehberiData";
import { buildSariSayfalarListPath } from "@/lib/sariSayfalarUtils";
import {
  FirmaRehberiLocationField,
  type FirmaRehberiLocationFieldHandle,
  type FirmaRehberiLocationValue,
} from "@/components/firma-rehberi/FirmaRehberiLocationField";
import { resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { SADE_EDITORIAL_HERO_SECTION_CLASS, SADE_HERO_GLOW_CLASS, SADE_PUBLIC_HERO_LIGHT_GRADIENT, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_POST_HERO_MAIN_CLASS } from "@/lib/yekpareSadeTheme";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import { requestPublicLocation } from "@/lib/publicLocation";

type FirmaRehberiListMode = "urunler" | "hizmetler" | "ilanlar";

const listingMeta: Record<FirmaRehberiListMode, { title: string; lead: string; items: string[] }> = {
  urunler: {
    title: "Firma Rehberi Ürünleri",
    lead: "Firma rehberi sağlayıcılarının satış ve katalog ürünleri burada listelenecek.",
    items: ["Satış ürünleri", "Listeleme ürünleri", "Vitrin ürünleri"],
  },
  hizmetler: {
    title: "Firma Rehberi Hizmetleri",
    lead: "Randevu alınabilen klinik, usta, bakım ve danışmanlık hizmetleri burada toplanacak.",
    items: ["Randevulu hizmetler", "Yerinde servis", "Online danışmanlık"],
  },
  ilanlar: {
    title: "Firma Rehberi İlanları",
    lead: "Firma rehberi sağlayıcılarının iş, duyuru ve kampanya ilanları burada yayınlanacak.",
    items: ["Personel ilanları", "Kampanyalar", "Firma duyuruları"],
  },
};

const mainNavItems = [
  { href: "/firma-rehberi", icon: Home, label: "Anasayfa", desc: "firma rehberi ana sayfanız" },
  { href: "/firma-rehberi-paneli", icon: BriefcaseBusiness, label: "Firmalar", desc: "yüzlerce kayıtlı firma" },
  { href: "/haberler", icon: Newspaper, label: "Haberler", desc: "en güncel haberler" },
  { href: "/firma-rehberi/ilanlar", icon: Megaphone, label: "İlanlar", desc: "güncel seri ilanlar" },
  { href: "/firma-rehberi/urunler", icon: Package, label: "Ürünler", desc: "binlerce firma ürünü" },
  { href: "/kesfet", icon: Gift, label: "Fuar ve Etkinlikler", desc: "keşfet etkinlik planları" },
];

function sariSayfalarSearchHref(query: string, loc: FirmaRehberiLocationValue) {
  return buildSariSayfalarListPath({
    q: query.trim(),
    city: loc.city.trim(),
    district: loc.district.trim(),
  });
}

function discoverHref(query: string, place: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (place.trim()) params.set("near", place.trim());
  const qs = params.toString();
  return qs ? `/kesfet?${qs}` : "/kesfet";
}

function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-t-[1.5rem] border border-b-0 border-emerald-100 bg-[#f4fbf7] text-slate-950">
      <div className="flex items-center gap-3 px-5 py-4 text-sm font-black uppercase tracking-wide">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f766e] text-white">{icon}</span>
        {title}
      </div>
    </div>
  );
}

export function FirmaRehberiListe({ mode }: { mode: FirmaRehberiListMode }) {
  const meta = listingMeta[mode];
  return (
    <div className="sade-public-page min-h-screen text-slate-900">
      <section className={`${SADE_EDITORIAL_HERO_SECTION_CLASS} ${SADE_PUBLIC_HERO_SURFACE_CLASS}`} style={{ background: SADE_PUBLIC_HERO_LIGHT_GRADIENT }}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <Link href="/firma-rehberi" className="text-sm font-black text-[#0f766e] underline">
            Firma Rehberi'ne dön
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">{meta.title}</h1>
          <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">{meta.lead}</p>
          <Link href="/firma-rehberi-paneli" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#0b5f59]">
            Panelden kayıt ekle
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <main className={`mx-auto grid max-w-7xl gap-4 px-4 pb-10 md:grid-cols-3 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        {meta.items.map((row) => (
          <article key={row} className="border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#203949]">{row}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Canlı kayıtlar hazır olduğunda bu alan filtrelenebilir kartlarla güncellenecek.
            </p>
          </article>
        ))}
      </main>
    </div>
  );
}

export default function FirmaRehberi() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const mapsSettings = effectiveMapsGeocodeSettings(siteSettings ?? null);
  const locRef = useRef<FirmaRehberiLocationFieldHandle>(null);
  const [query, setQuery] = useState("");
  const [locDisplay, setLocDisplay] = useState("");
  const [loc, setLoc] = useState<FirmaRehberiLocationValue>({ city: "", district: "", label: "" });
  const [activeCategory, setActiveCategory] = useState(FIRMA_REHBERI_CATEGORIES[0]?.name ?? "Sağlık");
  const [geoLoading, setGeoLoading] = useState(false);
  const [locationHint, setLocationHint] = useState("Konumunuzu kullanın veya adres / şehir yazarak arayın.");

  useEffect(() => {
    resetSeoToSiteDefaults();
  }, []);

  const category = useMemo(
    () => FIRMA_REHBERI_CATEGORIES.find((item) => item.name === activeCategory) ?? FIRMA_REHBERI_CATEGORIES[0]!,
    [activeCategory],
  );
  const popularSearches = useMemo(() => FIRMA_REHBERI_CATEGORIES.flatMap((item) => item.subcategories.slice(0, 4)), []);
  const categoryTiles = useMemo(
    () => FIRMA_REHBERI_CATEGORIES.flatMap((item) => item.subcategories.slice(0, 2).map((sub) => ({ parent: item, sub }))).slice(0, 10),
    [],
  );

  function applyResolvedLocation(next: FirmaRehberiLocationValue) {
    setLoc(next);
    setLocDisplay(next.label || [next.district, next.city].filter(Boolean).join(", "));
  }

  function runSearch(nextQuery = query, nextLoc = loc) {
    const q = nextQuery.trim();
    const hasLoc = Boolean(nextLoc.city.trim() || nextLoc.district.trim() || nextLoc.label.trim());
    if (!q && !hasLoc) {
      navigate("/kesfet/sarisayfalar");
      return;
    }
    navigate(sariSayfalarSearchHref(q, nextLoc));
  }

  function fillCurrentLocation() {
    setGeoLoading(true);
    requestPublicLocation(mapsSettings, { timeout: 12_000 })
      .then((pos) => {
        const resolved = {
          city: pos.city || "",
          district: pos.district || "",
          label: pos.label || [pos.district, pos.city].filter(Boolean).join(", "),
        };
        applyResolvedLocation(resolved);
        setLocationHint("Konum alındı. Arama yakın çevrenize göre hazırlanacak.");
      })
      .catch((err) => {
        setLocationHint(err instanceof Error ? err.message : "Konum izni alınamadı; adres veya şehir yazarak arayabilirsiniz.");
      })
      .finally(() => setGeoLoading(false));
  }

  return (
    <div className="sade-public-page min-h-screen text-slate-900">
      <header className="bg-white/95 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/firma-rehberi" className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008f72] text-white shadow-lg shadow-emerald-200">
              <Building2 className="h-8 w-8" />
            </span>
            <span>
              <span className="block text-3xl font-black uppercase leading-none tracking-tight text-[#203949]">
                Yekpare <span className="text-[#008f72]">Firma Rehberi</span>
              </span>
              <span className="text-sm font-semibold text-slate-500">işletme, ürün ve hizmet keşfi</span>
            </span>
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/firma-rehberi-paneli" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-6 py-3 text-sm font-black uppercase text-white shadow-sm hover:bg-emerald-900">
              <UserPlus className="h-5 w-5" />
              Hemen üye ol
            </Link>
              <Link href="/firma-rehberi-paneli" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#008f72] px-6 py-3 text-sm font-black uppercase text-white shadow-sm hover:bg-[#007a61]">
              <Lock className="h-5 w-5" />
              Üye girişi yap
            </Link>
          </div>
        </div>
      </header>

      <nav className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[64px] items-center gap-3 border-r border-slate-100 px-4 py-3 text-slate-800 transition hover:bg-emerald-50 hover:text-[#008f72]">
                <Icon className="h-6 w-6 shrink-0" />
                <span>
                  <span className="block text-sm font-black uppercase leading-tight">{item.label}</span>
                  <span className="block text-[11px] font-semibold leading-tight text-[#203949]/75">{item.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <section className={`${SADE_EDITORIAL_HERO_SECTION_CLASS} ${SADE_PUBLIC_HERO_SURFACE_CLASS}`} style={{ background: SADE_PUBLIC_HERO_LIGHT_GRADIENT }}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className="relative mx-auto max-w-7xl px-4 py-12 text-center sm:py-16">
          <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">
            <BadgeCheck className="h-4 w-4" />
            Yekpare Firma Rehberi
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950 sm:text-5xl">Aradığın işletmeyi yakınında bul</h1>
          <p className="mx-auto mt-3 max-w-3xl text-base font-semibold text-slate-600 sm:text-xl">
            Konum destekli firma rehberiyle ürün, hizmet, ilan ve randevulu işletmeleri tek aramada keşfedin.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void locRef.current?.commit().then((resolved) => {
                runSearch(query, resolved ?? loc);
              });
            }}
            className="mx-auto mt-8 max-w-6xl rounded-[2rem] border border-white/15 bg-white p-3 text-left shadow-2xl shadow-slate-950/30"
          >
            <div className="grid gap-3 lg:grid-cols-[1.05fr_1.2fr_auto_auto]">
              <label className="flex min-h-[58px] items-center rounded-2xl border border-slate-200 bg-slate-50">
                <span className="flex h-full min-h-[58px] w-14 items-center justify-center text-[#008f72]">
                  <Search className="h-6 w-6" />
                </span>
                <span className="w-full pr-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">Ne aradın?</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Diş hekimi, halı yıkama, rentacar..."
                    className="w-full bg-transparent text-sm font-bold text-[#203949] outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>
              <label className="flex min-h-[58px] items-center rounded-2xl border border-slate-200 bg-slate-50">
                <span className="flex h-full min-h-[58px] w-14 shrink-0 items-center justify-center text-[#008f72]">
                  <MapPin className="h-6 w-6" />
                </span>
                <span className="w-full min-w-0 pr-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">Nerede?</span>
                  <FirmaRehberiLocationField
                    ref={locRef}
                    mapsSettings={mapsSettings}
                    displayValue={locDisplay}
                    onDisplayChange={setLocDisplay}
                    onLocationResolved={applyResolvedLocation}
                    disabled={geoLoading}
                  />
                </span>
              </label>
              <button type="button" onClick={fillCurrentLocation} className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                <LocateFixed className={`h-5 w-5 ${geoLoading ? "animate-pulse" : ""}`} />
                {geoLoading ? "Alınıyor" : "Konumum"}
              </button>
              <button type="submit" className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-[#008f72] px-8 text-sm font-black uppercase text-white shadow-lg shadow-emerald-300/40 hover:bg-[#007a61]">
                Ara
                <Navigation className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-900">
              {locationHint}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-3">
              {FIRMA_REHBERI_MAIN_CATEGORY_CHIPS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveCategory(item.name)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
                    activeCategory === item.name
                      ? "border-emerald-900 bg-emerald-900 text-white shadow-lg shadow-emerald-200"
                      : "border-slate-200 bg-white text-slate-900 hover:border-[#008f72] hover:bg-emerald-50"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-[#f4fbf7]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
          {categoryTiles.map((item, index) => (
            <button
              key={`${item.parent.name}-${item.sub}`}
              type="button"
              onClick={() => {
                setActiveCategory(item.parent.name);
                setQuery(item.sub);
              }}
              className={`min-h-[104px] border-r border-emerald-100 px-3 py-4 text-center text-slate-800 transition hover:bg-emerald-50 ${index % 2 === 0 ? "bg-white" : "bg-[#f8fcf9]"}`}
            >
              <span className="block text-2xl">{item.parent.icon}</span>
              <span className="mt-2 line-clamp-2 text-xs font-black leading-tight">{item.sub}</span>
              <span className="mt-1 block text-[11px] font-semibold text-slate-500">({index % 3 === 0 ? 0 : 15} Firma)</span>
            </button>
          ))}
        </div>
      </section>

      <main className={`mx-auto max-w-7xl px-4 pb-8 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        <section>
          <SectionTitle title="Vitrindeki Firmalar" icon={<BriefcaseBusiness className="h-5 w-5" />} />
          <div className="grid gap-5 border border-t-0 border-slate-200 bg-white p-5 md:grid-cols-3">
            {FIRMA_REHBERI_FEATURED_BUSINESSES.map((biz, index) => (
              <article key={biz.name} className="group overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-36 bg-[linear-gradient(135deg,#dbe7ed,#ffffff)]">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(32,57,73,.12)_0_3px,transparent_3px_54px)]" />
                  <span className="absolute right-0 top-0 bg-[#008f72] px-4 py-2 text-[11px] font-black uppercase text-white">{biz.badge}</span>
                  <span className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-lg">{FIRMA_REHBERI_CATEGORIES[index]?.icon ?? "🏢"}</span>
                </div>
                <div className="grid grid-cols-[1fr_46px]">
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-[#203949]">{biz.name}</h2>
                      <BadgeCheck className="h-4 w-4 fill-[#008f72] text-[#008f72]" />
                    </div>
                    <p className="mt-1 text-[11px] font-black uppercase text-slate-400">{biz.city} / {biz.district}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{biz.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {biz.services.map((service) => (
                        <span key={service} className="bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">{service}</span>
                      ))}
                    </div>
                  </div>
                  <Link href={discoverHref(biz.category, biz.city)} className="flex items-center justify-center bg-[#0f766e] text-white transition group-hover:bg-[#008f72]" aria-label={`${biz.name} keşfet profili`}>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="border border-slate-200 bg-white">
            <div className="bg-[#0f766e] px-4 py-3 text-sm font-black uppercase text-white">Kategoriler</div>
            <div className="divide-y divide-slate-100">
              {FIRMA_REHBERI_CATEGORIES.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveCategory(item.name)}
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${activeCategory === item.name ? "bg-[#008f72] text-white" : "hover:bg-emerald-50"}`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-black">{item.name}</span>
                    <span className="line-clamp-1 text-xs font-semibold opacity-70">{item.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <div className="border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Popüler aramalar</p>
                <h2 className="mt-1 text-2xl font-black text-[#203949]">{category.name} alt kategorileri</h2>
              </div>
              <Link href="/firma-rehberi-paneli" className="inline-flex items-center gap-2 rounded-2xl bg-[#008f72] px-4 py-3 text-sm font-black text-white">
                Firma rehberine eklen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.subcategories.map((item) => (
                <Link key={item} href={sariSayfalarSearchHref(item, loc)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 hover:border-[#008f72] hover:bg-emerald-50">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="border border-slate-200 bg-white">
            <SectionTitle title="Popüler Şehirler" icon={<MapPin className="h-5 w-5" />} />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {FIRMA_REHBERI_POPULAR_CITIES.map((item) => (
                <button key={item} type="button" onClick={() => applyResolvedLocation({ city: item, district: "", label: item })} className="border border-slate-200 px-4 py-4 text-left font-black text-[#203949] hover:border-[#f7b91e] hover:bg-amber-50">
                  {item}
                  <span className="block text-xs font-semibold text-slate-400">Bu şehirde ara</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-[#0f766e] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Sağlayıcı paneli</p>
            <h2 className="mt-2 text-3xl font-black">Firma rehberine eklen</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-200">
              Ürün, hizmet ve ilanlarınızı ekleyin; uygun kayıtları Keşfet ve diğer Yekpare servislerine bağlayın.
            </p>
            <div className="mt-5 grid gap-3">
              {[
                { href: "/firma-rehberi/urunler", label: "Ürünler", icon: Package },
                { href: "/firma-rehberi/hizmetler", label: "Hizmetler", icon: CalendarDays },
                { href: "/firma-rehberi/ilanlar", label: "İlanlar", icon: Megaphone },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between bg-white/10 px-4 py-3 font-black hover:bg-white/15">
                    <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5 text-emerald-200" />{item.label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Keşfet entegrasyonu</p>
              <h2 className="text-2xl font-black text-[#203949]">Firma kaydını diğer alanlarda yayınla</h2>
            </div>
            <Link href="/kesfet" className="inline-flex items-center gap-2 rounded-2xl bg-[#0f766e] px-4 py-3 text-sm font-black text-white">
              Keşfet'te ara
              <Search className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {FIRMA_REHBERI_TRANSFER_DESTINATIONS.map((item) => (
              <Link key={item.key} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#008f72] hover:bg-emerald-50">
                <span className="text-sm font-black text-[#203949]">{item.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.examples}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <h2 className="text-2xl font-black text-[#203949]">Sık aranan kategoriler</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {popularSearches.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-[#008f72]">
                {item}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
