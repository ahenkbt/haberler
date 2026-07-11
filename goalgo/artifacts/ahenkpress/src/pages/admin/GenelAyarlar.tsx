import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetSiteSettings,
  useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  Save,
  Globe,
  Palette,
  Phone,
  Share2,
  Loader2,
  Menu,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  LayoutGrid,
  Layers,
  ImageIcon,
  Link2,
  MapPin,
  CreditCard,
  Mail,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Briefcase,
  ShoppingCart,
  Search,
  PlaySquare,
} from "lucide-react";
import { GoogleAiGeminiInfoCard } from "@/components/GoogleAiGeminiInfoCard";
import { normalizeSeoVerificationFormInput, parsePortalHostVerificationsFromStore, type PortalHostVerificationRow } from "@/lib/seoVerificationInput";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap, adminAuthHeaders } from "@/lib/apiBase";
import {
  MAIN_NAV_KEY_ORDER,
  MAIN_NAV_LABELS,
  parseNavMenuItems,
  defaultNavMenuItems,
  parseFooterNavJson,
  serializeNavMenuItems,
  serializeFooterNavKeys,
  parseModulesEnabledJsonMerged,
  serializeModulesEnabledFull,
  parseHomeSectionsJson,
  serializeHomeSections,
  HOME_SECTION_LABELS,
  parseFooterLegalLinksJson,
  serializeFooterLegalLinks,
  parseFooterInfoLinksJson,
  serializeFooterInfoLinks,
  parseLegalPagesJson,
  serializeLegalPagesJson,
  defaultLegalPagesContent,
  type MainNavKey,
  type HomeSectionId,
  type NavMenuItem,
  type FooterLegalLink,
  type LegalPagesContentMap,
  type FooterInfoLink,
} from "@workspace/site-nav";
import { LegalPagesEditor } from "./LegalPagesEditor";
import { FooterLinksEditor } from "@/components/FooterLinksEditor";

const SETTINGS_TAB_IDS = [
  "site",
  "renk",
  "iletisim",
  "sosyal",
  "menu",
  "footer",
  "moduller",
  "anasayfa",
  "harita",
  "entegrasyon",
  "abonelik",
  "seo",
] as const;

function settingsTabFromLocation(search: string): (typeof SETTINGS_TAB_IDS)[number] {
  const tab = new URLSearchParams(search).get("tab");
  return SETTINGS_TAB_IDS.includes(tab as (typeof SETTINGS_TAB_IDS)[number])
    ? (tab as (typeof SETTINGS_TAB_IDS)[number])
    : "site";
}

export default function GenelAyarlar() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<(typeof SETTINGS_TAB_IDS)[number]>("site");
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    siteName: "", tagline: "", logoUrl: "",
    logoText1: "", logoText2: "",
    primaryColor: "#e61e25", secondaryColor: "#1F2937",
    navbarBg: "#FFFFFF", navbarText: "#111827",
    breakingBg: "#CC0000", financeBg: "#0F172A",
    footerText: "", copyrightText: "",
    address: "", phone: "", email: "", whatsapp: "",
    facebook: "", twitter: "", instagram: "", youtube: "",     telegram: "",
    mapsGoogleBrowserKey: "",
    mapsGoogleEnabled: false,
    googlePlacesApiKey: "",
    googleMapsServerKey: "",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
    magnificApiKey: "",
    magnificWebhookSecret: "",
    homeRecentBusinessLimit: "15",
    bankAccountHolder: "",
    bankIban: "",
    bankNameBranch: "",
    bankAccountNumber: "",
    adminCallmebotApiKey: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPass: "",
    imapFolder: "INBOX",
    geminiApiKey: "",
    youtubeApiKey: "",
    deepseekApiKey: "",
    travelpayoutsApiToken: "",
    travelpayoutsMarker: "",
    providerMembershipStandardUsd: "10",
    providerMembershipGoldUsd: "10",
    providerMembershipPremiumPerBusinessUsd: "10",
    usdTryRate: "",
  });

  const [navItems, setNavItems] = useState<NavMenuItem[]>([]);
  const [footerKeys, setFooterKeys] = useState<MainNavKey[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [modEnabled, setModEnabled] = useState<Record<MainNavKey, boolean>>(() =>
    parseModulesEnabledJsonMerged(null),
  );
  const [homeSections, setHomeSections] = useState<{ id: HomeSectionId; enabled: boolean }[]>(() =>
    parseHomeSectionsJson(null),
  );
  const [footerLegalLinks, setFooterLegalLinks] = useState<FooterLegalLink[]>(() => parseFooterLegalLinksJson(null));
  const [footerInfoLinks, setFooterInfoLinks] = useState<FooterInfoLink[]>(() => parseFooterInfoLinksJson(null));
  const [legalPages, setLegalPages] = useState<LegalPagesContentMap>(() => defaultLegalPagesContent());
  const [legalLinkLabel, setLegalLinkLabel] = useState("");
  const [legalLinkHref, setLegalLinkHref] = useState("");

  const [refreshUsdTryBusy, setRefreshUsdTryBusy] = useState(false);
  const [googleSiteVerification, setGoogleSiteVerification] = useState("");
  const [portalHostVerifications, setPortalHostVerifications] = useState<PortalHostVerificationRow[]>([]);
  const [bingSiteVerification, setBingSiteVerification] = useState("");
  const [yandexVerification, setYandexVerification] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    stripeEnabled: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    bankTransferEnabled: false,
    bankName: "",
    bankIban: "",
    bankAccountName: "",
    bankBranch: "",
    currency: "TRY",
    taxRate: "18",
    orderEmailFrom: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/shop/payment-settings")
      .then((r) => r.json())
      .then((d) => setPaymentForm((prev) => ({ ...prev, ...d })))
      .catch(() => {})
      .finally(() => setPaymentLoading(false));
  }, []);

  useEffect(() => {
    const q = location.includes("?") ? location.slice(location.indexOf("?")) : "";
    setActiveTab(settingsTabFromLocation(q));
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined" || activeTab !== "entegrasyon") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const targetId = hash === "gemini-api-key" || hash === "yapay-zeka" ? hash : null;
    if (!targetId) return;
    const el = document.getElementById(targetId === "gemini-api-key" ? "gemini-api-key" : "yapay-zeka");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, location]);

  /* Sunucudan gelen JSON alanları değişince senkronize et. `[settings]` kullanma: her refetch
   * yeni nesne referansı ile menü sırasını sıfırlayıp yukarı/aşağı tuşlarını “bozuk” gösterirdi. */
  useEffect(() => {
    if (!settings) return;
    setNavItems(parseNavMenuItems(settings.mainNavJson ?? null));
    setFooterKeys(parseFooterNavJson(settings.footerNavJson ?? null));
    setModEnabled(parseModulesEnabledJsonMerged(settings.modulesEnabledJson ?? null));
    setHomeSections(parseHomeSectionsJson(settings.homeSectionsJson ?? null));
  }, [
    settings?.mainNavJson,
    settings?.footerNavJson,
    settings?.modulesEnabledJson,
    settings?.homeSectionsJson,
  ]);

  useEffect(() => {
    if (!settings) return;
    setFooterLegalLinks(
      parseFooterLegalLinksJson((settings as { footerLegalLinksJson?: string | null }).footerLegalLinksJson ?? null),
    );
  }, [(settings as { footerLegalLinksJson?: string | null })?.footerLegalLinksJson]);

  useEffect(() => {
    if (!settings) return;
    setFooterInfoLinks(
      parseFooterInfoLinksJson((settings as { footerInfoLinksJson?: string | null }).footerInfoLinksJson ?? null),
    );
  }, [(settings as { footerInfoLinksJson?: string | null })?.footerInfoLinksJson]);

  useEffect(() => {
    if (!settings) return;
    setLegalPages(
      parseLegalPagesJson((settings as { legalPagesJson?: string | null }).legalPagesJson ?? null),
    );
  }, [(settings as { legalPagesJson?: string | null })?.legalPagesJson]);

  useEffect(() => {
    if (!settings) return;
    const seo = (settings as { seoVerification?: { googleSiteVerification?: string; bingSiteVerification?: string; yandexVerification?: string; byHost?: Record<string, { googleSiteVerification?: string }> } }).seoVerification;
    setGoogleSiteVerification(seo?.googleSiteVerification ?? "");
    setPortalHostVerifications(parsePortalHostVerificationsFromStore(seo ?? null));
    setBingSiteVerification(seo?.bingSiteVerification ?? "");
    setYandexVerification(seo?.yandexVerification ?? "");
  }, [(settings as { seoVerification?: unknown })?.seoVerification]);

  useEffect(() => {
    if (!settings) return;
    setForm({
      siteName: settings.siteName ?? "",
      tagline: settings.tagline ?? "",
      logoUrl: settings.logoUrl ?? "",
      logoText1: settings.logoText1 ?? "",
      logoText2: settings.logoText2 ?? "",
      primaryColor: settings.primaryColor ?? "#e61e25",
      secondaryColor: settings.secondaryColor ?? "#1F2937",
      navbarBg: settings.navbarBg ?? "#FFFFFF",
      navbarText: settings.navbarText ?? "#111827",
      breakingBg: settings.breakingBg ?? "#CC0000",
      financeBg: settings.financeBg ?? "#0F172A",
      footerText: settings.footerText ?? "",
      copyrightText: settings.copyrightText ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      whatsapp: settings.whatsapp ?? "",
      facebook: settings.facebook ?? "",
      twitter: settings.twitter ?? "",
      instagram: settings.instagram ?? "",
      youtube: settings.youtube ?? "",
      telegram: settings.telegram ?? "",
      mapsGoogleBrowserKey: settings.mapsGoogleBrowserKey ?? "",
      mapsGoogleEnabled: settings.mapsGoogleEnabled === true,
      googlePlacesApiKey: (settings as any).googlePlacesApiKey ?? "",
      googleMapsServerKey: (settings as any).googleMapsServerKey ?? "",
      openaiApiKey: (settings as any).openaiApiKey ?? "",
      openaiModel: (settings as any).openaiModel ?? "gpt-4o-mini",
      magnificApiKey: (settings as any).magnificApiKey ?? "",
      magnificWebhookSecret: (settings as any).magnificWebhookSecret ?? "",
      homeRecentBusinessLimit: String(settings.homeRecentBusinessLimit ?? 15),
      bankAccountHolder: (settings as any).bankAccountHolder ?? "",
      bankIban: (settings as any).bankIban ?? "",
      bankNameBranch: (settings as any).bankNameBranch ?? "",
      bankAccountNumber: (settings as any).bankAccountNumber ?? "",
      adminCallmebotApiKey: "",
      smtpHost: (settings as any).smtpHost ?? "",
      smtpPort: (settings as any).smtpPort ?? "587",
      smtpUser: (settings as any).smtpUser ?? "",
      smtpPass: "",
      smtpFrom: (settings as any).smtpFrom ?? "",
      imapHost: (settings as any).imapHost ?? "",
      imapPort: (settings as any).imapPort ?? "993",
      imapUser: (settings as any).imapUser ?? "",
      imapPass: "",
      imapFolder: (settings as any).imapFolder ?? "INBOX",
      geminiApiKey: (settings as any).geminiApiKey ?? "",
      youtubeApiKey: (settings as any).youtubeApiKey ?? "",
      deepseekApiKey: (settings as any).deepseekApiKey ?? "",
      travelpayoutsApiToken: "",
      travelpayoutsMarker: (settings as any).travelpayoutsMarker ?? "",
      providerMembershipStandardUsd: String((settings as any).providerMembershipStandardUsd ?? "10"),
      providerMembershipGoldUsd: String((settings as any).providerMembershipGoldUsd ?? "10"),
      providerMembershipPremiumPerBusinessUsd: String((settings as any).providerMembershipPremiumPerBusinessUsd ?? "10"),
      usdTryRate: (settings as any).usdTryRate != null ? String((settings as any).usdTryRate) : "",
    });
  }, [
    settings?.siteName,
    settings?.tagline,
    settings?.logoUrl,
    settings?.logoText1,
    settings?.logoText2,
    settings?.primaryColor,
    settings?.secondaryColor,
    settings?.navbarBg,
    settings?.navbarText,
    settings?.breakingBg,
    settings?.financeBg,
    settings?.footerText,
    settings?.copyrightText,
    settings?.address,
    settings?.phone,
    settings?.email,
    settings?.whatsapp,
    settings?.facebook,
    settings?.twitter,
    settings?.instagram,
    settings?.youtube,
    settings?.telegram,
    settings?.mapsGoogleBrowserKey,
    settings?.mapsGoogleEnabled,
    (settings as any)?.googlePlacesApiKey,
    (settings as any)?.googleMapsServerKey,
    (settings as any)?.openaiApiKey,
    (settings as any)?.openaiModel,
    (settings as any)?.magnificApiKey,
    (settings as any)?.magnificWebhookSecret,
    settings?.homeRecentBusinessLimit,
    (settings as any)?.bankAccountHolder,
    (settings as any)?.bankIban,
    (settings as any)?.bankNameBranch,
    (settings as any)?.bankAccountNumber,
    (settings as any)?.smtpHost,
    (settings as any)?.smtpPort,
    (settings as any)?.smtpUser,
    (settings as any)?.smtpFrom,
    (settings as any)?.imapHost,
    (settings as any)?.imapPort,
    (settings as any)?.imapUser,
    (settings as any)?.imapFolder,
    (settings as any)?.geminiApiKey,
    (settings as any)?.youtubeApiKey,
    (settings as any)?.deepseekApiKey,
    (settings as any)?.travelpayoutsMarker,
    (settings as any)?.hasTravelpayoutsToken,
    (settings as any)?.hasAdminCallmebotKey,
    (settings as any)?.hasSmtpPass,
    (settings as any)?.hasImapPass,
    (settings as any)?.providerMembershipStandardUsd,
    (settings as any)?.providerMembershipGoldUsd,
    (settings as any)?.providerMembershipPremiumPerBusinessUsd,
    (settings as any)?.usdTryRate,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const savePaymentSettings = async () => {
    setPaymentSaving(true);
    try {
      const res = await fetch("/api/shop/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPaymentForm((prev) => ({ ...prev, ...d }));
      toast({ title: "Ödeme (Stripe) ayarları kaydedildi" });
    } catch {
      toast({ title: "Ödeme ayarları kaydedilemedi", variant: "destructive" });
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleSave = () => {
    const navJson =
      navItems.length > 0
        ? serializeNavMenuItems(navItems)
        : serializeNavMenuItems(parseNavMenuItems(null));
    const footJson =
      footerKeys.length > 0
        ? serializeFooterNavKeys(footerKeys as string[])
        : serializeFooterNavKeys(parseFooterNavJson(null));
    const hrl = Math.min(30, Math.max(5, parseInt(form.homeRecentBusinessLimit, 10) || 15));
    const {
      homeRecentBusinessLimit: _omitLimit,
      adminCallmebotApiKey,
      smtpPass,
      imapPass,
      travelpayoutsApiToken,
      youtubeApiKey: _omitYoutubeApiKey,
      ...formPayload
    } = form;
    void _omitLimit;
    void _omitYoutubeApiKey;
    const integrationSecrets: Record<string, string> = {};
    if (adminCallmebotApiKey.trim()) integrationSecrets.adminCallmebotApiKey = adminCallmebotApiKey.trim();
    if (smtpPass.trim()) integrationSecrets.smtpPass = smtpPass.trim();
    if (imapPass.trim()) integrationSecrets.imapPass = imapPass.trim();
    // Token alanı boşsa mevcut değeri koru (gönderme); yalnızca yeni değer girilince güncelle.
    if (travelpayoutsApiToken.trim()) integrationSecrets.travelpayoutsApiToken = travelpayoutsApiToken.trim();
    updateSettings.mutate(
      {
        data: {
          ...formPayload,
          ...integrationSecrets,
          homeRecentBusinessLimit: hrl,
          mainNavJson: navJson,
          footerNavJson: footJson,
          modulesEnabledJson: serializeModulesEnabledFull(modEnabled),
          homeSectionsJson: serializeHomeSections(homeSections),
          footerLegalLinksJson: serializeFooterLegalLinks(footerLegalLinks),
          footerInfoLinksJson: serializeFooterInfoLinks(footerInfoLinks),
          legalPagesJson: serializeLegalPagesJson(legalPages),
          seoVerification: normalizeSeoVerificationFormInput({
            googleSiteVerification,
            bingSiteVerification,
            yandexVerification,
            portalHostVerifications,
          }),
        } as any,
      },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetSiteSettingsQueryKey(), saved);
          void queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
          setNavItems(parseNavMenuItems(saved.mainNavJson ?? null));
          setFooterKeys(parseFooterNavJson(saved.footerNavJson ?? null));
          setFooterLegalLinks(
            parseFooterLegalLinksJson((saved as { footerLegalLinksJson?: string | null }).footerLegalLinksJson ?? null),
          );
          setFooterInfoLinks(
            parseFooterInfoLinksJson((saved as { footerInfoLinksJson?: string | null }).footerInfoLinksJson ?? null),
          );
          setLegalPages(
            parseLegalPagesJson((saved as { legalPagesJson?: string | null }).legalPagesJson ?? null),
          );
          toast({ title: "Ayarlar kaydedildi" });
        },
        onError: (err: unknown) =>
          toast({
            title: "Kaydedilemedi",
            description:
              (err instanceof Error ? err.message : String(err)).slice(0, 220) ||
              "API yanıtını kontrol edin.",
            variant: "destructive",
          }),
      },
    );
  };

  const usedModuleKeys = new Set(
    navItems.filter((x): x is { kind: "module"; key: MainNavKey } => x.kind === "module").map((x) => x.key),
  );
  const poolKeys: MainNavKey[] = MAIN_NAV_KEY_ORDER.filter((k) => !usedModuleKeys.has(k));
  const footerPoolKeys: MainNavKey[] = MAIN_NAV_KEY_ORDER.filter((k) => !footerKeys.includes(k));

  function moveNavItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= navItems.length) return;
    setNavItems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeNavAt(i: number) {
    setNavItems((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, j) => j !== i);
      if (!next.some((x) => x.kind === "module")) return prev;
      return next;
    });
  }

  function addNavModule(key: MainNavKey) {
    setNavItems((prev) =>
      prev.some((x) => x.kind === "module" && x.key === key) ? prev : [...prev, { kind: "module", key }],
    );
  }

  function addCustomNavLink() {
    const label = linkLabel.trim();
    const href = linkHref.trim();
    if (!label || !href) {
      toast({ title: "Başlık ve adres gerekli", variant: "destructive" });
      return;
    }
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `l-${Date.now()}`;
    setNavItems((prev) => [...prev, { kind: "link", id, label, href, newTab: linkNewTab }]);
    setLinkLabel("");
    setLinkHref("");
    setLinkNewTab(false);
    toast({ title: "Bağlantı listeye eklendi — Kaydet ile kaydedin" });
  }

  function moveFooter(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= footerKeys.length) return;
    setFooterKeys((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeFooterKey(key: MainNavKey) {
    setFooterKeys((prev) => prev.filter((k) => k !== key));
  }
  function addFooterKey(key: MainNavKey) {
    setFooterKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  function moveFooterLegal(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= footerLegalLinks.length) return;
    setFooterLegalLinks((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeFooterLegal(i: number) {
    setFooterLegalLinks((prev) => prev.filter((_, k) => k !== i));
  }
  function addFooterLegal() {
    const label = legalLinkLabel.trim();
    const href = legalLinkHref.trim();
    if (!label || !href) {
      toast({ title: "Etiket ve adres gerekli", variant: "destructive" });
      return;
    }
    setFooterLegalLinks((prev) => [...prev, { label, href }]);
    setLegalLinkLabel("");
    setLegalLinkHref("");
    toast({ title: "Listeye eklendi — Kaydet ile yayınlayın" });
  }

  function moveHomeSection(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= homeSections.length) return;
    setHomeSections((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  if (isLoading) return (
    <AdminLayout title="Genel Ayarlar">
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Genel Ayarlar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Genel Ayarlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Site adı, logo metni (iki satır), slogan, renkler, iletişim, menüler ve modüller burada kaydedilir.
            Görsel logo URL’si için{" "}
            <Link href="/admin/tema-ayarlari" className="text-[#e61e25] hover:underline font-medium">
              Tema Ayarları
            </Link>
            .
          </p>
        </div>
        <Button
          className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">İşletme ve servis altyapısı</h2>
        <p className="text-xs text-slate-600 mb-4 max-w-3xl leading-relaxed">
          Servis sağlayıcı (işletme) kayıtları ve iş ortağı başvuruları artık bu sayfadan tek tıkla açılır; sol menüde ayrı bir «Servis sağlayıcılar» grubu
          yoktur.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-slate-300" asChild>
            <Link href="/admin/servis-saglayicilar">
              <Briefcase className="w-4 h-4" />
              Başvurular ve yönetim
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-slate-300" asChild>
            <Link href="/admin/is-ortaklari">
              <ShoppingCart className="w-4 h-4" />
              İş ortağı başvuruları
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as (typeof SETTINGS_TAB_IDS)[number])}>
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="site" className="gap-2"><Globe className="w-4 h-4" />Site</TabsTrigger>
          <TabsTrigger value="renk" className="gap-2"><Palette className="w-4 h-4" />Renkler</TabsTrigger>
          <TabsTrigger value="iletisim" className="gap-2"><Phone className="w-4 h-4" />İletişim</TabsTrigger>
          <TabsTrigger value="sosyal" className="gap-2"><Share2 className="w-4 h-4" />Sosyal</TabsTrigger>
          <TabsTrigger value="menu" className="gap-2"><Menu className="w-4 h-4" />Üst menü</TabsTrigger>
          <TabsTrigger value="footer" className="gap-2"><Layers className="w-4 h-4" />Alt menü</TabsTrigger>
          <TabsTrigger value="moduller" className="gap-2"><LayoutGrid className="w-4 h-4" />Modüller</TabsTrigger>
          <TabsTrigger value="anasayfa" className="gap-2"><ImageIcon className="w-4 h-4" />Ana sayfa</TabsTrigger>
          <TabsTrigger value="harita" className="gap-2"><MapPin className="w-4 h-4" />Harita</TabsTrigger>
          <TabsTrigger value="entegrasyon" className="gap-2"><Sparkles className="w-4 h-4" />Entegrasyonlar</TabsTrigger>
          <TabsTrigger value="abonelik" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Abonelik ve premium (USD)
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="w-4 h-4" />
            SEO / Search Console
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>Site Adı</Label>
                <Input name="siteName" value={form.siteName} onChange={handleChange} className="mt-1" />
              </div>
              <div>
                <Label>Slogan / Tagline</Label>
                <Input name="tagline" value={form.tagline} onChange={handleChange} className="mt-1" />
              </div>
            </div>
            <div className="border-t pt-4 space-y-2">
              <Label>Üst bar logo görseli (tam URL veya site köküne göre yol)</Label>
              <Input
                name="logoUrl"
                value={form.logoUrl}
                onChange={handleChange}
                className="mt-1 font-mono text-sm"
                placeholder="/yekpare-logo.png"
              />
              <p className="text-xs text-gray-400">
                Dosya yüklemek için önce{" "}
                <Link href="/admin/medya" className="text-[#e61e25] hover:underline font-medium">
                  Medya
                </Link>
                ’ya yükleyip dönen adresi buraya yapıştırın. Doluysa bu resim üst barda gösterilir; boşsa aşağıdaki metin logosu kullanılır.
              </p>
              {form.logoUrl?.trim() ? (
                <div className="p-4 bg-gray-50 rounded-lg border flex items-center gap-4">
                  <img
                    src={form.logoUrl.trim()}
                    alt=""
                    className="h-10 w-auto max-w-[220px] object-contain"
                  />
                </div>
              ) : null}
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Logo Metni (görsel yoksa üst barda)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Logo Metin 1 (Renkli)</Label>
                  <Input name="logoText1" value={form.logoText1} onChange={handleChange} className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Örn: <strong>Yek</strong>pare → "Yek"</p>
                </div>
                <div>
                  <Label>Logo Metin 2</Label>
                  <Input name="logoText2" value={form.logoText2} onChange={handleChange} className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Örn: Yek<strong>pare</strong> → "pare"</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                <span className="text-2xl font-black tracking-tight" style={{ color: form.primaryColor }}>{form.logoText1 || "Yek"}</span>
                <span className="text-2xl font-black tracking-tight text-zinc-900">{form.logoText2 || "pare"}</span>
                <p className="text-xs text-gray-400 mt-1">Logo önizleme</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Footer Metni</Label>
                <Textarea name="footerText" value={form.footerText} onChange={handleChange} rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Telif Hakkı Metni</Label>
                <Input name="copyrightText" value={form.copyrightText} onChange={handleChange} className="mt-1" />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="renk">
          <div className="bg-white p-6 rounded-md shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { name: "primaryColor", label: "Birincil Renk (Ana Kırmızı)" },
                { name: "secondaryColor", label: "İkincil Renk" },
                { name: "navbarBg", label: "Navbar Arka Plan" },
                { name: "navbarText", label: "Navbar Metin" },
                { name: "breakingBg", label: "Son Dakika Bandı" },
                { name: "financeBg", label: "Borsa/Finans Bandı" },
              ].map(({ name, label }) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      name={name}
                      value={(form as any)[name]}
                      onChange={handleChange}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      name={name}
                      value={(form as any)[name]}
                      onChange={handleChange}
                      className="font-mono uppercase flex-1"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="harita">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5 max-w-2xl">
            <p className="text-sm text-gray-600">
              Sipariş (mekan) ve harita yönetiminde adres araması ile ters geocoding için Google Maps JavaScript API
              kullanılabilir. Kota veya hata durumunda site otomatik olarak GPS ve OpenStreetMap (Nominatim) ile devam eder.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="mapsGoogleEnabled"
                type="checkbox"
                checked={form.mapsGoogleEnabled}
                onChange={(e) => setForm((p) => ({ ...p, mapsGoogleEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="mapsGoogleEnabled" className="cursor-pointer font-medium">
                Google Harita / Geocoder kullan (açık + geçerli anahtar gerekir)
              </Label>
            </div>
            <div>
              <Label>Google Maps tarayıcı API anahtarı</Label>
              <Input
                name="mapsGoogleBrowserKey"
                value={form.mapsGoogleBrowserKey}
                onChange={handleChange}
                className="mt-1 font-mono text-sm"
                placeholder="AIza…"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-2">
                Google Cloud Console’da HTTP referrer ile kısıtlı <strong>Maps JavaScript API</strong> anahtarı oluşturun.
                Boş bırakırsanız yalnızca OSM kullanılır.
              </p>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Merkezi API Anahtarları (Admin)</p>
              <p className="text-xs text-gray-500">
                Bu alanlar Google Places ve Google Maps sunucu çağrıları için merkezden yönetilir. Yapay zekâ anahtarları{" "}
                <strong>Entegrasyonlar</strong> sekmesindedir.
              </p>
              <div>
                <Label>Google Places API anahtarı</Label>
                <Input
                  name="googlePlacesApiKey"
                  value={(form as any).googlePlacesApiKey}
                  onChange={handleChange}
                  className="mt-1 font-mono text-sm"
                  placeholder="AIza..."
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Google Maps server API anahtarı</Label>
                <Input
                  name="googleMapsServerKey"
                  value={(form as any).googleMapsServerKey}
                  onChange={handleChange}
                  className="mt-1 font-mono text-sm"
                  placeholder="AIza..."
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Haritalar <strong>Veri Kazıyıcı</strong> (Places Text Search) sunucudan çağrılır: önce{" "}
                  <strong>Places</strong> alanı, boşsa bu <strong>sunucu</strong> anahtarı da denenir. HTTP referrer ile
                  kısıtlı <em>tarayıcı</em> anahtarı burada çalışmaz; IP veya uygulama kısıtlı sunucu anahtarı ve aynı GCP
                  projesinde <strong>faturalandırma</strong> gerekir.
                </p>
              </div>
              <div className="border-t pt-3 mt-1 space-y-3">
                <p className="text-xs font-semibold text-gray-700">Magnific (stok görsel)</p>
                <p className="text-xs text-gray-500">
                  Ücretsiz (freemium) foto araması için API anahtarı. Belgeler:{" "}
                  <a href="https://docs.magnific.com/introduction" target="_blank" rel="noopener noreferrer" className="text-[#e61e25] underline">
                    docs.magnific.com
                  </a>
                  .
                </p>
                <div>
                  <Label>Magnific API anahtarı</Label>
                  <Input
                    name="magnificApiKey"
                    value={(form as any).magnificApiKey}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="FPSX…"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Webhook gizli bilgisi (opsiyonel)</Label>
                  <Input
                    name="magnificWebhookSecret"
                    value={(form as any).magnificWebhookSecret}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="Async webhook doğrulama — menü görselleri için gerekmez"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="iletisim">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>E-posta</Label>
                <Input name="email" value={form.email} onChange={handleChange} type="email" className="mt-1" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input name="phone" value={form.phone} onChange={handleChange} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Adres</Label>
              <Textarea name="address" value={form.address} onChange={handleChange} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>WhatsApp Numarası</Label>
              <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+90 555 000 00 00" className="mt-1" />
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Banka Hesabı (Havale / FAST EFT)</p>
              <p className="text-xs text-gray-500">
                Buradaki bilgiler işletme panellerindeki ödeme/dekont alanlarında referans olarak gösterilir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Alıcı Adı / Ünvan</Label>
                  <Input
                    name="bankAccountHolder"
                    value={(form as any).bankAccountHolder}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Örn: Yekpare Teknoloji A.Ş."
                  />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input
                    name="bankIban"
                    value={(form as any).bankIban}
                    onChange={handleChange}
                    className="mt-1 font-mono"
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                  />
                </div>
                <div>
                  <Label>Banka / Şube</Label>
                  <Input
                    name="bankNameBranch"
                    value={(form as any).bankNameBranch}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Örn: Ziraat Bankası - Kızılay Şubesi"
                  />
                </div>
                <div>
                  <Label>Hesap Numarası (opsiyonel)</Label>
                  <Input
                    name="bankAccountNumber"
                    value={(form as any).bankAccountNumber}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Örn: 12345678"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sosyal">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
                { name: "twitter", label: "Twitter / X URL", placeholder: "https://twitter.com/..." },
                { name: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/..." },
                { name: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/..." },
                { name: "telegram", label: "Telegram", placeholder: "https://t.me/..." },
              ].map(({ name, label, placeholder }) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <Input name={name} value={(form as any)[name]} onChange={handleChange} placeholder={placeholder} className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="menu">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <p className="text-sm text-gray-600">
              Üst menü: yerleşik modüller ve isteğe bağlı özel bağlantılar aynı listede sıralanır. Yukarı / aşağı ile taşıyın; Kaydet ile siteye uygulanır.
              Modül kapalıysa (Modüller sekmesi) sitede gizlenir. En az bir modül kalmalıdır.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNavItems(defaultNavMenuItems())}>
                Varsayılan sıraya dön
              </Button>
            </div>
            <div className="border rounded-md divide-y">
              {navItems.map((item, i) => (
                <div
                  key={item.kind === "module" ? `m-${item.key}` : `l-${item.id}`}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/80"
                >
                  <span className="flex-1 text-sm font-semibold text-gray-900 flex items-center gap-2 min-w-0">
                    {item.kind === "module" ? (
                      <>
                        {MAIN_NAV_LABELS[item.key]}
                        <span className="text-xs text-gray-400 font-mono font-normal hidden sm:inline">{item.key}</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 text-[#e61e25] shrink-0" />
                        <span className="truncate">{item.label}</span>
                        <span className="text-xs text-gray-400 font-mono font-normal truncate">{item.href}</span>
                      </>
                    )}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveNavItem(i, -1)} disabled={i === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveNavItem(i, 1)} disabled={i === navItems.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-600" onClick={() => removeNavAt(i)} disabled={navItems.length <= 1}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="border rounded-md p-4 space-y-3 bg-gray-50/50">
              <Label className="text-gray-800">Özel bağlantı (site içi veya harici URL)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Menüde görünecek ad" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                <Input placeholder="/sayfa veya https://..." value={linkHref} onChange={(e) => setLinkHref(e.target.value)} className="font-mono text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} className="rounded border-gray-300" />
                Yeni sekmede aç (harici linkler için)
              </label>
              <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={addCustomNavLink}>
                <Plus className="w-3.5 h-3.5" />
                Bağlantıyı listeye ekle
              </Button>
            </div>
            {poolKeys.length > 0 && (
              <div>
                <Label className="text-gray-700">Menüye eklenebilir modüller</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {poolKeys.map((key) => (
                    <Button key={key} type="button" variant="secondary" size="sm" className="gap-1" onClick={() => addNavModule(key as MainNavKey)}>
                      <Plus className="w-3.5 h-3.5" />
                      {MAIN_NAV_LABELS[key as MainNavKey] ?? key}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="footer">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <p className="text-sm text-gray-600">
              Ana sayfa ve diğer sayfalardaki alt bilgi link sırası. Üst menüden bağımsızdır.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFooterKeys(parseFooterNavJson(null))}>
                Varsayılan alt menü
              </Button>
            </div>
            <div className="border rounded-md divide-y">
              {footerKeys.map((key, i) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/80">
                  <span className="flex-1 text-sm font-semibold text-gray-900">
                    {MAIN_NAV_LABELS[key as MainNavKey] ?? key}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveFooter(i, -1)} disabled={i === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveFooter(i, 1)} disabled={i === footerKeys.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-600" onClick={() => removeFooterKey(key)} disabled={footerKeys.length <= 1}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            {footerPoolKeys.length > 0 && (
              <div>
                <Label className="text-gray-700">Alt menüye eklenebilir</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {footerPoolKeys.map((key) => (
                    <Button key={key} type="button" variant="secondary" size="sm" className="gap-1" onClick={() => addFooterKey(key)}>
                      <Plus className="w-3.5 h-3.5" />
                      {MAIN_NAV_LABELS[key as MainNavKey] ?? key}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <FooterLinksEditor
              title="Bilgi rehberi satırı"
              description="Footer'da «Bilgi rehberi» başlığı altında gösterilir (Yekpare nedir, Keşfet rehberi vb.)."
              links={footerInfoLinks}
              onChange={setFooterInfoLinks}
              onResetDefaults={() => setFooterInfoLinks(parseFooterInfoLinksJson(null))}
              labelPlaceholder="Menü etiketi (örn. Yekpare nedir)"
              hrefPlaceholder="/bilgi/yekpare-nedir"
            />

            <FooterLinksEditor
              title="Yasal / bilgilendirme satırı (KVKK, mesafeli satış vb.)"
              description="Footer'ın en alt bölümünde gösterilir. Site içi yol (/gizlilik-kvkk) veya tam URL kullanabilirsiniz."
              links={footerLegalLinks}
              onChange={setFooterLegalLinks}
              onResetDefaults={() => setFooterLegalLinks(parseFooterLegalLinksJson(null))}
              labelPlaceholder="Menü etiketi (örn. KVKK)"
              hrefPlaceholder="/gizlilik-kvkk veya https://..."
            />

            <div className="border-t pt-6 mt-6 space-y-3">
              <Label className="text-gray-800">Yasal sayfa içerikleri</Label>
              <p className="text-xs text-gray-500">
                Footer&apos;daki KVKK, mesafeli satış, SSS vb. sayfaların metinleri. Link sırası yukarıdaki satırdan,
                içerik buradan düzenlenir.
              </p>
              <LegalPagesEditor value={legalPages} onChange={setLegalPages} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="moduller">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <p className="text-sm text-gray-600">
              Kapalı olan modül üst menüde ve ilgili anasayfa bloklarında gösterilmez (doğrudan URL ile yine açılabilir).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MAIN_NAV_KEY_ORDER.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={modEnabled[key]}
                    onChange={(e) =>
                      setModEnabled((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  <span className="text-sm font-semibold text-gray-900">{MAIN_NAV_LABELS[key]}</span>
                  <span className="text-xs text-gray-400 font-mono ml-auto">{key}</span>
                </label>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="anasayfa">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <p className="text-sm text-gray-600">
              Ana sayfadaki blokların sırası ve görünürlüğü. Kapalı blok sayfada yer kaplamaz.
            </p>
            <div className="rounded-md border border-amber-100 bg-amber-50/50 p-4 mb-4">
              <Label className="text-gray-800">Öne çıkan işletmeler — kart sayısı (5–30)</Label>
              <p className="text-xs text-gray-600 mt-1 mb-2">
                Anasayfadaki tek vitrinde gösterilecek işletme sayısı. Grid 5 sütunlu tasarlanır (örn. 15 = 3 sıra).
              </p>
              <Input
                type="number"
                min={5}
                max={30}
                name="homeRecentBusinessLimit"
                value={form.homeRecentBusinessLimit}
                onChange={handleChange}
                className="max-w-[120px] mt-1"
              />
            </div>
            <div className="border rounded-md divide-y">
              {homeSections.map((row, i) => (
                <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50/80">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0"
                    checked={row.enabled}
                    onChange={(e) =>
                      setHomeSections((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r)),
                      )
                    }
                  />
                  <span className="flex-1 text-sm font-semibold text-gray-900">{HOME_SECTION_LABELS[row.id]}</span>
                  <span className="text-xs text-gray-400 font-mono hidden sm:inline">{row.id}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveHomeSection(i, -1)} disabled={i === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveHomeSection(i, 1)} disabled={i === homeSections.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entegrasyon">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#635bff]" />
                    Stripe (abonelik &amp; komisyonlu satış)
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Mağaza ödemeleri ve platform gelir modeli için kart tahsilatı. Ayrıntılı ekran:{" "}
                    <Link href="/admin/odeme-ayarlari" className="text-[#e61e25] font-semibold underline">
                      Ödeme Ayarları
                    </Link>
                    .
                  </p>
                </div>
                <Button
                  type="button"
                  className="bg-[#635bff] hover:bg-[#5046e5] text-white gap-2"
                  disabled={paymentSaving || paymentLoading}
                  onClick={() => void savePaymentSettings()}
                >
                  {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Stripe kaydet
                </Button>
              </div>
              {paymentLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between md:col-span-2 rounded-lg border border-gray-200 px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">Stripe etkin</span>
                    <Switch
                      checked={paymentForm.stripeEnabled}
                      onCheckedChange={(v) => setPaymentForm((p) => ({ ...p, stripeEnabled: v }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Publishable key</Label>
                    <Input
                      className="mt-1 font-mono text-sm"
                      value={paymentForm.stripePublishableKey ?? ""}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, stripePublishableKey: e.target.value }))}
                      placeholder="pk_live_… / pk_test_…"
                    />
                  </div>
                  <div>
                    <Label>Secret key</Label>
                    <Input
                      type="password"
                      className="mt-1 font-mono text-sm"
                      value={paymentForm.stripeSecretKey ?? ""}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, stripeSecretKey: e.target.value }))}
                      placeholder={paymentForm.stripeSecretKey === "***" ? "***" : "sk_live_…"}
                    />
                  </div>
                  <div>
                    <Label>Webhook secret</Label>
                    <Input
                      type="password"
                      className="mt-1 font-mono text-sm"
                      value={paymentForm.stripeWebhookSecret ?? ""}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, stripeWebhookSecret: e.target.value }))}
                      placeholder={paymentForm.stripeWebhookSecret === "***" ? "***" : "whsec_…"}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                WhatsApp — CallMeBot (platform)
              </h3>
              <p className="text-sm text-gray-600">
                Kayıt teşekkürü ve şifre sıfırlama gibi mesajlar bu anahtar ile gönderilir. İletişim sekmesindeki site
                WhatsApp numarası yönetici uyarıları içindir.{" "}
                <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer" className="text-[#e61e25] font-semibold underline">
                  CallMeBot dokümantasyonu
                </a>
              </p>
              {(settings as any)?.hasAdminCallmebotKey ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Kayıtlı bir anahtar var. Değiştirmek için yeni API anahtarını yazıp alttaki «Ayarları Kaydet» ile
                  kaydedin.
                </p>
              ) : null}
              <div>
                <Label>CallMeBot API anahtarı (platform)</Label>
                <Input
                  name="adminCallmebotApiKey"
                  value={form.adminCallmebotApiKey}
                  onChange={handleChange}
                  className="mt-1 font-mono text-sm"
                  placeholder="CallMeBot’tan alınan apikey"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-red-600" />
                Yektube (Video TV)
              </h3>
              <p className="text-sm text-gray-600">
                YouTube API anahtarı, kanal yönetimi, senkron ve tüm Yektube ayarları artık{" "}
                <strong>Yektube Studio</strong> panelinde yönetilir.
              </p>
              <a
                href="/yp/admin/ayarlar"
                className="inline-flex items-center gap-2 rounded-lg bg-[#e61e25] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9181e]"
              >
                Yektube Studio — Ayarlar
              </a>
              <a
                href="/yp/admin"
                className="ml-3 text-sm font-semibold text-[#e61e25] underline"
              >
                Yönetim paneli
              </a>
            </div>

            <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                SMTP (e-posta gönderimi)
              </h3>
              <p className="text-sm text-gray-600">
                Ortam değişkenleri (<code className="text-xs bg-gray-100 px-1 rounded">SMTP_HOST</code> vb.) doluysa
                öncelik ondadır; boşsa buradaki değerler kullanılır.
              </p>
              {(settings as any)?.hasSmtpPass ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  SMTP şifresi kayıtlı. Değiştirmek için yeni şifreyi yazıp kaydedin.
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>SMTP sunucu</Label>
                  <Input name="smtpHost" value={form.smtpHost} onChange={handleChange} className="mt-1 font-mono text-sm" placeholder="smtp.ornek.com" />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input name="smtpPort" value={form.smtpPort} onChange={handleChange} className="mt-1 font-mono text-sm" placeholder="587" />
                </div>
                <div>
                  <Label>Kullanıcı</Label>
                  <Input name="smtpUser" value={form.smtpUser} onChange={handleChange} className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label>Şifre</Label>
                  <Input
                    type="password"
                    name="smtpPass"
                    value={form.smtpPass}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Gönderen (From)</Label>
                  <Input name="smtpFrom" value={form.smtpFrom} onChange={handleChange} className="mt-1 font-mono text-sm" placeholder="Yekpare &lt;noreply@alanadiniz.com&gt;" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-600" />
                IMAP (yönetim gelen kutusu)
              </h3>
              <p className="text-sm text-gray-600">
                Admin <strong>Posta &amp; duyurular</strong> ekranından gelen postayı çekmek için. Genelde 993 TLS, kullanıcı genelde e-posta adresinizdir.
              </p>
              <p className="text-xs text-indigo-900/90 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 leading-relaxed">
                <strong>Gmail ipucu:</strong> IMAP sunucusu <code className="text-[11px]">imap.gmail.com</code>, kullanıcı olarak SMTP ile aynı e-postayı, şifre olarak{" "}
                <strong>uygulama şifresi</strong> kullanın. IMAP kullanıcı/şifreyi boş bırakırsanız sistem SMTP ile aynı bilgileri dener; IMAP alanında{" "}
                <code className="text-[11px]">imap.ornek.com</code> gibi şablon bırakmayın veya silin.
              </p>
              {(settings as any)?.hasImapPass ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  IMAP şifresi kayıtlı. Değiştirmek için yeni şifreyi yazıp kaydedin.
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>IMAP sunucu</Label>
                  <Input name="imapHost" value={form.imapHost} onChange={handleChange} className="mt-1 font-mono text-sm" placeholder="imap.ornek.com" />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input name="imapPort" value={form.imapPort} onChange={handleChange} className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label>Kullanıcı</Label>
                  <Input name="imapUser" value={form.imapUser} onChange={handleChange} className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label>Şifre</Label>
                  <Input
                    type="password"
                    name="imapPass"
                    value={form.imapPass}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Klasör</Label>
                  <Input name="imapFolder" value={form.imapFolder} onChange={handleChange} className="mt-1 font-mono text-sm" placeholder="INBOX" />
                </div>
              </div>
            </div>

            <div id="yapay-zeka" className="bg-white p-6 rounded-md shadow-sm border space-y-4 scroll-mt-24">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Yapay zekâ — Yekpare AI, içerik ve vitrin
              </h3>
              <p className="text-sm text-gray-600">
                <strong>Yekpare AI</strong> site rehberi sohbeti, ürün açıklaması ve haber robotu bu anahtarları kullanır.
                Google Places ve Maps sunucu anahtarları yalnızca <strong>Harita</strong> sekmesindedir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <GoogleAiGeminiInfoCard variant="admin" />
                </div>
                <div className="md:col-span-2">
                  <Label>OpenAI API anahtarı</Label>
                  <Input
                    name="openaiApiKey"
                    value={(form as any).openaiApiKey}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="sk-proj-…"
                    autoComplete="off"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>OpenAI model</Label>
                  <Input name="openaiModel" value={(form as any).openaiModel} onChange={handleChange} className="mt-1" placeholder="gpt-4o-mini" />
                </div>
                <div id="gemini-api-key" className="scroll-mt-24">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label>Google Gemini API anahtarı</Label>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-0.5">
                      Yekpare AI için Gemini
                    </span>
                    {(settings as any)?.hasGeminiApiKey ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">
                        Kayıtlı (maskeli)
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                        Henüz girilmedi — sohbet anahtar kelime modunda çalışır
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Google AI Studio&apos;dan alınan anahtar. Yekpare AI sohbet kutusu ve içerik robotu yedekleri buradan okunur.
                  </p>
                  <Input
                    name="geminiApiKey"
                    value={form.geminiApiKey}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder={(settings as any)?.hasGeminiApiKey ? "•••••••• (değiştirmek için yeni anahtar)" : "AIza… (Gemini)"}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>DeepSeek API anahtarı</Label>
                  <Input
                    name="deepseekApiKey"
                    value={form.deepseekApiKey}
                    onChange={handleChange}
                    className="mt-1 font-mono text-sm"
                    placeholder="sk-…"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="mt-6 border-t pt-5">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Travelpayouts (Seyahat affiliate)
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Otel (Hotellook), uçak bileti (Aviasales), araç, tur, etkinlik ve otobüs dikeyleri bu tek
                  <strong> token + marker</strong> ile çalışır. Fiyat/detay sitede gösterilir, rezervasyon adımında
                  marker&apos;lı affiliate linke yönlendirilir. Token API yanıtlarında asla düz metin döndürülmez.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Travelpayouts API Token</Label>
                      {(settings as any)?.hasTravelpayoutsToken ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">
                          Tanımlı {(settings as any)?.travelpayoutsTokenMasked ?? ""}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                          Henüz girilmedi
                        </span>
                      )}
                    </div>
                    <Input
                      name="travelpayoutsApiToken"
                      type="password"
                      value={form.travelpayoutsApiToken}
                      onChange={handleChange}
                      className="mt-1 font-mono text-sm"
                      placeholder={
                        (settings as any)?.hasTravelpayoutsToken
                          ? "•••••••• (değiştirmek için yeni token)"
                          : "Travelpayouts API token"
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>Travelpayouts Marker (Partner ID)</Label>
                    <Input
                      name="travelpayoutsMarker"
                      value={form.travelpayoutsMarker}
                      onChange={handleChange}
                      className="mt-1 font-mono text-sm"
                      placeholder="örn. 725355"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Affiliate linklerine eklenen partner kimliğiniz. Travelpayouts panelinizden alın.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-5">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  CollectAPI (Nöbetçi eczane, uçak &amp; otobüs)
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  Nöbetçi eczane katmanı, Travelpayouts yedek uçak fiyatları ve otobüs sefer araması için sunucu anahtarı.{" "}
                  <a
                    href="https://collectapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e61e25] font-semibold underline"
                  >
                    collectapi.com
                  </a>
                  {" "}hesabı açın, <strong>health</strong> (Nöbetçi Eczane) ve <strong>travel</strong> (Seyahat — uçak + otobüs)
                  paketlerine abone olun, profilinizden API token&apos;ı kopyalayıp Railway&apos;de{" "}
                  <code className="text-[11px] bg-gray-100 px-1 rounded">COLLECTAPI_KEY</code> olarak tanımlayın.
                  Anahtar yalnızca API sunucusunda tutulur; bu panelden girilmez.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="abonelik">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Servis sağlayıcı üyelik fiyatları
            </h3>
            <p className="text-sm text-gray-600">
              Aktif işletme üyelik modeli tek pakettir: <strong>günde 10 TL</strong>, <strong>yıllık 3650 TL</strong>. Aşağıdaki eski üyelik alanları teknik uyumluluk için
              tutulur; canlı tanıtım ve servis sağlayıcı panellerinde tüm işletme paketleri günlük 10 TL olarak gösterilir.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Standart uyumluluk alanı</Label>
                <Input
                  name="providerMembershipStandardUsd"
                  value={form.providerMembershipStandardUsd}
                  onChange={handleChange}
                  className="mt-1"
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label>Gold uyumluluk alanı</Label>
                <Input
                  name="providerMembershipGoldUsd"
                  value={form.providerMembershipGoldUsd}
                  onChange={handleChange}
                  className="mt-1"
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label>Premium uyumluluk alanı</Label>
                <Input
                  name="providerMembershipPremiumPerBusinessUsd"
                  value={form.providerMembershipPremiumPerBusinessUsd}
                  onChange={handleChange}
                  className="mt-1"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label>Kur alanı (eski üyelik hesapları için)</Label>
                <Input
                  name="usdTryRate"
                  value={form.usdTryRate}
                  onChange={handleChange}
                  className="mt-1 font-mono text-sm"
                  placeholder="örn. 34,25"
                  inputMode="decimal"
                />
                {(settings as any)?.usdTryUpdatedAt ? (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Son güncelleme: {new Date(String((settings as any).usdTryUpdatedAt)).toLocaleString("tr-TR")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={refreshUsdTryBusy}
                  onClick={async () => {
                    setRefreshUsdTryBusy(true);
                    try {
                      await ensureAdminPanelBootstrap();
                      const headers = new Headers(adminAuthHeaders());
                      const res = await apiFetch(apiUrl("/api/settings/refresh-usd-try"), { method: "POST", headers });
                      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
                      if (!res.ok) {
                        toast({
                          title: "Kur alınamadı",
                          description: String(j.error || res.status),
                          variant: "destructive",
                        });
                        return;
                      }
                      queryClient.setQueryData(getGetSiteSettingsQueryKey(), j);
                      void queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
                      toast({ title: "USD/TRY güncellendi" });
                    } catch (e) {
                      toast({
                        title: "İstek başarısız",
                        description: e instanceof Error ? e.message : String(e),
                        variant: "destructive",
                      });
                    } finally {
                      setRefreshUsdTryBusy(false);
                    }
                  }}
                >
                  {refreshUsdTryBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Kuru güncelle (API)
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              İşletme bazında eski üyelik alanı bulunabilir; kullanıcıya görünen aktif fiyatlandırma <strong>10 TL/gün</strong> ve <strong>3650 TL/yıl</strong> tek pakettir.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Google Search Console — çoklu portal domain</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ana portalın birden fazla alan adıyla (yekpare.net, turknet.app, getirsepeti.com.tr, goalgo.org vb.)
                aynı sitede yayınlanması için her domaini Google Search Console&apos;da <strong>ayrı mülk</strong> olarak
                ekleyin. Sitemap her domainde kendi kökünden okunur:{" "}
                <code className="bg-gray-100 px-1 rounded">https://ALAN-ADINIZ/sitemap.xml</code>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Ek portal domainleri sunucu ortam değişkeni{" "}
                <code className="bg-gray-100 px-1 rounded">PORTAL_EXTRA_HOSTS</code> (Railway/Vercel) ve istemci{" "}
                <code className="bg-gray-100 px-1 rounded">VITE_PORTAL_HOSTS</code> ile tanımlanır — virgülle:{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">getirsepeti.com.tr,goalgo.org</code>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Aşağıdaki <strong>varsayılan</strong> alan yekpare.net (ve www) içindir. Diğer portal domainleri için
                alttaki satırlara domain başına GSC HTML etiketini girin.
              </p>
            </div>
            <div>
              <Label>Varsayılan Google doğrulama (yekpare.net / portal kökü)</Label>
              <Textarea
                value={googleSiteVerification}
                onChange={(e) => setGoogleSiteVerification(e.target.value)}
                className="mt-1 font-mono text-sm min-h-[72px]"
                placeholder={'<meta name="google-site-verification" content="..." />'}
                autoComplete="off"
              />
            </div>
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50/80">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold">Diğer portal domainleri (domain başına GSC)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPortalHostVerifications((prev) => [...prev, { host: "", googleSiteVerification: "" }])
                  }
                >
                  Domain ekle
                </Button>
              </div>
              {portalHostVerifications.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Örnek: yekpare.net, getirsepeti.com.tr, goalgo.org — her biri için GSC&apos;de ayrı mülk açıp HTML
                  etiketini buraya kaydedin.
                </p>
              ) : null}
              {portalHostVerifications.map((row, i) => (
                <div key={`portal-seo-${i}`} className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-start">
                  <Input
                    value={row.host}
                    onChange={(e) =>
                      setPortalHostVerifications((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, host: e.target.value } : r)),
                      )
                    }
                    placeholder="yekpare.net"
                    className="font-mono text-sm"
                  />
                  <Textarea
                    value={row.googleSiteVerification ?? ""}
                    onChange={(e) =>
                      setPortalHostVerifications((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, googleSiteVerification: e.target.value } : r)),
                      )
                    }
                    placeholder={'<meta name="google-site-verification" content="..." />'}
                    className="font-mono text-xs min-h-[56px]"
                    rows={2}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => setPortalHostVerifications((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Sil
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Label>Bing Webmaster (msvalidate.01)</Label>
              <Textarea
                value={bingSiteVerification}
                onChange={(e) => setBingSiteVerification(e.target.value)}
                className="mt-1 font-mono text-sm min-h-[72px]"
                placeholder={'<meta name="msvalidate.01" content="..." />'}
                autoComplete="off"
              />
            </div>
            <div>
              <Label>Yandex verification</Label>
              <Textarea
                value={yandexVerification}
                onChange={(e) => setYandexVerification(e.target.value)}
                className="mt-1 font-mono text-sm min-h-[72px]"
                placeholder={'<meta name="yandex-verification" content="..." />'}
                autoComplete="off"
              />
            </div>
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Sitemap (Google Search Console)</h3>
              <p className="text-xs text-gray-500">
                Search Console → Sitemap&apos;ler bölümüne aşağıdaki ana dizini ekleyin. Haber, sipariş, alışveriş, turizm
                ve keşfet işletmeleri otomatik güncellenir.
              </p>
              <code className="block text-xs bg-gray-50 border rounded p-3 break-all">https://yekpare.net/sitemap.xml</code>
              <p className="text-xs text-gray-500">
                Diğer portal domainlerinde aynı yol: <code>https://yekpare.net/sitemap.xml</code>,{" "}
                <code>https://getirsepeti.com.tr/sitemap.xml</code> — URL&apos;ler o domain kökünü kullanır.
              </p>
              <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
                <li>Haberler: <code>/news-yekpare.xml</code> (+ HM siteleri)</li>
                <li>Sipariş işletmeleri: <code>/vendors-siparis.xml</code></li>
                <li>Alışveriş mağazaları: <code>/vendors-alisveris.xml</code></li>
                <li>Turizm ilanları: <code>/turizm.xml</code></li>
                <li>Keşfet / harita: <code>/businesses.xml</code></li>
                <li>İşletme blogları: <code>/vendor-blogs.xml</code></li>
              </ul>
              <p className="text-xs text-gray-400">
                Eski <code>/api/sitemap/…</code> yolları da çalışır; Search Console için yalnızca{" "}
                <code>https://yekpare.net/sitemap.xml</code> yeterlidir.
              </p>
              <p className="text-xs text-gray-500">
                Haber siteleri (ör. suhaberajansi.com) için ayrı mülk doğrulaması:{" "}
                <Link href="/admin/haber-siteleri" className="text-[#e61e25] underline">Haber Siteleri</Link> → SEO doğrulama.
              </p>
            </div>
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">GEO — Yapay zeka aramaları</h3>
              <p className="text-xs text-gray-500">
                ChatGPT, Perplexity ve Google AI özetleri için <code className="bg-gray-100 px-1 rounded">/llms.txt</code> dosyası
                yayında; robots.txt AI botlarına izin verir. İşletme ve haber sayfalarında Schema.org JSON-LD otomatik eklenir.
              </p>
              <code className="block text-xs bg-gray-50 border rounded p-3 break-all">https://yekpare.net/llms.txt</code>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button
          className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2 px-8"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Ayarları Kaydet
        </Button>
      </div>
    </AdminLayout>
  );
}
