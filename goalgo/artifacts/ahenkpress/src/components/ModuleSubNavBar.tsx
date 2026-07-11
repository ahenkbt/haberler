import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { haritalarLocationWithSearch } from "@/lib/haritalarRoutes";
import "@/styles/subnav.css";

export type ModuleSubNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  /** Button item — in-page action (e.g. category filter) */
  onClick?: () => void;
  /** Explicit active override */
  isActive?: boolean;
};

type Props = {
  items: ModuleSubNavItem[];
  ariaLabel: string;
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  /** BEM prefix — defaults to module-subnav; otomotiv/turizm keep legacy class names */
  variant?: "module" | "otomotiv" | "turizm";
  isItemActive?: (path: string, item: ModuleSubNavItem) => boolean;
};

function prefixFor(variant: Props["variant"]): string {
  if (variant === "otomotiv") return "otomotiv-subnav";
  if (variant === "turizm") return "turizm-subnav";
  return "module-subnav";
}

function defaultIsActive(path: string, item: ModuleSubNavItem): boolean {
  if (item.isActive !== undefined) return item.isActive;
  if (!item.href) return false;
  const hrefPath = item.href.split("?")[0] ?? item.href;
  if (hrefPath === "/") return path === "/";
  return path === hrefPath || path.startsWith(`${hrefPath}/`);
}

export function ModuleSubNavBar({
  items,
  ariaLabel,
  sticky = false,
  onNavigate,
  className = "",
  variant = "module",
  isItemActive = defaultIsActive,
}: Props) {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const fullLoc = haritalarLocationWithSearch(pathname, search);
  const p = prefixFor(variant);
  const navClass = [
    p,
    sticky ? `${p}--sticky` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleNavigate = () => {
    onNavigate?.();
  };

  return (
    <nav className={navClass} aria-label={ariaLabel}>
      <div className={`${p}__inner`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(fullLoc, item);
          const itemClass = `${p}__item${active ? ` ${p}__item--active` : ""}`;

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                className={itemClass}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  item.onClick?.();
                  handleNavigate();
                }}
              >
                {Icon ? <Icon className={`${p}__icon`} aria-hidden /> : null}
                <span>{item.label}</span>
              </button>
            );
          }

          if (!item.href) return null;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={itemClass}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate();
                if (item.href) navigate(item.href);
              }}
            >
              {Icon ? <Icon className={`${p}__icon`} aria-hidden /> : null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
