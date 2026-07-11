import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Bike,
  Building2,
  Calendar,
  Car,
  ChevronRight,
  Compass,
  Download,
  Lightbulb,
  Map,
  Newspaper,
  Search,
  ShoppingBag,
  Star,
  Store,
  Sun,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useHomepageDayNightTheme } from "@/hooks/useHomepageDayNightTheme";
import { UnifiedSearchInput } from "@/components/search/UnifiedSearchInput.tsx";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions";
import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import "@/styles/homepageTheme.css";
import "@/styles/searchSuggest.css";
import { ServiceModuleCard } from "@/components/ServiceModuleCard";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  YEKPARE_SERVICE_MODULE_META,
  YEKPARE_SERVICE_MODULE_ORDER,
  type SixAmMartModuleKey,
} from "@/lib/yekpareServiceNav";
import { SadeLocationPickerModal } from "@/components/SadeLocationPickerModal";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import {
  SADE_PUBLIC_HERO_CONTENT_CLASS,
  SADE_PUBLIC_HERO_STAGE_CLASS,
  SADE_PUBLIC_HERO_SURFACE_CLASS,
  SADE_PUBLIC_PAGE_BG_WHITE,
  sadePublicHeroFadeStyle,
} from "@/lib/yekpareSadeTheme";
import { SadePublicChrome } from "@/themes/sixammart/SixAmMartTheme";
import {
  isLandingSectionEnabled,
  LANDING_CTA_LABEL_FALLBACKS,
  LANDING_HERO_QUICK_ACTION_EMOJI,
  parseYekpareLandingDesignFromJson,
  resolveLandingCtaLabel,
  resolveLandingHeroQuickActionLabel,
  resolveLandingSectionOrder,
  type FaqTabId,
  type LandingSectionId,
  type YekpareLandingDesign,
} from "@/lib/yekpareLandingDesign";
import { KesfetDiscoverHubSection } from "@/components/KesfetDiscoverHubSection";

const MODULE_ICONS: Record<SixAmMartModuleKey, LucideIcon> = {
  food: Utensils,
  grocery: Store,
  pharmacy: Compass,
  rental: Building2,
  parcel: Truck,
  shop: ShoppingBag,
};

function LandingContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 ${className}`}>{children}</div>;
}

const HERO_QUICK_ACTION_BTN =
  "inline-flex min-h-[38px] min-w-0 items-center justify-center rounded-[12px] border px-2 py-2 text-center text-[11px] font-black leading-tight shadow-sm transition sm:min-h-[40px] sm:px-4 sm:py-2.5 sm:text-xs";

const HOME_CATEGORY_TILES = [
  { label: "Sipariş", href: "/siparis", icon: Utensils },
  { label: "Rezervasyon", href: "/turizm", icon: Calendar },
  { label: "Otomotiv", href: "/otomotiv", icon: Car },
  { label: "Şehir Rehberi", href: "/kesfet", icon: Map },
] as const;

const LANDING_CTA_GREEN =
  "landing-cta-green inline-flex min-h-[40px] min-w-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#039D55] px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#028a4a]";

const LANDING_CTA_LIGHT =
  "landing-cta-light inline-flex min-h-[40px] min-w-[120px] items-center justify-center gap-2 rounded-[10px] bg-white px-5 py-3 text-sm font-black text-[#039D55] shadow-md transition hover:bg-emerald-50";

function LandingGreenCta({
  href,
  label,
  fallback,
  className = "",
  icon,
  children,
}: {
  href: string;
  label: string;
  fallback: string;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const text = resolveLandingCtaLabel(label, fallback);
  return (
    <Link href={href} className={`${LANDING_CTA_GREEN} ${className}`} style={{ color: "#fff" }}>
      {icon}
      <span className="landing-cta-label whitespace-nowrap">{text}</span>
      {children}
    </Link>
  );
}

function LandingLightCta({
  href,
  label,
  fallback,
  className = "",
  children,
}: {
  href: string;
  label: string;
  fallback: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const text = resolveLandingCtaLabel(label, fallback);
  return (
    <Link
      href={href}
      className={`${LANDING_CTA_LIGHT} ${className}`}
      style={{ color: "#039D55" }}
    >
      <span className="landing-cta-label whitespace-nowrap">{text}</span>
      {children}
    </Link>
  );
}

function ModuleSelectionGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 md:gap-2.5 ${className}`}>
      {YEKPARE_SERVICE_MODULE_ORDER.map((key) => {
        const meta = YEKPARE_SERVICE_MODULE_META[key];
        const Icon = MODULE_ICONS[key];
        return (
          <ServiceModuleCard
            key={key}
            href={meta.href}
            title={meta.label}
            description={meta.description}
            icon={Icon}
            surface="hero"
          />
        );
      })}
    </div>
  );
}

function HomeCategoryTiles() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
      {HOME_CATEGORY_TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link key={tile.href} href={tile.href} className="yekpare-home-category-tile">
            <Icon aria-hidden />
            <span>{tile.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function HeroSection({
  design,
  onOpenPicker,
  searchText,
  onSearchTextChange,
  onSearch,
  homeTheme,
  themeSource,
  onToggleTheme,
  onResetThemeAuto,
}: {
  design: YekpareLandingDesign;
  onOpenPicker: () => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onSearch: (query?: string) => void;
  homeTheme: "day" | "night";
  themeSource: "auto" | "manual";
  onToggleTheme: () => void;
  onResetThemeAuto: () => void;
}) {
  const hero = design.hero;
  const showSideImage = hero.showSideImage === true;
  const showBackgroundImage = hero.showBackgroundImage === true && Boolean(hero.backgroundImage?.trim());
  const isNight = homeTheme === "night";
  const lastThemeClick = useRef(0);

  const handleThemeClick = () => {
    const now = Date.now();
    if (now - lastThemeClick.current < 450) {
      onResetThemeAuto();
    } else {
      onToggleTheme();
    }
    lastThemeClick.current = now;
  };

  return (
    <div className={`${SADE_PUBLIC_HERO_STAGE_CLASS} yekpare-home-hero`}>
      <section className={`${SADE_PUBLIC_HERO_SURFACE_CLASS} relative`} style={isNight ? undefined : sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_WHITE)}>
        {showBackgroundImage ? (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <img
              src={hero.backgroundImage}
              alt=""
              className="h-full w-full scale-105 object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/92 via-white/84 to-emerald-50/72" />
          </div>
        ) : null}

        <div
          className={`relative grid items-start gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,44%)] md:gap-8 md:py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,480px)] lg:gap-10 ${SADE_PUBLIC_HERO_CONTENT_CLASS}`}
        >
          <div className="min-w-0">
            <div className="mx-auto flex max-w-[780px] items-start justify-between gap-3 text-center md:mx-0 md:text-left">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "var(--yh-accent)" }}>
                  Yekpare
                </p>
                <h1 className="mt-2 text-xl font-bold leading-tight sm:text-3xl md:text-[40px] md:leading-[1.15]" style={{ color: "var(--yh-text)" }}>
                  {hero.title}
                </h1>
                <p className="mt-3 text-sm font-medium sm:text-base" style={{ color: "var(--yh-text-muted)" }}>
                  {hero.subtitle}
                </p>
              </div>
              <button
                type="button"
                className="yekpare-home-theme-btn shrink-0"
                data-auto={themeSource === "auto" ? "true" : undefined}
                onClick={handleThemeClick}
                title={themeSource === "auto" ? "Tema: otomatik (çift tıkla)" : "Tema: manuel (çift tık otomatiğe döner)"}
                aria-label={isNight ? "Gündüz moduna geç" : "Gece moduna geç"}
              >
                {isNight ? <Lightbulb className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>

            <div className="mx-auto mt-6 max-w-[760px] md:mx-0">
              <p className="mb-2 text-center text-sm font-medium md:text-left md:text-lg" style={{ color: "var(--yh-text-muted)" }}>
                {hero.locationPrompt}
              </p>

              <div className="yekpare-home-glass rounded-[18px] p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSearch();
                  }}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <label
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] px-4 py-3 text-sm font-semibold shadow-sm"
                    style={{ background: isNight ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.95)", color: "var(--yh-text)" }}
                  >
                    <Search className="h-4 w-4 shrink-0" style={{ color: "var(--yh-accent)" }} />
                    <UnifiedSearchInput
                      value={searchText}
                      onChange={onSearchTextChange}
                      onSubmit={onSearch}
                      placeholder={hero.searchPlaceholder}
                      theme="home"
                      listId="landing-home-search-suggest"
                      inputClassName="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
                    />
                  </label>
                  <button
                    type="submit"
                    className={`${LANDING_CTA_GREEN} sm:min-w-[116px]`}
                    style={{ color: "#fff" }}
                  >
                    <span className="landing-cta-label">
                      {resolveLandingCtaLabel(hero.searchButtonLabel, LANDING_CTA_LABEL_FALLBACKS.search)}
                    </span>
                  </button>
                </form>

                <HomeCategoryTiles />

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={onOpenPicker}
                    className={`${HERO_QUICK_ACTION_BTN} border-[var(--yh-glass-border)] bg-[var(--yh-glass)]`}
                    style={{ color: "var(--yh-accent)" }}
                  >
                    <span className="block max-w-full truncate">
                      {resolveLandingHeroQuickActionLabel(
                        hero.locationButtonLabel,
                        LANDING_CTA_LABEL_FALLBACKS.location,
                        LANDING_HERO_QUICK_ACTION_EMOJI.location,
                      )}
                    </span>
                  </button>
                  {hero.quickActions.slice(0, 2).map((action, index) => (
                    <Link
                      key={`${action.label}-${action.href}`}
                      href={action.href}
                      className={`${HERO_QUICK_ACTION_BTN} border-[var(--yh-glass-border)] bg-[var(--yh-glass)] hover:opacity-90`}
                      style={{ color: "var(--yh-text)" }}
                    >
                      <span className="block max-w-full truncate">
                        {resolveLandingHeroQuickActionLabel(
                          action.label,
                          index === 0 ? LANDING_CTA_LABEL_FALLBACKS.explore : LANDING_CTA_LABEL_FALLBACKS.maps,
                          index === 0 ? LANDING_HERO_QUICK_ACTION_EMOJI.explore : LANDING_HERO_QUICK_ACTION_EMOJI.maps,
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 md:self-start">
            <p className="mb-2 text-center text-xs font-semibold text-slate-500 md:text-left sm:text-sm">
              {hero.modulePrompt}
            </p>
            <ModuleSelectionGrid />
            {showSideImage ? (
              <div className="relative mx-auto mt-4 hidden w-full max-w-[280px] md:mx-0 md:block">
                <div className="overflow-hidden rounded-[16px] border border-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.10)]">
                  <img src={hero.sideImage} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatsSection({ design }: { design: YekpareLandingDesign }) {
  return (
    <LandingContainer className="pb-2 pt-3 md:pt-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        {design.stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-[12px] border border-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-black text-[#039D55] sm:h-14 sm:w-14 sm:text-lg">
              {stat.value.replace(/\D/g, "").slice(0, 2) || "•"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900 sm:text-2xl">{stat.value}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-slate-500 sm:text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </LandingContainer>
  );
}

function ZonesSection({ design }: { design: YekpareLandingDesign }) {
  const z = design.zones;
  return (
    <section className="bg-white pb-6 pt-2 md:pb-10">
      <LandingContainer>
        <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
          <div className="md:pt-4">
            <h2 className="text-lg font-bold sm:text-3xl">{z.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{z.description}</p>
          </div>
          <div className="rounded-[12px] border border-slate-100 bg-slate-50/80 p-3 md:p-4">
            <div className="flex max-h-[220px] flex-wrap justify-center gap-2 overflow-y-auto md:justify-start">
              {z.items.map((zone) => (
                <Link
                  key={zone.name}
                  href={zone.href ?? "/haritalar"}
                  title={`${zone.name}: ${zone.modules}`}
                  className="rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium transition hover:border-[#039D55]/30 hover:shadow-md md:text-base"
                >
                  {zone.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}

function BannersSection({ design }: { design: YekpareLandingDesign }) {
  return (
    <section className="bg-slate-50/80 py-8 md:py-10">
      <LandingContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {design.banners.map((banner) => (
            <Link
              key={banner.title}
              href={banner.href || "/servisler"}
              className="group relative overflow-hidden rounded-[16px] shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
            >
              <img
                src={banner.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent" />
              <div className="relative flex min-h-[180px] flex-col justify-end p-5 text-white md:min-h-[200px]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">Kampanya</p>
                <h3 className="mt-1 text-xl font-black">{banner.title}</h3>
                <p className="mt-1 text-sm font-medium text-white/85">{banner.subtitle}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-200">
                  Keşfet <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function AppDownloadSection({ design }: { design: YekpareLandingDesign }) {
  const app = design.appDownload;
  return (
    <section className="bg-gradient-to-br from-emerald-50/80 via-white to-white">
      <LandingContainer className="py-8 md:py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{app.title}</h2>
            <p className="text-sm text-slate-600 md:text-base">{app.subtitle}</p>
            <LandingGreenCta
              href={app.ctaHref}
              label={app.ctaLabel}
              fallback={LANDING_CTA_LABEL_FALLBACKS.appDownload}
              icon={<Download className="h-4 w-4 shrink-0" />}
            />
          </div>
          <div className="mx-auto max-w-sm overflow-hidden rounded-[20px] border border-slate-100 shadow-xl">
            <img src={app.image} alt="" className="w-full object-cover" loading="lazy" />
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}

function PartnersSection({ design }: { design: YekpareLandingDesign }) {
  const p = design.partners;
  return (
    <section className="bg-slate-50 pb-4">
      <LandingContainer>
        <div className="text-center">
          <h2 className="text-lg font-semibold md:text-3xl">{p.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{p.subtitle}</p>
        </div>
        <div className="yekpare-scrollbar flex gap-3 overflow-x-auto py-6">
          {p.logos.map((label) => (
            <div
              key={label}
              className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-[12px] border border-slate-100 bg-white text-sm font-black text-slate-600 shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function VendorCtaSection({ design }: { design: YekpareLandingDesign }) {
  const v = design.vendorCta;
  return (
    <LandingContainer className="py-6">
      <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <div className="grid items-center md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="p-6 md:p-8">
            <h3 className="text-xl font-bold md:text-3xl">{v.title}</h3>
            <p className="mt-3 max-w-lg text-sm text-slate-600">{v.description}</p>
            <LandingGreenCta
              href={v.ctaHref}
              label={v.ctaLabel}
              fallback={LANDING_CTA_LABEL_FALLBACKS.vendor}
              className="mt-5"
            >
              <ArrowRight className="h-4 w-4 shrink-0" />
            </LandingGreenCta>
          </div>
          <div className="relative h-48 md:h-full md:min-h-[240px]">
            <img src={v.image} alt="" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/20 md:bg-gradient-to-r md:from-white md:to-transparent" />
          </div>
        </div>
      </div>
    </LandingContainer>
  );
}

function DeliveryCtaSection({ design }: { design: YekpareLandingDesign }) {
  const d = design.deliveryCta;
  return (
    <LandingContainer className="py-6">
      <div className="grid items-center gap-6 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm md:grid-cols-2">
        <div className="relative h-48 md:h-64">
          <img src={d.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="p-6 text-center md:text-left">
          <Bike className="mx-auto h-10 w-10 text-orange-500 md:mx-0" />
          <h3 className="mt-3 text-xl font-semibold md:text-3xl">{d.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{d.description}</p>
          <LandingGreenCta
            href={d.ctaHref}
            label={d.ctaLabel}
            fallback={LANDING_CTA_LABEL_FALLBACKS.delivery}
            className="mt-4"
          />
        </div>
      </div>
    </LandingContainer>
  );
}

function DiscountSection({ design }: { design: YekpareLandingDesign }) {
  const disc = design.discount;
  return (
    <LandingContainer className="py-6">
      <div className="relative overflow-hidden rounded-[20px] shadow-lg">
        <img src={disc.backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#039D55]/95 to-emerald-600/90" />
        <div className="relative px-6 py-12 text-center text-white md:px-10 md:py-14">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">{disc.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-black md:text-4xl">{disc.title}</h3>
          <LandingLightCta
            href={disc.ctaHref}
            label={disc.ctaLabel}
            fallback={LANDING_CTA_LABEL_FALLBACKS.discount}
            className="mt-6 rounded-full"
          />
        </div>
      </div>
    </LandingContainer>
  );
}

function TestimonialsSection({ design }: { design: YekpareLandingDesign }) {
  const t = design.testimonials;
  return (
    <section className="bg-slate-50 pb-4">
      <LandingContainer>
        <div className="text-center">
          <h2 className="text-lg font-semibold md:text-3xl">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <div className="yekpare-scrollbar grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-6 pt-6 md:auto-cols-[minmax(320px,48%)]">
          {t.items.map((item) => (
            <article
              key={item.name}
              className="min-h-[180px] rounded-xl border border-slate-100 bg-white p-5 shadow-[0_8px_32px_rgba(15,23,42,0.06)]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-sm font-black text-[#039D55]">
                  {item.name[0]}
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">{item.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.role}</p>
                </div>
              </div>
              <p className="text-sm font-medium leading-6 text-slate-600">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </article>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function GallerySection({ design }: { design: YekpareLandingDesign }) {
  const g = design.gallery;
  return (
    <section className="bg-gradient-to-b from-emerald-50/50 to-white">
      <LandingContainer className="py-10 md:py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{g.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{g.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {g.items.map((item) => (
            <div
              key={item.title}
              className="group overflow-hidden rounded-[14px] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent opacity-80" />
                <p className="absolute bottom-3 left-3 text-sm font-black text-white">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function HighlightSection({
  design,
  hasLocation,
}: {
  design: YekpareLandingDesign;
  hasLocation: boolean;
}) {
  const h = design.highlight;
  const href = hasLocation ? h.ctaHref : "/haritalar";
  const label = hasLocation ? h.ctaLabel : "Konum seç";
  const fallback = hasLocation
    ? LANDING_CTA_LABEL_FALLBACKS.highlightLocated
    : LANDING_CTA_LABEL_FALLBACKS.highlight;
  return (
    <LandingContainer className="py-6 md:py-8">
      <div className="overflow-hidden rounded-[20px] bg-[#039D55] shadow-lg">
        <div className="grid items-center md:grid-cols-[minmax(0,1fr)_minmax(200px,32%)]">
          <div className="p-6 text-white md:p-8">
            <h2 className="text-2xl font-black md:text-4xl">{h.title}</h2>
            <p className="mt-3 max-w-xl text-sm font-semibold text-white/85">{h.description}</p>
            <LandingLightCta
              href={href}
              label={label}
              fallback={fallback}
              className="mt-5"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-[#039D55]" />
            </LandingLightCta>
          </div>
          <div className="relative hidden h-full min-h-[200px] md:block">
            <img src={h.image} alt="" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#039D55] to-transparent" />
          </div>
        </div>
      </div>
    </LandingContainer>
  );
}

function FaqSection({
  design,
  faqTab,
  setFaqTab,
  expandedFaq,
  setExpandedFaq,
}: {
  design: YekpareLandingDesign;
  faqTab: FaqTabId;
  setFaqTab: (t: FaqTabId) => void;
  expandedFaq: number | false;
  setExpandedFaq: (n: number | false) => void;
}) {
  const faq = design.faq;
  const activeTab = faq.tabs.find((t) => t.id === faqTab) ?? faq.tabs[0];
  return (
    <LandingContainer className="pb-16 md:pb-24">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="text-lg font-semibold md:text-3xl">{faq.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {faq.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFaqTab(tab.id);
                  setExpandedFaq(0);
                }}
                className={`rounded-full px-4 py-2 text-xs font-black sm:text-sm ${
                  faqTab === tab.id ? "bg-[#039D55] text-white" : "bg-slate-100 text-slate-700"
                }`}
                style={faqTab === tab.id ? { color: "#fff" } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {activeTab?.items.map((item, idx) => (
              <details
                key={item.q}
                open={expandedFaq === idx}
                className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm"
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) setExpandedFaq(idx);
                }}
              >
                <summary className="cursor-pointer text-sm font-black text-slate-950">{item.q}</summary>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-[#039D55]" />
            <p className="mt-3 text-sm font-black text-slate-900">{faq.sidebarTitle}</p>
            <p className="mt-2 text-xs font-semibold text-slate-600">{faq.sidebarText}</p>
            <Link href={faq.sidebarHref} className="mt-4 inline-flex text-sm font-black text-[#039D55]">
              {faq.sidebarHref} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </LandingContainer>
  );
}

function renderSection(
  id: LandingSectionId,
  design: YekpareLandingDesign,
  ctx: {
    hasLocation: boolean;
    locLabel: string;
    onOpenPicker: () => void;
    searchText: string;
    onSearchTextChange: (value: string) => void;
    onSearch: (query?: string) => void;
    homeTheme: "day" | "night";
    themeSource: "auto" | "manual";
    onToggleTheme: () => void;
    onResetThemeAuto: () => void;
    faqTab: FaqTabId;
    setFaqTab: (t: FaqTabId) => void;
    expandedFaq: number | false;
    setExpandedFaq: (n: number | false) => void;
  },
) {
  switch (id) {
    case "hero":
      return (
        <HeroSection
          design={design}
          onOpenPicker={ctx.onOpenPicker}
          searchText={ctx.searchText}
          onSearchTextChange={ctx.onSearchTextChange}
          onSearch={ctx.onSearch}
          homeTheme={ctx.homeTheme}
          themeSource={ctx.themeSource}
          onToggleTheme={ctx.onToggleTheme}
          onResetThemeAuto={ctx.onResetThemeAuto}
        />
      );
    case "stats":
      return <StatsSection design={design} />;
    case "zones":
      return <ZonesSection design={design} />;
    case "banners":
      return <BannersSection design={design} />;
    case "appDownload":
      return <AppDownloadSection design={design} />;
    case "partners":
      return <PartnersSection design={design} />;
    case "vendorCta":
      return <VendorCtaSection design={design} />;
    case "deliveryCta":
      return <DeliveryCtaSection design={design} />;
    case "discount":
      return <DiscountSection design={design} />;
    case "testimonials":
      return <TestimonialsSection design={design} />;
    case "gallery":
      return <GallerySection design={design} />;
    case "highlight":
      return <HighlightSection design={design} hasLocation={ctx.hasLocation} />;
    case "faq":
      return (
        <FaqSection
          design={design}
          faqTab={ctx.faqTab}
          setFaqTab={ctx.setFaqTab}
          expandedFaq={ctx.expandedFaq}
          setExpandedFaq={ctx.setExpandedFaq}
        />
      );
    default:
      return null;
  }
}

export default function YekpareLandingHome() {
  const { data: siteSettings } = useGetSiteSettings();
  const { theme: homeTheme, source: themeSource, toggleTheme, resetToAuto } = useHomepageDayNightTheme();
  const design = useMemo(
    () => parseYekpareLandingDesignFromJson(siteSettings?.homepageDesignJson ?? null),
    [siteSettings?.homepageDesignJson],
  );
  const sectionOrder = useMemo(() => resolveLandingSectionOrder(design), [design]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [storedLoc, setStoredLoc] = useState<PublicLocationState | null>(() =>
    typeof window !== "undefined" ? readPublicLocation() : null,
  );
  const [faqTab, setFaqTab] = useState<FaqTabId>("customer");
  const [expandedFaq, setExpandedFaq] = useState<number | false>(0);
  const locLabel = formatPublicLocationLabel(storedLoc);
  const hasLocation = Boolean(storedLoc?.label || storedLoc?.city || storedLoc?.district);

  useEffect(() => {
    const sync = () => setStoredLoc(readPublicLocation());
    sync();
    const onUpdated = (event: Event) => {
      setStoredLoc((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, []);

  useEffect(() => {
    const first = design.faq.tabs[0]?.id;
    if (first) setFaqTab(first);
  }, [design.faq.tabs]);

  const submitHeroSearch = (queryOverride?: string) => {
    const q = (queryOverride ?? searchText).trim();
    if (typeof window === "undefined") return;
    if (q) pushRecentSearch(q);
    window.location.href = q ? `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}` : UNIFIED_SEARCH_PATH;
  };

  const sectionCtx = {
    hasLocation,
    locLabel,
    onOpenPicker: () => setPickerOpen(true),
    searchText,
    onSearchTextChange: setSearchText,
    onSearch: submitHeroSearch,
    homeTheme,
    themeSource,
    onToggleTheme: toggleTheme,
    onResetThemeAuto: resetToAuto,
    faqTab,
    setFaqTab,
    expandedFaq,
    setExpandedFaq,
  };

  return (
    <SadePublicChrome fullBleed searchPlaceholder="Yekpare'de ara — haber, video, firma, ürün">
      <SadeLocationPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} mapsSettings={siteSettings ?? null} />

      <div className="yekpare-home-root yekpare-home-body bg-white text-slate-950" data-home-theme={homeTheme}>
        {sectionOrder.map((id) => {
          const enabled = isLandingSectionEnabled(design, id);
          return (
            <Fragment key={id}>
              {enabled ? <div>{renderSection(id, design, sectionCtx)}</div> : null}
              {id === "hero" && enabled ? (
                <div className="yekpare-home-section-light">
                  <KesfetDiscoverHubSection variant="section" />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </SadePublicChrome>
  );
}
