import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudSun,
  Flame,
  Mail,
  TrendingUp,
} from "lucide-react";
import {
  getListFeaturedNewsQueryKey,
  useListFeaturedNews,
} from "@workspace/api-client-react";
import {
  HM_HOME_HEADLINE_SLIDER_LIMIT,
} from "@/lib/hmHeadlinePool";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";
import {
  ATATURK_CORNER_HOME_QUOTE,
  ATATURK_CORNER_LINKS,
  ATATURK_CORNER_PORTRAIT_SRC,
  ataturkCornerPath,
  pickAtaturkCornerHomeQuote,
} from "@/lib/hmAtaturkCorner";
import {
  HM_WAR_PAGES,
  NATIONAL_DAY_HIGHLIGHTS,
  NATIONAL_DAYS,
  corporateWarPath,
  nationalDayEncyclopediaPath,
} from "@/lib/hmCorporateHeritage";
import { cityAccessibilityLabel, METROPOLITAN_CITIES } from "@/lib/popularCities";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import { HmRssBreakingBand, type RssBreakingBandFallbackItem } from "@/components/HmRssBreakingBand";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

function isExternalHref(href: string): boolean {
  return isExternalNewsHref(href);
}

import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { coercePublicHybridNewsHref, isExternalNewsHref } from "@/lib/hybridNewsHref";

export const SADE_NEWS_ACCENT = "#039D55";
export const SADE_NEWS_ACCENT_DARK = "#028347";

export type SadeNewsCardItem = {
  id: number | string;
  slug?: string | null;
  title: string;
  spot?: string | null;
  summary?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  source?: "db" | "rss";
  href?: string | null;
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean;
};

function sadeNewsItemHref(item: SadeNewsCardItem): string {
  return coercePublicHybridNewsHref(item);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Shared featured headline pool — homepage and /haberler use the same source and slice. */
export function useSadeFeaturedHeadlines(limit = HM_HOME_HEADLINE_SLIDER_LIMIT) {
  const { data: featuredNews } = useListFeaturedNews({
    query: {
      queryKey: [...getListFeaturedNewsQueryKey(), limit],
      staleTime: 2 * 60 * 1000,
    },
  });
  return useMemo(
    () => ((featuredNews ?? []) as SadeNewsCardItem[]).slice(0, limit),
    [featuredNews, limit],
  );
}

type HeroSliderProps = {
  slides: SadeNewsCardItem[];
  /** When true, stretch to parent grid cell height (headline card parity). */
  fillHeight?: boolean;
  className?: string;
};

export function SadeNewsHeroSlider({ slides, fillHeight = false, className = "" }: HeroSliderProps) {
  const len = slides.length;
  const slider = useHeadlineSliderInteraction(len);
  const idx = slider.index;
  const item = slides[idx];
  if (!item) return null;

  return (
    <div
      className={`hm-sade-headline-hero relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-100 shadow-sm ${fillHeight ? "h-full" : ""} ${className}`}
      style={slider.swipeStyle}
      {...slider.bind}
    >
      <div className="hm-sade-headline-hero-frame">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}
          >
            {s.imageUrl ? (
              <img
                src={resolveClientMediaSrc(s.imageUrl) || s.imageUrl}
                alt={s.title}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-emerald-50 to-amber-50 text-6xl">
                📰
              </div>
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
        <Link href={sadeNewsItemHref(item)} className="absolute inset-0 z-10" aria-label={item.title} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6">
          {item.categoryName ? (
            <span
              className="mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white"
              style={{ background: SADE_NEWS_ACCENT }}
            >
              {item.categoryName}
            </span>
          ) : null}
          <h2 className="line-clamp-3 text-lg font-black leading-snug text-white sm:text-2xl md:text-3xl">{item.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <Clock className="h-3.5 w-3.5" />
            {fmtDate(item.publishedAt || item.createdAt)}
          </p>
        </div>
        {len > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                slider.prev();
              }}
              className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                slider.next();
              }}
              className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Son dakika", href: "/kategori/son-dakika", icon: "🔴" },
  { label: "Tüm haberler", href: "/haberler", icon: "📰" },
  { label: "Yazarlar", href: "/yazarlar", icon: "✍️" },
  { label: "Keşfet", href: "/kesfet", icon: "✨" },
] as const;

function SadeHeadlineSideCard({ item }: { item: SadeNewsCardItem }) {
  const img = item.imageUrl ? resolveClientMediaSrc(item.imageUrl) || item.imageUrl : null;
  return (
    <Link
      href={sadeNewsItemHref(item)}
      className="group flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:border-emerald-200"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-50 to-slate-100 text-2xl">📰</div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center p-2 sm:p-2.5">
        {item.categoryName ? (
          <span className="text-[8px] font-black uppercase sm:text-[9px]" style={{ color: SADE_NEWS_ACCENT }}>
            {item.categoryName}
          </span>
        ) : null}
        <p className="line-clamp-2 text-[11px] font-black leading-snug text-slate-900 group-hover:text-[#039D55] sm:text-xs">
          {item.title}
        </p>
      </div>
    </Link>
  );
}

function SadeNewsQuickAccess({ className = "" }: { className?: string }) {
  return (
    <div className={`shrink-0 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm sm:p-3 ${className}`}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-900">
        <TrendingUp className="h-3.5 w-3.5" style={{ color: SADE_NEWS_ACCENT }} />
        Hızlı erişim
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-2 text-[11px] font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#039D55] sm:text-xs"
          >
            <span className="shrink-0 text-sm leading-none">{l.icon}</span>
            <span className="truncate">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Shared manşet grid — same hero + side cards on `/` and `/haberler`. */
export function SadeNewsHeadlineGrid({
  slides,
  sideItems,
  showQuickAccess = true,
  mobileTwoColumn = false,
}: {
  slides: SadeNewsCardItem[];
  sideItems?: SadeNewsCardItem[];
  showQuickAccess?: boolean;
  /** Anasayfa mobil: yan haber kartları 2 sütun grid. */
  mobileTwoColumn?: boolean;
}) {
  const sideNews = (sideItems !== undefined ? sideItems : slides.slice(1)).slice(0, 4);
  if (!slides.length) return null;

  const sideGridClass = mobileTwoColumn
    ? "grid grid-cols-2 gap-2 lg:min-h-0 lg:flex-1"
    : "grid grid-cols-2 gap-2 sm:gap-2.5 lg:min-h-0 lg:flex-1";

  return (
    <div
      className={`grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch lg:gap-3 ${
        mobileTwoColumn ? "max-lg:gap-2.5" : "gap-4"
      }`}
    >
      <SadeNewsHeroSlider slides={slides} fillHeight className={mobileTwoColumn ? "" : ""} />
      <div className="flex min-h-0 flex-col gap-2 lg:h-full">
        <div className={sideGridClass}>
          {sideNews.map((n) => (
            <SadeHeadlineSideCard key={n.id} item={n} />
          ))}
        </div>
        {showQuickAccess ? <SadeNewsQuickAccess /> : null}
      </div>
    </div>
  );
}

/** Yekpare portal — HM editör sitelerinden senkronlanan manuel haberler (RSS hariç). */
export function SadeYekpareHaberlerBlock({
  items,
  href = "/tum-haberler",
}: {
  items: SadeNewsCardItem[];
  href?: string;
}) {
  const pool = items.filter((item) => {
    if (item.source === "rss") return false;
    if (item.hmSyncKind === "news") return true;
    const sync = String(item.rssSourceUrl ?? "").trim();
    return /^yekpare-hm-sync:\d+:news:\d+$/.test(sync);
  });
  if (!pool.length) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Yekpare Haberler</h2>
          <Link href={href} className="text-xs font-black uppercase tracking-wide text-[#039D55] hover:underline">
            Tümü
          </Link>
        </div>
        <p className="text-sm font-medium text-slate-500">Henüz editör sitelerinden manuel haber bulunmuyor.</p>
      </section>
    );
  }
  const slides = pool.slice(0, 8);
  const sideItems = pool.slice(1, 5);
  return (
    <section className="rounded-2xl border border-emerald-100 bg-[#f4faf7] p-3 sm:p-4" data-hm-home-module="yekpareHaberler">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#039D55]">Editör siteleri</p>
          <h2 className="text-lg font-black text-slate-950">Yekpare Haberler</h2>
        </div>
        <Link href={href} className="text-xs font-black uppercase tracking-wide text-[#039D55] hover:underline">
          Tümü
        </Link>
      </div>
      <SadeNewsHeadlineGrid slides={slides} sideItems={sideItems} showQuickAccess={false} />
    </section>
  );
}

type FinanceRow = { key: string; label: string; value: string; change: string; direction: "up" | "down" | "flat" };

const FINANCE_FALLBACK: FinanceRow[] = [
  { key: "USD", label: "USD/TRY", value: "34,12", change: "+0,08", direction: "up" },
  { key: "EUR", label: "EUR/TRY", value: "36,88", change: "-0,02", direction: "down" },
  { key: "GA", label: "Gram Altın", value: "3.245 ₺", change: "+12", direction: "up" },
  { key: "BIST", label: "BIST 100", value: "9.412", change: "+0,4%", direction: "up" },
];

/** Piyasa + hava özeti — Sade yeşil/beyaz tema. */
export function SadeFinanceWeatherStrip({
  showFinance = true,
  showWeather = true,
}: {
  showFinance?: boolean;
  showWeather?: boolean;
}) {
  if (!showFinance && !showWeather) return null;
  const { data: financeRaw = [] } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: async () => {
      const r = await fetch("/api/finance");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rates = useMemo(() => {
    const items = Array.isArray(financeRaw) ? financeRaw : [];
    if (!items.length) return FINANCE_FALLBACK;
    const order = ["USD", "EUR", "GA", "BIST"] as const;
    const labels: Record<(typeof order)[number], string> = {
      USD: "USD/TRY",
      EUR: "EUR/TRY",
      GA: "Gram Altın",
      BIST: "BIST 100",
    };
    const bySymbol = new Map(items.map((item: { symbol: string; label?: string; value: string; change: string; direction?: string }) => [item.symbol, item]));
    const rows: FinanceRow[] = [];
    for (const symbol of order) {
      const item = bySymbol.get(symbol);
      if (!item) continue;
      rows.push({
        key: symbol,
        label: labels[symbol],
        value: symbol === "GA" ? `${item.value} ₺` : item.value,
        change: item.change,
        direction: (item.direction as FinanceRow["direction"]) || "flat",
      });
    }
    return rows.length ? rows : FINANCE_FALLBACK;
  }, [financeRaw]);

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white sm:text-xs"
          style={{ background: SADE_NEWS_ACCENT }}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Piyasa · Hava
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-1.5 text-[11px] text-slate-700 lg:border-b-0 lg:border-r">
          {showFinance
            ? rates.map((r) => (
                <span key={r.key} className="whitespace-nowrap">
                  <span className="font-semibold text-slate-500">{r.label}</span>{" "}
                  <span className="font-black tabular-nums text-slate-900">{r.value}</span>{" "}
                  <span
                    className={`font-semibold ${r.direction === "down" ? "text-rose-600" : r.direction === "up" ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {r.change}
                  </span>
                </span>
              ))
            : null}
        </div>
        {showWeather ? (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-slate-600">
          <CloudSun className="h-4 w-4 shrink-0" style={{ color: SADE_NEWS_ACCENT }} />
          <span>
            <strong className="text-slate-900">Ankara</strong> parçalı bulutlu{" "}
            <span className="font-black tabular-nums text-slate-900">19°C</span>
            <span className="mx-1 text-slate-300">·</span>
            <strong className="text-slate-900">İstanbul</strong>{" "}
            <span className="font-black tabular-nums text-slate-900">17°C</span>
          </span>
        </div>
        ) : null}
      </div>
    </div>
  );
}

/** Kamu bilgi kartları — namaz vakti / günün sözü stub. */
export function SadePublicInfoCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Namaz vakitleri · İstanbul</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-700">
          {[["İmsak", "03:42"], ["Öğle", "13:08"], ["Akşam", "20:31"]].map(([label, time]) => (
            <div key={label} className="rounded-lg bg-emerald-50 px-2 py-2">
              <p className="text-[9px] font-black uppercase text-slate-500">{label}</p>
              <p className="mt-0.5 font-black tabular-nums text-slate-900">{time}</p>
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-xl border border-slate-100 p-4 shadow-sm text-white"
        style={{ background: `linear-gradient(135deg, ${SADE_NEWS_ACCENT}, ${SADE_NEWS_ACCENT_DARK})` }}
      >
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100">Günün sözü</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/95">
          &ldquo;Haber, doşru bilginin topluma ulaşmasıdır.&rdquo;
        </p>
        <p className="mt-2 text-[10px] font-bold text-emerald-100/80">— Yekpare Haber Merkezi</p>
      </div>
    </div>
  );
}

/** Bülten / koyu CTA — Sade tema. */
export function SadeNewsletterCta() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setMsg("Teşekkürler! Bülten kaydınız alındı.");
    setEmail("");
  }

  return (
    <div className="rounded-[1.25rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#0f766e]">
            <Mail className="h-4 w-4" />
            Bülten
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Gündemi e-postanıza alın</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">Manşet ve son dakika özetleri haftalık bültenle.</p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            className="flex-1 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#039D55]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-black text-white"
            style={{ background: SADE_NEWS_ACCENT, color: "#fff" }}
          >
            Abone ol
          </button>
        </form>
      </div>
      {msg ? <p className="mt-3 text-xs font-semibold text-[#039D55]">{msg}</p> : null}
    </div>
  );
}

/** Son gelişmeler zaman çizgisi — breaking haberlerden. */
export function SadeEditorialTimeline({ items }: { items: SadeNewsCardItem[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-4 text-sm font-black uppercase tracking-wide text-slate-900">Son gelişmeler</p>
      <ol className="space-y-3 border-l-2 border-emerald-100 pl-4">
        {items.slice(0, 6).map((n) => (
          <li key={n.id} className="relative">
            <span
              className="absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ background: SADE_NEWS_ACCENT }}
            />
            <Link href={sadeNewsItemHref(n)} className="group block">
              <p className="text-[10px] font-bold text-slate-400">{fmtDate(n.publishedAt || n.createdAt) || "Az önce"}</p>
              <p className="line-clamp-2 text-xs font-black leading-snug text-slate-800 group-hover:text-[#039D55]">{n.title}</p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Son dakika yatay ticker + kart bandı — portal /haberler (legacy HaberAnasayfasi ticker mantışı). */
export function SadeBreakingBand({ items }: { items: SadeNewsCardItem[] }) {
  if (!items.length) return null;
  const tickerItems = items.slice(0, 10);
  const cardItems = items.slice(0, 6);

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-white shadow-sm">
      <div className="flex items-stretch overflow-hidden">
        <div
          className="flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wide text-white"
          style={{ background: SADE_NEWS_ACCENT }}
        >
          <Flame className="h-3.5 w-3.5" />
          Son Dakika
        </div>
        <div className="relative flex-1 overflow-hidden bg-slate-900 py-3">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((n, i) => (
              <Link
                key={`${n.id}-${i}`}
                href={sadeNewsItemHref(n)}
                className="inline-flex shrink-0 items-center gap-3 px-6 text-xs font-semibold text-white/90 transition hover:text-white"
              >
                <span className="max-w-[min(70vw,28rem)] truncate">{n.title}</span>
                <span className="text-white/25" aria-hidden>|</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div
        className="yekpare-scrollbar flex gap-3 overflow-x-auto border-t border-slate-100 p-4 pb-5"
      >
        {cardItems.map((n) => {
          const href = sadeNewsItemHref(n);
          const img = resolveClientMediaSrc(n.imageUrl);
          return (
            <Link
              key={n.id}
              href={href}
              className="group flex w-[168px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md sm:w-[188px]"
            >
              <div className="relative h-[88px] overflow-hidden bg-slate-200">
                {img ? (
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-full items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${SADE_NEWS_ACCENT}, ${SADE_NEWS_ACCENT_DARK})` }}
                  >
                    <Flame className="h-5 w-5 opacity-90" />
                  </div>
                )}
                <span
                  className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white"
                  style={{ background: SADE_NEWS_ACCENT }}
                >
                  Son dakika
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-3 text-xs font-black leading-snug text-slate-900 group-hover:text-[#039D55]">
                  {n.title}
                </p>
                {n.categoryName ? (
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{n.categoryName}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** RSS son dakika kart bandı — portal /haberler (legacy HmRssBreakingBand + portal haber yedeşi). */
export function SadeRssBreakingBand({
  layoutPrefs,
  fallbackItems,
}: {
  layoutPrefs: NewsSiteLayoutPrefs;
  fallbackItems: SadeNewsCardItem[];
}) {
  const fallbackNewsItems = useMemo((): RssBreakingBandFallbackItem[] => {
    return fallbackItems.slice(0, 10).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      summary: item.summary ?? item.spot ?? null,
      spot: item.spot,
      imageUrl: item.imageUrl,
      categoryName: item.categoryName,
      publishedAt: item.publishedAt ?? null,
      createdAt: item.createdAt ?? null,
      source: item.source,
      href: item.href ?? null,
    }));
  }, [fallbackItems]);

  return (
    <HmRssBreakingBand
      accent={SADE_NEWS_ACCENT}
      layoutPrefs={layoutPrefs}
      fallbackNewsItems={fallbackNewsItems.length ? fallbackNewsItems : undefined}
      fallbackHrefPrefix="/haber/"
      className="overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-white shadow-sm"
    />
  );
}

type SadeBandCard = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: string;
  meta?: string;
  external?: boolean;
};

function SadeBandCardLink({
  card,
  accent,
  compact = false,
  fluid = false,
}: {
  card: SadeBandCard;
  accent: string;
  compact?: boolean;
  fluid?: boolean;
}) {
  const className = fluid
    ? "group flex min-w-0 flex-col rounded-lg border border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-2.5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    : compact
      ? "group flex w-[108px] shrink-0 flex-col rounded-lg border border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-2.5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:w-[118px]"
      : "group flex w-[148px] shrink-0 flex-col rounded-xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-3 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:w-[168px]";
  const content = (
    <>
      <div
        className={`mb-2 flex items-center justify-center rounded-lg shadow-sm ${compact ? "h-8 w-8 text-base" : "h-10 w-10 text-xl"}`}
        style={{ background: `color-mix(in srgb, ${accent} 12%, white)` }}
        aria-hidden
      >
        {card.icon ?? "•"}
      </div>
      {card.meta ? (
        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
          {card.meta}
        </span>
      ) : null}
      <p className="mt-1 line-clamp-2 text-xs font-black leading-snug text-slate-900 group-hover:text-[#039D55]">
        {card.title}
      </p>
      {card.subtitle ? (
        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-slate-500">{card.subtitle}</p>
      ) : null}
    </>
  );

  if (card.external && isExternalHref(card.href)) {
    return (
      <a href={card.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={card.href} className={className}>
      {content}
    </Link>
  );
}

function SadeHorizontalBand({
  title,
  accent,
  moreHref,
  moreLabel = "Tümü",
  cards,
  compact = false,
}: {
  title: string;
  accent: string;
  moreHref?: string;
  moreLabel?: string;
  cards: SadeBandCard[];
  compact?: boolean;
}) {
  if (!cards.length) return null;
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm">
      <div
        className={`flex items-center gap-2 border-b border-slate-100 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 8%, white), white)` }}
      >
        <span className={`rounded-full ${compact ? "h-4 w-1" : "h-5 w-1"}`} style={{ background: accent }} />
        <h3 className={`font-black uppercase tracking-wide text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>{title}</h3>
        <div className="flex-1" />
        {moreHref ? (
          <Link href={moreHref} className="text-xs font-black hover:underline" style={{ color: accent }}>
            {moreLabel} <ChevronRight className="inline h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div
        className={`yekpare-scrollbar flex gap-3 overflow-x-auto pb-5 ${compact ? "p-3 pb-4" : "p-4 pb-5"}`}
      >
        {cards.map((card) => (
          <SadeBandCardLink key={card.id} card={card} accent={accent} compact={compact} />
        ))}
      </div>
    </div>
  );
}

const ATATURK_BAND_CARDS: SadeBandCard[] = ATATURK_CORNER_LINKS.map((item) => ({
  id: item.slug,
  title: item.title,
  subtitle: item.eyebrow,
  href: ataturkCornerPath(item.slug),
  icon: item.number,
  meta: item.eyebrow,
}));

/** Atatürk bandı — tek satır; sol başlık, ortada orantılı kartlar, sağda söz paneli. */
export function SadeAtaturkBand() {
  const [quote, setQuote] = useState<string>(ATATURK_CORNER_HOME_QUOTE);

  useEffect(() => {
    setQuote(pickAtaturkCornerHomeQuote());
  }, []);

  return (
    <section aria-label="Atatürk Köşesi" className="hm-ataturk-band hm-ataturk-band--home hm-sade-ataturk-band overflow-hidden rounded-[1.25rem] border border-emerald-100/90 shadow-sm">
      <div
        className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5 lg:flex-row lg:items-stretch"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${SADE_NEWS_ACCENT} 7%, white) 0%, white 52%, color-mix(in srgb, ${SADE_NEWS_ACCENT} 5%, #f8fafc) 100%)`,
        }}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-[min(18%,200px)]">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-white shadow-sm sm:h-11 sm:w-11"
            aria-hidden
          >
            <img
              src={ATATURK_CORNER_PORTRAIT_SRC}
              alt=""
              className="h-[88%] w-[88%] object-contain object-bottom"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black tracking-tight text-slate-900 sm:text-[15px]">Atatürk Köşesi</h3>
            <Link
              href="/ataturk"
              className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-black text-[#039D55] hover:underline"
            >
              Tümü <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-2.5">
          {ATATURK_BAND_CARDS.map((card) => (
            <SadeBandCardLink key={card.id} card={card} accent={SADE_NEWS_ACCENT} compact fluid />
          ))}
        </div>

        <div
          className="min-w-0 shrink-0 rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2.5 shadow-sm sm:px-4 lg:w-[min(30%,300px)]"
          aria-live="polite"
        >
          <span className="pointer-events-none font-serif text-2xl leading-none text-emerald-200" aria-hidden>
            “
          </span>
          <blockquote className="relative z-[1] -mt-3 line-clamp-3 text-xs font-semibold italic leading-relaxed text-slate-700 sm:line-clamp-2 sm:text-sm">
            {quote}
          </blockquote>
          <cite className="mt-1 block not-italic text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Mustafa Kemal Atatürk
          </cite>
        </div>
      </div>
    </section>
  );
}

function cityEncyclopediaHref(name: string): string {
  return `/bilgiagaci/${wikiTitleToUrlSlug(name)}`;
}

function warmBilgiAgaciArticles(titles: string[]): void {
  const uniqueTitles = Array.from(new Set(titles.map((title) => title.trim()).filter(Boolean)));
  if (uniqueTitles.length === 0) return;
  fetch("/api/wiki/precache?lang=tr", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ titles: uniqueTitles }),
  }).catch(() => {});
}

/** Türkiye Şehirleri — Yekpare anasayfa kompakt bandı (içerik grid hizalı, yeşil panel). */
export function SadeHomeCitiesBandCompact() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = useCallback((direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }, []);

  useEffect(() => {
    warmBilgiAgaciArticles(METROPOLITAN_CITIES.map((city) => city.name));
  }, []);

  return (
    <section aria-label="Türkiye Şehirleri" className="mx-auto w-full max-w-[1440px] px-4">
      <div
        className="overflow-hidden rounded-[1.25rem] border border-emerald-100/90 shadow-sm"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${SADE_NEWS_ACCENT} 7%, white) 0%, white 52%, color-mix(in srgb, ${SADE_NEWS_ACCENT} 5%, #f8fafc) 100%)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white text-lg shadow-sm"
            aria-hidden
          >
            🗺️
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black tracking-tight text-slate-900 sm:text-[15px]">Türkiye Şehirleri</h3>
            <p className="text-[11px] font-semibold text-slate-500">{BILGI_AGACI_DISPLAY_NAME} şehir rehberi</p>
          </div>
          <Link
            href="/bilgiagaci"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-black text-[#039D55] shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            {BILGI_AGACI_DISPLAY_NAME} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative border-t border-emerald-100/70 px-1 pb-3 pt-2 sm:px-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="absolute left-1.5 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-emerald-100 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white sm:grid"
            aria-label="Önceki şehirler"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            ref={scrollRef}
            className="yekpare-scrollbar flex gap-2 overflow-x-auto px-1 py-1 sm:gap-2.5 sm:px-9"
          >
            {METROPOLITAN_CITIES.map((city) => (
              <Link
                key={city.name}
                href={cityEncyclopediaHref(city.name)}
                title={cityAccessibilityLabel(city)}
                aria-label={cityAccessibilityLabel(city)}
                className="group flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl border border-white/90 bg-white/95 px-2 py-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:w-[92px]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xl leading-none" aria-hidden>
                  {city.emoji}
                </span>
                <span className="line-clamp-2 text-[11px] font-black leading-tight text-slate-800 group-hover:text-[#039D55]">
                  {city.name}
                </span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-1.5 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-emerald-100 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white sm:grid"
            aria-label="Sonraki şehirler"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

const WAR_BAND_EMOJI: Record<string, string> = {
  "canakkale-savasi": "⚔️",
  "kurtulus-savasi": "🇹🇷",
  "kore-savasi": "🕊️",
  "kibris-baris-harekati": "🏝️",
};

const NATIONAL_DAY_BAND_EMOJI: Record<string, string> = {
  "Çalışan Gazeteciler Günü": "📰",
  "İstiklâl Marşı'nın Kabulü": "🎵",
  "Çanakkale Zaferi ve Şehitleri Anma Günü": "⚔️",
  "Ulusal Egemenlik ve Çocuk Bayramı": "👧",
  "Atatürk'ü Anma, Gençlik ve Spor Bayramı": "🏃",
  "Denizcilik ve Kabotaj Bayramı": "⚓",
  "Demokrasi ve Millî Birlik Günü": "🤝",
  "Büyük Taarruz'un Başlangıcı": "🎖️",
  "Zafer Bayramı": "🏆",
  "İzmir'in Kurtuluşu": "🕊️",
  "Cumhuriyet Bayramı": "🇹🇷",
  "Atatürk'ü Anma Günü": "🕯️",
  "Öğretmenler Günü": "📚",
  "Atatürk'ün Ankara'ya Gelişi": "🚂",
};

/** Tarih ve Millî Günler — savaşlar + millî günler tek yatay band. */
export function SadeHistoryNationalDaysBand() {
  const warCards: SadeBandCard[] = HM_WAR_PAGES.map((page) => ({
    id: `war-${page.slug}`,
    title: page.shortTitle,
    subtitle: page.summary,
    href: corporateWarPath(page.slug),
    icon: WAR_BAND_EMOJI[page.slug] ?? "⚔️",
    meta: page.year,
  }));
  const dayCards: SadeBandCard[] = NATIONAL_DAY_HIGHLIGHTS.map((highlight) => {
    const entry = NATIONAL_DAYS.find((day) => day.title === highlight.title);
    const href = entry ? nationalDayEncyclopediaPath(entry) : "/milli-gunler";
    return {
      id: `day-${highlight.day}-${highlight.title}`,
      title: highlight.title,
      subtitle: entry?.type ?? "Millî gün",
      href,
      icon: NATIONAL_DAY_BAND_EMOJI[highlight.title] ?? "📅",
      meta: highlight.day,
    };
  });

  useEffect(() => {
    warmBilgiAgaciArticles(
      NATIONAL_DAY_HIGHLIGHTS
        .map((highlight) => NATIONAL_DAYS.find((day) => day.title === highlight.title))
        .filter((day): day is NonNullable<typeof day> => Boolean(day))
        .map((day) => day.wikiTitle || day.title),
    );
  }, []);

  return (
    <SadeHorizontalBand
      title="⚔️ Tarih ve Millî Günler"
      accent="#b45309"
      moreHref="/savaslar"
      moreLabel="Tümü"
      cards={[...warCards, ...dayCards]}
    />
  );
}
