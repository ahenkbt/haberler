import { Link, useLocation, useSearch } from "wouter";

import { haritalarLocationWithSearch } from "@/lib/haritalarRoutes";
import {
  isSearchEngineModuleTileActive,
  SEARCH_ENGINE_ALL_MODULES,
} from "@/lib/searchEngineNav";

type AppsGridPanelProps = {
  onClose?: () => void;
  titleId?: string;
  showActiveState?: boolean;
};

export function AppsGridPanel({
  onClose,
  titleId = "seh-apps-menu-title",
  showActiveState = false,
}: AppsGridPanelProps) {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const loc = haritalarLocationWithSearch(pathname, search);

  return (
    <>
      <p className="seh-apps-title" id={titleId}>
        Tüm kategoriler
      </p>
      <nav className="seh-apps-grid" aria-label="Yekpare kategorileri">
        {SEARCH_ENGINE_ALL_MODULES.map((mod) => {
          const active = showActiveState && isSearchEngineModuleTileActive(loc, mod);
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={`seh-apps-tile${active ? " seh-apps-tile--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (showActiveState) {
                  event.preventDefault();
                  onClose?.();
                  navigate(mod.href);
                  return;
                }
                onClose?.();
              }}
            >
              <span className="seh-apps-tile-emoji" aria-hidden>
                {mod.emoji}
              </span>
              <span className="seh-apps-tile-label">{mod.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
