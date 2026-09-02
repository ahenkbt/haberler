import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkPageHero,
  AhenkSmartLink,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { safeAhenkImageUrl } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyYekpare() {
  const site = useAhenkAgencySite();
  const src = safeAhenkImageUrl(site.yekpare.image, "");
  return (
    <AhenkAgencyChrome title={site.yekparePageTitle} description={site.yekpare.text}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Yekpare
          </>
        }
        title={site.yekparePageTitle}
        lead={site.yekpare.text}
        image={src}
      />
      <section className="ahenk-section ahenk-detail">
        {src ? (
          <div className="ahenk-detail-photo">
            <img src={src} alt="Yekpare.net" />
          </div>
        ) : null}
        <div>
          <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.yekparePageHtml }} />
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AhenkSmartLink href={site.yekpare.ctaHref} className="ahenk-btn">
              {site.yekpare.ctaLabel}
            </AhenkSmartLink>
            <Link href="/iletisim" className="ahenk-btn ahenk-btn-light">
              Ortaklık konuşalım
            </Link>
          </div>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
