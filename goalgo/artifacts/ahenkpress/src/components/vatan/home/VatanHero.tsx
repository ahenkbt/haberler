import { useEffect, useRef, useState } from "react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { prefersReducedMotion } from "@/hooks/useVatanScrolled";
import { VATAN_HOME_HERO_V2 } from "@/lib/hmVatanHomeContent";
import { VatanButton } from "@/components/vatan/ui/VatanButton";

export function VatanHero() {
  const h = useHmPublicHref();
  const slides = VATAN_HOME_HERO_V2.slides;
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
    }, VATAN_HOME_HERO_V2.slideIntervalMs);
    return () => {
      if (timer.current != null) window.clearInterval(timer.current);
    };
  }, [autoplay, slides.length, active]);

  const reduced = !autoplay;

  return (
    <section
      className={`vatan-hero${mounted ? " is-mounted" : ""}${reduced ? " vatan-hero--static" : ""}`}
      aria-label="Vatan Kahramanları Derneği"
      style={{ ["--vatan-slide-ms" as string]: `${VATAN_HOME_HERO_V2.slideIntervalMs}ms` }}
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
            {VATAN_HOME_HERO_V2.eyebrow}
          </p>
          <h1 className="vatan-hero__title" style={{ ["--i" as string]: 1 }}>
            {VATAN_HOME_HERO_V2.title} <em>{VATAN_HOME_HERO_V2.accent}</em>
          </h1>
          <p className="vatan-lead vatan-hero__lead" style={{ ["--i" as string]: 2 }}>
            {VATAN_HOME_HERO_V2.lead}
          </p>
          <div className="vatan-hero__actions" style={{ ["--i" as string]: 3 }}>
            <VatanButton href={h(VATAN_HOME_HERO_V2.primaryHref)} variant="primary" arrow>
              {VATAN_HOME_HERO_V2.primaryLabel}
            </VatanButton>
            <VatanButton href={h(VATAN_HOME_HERO_V2.secondaryHref)} variant="outline">
              {VATAN_HOME_HERO_V2.secondaryLabel}
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
            <span>{VATAN_HOME_HERO_V2.scrollCueLabel}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
              <path d="m3 5 4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
