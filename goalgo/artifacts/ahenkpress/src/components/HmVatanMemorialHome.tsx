import { Link } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";
import { VATAN_HERITAGE_CARDS, VATAN_HOME_HERO, VATAN_MEMORIAL_CARDS, type VatanMemorialCard } from "@/lib/hmVatanTheme";

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

function Tile({ card, featured = false }: { card: VatanMemorialCard; featured?: boolean }) {
  const h = useHmPublicHref();
  return (
    <CardLink href={h(card.href)} className={`vatan-tile${featured ? " vatan-tile--xl" : ""}`}>
      <img src={card.image} alt={card.imageAlt} loading={featured ? "eager" : "lazy"} decoding="async" width={1280} height={720} />
      <span className="vatan-tile__shade" aria-hidden />
      <span className="vatan-tile__copy">
        <span className="vatan-tile__kicker">{card.kicker}</span>
        <span className="vatan-tile__title">{card.title}</span>
        <span className="vatan-tile__excerpt">{card.excerpt}</span>
      </span>
    </CardLink>
  );
}

export function HmVatanMemorialHome() {
  const h = useHmPublicHref();
  const featured = VATAN_MEMORIAL_CARDS.slice(0, 2);
  const mosaic = VATAN_MEMORIAL_CARDS.slice(2);

  return (
    <div className="vatan-portal">
      <section className="vatan-portal__block" aria-label="Ziyaret">
        <header className="vatan-portal__intro">
          <p className="vatan-hub__kicker">Ziyaret</p>
          <h2 className="vatan-hub__title">
            Hatıra mekânları
            <em>ve vefa yolları</em>
          </h2>
          <p className="vatan-hub__lead">{VATAN_HOME_HERO.lead}</p>
        </header>
        <div className="vatan-feat">
          {featured.map((card) => (
            <Tile key={card.slug} card={card} featured />
          ))}
        </div>
        <div className="vatan-mosaic">
          {mosaic.map((card) => (
            <Tile key={card.slug} card={card} />
          ))}
        </div>
      </section>

      <section className="vatan-find" aria-label="Şehit arama">
        <div className="vatan-find__copy">
          <p className="vatan-hub__kicker">Kayıt</p>
          <h2>Şehidini bul</h2>
          <p>MSB ve Çanakkale listeleri resmî kayıttadır. Ad ile saygıyla arayın.</p>
        </div>
        <div className="vatan-find__actions">
          <Link href={h("/sehitlerimiz")} className="vatan-find__btn">
            MSB şehit listesi
          </Link>
          <Link href={h("/canakkale-sehitleri")} className="vatan-find__btn vatan-find__btn--ghost">
            Çanakkale şehitleri
          </Link>
        </div>
      </section>

      <section className="vatan-portal__block" aria-label="Hafıza">
        <header className="vatan-portal__intro">
          <p className="vatan-hub__kicker">Hafıza</p>
          <h2 className="vatan-hub__title">
            Atatürk Köşesi
            <em>ve açık sayfalar</em>
          </h2>
          <p className="vatan-hub__lead">Köşe, kültür, savaşlar ve dernek — mevcut adresler menüde ve burada durur.</p>
        </header>
        <div className="vatan-mosaic vatan-mosaic--four">
          {VATAN_HERITAGE_CARDS.map((card) => (
            <Tile key={card.slug} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
