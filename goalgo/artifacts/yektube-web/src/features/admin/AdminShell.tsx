import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Radio,
  Video,
  Wrench,
  SlidersHorizontal,
  Settings,
  ListPlus,
  LogOut,
  ExternalLink,
  Music2,
  Baby,
  Tv,
  RefreshCw,
  Users,
  Import,
  FileText,
} from "lucide-react";
import { yektubeHomePath } from "@workspace/yektube-core";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "./AdminAuth";
import { adminPageTitle, adminRoute } from "./adminPaths";
import { isAdminEmbedLight } from "./adminEmbedTheme";
import { YEKTUBE_VIDEO_TV_LOGO_URL } from "@/lib/assetUrl";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

export function AdminShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { logout, fullAdmin } = useAdminAuth();
  const pageTitle = adminPageTitle(path);
  const embedLight = isAdminEmbedLight();

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: "Genel",
      items: [{ href: adminRoute(), label: "Panel", icon: LayoutDashboard, exact: true }],
    },
    {
      title: "İçerik",
      items: [
        { href: adminRoute("/yektube"), label: "Yektube", icon: Tv },
        { href: adminRoute("/canli-yayinlar"), label: "Canlı Yayınlar", icon: Radio },
        { href: adminRoute("/kaynaklar"), label: "Kaynaklar", icon: Import },
        { href: adminRoute("/videolar"), label: "Videolar", icon: Video },
        { href: adminRoute("/hazir-kanallar"), label: "Hazır kanallar", icon: ListPlus },
        { href: adminRoute("/muzik"), label: "Müzik", icon: Music2 },
        { href: adminRoute("/cocuk"), label: "Çocuk", icon: Baby },
        { href: adminRoute("/editorler"), label: "Editörler", icon: Users },
        { href: adminRoute("/sayfalar"), label: "Sayfalar", icon: FileText },
      ],
    },
    {
      title: "Güncelleme",
      items: [{ href: adminRoute("/kaziyici"), label: "Sosyal kazıyıcı", icon: RefreshCw }],
    },
    {
      title: "Sistem",
      items: [
        { href: adminRoute("/moduller"), label: "Modüller", icon: SlidersHorizontal },
        { href: adminRoute("/araclar"), label: "Araçlar", icon: Wrench },
        { href: adminRoute("/ayarlar"), label: "Ayarlar", icon: Settings },
      ],
    },
  ];

  return (
    <div
      className={cn(
        "flex min-h-screen",
        embedLight ? "bg-white text-zinc-900" : "bg-zinc-950 text-zinc-100",
      )}
      data-yektube-admin
      data-yektube-admin-embed={embedLight ? "true" : undefined}
    >
      <aside
        className={cn(
          "flex w-[260px] shrink-0 flex-col border-r",
          embedLight ? "border-slate-200 bg-slate-50" : "border-zinc-800/80 bg-zinc-900",
        )}
      >
        <div className={cn("border-b px-4 py-5", embedLight ? "border-slate-200" : "border-zinc-800")}>
          <div className="flex items-center gap-3">
            {embedLight ? (
              <img
                src={YEKTUBE_VIDEO_TV_LOGO_URL}
                alt="Yektube Video TV"
                className="h-10 w-auto max-w-[160px] object-contain object-left"
                draggable={false}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-900 text-sm font-black text-white">
                YT
              </div>
            )}
            <div className="min-w-0">
              <p className={cn("text-base font-bold truncate", embedLight ? "text-zinc-900" : "text-white")}>
                {embedLight ? "Video TV Studio" : "Yektube Studio"}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                {fullAdmin ? "Tam yönetici" : "Panel"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map(({ title, items }) => (
            <div key={title}>
              <p
                className={cn(
                  "mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider",
                  embedLight ? "text-zinc-400" : "text-zinc-600",
                )}
              >
                {title}
              </p>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? path === href || path === `${href}/` : path.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-red-600/15 ring-1 ring-red-500/25 " + (embedLight ? "text-red-700" : "text-white")
                          : embedLight
                            ? "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                            : "text-zinc-400 hover:bg-zinc-800/80 hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active && "text-red-500")} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("space-y-1 border-t p-3", embedLight ? "border-slate-200" : "border-zinc-800")}>
          <a
            href={yektubeHomePath()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              embedLight
                ? "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
            )}
          >
            <ExternalLink className="h-4 w-4" />
            Siteyi aç
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
              embedLight
                ? "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
            )}
          >
            <LogOut className="h-4 w-4" />
            Çıkış
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-10 flex h-14 items-center border-b px-6 backdrop-blur-md",
            embedLight ? "border-slate-200 bg-white/95" : "border-zinc-800/80 bg-zinc-950/90",
          )}
        >
          <h1 className={cn("text-sm font-semibold", embedLight ? "text-zinc-700" : "text-zinc-300")}>{pageTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto bg-white p-6">{children}</main>
      </div>
    </div>
  );
}
