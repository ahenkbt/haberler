import { useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { filterHmYekpareFeatureCards, yekparePortalHref } from "@/lib/hmYekpareFeaturesNav";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import "@/styles/hmYekpareFeaturesCards.css";

type HmYekpareFeaturesCardsProps = {
  className?: string;
};

export function HmYekpareFeaturesCards({ className = "" }: HmYekpareFeaturesCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const hmCtx = useHmPublicLinkContextOptional();
  const portalHubOnly = isYekparePortalHubOnly(
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
    hmCtx?.slug ?? null,
  );
  const featureCards = filterHmYekpareFeatureCards(portalHubOnly);
  const openCard = featureCards.find((card) => card.id === openId) ?? null;

  if (featureCards.length === 0) return null;

  return (
    <section className={`hm-yekpare-features ${className}`.trim()} aria-label="Yekpare servisleri">
      <div className="hm-yekpare-features__grid">
        {featureCards.map((card) => {
          const isOpen = openId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              className={`hm-yekpare-features__card${isOpen ? " hm-yekpare-features__card--open" : ""}`}
              style={{ ["--hm-yekpare-card-color" as string]: card.color } as CSSProperties}
              aria-expanded={isOpen}
              onClick={() => setOpenId((prev) => (prev === card.id ? null : card.id))}
            >
              <span className="hm-yekpare-features__icon" aria-hidden>
                {card.emoji}
              </span>
              <strong>{card.label}</strong>
              <small>{card.desc}</small>
              <span className="hm-yekpare-features__arrow" aria-hidden>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>
      {openCard && openCard.children.length > 0 ? (
        <div className="hm-yekpare-features__subs" role="navigation" aria-label={`${openCard.label} alt kategorileri`}>
          {openCard.children.map((child) => (
            <a
              key={`${openCard.id}-${child.href}-${child.label}`}
              href={yekparePortalHref(child.href)}
              className="hm-yekpare-features__sub"
            >
              {child.label}
            </a>
          ))}
          <a href={yekparePortalHref(openCard.href)} className="hm-yekpare-features__sub">
            Tümünü gör
          </a>
        </div>
      ) : null}
    </section>
  );
}
