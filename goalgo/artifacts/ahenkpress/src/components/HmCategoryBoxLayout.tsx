import { Link } from "wouter";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import {
  CATEGORY_BOX_DESKTOP_LIST_SLOTS,
  CATEGORY_BOX_MOBILE_QUAD_TOTAL,
} from "@/lib/hmCategoryBoxItems";

function displayTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

type CategoryBoxItem = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
};

function HmCategorySmallCard({
  item,
  getHref,
}: {
  item: CategoryBoxItem;
  getHref: (item: CategoryBoxItem) => string;
}) {
  return (
    <Link
      href={getHref(item)}
      className="group flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border border-slate-100 bg-white p-1.5 transition hover:border-slate-200 hover:bg-slate-50"
    >
      <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-slate-100">
        <HmNewsImage src={resolveNewsItemImageUrl(item)} alt={displayTitle(item.title)} loading="lazy" className="transition group-hover:scale-105" />
      </div>
      <p className="line-clamp-2 text-[10px] font-bold leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)]">
        {displayTitle(item.title)}
      </p>
    </Link>
  );
}

/** Masaüstü sağ sütun: alt alta küçük thumb + başlık (1 büyük + 3 liste). */
export function HmCategoryThumbList({
  items,
  getHref,
  className = "",
  categorySlug,
}: {
  items: CategoryBoxItem[];
  getHref: (item: CategoryBoxItem) => string;
  className?: string;
  categorySlug?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={`hm-category-box-thumb-list hm-category-box-list flex min-w-0 flex-col gap-0 overflow-hidden rounded-xl bg-white p-2 shadow-sm sm:p-0 ${className}`.trim()}
      data-hm-cat-slug={categorySlug || undefined}
    >
      {items.map((item, index) => (
        <Link
          key={`${item.slug ?? item.id ?? index}:${index}`}
          href={getHref(item)}
          className="hm-category-box-thumb-row group flex min-h-[3.75rem] w-full min-w-0 items-start gap-2.5 rounded-lg border border-slate-100 p-1.5 transition hover:bg-slate-50 sm:rounded-none sm:border-0 sm:border-b sm:border-slate-100 sm:px-2 sm:py-2.5 last:sm:border-b-0"
        >
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            <HmNewsImage
              src={resolveNewsItemImageUrl(item)}
              alt={displayTitle(item.title)}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden py-0.5">
            <p className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)] sm:text-sm">
              {displayTitle(item.title)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** @deprecated Numaralı metin listesi — P2-HM-7 ile thumb list tercih edilir. */
export function HmCategoryNumberedList({
  items,
  getHref,
  className = "",
  categorySlug,
  color: _color,
}: {
  items: CategoryBoxItem[];
  color: string;
  getHref: (item: CategoryBoxItem) => string;
  className?: string;
  categorySlug?: string;
}) {
  return (
    <HmCategoryThumbList
      items={items}
      getHref={getHref}
      className={className}
      categorySlug={categorySlug}
    />
  );
}

export function HmCategoryFeaturedLead({
  item,
  color,
  getHref,
  leadLabel = "ÖNE ÇIKAN",
  className = "",
}: {
  item: CategoryBoxItem;
  color: string;
  getHref: (item: CategoryBoxItem) => string;
  leadLabel?: string;
  className?: string;
}) {
  return (
    <Link href={getHref(item)} className={`group min-w-0 overflow-hidden rounded-xl bg-white shadow-sm ${className}`.trim()}>
      <div className="hm-manset-img-frame hm-manset-img-frame--thumb">
        <HmNewsImage src={resolveNewsItemImageUrl(item)} alt={displayTitle(item.title)} className="transition duration-500 group-hover:scale-105" />
      </div>
      <div className="p-3">
        <p className="text-[10px] font-black tracking-wide" style={{ color }}>
          {leadLabel}
        </p>
        <p className="mt-1 line-clamp-3 text-sm font-black leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)]">
          {displayTitle(item.title)}
        </p>
      </div>
    </Link>
  );
}

export function HmCategoryBoxGrid({
  lead,
  listItems,
  color,
  getHref,
  leadLabel,
  className = "",
  categorySlug,
}: {
  lead: CategoryBoxItem | null;
  listItems: CategoryBoxItem[];
  color: string;
  getHref: (item: CategoryBoxItem) => string;
  leadLabel?: string;
  className?: string;
  categorySlug?: string;
}) {
  if (!lead) return null;
  const desktopListItems = listItems.slice(0, CATEGORY_BOX_DESKTOP_LIST_SLOTS);
  const mobileItems = [lead, ...listItems].slice(0, CATEGORY_BOX_MOBILE_QUAD_TOTAL);
  return (
    <div
      className={`hm-category-box-grid ${className}`.trim()}
      data-hm-cat-slug={categorySlug || undefined}
      style={{ ["--hm-cat-box-accent" as string]: color }}
    >
      <div className="hm-category-box-mobile-quad grid grid-cols-2 gap-2 md:hidden">
        {mobileItems.map((item, index) => (
          <HmCategorySmallCard key={`${item.slug ?? item.id ?? index}:m`} item={item} getHref={getHref} />
        ))}
      </div>
      <div
        className={`hm-category-box-desktop hidden gap-3 md:grid ${listItems.length > 0 ? "md:grid-cols-[minmax(180px,0.9fr)_minmax(0,1.1fr)]" : ""}`}
      >
        <HmCategoryFeaturedLead item={lead} color={color} getHref={getHref} leadLabel={leadLabel} />
        <HmCategoryThumbList items={desktopListItems} getHref={getHref} categorySlug={categorySlug} />
      </div>
    </div>
  );
}
