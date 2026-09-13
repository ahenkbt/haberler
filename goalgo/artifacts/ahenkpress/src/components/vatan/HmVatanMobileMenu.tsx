import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { HmNestedMetaCached } from "@/lib/hmNestedMetaStorage";
import type { VatanNavGroup, VatanNavLink } from "@/lib/hmVatanNav";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isVkdSiteSlug } from "@/lib/hmVkdFooterNav";
import { VKD_CONTACT_PHONE_DISPLAY, VKD_CONTACT_PHONE_TEL } from "@/lib/vkdPublicContact";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** Locks `html` scroll and traps Tab focus inside `ref` while `open`. */
export function useVatanOverlay(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const node = ref.current;
    window.requestAnimationFrame(() => {
      node?.querySelector<HTMLElement>("[data-vatan-autofocus]")?.focus();
    });
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
        return;
      }
      if (ev.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, [open, ref, onClose]);
}

export function HmVatanMobileMenu({
  open,
  onClose,
  groups,
  utilityLinks,
  newsLinks = [],
  site,
  homeHref,
}: {
  open: boolean;
  onClose: () => void;
  groups: VatanNavGroup[];
  utilityLinks: VatanNavLink[];
  /** Editor-stored news roots; rendered last, after every other link. */
  newsLinks?: VatanNavLink[];
  site: HmNestedMetaCached;
  homeHref: string;
}) {
  const h = useHmPublicHref();
  const ref = useRef<HTMLDivElement | null>(null);
  useVatanOverlay(open, ref, onClose);

  if (typeof document === "undefined") return null;
  const phone = site.contact?.phone?.trim() || (isVkdSiteSlug(site.slug) ? VKD_CONTACT_PHONE_DISPLAY : "");
  const phoneTel = site.contact?.phone?.trim()
    ? `tel:${site.contact.phone.replace(/[^\d+]/g, "")}`
    : isVkdSiteSlug(site.slug)
      ? `tel:${VKD_CONTACT_PHONE_TEL}`
      : "";

  return createPortal(
    <div
      ref={ref}
      className={`vatan-mobile${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Ana menü"
      aria-hidden={!open}
      data-vatan-shell=""
    >
      <div className="vatan-mobile__bar">
        <VatanLink href={homeHref} className="vatan-mobile__brand" onClick={onClose}>
          {site.displayName}
        </VatanLink>
        <button type="button" className="vatan-iconbtn" aria-label="Menüyü kapat" onClick={onClose} data-vatan-autofocus>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <nav className="vatan-mobile__nav" aria-label="Ana menü">
        {groups.map((group, i) => (
          <details key={group.key} className="vatan-mobile__group" open={i === 0}>
            <summary className="vatan-mobile__summary">
              <span>{group.label}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
                <path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <ul role="list">
              {group.children.map((child) => (
                <li key={child.key}>
                  <VatanLink href={child.href} className="vatan-mobile__link" onClick={onClose}>
                    {child.label}
                  </VatanLink>
                </li>
              ))}
            </ul>
          </details>
        ))}
        {utilityLinks.length ? (
          <ul className="vatan-mobile__utils" role="list" aria-label="Diğer bağlantılar">
            {utilityLinks.map((link) => (
              <li key={link.key}>
                <VatanLink href={link.href} className="vatan-mobile__util" onClick={onClose}>
                  {link.label}
                </VatanLink>
              </li>
            ))}
          </ul>
        ) : null}
        {newsLinks.length ? (
          <ul className="vatan-mobile__utils vatan-mobile__utils--tail" role="list" aria-label="Haber bağlantıları">
            {newsLinks.map((link) => (
              <li key={link.key}>
                <VatanLink href={link.href} className="vatan-mobile__util" onClick={onClose}>
                  {link.label}
                </VatanLink>
              </li>
            ))}
          </ul>
        ) : null}
      </nav>
      <div className="vatan-mobile__foot">
        <VatanButton href={h("/canakkale-sehitleri")} variant="outline">
          Şehit Sorgula
        </VatanButton>
        <VatanButton href={h("/bagis")} variant="primary">
          Destek Ol
        </VatanButton>
        {phone ? (
          <a className="vatan-mobile__phone" href={phoneTel}>
            {phone}
          </a>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
