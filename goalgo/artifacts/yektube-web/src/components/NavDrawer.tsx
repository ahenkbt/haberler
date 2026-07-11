import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import {
  Baby,
  CircleUser,
  Clapperboard,
  Compass,
  Gamepad2,
  Home,
  LayoutGrid,
  MonitorPlay,
  Music2,
  Newspaper,
  PlaySquare,
  Radio,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ytRoutes } from "@/lib/routes";
import { yektubeAssetUrl } from "@/lib/assetUrl";
import { HmEmbedBrandLogo } from "@/components/HmEmbedBrandLogo";
import { useYektubeModules } from "@/hooks/useYektubeModules";
import { isYtDedicatedHost } from "@/lib/routes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarStaticNavLinks, SidebarFooterStaticNavLinks } from "@/components/SidebarStaticNavLinks";
import { isHmEmbedSurface, appendQueryParam } from "@/lib/runtimeConfig";

function kidsNavLabel(): string {
  return isYtDedicatedHost() ? "Çocuk" : "Yekpare Çocuk";
}

const YEKTUBE_STUDIO_URL = "https://yekpare.net/studio";

function portalHref(path: string): string {
  if (typeof window === "undefined") return path;
  return isYtDedicatedHost() ? `https://yekpare.net${path}` : path;
}

type NavDrawerProps = {
  open: boolean;
  onClose: () => void;
  path: string;
  /** HM embed masaüstü — sabit sol panel (overlay yok). */
  variant?: "overlay" | "docked";
};

function DrawerLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  external,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active?: boolean;
  onNavigate: () => void;
  external?: boolean;
}) {
  const cls = cn(
    "flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    active ? "yt-nav-active text-[var(--color-yt-text)]" : "text-[var(--color-yt-text)] yt-panel-hover",
  );
  if (external) {
    return (
      <a href={href} onClick={onNavigate} className={cls}>
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onNavigate} className={cls}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="py-2">
      {title ? (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-yt-muted)]">{title}</p>
      ) : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function NavDrawer({ open, onClose, path, variant = "overlay" }: NavDrawerProps) {
  const modules = useYektubeModules();
  const hmEmbed = isHmEmbedSurface();
  const docked = variant === "docked";

  useEffect(() => {
    if (!open || docked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, docked]);

  const homeHref = ytRoutes.home();
  const onNavigate = docked ? () => undefined : () => onClose();

  const isActive = (segment: string) => path.includes(segment);

  if (!open && !docked) return null;

  const panel = (
      <aside
        className={cn(
          "flex flex-col border-r border-[var(--color-yt-border)] yt-panel",
          docked
            ? "h-full w-[240px] shrink-0"
            : "fixed left-0 top-0 z-[9999] h-[100dvh] w-[min(100vw-3rem,280px)] shadow-xl transition-transform duration-200 ease-out translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-yt-border)] bg-transparent px-3 py-2.5">
          <Link
            href={homeHref}
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 items-center",
              hmEmbed ? "yt-hm-brand-logo-wrap min-w-0 flex-1 pr-2" : "shrink-0",
            )}
          >
            {hmEmbed ? (
              <HmEmbedBrandLogo />
            ) : (
              <img src={yektubeAssetUrl("yektube-logo.png")} alt="Yektube" className="h-11 w-auto max-w-[13rem] object-contain object-left bg-transparent" />
            )}
          </Link>
          {!docked ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full yt-panel-hover"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <Section>
            <DrawerLink href={homeHref} label="Ana Sayfa" icon={Home} active={isActive(homeHref) && !isActive("/yekcek")} onNavigate={onNavigate} />
            <DrawerLink href={ytRoutes.shorts()} label="Yekçek" icon={Clapperboard} active={isActive("/yekcek")} onNavigate={onNavigate} />
            {modules.live ? (
              <DrawerLink href={ytRoutes.live()} label="Canlı Yayın" icon={Radio} active={isActive("/canli")} onNavigate={onNavigate} />
            ) : null}
            <DrawerLink href={ytRoutes.yeklive()} label="Yek Gönder" icon={Video} active={isActive("/yek-gonder") || isActive("/yeklive")} onNavigate={onNavigate} />
            <DrawerLink href={ytRoutes.subscriptions()} label="Abonelikler" icon={PlaySquare} active={isActive("/abonelikler")} onNavigate={onNavigate} />
            <DrawerLink href={ytRoutes.categories()} label="Kategoriler" icon={LayoutGrid} active={isActive("/kategoriler")} onNavigate={onNavigate} />
            <DrawerLink href={ytRoutes.library()} label="Kütüphane" icon={CircleUser} active={isActive("/kutuphane")} onNavigate={onNavigate} />
            <DrawerLink href={YEKTUBE_STUDIO_URL} label="Yektube Studyo" icon={MonitorPlay} external onNavigate={onNavigate} />
            <SidebarStaticNavLinks path={path} variant="drawer" onNavigate={onNavigate} />
          </Section>

          <div className="my-2 border-t border-[var(--color-yt-border)]" />

          <Section title="Keşfet">
            {modules.music ? (
              <DrawerLink href={ytRoutes.music()} label="Müzik" icon={Music2} active={isActive("/muzik")} onNavigate={onNavigate} />
            ) : null}
            <DrawerLink href={ytRoutes.kids()} label={kidsNavLabel()} icon={Baby} active={isActive("/cocuk")} onNavigate={onNavigate} />
            <DrawerLink href={ytRoutes.search()} label="Trend & arama" icon={Compass} active={isActive("/ara")} onNavigate={onNavigate} />
            <DrawerLink href={appendQueryParam(homeHref, "k", "haberler")} label="Haberler" icon={Newspaper} active={false} onNavigate={onNavigate} />
            <DrawerLink href={appendQueryParam(homeHref, "k", "spor")} label="Spor" icon={Trophy} active={false} onNavigate={onNavigate} />
            <DrawerLink href={appendQueryParam(homeHref, "k", "oyun")} label="Oyun" icon={Gamepad2} active={false} onNavigate={onNavigate} />
          </Section>

          <div className="my-2 border-t border-[var(--color-yt-border)]" />

          <Section title="Araçlar">
            <DrawerLink href={ytRoutes.userPanel()} label="Hesabım" icon={CircleUser} active={isActive("/hesabim")} onNavigate={onNavigate} />
            <DrawerLink href={portalHref("/canlitv")} label="Yekpare Canlı TV" icon={Radio} external onNavigate={onNavigate} />
          </Section>
        </nav>

        <div className="mt-auto shrink-0 border-t border-[var(--color-yt-border)] p-3 space-y-2">
          {!hmEmbed ? <ThemeToggle /> : null}
          <SidebarFooterStaticNavLinks path={path} onNavigate={onNavigate} />
        </div>
      </aside>
  );

  if (docked) return panel;

  const drawer = (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9998] bg-black/40 transition-opacity opacity-100"
        onClick={onClose}
        aria-label="Menüyü kapat"
      />
      {panel}
    </>
  );

  if (typeof document === "undefined") return drawer;
  return createPortal(drawer, document.body);
}
