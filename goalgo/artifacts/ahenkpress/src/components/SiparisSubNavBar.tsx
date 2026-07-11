import { LayoutGrid, ShoppingBag, Store, Utensils } from "lucide-react";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";
import { DELIVERY_MODULES } from "@/lib/deliveryModuleGroups";

const MODULE_ICONS = {
  food: Utensils,
  market: ShoppingBag,
  nearby: Store,
} as const;

type Props = {
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  /** Header konum satırında — cam şerit ve alt border yok */
  inline?: boolean;
};

export function SiparisSubNavBar({ sticky = false, onNavigate, className = "", inline = false }: Props) {
  const items = [
    { id: "hub", label: "Sipariş", href: "/siparis", icon: LayoutGrid },
    ...DELIVERY_MODULES.map((mod) => ({
      id: mod.key,
      label: mod.shortLabel,
      href: mod.href,
      icon: MODULE_ICONS[mod.key],
    })),
  ];

  const navClass = [inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "", className].filter(Boolean).join(" ");

  return (
    <ModuleSubNavBar
      ariaLabel="Sipariş modülleri"
      items={items}
      sticky={sticky}
      onNavigate={onNavigate}
      className={navClass}
      isItemActive={(p, item) => {
        if (item.id === "hub") return p === "/siparis";
        return p === item.href || p.startsWith(`${item.href}/`);
      }}
    />
  );
}
