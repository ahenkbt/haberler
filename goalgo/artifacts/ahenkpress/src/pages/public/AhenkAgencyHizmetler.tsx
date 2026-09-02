import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkMediaCard,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkOperationalServices } from "@/lib/ahenkAgencySeo";

export default function AhenkAgencyHizmetler() {
  const site = useAhenkAgencySite();
  const services = ahenkOperationalServices(site);
  return (
    <AhenkAgencyChrome title={site.servicesTitle} description={site.servicesLead}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Çağrı merkezi
          </>
        }
        title={site.servicesTitle}
        lead={site.servicesLead}
        image={site.servicesHeroImage}
      />
      <section className="ahenk-section">
        <div className="ahenk-grid">
          {services.map((svc) => (
            <AhenkMediaCard
              key={svc.slug}
              href={`/hizmet/${svc.slug}`}
              image={svc.image}
              title={svc.title}
              excerpt={svc.excerpt}
              icon={svc.icon}
              cta="İncele"
            />
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
