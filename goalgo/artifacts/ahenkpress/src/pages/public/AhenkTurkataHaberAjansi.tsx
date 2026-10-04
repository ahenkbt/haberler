import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { TurkataAboutBody } from "@/pages/public/TurkataStaticPages";
import { TURKATA_ABOUT_INTRO, TURKATA_ABOUT_TAGLINE, TURKATA_ABOUT_TITLE, TURKATA_ORIGIN } from "@/lib/turkataHaber";

export default function AhenkTurkataHaberAjansi() {
  return (
    <AhenkAgencyChrome title="TürkAta Haber Ajansı | Ahenk Bilgi Teknolojileri" description={TURKATA_ABOUT_INTRO[0]}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / TürkAta Haber Ajansı
          </>
        }
        title={TURKATA_ABOUT_TITLE}
        lead={TURKATA_ABOUT_TAGLINE}
      />
      <section className="ahenk-section ahenk-detail">
        <div>
          <TurkataAboutBody />
          <p>
            <a className="ahenk-btn" href={TURKATA_ORIGIN}>
              turkatahaber.com — resmi site
            </a>
          </p>
        </div>
      </section>
      <section className="ahenk-cta">
        <div className="ahenk-cta-inner">
          <div>
            <h2>Güncel haberler</h2>
            <p>Ajansın kanonik sitesi turkatahaber.com’dur. Haberler bu adreste yayınlanır.</p>
          </div>
          <a className="ahenk-btn" href={TURKATA_ORIGIN}>
            turkatahaber.com
          </a>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
