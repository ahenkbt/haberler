import { Bot, Car, LayoutGrid, Newspaper, Plane, ShoppingBag, Utensils } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { MODULE_SUBNAV_HEADER_INLINE_CLASS } from "@/components/SearchEngineLocationPill";
import {
  resolveServiceMarketingSlug,
  SERVICES_MARKETING_BASE,
  SERVICES_MARKETING_MODULES,
  SERVICES_MARKETING_ORDER,
  type ServiceMarketingSlug,
} from "@/lib/servicesMarketingData";

const SERVICE_ICONS: Record<ServiceMarketingSlug, typeof Utensils> = {
  siparis: Utensils,
  alisveris: ShoppingBag,
  ulasim: Car,
  turizm: Plane,
  "haber-merkezi": Newspaper,
  "ai-cagri-merkezi": Bot,
};

type Props = {
  /** Header arama satırının altında — cam şerit yok */
  inline?: boolean;
};

export function ServicesSubNav({ inline = false }: Props) {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";

  const items = [
    { id: "hub", label: "Tüm servisler", href: SERVICES_MARKETING_BASE, icon: LayoutGrid },
    ...SERVICES_MARKETING_ORDER.map((slug) => ({
      id: slug,
      label: SERVICES_MARKETING_MODULES[slug].navLabel,
      href: `${SERVICES_MARKETING_BASE}/${slug}`,
      icon: SERVICE_ICONS[slug],
    })),
  ];

  const navClass = inline ? MODULE_SUBNAV_HEADER_INLINE_CLASS : "";

  return (
    <ModuleSubNavBar
      ariaLabel="Servis tanıtım menüsü"
      items={items}
      className={navClass}
      isItemActive={(p, item) => {
        if (item.id === "hub") return p === SERVICES_MARKETING_BASE;
        if (p.startsWith(`${SERVICES_MARKETING_BASE}/`)) {
          const slugPart = p.slice(SERVICES_MARKETING_BASE.length + 1).split("/")[0] ?? "";
          const resolved = resolveServiceMarketingSlug(slugPart);
          if (resolved && item.id === resolved) return true;
        }
        return p === item.href;
      }}
    />
  );
}
