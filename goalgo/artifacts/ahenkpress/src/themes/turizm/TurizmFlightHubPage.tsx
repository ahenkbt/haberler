import type { ReactNode } from "react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import {
  TurizmHubActionCards,
  TurizmHubCampaignCarousel,
  TurizmHubFeatureGrid,
  TurizmHubLinkColumns,
  TurizmHubPopularRoutes,
  TurizmHubValueCards,
} from "./TurizmHubSections";
import {
  FLIGHT_DESTINATION_COLUMNS,
  FLIGHT_MANAGE_ACTIONS,
  FLIGHT_VALUE_CARDS,
  FLIGHT_WHY_YEKPARE,
  getCategoryHero,
  POPULAR_FLIGHTS_DOMESTIC,
  POPULAR_FLIGHTS_INTERNATIONAL,
} from "./turizmHubConfig";
import { useTurizmCms } from "./useTurizmCms";
import "@/styles/bookingCoreTurizm.css";

const FLIGHT_HERO_LINKS = [
  { label: "Check-in", href: "#check-in" },
  { label: "PNR Sorgulama", href: "#pnr" },
  { label: "Bilet İptal", href: "#iptal" },
];

type Props = {
  search: ReactNode;
  results?: ReactNode;
  showResults?: boolean;
};

/** ENUYGUN tarzı uçak bileti hub — soluk hero + arama (blog satırı yok) */
export function TurizmFlightHubPage({ search, results, showResults }: Props) {
  const { cms } = useTurizmCms("ucus");
  const hero = getCategoryHero("ucus");

  return (
    <div className="bc-hub bc-hub--flight" data-page="turizm-ucus-hub">
      <TurizmSubNavBar sticky />
      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--flight"
        style={{ backgroundImage: `url(${hero.bg})` }}
        aria-label="Uçak bileti arama"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <nav className="bc-hub-hero__quicklinks bc-hub-hero__quicklinks--dark" aria-label="Uçuş işlemleri">
            {FLIGHT_HERO_LINKS.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{hero.subtitle}</p>
          <div className="bc-hub-hero__search">{search}</div>
        </div>
      </section>

      <TurizmCategoryBlogRow slug="ucus" title={null} />

      <div className="bc-hub-body">
        <section className="bc-hub-section bc-hub-section--value-strip">
          <TurizmHubValueCards cards={FLIGHT_VALUE_CARDS} />
        </section>

        <TurizmHubCampaignCarousel
          title="Kampanyalar"
          banners={cms.banners}
          featuredPosts={cms.featuredPosts}
          defaultCategory="ucus"
        />

        <TurizmHubPopularRoutes
          title="Popüler uçuşlar"
          domestic={POPULAR_FLIGHTS_DOMESTIC}
          international={POPULAR_FLIGHTS_INTERNATIONAL}
          singleRow
        />

        <TurizmHubFeatureGrid title="Neden Yekpare?" cards={FLIGHT_WHY_YEKPARE} />

        <TurizmHubActionCards title="Uçuşunu yönet" cards={FLIGHT_MANAGE_ACTIONS} />

        {showResults && results ? (
          <section id="ucus-sonuclar" className="bc-hub-section bc-hub-section--results">
            <div className="bc-hub-section__head">
              <h2>Arama sonuçları</h2>
            </div>
            {results}
          </section>
        ) : null}

        <TurizmHubLinkColumns title="Popüler uçuş noktaları" columns={FLIGHT_DESTINATION_COLUMNS} />
      </div>

      <TurizmCategoryPageFooter title="Uçak Bileti" description={cms.pageDescription} />
    </div>
  );
}
