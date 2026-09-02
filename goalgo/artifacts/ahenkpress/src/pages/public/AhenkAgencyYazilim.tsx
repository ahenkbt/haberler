import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";

export default function AhenkAgencyYazilim() {
  const site = useAhenkAgencySite();
  return (
    <AhenkAgencyChrome title={site.softwareTitle} description={site.softwareLead}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Yazılım
          </>
        }
        title={site.softwareTitle}
        lead={site.softwareLead}
        image={site.heroImage}
      />
      <section className="ahenk-section">
        <AhenkCardGrid items={site.softwareSectors} cta="Yazılımı incele" />
      </section>
    </AhenkAgencyChrome>
  );
}
