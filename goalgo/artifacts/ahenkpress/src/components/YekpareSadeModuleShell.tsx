import { Link } from "wouter";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Car,
  MapPin,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Utensils,
  Wrench,
  Heart,
  UserRound,
} from "lucide-react";
import {
  YEKPARE_SERVICE_MODULE_META,
  YEKPARE_SERVICE_MODULE_ORDER,
  type SixAmMartModuleKey,
} from "@/lib/yekpareServiceNav";
import { SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_PAGE_BG_WHITE, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import { SadeHeaderLocationPill } from "@/components/SadeHeaderLocationPill";

type SadeModuleKey = SixAmMartModuleKey;

type ModuleDef = {
  key: SadeModuleKey;
  label: string;
  shortLabel: string;
  href: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
  bg: string;
  description: string;
};

const MODULE_VISUAL: Record<
  SadeModuleKey,
  { icon: ComponentType<{ className?: string; style?: CSSProperties }>; color: string; bg: string }
> = {
  food: { icon: Utensils, color: "#ef4444", bg: "bg-red-50" },
  grocery: { icon: Store, color: "#10b981", bg: "bg-emerald-50" },
  pharmacy: { icon: Wrench, color: "#8b5cf6", bg: "bg-violet-50" },
  rental: { icon: Building2, color: "#0284c7", bg: "bg-sky-50" },
  parcel: { icon: Car, color: "#f97316", bg: "bg-orange-50" },
  shop: { icon: ShoppingBag, color: "#0f766e", bg: "bg-teal-50" },
};

export const SADE_MODULES: ModuleDef[] = YEKPARE_SERVICE_MODULE_ORDER.map((key) => {
  const meta = YEKPARE_SERVICE_MODULE_META[key];
  const visual = MODULE_VISUAL[key];
  return {
    key,
    label: meta.label,
    shortLabel: meta.title,
    href: meta.href,
    icon: visual.icon,
    color: visual.color,
    bg: visual.bg,
    description: meta.description,
  };
});

function activeModule(key: SadeModuleKey): ModuleDef {
  return SADE_MODULES.find((module) => module.key === key) ?? SADE_MODULES[0];
}

export function SixAmMartTopHeader({
  active,
  searchPlaceholder = "İşletme, ürün veya servis ara",
  locationLabel = "Adres / konum seç",
  staticLocationLabel,
  compact = false,
}: {
  active?: SadeModuleKey;
  searchPlaceholder?: string;
  locationLabel?: string;
  staticLocationLabel?: string;
  compact?: boolean;
}) {
  const current = active ? activeModule(active) : null;

  return (
    <header className="sixam-native-header sticky top-0 z-40 border-b border-[#e7f2ec] bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 bg-[#f7fbf8]">
        <div className="mx-auto flex h-[30px] max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 text-xs font-bold text-slate-600">
          <SadeHeaderLocationPill fallbackLabel={locationLabel} staticLabel={staticLocationLabel} />
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/servis-saglayici-giris" className="hover:text-[#0f766e]">İşletme paneli</Link>
            <Link href="/siparis-takip" className="hover:text-[#0f766e]">Sipariş takip</Link>
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Destek</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0f766e] text-white shadow-lg shadow-emerald-900/15">
            <Store className="h-6 w-6" />
          </span>
          <span className="leading-none">
            <span className="block text-xl font-black tracking-tight text-[#0f766e]">Yekpare</span>
            <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-[#0f766e]">Sipariş ve keşif</span>
          </span>
        </Link>

        {!compact ? (
          <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm lg:flex">
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
              <Menu className="h-4 w-4 text-[#0f766e]" />
              {current?.shortLabel ?? "Tüm hizmetler"}
            </span>
            <span className="h-8 w-px bg-slate-200" />
            <Search className="h-4 w-4 text-[#0f766e]" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-400">{searchPlaceholder}</span>
            <Link href={current?.href ?? "/kesfet"} className="rounded-md bg-[#0f766e] px-6 py-3 text-sm font-black text-white hover:bg-[#0b5f59]" style={{ color: "#fff" }}>
              Ara
            </Link>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Link href="/hesabim" className="hidden rounded-full border border-slate-200 p-3 text-slate-700 hover:border-[#0f766e] sm:inline-flex" aria-label="Hesabım">
            <UserRound className="h-5 w-5" />
          </Link>
          <Link href="/magaza/sepet" className="hidden rounded-full border border-slate-200 p-3 text-slate-700 hover:border-[#0f766e] sm:inline-flex" aria-label="Favoriler">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/magaza/sepet" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">
            <ShoppingBag className="h-4 w-4" /> Sepet
          </Link>
        </div>
      </div>

      <nav className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 py-2 text-sm font-black">
          {SADE_MODULES.map((module) => {
            const ModuleIcon = module.icon;
            const isActive = module.key === active;
            return (
              <Link
                key={module.key}
                href={module.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 transition ${
                  isActive ? "bg-[#0f766e] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                style={isActive ? { color: "#fff" } : undefined}
              >
                <ModuleIcon className="h-4 w-4" />
                {module.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

export function SixAmMartModuleSelector({ active }: { active?: SadeModuleKey }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Hizmet seç</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">İhtiyacın olan hizmete hızlıca ulaş.</p>
        </div>
        <Link href="/isletmeler" className="text-sm font-black text-[#0f766e]">Yakınımdakileri gör</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {SADE_MODULES.map((module) => {
          const ModuleIcon = module.icon;
          const isActive = module.key === active;
          return (
            <Link
              key={module.key}
              href={module.href}
              className={`group rounded-[14px] border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                isActive ? "border-[#0f766e]" : "border-slate-100"
              }`}
            >
              <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${module.bg}`}>
                <ModuleIcon className="h-6 w-6" style={{ color: module.color }} />
              </span>
              <span className="block text-sm font-black text-slate-950 group-hover:text-[#0f766e]">{module.label}</span>
              <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-slate-500">{module.description}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SixAmMartSectionShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function YekpareSadeModuleShell({
  active,
  title,
  subtitle,
  searchPlaceholder,
  ctaHref,
  ctaLabel,
  locationLabel = "Konumunu seç",
  compact = false,
}: {
  active: SadeModuleKey;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  ctaHref: string;
  ctaLabel: string;
  locationLabel?: string;
  compact?: boolean;
}) {
  const current = activeModule(active);
  const Icon = current.icon;

  return (
    <section className="bg-white text-slate-950">
      <SixAmMartTopHeader active={active} searchPlaceholder={searchPlaceholder} locationLabel={locationLabel} compact={compact} />
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <div className="sade-public-hero-surface" style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_WHITE)}>
          <div className="absolute bottom-0 right-[8%] hidden h-44 w-44 rounded-full bg-white/70 shadow-inner lg:block" />
          <div className={`relative ${SADE_PUBLIC_HERO_CONTENT_CLASS} grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center`}>
          <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#0f766e] shadow-sm">
                <Icon className="h-4 w-4" />
                {current.label}
              </span>
              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                {subtitle}
              </p>
              {!compact ? (
                <div className="mt-6 grid gap-2 rounded-[18px] bg-white p-2 shadow-xl ring-1 ring-slate-100 md:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <div className="flex items-center gap-2 rounded-[14px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <MapPin className="h-4 w-4 text-[#0f766e]" />
                    {locationLabel}
                  </div>
                  <div className="flex items-center gap-2 rounded-[14px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                    <Search className="h-4 w-4 text-slate-400" />
                    {searchPlaceholder}
                  </div>
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#0f766e] px-5 py-3 text-sm font-black text-white hover:bg-[#0b5f59]"
                    style={{ color: "#fff" }}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4 text-white" />
                  </Link>
                </div>
              ) : null}
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Truck, label: "Hızlı teslimat", text: "Yakındaki işletmelerden siparişini kolayca başlat." },
              { icon: ShieldCheck, label: "Güvenli işlem", text: "İşletme ve sipariş bilgileri Yekpare üzerinden takip edilir." },
              { icon: Store, label: "Mağaza ve hizmetler", text: "Ürünleri, hizmetleri ve işletme vitrinlerini incele." },
            ].map((item) => (
              <div key={item.label} className="rounded-[14px] border border-slate-100 bg-white p-4 shadow-sm">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#0f766e]">
                  <item.icon className="h-5 w-5" />
                </span>
                <h2 className="text-sm font-black text-slate-900">{item.label}</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.text}</p>
              </div>
            ))}
          </aside>
        </div>
        </div>
      </div>
      <SixAmMartModuleSelector active={active} />
      <div className="mx-auto max-w-[1440px] px-4 pb-8">
        <div className="grid gap-4 rounded-[18px] border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-3">
          {[
            { icon: Truck, label: "Adres seçimi", text: "Konum seçimi sipariş ve hizmetlerin başlangıcı." },
            { icon: ShieldCheck, label: "Fırsatlar", text: "Kampanya ve duyuru alanlarını kolayca incele." },
            { icon: Store, label: "Mağazalar", text: "Mağaza ve ürün kartlarını düzenli listelerde gör." },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-[14px] bg-slate-50 px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-[#0f766e]">
                <item.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black text-slate-900">{item.label}</span>
                <span className="block text-xs font-semibold text-slate-500">{item.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
