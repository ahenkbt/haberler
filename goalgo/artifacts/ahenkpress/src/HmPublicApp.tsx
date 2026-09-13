import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { Redirect, Route, Router, Switch, useLocation, useParams } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { MemberBroadcastStrip } from "./components/MemberBroadcastStrip";
import { MemberProvider } from "./context/MemberContext";
import MemberModal from "./components/MemberModal";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { HmCustomDomainPathRedirect } from "./components/HmCustomDomainPathRedirect";
import { useHmCustomDomainLocation } from "@/hooks/useHmCustomDomainLocation";
import { HmPortalOrDomainStandardPage } from "./components/HmPortalOrDomainStandardPage";
import HmSitePublic from "./pages/public/HmSitePublic";
import HmPublicExtraPageSlugRoute from "./pages/public/HmPublicExtraPageSlugRoute";
import HmPublicHaberDetayRoute from "./pages/public/HmPublicHaberDetayRoute";
import { HmShortHaberPathRedirect } from "./components/HmShortHaberPathRedirect";
import HmPublicKategoriRoute from "./pages/public/HmPublicKategoriRoute";
import HmPublicTumHaberlerRoute from "./pages/public/HmPublicTumHaberlerRoute";
import HmPublicSonDakikaRoute from "./pages/public/HmPublicSonDakikaRoute";
import HmPublicKisaKisaRoute from "./pages/public/HmPublicKisaKisaRoute";
import HmPublicRssNewsPreviewRoute from "./pages/public/HmPublicRssNewsPreviewRoute";
import HmPublicAraRoute from "./pages/public/HmPublicAraRoute";
import HmPublicYazarlarRoute from "./pages/public/HmPublicYazarlarRoute";
import HmPublicYazarYazilariRoute from "./pages/public/HmPublicYazarYazilariRoute";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { YekparePortalHubOnlyRoute } from "./components/YekparePortalHubOnlyRoute";
import HmRedirectToSonDakika from "./pages/public/HmRedirectToSonDakika";
import HmLegacySayfaRedirect from "./pages/public/HmLegacySayfaRedirect";
import { RouteChunkFallback } from "./components/RouteChunkFallback";
import { hmPwaManifestApiPath } from "./lib/hmPublicLinks";
import { HM_PUBLIC_EDITOR_WILDCARD_PATH } from "./lib/hmPublicEditorRoute";
import { markHmSpaReady } from "./lib/hmSpaReady";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";
import KunyePage from "./pages/public/KunyePage";
import HakkindaPage from "./pages/public/HakkindaPage";
import ReklamPage from "./pages/public/ReklamPage";
import AbonelikPage from "./pages/public/AbonelikPage";
import Iletisim from "./pages/public/Iletisim";

const HmEditorRoutes = lazy(() => import("./routes/HmEditorRoutes"));
const HmPublicVideoTvRoute = lazy(() => import("./pages/public/HmPublicVideoTvRoute"));
const HmPublicVideoTvLayoutMod = lazy(() =>
  import("./pages/public/HmPublicVideoTvLayout").then((m) => ({ default: m.HmPublicVideoTvLayout })),
);
const FotoGaleriPublic = lazy(() => import("./pages/public/FotoGaleriPublic"));
const HaberGonder = lazy(() => import("./pages/public/HaberGonder"));
const HmAtaturkCornerPage = lazy(() => import("./pages/public/HmAtaturkCornerPage"));
const HmCorporateWarsPage = lazy(() =>
  import("./pages/public/HmCorporateHeritagePages").then((m) => ({ default: m.HmCorporateWarsPage })),
);
const HmCorporateNationalDaysPage = lazy(() =>
  import("./pages/public/HmCorporateHeritagePages").then((m) => ({ default: m.HmCorporateNationalDaysPage })),
);
const HmCorporateCulturePortalPage = lazy(() =>
  import("./pages/public/HmCorporateHeritagePages").then((m) => ({ default: m.HmCorporateCulturePortalPage })),
);
const TalepFormu = lazy(() => import("./pages/public/TalepFormu"));
const HmYemekTarifleriPage = lazy(() => import("./pages/public/HmYemekTarifleriPage"));
const HmPublicRssLinksRoute = lazy(() => import("./pages/public/HmPublicRssLinksRoute"));
const HmPublicSiteneEkleRoute = lazy(() => import("./pages/public/HmPublicSiteneEkleRoute"));
const HaberEmbedWidget = lazy(() => import("./pages/public/HaberEmbedWidget"));
const HmPublicNewsmapRoute = lazy(() => import("./pages/public/HmPublicNewsmapRoute"));
const Ansiklopedi = lazy(() => import("./pages/public/Ansiklopedi"));
const AnsiklopediKategori = lazy(() => import("./pages/public/AnsiklopediKategori"));
const AnsiklopediDetay = lazy(() => import("./pages/public/AnsiklopediDetay"));
const YazarGiris = lazy(() => import("./pages/public/YazarGiris"));
const YazarSifremiUnuttum = lazy(() => import("./pages/public/YazarSifremiUnuttum"));
const YazarSifreYenileHm = lazy(() => import("./pages/public/YazarSifreYenileHm"));
const YazarHaberler = lazy(() => import("./pages/public/YazarHaberler"));
const YazarSifre = lazy(() => import("./pages/public/YazarSifre"));
const HaberEditor = lazy(() => import("./pages/admin/HaberEditor"));
const HmAuthorRoute = lazy(() =>
  import("./components/HmAuthorRoute").then((m) => ({ default: m.HmAuthorRoute })),
);

function HmPublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="sade-public-root flex min-h-[100dvh] min-w-0 w-full max-w-full flex-col overflow-x-clip bg-white">
      <main className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip">
        <MemberBroadcastStrip />
        {children}
      </main>
    </div>
  );
}

function LazyChunk({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteChunkFallback />}>{children}</Suspense>;
}

function HmTrVideoTvPathAliasRedirect() {
  const [location] = useLocation();
  if (!location.includes("/video-tv")) return <Redirect to="/" replace />;
  return <Redirect to={location.replace("/video-tv", "/video")} replace />;
}

/** App.tsx ile aynı: eski `/tr/:slug/ansiklopedi…` → `/tr/:slug/bilgiagaci…`. */
function LegacyHmAnsiklopediRedirect() {
  const [location] = useLocation();
  const next = location.replace(/^(\/tr\/[^/?#]+)\/ansiklopedi/i, "$1/bilgiagaci");
  return <Redirect to={next} replace />;
}

/** App.tsx ile aynı: `/tr/:slug/haritalar` → `/tr/:slug/newsmap` (hub dışı alanlarda vitrine döner). */
function HmHaritalarToNewsmapRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = encodeURIComponent(String(params.slug ?? ""));
  const [location] = useLocation();
  const query = location.includes("?") ? `?${location.split("?").slice(1).join("?")}` : "";
  return <Redirect to={`/tr/${slug}/newsmap${query}`} replace />;
}

/** HM özel alan vitrini — portal/turizm/ajans yığını yok. */
export default function HmPublicApp() {
  useYekpareTheme();

  useLayoutEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) return;
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    link.href = hmPwaManifestApiPath(host);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => markHmSpaReady(), 8_000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <CustomerAuthProvider>
      <MemberProvider>
        <MemberModal />
        <Router hook={useHmCustomDomainLocation}>
          <HmCustomDomainPathRedirect />
          <Switch>
            {/* `/editor/*` — `:rest*` is one segment and misses /haberler/yeni */}
            <Route path={HM_PUBLIC_EDITOR_WILDCARD_PATH}>
              {() => (
                <LazyChunk>
                  <HmEditorRoutes />
                </LazyChunk>
              )}
            </Route>
            <Route path="/editor">
              {() => (
                <LazyChunk>
                  <HmEditorRoutes />
                </LazyChunk>
              )}
            </Route>
            <Route path="/tr/:slug/haber/:id">
              {() => (
                <HmPublicShell>
                  <HmPublicHaberDetayRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/makale/:id">
              {() => (
                <HmPublicShell>
                  <HmPublicHaberDetayRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/kategori/:catSlug">
              {() => (
                <HmPublicShell>
                  <HmPublicKategoriRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/sondakika">
              {() => (
                <HmPublicShell>
                  <HmPublicSonDakikaRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/kisa-kisa">
              {() => (
                <HmPublicShell>
                  <HmPublicKisaKisaRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/tum-haberler">
              {() => (
                <HmPublicShell>
                  <HmPublicTumHaberlerRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/haberler/rss/:itemId">
              {() => (
                <HmPublicShell>
                  <HmPublicRssNewsPreviewRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazarlar">
              {() => (
                <HmPublicShell>
                  <HmPublicYazarlarRoute />
                </HmPublicShell>
              )}
            </Route>
            {/* Yazar portalı — `/yazar/:authorKey`'den önce gelmeli. */}
            <Route path="/tr/:slug/yazar/giris">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <YazarGiris />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/sifremi-unuttum">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <YazarSifremiUnuttum />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/sifre-yenile">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <YazarSifreYenileHm />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/haberler">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmAuthorRoute>
                        <YazarHaberler />
                      </HmAuthorRoute>
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/sifre">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmAuthorRoute>
                        <YazarSifre />
                      </HmAuthorRoute>
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/haber/:id">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmAuthorRoute>
                        <HaberEditor />
                      </HmAuthorRoute>
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yazar/:authorKey">
              {() => (
                <HmPublicShell>
                  <HmPublicYazarYazilariRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/etiket/:tagSlug">
              {() => (
                <HmPublicShell>
                  <HmRedirectToSonDakika />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/etiketler/:tagSlug">
              {() => (
                <HmPublicShell>
                  <HmRedirectToSonDakika />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/tag/:tagSlug">
              {() => (
                <HmPublicShell>
                  <HmRedirectToSonDakika />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/rss-baglantilari">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicRssLinksRoute />
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/sitene-ekle">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicSiteneEkleRoute />
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/embed/haber">
              {() => (
                <LazyChunk>
                  <HaberEmbedWidget />
                </LazyChunk>
              )}
            </Route>
            <Route path="/tr/:slug/sayfa/:pageSlug">
              {() => (
                <HmPublicShell>
                  <HmLegacySayfaRedirect />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/ara">
              {() => (
                <HmPublicShell>
                  <HmPublicAraRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/foto-galeri/:id">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <FotoGaleriPublic />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/foto-galeri">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <FotoGaleriPublic />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/haber-gonder">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HaberGonder />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            {/* Kurumsal miras sayfaları — segmentler HM_RESERVED_HM_ROUTE_SEGMENTS'te; `/tr/:slug/:pageSlug`'a düşmemeli. */}
            <Route path="/tr/:slug/savaslar/:warSlug">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmCorporateWarsPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/savaslar">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmCorporateWarsPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/milli-gunler">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmCorporateNationalDaysPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/kultur-portali">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmCorporateCulturePortalPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/ataturk/:pageSlug">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmAtaturkCornerPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/ataturk">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmAtaturkCornerPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/yemek-tarifleri">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <HmYemekTarifleriPage />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/talep-formu">
              {() => (
                <HmPublicShell>
                  <HmNestedLayout>
                    <LazyChunk>
                      <TalepFormu />
                    </LazyChunk>
                  </HmNestedLayout>
                </HmPublicShell>
              )}
            </Route>
            {/* Bilgi Ağacı / Newsmap yalnızca hub'da; özel alanda YekparePortalHubOnlyRoute vitrine yönlendirir (chunk yüklenmez). */}
            <Route path="/tr/:slug/bilgiagaci/kategori/:categorySlug">
              {() => (
                <YekparePortalHubOnlyRoute>
                  <HmPublicShell>
                    <HmNestedLayout>
                      <LazyChunk>
                        <AnsiklopediKategori />
                      </LazyChunk>
                    </HmNestedLayout>
                  </HmPublicShell>
                </YekparePortalHubOnlyRoute>
              )}
            </Route>
            <Route path="/tr/:slug/bilgiagaci/:wikiSlug">
              {() => (
                <YekparePortalHubOnlyRoute>
                  <HmPublicShell>
                    <HmNestedLayout>
                      <LazyChunk>
                        <AnsiklopediDetay />
                      </LazyChunk>
                    </HmNestedLayout>
                  </HmPublicShell>
                </YekparePortalHubOnlyRoute>
              )}
            </Route>
            <Route path="/tr/:slug/bilgiagaci">
              {() => (
                <YekparePortalHubOnlyRoute>
                  <HmPublicShell>
                    <HmNestedLayout>
                      <LazyChunk>
                        <Ansiklopedi />
                      </LazyChunk>
                    </HmNestedLayout>
                  </HmPublicShell>
                </YekparePortalHubOnlyRoute>
              )}
            </Route>
            <Route path="/tr/:slug/ansiklopedi/kategori/:categorySlug">{() => <LegacyHmAnsiklopediRedirect />}</Route>
            <Route path="/tr/:slug/ansiklopedi/:wikiSlug">{() => <LegacyHmAnsiklopediRedirect />}</Route>
            <Route path="/tr/:slug/ansiklopedi">{() => <LegacyHmAnsiklopediRedirect />}</Route>
            <Route path="/tr/:slug/haritalar">{() => <HmHaritalarToNewsmapRedirect />}</Route>
            <Route path="/tr/:slug/newsmap">
              {() => (
                <HmPublicShell>
                  <YekparePortalHubOnlyRoute>
                    <LazyChunk>
                      <HmPublicNewsmapRoute />
                    </LazyChunk>
                  </YekparePortalHubOnlyRoute>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/video-tv/:rest*">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
            <Route path="/tr/:slug/video-tv">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
            <Route path="/tr/:slug/video/:rest*">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicVideoTvLayoutMod>
                      <HmPublicVideoTvRoute />
                    </HmPublicVideoTvLayoutMod>
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/video">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicVideoTvLayoutMod>
                      <HmPublicVideoTvRoute />
                    </HmPublicVideoTvLayoutMod>
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/videolar/:rest*">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicVideoTvLayoutMod>
                      <HmPublicVideoTvRoute />
                    </HmPublicVideoTvLayoutMod>
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/videolar">
              {() => (
                <HmPublicShell>
                  <LazyChunk>
                    <HmPublicVideoTvLayoutMod>
                      <HmPublicVideoTvRoute />
                    </HmPublicVideoTvLayoutMod>
                  </LazyChunk>
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug/:pageSlug">
              {() => (
                <HmPublicShell>
                  <HmPublicExtraPageSlugRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tr/:slug">
              {() => (
                <HmPublicShell>
                  <HmSitePublic />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/haber/:id">
              {() => (
                <HmPublicShell>
                  <HmPublicHaberDetayRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/makale/:id">
              {() => (
                <HmPublicShell>
                  <HmPublicHaberDetayRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/kategori/:slug">
              {() => (
                <HmPublicShell>
                  <HmPublicKategoriRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/sondakika">
              {() => (
                <HmPublicShell>
                  <HmPublicSonDakikaRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/tum-haberler">
              {() => (
                <HmPublicShell>
                  <HmPublicTumHaberlerRoute />
                </HmPublicShell>
              )}
            </Route>
            <Route path="/kunye">
              {() => (
                <HmPortalOrDomainStandardPage segment="kunye">
                  <KunyePage />
                </HmPortalOrDomainStandardPage>
              )}
            </Route>
            <Route path="/hakkinda">
              {() => (
                <HmPortalOrDomainStandardPage segment="hakkinda">
                  <HakkindaPage />
                </HmPortalOrDomainStandardPage>
              )}
            </Route>
            <Route path="/reklam">
              {() => (
                <HmPortalOrDomainStandardPage segment="reklam">
                  <ReklamPage />
                </HmPortalOrDomainStandardPage>
              )}
            </Route>
            <Route path="/abonelik">
              {() => (
                <HmPortalOrDomainStandardPage segment="abonelik">
                  <AbonelikPage />
                </HmPortalOrDomainStandardPage>
              )}
            </Route>
            <Route path="/iletisim">
              {() => (
                <HmPortalOrDomainStandardPage segment="iletisim">
                  <Iletisim />
                </HmPortalOrDomainStandardPage>
              )}
            </Route>
            <Route path="/:siteSlug/haber/:id">{() => <HmShortHaberPathRedirect />}</Route>
            <Route path="/">
              {() => (
                <HmPublicShell>
                  <HmSitePublic />
                </HmPublicShell>
              )}
            </Route>
          </Switch>
        </Router>
        <Toaster />
      </MemberProvider>
    </CustomerAuthProvider>
  );
}
