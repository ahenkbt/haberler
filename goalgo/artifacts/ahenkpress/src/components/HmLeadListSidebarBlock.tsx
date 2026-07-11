import { Link } from "wouter";
import { ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { splitCategoryBoxItems } from "@/lib/hmCategoryBoxItems";
import { HM_LEAD_LIST_SIDEBAR_TOTAL } from "@/lib/hmHeadlinePool";

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function newsDisplayTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(new Date(d), "d MMM, HH:mm", { locale: tr });
  } catch {
    return "";
  }
}

function itemCategoryColor(
  item: any,
  accent: string,
  hmCategoryColors?: Record<string, string> | null,
): string {
  const slug = String(item?.categorySlug ?? "").trim().toLowerCase();
  const raw = slug && hmCategoryColors?.[slug];
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  return item?.categoryColor || accent;
}

function itemCategoryLabel(item: any, fallback: string): string {
  return String(item?.categoryName || item?.feedLabel || fallback).trim() || fallback;
}

function LeadListSectionHead({
  title,
  color,
  href,
  categoryTag,
}: {
  title: string;
  color: string;
  href?: string;
  categoryTag?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="hm-vitrin-section-accent h-6 w-1 shrink-0 rounded-sm shadow-sm" style={{ background: color }} />
      <h2 className="text-base font-black uppercase tracking-[0.04em] text-gray-900">{title}</h2>
      {categoryTag ? (
        <span className="rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: color }}>
          {categoryTag}
        </span>
      ) : null}
      <div className="hm-vitrin-section-line min-h-px min-w-[12px] flex-1" />
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-bold transition hover:opacity-70" style={{ color }}>
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function LeadListHeroCard({
  item,
  accent,
  categoryFallback,
  hmCategoryColors,
  getItemHref,
  className = "",
  titleClassName = "text-xl sm:text-2xl",
}: {
  item: any;
  accent: string;
  categoryFallback: string;
  hmCategoryColors?: Record<string, string> | null;
  getItemHref: (item: any) => string;
  className?: string;
  titleClassName?: string;
}) {
  const categoryLabel = itemCategoryLabel(item, categoryFallback);
  return (
    <Link
      href={getItemHref(item)}
      className={`hm-vitrin-card group relative block min-h-[180px] overflow-hidden rounded-xl bg-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <HmNewsImage
        src={resolveNewsItemImageUrl(item)}
        alt={newsDisplayTitle(item.title)}
        className="transition-transform duration-500 group-hover:scale-105"
        loading="eager"
        priority
        wrapperClassName="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <span
          className="mb-2 inline-block rounded-sm px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white sm:text-[10px]"
          style={{ background: itemCategoryColor(item, accent, hmCategoryColors) }}
        >
          {categoryLabel}
        </span>
        <h3 className={`line-clamp-3 font-black leading-tight text-white drop-shadow-md ${titleClassName}`}>
          {newsDisplayTitle(item.title)}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/60 sm:text-xs">
          <Clock className="h-2.5 w-2.5" aria-hidden />
          {fmtDate(item.createdAt ?? item.publishedAt) || (item.source === "rss" ? "RSS" : "Haber")}
        </p>
      </div>
    </Link>
  );
}

function LeadListSideCard({
  item,
  accent,
  categoryFallback,
  hmCategoryColors,
  getItemHref,
  className = "",
}: {
  item: any;
  accent: string;
  categoryFallback: string;
  hmCategoryColors?: Record<string, string> | null;
  getItemHref: (item: any) => string;
  className?: string;
}) {
  const categoryLabel = itemCategoryLabel(item, categoryFallback);
  return (
    <Link
      href={getItemHref(item)}
      className={`group flex min-h-[84px] gap-3 rounded px-1 py-3 transition-colors hover:bg-gray-50 ${className}`}
    >
      <div className="relative aspect-[16/10] w-16 shrink-0 overflow-hidden rounded-lg sm:w-20">
        <HmNewsImage
          src={resolveNewsItemImageUrl(item)}
          alt={newsDisplayTitle(item.title)}
          className="transition-transform group-hover:scale-105"
          loading="eager"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: itemCategoryColor(item, accent, hmCategoryColors) }}>
          {categoryLabel}
        </span>
        <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-gray-900">{newsDisplayTitle(item.title)}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="h-2.5 w-2.5" aria-hidden />
          {fmtDate(item.createdAt ?? item.publishedAt) || (item.source === "rss" ? "RSS" : "Haber")}
        </p>
      </div>
    </Link>
  );
}

function LeadListMobileCard({
  item,
  accent,
  categoryFallback,
  hmCategoryColors,
  getItemHref,
  className = "",
}: {
  item: any;
  accent: string;
  categoryFallback: string;
  hmCategoryColors?: Record<string, string> | null;
  getItemHref: (item: any) => string;
  className?: string;
}) {
  const categoryLabel = itemCategoryLabel(item, categoryFallback);
  return (
    <Link
      href={getItemHref(item)}
      className={`hm-vitrin-card group flex flex-col overflow-hidden rounded-xl shadow transition-all hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="hm-vitrin-card-thumb relative shrink-0 overflow-hidden" style={{ height: 72 }}>
        <HmNewsImage
          src={resolveNewsItemImageUrl(item)}
          alt={newsDisplayTitle(item.title)}
          className="transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className="absolute left-2 top-2 rounded-sm px-2 py-0.5 text-[9px] font-black uppercase text-white"
          style={{ background: itemCategoryColor(item, accent, hmCategoryColors) }}
        >
          {categoryLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="hm-vitrin-card__title line-clamp-2 flex-1 text-sm font-bold leading-snug text-gray-900">
          {newsDisplayTitle(item.title)}
        </p>
        <p className="hm-vitrin-card__meta mt-2 flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="h-2.5 w-2.5" aria-hidden />
          {fmtDate(item.createdAt ?? item.publishedAt) || (item.source === "rss" ? "RSS" : "Haber")}
        </p>
      </div>
    </Link>
  );
}

export type HmLeadListSidebarBlockProps = {
  title: string;
  items: any[];
  accent: string;
  categoryFallback: string;
  getItemHref: (item: any) => string;
  href?: string;
  categoryTag?: string;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
  moduleId?: string;
};

/** Anasayfa `leadListSidebar` modülü ile aynı düzen — büyük hero + sağ liste. */
export function HmLeadListSidebarBlock({
  title,
  items,
  accent,
  categoryFallback,
  getItemHref,
  href,
  categoryTag,
  hmCategoryColors,
  className = "",
  moduleId = "leadListSidebar",
}: HmLeadListSidebarBlockProps) {
  const { lead, listItems } = splitCategoryBoxItems(items, HM_LEAD_LIST_SIDEBAR_TOTAL - 1);
  if (!lead && listItems.length === 0) return null;

  const mobileItems = [lead, ...listItems].filter(Boolean).slice(0, 6);

  return (
    <section
      className={`hm-vitrin-card mb-6 overflow-hidden rounded-2xl p-3 shadow sm:p-4 ${className}`.trim()}
      data-hm-home-module={moduleId}
    >
      <LeadListSectionHead title={title} color={accent} href={href} categoryTag={categoryTag} />
      <div className="hm-lead-list-mobile-grid sm:hidden">
        {mobileItems.map((item, index) => (
          <LeadListMobileCard
            key={`${item.source ?? "db"}:${item.id ?? item.slug ?? index}:m`}
            item={item}
            accent={accent}
            categoryFallback={categoryFallback}
            hmCategoryColors={hmCategoryColors}
            getItemHref={getItemHref}
            className="!shadow-sm"
          />
        ))}
      </div>
      <div className="hm-lead-list-desktop-only relative isolate hidden gap-4 sm:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        {lead ? (
          <LeadListHeroCard
            item={lead}
            accent={accent}
            categoryFallback={categoryFallback}
            hmCategoryColors={hmCategoryColors}
            getItemHref={getItemHref}
            className="min-h-[260px] sm:min-h-[320px]"
            titleClassName="text-xl sm:text-2xl"
          />
        ) : null}
        <div className="hm-vitrin-latest-panel min-h-0 divide-y divide-slate-100 overflow-hidden rounded-xl">
          {listItems.map((item, index) => (
            <LeadListSideCard
              key={`${item.source ?? "db"}:${item.id ?? item.slug ?? index}`}
              item={item}
              accent={accent}
              categoryFallback={categoryFallback}
              hmCategoryColors={hmCategoryColors}
              getItemHref={getItemHref}
              className="min-h-[84px] !border-b-0"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
