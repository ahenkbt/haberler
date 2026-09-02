import { Link, useLocation, useParams } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkPageHero,
  AhenkServiceIcon,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkAliasSlug } from "@/lib/ahenkAgencySeo";
import { ahenkPackageFromFields } from "@/lib/ahenkCampaignPrice";
import { findAhenkContentCard, safeAhenkImageUrl } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyYazilimDetail() {
  const site = useAhenkAgencySite();
  const params = useParams<{ slug?: string }>();
  const [location] = useLocation();
  const slug = String(params.slug ?? ahenkAliasSlug(location) ?? "").trim();
  const card = findAhenkContentCard(site, slug);
  const isAgency = Boolean(card && site.agencyOffers.some((c) => c.slug === card.slug));

  if (!card) {
    return (
      <AhenkAgencyChrome title="Sayfa bulunamadı">
        <div className="ahenk-section">
          <h2>Sayfa bulunamadı</h2>
          <p className="ahenk-lead">Aradığınız yazılım veya ajans sayfası yok.</p>
          <Link href="/yazilim" className="ahenk-btn">
            Yazılım dikeyleri
          </Link>
        </div>
      </AhenkAgencyChrome>
    );
  }

  const src = safeAhenkImageUrl(card.image, site.heroImage);
  const parentHref = isAgency ? "/ajans" : "/yazilim";
  const parentLabel = isAgency ? "Ajans" : "Yazılım";
  const pkg = ahenkPackageFromFields(site);

  return (
    <AhenkAgencyChrome title={card.title} description={card.excerpt}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href={parentHref}>{parentLabel}</Link> / {card.title}
          </>
        }
        title={card.title}
        lead={card.excerpt}
        image={src}
      />
      <section className="ahenk-section ahenk-detail">
        {src ? (
          <div className="ahenk-detail-photo">
            <img src={src} alt={card.title} />
          </div>
        ) : null}
        <div>
          <span className="ahenk-card-icon" style={{ marginBottom: 18 }}>
            <AhenkServiceIcon name={card.icon} />
          </span>
          <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: card.bodyHtml }} />
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/iletisim" className="ahenk-btn">
              Teklif alın — {pkg.display}
            </Link>
            <a
              className="ahenk-btn ahenk-btn-light"
              href={`https://wa.me/905413136245?text=${encodeURIComponent(`Merhaba, ${card.title} istiyorum.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp {site.phone}
            </a>
          </div>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
