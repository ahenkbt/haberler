import { VatanButton } from "@/components/vatan/ui/VatanButton";

/**
 * Şehit Gazi tanıtım kutusu (sgpromo 2026-10-11).
 * Opt-in: yalnız `hmVatanHomeModuleOrder` içinde açıkça "sehitGazi" olan sitede görünür.
 */
const SG_URL = "https://sehitgazi.org.tr/";
const SG_LOGO = "https://sehitgazi.org.tr/brand/sector/sehitgazi/logo-dark.svg";

const TOPICS = [
  "Şehit ve gazi haberleri",
  "Haklar ve mevzuat",
  "TSK ve Çanakkale şehitlerimiz",
  "Millî Günler",
];

export function VatanSehitGaziPromo({ numeral }: { numeral?: string }) {
  return (
    <section className="vatan-section vatan-sgpromo" aria-labelledby="vatan-sgpromo-title">
      <div className="vatan-wrap">
        <div className="vatan-sgpromo__card vatan-reveal">
          <span className="vatan-sgpromo__crest" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
              <path d="M38 12a20 20 0 1 0 12 33 16 16 0 1 1-12-33Z" fill="currentColor" />
              <path d="m46 24 1.8 4.1 4.4.5-3.3 3 1 4.4-3.9-2.3-3.9 2.3 1-4.4-3.3-3 4.4-.5Z" fill="currentColor" />
            </svg>
          </span>
          <div className="vatan-sgpromo__brand">
            <img src={SG_LOGO} alt="Şehit Gazi" width={260} height={72} loading="lazy" decoding="async" />
          </div>
          <div className="vatan-sgpromo__body">
            <p className="vatan-eyebrow vatan-sgpromo__eyebrow">
              {numeral ? <span className="vatan-eyebrow__numeral">{numeral}</span> : null}
              {numeral ? <span aria-hidden="true">—</span> : null}
              <span>Türk Kültürünü Araştırma ve Tanıtma Vakfı hizmetidir</span>
            </p>
            <h2 className="vatan-h2 vatan-sgpromo__title" id="vatan-sgpromo-title">
              Şehit Gazi <em>Vakar · Vefa · Minnet</em>
            </h2>
            <p className="vatan-lead vatan-sgpromo__lead">
              Şehit yakınlarımız ve gazilerimiz için hazırlanan vefa portalı: güncel haberler, haklar ve mevzuat,
              TSK ve Çanakkale şehitlerimiz, Millî Günler tek çatı altında.
            </p>
            <ul className="vatan-sgpromo__topics" role="list">
              {TOPICS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="vatan-actions">
              <VatanButton href={SG_URL} variant="outline" arrow className="vatan-sgpromo__btn">
                Siteyi Ziyaret Et
              </VatanButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VatanSehitGaziPromo;
