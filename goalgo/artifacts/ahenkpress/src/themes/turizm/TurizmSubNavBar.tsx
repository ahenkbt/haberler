import type { LucideIcon } from "lucide-react";

import { Building2, Car, CarTaxiFront, Compass, Home, LayoutGrid, MapPinned, Plane, Ship, Ticket } from "lucide-react";

import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";

import { TURIZM, TURIZM_MODULES, type TurizmModuleKey, isTurizmSubNavItemActive } from "./turizmRoutes";



const MODULE_ICONS: Record<TurizmModuleKey, LucideIcon> = {

  turlar: Compass,

  konaklama: Building2,

  villaEv: Home,

  arac: Car,

  yat: Ship,

};



/** Seyahat → Etkinlik → VIP Transfer → modüller → Uçak → Gezi */

const TURIZM_SUBNAV_ITEMS = [

  { id: "hub", label: "Seyahat", href: TURIZM.hub, icon: LayoutGrid },

  { id: "etkinlik", label: "Etkinlik", href: TURIZM.stubs.etkinlik, icon: Ticket },

  { id: "servis", label: "VIP Transfer", href: TURIZM.stubs.servis, icon: CarTaxiFront },

  ...TURIZM_MODULES.map((m) => ({

    id: m.key,

    label: m.label,

    href: m.href,

    icon: MODULE_ICONS[m.key],

  })),

  { id: "ucus", label: "Uçak", href: TURIZM.stubs.ucus, icon: Plane },

  { id: "gezi", label: "Gezi Seyahat", href: TURIZM.geziSeyahat, icon: MapPinned },

];



type Props = {

  /** Sticky below Yekpare header on /turizm/* pages */

  sticky?: boolean;

  /** Close header dropdown after navigation */

  onNavigate?: () => void;

  className?: string;

  /** Header konum satırında — cam şerit ve alt border yok */

  inline?: boolean;

};



export function TurizmSubNavBar({ sticky = false, onNavigate, className = "", inline = false }: Props) {

  const navClass = [inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "", className].filter(Boolean).join(" ");

  return (

    <ModuleSubNavBar

      variant="turizm"

      ariaLabel="Seyahat modülleri"

      items={TURIZM_SUBNAV_ITEMS}

      sticky={sticky}

      onNavigate={onNavigate}

      className={navClass}

      isItemActive={(path, item) =>

        isTurizmSubNavItemActive(

          path,

          item.href ?? "",

          item.id as "hub" | "gezi" | TurizmModuleKey | "ucus" | "servis" | "etkinlik",

        )

      }

    />

  );

}

