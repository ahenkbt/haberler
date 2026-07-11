import { useEffect, useRef, useState, type ReactNode } from "react";

import { Link } from "wouter";

import {

  Heart,

  LayoutGrid,

  Lightbulb,

  ShoppingBag,

  Sun,

  UserRound,

} from "lucide-react";

import { AuthModal } from "@/components/AuthModal";

import { AppsGridPanel } from "@/components/AppsGridPanel";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";
import { SearchEngineCategoryScroll } from "@/components/SearchEngineCategoryScroll";
import { SearchEngineHeaderBrandLogo } from "@/components/SearchEngineHeroBrandLogo";

import { SearchEngineSearchForm } from "@/components/SearchEngineSearchForm";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

import { useCart } from "@/hooks/useCart";

import { useYekpareTheme } from "@/hooks/useYekpareTheme";

import { useIsMobile } from "@/hooks/use-mobile";

import { YEKPARE_SLOGAN } from "@/lib/kesfetDiscoverHub";

import {

  Popover,

  PopoverContent,

  PopoverTrigger,

} from "@/components/ui/popover";

import {

  Sheet,

  SheetContent,

  SheetTitle,

} from "@/components/ui/sheet";

import {

  SearchEngineLocationPill,

  SearchEngineLocationSubNavRow,

} from "@/components/SearchEngineLocationPill";

import "@/styles/searchEngineHeader.css";



export type SearchEngineHeaderMode = "home" | "serp";

export type SearchEngineHeaderVariant = "default" | "home";



export type SearchEngineHeaderProps = {

  variant?: SearchEngineHeaderVariant;

  mode?: SearchEngineHeaderMode;

  searchValue?: string;

  onSearchChange?: (value: string) => void;

  onSearchSubmit?: (query?: string) => void;

  searchPlaceholder?: string;

  showSlogan?: boolean;

  showThemeToggle?: boolean;

  autoFocus?: boolean;

  listId?: string;

  inputTheme?: "home" | "results";

  sticky?: boolean;

  showLocationPill?: boolean;

  locationAlign?: "center" | "start";

  /** Modül alt menüsü — verilmezse HaritalarSubNavBar kullanılır; null ile kapatılır */

  subNav?: ReactNode | null;

  showDefaultSubNav?: boolean;

  /** Alt menü hizası — verilmezse home=orta, serp=sol */
  subNavAlign?: "center" | "start";

  /** Yalnızca üst yardımcı şerit (logo/kategori/arama yok) */
  utilitiesOnly?: boolean;

  /** SERP: tabs vb. — arama kutusunun altında */

  afterSearch?: ReactNode;

  /** SERP: marka logosunun solunda (ör. haber haritası bandı). */

  brandLeading?: ReactNode;

  /** @deprecated Anasayfa hero artık SearchEngineHomePage içinde */

  beforeLocationRow?: ReactNode;

  /** @deprecated Anasayfa hero artık SearchEngineHomePage içinde */

  beforeCategories?: ReactNode;

  /** @deprecated Anasayfa hero artık SearchEngineHomePage içinde */

  belowSearch?: ReactNode;

  className?: string;

};



export function SearchEngineLogo({

  className = "",

  inline = false,

}: {

  className?: string;

  inline?: boolean;

}) {

  return (

    <Link

      href="/"

      className={`seh-logo${inline ? " seh-logo--inline" : ""}${className ? ` ${className}` : ""}`}

      aria-label="Yekpare ana sayfa"

    >

      <span className="seh-logo-mark">Y</span>

      <span className="seh-logo-text">Yekpare</span>

    </Link>

  );

}



function AppsGridMenu({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
}) {
  const close = () => onOpenChange(false);
  const panel = <AppsGridPanel onClose={close} />;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="seh-icon-btn"
          aria-label="Tüm kategoriler menüsü"
          title="Tüm kategoriler"
          aria-expanded={open}
          aria-controls="seh-apps-menu"
          onClick={() => onOpenChange(true)}
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            id="seh-apps-menu"
            side="bottom"
            overlayClassName="seh-apps-overlay"
            className="seh-apps-sheet seh-apps-popup"
            aria-labelledby="seh-apps-menu-title"
          >
            <SheetTitle className="sr-only">Tüm kategoriler</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="seh-icon-btn"
          aria-label="Tüm kategoriler menüsü"
          title="Tüm kategoriler"
          aria-expanded={open}
          aria-controls="seh-apps-menu"
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id="seh-apps-menu"
        className="seh-apps-popover seh-apps-popup w-auto border-0 p-0 shadow-none"
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        aria-labelledby="seh-apps-menu-title"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}



function SearchEngineHeaderAccountActions() {
  const { user } = useCustomerAuth();
  const { count: cartCount } = useCart();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const openAuth = () => {
    closeMenu();
    setAuthOpen(true);
  };

  const cartBadge =
    cartCount > 0 ? (
      <span className="seh-utilities-cart-count" aria-label={`${cartCount} ürün`}>
        {cartCount > 99 ? "99+" : cartCount}
      </span>
    ) : null;

  return (
    <>
      <div className="seh-utilities-inline" aria-label="Hesap ve sepet">
        <Link href="/magaza/sepet" className="seh-cart-pill" aria-label="Sepet">
          <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
          <span className="seh-cart-pill-label">Sepet</span>
          {cartCount > 0 ? (
            <span className="seh-cart-count" aria-label={`${cartCount} ürün`}>
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Link>
        {user ? (
          <Link href="/hesabim" className="seh-circle-btn" aria-label="Hesabım">
            <UserRound className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            className="seh-circle-btn"
            aria-label="Giriş yap"
            onClick={() => setAuthOpen(true)}
          >
            <UserRound className="h-5 w-5" />
          </button>
        )}
        <Link href="/hesabim" className="seh-circle-btn" aria-label="Favoriler">
          <Heart className="h-5 w-5" />
        </Link>
      </div>

      <div className="seh-utilities-desktop">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="seh-circle-btn seh-utilities-trigger"
              aria-label="Sepet, giriş ve favoriler menüsü"
              aria-expanded={menuOpen}
            >
              <UserRound className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="seh-utilities-trigger-badge" aria-hidden>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="seh-utilities-popover"
            align="end"
            side="bottom"
            sideOffset={8}
          >
            <nav className="seh-utilities-menu" aria-label="Hesap ve sepet">
              <Link
                href="/magaza/sepet"
                className="seh-utilities-menu-item seh-utilities-menu-item--cart"
                onClick={closeMenu}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
                <span>Sepet</span>
                {cartBadge}
              </Link>
              {user ? (
                <Link href="/hesabim" className="seh-utilities-menu-item" onClick={closeMenu}>
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                  Hesabım
                </Link>
              ) : (
                <button type="button" className="seh-utilities-menu-item" onClick={openAuth}>
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                  Giriş yap
                </button>
              )}
              <Link href="/hesabim" className="seh-utilities-menu-item" onClick={closeMenu}>
                <Heart className="h-4 w-4 shrink-0" aria-hidden />
                Favoriler
              </Link>
            </nav>
          </PopoverContent>
        </Popover>
      </div>

      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} /> : null}
    </>
  );
}



function resolveSubNav(

  subNav: ReactNode | null | undefined,

  showDefaultSubNav: boolean,

  onAllCategoriesClick?: () => void,

): ReactNode | undefined {

  if (subNav === null) return undefined;

  if (subNav !== undefined) return subNav;

  if (!showDefaultSubNav) return undefined;

  return (

    <SearchEngineCategoryScroll inHeader onAllCategoriesClick={onAllCategoriesClick} />

  );

}



export function SearchEngineHeader({

  variant = "default",

  mode = "home",

  searchValue = "",

  onSearchChange = () => {},

  onSearchSubmit = () => {},

  searchPlaceholder = "Restoran, otel, firma, ürün veya adres ara…",

  showSlogan = false,

  showThemeToggle = true,

  autoFocus = false,

  listId = "search-engine-suggest",

  inputTheme = mode === "serp" ? "results" : "home",

  sticky = true,

  showLocationPill = false,

  locationAlign = mode === "serp" ? "start" : "center",

  subNav,

  showDefaultSubNav = true,

  subNavAlign: subNavAlignProp,

  utilitiesOnly = false,

  afterSearch,

  brandLeading,

  beforeLocationRow,

  beforeCategories,

  belowSearch,

  className = "",

}: SearchEngineHeaderProps) {

  const [appsOpen, setAppsOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  const isMobile = useIsMobile();

  const { theme, source: themeSource, toggleTheme, resetToAuto } = useYekpareTheme();

  const isNight = theme === "night";

  const lastThemeClick = useRef(0);

  const isUtilitiesOnly = utilitiesOnly;



  useEffect(() => {

    if (!sticky) return;

    const onScroll = () => setScrolled(window.scrollY > 4);

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);

  }, [sticky]);



  const handleThemeClick = () => {

    const now = Date.now();

    if (now - lastThemeClick.current < 450) {

      resetToAuto();

    } else {

      toggleTheme();

    }

    lastThemeClick.current = now;

  };



  const stickyClass = [

    sticky ? "seh-sticky" : "",

    scrolled ? "is-scrolled" : "",

  ]

    .filter(Boolean)

    .join(" ");



  const resolvedSubNav = resolveSubNav(
    subNav,
    showDefaultSubNav,
    mode === "home" ? () => setAppsOpen(true) : undefined,
  );

  const subNavAlign = subNavAlignProp ?? "center";
  const isMobileSerp = isMobile && mode === "serp";
  const showInlineUtilities = !isMobileSerp;

  const contentBeforeLocation = beforeLocationRow ?? beforeCategories;



  const searchForm = (

    <SearchEngineSearchForm

      searchValue={searchValue}

      onSearchChange={onSearchChange}

      onSearchSubmit={onSearchSubmit}

      searchPlaceholder={searchPlaceholder}

      autoFocus={autoFocus}

      listId={listId}

      inputTheme={inputTheme}

    />

  );



  const utilitiesBlock = showInlineUtilities ? (
    <div className="seh-topbar-right">
      <SearchEngineHeaderAccountActions />

      <AppsGridMenu open={appsOpen} onOpenChange={setAppsOpen} isMobile={isMobile} />

      {showThemeToggle ? (
        <button
          type="button"
          className="seh-icon-btn"
          data-auto={themeSource === "auto" ? "true" : undefined}
          onClick={handleThemeClick}
          title={
            themeSource === "auto"
              ? "Tema: otomatik (çift tıkla)"
              : "Tema: manuel (çift tık otomatiğe döner)"
          }
          aria-label={isNight ? "Gündüz moduna geç" : "Gece moduna geç"}
        >
          {isNight ? <Lightbulb className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      ) : null}
    </div>
  ) : null;

  const serpNavColumn = (
    <>
      {contentBeforeLocation && !isMobileSerp ? (
        <div className="seh-before-search">{contentBeforeLocation}</div>
      ) : null}

      <div className="seh-search-utilities-row">
        <div className="seh-search-block">{searchForm}</div>
        {isMobileSerp ? <MobileHeaderMenu /> : utilitiesBlock}
      </div>

      {resolvedSubNav ? (
        <SearchEngineLocationSubNavRow
          align={subNavAlign}
          showLocationPill={false}
          subNav={resolvedSubNav}
        />
      ) : null}

      {showLocationPill ? (
        <SearchEngineLocationPill align={locationAlign} />
      ) : null}

      {showSlogan ? <p className="seh-slogan">{YEKPARE_SLOGAN}</p> : null}

      {belowSearch}

      {afterSearch ? <div className="seh-after-search">{afterSearch}</div> : null}
    </>
  );

  const searchChrome = (

    <>

      {contentBeforeLocation ? (
        <div className="seh-before-search">{contentBeforeLocation}</div>
      ) : null}

      {resolvedSubNav ? (

        <SearchEngineLocationSubNavRow

          align={subNavAlign}

          showLocationPill={false}

          subNav={resolvedSubNav}

        />

      ) : null}

      {mode === "serp" ? null : <div className="seh-search-block">{searchForm}</div>}

      {showLocationPill ? (

        <SearchEngineLocationPill align={locationAlign} />

      ) : null}

      {showSlogan ? <p className="seh-slogan">{YEKPARE_SLOGAN}</p> : null}

      {belowSearch}

      {afterSearch ? <div className="seh-after-search">{afterSearch}</div> : null}

    </>

  );

  const brandSearchRow = (
    <div className="seh-brand-search-row">
      {brandLeading ? <div className="seh-brand-search-leading shrink-0">{brandLeading}</div> : null}
      <SearchEngineHeaderBrandLogo className="seh-brand-search-logo" compact />
      <div className="seh-brand-search-column">{serpNavColumn}</div>
    </div>
  );

  const topbar = (

    <div className={`seh-topbar${isUtilitiesOnly ? " seh-topbar--utilities-only" : ""}`}>

      <div className="seh-topbar-left" />



      <div className="seh-topbar-center">

        {mode === "home" && !isUtilitiesOnly ? <SearchEngineLogo /> : null}

      </div>



      {utilitiesBlock}

    </div>

  );



  if (isUtilitiesOnly) {

    return (

      <>

        <header className={`seh-root seh-root--utilities-only ${stickyClass}${className ? ` ${className}` : ""}`}>

          {topbar}

        </header>

      </>

    );

  }



  const rootClass = [

    "seh-root",

    mode === "home" ? "seh-root--home" : "",

    mode === "serp" ? "seh-root--serp" : "",

    isMobileSerp ? "seh-root--mobile-serp" : "",

    stickyClass,

    className,

  ]

    .filter(Boolean)

    .join(" ");



  return (

    <>

      <header className={rootClass}>

        {mode === "serp" ? null : topbar}

        {mode === "serp" ? brandSearchRow : <div className="seh-home-center">{searchChrome}</div>}

      </header>

    </>

  );

}

