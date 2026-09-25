import { useEffect, useRef, useState } from "react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { prefersReducedMotion } from "@/hooks/useVatanScrolled";
import type { VatanResolvedHero } from "@/lib/hmVatanEditorHome";
import { VatanButton } from "@/components/vatan/ui/VatanButton";

export function VatanHero({ hero }: { hero: VatanResolvedHero }) {
  const h = useHmPublicHref();
  const slides = hero.slides;
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(() => !prefersReducedMotion());
  const [mounted, setMounted] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!autoplay || slides.length < 2) return undefined;
    timer.current = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, hero.slideIntervalMs);
    return () => {
      if (timer.current != null) window.clearInterval(timer.current);
    };
  }, [autoplay, slides.length, active, hero.slideIntervalMs]);

  const reduced = !autoplay;

  return (
    <section
      className={`vatan-hero vatan-hero--home${mounted ? " is-mounted" : ""}${reduced ? " vatan-hero--static" : ""}`}
      aria-label={hero.eyebrow || "Anasayfa"}
      style={{ ["--vatan-slide-ms" as string]: `${hero.slideIntervalMs}ms` }}
    >
      <div className="vatan-hero__media" aria-hidden="true">
        {slides.map((slide, i) => (
          <img
            key={slide.id}
            className={`vatan-hero__img${i === active ? " is-active" : ""}`}
            src={slide.image}
            alt=""
            width={1280}
            height={720}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
            draggable={false}
          />
        ))}
        <span className="vatan-hero__scrim" />
        <span className="vatan-hero__scrim-left" />
      </div>

      <div className="vatan-wrap vatan-hero__inner">
        <div className="vatan-hero__copy">
          <p className="vatan-eyebrow vatan-hero__eyebrow" style={{ ["--i" as string]: 0 }}>
            {hero.eyebrow}
          </p>
          <h1 className="vatan-hero__title" style={{ ["--i" as string]: 1 }}>
            {hero.title} <em>{hero.accent}</em>
          </h1>
          <p className="vatan-lead vatan-hero__lead" style={{ ["--i" as string]: 2 }}>
            {hero.lead}
          </p>
          <div className="vatan-hero__actions" style={{ ["--i" as string]: 3 }}>
            <VatanButton href={h(hero.primaryHref)} variant="primary" arrow>
              {hero.primaryLabel}
            </VatanButton>
            <VatanButton href={h(hero.secondaryHref)} variant="outline">
              {hero.secondaryLabel}
            </VatanButton>
          </div>
        </div>

        <div className="vatan-hero__rail">
          <div className="vatan-hero__dots" role="group" aria-label="Arka plan fotoğrafı">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={`vatan-hero__dot${i === active ? " is-active" : ""}`}
                aria-label={`${i + 1}. fotoğraf: ${slide.alt}`}
                aria-pressed={i === active}
                onClick={() => {
                  setActive(i);
                  setAutoplay(false);
                }}
              >
                <span className="vatan-hero__dot-fill" />
              </button>
            ))}
          </div>
          <a className="vatan-hero__cue" href="#hafiza-mekanlari">
            <span>{hero.scrollCueLabel}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
              <path d="m3 5 4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
