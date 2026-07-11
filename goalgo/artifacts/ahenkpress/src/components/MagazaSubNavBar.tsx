import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Dumbbell,
  Home,
  LayoutGrid,
  Layers,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Shirt,
  Store,
} from "lucide-react";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";
import {
  MAGAZA,
  MAGAZA_TOP_CATEGORIES,
  type MagazaCategoryKey,
  isMagazaSubNavItemActive,
} from "@/themes/sellzy/magazaRoutes";

const CATEGORY_ICONS: Record<MagazaCategoryKey, LucideIcon> = {
  elektronik: Smartphone,
  moda: Shirt,
  evYasam: Home,
  cocuk: Baby,
  kozmetik: Sparkles,
  spor: Dumbbell,
  market: ShoppingBag,
};

const MAGAZA_SUBNAV_ITEMS = [
  { id: "hub", label: "Mağaza", href: MAGAZA.hub, icon: LayoutGrid },
  { id: "kategoriler", label: "Kategoriler", href: MAGAZA.kategoriler, icon: Layers },
  ...MAGAZA_TOP_CATEGORIES.map((c) => ({
    id: c.key,
    label: c.label,
    href: MAGAZA.kategori(c.slug),
    icon: CATEGORY_ICONS[c.key],
  })),
  { id: "urunler", label: "Ürünler", href: MAGAZA.urunler, icon: ShoppingBag },
  { id: "magazalar", label: "Mağazalar", href: MAGAZA.magazalar, icon: Store },
];

type Props = {
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  /** Header arama satırının altında — cam şerit yok */
  inline?: boolean;
};

export function MagazaSubNavBar({ sticky = false, onNavigate, className = "", inline = false }: Props) {
  const navClass = [inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "", className].filter(Boolean).join(" ");

  return (
    <ModuleSubNavBar
      ariaLabel="Mağaza kategorileri"
      items={MAGAZA_SUBNAV_ITEMS}
      sticky={sticky}
      onNavigate={onNavigate}
      className={navClass}
      isItemActive={(path, item) =>
        isMagazaSubNavItemActive(path, item.href ?? "", item.id)
      }
    />
  );
}
