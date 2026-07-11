import { useMemo, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Globe2 } from "lucide-react";
import { HmNewsImage } from "@/components/HmNewsImage";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { useWorldBriefs } from "@/hooks/useWorldBriefs";
import {
  activeWorldBriefContinents,
  flattenWorldBriefItems,
  formatWorldBriefTime,
  resolveWorldBriefHref,
} from "@/lib/worldBriefsDisplay";
import { WorldBriefLink } from "@/components/WorldBriefLink";
import "@/styles/dunyadanKisaKisa.css";

export type DunyadanKisaKisaBandProps = {
  accent?: string;
  className?: string;
  perFeed?: number;
  maxItems?: number;
  enabled?: boolean;
};

/** Anasayfa yatay şerit — küresel haber önizlemesi + `/kisa-kisa` bağlantısı. */
export function DunyadanKisaKisaBand({
  accent = "#0284c7",
  className = "",
  perFeed = 2,
  maxItems = 10,
  enabled = true,
}: DunyadanKisaKisaBandProps) {
  const h = useHmPublicHref();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [fetchEnabled, setFetchEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setFetchEnabled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setFetchEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  const { data, isLoading, isError } = useWorldBriefs(perFeed, enabled && fetchEnabled);
  const continents = useMemo(() => activeWorldBriefContinents(data?.continents ?? []), [data?.continents]);
  const items = useMemo(() => flattenWorldBriefItems(continents, { limit: maxItems }), [continents, maxItems]);
  const pageHref = h("/kisa-kisa");

  if (!enabled) return null;
  if (fetchEnabled && !isLoading && (isError || items.length === 0)) return null;

  return (
    <section
      ref={sectionRef}
      className={`dunyadan-kisa-kisa-band hm-vitrin-card ${className}`.trim()}
      aria-label="Dünyadan Kısa Kısa"
      data-hm-home-module="worldBriefs"
    >
      <div className="dunyadan-kisa-kisa-band__head">
        <div className="min-w-0">
          <p className="dunyadan-kisa-kisa-band__eyebrow" style={{ color: accent }}>
            <Globe2 className="inline h-3.5 w-3.5" aria-hidden />
            Dünya
          </p>
          <h2 className="dunyadan-kisa-kisa-band__title">Dünyadan Kısa Kısa</h2>
        </div>
        <Link href={pageHref} className="dunyadan-kisa-kisa-band__more" style={{ color: accent }}>
          Tümünü gör <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {(!fetchEnabled || isLoading) ? (
        <div className="dunyadan-kisa-kisa-band__strip">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="dunyadan-kisa-kisa-band__card dunyadan-kisa-kisa-band__card--skeleton" />
          ))}
        </div>
      ) : (
        <div className="dunyadan-kisa-kisa-band__strip" role="list">
          {items.map((item) => (
            <WorldBriefLink
              key={item.id}
              href={resolveWorldBriefHref(h, item)}
              className="dunyadan-kisa-kisa-band__card"
              role="listitem"
            >
              <div className="dunyadan-kisa-kisa-band__media">
                <HmNewsImage src={item.imageUrl} alt={item.title} className="dunyadan-kisa-kisa-band__img" loading="lazy" />
                {item.countryCode || item.countryName ? (
                  <span className="dunyadan-kisa-kisa-band__flag" aria-hidden>
                    {countryCodeToFlagEmoji(item.countryCode)}
                  </span>
                ) : null}
              </div>
              <div className="dunyadan-kisa-kisa-band__body">
                <p className="dunyadan-kisa-kisa-band__meta">
                  {item.countryName ? <span>{item.countryName}</span> : null}
                  {item.countryName && item.sourceName ? <span> · </span> : null}
                  {item.sourceName ? <span>{item.sourceName}</span> : null}
                </p>
                <h3 className="dunyadan-kisa-kisa-band__headline">{item.title}</h3>
                {item.publishedAt ? (
                  <p className="dunyadan-kisa-kisa-band__time">{formatWorldBriefTime(item.publishedAt)}</p>
                ) : null}
              </div>
            </WorldBriefLink>
          ))}
        </div>
      )}
    </section>
  );
}
