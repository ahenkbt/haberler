import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkFaqList,
  AhenkMediaCard,
  AhenkSmartLink,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkCallCenterServices, ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { safeAhenkImageUrl } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyHome() {
  const site = useAhenkAgencySite();
  const heroSrc = safeAhenkImageUrl(site.heroImage, "");
  const yekpareSrc = safeAhenkImageUrl(site.yekpare.image, "");
  const aboutSrc = safeAhenkImageUrl(site.aboutImage, "");
  const featured = site.softwareSectors.slice(0, 3);
  const restSectors = site.softwareSectors.slice(3);
  const callCenter = ahenkCallCenterServices(site);
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, kurumsal web sitesi / web yazılımı istiyorum.",
  );

  return (
    <AhenkAgencyChrome title={site.seoTitle} description={site.seoDescription}>
      <section className="ahenk-hero" aria-label="Web yazılımı">
        {heroSrc ? (
          <div className="ahenk-hero-photo" aria-hidden>
            <img src={heroSrc} alt="Ahenk web yazılımı" />
          </div>
        ) : null}
        <div className="ahenk-hero-slide">
          <div className="ahenk-hero-inner">
            <span className="ahenk-kicker">{site.heroKicker}</span>
            <h1>{site.heroTitle}</h1>
            <p>{site.heroSubtitle}</p>
            <p className="ahenk-hero-ai">{site.aiDeliveryLead}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <AhenkSmartLink href={site.heroCtaHref} className="ahenk-btn">
                {site.heroCtaLabel}
              </AhenkSmartLink>
              <AhenkSmartLink href={site.heroSecondaryHref} className="ahenk-btn ahenk-btn-ghost">
                {site.heroSecondaryLabel}
              </AhenkSmartLink>
              <a className="ahenk-btn ahenk-btn-ghost" href={wa} target="_blank" rel="noreferrer">
                WhatsApp {site.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ahenk-price" id="fiyat">
        <div className="ahenk-price-inner">
          <div>
            <span className="ahenk-kicker">{site.priceTitle}</span>
            <strong>
              {Number(String(site.priceAmount || "10000").replace(/\D/g, "") || "10000").toLocaleString("tr-TR")}{" "}
              TL
            </strong>
            <p>
              {site.pricePeriodNote}. {site.aiDeliveryLead}
            </p>
          </div>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp ile sipariş
          </a>
        </div>
      </section>

      <section className="ahenk-section" id="yazilim">
        <h2>{site.softwareTitle}</h2>
        <p className="ahenk-lead">{site.softwareLead}</p>
        {featured.length ? <AhenkCardGrid items={featured} cta="Web yazılımı" /> : null}
        {restSectors.length ? (
          <div className="ahenk-grid ahenk-grid-tight" style={{ marginTop: 18 }}>
            {restSectors.map((item) => (
              <AhenkSmartLink key={item.slug} href={item.href} className="ahenk-card ahenk-card-media">
                <span className="ahenk-card-photo ahenk-card-photo-sm">
                  {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : null}
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
          <AhenkCardGrid items={site.agencyOffers} cta="Ajans" />
        </div>
      </section>

      {callCenter.length ? (
        <section className="ahenk-section" id="cagri-merkezi">
          <h2>Çağrı merkezi hizmetleri</h2>
          <p className="ahenk-lead">
            Web yazılımı ve ajansın ardından operasyon: müşteri hizmetleri ve çağrı merkezi sipariş sistemi.
          </p>
          <div className="ahenk-grid">
            {callCenter.map((svc) => (
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
      ) : null}

      <section className="ahenk-promo" aria-label="Yekpare">
        {yekpareSrc ? (
          <div className="ahenk-promo-visual">
            <img src={yekpareSrc} alt="Yekpare.net" />
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
            Haber sitesi yazılımı
          </Link>
        </div>
      </section>

      <section className="ahenk-section" id="sss">
        <h2>Sık sorulan sorular</h2>
        <p className="ahenk-lead">Web yazılımı, kurumsal web sitesi fiyatı ve teslim süresi.</p>
        <AhenkFaqList faqs={site.faqs} />
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
            <p className="ahenk-iban" style={{ marginTop: 12 }}>
              {site.ibanBank} · {site.ibanHolder}
              <br />
              <span className="ahenk-iban-num">{site.iban}</span>
            </p>
          </div>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
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
