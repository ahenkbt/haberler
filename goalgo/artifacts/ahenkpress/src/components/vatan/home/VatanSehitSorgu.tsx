import { useId, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { VATAN_SEARCH_HELPER, VATAN_SEARCH_SOURCES, type VatanSearchSource } from "@/lib/hmVatanHomeContent";

export function VatanSehitSorgu() {
  const h = useHmPublicHref();
  const [, navigate] = useLocation();
  const [source, setSource] = useState<VatanSearchSource>("canakkale");
  const [q, setQ] = useState("");
  const inputId = useId();

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const target = VATAN_SEARCH_SOURCES.find((s) => s.id === source) ?? VATAN_SEARCH_SOURCES[0];
    const base = h(target.href);
    const query = q.trim();
    navigate(query ? `${base}${base.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}` : base);
  };

  return (
    <section className="vatan-plate-host" aria-labelledby={`${inputId}-title`}>
      <div className="vatan-wrap">
        <form className="vatan-plate vatan-reveal is-in" role="search" onSubmit={onSubmit}>
          <div className="vatan-plate__head">
            <p className="vatan-eyebrow vatan-eyebrow--crimson" id={`${inputId}-title`}>
              Şehit Sorgula
            </p>
            <div className="vatan-segment" role="radiogroup" aria-label="Hangi listede arayalım">
              {VATAN_SEARCH_SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={source === s.id}
                  className={`vatan-segment__btn${source === s.id ? " is-on" : ""}`}
                  onClick={() => setSource(s.id)}
                >
                  <span className="vatan-segment__long">{s.label}</span>
                  <span className="vatan-segment__short">{s.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="vatan-plate__field">
            <label htmlFor={inputId} className="vatan-visually-hidden">
              Şehit adı
            </label>
            <input
              id={inputId}
              className="vatan-plate__input"
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ad, soyad veya baba adı…"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="vatan-btn vatan-btn--primary">
              <span>Ara</span>
            </button>
          </div>
          <p className="vatan-plate__helper">{VATAN_SEARCH_HELPER}</p>
        </form>
      </div>
    </section>
  );
}
