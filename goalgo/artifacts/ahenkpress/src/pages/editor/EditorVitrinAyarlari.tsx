import { buildUnifiedHomeCategoryOptions, HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE, normalizeHomeModuleCategorySlug } from "@/lib/hmHomeModuleCategories";
import { normalizeYekpareCategoryBoxCount, normalizeYekpareKutuItemCount, YEKPARE_CATEGORY_BOX_COUNT_OPTIONS } from "@/lib/hmCategoryBoxItems";
import {
  type HmMediaGalleryHomeModuleId,
  type HmMediaGallerySourceId,
  type HmNewsGalleryVideoTvRef,
  type HmNewsHomeModuleGalleryVideoTvRefs,
} from "@/lib/hmMediaSpotlightPool";
import { HmModuleGallerySourceEditor, hmMediaGalleryBlockLabel } from "@/components/HmModuleGallerySourceEditor";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HM_CORPORATE_HOME_MODULE_ORDER,
  HM_NEWS_HOME_MODULE_ORDER,
  HM_NEWS_EDITOR_HOME_MODULE_ORDER,
  defaultNewsSiteLayoutPrefs,
  hmNewsThemePresetPatch,
  resolveHmHomeModuleOrder,
  resolveHmNewsHomeModuleEnabled,
  resolveHmNewsEditorModuleEnabled,
  applyHmNewsEditorModuleTogglePatch,
  resolveHmCorporateEditorModuleEnabled,
  applyHmCorporateEditorModuleTogglePatch,
  resolveHmCorporateMainNewsLayout,
  isHmNewsModuleCompatibleWithTheme,
  shouldShowHmNewsEditorModule,
  canEnableHmNewsEditorModuleForTheme,
  resolveHmNewsClassicHeroLatestEnabled,
  formatHmNewsModuleEditorLabel,
  HM_VITRIN_THEME_SHORT_LABELS,
  HM_VITRIN_THEME_NEWS_EDITOR_OPTIONS,
  hmVitrinThemeFlowerLabel,
  resolveHmNewsHorizontalAuthorsEnabled,
  resolveHmNewsSidebarAuthorsEnabled,
  resolveHmNewsLatestGridMainEnabled,
  resolveHmNewsLatestGridSidebarEnabled,
  resolveHmBreakingRssDisplayMode,
  cleanHmBreakingRssDisplayMode,
  resolveHmUnifiedRssFeedRows,
  resolveHmBreakingRssFeedRows,
  resolveHmSiteRssFeedRows,
  resolveHmRssIntegrationMode,
  cleanHmRssIntegrationMode,
  createHmBreakingRssFeedRow,
  createHmBreakingRssFeedUrlRow,
  defaultHmBreakingRssFeedRows,
  groupHmBreakingRssFeedRowsByCategory,
  resolveHmBreakingRssCategoryKey,
  saveUnifiedHmRssFeedRows,
  type HmBreakingRssFeedRow,
  type HmBreakingRssDisplayMode,
  type HmRssIntegrationMode,
  type HmNewsHomeModuleId,
  type HmCorporateHomeModuleId,
  type NewsSiteLayoutPrefs,
  HM_HUB_ONLY_HOME_MODULE_IDS,
  HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS,
  resolveHmHeaderRightSlot,
  type HmHeaderRightSlotId,
} from "@/lib/newsSiteLayout";
import { Link } from "wouter";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiUrl, resolveClientMediaSrc, toPersistedPublicMediaUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { HM_EDITOR_AD_SLOT_DEFS } from "@/lib/hmEditorAdSlots";

function mergeHmNewsEditorModuleOrder(
  fullOrder: readonly HmNewsHomeModuleId[],
  enabledOrder: readonly HmNewsHomeModuleId[],
  isEnabled: (moduleId: HmNewsHomeModuleId) => boolean,
): HmNewsHomeModuleId[] {
  const enabledSet = new Set(enabledOrder);
  const disabled = fullOrder.filter((id) => !isEnabled(id));
  return [...enabledOrder, ...disabled.filter((id) => !enabledSet.has(id))];
}

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
  yemekHaber: "Yemek Haber modülü",
  ahenkIconCategoryRow: formatHmNewsModuleEditorLabel("ahenkIconCategoryRow", "İkon kategori şeridi"),
  ahenkGununSesiAuthors: formatHmNewsModuleEditorLabel("ahenkGununSesiAuthors", "Günün Sesi + köşe yazarları"),
  ahenkAnkaraGrid: formatHmNewsModuleEditorLabel("ahenkAnkaraGrid", "ANKARA 4'lü grid"),
  ahenkGundemLeadSide: formatHmNewsModuleEditorLabel("ahenkGundemLeadSide", "GÜNDEM büyük + 3 yan"),
  ahenkSporGrid: formatHmNewsModuleEditorLabel("ahenkSporGrid", "SPOR 2×3 grid"),
  sporModule: "SPOR + Süper Lig puan durumu",
  ahenkDunyaBlock: formatHmNewsModuleEditorLabel("ahenkDunyaBlock", "DÜNYA bloğu"),
  ahenkEkonomiGrid: formatHmNewsModuleEditorLabel("ahenkEkonomiGrid", "EKONOMİ 4×2 grid"),
  ahenkSonEklenenler: formatHmNewsModuleEditorLabel("ahenkSonEklenenler", "Son Eklenenler"),
  ahenkPopulerHaberler: formatHmNewsModuleEditorLabel("ahenkPopulerHaberler", "Popüler Haberler"),
  portal3ThemeBlock: formatHmNewsModuleEditorLabel("portal3ThemeBlock", "Gazete vitrini bloğu"),
  esenThemeBlock: formatHmNewsModuleEditorLabel("esenThemeBlock", "MANŞET HABER"),
  esenLeadPack: formatHmNewsModuleEditorLabel("esenLeadPack", "Günün Öne Çıkanları"),
  featuredCategoryStrip: formatHmNewsModuleEditorLabel("featuredCategoryStrip", "Kategori vitrini"),
  yekpareKategorilerKutusu: formatHmNewsModuleEditorLabel("yekpareKategorilerKutusu", "Yekpare Kategoriler Kutusu"),
  leadListSidebar: formatHmNewsModuleEditorLabel("leadListSidebar", "Büyük haber + sağ liste bloğu"),
  mediaDarkBlock: formatHmNewsModuleEditorLabel("mediaDarkBlock", "Video / galeri koyu blok"),
  recentVideosSidebar: formatHmNewsModuleEditorLabel("recentVideosSidebar", "Son eklenen videolar (sol kategori + 4×2 grid)"),
  mansetAd: "Manşet altı / banner reklam (Reklam: manset_alti)",
  authorsStrip: "Köşe yazarları şeridi",
  popularCities: "Türkiye Şehirleri",
  culturePortal: "Kültür Portalı",
  ataturkCorner: "Atatürk Köşesi",
  sehitSearch: "Şehit sorgulama modülü",
  heritageInfo: "Savaşlar + millî günler",
  homeMiddleAd: "Orta reklam alanı (Reklam: home_middle)",
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

const HM_HUB_ONLY_EDITOR_MODULES = new Set<HmNewsHomeModuleId>(HM_HUB_ONLY_HOME_MODULE_IDS);

export default function EditorVitrinAyarlari() {
  const { newsLayoutPrefs, saveNewsSiteLayout, saveHomeModuleOrder, site } = useHmEditor();
  const portalHubOnly = isYekparePortalHubOnly(
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
    site?.slug,
  );
  const { toast } = useToast();
  const [p, setP] = useState<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const [saving, setSaving] = useState(false);
  const [yekpareBoxCountDialogOpen, setYekpareBoxCountDialogOpen] = useState(false);
  const [pendingYekpareBoxCount, setPendingYekpareBoxCount] = useState<2 | 4 | 6 | 8>(4);
  const [headerRightBannerDraft, setHeaderRightBannerDraft] = useState("");
  const [headerRightTextDraft, setHeaderRightTextDraft] = useState("");
  const [headerBannerUploading, setHeaderBannerUploading] = useState(false);
  const headerBannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setP(newsLayoutPrefs);
    setHeaderRightBannerDraft(newsLayoutPrefs.hmHeaderRightBannerUrl ?? "");
    setHeaderRightTextDraft(newsLayoutPrefs.hmHeaderRightCustomText ?? "");
  }, [newsLayoutPrefs]);

  const commit = async (patch: Partial<NewsSiteLayoutPrefs>) => {
    const next = { ...newsLayoutPrefs, ...patch };
    setP(next);
    setSaving(true);
    const r = await saveNewsSiteLayout(next, { vitrinOnly: true, layoutPatch: patch });
    setSaving(false);
    if (!r.ok) {
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 220) || "Sunucuya yazılamadı; oturumunuzu kontrol edin.",
        variant: "destructive",
      });
      setP(newsLayoutPrefs);
    } else {
      toast({ title: "Vitrin ayarları kaydedildi", description: site?.displayName ?? undefined });
    }
  };

  const onPickHeaderRightBanner = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setHeaderBannerUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const full = toPersistedPublicMediaUrl(url);
      setHeaderRightBannerDraft(full);
      await commit({ hmHeaderRightBannerUrl: full, hmHeaderRightSlot: "banner" });
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setHeaderBannerUploading(false);
    }
  };

  const effectiveHeaderRightSlot = resolveHmHeaderRightSlot(p);
  const headerRightSlotValue = p.hmHeaderRightSlot ?? "auto";

  const newsHomeOrder = resolveHmHomeModuleOrder(p.hmNewsHomeModuleOrder, HM_NEWS_HOME_MODULE_ORDER);
  const newsEditorHomeOrder = resolveHmHomeModuleOrder(p.hmNewsHomeModuleOrder, HM_NEWS_EDITOR_HOME_MODULE_ORDER);
  const isNewsEditorModuleActive = (moduleId: HmNewsHomeModuleId) => {
    if (!portalHubOnly && HM_HUB_ONLY_EDITOR_MODULES.has(moduleId)) return false;
    return resolveHmNewsEditorModuleEnabled(p, moduleId);
  };
  const newsEditorHomeOrderEnabled = useMemo(
    () =>
      newsEditorHomeOrder.filter((id) => {
        const moduleId = id as HmNewsHomeModuleId;
        if (!shouldShowHmNewsEditorModule(p.hmVitrinTheme, moduleId)) return false;
        return isNewsEditorModuleActive(moduleId);
      }),
    [newsEditorHomeOrder, p, portalHubOnly],
  );
  const showNewsEditorModule = (moduleId: HmNewsHomeModuleId) =>
    shouldShowHmNewsEditorModule(p.hmVitrinTheme, moduleId);
  const newsCategoryAssignableModules = useMemo(() => {
    const assignable = new Set(HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE);
    return newsHomeOrder.filter((id): id is HmNewsHomeModuleId => {
      if (!assignable.has(id as HmNewsHomeModuleId)) return false;
      return isHmNewsModuleCompatibleWithTheme(p.hmVitrinTheme, id as HmNewsHomeModuleId);
    });
  }, [newsHomeOrder, p]);
  const corporateHomeOrder = resolveHmHomeModuleOrder(p.hmCorporateHomeModuleOrder, HM_CORPORATE_HOME_MODULE_ORDER);
  const isCorporateEditorSite = p.hmVitrinTheme === "corporate";
  const activeThemeLabel = hmVitrinThemeFlowerLabel(p.hmVitrinTheme);
  const corporateEditorHomeOrder = corporateHomeOrder;
  const corporateEditorHomeDefaults = HM_CORPORATE_HOME_MODULE_ORDER;
  const rssRows = resolveHmBreakingRssFeedRows(p);
  const siteRssRows = resolveHmSiteRssFeedRows(p);
  const rssIntegrationMode = resolveHmRssIntegrationMode(p);
  const breakingRssDisplayMode = resolveHmBreakingRssDisplayMode(p);
  const selectedClassicAraSlugs = (p.hmClassicAraMansetCategorySlugs ?? []).map((slug) => String(slug).trim().toLowerCase()).filter(Boolean);
  const selectedFeaturedStripSlugs = (p.hmNewsFeaturedCategoryStripSlugs ?? []).map((slug) => String(slug).trim().toLowerCase()).filter(Boolean);
  const selectedYekpareKutuSlugs = (p.hmYekpareKategorilerKutusuSlugs ?? []).map((slug) => String(slug).trim().toLowerCase()).filter(Boolean);
  const { data: siteCategories = [] } = useQuery<Array<{ slug?: string; name?: string }>>({
    queryKey: ["/api/categories", site?.id ?? 0, "editor-vitrin-classic-ara"],
    queryFn: () =>
      site?.id != null
        ? (apiRequest(`/api/categories?siteId=${encodeURIComponent(String(site.id))}`) as Promise<Array<{ slug?: string; name?: string }>>)
        : Promise.resolve([]),
    enabled: site?.id != null,
    staleTime: 10 * 60 * 1000,
  });

  const saveHomeOrder = async (key: "hmNewsHomeModuleOrder" | "hmCorporateHomeModuleOrder", items: readonly string[]) => {
    setP((prev) => ({ ...prev, [key]: [...items] }));
    setSaving(true);
    const r = await saveHomeModuleOrder({ [key]: [...items] });
    setSaving(false);
    if (!r.ok) {
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 220) || "Modül sırası sunucuya yazılamadı.",
        variant: "destructive",
      });
      setP(newsLayoutPrefs);
      return;
    }
    toast({ title: "Modül sırası kaydedildi", description: site?.displayName ?? undefined });
  };

  const categoryOptions = buildUnifiedHomeCategoryOptions({
    siteCategories,
    rssFeedRows: [...rssRows, ...siteRssRows],
  });

  const updateNewsModuleCategory = (moduleId: HmNewsHomeModuleId, slugRaw: string) => {
    if (!isNewsEditorModuleActive(moduleId)) return;
    const slug = slugRaw === "__all" ? "" : normalizeHomeModuleCategorySlug(slugRaw);
    const next = { ...(p.hmNewsHomeModuleCategorySlugs ?? {}) };
    if (slug) next[moduleId] = slug;
    else delete next[moduleId];
    void commit({
      ...p,
      hmNewsHomeModuleCategorySlugs: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const updateNewsModuleGallerySource = (moduleId: HmMediaGalleryHomeModuleId, sourceId: HmMediaGallerySourceId) => {
    void commit({
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
    void commit({
      ...p,
      hmNewsHomeModuleGalleryVideoTvRefs: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const mediaGalleryBlockLabel = (moduleId: HmMediaGalleryHomeModuleId) =>
    hmMediaGalleryBlockLabel(p, moduleId);

  const toggleDefaultOn = (key: keyof NewsSiteLayoutPrefs, checked: boolean) => {
    void commit({ [key]: checked ? true : false });
  };

  const toggleCorporateModule = (moduleId: HmCorporateHomeModuleId, checked: boolean) => {
    void commit({ ...p, ...applyHmCorporateEditorModuleTogglePatch(p, moduleId, checked) });
  };

  const corporateMainNewsLayout = resolveHmCorporateMainNewsLayout(p);

  const toggleClassicAraSlug = (slugRaw: string, checked: boolean) => {
    const slug = slugRaw.trim().toLowerCase();
    if (!slug) return;
    const current = new Set(selectedClassicAraSlugs);
    if (checked) current.add(slug);
    else current.delete(slug);
    void commit({ ...p, hmClassicAraMansetCategorySlugs: Array.from(current) });
  };

  const toggleFeaturedStripSlug = (slugRaw: string, checked: boolean) => {
    const slug = slugRaw.trim().toLowerCase();
    if (!slug) return;
    const current = new Set(selectedFeaturedStripSlugs);
    if (checked) current.add(slug);
    else current.delete(slug);
    void commit({ ...p, hmNewsFeaturedCategoryStripSlugs: Array.from(current) });
  };

  const toggleYekpareKutuSlug = (slugRaw: string, checked: boolean) => {
    const slug = slugRaw.trim().toLowerCase();
    if (!slug) return;
    const current = new Set(selectedYekpareKutuSlugs);
    if (checked) current.add(slug);
    else current.delete(slug);
    void commit({ ...p, hmYekpareKategorilerKutusuSlugs: Array.from(current) });
  };

  const yekpareKutuEnabled = resolveHmNewsHomeModuleEnabled(p, "yekpareKategorilerKutusu");
  const yekpareBoxCount = normalizeYekpareCategoryBoxCount(p.hmYekpareCategoryBoxCount);

  const guardThemeModuleEnable = (moduleId: HmNewsHomeModuleId, checked: boolean): boolean => {
    if (!checked || canEnableHmNewsEditorModuleForTheme(p.hmVitrinTheme, moduleId)) return true;
    toast({
      title: "Modül bu vitrin temasıyla uyumlu değil",
      description: `${NEWS_HOME_MODULE_LABELS[moduleId] ?? moduleId} yalnızca ilgili tema(lar)da kullanılır.`,
      variant: "destructive",
    });
    return false;
  };

  const themeModuleToggleDisabled = (moduleId: HmNewsHomeModuleId, enabled: boolean) =>
    saving || (!enabled && !canEnableHmNewsEditorModuleForTheme(p.hmVitrinTheme, moduleId));

  const toggleYekpareKutuModule = (checked: boolean) => {
    if (checked && !guardThemeModuleEnable("yekpareKategorilerKutusu", true)) return;
    if (!checked) {
      void commit({ ...p, hmNewsYekpareKategorilerKutusuEnabled: false });
      return;
    }
    setPendingYekpareBoxCount(yekpareBoxCount);
    setYekpareBoxCountDialogOpen(true);
  };

  const confirmYekpareBoxCount = () => {
    setYekpareBoxCountDialogOpen(false);
    void commit({
      ...p,
      hmNewsYekpareKategorilerKutusuEnabled: true,
      hmYekpareCategoryBoxCount: pendingYekpareBoxCount,
    });
  };

  const toggleHmNewsEditorModule = (moduleId: HmNewsHomeModuleId, checked: boolean) => {
    if (checked && !canEnableHmNewsEditorModuleForTheme(p.hmVitrinTheme, moduleId)) {
      toast({
        title: "Modül bu vitrin temasıyla uyumlu değil",
        description: `${NEWS_HOME_MODULE_LABELS[moduleId] ?? moduleId} yalnızca ilgili tema(lar)da kullanılır.`,
        variant: "destructive",
      });
      return;
    }
    if (moduleId === "yekpareKategorilerKutusu") {
      toggleYekpareKutuModule(checked);
      return;
    }
    void commit(applyHmNewsEditorModuleTogglePatch(newsLayoutPrefs, moduleId, checked));
  };

  const setBoxRssRowsLocal = (nextRows: HmBreakingRssFeedRow[]) => {
    setP({
      ...p,
      hmNewsBreakingRssFeedRows: nextRows,
    });
  };

  const setSiteRssRowsLocal = (nextRows: HmBreakingRssFeedRow[]) => {
    setP({
      ...p,
      hmNewsSiteRssFeedRows: nextRows,
    });
  };

  const updateRssRow = (id: string, patch: Partial<Pick<HmBreakingRssFeedRow, "label" | "url">>) => {
    const target = rssRows.find((row) => row.id === id);
    const categoryKey = target ? resolveHmBreakingRssCategoryKey(target) : "";
    setBoxRssRowsLocal(
      rssRows.map((row) => {
        if (row.id === id) return { ...row, ...patch };
        if (patch.label && categoryKey && resolveHmBreakingRssCategoryKey(row) === categoryKey) {
          return { ...row, label: patch.label };
        }
        return row;
      }),
    );
  };

  const updateSiteRssRow = (id: string, patch: Partial<Pick<HmBreakingRssFeedRow, "label" | "url">>) => {
    const target = siteRssRows.find((row) => row.id === id);
    const categoryKey = target ? resolveHmBreakingRssCategoryKey(target) : "";
    setSiteRssRowsLocal(
      siteRssRows.map((row) => {
        if (row.id === id) return { ...row, ...patch };
        if (patch.label && categoryKey && resolveHmBreakingRssCategoryKey(row) === categoryKey) {
          return { ...row, label: patch.label };
        }
        return row;
      }),
    );
  };

  const addRssRow = () => {
    setBoxRssRowsLocal([...rssRows, createHmBreakingRssFeedRow()]);
  };

  const addSiteRssRow = () => {
    setSiteRssRowsLocal([...siteRssRows, createHmBreakingRssFeedRow()]);
  };

  const addRssUrlRow = (categoryKey: string, label: string) => {
    setBoxRssRowsLocal([...rssRows, createHmBreakingRssFeedUrlRow(categoryKey, label)]);
  };

  const addSiteRssUrlRow = (categoryKey: string, label: string) => {
    setSiteRssRowsLocal([...siteRssRows, createHmBreakingRssFeedUrlRow(categoryKey, label)]);
  };

  const removeRssRow = (id: string) => {
    setBoxRssRowsLocal(rssRows.filter((row) => row.id !== id));
  };

  const removeSiteRssRow = (id: string) => {
    setSiteRssRowsLocal(siteRssRows.filter((row) => row.id !== id));
  };

  const saveRssRows = (boxRows: HmBreakingRssFeedRow[], nextSiteRows: HmBreakingRssFeedRow[]) => ({
    ...saveUnifiedHmRssFeedRows(boxRows),
    hmNewsSiteRssFeedRows: nextSiteRows,
  });

  const setBreakingRssDisplayMode = (mode: HmBreakingRssDisplayMode) => {
    void commit({
      ...p,
      ...saveRssRows(rssRows, siteRssRows),
      hmNewsBreakingRssDisplayMode: cleanHmBreakingRssDisplayMode(mode),
    });
  };

  const setRssIntegrationMode = (mode: HmRssIntegrationMode) => {
    void commit({
      ...p,
      hmRssIntegrationMode: cleanHmRssIntegrationMode(mode),
    });
  };

  return (
    <EditorLayout title="Vitrin ayarları">
      <div className="max-w-3xl space-y-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <Label className="font-semibold text-slate-900">Üst menü</Label>
            <p className="mt-1 text-xs text-slate-600">
              Logo yanındaki üst menü vitrinde her zaman açıktır. Menü öğelerini düzenleyip her birini aktif veya pasif
              yapabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="default" size="sm" asChild>
              <Link href="/editor/menuler?location=hmCorporateMenuItems">Üst menü editörü</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link
                href={
                  p.hmVitrinTheme === "corporate"
                    ? "/editor/menuler?location=hmCorporateMenuItems"
                    : "/editor/menuler?location=hmNewsFooterMenuItems"
                }
              >
                {p.hmVitrinTheme === "corporate" ? "Footer menüsü" : "Footer / sidebar menüleri"}
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Sol panelde <strong>Menüler</strong> sayfasından da erişebilirsiniz. Kaydettikten sonra vitrini yenileyin
            (Ctrl+F5).
          </p>
        </div>

        <p className="text-sm text-slate-600">
          Logo ve renkler:{" "}
          <Link href="/editor/genel-ayarlar" className="text-red-600 font-semibold hover:underline">
            Genel ayarlar
          </Link>
          . Reklam slotları (Yekpare ile aynı isimler):{" "}
          <Link href="/editor/reklam-alanlari" className="text-red-600 font-semibold hover:underline">
            Reklam alanları
          </Link>
          . Portal genel teması:{" "}
          <Link href="/admin/tema-ayarlari" className="text-red-600 font-semibold hover:underline">
            Tema ayarları
          </Link>{" "}
          (yönetici). Site: <span className="font-medium">{site?.slug ?? "—"}</span>
        </p>

        <Accordion type="multiple" defaultValue={isCorporateEditorSite ? ["corporate-modules"] : ["news-modules"]} className="space-y-3">
          {!isCorporateEditorSite ? (
          <AccordionItem
            value="news-modules"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 px-4 sm:px-5 border-b-0"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="min-w-0 flex-1 pr-3 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">Anasayfa düzeni</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  Haber gazetesi ve haber merkezi siteleri için tema, manşet, modül aç/kapa ve anasayfa sırası.
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
          <Tabs defaultValue="tema" className="w-full">
            <TabsList className="mb-4 h-auto flex flex-wrap justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <TabsTrigger value="tema" className="px-3 py-2 text-sm">
                Tema & manşet
              </TabsTrigger>
              <TabsTrigger value="moduller" className="px-3 py-2 text-sm">
                Modül aç/kapa
              </TabsTrigger>
              <TabsTrigger value="sira" className="px-3 py-2 text-sm">
                Modül sırası
              </TabsTrigger>
              <TabsTrigger value="kategoriler" className="px-3 py-2 text-sm">
                Kutu kategorileri
              </TabsTrigger>
              <TabsTrigger value="galeri" className="px-3 py-2 text-sm">
                Galeri
              </TabsTrigger>
              <TabsTrigger value="rss" className="px-3 py-2 text-sm">
                RSS & bant
              </TabsTrigger>
              <TabsTrigger value="reklam" className="px-3 py-2 text-sm">
                Reklam slotları
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tema" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <Label className="font-semibold text-slate-900">Haber sitesi teması</Label>
              <p className="mt-1 text-xs text-slate-500">
                Mevcut tema varsayılan kalır; portal temaları daha yoşun haber görünümü verir.
              </p>
              <Select
                value={
                  p.hmVitrinTheme === "classic" ||
                  p.hmVitrinTheme === "portal3" ||
                  p.hmVitrinTheme === "esen" ||
                  p.hmVitrinTheme === "manset24" ||
                  p.hmVitrinTheme === "renkli" ||
                  p.hmVitrinTheme === "ahenkhaber" ||
                  p.hmVitrinTheme === "modern"
                    ? p.hmVitrinTheme
                    : "news"
                }
                disabled={saving}
                onValueChange={(v) =>
                  void commit({
                    ...hmNewsThemePresetPatch(v),
                    hmVitrinTheme: v as NewsSiteLayoutPrefs["hmVitrinTheme"],
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HM_VITRIN_THEME_NEWS_EDITOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold text-slate-900">Üst krom modu (Işık / Koyu)</Label>
              <p className="mt-1 text-xs text-slate-500">
                Logo bandı, menü, son dakika ve piyasa/hava şeridinin açık veya koyu görünümü. Varsayılan seçili
                temanın krom stiline uyar.
              </p>
              <Select
                value={p.hmChromeColorMode ?? "light"}
                disabled={saving}
                onValueChange={(v) =>
                  void commit({
                    ...p,
                    hmChromeColorMode: v as NewsSiteLayoutPrefs["hmChromeColorMode"],
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Tema varsayılanı (otomatik)</SelectItem>
                  <SelectItem value="light">Açık (ışık modu)</SelectItem>
                  <SelectItem value="dark">Koyu (karanlık mod)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold text-slate-900">Manşet düzeni</Label>
              <Select
                value={p.mansetVariant}
                disabled={saving}
                onValueChange={(v) =>
                  void commit({ ...p, mansetVariant: v as NewsSiteLayoutPrefs["mansetVariant"] })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Slider + yan manşet listesi</SelectItem>
                  <SelectItem value="full-thumbs">Tam genişlik slider + alt küçük resim şeridi</SelectItem>
                  <SelectItem value="center-trio">Orta büyük manşet + sol/sağ kartlar</SelectItem>
                  <SelectItem value="full-numbered">Geniş numaralı slider + sağ reklam/kart alanı</SelectItem>
                  <SelectItem value="magazine-grid">Dergi / ön sayfa manşet grid</SelectItem>
                  <SelectItem value="slider-side-band">Slider + sol 1 / sağ 2 yan haber + ikon bandı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold text-slate-900">Manşet kategorisi</Label>
              <p className="mt-1 text-xs text-slate-500">
                Seçiliyse orta slider yalnızca bu kategoriden dolar (önce manşete eklenen, sonra manuel).
                Boş bırakılırsa tüm kategoriler kullanılır ve manşet dışında son dakika bandı gizlenir.
              </p>
              <Select
                value={p.mansetCategorySlug ?? ""}
                disabled={saving}
                onValueChange={(v) =>
                  void commit({ ...p, mansetCategorySlug: v === "__all__" ? null : v })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Tüm kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm kategoriler</SelectItem>
                  {siteCategories
                    .map((cat) => ({
                      slug: String(cat.slug ?? "").trim().toLowerCase(),
                      name: String(cat.name ?? cat.slug ?? "").trim(),
                    }))
                    .filter((cat) => cat.slug)
                    .slice(0, 24)
                    .map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name || cat.slug}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Label className="font-semibold text-slate-900">Klasik ara manşet kategorileri</Label>
              <p className="mt-1 text-xs text-slate-500">
                Seçiliyse klasik temadaki ara manşet blokları bu kategori sırasıyla kurulur; boş bırakılırsa otomatik kategori akışı kullanılır.
              </p>
              {siteCategories.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {siteCategories
                    .map((cat) => ({
                      slug: String(cat.slug ?? "").trim().toLowerCase(),
                      name: String(cat.name ?? cat.slug ?? "").trim(),
                    }))
                    .filter((cat) => cat.slug)
                    .slice(0, 16)
                    .map((cat) => {
                      const checked = selectedClassicAraSlugs.includes(cat.slug);
                      return (
                        <label key={cat.slug} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                          <Checkbox
                            checked={checked}
                            disabled={saving}
                            onCheckedChange={(value) => toggleClassicAraSlug(cat.slug, value === true)}
                          />
                          <span>{cat.name || cat.slug}</span>
                        </label>
                      );
                    })}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  Kategori listesi yüklenince burada seçim yapılabilir.
                </p>
              )}
            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <Label className="font-semibold text-slate-900">Görünüm ön ayarları</Label>
              <p className="mt-1 text-xs text-slate-600">
                Header, piyasa/hava bandı konumu ve manşet düzeni kaydedildiğinde{" "}
                <strong>HM sitenizde</strong> (özel alan veya <code className="text-[10px]">/tr/…</code>) anında uygulanır;
                değişiklikten sonra vitrini yenileyin (Ctrl+F5).
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Yekpare menü ön ayarı</Label>
                <p className="text-[11px] text-slate-500">
                  <strong>Yekpare ikon menü</strong> veya <strong>Özel menü</strong> şeffaf üst şerit kullanır.
                  Menü öğelerini <Link href="/editor/menuler?location=hmCorporateMenuItems" className="text-sky-700 underline">üst menü editöründe</Link> ekleyin;
                  kategori bağlantılarına emoji otomatik atanır. Yektube ikonu yalnızca <strong>yekpare.net</strong> hub vitrininde gösterilir.
                </p>
                <Select
                  value={p.yekpareMenuPreset ?? "default"}
                  disabled={saving}
                  onValueChange={(v) =>
                    void commit({
                      ...p,
                      yekpareMenuPreset: v as NonNullable<NewsSiteLayoutPrefs["yekpareMenuPreset"]>,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Varsayılan (mevcut menü)</SelectItem>
                    <SelectItem value="yekpare-icons">Yekpare ikon menü (Gündem, Ekonomi, …)</SelectItem>
                    <SelectItem value="custom">Özel menü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Header ön ayarı</Label>
                <Select
                  value={p.headerPreset ?? "default"}
                  disabled={saving}
                  onValueChange={(v) =>
                    void commit({
                      ...p,
                      headerPreset: v as NonNullable<NewsSiteLayoutPrefs["headerPreset"]>,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Varsayılan</SelectItem>
                    <SelectItem value="trabzonik">Trabzonik (logo sol, banner sağ, bordo nav)</SelectItem>
                    <SelectItem value="classic">Klasik gazete (ortalanmış logo, alt çizgili menü)</SelectItem>
                    <SelectItem value="minimal">Minimal (kompakt header, reklamsız)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Piyasa / hava bandı konumu</Label>
                <Select
                  value={p.tickerPlacement ?? "logo-side"}
                  disabled={saving}
                  onValueChange={(v) =>
                    void commit({
                      ...p,
                      tickerPlacement: v as NonNullable<NewsSiteLayoutPrefs["tickerPlacement"]>,
                    })
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo-side">Logo yanı</SelectItem>
                    <SelectItem value="below-menu">Menü altı</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Logo sağı alan</Label>
                <p className="text-[11px] text-slate-500">
                  Logo satırının sağında görünen içerik. Kurumsal sitelerde varsayılan: yazı + arama. Haber sitelerinde
                  varsayılan: piyasa/hava (logo yanı konumunda). Mobilde site açıklama yazısı gizlenir.
                  {effectiveHeaderRightSlot ? (
                    <>
                      {" "}
                      Şu an:{" "}
                      <strong>
                        {HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS.find((o) => o.value === effectiveHeaderRightSlot)?.label ??
                          effectiveHeaderRightSlot}
                      </strong>
                    </>
                  ) : null}
                </p>
                <Select
                  value={headerRightSlotValue}
                  disabled={saving}
                  onValueChange={(v) =>
                    void commit({
                      ...p,
                      hmHeaderRightSlot: v === "auto" ? undefined : (v as HmHeaderRightSlotId),
                    })
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Varsayılan (temaya göre)</SelectItem>
                    {HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(headerRightSlotValue === "text" ||
                  headerRightSlotValue === "text-search" ||
                  effectiveHeaderRightSlot === "text" ||
                  effectiveHeaderRightSlot === "text-search") && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-xs text-slate-600">Özel yazı (boşsa site açıklaması)</Label>
                    <Input
                      value={headerRightTextDraft}
                      disabled={saving}
                      placeholder="Kurumsal site tanıtım metni…"
                      onChange={(e) => setHeaderRightTextDraft(e.target.value)}
                      onBlur={() => {
                        const trimmed = headerRightTextDraft.trim();
                        const cur = (p.hmHeaderRightCustomText ?? "").trim();
                        if (trimmed === cur) return;
                        void commit({ hmHeaderRightCustomText: trimmed || undefined });
                      }}
                    />
                  </div>
                )}
                {(headerRightSlotValue === "banner" || effectiveHeaderRightSlot === "banner") && (
                  <div className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                    <Label className="text-xs text-slate-600">Banner görseli</Label>
                    <input
                      ref={headerBannerFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(ev) => void onPickHeaderRightBanner(ev)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving || headerBannerUploading}
                        className="gap-2"
                        onClick={() => headerBannerFileRef.current?.click()}
                      >
                        {headerBannerUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Görsel yükle
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={saving} asChild>
                        <Link href="/editor/reklam-alanlari">Reklam alanları</Link>
                      </Button>
                    </div>
                    <Input
                      value={headerRightBannerDraft}
                      disabled={saving}
                      placeholder="https://… veya /api/media/uploads/…"
                      onChange={(e) => setHeaderRightBannerDraft(e.target.value)}
                      onBlur={() => {
                        const trimmedRaw = headerRightBannerDraft.trim();
                        const trimmed = trimmedRaw ? toPersistedPublicMediaUrl(trimmedRaw) : null;
                        const cur = (p.hmHeaderRightBannerUrl ?? "").trim() || null;
                        if (trimmed === cur) return;
                        if (trimmed && trimmed !== trimmedRaw) setHeaderRightBannerDraft(trimmed);
                        void commit({ hmHeaderRightBannerUrl: trimmed ?? undefined });
                      }}
                    />
                    <p className="text-[11px] text-slate-500">
                      Boş bırakırsanız «Logo Yanı Banner» (
                      <code className="text-[10px]">header_logo_side</code>) reklam slotu kullanılır; o da boşsa masaüstünde
                      site açıklaması gösterilir.
                    </p>
                    {headerRightBannerDraft.trim() ? (
                      <img
                        src={resolveClientMediaSrc(headerRightBannerDraft.trim()) ?? headerRightBannerDraft.trim()}
                        alt="Banner önizleme"
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : null}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Header vurgu rengi</Label>
                <Input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(p.hmPrimaryColor ?? "") ? p.hmPrimaryColor! : "#c40021"}
                  disabled={saving}
                  className="h-10 w-full max-w-[8rem] cursor-pointer p-1"
                  onChange={(e) => void commit({ ...p, hmPrimaryColor: e.target.value })}
                />
                <p className="text-[11px] text-slate-500">Trabzonik nav ve kategori şeridi accent.</p>
              </div>
              <div className="space-y-2">
                <Label>İkincil renk</Label>
                <Input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(p.hmSecondaryColor ?? "") ? p.hmSecondaryColor! : "#0d63b6"}
                  disabled={saving}
                  className="h-10 w-full max-w-[8rem] cursor-pointer p-1"
                  onChange={(e) => void commit({ ...p, hmSecondaryColor: e.target.value })}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Logo yanı reklam:{" "}
              <Link href="/editor/reklam-alanlari" className="font-semibold text-red-600 hover:underline">
                Reklam alanları
              </Link>{" "}
              → «Logo Yanı Banner» (<code className="text-[10px]">header_logo_side</code>).
            </p>
          </div>
            </TabsContent>

            <TabsContent value="moduller" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white divide-y">
            <div className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Haber modülleri</p>
              <p className="mt-1 text-xs text-slate-500">
                Seçili tema: <span className="font-semibold text-slate-700">{activeThemeLabel}</span>. Açtığınız modüller
                tüm haber vitrin temalarında render edilir; etiketler modülün tipik kullanıldığı temayı gösterir.
              </p>
            </div>
            <div className="border-b border-slate-100 bg-sky-50/80">
              <ToggleRow
                id="hm-news-index-landing"
                label="Açılış index sayfası (domain giriş ekranı)"
                checked={p.hmNewsIndexLandingEnabled === true}
                disabled={saving}
                onChange={(c) => toggleDefaultOn("hmNewsIndexLandingEnabled", c)}
              />
              <div className="px-4 pb-3 text-xs text-slate-600">
                Özel alan kökünde (<code className="text-slate-700">/</code>) yekpare.net tarzı hızlı index: son dakika, döviz,
                hava, video, harita ve kategori kutuları. Tam site arka planda yüklenir; ziyaretçi «Siteye gir» ile vitrine geçer.
              </div>
            </div>
            <ToggleRow
              id="hm-news-classic-hero-latest"
              label={`${HM_VITRIN_THEME_SHORT_LABELS.classic} / ${HM_VITRIN_THEME_SHORT_LABELS.portal3}: Son Haberler (manşet yanı sağ)`}
              checked={resolveHmNewsClassicHeroLatestEnabled(p)}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsClassicHeroLatestEnabled", c)}
            />
            <div className="border-b border-slate-100 px-4 py-3 space-y-3">
              <div>
                <Label className="font-semibold text-slate-900">Şerit menü</Label>
                <p className="mt-1 text-xs text-slate-600">
                  Mobilde sayfa altında sabit duran menü (Anasayfa, Sondakika, Video, Harita, Bilgi Ağacı). Varsayılan kapalıdır.
                </p>
              </div>
              <ToggleRow
                id="hm-strip-menu-master"
                label="Şerit menüsünü göster"
                checked={p.hmNewsStripMenuEnabled === true}
                disabled={saving}
                onChange={(c) => toggleDefaultOn("hmNewsStripMenuEnabled", c)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="default" size="sm" asChild>
                  <Link href="/editor/menuler?location=hmNewsStripMenuItems">Şerit menü editörü</Link>
                </Button>
              </div>
            </div>
            <ToggleRow
              id="hm-news-search-box"
              label="Yekpare arama kutusu (anasayfa)"
              checked={p.hmNewsSearchBoxEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSearchBoxEnabled", c)}
            />
            <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">
              Pasifken üst menüde Video TV rozeti gizlenir; footer bağlantıları ve <code className="text-slate-600">/video-tv</code> sayfaları devre dışı kalır.
            </div>
            {portalHubOnly ? (
            <ToggleRow
              id="hm-news-video-tv"
              label="Video TV menüde göster"
              checked={p.hmNewsVideoTvEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsVideoTvEnabled", c)}
            />
            ) : null}
            <ToggleRow
              id="hm-news-yekpare-features"
              label="Yekpare özellikleri (servis kutuları)"
              checked={p.hmNewsYekpareFeaturesEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsYekpareFeaturesEnabled", c)}
            />
            <ToggleRow
              id="hm-news-slider"
              label="Manşet slider"
              checked={p.hmNewsSliderEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSliderEnabled", c)}
            />
            <ToggleRow
              id="hm-news-tepe-manset"
              label="Tepe Manşet sistemi"
              checked={p.hmNewsTepeMansetEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsTepeMansetEnabled", c)}
            />
            <ToggleRow
              id="hm-news-spor-module"
              label={NEWS_HOME_MODULE_LABELS.sporModule}
              checked={p.hmNewsSporModuleEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSporModuleEnabled", c)}
            />
            <ToggleRow
              id="hm-news-world-briefs"
              label={NEWS_HOME_MODULE_LABELS.worldBriefs}
              checked={p.hmNewsWorldBriefsEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleHmNewsEditorModule("worldBriefs", c === true)}
            />
            <ToggleRow
              id="hm-news-rss-headline"
              label="RSS haberleri manşette göster"
              checked={p.hmNewsRssHeadlineEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsRssHeadlineEnabled", c)}
            />
            <ToggleRow
              id="hm-news-band"
              label="Son dakika / finans bandı"
              checked={p.hmNewsBreakingBandEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsBreakingBandEnabled", c)}
            />
            <ToggleRow
              id="hm-news-google-news-band"
              label="Kutu içi RSS"
              checked={p.hmNewsGoogleNewsBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsGoogleNewsBandEnabled", c)}
            />
            <ToggleRow
              id="hm-news-site-internal-rss"
              label="Site içi RSS"
              checked={p.hybridRssEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hybridRssEnabled", c)}
            />
            {showNewsEditorModule("portal3ThemeBlock") ? (
            <ToggleRow
              id="hm-news-portal3-block"
              label={NEWS_HOME_MODULE_LABELS.portal3ThemeBlock}
              checked={resolveHmNewsHomeModuleEnabled(p, "portal3ThemeBlock")}
              disabled={themeModuleToggleDisabled("portal3ThemeBlock", resolveHmNewsHomeModuleEnabled(p, "portal3ThemeBlock"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("portal3ThemeBlock", c === true)) return;
                toggleDefaultOn("hmNewsPortal3ThemeBlockEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("esenThemeBlock") ? (
            <ToggleRow
              id="hm-news-esen-block"
              label={NEWS_HOME_MODULE_LABELS.esenThemeBlock}
              checked={resolveHmNewsHomeModuleEnabled(p, "esenThemeBlock")}
              disabled={themeModuleToggleDisabled("esenThemeBlock", resolveHmNewsHomeModuleEnabled(p, "esenThemeBlock"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("esenThemeBlock", c === true)) return;
                toggleDefaultOn("hmNewsEsenThemeBlockEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("esenLeadPack") ? (
            <ToggleRow
              id="hm-news-esen-lead-pack"
              label={NEWS_HOME_MODULE_LABELS.esenLeadPack}
              checked={resolveHmNewsHomeModuleEnabled(p, "esenLeadPack")}
              disabled={themeModuleToggleDisabled("esenLeadPack", resolveHmNewsHomeModuleEnabled(p, "esenLeadPack"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("esenLeadPack", c === true)) return;
                toggleHmNewsEditorModule("esenLeadPack", c === true);
              }}
            />
            ) : null}
            {showNewsEditorModule("featuredCategoryStrip") ? (
            <ToggleRow
              id="hm-news-featured-category-strip"
              label={NEWS_HOME_MODULE_LABELS.featuredCategoryStrip}
              checked={resolveHmNewsHomeModuleEnabled(p, "featuredCategoryStrip")}
              disabled={themeModuleToggleDisabled("featuredCategoryStrip", resolveHmNewsHomeModuleEnabled(p, "featuredCategoryStrip"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("featuredCategoryStrip", c === true)) return;
                toggleDefaultOn("hmNewsFeaturedCategoryStripEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("yekpareKategorilerKutusu") ? (
            <>
            <ToggleRow
              id="hm-news-yekpare-kategori-kutusu"
              label={NEWS_HOME_MODULE_LABELS.yekpareKategorilerKutusu}
              checked={yekpareKutuEnabled}
              disabled={themeModuleToggleDisabled("yekpareKategorilerKutusu", yekpareKutuEnabled)}
              onChange={toggleYekpareKutuModule}
            />
            {yekpareKutuEnabled ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div>
                  <Label className="font-semibold text-slate-900">Yekpare Kategoriler Kutusu — kategoriler</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    yekpare.net/hg tarzı kategori kutuları. Seçilen sıra anasayfada korunur; boş bırakılırsa otomatik kategoriler kullanılır.
                  </p>
                </div>
                {categoryOptions.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryOptions.map((cat) => {
                      const checked = selectedYekpareKutuSlugs.includes(cat.slug);
                      return (
                        <label key={cat.slug} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                          <Checkbox
                            checked={checked}
                            disabled={saving}
                            onCheckedChange={(value) => toggleYekpareKutuSlug(cat.slug, value === true)}
                          />
                          <span>{cat.name || cat.slug}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="hm-yekpare-box-count" className="text-xs font-semibold text-slate-700">
                    Kaç kategori kutusu gösterilsin?
                  </Label>
                  <select
                    id="hm-yekpare-box-count"
                    className="mt-1 max-w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    disabled={saving}
                    value={yekpareBoxCount}
                    onChange={(e) => {
                      const next = normalizeYekpareCategoryBoxCount(Number(e.target.value));
                      setP({ ...p, hmYekpareCategoryBoxCount: next });
                    }}
                    onBlur={() => {
                      void commit({ ...p, hmYekpareCategoryBoxCount: yekpareBoxCount });
                    }}
                  >
                    {YEKPARE_CATEGORY_BOX_COUNT_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {count} kategori kutusu
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="hm-yekpare-kutu-count" className="text-xs font-semibold text-slate-700">
                    Kutu başına haber sayısı (1 öne çıkan + liste)
                  </Label>
                  <select
                    id="hm-yekpare-kutu-count"
                    className="mt-1 max-w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    disabled={saving}
                    value={normalizeYekpareKutuItemCount(p.hmYekpareKategorilerKutusuItemCount)}
                    onChange={(e) => {
                      const next = Number(e.target.value) === 6 ? 6 : 4;
                      setP({ ...p, hmYekpareKategorilerKutusuItemCount: next });
                    }}
                    onBlur={() => {
                      const raw = normalizeYekpareKutuItemCount(p.hmYekpareKategorilerKutusuItemCount);
                      void commit({ ...p, hmYekpareKategorilerKutusuItemCount: raw });
                    }}
                  >
                    <option value={4}>4 haber (1 öne çıkan + 3 liste)</option>
                    <option value={6}>6 haber (1 öne çıkan + 5 liste)</option>
                  </select>
                </div>
              </div>
            ) : null}
            <Dialog open={yekpareBoxCountDialogOpen} onOpenChange={setYekpareBoxCountDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Kaç kategori kutusu gösterilsin?</DialogTitle>
                  <DialogDescription>
                    Yekpare haber kutuları modülü anasayfada seçtiğiniz sayıda kategori kutusu gösterir (Gündem, Spor, Dünya…).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 py-2">
                  {YEKPARE_CATEGORY_BOX_COUNT_OPTIONS.map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={pendingYekpareBoxCount === count ? "default" : "outline"}
                      disabled={saving}
                      onClick={() => setPendingYekpareBoxCount(count)}
                    >
                      {count} kutu
                    </Button>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setYekpareBoxCountDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="button" disabled={saving} onClick={confirmYekpareBoxCount}>
                    Etkinleştir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
            ) : null}
            {showNewsEditorModule("leadListSidebar") ? (
            <ToggleRow
              id="hm-news-lead-list-sidebar"
              label={NEWS_HOME_MODULE_LABELS.leadListSidebar}
              checked={resolveHmNewsHomeModuleEnabled(p, "leadListSidebar")}
              disabled={themeModuleToggleDisabled("leadListSidebar", resolveHmNewsHomeModuleEnabled(p, "leadListSidebar"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("leadListSidebar", c === true)) return;
                toggleDefaultOn("hmNewsLeadListSidebarEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("mediaDarkBlock") ? (
            <ToggleRow
              id="hm-news-media-dark-block"
              label={mediaGalleryBlockLabel("mediaDarkBlock")}
              checked={resolveHmNewsHomeModuleEnabled(p, "mediaDarkBlock")}
              disabled={themeModuleToggleDisabled("mediaDarkBlock", resolveHmNewsHomeModuleEnabled(p, "mediaDarkBlock"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("mediaDarkBlock", c === true)) return;
                toggleDefaultOn("hmNewsMediaDarkBlockEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("recentVideosSidebar") ? (
            <ToggleRow
              id="hm-news-recent-videos-sidebar"
              label={NEWS_HOME_MODULE_LABELS.recentVideosSidebar}
              checked={resolveHmNewsHomeModuleEnabled(p, "recentVideosSidebar")}
              disabled={themeModuleToggleDisabled("recentVideosSidebar", resolveHmNewsHomeModuleEnabled(p, "recentVideosSidebar"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("recentVideosSidebar", c === true)) return;
                toggleDefaultOn("hmNewsRecentVideosSidebarEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkGununSesiAuthors") ? (
            <ToggleRow
              id="hm-news-ahenk-gunun-sesi"
              label={NEWS_HOME_MODULE_LABELS.ahenkGununSesiAuthors}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkGununSesiAuthors")}
              disabled={themeModuleToggleDisabled("ahenkGununSesiAuthors", resolveHmNewsHomeModuleEnabled(p, "ahenkGununSesiAuthors"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkGununSesiAuthors", c === true)) return;
                toggleDefaultOn("hmNewsAhenkGununSesiAuthorsEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkIconCategoryRow") ? (
            <ToggleRow
              id="hm-news-ahenk-icon-category-row"
              label={NEWS_HOME_MODULE_LABELS.ahenkIconCategoryRow}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkIconCategoryRow")}
              disabled={themeModuleToggleDisabled("ahenkIconCategoryRow", resolveHmNewsHomeModuleEnabled(p, "ahenkIconCategoryRow"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkIconCategoryRow", c === true)) return;
                toggleDefaultOn("hmNewsAhenkIconCategoryRowEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkAnkaraGrid") ? (
            <ToggleRow
              id="hm-news-ahenk-ankara-grid"
              label={NEWS_HOME_MODULE_LABELS.ahenkAnkaraGrid}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkAnkaraGrid")}
              disabled={themeModuleToggleDisabled("ahenkAnkaraGrid", resolveHmNewsHomeModuleEnabled(p, "ahenkAnkaraGrid"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkAnkaraGrid", c === true)) return;
                toggleDefaultOn("hmNewsAhenkAnkaraGridEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkGundemLeadSide") ? (
            <ToggleRow
              id="hm-news-ahenk-gundem-lead"
              label={NEWS_HOME_MODULE_LABELS.ahenkGundemLeadSide}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkGundemLeadSide")}
              disabled={themeModuleToggleDisabled("ahenkGundemLeadSide", resolveHmNewsHomeModuleEnabled(p, "ahenkGundemLeadSide"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkGundemLeadSide", c === true)) return;
                toggleDefaultOn("hmNewsAhenkGundemLeadSideEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkSporGrid") ? (
            <ToggleRow
              id="hm-news-ahenk-spor-grid"
              label={NEWS_HOME_MODULE_LABELS.ahenkSporGrid}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkSporGrid")}
              disabled={themeModuleToggleDisabled("ahenkSporGrid", resolveHmNewsHomeModuleEnabled(p, "ahenkSporGrid"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkSporGrid", c === true)) return;
                toggleDefaultOn("hmNewsAhenkSporGridEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkDunyaBlock") ? (
            <ToggleRow
              id="hm-news-ahenk-dunya-block"
              label={NEWS_HOME_MODULE_LABELS.ahenkDunyaBlock}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkDunyaBlock")}
              disabled={themeModuleToggleDisabled("ahenkDunyaBlock", resolveHmNewsHomeModuleEnabled(p, "ahenkDunyaBlock"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkDunyaBlock", c === true)) return;
                toggleDefaultOn("hmNewsAhenkDunyaBlockEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkEkonomiGrid") ? (
            <ToggleRow
              id="hm-news-ahenk-ekonomi-grid"
              label={NEWS_HOME_MODULE_LABELS.ahenkEkonomiGrid}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkEkonomiGrid")}
              disabled={themeModuleToggleDisabled("ahenkEkonomiGrid", resolveHmNewsHomeModuleEnabled(p, "ahenkEkonomiGrid"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkEkonomiGrid", c === true)) return;
                toggleDefaultOn("hmNewsAhenkEkonomiGridEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkSonEklenenler") ? (
            <ToggleRow
              id="hm-news-ahenk-son-eklenenler"
              label={NEWS_HOME_MODULE_LABELS.ahenkSonEklenenler}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkSonEklenenler")}
              disabled={themeModuleToggleDisabled("ahenkSonEklenenler", resolveHmNewsHomeModuleEnabled(p, "ahenkSonEklenenler"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkSonEklenenler", c === true)) return;
                toggleDefaultOn("hmNewsAhenkSonEklenenlerEnabled", c);
              }}
            />
            ) : null}
            {showNewsEditorModule("ahenkPopulerHaberler") ? (
            <ToggleRow
              id="hm-news-ahenk-populer"
              label={NEWS_HOME_MODULE_LABELS.ahenkPopulerHaberler}
              checked={resolveHmNewsHomeModuleEnabled(p, "ahenkPopulerHaberler")}
              disabled={themeModuleToggleDisabled("ahenkPopulerHaberler", resolveHmNewsHomeModuleEnabled(p, "ahenkPopulerHaberler"))}
              onChange={(c) => {
                if (!guardThemeModuleEnable("ahenkPopulerHaberler", c === true)) return;
                toggleDefaultOn("hmNewsAhenkPopulerHaberlerEnabled", c);
              }}
            />
            ) : null}
            <ToggleRow
              id="hm-news-popular-cities"
              label="Türkiye şehirleri bandı"
              checked={p.sadeNewsCitiesBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("sadeNewsCitiesBandEnabled", c)}
            />
            <ToggleRow
              id="hm-news-quick"
              label="Slider yanındaki hızlı erişim"
              checked={p.hmNewsQuickLinksEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsQuickLinksEnabled", c)}
            />
            <ToggleRow
              id="hm-news-horizontal-authors"
              label="yatay köşe yazarları"
              checked={resolveHmNewsHorizontalAuthorsEnabled(p)}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsHorizontalAuthorsEnabled", c)}
            />
            <ToggleRow
              id="hm-news-sidebar-authors"
              label="sidebar köşe yazarları"
              checked={resolveHmNewsSidebarAuthorsEnabled(p)}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSidebarAuthorsEnabled", c)}
            />
            <ToggleRow
              id="hm-news-sidebar"
              label="Saş sidebar"
              checked={p.hmNewsSidebarEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSidebarEnabled", c)}
            />
            <ToggleRow
              id="hm-news-sidebar-cats"
              label="Sidebar kategori listesi"
              checked={p.hmNewsSidebarCategoriesEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSidebarCategoriesEnabled", c)}
            />
            <ToggleRow
              id="hm-news-latest-grid-main"
              label="Orta son haberler + sidebar — orta haber ızgarası"
              checked={resolveHmNewsLatestGridMainEnabled(p)}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsLatestGridMainEnabled", c)}
            />
            <ToggleRow
              id="hm-news-latest-grid-sidebar"
              label="Orta son haberler + sidebar — sağ sidebar kutusu"
              checked={resolveHmNewsLatestGridSidebarEnabled(p)}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsLatestGridSidebarEnabled", c)}
            />
            <ToggleRow
              id="hm-news-footer"
              label="Footer"
              checked={p.hmNewsFooterEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsFooterEnabled", c)}
            />
            <ToggleRow
              id="hm-news-footer-cats"
              label="Footer kategori listesi"
              checked={p.hmNewsFooterCategoriesEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsFooterCategoriesEnabled", c)}
            />
            <ToggleRow
              id="hm-news-rss"
              label="RSS linkleri"
              checked={p.hmNewsRssLinksEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsRssLinksEnabled", c)}
            />
            <ToggleRow
              id="hm-news-request-form"
              label="Talep formu menü bağlantısı"
              checked={p.hmNewsRequestFormEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsRequestFormEnabled", c)}
            />
            <p className="px-4 pb-3 text-xs text-slate-500">
              Talep konuları (Talep Ediyorum / Teklif ediyorum):{" "}
              <Link href="/editor/genel-ayarlar#hm-news-request-categories" className="font-semibold text-red-600 hover:underline">
                Genel ayarlar
              </Link>
              . Talepler{" "}
              <Link href="/editor/iletisim" className="font-semibold text-red-600 hover:underline">
                İletişim
              </Link>{" "}
              panelinde listelenir.
            </p>
            <ToggleRow
              id="hm-news-pwa-install"
              label="Üstte yükle butonu"
              checked={p.hmNewsPwaInstallEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsPwaInstallEnabled", c)}
            />
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <Label htmlFor="t-f" className="cursor-pointer">
                Döviz / borsa bandı
              </Label>
              <Switch
                id="t-f"
                disabled={saving}
                checked={p.tickerFinance !== false}
                onCheckedChange={(c) => void commit({ ...p, tickerFinance: c ? true : false })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <Label htmlFor="t-w" className="cursor-pointer">
                Hava durumu (özet)
              </Label>
              <Switch
                id="t-w"
                disabled={saving}
                checked={p.tickerWeather !== false}
                onCheckedChange={(c) => void commit({ ...p, tickerWeather: c ? true : false })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <Label htmlFor="t-m" className="cursor-pointer">
                Son maç sonuçları (sidebar)
              </Label>
              <Switch
                id="t-m"
                disabled={saving}
                checked={p.moduleMacSonuclari}
                onCheckedChange={(c) => void commit({ ...p, moduleMacSonuclari: !!c })}
              />
            </div>
          </div>
            </TabsContent>

            <TabsContent value="sira" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <ModuleOrderEditor
            title="Haber modül sırası"
            description="Sürükleyerek veya oklarla sıralayın; sağdaki anahtarla modülü açıp kapatabilirsiniz. Yalnızca aktif modüller listelenir — kapalı modüller «Modüller» sekmesinden açılır. Tema ile uyumsuz modüller bu vitrin temasında etkinleştirilemez. Döviz / hava bandı logo yanında; son dakika bandı menü altında sabit kalır — bu listede yer almaz."
            items={newsEditorHomeOrderEnabled}
            labels={NEWS_HOME_MODULE_LABELS}
            defaults={HM_NEWS_EDITOR_HOME_MODULE_ORDER.filter(
              (id) =>
                isNewsEditorModuleActive(id) && shouldShowHmNewsEditorModule(p.hmVitrinTheme, id),
            )}
            disabled={saving}
            enableDragDrop
            getModuleEnabled={(moduleId) => resolveHmNewsEditorModuleEnabled(p, moduleId as HmNewsHomeModuleId)}
            canToggleModule={(moduleId) =>
              canEnableHmNewsEditorModuleForTheme(p.hmVitrinTheme, moduleId as HmNewsHomeModuleId)
            }
            onModuleEnabledChange={(moduleId, checked) =>
              toggleHmNewsEditorModule(moduleId as HmNewsHomeModuleId, checked)
            }
            onChange={(items) =>
              setP({
                ...p,
                hmNewsHomeModuleOrder: resolveHmHomeModuleOrder(
                  ["breakingBand", ...mergeHmNewsEditorModuleOrder(newsEditorHomeOrder, items, isNewsEditorModuleActive)],
                  HM_NEWS_HOME_MODULE_ORDER,
                ),
              })
            }
            onSave={(items) =>
              saveHomeOrder(
                "hmNewsHomeModuleOrder",
                resolveHmHomeModuleOrder(
                  ["breakingBand", ...mergeHmNewsEditorModuleOrder(newsEditorHomeOrder, items, isNewsEditorModuleActive)],
                  HM_NEWS_HOME_MODULE_ORDER,
                ),
              )
            }
            onReset={() => void saveHomeOrder("hmNewsHomeModuleOrder", [...HM_NEWS_HOME_MODULE_ORDER])}
          />
            </TabsContent>

            <TabsContent value="kategoriler" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <ModuleCategoryEditor
            title="Anasayfa haber kutusu kategorileri"
            description="Seçili vitrin temasıyla uyumlu haber kutuları listelenir. Yeşil nokta aktif, kırmızı nokta pasif kutuyu gösterir — pasif kutulara kategori atanamaz; önce «Modüller» sekmesinden kutuyu açın. Kategoriler canonical slug ile tek listede birleştirilir. «Orta son haberler + sidebar kutusu» için «Açılışta hangi kategori» alanı sayfa açılışında seçili sekmeyi belirler; boş bırakılırsa Tümü sekmesi açılır. Diğer kutular boş bırakılırsa otomatik farklı kategorilere dağıtılır."
            items={newsCategoryAssignableModules}
            labels={NEWS_HOME_MODULE_LABELS}
            categories={categoryOptions}
            values={p.hmNewsHomeModuleCategorySlugs ?? {}}
            disabled={saving}
            getModuleEnabled={(moduleId) => isNewsEditorModuleActive(moduleId as HmNewsHomeModuleId)}
            onChange={updateNewsModuleCategory}
          />
            </TabsContent>

            <TabsContent value="galeri" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <HmModuleGallerySourceEditor
            title="Galeri koyu blok kaynakları"
            description="Video / galeri kutularında gösterilecek içerik türünü seçin. Seçim yapılmazsa karma mod (Video TV öncelikli) kullanılır. Video TV seçiliyken kanal ve oynatma listesi; Video Galeri seçiliyken isteğe bağlı Video TV bağlantısı tanımlayabilirsiniz."
            moduleLabels={NEWS_HOME_MODULE_LABELS}
            layoutPrefs={p}
            values={p.hmNewsHomeModuleGallerySources ?? {}}
            videoTvRefs={p.hmNewsHomeModuleGalleryVideoTvRefs ?? {}}
            disabled={saving}
            onChange={updateNewsModuleGallerySource}
            onVideoTvRefChange={updateNewsModuleGalleryVideoTvRef}
          />
            </TabsContent>

            <TabsContent value="rss" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <ToggleRow
              id="hm-rss-site-internal-enabled"
              label="Site içi RSS"
              checked={p.hybridRssEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hybridRssEnabled", c)}
            />
            <p className="text-xs text-slate-500">
              Kapalıyken site-içi RSS kaynakları haber akışına dahil edilmez. Kutu içi RSS bu anahtardan bağımsızdır ve
              her zaman canlıdır.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <Label htmlFor="hm-rss-integration-mode" className="font-semibold text-slate-900">
              Site-içi RSS entegrasyon modu
            </Label>
            <p className="text-xs text-slate-500">
              Kutu içi RSS her zaman anlık/canlıdır (DB yok). Site-içi RSS kaynakları seçilen moda göre davranır; kalıcı
              ve manuel modlarda 6 ay saklama cron temizliği uygulanır.
            </p>
            <Select value={rssIntegrationMode} onValueChange={(v) => setRssIntegrationMode(v as HmRssIntegrationMode)} disabled={saving}>
              <SelectTrigger id="hm-rss-integration-mode" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Anlık Gösterim — ziyaret tetiklemeli, DB yok</SelectItem>
                <SelectItem value="persistent">Kalıcı Haber Motoru — otomatik DB, 6 ay</SelectItem>
                <SelectItem value="manual">Manuel — yalnızca «Güncelle» ile DB, 6 ay</SelectItem>
              </SelectContent>
            </Select>
            {rssIntegrationMode === "manual" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || siteRssRows.length === 0}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const t = readHmJwt();
                    const r = await fetch(apiUrl("/api/hm/editor/rss-feeds/refresh"), {
                      method: "POST",
                      headers: t ? { Authorization: `Bearer ${t}` } : {},
                    });
                    const data = (await r.json().catch(() => ({}))) as { refreshed?: number; stored?: number; error?: string };
                    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
                    toast({
                      title: "RSS güncellendi",
                      description: `${data.refreshed ?? 0} besleme, ${data.stored ?? 0} öğe`,
                    });
                  } catch (e) {
                    toast({
                      title: "Güncellenemedi",
                      description: e instanceof Error ? e.message : "RSS yenileme hatası",
                      variant: "destructive",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Güncelle
              </Button>
            ) : null}
          </div>
          <RssBreakingFeedsEditor
            enabled={p.hmNewsGoogleNewsBandEnabled === true}
            articleLinkEnabled={p.hmNewsBreakingRssArticleLinkEnabled === true}
            displayMode={breakingRssDisplayMode}
            rows={rssRows}
            disabled={saving}
            onToggle={(checked) => toggleDefaultOn("hmNewsGoogleNewsBandEnabled", checked)}
            onArticleLinkToggle={(checked) => toggleDefaultOn("hmNewsBreakingRssArticleLinkEnabled", checked)}
            onDisplayModeChange={setBreakingRssDisplayMode}
            onChange={updateRssRow}
            onAdd={addRssRow}
            onAddUrl={addRssUrlRow}
            onRemove={removeRssRow}
            onSave={() =>
              void commit({
                ...p,
                ...saveRssRows(rssRows, siteRssRows),
                hmNewsBreakingRssDisplayMode: cleanHmBreakingRssDisplayMode(breakingRssDisplayMode),
              })
            }
            onReset={() =>
              void commit({
                ...p,
                ...saveRssRows(defaultHmBreakingRssFeedRows(), defaultHmBreakingRssFeedRows()),
              })
            }
          />
          <RssSiteFeedsEditor
            enabled={p.hybridRssEnabled === true}
            rows={siteRssRows}
            disabled={saving}
            onToggle={(checked) => toggleDefaultOn("hybridRssEnabled", checked)}
            onChange={updateSiteRssRow}
            onAdd={addSiteRssRow}
            onAddUrl={addSiteRssUrlRow}
            onRemove={removeSiteRssRow}
            onSave={() =>
              void commit({
                ...p,
                // Feed kaydı Site içi RSS’i açar — aksi halde API RSS birleştirmez / warm etmez.
                hybridRssEnabled: true,
                ...saveRssRows(rssRows, siteRssRows),
              })
            }
            onReset={() =>
              void commit({
                ...p,
                ...saveRssRows(rssRows, defaultHmBreakingRssFeedRows()),
              })
            }
          />

            </TabsContent>

            <TabsContent value="reklam" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <Label className="font-semibold text-slate-900">Reklam slot konumları</Label>
              <p className="mt-1 text-xs text-slate-500">
                İçerik ve aktif/pasif ayarı{" "}
                <Link href="/editor/reklam-alanlari" className="font-semibold text-red-600 hover:underline">
                  Reklam alanları
                </Link>{" "}
                sayfasındadır. Aşağıdaki tablo hangi slotun hangi temada nerede göründüğünü özetler.
              </p>
            </div>
            <div className="divide-y rounded-lg border border-slate-200">
              {HM_EDITOR_AD_SLOT_DEFS.filter((slot) => slot.slotKey !== "siparis_empty").map((slot) => (
                <div key={slot.slotKey} className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-800">
                    {slot.name}{" "}
                    <span className="font-mono text-[11px] font-normal text-slate-500">({slot.slotKey})</span>
                  </p>
                  {slot.themePlacements?.length ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                      {slot.themePlacements.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">{slot.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
            </TabsContent>
          </Tabs>
            </AccordionContent>
          </AccordionItem>
          ) : null}

          {isCorporateEditorSite ? (
          <AccordionItem
            value="corporate-modules"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 px-4 sm:px-5 border-b-0"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="min-w-0 flex-1 pr-3 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">KURUMSAL modüller</p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  Yalnızca şirket, vakıf, dernek gibi kurumsal siteler içindir. Genel ayarlarda vitrin teması
                  KURUMSAL seçiliyse uygulanır; haber sitesi temasını etkilemez.
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
          <Tabs defaultValue="corporate-moduller" className="w-full">
            <TabsList className="mb-4 h-auto flex flex-wrap justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <TabsTrigger value="corporate-header" className="px-3 py-2 text-sm">
                Header & logo
              </TabsTrigger>
              <TabsTrigger value="corporate-moduller" className="px-3 py-2 text-sm">
                Modül aç/kapa
              </TabsTrigger>
              <TabsTrigger value="corporate-sira" className="px-3 py-2 text-sm">
                Modül sırası
              </TabsTrigger>
              <TabsTrigger value="corporate-rss" className="px-3 py-2 text-sm">
                RSS & bant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="corporate-header" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <Label className="font-semibold text-slate-900">Kurumsal üst krom</Label>
              <p className="mt-1 text-xs text-slate-500">
                Logo bandı ve menü şeridinin açık veya koyu görünümü. Logo ve menü arka plan renkleri için{" "}
                <Link href="/editor/genel-ayarlar" className="font-semibold text-red-600 hover:underline">
                  Genel ayarlar
                </Link>
                .
              </p>
              <Select
                value={p.hmChromeColorMode ?? "light"}
                disabled={saving}
                onValueChange={(v) =>
                  void commit({
                    ...p,
                    hmChromeColorMode: v as NewsSiteLayoutPrefs["hmChromeColorMode"],
                  })
                }
              >
                <SelectTrigger className="mt-2 max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Tema varsayılanı (otomatik)</SelectItem>
                  <SelectItem value="light">Açık (ışık modu)</SelectItem>
                  <SelectItem value="dark">Koyu (karanlık mod)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Logo sağı alan</Label>
              <p className="text-[11px] text-slate-500">
                Logo satırının sağında görünen içerik. Kurumsal sitelerde varsayılan: yazı + arama. Mobilde site açıklama
                yazısı gizlenir.
                {effectiveHeaderRightSlot ? (
                  <>
                    {" "}
                    Şu an:{" "}
                    <strong>
                      {HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS.find((o) => o.value === effectiveHeaderRightSlot)?.label ??
                        effectiveHeaderRightSlot}
                    </strong>
                  </>
                ) : null}
              </p>
              <Select
                value={headerRightSlotValue}
                disabled={saving}
                onValueChange={(v) =>
                  void commit({
                    ...p,
                    hmHeaderRightSlot: v === "auto" ? undefined : (v as HmHeaderRightSlotId),
                  })
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Varsayılan (yazı + arama)</SelectItem>
                  {HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(headerRightSlotValue === "text" ||
                headerRightSlotValue === "text-search" ||
                effectiveHeaderRightSlot === "text" ||
                effectiveHeaderRightSlot === "text-search") && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs text-slate-600">Özel yazı (boşsa site açıklaması)</Label>
                  <Input
                    value={headerRightTextDraft}
                    disabled={saving}
                    placeholder="Kurumsal site tanıtım metni…"
                    onChange={(e) => setHeaderRightTextDraft(e.target.value)}
                    onBlur={() => {
                      const trimmed = headerRightTextDraft.trim();
                      const cur = (p.hmHeaderRightCustomText ?? "").trim();
                      if (trimmed === cur) return;
                      void commit({ hmHeaderRightCustomText: trimmed || undefined });
                    }}
                  />
                </div>
              )}
              {(headerRightSlotValue === "banner" || effectiveHeaderRightSlot === "banner") && (
                <div className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  <Label className="text-xs text-slate-600">Banner görseli</Label>
                  <input
                    ref={headerBannerFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(ev) => void onPickHeaderRightBanner(ev)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || headerBannerUploading}
                      className="gap-2"
                      onClick={() => headerBannerFileRef.current?.click()}
                    >
                      {headerBannerUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Görsel yükle
                    </Button>
                  </div>
                  <Input
                    value={headerRightBannerDraft}
                    disabled={saving}
                    placeholder="https://… veya /api/media/uploads/…"
                    onChange={(e) => setHeaderRightBannerDraft(e.target.value)}
                    onBlur={() => {
                      const trimmedRaw = headerRightBannerDraft.trim();
                      const trimmed = trimmedRaw ? toPersistedPublicMediaUrl(trimmedRaw) : null;
                      const cur = (p.hmHeaderRightBannerUrl ?? "").trim() || null;
                      if (trimmed === cur) return;
                      if (trimmed && trimmed !== trimmedRaw) setHeaderRightBannerDraft(trimmed);
                      void commit({ hmHeaderRightBannerUrl: trimmed ?? undefined });
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Header vurgu rengi</Label>
                <Input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(p.hmPrimaryColor ?? "") ? p.hmPrimaryColor! : "#0d63b6"}
                  disabled={saving}
                  className="h-10 w-full max-w-[8rem] cursor-pointer p-1"
                  onChange={(e) => void commit({ ...p, hmPrimaryColor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>İkincil renk</Label>
                <Input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(p.hmSecondaryColor ?? "") ? p.hmSecondaryColor! : "#38bdf8"}
                  disabled={saving}
                  className="h-10 w-full max-w-[8rem] cursor-pointer p-1"
                  onChange={(e) => void commit({ ...p, hmSecondaryColor: e.target.value })}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Üst menü öğeleri sayfanın üstündeki <strong>Üst menü editörü</strong> bağlantısından yönetilir. Manuel hero
              slider içerikleri{" "}
              <Link href="/editor/manset" className="font-semibold text-red-600 hover:underline">
                Slider / Bant
              </Link>{" "}
              sayfasındadır; slider görünürlüğü <strong>Modül aç/kapa</strong> sekmesinden kapatılabilir.
            </p>
          </div>
            </TabsContent>

            <TabsContent value="corporate-moduller" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <div className="rounded-xl border border-slate-200 bg-white divide-y">
            <div className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kurumsal modülleri</p>
            <p className="mt-1 text-xs text-slate-500">
              Kapattışınız modüller yalnızca KURUMSAL vitrininde gizlenir. Haber sitesi modülleri bu temada gösterilmez. Tema seçimi:{" "}
              <Link href="/editor/genel-ayarlar#hm-vitrin-theme-controls" className="font-semibold text-red-600 hover:underline">
                Genel ayarlar ↔ KURUMSAL vitrin
              </Link>
              . Slider ve bant içerikleri{" "}
              <Link href="/editor/manset" className="font-semibold text-red-600 hover:underline">
                Slider / Bant
              </Link>{" "}
              sayfasından düzenlenir. Kutu içi RSS ve RSS güven bandı aşağıdaki anahtarlarla açılır; besleme adresleri{" "}
              <strong>RSS & bant</strong> sekmesinden eklenir.
            </p>
            </div>
            <ToggleRow
              id="hm-corporate-hero"
              label="Kurumsal hero slider"
              checked={p.hmCorporateHeroEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleCorporateModule("hero", c)}
            />
            <ToggleRow
              id="hm-corporate-tepe-manset"
              label="Tepe Manşet sistemi"
              checked={p.hmNewsTepeMansetEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsTepeMansetEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-spor-module"
              label={NEWS_HOME_MODULE_LABELS.sporModule}
              checked={p.hmNewsSporModuleEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsSporModuleEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-quick-access"
              label="Hızlı erişim / ikon bandı (Şehitlerimiz, Haklarımız…)"
              checked={p.hmCorporateQuickAccessEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleCorporateModule("quickAccess", c)}
            />
            <ToggleRow
              id="hm-corporate-main-news"
              label="Ana haber kutuları (manşet grid)"
              checked={p.hmCorporateMainNewsEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleCorporateModule("mainNews", c)}
            />
            <div className="px-4 py-3 space-y-2 border-t border-slate-100">
              <Label className="text-sm font-semibold text-slate-800">Haber kutusu düzeni</Label>
              <p className="text-xs text-slate-500">
                VKD tarzı büyük manşet + sağ 2 sütun küçük resim veya slider + yan manşet listesi.
              </p>
              <Select
                value={corporateMainNewsLayout}
                disabled={saving || p.hmCorporateMainNewsEnabled === false}
                onValueChange={(v) =>
                  void commit({
                    ...p,
                    hmCorporateMainNewsLayout: v as NewsSiteLayoutPrefs["hmCorporateMainNewsLayout"],
                  })
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manset-side">Slider + yan manşet listesi</SelectItem>
                  <SelectItem value="lead-side-grid">Büyük manşet + sağ 2 sütun küçük resim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              id="hm-corporate-manset-ad"
              label="Slider altı banner reklam"
              checked={p.hmCorporateMansetAdModuleEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleCorporateModule("mansetAd", c)}
            />
            <ToggleRow
              id="hm-corporate-home-middle-ad"
              label="Alt banner / orta reklam alanı"
              checked={p.hmCorporateHomeMiddleAdModuleEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleCorporateModule("homeMiddleAd", c)}
            />
            <ToggleRow
              id="hm-corporate-google-news-band"
              label="Kutu içi RSS"
              checked={p.hmCorporateGoogleNewsBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateGoogleNewsBandEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-rss-band"
              label="RSS güven bandı"
              checked={p.hmCorporateRssBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateRssBandEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-request-form"
              label="Talep formu menü bağlantısı"
              checked={p.hmCorporateRequestFormEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateRequestFormEnabled", c)}
            />
            <p className="px-4 pb-3 text-xs text-slate-500">
              Talep konularını{" "}
              <Link href="/editor/genel-ayarlar#hm-corporate-request-categories" className="font-semibold text-red-600 hover:underline">
                Genel ayarlar → Talep formu konuları
              </Link>{" "}
              bölümünden ekleyin, düzenleyin veya silin. Gelen talepler{" "}
              <Link href="/editor/iletisim" className="font-semibold text-red-600 hover:underline">
                İletişim
              </Link>{" "}
              panelinde görünür.
            </p>
            <ToggleRow
              id="hm-corporate-latest-news"
              label="Güncel Haberler"
              checked={p.hmCorporateLatestNewsEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateLatestNewsEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-latest-dev"
              label="Güncel Gelişmeler"
              checked={p.hmCorporateLatestDevelopmentsEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateLatestDevelopmentsEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-sidebar-info"
              label="Site tanıtım kutusu ve sayfa linkleri"
              checked={p.hmCorporateSidebarInfoEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateSidebarInfoEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-authors"
              label="Köşe yazarları şeridi"
              checked={p.hmCorporateAuthorsEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateAuthorsEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-culture"
              label="Kültür Portalı bandı"
              checked={p.hmCorporateCulturePortalBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateCulturePortalBandEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-ataturk"
              label="Atatürk Köşesi"
              checked={p.hmCorporateAtaturkCornerEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateAtaturkCornerEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-popular-cities"
              label="Türkiye şehirleri bandı"
              checked={p.sadeNewsCitiesBandEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("sadeNewsCitiesBandEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-sehit"
              label="Şehit sorgulama modülü"
              checked={p.hmSehitSearchEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmSehitSearchEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-wars"
              label="Savaşlar bilgi bölümü"
              checked={p.hmCorporateWarsSectionEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateWarsSectionEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-national-days"
              label="Millî günler bilgi bölümü"
              checked={p.hmCorporateNationalDaysSectionEnabled === true}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmCorporateNationalDaysSectionEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-support"
              label="Destek bandı"
              checked={p.hmCorporateDonation?.enabled === true}
              disabled={saving}
              onChange={(c) => void commit({ ...p, hmCorporateDonation: { ...(p.hmCorporateDonation ?? defaultNewsSiteLayoutPrefs.hmCorporateDonation!), enabled: c } })}
            />
          </div>
            </TabsContent>

            <TabsContent value="corporate-sira" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <ModuleOrderEditor
            title="Kurumsal modül sırası"
            description="Sürükleyerek veya oklarla sıralayın. Kapalı modüller sırada kalsa bile görünmez."
            items={corporateEditorHomeOrder}
            labels={CORPORATE_HOME_MODULE_LABELS}
            defaults={corporateEditorHomeDefaults}
            disabled={saving}
            enableDragDrop
            getModuleEnabled={(moduleId) => resolveHmCorporateEditorModuleEnabled(p, moduleId as HmCorporateHomeModuleId)}
            onModuleEnabledChange={(moduleId, checked) =>
              toggleCorporateModule(moduleId as HmCorporateHomeModuleId, checked)
            }
            onChange={(items) => setP({ ...p, hmCorporateHomeModuleOrder: items })}
            onSave={(items) => saveHomeOrder("hmCorporateHomeModuleOrder", items)}
            onReset={() => void saveHomeOrder("hmCorporateHomeModuleOrder", [...corporateEditorHomeDefaults])}
          />
            </TabsContent>

            <TabsContent value="corporate-rss" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <RssBreakingFeedsEditor
            enabled={p.hmCorporateGoogleNewsBandEnabled === true}
            articleLinkEnabled={p.hmNewsBreakingRssArticleLinkEnabled === true}
            displayMode={breakingRssDisplayMode}
            rows={rssRows}
            disabled={saving}
            onToggle={(checked) => toggleDefaultOn("hmCorporateGoogleNewsBandEnabled", checked)}
            onArticleLinkToggle={(checked) => toggleDefaultOn("hmNewsBreakingRssArticleLinkEnabled", checked)}
            onDisplayModeChange={setBreakingRssDisplayMode}
            onChange={updateRssRow}
            onAdd={addRssRow}
            onAddUrl={addRssUrlRow}
            onRemove={removeRssRow}
            onSave={() =>
              void commit({
                ...p,
                ...saveRssRows(rssRows, siteRssRows),
                hmNewsBreakingRssDisplayMode: cleanHmBreakingRssDisplayMode(breakingRssDisplayMode),
              })
            }
            onReset={() =>
              void commit({
                ...p,
                ...saveRssRows(defaultHmBreakingRssFeedRows(), defaultHmBreakingRssFeedRows()),
              })
            }
          />
            </TabsContent>
          </Tabs>
            </AccordionContent>
          </AccordionItem>
          ) : null}
        </Accordion>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <Label className="font-semibold text-slate-900">Footer ve sidebar menüleri</Label>
            <p className="mt-1 text-xs text-slate-500">
              {p.hmVitrinTheme === "corporate"
                ? "Kurumsal temada alt bilgi menüsü üst menü ile aynıdır. Haber kategorileri Kategoriler sayfasındaki «Vitrinde» anahtarı ile yönetilir."
                : "Footer Sayfalar sütunu ile anasayfa sidebar başlantılarını WordPress tarzı menü editöründen yönetin."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link
                href={
                  p.hmVitrinTheme === "corporate"
                    ? "/editor/menuler?location=hmCorporateMenuItems"
                    : "/editor/menuler?location=hmNewsFooterMenuItems"
                }
              >
                {p.hmVitrinTheme === "corporate" ? "Üst / footer menüsünü düzenle" : "Footer menüsünü düzenle"}
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/editor/menuler?location=hmNewsSidebarMenuItems">Sidebar menüsünü düzenle</Link>
            </Button>
          </div>
        </div>

        <ButtonReset
          disabled={saving}
          onReset={() => void commit({ ...defaultNewsSiteLayoutPrefs })}
        />
      </div>
    </EditorLayout>
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

function RssBreakingFeedsEditor({
  enabled,
  articleLinkEnabled,
  displayMode,
  rows,
  disabled,
  onToggle,
  onArticleLinkToggle,
  onDisplayModeChange,
  onChange,
  onAdd,
  onAddUrl,
  onRemove,
  onSave,
  onReset,
  hideBandControls = false,
  showEnableToggle = false,
  enableToggleLabel = "Kutu içi RSS",
  title = "Kutu içi RSS kaynakları",
  description = "Bu adresler yalnızca \"Kutu içi RSS\" widget'ında CANLI gösterilir; DB'ye kaydedilmez. Site-içi RSS kaynakları aşağıdaki ayrı bölümden yönetilir.",
}: {
  enabled: boolean;
  articleLinkEnabled: boolean;
  displayMode: HmBreakingRssDisplayMode;
  rows: HmBreakingRssFeedRow[];
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
  onArticleLinkToggle: (checked: boolean) => void;
  onDisplayModeChange: (mode: HmBreakingRssDisplayMode) => void;
  onChange: (id: string, patch: Partial<Pick<HmBreakingRssFeedRow, "label" | "url">>) => void;
  onAdd: () => void;
  onAddUrl: (categoryKey: string, label: string) => void;
  onRemove: (id: string) => void;
  onSave: () => void;
  onReset: () => void;
  hideBandControls?: boolean;
  showEnableToggle?: boolean;
  enableToggleLabel?: string;
  title?: string;
  description?: string;
}) {
  const groups = groupHmBreakingRssFeedRowsByCategory(rows);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label className="font-semibold text-slate-900">{title}</Label>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {hideBandControls && !showEnableToggle ? null : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Label htmlFor="hm-news-rss-breaking-enabled" className="cursor-pointer text-xs font-semibold text-slate-700">
            {hideBandControls ? enableToggleLabel : "Kutu içi RSS"}
          </Label>
          <Switch
            id="hm-news-rss-breaking-enabled"
            disabled={disabled}
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
        )}
      </div>

      {hideBandControls ? null : (
      <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
        <div>
          <Label htmlFor="hm-news-breaking-rss-article-link" className="cursor-pointer text-sm font-semibold text-slate-800">
            Habere git başlantısını göster
          </Label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Kart tıklaması site içi haber önizlemesi açar; bu ayar yalnızca kutu bandındaki Habere Git düğmesini gösterir.
          </p>
        </div>
        <Switch
          id="hm-news-breaking-rss-article-link"
          disabled={disabled}
          checked={articleLinkEnabled}
          onCheckedChange={onArticleLinkToggle}
        />
      </div>

      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] sm:items-center">
        <div>
          <Label htmlFor="hm-news-breaking-rss-display-mode" className="text-sm font-semibold text-slate-800">
            Vitrin görünümü
          </Label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Kart grid veya kategori renkli haber balonları. Balon tıklanınca mevcut haber önizleme penceresi açılır.
          </p>
        </div>
        <Select
          value={displayMode}
          onValueChange={(value) => onDisplayModeChange(value === "balloons" ? "balloons" : "cards")}
          disabled={disabled}
        >
          <SelectTrigger id="hm-news-breaking-rss-display-mode">
            <SelectValue placeholder="Kart grid" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cards">Kart grid</SelectItem>
            <SelectItem value="balloons">Haber balonu</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </>
      )}

      <div className="grid gap-4">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            Henüz RSS kategorisi yok. Aşağıdaki &quot;Kategori ekle&quot; ile yeni kategori ekleyin.
          </div>
        ) : null}
        {groups.map((group) => (
          <div key={group.categoryKey} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] sm:items-center">
              <div className="grid gap-1">
                <Label
                  htmlFor={`hm-breaking-rss-label-${group.categoryKey}`}
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
                >
                  Kategori adı
                </Label>
                <Input
                  id={`hm-breaking-rss-label-${group.categoryKey}`}
                  value={group.label}
                  disabled={disabled}
                  placeholder="Kategori adı"
                  onChange={(event) => onChange(group.rows[0]!.id, { label: event.target.value })}
                />
              </div>
              <p className="text-[11px] text-slate-500 sm:self-end sm:pb-2">
                Bu kategoriye birden fazla RSS beslemesi ekleyebilirsiniz; her kaynak ayrı çekilir.
              </p>
            </div>

            <div className="space-y-2">
              {group.rows.map((row, rowIndex) => (
                <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid gap-1">
                    <Label htmlFor={`hm-breaking-rss-${row.id}`} className="text-[11px] font-semibold text-slate-500">
                      RSS URL{group.rows.length > 1 ? ` ${rowIndex + 1}` : ""}
                    </Label>
                    <Input
                      id={`hm-breaking-rss-${row.id}`}
                      value={row.url}
                      disabled={disabled}
                      placeholder="https://www.haberler.com/gazi/"
                      onChange={(event) => onChange(row.id, { url: event.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={disabled}
                    aria-label={`${group.label || "RSS"} URL satırını sil`}
                    onClick={() => onRemove(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onAddUrl(group.categoryKey, group.label)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              RSS URL ekle
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Kategori ekle
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onReset}>
            Varsayılan RSS adresleri
          </Button>
          <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={disabled} onClick={onSave}>
            RSS kaynaklarını kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

function RssSiteFeedsEditor({
  enabled,
  rows,
  disabled,
  onToggle,
  onChange,
  onAdd,
  onAddUrl,
  onRemove,
  onSave,
  onReset,
}: {
  enabled: boolean;
  rows: HmBreakingRssFeedRow[];
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
  onChange: (id: string, patch: Partial<Pick<HmBreakingRssFeedRow, "label" | "url">>) => void;
  onAdd: () => void;
  onAddUrl: (categoryKey: string, label: string) => void;
  onRemove: (id: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <RssBreakingFeedsEditor
      enabled={enabled}
      articleLinkEnabled={false}
      displayMode="cards"
      rows={rows}
      disabled={disabled || !enabled}
      hideBandControls
      showEnableToggle
      enableToggleLabel="Site içi RSS"
      title="Site-içi RSS kaynakları"
      description="Bu beslemeler site genelinde normal haber olarak birleştirilir. Mod: yukarıdaki entegrasyon seçimi (anlık / kalıcı / manuel)."
      onToggle={onToggle}
      onArticleLinkToggle={() => undefined}
      onDisplayModeChange={() => undefined}
      onChange={onChange}
      onAdd={onAdd}
      onAddUrl={onAddUrl}
      onRemove={onRemove}
      onSave={onSave}
      onReset={onReset}
    />
  );
}

function ModuleOrderEditor<T extends string>({
  title,
  description,
  items,
  labels,
  defaults,
  disabled,
  enableDragDrop,
  getModuleEnabled,
  canToggleModule,
  onModuleEnabledChange,
  onChange,
  onSave,
  onReset,
}: {
  title: string;
  description: string;
  items: T[];
  labels: Record<T, string>;
  defaults: readonly T[];
  disabled?: boolean;
  enableDragDrop?: boolean;
  getModuleEnabled?: (item: T) => boolean;
  canToggleModule?: (item: T) => boolean;
  onModuleEnabledChange?: (item: T, checked: boolean) => void;
  onChange: (items: T[]) => void;
  onSave: (items: T[]) => void;
  onReset: () => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const resetToDefaults = () => onChange([...defaults]);

  const reorderItems = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const handleDragStart = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !enableDragDrop) return;
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !enableDragDrop || dragIndex == null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  };

  const handleDrop = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !enableDragDrop) return;
    event.preventDefault();
    const fromRaw = dragIndex ?? Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(fromRaw)) return;
    reorderItems(fromRaw, index);
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <Label className="font-semibold text-slate-900">{title}</Label>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
        {getModuleEnabled && onModuleEnabledChange ? (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">
            Her satırdaki anahtar modülü anasayfada açar veya kapatır (anında kaydedilir).
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const moduleEnabled = getModuleEnabled ? getModuleEnabled(item) : true;
          const toggleAllowed = canToggleModule ? canToggleModule(item) : true;
          const isDragging = dragIndex === index;
          const isDropTarget = dropIndex === index && dragIndex != null && dragIndex !== index;
          return (
            <div
              key={item}
              draggable={enableDragDrop && !disabled}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                isDragging
                  ? "border-slate-300 bg-slate-100 opacity-60"
                  : isDropTarget
                    ? "border-red-300 bg-red-50/80"
                    : moduleEnabled
                      ? "border-slate-200 bg-slate-50/80"
                      : "border-slate-200 bg-slate-100/70"
              }`}
            >
              {enableDragDrop ? (
                <span
                  className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 active:cursor-grabbing"
                  title="Sürükleyerek taşı"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              ) : null}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${moduleEnabled ? "bg-emerald-500" : "bg-red-500"}`}
                title={moduleEnabled ? "Aktif" : "Pasif"}
                aria-hidden
              />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500">
                {index + 1}
              </span>
              <span
                className={`min-w-0 flex-1 text-sm font-semibold ${
                  moduleEnabled ? "text-slate-800" : "text-slate-400 line-through decoration-slate-300"
                }`}
              >
                {labels[item] ?? item}
              </span>
              {getModuleEnabled && onModuleEnabledChange ? (
                <Switch
                  checked={moduleEnabled}
                  disabled={disabled || (!moduleEnabled && !toggleAllowed)}
                  onCheckedChange={(checked) => onModuleEnabledChange(item, checked === true)}
                  aria-label={`${labels[item] ?? item} modülünü ${moduleEnabled ? "kapat" : "aç"}`}
                />
              ) : null}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveArrayItem(items, index, -1))}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onChange(moveArrayItem(items, index, 1))}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={resetToDefaults}>
          Varsayılan sırayı hazırla
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onReset}>
          Varsayılana kaydet
        </Button>
        <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={disabled} onClick={() => onSave(items)}>
          Sırayı kaydet
        </Button>
      </div>
    </div>
  );
}

function ModuleCategoryEditor<T extends string>({
  title,
  description,
  items,
  labels,
  categories,
  values,
  disabled,
  getModuleEnabled,
  onChange,
}: {
  title: string;
  description: string;
  items: T[];
  labels: Record<T, string>;
  categories: Array<{ slug: string; name: string }>;
  values: Partial<Record<T, string>>;
  disabled?: boolean;
  getModuleEnabled?: (item: T) => boolean;
  onChange: (item: T, slug: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <Label className="font-semibold text-slate-900">{title}</Label>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3">
        {items.map((item) => {
          const moduleEnabled = getModuleEnabled ? getModuleEnabled(item) : true;
          const rowDisabled = disabled || !moduleEnabled;
          return (
          <div key={item} className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center ${moduleEnabled ? "border-slate-200 bg-slate-50/70" : "border-slate-200 bg-slate-100/60 opacity-80"}`}>
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${moduleEnabled ? "bg-emerald-500" : "bg-red-500"}`}
                    title={moduleEnabled ? "Aktif kutu" : "Pasif kutu — kategori atanamaz"}
                    aria-hidden
                  />
                  <span className={moduleEnabled ? "" : "text-slate-500"}>{labels[item] ?? item}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {!moduleEnabled
                    ? "Pasif — «Modüller» sekmesinden açın"
                    : item === "latestGrid"
                      ? "Açılışta hangi kategori sekmesi seçili gelsin (boş = Tümü)"
                      : "Bu kutunun haber kaynağı"}
                </p>
              </div>
              <div className="space-y-2">
                {categories.length > 0 ? (
                  <Select
                    value={values[item] || "__all"}
                    disabled={rowDisabled}
                    onValueChange={(value) => onChange(item, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm kategoriler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Tüm kategoriler</SelectItem>
                      {values[item] && !categories.some((cat) => cat.slug === values[item]) ? (
                        <SelectItem value={values[item]!}>{values[item]}</SelectItem>
                      ) : null}
                      {categories.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {cat.name || cat.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Input
                  value={values[item] || ""}
                  disabled={rowDisabled}
                  placeholder={moduleEnabled ? "Kategori slug, örn. gundem" : "Önce modülü aktif edin"}
                  onChange={(event) => onChange(item, event.target.value)}
                />
              </div>
          </div>
          );
        })}
      </div>
      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Kategoriler canonical slug ile tek listede birleştirilir. Boş bırakılan kutular otomatik farklı kategorilere atanır.
        </p>
      ) : null}
    </div>
  );
}

function ButtonReset({ onReset, disabled }: { onReset: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onReset}
      className="text-sm text-slate-500 underline hover:text-slate-800 disabled:opacity-50"
    >
      Varsayılanlara dön
    </button>
  );
}
