import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Compass,
  Cpu,
  FlaskConical,
  HeartPulse,
  Landmark,
  LayoutGrid,
  Leaf,
  Map,
  Palette,
  Theater,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { useAnsiklopediBasePath } from "@/lib/ansiklopediPaths";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeCategoryHref,
  type KnowledgeCategory,
} from "@/lib/bilgiAgaciCategories";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "gezi-seyahat": Compass,
  bilim: FlaskConical,
  tarih: Landmark,
  cografya: Map,
  doga: Leaf,
  teknoloji: Cpu,
  kultur: Theater,
  sanat: Palette,
  saglik: HeartPulse,
  ekonomi: TrendingUp,
  spor: Trophy,
};

type Props = {
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  categories?: KnowledgeCategory[];
};

export function BilgiAgaciSubNavBar({
  sticky = false,
  onNavigate,
  className = "",
  categories = KNOWLEDGE_CATEGORIES,
}: Props) {
  const base = useAnsiklopediBasePath();

  const items = [
    { id: "hub", label: BILGI_AGACI_DISPLAY_NAME, href: base, icon: LayoutGrid },
    ...categories.map((cat) => ({
      id: cat.slug,
      label: cat.title,
      href: knowledgeCategoryHref(base, cat),
      icon: CATEGORY_ICONS[cat.slug] ?? BookOpen,
    })),
  ];

  return (
    <ModuleSubNavBar
      ariaLabel={`${BILGI_AGACI_DISPLAY_NAME} kategorileri`}
      items={items}
      sticky={sticky}
      onNavigate={onNavigate}
      className={className}
      isItemActive={(p, item) => {
        if (item.id === "hub") return p === base;
        return p === item.href || (item.href ? p.startsWith(`${item.href}/`) : false);
      }}
    />
  );
}
