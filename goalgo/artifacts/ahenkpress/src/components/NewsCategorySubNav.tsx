import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Cpu,
  Globe2,
  List,
  Newspaper,
  PenLine,
  PlayCircle,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { ModuleSubNavBar, type ModuleSubNavItem } from "@/components/ModuleSubNavBar";

const NEWS_CATEGORY_ICONS: Record<string, LucideIcon> = {
  gundem: Newspaper,
  ekonomi: TrendingUp,
  spor: Trophy,
  dunya: Globe2,
  teknoloji: Cpu,
  kultur: BookOpen,
};

type NewsCategory = {
  slug: string;
  label: string;
};

type Props = {
  categories: readonly NewsCategory[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
};

export function NewsCategorySubNav({ categories, activeCategory, onCategoryChange }: Props) {
  const items = useMemo<ModuleSubNavItem[]>(
    () => [
      {
        id: "yektube",
        label: "Yektube",
        href: "/yektube",
        icon: PlayCircle,
      },
      ...categories.map((cat) => ({
        id: cat.slug,
        label: cat.label,
        icon: NEWS_CATEGORY_ICONS[cat.slug] ?? Newspaper,
        isActive: activeCategory === cat.slug,
        onClick: () => onCategoryChange(cat.slug),
      })),
      { id: "yazarlar", label: "Yazarlar", href: "/yazarlar", icon: PenLine },
      { id: "tum-haberler", label: "Tüm haberler", href: "/tum-haberler", icon: List },
    ],
    [categories, activeCategory, onCategoryChange],
  );

  return <ModuleSubNavBar ariaLabel="Haber kategorileri" items={items} />;
}
