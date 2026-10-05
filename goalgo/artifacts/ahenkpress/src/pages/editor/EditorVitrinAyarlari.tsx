import { EditorLayout } from "@/components/EditorLayout";
import EditorYenisafakVitrin from "@/pages/editor/EditorYenisafakVitrin";
import { Button } from "@/components/ui/button";
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
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  HM_CORPORATE_HOME_MODULE_ORDER,
  defaultNewsSiteLayoutPrefs,
  isHmCorporateLayoutKind,
  isHmCorporateLikeTheme,
  resolveHmHomeModuleOrder,
  resolveHmCorporateEditorModuleEnabled,
  applyHmCorporateEditorModuleTogglePatch,
  resolveHmCorporateMainNewsLayout,
  type HmCorporateHomeModuleId,
  type NewsSiteLayoutPrefs,
  HM_HEADER_RIGHT_SLOT_EDITOR_OPTIONS,
  resolveHmHeaderRightSlot,
  type HmHeaderRightSlotId,
} from "@/lib/newsSiteLayout";
import { isHmVatanThemeId } from "@/lib/hmVatanTheme";
import {
  VATAN_HOME_MODULE_LABELS,
  VATAN_HOME_MODULE_ORDER,
  resolveVatanHomeHiddenModules,
  resolveVatanHomeModuleOrder,
  type VatanHomeModuleId,
} from "@/lib/hmVatanEditorHome";
import type { HmVatanHomeCopy, HmVatanHomeSectionCopy } from "@/lib/hmVatanHomeCopy";
import { TGD_VATAN_HOME_COPY, isTgdHmSiteSlug } from "@/lib/hmVatanHomeCopy";
import { Link } from "wouter";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { resolveClientMediaSrc, toPersistedPublicMediaUrl } from "@/lib/apiBase";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Upload } from "lucide-react";

/**
 * Vitrin ayarları.
 * Haber siteleri tek temadır: PHP Yenişafak teması (`EditorYenisafakVitrin`, anahtarlar
 * `lib/yenisafakEditorLayout.ts`). Eski TSX haber temaları (esen, classic, portal3, …) bu
 * panelden seçilemez. Aşağıdaki form yalnızca kurumsal VKD / VATAN siteleri içindir.
 */

function moveArrayItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

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

export default function EditorVitrinAyarlari() {
  const { newsLayoutPrefs, saveNewsSiteLayout, saveHomeModuleOrder, site } = useHmEditor();
  const { toast } = useToast();
  const [p, setP] = useState<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const [saving, setSaving] = useState(false);
  const [headerRightBannerDraft, setHeaderRightBannerDraft] = useState("");
  const [headerRightTextDraft, setHeaderRightTextDraft] = useState("");
  const [headerBannerUploading, setHeaderBannerUploading] = useState(false);
  const headerBannerFileRef = useRef<HTMLInputElement>(null);
  const pRef = useRef<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const persistedRef = useRef<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const commitSeqRef = useRef(0);
  const confirmedCommitSeqRef = useRef(0);

  useEffect(() => {
    setP(newsLayoutPrefs);
    pRef.current = newsLayoutPrefs;
    if (commitSeqRef.current === confirmedCommitSeqRef.current) {
      persistedRef.current = newsLayoutPrefs;
    }
    setHeaderRightBannerDraft(newsLayoutPrefs.hmHeaderRightBannerUrl ?? "");
    setHeaderRightTextDraft(newsLayoutPrefs.hmHeaderRightCustomText ?? "");
  }, [newsLayoutPrefs]);

  useEffect(() => {
    pRef.current = p;
  }, [p]);

  const rollbackPatchToPersisted = (patch: Partial<NewsSiteLayoutPrefs>) => {
    const persisted = persistedRef.current;
    const keys = Object.keys(patch) as Array<keyof NewsSiteLayoutPrefs>;
    if (keys.length > 0) {
      setP((prev) => {
        const next: Record<string, unknown> = { ...prev };
        for (const key of keys) {
          next[String(key)] = persisted[key];
        }
        return next as NewsSiteLayoutPrefs;
      });
    }
    if ("hmHeaderRightBannerUrl" in patch || "hmHeaderRightSlot" in patch) {
      setHeaderRightBannerDraft(persisted.hmHeaderRightBannerUrl ?? "");
    }
    if ("hmHeaderRightCustomText" in patch || "hmHeaderRightSlot" in patch) {
      setHeaderRightTextDraft(persisted.hmHeaderRightCustomText ?? "");
    }
  };

  const commit = async (
    patch: Partial<NewsSiteLayoutPrefs>,
    saveOpts?: { allowStockLayoutReset?: boolean },
  ) => {
    const requestId = ++commitSeqRef.current;
    const next = { ...pRef.current, ...patch };
    setP(next);
    try {
      setSaving(true);
      const r = await saveNewsSiteLayout(next, {
        vitrinOnly: true,
        layoutPatch: patch,
        allowStockLayoutReset: saveOpts?.allowStockLayoutReset,
      });
      if (!r || typeof r !== "object" || typeof r.ok !== "boolean") {
        throw new Error("Geçersiz vitrin kaydetme yanıtı alındı.");
      }
      if (!r.ok) {
        if (requestId !== commitSeqRef.current) return;
        const serverError = typeof r.error === "string" ? r.error.slice(0, 220) : "";
        toast({
          title: "Kaydedilemedi",
          description: serverError || "Sunucuya yazılamadı; oturumunuzu kontrol edin.",
          variant: "destructive",
        });
        rollbackPatchToPersisted(patch);
        return;
      }
      if (requestId > confirmedCommitSeqRef.current) {
        confirmedCommitSeqRef.current = requestId;
        persistedRef.current = next;
      }
      if (requestId !== commitSeqRef.current) return;
      toast({ title: "Vitrin ayarları kaydedildi", description: site?.displayName ?? undefined });
    } catch (err) {
      if (requestId !== commitSeqRef.current) return;
      toast({
        title: "Kaydedilemedi",
        description: err instanceof Error ? err.message.slice(0, 220) : "Sunucuya yazılamadı; oturumunuzu kontrol edin.",
        variant: "destructive",
      });
      rollbackPatchToPersisted(patch);
    } finally {
      if (requestId === commitSeqRef.current) setSaving(false);
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

  const corporateHomeOrder = resolveHmHomeModuleOrder(p.hmCorporateHomeModuleOrder, HM_CORPORATE_HOME_MODULE_ORDER);
  const isCorporateEditorSite = isHmCorporateLayoutKind(p, site?.slug) || isHmCorporateLikeTheme(p.hmVitrinTheme);
  const corporateEditorHomeOrder = corporateHomeOrder.filter((id) => id !== "googleNewsBand");
  const corporateEditorHomeDefaults = HM_CORPORATE_HOME_MODULE_ORDER.filter((id) => id !== "googleNewsBand");
  const isVatanEditorSite = isHmVatanThemeId(p.hmVitrinTheme);
  const vatanHomeOrder = resolveVatanHomeModuleOrder(p);
  const vatanHomeHidden = resolveVatanHomeHiddenModules(p);

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

  const toggleDefaultOn = (key: keyof NewsSiteLayoutPrefs, checked: boolean) => {
    void commit({ [key]: checked ? true : false });
  };

  const vatanModulesForCorporateModule = (moduleId: HmCorporateHomeModuleId): readonly VatanHomeModuleId[] =>
    moduleId === "sehitSearch"
      ? ["sehitSearch"]
      : moduleId === "ataturkCorner"
        ? ["ataturk"]
        : moduleId === "heritageInfo"
          ? ["wars", "nationalDays"]
          : moduleId === "donationSupport"
            ? ["donation"]
            : [];

  const isVatanModuleVisible = (moduleId: VatanHomeModuleId): boolean => !vatanHomeHidden.has(moduleId);

  const isVatanCorporateModuleVisible = (moduleId: HmCorporateHomeModuleId): boolean => {
    const modules = vatanModulesForCorporateModule(moduleId);
    if (!modules.length) return resolveHmCorporateEditorModuleEnabled(p, moduleId);
    return modules.some((item) => isVatanModuleVisible(item));
  };

  const vatanModuleTogglePatch = (
    moduleId: VatanHomeModuleId,
    checked: boolean,
  ): Partial<NewsSiteLayoutPrefs> =>
    moduleId === "ataturk"
      ? applyHmCorporateEditorModuleTogglePatch(p, "ataturkCorner", checked)
      : moduleId === "sehitSearch"
        ? applyHmCorporateEditorModuleTogglePatch(p, "sehitSearch", checked)
        : moduleId === "wars"
          ? { hmCorporateWarsSectionEnabled: checked }
          : moduleId === "nationalDays"
            ? { hmCorporateNationalDaysSectionEnabled: checked }
            : moduleId === "donation"
              ? applyHmCorporateEditorModuleTogglePatch(p, "donationSupport", checked)
              : {};

  const syncVatanHomeHiddenModulesPatch = (
    patch: Partial<NewsSiteLayoutPrefs>,
    moduleIds: readonly VatanHomeModuleId[] = [],
    checked?: boolean,
  ): Partial<NewsSiteLayoutPrefs> => {
    if (!isVatanEditorSite || checked == null || moduleIds.length === 0) return patch;
    const nextHidden = new Set<VatanHomeModuleId>(vatanHomeHidden);
    for (const moduleId of moduleIds) {
      if (checked) nextHidden.delete(moduleId);
      else nextHidden.add(moduleId);
    }
    return { ...patch, hmVatanHomeHiddenModules: Array.from(nextHidden) };
  };

  const toggleVatanAwareDefaultOn = (
    key: keyof NewsSiteLayoutPrefs,
    checked: boolean,
    moduleIds: readonly VatanHomeModuleId[] = [],
  ) => {
    void commit(syncVatanHomeHiddenModulesPatch({ [key]: checked ? true : false }, moduleIds, checked));
  };

  const toggleCorporateModule = (moduleId: HmCorporateHomeModuleId, checked: boolean) => {
    void commit(
      syncVatanHomeHiddenModulesPatch(
        applyHmCorporateEditorModuleTogglePatch(p, moduleId, checked),
        vatanModulesForCorporateModule(moduleId),
        checked,
      ),
    );
  };

  const corporateMainNewsLayout = resolveHmCorporateMainNewsLayout(p);

  // Haber siteleri: PHP Yenişafak teması. Eski TSX tema seçici yok.
  if (!isCorporateEditorSite) {
    return <EditorYenisafakVitrin />;
  }

  return (
    <EditorLayout title="Vitrin ayarları">
      <div className="max-w-3xl space-y-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div>
            <Label className="font-semibold text-slate-900">Kurumsal tema</Label>
            <p className="mt-1 text-xs text-slate-600">
              Bu sitede haber vitrini ayarları yok. <strong>VKD Tema</strong> kurumsal dernek vitrinidir.{" "}
              <strong>VATAN tema</strong> hatıra anasayfasıdır; modül metin ve görselleri trafik sitesindeki gibi bu
              panelden düzenlenir.
            </p>
          </div>
          <Select
            value={p.hmVitrinTheme === "vatan" ? "vatan" : "corporate"}
            disabled={saving}
            onValueChange={(value) => {
              const theme = value === "vatan" ? "vatan" : "corporate";
              void saveNewsSiteLayout(
                { ...p, hmVitrinTheme: theme },
                { layoutPatch: { hmVitrinTheme: theme } },
              ).then((result) => {
                if (!result.ok) {
                  toast({ title: "Tema kaydedilemedi", description: result.error.slice(0, 180), variant: "destructive" });
                  return;
                }
                setP({ ...p, hmVitrinTheme: theme });
                toast({ title: theme === "vatan" ? "VATAN tema kaydedildi" : "VKD Tema kaydedildi" });
              });
            }}
          >
            <SelectTrigger className="max-w-md bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corporate">VKD Tema</SelectItem>
              <SelectItem value="vatan">VATAN tema</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              <Link href="/editor/menuler?location=hmCorporateMenuItems">Footer menüsü</Link>
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

        <Accordion type="multiple" defaultValue={["corporate-modules"]} className="space-y-3">
          <AccordionItem
            value="corporate-modules"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 px-4 sm:px-5 border-b-0"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="min-w-0 flex-1 pr-3 text-left">
                <p className="text-base font-black tracking-tight text-slate-900">
                  {isVatanEditorSite ? "VATAN tema modülleri" : "VKD Tema modülleri"}
                </p>
                <p className="mt-1 text-sm font-normal text-slate-600">
                  {isVatanEditorSite
                    ? "Vatan anasayfa sırası bu panelden yönetilir. Slider ve mozaik görselleri Genel ayarlar’daki Tepe Manşet ve Bant bölümlerindedir."
                    : "VKD Tema kurumsal vitrinidir. Modül aç/kapa ve sıra buradan, slider ve bant içerikleri Genel ayarlardan düzenlenir. Haber sitesi ayarları bu temada gösterilmez."}
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
              {isVatanEditorSite ? (
                <TabsTrigger value="vatan-sira" className="px-3 py-2 text-sm">
                  Vatan anasayfa
                </TabsTrigger>
              ) : null}
              {isVatanEditorSite ? (
                <TabsTrigger value="vatan-icerik" className="px-3 py-2 text-sm">
                  Vatan içerik / görsel
                </TabsTrigger>
              ) : null}
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
                Tepe Manşet
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
              Kapattığınız modüller yalnızca seçili kurumsal temada gizlenir. Haber sitesi modülleri burada yoktur. Tema yukarıdan
              seçilir. Tepe manşet ve bant içerikleri{" "}
              <Link href="/editor/manset" className="font-semibold text-red-600 hover:underline">
                Tepe Manşet
              </Link>{" "}
              sayfasından düzenlenir. Kurumsal vitrine RSS haber eklenmez.
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
              label="Tepe Manşet sistemi (varsayılan açık)"
              checked={p.hmNewsTepeMansetEnabled !== false}
              disabled={saving}
              onChange={(c) => toggleDefaultOn("hmNewsTepeMansetEnabled", c)}
            />
            <ToggleRow
              id="hm-corporate-spor-module"
              label="SPOR + Süper Lig puan durumu"
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
              checked={isVatanEditorSite ? isVatanModuleVisible("ataturk") : p.hmCorporateAtaturkCornerEnabled === true}
              disabled={saving}
              onChange={(c) => toggleVatanAwareDefaultOn("hmCorporateAtaturkCornerEnabled", c, ["ataturk"])}
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
              checked={isVatanEditorSite ? isVatanModuleVisible("sehitSearch") : p.hmSehitSearchEnabled === true}
              disabled={saving}
              onChange={(c) => toggleVatanAwareDefaultOn("hmSehitSearchEnabled", c, ["sehitSearch"])}
            />
            <ToggleRow
              id="hm-corporate-wars"
              label="Savaşlar bilgi bölümü"
              checked={isVatanEditorSite ? isVatanModuleVisible("wars") : p.hmCorporateWarsSectionEnabled === true}
              disabled={saving}
              onChange={(c) => toggleVatanAwareDefaultOn("hmCorporateWarsSectionEnabled", c, ["wars"])}
            />
            <ToggleRow
              id="hm-corporate-national-days"
              label="Millî günler bilgi bölümü"
              checked={isVatanEditorSite ? isVatanModuleVisible("nationalDays") : p.hmCorporateNationalDaysSectionEnabled === true}
              disabled={saving}
              onChange={(c) => toggleVatanAwareDefaultOn("hmCorporateNationalDaysSectionEnabled", c, ["nationalDays"])}
            />
            <ToggleRow
              id="hm-corporate-support"
              label="Destek bandı"
              checked={isVatanEditorSite ? isVatanModuleVisible("donation") : p.hmCorporateDonation?.enabled === true}
              disabled={saving}
              onChange={(c) =>
                void commit({
                  ...syncVatanHomeHiddenModulesPatch(
                    {
                      hmCorporateDonation: {
                        ...(p.hmCorporateDonation ?? defaultNewsSiteLayoutPrefs.hmCorporateDonation!),
                        enabled: c,
                      },
                    },
                    ["donation"],
                    c,
                  ),
                })
              }
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
            getModuleEnabled={(moduleId) =>
              isVatanEditorSite
                ? isVatanCorporateModuleVisible(moduleId as HmCorporateHomeModuleId)
                : resolveHmCorporateEditorModuleEnabled(p, moduleId as HmCorporateHomeModuleId)
            }
            onModuleEnabledChange={(moduleId, checked) =>
              toggleCorporateModule(moduleId as HmCorporateHomeModuleId, checked)
            }
            onChange={(items) => setP({ ...p, hmCorporateHomeModuleOrder: items })}
            onSave={(items) => saveHomeOrder("hmCorporateHomeModuleOrder", items)}
            onReset={() => void saveHomeOrder("hmCorporateHomeModuleOrder", [...corporateEditorHomeDefaults])}
          />
            </TabsContent>

            {isVatanEditorSite ? (
            <TabsContent value="vatan-sira" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
          <ModuleOrderEditor
            title="Vatan anasayfa sırası"
            description="Anasayfa bölümleri. Slider görselleri Genel ayarlar → Slider yönetimi; mozaik kartları Bant yönetimi (en az 2 görselli bant) veya «Vatan içerik / görsel» sekmesindeki mozaik kutuları. Kapalı bölümler sırada kalsa bile görünmez."
            items={vatanHomeOrder}
            labels={VATAN_HOME_MODULE_LABELS}
            defaults={VATAN_HOME_MODULE_ORDER}
            disabled={saving}
            enableDragDrop
            getModuleEnabled={(moduleId) => !vatanHomeHidden.has(moduleId)}
            onModuleEnabledChange={(moduleId, checked) => {
              const next = new Set(vatanHomeHidden);
              if (checked) next.delete(moduleId);
              else next.add(moduleId);
              void commit({
                ...vatanModuleTogglePatch(moduleId, checked),
                hmVatanHomeHiddenModules: [...next],
              });
            }}
            onChange={(items) => setP({ ...p, hmVatanHomeModuleOrder: items })}
            onSave={(items) => void commit({ hmVatanHomeModuleOrder: items })}
            onReset={() =>
              void commit({
                hmVatanHomeModuleOrder: [...VATAN_HOME_MODULE_ORDER],
                hmVatanHomeHiddenModules: [],
              })
            }
          />
            </TabsContent>
            ) : null}

            {isVatanEditorSite ? (
            <TabsContent value="vatan-icerik" forceMount className="mt-0 space-y-4 data-[state=inactive]:hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div>
                  <Label className="font-semibold text-slate-900">VATAN tema kutuları (metin + görsel)</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Hero başlığı, dernek bandı, haklar/uzmanlık ve bölüm arka plan görselleri buradan değişir. Slider
                    görselleri için{" "}
                    <Link href="/editor/genel-ayarlar#hm-corporate-slider" className="font-semibold text-red-600 hover:underline">
                      Genel ayarlar → Tepe Manşet
                    </Link>
                    ; logo için Genel ayarlar → Logo.
                  </p>
                </div>
                {(
                  [
                    { key: "hero" as const, label: "Hero (başlık / CTA metni)" },
                    { key: "dernek" as const, label: "Dernek bandı" },
                    { key: "rights" as const, label: "Haklar / uzmanlık ve destek" },
                    { key: "nationalDays" as const, label: "Millî günler bandı" },
                    { key: "ataturk" as const, label: "Atatürk Köşesi görseli" },
                  ] as const
                ).map(({ key, label }) => {
                  const section = (p.hmVatanHomeCopy?.[key] ?? {}) as HmVatanHomeSectionCopy;
                  const patchSection = (next: HmVatanHomeSectionCopy) => {
                    const copy: HmVatanHomeCopy = { ...(p.hmVatanHomeCopy ?? {}) };
                    copy[key] = next;
                    setP({ ...p, hmVatanHomeCopy: copy });
                  };
                  const saveSection = () => {
                    const copy: HmVatanHomeCopy = { ...(p.hmVatanHomeCopy ?? {}) };
                    copy[key] = section;
                    void commit({ hmVatanHomeCopy: copy });
                  };
                  return (
                    <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Üst etiket</Label>
                          <Input
                            value={section.eyebrow ?? ""}
                            disabled={saving}
                            onChange={(e) => patchSection({ ...section, eyebrow: e.target.value })}
                            onBlur={saveSection}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Başlık</Label>
                          <Input
                            value={section.title ?? ""}
                            disabled={saving}
                            onChange={(e) => patchSection({ ...section, title: e.target.value })}
                            onBlur={saveSection}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vurgu (italik)</Label>
                          <Input
                            value={section.accent ?? ""}
                            disabled={saving}
                            onChange={(e) => patchSection({ ...section, accent: e.target.value })}
                            onBlur={saveSection}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Görsel URL</Label>
                          <Input
                            value={section.imageUrl ?? ""}
                            disabled={saving}
                            placeholder="https://… veya /api/media/…"
                            onChange={(e) => patchSection({ ...section, imageUrl: e.target.value })}
                            onBlur={() => {
                              const trimmedRaw = String(section.imageUrl ?? "").trim();
                              const trimmed = trimmedRaw ? toPersistedPublicMediaUrl(trimmedRaw) : null;
                              patchSection({ ...section, imageUrl: trimmed });
                              const copy: HmVatanHomeCopy = { ...(p.hmVatanHomeCopy ?? {}) };
                              copy[key] = { ...section, imageUrl: trimmed };
                              void commit({ hmVatanHomeCopy: copy });
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Kısa metin</Label>
                        <Input
                          value={section.lead ?? ""}
                          disabled={saving}
                          onChange={(e) => patchSection({ ...section, lead: e.target.value })}
                          onBlur={saveSection}
                        />
                      </div>
                      {section.imageUrl ? (
                        <img
                          src={resolveClientMediaSrc(section.imageUrl) || section.imageUrl}
                          alt=""
                          className="mt-1 h-20 w-full max-w-xs rounded object-cover"
                        />
                      ) : null}
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      void commit({
                        hmVatanHomeCopy: isTgdHmSiteSlug(site?.slug) ? { ...TGD_VATAN_HOME_COPY } : null,
                      })
                    }
                  >
                    {isTgdHmSiteSlug(site?.slug) ? "TGD varsayılan metinleri yükle" : "Vatan kopyasını temizle"}
                  </Button>
                </div>
              </div>
            </TabsContent>
            ) : null}

          </Tabs>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <Label className="font-semibold text-slate-900">Footer ve sidebar menüleri</Label>
            <p className="mt-1 text-xs text-slate-500">
              {isVatanEditorSite
                ? "Vatan temasında üst menü hem başlık hem footer sütunlarını besler. Footer menüsüne öğe eklerseniz footer yalnızca onu kullanır."
                : "Kurumsal / Vatan temada alt bilgi menüsü üst menü ile aynıdır. Haber kategorileri Kategoriler sayfasındaki «Vitrinde» anahtarı ile yönetilir."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/editor/menuler?location=hmCorporateMenuItems">Üst / footer menüsünü düzenle</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/editor/menuler?location=hmNewsSidebarMenuItems">Sidebar menüsünü düzenle</Link>
            </Button>
          </div>
        </div>

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
