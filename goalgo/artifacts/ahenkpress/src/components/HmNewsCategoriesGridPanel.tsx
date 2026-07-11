import { Link } from "wouter";
import type { HmNewsCategoryMenuItem } from "@/lib/hmNewsCategoryMenu";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";

type HmNewsCategoriesGridPanelProps = {
  items: HmNewsCategoryMenuItem[];
  onClose?: () => void;
  titleId?: string;
};

export function HmNewsCategoriesGridPanel({
  items,
  onClose,
  titleId = "hm-news-categories-menu-title",
}: HmNewsCategoriesGridPanelProps) {
  return (
    <>
      <p className="hm-news-cat-menu-title text-slate-900" id={titleId}>
        Tüm kategoriler
      </p>
      <nav className="hm-news-cat-menu-grid text-slate-900" aria-label="Haber kategorileri">
        {items.map((item) => {
          const className = `hm-news-cat-menu-tile text-slate-900${item.active ? " hm-news-cat-menu-tile--active" : ""}`;
          const content = (
            <>
              <span className="hm-news-cat-menu-tile-emoji" aria-hidden>
                {item.emoji}
              </span>
              <span className="hm-news-cat-menu-tile-label text-slate-900">{item.label}</span>
            </>
          );
          if (item.external || isHmPublicNavExternal(item.href)) {
            return (
              <a
                key={item.key}
                href={item.href}
                className={className}
                rel="noopener noreferrer"
                target="_blank"
                onClick={() => onClose?.()}
              >
                {content}
              </a>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              className={className}
              aria-current={item.active ? "page" : undefined}
              onClick={() => onClose?.()}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
