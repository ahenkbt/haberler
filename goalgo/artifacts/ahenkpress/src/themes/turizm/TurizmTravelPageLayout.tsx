import type { ReactNode } from "react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import { getCategoryHero } from "./turizmHubConfig";
import type { TurizmCategorySlug } from "./turizmCategoryIntroConfig";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

type Props = {
  slug: TurizmCategorySlug;
  pageTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  search: ReactNode;
  children: ReactNode;
  listingsAnchorId?: string;
  showBlogRow?: boolean;
  /** Hero altında, kategori kart satırından önce (ör. etkinlik filtre çipleri) */
  beforeBlogRow?: ReactNode;
};

/** Etkinlik vb. — uçuş/otobüs/servis hub düzeni: SubNav hero dışında, soluk hero + arama, blog satırı hero altında */
export function TurizmTravelPageLayout({
  slug,
  pageTitle,
  heroTitle,
  heroSubtitle,
  search,
  children,
  listingsAnchorId = "bc-listings",
  showBlogRow = true,
  beforeBlogRow,
}: Props) {
  const { cms } = useTurizmCms(slug);
  const hero = getCategoryHero(slug);

  return (
    <div className={`bc-hub bc-hub--travel bc-hub--${slug}`} data-page={`turizm-${slug}-travel`}>
      <TurizmSubNavBar sticky />
      <section
        className={`bc-hub-hero bc-hub-hero--bus bc-hub-hero--category bc-hub-hero--${slug}`}
        style={{ backgroundImage: `url(${hero.bg})` }}
        aria-label={heroTitle}
        data-category={slug}
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{heroTitle}</h1>
          <p className="bc-hub-hero__subtitle">{heroSubtitle}</p>
          <div className="bc-hub-hero__search">{search}</div>
        </div>
      </section>

      {beforeBlogRow ? <div className="bc-hub-before-blog">{beforeBlogRow}</div> : null}

      {showBlogRow ? (
        <TurizmCategoryBlogRow slug={slug} title={null} listingsAnchorId={listingsAnchorId} />
      ) : null}

      <div className="bc-hub-body">
        <section className="bc-hub-section bc-hub-section--listings">{children}</section>
      </div>

      <TurizmCategoryPageFooter title={pageTitle} description={cms.pageDescription} />
    </div>
  );
}
