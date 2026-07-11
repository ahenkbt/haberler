import { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Baby,
  CircleUser,
  Clapperboard,
  Home,
  LayoutGrid,
  Menu,
  MonitorPlay,
  Music2,
  PlaySquare,
  Plus,
  Radio,
  Search,
  Video,
} from "lucide-react";
import { isYektubeDedicatedHost } from "@workspace/yektube-core";
import { isYtDedicatedHost, ytRoutes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { useIsMobile, useIsWatchRoute } from "@/hooks/useIsMobile";
import { isEmbedMode, isHmEmbedSurface } from "@/lib/runtimeConfig";
import { HmEmbedBrandLogo } from "@/components/HmEmbedBrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MemberAccountButton } from "@/components/MemberAccountButton";
import { useYektubeModules } from "@/hooks/useYektubeModules";
import { yektubeAssetUrl } from "@/lib/assetUrl";
import { NavDrawer } from "@/components/NavDrawer";
import { SidebarStaticNavLinks, SidebarFooterStaticNavLinks } from "@/components/SidebarStaticNavLinks";
import { CreateMenu } from "@/components/CreateMenu";
import { MobileHomeSearchBar } from "@/components/MobileHomeSearchBar";
import { MobileHomeHeaderSlotProvider, useMobileHomeHeaderSlot } from "@/components/MobileHomeHeaderSlot";
import { MusicMiniPlayer } from "@/components/MusicMiniPlayer";
import { YektubePwaInstallBanner } from "@/components/YektubePwaInstallBanner";
import { useOptionalMusicPlayer } from "@/features/music/MusicContext";
import { useLiveStatusPoll } from "@/hooks/useLiveStatusPoll";

type YektubeTabId = "home" | "shorts" | "live" | "yeklive" | "music" | "kids" | "subscriptions" | "categories" | "library";

const YEKTUBE_STUDIO_URL = "https://yekpare.net/studio";

function yekparePortalOrigin(): string {
  if (typeof window === "undefined") return "https://yekpare.net";
  return isYektubeDedicatedHost(window.location.hostname) ? "https://yekpare.net" : "";
}

function portalHref(path: string): string {
  const origin = yekparePortalOrigin();
  return origin ? `${origin}${path.startsWith("/") ? path : `/${path}`}` : path;
}

function isLiveRoute(path: string): boolean {
  return path.includes("/canli") && !path.includes("/canlitv");
}

function isYekLiveRoute(path: string): boolean {
  return path.includes("/yek-gonder") || path.includes("/yeklive") || path.includes("/studio");
}

function activeTab(path: string): YektubeTabId {
  if (path.includes("/yekcek")) return "shorts";
  if (isYekLiveRoute(path)) return "yeklive";
  if (isLiveRoute(path)) return "live";
  if (path.includes("/muzik")) return "music";
  if (path.includes("/cocuk")) return "kids";
  if (path.includes("/abonelikler")) return "subscriptions";
  if (path.includes("/kategoriler")) return "categories";
  if (path.includes("/kutuphane") || path.includes("/hesabim")) return "library";
  return "home";
}

function isMusicRoute(path: string): boolean {
  return path.includes("/muzik");
}

function isKidsRoute(path: string): boolean {
  return path.includes("/cocuk");
}

function kidsNavLabel(): string {
  return isYtDedicatedHost() ? "Çocuk" : "Yekpare Çocuk";
}

export function YektubeAppShell({
  children,
  onOpenSearch,
  embed: embedProp,
}: {
  children: ReactNode;
  onOpenSearch?: () => void;
  embed?: boolean;
}) {
  const isMobile = useIsMobile();
  const [path] = useLocation();
  const isWatch = useIsWatchRoute(path);
  const embed = embedProp ?? isEmbedMode();
  const onMusic = isMusicRoute(path);
  const [navOpen, setNavOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  /** HM embed: route değişince drawer'ı zorla açma (müzik→video sol menü bug'ı) */
  useEffect(() => {
    if (!embed) return;
    if (isWatch || isMobile) setNavOpen(false);
  }, [embed, isWatch, isMobile, path]);

  /** HM Video TV iframe — mobil müzik: oynatıcı + alt menü */
  if (embed && isMobile && onMusic && !isWatch) {
    return (
      <>
        <MobileHomeHeaderSlotProvider>
          <EmbedMobileMusicShell
            path={path}
            onOpenSearch={onOpenSearch}
            onOpenNav={() => setNavOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
          >
            {children}
          </EmbedMobileMusicShell>
        </MobileHomeHeaderSlotProvider>
        <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
        <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="bottom" />
      </>
    );
  }

  /** HM Video TV iframe — mobilde her zaman MobileShell (alt menü watch'ta da kalır) */
  if (embed && isMobile) {
    return (
      <>
        <MobileHomeHeaderSlotProvider>
          <MobileShell
            path={path}
            isWatch={isWatch}
            onOpenSearch={onOpenSearch}
            embed={embed}
            onOpenNav={() => setNavOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
          >
            {children}
          </MobileShell>
        </MobileHomeHeaderSlotProvider>
        <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
        <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="bottom" />
      </>
    );
  }

  /** HM Video TV iframe — masaüstünde yekpare.net/yp ile aynı kabuk */
  if (embed) {
    if (onMusic && !isWatch) {
      return (
        <>
          <DesktopMusicShell
            path={path}
            embed={embed}
            onOpenNav={() => setNavOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
          >
            {children}
          </DesktopMusicShell>
          <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
          <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="top" />
        </>
      );
    }
    return (
      <>
        <MobileHomeHeaderSlotProvider>
          <DesktopShell
            path={path}
            onOpenSearch={onOpenSearch}
            embed={embed}
            onOpenNav={() => setNavOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
          >
            {children}
          </DesktopShell>
        </MobileHomeHeaderSlotProvider>
        <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
        <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="top" />
      </>
    );
  }

  if (isMobile) {
    return (
      <>
        <MobileHomeHeaderSlotProvider>
          <MobileShell
            path={path}
            isWatch={isWatch}
            onOpenSearch={onOpenSearch}
            embed={embed}
            onOpenNav={() => setNavOpen(true)}
            onOpenCreate={() => setCreateOpen(true)}
          >
            {children}
          </MobileShell>
        </MobileHomeHeaderSlotProvider>
        <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
        <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="bottom" />
      </>
    );
  }

  if (isMusicRoute(path)) {
    return (
      <>
        <DesktopMusicShell
          path={path}
          embed={embed}
          onOpenNav={() => setNavOpen(true)}
          onOpenCreate={() => setCreateOpen(true)}
        >
          {children}
        </DesktopMusicShell>
        <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
        <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="top" />
      </>
    );
  }

  return (
    <>
      <MobileHomeHeaderSlotProvider>
      <DesktopShell
        path={path}
        onOpenSearch={onOpenSearch}
        embed={embed}
        onOpenNav={() => setNavOpen(true)}
        onOpenCreate={() => setCreateOpen(true)}
      >
        {children}
      </DesktopShell>
      </MobileHomeHeaderSlotProvider>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} path={path} />
      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} anchor="top" />
    </>
  );
}

function MobileShell({
  children,
  path,
  isWatch,
  onOpenSearch,
  embed,
  onOpenNav,
  onOpenCreate,
}: {
  children: ReactNode;
  path: string;
  isWatch: boolean;
  onOpenSearch?: () => void;
  embed?: boolean;
  onOpenNav: () => void;
  onOpenCreate: () => void;
}) {
  const tab = activeTab(path);
  const isShorts = tab === "shorts";
  const onMusic = isMusicRoute(path);
  const onKids = isKidsRoute(path);
  const onLive = isLiveRoute(path);
  const onYekLive = isYekLiveRoute(path);
  const onHome = tab === "home" && !onMusic && !onKids && !onLive && !onYekLive;
  const modules = useYektubeModules();
  const homeHref = ytRoutes.home();
  const { slot: homeHeaderSlot } = useMobileHomeHeaderSlot() ?? {};
  const musicPlayer = useOptionalMusicPlayer();
  const hasActiveMusic = Boolean(musicPlayer?.current);
  const embedMobileChrome = Boolean(embed);

  return (
    <div
      className={cn(
        "flex h-[100dvh] flex-col overflow-x-hidden",
        isWatch
          ? "overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          : // Yekçek + varsayılan (Video TV / anasayfa): dış kabuk kaymaz; yalnız <main> kayar,
            // böylece üst başlık ve alt menü flex ile sabit kalır (alt menü kaymaması için).
            "overflow-hidden",
        isShorts && "bg-black text-white",
        (onMusic || onKids || onLive || onYekLive) && "yt-app-bg",
        !isWatch && !isShorts && "yt-mobile-shell yt-app-bg",
      )}
    >
      {embedMobileChrome && !isShorts ? (
        <header className="yt-top-bar yt-panel z-30 shrink-0 border-b border-[var(--color-yt-border)]">
          <div className="yt-top-bar__row flex items-center gap-1 px-2">
            <button
              type="button"
              aria-label="Menü"
              onClick={onOpenNav}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href={homeHref}
              className={cn(
                "flex min-h-9 min-w-0 shrink-0 items-center px-1",
                isHmEmbedSurface() ? "yt-hm-brand-logo-wrap max-w-[11.5rem]" : "",
              )}
            >
              {isHmEmbedSurface() ? (
                <HmEmbedBrandLogo />
              ) : (
                <img src={yektubeAssetUrl("yektube-logo.png")} alt="Yektube" className="h-11 w-auto max-w-[13rem] object-contain object-left bg-transparent" />
              )}
            </Link>
            <div className="min-w-0 flex-1" />
            <button
              type="button"
              aria-label="Ara"
              onClick={onOpenSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
            >
              <Search className="h-5 w-5" />
            </button>
            <MemberAccountButton compact />
          </div>
        </header>
      ) : null}

      {!embedMobileChrome && !isWatch && !isShorts ? (
        <header className="yt-top-bar yt-panel shrink-0 border-b border-[var(--color-yt-border)]">
          {onHome ? (
            <>
              <div className="yt-top-bar__row flex items-center gap-1 px-2">
                <button
                  type="button"
                  aria-label="Menü"
                  onClick={onOpenNav}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <MobileHomeSearchBar inline />
                {!onMusic && !onKids && modules.music ? (
                  <Link
                    href={ytRoutes.music()}
                    aria-label="Müzik"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
                  >
                    <Music2 className="h-5 w-5" />
                  </Link>
                ) : null}
                {!onMusic && !onKids ? (
                  <Link
                    href={ytRoutes.kids()}
                    aria-label={kidsNavLabel()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
                  >
                    <Baby className="h-5 w-5" />
                  </Link>
                ) : null}
                <MemberAccountButton compact />
              </div>
              {homeHeaderSlot}
            </>
          ) : (
            <div className="yt-top-bar__row flex items-center gap-1 px-2">
              <button
                type="button"
                aria-label="Menü"
                onClick={onOpenNav}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-panel-hover"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <MobileHomeSearchBar inline />
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {!onMusic && !onKids && modules.music ? (
                  <Link
                    href={ytRoutes.music()}
                    aria-label="Müzik"
                    className="flex h-9 w-9 items-center justify-center rounded-full yt-panel-hover"
                  >
                    <Music2 className="h-5 w-5" />
                  </Link>
                ) : null}
                {!onMusic && !onKids ? (
                  <Link
                    href={ytRoutes.kids()}
                    aria-label={kidsNavLabel()}
                    className="flex h-9 w-9 items-center justify-center rounded-full yt-panel-hover"
                  >
                    <Baby className="h-5 w-5" />
                  </Link>
                ) : null}
                <button
                  type="button"
                  aria-label="Ara"
                  onClick={onOpenSearch}
                  className="flex h-9 w-9 items-center justify-center rounded-full yt-panel-hover"
                >
                  <Search className="h-5 w-5" />
                </button>
                <MemberAccountButton compact />
                {!embed && isYektubeDedicatedHost(window.location.hostname) ? (
                  <a
                    href={portalHref("/")}
                    className="hidden min-[380px]:inline rounded-full px-2 py-1 text-[10px] font-bold tracking-wide text-[var(--color-yt-muted)] yt-panel-hover"
                  >
                    YEKPARE
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </header>
      ) : null}

      {!embedMobileChrome && !isWatch && isShorts ? (
        <header className="yt-top-bar shrink-0 flex items-center justify-end px-2">
          <button
            type="button"
            aria-label="Ara"
            onClick={onOpenSearch}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>
      ) : null}

      {!isWatch && !isShorts && !embed ? <YektubePwaInstallBanner /> : null}

      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          isWatch ? "overflow-visible" : "min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          isShorts ? "bg-black" : "bg-[var(--color-yt-bg)]",
        )}
      >
        {children}
      </main>

      {(!isWatch || embedMobileChrome) && !isShorts && (onMusic || hasActiveMusic) ? <MusicMiniPlayer /> : null}

      {(embedMobileChrome || !isWatch) ? (
        <nav
          className={cn(
            "yt-bottom-nav yt-panel flex shrink-0 items-center justify-around border-t border-[var(--color-yt-border)]",
            isShorts && "border-[var(--color-yt-border)] bg-[var(--color-yt-surface)]",
          )}
          aria-label="Ana menü"
        >
          <TabLink
            href={homeHref}
            label="Ana Sayfa"
            icon={Home}
            active={tab === "home" && !onMusic && !onKids && !onLive && !onYekLive}
            filled
          />
          <TabLink href={ytRoutes.shorts()} label="Yekçek" icon={Clapperboard} active={path.includes("/yekcek")} />
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex min-w-0 flex-1 flex-col items-center py-1"
            aria-label="Oluştur"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-yt-border)] yt-panel text-[var(--color-yt-text)] shadow-sm">
              <Plus className="h-5 w-5" />
            </span>
          </button>
          {modules.music ? (
            <TabLink href={ytRoutes.music()} label="Müzik" icon={Music2} active={tab === "music"} />
          ) : (
            <TabLink
              href={ytRoutes.subscriptions()}
              label="Abonelikler"
              icon={PlaySquare}
              active={tab === "subscriptions"}
            />
          )}
          {!isShorts ? (
            <TabLink href={ytRoutes.kids()} label="Çocuk" icon={Baby} active={onKids} />
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
  filled,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  filled?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium",
        active ? "text-[var(--color-yt-text)]" : "text-[var(--color-yt-muted)]",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} fill={filled && active ? "currentColor" : "none"} />
      <span className="truncate px-0.5">{label}</span>
    </Link>
  );
}

function DesktopShell({
  children,
  path,
  onOpenSearch,
  embed,
  onOpenNav,
  onOpenCreate,
}: {
  children: ReactNode;
  path: string;
  onOpenSearch?: () => void;
  embed?: boolean;
  onOpenNav: () => void;
  onOpenCreate: () => void;
}) {
  const tab = activeTab(path);
  const isWatch = useIsWatchRoute(path);
  const homeHeaderSlot = useMobileHomeHeaderSlot()?.slot;
  const modules = useYektubeModules();
  const homeHref = ytRoutes.home();
  const { data: liveStatus } = useLiveStatusPoll();
  const liveCount = liveStatus?.totalLiveCount ?? 0;

  const navItems: Array<
    | { href: string; label: string; icon: typeof Home; id: YektubeTabId; external?: false }
    | { href: string; label: string; icon: typeof MonitorPlay; id: "studio"; external: true }
  > = [
    { href: homeHref, label: "Ana Sayfa", icon: Home, id: "home" as const },
    { href: ytRoutes.shorts(), label: "Yekçek", icon: Clapperboard, id: "shorts" as const },
    ...(modules.music
      ? [{ href: ytRoutes.music(), label: "Müzik", icon: Music2, id: "music" as const }]
      : []),
    { href: ytRoutes.kids(), label: kidsNavLabel(), icon: Baby, id: "kids" as const },
    ...(modules.live
      ? [
          { href: ytRoutes.live(), label: "Canlı Yayın", icon: Radio, id: "live" as const },
          { href: ytRoutes.yeklive(), label: "Yek Gönder", icon: Video, id: "yeklive" as const },
        ]
      : []),
    { href: ytRoutes.subscriptions(), label: "Abonelikler", icon: PlaySquare, id: "subscriptions" as const },
    { href: ytRoutes.categories(), label: "Kategoriler", icon: LayoutGrid, id: "categories" as const },
    { href: ytRoutes.library(), label: "Kütüphane", icon: CircleUser, id: "library" as const },
    { href: YEKTUBE_STUDIO_URL, label: "Yektube Studyo", icon: MonitorPlay, id: "studio" as const, external: true },
  ];

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden yt-app-bg">
      <aside className="sticky top-0 flex h-[100dvh] w-[240px] shrink-0 flex-col border-r border-[var(--color-yt-border)] px-3 py-2 yt-panel">
        <div className="mb-2 flex items-center gap-1 px-1">
          <button
            type="button"
            aria-label="Menüyü aç"
            onClick={onOpenNav}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full yt-panel-hover"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href={homeHref}
            className={cn("flex min-w-0 flex-1 items-center px-1", isHmEmbedSurface() && "yt-hm-brand-logo-wrap")}
          >
            {isHmEmbedSurface() ? (
              <HmEmbedBrandLogo />
            ) : (
              <img src={yektubeAssetUrl("yektube-logo.png")} alt="Yektube" className="h-10 w-auto max-w-[12rem] object-contain" />
            )}
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, id, external }) => {
            const active =
              !external &&
              (tab === id ||
                (id === "music" && isMusicRoute(path)) ||
                (id === "kids" && isKidsRoute(path)) ||
                (id === "live" && isLiveRoute(path)) ||
                (id === "yeklive" && isYekLiveRoute(path)));
            const cls = cn(
              "flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "yt-nav-active text-[var(--color-yt-text)]" : "text-[var(--color-yt-text)] yt-panel-hover",
            );
            const inner = (
              <>
                <span className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {id === "live" && liveCount > 0 ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-[var(--color-yt-bg)]"
                      title={`${liveCount} canlı yayın`}
                    />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {label}
                  {id === "live" && liveCount > 0 ? (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {liveCount > 99 ? "99+" : liveCount}
                    </span>
                  ) : null}
                </span>
              </>
            );
            if (external) {
              return (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              );
            }
            return (
              <Link key={href} href={href} className={cls}>
                {inner}
              </Link>
            );
          })}
          <SidebarStaticNavLinks path={path} variant="sidebar" />
        </nav>
        <div className="mt-auto shrink-0 space-y-2 border-t border-[var(--color-yt-border)] pt-3">
          {!embed ? <ThemeToggle /> : null}
          <SidebarFooterStaticNavLinks path={path} />
          {!embed ? (
            <a href={portalHref("/")} className="block rounded-xl px-3 py-2 text-sm text-[var(--color-yt-muted)] yt-panel-hover">
              ← Yekpare
            </a>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--color-yt-border)] yt-panel px-4 lg:px-6">
          <button
            type="button"
            onClick={onOpenSearch}
            className="yt-input flex max-w-xl flex-1 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm text-[var(--color-yt-muted)] hover:border-[var(--color-yt-border)]"
          >
            <Search className="h-4 w-4 shrink-0" />
            Video, kanal veya oynatma listesi ara…
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            className="hidden items-center gap-2 rounded-full border border-[var(--color-yt-border)] px-4 py-2 text-sm font-medium sm:flex yt-panel-hover"
          >
            <Plus className="h-4 w-4" />
            Oluştur
          </button>
          <ThemeToggle compact />
          <MemberAccountButton />
        </header>
        {isWatch && homeHeaderSlot ? (
          <div className="shrink-0 border-b border-[var(--color-yt-border)] yt-panel">{homeHeaderSlot}</div>
        ) : null}
        {!embed ? <YektubePwaInstallBanner /> : null}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/** HM embed — sol menü + yekpare.net/yp tarzı üst arama çubuğu (logo yalnızca menüde). */
function EmbedDesktopShell({
  children,
  dockNav = false,
  onOpenSearch,
  onOpenNav,
  onOpenCreate,
}: {
  children: ReactNode;
  path?: string;
  isWatch?: boolean;
  dockNav?: boolean;
  onOpenSearch?: () => void;
  onOpenNav: () => void;
  onOpenCreate: () => void;
}) {
  const musicPlayer = useOptionalMusicPlayer();
  const hasActiveMusic = Boolean(musicPlayer?.current);
  const homeHeaderSlot = useMobileHomeHeaderSlot()?.slot;

  return (
    <div className="flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden yt-app-bg">
      <div className="yt-embed-top-chrome shrink-0 border-b border-[var(--color-yt-border)] yt-panel">
        <header
          className={`flex h-14 items-center gap-2 px-3 lg:gap-3 ${dockNav ? "lg:px-6" : "lg:px-4"}`}
        >
          {!dockNav ? (
            <button
              type="button"
              aria-label="Menüyü aç"
              onClick={onOpenNav}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full yt-panel-hover"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenSearch}
            className={`yt-input flex items-center gap-2 rounded-full border py-2 text-left text-sm text-[var(--color-yt-muted)] hover:border-[var(--color-yt-border)] ${
              dockNav ? "max-w-xl flex-1 px-4" : "min-w-0 flex-1 px-3 lg:px-4"
            }`}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Video, kanal veya oynatma listesi ara…</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--color-yt-border)] px-4 py-2 text-sm font-medium sm:flex yt-panel-hover"
          >
            <Plus className="h-4 w-4" />
            Oluştur
          </button>
          <ThemeToggle compact />
          <MemberAccountButton />
        </header>
        {homeHeaderSlot ? (
          <div className="yt-embed-subheader shrink-0 border-t border-[var(--color-yt-border)]">{homeHeaderSlot}</div>
        ) : null}
      </div>
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        {children}
      </main>
      {hasActiveMusic ? <MusicMiniPlayer /> : null}
    </div>
  );
}

/** HM embed mobil müzik — oynatıcı + alt menü, boşluk olmadan */
function EmbedMobileMusicShell({
  children,
  path,
  onOpenNav: _onOpenNav,
  onOpenCreate,
}: {
  children: ReactNode;
  path: string;
  onOpenSearch?: () => void;
  onOpenNav: () => void;
  onOpenCreate: () => void;
}) {
  const tab = activeTab(path);
  const modules = useYektubeModules();
  const homeHref = ytRoutes.home();

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden yt-app-bg">
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        {children}
      </main>
      <MusicMiniPlayer />
      <nav
        className="yt-bottom-nav yt-panel flex shrink-0 items-center justify-around border-t border-[var(--color-yt-border)]"
        aria-label="Ana menü"
      >
        <TabLink href={homeHref} label="Ana Sayfa" icon={Home} active={tab === "home"} filled />
        <TabLink href={ytRoutes.shorts()} label="Yekçek" icon={Clapperboard} active={path.includes("/yekcek")} />
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex min-w-0 flex-1 flex-col items-center py-1"
          aria-label="Oluştur"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-yt-border)] yt-panel text-[var(--color-yt-text)] shadow-sm">
            <Plus className="h-5 w-5" />
          </span>
        </button>
        {modules.music ? (
          <TabLink href={ytRoutes.music()} label="Müzik" icon={Music2} active={tab === "music"} />
        ) : (
          <TabLink href={ytRoutes.subscriptions()} label="Abonelikler" icon={PlaySquare} active={tab === "subscriptions"} />
        )}
        <TabLink href={ytRoutes.kids()} label="Çocuk" icon={Baby} active={isKidsRoute(path)} />
      </nav>
    </div>
  );
}

/** Müzik — sidebar kapalı, hamburger ile NavDrawer; tam genişlik içerik + oynatıcı */
function DesktopMusicShell({
  children,
  embed: _embed,
  onOpenNav,
  onOpenCreate,
}: {
  children: ReactNode;
  path: string;
  embed?: boolean;
  onOpenNav: () => void;
  onOpenCreate: () => void;
}) {
  const homeHref = ytRoutes.home();

  return (
    <div className="yt-music-layout flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden yt-app-bg">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-yt-border)] yt-panel px-3 lg:px-4">
        <button
          type="button"
          aria-label="Menüyü aç"
          onClick={onOpenNav}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full yt-panel-hover"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href={homeHref} className="flex min-w-0 items-center gap-2">
          {_embed ? (
            <span className="text-sm font-semibold text-[var(--color-yt-text)]">Müzik</span>
          ) : (
            <>
              <img src={yektubeAssetUrl("yektube-logo.png")} alt="Yektube" className="h-10 w-auto max-w-[12rem] object-contain" />
              <span className="hidden text-sm font-semibold text-[var(--color-yt-text)] sm:inline">Müzik</span>
            </>
          )}
        </Link>
        <div className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onOpenCreate}
          className="hidden items-center gap-2 rounded-full border border-[var(--color-yt-border)] px-4 py-2 text-sm font-medium sm:flex yt-panel-hover"
        >
          <Plus className="h-4 w-4" />
          Oluştur
        </button>
        <ThemeToggle compact />
        <MemberAccountButton />
      </header>
      {!_embed ? <YektubePwaInstallBanner /> : null}
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        {children}
      </main>
      <MusicMiniPlayer />
    </div>
  );
}
