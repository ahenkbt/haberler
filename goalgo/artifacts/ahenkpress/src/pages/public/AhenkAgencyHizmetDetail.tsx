import { Link, useParams } from "wouter";
import { AhenkAgencyChrome, AhenkServiceIcon } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { findAhenkAgencyService } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyHizmetDetail() {
  const site = useAhenkAgencySite();
  const params = useParams<{ slug?: string }>();
  const slug = String(params.slug ?? "").trim();
  const service = findAhenkAgencyService(site, slug);

  if (!service) {
    return (
      <AhenkAgencyChrome title="Hizmet bulunamadı">
        <div className="ahenk-section">
          <h2>Hizmet bulunamadı</h2>
          <p className="ahenk-lead">Aradığınız hizmet sayfası yok veya kaldırılmış olabilir.</p>
          <Link href="/hizmetler" className="ahenk-btn">
            Tüm hizmetler
          </Link>
        </div>
      </AhenkAgencyChrome>
    );
  }

  return (
    <AhenkAgencyChrome title={service.title} description={service.excerpt}>
      <div className="ahenk-page-hero">
        <div className="ahenk-page-hero-inner">
          <div className="ahenk-crumb">
            <Link href="/">Anasayfa</Link> / <Link href="/hizmetler">Hizmetler</Link> / {service.title}
          </div>
          <h1>{service.title}</h1>
        </div>
      </div>
      <section className="ahenk-section" style={{ display: "grid", gap: 28, gridTemplateColumns: "minmax(0,1fr)" }}>
        <div>
          <span className="ahenk-card-icon" style={{ marginBottom: 18 }}>
            <AhenkServiceIcon name={service.icon} />
          </span>
          <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: service.bodyHtml }} />
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/iletisim" className="ahenk-btn">
              Bize sorun
            </Link>
            <a className="ahenk-btn ahenk-btn-light" href={`tel:${site.phoneTel}`}>
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
