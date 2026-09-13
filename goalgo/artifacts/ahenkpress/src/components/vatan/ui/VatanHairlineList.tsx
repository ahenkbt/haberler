import { VatanArrow } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

export type VatanHairlineRow = {
  key: string;
  href: string;
  title: string;
  text?: string;
};

export function VatanHairlineList({
  rows,
  tone = "light",
  ariaLabel,
  className,
}: {
  rows: VatanHairlineRow[];
  tone?: "light" | "dark";
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <ul className={`vatan-rows vatan-rows--${tone}${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {rows.map((row, i) => (
        <li key={row.key} className="vatan-rows__item vatan-reveal" data-reveal-i={i}>
          <VatanLink href={row.href} className="vatan-rows__link">
            <span className="vatan-rows__body">
              <span className="vatan-rows__title">{row.title}</span>
              {row.text ? <span className="vatan-rows__text">{row.text}</span> : null}
            </span>
            <VatanArrow className="vatan-rows__arrow" />
          </VatanLink>
        </li>
      ))}
    </ul>
  );
}
