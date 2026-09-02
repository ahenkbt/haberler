import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkSmartLink,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { safeAhenkImageUrl } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyHome() {
  const site = useAhenkAgencySite();
  const heroSrc = safeAhenkImageUrl(site.heroImage, "");
  const yekpareSrc = safeAhenkImageUrl(site.yekpare.image, "");
  const aboutSrc = safeAhenkImageUrl(site.aboutImage, "");
  const featured = site.softwareSectors.slice(0, 3);
  const restSectors = site.softwareSectors.slice(3);

  return (
    <AhenkAgencyChrome title={site.brandName} description={site.tagline}>
      <section className="ahenk-hero" aria-label="Vitrin">
        {heroSrc ? (
          <div className="ahenk-hero-photo" aria-hidden>
            <img src={heroSrc} alt="" />
          </div>
        ) : null}
        <div className="ahenk-hero-slide">
          <div className="ahenk-hero-inner">
            <span className="ahenk-kicker">{site.heroKicker}</span>
            <h1>{site.heroTitle}</h1>
            <p>{site.heroSubtitle}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <AhenkSmartLink href={site.heroCtaHref} className="ahenk-btn">
                {site.heroCtaLabel}
              </AhenkSmartLink>
              <AhenkSmartLink href={site.heroSecondaryHref} className="ahenk-btn ahenk-btn-ghost">
                {site.heroSecondaryLabel}
              </AhenkSmartLink>
            </div>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="yazilim">
        <h2>{site.softwareTitle}</h2>
        <p className="ahenk-lead">{site.softwareLead}</p>
        {featured.length ? <AhenkCardGrid items={featured} cta="Yazılımı incele" /> : null}
        {restSectors.length ? (
          <div className="ahenk-grid ahenk-grid-tight" style={{ marginTop: 18 }}>
            {restSectors.map((item) => (
              <AhenkSmartLink key={item.slug} href={item.href} className="ahenk-card ahenk-card-media">
                <span className="ahenk-card-photo ahenk-card-photo-sm">
                  {item.image ? <img src={item.image} alt="" loading="lazy" /> : null}
                </span>
                <span className="ahenk-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <span className="ahenk-card-cta">Detay →</span>
                </span>
              </AhenkSmartLink>
            ))}
          </div>
        ) : null}
      </section>

      <section className="ahenk-section ahenk-section-flush" id="ajans">
        <div className="ahenk-section">
          <h2>{site.agencyTitle}</h2>
          <p className="ahenk-lead">{site.agencyLead}</p>
          <AhenkCardGrid items={site.agencyOffers} cta="Stüdyo" />
        </div>
      </section>

      <section className="ahenk-promo" aria-label="Yekpare">
        {yekpareSrc ? (
          <div className="ahenk-promo-visual">
            <img src={yekpareSrc} alt="" />
          </div>
        ) : (
          <div className="ahenk-promo-visual ahenk-promo-fallback" />
        )}
        <div className="ahenk-promo-copy">
          <span className="ahenk-kicker">{site.yekpare.kicker}</span>
          <h2>{site.yekpare.title}</h2>
          <p>{site.yekpare.text}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <AhenkSmartLink href={site.yekpare.ctaHref} className="ahenk-btn">
              {site.yekpare.ctaLabel}
            </AhenkSmartLink>
            <AhenkSmartLink href={site.yekpare.secondaryHref} className="ahenk-btn ahenk-btn-ghost">
              {site.yekpare.secondaryLabel}
            </AhenkSmartLink>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="yayin">
        <h2>{site.platformTitle}</h2>
        <p className="ahenk-lead">{site.platformLead}</p>
        <AhenkCardGrid items={site.platformProducts} cta="Aç" />
        <div style={{ marginTop: 22 }}>
          <Link href="/haber-merkezi" className="ahenk-btn ahenk-btn-light">
            Haber Merkezi ürün ailesi
          </Link>
        </div>
      </section>

      <section className="ahenk-band">
        <div className="ahenk-section ahenk-about-split">
          {aboutSrc ? (
            <div className="ahenk-about-photo">
              <img src={aboutSrc} alt="" />
            </div>
          ) : null}
          <div>
            <h2>{site.aboutTitle}</h2>
            <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.aboutHtml }} />
            <div style={{ marginTop: 20 }}>
              <Link href="/hakkimizda" className="ahenk-btn">
                Hakkımızda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ahenk-cta">
        <div className="ahenk-cta-inner">
          <div>
            <h2>{site.ctaTitle}</h2>
            <p>{site.ctaText}</p>
          </div>
          <a className="ahenk-btn" href={`tel:${site.phoneTel}`}>
            {site.phone}
          </a>
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Ofislerimiz</h2>
        <p className="ahenk-lead">Türkiye, Gürcistan, İngiltere, ABD ve Azerbaycan.</p>
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
