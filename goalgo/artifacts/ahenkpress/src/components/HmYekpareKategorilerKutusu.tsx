import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { HmCategoryThumbList } from "@/components/HmCategoryBoxLayout";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { HmSporNewsPanel } from "@/components/HmSporNewsPanel";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import {
  CATEGORY_BOX_DESKTOP_LIST_SLOTS,
  CATEGORY_BOX_DISPLAY_TOTAL,
  CATEGORY_BOX_MOBILE_QUAD_TOTAL,
  ensureNewsBoxSections,
  splitCategoryBoxItems,
} from "@/lib/hmCategoryBoxItems";
import type { HomeNewsDedupeTracker } from "@/lib/hmHeadlinePool";
import { HM_SPOR_BOX_TOTAL, isSporHomeBoxSlug } from "@/lib/hmSporSubcategories";

export type YekpareKategoriKutuItem = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
};

function displayTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

function YekpareSmallCard({
  item,
  getItemHref,
}: {
  item: YekpareKategoriKutuItem;
  getItemHref: (item: YekpareKategoriKutuItem) => string;
}) {
  return (
    <Link href={getItemHref(item)} className="group flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border border-slate-100 p-1.5 transition hover:bg-slate-50">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-slate-100">
        <HmNewsImage src={resolveNewsItemImageUrl(item)} alt={displayTitle(item.title)} loading="lazy" className="transition group-hover:scale-105" />
      </div>
      <p className="line-clamp-2 text-[10px] font-bold leading-snug text-slate-800 group-hover:text-[var(--hm-accent,#0EA5E9)]">
        {displayTitle(item.title)}
      </p>
    </Link>
  );
}

export function HmYekpareCategoryBox({
  slug,
  label,
  color,
  items,
  categoryHref,
  getItemHref,
  listSlots = CATEGORY_BOX_DESKTOP_LIST_SLOTS,
  siteId = null,
  className = "",
}: {
  slug: string;
  label: string;
  color: string;
  items: YekpareKategoriKutuItem[];
  categoryHref: string;
  getItemHref: (item: YekpareKategoriKutuItem) => string;
  listSlots?: number;
  siteId?: number | null;
  className?: string;
}) {
  if (isSporHomeBoxSlug(slug)) {
    if (items.length === 0) return null;
    return (
      <article
        className={`rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm ${className}`.trim()}
        data-yekpare-kategori-slug={slug}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full shrink-0" style={{ background: color }} aria-hidden />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{label}</h3>
          <div className="flex-1" />
          <Link href={categoryHref} className="text-xs font-black hover:underline" style={{ color }}>
            Tümü <ChevronRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
        <HmSporNewsPanel
          items={items}
          newsHref={getItemHref}
          siteId={siteId}
          kategoriHref={categoryHref}
          categoryTitle={label || "SPOR"}
          showCategoryTab={false}
        />
      </article>
    );
  }

  const desktopListSlots = Math.min(listSlots, CATEGORY_BOX_DESKTOP_LIST_SLOTS);
  const { lead, listItems } = splitCategoryBoxItems(items, desktopListSlots);
  const displayLead = lead ?? items[0] ?? null;
  if (!displayLead) return null;
  const desktopSideItems = listItems.slice(0, CATEGORY_BOX_DESKTOP_LIST_SLOTS);
  const mobileQuad = [displayLead, ...listItems].slice(0, CATEGORY_BOX_MOBILE_QUAD_TOTAL);

  return (
    <article
      className={`rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm ${className}`.trim()}
      data-yekpare-kategori-slug={slug}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full shrink-0" style={{ background: color }} aria-hidden />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{label}</h3>
        <div className="flex-1" />
        <Link href={categoryHref} className="text-xs font-black hover:underline" style={{ color }}>
          Tümü <ChevronRight className="inline h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="hm-yekpare-kutu-mobile grid grid-cols-2 gap-2 md:hidden">
        {mobileQuad.map((item, index) => (
          <YekpareSmallCard key={`${item.slug ?? item.id ?? index}:m`} item={item} getItemHref={getItemHref} />
        ))}
      </div>
      <div className="hm-yekpare-kutu-desktop hidden gap-3 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Link href={getItemHref(displayLead)} className="group relative overflow-hidden rounded-xl bg-slate-100">
          <div className="aspect-[4/3]">
            <HmNewsImage
              src={resolveNewsItemImageUrl(displayLead)}
              alt={displayTitle(displayLead.title)}
              className="transition group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 text-sm font-black leading-snug text-white">{displayTitle(displayLead.title)}</p>
          </div>
        </Link>
        <HmCategoryThumbList
          items={desktopSideItems}
          getHref={getItemHref}
          categorySlug={slug}
          className="border-0 bg-transparent p-0 shadow-none"
        />
      </div>
    </article>
  );
}

export function HmYekpareKategorilerKutusu({
  sections,
  globalDedupe,
  getCategoryHref,
  getItemHref,
  listSlots = CATEGORY_BOX_DESKTOP_LIST_SLOTS,
  siteId = null,
  className = "",
  gridClassName = "grid gap-4 lg:grid-cols-2",
}: {
  sections: Array<{
    slug: string;
    title: string;
    color: string;
    items: YekpareKategoriKutuItem[];
  }>;
  /** Anasayfa genelinde daha önce kullanılan haberleri dışla. */
  globalDedupe?: HomeNewsDedupeTracker;
  getCategoryHref: (slug: string) => string;
  getItemHref: (item: YekpareKategoriKutuItem) => string;
  listSlots?: number;
  siteId?: number | null;
  className?: string;
  gridClassName?: string;
}) {
  const hasSpor = sections.some((section) => isSporHomeBoxSlug(section.slug));
  const minItems = hasSpor ? HM_SPOR_BOX_TOTAL : CATEGORY_BOX_DISPLAY_TOTAL;
  const prepared = ensureNewsBoxSections(
    sections,
    [] as YekpareKategoriKutuItem[],
    minItems,
    (section) => {
      const rows = section.items ?? [];
      if (isSporHomeBoxSlug(section.slug)) return rows.slice(0, HM_SPOR_BOX_TOTAL);
      return rows.slice(0, CATEGORY_BOX_DISPLAY_TOTAL);
    },
    (section) => section.items ?? [],
    globalDedupe,
  ).map((section) => {
    if (isSporHomeBoxSlug(section.slug)) return section;
    return { ...section, items: section.items.slice(0, CATEGORY_BOX_DISPLAY_TOTAL) };
  });
  const visible = prepared.filter((section) => section.items.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className={className.trim()} data-hm-home-module="yekpareKategorilerKutusu">
      <div className={gridClassName}>
        {visible.map((section) => (
          <HmYekpareCategoryBox
            key={section.slug || section.title}
            slug={section.slug}
            label={section.title}
            color={section.color}
            items={section.items}
            categoryHref={getCategoryHref(section.slug)}
            getItemHref={getItemHref}
            listSlots={listSlots}
            siteId={siteId}
          />
        ))}
      </div>
    </section>
  );
}
