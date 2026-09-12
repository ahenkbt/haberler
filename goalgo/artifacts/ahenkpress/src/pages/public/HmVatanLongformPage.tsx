import { useEffect } from "react";
import { Link } from "wouter";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import { getVatanLongformPage, type VatanLongformPage } from "@/lib/hmVatanTheme";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";

function MiniCard({ title, text, href }: { title: string; text: string; href?: string }) {
  const h = useHmPublicHref();
  if (!href) {
    return (
      <div className="vatan-mini">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    );
  }
  const to = h(href);
  if (isHmPublicNavExternal(to)) {
    return (
      <a href={to} className="vatan-mini">
        <h3>{title}</h3>
        <p>{text}</p>
      </a>
    );
  }
  return (
    <Link href={to} className="vatan-mini">
      <h3>{title}</h3>
      <p>{text}</p>
    </Link>
  );
}

function LongformBody({ page }: { page: VatanLongformPage }) {
  const ctx = useHmPublicLinkContextOptional();
  const shell = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (!ctx) return;
    document.title = `${page.title} · ${ctx.displayName}`;
  }, [ctx, page.title]);

  return (
    <article className="vatan-page">
      <header className="vatan-hero">
        <img
          className="vatan-hero__img"
          src={page.heroImage}
          alt={page.heroAlt}
          fetchPriority="high"
          decoding="async"
          width={1280}
          height={720}
        />
        <div className="vatan-hero__shade" />
        <div className={`vatan-hero__inner ${shell}`}>
          <p className="vatan-hero__kicker">{page.eyebrow}</p>
          <h1 className="vatan-hero__title">
            {page.title}
            <em>{page.accent}</em>
          </h1>
          <p className="vatan-hero__lead">{page.lead}</p>
        </div>
      </header>

      {page.sections.map((section, index) => (
        <section key={`${section.title}-${index}`} className={`vatan-sec${index % 2 ? " vatan-sec--alt" : ""}`}>
          <div className={shell}>
            <p className="vatan-sec__kicker">{section.eyebrow}</p>
            <h2 className="vatan-sec__title">{section.title}</h2>
            {section.body.map((para) => (
              <p key={para.slice(0, 48)}>{para}</p>
            ))}
            {section.cards?.length ? (
              <div className="vatan-mini-grid">
                {section.cards.map((card) => (
                  <MiniCard key={card.title} title={card.title} text={card.text} href={card.href} />
                ))}
              </div>
            ) : null}
            {section.image ? (
              <figure className="vatan-sec__media">
                <img src={section.image} alt={section.imageAlt ?? ""} loading="lazy" decoding="async" width={1280} height={720} />
              </figure>
            ) : null}
          </div>
        </section>
      ))}
    </article>
  );
}

export default function HmVatanLongformPage({ slug }: { slug: string }) {
  const page = getVatanLongformPage(slug);
  if (!page) return null;
  return <LongformBody page={page} />;
}
