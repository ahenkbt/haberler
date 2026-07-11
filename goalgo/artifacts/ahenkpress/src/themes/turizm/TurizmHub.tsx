import { Link } from "wouter";
import { Building2, Car, Compass, Home, Ship } from "lucide-react";
import { TurizmSubNavBar } from "./TurizmSubNavBar";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import { CATEGORY_HERO } from "./turizmHubConfig";
import { TURIZM, TURIZM_MODULES, type TurizmModuleKey } from "./turizmRoutes";
import "@/styles/turizmHub.css";
import "@/styles/bookingCoreTurizm.css";

const HUB_ICONS: Record<TurizmModuleKey, typeof Compass> = {
  turlar: Compass,
  konaklama: Building2,
  villaEv: Home,
  arac: Car,
  yat: Ship,
};

/** /turizm — üç modül giriş noktası; eski Turinet nav yok */
export default function TurizmHub() {
  return (
    <div className="tz-hub" data-page="turizm-hub">
      <header className="tz-hub__top">
        <Link href="/" className="tz-hub__brand">
          <span className="tz-hub__logo">Y</span>
          <span>
            <strong>Yekpare</strong>
            <small>Seyahat</small>
          </span>
        </Link>
        <div className="tz-hub__actions">
          <Link href="/isletme-basvuru">İşletme ekle</Link>
          <Link href="/turizm-paneli">Panel</Link>
        </div>
      </header>

      <TurizmSubNavBar />

      <section
        className="tz-hub__hero bc-hub-hero bc-hub-hero--bus bc-hub-hero--category"
        style={{ backgroundImage: `url(${CATEGORY_HERO.hub.bg})` }}
        aria-label="Seyahat ana sayfa"
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus tz-hub__hero-inner">
          <p className="tz-hub__kicker">Türkiye&apos;yi keşfedin</p>
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">Tur, konaklama ve ulaşım tek yerde</h1>
          <p className="bc-hub-hero__subtitle">Modül seçerek devam edin — her bölüm kendi temasıyla açılır.</p>
        </div>
      </section>

      <TurizmCategoryBlogRow slug="hub" title={null} />

      <div className="tz-hub__grid">
        {TURIZM_MODULES.map((m) => {
          const Icon = HUB_ICONS[m.key];
          return (
            <Link key={m.key} href={m.href} className="tz-hub__card">
              <span className="tz-hub__card-icon">
                <Icon aria-hidden />
              </span>
              <h2>{m.label}</h2>
              <p>{m.description}</p>
              <span className="tz-hub__card-cta">Modüle git →</span>
            </Link>
          );
        })}
      </div>

      <footer className="tz-hub__footer">
        <Link href={TURIZM.turlar.home}>Turlar</Link>
        <Link href={TURIZM.turlar.sss}>SSS</Link>
        <Link href="/gizlilik-kvkk">KVKK</Link>
        <Link href="/iletisim">İletişim</Link>
        <span>© Yekpare</span>
      </footer>
    </div>
  );
}
