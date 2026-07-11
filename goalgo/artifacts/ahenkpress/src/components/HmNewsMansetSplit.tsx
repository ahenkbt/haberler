import { type CSSProperties } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export type HmMansetSlide = {
  id: number | string;
  slug?: string | null;
  title: string;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryColor?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
};

export type HmMansetQuickLink = {
  key: string;
  href: string;
  label: string;
  icon: string;
};

function vitrinImgSrc(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(new Date(d), "d MMM yyyy", { locale: tr });
  } catch {
    return "";
  }
}

function catColor(c: HmMansetSlide, accent: string, hmCategoryColors?: Record<string, string> | null): string {
  const slug = String(c.categorySlug ?? "").trim().toLowerCase();
  const raw = slug && hmCategoryColors?.[slug];
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  if (typeof c.categoryColor === "string" && HEX_COLOR.test(c.categoryColor.trim())) return c.categoryColor.trim();
  return accent;
}

export function HmNewsHeroSlider({
  slides,
  accent,
  aspectRatio = "3/2",
  thumbStripBelow = false,
  hmCategoryColors,
}: {
  slides: HmMansetSlide[];
  accent: string;
  aspectRatio?: string;
  thumbStripBelow?: boolean;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();
  const len = slides.length;
  const slider = useHeadlineSliderInteraction(len);
  const idx = slider.index;
  const current = slides[idx];
  if (!current) return null;
  const currentImage = resolveNewsItemImageUrl(current) || current.imageUrl;

  return (
    <div className="space-y-2">
      <div
        className="hm-vitrin-hero relative overflow-hidden rounded-xl"
        style={{ aspectRatio, ...slider.swipeStyle }}
        {...slider.bind}
      >
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <HmNewsImage
            src={currentImage}
            alt={current.title}
            wrapperClassName="absolute inset-0"
            className="hm-vitrin-hero-img h-full w-full object-cover"
            priority
            loading="eager"
          />
        </div>
        <div className="hm-vitrin-hero-overlay pointer-events-none absolute inset-0 z-10" />
        <Link
          href={h(`/haber/${current.slug || current.id}`)}
          className="absolute inset-0 z-[12] rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label={current.title}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 max-sm:max-h-[22%] max-sm:overflow-hidden p-1.5 pb-1.5 sm:max-h-none sm:p-4 sm:pb-4">
          <div
            className="hm-vitrin-hero-title-rail flex min-h-0 flex-col max-sm:gap-1"
            style={{ ["--hero-accent" as string]: accent } as CSSProperties}
          >
            <h2 className="order-1 font-black text-white drop-shadow-sm max-sm:truncate max-sm:text-[9px] max-sm:uppercase max-sm:tracking-[0.06em] max-sm:leading-tight sm:order-2 sm:text-xl sm:leading-snug sm:line-clamp-3 sm:tracking-normal">
              {current.title}
            </h2>
            {current.categoryName ? (
              <span
                className="order-2 inline-block self-start rounded-sm px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-white max-sm:mb-0 sm:order-1 sm:mb-2 sm:px-2.5 sm:text-[10px]"
                style={{ background: catColor(current, accent, hmCategoryColors) }}
              >
                {current.categoryName}
              </span>
            ) : null}
            <div className="order-4 flex flex-wrap items-center gap-x-2 gap-y-0 max-sm:mt-0 sm:order-4 sm:mt-2 sm:gap-x-3">
              {current.authorName ? (
                <span className="hidden text-xs text-white/70 sm:inline sm:text-white/60">✍️ {current.authorName}</span>
              ) : null}
              <span className="flex items-center gap-0.5 text-[10px] text-white/60 sm:gap-1 sm:text-xs sm:text-white/50">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {fmtDate(current.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {len > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                slider.prev();
              }}
              className="absolute left-2 top-1/2 z-[25] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                slider.next();
              }}
              className="absolute right-2 top-1/2 z-[25] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 right-4 z-[25] flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => slider.setIndex(i)}
                  className={`rounded-full transition-all ${i === idx ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/50 hover:bg-white/80"}`}
                  aria-label={`${i + 1}. haber`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      {thumbStripBelow && len > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => slider.setIndex(i)}
              className="shrink-0 overflow-hidden rounded-lg border-2 transition"
              style={{
                borderColor: i === idx ? accent : "transparent",
                boxShadow: i === idx ? `0 0 0 2px ${accent}44` : undefined,
              }}
            >
              <div className="h-[52px] w-[76px] overflow-hidden sm:h-16 sm:w-24">
                <HmNewsImage src={resolveNewsItemImageUrl(s)} alt="" loading="lazy" />
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HmNewsMansetSplit({
  sliderSlides,
  sideSlides,
  accent,
  hmCategoryColors,
  quickLinks,
  className = "",
  sideDense = false,
}: {
  sliderSlides: HmMansetSlide[];
  sideSlides: HmMansetSlide[];
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  quickLinks?: HmMansetQuickLink[];
  className?: string;
  /** Kurumsal vitrin: daha fazla sağ kutu sığdırmak için kompakt kartlar */
  sideDense?: boolean;
}) {
  const h = useHmPublicHref();
  if (!sliderSlides.length) return null;

  return (
    <div
      className={`hm-manset-split grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)] lg:items-stretch ${className}`.trim()}
      data-manset-variant="split"
    >
      <div className="min-w-0 lg:h-full">
        <HmNewsHeroSlider slides={sliderSlides} accent={accent} aspectRatio="3/2" hmCategoryColors={hmCategoryColors} />
      </div>
      <div className="flex min-w-0 flex-col gap-2 lg:h-full">
        <div
          className={`hm-manset-split-side grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2 lg:auto-rows-fr ${sideDense ? "gap-1.5" : "gap-2"}`}
          style={{ ["--hm-split-side-rows" as string]: "2" }}
        >
          {sideSlides.map((n) => (
            <Link
              key={`side-${n.id}-${resolveNewsItemImageUrl(n) || n.title}`}
              href={h(`/haber/${n.slug || n.id}`)}
              className={`hm-vitrin-card group flex overflow-hidden rounded-xl p-2.5 shadow transition-all hover:-translate-y-0.5 hover:shadow-md lg:h-full ${
                sideDense
                  ? "min-h-[80px] gap-2 xl:min-h-0"
                  : "min-h-[94px] gap-2.5 xl:min-h-0"
              }`}
            >
              <div
                className={`shrink-0 overflow-hidden rounded-lg bg-gray-100 ${
                  sideDense
                    ? "h-[58px] w-[58px] sm:h-[62px] sm:w-[62px] xl:h-[66px] xl:w-[66px]"
                    : "h-[68px] w-[68px] sm:h-[72px] sm:w-[72px] xl:h-[78px] xl:w-[78px]"
                }`}
              >
                <HmNewsImage
                  src={resolveNewsItemImageUrl(n)}
                  alt={n.title}
                  className="transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                {n.categoryName ? (
                  <span className="text-[9px] font-black uppercase" style={{ color: catColor(n, accent, hmCategoryColors) }}>
                    {n.categoryName}
                  </span>
                ) : null}
                <p className={`mt-0.5 font-bold leading-snug text-gray-900 ${sideDense ? "line-clamp-2 text-[11px] xl:text-xs" : "line-clamp-3 text-xs xl:text-sm"}`}>
                  {n.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-2.5 w-2.5" />
                  {fmtDate(n.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {quickLinks && quickLinks.length > 0 ? (
          <div className="hm-vitrin-card mt-2 rounded-xl p-3 shadow">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-gray-900">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: accent }} /> Hızlı Erişim
            </p>
            <div className="grid grid-cols-2 gap-1">
              {quickLinks.map((l) => (
                <Link
                  key={l.key}
                  href={l.href}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:underline"
                >
                  <span>{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
