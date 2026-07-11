import type { LucideIcon } from "lucide-react";
import {
  Car,
  CircleDot,
  Droplets,
  LayoutGrid,
  Package,
  Recycle,
  Settings,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";
import {
  OTOMOTIV,
  OTOMOTIV_MODULES,
  type OtomotivModuleKey,
  isOtomotivSubNavItemActive,
} from "./otomotivRoutes";

const MODULE_ICONS: Record<OtomotivModuleKey, LucideIcon> = {
  galeri: Car,
  sifir: Sparkles,
  ikinciEl: Car,
  yedekParca: Package,
  cikma: Recycle,
  servis: Wrench,
  yikama: Droplets,
  lastik: CircleDot,
  sigorta: Shield,
};

const OTOMOTIV_SUBNAV_ITEMS = [
  { id: "hub", label: "Otomotiv", href: OTOMOTIV.hub, icon: LayoutGrid },
  ...OTOMOTIV_MODULES.map((m) => ({
    id: m.key,
    label: m.label,
    href: m.href,
    icon: MODULE_ICONS[m.key],
  })),
];

type Props = {
  sticky?: boolean;
  onNavigate?: () => void;
  className?: string;
  /** Header arama satırının altında — cam şerit yok */
  inline?: boolean;
};

export function OtomotivSubNavBar({ sticky = false, onNavigate, className = "", inline = false }: Props) {
  const navClass = [inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "", className].filter(Boolean).join(" ");

  return (
    <ModuleSubNavBar
      variant="otomotiv"
      ariaLabel="Otomotiv modülleri"
      items={OTOMOTIV_SUBNAV_ITEMS}
      sticky={sticky}
      onNavigate={onNavigate}
      className={navClass}
      isItemActive={(path, item) =>
        isOtomotivSubNavItemActive(path, item.href ?? "", item.id as "hub" | OtomotivModuleKey)
      }
    />
  );
}

export { Settings as OtomotivSettingsIcon };
