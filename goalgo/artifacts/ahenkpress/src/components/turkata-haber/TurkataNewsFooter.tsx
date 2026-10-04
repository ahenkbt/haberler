import { HmPublicSiteFooter } from "@/components/HmPublicSiteFooter";
import { defaultNewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  TURKATA_ADDRESS_LINE,
  TURKATA_EMAIL,
  TURKATA_FOUNDATION,
  TURKATA_FOUNDING_DATE,
  TURKATA_OFFICE,
  TURKATA_PHONE_DISPLAY,
  TURKATA_PHONE_TEL,
  TURKATA_STATEMENT,
  TURKATA_TAGLINE,
  turkataSitePath,
} from "@/lib/turkataHaber";

const ABOUT_HTML = `<p><strong>${TURKATA_STATEMENT}</strong></p>
<p>TürkAta Haber Ajansı, ${TURKATA_FOUNDATION} bünyesinde ${TURKATA_FOUNDING_DATE}’den bu yana yayın yapar. ${TURKATA_TAGLINE}.</p>`;

export function TurkataNewsFooter() {
  return (
    <div className="turkata-footer-host">
      <HmPublicSiteFooter
        siteId={0}
        slug="turkatahaber"
        siteDisplayName="TürkAta Haber Ajansı"
        showVideoTvLink={false}
        contactLead={TURKATA_OFFICE}
        phoneLabel="Gsm"
        phoneTel={TURKATA_PHONE_TEL}
        appendAuthorLogin={false}
        infrastructureLabel="Altyapı"
        contact={{
          phone: TURKATA_PHONE_DISPLAY,
          email: TURKATA_EMAIL,
          address: TURKATA_ADDRESS_LINE,
        }}
        layoutPrefs={{
          ...defaultNewsSiteLayoutPrefs,
          hmFooterAboutHtml: ABOUT_HTML,
          hmNewsRssLinksEnabled: false,
          hmNewsVideoTvEnabled: false,
          hmNewsFooterMenuItems: [
            { id: "hakkimizda", label: "Hakkımızda", href: turkataSitePath("/hakkimizda") },
            { id: "kunye", label: "Künye", href: turkataSitePath("/kunye") },
            { id: "iletisim", label: "İletişim", href: turkataSitePath("/iletisim") },
          ],
        }}
      />
    </div>
  );
}
