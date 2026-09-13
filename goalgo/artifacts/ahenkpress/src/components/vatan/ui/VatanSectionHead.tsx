import type { ReactNode } from "react";

export function VatanSectionHead({
  numeral,
  eyebrow,
  title,
  accent,
  lead,
  align = "split",
  id,
}: {
  numeral: string;
  eyebrow: string;
  title: string;
  /** Italic gold accent appended to the title (at most one per heading). */
  accent?: string;
  lead?: ReactNode;
  align?: "split" | "stack";
  id?: string;
}) {
  return (
    <header className={`vatan-sechead vatan-sechead--${align}`}>
      <div className="vatan-sechead__main">
        <p className="vatan-eyebrow vatan-eyebrow--numbered">
          <span className="vatan-eyebrow__numeral">{numeral}</span>
          <span aria-hidden="true">—</span>
          <span>{eyebrow}</span>
        </p>
        <h2 className="vatan-h2" id={id}>
          {title}
          {accent ? (
            <>
              {" "}
              <em>{accent}</em>
            </>
          ) : null}
        </h2>
      </div>
      {lead ? <p className="vatan-lead vatan-sechead__lead">{lead}</p> : null}
    </header>
  );
}
