import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import {
  VATAN_ASSOCIATION_FIGURES,
  VATAN_FIGURE_LABELS,
  VATAN_MISSION_PILLARS,
  type VatanMissionPillar,
} from "@/lib/hmVatanHomeContent";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
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
      return (
        <svg {...common}>
          <path d="M14 4v20M6 24h16M5 10h18M8 10l-4 8h8l-4-8ZM20 10l-4 8h8l-4-8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
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

export function VatanDernekBand() {
  const h = useHmPublicHref();
  const f = VATAN_ASSOCIATION_FIGURES;
  const figures = (Object.keys(VATAN_FIGURE_LABELS) as Array<keyof typeof VATAN_FIGURE_LABELS>)
    .map((key) => ({ key, value: f[key], label: VATAN_FIGURE_LABELS[key] }))
    .filter((row) => row.value != null && String(row.value).trim() !== "");

  return (
    <section className="vatan-section vatan-section--navy vatan-dernek" aria-labelledby="vatan-s4-title">
      <img className="vatan-dernek__bg" src={VATAN_ASSETS.memorialPillars} alt="" loading="lazy" decoding="async" aria-hidden="true" />
      <div className="vatan-wrap vatan-dernek__inner">
        <VatanSectionHead numeral="02" eyebrow="Dernek" title="Biz kimiz," accent="ne için buradayız." align="stack" id="vatan-s4-title" />
        <ul className="vatan-pillars" role="list">
          {VATAN_MISSION_PILLARS.map((p, i) => (
            <li key={p.id} className="vatan-pillar vatan-reveal" data-reveal-i={i}>
              <span className="vatan-pillar__icon">
                <PillarIcon id={p.id} />
              </span>
              <h3 className="vatan-h3">{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
        {figures.length ? (
          <dl className={`vatan-figures vatan-figures--${figures.length} vatan-reveal`}>
            {figures.map((row) => (
              <div key={row.key}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="vatan-actions vatan-reveal" data-reveal-i={3}>
          <VatanButton href={h("/hakkimizda")} variant="outline" arrow>
            Derneği tanıyın
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
