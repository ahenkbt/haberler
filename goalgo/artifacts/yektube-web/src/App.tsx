import { useState, useLayoutEffect } from "react";
import { Route, Switch, Router, Redirect, useLocation } from "wouter";
import {
  isYektubeDedicatedHost,
  isYektubePortalSurfaceHost,
  mapPathToYektubePortal,
  yektubeDedicatedPublicPath,
  YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH,
  YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH,
  YEKTUBE_USER_STUDIO_PATH,
} from "@workspace/yektube-core";
import { YektubeAppShell } from "@/shell/AppShell";
import { HomePage } from "@/features/home/HomePage";
import { ShortsPage } from "@/features/shorts/ShortsPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { SubscriptionsPage } from "@/features/subscriptions/SubscriptionsPage";
import { LibraryPage } from "@/features/library/LibraryPage";
import { SearchPage, SearchOverlay } from "@/features/search/SearchPage";
import { WatchPage } from "@/features/watch/WatchPage";
import { ChannelPage } from "@/features/watch/ChannelPage";
import { MusicPage } from "@/features/music/MusicPage";
import { KidsPage } from "@/features/kids/KidsPage";
import { LivePage } from "@/features/live/LivePage";
import { YekLivePage } from "@/features/yeklive/YekLivePage";
import { YekGonderBroadcastPage } from "@/features/yeklive/YekGonderBroadcastPage";
import { YekGonderWatchPage } from "@/features/yeklive/YekGonderWatchPage";
import { UserPanelPage } from "@/features/user/UserPanelPage";
import { TelifKullanimPageRoute, GenericStaticPageRoute } from "@/features/static-pages/StaticPageRoutes";
import { UserStudioRoutes } from "@/features/studio/UserStudioRoutes";
import { MusicProvider } from "@/features/music/MusicContext";
import { AdminRoutes } from "@/features/admin/AdminRoutes";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useYektubeModules } from "@/hooks/useYektubeModules";
import { ytMainRoute, ytRouterBase, ytRoutes } from "@/lib/routes";
import { markYektubeAppReady, useYektubePortalFallback } from "@/hooks/useYektubePortalFallback";

function MusicRoute() {
  const modules = useYektubeModules();
  if (!modules.music) return <Redirect to={ytRoutes.home()} />;
  return <MusicPage />;
}

function KidsRoute() {
  return <KidsPage />;
}

function LiveRoute() {
  const modules = useYektubeModules();
  if (!modules.live) return <Redirect to={ytRoutes.home()} />;
  return <LivePage />;
}

function YekGonderBroadcastRoute() {
  return <YekGonderBroadcastPage />;
}

function YekGonderWatchRoute() {
  return <YekGonderWatchPage />;
}

function YekLiveRoute() {
  return <YekLivePage />;
}

function UserPanelRoute() {
  return <UserPanelPage />;
}

function PublicRoutes() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector("main")?.scrollTo?.({ top: 0, behavior: "auto" });
  }, [location]);

  return (
    <MusicProvider>
      <YektubeAppShell onOpenSearch={() => setSearchOpen(true)}>
        <RouteErrorBoundary label="public">
          <Switch>
          <Route path="/muzik" component={MusicRoute} />
          <Route path="/cocuk" component={KidsRoute} />
          <Route path="/yp/canli/kanal/:channelId" component={LiveRoute} />
          <Route path="/yp/canli" component={LiveRoute} />
          <Route path="/tr/canli/kanal/:channelId" component={LiveRoute} />
          <Route path="/tr/canli" component={LiveRoute} />
          <Route path={`${ytMainRoute("/canli")}/kanal/:channelId`} component={LiveRoute} />
          <Route path={`${ytMainRoute("/canli")}/yayin/:sessionId`} component={YekGonderWatchRoute} />
          <Route path="/canli/yayin/:sessionId" component={YekGonderWatchRoute} />
          <Route path={ytMainRoute("/canli")} component={LiveRoute} />
          <Route path="/canli/kanal/:channelId" component={LiveRoute} />
          <Route path="/canli" component={LiveRoute} />
          <Route path="/yek-gonder/yayin" component={YekGonderBroadcastRoute} />
          <Route path={`${ytMainRoute("/yek-gonder")}/yayin`} component={YekGonderBroadcastRoute} />
          <Route path="/yeklive/yayin" component={YekGonderBroadcastRoute} />
          <Route path="/yek-gonder" component={YekLiveRoute} />
          <Route path="/yeklive" component={YekLiveRoute} />
          <Route path={ytMainRoute("/yek-gonder")} component={YekLiveRoute} />
          <Route path={ytMainRoute("/yeklive")} component={YekLiveRoute} />
          <Route path="/hesabim" component={UserPanelRoute} />
          <Route path={ytMainRoute("/hesabim")} component={UserPanelRoute} />
          <Route path={ytMainRoute("/")} component={HomePage} />
          <Route path="/yp" component={HomePage} />
          <Route path={ytMainRoute("/yekcek")} component={ShortsPage} />
          <Route path="/yekcek" component={ShortsPage} />
          <Route path="/tr/yekcek" component={ShortsPage} />
          <Route path={ytMainRoute("/abonelikler")} component={SubscriptionsPage} />
          <Route path="/abonelikler" component={SubscriptionsPage} />
          <Route path="/tr/abonelikler" component={SubscriptionsPage} />
          <Route path={ytMainRoute("/kategoriler")} component={CategoriesPage} />
          <Route path="/kategoriler" component={CategoriesPage} />
          <Route path="/tr/kategoriler" component={CategoriesPage} />
          <Route path={ytMainRoute("/kutuphane")} component={LibraryPage} />
          <Route path="/kutuphane" component={LibraryPage} />
          <Route path="/tr/kutuphane" component={LibraryPage} />
          <Route path={ytMainRoute("/telif-kullanim")} component={TelifKullanimPageRoute} />
          <Route path="/telif-kullanim" component={TelifKullanimPageRoute} />
          <Route path={ytMainRoute("/sayfa/:slug")} component={GenericStaticPageRoute} />
          <Route path="/sayfa/:slug" component={GenericStaticPageRoute} />
          <Route path={ytMainRoute("/ara")} component={SearchPage} />
          <Route path="/ara" component={SearchPage} />
          <Route path="/tr/ara" component={SearchPage} />
          <Route path="/kanal/:channelId/:videoId" component={WatchPage} />
          <Route path={`${ytMainRoute("/kanal")}/:channelId/:videoId`} component={WatchPage} />
          <Route path="/kanal/:channelId" component={ChannelPage} />
          <Route path={`${ytMainRoute("/kanal")}/:channelId`} component={ChannelPage} />
          <Route>
            <Redirect to={ytRoutes.home()} />
          </Route>
          </Switch>
        </RouteErrorBoundary>
      </YektubeAppShell>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </MusicProvider>
  );
}

function AppRoutes() {
  const [path] = useLocation();
  if (path.startsWith("/admin") || path.startsWith(`${yektubeDedicatedPublicPath()}/admin`)) {
    return <AdminRoutes />;
  }
  if (
    path.startsWith("/studio") ||
    path.startsWith(YEKTUBE_USER_STUDIO_PATH) ||
    path.startsWith(ytMainRoute("/studio"))
  ) {
    return <UserStudioRoutes />;
  }
  return <PublicRoutes />;
}

/** yektube.com kök yolları + yekpare → yektube.com yönlendirmesi */
function useFixLegacyPaths() {
  useLayoutEffect(() => {
    const { pathname, search, hash, hostname } = window.location;

    if (!isYektubeDedicatedHost(hostname)) {
      if (isYektubePortalSurfaceHost(hostname)) {
        if (
          pathname === "/yektube-v2" ||
          pathname.startsWith("/yektube-v2/") ||
          pathname === "/yektube" ||
          pathname.startsWith("/yektube/")
        ) {
          window.location.replace(mapPathToYektubePortal(pathname, search) + hash);
          return;
        }
        const main = yektubeDedicatedPublicPath();
        if (pathname === main) {
          window.history.replaceState(null, "", `${main}/${search}${hash}`.replace(/\/\?/, "?"));
        }
      }
      return;
    }

    const doubled = "/yektube-v2/yektube-v2";
    if (pathname.includes(doubled)) {
      window.location.replace(pathname.replace(doubled, "/yektube-v2") + search + hash);
      return;
    }

    const main = yektubeDedicatedPublicPath();
    if (pathname === main) {
      window.history.replaceState(null, "", `${main}/${search}${hash}`.replace(/\/\?/, "?"));
      return;
    }
    if (pathname === "/" || pathname === "") {
      window.location.replace(`${main}/${search}${hash}`.replace(/\/\?/, "?"));
      return;
    }
    if (pathname === YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH || pathname.startsWith(`${YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH}/`)) {
      window.location.replace(pathname.replace(/^\/tr(?=\/|$)/, main) + search + hash);
      return;
    }
    if (pathname === YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH || pathname.startsWith(`${YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH}/`)) {
      window.location.replace(pathname.replace(/^\/yeklive(?=\/|$)/, "/yek-gonder") + search + hash);
      return;
    }
    if (pathname === "/v2" || pathname.startsWith("/v2/")) {
      window.location.replace(pathname.replace(/^\/v2/, main) + search + hash);
    }
  }, []);
}

export default function App() {
  useFixLegacyPaths();
  useYektubePortalFallback();
  useLayoutEffect(() => {
      markYektubeAppReady();
      (window as Window & { __YEKTUBE_READY__?: boolean }).__YEKTUBE_READY__ = true;
  }, []);
  const routerBase = ytRouterBase();
  return (
    <Router base={routerBase}>
      <AppRoutes />
    </Router>
  );
}
