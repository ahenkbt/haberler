import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { Link } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import type { HmNestedMetaCached } from "@/lib/hmNestedMetaStorage";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { buildVatanNavModel, VATAN_OVERFLOW_GROUP_LABEL, type VatanNavGroup } from "@/lib/hmVatanNav";
import { VATAN_HEADER_TAGLINE, VATAN_WORDMARK } from "@/lib/hmVatanHomeContent";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";
import { HmVatanMobileMenu } from "@/components/vatan/HmVatanMobileMenu";
import { HmVatanSearchOverlay } from "@/components/vatan/HmVatanSearchOverlay";

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="vatan-nav__chev" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false">
      <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VatanBrand({
  logoUrl,
  displayName,
  homeHref,
  compact = false,
}: {
  logoUrl: string | undefined;
  displayName: string;
  homeHref: string;
  compact?: boolean;
}) {
  const logo = logoUrl ? resolveClientMediaSrc(logoUrl) || logoUrl : "";
  return (
    <Link href={homeHref} className={`vatan-brand${compact ? " vatan-brand--compact" : ""}`} aria-label={`${displayName} — anasayfa`}>
      {logo ? (
        <img className="vatan-brand__logo" src={logo} alt="" width={160} height={48} decoding="async" />
      ) : (
        <span className="vatan-brand__mark" aria-hidden="true">
          <span className="vatan-brand__mark-text">{VATAN_WORDMARK}</span>
          <span className="vatan-brand__mark-rule" />
        </span>
      )}
      <span className="vatan-brand__lockup">
        <span className="vatan-brand__name">{displayName}</span>
        <span className="vatan-brand__tag">{VATAN_HEADER_TAGLINE}</span>
      </span>
    </Link>
  );
}

const OVERFLOW_KEY = "__vatan-overflow__";

export function HmVatanHeader({
  site,
  layoutPrefs,
  isHomeRoot,
  pathOnly,
  scrolled,
  showVideoTvLink,
  bandRef,
  topOffsetPx = 0,
}: {
  site: HmNestedMetaCached;
  layoutPrefs: NewsSiteLayoutPrefs;
  isHomeRoot: boolean;
  pathOnly: string;
  scrolled: boolean;
  showVideoTvLink: boolean;
  bandRef?: RefObject<HTMLDivElement | null>;
  topOffsetPx?: number;
}) {
  const h = useHmPublicHref();
  const nav = useMemo(() => buildVatanNavModel(layoutPrefs, h, { showVideoTvLink }), [layoutPrefs, h, showVideoTvLink]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeTimer = useRef<number | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const searchBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  const solid = scrolled || !isHomeRoot || openKey != null;

  const overflowGroup: VatanNavGroup | null = useMemo(() => {
    if (nav.overflowGroups.length === 0) return null;
    return {
      key: OVERFLOW_KEY,
      label: VATAN_OVERFLOW_GROUP_LABEL,
      children: nav.overflowGroups.flatMap((g) => g.children.map((c) => ({ ...c, key: `${g.key}:${c.key}` }))),
      image: VATAN_ASSETS.memorialPillars,
      imageCaption: "",
    };
  }, [nav.overflowGroups]);

  const rowGroups = useMemo(
    () => (overflowGroup ? [...nav.primaryGroups, overflowGroup] : nav.primaryGroups),
    [nav.primaryGroups, overflowGroup],
  );
  const activeGroup = rowGroups.find((g) => g.key === openKey) ?? null;

  const cancelClose = useCallback(() => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenKey(null), 140);
  }, [cancelClose]);

  const close = useCallback(
    (returnFocus = false) => {
      cancelClose();
      setOpenKey((prev) => {
        if (returnFocus && prev) buttonRefs.current.get(prev)?.focus();
        return null;
      });
    },
    [cancelClose],
  );

  // Close on route change.
  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
  }, [pathOnly]);

  // Outside click + Escape.
  useEffect(() => {
    if (openKey == null) return undefined;
    const onDown = (ev: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && ev.target instanceof Node && !root.contains(ev.target)) setOpenKey(null);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey, close]);

  const onRootKeyDown = (ev: ReactKeyboardEvent<HTMLButtonElement>, key: string, index: number) => {
    if (ev.key === "ArrowDown" || ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      setOpenKey(key);
      window.requestAnimationFrame(() => {
        rootRef.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(panelId)} a`)?.focus();
      });
      return;
    }
    if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      ev.preventDefault();
      const next = (index + (ev.key === "ArrowRight" ? 1 : -1) + rowGroups.length) % rowGroups.length;
      const nextKey = rowGroups[next]?.key;
      if (nextKey) {
        buttonRefs.current.get(nextKey)?.focus();
        if (openKey != null) setOpenKey(nextKey);
      }
    }
  };

  const onHeaderBlur = (ev: ReactFocusEvent<HTMLElement>) => {
    const next = ev.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    if (next == null) return;
    setOpenKey(null);
  };

  const homeHref = h("/");
  const style = topOffsetPx > 0 ? { top: topOffsetPx } : undefined;

  return (
    <>
      <header
        ref={(el) => {
          rootRef.current = el;
          if (bandRef) (bandRef as { current: HTMLElement | null }).current = el;
        }}
        className={`vatan-header${solid ? " vatan-header--solid" : " vatan-header--clear"}${openKey ? " vatan-header--mega-open" : ""}`}
        role="banner"
        data-vatan-header-state={solid ? "solid" : "transparent"}
        style={style}
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
        onBlur={onHeaderBlur}
      >
        <div className="vatan-wrap vatan-header__inner">
          <VatanBrand logoUrl={layoutPrefs.logoUrl?.trim() || undefined} displayName={site.displayName} homeHref={homeHref} />

          <nav className="vatan-header__nav" aria-label="Ana menü">
            <ul className="vatan-nav" role="list">
              {rowGroups.map((group, i) => {
                const isOpen = openKey === group.key;
                return (
                  <li key={group.key} className="vatan-nav__item">
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) buttonRefs.current.set(group.key, el);
                        else buttonRefs.current.delete(group.key);
                      }}
                      className={`vatan-nav__root${isOpen ? " is-open" : ""}`}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-haspopup="true"
                      onMouseEnter={() => {
                        cancelClose();
                        setOpenKey(group.key);
                      }}
                      onFocus={() => {
                        cancelClose();
                        setOpenKey(group.key);
                      }}
                      onClick={() => setOpenKey((prev) => (prev === group.key ? null : group.key))}
                      onKeyDown={(ev) => onRootKeyDown(ev, group.key, i)}
                    >
                      <span>{group.label}</span>
                      <Chevron />
                    </button>
                  </li>
                );
              })}
              {rowGroups.length === 0
                ? nav.utilityLinks.map((link) => (
                    <li key={link.key} className="vatan-nav__item">
                      <VatanLink href={link.href} className="vatan-nav__root vatan-nav__root--link">
                        <span>{link.label}</span>
                      </VatanLink>
                    </li>
                  ))
                : null}
            </ul>
          </nav>

          <div className="vatan-header__actions">
            <button
              ref={searchBtnRef}
              type="button"
              className="vatan-iconbtn"
              aria-label="Site içinde ara"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={() => {
                setOpenKey(null);
                setSearchOpen(true);
              }}
            >
              <SearchIcon />
            </button>
            <VatanButton href={h("/canakkale-sehitleri")} variant="outline" className="vatan-header__cta vatan-header__cta--sorgu">
              Şehit Sorgula
            </VatanButton>
            <VatanButton href={h("/bagis")} variant="primary" className="vatan-header__cta vatan-header__cta--destek">
              Destek Ol
            </VatanButton>
            <button
              ref={hamburgerRef}
              type="button"
              className="vatan-iconbtn vatan-header__burger"
              aria-label="Menüyü aç"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              onClick={() => {
                setOpenKey(null);
                setMobileOpen(true);
              }}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        <div
          id={panelId}
          className={`vatan-mega${activeGroup ? " is-open" : ""}`}
          role="region"
          aria-label={activeGroup ? `${activeGroup.label} menüsü` : undefined}
          aria-hidden={!activeGroup}
          onMouseEnter={cancelClose}
        >
          {activeGroup ? (
            <div className="vatan-wrap vatan-mega__inner">
              <div className="vatan-mega__cols">
                <p className="vatan-eyebrow vatan-mega__title">{activeGroup.label}</p>
                <ul className="vatan-mega__list" role="list">
                  {activeGroup.children.map((child) => (
                    <li key={child.key}>
                      <VatanLink href={child.href} className="vatan-mega__link" onClick={() => setOpenKey(null)}>
                        {child.label}
                      </VatanLink>
                    </li>
                  ))}
                </ul>
              </div>
              {activeGroup.key !== OVERFLOW_KEY ? (
                <figure className="vatan-mega__figure">
                  <img src={activeGroup.image} alt="" loading="lazy" decoding="async" width={640} height={360} />
                  {activeGroup.imageCaption ? <figcaption>{activeGroup.imageCaption}</figcaption> : null}
                </figure>
              ) : null}
              <div className="vatan-mega__rail">
                {nav.utilityLinks.map((link) => (
                  <VatanLink key={link.key} href={link.href} className="vatan-mega__util" onClick={() => setOpenKey(null)}>
                    {link.label}
                  </VatanLink>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <HmVatanMobileMenu
        open={mobileOpen}
        onClose={() => {
          setMobileOpen(false);
          hamburgerRef.current?.focus();
        }}
        groups={[...nav.primaryGroups, ...nav.overflowGroups]}
        utilityLinks={nav.utilityLinks}
        site={site}
        homeHref={homeHref}
      />
      <HmVatanSearchOverlay
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          searchBtnRef.current?.focus();
        }}
      />
    </>
  );
}
