import type { LucideIcon } from "lucide-react";
import { CarTaxiFront, LayoutGrid, Package, PackageCheck, Truck, Users } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";

export type UlasimNavService = {
  id: string;
  slug: string;
  label: string;
};

const ULASIM_NAV_ICONS: Record<string, LucideIcon> = {
  tow: Truck,
  taxi: CarTaxiFront,
  rideshare: Users,
  courier: Package,
  cargo: PackageCheck,
  moving: Truck,
};

type Props = {
  services: readonly UlasimNavService[];
  /** Header arama satırının altında — cam şerit yok */
  inline?: boolean;
};

export function UlasimSubNavBar({ services, inline = false }: Props) {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";

  const items = [
    { id: "hub", label: "Ulaşım", href: "/ulasim", icon: LayoutGrid },
    ...services.map((service) => ({
      id: service.id,
      label: service.label,
      href: `/ulasim/${service.slug}`,
      icon: ULASIM_NAV_ICONS[service.id] ?? Truck,
    })),
  ];

  const navClass = inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "";

  return (
    <ModuleSubNavBar
      ariaLabel="Ulaşım hizmetleri"
      items={items}
      className={navClass}
      isItemActive={(p, item) => {
        if (item.id === "hub") return p === "/ulasim";
        return p === item.href;
      }}
    />
  );
}
