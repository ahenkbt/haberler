import { BookOpen, Globe2, Home, MapPinned, Plane } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleSubNavBar } from "@/components/ModuleSubNavBar";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

const GEZI_NAV_ITEMS = [
  { id: "hub", label: "Gezi Seyahat", href: "/gezi-seyahat", icon: MapPinned, exact: true },
  { id: "turkiye", label: "Türkiye", href: "/gezi-seyahat?bolge=turkiye", icon: Home },
  { id: "dunya", label: "Dünya", href: "/gezi-seyahat?bolge=dunya", icon: Globe2 },
  { id: "bilgi", label: "Bilgi Ağacı", href: "/bilgiagaci", icon: BookOpen },
  { id: "rezervasyon", label: "Rezervasyon", href: TURIZM.hub, icon: Plane },
] as const;

type Props = { sticky?: boolean };

/** Gezi Seyahat — editoryal gezi kabuğu alt menüsü */
export function GeziSeyahatSubNavBar({ sticky = false }: Props) {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";
  const search = loc.includes("?") ? loc.split("?")[1] ?? "" : "";

  return (
    <ModuleSubNavBar
      ariaLabel="Gezi Seyahat menüsü"
      sticky={sticky}
      items={GEZI_NAV_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
      }))}
      isItemActive={(_, item) => {
        const navItem = GEZI_NAV_ITEMS.find((n) => n.id === item.id);
        if (!navItem) return false;
        if ("exact" in navItem && navItem.exact) {
          return path === navItem.href && !search;
        }
        if (navItem.href.includes("?")) {
          return loc === navItem.href;
        }
        return path === navItem.href || path.startsWith(`${navItem.href}/`);
      }}
    />
  );
}
