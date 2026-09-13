import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { useVatanOverlay } from "@/components/vatan/HmVatanMobileMenu";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

function withQuery(base: string, q: string): string {
  const query = q.trim();
  if (!query) return base;
  return `${base}${base.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`;
}

export function HmVatanSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const h = useHmPublicHref();
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  useVatanOverlay(open, ref, onClose);

  if (typeof document === "undefined") return null;

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const query = q.trim();
    if (!query) return;
    onClose();
    navigate(withQuery(h("/ara"), query));
  };

  return createPortal(
    <div
      ref={ref}
      className={`vatan-searchlayer${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Site içinde ara"
      aria-hidden={!open}
      data-vatan-shell=""
    >
      <div className="vatan-searchlayer__bar">
        <button type="button" className="vatan-iconbtn" aria-label="Aramayı kapat" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <form className="vatan-wrap vatan-searchlayer__form" role="search" onSubmit={onSubmit}>
        <label className="vatan-eyebrow" htmlFor="vatan-site-search">
          Site içinde ara
        </label>
        <div className="vatan-searchlayer__field">
          <input
            id="vatan-site-search"
            className="vatan-searchlayer__input"
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Konu, sayfa veya isim…"
            autoComplete="off"
            data-vatan-autofocus
          />
          <button type="submit" className="vatan-btn vatan-btn--primary">
            <span>Ara</span>
          </button>
        </div>
        <div className="vatan-searchlayer__quick">
          <VatanLink href={withQuery(h("/canakkale-sehitleri"), q)} className="vatan-searchlayer__quicklink" onClick={onClose}>
            Şehit sorgula
          </VatanLink>
          <VatanLink href={withQuery(h("/ara"), q)} className="vatan-searchlayer__quicklink" onClick={onClose}>
            Haberlerde ara
          </VatanLink>
        </div>
      </form>
    </div>,
    document.body,
  );
}
