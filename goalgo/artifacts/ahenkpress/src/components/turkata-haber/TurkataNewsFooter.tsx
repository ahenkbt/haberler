import { HmPublicSiteFooter } from "@/components/HmPublicSiteFooter";
import { defaultNewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  TURKATA_ADDRESS_LINE,
  TURKATA_EMAIL,
  TURKATA_FOOTER_ABOUT_HTML,
  TURKATA_OFFICE,
  TURKATA_PHONE_DISPLAY,
  TURKATA_PHONE_TEL,
  turkataSitePath,
} from "@/lib/turkataHaber";

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
          hmFooterAboutHtml: TURKATA_FOOTER_ABOUT_HTML,
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
