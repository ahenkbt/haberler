import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import {
  TURKATA_ADDRESS_LINE,
  TURKATA_BRAND,
  TURKATA_DEPARTMENTS,
  TURKATA_DESCRIPTION,
  TURKATA_FOUNDATION,
  TURKATA_FOUNDATION_ALT_URL,
  TURKATA_FOUNDATION_URL,
  TURKATA_FOUNDING_DATE,
  TURKATA_MISSION,
  TURKATA_ORIGIN,
} from "@/lib/turkataHaber";

export default function AhenkTurkataHaberAjansi() {
  return (
    <AhenkAgencyChrome title="TürkAta Haber Ajansı | Ahenk Bilgi Teknolojileri" description={TURKATA_DESCRIPTION}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / TürkAta Haber Ajansı
          </>
        }
        title="TürkAta Haber Ajansı"
        lead={TURKATA_DESCRIPTION}
      />
      <section className="ahenk-section">
        <p className="ahenk-lead">{TURKATA_MISSION}</p>
        <p>
          <a className="ahenk-btn" href={TURKATA_ORIGIN}>
            turkatahaber.com — resmi site
          </a>
        </p>
      </section>
      <section className="ahenk-section ahenk-detail">
        <div>
          <h2>Misyonumuz</h2>
          <p>{TURKATA_MISSION}</p>
          <h2>Haber müdürlükleri</h2>
          <ul className="ahenk-mods">
            {TURKATA_DEPARTMENTS.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <h2>Kurum</h2>
          <p>
            {TURKATA_BRAND}, {TURKATA_FOUNDATION}’nın haber ajansıdır. Vakıf {TURKATA_FOUNDING_DATE} yılında
            kurulmuştur. Yayın dili Türkçedir. Adres: {TURKATA_ADDRESS_LINE}.
          </p>
          <p>
            Vakıf siteleri: <a href={TURKATA_FOUNDATION_URL}>turkatav.org</a>
            {" · "}
            <a href={TURKATA_FOUNDATION_ALT_URL}>tukav.org</a>
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
