import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";

export default function AhenkAgencyHaberMerkezi() {
  const site = useAhenkAgencySite();
  return (
    <AhenkAgencyChrome title={site.haberMerkeziTitle} description={site.haberMerkeziLead}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Haber Merkezi
          </>
        }
        title={site.haberMerkeziTitle}
        lead={site.haberMerkeziLead}
        image={site.platformProducts[0]?.image}
      />
      <section className="ahenk-section">
        <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.haberMerkeziHtml }} />
        <div style={{ marginTop: 32 }}>
          <AhenkCardGrid items={site.platformProducts} cta="Ürünü aç" />
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
