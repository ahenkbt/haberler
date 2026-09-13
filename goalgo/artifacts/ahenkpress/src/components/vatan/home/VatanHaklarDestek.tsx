import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { VATAN_RIGHTS_NOTE_LINKS, VATAN_RIGHTS_ROWS } from "@/lib/hmVatanHomeContent";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import { VatanHairlineList } from "@/components/vatan/ui/VatanHairlineList";
import { VatanLink } from "@/components/vatan/ui/VatanLink";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

export function VatanHaklarDestek() {
  const h = useHmPublicHref();
  return (
    <section className="vatan-section vatan-section--ivory vatan-split" aria-labelledby="vatan-s5-title">
      <div className="vatan-wrap vatan-split__grid">
        <figure className="vatan-split__media vatan-split__media--sticky vatan-reveal">
          <img src={VATAN_ASSETS.haklar} alt="Açık kitap üzerinde altın terazi" loading="lazy" decoding="async" width={1280} height={720} />
        </figure>
        <div className="vatan-split__body">
          <VatanSectionHead
            numeral="03"
            eyebrow="Haklar ve Destek"
            title="Haklarınız var."
            accent="Yanınızdayız."
            align="stack"
            id="vatan-s5-title"
            lead="Aylık, eğitim, sağlık… hepsi sizin hakkınız. Gelin, dinleyelim; yolunu birlikte bulalım."
          />
          <VatanHairlineList
            ariaLabel="Haklar ve destek sayfaları"
            rows={VATAN_RIGHTS_ROWS.map((r) => ({ key: r.href, href: h(r.href), title: r.title, text: r.text }))}
          />
          <p className="vatan-note">
            Uluslararası çerçeve ve kuruluşlar:{" "}
            {VATAN_RIGHTS_NOTE_LINKS.map((l, i) => (
              <span key={l.href}>
                {i > 0 ? " · " : null}
                <VatanLink href={h(l.href)}>{l.label}</VatanLink>
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
