import { TurkataHaberChrome } from "@/components/turkata-haber/TurkataHaberChrome";
import {
  TURKATA_ADDRESS_LINE,
  TURKATA_BRAND,
  TURKATA_DEPARTMENTS,
  TURKATA_DESCRIPTION,
  TURKATA_EMAIL,
  TURKATA_FOUNDATION,
  TURKATA_FOUNDATION_ADDRESS_LINE,
  TURKATA_FOUNDATION_ALT_URL,
  TURKATA_FOUNDATION_URL,
  TURKATA_FOUNDING_DATE,
  TURKATA_KUNYE_TITLE,
  TURKATA_LEGAL_ADDRESS_LINE,
  TURKATA_LEGAL_NAME,
  TURKATA_MISSION,
  TURKATA_OFFICE,
  TURKATA_PEOPLE,
  TURKATA_PHONE_DISPLAY,
  TURKATA_PHONE_TEL,
  TURKATA_STATEMENT,
  TURKATA_TAGLINE,
  TURKATA_WORDMARK,
} from "@/lib/turkataHaber";

function Facts() {
  return (
    <dl className="turkata-facts">
      <dt>Yayın adı</dt>
      <dd>{TURKATA_BRAND}</dd>
      <dt>Bağlı olduğu vakıf</dt>
      <dd>
        {TURKATA_FOUNDATION} ({TURKATA_FOUNDING_DATE})
      </dd>
      <dt>Vakıf adresi</dt>
      <dd>{TURKATA_FOUNDATION_ADDRESS_LINE}</dd>
      <dt>Vakıf siteleri</dt>
      <dd>
        <a href={TURKATA_FOUNDATION_URL}>turkatav.org</a>
        {" · "}
        <a href={TURKATA_FOUNDATION_ALT_URL}>tukav.org</a>
      </dd>
      <dt>Genel Müdürlük</dt>
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
  );
}

export function TurkataHakkimizdaPage() {
  return (
    <TurkataHaberChrome title="Hakkımızda" description={TURKATA_DESCRIPTION}>
      <article className="turkata-page">
        <h1>Hakkımızda</h1>
        <p className="turkata-lead">{TURKATA_STATEMENT}</p>
        <p>{TURKATA_DESCRIPTION}</p>
        <h2>Misyonumuz</h2>
        <p>{TURKATA_MISSION}</p>
        <p>{TURKATA_TAGLINE}.</p>
        <h2>Haber müdürlükleri</h2>
        <ul>
          {TURKATA_DEPARTMENTS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <h2>Kurum</h2>
        <p>
          {TURKATA_BRAND}, {TURKATA_FOUNDATION} bünyesinde {TURKATA_FOUNDING_DATE}’den bu yana yayın
          yapar. Resmi vakıf siteleri <a href={TURKATA_FOUNDATION_URL}>turkatav.org</a> ve{" "}
          <a href={TURKATA_FOUNDATION_ALT_URL}>tukav.org</a> adresleridir.
        </p>
        <Facts />
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
          <img src={TURKATA_WORDMARK} alt="TürkAta Haber Ajansı" width={280} height={56} />
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
        <Facts />
      </article>
    </TurkataHaberChrome>
  );
}
