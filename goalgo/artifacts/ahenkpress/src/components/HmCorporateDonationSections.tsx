import type { HmCorporateDonationSettings } from "@/lib/newsSiteLayout";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { HmCorporateIbanDonationCard } from "@/components/HmCorporateIbanDonationCard";

type HmCorporateDonationBandProps = {
  donation: HmCorporateDonationSettings;
};

/** Kurumsal tema: tek destek bandı — solda başlık + maddeler, sağda IBAN kutusu. */
export function HmCorporateDonationBand({ donation }: HmCorporateDonationBandProps) {
  const band = donation.supportBand;
  const items = (band?.enabled !== false ? (band?.items ?? []) : [])
    .filter((item) => item.trim())
    .slice(0, 3);
  const title = donation.title || band?.title || "Desteğiniz haber merkezinin yanında";
  const highlightsHtml = (band?.highlightsHtml ?? "").trim();
  const leadText = (band?.text ?? "").trim();

  return (
    <section className="vkv-donation-band vkv-donation-band--with-iban">
      <div className="vkv-donation-band-w">
        <div className="vkv-donation-band-copy">
          <div className="vkv-bagis-eyebrow">Destek Bandı</div>
          <h2 className="vkv-bagis-h">{title}</h2>
          {highlightsHtml ? (
            <div
              className="vkv-donation-highlights"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlightsHtml) }}
            />
          ) : leadText ? (
            <p className="vkv-donation-lead">{leadText}</p>
          ) : null}
          {items.length ? (
            <div className="vkv-donation-band-items vkv-donation-band-items--inline">
              {items.map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>
        <HmCorporateIbanDonationCard donation={donation} showHeading={false} />
      </div>
    </section>
  );
}
