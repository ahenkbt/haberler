import { Link } from "wouter";
import { Car, CircleDot, Droplets, Package, Recycle, Shield, Sparkles, Wrench } from "lucide-react";
import { OtomotivSubNavBar } from "./OtomotivSubNavBar";
import {
  CATEGORY_HERO,
  OTOMOTIV_DISCLAIMER,
  OTOMOTIV_HUB_VALUE_CARDS,
} from "./otomotivHubConfig";
import { OTOMOTIV, OTOMOTIV_MODULES, type OtomotivModuleKey } from "./otomotivRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import "@/styles/otomotivHub.css";
import "@/styles/bookingCoreTurizm.css";

const HUB_ICONS: Record<OtomotivModuleKey, typeof Car> = {
  galeri: Car,
  sifir: Sparkles,
  ikinciEl: Car,
  yedekParca: Package,
  cikma: Recycle,
  servis: Wrench,
  yikama: Droplets,
  lastik: CircleDot,
  sigorta: Shield,
};

/** /otomotiv — otomotiv modül giriş noktası */
export default function OtomotivHubPage() {
  return (
    <div className="oto-hub" data-page="otomotiv-hub">
      <OtomotivSubNavBar />

      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--category oto-hub__hero"
        style={{ backgroundImage: `url(${CATEGORY_HERO.hub.bg})` }}
        aria-label="Otomotiv ana sayfa"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus oto-hub__hero-inner">
          <p className="oto-hub__kicker">Türkiye otomotiv listeleme ve rehber platformu</p>
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{CATEGORY_HERO.hub.title}</h1>
          <p className="bc-hub-hero__subtitle">{CATEGORY_HERO.hub.subtitle}</p>
          <div className="oto-hub__hero-actions">
            <Link href={OTOMOTIV.galeri.home} className="oto-hub__cta oto-hub__cta--primary">
              Araç ilanları
            </Link>
            <Link href="/isletme-basvuru" className="oto-hub__cta oto-hub__cta--ghost">
              İşletme ekle
            </Link>
          </div>
        </div>
      </section>

      <div className="oto-hub__values">
        {OTOMOTIV_HUB_VALUE_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="oto-hub__value-card">
            <span className="oto-hub__value-icon" aria-hidden>
              {card.icon}
            </span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>

      <div className="oto-hub__grid">
        {OTOMOTIV_MODULES.map((m) => {
          const Icon = HUB_ICONS[m.key];
          return (
            <Link key={m.key} href={m.href} className="oto-hub__card">
              <span className="oto-hub__card-icon">
                <Icon aria-hidden />
              </span>
              <h2>{m.label}</h2>
              <p>{m.description}</p>
              <span className="oto-hub__card-cta">Modüle git →</span>
            </Link>
          );
        })}
      </div>

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
