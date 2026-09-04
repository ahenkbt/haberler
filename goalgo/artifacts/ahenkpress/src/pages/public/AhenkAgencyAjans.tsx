import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";

export default function AhenkAgencyAjans() {
  const site = useAhenkAgencySite();
  return (
    <AhenkAgencyChrome title={site.agencyTitle} description={site.agencyLead}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/hizmetlerimiz">Hizmetlerimiz</Link> / Ajans
          </>
        }
        title={site.agencyTitle}
        lead={site.agencyLead}
        image={site.agencyOffers[0]?.image || site.aboutImage}
      />
      <section className="ahenk-section">
        <AhenkCardGrid items={site.agencyOffers} cta="Stüdyo" />
      </section>
    </AhenkAgencyChrome>
  );
}
