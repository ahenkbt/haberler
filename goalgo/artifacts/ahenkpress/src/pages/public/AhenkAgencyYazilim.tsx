import { Link, useLocation } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkFaqList,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkHubSeo, isAhenkHubPath } from "@/lib/ahenkAgencySeo";

export default function AhenkAgencyYazilim() {
  const site = useAhenkAgencySite();
  const [location] = useLocation();
  const hub = isAhenkHubPath(location) ? ahenkHubSeo(location) : null;
  const title = hub?.h1 ?? site.softwareTitle;
  const lead = hub?.description ?? site.softwareLead;
  const seoTitle = hub?.title ?? site.softwareTitle;
  return (
    <AhenkAgencyChrome title={seoTitle} description={lead}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Web yazılımı
          </>
        }
        title={title}
        lead={lead}
        image={site.heroImage}
      />
      <section className="ahenk-section">
        <p className="ahenk-lead">{site.aiDeliveryLead} {site.pricePeriodNote}.</p>
        <AhenkCardGrid items={site.softwareSectors} cta="Web yazılımı" />
      </section>
      <section className="ahenk-section" style={{ paddingTop: 0 }}>
        <h2>Sık sorulan sorular</h2>
        <AhenkFaqList faqs={site.faqs} />
      </section>
    </AhenkAgencyChrome>
  );
}
