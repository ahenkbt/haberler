import type { ReactNode } from "react";

import { useLocation } from "wouter";

import { SearchEngineFooter } from "@/components/SearchEngineFooter";

import { SearchEngineHeader } from "@/components/SearchEngineHeader";

import { SearchEngineSubNavStack } from "@/components/SearchEngineSubNavStack";

import { useSearchEngineHeaderState } from "@/hooks/useSearchEngineHeaderState";

import { useYekpareTheme } from "@/hooks/useYekpareTheme";

import { SadePublicFooter } from "@/themes/sixammart/SadePublicFooter";

import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";

import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

import { shouldShowGlobalCategoryPills } from "@/lib/searchEngineNav";
import { isYekpareNewsmapPath } from "@/lib/hmHaritalarRoutes";
import { NewsmapHeaderBranding } from "@/components/NewsmapHeaderBranding";

import "@/styles/homepageTheme.css";

import "@/styles/searchEngineHeader.css";



export type SearchEnginePublicChromeProps = {

  children: React.ReactNode;

  searchPlaceholder?: string;

  fullBleed?: boolean;

  footerVariant?: "default" | "turizm" | "otomotiv";

  mapEmbed?: boolean;

  subHeader?: ReactNode;

  subHeaderInHero?: boolean;

  headerAfterSearch?: ReactNode;

  className?: string;

};



/** Google-style minimal chrome — SearchEngineHeader + gövde + Sade footer. */

export function SearchEnginePublicChrome({

  children,

  searchPlaceholder = "Restoran, otel, firma, ürün veya adres ara…",

  fullBleed = false,

  footerVariant = "default",

  mapEmbed = false,

  subHeader,

  subHeaderInHero = false,

  headerAfterSearch,

  className = "",

}: SearchEnginePublicChromeProps) {

  const [loc] = useLocation();

  const pathOnly = (loc.split("?")[0] ?? "").trim();

  const { searchValue, setSearchValue, onSearchSubmit } = useSearchEngineHeaderState();

  const { theme } = useYekpareTheme();



  const showCategories = shouldShowGlobalCategoryPills(pathOnly);
  const showNewsmapBranding = isYekpareNewsmapPath(pathOnly);

  const moduleSubNav = subHeader && !subHeaderInHero ? subHeader : null;



  const categoryRow = showCategories ? (

    <SearchEngineSubNavStack part="categories" showCategories />

  ) : null;



  const moduleSubNavRow = moduleSubNav ? (

    <SearchEngineSubNavStack part="secondary" secondary={moduleSubNav} showCategories={false} />

  ) : null;



  const mergedAfterSearch =

    moduleSubNavRow || headerAfterSearch ? (

      <>

        {moduleSubNavRow}

        {headerAfterSearch}

      </>

    ) : undefined;



  const rootClass = [

    "yekpare-home-root yekpare-search-home yekpare-chrome-shell font-sans",

    mapEmbed ? "haritalar-map-shell flex min-h-[100dvh] flex-col overflow-hidden" : "min-h-[100dvh]",

    className,

  ]

    .filter(Boolean)

    .join(" ");



  const mainClass = mapEmbed

    ? "yekpare-chrome-main haritalar-map-main flex min-h-0 flex-1 flex-col"

    : `yekpare-chrome-main min-h-[70vh] pb-6 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`;



  return (

    <div

      className={rootClass}

      data-page="search-engine-chrome"

      data-yekpare-theme={theme}

      data-home-theme={theme}

    >

      <SearchEngineHeader

        mode="serp"

        sticky

        searchValue={searchValue}

        onSearchChange={setSearchValue}

        onSearchSubmit={onSearchSubmit}

        searchPlaceholder={searchPlaceholder}

        listId="search-engine-chrome-suggest"

        showDefaultSubNav={false}

        showLocationPill={false}

        beforeCategories={categoryRow}

        afterSearch={mergedAfterSearch}

        brandLeading={showNewsmapBranding ? <NewsmapHeaderBranding /> : undefined}

      />



      {fullBleed ? (

        <main className={mainClass}>{children}</main>

      ) : (

        <main className={mainClass}>

          <div className={YEKPARE_PAGE_CONTAINER_CLASS}>{children}</div>

        </main>

      )}



      {!mapEmbed ? <SearchEngineFooter /> : null}

      {!mapEmbed ? <SadePublicFooter variant={footerVariant} /> : null}

    </div>

  );

}


