import { Link } from "wouter";
import { OtomotivSubNavBar } from "./OtomotivSubNavBar";
import {
  CATEGORY_HERO,
  OTOMOTIV_DISCLAIMER,
  OTOMOTIV_SIGORTA_DISCLAIMER,
  SIGORTA_FEATURE_CARDS,
} from "./otomotivHubConfig";
import { OTOMOTIV } from "./otomotivRoutes";
import { SigortaLeadForm } from "./SigortaLeadForm";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/otomotivHub.css";

/** /otomotiv/sigorta — Trafik & Kasko lead yönlendirme (Faz 5 iskelet) */
export function OtomotivSigortaPage() {
  const hero = CATEGORY_HERO.sigorta;

  return (
    <div className="oto-sigorta" data-page="otomotiv-sigorta">
      <OtomotivSubNavBar sticky />

      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--category oto-sigorta__hero"
        style={{ backgroundImage: `url(${hero.bg})` }}
        aria-label="Sigorta"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <p className="oto-hub__kicker">Faz 5 — Yakında tam entegrasyon</p>
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{hero.subtitle}</p>
          <div className="oto-hub__hero-actions">
            <a href="#sigorta-teklif" className="oto-hub__cta oto-hub__cta--primary">
              Teklif talebi
            </a>
            <Link href="/isletme-basvuru" className="oto-hub__cta oto-hub__cta--ghost">
              Sigorta acentesi başvurusu
            </Link>
          </div>
        </div>
      </section>

      <div className="oto-sigorta__features">
        {SIGORTA_FEATURE_CARDS.map((card) => (
          <div key={card.title} className="oto-hub__value-card oto-sigorta__feature">
            <span className="oto-hub__value-icon" aria-hidden>{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        ))}
      </div>

      <div className="oto-sigorta__layout" id="sigorta-teklif">
        <SigortaLeadForm />
        <aside className="oto-sigorta__aside">
          <h3>Yakında</h3>
          <ul>
            <li>Broker API ile anlık trafik/kasko fiyat karşılaştırması</li>
            <li>Garajım — poliçe bitiş hatırlatıcı (30/15/7 gün)</li>
            <li>Araç ilanından yaklaşık prim tahmini</li>
            <li>Anlaşmalı servis çapraz kampanyalar</li>
          </ul>
          <p className="oto-sigorta__phase-note">
            Canlı teklif motoru yalnızca lisanslı broker API anahtarları tanımlandığında devreye alınır.
          </p>
          <Link href={OTOMOTIV.admin} className="text-sm text-[#1e3a5f] underline">
            Admin: Sigorta yönetimi →
          </Link>
        </aside>
      </div>

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_SIGORTA_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
