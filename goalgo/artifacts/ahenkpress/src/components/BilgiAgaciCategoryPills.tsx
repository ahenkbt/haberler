import { Link } from "wouter";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeCategoryHref,
  type KnowledgeCategory,
} from "@/lib/bilgiAgaciCategories";

type BilgiAgaciCategoryPillsProps = {
  basePath?: string;
  categories?: KnowledgeCategory[];
  limit?: number;
  className?: string;
  ariaLabel?: string;
};

export function BilgiAgaciCategoryPills({
  basePath = "/bilgiagaci",
  categories = KNOWLEDGE_CATEGORIES,
  limit = 5,
  className = "",
  ariaLabel = "Bilgi Ağacı kategorileri",
}: BilgiAgaciCategoryPillsProps) {
  const visibleCategories = typeof limit === "number"
    ? categories.slice(0, limit)
    : categories;

  return (
    <nav
      className={`bilgi-agaci-pill-row${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      {visibleCategories.map((category) => (
        <Link
          key={category.slug}
          href={knowledgeCategoryHref(basePath, category)}
          className="bilgi-agaci-pill"
        >
          {category.icon} {category.title}
        </Link>
      ))}
    </nav>
  );
}
