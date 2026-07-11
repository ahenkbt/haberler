import { Link } from "wouter";
import { TRV } from "../travllaPaths";

type Props = {
  title: string;
  crumbs?: { label: string; href?: string }[];
};

export function TravllaInnerBanner({ title, crumbs = [] }: Props) {
  const trail = crumbs.length
    ? crumbs
    : [
        { label: "Ana Sayfa", href: TRV.home },
        { label: title },
      ];

  return (
    <section className="trv-inner-banner section-full">
      <div className="container">
        <h1>{title}</h1>
        <ul className="trv-breadcrumb">
          {trail.map((c, i) => (
            <li key={`${c.label}-${i}`}>
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
