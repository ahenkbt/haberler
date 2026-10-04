import { TurkataHaberChrome, TurkataLogo } from "@/components/turkata-haber/TurkataHaberChrome";
import {
  TURKATA_ABOUT_CLOSE,
  TURKATA_ABOUT_INTRO,
  TURKATA_ABOUT_MISSION,
  TURKATA_ABOUT_MISSION_POINTS,
  TURKATA_ABOUT_MISSION_TITLE,
  TURKATA_ABOUT_PRINCIPLES,
  TURKATA_ABOUT_PRINCIPLES_LEAD,
  TURKATA_ABOUT_PRINCIPLES_TITLE,
  TURKATA_ABOUT_REACH,
  TURKATA_ABOUT_SOCIAL,
  TURKATA_ABOUT_SOCIAL_TITLE,
  TURKATA_ABOUT_TAGLINE,
  TURKATA_ABOUT_TITLE,
  TURKATA_ADDRESS_LINE,
  TURKATA_BRAND,
  TURKATA_DEPARTMENTS,
  TURKATA_EMAIL,
  TURKATA_FOUNDATION,
  TURKATA_FOUNDATION_ADDRESS_LINE,
  TURKATA_FOUNDING_DATE,
  TURKATA_KUNYE_TITLE,
  TURKATA_LEGAL_ADDRESS_LINE,
  TURKATA_LEGAL_NAME,
  TURKATA_OFFICE,
  TURKATA_PEOPLE,
  TURKATA_PHONE_DISPLAY,
  TURKATA_PHONE_TEL,
  TURKATA_STATEMENT,
  TURKATA_TAGLINE,
} from "@/lib/turkataHaber";

/** hakkimizda.md gövdesi. Başlık ve slogan ayrı verilir; metin birebir. */
export function TurkataAboutBody() {
  return (
    <>
      {TURKATA_ABOUT_INTRO.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <h2>{TURKATA_ABOUT_MISSION_TITLE}</h2>
      <p>{TURKATA_ABOUT_MISSION}</p>
      <ul>
        {TURKATA_ABOUT_MISSION_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p>{TURKATA_ABOUT_REACH}</p>
      <h2>{TURKATA_ABOUT_SOCIAL_TITLE}</h2>
      {TURKATA_ABOUT_SOCIAL.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <h2>{TURKATA_ABOUT_PRINCIPLES_TITLE}</h2>
      <p>{TURKATA_ABOUT_PRINCIPLES_LEAD}</p>
      <ul>
        {TURKATA_ABOUT_PRINCIPLES.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p>{TURKATA_ABOUT_CLOSE}</p>
    </>
  );
}

export function TurkataHakkimizdaPage() {
  return (
    <TurkataHaberChrome title={TURKATA_ABOUT_TITLE} description={TURKATA_ABOUT_INTRO[0]}>
      <article className="turkata-page">
        <h1>{TURKATA_ABOUT_TITLE}</h1>
        <p className="turkata-lead">{TURKATA_ABOUT_TAGLINE}</p>
        <TurkataAboutBody />
      </article>
    </TurkataHaberChrome>
  );
}

export function TurkataKunyePage() {
  return (
    <TurkataHaberChrome
      title={TURKATA_KUNYE_TITLE}
      description={`${TURKATA_OFFICE}. Resmi ünvan: ${TURKATA_LEGAL_NAME}. Adres: ${TURKATA_ADDRESS_LINE}. Gsm: ${TURKATA_PHONE_DISPLAY}. E-posta: ${TURKATA_EMAIL}.`}
    >
      <article className="turkata-kunye">
        <header className="turkata-kunye-mast">
          <TurkataLogo height={72} />
          <p className="turkata-kunye-kicker">Künye</p>
          <h1>{TURKATA_OFFICE}</h1>
          <p className="turkata-kunye-statement">{TURKATA_STATEMENT}</p>
          <p className="turkata-kunye-tagline">{TURKATA_TAGLINE}</p>
        </header>

        <div className="turkata-kunye-grid">
          <section className="turkata-kunye-card">
            <h2>Genel Müdürlük</h2>
            <p className="turkata-kunye-org">{TURKATA_OFFICE}</p>
            <dl>
              {TURKATA_PEOPLE.map((person) => (
                <div key={person.jobTitle}>
                  <dt>{person.jobTitle}</dt>
                  <dd>{person.name}</dd>
                </div>
              ))}
              <div>
                <dt>Adres</dt>
                <dd>{TURKATA_ADDRESS_LINE}</dd>
              </div>
              <div>
                <dt>Gsm</dt>
                <dd>
                  <a href={`tel:${TURKATA_PHONE_TEL}`}>{TURKATA_PHONE_DISPLAY}</a>
                </dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>
                  <a href={`mailto:${TURKATA_EMAIL}`}>{TURKATA_EMAIL}</a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="turkata-kunye-card">
            <h2>Resmi Ünvan</h2>
            <p className="turkata-kunye-org">{TURKATA_LEGAL_NAME}</p>
            <p>
              <span>Adres: </span>
              {TURKATA_LEGAL_ADDRESS_LINE}
            </p>
          </section>

          <section className="turkata-kunye-card">
            <h2>Vakıf</h2>
            <p className="turkata-kunye-org">{TURKATA_FOUNDATION}</p>
            <p>Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde.</p>
            <p>
              <span>Adres: </span>
              {TURKATA_FOUNDATION_ADDRESS_LINE}
            </p>
            <h3>Haber Müdürlükleri</h3>
            <ul>
              {TURKATA_DEPARTMENTS.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>

          <section className="turkata-kunye-card" id="yayin-ilkeleri">
            <h2>Yayın İlkeleri</h2>
            <p>
              {TURKATA_BRAND}, {TURKATA_FOUNDATION} bünyesinde {TURKATA_FOUNDING_DATE}’den bu yana
              Türkçe yayın yapar. {TURKATA_TAGLINE}. Yayın, bu künyedeki Genel Müdürlük ile Yerel
              Yönetimler, Kamu, STK ve Sektörel Haber Müdürlükleri üzerinden yürütülür.
            </p>
          </section>
        </div>
      </article>
    </TurkataHaberChrome>
  );
}

export function TurkataIletisimPage() {
  return (
    <TurkataHaberChrome
      title="İletişim"
      description={`${TURKATA_OFFICE}. ${TURKATA_ADDRESS_LINE}. Gsm: ${TURKATA_PHONE_DISPLAY}. E-posta: ${TURKATA_EMAIL}.`}
    >
      <article className="turkata-page">
        <h1>İletişim</h1>
        <p className="turkata-lead">{TURKATA_STATEMENT}</p>
        <p>{TURKATA_OFFICE}</p>
        <dl className="turkata-facts">
          <dt>Adres</dt>
          <dd>{TURKATA_ADDRESS_LINE}</dd>
          <dt>Gsm</dt>
          <dd>
            <a href={`tel:${TURKATA_PHONE_TEL}`}>{TURKATA_PHONE_DISPLAY}</a>
          </dd>
          <dt>E-posta</dt>
          <dd>
            <a href={`mailto:${TURKATA_EMAIL}`}>{TURKATA_EMAIL}</a>
          </dd>
        </dl>
      </article>
    </TurkataHaberChrome>
  );
}
