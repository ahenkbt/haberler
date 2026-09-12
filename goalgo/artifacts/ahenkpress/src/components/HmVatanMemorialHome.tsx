import { Link } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";
import { VATAN_HERITAGE_CARDS, VATAN_HOME_HERO, VATAN_MEMORIAL_CARDS } from "@/lib/hmVatanTheme";

function CardLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (isHmPublicNavExternal(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function HmVatanMemorialHome() {
  const h = useHmPublicHref();

  return (
    <section className="vatan-hub" aria-label="Vatan hatıra bölümleri">
      <div className="vatan-hub__intro">
        <p className="vatan-hub__kicker">{VATAN_HOME_HERO.eyebrow}</p>
        <h2 className="vatan-hub__title">
          Hatıra mekânları
          <em>ve vefa yolları</em>
        </h2>
        <p className="vatan-hub__lead">
          Şehitlerimiz, şehitlikler, haklar ve millî günler — tek çatıda, resmî kayıtlara bağlı, süslemesiz.
        </p>
      </div>
      <div className="vatan-hub__grid">
        {VATAN_MEMORIAL_CARDS.map((card) => (
          <CardLink key={card.slug} href={h(card.href)} className="vatan-card">
            <div className="vatan-card__media">
              <img src={card.image} alt={card.imageAlt} loading="lazy" decoding="async" width={640} height={360} />
              <span className="vatan-card__kicker">{card.kicker}</span>
            </div>
            <div className="vatan-card__body">
              <h3 className="vatan-card__title">{card.title}</h3>
              <p className="vatan-card__excerpt">{card.excerpt}</p>
              <span className="vatan-card__cta">İncele →</span>
            </div>
          </CardLink>
        ))}
      </div>

      <div className="vatan-hub__intro vatan-hub__intro--second">
        <p className="vatan-hub__kicker">Hafıza ve kurum</p>
        <h2 className="vatan-hub__title">
          Atatürk Köşesi
          <em>ve açık sayfalar</em>
        </h2>
        <p className="vatan-hub__lead">
          Köşe, kültür portalı, savaşlar ve dernek — mevcut adresler korunur; menüden de açılır.
        </p>
      </div>
      <div className="vatan-hub__grid vatan-hub__grid--heritage">
        {VATAN_HERITAGE_CARDS.map((card) => (
          <CardLink key={card.slug} href={h(card.href)} className="vatan-card">
            <div className="vatan-card__media">
              <img src={card.image} alt={card.imageAlt} loading="lazy" decoding="async" width={640} height={360} />
              <span className="vatan-card__kicker">{card.kicker}</span>
            </div>
            <div className="vatan-card__body">
              <h3 className="vatan-card__title">{card.title}</h3>
              <p className="vatan-card__excerpt">{card.excerpt}</p>
              <span className="vatan-card__cta">İncele →</span>
            </div>
          </CardLink>
        ))}
      </div>
    </section>
  );
}
