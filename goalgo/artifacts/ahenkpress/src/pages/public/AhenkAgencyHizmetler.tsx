import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkServiceIcon } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";

export default function AhenkAgencyHizmetler() {
  const site = useAhenkAgencySite();
  return (
    <AhenkAgencyChrome
      title="Hizmetlerimiz"
      description="Ahenk Bilgi Teknolojileri hizmetleri: müşteri hizmetleri, ajans, IK, e-ticaret ve kurumsal organizasyon."
    >
      <div className="ahenk-page-hero">
        <div className="ahenk-page-hero-inner">
          <div className="ahenk-crumb">
            <Link href="/">Anasayfa</Link> / Hizmetler
          </div>
          <h1>Hizmetlerimiz</h1>
        </div>
      </div>
      <section className="ahenk-section">
        <p className="ahenk-lead">
          Müşteri hizmetlerinden ürün fotoğrafına, çağrı merkezi sipariş sisteminden dijital QR menüye
          kadar operasyonel ve teknolojik çözümler.
        </p>
        <div className="ahenk-grid">
          {site.services.map((svc) => (
            <Link key={svc.slug} href={`/hizmet/${svc.slug}`} className="ahenk-card">
              <span className="ahenk-card-icon">
                <AhenkServiceIcon name={svc.icon} />
              </span>
              <h3>{svc.title}</h3>
              <p>{svc.excerpt}</p>
              <span>İncele →</span>
            </Link>
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
