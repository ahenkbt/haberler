import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { VATAN_HISTORY_LINKS, VATAN_WAR_PANELS } from "@/lib/hmVatanHomeContent";
import { VatanArrow } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

export function VatanTarihPanels() {
  const h = useHmPublicHref();
  return (
    <section className="vatan-section vatan-section--ivory vatan-history" aria-labelledby="vatan-s8-title">
      <div className="vatan-wrap">
        <VatanSectionHead numeral="06" eyebrow="Tarih" title="Tarihimizden sayfalar." id="vatan-s8-title" lead="Çanakkale’den Kıbrıs’a, milletimizin yazdığı destanlar." />
        <ul className="vatan-panels" role="list">
          {VATAN_WAR_PANELS.map((p, i) => (
            <li key={p.slug} className="vatan-reveal" data-reveal-i={i}>
              <VatanLink href={h(p.href)} className={`vatan-panel${p.image ? " vatan-panel--photo" : " vatan-panel--gradient"}`}>
                {p.image ? <img src={p.image} alt={p.imageAlt ?? ""} loading="lazy" decoding="async" width={1280} height={720} /> : null}
                <span className="vatan-panel__frame" aria-hidden="true" />
                <span className="vatan-panel__numeral" aria-hidden="true">
                  {p.numeral}
                </span>
                <span className="vatan-panel__body">
                  <span className="vatan-panel__year">{p.numeral}</span>
                  <span className="vatan-panel__title">{p.title}</span>
                </span>
              </VatanLink>
            </li>
          ))}
        </ul>
        <p className="vatan-linkrow vatan-reveal" data-reveal-i={4}>
          {VATAN_HISTORY_LINKS.map((l, i) => (
            <span key={l.href}>
              {i > 0 ? <span className="vatan-linkrow__sep" aria-hidden="true">·</span> : null}
              <VatanLink href={h(l.href)} className="vatan-textlink">
                {l.label}
                <VatanArrow />
              </VatanLink>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
