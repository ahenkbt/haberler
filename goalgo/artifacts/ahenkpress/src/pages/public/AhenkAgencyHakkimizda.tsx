import { Link } from "wouter";
import { AhenkAgencyChrome } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { AHENK_BT_ENTITY } from "@/lib/geoSiteEntities";

export default function AhenkAgencyHakkimizda() {
  const site = useAhenkAgencySite();
  return (
    <AhenkAgencyChrome title="Hakkımızda" description={site.tagline}>
      <div className="ahenk-page-hero">
        <div className="ahenk-page-hero-inner">
          <div className="ahenk-crumb">
            <Link href="/">Anasayfa</Link> / Hakkımızda
          </div>
          <h1>Hakkımızda</h1>
        </div>
      </div>
      <section className="ahenk-section">
        <h2>Ahenk Bilgi Teknolojileri kimdir?</h2>
        <p className="ahenk-lead">{AHENK_BT_ENTITY.description}</p>
        <p>{AHENK_BT_ENTITY.disambiguatingDescription}</p>
        <ul>
          <li>Resmi ad: {AHENK_BT_ENTITY.officialName}</li>
          <li>Resmi alan adı: ahenk.net.tr</li>
          <li>Telefon: {site.phone}</li>
          <li>E-posta: {site.email}</li>
        </ul>
      </section>
      <section className="ahenk-section">
        <h2>{site.aboutTitle}</h2>
        <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.aboutHtml }} />
      </section>
      <section className="ahenk-cta">
        <div className="ahenk-cta-inner">
          <div>
            <h2>{site.ctaTitle}</h2>
            <p>{site.ctaText}</p>
          </div>
          <Link href="/iletisim" className="ahenk-btn">
            İletişim
          </Link>
        </div>
      </section>
      <section className="ahenk-section">
        <h2>Ofislerimiz</h2>
        <div className="ahenk-offices">
          {site.offices.map((o) => (
            <article key={o.id} className="ahenk-office">
              <h3>
                {o.flag} {o.country}
              </h3>
              <p>{o.address}</p>
            </article>
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
