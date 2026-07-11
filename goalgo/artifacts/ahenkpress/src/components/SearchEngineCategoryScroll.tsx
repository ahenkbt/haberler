import { LayoutGrid } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { haritalarLocationWithSearch } from "@/lib/haritalarRoutes";
import {
  isSearchEngineCategoryPillActive,
  SEARCH_ENGINE_CATEGORY_PILLS,
} from "@/lib/searchEngineNav";

type Props = {
  inHeader?: boolean;
  onAllCategoriesClick?: () => void;
};

/** Yatay kaydırmalı tam kategori şeridi — /kesfet hub üst başlıkları ile hizalı. */
export function SearchEngineCategoryScroll({ inHeader = false, onAllCategoriesClick }: Props) {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const loc = haritalarLocationWithSearch(pathname, search);

  return (
    <div className={`seh-category-scroll-wrap${inHeader ? " seh-category-scroll-wrap--header" : ""}`}>
      <nav className="seh-category-scroll" aria-label="Yekpare kategorileri">
        {SEARCH_ENGINE_CATEGORY_PILLS.map((pill) => {
          const active = isSearchEngineCategoryPillActive(loc, pill);
          return (
            <Link
              key={pill.id}
              href={pill.href}
              className={`seh-category-pill${active ? " seh-category-pill--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate(pill.href);
              }}
            >
              <span className="seh-nav-emoji" aria-hidden>{pill.emoji}</span>
              {pill.label}
            </Link>
          );
        })}
        {inHeader && onAllCategoriesClick ? (
          <button
            type="button"
            className="seh-category-pill seh-category-pill--all"
            onClick={onAllCategoriesClick}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Tüm kategoriler
          </button>
        ) : null}
      </nav>
    </div>
  );
}
