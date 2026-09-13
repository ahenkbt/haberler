import { useCallback, useMemo, useState } from "react";
import { Link } from "wouter";
import { HmNewsImage, newsItemHasCoverImage } from "@/components/HmNewsImage";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

export const HM_TEPE_MANSET_ITEM_COUNT = 5;

function newsDisplayTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

function slideKey(item: { id?: unknown; slug?: unknown }, index: number): string {
  return String(item.id ?? item.slug ?? index);
}

export function HmTepeManset({
  items,
  getItemHref,
  accent = "#dc2626",
}: {
  items: any[];
  getItemHref: (item: any) => string;
  accent?: string;
}) {
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  const photoSlides = useMemo(
    () =>
      items
        .filter((item) => newsItemHasCoverImage(item))
        .filter((item, index) => !failedKeys.has(slideKey(item, index)))
        .slice(0, HM_TEPE_MANSET_ITEM_COUNT),
    [items, failedKeys],
  );
  const coverless = photoSlides.length === 0;
  const slides = coverless ? items.filter(Boolean).slice(0, HM_TEPE_MANSET_ITEM_COUNT) : photoSlides;
  const safeIndex = slides.length > 0 ? Math.min(activeIndex, slides.length - 1) : 0;
  const active = slides[safeIndex];
  const selectIndex = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  if (!active) return null;

  return (
    <section
      className={`hm-tepe-manset mb-4${coverless ? " hm-tepe-manset--coverless" : ""}`}
      data-hm-home-module="tepeManset"
      aria-label="Tepe manşet"
    >
      <nav className="hm-tepe-manset__nums" aria-label="Manşet sırası">
        {slides.map((item, index) => {
          const isActive = index === safeIndex;
          return (
            <button
              key={item.id ?? item.slug ?? index}
              type="button"
              className={`hm-tepe-manset__num${isActive ? " is-active" : ""}`}
              style={isActive ? { background: accent } : undefined}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${index + 1}. manşet: ${newsDisplayTitle(item.title)}`}
              onClick={() => selectIndex(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </nav>

      <div className="hm-tepe-manset__panel">
        <Link
          href={getItemHref(active)}
          className="hm-tepe-manset__headline"
          aria-label={newsDisplayTitle(active.title)}
        >
          <h2 className="hm-tepe-manset__title">{newsDisplayTitle(active.title)}</h2>
        </Link>

        {coverless ? null : (
          <div className="hm-tepe-manset__media">
            <HmNewsImage
              item={active}
              alt={newsDisplayTitle(active.title)}
              className="hm-tepe-manset__img"
              loading="eager"
              priority
              wrapperClassName="hm-tepe-manset__img-wrap"
              onUnavailable="hide"
              onUnavailableChange={(unavailable) => {
                if (!unavailable) return;
                const key = slideKey(active, safeIndex);
                setFailedKeys((prev) => {
                  if (prev.has(key)) return prev;
                  const next = new Set(prev);
                  next.add(key);
                  return next;
                });
              }}
            />
            <div className="hm-tepe-manset__media-fade" aria-hidden />
          </div>
        )}
      </div>
    </section>
  );
}
