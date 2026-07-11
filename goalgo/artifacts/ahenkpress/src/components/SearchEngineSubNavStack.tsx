import type { ReactNode } from "react";
import { SearchEngineCategoryScroll } from "@/components/SearchEngineCategoryScroll";

type Props = {
  /** Modül sekmeleri — Sipariş/Yemek/Market vb. */
  secondary?: ReactNode;
  /** Global 9 kategori şeridi — modül sayfalarında arama üstünde (ana menü). */
  showCategories?: boolean;
  onAllCategoriesClick?: () => void;
  /** `categories` = ana menü (arama üstü), `secondary` = alt menü (arama altı), `all` = ikisi üst üste (legacy). */
  part?: "all" | "categories" | "secondary";
};

/** Modül sayfaları: global kategori pill'leri (üst) + modül alt menüsü (alt). */
export function SearchEngineSubNavStack({
  secondary,
  showCategories = true,
  onAllCategoriesClick,
  part = "all",
}: Props) {
  if (part === "categories") {
    if (!showCategories) return null;
    return (
      <div className="seh-subnav-stack seh-subnav-stack--categories">
        <SearchEngineCategoryScroll inHeader onAllCategoriesClick={onAllCategoriesClick} />
      </div>
    );
  }

  if (part === "secondary") {
    if (!secondary) return null;
    return (
      <div className="seh-subnav-stack seh-subnav-stack--secondary">
        <div className="seh-subnav-stack-secondary">{secondary}</div>
      </div>
    );
  }

  if (!showCategories && !secondary) return null;
  if (!showCategories) return <>{secondary}</>;

  return (
    <div className="seh-subnav-stack">
      <SearchEngineCategoryScroll inHeader onAllCategoriesClick={onAllCategoriesClick} />
      {secondary ? <div className="seh-subnav-stack-secondary">{secondary}</div> : null}
    </div>
  );
}
