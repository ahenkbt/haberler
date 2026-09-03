import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Switch, Route, Redirect, useLocation, useParams, useRoute, useSearch, Router } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { isConfiguredPortalHost, isEffectivePortalHost, isHmVideoTvAllowed } from "@/lib/hmPortalHosts";
import { isAhenkAgencyHost, isAhenkAgencyPublicPath, isAhenkAgencySurface } from "@/lib/ahenkAgencyHost";
import {
  isPortalNewsPlatformHost,
  isPortalRetiredPublicPath,
  portalRetiredPublicRedirectTarget,
} from "@/lib/portalPlatformPolicy";
import { isHmVideoTvShortPublicPath } from "@/lib/hmVideoTvPublicPaths";
import { readHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import { YekparePortalHubOnlyRoute } from "./components/YekparePortalHubOnlyRoute";
import { applyHmSiteVerificationMeta } from "@/lib/pageSeo";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import ChatBubble from "./components/ChatBubble";
import YekpareAiChat from "./components/YekpareAiChat";
import { resolveFloatingWidgetVisibility } from "@/lib/floatingWidgetVisibility";
import { AppEntryLocationPrompt } from "./components/AppEntryLocationPrompt";
import { legacyMapsPathToCanonicalHref } from "@/lib/haritalarNav";
import { RouteChunkFallback } from "./components/RouteChunkFallback";
import { Toaster } from "@/components/ui/toaster";
import { APP_MOBILE_BOTTOM_NAV_HEIGHT } from "./components/AppNav";
import { MemberBroadcastStrip } from "./components/MemberBroadcastStrip";
import { MemberProvider } from "./context/MemberContext";
import MemberModal from "./components/MemberModal";
import { SiteGeolocationWarmup } from "./components/SiteGeolocationWarmup";
import { ApiConnectivityBanner } from "./components/ApiConnectivityBanner";
import { PortalSeoSync } from "./components/PortalSeoSync";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { SearchEnginePublicChrome } from "@/components/SearchEnginePublicChrome";
import { shouldSkipSearchEnginePublicChrome } from "@/lib/searchEngineNav";
import { YektubeStandaloneRoute } from "@/components/YektubeV2Gateway";
import { YektubeDedicatedHostGate } from "@/components/YektubeDedicatedHostRedirect";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";

import HaberEditor from "./pages/admin/HaberEditor";
import Login from "./pages/admin/Login";
import AgentLogin from "./pages/agent/AgentLogin";
import AgentPanel from "./pages/agent/AgentPanel";

import HmPortalOrHmDomainHome from "./components/HmPortalOrHmDomainHome";
import { HmCustomDomainPathRedirect } from "./components/HmCustomDomainPathRedirect";
import { useHmCustomDomainLocation } from "@/hooks/useHmCustomDomainLocation";
import { VendorCustomDomainPathRedirect } from "./components/VendorCustomDomainPathRedirect";
import { isVendorStandaloneHost } from "@/lib/vendorThemes";
import { HmPortalOrDomainStandardPage } from "./components/HmPortalOrDomainStandardPage";
import HaberAnasayfasi from "./pages/public/HaberAnasayfasi";
import KategoriDetay from "./pages/public/KategoriDetay";
import CanliTv from "./pages/public/CanliTv";
import YektubeCanliTvPage from "./pages/public/YektubeCanliTvPage";
import VideoTvChannel from "./pages/public/VideoTvChannel";
import {
  LegacyVideoTvKanalRedirect,
  VideoGaleriToYektubeRedirect,
  YektubeLegacySectionRedirect,
  YektubePlaylistRedirect,
  YektubeRootRedirect,
  HmYektubePlaylistRedirect,
} from "./pages/public/YektubeRedirects";
import Yazarlar from "./pages/public/Yazarlar";
import TumHaberler from "./pages/public/TumHaberler";
import HaberGonder from "./pages/public/HaberGonder";
import TalepFormu from "./pages/public/TalepFormu";
import FotoGaleriPublic from "./pages/public/FotoGaleriPublic";
import ResmiIlanlarPublic from "./pages/public/ResmiIlanlarPublic";
import LisansAktivasyonu from "./pages/public/LisansAktivasyonu";
import Hesabim from "./pages/public/Hesabim";
import SariSayfalarHub from "./pages/public/SariSayfalarHub";
import SariSayfalarDetay from "./pages/public/SariSayfalarDetay";
import FirmaRehberi, { FirmaRehberiListe } from "./pages/public/FirmaRehberi";
import FirmaRehberiPaneli from "./pages/public/FirmaRehberiPaneli";
import IsletmeDetay from "./pages/public/IsletmeDetay";
import IsletmePaneli from "./pages/public/IsletmePaneli";
import BilgiSayfasi from "./pages/public/BilgiSayfasi";
import SiteHaritalari from "./pages/public/SiteHaritalari";
import IsletmeBasvuru from "./pages/public/IsletmeBasvuru";
import IsletmeGiris from "./pages/public/IsletmeGiris";
import ServisSaglayiciGiris from "./pages/public/ServisSaglayiciGiris";
import SifreSifirla from "./pages/public/SifreSifirla";
import SifreYenile from "./pages/public/SifreYenile";
import IsOrtagi from "./pages/public/IsOrtagi";
import IsOrtagiBasvuru from "./pages/public/IsOrtagiBasvuru";
import Kariyer from "./pages/public/Kariyer";
import PremiumBasarili from "./pages/public/PremiumBasarili";
import Iletisim from "./pages/public/Iletisim";
import AhenkAgencyHome from "./pages/public/AhenkAgencyHome";
import AhenkAgencyHizmetler from "./pages/public/AhenkAgencyHizmetler";
import AhenkAgencyHizmetDetail from "./pages/public/AhenkAgencyHizmetDetail";
import AhenkAgencyHakkimizda from "./pages/public/AhenkAgencyHakkimizda";
import AhenkAgencyIletisim from "./pages/public/AhenkAgencyIletisim";
import AhenkAgencyYazilim from "./pages/public/AhenkAgencyYazilim";
import AhenkAgencyYazilimDetail from "./pages/public/AhenkAgencyYazilimDetail";
import AhenkAgencyAjans from "./pages/public/AhenkAgencyAjans";
import AhenkAgencyHaberMerkezi from "./pages/public/AhenkAgencyHaberMerkezi";
import AhenkAgencyYekpare from "./pages/public/AhenkAgencyYekpare";
import AhenkHaberSitesiLanding from "./pages/public/AhenkHaberSitesiLanding";
import { AHENK_HUB_PATHS, AHENK_SLUG_ALIASES } from "@/lib/ahenkAgencySeo";
import UstaPaneli from "./pages/public/UstaPaneli";
import ServisElemanPaneli from "./pages/public/ServisElemanPaneli";
import Kasiyer from "./pages/public/Kasiyer";
import Ansiklopedi from "./pages/public/Ansiklopedi";
import AnsiklopediKategori from "./pages/public/AnsiklopediKategori";
import AnsiklopediDetay from "./pages/public/AnsiklopediDetay";
import UygulamayiIndir from "./pages/public/UygulamayiIndir";
import PwaStore from "./pages/public/PwaStore";
import { hmPwaManifestApiPath } from "./lib/hmPublicLinks";
import TurizmListe from "./pages/public/TurizmListe";
import TurizmDetay from "./pages/public/TurizmDetay";
import BookingCoreHome from "./themes/bookingcore/pages/BookingCoreHome";
import KonaklamaHome, {
  YatTurlariHome,
  VillaEvHome,
  TurlarHome,
  AracKiralamaHome,
  EtkinlikHome,
  UcusHome,
  ServisHome,
} from "./themes/bookingcore/pages/KonaklamaHome";
import BookingCoreRezervasyonOnay from "./themes/bookingcore/pages/BookingCoreRezervasyonOnay";
import BookingCoreDestinasyonlar, {
  BookingCoreDestinasyonDetay,
} from "./themes/bookingcore/pages/BookingCoreDestinasyonlar";
import { TurizmSubNavBar } from "./themes/turizm/TurizmSubNavBar";
import { TURIZM, pageOwnsTurizmSubNav } from "./themes/turizm/turizmRoutes";
import { TurizmPageErrorBoundary } from "./themes/turizm/TurizmPageErrorBoundary";
import { TurizmBlogDetailPage, TurizmBlogListPage } from "./themes/turizm/TurizmBlogPages";
import { TurizmEtkinlikDetailPage } from "./themes/bookingcore/pages/TurizmEtkinlikDetailPage";
import TurizmSssPage from "./themes/turizm/TurizmSssPage";
import Destek from "./pages/public/Destek";
import {
  MesafeliSatisSozlesmesiPage,
  OnBilgilendirmePage,
  KvkkPage,
  IadeDegisimPage,
  TeslimatKargoPage,
  KullanimKosullariPage,
  SssPage,
  IletisimKunyePage,
} from "./pages/public/legalPages";
import KunyePage from "./pages/public/KunyePage";
import HakkindaPage from "./pages/public/HakkindaPage";
import ReklamPage from "./pages/public/ReklamPage";
import AbonelikPage from "./pages/public/AbonelikPage";
import TelifKullanimPage from "./pages/public/TelifKullanimPage";
import Habermerkezi from "./pages/public/Habermerkezi";
import UcretsizHaberSitesiLanding from "./pages/public/UcretsizHaberSitesiLanding";
import AiCagriMerkeziLanding from "./pages/public/AiCagriMerkeziLanding";
import HmSitePublic from "./pages/public/HmSitePublic";
import HmPublicExtraPageSlugRoute from "./pages/public/HmPublicExtraPageSlugRoute";
import HmLegacySayfaRedirect from "./pages/public/HmLegacySayfaRedirect";
import HmRedirectToSonDakika from "./pages/public/HmRedirectToSonDakika";
import HmAtaturkCornerPage from "./pages/public/HmAtaturkCornerPage";
import HmYemekTarifleriPage from "./pages/public/HmYemekTarifleriPage";
import {
  HmCorporateCulturePortalPage,
  HmCorporateNationalDaysPage,
  HmCorporateWarsPage,
} from "./pages/public/HmCorporateHeritagePages";
import { HmPublicVideoTvLayout } from "./pages/public/HmPublicVideoTvLayout";
import { HmVideoTvEnabledGate } from "./components/HmVideoTvEnabledGate";
import HmPublicVideoTvRoute from "./pages/public/HmPublicVideoTvRoute";
import { HmEditorRoute } from "./components/HmEditorRoute";
import EditorDashboard from "./pages/editor/EditorDashboard";
import EditorHaberler from "./pages/editor/EditorHaberler";
import EditorYekpareHaberleri from "./pages/editor/EditorYekpareHaberleri";
import EditorIletisim from "./pages/editor/EditorIletisim";
import EditorPostaKutusu from "./pages/editor/EditorPostaKutusu";
import EditorBlog from "./pages/editor/EditorBlog";
import EditorMakaleler from "./pages/editor/EditorMakaleler";
import EditorHmMakale from "./pages/editor/EditorHmMakale";
import EditorKoseYazarlari from "./pages/editor/EditorKoseYazarlari";
import EditorFotoGaleri from "./pages/editor/EditorFotoGaleri";
import EditorVideoGaleri from "./pages/editor/EditorVideoGaleri";
import EditorVideoTvYonetimi from "./pages/editor/EditorVideoTvYonetimi";
import EditorMedya from "./pages/editor/EditorMedya";
import EditorGenelAyarlari from "./pages/editor/EditorGenelAyarlari";
import EditorReklamAlanlari from "./pages/editor/EditorReklamAlanlari";
import EditorManset from "./pages/editor/EditorManset";
import EditorKategoriler from "./pages/editor/EditorKategoriler";
import EditorSayfalar from "./pages/editor/EditorSayfalar";
import EditorVitrinAyarlari from "./pages/editor/EditorVitrinAyarlari";
import EditorMenuler from "./pages/editor/EditorMenuler";
import EditorWordPressImport from "./pages/editor/EditorWordPressImport";
import EditorWordPressTemplatePages from "./pages/editor/EditorWordPressTemplatePages";
import EditorGiris from "./pages/editor/EditorGiris";
import EditorProfil from "./pages/editor/EditorProfil";
import EditorRssKampanyalari from "./pages/editor/EditorRssKampanyalari";
import EditorRssKampanyaEditor from "./pages/editor/EditorRssKampanyaEditor";
import EditorRssLoglar from "./pages/editor/EditorRssLoglar";
import SiteneEkle from "./pages/public/SiteneEkle";
import HmOrPortalHaberDetailRoute from "./pages/public/HmOrPortalHaberDetailRoute";
import HmPublicHaberDetayRoute from "./pages/public/HmPublicHaberDetayRoute";
import { HmShortHaberPathRedirect } from "./components/HmShortHaberPathRedirect";
import HmPublicKategoriRoute from "./pages/public/HmPublicKategoriRoute";
import HmPublicTumHaberlerRoute from "./pages/public/HmPublicTumHaberlerRoute";
import HmPublicSonDakikaRoute from "./pages/public/HmPublicSonDakikaRoute";
import HmPublicKisaKisaRoute from "./pages/public/HmPublicKisaKisaRoute";
import DunyadanKisaKisaPage from "./pages/public/DunyadanKisaKisaPage";
import HmPublicRssNewsPreviewRoute from "./pages/public/HmPublicRssNewsPreviewRoute";
import HmPublicRssLinksRoute from "./pages/public/HmPublicRssLinksRoute";
import HmPublicSiteneEkleRoute from "./pages/public/HmPublicSiteneEkleRoute";
import { HmPortalOrDomainAraRoute } from "./components/HmPortalOrDomainAraRoute";
import HmPublicAraRoute from "./pages/public/HmPublicAraRoute";
import HmPublicYazarlarRoute from "./pages/public/HmPublicYazarlarRoute";
import HmPublicYazarYazilariRoute from "./pages/public/HmPublicYazarYazilariRoute";
import YazarAuthorRoute from "./pages/public/YazarAuthorRoute";
import YazarGiris from "./pages/public/YazarGiris";
import YazarHaberler from "./pages/public/YazarHaberler";
import YazarSifre from "./pages/public/YazarSifre";
import YazarSifremiUnuttum from "./pages/public/YazarSifremiUnuttum";
import YazarSifreYenileHm from "./pages/public/YazarSifreYenileHm";
import { HmAuthorRoute } from "./components/HmAuthorRoute";
import HaberEmbedWidget from "./pages/public/HaberEmbedWidget";
import HmPartnerPublicShell, { partnerSiteIdFromLocation } from "@/components/HmPartnerPublicShell";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { isHmSitePublicChromePath } from "@/lib/hmSitePublicPath";
import { HmLegacyPublicRedirect } from "@/components/HmLegacyPublicRedirect";
import { HmAnsiklopediPublicWrap } from "@/components/HmAnsiklopediPublicWrap";
import YekpareSadeHome from "./pages/public/YekpareSadeHome";
import SearchEngineHomePage from "./pages/public/SearchEngineHomePage";
import YekpareLandingHome from "./pages/public/YekpareLandingHome";
import ServicesMarketingOverview from "./pages/public/services/ServicesMarketingOverview";
import ServiceMarketingDetail from "./pages/public/services/ServiceMarketingDetail";
import {
  SixAmMartHomeModulePage,
  SixAmMartNewsDetailPage,
  SixAmMartNewsPage,
  type SixAmMartModuleKey,
} from "@/themes/sixammart/SixAmMartTheme";
import { PortalRssNewsPreviewPage } from "./pages/public/PortalRssNewsPreviewPage";

const ServisSaglayiciPaneli = lazy(() => import("./pages/public/ServisSaglayiciPaneli"));
const TurizmSaglayiciPaneli = lazy(() => import("./pages/public/TurizmSaglayiciPaneli"));
const AdminRoutes = lazy(() => import("./routes/AdminRoutes"));
const HaritalarFullscreenRoute = lazy(() => import("./pages/public/HaritalarFullscreenRoute"));
const NewsmapRoute = lazy(() => import("./pages/public/NewsmapRoute"));
const KesfetDiscoverHub = lazy(() => import("./pages/public/KesfetDiscoverHub"));
const KesfetListingHub = lazy(() => import("./pages/public/KesfetListingHub"));
const HmPublicNewsmapRoute = lazy(() => import("./pages/public/HmPublicNewsmapRoute"));

function ProviderPanelFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
    </div>
  );
}

function LazyProviderPanel({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ProviderPanelFallback />}>{children}</Suspense>;
}

function LazyRouteChunk({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteChunkFallback />}>{children}</Suspense>;
}

function SixAmMartHomeModuleRedirect() {
  const [location] = useLocation();
  const query = new URLSearchParams(location.split("?")[1] ?? "");
  const module = String(query.get("module") || "").toLowerCase();
  if (module === "shop") return <Redirect to="/" />;
  return <SixAmMartHomeModulePage />;
}

function LegacyAnsiklopediRedirect() {
  const [location] = useLocation();
  const suffix = location.replace(/^\/ansiklopedi/i, "") || "";
  return <Redirect to={`/bilgiagaci${suffix}`} replace />;
}

function LegacyHmAnsiklopediRedirect() {
  const [location] = useLocation();
  const next = location.replace(/^(\/tr\/[^/?#]+)\/ansiklopedi/i, "$1/bilgiagaci");
  return <Redirect to={next} replace />;
}

function LegacyFullscreenMapRedirect() {
  const [location] = useLocation();
  const query = location.includes("?") ? `?${location.split("?").slice(1).join("?")}` : "";
  return <Redirect to={`/map${query}`} replace />;
}

function HmHaritalarToNewsmapRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = encodeURIComponent(String(params.slug ?? ""));
  const [location] = useLocation();
  const query = location.includes("?") ? `?${location.split("?").slice(1).join("?")}` : "";
  return <Redirect to={`/tr/${slug}/newsmap${query}`} replace />;
}

/** Eski `/maps/place/…/@lat,lng,13z` başlantılarını kanonik `/maps?city=…&lat=…` biçimine yönlendir. */
function LegacyMapsPlaceRedirect() {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/";
  const existingQuery = location.includes("?") ? location.split("?").slice(1).join("?") : "";
  const canonical = legacyMapsPathToCanonicalHref(path, existingQuery);
  if (canonical) return <Redirect to={canonical} replace />;
  return <Redirect to={`/maps${existingQuery ? `?${existingQuery}` : ""}`} replace />;
}

function isKesfetBusinessDetailPath(path: string): boolean {
  if (
    path === "/kesfet" ||
    path === "/kesfet/liste" ||
    path.startsWith("/kesfet/premium") ||
    path.startsWith("/kesfet/sarisayfalar")
  ) {
    return false;
  }
  return path.startsWith("/kesfet/");
}

function isVendorStorefrontPath(path: string): boolean {
  return (
    /^\/turizm\/(?:konaklama|villa-ev|arac-kiralama|yat-turlari|hotel|car|boat|villa|[^/]+)\/[^/]+(?:\/.*)?$/.test(path)
  );
}

/** Turizm / Seyahat — turk.eco’da kaldırıldı. */
function TurizmRoute({ children }: { children: React.ReactNode }) {
  void children;
  return <Redirect to="/" replace />;
}

/** ahenk.net.tr — mesafeli satış / KVKK / SSS vb. e-ticaret sayfaları yok. */
function AhenkRemovedLegalPage({ children }: { children: React.ReactNode }) {
  if (isAhenkAgencyHost()) return <Redirect to="/" replace />;
  return <>{children}</>;
}

function TurizmLegacyTypeRedirect() {
  return <Redirect to="/" replace />;
}

function isPwaStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function PublicLayout({
  children,
  active,
  searchPlaceholder,
  fullBleed,
  footerVariant = "default",
}: {
  children: React.ReactNode;
  active?: SixAmMartModuleKey;
  searchPlaceholder?: string;
  fullBleed?: boolean;
  footerVariant?: "default" | "turizm";
}) {
  const [loc] = useLocation();
  const pathOnly = (loc.split("?")[0] ?? "").trim();
  const hideSiteChrome = isKesfetBusinessDetailPath(pathOnly) && isPwaStandaloneDisplay();
  const vendorStandalone =
    typeof window !== "undefined" &&
    (isVendorStorefrontPath(pathOnly) || isVendorStandaloneHost());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = (window.location.hostname || "").toLowerCase();
    if (!isEffectivePortalHost(host)) return;
    fetch(apiUrl("/api/public/portal-seo"), { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.seoVerification) applyHmSiteVerificationMeta(d.seoVerification);
      })
      .catch(() => {});
  }, []);

  if (hideSiteChrome || vendorStandalone) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-white">
        <div
          className="flex flex-1 flex-col min-h-0"
          style={{ paddingBottom: `calc(${APP_MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}
        >
          <main className="flex min-h-0 flex-1 flex-col">
            <MemberBroadcastStrip />
            {children}
          </main>
        </div>
      </div>
    );
  }

  if (shouldSkipSearchEnginePublicChrome(pathOnly)) {
    return (
      <>
        <PortalSeoSync />
        <div className="flex min-h-[100dvh] flex-col bg-white">
          <main className="flex min-h-0 flex-1 flex-col">
            <MemberBroadcastStrip />
            {children}
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <PortalSeoSync />
      <SearchEnginePublicChrome
        searchPlaceholder={searchPlaceholder}
        fullBleed={fullBleed}
        footerVariant={footerVariant}
      >
        <MemberBroadcastStrip />
        {children}
      </SearchEnginePublicChrome>
    </>
  );
}

type VendorDomainRouteMeta = {
  slug: string;
  storefrontPath: string;
  shortPath?: string;
  providerType?: string;
  vendorType?: string;
};

function VendorCustomDomainShortStorefrontRoute() {
  const params = useParams<{ vendorShortPath?: string }>();
  const [meta, setMeta] = useState<VendorDomainRouteMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const shortFromPath = String(params.vendorShortPath ?? "").trim();

  useEffect(() => {
    if (!host || isConfiguredPortalHost(host)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(apiUrl(`/api/vendors/meta/by-domain?domain=${encodeURIComponent(host)}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setMeta(d);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen grid place-items-center text-sm text-slate-500">Mağaza yükleniyor...</div>
      </PublicLayout>
    );
  }

  const expectedShort = String(meta?.shortPath ?? "").replace(/^\/+/, "");
  if (!meta?.slug || !expectedShort || expectedShort !== shortFromPath) return null;
  if (meta.storefrontPath.startsWith("/siparis/")) {
    return <Redirect to="/" />;
  }
  if (meta.storefrontPath.startsWith("/alisveris/")) {
    return <Redirect to="/" />;
  }
  return null;
}

/** `siteId` / `hmSiteId` varken Yekpare üst-alt chrome yerine haber sitesi şeridi. */
function HmPartnerOrPublicLayout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const sid = useMemo(() => partnerSiteIdFromLocation(loc), [loc]);
  if (sid != null) return <HmPartnerPublicShell>{children}</HmPartnerPublicShell>;
  return <PublicLayout>{children}</PublicLayout>;
}

function SadeAwarePublicLayout({
  children,
  chrome = false,
  fullBleed = false,
  active,
  searchPlaceholder,
  /** Turizm gibi rotalarda eski PublicLayout'a düşülmez — her zaman arama chrome */
  forceSade = false,
  footerVariant = "default",
  subHeader,
  subHeaderInHero = false,
}: {
  children: React.ReactNode;
  chrome?: boolean;
  fullBleed?: boolean;
  active?: SixAmMartModuleKey;
  searchPlaceholder?: string;
  forceSade?: boolean;
  footerVariant?: "default" | "turizm";
  subHeader?: React.ReactNode;
  subHeaderInHero?: boolean;
}) {
  const [loc] = useLocation();
  const pathOnly = (loc.split("?")[0] ?? "").trim();

  if (shouldSkipSearchEnginePublicChrome(pathOnly)) {
    return <>{children}</>;
  }

  if (chrome || forceSade) {
    return (
      <SearchEnginePublicChrome
        searchPlaceholder={searchPlaceholder}
        fullBleed={fullBleed}
        footerVariant={footerVariant}
        subHeader={subHeader}
        subHeaderInHero={subHeaderInHero}
      >
        {children}
      </SearchEnginePublicChrome>
    );
  }
  return <>{children}</>;
}

function SariSayfalarHubRoute() {
  const [location] = useLocation();
  return (
    <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Firma, sektör veya şehir ara">
      <SariSayfalarHub key={location} />
    </SadeAwarePublicLayout>
  );
}

function SariSayfalarDetayRoute() {
  const [location] = useLocation();
  return (
    <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Firma, sektör veya şehir ara">
      <SariSayfalarDetay key={location} />
    </SadeAwarePublicLayout>
  );
}

function KesfetDiscoverHubRoute() {
  const search = useSearch();
  if (search.trim()) {
    return <Redirect to={`/ara${search.startsWith("?") ? search : `?${search}`}`} replace />;
  }
  return (
    <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Keşfet merkezi">
      <LazyRouteChunk>
        <KesfetDiscoverHub />
      </LazyRouteChunk>
    </SadeAwarePublicLayout>
  );
}

function KesfetListingRoute() {
  const search = useSearch();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const q = (params.get("q") ?? "").trim();
  const hasOnlyTextSearch =
    Boolean(q) &&
    !params.get("city") &&
    !params.get("citySlug") &&
    !params.get("category") &&
    !params.get("categoryId") &&
    !params.get("superCategory") &&
    !params.get("directoryCategory") &&
    !params.get("country");
  if (hasOnlyTextSearch) {
    return <Redirect to={`/ara?q=${encodeURIComponent(q)}`} replace />;
  }
  return (
    <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="ışletme, hizmet veya adres ara">
      <LazyRouteChunk>
        <KesfetListingHub />
      </LazyRouteChunk>
    </SadeAwarePublicLayout>
  );
}

/** HM özel alanında `/yektube/...` → site Video TV (`/video/...`, site logosu). */
function HmYektubeAliasOrPortal({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const cachedSlug = host && !isConfiguredPortalHost(host) ? readHmDomainSlugCache(host) : undefined;
  const { data } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !!host && !isConfiguredPortalHost(host),
    retry: false,
  });
  const slug = data?.slug ?? cachedSlug;
  if (typeof window !== "undefined" && loc.startsWith("/yektube") && isHmVideoTvShortPublicPath(host, slug)) {
    return <Redirect to={loc.replace(/^\/yektube/, "/video")} replace />;
  }
  return <>{children}</>;
}

/** `/tr/:slug/video-tv/...` → `/tr/:slug/video/...` (site markalı Video TV). */
function HmTrVideoTvPathAliasRedirect() {
  const [location] = useLocation();
  if (!location.includes("/video-tv")) return <Redirect to="/" replace />;
  return <Redirect to={location.replace("/video-tv", "/video")} replace />;
}

/** Kök `/video` — KH özel alanında doğrudan Video TV kabuğu; portalda /yektube. */
function HmRootVideoRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  if (isHmVideoTvAllowed(host, null)) {
    return (
      <HmVideoTvPublicShell>
        <HmPublicVideoTvRoute />
      </HmVideoTvPublicShell>
    );
  }
  return (
    <HmPortalOrDomainStandardPage segment="video">
      <HmVideoTvRouteGate>
        <Redirect to="/yektube" />
      </HmVideoTvRouteGate>
    </HmPortalOrDomainStandardPage>
  );
}

/** KH `/video/playlist/:id` → `/video/kanal/:id` */
function KhVideoPlaylistRedirect() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  if (!id) return null;
  if (videoId) return <Redirect to={`/video/kanal/${id}/${encodeURIComponent(videoId)}`} />;
  return <Redirect to={`/video/kanal/${id}`} />;
}
/** Video TV — turk.eco hub + Kırşehir Haber (kh) özel alanı. */
function HmVideoTvRouteGate({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug?: string }>();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const slug = String(params.slug ?? "").trim() || null;
  if (!isHmVideoTvAllowed(host, slug)) {
    const redirectTo = slug ? `/tr/${encodeURIComponent(slug)}` : "/";
    return <Redirect to={redirectTo} replace />;
  }
  return <>{children}</>;
}

/** Haber sitesi Video TV — tek HM kabuğu, çift menü yok. */
function HmVideoTvPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <HmVideoTvRouteGate>
      <HmPublicShell>
        <HmPublicVideoTvLayout>
          <HmVideoTvEnabledGate>{children}</HmVideoTvEnabledGate>
        </HmPublicVideoTvLayout>
      </HmPublicShell>
    </HmVideoTvRouteGate>
  );
}

/** Haber merkezi vitrinleri — üst AppNav ve alt SiteFooter olmadan (white-label). */
function HmPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sade-public-root flex min-h-[100dvh] min-w-0 w-full max-w-full flex-col overflow-x-clip bg-white">
      <main className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip">
        <MemberBroadcastStrip />
        {children}
      </main>
    </div>
  );
}

/** Kök yol: ahenk.net.tr ajans vitrini; diğer portal hostlarında arama motoru anasayfası. */
function PortalHomeRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  if (isAhenkAgencyHost(host)) {
    return <AhenkAgencyHome />;
  }
  if (host && !isConfiguredPortalHost(host)) {
    return <HmPortalOrHmDomainHome />;
  }
  return <YekpareSadeHome />;
}

function isKesfetRoute(pathnameWithQuery: string): boolean {
  const p = pathnameWithQuery.split("?")[0] ?? "";
  return p === "/kesfet" || p.startsWith("/kesfet/");
}

function decodeHashId(hash: string): string {
  const raw = hash.replace(/^#/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function scrollToHashTarget(hash: string): boolean {
  const id = decodeHashId(hash);
  if (!id) return false;

  const namedElement = document.getElementsByName(id)[0] as HTMLElement | undefined;
  const target = document.getElementById(id) ?? namedElement;
  if (!target) return false;

  target.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}

function RouteScrollRestoration() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return undefined;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    let raf = 0;
    let timeout = 0;
    let attempts = 0;

    const scrollRoute = () => {
      const hash = window.location.hash;
      if (hash) {
        if (scrollToHashTarget(hash)) return;
        if (attempts < 6) {
          attempts += 1;
          timeout = window.setTimeout(scrollRoute, 50);
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    raf = window.requestAnimationFrame(scrollRoute);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [location]);

  return null;
}

/** turk.eco: keşfet, turizm, harita pazaryeri, ödeme vb. rotaları haber vitrinine yönlendir. */
function PortalNewsPlatformRouteGate() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isPortalNewsPlatformHost()) return;
    const pathOnly = (location.split("?")[0] ?? "").trim();
    if (isAhenkAgencyHost() && isAhenkAgencyPublicPath(pathOnly)) return;
    if (!isPortalRetiredPublicPath(pathOnly)) return;
    const target = portalRetiredPublicRedirectTarget(pathOnly);
    if (target !== pathOnly) setLocation(target);
  }, [location, setLocation]);
  return null;
}

export default function App() {
  useYekpareTheme();
  const [location] = useLocation();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  const { chatBubble: showChatBubble, yekpareAi: showYekpareAi } = resolveFloatingWidgetVisibility(location);
  const showPwaInstallBanner =
    !pathNoQuery.startsWith("/pwastore") &&
    !pathNoQuery.startsWith("/uygulamayi-indir") &&
    !isHmSitePublicChromePath(pathNoQuery) &&
    !isAhenkAgencySurface(pathNoQuery) &&
    !isPwaStandaloneDisplay();

  useLayoutEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) return;
    const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
    if (!isConfiguredPortalHost(host)) {
      // Same-origin manifest (Edge /api vekili); apiUrl(Railway) start_url kökünü bozar.
      link.href = hmPwaManifestApiPath(host);
    } else {
      link.href = "/manifest.json";
    }
  }, []);

  return (
    <CustomerAuthProvider>
    <MemberProvider>
    <MemberModal />
    <AppEntryLocationPrompt />
    <SiteGeolocationWarmup />
    <ApiConnectivityBanner />
    <>
    <YektubeDedicatedHostGate>
    <Router hook={useHmCustomDomainLocation}>
    <HmCustomDomainPathRedirect />
    <VendorCustomDomainPathRedirect />
    <RouteScrollRestoration />
    <PortalNewsPlatformRouteGate />
    <Switch>
      {/* Public routes — all wrapped with AppNav */}
      <Route path="/servisler/:slug">{() => <ServiceMarketingDetail />}</Route>
      <Route path="/servisler">{() => <ServicesMarketingOverview />}</Route>
      <Route path="/demo">{() => <SearchEngineHomePage />}</Route>
      <Route path="/eski">{() => <YekpareLandingHome />}</Route>
      <Route path="/home-classic">{() => <YekpareLandingHome />}</Route>
      <Route path="/hizmetler">{() => (isAhenkAgencyHost() ? <AhenkAgencyHizmetler /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/hizmetlerimiz">{() => (isAhenkAgencyHost() ? <AhenkAgencyHizmetler /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/hizmet/:slug">{() => (isAhenkAgencyHost() ? <AhenkAgencyHizmetDetail /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/icerik/:slug">{() => (isAhenkAgencyHost() ? <AhenkAgencyHizmetDetail /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/yazilim/:slug">{() => (isAhenkAgencyHost() ? <AhenkAgencyYazilimDetail /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/yazilim">{() => (isAhenkAgencyHost() ? <AhenkAgencyYazilim /> : <Redirect to="/haberler" />)}</Route>
      {AHENK_HUB_PATHS.map((p) => (
        <Route key={p} path={p}>
          {() => (isAhenkAgencyHost() ? <AhenkAgencyYazilim /> : <Redirect to="/haberler" />)}
        </Route>
      ))}
      {Object.keys(AHENK_SLUG_ALIASES).map((p) => (
        <Route key={p} path={p}>
          {() => (isAhenkAgencyHost() ? <AhenkAgencyYazilimDetail /> : <Redirect to="/haberler" />)}
        </Route>
      ))}
      <Route path="/ajans">{() => (isAhenkAgencyHost() ? <AhenkAgencyAjans /> : <Redirect to="/haberler" />)}</Route>
      <Route path="/haber-merkezi">{() => (isAhenkAgencyHost() ? <AhenkAgencyHaberMerkezi /> : <Redirect to="/habermerkezi" />)}</Route>
      <Route path="/yekpare">{() => (isAhenkAgencyHost() ? <AhenkAgencyYekpare /> : <Redirect to="/" />)}</Route>
      <Route path="/hakkimizda">{() => (isAhenkAgencyHost() ? <AhenkAgencyHakkimizda /> : <Redirect to="/" />)}</Route>
      <Route path="/">{() => <PortalHomeRoute />}</Route>
      <Route path="/home">{() => <SixAmMartHomeModuleRedirect />}</Route>
      {/* Canlı Yayın TV playlist — parametreli rotalar önce */}
      <Route path="/canlitv/kanal/:id">{() => <YektubeStandaloneRoute><YektubeCanliTvPage /></YektubeStandaloneRoute>}</Route>
      <Route path="/canlitv">{() => <YektubeStandaloneRoute><YektubeCanliTvPage /></YektubeStandaloneRoute>}</Route>
      {/* Yektube — parametreli rotalar önce (wouter ilk eşleşen kazanır) */}
      <Route path="/yektube/kanal/:id/:videoId">
        {() => (
          <HmYektubeAliasOrPortal>
            <YektubeStandaloneRoute>
              <VideoTvChannel />
            </YektubeStandaloneRoute>
          </HmYektubeAliasOrPortal>
        )}
      </Route>
      <Route path="/yektube/kanal/:id">
        {() => (
          <HmYektubeAliasOrPortal>
            <YektubeStandaloneRoute>
              <VideoTvChannel />
            </YektubeStandaloneRoute>
          </HmYektubeAliasOrPortal>
        )}
      </Route>
      <Route path="/yektube/playlist/:id/:videoId">{() => <YektubePlaylistRedirect />}</Route>
      <Route path="/yektube/playlist/:id">{() => <YektubePlaylistRedirect />}</Route>
      <Route path="/yektube/:section/:category">
        {() => (
          <HmYektubeAliasOrPortal>
            <YektubeStandaloneRoute>
              <>
                <YektubeLegacySectionRedirect />
                <CanliTv />
              </>
            </YektubeStandaloneRoute>
          </HmYektubeAliasOrPortal>
        )}
      </Route>
      <Route path="/yektube/:section">
        {() => (
          <HmYektubeAliasOrPortal>
            <YektubeStandaloneRoute>
              <>
                <YektubeLegacySectionRedirect />
                <CanliTv />
              </>
            </YektubeStandaloneRoute>
          </HmYektubeAliasOrPortal>
        )}
      </Route>
      <Route path="/yektube">
        {() => (
          <HmYektubeAliasOrPortal>
            <YektubeStandaloneRoute>
              <CanliTv />
            </YektubeStandaloneRoute>
          </HmYektubeAliasOrPortal>
        )}
      </Route>
      <Route path="/canli-tv">{() => <Redirect to="/canlitv" />}</Route>
      <Route path="/embed/haber">{() => <HaberEmbedWidget />}</Route>
      <Route path="/sitene-ekle">{() => <SadeAwarePublicLayout chrome searchPlaceholder="Yekpare'de yayın ve işletme ara"><SiteneEkle /></SadeAwarePublicLayout>}</Route>
      <Route path="/haberler/rss/:itemId">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme, ürün veya haber ara"><PortalRssNewsPreviewPage /></SadeAwarePublicLayout>}</Route>
      <Route path="/haberler">{() => <SixAmMartNewsPage />}</Route>
      <Route path="/sondakika">{() => <HmPartnerOrPublicLayout><TumHaberler view="list" /></HmPartnerOrPublicLayout>}</Route>
      <Route path="/kisa-kisa">{() => <DunyadanKisaKisaPage />}</Route>
      <Route path="/tum-haberler">{() => <HmPartnerOrPublicLayout><TumHaberler /></HmPartnerOrPublicLayout>}</Route>
      <Route path="/haber/:id">{() => <HmOrPortalHaberDetailRoute />}</Route>
      <Route path="/makale/:id">{() => <HmOrPortalHaberDetailRoute />}</Route>
      <Route path="/kategori/:slug">{() => <PublicLayout><KategoriDetay /></PublicLayout>}</Route>
      <Route path="/video-tv/kanal/:id/:videoId">{() => <LegacyVideoTvKanalRedirect />}</Route>
      <Route path="/video-tv/kanal/:id">{() => <LegacyVideoTvKanalRedirect />}</Route>
      <Route path="/video/canlitv/kanal/:id">
        {() => (
          <HmVideoTvPublicShell>
            <YektubeCanliTvPage />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/canlitv">
        {() => (
          <HmVideoTvPublicShell>
            <YektubeCanliTvPage />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/kanal/:id/:videoId">
        {() => (
          <HmVideoTvPublicShell>
            <VideoTvChannel />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/kanal/:id">
        {() => (
          <HmVideoTvPublicShell>
            <VideoTvChannel />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/playlist/:id/:videoId">
        {() => (
          <HmVideoTvPublicShell>
            <KhVideoPlaylistRedirect />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/playlist/:id">
        {() => (
          <HmVideoTvPublicShell>
            <KhVideoPlaylistRedirect />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/ara">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/:section/:category">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video/:section">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/video">{() => <HmRootVideoRoute />}</Route>
      <Route path="/video-tv">
        {() => (
          <HmPortalOrDomainStandardPage segment="video-tv">
            <HmVideoTvRouteGate>
              <Redirect to="/yektube" />
            </HmVideoTvRouteGate>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/alisveris">{() => <Redirect to="/" />}</Route>
      <Route path="/alisveris/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/magaza">{() => <Redirect to="/" />}</Route>
      <Route path="/magaza/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/odeme">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis-takip/:code">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis-takip">{() => <Redirect to="/" />}</Route>
      <Route path="/siparislerim">{() => <Redirect to="/" />}</Route>
      {/* Sipariş (yemek/market) modülü kaldırıldı — eski URL’ler anasayfaya; takip sayfaları aşağıda */}
      <Route path="/siparis/qr-menu/:slug">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis/qr-menu/:slug/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/konumagore">{() => <Redirect to="/kesfet/liste" />}</Route>
      <Route path="/konumagore/:rest*">{() => <Redirect to="/kesfet/liste" />}</Route>
      <Route path="/yemek">{() => <Redirect to="/" />}</Route>
      <Route path="/yemek/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/market">{() => <Redirect to="/" />}</Route>
      <Route path="/market/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/isletmeler">{() => <Redirect to="/kesfet/liste" />}</Route>
      <Route path="/isletmeler/:rest*">{() => <Redirect to="/kesfet/liste" />}</Route>
      <Route path="/siparis/satici/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis/isletme/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/siparis">{() => <Redirect to="/" />}</Route>
      <Route path="/yazarlar">{() => (
        <HmPortalOrDomainStandardPage segment="yazarlar">
          <HmPartnerOrPublicLayout><Yazarlar /></HmPartnerOrPublicLayout>
        </HmPortalOrDomainStandardPage>
      )}</Route>
      <Route path="/yazar/:authorKey">{() => <HmPartnerOrPublicLayout><YazarAuthorRoute /></HmPartnerOrPublicLayout>}</Route>
      <Route path="/foto-galeri/:id">{() => <PublicLayout><FotoGaleriPublic /></PublicLayout>}</Route>
      <Route path="/foto-galeri">{() => <PublicLayout><FotoGaleriPublic /></PublicLayout>}</Route>
      <Route path="/video-galeri/:id" component={VideoGaleriToYektubeRedirect} />
      <Route path="/video-galeri">{() => <YektubeRootRedirect />}</Route>
      <Route path="/seri-ilanlar/:id">{() => <Redirect to="/" />}</Route>
      <Route path="/seri-ilanlar">{() => <Redirect to="/" />}</Route>
      <Route path="/sari-sayfalar">{() => <Redirect to="/" />}</Route>
      <Route path="/resmi-ilanlar">{() => <PublicLayout><ResmiIlanlarPublic /></PublicLayout>}</Route>
      <Route path="/lisans-aktivasyon">{() => <PublicLayout><LisansAktivasyonu /></PublicLayout>}</Route>
      <Route path={/^\/maps\/place\/[^/]+\/(?:@|%40)[^/?#]*$/i}>{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path={/^\/maps\/(?:@|%40)[^/?#]*$/i}>{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path={/^\/maps\/?$/}>{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path={/^\/map\/?$/}>{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path="/maps">{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path="/map">{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path="/haritalar/tam-ekran">{() => <Redirect to="/newsmap" replace />}</Route>
      <Route path="/haritalar">{() => <Redirect to="/newsmap" />}</Route>
      <Route path="/newsmap">{() => (
        <YekparePortalHubOnlyRoute>
          <LazyRouteChunk><NewsmapRoute /></LazyRouteChunk>
        </YekparePortalHubOnlyRoute>
      )}</Route>
      <Route path="/kesfet/premium-basarili">{() => <Redirect to="/" />}</Route>
      <Route path="/kesfet/sarisayfalar/:id">{() => <Redirect to="/" />}</Route>
      <Route path="/kesfet/sarisayfalar">{() => <Redirect to="/" />}</Route>
      <Route path="/ara">{() => <HmPortalOrDomainAraRoute />}</Route>
      <Route path="/kesfet/liste">{() => <Redirect to="/" />}</Route>
      <Route path="/kesfet/isletme/:id">{() => <Redirect to="/" />}</Route>
      <Route path="/kesfet/:slug">{() => <Redirect to="/" />}</Route>
      <Route path="/isletme-paneli/:id">{() => <PublicLayout><IsletmePaneli /></PublicLayout>}</Route>
      <Route path="/isletme-paneli">{() => <PublicLayout><IsletmePaneli /></PublicLayout>}</Route>
      <Route path="/isletme-basvuru">{() => <SadeAwarePublicLayout chrome searchPlaceholder="Başvuru ve işletme ara"><IsletmeBasvuru /></SadeAwarePublicLayout>}</Route>
      <Route path="/isletme-giris">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme hesabı ara"><IsletmeGiris /></SadeAwarePublicLayout>}</Route>
      <Route path="/servis-saglayici-giris">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme hesabı ara"><ServisSaglayiciGiris /></SadeAwarePublicLayout>}</Route>
      <Route path="/turizm-saglayici-giris">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Turizm sağlayıcı hesabı ara">
            <ServisSaglayiciGiris
              title="Turizm Saşlayıcı Girişi"
              subtitle="Otel, tur ve kiralama işletme panelinize erişin"
              backHref="/servisler/turizm"
              backLabel="Turizm servisi tanıtımına dön"
            />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/firma-rehberi-paneli">{() => <PublicLayout><FirmaRehberiPaneli /></PublicLayout>}</Route>
      <Route path="/servis-saglayici-paneli">{() => <LazyProviderPanel><ServisSaglayiciPaneli /></LazyProviderPanel>}</Route>
      <Route path="/turizm-paneli">{() => <LazyProviderPanel><TurizmSaglayiciPaneli /></LazyProviderPanel>}</Route>
      <Route path="/sifre-sifirla">{() => <PublicLayout searchPlaceholder="Hesap veya işletme ara"><SifreSifirla /></PublicLayout>}</Route>
      <Route path="/sifre-yenile">{() => <PublicLayout searchPlaceholder="Hesap veya işletme ara"><SifreYenile /></PublicLayout>}</Route>
      <Route path="/kesfet">{() => <Redirect to="/" />}</Route>
      <Route path="/gezi-seyahat">{() => <Redirect to="/" replace />}</Route>
      <Route path="/firma-rehberi/urunler">{() => <Redirect to="/" />}</Route>
      <Route path="/firma-rehberi/hizmetler">{() => <Redirect to="/" />}</Route>
      <Route path="/firma-rehberi/ilanlar">{() => <Redirect to="/" />}</Route>
      <Route path="/firma-rehberi">{() => <Redirect to="/" />}</Route>
      <Route path="/bilgiagaci/kategori/:categorySlug">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmAnsiklopediPublicWrap>
              <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Bilgi Ağacı'nda ara…">
                <AnsiklopediKategori />
              </SadeAwarePublicLayout>
            </HmAnsiklopediPublicWrap>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/bilgiagaci/:wikiSlug">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmAnsiklopediPublicWrap>
              <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Bilgi Ağacı'nda ara…">
                <AnsiklopediDetay />
              </SadeAwarePublicLayout>
            </HmAnsiklopediPublicWrap>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/bilgiagaci">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmAnsiklopediPublicWrap>
              <SadeAwarePublicLayout chrome fullBleed searchPlaceholder="Bilgi Ağacı'nda ara…">
                <Ansiklopedi />
              </SadeAwarePublicLayout>
            </HmAnsiklopediPublicWrap>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/ansiklopedi/kategori/:categorySlug">{() => <LegacyAnsiklopediRedirect />}</Route>
      <Route path="/ansiklopedi/:wikiSlug">{() => <LegacyAnsiklopediRedirect />}</Route>
      <Route path="/ansiklopedi">{() => <LegacyAnsiklopediRedirect />}</Route>
      <Route path="/savaslar/:warSlug">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Haberlerde ara">
            <HmCorporateWarsPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/savaslar">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Haberlerde ara">
            <HmCorporateWarsPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/milli-gunler">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Haberlerde ara">
            <HmCorporateNationalDaysPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/kultur-portali">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Kültür portalında ara">
            <HmCorporateCulturePortalPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/ataturk/:pageSlug">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Atatürk Köşesi">
            <HmAtaturkCornerPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/ataturk">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Atatürk Köşesi">
            <HmAtaturkCornerPage />
          </SadeAwarePublicLayout>
        )}
      </Route>
      <Route path="/yemek-tarifleri">
        {() => (
          <HmPartnerOrPublicLayout>
            <HmYemekTarifleriPage />
          </HmPartnerOrPublicLayout>
        )}
      </Route>
      <Route path="/pwastore">{() => <PublicLayout><PwaStore /></PublicLayout>}</Route>
      <Route path="/uygulamayi-indir">{() => <SadeAwarePublicLayout chrome searchPlaceholder="Yekpare'de ara"><UygulamayiIndir /></SadeAwarePublicLayout>}</Route>
      <Route path="/hesabim">{() => <PublicLayout searchPlaceholder="Hesap, sipariş veya favori ara"><Hesabim /></PublicLayout>}</Route>
      <Route path="/is-ortagi/basvuru">{() => <SadeAwarePublicLayout chrome searchPlaceholder="Başvuru ve maşaza ara"><IsOrtagiBasvuru /></SadeAwarePublicLayout>}</Route>
      <Route path="/is-ortagi">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ış ortaklışı ve maşaza ara"><IsOrtagi /></SadeAwarePublicLayout>}</Route>
      <Route path="/kunye">
        {() => (
          <HmPortalOrDomainStandardPage segment="kunye">
            <PublicLayout>
              <KunyePage />
            </PublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/hakkinda">
        {() =>
          isAhenkAgencyHost() ? (
            <Redirect to="/hakkimizda" />
          ) : (
            <HmPortalOrDomainStandardPage segment="hakkinda">
              <PublicLayout>
                <HakkindaPage />
              </PublicLayout>
            </HmPortalOrDomainStandardPage>
          )
        }
      </Route>
      <Route path="/reklam">
        {() => (
          <HmPortalOrDomainStandardPage segment="reklam">
            <SadeAwarePublicLayout chrome searchPlaceholder="Reklam, işletme veya haber ara">
              <ReklamPage />
            </SadeAwarePublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/abonelik">
        {() => (
          <HmPortalOrDomainStandardPage segment="abonelik">
            <SadeAwarePublicLayout chrome searchPlaceholder="Yekpare aboneliklerinde ara">
              <AbonelikPage />
            </SadeAwarePublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/telif-kullanim">
        {() => (
          <HmPortalOrDomainStandardPage segment="telif-kullanim">
            <SadeAwarePublicLayout chrome searchPlaceholder="Telif hakkı ve kullanım şartları">
              <TelifKullanimPage />
            </SadeAwarePublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      {/* Haber Merkezi tanıtım: ahenk.net.tr ajans ürün ailesi; diğer hostlarda mevcut landing */}
      <Route path="/habermerkezi">
        {() =>
          isAhenkAgencyHost() ? (
            <AhenkAgencyHaberMerkezi />
          ) : (
            <PublicLayout>
              <Habermerkezi />
            </PublicLayout>
          )
        }
      </Route>
      <Route path="/ucretsiz-haber-sitesi">
        {() =>
          isAhenkAgencyHost() ? (
            <AhenkHaberSitesiLanding />
          ) : (
            <PublicLayout>
              <UcretsizHaberSitesiLanding />
            </PublicLayout>
          )
        }
      </Route>
      <Route path="/ai-cagri-merkezi">{() => <PublicLayout><AiCagriMerkeziLanding /></PublicLayout>}</Route>
      <Route path="/kariyer">{() => <PublicLayout><Kariyer /></PublicLayout>}</Route>
      <Route path="/hizmetler/ai-cagri-merkezi">
        <Redirect to="/ai-cagri-merkezi" />
      </Route>
      <Route path={/^\/hm\//}>{() => <HmLegacyPublicRedirect />}</Route>
      <Route path="/:slug/haber/:id">{() => <HmShortHaberPathRedirect />}</Route>
      <Route path="/tr/:slug/haber/:id">{() => <HmPublicShell><HmPublicHaberDetayRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/makale/:id">{() => <HmPublicShell><HmPublicHaberDetayRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/yazar/giris">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <YazarGiris />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/sifremi-unuttum">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <YazarSifremiUnuttum />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/sifre-yenile">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <YazarSifreYenileHm />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/haberler">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmAuthorRoute>
                <YazarHaberler />
              </HmAuthorRoute>
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/sifre">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmAuthorRoute>
                <YazarSifre />
              </HmAuthorRoute>
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/haber/:id">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmAuthorRoute>
                <HaberEditor />
              </HmAuthorRoute>
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yazar/:authorKey">{() => <HmPublicShell><HmPublicYazarYazilariRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/yazarlar">{() => <HmPublicShell><HmPublicYazarlarRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/kategori/:catSlug">{() => <HmPublicShell><HmPublicKategoriRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/etiket/:tagSlug">{() => <HmPublicShell><HmRedirectToSonDakika /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/etiketler/:tagSlug">{() => <HmPublicShell><HmRedirectToSonDakika /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/tag/:tagSlug">{() => <HmPublicShell><HmRedirectToSonDakika /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/haberler/rss/:itemId">{() => <HmPublicShell><HmPublicRssNewsPreviewRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/sondakika">{() => <HmPublicShell><HmPublicSonDakikaRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/kisa-kisa">{() => <HmPublicShell><HmPublicKisaKisaRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/tum-haberler">{() => <HmPublicShell><HmPublicTumHaberlerRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/rss-baglantilari">{() => <HmPublicShell><HmPublicRssLinksRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/sitene-ekle">{() => <HmPublicShell><HmPublicSiteneEkleRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/embed/haber">{() => <HaberEmbedWidget />}</Route>
      <Route path="/tr/:slug/sayfa/:pageSlug">
        {() => (
          <HmPublicShell>
            <HmLegacySayfaRedirect />
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/savaslar/:warSlug">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmCorporateWarsPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/savaslar">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmCorporateWarsPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/milli-gunler">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmCorporateNationalDaysPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/kultur-portali">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmCorporateCulturePortalPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/ataturk/:pageSlug">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmAtaturkCornerPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/ataturk">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmAtaturkCornerPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/yemek-tarifleri">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HmYemekTarifleriPage />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/foto-galeri/:id">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <FotoGaleriPublic />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/foto-galeri">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <FotoGaleriPublic />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/haber-gonder">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <HaberGonder />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/talep-formu">
        {() => (
          <HmPublicShell>
            <HmNestedLayout>
              <TalepFormu />
            </HmNestedLayout>
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/canlitv/kanal/:id">
        {() => (
          <HmVideoTvPublicShell>
            <YektubeCanliTvPage />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/canlitv">
        {() => (
          <HmVideoTvPublicShell>
            <YektubeCanliTvPage />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/kanal/:id/:videoId">
        {() => (
          <HmVideoTvPublicShell>
            <VideoTvChannel />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/kanal/:id">
        {() => (
          <HmVideoTvPublicShell>
            <VideoTvChannel />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/:section/:category">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video/:section">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video">
        {() => (
          <HmVideoTvPublicShell>
            <HmPublicVideoTvRoute />
          </HmVideoTvPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/canlitv/kanal/:id">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/canlitv">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/kanal/:id/:videoId">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/kanal/:id">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/playlist/:id/:videoId">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/playlist/:id">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/:section/:category">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv/:section">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/video-tv">{() => <HmTrVideoTvPathAliasRedirect />}</Route>
      <Route path="/tr/:slug/bilgiagaci/kategori/:categorySlug">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmPublicShell>
              <HmNestedLayout>
                <AnsiklopediKategori />
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
                <AnsiklopediDetay />
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
                <Ansiklopedi />
              </HmNestedLayout>
            </HmPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/ansiklopedi/kategori/:categorySlug">{() => <LegacyHmAnsiklopediRedirect />}</Route>
      <Route path="/tr/:slug/ansiklopedi/:wikiSlug">{() => <LegacyHmAnsiklopediRedirect />}</Route>
      <Route path="/tr/:slug/ansiklopedi">{() => <LegacyHmAnsiklopediRedirect />}</Route>
      <Route path="/tr/:slug/ara">{() => <HmPublicShell><HmPublicAraRoute /></HmPublicShell>}</Route>
      <Route path="/tr/:slug/haritalar">{() => <HmHaritalarToNewsmapRedirect />}</Route>
      <Route path="/tr/:slug/newsmap">{() => (
        <HmPublicShell>
          <YekparePortalHubOnlyRoute>
            <LazyRouteChunk><HmPublicNewsmapRoute /></LazyRouteChunk>
          </YekparePortalHubOnlyRoute>
        </HmPublicShell>
      )}</Route>
      <Route path="/tr/:slug/:pageSlug">
        {() => (
          <HmPublicShell>
            <HmPublicExtraPageSlugRoute />
          </HmPublicShell>
        )}
      </Route>
      <Route path="/tr/:slug">{() => <HmPublicShell><HmSitePublic /></HmPublicShell>}</Route>
      <Route path="/iletisim">
        {() =>
          isAhenkAgencyHost() ? (
            <AhenkAgencyIletisim />
          ) : (
            <HmPortalOrDomainStandardPage segment="iletisim">
              <PublicLayout>
                <Iletisim />
              </PublicLayout>
            </HmPortalOrDomainStandardPage>
          )
        }
      </Route>
      <Route path="/destek">{() => <PublicLayout><Destek /></PublicLayout>}</Route>
      <Route path="/mesafeli-satis-sozlesmesi">{() => <AhenkRemovedLegalPage><PublicLayout><MesafeliSatisSozlesmesiPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/on-bilgilendirme">{() => <AhenkRemovedLegalPage><PublicLayout><OnBilgilendirmePage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/gizlilik-kvkk">{() => <AhenkRemovedLegalPage><PublicLayout><KvkkPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/iade-degisim">{() => <AhenkRemovedLegalPage><PublicLayout><IadeDegisimPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/teslimat-kargo">{() => <AhenkRemovedLegalPage><PublicLayout><TeslimatKargoPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/kullanim-kosullari">{() => <AhenkRemovedLegalPage><PublicLayout><KullanimKosullariPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/sss">{() => <AhenkRemovedLegalPage><PublicLayout><SssPage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      <Route path="/iletisim-kunye">{() => <AhenkRemovedLegalPage><PublicLayout><IletisimKunyePage /></PublicLayout></AhenkRemovedLegalPage>}</Route>
      {/* Turizm — Yekpare site chrome + tema içerik gövdesi */}
      <Route path="/turizm/rezervasyon/:ref">{() => <TurizmRoute><BookingCoreRezervasyonOnay /></TurizmRoute>}</Route>
      <Route path="/turizm/tur/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/turlar/liste">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/turlar/blog">{() => <Redirect to="/turizm/blog" />}</Route>
      <Route path="/turizm/blog/:slug">{() => <TurizmRoute><TurizmBlogDetailPage /></TurizmRoute>}</Route>
      <Route path="/turizm/blog">{() => <TurizmRoute><TurizmBlogListPage /></TurizmRoute>}</Route>
      <Route path="/turizm/turlar/galeri">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/turlar/sss">{() => <TurizmRoute><TurizmSssPage /></TurizmRoute>}</Route>
      <Route path="/turizm/turlar/fiyatlandirma">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/turlar/karsilastirma">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/turlar/ekip">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/turlar">{() => <TurizmRoute><TurlarHome /></TurizmRoute>}</Route>
      <Route path="/turizm/destinasyon/:slug">{() => <TurizmRoute><BookingCoreDestinasyonDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/destinasyonlar">{() => <TurizmRoute><BookingCoreDestinasyonlar /></TurizmRoute>}</Route>
      <Route path="/turizm/villa-ev/:slug/hakkimizda">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/villa-ev/:slug/urunler">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/villa-ev/:slug/iletisim">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/villa-ev/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/villa-ev">{() => <TurizmRoute><VillaEvHome /></TurizmRoute>}</Route>
      <Route path="/turizm/etkinlik/:slugOrId">{() => <TurizmRoute><TurizmEtkinlikDetailPage /></TurizmRoute>}</Route>
      <Route path="/turizm/etkinlik">{() => <TurizmRoute><EtkinlikHome /></TurizmRoute>}</Route>
      <Route path="/turizm/ucus">{() => <TurizmRoute><UcusHome /></TurizmRoute>}</Route>
      <Route path="/turizm/otobus">{() => <Redirect to="/turizm/servis" />}</Route>
      <Route path="/turizm/servis/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/servis">{() => <TurizmRoute><ServisHome /></TurizmRoute>}</Route>
      <Route path="/turizm/konaklama/:slug/hakkimizda">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/konaklama/:slug/urunler">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/konaklama/:slug/iletisim">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/konaklama/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/konaklama">{() => <TurizmRoute><KonaklamaHome /></TurizmRoute>}</Route>
      <Route path="/turizm/arac-kiralama/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/arac-kiralama">{() => <TurizmRoute><AracKiralamaHome /></TurizmRoute>}</Route>
      <Route path="/turizm/yat-turlari/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/yat-turlari">{() => <TurizmRoute><YatTurlariHome /></TurizmRoute>}</Route>
      <Route path="/turizm/hotel">{() => <Redirect to="/turizm/konaklama" />}</Route>
      <Route path="/turizm/car">{() => <Redirect to="/turizm/arac-kiralama" />}</Route>
      <Route path="/turizm/boat">{() => <Redirect to="/turizm/yat-turlari" />}</Route>
      <Route path="/turizm/villa">{() => <Redirect to="/turizm/villa-ev" />}</Route>
      <Route path="/turizm/space">{() => <Redirect to="/turizm/villa-ev" />}</Route>
      <Route path="/turizm/uzay">{() => <Redirect to="/turizm/villa-ev" />}</Route>
      <Route path="/turizm/:type/:slug/hakkimizda">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/:type/:slug/urunler">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/:type/:slug/iletisim">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/:type/:slug">{() => <TurizmRoute><TurizmDetay /></TurizmRoute>}</Route>
      <Route path="/turizm/liste">{() => <Redirect to="/turizm/turlar" />}</Route>
      <Route path="/turizm/:type">{() => <TurizmLegacyTypeRedirect />}</Route>
      <Route path="/turizm">{() => <TurizmRoute><BookingCoreHome /></TurizmRoute>}</Route>
      <Route path="/emlak/:slug">{() => <Redirect to="/" />}</Route>
      <Route path="/emlak">{() => <Redirect to="/" />}</Route>
      {/* Otomotiv modülü kaldırıldı — eski URL’ler anasayfa (arama) */}
      <Route path="/otomotiv/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/otomotiv">{() => <Redirect to="/" />}</Route>
      <Route path="/rss-baglantilari">{() => <Redirect to="/site-haritalari" />}</Route>
      <Route path="/site-haritalari">{() => <PublicLayout><SiteHaritalari /></PublicLayout>}</Route>
      <Route path="/bilgi/:slug">{() => <PublicLayout><BilgiSayfasi /></PublicLayout>}</Route>
      {/* Ulaşım modülü kaldırıldı — eski URL'ler anasayfa */}
      <Route path="/ulasim/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/ulasim">{() => <Redirect to="/" />}</Route>
      <Route path="/ulasim-paneli">{() => <Redirect to="/" />}</Route>
      <Route path="/ulasim-saglayici-giris">{() => <Redirect to="/" />}</Route>
      <Route path="/surucu-paneli">{() => <Redirect to="/" />}</Route>
      <Route path="/kasiyer">{() => <Kasiyer />}</Route>
      <Route path="/kurye-paneli">{() => <Redirect to="/" />}</Route>
      <Route path="/usta-paneli">{() => <UstaPaneli />}</Route>
      <Route path="/servis-paneli">{() => <ServisElemanPaneli />}</Route>
      <Route path="/takip/:code">{() => <Redirect to="/" />}</Route>
      <Route path="/takip">{() => <Redirect to="/" />}</Route>

      {/* PBX agent portal — bağımsız chrome, Yekpare header yok */}
      <Route path="/pbx/panel">{() => <AgentPanel />}</Route>
      <Route path="/pbx">{() => <AgentLogin />}</Route>

      {/* Admin login */}
      <Route path="/admin/login">{() => <Redirect to="/admin/giris" />}</Route>
      <Route path="/admin/giris" component={Login} />

      <Route path="/editor/giris">{() => <EditorGiris />}</Route>
      <Route path="/editor/blog">
        {() => (
          <HmEditorRoute>
            <EditorBlog />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler/yeni">
        {() => (
          <HmEditorRoute>
            <EditorHmMakale />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <EditorHmMakale />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/makaleler">
        {() => (
          <HmEditorRoute>
            <EditorMakaleler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler/yeni">
        {() => (
          <HmEditorRoute>
            <HaberEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <HaberEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/haberler">
        {() => (
          <HmEditorRoute>
            <EditorHaberler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/yeni">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyaEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/loglar">
        {() => (
          <HmEditorRoute>
            <EditorRssLoglar />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari/:id/duzenle">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyaEditor />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/rss-kampanyalari">
        {() => (
          <HmEditorRoute>
            <EditorRssKampanyalari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/yekpare-haberleri">
        {() => (
          <HmEditorRoute>
            <EditorYekpareHaberleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/iletisim">
        {() => (
          <HmEditorRoute>
            <EditorIletisim />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/posta-kutusu">
        {() => (
          <HmEditorRoute>
            <EditorPostaKutusu />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/wordpress-ice-aktar">
        {() => (
          <HmEditorRoute>
            <EditorWordPressImport />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/wordpress-template-sayfalari">
        {() => (
          <HmEditorRoute>
            <EditorWordPressTemplatePages />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/kose-yazarlari">
        {() => (
          <HmEditorRoute>
            <EditorKoseYazarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/foto-galeri">
        {() => (
          <HmEditorRoute>
            <EditorFotoGaleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/video-galeri">
        {() => (
          <HmEditorRoute>
            <EditorVideoGaleri />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/video-tv-yonetimi">
        {() => (
          <HmEditorRoute>
            <EditorVideoTvYonetimi />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/medya">
        {() => (
          <HmEditorRoute>
            <EditorMedya />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/site-sayfalari">
        {() => <Redirect to="/editor/sayfalar" />}
      </Route>
      <Route path="/editor/profil">
        {() => (
          <HmEditorRoute>
            <EditorProfil />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/genel-ayarlar">
        {() => (
          <HmEditorRoute>
            <EditorGenelAyarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/reklam-alanlari">
        {() => (
          <HmEditorRoute>
            <EditorReklamAlanlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/manset">
        {() => (
          <HmEditorRoute>
            <EditorManset />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/kategoriler">
        {() => (
          <HmEditorRoute>
            <EditorKategoriler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/sayfalar">
        {() => (
          <HmEditorRoute>
            <EditorSayfalar />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/menuler">
        {() => (
          <HmEditorRoute>
            <EditorMenuler />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor/vitrin">
        {() => (
          <HmEditorRoute>
            <EditorVitrinAyarlari />
          </HmEditorRoute>
        )}
      </Route>
      <Route path="/editor">
        {() => (
          <HmEditorRoute>
            <EditorDashboard />
          </HmEditorRoute>
        )}
      </Route>

      <Route path="/agent/panel">
        <Redirect to="/pbx/panel" />
      </Route>
      <Route path="/agent/giris">
        <Redirect to="/pbx" />
      </Route>

      <Route path={/^\/admin(\/.*)?$/}>
        {() => (
          <LazyRouteChunk>
            <AdminRoutes />
          </LazyRouteChunk>
        )}
      </Route>
      <Route path="/:vendorShortPath/:section">
        {() => <VendorCustomDomainShortStorefrontRoute />}
      </Route>
      <Route path="/:vendorShortPath">
        {() => <VendorCustomDomainShortStorefrontRoute />}
      </Route>
    </Switch>
    </Router>
    {showPwaInstallBanner ? <PWAInstallBanner /> : null}
    {showYekpareAi ? <YekpareAiChat /> : null}
    {showChatBubble ? <ChatBubble /> : null}
    <Toaster />
    </YektubeDedicatedHostGate>
    </>
    </MemberProvider>
    </CustomerAuthProvider>
  );
}
