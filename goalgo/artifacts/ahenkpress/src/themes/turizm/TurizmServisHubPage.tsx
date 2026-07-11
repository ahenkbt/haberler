import type { ReactNode } from "react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import { TurizmHubCampaignCarousel, TurizmHubPartnerLogos } from "./TurizmHubSections";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import { SERVIS_HERO_BG, SERVIS_PARTNERS } from "./turizmHubConfig";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

type Props = {
  search: ReactNode;
  /** Konaklama tarzı liste bölümü — hero altında her zaman görünür */
  listing: ReactNode;
};

/** obilet tarzı hero + altında otel listesi düzeninde VIP transfer firmaları */
export function TurizmServisHubPage({ search, listing }: Props) {
  const { cms } = useTurizmCms("servis");

  return (
    <div className="bc-hub bc-hub--servis" data-page="turizm-servis-hub">
      <TurizmSubNavBar sticky />
      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--servis"
        style={{ backgroundImage: `url(${SERVIS_HERO_BG})` }}
        aria-label="VIP transfer arama"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">VIP Transfer</h1>
          <p className="bc-hub-hero__subtitle">
            Havalimanı karşılama, şehirlerarası ve saatlik şoförlü araç — net fiyat, KDV dahil
          </p>
          <div className="bc-hub-hero__search">{search}</div>
        </div>
      </section>

      <TurizmCategoryBlogRow slug="servis" title={null} />

      <div className="bc-hub-body">
        <TurizmHubCampaignCarousel
          title="VIP transfer fırsatları"
          banners={cms.banners}
          featuredPosts={cms.featuredPosts}
          defaultCategory="servis"
        />

        <TurizmHubPartnerLogos partners={SERVIS_PARTNERS} />

        <section className="bc-hub-section bc-hub-section--listings">{listing}</section>
      </div>

      <TurizmCategoryPageFooter title="VIP Transfer" description={cms.pageDescription} />
    </div>
  );
}
