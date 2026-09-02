import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkServiceIcon } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";

export default function AhenkAgencyHome() {
  const site = useAhenkAgencySite();
  const [idx, setIdx] = useState(0);
  const slides = site.slides;

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(t);
  }, [slides.length]);

  const slide = slides[idx] ?? slides[0];

  return (
    <AhenkAgencyChrome title={site.brandName} description={site.tagline}>
      <section className="ahenk-hero" aria-label="Vitrin">
        {slide ? (
          <div className="ahenk-hero-slide">
            <div className="ahenk-hero-inner">
              <span className="ahenk-kicker">{site.brandName}</span>
              <h1>{slide.title}</h1>
              <p>{slide.subtitle}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={slide.ctaHref} className="ahenk-btn">
                  {slide.ctaLabel}
                </Link>
                <Link href="/iletisim" className="ahenk-btn ahenk-btn-ghost">
                  Teklif Alın
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        {slides.length > 1 ? (
          <div className="ahenk-hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === idx ? "is-active" : ""}
                aria-label={s.title}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="ahenk-section">
        <h2>Hizmetlerimiz</h2>
        <p className="ahenk-lead">
          Müşteri hizmetlerinden ajans ve insan kaynaklarına, e-ticaret operasyonundan kurumsal
          organizasyona kadar uçtan uca destek.
        </p>
        <div className="ahenk-grid">
          {site.services.map((svc) => (
            <Link key={svc.slug} href={`/hizmet/${svc.slug}`} className="ahenk-card">
              <span className="ahenk-card-icon">
                <AhenkServiceIcon name={svc.icon} />
              </span>
              <h3>{svc.title}</h3>
              <p>{svc.excerpt}</p>
              <span>Detaylı bilgi →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ahenk-band">
        <div className="ahenk-section">
          <h2>{site.aboutTitle}</h2>
          <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.aboutHtml }} />
          <div style={{ marginTop: 20 }}>
            <Link href="/hakkimizda" className="ahenk-btn">
              Hakkımızda
            </Link>
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
