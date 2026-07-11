import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, ShoppingBag, Sparkles } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_PAGE_BG_WHITE, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";
import type { ReactNode } from "react";
import type { SellzyBanner } from "./types";

const YEKPARE_GREEN = "#0EA5E9";
/** Compact Yekpare Sade hero — replaces full-bleed Sellzy photo carousel at /magaza top. */
export function SellzyHero({
  banners,
  subNav,
  hideModuleHeroSearch = false,
}: {
  banners: SellzyBanner[];
  /** Cam alt menü — hero yüzeyinin üstünde (Turizm bc-home-hero referansı) */
  subNav?: ReactNode;
  /** Yekpare Sade chrome arama varken hero içi arama kutusunu gizle */
  hideModuleHeroSearch?: boolean;
}) {
  const slides = banners.length
    ? banners.map((b) => ({
        _id: b.id,
        name: b.name || b.subtitle || "Yekpare Mağaza",
        title: b.title,
        description: b.description || b.subtitle || "",
        discount: b.discount,
        buttonTitle: b.buttonTitle || b.ctaLabel || "Alışverişe başla",
        buttonHref: b.buttonHref || b.href || "/magaza/urunler",
      }))
    : [{
        _id: "fallback",
        name: "Yekpare Pazaryeri",
        title: "Binlerce ürün ve güvenilir mağaza tek Yekpare'de",
        description: "Elektronik, moda, ev & yaşam, market ve yerel satıcılardan alışveriş yapın.",
        discount: undefined as string | undefined,
        buttonTitle: "Alışverişe başla",
        buttonHref: "/magaza/urunler",
      }];

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme } = useYekpareTheme();
  const pageBg = theme === "night" ? "#020617" : SADE_PUBLIC_PAGE_BG_WHITE;

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const slide = slides[current] ?? slides[0];
  const heroSurfaceClass = [
    "sade-public-hero-surface w-full",
    subNav ? "sade-public-hero-surface--with-subnav" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
      <section className={heroSurfaceClass} style={sadePublicHeroFadeStyle(pageBg)}>
        {subNav}
        <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} relative magaza-hero__body`}>
        <div className="overflow-hidden rounded-[20px] border border-emerald-100/90 bg-white/80 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-7 lg:gap-8">
            <div className="min-w-0">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f766e] ring-1 ring-emerald-100">
                <ShoppingBag className="h-3.5 w-3.5" />
                {slide.name}
              </span>

              <Carousel
                setApi={setApi}
                plugins={[Autoplay({ delay: 6000, stopOnInteraction: false }), Fade()]}
                opts={{ loop: true, duration: 25 }}
                className="w-full"
              >
                <CarouselContent className="ml-0">
                  {slides.map((s) => (
                    <CarouselItem key={s._id} className="pl-0">
                      <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl lg:text-[2.15rem]">
                        {s.title}
                      </h1>
                      {s.description ? (
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                          {s.description}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link
                          href={s.buttonHref}
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:opacity-95"
                          style={{ backgroundColor: YEKPARE_GREEN, color: "#fff" }}
                        >
                          {s.buttonTitle}
                          <ArrowRight className="h-4 w-4 text-white" />
                        </Link>
                        {s.discount ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            {s.discount}
                          </span>
                        ) : null}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {!hideModuleHeroSearch ? (
                <form
                  className="mt-5 grid gap-2 rounded-[16px] bg-slate-50 p-2 ring-1 ring-slate-100 sm:grid-cols-[minmax(0,1fr)_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = searchQuery.trim();
                    window.location.href = q ? `/magaza/urunler?q=${encodeURIComponent(q)}` : "/magaza/urunler";
                  }}
                >
                  <label className="flex min-w-0 items-center gap-2 rounded-[12px] bg-white px-3 py-2.5">
                    <Search className="h-4 w-4 shrink-0 text-[#0f766e]" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ürün, marka veya mağaza ara"
                      aria-label="Mağazada ara"
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] px-5 py-2.5 text-sm font-black text-white transition hover:opacity-95"
                    style={{ backgroundColor: YEKPARE_GREEN, color: "#fff" }}
                  >
                    Ara
                  </button>
                </form>
              ) : null}
            </div>

            <aside className="hidden shrink-0 md:block">
              <div
                className="grid h-[168px] w-[220px] place-items-center rounded-[18px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-[#f4fbf7] p-5 text-center shadow-inner lg:h-[188px] lg:w-[248px]"
              >
                <div>
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f766e] text-white shadow-lg shadow-emerald-900/15">
                    <ShoppingBag className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-black text-slate-900">Yekpare Mağaza</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Çok satıcılı pazaryeri — güvenli alışveriş
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {slides.length > 1 ? (
            <div className="flex items-center justify-center gap-2 border-t border-emerald-50 px-4 py-3">
              {slides.map((s, index) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    current === index ? "w-8" : "w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                  style={current === index ? { backgroundColor: YEKPARE_GREEN } : undefined}
                  aria-label={`Slayt ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Tüm ürünler", href: "/magaza/urunler" },
            { label: "Kategoriler", href: "/magaza/kategoriler" },
            { label: "Satıcı ol", href: "/magaza/satici-ol" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[14px] border border-emerald-100 bg-white/90 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      </section>
    </div>
  );
}
