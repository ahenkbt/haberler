import type { ReactNode } from "react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import {
  TurizmHubCampaignCarousel,
  TurizmHubPartnerLogos,
  TurizmHubPopularRoutes,
  TurizmHubValueCards,
} from "./TurizmHubSections";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import {
  BUS_FEATURE_BOXES,
  BUS_HERO_BG,
  BUS_PARTNERS,
  POPULAR_BUS_ROUTES,
} from "./turizmHubConfig";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

type Props = {
  search: ReactNode;
  results?: ReactNode;
  showResults?: boolean;
};

/** obilet tarzı otobüs bileti hub */
export function TurizmBusHubPage({ search, results, showResults }: Props) {
  const { cms } = useTurizmCms("otobus");

  return (
    <div className="bc-hub bc-hub--bus" data-page="turizm-otobus-hub">
      <TurizmSubNavBar sticky />
      <section
        className="bc-hub-hero bc-hub-hero--bus"
        style={{ backgroundImage: `url(${BUS_HERO_BG})` }}
        aria-label="Otobüs bileti arama"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">Otobüs bileti ara</h1>
          <p className="bc-hub-hero__subtitle">Türkiye genelinde şehirlerarası seferler — CollectAPI fiyatları</p>
          <div className="bc-hub-hero__search bc-hub-hero__search--bus">{search}</div>
        </div>
      </section>

      <TurizmCategoryBlogRow slug="otobus" title={null} />

      <div className="bc-hub-body">
        <TurizmHubCampaignCarousel
          title="Yekpare'ye özel fırsatlar"
          banners={cms.banners}
          featuredPosts={cms.featuredPosts}
          defaultCategory="otobus"
        />

        <section className="bc-hub-section bc-hub-section--value-strip">
          <TurizmHubValueCards cards={BUS_FEATURE_BOXES} />
        </section>

        <TurizmHubPartnerLogos partners={BUS_PARTNERS} />

        <TurizmHubPopularRoutes title="Popüler otobüs seferleri" domestic={POPULAR_BUS_ROUTES} showTabs={false} />

        {showResults && results ? (
          <section id="otobus-sonuclar" className="bc-hub-section bc-hub-section--results">
            <div className="bc-hub-section__head">
              <h2>Arama sonuçları</h2>
            </div>
            {results}
          </section>
        ) : null}
      </div>

      <TurizmCategoryPageFooter title="Otobüs & Ulaşım" description={cms.pageDescription} />
    </div>
  );
}
