import type { ReactNode } from "react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import type { TurizmCategorySlug } from "./turizmCategoryIntroConfig";
import { getCategoryHero } from "./turizmHubConfig";
import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import "@/styles/bookingCoreTurizm.css";

type Props = {
  slug: TurizmCategorySlug;
  search: ReactNode;
  /** Hero başlık/alt başlık override */
  title?: string;
  subtitle?: string;
  bg?: string;
  /** SubNav sayfa içinde (ucus/servis/otobus hub) */
  embedSubNav?: boolean;
  subNavClassName?: string;
  /** Blog satırı — listeleme sayfalarında filtre kartları */
  onCardFilter?: (filter: Partial<ListingFilterState>) => void;
  listingsAnchorId?: string;
  blogTitle?: string | null;
  showBlogRow?: boolean;
  heroClassName?: string;
  children?: ReactNode;
};

/** Soluk arka planlı hero + arama + altında 4 blog kutusu */
export function TurizmCategoryHubHero({
  slug,
  search,
  title,
  subtitle,
  bg,
  embedSubNav = false,
  subNavClassName,
  onCardFilter,
  listingsAnchorId,
  blogTitle,
  showBlogRow = true,
  heroClassName = "",
  children,
}: Props) {
  const hero = getCategoryHero(slug);

  return (
    <>
      <section
        className={`bc-hub-hero bc-hub-hero--bus bc-hub-hero--category${heroClassName ? ` ${heroClassName}` : ""}`}
        style={{ backgroundImage: `url(${bg ?? hero.bg})` }}
        aria-label={title ?? hero.title}
        data-category={slug}
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        {embedSubNav ? <TurizmSubNavBar sticky className={subNavClassName} /> : null}
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{title ?? hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{subtitle ?? hero.subtitle}</p>
          <div className="bc-hub-hero__search">{search}</div>
        </div>
      </section>
      {showBlogRow ? (
        <TurizmCategoryBlogRow
          slug={slug}
          onCardFilter={onCardFilter}
          listingsAnchorId={listingsAnchorId}
          title={blogTitle}
        />
      ) : null}
      {children}
    </>
  );
}
