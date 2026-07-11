import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Compass,
  Landmark,
  LayoutGrid,
  MapPinned,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";
import {
  HARITALAR,
  HARITALAR_SUPER_NAV,
  haritalarSuperNavHref,
  isHaritalarSubNavItemActive,
} from "@/lib/haritalarRoutes";

const SUPER_ICONS: Record<string, LucideIcon> = {
  mekan_dukkan: Building2,
  alisveris: ShoppingBag,
  hizmet: Wrench,
  turizm: MapPinned,
  kamu: Landmark,
  firma_rehberi: Building2,
};

type Props = {
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  /** Header konum satırında — cam şerit ve alt border yok */
  inline?: boolean;
};

export function HaritalarSubNavBar({
  sticky = false,
  onNavigate,
  className = "",
  inline = false,
}: Props) {
  const items = [
    { id: "hub", label: "Haritalar", href: HARITALAR.hub, icon: LayoutGrid },
    ...HARITALAR_SUPER_NAV.map((item) => ({
      id: item.id,
      label: item.label,
      href: haritalarSuperNavHref(item),
      icon: SUPER_ICONS[item.id] ?? MapPinned,
    })),
    { id: "kesfet", label: "Keşfet", href: HARITALAR.kesfet, icon: Compass },
  ];

  const navClass = [inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "", className].filter(Boolean).join(" ");

  return (
    <ModuleSubNavBar
      ariaLabel="Harita kategorileri"
      items={items}
      sticky={sticky}
      onNavigate={onNavigate}
      className={navClass}
      isItemActive={(fullLoc, item) =>
        isHaritalarSubNavItemActive(fullLoc, item.href ?? "", item.id)
      }
    />
  );
}
