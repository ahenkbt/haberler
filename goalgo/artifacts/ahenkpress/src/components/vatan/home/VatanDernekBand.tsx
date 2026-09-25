import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import type { ResolvedVatanDernek } from "@/lib/hmVatanHomeCopy";
import type { VatanMissionPillar } from "@/lib/hmVatanHomeContent";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

function PillarIcon({ id }: { id: VatanMissionPillar["id"] }) {
  const common = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", "aria-hidden": true, focusable: "false" } as const;
  switch (id) {
    case "hatira":
      return (
        <svg {...common}>
          <path d="M17.5 4.5a10 10 0 1 0 6 16.5A8 8 0 1 1 17.5 4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="m21.5 6.5.9 2 2.1.3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2-1.5-1.5 2.1-.3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      );
    case "hak":
    case "denetim":
      return (
        <svg {...common}>
          <path d="M14 4v20M6 24h16M5 10h18M8 10l-4 8h8l-4-8ZM20 10l-4 8h8l-4-8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      );
    case "egitim":
      return (
        <svg {...common}>
          <path d="M4 12 14 6l10 6-10 6L4 12Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M7 14v5c0 1.5 3 3 7 3s7-1.5 7-3v-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "isbirligi":
      return (
        <svg {...common}>
          <path d="M9 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 12Zm10 0a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 19 12Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3.5 22c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5M13.5 22c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 15c3-3 6-3 9 0l2 2c2 2 5 2 7 0M4 20c3-3 6-3 9 0l2 2c2 2 5 2 7 0M9 9c1.5-2 4-2 5.5 0S18 11.5 19 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function VatanDernekBand({
  numeral = "02",
  content,
}: {
  numeral?: string;
  content: ResolvedVatanDernek;
}) {
  const h = useHmPublicHref();

  return (
    <section className="vatan-section vatan-section--navy vatan-dernek" aria-labelledby="vatan-s4-title">
      <img className="vatan-dernek__bg" src={content.imageUrl} alt="" loading="lazy" decoding="async" aria-hidden="true" />
      <div className="vatan-wrap vatan-dernek__inner">
        <VatanSectionHead
          numeral={numeral}
          eyebrow={content.eyebrow}
          title={content.title}
          accent={content.accent}
          lead={content.lead}
          align="stack"
          id="vatan-s4-title"
        />
        <ul className="vatan-pillars" role="list">
          {content.pillars.map((p, i) => (
            <li key={p.id} className="vatan-pillar vatan-reveal" data-reveal-i={i}>
              <span className="vatan-pillar__icon">
                <PillarIcon id={p.id} />
              </span>
              <h3 className="vatan-h3">{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
        <div className="vatan-actions vatan-reveal" data-reveal-i={3}>
          <VatanButton href={h(content.ctaHref)} variant="outline" arrow>
            {content.ctaLabel}
          </VatanButton>
          <VatanLink href={h("/baskan")} className="vatan-textlink">
            Genel Başkan
          </VatanLink>
          <VatanLink href={h("/faaliyetler")} className="vatan-textlink">
            Faaliyetler
          </VatanLink>
        </div>
      </div>
    </section>
  );
}
