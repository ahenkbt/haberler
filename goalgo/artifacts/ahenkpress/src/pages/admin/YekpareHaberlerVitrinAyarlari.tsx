import { AdminLayout } from "@/components/AdminLayout";
import { buildUnifiedHomeCategoryOptions, HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE, normalizeHomeModuleCategorySlug } from "@/lib/hmHomeModuleCategories";
import {
  type HmMediaGalleryHomeModuleId,
  type HmMediaGallerySourceId,
  type HmNewsGalleryVideoTvRef,
  type HmNewsHomeModuleGalleryVideoTvRefs,
} from "@/lib/hmMediaSpotlightPool";
import { HmModuleGallerySourceEditor, hmMediaGalleryBlockLabel } from "@/components/HmModuleGallerySourceEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HM_CORPORATE_HOME_MODULE_ORDER,
  HM_NEWS_HOME_MODULE_ORDER,
  SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER,
  SADE_NEWS_PORTAL_MODULE_LABELS,
  SADE_NEWS_PORTAL_RETIRED_MODULE_IDS,
  cleanHmBreakingRssFeedRows,
  cleanPortalHybridRssFeeds,
  createPortalHybridRssFeed,
  createPortalHybridRssFeedUrlRow,
  defaultNewsSiteLayoutPrefs,
  groupPortalHybridRssFeedsByCategory,
  isSadeHomeCitiesBandEnabled,
  isSadeNewsPortalModuleEnabled,
  parseNewsSiteLayoutFromJson,
  resolveHmBreakingRssFeedRows,
  resolveHmHomeModuleOrder,
  resolveHmNewsHomeModuleEnabled,
  resolveHmNewsEditorModuleEnabled,
  isHmNewsModuleCompatibleWithTheme,
  type HmNewsHomeModuleId,
  resolveHmNewsHorizontalAuthorsEnabled,
  resolveHmNewsSidebarAuthorsEnabled,
  resolveHmNewsLatestGridMainEnabled,
  resolveHmNewsLatestGridSidebarEnabled,
  resolvePortalHybridRssFeeds,
  resolveSadeNewsPortalModuleOrder,
  sadeNewsPortalModuleToggleKey,
  syncBreakingRssLegacyFieldsFromRows,
  writeNewsSiteLayoutPrefs,
  type HmBreakingRssFeedRow,
  type NewsSiteLayoutPrefs,
  type PortalHybridRssFeed,
  type SadeNewsPortalModuleId,
} from "@/lib/newsSiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteSettings, useUpdateSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2, Save, RefreshCw, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { dispatchHmLayoutUpdated } from "@/lib/hmLayoutUpdatedEvent";

function moveArrayItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

const NEWS_HOME_MODULE_LABELS: Record<(typeof HM_NEWS_HOME_MODULE_ORDER)[number], string> = {
  breakingBand: "Son dakika / finans bandı",
  yekpareSearchBox: "Yekpare arama kutusu",
  googleNewsBand: "Kutu içi RSS",
  tepeManset: "Tepe Manşet (üst numaralı band)",
  hero: "Manşet slider + hızlı erişim",
  newsMapModule: "Haber Haritası",
  worldBriefs: "Dünyadan Kısa Kısa",
  yemekHaber: "Yemek Haber modülü (tarifler + restoran vitrini)",
  ahenkIconCategoryRow: "İkon kategori şeridi",
  ahenkGununSesiAuthors: "Günün Sesi + köşe yazarları",
  ahenkAnkaraGrid: "ANKARA 4'lü grid",
  ahenkGundemLeadSide: "GÜNDEM büyük + 3 yan",
  ahenkSporGrid: "SPOR 2×3 grid",
  sporModule: "SPOR + Süper Lig puan durumu",
  ahenkDunyaBlock: "DÜNYA bloğu",
  ahenkEkonomiGrid: "EKONOMİ 4×2 grid",
  ahenkSonEklenenler: "Son Eklenenler",
  ahenkPopulerHaberler: "Popüler Haberler",
  portal3ThemeBlock: "Yekpare Haberler",
  esenThemeBlock: "MANŞET HABER",
  esenLeadPack: "Günün Öne Çıkanları",
  featuredCategoryStrip: "Kategori vitrini",
  yekpareKategorilerKutusu: "Yekpare Kategoriler Kutusu",
  leadListSidebar: "Büyük haber + sağ liste bloğu",
  mediaDarkBlock: "Video / galeri koyu blok",
  recentVideosSidebar: "Son eklenen videolar (sol kategori + 4×2 grid)",
  mansetAd: "Manşet altı reklam",
  authorsStrip: "Köşe yazarları şeridi",
  popularCities: "Türkiye Şehirleri",
  culturePortal: "Kültür Portalı",
  ataturkCorner: "Atatürk Köşesi",
  sehitSearch: "Şehit sorgulama modülü",
  heritageInfo: "Savaşlar + millî günler",
  homeMiddleAd: "Orta reklam alanı",
  latestGrid: "Orta son haberler + sidebar kutusu",
  donationSupport: "Bağış destek bandı",
};

const CORPORATE_HOME_MODULE_LABELS: Record<(typeof HM_CORPORATE_HOME_MODULE_ORDER)[number], string> = {
  hero: "Kurumsal slider",
  quickAccess: "Slider altı bant / hızlı erişim",
  googleNewsBand: "Kutu içi RSS",
  culturePortal: "Kültür Portalı bandı",
  mansetAd: "Slider altı reklam",
  mainNews: "Manşet haber grid",
  popularCities: "Türkiye Şehirleri",
  ataturkCorner: "Atatürk Köşesi",
  rssBand: "RSS güven bandı",
  authorsStrip: "Köşe yazarları şeridi",
  homeMiddleAd: "Orta reklam alanı",
  latestGrid: "Orta son haberler + sidebar kutusu",
  sehitSearch: "Şehit sorgulama modülü",
  heritageInfo: "Savaşlar + millî günler",
  donationSupport: "Bağış destek bandı (IBAN)",
};

function safeJsonStringifyPrefs(p: NewsSiteLayoutPrefs): string {
  try {
    return JSON.stringify(p);
  } catch {
    return JSON.stringify(defaultNewsSiteLayoutPrefs);
  }
}

export default function YekpareHaberlerVitrinAyarlari() {
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const initialPrefs = useMemo(() => {
    return parseNewsSiteLayoutFromJson(settings?.newsLayoutJson ?? null, null);
  }, [settings?.newsLayoutJson]);

  const [p, setP] = useState<NewsSiteLayoutPrefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [rssRefreshing, setRssRefreshing] = useState(false);
  const [aiMetaSaving, setAiMetaSaving] = useState(false);
  const [aiMetaProcessing, setAiMetaProcessing] = useState(false);
  const [aiMetaEnabled, setAiMetaEnabled] = useState(false);
  const [aiMetaHourlyLimit, setAiMetaHourlyLimit] = useState("20");
  const [rssAutomationSaving, setRssAutomationSaving] = useState(false);

  const { data: rssAutomation, refetch: refetchRssAutomation } = useQuery({
    queryKey: ["/api/admin/background-jobs/rss"],
    queryFn: () =>
      apiRequest("/api/admin/background-jobs/rss") as Promise<{
        ok: boolean;
        rssAutomationEnabled: boolean;
        schedulersRunning: boolean;
        withinScheduledSlot: boolean;
        schedule: { slots: string[]; label: string; timezone: string };
        turkeyTime: string;
        nextScheduledRun: string;
        lastSkipReason: string | null;
      }>,
  });

  const { data: portalCategories = [] } = useQuery({
    queryKey: ["/api/categories", "portal-hybrid-admin"],
    queryFn: () => apiRequest("/api/categories") as Promise<Array<{ slug: string; name: string }>>,
  });

  const { data: portalRssAiMeta, refetch: refetchPortalRssAiMeta } = useQuery({
    queryKey: ["/api/admin/portal-rss/ai-meta"],
    queryFn: () =>
      apiRequest("/api/admin/portal-rss/ai-meta") as Promise<{
        ok: boolean;
        config: { enabled: boolean; hourlyLimit: number; envHourlyLimit: number };
        queue: {
          queued: number;
          processing: number;
          completed: number;
          failed: number;
          completedLastHour: number;
          hourlyLimit: number;
          enabled: boolean;
        };
        recentJobs?: Array<{
          id: number;
          newsId: number;
          status: string;
          sourceTitle: string;
          sourceSpot: string | null;
          resultTitle: string | null;
          errorMessage: string | null;
          attempts: number;
          createdAt: string;
          processedAt: string | null;
        }>;
      }>,
  });

  const portalRssAiRecentJobs = portalRssAiMeta?.recentJobs ?? [];
  const portalRssAiFailedJobs = useMemo(
    () => portalRssAiRecentJobs.filter((j) => j.status === "failed" || Boolean(j.errorMessage)),
    [portalRssAiRecentJobs],
  );

  function formatAiJobTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function aiJobStatusLabel(status: string): string {
    if (status === "completed") return "Tamamlandı";
    if (status === "failed") return "Hata";
    if (status === "processing") return "İşleniyor";
    if (status === "queued") return "Bekliyor";
    return status;
  }

  useEffect(() => {
    if (!portalRssAiMeta?.config) return;
    setAiMetaEnabled(portalRssAiMeta.config.enabled);
    setAiMetaHourlyLimit(String(portalRssAiMeta.config.hourlyLimit));
  }, [portalRssAiMeta?.config?.enabled, portalRssAiMeta?.config?.hourlyLimit]);

  useEffect(() => setP(initialPrefs), [initialPrefs]);

  const newsHomeOrder = resolveHmHomeModuleOrder(p.hmNewsHomeModuleOrder, HM_NEWS_HOME_MODULE_ORDER);
  const isNewsEditorModuleActive = (moduleId: HmNewsHomeModuleId) => resolveHmNewsEditorModuleEnabled(p, moduleId);
  const newsCategoryAssignableModules = useMemo(() => {
    const assignable = new Set(HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE);
    return newsHomeOrder.filter((id): id is HmNewsHomeModuleId => {
      if (!assignable.has(id as HmNewsHomeModuleId)) return false;
      return isHmNewsModuleCompatibleWithTheme(p.hmVitrinTheme, id as HmNewsHomeModuleId);
    });
  }, [newsHomeOrder, p]);
  const corporateHomeOrder = resolveHmHomeModuleOrder(p.hmCorporateHomeModuleOrder, HM_CORPORATE_HOME_MODULE_ORDER);
  const sadePortalOrder = resolveSadeNewsPortalModuleOrder(p);
  const breakingRssRows = resolveHmBreakingRssFeedRows(p);
  const portalHybridRssFeeds = p.portalHybridRssFeeds ?? [];
  const portalHybridGroups = useMemo(
    () => groupPortalHybridRssFeedsByCategory(portalHybridRssFeeds),
    [portalHybridRssFeeds],
  );

  const commit = async (next: NewsSiteLayoutPrefs) => {
    setP(next);
    setSaving(true);
    try {
      const r = await updateSettings.mutateAsync({
        data: { newsLayoutJson: safeJsonStringifyPrefs(next) },
      });
      await queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
      writeNewsSiteLayoutPrefs(next);
      dispatchHmLayoutUpdated("portal");
      toast({ title: "Yekpare haber vitrini kaydedildi", description: r.siteName });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: String((e as Error)?.message ?? e).slice(0, 240),
        variant: "destructive",
      });
      setP(initialPrefs);
    } finally {
      setSaving(false);
    }
  };

  const toggleDefaultOn = (key: keyof NewsSiteLayoutPrefs, checked: boolean) => {
    void commit({ ...p, [key]: checked ? true : false });
  };

  const toggleSadePortalModule = (moduleId: SadeNewsPortalModuleId, checked: boolean) => {
    if (moduleId === "financeWeather") {
      void commit({ ...p, tickerFinance: checked, tickerWeather: checked });
      return;
    }
    const key = sadeNewsPortalModuleToggleKey(moduleId);
    if (!key) return;
    void commit({ ...p, [key]: checked ? true : false });
  };

  const saveBreakingRssRows = (rows: HmBreakingRssFeedRow[]) => {
    const cleaned = cleanHmBreakingRssFeedRows(rows) ?? [];
    return {
      hmNewsBreakingRssFeedRows: cleaned,
      ...syncBreakingRssLegacyFieldsFromRows(cleaned),
    };
  };

  const savePortalHybridRssFeeds = (rows: PortalHybridRssFeed[]) => ({
    portalHybridRssFeeds: cleanPortalHybridRssFeeds(rows) ?? [],
  });

  const updatePortalHybridFeed = (id: string, patch: Partial<PortalHybridRssFeed>) => {
    const target = portalHybridRssFeeds.find((row) => row.id === id);
    const categorySlug = target?.categorySlug ?? "";
    setP({
      ...p,
      portalHybridRssFeeds: portalHybridRssFeeds.map((row) => {
        if (row.id === id) return { ...row, ...patch };
        if (patch.label && categorySlug && row.categorySlug === categorySlug) {
          return { ...row, label: patch.label };
        }
        if (patch.categorySlug && categorySlug && row.categorySlug === categorySlug) {
          return { ...row, categorySlug: patch.categorySlug, label: patch.label ?? row.label };
        }
        return row;
      }),
    });
  };

  const addPortalHybridFeed = () => {
    const usedSlugs = new Set(portalHybridRssFeeds.map((row) => row.categorySlug));
    const firstUnusedCategory = portalCategories.find((cat) => cat.slug && !usedSlugs.has(cat.slug));
    const defaultSlug = firstUnusedCategory?.slug ?? portalCategories[0]?.slug ?? "gundem";
    const nextFeed = createPortalHybridRssFeed(defaultSlug);
    if (firstUnusedCategory?.name) nextFeed.label = firstUnusedCategory.name;
    setP({
      ...p,
      portalHybridRssFeeds: [...portalHybridRssFeeds, nextFeed],
    });
  };

  const addPortalHybridFeedUrlRow = (categorySlug: string, label: string) => {
    setP({
      ...p,
      portalHybridRssFeeds: [...portalHybridRssFeeds, createPortalHybridRssFeedUrlRow(categorySlug, label)],
    });
  };

  const removePortalHybridFeed = (id: string) => {
    setP({
      ...p,
      portalHybridRssFeeds: portalHybridRssFeeds.filter((row) => row.id !== id),
    });
  };

  const removePortalHybridGroup = (categorySlug: string) => {
    setP({
      ...p,
      portalHybridRssFeeds: portalHybridRssFeeds.filter((row) => row.categorySlug !== categorySlug),
    });
  };

  const saveAllLayoutPrefs = (next: NewsSiteLayoutPrefs) =>
    commit({
      ...next,
      ...saveBreakingRssRows(resolveHmBreakingRssFeedRows(next)),
      ...savePortalHybridRssFeeds(resolvePortalHybridRssFeeds(next)),
    });

  const categoryOptions = buildUnifiedHomeCategoryOptions({
    siteCategories: portalCategories,
    rssFeedRows: breakingRssRows,
    portalHybridFeeds: portalHybridRssFeeds,
  });
  const selectedFeaturedStripSlugs = (p.hmNewsFeaturedCategoryStripSlugs ?? [])
    .map((slug) => String(slug).trim().toLowerCase())
    .filter(Boolean);

  const toggleFeaturedStripSlug = (slugRaw: string, checked: boolean) => {
    const slug = slugRaw.trim().toLowerCase();
    if (!slug) return;
    const current = new Set(selectedFeaturedStripSlugs);
    if (checked) current.add(slug);
    else current.delete(slug);
    void commit({ ...p, hmNewsFeaturedCategoryStripSlugs: Array.from(current) });
  };

  const updateNewsModuleCategory = (moduleId: HmNewsHomeModuleId, slugRaw: string) => {
    if (!isNewsEditorModuleActive(moduleId)) return;
    const slug = slugRaw === "__all" ? "" : normalizeHomeModuleCategorySlug(slugRaw);
    const next = { ...(p.hmNewsHomeModuleCategorySlugs ?? {}) };
    if (slug) next[moduleId] = slug;
    else delete next[moduleId];
    setP({
      ...p,
      hmNewsHomeModuleCategorySlugs: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const updateNewsModuleGallerySource = (moduleId: HmMediaGalleryHomeModuleId, sourceId: HmMediaGallerySourceId) => {
    setP({
      ...p,
      hmNewsHomeModuleGallerySources: {
        ...(p.hmNewsHomeModuleGallerySources ?? {}),
        [moduleId]: sourceId,
      },
    });
  };

  const updateNewsModuleGalleryVideoTvRef = (
    moduleId: HmMediaGalleryHomeModuleId,
    patch: Partial<HmNewsGalleryVideoTvRef>,
  ) => {
    const prev = p.hmNewsHomeModuleGalleryVideoTvRefs?.[moduleId] ?? {};
    const nextRef: HmNewsGalleryVideoTvRef = { ...prev, ...patch };
    if (patch.channelSourceId === null) delete nextRef.channelSourceId;
    if (patch.playlistSourceId === null) delete nextRef.playlistSourceId;
    if (patch.manualLink === null || patch.manualLink === "") delete nextRef.manualLink;
    const next: HmNewsHomeModuleGalleryVideoTvRefs = { ...(p.hmNewsHomeModuleGalleryVideoTvRefs ?? {}) };
    if (Object.keys(nextRef).length > 0) next[moduleId] = nextRef;
    else delete next[moduleId];
    setP({
      ...p,
      hmNewsHomeModuleGalleryVideoTvRefs: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const mediaGalleryBlockLabel = (moduleId: HmMediaGalleryHomeModuleId) =>
    hmMediaGalleryBlockLabel(p, moduleId);

  if (isLoading) {
    return (
      <AdminLayout title="Yekpare Haberler (vitrin)">
        <div className="p-8 text-sm text-slate-600">Yükleniyor…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Yekpare Haberler (vitrin)">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm text-slate-600">
          Bu ekran `yekpare.net/haberler` sayfasının vitrin düzenini yönetir (editör sitesindeki “Vitrin ayarları” ile aynı mantık).
          Sade tema `/haberler` modülleri aşaşıdaki anahtarlarla açılıp kapatılır; manşet, yazarlar ve Atatürk bandı varsayılan açıktır.
          Son gelişmeler, son dakika, namaz/günün sözü ve RSS son dakika kart bandı `/haberler` düzeninden kaldırıldı (admin açsa bile gösterilmez).
        </p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <p className="font-black text-slate-900">Kaydet</p>
            <p className="text-xs text-slate-500">Değişiklikleri yayınlamak için kaydet butonunu kullanın.</p>
          </div>
          <Button
            disabled={saving}
            onClick={() => void saveAllLayoutPrefs(p)}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>

        <Tabs defaultValue="sade" className="w-full">
          <TabsList className="mb-4 h-auto flex flex-wrap justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <TabsTrigger value="sade" className="px-3 py-2 text-sm">
              Sade /haberler
            </TabsTrigger>
            <TabsTrigger value="kategori-rss" className="px-3 py-2 text-sm">
              Kategori RSS
            </TabsTrigger>
            <TabsTrigger value="moduller" className="px-3 py-2 text-sm">
              Vitrin modülleri
            </TabsTrigger>
            <TabsTrigger value="duzen" className="px-3 py-2 text-sm">
              Sıra & kategoriler
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="sade"
            forceMount
            className="mt-0 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-4 sm:px-5 data-[state=inactive]:hidden"
          >
              <div className="min-w-0 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">Yekpare /haberler (Sade) modülleri</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  Manşet, piyasa/hava, son dakika, yazarlar, Tarih ve Millî Günler bandı — portal haber sayfası.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white divide-y">
                <div className="px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Modül görünürlüğü</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Kapalı modüller yalnızca yekpare.net/haberler sayfasında gizlenir. Kaldırılan modüller:{" "}
                    {SADE_NEWS_PORTAL_RETIRED_MODULE_IDS.map((id) => SADE_NEWS_PORTAL_MODULE_LABELS[id]).join(", ")}.
                  </p>
                </div>
                <ToggleRow
                  id="sade-home-cities"
                  label="Anasayfa — 🗺️ Türkiye Şehirleri bandı"
                  checked={isSadeHomeCitiesBandEnabled(p)}
                  disabled={saving}
                  onChange={(checked) => toggleDefaultOn("sadeNewsCitiesBandEnabled", checked)}
                />
                {SADE_NEWS_PORTAL_ACTIVE_MODULE_ORDER.map((moduleId) => (
                  <ToggleRow
                    key={moduleId}
                    id={`sade-portal-${moduleId}`}
                    label={SADE_NEWS_PORTAL_MODULE_LABELS[moduleId]}
                    checked={isSadeNewsPortalModuleEnabled(p, moduleId)}
                    disabled={saving}
                    onChange={(checked) => toggleSadePortalModule(moduleId, checked)}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="font-black text-slate-900">Modül sırası (/haberler)</p>
                <div className="space-y-2">
                  {sadePortalOrder.map((id, idx) => (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">{SADE_NEWS_PORTAL_MODULE_LABELS[id] ?? id}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setP({ ...p, sadeNewsPortalModuleOrder: moveArrayItem(sadePortalOrder, idx, -1) as string[] })
                          }
                          disabled={idx === 0 || saving}
                          title="Yukarı"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setP({ ...p, sadeNewsPortalModuleOrder: moveArrayItem(sadePortalOrder, idx, 1) as string[] })
                          }
                          disabled={idx === sadePortalOrder.length - 1 || saving}
                          title="Aşaşı"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </TabsContent>

          <TabsContent
            value="kategori-rss"
            forceMount
            className="mt-0 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 px-4 py-4 sm:px-5 data-[state=inactive]:hidden"
          >
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">RSS otomasyonu (zamanlanmış)</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Varsayılan kapalı. Açıkken yalnızca RSS çekimi günde 3 kez —{" "}
                      {rssAutomation?.schedule?.label ?? "01:00, 09:00, 18:00"} (
                      {rssAutomation?.schedule?.timezone ?? "Europe/Istanbul"}) — otomatik çalışır.
                      Her slotta kategori başına 20 benzersiz haber <code className="text-xs">news</code> tablosuna
                      aktarılır; havuz temizliği 180 günde bir uygulanır.
                    </p>
                    {rssAutomation ? (
                      <p className="text-[11px] text-slate-500 mt-1">
                        TR saati: {rssAutomation.turkeyTime}
                        {rssAutomation.nextScheduledRun
                          ? ` · Sonraki planlı çalışma: ${rssAutomation.nextScheduledRun}`
                          : null}
                        {rssAutomation.schedulersRunning
                          ? rssAutomation.withinScheduledSlot
                            ? " · Zamanlayıcı aktif (planlı slot içinde)"
                            : " · Zamanlayıcı bekliyor (slot dışında)"
                          : " · Zamanlayıcı durdu"}
                      </p>
                    ) : null}
                  </div>
                  <Switch
                    id="rss-automation-enabled"
                    checked={Boolean(rssAutomation?.rssAutomationEnabled)}
                    disabled={rssAutomationSaving}
                    onCheckedChange={async (checked) => {
                      setRssAutomationSaving(true);
                      try {
                        await apiRequest("/api/admin/background-jobs/rss", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ enabled: checked }),
                        });
                        await refetchRssAutomation();
                        toast({
                          title: checked ? "RSS otomasyonu açıldı" : "RSS otomasyonu kapatıldı",
                          description: checked
                            ? `Günde 3 kez (${rssAutomation?.schedule?.label ?? "01:00, 09:00, 18:00"} TR) RSS çekimi otomatik çalışır.`
                            : "Arka plan RSS botları durduruldu.",
                        });
                      } catch (e) {
                        toast({
                          title: "RSS otomasyonu güncellenemedi",
                          description: e instanceof Error ? e.message : String(e),
                          variant: "destructive",
                        });
                      } finally {
                        setRssAutomationSaving(false);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">Site içi RSS kaynakları</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  `/haberler` site içi RSS hibrit akışı için kategori bazlı harici RSS URL&apos;leri. Çekilen öğeler{" "}
                  <code className="text-xs">portal_rss_items</code> tablosuna yazılır; varsayılan olarak vitrin için{" "}
                  <code className="text-xs">news</code> tablosuna da senkron edilir. «Kutu içi RSS» widget beslemeleri
                  canlı kalır, DB&apos;ye yazılmaz.
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-4">
                <div>
                  <p className="font-black text-slate-900">RSS başlık + spot AI özgünleştirme</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Varsayılan kapalı. Açıldığında yeni RSS kayıtları kuyruğa alınır; işleme yalnızca «Şimdi 1 haber işle»
                    ile manuel yapılır (RSS zamanlamasından bağımsız). Yalnızca başlık ve spot Gemini/OpenAI ile
                    özgünleştirilir; gövde metnine dokunulmaz. Saatlik üst sınır otomatik işlem için geçerlidir.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="space-y-1">
                    <Label htmlFor="portal-rss-ai-meta-enabled" className="font-bold text-slate-900">
                      Aktif
                    </Label>
                    <p className="text-xs text-slate-500">
                      Kapalıyken kuyruk oluşmaz. Açıkken RSS çekimi etkilenmez; işlem manuel düğmeyle yapılır.
                    </p>
                  </div>
                  <Switch
                    id="portal-rss-ai-meta-enabled"
                    checked={aiMetaEnabled}
                    disabled={aiMetaSaving}
                    onCheckedChange={setAiMetaEnabled}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="portal-rss-ai-meta-limit">Saatlik üst sınır</Label>
                    <Input
                      id="portal-rss-ai-meta-limit"
                      type="number"
                      min={1}
                      max={200}
                      value={aiMetaHourlyLimit}
                      disabled={aiMetaSaving}
                      onChange={(e) => setAiMetaHourlyLimit(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Env varsayılanı: {portalRssAiMeta?.config?.envHourlyLimit ?? 20}/saat
                    </p>
                  </div>
                  <Button
                    type="button"
                    disabled={aiMetaSaving}
                    className="gap-2"
                    onClick={async () => {
                      setAiMetaSaving(true);
                      try {
                        const limit = Number(aiMetaHourlyLimit);
                        await apiRequest("/api/admin/portal-rss/ai-meta", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            enabled: aiMetaEnabled,
                            hourlyLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
                          }),
                        });
                        await refetchPortalRssAiMeta();
                        toast({ title: "RSS AI ayarları kaydedildi" });
                      } catch (e) {
                        toast({
                          title: "Kaydedilemedi",
                          description: e instanceof Error ? e.message : String(e),
                          variant: "destructive",
                        });
                      } finally {
                        setAiMetaSaving(false);
                      }
                    }}
                  >
                    <Save className="w-4 h-4" />
                    {aiMetaSaving ? "Kaydediliyor…" : "AI ayarını kaydet"}
                  </Button>
                </div>
                {portalRssAiMeta?.queue ? (
                  <p className="text-xs text-slate-600">
                    Kuyruk: {portalRssAiMeta.queue.queued} bekleyen · {portalRssAiMeta.queue.processing} işleniyor ·
                    son 1 saatte {portalRssAiMeta.queue.completedLastHour}/{portalRssAiMeta.queue.hourlyLimit} tamamlandı ·
                    {portalRssAiMeta.queue.failed} hatalı
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    disabled={aiMetaProcessing || aiMetaSaving}
                    onClick={async () => {
                      setAiMetaProcessing(true);
                      try {
                        const res = (await apiRequest("/api/admin/portal-rss/ai-meta/process-one", {
                          method: "POST",
                        })) as { result?: string };
                        await refetchPortalRssAiMeta();
                        const msg =
                          res.result === "processed"
                            ? "1 haber işlendi (veya yeniden denendi)."
                            : res.result === "skipped"
                              ? "Kuyrukta bekleyen haber yok."
                              : "İşlem tamamlanamadı.";
                        toast({ title: msg });
                      } catch (e) {
                        toast({
                          title: "Manuel işlem başarısız",
                          description: e instanceof Error ? e.message : String(e),
                          variant: "destructive",
                        });
                      } finally {
                        setAiMetaProcessing(false);
                      }
                    }}
                  >
                    <Play className="w-4 h-4" />
                    {aiMetaProcessing ? "İşleniyor…" : "Şimdi 1 haber işle"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={aiMetaProcessing}
                    onClick={() => void refetchPortalRssAiMeta()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Listeyi yenile
                  </Button>
                  <p className="text-xs text-slate-500">
                    Manuel işlem saatlik kotayı atlar; kuyruk boşsa sonuç gelmez.
                  </p>
                </div>

                {portalRssAiFailedJobs.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2">
                    <p className="text-sm font-bold text-red-900">Son hatalar</p>
                    <ul className="space-y-2 text-xs text-red-900">
                      {portalRssAiFailedJobs.slice(0, 5).map((job) => (
                        <li key={`fail-${job.id}`} className="border-b border-red-100 pb-2 last:border-0 last:pb-0">
                          <span className="font-semibold">#{job.newsId}</span> · {job.sourceTitle.slice(0, 80)}
                          {job.sourceTitle.length > 80 ? "…" : ""}
                          <br />
                          <span className="text-red-700">{job.errorMessage || "Bilinmeyen hata"}</span>
                          <span className="text-red-600/80"> · {formatAiJobTime(job.processedAt ?? job.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {portalRssAiRecentJobs.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <p className="px-3 py-2 text-sm font-bold text-slate-900 border-b border-slate-100">
                      Son işlenen / kuyruk kayıtları
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Durum</th>
                            <th className="px-3 py-2 font-semibold">Orijinal başlık</th>
                            <th className="px-3 py-2 font-semibold">Yeni başlık</th>
                            <th className="px-3 py-2 font-semibold">Zaman</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portalRssAiRecentJobs.slice(0, 10).map((job) => (
                            <tr key={job.id} className="border-t border-slate-100 align-top">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={
                                    job.status === "completed"
                                      ? "text-emerald-700 font-semibold"
                                      : job.status === "failed"
                                        ? "text-red-700 font-semibold"
                                        : job.status === "processing"
                                          ? "text-amber-700 font-semibold"
                                          : "text-slate-600"
                                  }
                                >
                                  {aiJobStatusLabel(job.status)}
                                </span>
                              </td>
                              <td className="px-3 py-2 max-w-[200px] truncate" title={job.sourceTitle}>
                                {job.sourceTitle}
                              </td>
                              <td className="px-3 py-2 max-w-[200px] truncate" title={job.resultTitle ?? ""}>
                                {job.status === "completed" && job.resultTitle ? job.resultTitle : "—"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                                {formatAiJobTime(job.processedAt ?? job.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Henüz kuyruk kaydı yok. Yeni RSS import&apos;larından sonra burada görünür.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <p className="font-black text-slate-900">SEO — site haritası ve arama motorları</p>
                <p className="text-xs text-slate-600">
                  Haber yayınlandığında site haritaları Google, Bing ve Yandex&apos;e otomatik pinglenir.
                  Google Indexing API için Render ortam değişkenleri gerekir — ayrıntılar:{" "}
                  <code className="text-[11px]">docs/GOOGLE-INDEXING-API-ENV.md</code>. GSC / Bing / Yandex
                  doğrulama meta etiketleri: Admin → Genel Ayarlar veya Haber Siteleri → SEO sekmesi.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">Kategori RSS kaynakları</p>
                    <p className="text-xs text-slate-500">
                      Her kaynak en fazla 20 öğe çeker; kategori başına gece otomasyonu 20 benzersiz haberi{" "}
                      <code className="text-xs">news</code> tablosuna aktarır.{" "}
                      <code className="text-xs">portal_rss_items</code> havuzu 180 gün (6 ay) saklanır —{" "}
                      <code className="text-xs">news</code> kayıtları kalıcıdır. Değişiklikten sonra kaydedin ve yenileyin.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={addPortalHybridFeed}
                      disabled={saving}
                    >
                      <Plus className="w-4 h-4" />
                      Yeni kategori RSS ekle
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={rssRefreshing || saving}
                      onClick={async () => {
                        setRssRefreshing(true);
                        try {
                          const r = (await apiRequest("/api/admin/portal-rss/refresh", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({}),
                          })) as Record<string, unknown>;
                          toast({
                            title: "RSS önbelleşi yenilendi",
                            description: `${String(r.feedCount ?? 0)} kaynak işlendi`,
                          });
                        } catch (e) {
                          toast({
                            title: "RSS yenileme başarısız",
                            description: e instanceof Error ? e.message : String(e),
                            variant: "destructive",
                          });
                        } finally {
                          setRssRefreshing(false);
                        }
                      }}
                    >
                      <RefreshCw className={`w-4 h-4 ${rssRefreshing ? "animate-spin" : ""}`} />
                      Önbelleği yenile
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {portalHybridGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz hibrit RSS kaynağı eklenmedi.</p>
                  ) : null}
                  {portalHybridGroups.map((group) => (
                    <div key={group.categorySlug} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {group.label || group.categorySlug}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-rose-600 hover:text-rose-700"
                          onClick={() => removePortalHybridGroup(group.categorySlug)}
                          disabled={saving}
                          title="Bu kategori RSS kaynağını tümüyle kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                          Kategoriyi kaldır
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-[11px] text-slate-600">Başlık</Label>
                          <Input
                            value={group.label}
                            disabled={saving}
                            onChange={(e) => updatePortalHybridFeed(group.rows[0]!.id, { label: e.target.value })}
                            placeholder="Örn. NTV Gündem"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-600">Kategori</Label>
                          <Select
                            value={group.categorySlug}
                            disabled={saving}
                            onValueChange={(v) => {
                              setP({
                                ...p,
                                portalHybridRssFeeds: portalHybridRssFeeds.map((row) =>
                                  row.categorySlug === group.categorySlug ? { ...row, categorySlug: v } : row,
                                ),
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {portalCategories.map((cat) => (
                                <SelectItem key={cat.slug} value={cat.slug}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {group.rows.map((row, rowIndex) => (
                          <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div>
                              <div className="mb-1 flex items-center gap-2">
                                <Switch
                                  checked={row.enabled}
                                  onCheckedChange={(checked) => updatePortalHybridFeed(row.id, { enabled: checked })}
                                  disabled={saving}
                                />
                                <Label className="text-[11px] text-slate-600">
                                  RSS URL{group.rows.length > 1 ? ` ${rowIndex + 1}` : ""}
                                </Label>
                              </div>
                              <Input
                                value={row.url}
                                disabled={saving}
                                onChange={(e) => updatePortalHybridFeed(row.id, { url: e.target.value })}
                                placeholder="https://...rss"
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removePortalHybridFeed(row.id)}
                              disabled={saving}
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => addPortalHybridFeedUrlRow(group.categorySlug, group.label)}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        RSS URL ekle
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={addPortalHybridFeed}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                    Yeni kategori RSS ekle
                  </Button>
                </div>
              </div>
          </TabsContent>

          <TabsContent
            value="moduller"
            forceMount
            className="mt-0 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-5 data-[state=inactive]:hidden"
          >
              <div className="min-w-0 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">Haberler vitrin modülleri</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  Manşet düzeni, modül aç/kapa ve renkli kategori şeridi.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div>
                  <Label className="font-semibold text-slate-900">Manşet düzeni</Label>
                  <Select
                    value={p.mansetVariant}
                    disabled={saving}
                    onValueChange={(v) => setP({ ...p, mansetVariant: v as NewsSiteLayoutPrefs["mansetVariant"] })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Slider + yan manşet listesi</SelectItem>
                      <SelectItem value="full-thumbs">Tam genişlik slider + alt küçük resim şeridi</SelectItem>
                      <SelectItem value="center-trio">Orta büyük manşet + sol/sağ kartlar</SelectItem>
                      <SelectItem value="full-numbered">Tam genişlik + numaralı manşetler</SelectItem>
                      <SelectItem value="magazine-grid">Dergi grid düzeni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="rounded-xl border border-slate-200 bg-white divide-y">
                <div className="px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Haber modülleri</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Editör vitrin ayarları ile aynı anahtarlar; `/haberler` sade modül sırası üst bölümde ayrıca yönetilir.
                  </p>
                </div>
                <ToggleRow id="yek-hm-news-slider" label="Manşet slider" checked={p.hmNewsSliderEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsSliderEnabled", c)} />
                <ToggleRow id="yek-hm-news-rss-headline" label="RSS haberleri manşette göster" checked={p.hmNewsRssHeadlineEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsRssHeadlineEnabled", c)} />
                <ToggleRow id="yek-hm-news-google-news-band" label="Kutu içi RSS" checked={p.hmNewsGoogleNewsBandEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsGoogleNewsBandEnabled", c)} />
                <ToggleRow id="yek-hm-news-portal3-block" label="Yekpare Haberler (editör sitelerinden manuel haberler)" checked={p.hmNewsPortal3ThemeBlockEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsPortal3ThemeBlockEnabled", c)} />
                <ToggleRow id="yek-hm-news-esen-block" label="MANŞET HABER kutusu (yalnızca manuel haberler)" checked={p.hmNewsEsenThemeBlockEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsEsenThemeBlockEnabled", c)} />
                <ToggleRow id="yek-hm-news-lead-list-sidebar" label="Büyük haber + sağ liste bloğu" checked={resolveHmNewsHomeModuleEnabled(p, "leadListSidebar")} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsLeadListSidebarEnabled", c)} />
                <ToggleRow id="yek-hm-news-media-dark-block" label={mediaGalleryBlockLabel("mediaDarkBlock")} checked={resolveHmNewsHomeModuleEnabled(p, "mediaDarkBlock")} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsMediaDarkBlockEnabled", c)} />
                <ToggleRow id="yek-hm-news-recent-videos-sidebar" label="Son eklenen videolar kutusu" checked={resolveHmNewsHomeModuleEnabled(p, "recentVideosSidebar")} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsRecentVideosSidebarEnabled", c)} />
                <ToggleRow id="yek-hm-news-world-briefs" label="Dünyadan Kısa Kısa" checked={p.hmNewsWorldBriefsEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsWorldBriefsEnabled", c)} />
                <ToggleRow id="yek-hm-news-popular-cities" label="Türkiye şehirleri bandı" checked={p.sadeNewsCitiesBandEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("sadeNewsCitiesBandEnabled", c)} />
                <ToggleRow id="yek-hm-news-ataturk" label="Atatürk Köşesi" checked={p.hmCorporateAtaturkCornerEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmCorporateAtaturkCornerEnabled", c)} />
                <ToggleRow id="yek-hm-news-sehit" label="Şehit sorgulama modülü" checked={p.hmSehitSearchEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmSehitSearchEnabled", c)} />
                <ToggleRow id="yek-hm-news-history" label="Tarih / savaşlar bandı" checked={p.hmCorporateWarsSectionEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmCorporateWarsSectionEnabled", c)} />
                <ToggleRow id="yek-hm-news-national-days" label="Millî günler bandı" checked={p.hmCorporateNationalDaysSectionEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmCorporateNationalDaysSectionEnabled", c)} />
                <ToggleRow id="yek-hm-news-support" label="Destek bandı" checked={p.hmCorporateDonation?.enabled === true} disabled={saving} onChange={(c) => void commit({ ...p, hmCorporateDonation: { ...(p.hmCorporateDonation ?? defaultNewsSiteLayoutPrefs.hmCorporateDonation!), enabled: c } })} />
                <ToggleRow id="yek-hm-news-quick" label="Slider yanındaki hızlı erişim" checked={p.hmNewsQuickLinksEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsQuickLinksEnabled", c)} />
                <ToggleRow id="yek-hm-news-horizontal-authors" label="yatay köşe yazarları" checked={resolveHmNewsHorizontalAuthorsEnabled(p)} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsHorizontalAuthorsEnabled", c)} />
                <ToggleRow id="yek-hm-news-sidebar-authors" label="sidebar köşe yazarları" checked={resolveHmNewsSidebarAuthorsEnabled(p)} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsSidebarAuthorsEnabled", c)} />
                <ToggleRow id="yek-hm-news-popular-sidebar" label="Popüler sidebar" checked={p.sadeNewsPopularSidebarEnabled !== false && p.hmNewsSidebarEnabled !== false} disabled={saving} onChange={(c) => void commit({ ...p, sadeNewsPopularSidebarEnabled: c, hmNewsSidebarEnabled: c })} />
                <ToggleRow id="yek-hm-news-sidebar-cats" label="Sidebar kategori listesi" checked={p.hmNewsSidebarCategoriesEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsSidebarCategoriesEnabled", c)} />
                <ToggleRow id="yek-hm-news-breaking-band" label="Son dakika bandı (/haberler kaldırıldı)" checked={p.hmNewsBreakingBandEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsBreakingBandEnabled", c)} />
                <ToggleRow id="yek-hm-news-ticker-finance" label="Finans ticker" checked={p.tickerFinance !== false} disabled={saving} onChange={(c) => toggleDefaultOn("tickerFinance", c)} />
                <ToggleRow id="yek-hm-news-ticker-weather" label="Hava durumu ticker" checked={p.tickerWeather !== false} disabled={saving} onChange={(c) => toggleDefaultOn("tickerWeather", c)} />
                <ToggleRow id="yek-hm-news-timeline" label="Zaman çizgisi (/haberler kaldırıldı)" checked={p.sadeNewsTimelineEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("sadeNewsTimelineEnabled", c)} />
                <ToggleRow id="yek-hm-news-public-info" label="Kamu bilgi kartları (/haberler kaldırıldı)" checked={p.sadeNewsPublicInfoEnabled === true} disabled={saving} onChange={(c) => toggleDefaultOn("sadeNewsPublicInfoEnabled", c)} />
                <ToggleRow id="yek-hm-news-newsletter" label="Bülten CTA" checked={p.sadeNewsNewsletterEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("sadeNewsNewsletterEnabled", c)} />
                <ToggleRow id="yek-hm-news-latest-grid" label="Son haberler ızgarası" checked={p.sadeNewsLatestGridEnabled !== false} disabled={saving} onChange={(c) => toggleDefaultOn("sadeNewsLatestGridEnabled", c)} />
                <ToggleRow id="yek-hm-news-latest-grid-main" label="Orta son haberler + sidebar — orta haber ızgarası" checked={resolveHmNewsLatestGridMainEnabled(p)} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsLatestGridMainEnabled", c)} />
                <ToggleRow id="yek-hm-news-latest-grid-sidebar" label="Orta son haberler + sidebar — sağ sidebar kutusu" checked={resolveHmNewsLatestGridSidebarEnabled(p)} disabled={saving} onChange={(c) => toggleDefaultOn("hmNewsLatestGridSidebarEnabled", c)} />
              </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <p className="font-black text-slate-900">Renkli kategori şeridi — kategoriler</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Anasayfadaki renkli kategori kartlarında gösterilecek kategoriler. Boş bırakılırsa otomatik olarak farklı kategoriler dağıtılır.
                  </p>
                </div>
                {categoryOptions.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryOptions.map((cat) => {
                      const checked = selectedFeaturedStripSlugs.includes(cat.slug);
                      return (
                        <label key={cat.slug} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          <Checkbox
                            checked={checked}
                            disabled={saving}
                            onCheckedChange={(value) => toggleFeaturedStripSlug(cat.slug, value === true)}
                          />
                          <span>{cat.name || cat.slug}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Kategori listesi yüklenince burada seçim yapılabilir.
                  </p>
                )}
              </div>
          </TabsContent>

          <TabsContent
            value="duzen"
            forceMount
            className="mt-0 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-5 data-[state=inactive]:hidden"
          >
              <div className="min-w-0 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">Modül sırası ve kutu kategorileri</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  Haber ve kurumsal tema modül sırası, anasayfa kutu kategorileri ve galeri kaynakları.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="font-black text-slate-900">Modül sırası (Haber teması)</p>
                <div className="space-y-2">
                  {newsHomeOrder.map((id, idx) => (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">{NEWS_HOME_MODULE_LABELS[id] ?? id}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setP({ ...p, hmNewsHomeModuleOrder: moveArrayItem(newsHomeOrder, idx, -1) as any })}
                          disabled={idx === 0 || saving}
                          title="Yukarı"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setP({ ...p, hmNewsHomeModuleOrder: moveArrayItem(newsHomeOrder, idx, 1) as any })}
                          disabled={idx === newsHomeOrder.length - 1 || saving}
                          title="Aşaşı"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div>
                  <p className="font-black text-slate-900">Anasayfa haber kutusu kategorileri</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Seçili vitrin temasıyla uyumlu kutular listelenir. Yeşil nokta aktif, kırmızı pasif kutuyu gösterir — pasif kutulara kategori atanamaz.
                  </p>
                </div>
                <div className="grid gap-3">
                  {newsCategoryAssignableModules.map((moduleId) => {
                    const moduleEnabled = isNewsEditorModuleActive(moduleId);
                    const rowDisabled = saving || !moduleEnabled;
                    return (
                    <div
                      key={moduleId}
                      className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center ${moduleEnabled ? "border-slate-200 bg-slate-50/70" : "border-slate-200 bg-slate-100/60 opacity-80"}`}
                    >
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${moduleEnabled ? "bg-emerald-500" : "bg-red-500"}`}
                            title={moduleEnabled ? "Aktif kutu" : "Pasif kutu"}
                            aria-hidden
                          />
                          <span className={moduleEnabled ? "" : "text-slate-500"}>{NEWS_HOME_MODULE_LABELS[moduleId] ?? moduleId}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {moduleEnabled ? "Bu kutunun haber kaynağı" : "Pasif — modülü önce aktif edin"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {categoryOptions.length > 0 ? (
                          <Select
                            value={p.hmNewsHomeModuleCategorySlugs?.[moduleId] || "__all"}
                            disabled={rowDisabled}
                            onValueChange={(value) => updateNewsModuleCategory(moduleId, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tüm kategoriler" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all">Tüm kategoriler</SelectItem>
                              {p.hmNewsHomeModuleCategorySlugs?.[moduleId] &&
                              !categoryOptions.some((cat) => cat.slug === p.hmNewsHomeModuleCategorySlugs?.[moduleId]) ? (
                                <SelectItem value={p.hmNewsHomeModuleCategorySlugs[moduleId]!}>
                                  {p.hmNewsHomeModuleCategorySlugs[moduleId]}
                                </SelectItem>
                              ) : null}
                              {categoryOptions.map((cat) => (
                                <SelectItem key={cat.slug} value={cat.slug}>
                                  {cat.name || cat.slug}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <Input
                          value={p.hmNewsHomeModuleCategorySlugs?.[moduleId] || ""}
                          disabled={rowDisabled}
                          placeholder={moduleEnabled ? "Kategori slug, örn. gundem" : "Önce modülü aktif edin"}
                          onChange={(event) => updateNewsModuleCategory(moduleId, event.target.value)}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <HmModuleGallerySourceEditor
                title="Galeri koyu blok kaynakları"
                description="Video / galeri kutularında gösterilecek içerik türünü seçin. Seçim yapılmazsa karma mod (Video TV öncelikli) kullanılır."
                moduleLabels={NEWS_HOME_MODULE_LABELS}
                layoutPrefs={p}
                values={p.hmNewsHomeModuleGallerySources ?? {}}
                videoTvRefs={p.hmNewsHomeModuleGalleryVideoTvRefs ?? {}}
                disabled={saving}
                onChange={updateNewsModuleGallerySource}
                onVideoTvRefChange={updateNewsModuleGalleryVideoTvRef}
              />

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="font-black text-slate-900">Modül sırası (Kurumsal tema)</p>
                <div className="space-y-2">
                  {corporateHomeOrder.map((id, idx) => (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">{CORPORATE_HOME_MODULE_LABELS[id] ?? id}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setP({ ...p, hmCorporateHomeModuleOrder: moveArrayItem(corporateHomeOrder, idx, -1) as any })
                          }
                          disabled={idx === 0 || saving}
                          title="Yukarı"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setP({ ...p, hmCorporateHomeModuleOrder: moveArrayItem(corporateHomeOrder, idx, 1) as any })
                          }
                          disabled={idx === corporateHomeOrder.length - 1 || saving}
                          title="Aşaşı"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
      <Switch id={id} disabled={disabled} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

