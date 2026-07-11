import { Link, useLocation } from "wouter";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

const TRV_NAV = [
  { label: "Ana Sayfa", href: TURIZM.turlar.home },
  { label: "Tur Listesi", href: TURIZM.turlar.liste },
  { label: "Destinasyonlar", href: TURIZM.turlar.destinasyonlar },
  { label: "Blog", href: TURIZM.turlar.blog },
  { label: "Galeri", href: TURIZM.turlar.galeri },
  { label: "SSS", href: TURIZM.turlar.sss },
];

/** Turlar modülü içi alt menü — global Turizm dropdown ile çakışmaz */
export function TravllaSubnav() {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";

  return (
    <nav className="trv-subnav" aria-label="Turlar alt menüsü">
      <div className="trv-subnav__inner">
        {TRV_NAV.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "trv-subnav__link trv-subnav__link--active" : "trv-subnav__link"}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
