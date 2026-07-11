import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Switch, Route, Redirect, useLocation, useParams, useRoute, useSearch, Router } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { isConfiguredPortalHost, isEffectivePortalHost } from "@/lib/hmPortalHosts";
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
import { YektubeStandaloneRoute, HmYektubePortalEmbed } from "@/components/YektubeV2Gateway";
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
} from "./pages/public/YektubeRedirects";
import Magaza from "./pages/public/Magaza";
import Yazarlar from "./pages/public/Yazarlar";
import TumHaberler from "./pages/public/TumHaberler";
import HaberGonder from "./pages/public/HaberGonder";
import TalepFormu from "./pages/public/TalepFormu";
import FotoGaleriPublic from "./pages/public/FotoGaleriPublic";
import ResmiIlanlarPublic from "./pages/public/ResmiIlanlarPublic";
import LisansAktivasyonu from "./pages/public/LisansAktivasyonu";
import Checkout from "./pages/public/Checkout";
import SiparisDetay from "./pages/public/SiparisDetay";
import Siparislerim from "./pages/public/Siparislerim";
import Hesabim from "./pages/public/Hesabim";
import MagazaUrunDetay from "./pages/public/MagazaUrunDetay";
import MagazaKatalog from "./pages/public/MagazaKatalog";
import MagazaSaticiOl from "./pages/public/MagazaSaticiOl";
import MagazaSepet from "./pages/public/MagazaSepet";
import MagazaOdeme from "./pages/public/MagazaOdeme";
import MagazaBlog from "./pages/public/MagazaBlog";
import MagazaMarkalar from "./pages/public/MagazaMarkalar";
import MagazaKampanyalar from "./pages/public/MagazaKampanyalar";
import MagazaHakkimizda from "./pages/public/MagazaHakkimizda";
import { MagazaBlogDetay, MagazaKategoriDetay, MagazaMagazaDetay, MagazaMarkaDetay } from "./pages/public/MagazaSlugPages";
import { SellzyMarketplaceLayout as SellzyMarketplaceShell } from "./themes/sellzy/SellzyMarketplaceLayout";
import { MagazaSubNavBar } from "./components/MagazaSubNavBar";
import { SiparisSubNavBar } from "./components/SiparisSubNavBar";
import SariSayfalarHub from "./pages/public/SariSayfalarHub";
import SariSayfalarDetay from "./pages/public/SariSayfalarDetay";
import FirmaRehberi, { FirmaRehberiListe } from "./pages/public/FirmaRehberi";
import FirmaRehberiPaneli from "./pages/public/FirmaRehberiPaneli";
import IsletmeDetay from "./pages/public/IsletmeDetay";
import IsletmePaneli from "./pages/public/IsletmePaneli";
import Siparis from "./pages/public/Siparis";
import SiparisModulVitrin from "./pages/public/SiparisModulVitrin";
import KonumaGore from "./pages/public/KonumaGore";
import SaticiDetay from "./pages/public/SaticiDetay";
import BilgiSayfasi from "./pages/public/BilgiSayfasi";
import SiteHaritalari from "./pages/public/SiteHaritalari";
import VendorBlogPublicList from "./pages/public/VendorBlogPublicList";
import VendorBlogPublicPost from "./pages/public/VendorBlogPublicPost";
import Alisveris from "./pages/public/Alisveris";
import EcomSatici from "./pages/public/EcomSatici";
import IsletmeBasvuru from "./pages/public/IsletmeBasvuru";
import IsletmeGiris from "./pages/public/IsletmeGiris";
import ServisSaglayiciGiris from "./pages/public/ServisSaglayiciGiris";
import SifreSifirla from "./pages/public/SifreSifirla";
import SifreYenile from "./pages/public/SifreYenile";
import IsOrtagi from "./pages/public/IsOrtagi";
import IsOrtagiBasvuru from "./pages/public/IsOrtagiBasvuru";
import Kariyer from "./pages/public/Kariyer";
import PremiumBasarili from "./pages/public/PremiumBasarili";
import Ulasim from "./pages/public/Ulasim";
import Iletisim from "./pages/public/Iletisim";
import SuruciPaneli from "./pages/public/SuruciPaneli";
import KuryeTakip from "./pages/public/KuryeTakip";
import KuryePaneli from "./pages/public/KuryePaneli";
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
import OtomotivHubPage from "./themes/otomotiv/OtomotivHubPage";
import { OtomotivCategoryStubPage } from "./themes/otomotiv/OtomotivCategoryStubPage";
import { OtomotivServisPage } from "./themes/otomotiv/OtomotivServisPage";
import { OtomotivVehicleListingPage } from "./themes/otomotiv/OtomotivVehicleListingPage";
import { OtomotivVehicleDetailPage } from "./themes/otomotiv/OtomotivVehicleDetailPage";
import { OtomotivSubNavBar } from "./themes/otomotiv/OtomotivSubNavBar";
import { OTOMOTIV, pageOwnsOtomotivSubNav } from "./themes/otomotiv/otomotivRoutes";
import { OtomotivSigortaPage } from "./themes/otomotiv/OtomotivSigortaPage";
import { OtomotivPageErrorBoundary } from "./themes/otomotiv/OtomotivPageErrorBoundary";
import { TurizmBlogDetailPage, TurizmBlogListPage } from "./themes/turizm/TurizmBlogPages";
import { TurizmEtkinlikDetailPage } from "./themes/bookingcore/pages/TurizmEtkinlikDetailPage";
import TurizmSssPage from "./themes/turizm/TurizmSssPage";
import QrMenuPublic from "./pages/public/QrMenuPublic";
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
const UlasimSaglayiciPaneli = lazy(() => import("./pages/public/UlasimSaglayiciPaneli"));
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
  if (module === "shop") return <Redirect to="/magaza" />;
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
    /^\/alisveris\/magaza\/[^/]+(?:\/.*)?$/.test(path) ||
    /^\/siparis\/(?:satici|isletme)\/[^/]+(?:\/.*)?$/.test(path) ||
    /^\/turizm\/(?:konaklama|villa-ev|arac-kiralama|yat-turlari|hotel|car|boat|villa|[^/]+)\/[^/]+(?:\/.*)?$/.test(path)
  );
}

/** Turizm — Yeni Sade/SixAmMart chrome; eski mor AppNav/SiteFooter yasak (§5.1) */
function TurizmRoute({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const path = (loc.split("?")[0] ?? "").trim();
  const hubOwnsSubNav = pageOwnsTurizmSubNav(path);
  return (
    <SadeAwarePublicLayout
      forceSade
      chrome
      fullBleed
      active="rental"
      footerVariant="turizm"
      searchPlaceholder="Otel, villa, tur veya destinasyon ara"
      subHeader={hubOwnsSubNav ? null : <TurizmSubNavBar inline />}
    >
      <TurizmPageErrorBoundary>{children}</TurizmPageErrorBoundary>
    </SadeAwarePublicLayout>
  );
}

function TurizmLegacyTypeRedirect() {
  const [, params] = useRoute("/turizm/:type");
  const type = String(params?.type ?? "").toLowerCase();
  const map: Record<string, string> = {
    hotel: "/turizm/konaklama",
    villa: "/turizm/villa-ev",
    space: "/turizm/villa-ev",
    uzay: "/turizm/villa-ev",
    car: "/turizm/arac-kiralama",
    boat: "/turizm/yat-turlari",
    tour: "/turizm/turlar",
    turlar: "/turizm/turlar",
  };
  return <Redirect to={map[type] ?? "/turizm"} />;
}

/** Otomotiv — Sade chrome + sub-nav (turizm deseni) */
function OtomotivRoute({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const path = (loc.split("?")[0] ?? "").trim();
  const hubOwnsSubNav = pageOwnsOtomotivSubNav(path);
  return (
    <SadeAwarePublicLayout
      forceSade
      chrome
      fullBleed
      footerVariant="otomotiv"
      searchPlaceholder="Marka, model, parça veya servis ara"
      subHeader={hubOwnsSubNav ? null : <OtomotivSubNavBar inline />}
    >
      <OtomotivPageErrorBoundary>{children}</OtomotivPageErrorBoundary>
    </SadeAwarePublicLayout>
  );
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
  footerVariant?: "default" | "turizm" | "otomotiv";
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

/** Mağaza — Yekpare Sade chrome + Sellzy gövde (§6, §8). çift header yok. */
function MagazaRoute({ children }: { children: React.ReactNode }) {
  return (
    <SadeAwarePublicLayout
      forceSade
      chrome
      fullBleed
      active="shop"
      searchPlaceholder="Ürün, marka veya mağaza ara"
      subHeader={<MagazaSubNavBar inline />}
    >
      <SellzyMarketplaceShell bodyOnly>{children}</SellzyMarketplaceShell>
    </SadeAwarePublicLayout>
  );
}

/** Sipariş modül vitrinleri — yemek / market / yakınımdakiler + hub */
function SiparisModuleRoute({
  children,
  active,
  searchPlaceholder = "Restoran, market veya ürün ara",
}: {
  children: React.ReactNode;
  active?: SixAmMartModuleKey;
  searchPlaceholder?: string;
}) {
  return (
    <SadeAwarePublicLayout
      chrome
      fullBleed
      active={active}
      searchPlaceholder={searchPlaceholder}
      subHeader={<SiparisSubNavBar inline />}
    >
      {children}
    </SadeAwarePublicLayout>
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
    return (
      <SadeAwarePublicLayout>
        <SaticiDetay slugOverride={meta.slug} />
      </SadeAwarePublicLayout>
    );
  }
  if (meta.storefrontPath.startsWith("/alisveris/")) {
    return (
      <SadeAwarePublicLayout>
        <EcomSatici slugOverride={meta.slug} />
      </SadeAwarePublicLayout>
    );
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
  footerVariant?: "default" | "turizm" | "otomotiv";
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

/** Haber sitesi Video TV — tek HM kabuğu, çift menü yok. Yalnızca yekpare.net hub. */
function HmVideoTvPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <YekparePortalHubOnlyRoute>
      <HmPublicShell>
        <HmPublicVideoTvLayout>
          <HmVideoTvEnabledGate>{children}</HmVideoTvEnabledGate>
        </HmPublicVideoTvLayout>
      </HmPublicShell>
    </YekparePortalHubOnlyRoute>
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

/** Kök yol: kanonik portal doşrudan vitrin; dişer özel alanlar HM başlantısı için kısa API kontrolü. */
function PortalHomeRoute() {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  if (host && !isConfiguredPortalHost(host)) {
    return <HmPortalOrHmDomainHome />;
  }
  return <YekpareSadeHome />;
}

function isKesfetRoute(pathnameWithQuery: string): boolean {
  const p = pathnameWithQuery.split("?")[0] ?? "";
  return p === "/kesfet" || p.startsWith("/kesfet/");
}

function isQrMenuRoute(pathnameWithQuery: string): boolean {
  const p = pathnameWithQuery.split("?")[0] ?? "";
  return p.startsWith("/siparis/qr-menu/");
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

export default function App() {
  useYekpareTheme();
  const [location] = useLocation();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  const { chatBubble: showChatBubble, yekpareAi: showYekpareAi } = resolveFloatingWidgetVisibility(location);
  const showPwaInstallBanner =
    !pathNoQuery.startsWith("/pwastore") &&
    !pathNoQuery.startsWith("/uygulamayi-indir") &&
    !isHmSitePublicChromePath(pathNoQuery) &&
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
    <Switch>
      {/* Public routes — all wrapped with AppNav */}
      <Route path="/servisler/:slug">{() => <ServiceMarketingDetail />}</Route>
      <Route path="/servisler">{() => <ServicesMarketingOverview />}</Route>
      <Route path="/demo">{() => <SearchEngineHomePage />}</Route>
      <Route path="/eski">{() => <YekpareLandingHome />}</Route>
      <Route path="/home-classic">{() => <YekpareLandingHome />}</Route>
      <Route path="/">{() => <PortalHomeRoute />}</Route>
      <Route path="/home">{() => <SixAmMartHomeModuleRedirect />}</Route>
      {/* Canlı Yayın TV playlist — parametreli rotalar önce */}
      <Route path="/canlitv/kanal/:id">{() => <YektubeStandaloneRoute><YektubeCanliTvPage /></YektubeStandaloneRoute>}</Route>
      <Route path="/canlitv">{() => <YektubeStandaloneRoute><YektubeCanliTvPage /></YektubeStandaloneRoute>}</Route>
      {/* Yektube — parametreli rotalar önce (wouter ilk eşleşen kazanır) */}
      <Route path="/yektube/kanal/:id/:videoId">{() => <YektubeStandaloneRoute><VideoTvChannel /></YektubeStandaloneRoute>}</Route>
      <Route path="/yektube/kanal/:id">{() => <YektubeStandaloneRoute><VideoTvChannel /></YektubeStandaloneRoute>}</Route>
      <Route path="/yektube/playlist/:id/:videoId">{() => <YektubePlaylistRedirect />}</Route>
      <Route path="/yektube/playlist/:id">{() => <YektubePlaylistRedirect />}</Route>
      <Route path="/yektube/:section/:category">{() => <YektubeStandaloneRoute><><YektubeLegacySectionRedirect /><CanliTv /></></YektubeStandaloneRoute>}</Route>
      <Route path="/yektube/:section">{() => <YektubeStandaloneRoute><><YektubeLegacySectionRedirect /><CanliTv /></></YektubeStandaloneRoute>}</Route>
      <Route path="/yektube">{() => <YektubeStandaloneRoute><CanliTv /></YektubeStandaloneRoute>}</Route>
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
      <Route path="/video-tv">
        {() => (
          <HmPortalOrDomainStandardPage segment="video-tv">
            <YekparePortalHubOnlyRoute>
              <Redirect to="/yektube" />
            </YekparePortalHubOnlyRoute>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/alisveris">{() => <PublicLayout><Alisveris /></PublicLayout>}</Route>
      <Route path="/magaza/urun/:slug">{() => <MagazaRoute><MagazaUrunDetay /></MagazaRoute>}</Route>
      <Route path="/magaza/urunler">{() => <MagazaRoute><MagazaKatalog mode="products" /></MagazaRoute>}</Route>
      <Route path="/magaza/kategori/:slug">{() => <MagazaRoute><MagazaKategoriDetay /></MagazaRoute>}</Route>
      <Route path="/magaza/kategoriler">{() => <MagazaRoute><MagazaKatalog mode="categories" /></MagazaRoute>}</Route>
      <Route path="/magaza/marka/:slug">{() => <MagazaRoute><MagazaMarkaDetay /></MagazaRoute>}</Route>
      <Route path="/magaza/magaza/:slug">{() => <MagazaRoute><MagazaMagazaDetay /></MagazaRoute>}</Route>
      <Route path="/magaza/magazalar">{() => <MagazaRoute><MagazaKatalog mode="vendors" /></MagazaRoute>}</Route>
      <Route path="/magaza/saticilar">{() => <MagazaRoute><MagazaKatalog mode="vendors" /></MagazaRoute>}</Route>
      <Route path="/magaza/satici-olun">{() => <Redirect to="/magaza/satici-ol" />}</Route>
      <Route path="/magaza/satici-ol">{() => <MagazaRoute><MagazaSaticiOl /></MagazaRoute>}</Route>
      <Route path="/magaza/sepet">{() => <MagazaRoute><MagazaSepet /></MagazaRoute>}</Route>
      <Route path="/magaza/odeme">{() => <MagazaRoute><MagazaOdeme /></MagazaRoute>}</Route>
      <Route path="/magaza/blog/:slug">{() => <MagazaRoute><MagazaBlogDetay /></MagazaRoute>}</Route>
      <Route path="/magaza/blog">{() => <MagazaRoute><MagazaBlog /></MagazaRoute>}</Route>
      <Route path="/magaza/markalar">{() => <MagazaRoute><MagazaMarkalar /></MagazaRoute>}</Route>
      <Route path="/magaza/kampanyalar">{() => <MagazaRoute><MagazaKampanyalar /></MagazaRoute>}</Route>
      <Route path="/magaza/hakkimizda">{() => <MagazaRoute><MagazaHakkimizda /></MagazaRoute>}</Route>
      <Route path="/magaza">{() => <MagazaRoute><Magaza /></MagazaRoute>}</Route>
      <Route path="/alisveris/magaza/:slug/blog/:postSlug">{() => <PublicLayout><VendorBlogPublicPost /></PublicLayout>}</Route>
      <Route path="/alisveris/magaza/:slug/blog">{() => <PublicLayout><VendorBlogPublicList /></PublicLayout>}</Route>
      <Route path="/alisveris/magaza/:slug/hakkimizda">{() => <SadeAwarePublicLayout><EcomSatici /></SadeAwarePublicLayout>}</Route>
      <Route path="/alisveris/magaza/:slug/urunler">{() => <SadeAwarePublicLayout><EcomSatici /></SadeAwarePublicLayout>}</Route>
      <Route path="/alisveris/magaza/:slug/iletisim">{() => <SadeAwarePublicLayout><EcomSatici /></SadeAwarePublicLayout>}</Route>
      <Route path="/alisveris/magaza/:slug">{() => <SadeAwarePublicLayout><EcomSatici /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/qr-menu/:slug">{() => <QrMenuPublic />}</Route>
      <Route path="/konumagore">{() => <SadeAwarePublicLayout chrome fullBleed active="food" searchPlaceholder="Yemek, market veya işletme ara"><KonumaGore /></SadeAwarePublicLayout>}</Route>
      <Route path="/yemek">{() => <SiparisModuleRoute active="food" searchPlaceholder="Yemek veya restoran ara"><SiparisModulVitrin moduleKey="food" hideModuleHeroSearch /></SiparisModuleRoute>}</Route>
      <Route path="/market">{() => <SiparisModuleRoute active="grocery" searchPlaceholder="Ürün veya market ara"><SiparisModulVitrin moduleKey="market" hideModuleHeroSearch /></SiparisModuleRoute>}</Route>
      <Route path="/isletmeler">{() => <SiparisModuleRoute active="pharmacy" searchPlaceholder="Ürün veya işletme ara"><SiparisModulVitrin moduleKey="nearby" hideModuleHeroSearch /></SiparisModuleRoute>}</Route>
      <Route path="/siparis">{() => <SiparisModuleRoute searchPlaceholder="Restoran, market veya ürün ara"><Siparis /></SiparisModuleRoute>}</Route>
      <Route path="/siparis/satici/:slug/blog/:postSlug">{() => <PublicLayout><VendorBlogPublicPost /></PublicLayout>}</Route>
      <Route path="/siparis/satici/:slug/blog">{() => <PublicLayout><VendorBlogPublicList /></PublicLayout>}</Route>
      <Route path="/siparis/satici/:slug/hakkimizda">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/satici/:slug/menu">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/satici/:slug/iletisim">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/satici/:slug">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/isletme/:slug/hakkimizda">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/isletme/:slug/menu">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/isletme/:slug/iletisim">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/siparis/isletme/:slug">{() => <SadeAwarePublicLayout><SaticiDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/yazarlar">{() => <HmPartnerOrPublicLayout><Yazarlar /></HmPartnerOrPublicLayout>}</Route>
      <Route path="/yazar/:authorKey">{() => <HmPartnerOrPublicLayout><YazarAuthorRoute /></HmPartnerOrPublicLayout>}</Route>
      <Route path="/foto-galeri/:id">{() => <PublicLayout><FotoGaleriPublic /></PublicLayout>}</Route>
      <Route path="/foto-galeri">{() => <PublicLayout><FotoGaleriPublic /></PublicLayout>}</Route>
      <Route path="/video-galeri/:id" component={VideoGaleriToYektubeRedirect} />
      <Route path="/video-galeri">{() => <YektubeRootRedirect />}</Route>
      <Route path="/seri-ilanlar/:id">{() => <Redirect to="/kesfet" />}</Route>
      <Route path="/seri-ilanlar">{() => <Redirect to="/kesfet" />}</Route>
      <Route path="/sari-sayfalar">{() => <Redirect to="/kesfet/sarisayfalar" />}</Route>
      <Route path="/resmi-ilanlar">{() => <PublicLayout><ResmiIlanlarPublic /></PublicLayout>}</Route>
      <Route path="/lisans-aktivasyon">{() => <PublicLayout><LisansAktivasyonu /></PublicLayout>}</Route>
      <Route path="/odeme">{() => <PublicLayout><Checkout /></PublicLayout>}</Route>
      <Route path="/siparis-takip/:code">{() => <PublicLayout><SiparisDetay /></PublicLayout>}</Route>
      <Route path="/siparis-takip">{() => <PublicLayout><SiparisDetay /></PublicLayout>}</Route>
      <Route path="/siparislerim">{() => <PublicLayout searchPlaceholder="Sipariş veya telefon numarası ara"><Siparislerim /></PublicLayout>}</Route>
      <Route path={/^\/maps\/place\/[^/]+\/(?:@|%40)[^/?#]*$/i}>{() => <LegacyMapsPlaceRedirect />}</Route>
      <Route path={/^\/maps\/(?:@|%40)[^/?#]*$/i}>{() => <LegacyMapsPlaceRedirect />}</Route>
      <Route path={/^\/maps\/?$/}>{() => <LazyRouteChunk><HaritalarFullscreenRoute /></LazyRouteChunk>}</Route>
      <Route path={/^\/map\/?$/}>{() => <LazyRouteChunk><HaritalarFullscreenRoute /></LazyRouteChunk>}</Route>
      <Route path="/maps">{() => <LazyRouteChunk><HaritalarFullscreenRoute /></LazyRouteChunk>}</Route>
      <Route path="/map">{() => <LazyRouteChunk><HaritalarFullscreenRoute /></LazyRouteChunk>}</Route>
      <Route path="/haritalar/tam-ekran">{() => <LegacyFullscreenMapRedirect />}</Route>
      <Route path="/haritalar">{() => <Redirect to="/newsmap" />}</Route>
      <Route path="/newsmap">{() => (
        <YekparePortalHubOnlyRoute>
          <LazyRouteChunk><NewsmapRoute /></LazyRouteChunk>
        </YekparePortalHubOnlyRoute>
      )}</Route>
      <Route path="/kesfet/premium-basarili">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme, ürün veya haber ara"><PremiumBasarili /></SadeAwarePublicLayout>}</Route>
      <Route path="/kesfet/sarisayfalar/:id">{() => <SariSayfalarDetayRoute />}</Route>
      <Route path="/kesfet/sarisayfalar">{() => <SariSayfalarHubRoute />}</Route>
      <Route path="/ara">{() => <HmPortalOrDomainAraRoute />}</Route>
      <Route path="/kesfet/liste">{() => <KesfetListingRoute />}</Route>
      <Route path="/kesfet/isletme/:id">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme, ürün veya haber ara"><IsletmeDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/kesfet/:slug">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme, ürün veya haber ara"><IsletmeDetay /></SadeAwarePublicLayout>}</Route>
      <Route path="/isletme-paneli/:id">{() => <PublicLayout><IsletmePaneli /></PublicLayout>}</Route>
      <Route path="/isletme-paneli">{() => <PublicLayout><IsletmePaneli /></PublicLayout>}</Route>
      <Route path="/isletme-basvuru">{() => <SadeAwarePublicLayout chrome searchPlaceholder="Başvuru ve işletme ara"><IsletmeBasvuru /></SadeAwarePublicLayout>}</Route>
      <Route path="/isletme-giris">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme hesabı ara"><IsletmeGiris /></SadeAwarePublicLayout>}</Route>
      <Route path="/servis-saglayici-giris">{() => <SadeAwarePublicLayout chrome searchPlaceholder="ışletme hesabı ara"><ServisSaglayiciGiris /></SadeAwarePublicLayout>}</Route>
      <Route path="/ulasim-saglayici-giris">
        {() => (
          <SadeAwarePublicLayout chrome searchPlaceholder="Ulaşım sağlayıcı hesabı ara">
            <ServisSaglayiciGiris
              title="Ulaşım Saşlayıcı Girişi"
              subtitle="Filo, sürücü ve lojistik operasyon panelinize erişin"
              backHref="/servisler/ulasim"
              backLabel="Ulaşım servisi tanıtımına dön"
            />
          </SadeAwarePublicLayout>
        )}
      </Route>
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
      <Route path="/ulasim-paneli">{() => <LazyProviderPanel><UlasimSaglayiciPaneli /></LazyProviderPanel>}</Route>
      <Route path="/sifre-sifirla">{() => <PublicLayout searchPlaceholder="Hesap veya işletme ara"><SifreSifirla /></PublicLayout>}</Route>
      <Route path="/sifre-yenile">{() => <PublicLayout searchPlaceholder="Hesap veya işletme ara"><SifreYenile /></PublicLayout>}</Route>
      <Route path="/kesfet">{() => <KesfetDiscoverHubRoute />}</Route>
      <Route path="/gezi-seyahat">{() => <Redirect to="/bilgiagaci/kategori/gezi-seyahat" replace />}</Route>
      <Route path="/firma-rehberi/urunler">{() => <PublicLayout><FirmaRehberiListe mode="urunler" /></PublicLayout>}</Route>
      <Route path="/firma-rehberi/hizmetler">{() => <PublicLayout><FirmaRehberiListe mode="hizmetler" /></PublicLayout>}</Route>
      <Route path="/firma-rehberi/ilanlar">{() => <PublicLayout><FirmaRehberiListe mode="ilanlar" /></PublicLayout>}</Route>
      <Route path="/firma-rehberi">{() => <PublicLayout><FirmaRehberi /></PublicLayout>}</Route>
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
      <Route path="/ulasim/:serviceSlug">{() => <SadeAwarePublicLayout><Ulasim /></SadeAwarePublicLayout>}</Route>
      <Route path="/ulasim">{() => <SadeAwarePublicLayout><Ulasim /></SadeAwarePublicLayout>}</Route>
      <Route path="/kunye">
        {() => (
          <HmPortalOrDomainStandardPage segment="kunye">
            <PublicLayout>
              <KunyePage />
            </PublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
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
      <Route path="/habermerkezi">{() => <PublicLayout><Habermerkezi /></PublicLayout>}</Route>
      <Route path="/ucretsiz-haber-sitesi">{() => <PublicLayout><UcretsizHaberSitesiLanding /></PublicLayout>}</Route>
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
      <Route path="/tr/:slug/video-tv/canlitv/kanal/:id">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <YektubeCanliTvPage />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/canlitv">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <YektubeCanliTvPage />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/kanal/:id/:videoId">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmYektubePortalEmbed />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/kanal/:id">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmYektubePortalEmbed />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/playlist/:id/:videoId">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmYektubePortalEmbed />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/playlist/:id">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmYektubePortalEmbed />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/:section/:category">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmPublicVideoTvRoute />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv/:section">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmPublicVideoTvRoute />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
      <Route path="/tr/:slug/video-tv">
        {() => (
          <YekparePortalHubOnlyRoute>
            <HmVideoTvPublicShell>
              <HmPublicVideoTvRoute />
            </HmVideoTvPublicShell>
          </YekparePortalHubOnlyRoute>
        )}
      </Route>
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
        {() => (
          <HmPortalOrDomainStandardPage segment="iletisim">
            <PublicLayout>
              <Iletisim />
            </PublicLayout>
          </HmPortalOrDomainStandardPage>
        )}
      </Route>
      <Route path="/destek">{() => <PublicLayout><Destek /></PublicLayout>}</Route>
      <Route path="/mesafeli-satis-sozlesmesi">{() => <PublicLayout><MesafeliSatisSozlesmesiPage /></PublicLayout>}</Route>
      <Route path="/on-bilgilendirme">{() => <PublicLayout><OnBilgilendirmePage /></PublicLayout>}</Route>
      <Route path="/gizlilik-kvkk">{() => <PublicLayout><KvkkPage /></PublicLayout>}</Route>
      <Route path="/iade-degisim">{() => <PublicLayout><IadeDegisimPage /></PublicLayout>}</Route>
      <Route path="/teslimat-kargo">{() => <PublicLayout><TeslimatKargoPage /></PublicLayout>}</Route>
      <Route path="/kullanim-kosullari">{() => <PublicLayout><KullanimKosullariPage /></PublicLayout>}</Route>
      <Route path="/sss">{() => <PublicLayout><SssPage /></PublicLayout>}</Route>
      <Route path="/iletisim-kunye">{() => <PublicLayout><IletisimKunyePage /></PublicLayout>}</Route>
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
      {/* Otomotiv — Yekpare otomotiv ekosistemi */}
      <Route path="/otomotiv/galeri/:slug">{() => <OtomotivRoute><OtomotivVehicleDetailPage slug="galeri" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/galeri">{() => <OtomotivRoute><OtomotivVehicleListingPage slug="galeri" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/sifir/:slug">{() => <OtomotivRoute><OtomotivVehicleDetailPage slug="sifir" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/sifir">{() => <OtomotivRoute><OtomotivVehicleListingPage slug="sifir" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/ikinci-el/:slug">{() => <OtomotivRoute><OtomotivVehicleDetailPage slug="ikinci-el" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/ikinci-el">{() => <OtomotivRoute><OtomotivVehicleListingPage slug="ikinci-el" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/yedek-parca/:slug">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="yedek-parca" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/yedek-parca">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="yedek-parca" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/cikma/:slug">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="cikma" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/cikma">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="cikma" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/servis/:subSlug">{() => <OtomotivRoute><OtomotivServisPage /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/servis">{() => <OtomotivRoute><OtomotivServisPage /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/yikama/:slug">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="yikama" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/yikama">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="yikama" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/lastik/:slug">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="lastik" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/lastik">{() => <OtomotivRoute><OtomotivCategoryStubPage slug="lastik" /></OtomotivRoute>}</Route>
      <Route path="/otomotiv/sigorta">{() => <OtomotivRoute><OtomotivSigortaPage /></OtomotivRoute>}</Route>
      <Route path="/otomotiv">{() => <OtomotivRoute><OtomotivHubPage /></OtomotivRoute>}</Route>
      <Route path="/emlak/:slug">{() => <Redirect to="/" />}</Route>
      <Route path="/emlak">{() => <Redirect to="/" />}</Route>
      <Route path="/rss-baglantilari">{() => <Redirect to="/site-haritalari" />}</Route>
      <Route path="/site-haritalari">{() => <PublicLayout><SiteHaritalari /></PublicLayout>}</Route>
      <Route path="/bilgi/:slug">{() => <PublicLayout><BilgiSayfasi /></PublicLayout>}</Route>
      <Route path="/surucu-paneli">{() => <SuruciPaneli />}</Route>
      <Route path="/kasiyer">{() => <Kasiyer />}</Route>
      <Route path="/kurye-paneli">{() => <KuryePaneli />}</Route>
      <Route path="/usta-paneli">{() => <UstaPaneli />}</Route>
      <Route path="/servis-paneli">{() => <ServisElemanPaneli />}</Route>
      <Route path="/takip/:code">{() => <PublicLayout><KuryeTakip /></PublicLayout>}</Route>
      <Route path="/takip">{() => <PublicLayout><KuryeTakip /></PublicLayout>}</Route>

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
