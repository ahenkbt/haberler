import { YEKPARE_FOOTER_DISCLAIMER } from "@workspace/site-nav";

type YekpareFooterDisclaimerProps = {
  className?: string;
};

/** Kısa platform sorumluluk bilgilendirmesi — tüm Yekpare public footer'larda. */
export function YekpareFooterDisclaimer({ className = "" }: YekpareFooterDisclaimerProps) {
  return (
    <aside
      className={className}
      aria-label="Platform bilgilendirmesi"
    >
      <p>{YEKPARE_FOOTER_DISCLAIMER}</p>
    </aside>
  );
}
