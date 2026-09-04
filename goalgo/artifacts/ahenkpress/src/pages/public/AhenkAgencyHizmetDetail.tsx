import { Link, useParams } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkPageHero,
  AhenkServiceIcon,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { findAhenkAgencyService, safeAhenkImageUrl } from "@/lib/ahenkAgencySite";

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
          <Link href="/hizmetlerimiz" className="ahenk-btn">
            Tüm hizmetler
          </Link>
        </div>
      </AhenkAgencyChrome>
    );
  }

  const src = safeAhenkImageUrl(service.image, site.servicesHeroImage);

  return (
    <AhenkAgencyChrome title={service.title} description={service.excerpt}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/hizmetlerimiz">Hizmetlerimiz</Link> / {service.title}
          </>
        }
        title={service.title}
        lead={service.excerpt}
        image={src}
      />
      <section className="ahenk-section ahenk-detail">
        {src ? (
          <div className="ahenk-detail-photo">
            <img src={src} alt={service.title} />
          </div>
        ) : null}
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
