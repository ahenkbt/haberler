import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, LayoutDashboard, PlusCircle, Radio, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { ytRoutes } from "@/lib/routes";
import { MemberAccountButton } from "@/components/MemberAccountButton";

const NAV = [
  { href: ytRoutes.userStudio(), label: "Genel bakış", icon: LayoutDashboard, suffix: "" },
  { href: ytRoutes.studioAdd({ upload: true }), label: "Video yükle", icon: Upload, suffix: "/ekle?tur=yukle" },
  { href: ytRoutes.studioAdd(), label: "Bağlantı ekle", icon: PlusCircle, suffix: "/ekle" },
  { href: ytRoutes.studioAdd({ live: true }), label: "Canlı yayın", icon: Radio, suffix: "/ekle?tur=canli" },
] as const;

export function UserStudioShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();

  return (
    <div className="flex min-h-[100dvh] flex-col yt-app-bg lg:flex-row">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-yt-border)] yt-panel px-4 lg:hidden">
        <Link href={ytRoutes.yeklive()} className="flex h-9 w-9 items-center justify-center rounded-full yt-panel-hover">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold">Yek Gönder Stüdyo</span>
        <div className="ml-auto">
          <MemberAccountButton compact />
        </div>
      </header>

      <aside className="hidden w-56 shrink-0 border-r border-[var(--color-yt-border)] yt-panel lg:block">
        <div className="border-b border-[var(--color-yt-border)] px-4 py-4">
          <Link href={ytRoutes.yeklive()} className="text-xs text-[var(--color-yt-muted)] hover:underline">
            ← Yek Gönder
          </Link>
          <p className="mt-1 text-base font-bold">Stüdyo</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map(({ href, label, icon: Icon, suffix }) => {
            const active = suffix ? path.includes("/studio/ekle") && href.includes("canli") === path.includes("canli") : path.endsWith("/studio") || path.endsWith("/studio/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "yt-nav-active" : "yt-panel-hover",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
