import { useMemo, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { BookOpen, Home, Mail, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { VendorNavMenuItem } from "@/lib/vendorNavMenuUtils";

export const VENDOR_MOBILE_BOTTOM_NAV_HEIGHT_PX = 56;

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
}

function itemIcon(id: string) {
  if (id.includes("home") || id.includes("giris")) return Home;
  if (id.includes("product") || id.includes("menu") || id.includes("urun")) return UtensilsCrossed;
  if (id.includes("blog")) return BookOpen;
  if (id.includes("contact") || id.includes("iletisim")) return Mail;
  return ShoppingBag;
}

type Props = {
  items: VendorNavMenuItem[];
  accent: string;
  accentContrast: string;
};

export function VendorMobileBottomNav({ items, accent, accentContrast }: Props) {
  const [loc] = useLocation();
  const locPath = useMemo(() => normPath(loc.split("?")[0] || "/"), [loc]);

  if (!items.length) return null;

  const barStyle: CSSProperties = {
    background: accent,
    color: accentContrast,
    borderColor: "rgba(15,23,42,0.12)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    minHeight: VENDOR_MOBILE_BOTTOM_NAV_HEIGHT_PX,
  };

  return (
    <nav
      className="vendor-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[72] border-t md:hidden"
      aria-label="Mobil şerit menüsü"
      style={barStyle}
    >
      <ul
        className="mx-auto grid h-full w-full max-w-screen-xl touch-manipulation px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const href = String(item.href ?? "#").trim() || "#";
          const active = href.startsWith("/") && locPath === normPath(href.split("?")[0] ?? href);
          const Icon = itemIcon(item.id);
          const className = `vendor-mobile-bottom-nav__item flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] font-bold leading-tight transition-opacity${
            active ? " opacity-100" : " opacity-85 hover:opacity-100"
          }`;
          return (
            <li key={item.id} className="min-w-0">
              <a href={href} className={className} aria-current={active ? "page" : undefined}>
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden stroke="currentColor" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
