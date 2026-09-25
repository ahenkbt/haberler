import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import type { ResolvedVatanRights } from "@/lib/hmVatanHomeCopy";
import { VATAN_RIGHTS_NOTE_LINKS } from "@/lib/hmVatanHomeContent";
import { isTgdHmSiteSlug } from "@/lib/hmVatanHomeCopy";
import { VatanHairlineList } from "@/components/vatan/ui/VatanHairlineList";
import { VatanLink } from "@/components/vatan/ui/VatanLink";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

export function VatanHaklarDestek({
  numeral = "03",
  content,
  siteSlug,
}: {
  numeral?: string;
  content: ResolvedVatanRights;
  siteSlug?: string;
}) {
  const h = useHmPublicHref();
  const showLegacyNotes = !isTgdHmSiteSlug(siteSlug);
  return (
    <section className="vatan-section vatan-section--ivory vatan-split" aria-labelledby="vatan-s5-title">
      <div className="vatan-wrap vatan-split__grid">
        <figure className="vatan-split__media vatan-split__media--sticky vatan-reveal">
          <img src={content.imageUrl} alt={content.imageAlt} loading="lazy" decoding="async" width={1280} height={720} />
        </figure>
        <div className="vatan-split__body">
          <VatanSectionHead
            numeral={numeral}
            eyebrow={content.eyebrow}
            title={content.title}
            accent={content.accent}
            align="stack"
            id="vatan-s5-title"
            lead={content.lead}
          />
          <VatanHairlineList
            ariaLabel="Haklar ve destek sayfaları"
            rows={content.rows.map((r) => ({ key: r.href, href: h(r.href), title: r.title, text: r.text }))}
          />
          {showLegacyNotes ? (
            <p className="vatan-note">
              Uluslararası çerçeve ve kuruluşlar:{" "}
              {VATAN_RIGHTS_NOTE_LINKS.map((l, i) => (
                <span key={l.href}>
                  {i > 0 ? " · " : null}
                  <VatanLink href={h(l.href)}>{l.label}</VatanLink>
                </span>
              ))}
            </p>
          ) : (
            <p className="vatan-note">
              Daha fazla bilgi:{" "}
              <VatanLink href={h("/tgu-nedir")}>TGU Nedir?</VatanLink>
              {" · "}
              <VatanLink href={h("/trafik-guvenligi-uzmani")}>Trafik Güvenliği Uzmanı</VatanLink>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
