import { useEffect, useMemo, useRef, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type {
  HmCorporateBandItem,
  HmCorporateDonationSettings,
  HmCorporateLayoutWidth,
  HmCorporateQuickLink,
  HmCorporateSliderItem,
  HmFooterSocialLinks,
  HmVitrinThemeId,
  NewsSiteLayoutPrefs,
} from "@/lib/newsSiteLayout";
import { HM_SUBSCRIPTION_REVENUE_SHARE_PERCENT } from "@/lib/hmCommerce";
import {
  HM_VITRIN_THEME,
  HM_FLOWER_THEME_EDITOR_OPTIONS,
  hmFlowerThemeColorPreset,
  resolveActiveFlowerThemeKey,
  resolveFlowerThemeKeyFromVitrin,
  resolveHmColorPalette,
  resolveHmEditorSecondaryFallback,
} from "@/lib/hmVitrinThemeTokens";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { resolveClientMediaSrc, toPersistedPublicMediaUrl } from "@/lib/apiBase";
import { ArrowDown, ArrowUp, FileCode2, FileUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { HmSeoVerification } from "@/lib/pageSeo";
import { normalizeSeoVerificationFormInput, parseCustomMetaLinesInput } from "@/lib/seoVerificationInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorSayfalarContent } from "./EditorSayfalar";
import { HmRequestCategoriesEditor } from "@/components/HmRequestCategoriesEditor";
import {
  cleanHmRequestCategories,
  DEFAULT_CORPORATE_REQUEST_CATEGORIES,
  DEFAULT_NEWS_OFFER_CATEGORIES,
  DEFAULT_NEWS_REQUEST_CATEGORIES,
} from "@/lib/hmRequestForm";

const HEX3_OR_6 = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizePickerHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(t)) {
    const x = t.slice(1);
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase();
  }
  return fallback;
}

function colorPickerValue(hex: string | null | undefined, fallback: string): string {
  return normalizePickerHex(hex, fallback);
}

function customMetaLines(tags: HmSeoVerification["customMetaTags"]): string {
  return (tags ?? []).map((tag) => `${tag.name}=${tag.content}`).join("\n");
}

function parseCustomMetaLines(raw: string): { name: string; content: string }[] {
  return parseCustomMetaLinesInput(raw);
}

function hasSeoVerificationValue(v: HmSeoVerification): boolean {
  return !!(
    v.googleSiteVerification ||
    v.bingSiteVerification ||
    v.yandexVerification ||
    (v.customMetaTags && v.customMetaTags.length > 0)
  );
}

const HM_CATEGORY_COLOR_ROWS: { slug: string; label: string; defaultHex: string }[] = [
  { slug: "gundem", label: "Gündem", defaultHex: "#e61e25" },
  { slug: "ekonomi", label: "Ekonomi", defaultHex: "#f97316" },
  { slug: "spor", label: "Spor", defaultHex: "#16a34a" },
  { slug: "dunya", label: "Dünya", defaultHex: "#2563eb" },
  { slug: "teknoloji", label: "Teknoloji", defaultHex: "#7c3aed" },
  { slug: "kultur", label: "Kültür", defaultHex: "#9333ea" },
  { slug: "yasam", label: "Yaşam", defaultHex: "#0d9488" },
  { slug: "saglik", label: "Sağlık", defaultHex: "#059669" },
  { slug: "magazin", label: "Magazin", defaultHex: "#a855f7" },
];

const HM_PREMIUM_PALETTES = [
  {
    id: "red",
    label: "Kırmızı",
    description: "Ana kırmızı + koyu kırmızı",
    primaryHex: "#c40021",
    secondaryHex: "#8e0018",
  },
  {
    id: "gold",
    label: "Gold",
    description: "Altın + koyu altın",
    primaryHex: "#d4af37",
    secondaryHex: "#735a0e",
  },
  {
    id: "blue",
    label: "Mavi",
    description: "Mavi + turkuaz",
    primaryHex: "#0d63b6",
    secondaryHex: "#0f766e",
  },
] as const;

const EDITOR_SETTINGS_SECTIONS = [
  { href: "#hm-site-seo-logo", label: "Site / SEO / Logo", description: "Kayıt, doğrulama ve logo" },
  { href: "#hm-vitrin-theme-controls", label: "Vitrin / Renk / Genişlik", description: "Tema ve palet ayarları" },
  { href: "#hm-corporate-slider", label: "Slider / Bant", description: "Vitrin giriş alanları" },
  { href: "#hm-corporate-menu", label: "Menü / Footer", description: "Menü, hızlı erişim, alt bilgi" },
  { href: "#hm-corporate-ataturk-corner", label: "Kurumsal / Bağış / Kültür", description: "Modüller ve destek alanı" },
  { href: "#hm-wordpress-tools", label: "WordPress", description: "İçe aktarma ve şablon sayfaları" },
] as const;

function makeLayoutId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanCorporateQuickLinks(items: HmCorporateQuickLink[]): HmCorporateQuickLink[] | null {
  const cleaned = items
    .map((item, index): HmCorporateQuickLink | null => {
      const label = item.label.trim();
      const href = item.href.trim();
      if (!label || !href) return null;
      return {
        id: item.id.trim() || `quick-${index + 1}`,
        label,
        href,
        icon: (item.icon ?? "").trim() || null,
        subtitle: item.subtitle?.trim() || null,
        enabled: item.enabled === false ? false : true,
      } satisfies HmCorporateQuickLink;
    })
    .filter((item): item is HmCorporateQuickLink => item != null);
  return cleaned.length ? cleaned : null;
}

function cleanCorporateSliderItems(items: HmCorporateSliderItem[]): HmCorporateSliderItem[] | null {
  const cleaned = items
    .map((item, index): HmCorporateSliderItem | null => {
      const title = item.title.trim();
      if (!title) return null;
      return {
        id: item.id.trim() || `slider-${index + 1}`,
        title,
        subtitle: item.subtitle?.trim() || null,
        href: item.href?.trim() || null,
        imageUrl: item.imageUrl?.trim() || null,
        color: HEX3_OR_6.test((item.color ?? "").trim()) ? item.color!.trim().toLowerCase() : null,
        order: index + 1,
        active: item.active === false ? false : true,
      } satisfies HmCorporateSliderItem;
    })
    .filter((item): item is HmCorporateSliderItem => item != null);
  return cleaned.length ? cleaned : null;
}

function cleanCorporateBandItems(items: HmCorporateBandItem[]): HmCorporateBandItem[] | null {
  const cleaned = items
    .map((item, index): HmCorporateBandItem | null => {
      const title = item.title.trim();
      if (!title) return null;
      return {
        id: item.id.trim() || `band-${index + 1}`,
        title,
        subtitle: item.subtitle?.trim() || null,
        href: item.href?.trim() || null,
        imageUrl: item.imageUrl?.trim() || null,
        color: HEX3_OR_6.test((item.color ?? "").trim()) ? item.color!.trim().toLowerCase() : null,
        order: index + 1,
        active: item.active === false ? false : true,
      } satisfies HmCorporateBandItem;
    })
    .filter((item): item is HmCorporateBandItem => item != null);
  return cleaned.length ? cleaned : null;
}

const DEFAULT_DONATION_SETTINGS: HmCorporateDonationSettings = {
  enabled: true,
  title: "Kurumsal yayıncılığa destek olun",
  description: "Bağışınız bağımsız haber üretimi, yerel içerik ve okur odaklı yayınların sürdürülebilirliği için kullanılır.",
  amounts: [500, 1000, 2500],
  iban: null,
  accountName: null,
  buttonText: "Bağış Yap",
  supportBand: {
    enabled: true,
    title: "Desteğiniz haber merkezinin yanında",
    text: "Bağışlar şeffaf, güvenli ve doğrudan yayın faaliyetlerine destek olacak şekilde değerlendirilir.",
    items: ["Yerel habercilik", "Bağımsız yayın", "Toplumsal fayda"],
  },
};

function cleanCorporateDonationSettings(input: HmCorporateDonationSettings): HmCorporateDonationSettings {
  const amounts = (input.amounts ?? [])
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 20 && n <= 100_000)
    .slice(0, 8);
  const items = (input.supportBand?.items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    enabled: input.enabled !== false,
    title: input.title?.trim() || DEFAULT_DONATION_SETTINGS.title,
    description: input.description?.trim() || DEFAULT_DONATION_SETTINGS.description,
    amounts: amounts.length ? amounts : DEFAULT_DONATION_SETTINGS.amounts,
    iban: input.iban?.trim() || null,
    accountName: input.accountName?.trim() || null,
    buttonText: input.buttonText?.trim() || DEFAULT_DONATION_SETTINGS.buttonText,
    supportBand: {
      enabled: input.supportBand?.enabled !== false,
      title: input.supportBand?.title?.trim() || DEFAULT_DONATION_SETTINGS.supportBand?.title || null,
      text: input.supportBand?.text?.trim() || DEFAULT_DONATION_SETTINGS.supportBand?.text || null,
      items: items.length ? items : DEFAULT_DONATION_SETTINGS.supportBand?.items ?? null,
    },
  };
}

function moveArrayItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export default function EditorGenelAyarlari() {
  const { newsLayoutPrefs, saveNewsSiteLayout, site, seoVerification, saveSeoVerification } = useHmEditor();
  const { toast } = useToast();
  const [p, setP] = useState<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const [logoUrlDraft, setLogoUrlDraft] = useState(() => (newsLayoutPrefs.logoUrl ?? "").trim());
  const [faviconUrlDraft, setFaviconUrlDraft] = useState(() => (newsLayoutPrefs.faviconUrl ?? "").trim());
  const [saving, setSaving] = useState(false);
  const [seoSaving, setSeoSaving] = useState(false);
  const [googleSiteVerification, setGoogleSiteVerification] = useState("");
  const [bingSiteVerification, setBingSiteVerification] = useState("");
  const [yandexVerification, setYandexVerification] = useState("");
  const [customMetaTagLines, setCustomMetaTagLines] = useState("");
  const [uploading, setUploading] = useState(false);
  /** Kategori hex yazılırken ara değer (sunucuya yalnızca geçerli hex veya boş gönderilir) */
  const [catHexDraft, setCatHexDraft] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setP(newsLayoutPrefs);
    setCatHexDraft({});
    setLogoUrlDraft((newsLayoutPrefs.logoUrl ?? "").trim());
    setFaviconUrlDraft((newsLayoutPrefs.faviconUrl ?? "").trim());
  }, [newsLayoutPrefs]);

  useEffect(() => {
    setGoogleSiteVerification(seoVerification?.googleSiteVerification ?? "");
    setBingSiteVerification(seoVerification?.bingSiteVerification ?? "");
    setYandexVerification(seoVerification?.yandexVerification ?? "");
    setCustomMetaTagLines(customMetaLines(seoVerification?.customMetaTags));
  }, [seoVerification]);

  const commit = async (patch: Partial<NewsSiteLayoutPrefs>) => {
    const next = { ...newsLayoutPrefs, ...patch };
    setP(next);
    setSaving(true);
    const r = await saveNewsSiteLayout(newsLayoutPrefs, { layoutPatch: patch });
    setSaving(false);
    if (!r.ok) {
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 220) || "Sunucuya yazılamadı; oturumunuzu kontrol edin.",
        variant: "destructive",
      });
      setP(newsLayoutPrefs);
    } else {
      toast({ title: "Kaydedildi" });
    }
  };

  const accentFallback = useMemo(() => "#e61e25", []);
  const secondaryFallback = useMemo(
    () => resolveHmEditorSecondaryFallback(p.hmPrimaryColor, p.hmVitrinTheme),
    [p.hmPrimaryColor, p.hmVitrinTheme],
  );

  const applyPremiumPalette = (paletteId: (typeof HM_PREMIUM_PALETTES)[number]["id"]) => {
    const palette = HM_PREMIUM_PALETTES.find((item) => item.id === paletteId)!;
    void commit({
      ...p,
      hmColorPalette: palette.id,
      hmPrimaryColor: palette.primaryHex,
      hmSecondaryColor: palette.secondaryHex,
    });
  };

  const applyFlowerThemeColors = (themeKey: string) => {
    const preset = hmFlowerThemeColorPreset(themeKey);
    setCatHexDraft({});
    void commit({
      ...p,
      hmPrimaryColor: preset.hmPrimaryColor,
      hmSecondaryColor: preset.hmSecondaryColor,
      hmColorPalette: preset.hmColorPalette,
      hmCategoryColors: { ...preset.hmCategoryColors },
    });
  };

  const activeFlowerThemeKey = useMemo(
    () => resolveActiveFlowerThemeKey(p.hmPrimaryColor, p.hmSecondaryColor, p.hmCategoryColors),
    [p.hmPrimaryColor, p.hmSecondaryColor, p.hmCategoryColors],
  );

  const vitrinFlowerThemeKey = useMemo(
    () => resolveFlowerThemeKeyFromVitrin(p.hmVitrinTheme),
    [p.hmVitrinTheme],
  );

  const setHmCategoryColor = (slug: string, value: string) => {
    const row = HM_CATEGORY_COLOR_ROWS.find((r) => r.slug === slug);
    const fb = row?.defaultHex ?? accentFallback;
    const nextMap = { ...(p.hmCategoryColors ?? {}) };
    const v = value.trim();
    if (!v || !HEX3_OR_6.test(v)) delete nextMap[slug];
    else nextMap[slug] = normalizePickerHex(v, fb);
    const keys = Object.keys(nextMap);
    void commit({ ...p, hmCategoryColors: keys.length ? nextMap : null });
  };

  const onCategoryHexInput = (slug: string, raw: string) => {
    setCatHexDraft((d) => ({ ...d, [slug]: raw }));
    const v = raw.trim();
    if (v === "" || HEX3_OR_6.test(v)) {
      setHmCategoryColor(slug, v);
      setCatHexDraft((d) => {
        const n = { ...d };
        delete n[slug];
        return n;
      });
    }
  };

  const corporateQuickLinks = p.hmCorporateQuickLinks ?? [];
  const corporateSliderItems = p.corporateSliderItems ?? [];
  const corporateBandItems = p.corporateBandItems ?? [];
  const donationSettings = p.hmCorporateDonation ?? DEFAULT_DONATION_SETTINGS;
  const corporateAtaturkCornerEnabled = p.hmCorporateAtaturkCornerEnabled === true;
  const corporateCulturePortalBandEnabled = p.hmCorporateCulturePortalBandEnabled === true;
  const corporateWarsSectionEnabled = p.hmCorporateWarsSectionEnabled === true;
  const corporateNationalDaysSectionEnabled = p.hmCorporateNationalDaysSectionEnabled === true;
  const corporateLayoutWidth: HmCorporateLayoutWidth = p.hmCorporateLayoutWidth === "contained" ? "contained" : "full";
  const isCorporateSite = p.hmVitrinTheme === "corporate";
  const editorSettingsSections = useMemo(() => {
    if (isCorporateSite) return EDITOR_SETTINGS_SECTIONS;
    return [
      ...EDITOR_SETTINGS_SECTIONS.filter(
        (section) => section.href !== "#hm-corporate-menu" && section.href !== "#hm-corporate-ataturk-corner",
      ),
      {
        href: "#hm-corporate-donation",
        label: "Bağış / destek",
        description: "Bağış kutusu ve alt destek bandı",
      },
    ];
  }, [isCorporateSite]);
  const corporateRequestCategories = p.hmCorporateRequestCategories ?? [...DEFAULT_CORPORATE_REQUEST_CATEGORIES];
  const newsRequestCategories = p.hmNewsRequestCategories ?? [...DEFAULT_NEWS_REQUEST_CATEGORIES];
  const newsOfferCategories = p.hmNewsOfferCategories ?? [...DEFAULT_NEWS_OFFER_CATEGORIES];
  const donationSupportBand = donationSettings.supportBand ?? DEFAULT_DONATION_SETTINGS.supportBand!;
  const donationSupportItemsText = (donationSupportBand.items ?? DEFAULT_DONATION_SETTINGS.supportBand?.items ?? []).join("\n");

  const addCorporateQuickLink = () => {
    const next: HmCorporateQuickLink[] = [
      ...corporateQuickLinks,
      {
        id: makeLayoutId("quick"),
        label: "Yeni hızlı erişim",
        subtitle: "Kısa açıklama",
        href: "/",
        icon: String(corporateQuickLinks.length + 1).padStart(2, "0"),
        enabled: true,
      },
    ];
    setP({ ...p, hmCorporateQuickLinks: next });
  };

  const addCorporateSliderItem = () => {
    const next: HmCorporateSliderItem[] = [
      ...corporateSliderItems,
      {
        id: makeLayoutId("slider"),
        title: "Yeni slider başlığı",
        subtitle: "Kısa açıklama veya çağrı metni",
        href: "/",
        imageUrl: null,
        color: p.hmPrimaryColor ?? null,
        order: corporateSliderItems.length + 1,
        active: true,
      },
    ];
    setP({ ...p, corporateSliderItems: next });
  };

  const addCorporateBandItem = () => {
    const next: HmCorporateBandItem[] = [
      ...corporateBandItems,
      {
        id: makeLayoutId("band"),
        title: "Yeni bant duyurusu",
        subtitle: null,
        href: "/",
        imageUrl: null,
        color: p.hmPrimaryColor ?? null,
        order: corporateBandItems.length + 1,
        active: true,
      },
    ];
    setP({ ...p, corporateBandItems: next });
  };

  const saveCorporateQuickLinks = () => {
    void commit({ ...p, hmCorporateQuickLinks: cleanCorporateQuickLinks(corporateQuickLinks) });
  };

  const saveCorporateSliderItems = () => {
    void commit({ ...p, corporateSliderItems: cleanCorporateSliderItems(corporateSliderItems) });
  };

  const saveCorporateBandItems = () => {
    void commit({ ...p, corporateBandItems: cleanCorporateBandItems(corporateBandItems) });
  };

  const updateDonationSettings = (patch: Partial<HmCorporateDonationSettings>) => {
    setP({
      ...p,
      hmCorporateDonation: {
        ...DEFAULT_DONATION_SETTINGS,
        ...donationSettings,
        ...patch,
        supportBand: {
          ...DEFAULT_DONATION_SETTINGS.supportBand,
          ...donationSettings.supportBand,
          ...(patch.supportBand ?? {}),
        },
      },
    });
  };

  const updateDonationSupportBand = (patch: NonNullable<HmCorporateDonationSettings["supportBand"]>) => {
    updateDonationSettings({
      supportBand: {
        ...donationSupportBand,
        ...patch,
      },
    });
  };

  const saveCorporateDonation = () => {
    void commit({ ...p, hmCorporateDonation: cleanCorporateDonationSettings(donationSettings) });
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const full = toPersistedPublicMediaUrl(url);
      setLogoUrlDraft(full);
      await commit({ logoUrl: full || null });
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onPickFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const full = toPersistedPublicMediaUrl(url);
      setFaviconUrlDraft(full);
      await commit({ faviconUrl: full || null });
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveSeoFields = async () => {
    const parsed = normalizeSeoVerificationFormInput({
      googleSiteVerification,
      bingSiteVerification,
      yandexVerification,
      customMetaTagLines,
    });
    const next: HmSeoVerification = parsed;
    setSeoSaving(true);
    const r = await saveSeoVerification(hasSeoVerificationValue(next) ? next : null);
    setSeoSaving(false);
    if (!r.ok) {
      toast({
        title: "SEO doğrulamaları kaydedilemedi",
        description: r.error.slice(0, 220) || "Sunucuya yazılamadı; oturumunuzu kontrol edin.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "SEO doğrulama kodları kaydedildi" });
  };

  return (
    <EditorLayout title="Genel ayarlar">
      <Tabs defaultValue="ayarlar" className="w-full">
        <TabsList className="mb-6 h-auto flex flex-wrap justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <TabsTrigger value="ayarlar" className="px-4 py-2 text-sm">
            Genel ayarlar
          </TabsTrigger>
          <TabsTrigger value="sayfalar" className="px-4 py-2 text-sm">
            Sayfalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ayarlar" forceMount className="mt-0 data-[state=inactive]:hidden">
          <div className="w-full max-w-[1500px] space-y-6">
        <nav className="sticky top-14 z-[9] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {editorSettingsSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
              >
                {section.label}
                <span className="mt-0.5 block text-[11px] font-normal leading-4 text-slate-500">{section.description}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 xl:grid-cols-2">
          <div id="hm-site-seo-logo" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <Label className="font-semibold text-slate-900">Site adı (kayıt)</Label>
            <p className="mt-1 text-sm text-slate-600">{site?.displayName ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-1">
              Slug: <code className="bg-slate-100 px-1 rounded">{site?.slug ?? "—"}</code>
            </p>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-4">
            <div>
              <Label className="font-semibold text-slate-900">SEO doğrulama kodları</Label>
              <p className="text-xs text-slate-600 mt-1">
                Google Search Console&apos;da <strong>HTML etiketi</strong> yöntemini seçin ve GSC&apos;nin verdiği
                meta etiketinin <strong>tamamını</strong> aşağıya yapıştırın. Yalnızca <code className="text-slate-700">content</code>{" "}
                değeri de kabul edilir. Etiket site vitrininin <code className="text-slate-700">head</code> bölümüne
                sunucu tarafında eklenir.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-1">
              <div>
                <Label className="text-xs text-slate-600">Google Search Console (HTML etiketi)</Label>
                <Textarea
                  className="mt-1 min-h-[72px] font-mono text-xs"
                  placeholder={'<meta name="google-site-verification" content="..." />'}
                  value={googleSiteVerification}
                  disabled={seoSaving}
                  onChange={(e) => setGoogleSiteVerification(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-slate-600">Bing Webmaster</Label>
                <Textarea
                  className="mt-1 min-h-[72px] font-mono text-xs"
                  placeholder={'<meta name="msvalidate.01" content="..." />'}
                  value={bingSiteVerification}
                  disabled={seoSaving}
                  onChange={(e) => setBingSiteVerification(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Yandex doğrulama</Label>
                <Textarea
                  className="mt-1 min-h-[72px] font-mono text-xs"
                  placeholder={'<meta name="yandex-verification" content="..." />'}
                  value={yandexVerification}
                  disabled={seoSaving}
                  onChange={(e) => setYandexVerification(e.target.value)}
                />
              </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Özel doğrulama meta satırları</Label>
              <Textarea
                className="mt-1 min-h-[92px] font-mono text-xs"
                placeholder={'<meta name="facebook-domain-verification" content="..." />\ncustom-meta-name=content-degeri'}
                value={customMetaTagLines}
                disabled={seoSaving}
                onChange={(e) => setCustomMetaTagLines(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Her satıra tam HTML meta etiketi veya <code className="bg-white px-1 rounded">meta-name=content-degeri</code> yazın.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={seoSaving}
              onClick={() => void saveSeoFields()}
            >
              {seoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              SEO kodlarını kaydet
            </Button>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <Label className="font-semibold text-slate-900">Logo</Label>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Site logosu üst şeritte, paylaşım önizlemesinde ve tarayıcı sekmesi ikonunda (favicon) kullanılır. Kare
              veya kareye yakın PNG yüklemeniz önerilir.
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Görsel yükleyin veya tam URL yapıştırın. Yükleme sunucuya kaydedilir;{" "}
              <code className="text-slate-600">/api/media/…</code> yolları özel alan köküyle kayıtlı olsa bile kayıtta
              doğru API adresine çevrilir.
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(ev) => void onPickLogo(ev)} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || uploading}
                className="gap-2"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Dosya yükle
              </Button>
            </div>
            <Input
              className="mt-3"
              placeholder="https://… veya /api/media/uploads/…"
              value={logoUrlDraft}
              disabled={saving}
              onChange={(e) => setLogoUrlDraft(e.target.value)}
              onBlur={() => {
                const trimmedRaw = logoUrlDraft.trim() || null;
                const trimmed = trimmedRaw ? toPersistedPublicMediaUrl(trimmedRaw) : null;
                const cur = (p.logoUrl ?? "").trim() || null;
                if (trimmed === cur) return;
                if (trimmed && trimmed !== trimmedRaw) setLogoUrlDraft(trimmed);
                void commit({ logoUrl: trimmed });
              }}
            />
            {(logoUrlDraft ?? "").trim() ? (
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 flex justify-center">
                <img
                  src={resolveClientMediaSrc(logoUrlDraft.trim()) || logoUrlDraft.trim()}
                  alt="Önizleme"
                  className="max-h-16 w-auto max-w-full object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <Label className="font-semibold text-slate-900">Site ikonu (favicon)</Label>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Tarayıcı sekmesinde görünen küçük ikon. Özel ikon yüklemezseniz varsayılan olarak site logosu kullanılır.
              Kare PNG (ör. 192×192) önerilir.
            </p>
            <input
              ref={faviconFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(ev) => void onPickFavicon(ev)}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || uploading}
                className="gap-2"
                onClick={() => faviconFileRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                İkon yükle
              </Button>
              {(faviconUrlDraft ?? "").trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setFaviconUrlDraft("");
                    void commit({ faviconUrl: null });
                  }}
                >
                  İkonu kaldır
                </Button>
              ) : null}
            </div>
            <Input
              className="mt-3"
              placeholder="https://… veya /api/media/uploads/…"
              value={faviconUrlDraft}
              disabled={saving}
              onChange={(e) => setFaviconUrlDraft(e.target.value)}
              onBlur={() => {
                const trimmedRaw = faviconUrlDraft.trim() || null;
                const trimmed = trimmedRaw ? toPersistedPublicMediaUrl(trimmedRaw) : null;
                const cur = (p.faviconUrl ?? "").trim() || null;
                if (trimmed === cur) return;
                if (trimmed && trimmed !== trimmedRaw) setFaviconUrlDraft(trimmed);
                void commit({ faviconUrl: trimmed });
              }}
            />
            {((faviconUrlDraft ?? "").trim() || (logoUrlDraft ?? "").trim()) ? (
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 flex justify-center">
                <img
                  src={
                    resolveClientMediaSrc((faviconUrlDraft || logoUrlDraft).trim()) ||
                    (faviconUrlDraft || logoUrlDraft).trim()
                  }
                  alt="Favicon önizleme"
                  className="h-12 w-12 object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4">
            <div>
              <Label className="font-semibold text-slate-900">Üst vitrin şeritleri (logo + menü)</Label>
              <p className="text-xs text-slate-500 mt-1">
                Varsayılan: vitrin gövdesiyle aynı genişlikte (<code className="text-slate-600">max-w-screen-xl</code>
                ). Açıldığında özel sayfalar dahil header ve menü kenardan kenara uzar.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">Tam genişlik (kenardan kenara)</span>
              <Switch
                checked={p.hmHeaderChromeFullBleed === true}
                disabled={saving}
                onCheckedChange={(c) => void commit({ ...p, hmHeaderChromeFullBleed: c ? true : undefined })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-slate-600">Logo şeridi arka planı</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    disabled={saving}
                    value={colorPickerValue(p.hmLogoBarBackground, "#0f172a")}
                    onChange={(e) => void commit({ ...p, hmLogoBarBackground: e.target.value })}
                  />
                  <Input
                    className="font-mono text-xs"
                    placeholder="#ffffff veya boş = tema"
                    value={p.hmLogoBarBackground ?? ""}
                    disabled={saving}
                    onChange={(e) => setP({ ...p, hmLogoBarBackground: e.target.value || null })}
                    onBlur={() => {
                      const v = (p.hmLogoBarBackground ?? "").trim();
                      if (!v) {
                        void commit({ ...p, hmLogoBarBackground: null });
                        return;
                      }
                      if (!HEX3_OR_6.test(v)) {
                        toast({ title: "Geçersiz renk", description: "#rgb veya #rrggbb kullanın.", variant: "destructive" });
                        setP({ ...p, hmLogoBarBackground: newsLayoutPrefs.hmLogoBarBackground ?? null });
                        return;
                      }
                      void commit({ ...p, hmLogoBarBackground: normalizePickerHex(v, "#0f172a") });
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Kategori menü şeridi arka planı</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    disabled={saving}
                    value={colorPickerValue(p.hmNavBarBackground, "#0f172a")}
                    onChange={(e) => void commit({ ...p, hmNavBarBackground: e.target.value })}
                  />
                  <Input
                    className="font-mono text-xs"
                    placeholder="#0f172a veya boş = tema"
                    value={p.hmNavBarBackground ?? ""}
                    disabled={saving}
                    onChange={(e) => setP({ ...p, hmNavBarBackground: e.target.value || null })}
                    onBlur={() => {
                      const v = (p.hmNavBarBackground ?? "").trim();
                      if (!v) {
                        void commit({ ...p, hmNavBarBackground: null });
                        return;
                      }
                      if (!HEX3_OR_6.test(v)) {
                        toast({ title: "Geçersiz renk", description: "#rgb veya #rrggbb kullanın.", variant: "destructive" });
                        setP({ ...p, hmNavBarBackground: newsLayoutPrefs.hmNavBarBackground ?? null });
                        return;
                      }
                      void commit({ ...p, hmNavBarBackground: normalizePickerHex(v, "#0f172a") });
                    }}
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || (!p.hmLogoBarBackground && !p.hmNavBarBackground)}
              onClick={() =>
                void commit({
                  ...p,
                  hmLogoBarBackground: null,
                  hmNavBarBackground: null,
                })
              }
            >
              Özel şerit renklerini sıfırla
            </Button>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 space-y-4 xl:col-span-2">
            <div>
              <Label className="font-semibold text-slate-900">
                {isCorporateSite ? "Kurumsal tema yönetimi" : "Slider ve bant yönetimi"}
              </Label>
              <p className="text-xs text-slate-600 mt-1">
                {isCorporateSite ? (
                  <>
                    Kurumsal vitrinde slider ve bant haber bayraklarından bağımsızdır; tümü bu sayfada{" "}
                    <code className="text-slate-700">layout_json</code> içinde saklanır. Menüye Ansiklopedi, Video TV,
                    Köşe Yazarları, RSS ve Sitene Ekle bağlantılarını elle ekleyebilirsiniz.
                  </>
                ) : (
                  <>
                    Haber vitrininde manuel slider ve slider altı bant buradan yönetilir. Haber manşeti ve son dakika
                    bayrakları <strong>Slider / Bant</strong> menüsünden işaretlenir.
                  </>
                )}
              </p>
            </div>
            <div className={`grid gap-2 ${isCorporateSite ? "sm:grid-cols-6" : "sm:grid-cols-2"}`}>
              <a
                href="#hm-corporate-slider"
                className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
              >
                Slider Yönetimi
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Manuel görsel + URL</span>
              </a>
              <a
                href="#hm-corporate-band"
                className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
              >
                Bant Yönetimi
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Slider altı bant</span>
              </a>
              {isCorporateSite ? (
                <>
                  <a
                    href="#hm-corporate-quick-links"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
                  >
                    Hızlı Erişim Yönetimi
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Slider/bant altı kutular</span>
                  </a>
                  <a
                    href="#hm-corporate-menu"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
                  >
                    Menü Yönetimi
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Kurumsal üst menü</span>
                  </a>
                  <a
                    href="#hm-corporate-ataturk-corner"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
                  >
                    Atatürk Köşesi
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Anasayfa link kartları</span>
                  </a>
                  <a
                    href="#hm-corporate-info-tabs"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
                  >
                    Bilgi Bölümleri
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Savaşlar + millî günler</span>
                  </a>
                  <a
                    href="#hm-corporate-culture-portal"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-200"
                  >
                    Kültür Portalı
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Kültür bandı aç/kapat</span>
                  </a>
                </>
              ) : null}
            </div>
          </div>

          {isCorporateSite ? (
          <>
          <div id="hm-corporate-ataturk-corner" className="scroll-mt-32 rounded-lg border border-rose-100 bg-rose-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Atatürk Köşesi</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Kurumsal anasayfadaki &quot;Yayın Kanalları&quot; alanında{" "}
                  <code>/ataturk</code>, <code>/ataturk/hayati</code>, <code>/ataturk/kronoloji</code>,{" "}
                  <code>/ataturk/ilkeler</code> ve <code>/ataturk/sozleri</code> bağlantı kartlarını gösterir.
                  Tanımsız ayar açık kabul edilir.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                <Switch
                  checked={corporateAtaturkCornerEnabled}
                  disabled={saving}
                  onCheckedChange={(checked) =>
                    void commit({ ...p, hmCorporateAtaturkCornerEnabled: checked ? true : false })
                  }
                />
                Atatürk Köşesi aktif
              </div>
            </div>
          </div>

          <div id="hm-corporate-culture-portal" className="scroll-mt-32 rounded-lg border border-teal-100 bg-teal-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Kültür Portalı Bandı</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Kurumsal anasayfada hızlı erişim alanının altında{" "}
                  <code>/kultur-portali</code> bağlantılı kültür, turizm ve sanat bandını gösterir. Tanımsız ayar açık
                  kabul edilir.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                <Switch
                  checked={corporateCulturePortalBandEnabled}
                  disabled={saving}
                  onCheckedChange={(checked) =>
                    void commit({ ...p, hmCorporateCulturePortalBandEnabled: checked ? true : false })
                  }
                />
                Kültür Portalı Bandı aktif
              </div>
            </div>
          </div>

          <div id="hm-corporate-info-tabs" className="scroll-mt-32 rounded-lg border border-cyan-100 bg-cyan-50/60 p-4 space-y-4 xl:col-span-2">
            <div>
              <Label className="font-semibold text-slate-900">Kurumsal bilgi bölümleri</Label>
              <p className="text-xs text-slate-500 mt-1">
                Kurumsal anasayfanın alt bölümünde görünen &quot;Türk Milletinin Savaşları&quot; ve &quot;Millî Günler &amp;
                Anma Törenleri&quot; bölümleridir. Boş link alanları varsayılan olarak <code>/savaslar</code> ve{" "}
                <code>/milli-gunler</code> adreslerine gider.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-cyan-100 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">Savaşlar</Label>
                    <p className="text-[11px] text-slate-500">Çanakkale, Kurtuluş, Kore ve Kıbrıs sayfalarına bağlanır.</p>
                  </div>
                  <Switch
                    checked={corporateWarsSectionEnabled}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      void commit({ ...p, hmCorporateWarsSectionEnabled: checked ? true : false })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Alt bağlantı</Label>
                  <Input
                    className="mt-1 font-mono text-xs"
                    placeholder="/savaslar"
                    value={p.hmCorporateWarsSectionHref ?? ""}
                    disabled={saving}
                    onChange={(e) => setP({ ...p, hmCorporateWarsSectionHref: e.target.value })}
                    onBlur={() =>
                      void commit({ ...p, hmCorporateWarsSectionHref: (p.hmCorporateWarsSectionHref ?? "").trim() || null })
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">Millî Günler</Label>
                    <p className="text-[11px] text-slate-500">Kartlar varsayılan tarih listesiyle gelir.</p>
                  </div>
                  <Switch
                    checked={corporateNationalDaysSectionEnabled}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      void commit({ ...p, hmCorporateNationalDaysSectionEnabled: checked ? true : false })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Alt bağlantı</Label>
                  <Input
                    className="mt-1 font-mono text-xs"
                    placeholder="/milli-gunler"
                    value={p.hmCorporateNationalDaysSectionHref ?? ""}
                    disabled={saving}
                    onChange={(e) => setP({ ...p, hmCorporateNationalDaysSectionHref: e.target.value })}
                    onBlur={() =>
                      void commit({
                        ...p,
                        hmCorporateNationalDaysSectionHref: (p.hmCorporateNationalDaysSectionHref ?? "").trim() || null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          </>
          ) : null}

          <div id="hm-corporate-slider" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Slider yönetimi</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Kurumsal ana slider burada yönetilir; haberlerdeki &quot;Manşette göster&quot; işareti bu alanı etkilemez.
                  Boş bırakılırsa vitrinde site adı ve açıklamasından oluşan sade bir karşılama alanı görünür.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={saving} onClick={addCorporateSliderItem}>
                <Plus className="h-4 w-4" />
                Slider ekle
              </Button>
            </div>
            {corporateSliderItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                Henüz manuel slider yok. Örnek URL’ler: <code>/tum-haberler</code>, <code>/yazarlar</code>,{" "}
                <code>/video-tv</code>, <code>/bilgiagaci</code>, <code>/rss-baglantilari</code>.
              </p>
            ) : (
              <div className="space-y-3">
                {corporateSliderItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-slate-400">{item.id}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={saving || index === 0}
                          onClick={() => setP({ ...p, corporateSliderItems: moveArrayItem(corporateSliderItems, index, -1) })}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={saving || index === corporateSliderItems.length - 1}
                          onClick={() => setP({ ...p, corporateSliderItems: moveArrayItem(corporateSliderItems, index, 1) })}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={item.active !== false}
                          disabled={saving}
                          onCheckedChange={(c) =>
                            setP({
                              ...p,
                              corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, active: !!c } : x)),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          disabled={saving}
                          onClick={() => setP({ ...p, corporateSliderItems: corporateSliderItems.filter((x) => x.id !== item.id) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-slate-600">Başlık</Label>
                        <Input
                          className="mt-1"
                          value={item.title}
                          disabled={saving}
                          onChange={(e) =>
                            setP({
                              ...p,
                              corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">URL</Label>
                        <Input
                          className="mt-1 font-mono text-xs"
                          value={item.href ?? ""}
                          disabled={saving}
                          placeholder="/haber/slug, /video-tv veya https://..."
                          onChange={(e) =>
                            setP({
                              ...p,
                              corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, href: e.target.value } : x)),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs text-slate-600">Alt açıklama</Label>
                      <Textarea
                        className="mt-1 min-h-[70px]"
                        value={item.subtitle ?? ""}
                        disabled={saving}
                        onChange={(e) =>
                          setP({
                            ...p,
                            corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, subtitle: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                      <div>
                        <Label className="text-xs text-slate-600">Görsel URL</Label>
                        <Input
                          className="mt-1 font-mono text-xs"
                          value={item.imageUrl ?? ""}
                          disabled={saving}
                          placeholder="/api/media/uploads/... veya https://..."
                          onChange={(e) =>
                            setP({
                              ...p,
                              corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, imageUrl: e.target.value } : x)),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Vurgu rengi</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                            disabled={saving}
                            value={colorPickerValue(item.color, p.hmPrimaryColor ?? "#0d63b6")}
                            onChange={(e) =>
                              setP({
                                ...p,
                                corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, color: e.target.value } : x)),
                              })
                            }
                          />
                          <Input
                            className="font-mono text-xs"
                            value={item.color ?? ""}
                            disabled={saving}
                            placeholder="#0d63b6"
                            onChange={(e) =>
                              setP({
                                ...p,
                                corporateSliderItems: corporateSliderItems.map((x) => (x.id === item.id ? { ...x, color: e.target.value || null } : x)),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setP({ ...p, corporateSliderItems: null })}>
                Sliderı temizle
              </Button>
              <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={saving} onClick={saveCorporateSliderItems}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sliderı kaydet
              </Button>
            </div>
          </div>

          <div id="hm-corporate-band" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Bant yönetimi</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Sliderın hemen altındaki koyu hızlı erişim bandını yönetir. Boş bırakılırsa Hızlı Erişim Yönetimi veya
                  varsayılan turizm/kültür kutuları kullanılır.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={saving} onClick={addCorporateBandItem}>
                <Plus className="h-4 w-4" />
                Bant ekle
              </Button>
            </div>
            {corporateBandItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                Henüz manuel slider altı bant yok. Varsayılan görünüm Gezilecek Yerler, Seyahat Hatırası, Geleneksel Mutfak
                gibi kutularla devam eder.
              </p>
            ) : (
              <div className="space-y-3">
                {corporateBandItems.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_150px_auto]">
                    <div>
                      <Label className="text-xs text-slate-600">Başlık</Label>
                      <Input
                        className="mt-1"
                        value={item.title}
                        disabled={saving}
                        onChange={(e) =>
                          setP({
                            ...p,
                            corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)),
                          })
                        }
                      />
                      <Input
                        className="mt-2 text-xs"
                        value={item.subtitle ?? ""}
                        disabled={saving}
                        placeholder="Kısa alt metin (isteğe bağlı)"
                        onChange={(e) =>
                          setP({
                            ...p,
                            corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, subtitle: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">URL</Label>
                      <Input
                        className="mt-1 font-mono text-xs"
                        value={item.href ?? ""}
                        disabled={saving}
                        placeholder="/duyuru veya https://..."
                        onChange={(e) =>
                          setP({
                            ...p,
                            corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, href: e.target.value } : x)),
                          })
                        }
                      />
                      <Input
                        className="mt-2 font-mono text-xs"
                        value={item.imageUrl ?? ""}
                        disabled={saving}
                        placeholder="Görsel URL (isteğe bağlı)"
                        onChange={(e) =>
                          setP({
                            ...p,
                            corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, imageUrl: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Renk</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          className="h-10 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                          disabled={saving}
                          value={colorPickerValue(item.color, p.hmPrimaryColor ?? "#0d63b6")}
                          onChange={(e) =>
                            setP({
                              ...p,
                              corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, color: e.target.value } : x)),
                            })
                          }
                        />
                        <Input
                          className="font-mono text-xs"
                          value={item.color ?? ""}
                          disabled={saving}
                          placeholder="#0d63b6"
                          onChange={(e) =>
                            setP({
                              ...p,
                              corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, color: e.target.value || null } : x)),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={saving || index === 0}
                        onClick={() => setP({ ...p, corporateBandItems: moveArrayItem(corporateBandItems, index, -1) })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={saving || index === corporateBandItems.length - 1}
                        onClick={() => setP({ ...p, corporateBandItems: moveArrayItem(corporateBandItems, index, 1) })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={item.active !== false}
                        disabled={saving}
                        onCheckedChange={(c) =>
                          setP({
                            ...p,
                            corporateBandItems: corporateBandItems.map((x) => (x.id === item.id ? { ...x, active: !!c } : x)),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-600"
                        disabled={saving}
                        onClick={() => setP({ ...p, corporateBandItems: corporateBandItems.filter((x) => x.id !== item.id) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setP({ ...p, corporateBandItems: null })}>
                Bandı temizle
              </Button>
              <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={saving} onClick={saveCorporateBandItems}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Bandı kaydet
              </Button>
            </div>
          </div>

          {isCorporateSite ? (
          <>
          <div id="hm-corporate-menu" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4 xl:col-span-2">
            <div>
              <Label className="font-semibold text-slate-900">Kurumsal menü yönetimi</Label>
              <p className="text-xs text-slate-500 mt-1">
                Üst menüyü WordPress tarzı editörde düzenleyin: sayfa/kategori ekleyin, sürükleyerek sıralayın, alt menü
                oluşturun. Boş bırakılırsa varsayılan Anasayfa / Tüm Haberler / Kurumsal / Medya menüsü kullanılır.
              </p>
            </div>
            <Button type="button" size="sm" className="bg-orange-600 text-white hover:bg-orange-700" asChild>
              <Link href="/editor/menuler?location=hmCorporateMenuItems">Menü editörünü aç</Link>
            </Button>
          </div>

          <div id="hm-corporate-quick-links" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Hızlı erişim yönetimi (yedek)</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Bant yönetimi boşsa kurumsal anasayfada sliderın hemen altındaki koyu kutular için bu liste kullanılır.
                  Bu da boşsa referans görünüme uygun varsayılan hızlı erişimler gösterilir.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={saving} onClick={addCorporateQuickLink}>
                <Plus className="h-4 w-4" />
                Hızlı erişim ekle
              </Button>
            </div>
            {corporateQuickLinks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                Henüz özel hızlı erişim yok. Varsayılan kutular Gezilecek Yerler, Seyahat Hatırası, Geleneksel Mutfak,
                Turizm Aktiviteleri, Kültür Atlası, Müzeler ve Sanat olarak görünür.
              </p>
            ) : (
              <div className="space-y-3">
                {corporateQuickLinks.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[90px_1fr_1fr_1fr_auto]">
                    <div>
                      <Label className="text-xs text-slate-600">İkon</Label>
                      <Input
                        className="mt-1 text-sm"
                        value={item.icon ?? ""}
                        disabled={saving}
                        placeholder="01"
                        onChange={(e) =>
                          setP({
                            ...p,
                            hmCorporateQuickLinks: corporateQuickLinks.map((x) => (x.id === item.id ? { ...x, icon: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Başlık</Label>
                      <Input
                        className="mt-1"
                        value={item.label}
                        disabled={saving}
                        onChange={(e) =>
                          setP({
                            ...p,
                            hmCorporateQuickLinks: corporateQuickLinks.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Alt açıklama</Label>
                      <Input
                        className="mt-1"
                        value={item.subtitle ?? ""}
                        disabled={saving}
                        placeholder="Kısa açıklama"
                        onChange={(e) =>
                          setP({
                            ...p,
                            hmCorporateQuickLinks: corporateQuickLinks.map((x) => (x.id === item.id ? { ...x, subtitle: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">URL</Label>
                      <Input
                        className="mt-1 font-mono text-xs"
                        value={item.href}
                        disabled={saving}
                        placeholder="/tum-haberler"
                        onChange={(e) =>
                          setP({
                            ...p,
                            hmCorporateQuickLinks: corporateQuickLinks.map((x) => (x.id === item.id ? { ...x, href: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={saving || index === 0}
                        onClick={() => setP({ ...p, hmCorporateQuickLinks: moveArrayItem(corporateQuickLinks, index, -1) })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={saving || index === corporateQuickLinks.length - 1}
                        onClick={() => setP({ ...p, hmCorporateQuickLinks: moveArrayItem(corporateQuickLinks, index, 1) })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={item.enabled !== false}
                        disabled={saving}
                        onCheckedChange={(c) =>
                          setP({
                            ...p,
                            hmCorporateQuickLinks: corporateQuickLinks.map((x) => (x.id === item.id ? { ...x, enabled: !!c } : x)),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-600"
                        disabled={saving}
                        onClick={() =>
                          setP({ ...p, hmCorporateQuickLinks: corporateQuickLinks.filter((x) => x.id !== item.id) })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setP({ ...p, hmCorporateQuickLinks: null })}>
                Varsayılan hızlı erişime dön
              </Button>
              <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={saving} onClick={saveCorporateQuickLinks}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Hızlı erişimi kaydet
              </Button>
            </div>
          </div>
          </>
          ) : null}

          {isCorporateSite ? (
            <div id="hm-corporate-request-categories" className="scroll-mt-32 xl:col-span-2">
              <HmRequestCategoriesEditor
                title="Talep formu konuları (kurumsal)"
                description="Ziyaretçiler talep formunda bu başlıklardan birini seçer. Yardım talep / yardım etmek seçenekleri formda sabittir."
                defaultExamples="Öğrenci Bursu, Nakdi Yardım, Hukuki Destek, Gıda Yardımı, Kira Yardımı"
                items={corporateRequestCategories}
                disabled={saving}
                onChange={(items) => setP({ ...p, hmCorporateRequestCategories: items })}
                onSave={() =>
                  void commit({
                    ...p,
                    hmCorporateRequestCategories: cleanHmRequestCategories(corporateRequestCategories),
                  })
                }
              />
            </div>
          ) : (
            <div id="hm-news-request-categories" className="scroll-mt-32 xl:col-span-2 space-y-4">
              <HmRequestCategoriesEditor
                title="Talep konuları — Talep Ediyorum"
                description="«Talep Ediyorum» seçildiğinde ziyaretçinin göreceği konu listesi."
                defaultExamples="Abonelik, Reklam, Sponsorluk"
                items={newsRequestCategories}
                disabled={saving}
                onChange={(items) => setP({ ...p, hmNewsRequestCategories: items })}
                onSave={() =>
                  void commit({
                    ...p,
                    hmNewsRequestCategories: cleanHmRequestCategories(newsRequestCategories),
                  })
                }
              />
              <HmRequestCategoriesEditor
                title="Teklif konuları — Teklif ediyorum"
                description="«Teklif ediyorum» seçildiğinde ziyaretçinin göreceği konu listesi."
                defaultExamples="Sosyal Medya, Basın Daveti, İşbirliği Protokolü"
                items={newsOfferCategories}
                disabled={saving}
                onChange={(items) => setP({ ...p, hmNewsOfferCategories: items })}
                onSave={() =>
                  void commit({
                    ...p,
                    hmNewsOfferCategories: cleanHmRequestCategories(newsOfferCategories),
                  })
                }
              />
            </div>
          )}

          <div id="hm-corporate-donation" className="scroll-mt-32 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Label className="font-semibold text-slate-900">Bağış kutusu ve alt destek bandı</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Tüm haber merkezi vitrinlerinde anasayfada IBAN kutusu ve &quot;IBAN Kopyala&quot; gösterilir (hero, destek bandı
                  veya alt bağış modülü sırasına göre tek konumda). Bağış aktifken IBAN ve hesap adını doldurun.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                <Switch
                  checked={donationSettings.enabled !== false}
                  disabled={saving}
                  onCheckedChange={(checked) => updateDonationSettings({ enabled: !!checked })}
                />
                Bağış aktif
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-600">Başlık</Label>
              <Input
                className="mt-1"
                value={donationSettings.title ?? ""}
                disabled={saving}
                onChange={(e) => updateDonationSettings({ title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Açıklama</Label>
              <Textarea
                className="mt-1 min-h-[76px]"
                value={donationSettings.description ?? ""}
                disabled={saving}
                onChange={(e) => updateDonationSettings({ description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs text-slate-600">IBAN</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={donationSettings.iban ?? ""}
                  disabled={saving}
                  placeholder="TR..."
                  onChange={(e) => updateDonationSettings({ iban: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Hesap adı</Label>
                <Input
                  className="mt-1"
                  value={donationSettings.accountName ?? ""}
                  disabled={saving}
                  onChange={(e) => updateDonationSettings({ accountName: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-white p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="font-semibold text-slate-900">Alt koyu destek bandı</Label>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Switch
                    checked={donationSupportBand.enabled !== false}
                    disabled={saving}
                    onCheckedChange={(checked) => updateDonationSupportBand({ enabled: !!checked })}
                  />
                  Bant aktif
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-600">Bant başlığı</Label>
                  <Input
                    className="mt-1"
                    value={donationSupportBand.title ?? ""}
                    disabled={saving}
                    onChange={(e) => updateDonationSupportBand({ title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">3 madde (satır satır)</Label>
                  <Textarea
                    className="mt-1 min-h-[78px]"
                    value={donationSupportItemsText}
                    disabled={saving}
                    onChange={(e) => updateDonationSupportBand({ items: e.target.value.split(/\r?\n/).slice(0, 3) })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Bant metni</Label>
                <Textarea
                  className="mt-1 min-h-[70px]"
                  value={donationSupportBand.text ?? ""}
                  disabled={saving}
                  onChange={(e) => updateDonationSupportBand({ text: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setP({ ...p, hmCorporateDonation: DEFAULT_DONATION_SETTINGS })}>
                Varsayılan bağış ayarına dön
              </Button>
              <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={saving} onClick={saveCorporateDonation}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Bağış ayarlarını kaydet
              </Button>
            </div>
          </div>

          <div id="hm-footer-settings" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-3">
            <Label className="font-semibold text-slate-900">Alt bilgi — Site hakkında</Label>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Vitrin altbilgisinde &quot;Site hakkında&quot; bölümünde gösterilir. Kısa metin veya sınırlı HTML (bağlantı, kalın vb.).
            </p>
            <Textarea
              className="min-h-[100px] text-sm font-mono"
              placeholder="Örn. &lt;p&gt;…&lt;/p&gt;"
              value={p.hmFooterAboutHtml ?? ""}
              disabled={saving}
              onChange={(e) => setP({ ...p, hmFooterAboutHtml: e.target.value })}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2 bg-slate-900 text-white"
              disabled={saving}
              onClick={() => void commit({ ...p, hmFooterAboutHtml: (p.hmFooterAboutHtml ?? "").trim() || null })}
            >
              Alt bilgiyi kaydet
            </Button>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-3">
            <Label className="font-semibold text-slate-900">Alt şerit — sosyal medya ve WhatsApp ihbar</Label>
            <p className="text-xs text-slate-500">
              Tam bağlantı adresleri (https://…). İletişim telefonu ve e-posta site kaydında tutulur; burada yalnızca alt
              şeritte gösterilecek sosyal bağlantılar ve ihbar hattı.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Instagram</Label>
                <Input
                  className="mt-1"
                  placeholder="https://instagram.com/…"
                  value={p.hmFooterSocial?.instagramUrl ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    setP({
                      ...p,
                      hmFooterSocial: { ...(p.hmFooterSocial ?? {}), instagramUrl: e.target.value.trim() || null },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Facebook</Label>
                <Input
                  className="mt-1"
                  placeholder="https://facebook.com/…"
                  value={p.hmFooterSocial?.facebookUrl ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    setP({
                      ...p,
                      hmFooterSocial: { ...(p.hmFooterSocial ?? {}), facebookUrl: e.target.value.trim() || null },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">X (Twitter)</Label>
                <Input
                  className="mt-1"
                  placeholder="https://x.com/…"
                  value={p.hmFooterSocial?.xUrl ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    setP({
                      ...p,
                      hmFooterSocial: { ...(p.hmFooterSocial ?? {}), xUrl: e.target.value.trim() || null },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">YouTube</Label>
                <Input
                  className="mt-1"
                  placeholder="https://youtube.com/…"
                  value={p.hmFooterSocial?.youtubeUrl ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    setP({
                      ...p,
                      hmFooterSocial: { ...(p.hmFooterSocial ?? {}), youtubeUrl: e.target.value.trim() || null },
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">WhatsApp ihbar (ülke kodu ile, yalnızca rakam)</Label>
              <Input
                className="mt-1 max-w-xs font-mono text-sm"
                placeholder="905551112233"
                inputMode="numeric"
                value={p.hmFooterWhatsappIhbar ?? ""}
                disabled={saving}
                onChange={(e) =>
                  setP({ ...p, hmFooterWhatsappIhbar: e.target.value.replace(/\D/g, "").trim() || null })
                }
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-slate-900 text-white"
              disabled={saving}
              onClick={() => {
                const soc = p.hmFooterSocial ?? {};
                const nextSoc: HmFooterSocialLinks = {};
                const ig = (soc.instagramUrl ?? "").trim();
                const fb = (soc.facebookUrl ?? "").trim();
                const xu = (soc.xUrl ?? "").trim();
                const yt = (soc.youtubeUrl ?? "").trim();
                if (ig) nextSoc.instagramUrl = ig;
                if (fb) nextSoc.facebookUrl = fb;
                if (xu) nextSoc.xUrl = xu;
                if (yt) nextSoc.youtubeUrl = yt;
                const hasAny = Object.keys(nextSoc).length > 0;
                const wa = (p.hmFooterWhatsappIhbar ?? "").replace(/\D/g, "").trim() || null;
                void commit({
                  ...p,
                  hmFooterSocial: hasAny ? nextSoc : null,
                  hmFooterWhatsappIhbar: wa,
                });
              }}
            >
              Sosyal ve WhatsApp kaydet
            </Button>
          </div>

          <div id="hm-vitrin-theme-controls" className="scroll-mt-32 rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-3">
            <Label className="font-semibold text-slate-900">Vitrin teması</Label>
            <p className="text-xs text-slate-500">
              <strong>HABER</strong> mevcut haber sitesi temasıdır. <strong>KURUMSAL</strong> aynı haber özelliklerini
              premium kurumsal düzenle sunar. Renk paleti aşağıdaki Kırmızı / Gold / Mavi seçenekleriyle tüm siteye yayılır.
            </p>
            <RadioGroup
              value={p.hmVitrinTheme === "corporate" ? "corporate" : "news"}
              onValueChange={(val) => {
                const v = val as Extract<HmVitrinThemeId, "news" | "corporate">;
                void commit({ hmVitrinTheme: v });
              }}
              disabled={saving}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="news" id="hm-theme-news" />
                <Label htmlFor="hm-theme-news" className="flex cursor-pointer items-center gap-2 font-normal text-sm">
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-slate-300 shadow-sm"
                    style={{ backgroundColor: "#e61e25" }}
                    aria-hidden
                  />
                  HABER (mevcut haber vitrini)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="corporate" id="hm-theme-corporate" />
                <Label htmlFor="hm-theme-corporate" className="flex cursor-pointer items-center gap-2 font-normal text-sm">
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-slate-300 shadow-sm"
                    style={{ backgroundColor: HM_VITRIN_THEME.corporate.accent }}
                    aria-hidden
                  />
                  KURUMSAL (premium kurumsal vitrin)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-3">
            <Label className="font-semibold text-slate-900">Site genişliği (haber + kurumsal)</Label>
            <p className="text-xs text-slate-500">
              Haber ve kurumsal vitrinde gövde, özel sayfalar ve üst şeritlerin genişliğini seçin. Ortalı seçenek içeriği
              1280px ile ortalar; tam genişlik kenardan kenara görünümü korur.
            </p>
            <RadioGroup
              value={corporateLayoutWidth}
              onValueChange={(val) => {
                const width: HmCorporateLayoutWidth = val === "contained" ? "contained" : "full";
                void commit({ ...p, hmCorporateLayoutWidth: width });
              }}
              disabled={saving}
              className="grid gap-2 sm:grid-cols-2"
            >
              <div className="flex items-start gap-2 rounded-lg border border-white bg-white p-3 shadow-sm">
                <RadioGroupItem value="full" id="hm-corporate-width-full" className="mt-1" />
                <Label htmlFor="hm-corporate-width-full" className="cursor-pointer space-y-1 font-normal">
                  <span className="block text-sm font-bold text-slate-900">Tam genişlik</span>
                  <span className="block text-xs leading-5 text-slate-500">Header, slider, gövde ve footer kenardan kenara yayılır.</span>
                </Label>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-white bg-white p-3 shadow-sm">
                <RadioGroupItem value="contained" id="hm-corporate-width-contained" className="mt-1" />
                <Label htmlFor="hm-corporate-width-contained" className="cursor-pointer space-y-1 font-normal">
                  <span className="block text-sm font-bold text-slate-900">Ortalı</span>
                  <span className="block text-xs leading-5 text-slate-500">İçerik max-width ile ortalanır, büyük görseller fazla esnemez.</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <Label className="font-semibold text-slate-900">Site vurgu renkleri</Label>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Manşet, şerit, kartlar, footer ve genel vurgular için ana renk ve uyumlu 2. renk. Kırmızı, Gold veya Mavi
              seçimi tüm HABER ve KURUMSAL vitrinde premium palet olarak uygulanır.
            </p>
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              {HM_PREMIUM_PALETTES.map((palette) => {
                const active = (p.hmColorPalette ?? resolveHmColorPalette(null, p.hmPrimaryColor, p.hmVitrinTheme)) === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    disabled={saving}
                    onClick={() => applyPremiumPalette(palette.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-black">
                      <span
                        className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: palette.primaryHex }}
                        aria-hidden
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-slate-200 shadow-sm"
                        style={{ backgroundColor: palette.secondaryHex }}
                        aria-hidden
                      />
                      {palette.label}
                    </span>
                    <span className={`mt-0.5 block text-[11px] ${active ? "text-white/65" : "text-slate-500"}`}>
                      {palette.description} · {palette.primaryHex} + {palette.secondaryHex}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Ana vurgu rengi</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    aria-label="Ana vurgu rengi"
                    className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0.5 shrink-0"
                    value={colorPickerValue(p.hmPrimaryColor, accentFallback)}
                    disabled={saving}
                    onChange={(e) =>
                      void commit({
                        ...p,
                        hmPrimaryColor: e.target.value,
                        hmColorPalette: resolveHmColorPalette(null, e.target.value, p.hmVitrinTheme),
                      })
                    }
                  />
                  <Input
                    className="max-w-[200px]"
                    placeholder="#e61e25"
                    value={p.hmPrimaryColor ?? ""}
                    disabled={saving}
                    onChange={(e) => {
                      const next = e.target.value.trim();
                      void commit({
                        ...p,
                        hmPrimaryColor: next || null,
                        hmColorPalette: next ? resolveHmColorPalette(null, next, p.hmVitrinTheme) : null,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Uyumlu 2. renk</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    aria-label="Uyumlu 2. renk"
                    className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0.5 shrink-0"
                    value={colorPickerValue(p.hmSecondaryColor, secondaryFallback)}
                    disabled={saving}
                    onChange={(e) =>
                      void commit({
                        ...p,
                        hmSecondaryColor: e.target.value,
                      })
                    }
                  />
                  <Input
                    className="max-w-[200px]"
                    placeholder={secondaryFallback}
                    value={p.hmSecondaryColor ?? ""}
                    disabled={saving}
                    onChange={(e) => {
                      const next = e.target.value.trim();
                      void commit({
                        ...p,
                        hmSecondaryColor: next || null,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <Label className="font-semibold text-slate-900">Çiçek teması renklerini uygula</Label>
              <p className="text-xs text-slate-500">
                Vitrin temalarının çiçek adlarıyla eşleşen ana + uyumlu 2. renk paletini site vurgusu ve kategori
                renklerine tek tıkla uygular. Seçimler{" "}
                <code className="rounded bg-white px-1 text-[11px]">hmPrimaryColor</code>,{" "}
                <code className="rounded bg-white px-1 text-[11px]">hmSecondaryColor</code> ve{" "}
                <code className="rounded bg-white px-1 text-[11px]">hmCategoryColors</code> alanlarına kaydedilir.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => applyFlowerThemeColors(vitrinFlowerThemeKey)}
                >
                  Mevcut vitrin temasından uygula
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {HM_FLOWER_THEME_EDITOR_OPTIONS.map((option) => {
                  const preset = hmFlowerThemeColorPreset(option.themeKey);
                  const active = activeFlowerThemeKey === option.themeKey;
                  return (
                    <button
                      key={option.themeKey}
                      type="button"
                      disabled={saving}
                      onClick={() => applyFlowerThemeColors(option.themeKey)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-black">
                        <span className="inline-flex items-center gap-1" aria-hidden>
                          <span
                            className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                            style={{ backgroundColor: preset.hmPrimaryColor }}
                            title="Ana renk"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-slate-200 shadow-sm"
                            style={{ backgroundColor: preset.hmSecondaryColor }}
                            title="2. renk"
                          />
                        </span>
                        {option.flower}
                      </span>
                      <span className={`mt-0.5 block text-[11px] ${active ? "text-white/65" : "text-slate-500"}`}>
                        {option.description}
                        <span className="block font-mono text-[10px] opacity-90">
                          Ana {preset.hmPrimaryColor} · 2. {preset.hmSecondaryColor}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <Label className="font-semibold text-slate-900">Kategori renkleri</Label>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Haber etiketleri, kategori şeridi ve vitrin bloklarında kullanılır. Boş bırakılan satırda site varsayılanı geçerlidir.
            </p>
            <div className="space-y-3">
              {HM_CATEGORY_COLOR_ROWS.map((row) => {
                const stored = p.hmCategoryColors?.[row.slug];
                const hexStored = (stored ?? "").trim();
                const hex =
                  Object.prototype.hasOwnProperty.call(catHexDraft, row.slug)
                    ? catHexDraft[row.slug]!
                    : hexStored;
                const pickerVal = colorPickerValue(hexStored || undefined, row.defaultHex);
                return (
                  <div key={row.slug} className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="w-[100px] shrink-0 text-sm text-slate-700">{row.label}</span>
                    <input
                      type="color"
                      aria-label={`${row.label} rengi`}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5 shrink-0"
                      value={pickerVal}
                      disabled={saving}
                      onChange={(e) => setHmCategoryColor(row.slug, e.target.value)}
                    />
                    <Input
                      className="max-w-[160px] h-9 text-sm"
                      placeholder={row.defaultHex}
                      value={hex}
                      disabled={saving}
                      onChange={(e) => onCategoryHexInput(row.slug, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      disabled={saving}
                      onClick={() => setHmCategoryColor(row.slug, "")}
                    >
                      Varsayılan
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={saving}
              onClick={() => void commit({ ...p, hmCategoryColors: null })}
            >
              Tüm kategori renklerini sıfırla
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <div className="min-w-0">
              <Label htmlFor="hm-show-nav" className="font-semibold text-slate-900 cursor-pointer">
                Üstte Yekpare menüsü
              </Label>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Açıkken ziyaretçiler Haberler, Yektube, Keşfet vb. ana portal çubuğunu görür; kapalıyken yalnızca haber
                merkezi vitrininiz görünür.
              </p>
            </div>
            <Switch
              id="hm-show-nav"
              disabled={saving}
              checked={p.showPlatformNav === true}
              onCheckedChange={(c) => void commit({ ...p, showPlatformNav: !!c })}
            />
          </div>

          <div id="hm-wordpress-tools" className="scroll-mt-32 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-900">WordPress araçları</p>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                WordPress sitenizden içerik aktarın veya hazır şablon sayfalarını haber merkezinize uyarlayın. Bu
                işlemler yalnızca bu site için geçerlidir.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/editor/wordpress-ice-aktar"
                className="group flex items-start gap-3 rounded-lg border border-white bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FileUp className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-800">
                    WordPress içe aktar
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Yazılar, kategoriler ve medyayı WordPress&apos;ten taşıyın.
                  </span>
                </span>
              </Link>
              <Link
                to="/editor/wordpress-template-sayfalari"
                className="group flex items-start gap-3 rounded-lg border border-white bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FileCode2 className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-800">
                    WP template sayfaları
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Hazır WordPress şablon sayfalarını düzenleyin ve yayınlayın.
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-4">
          <div>
            <Label className="font-semibold text-slate-900">Yekpare haber havuzu</Label>
            <p className="text-xs text-slate-500 mt-1">
              Yekpare kategorileri açık olsa bile havuz alışverişini ayrı ayrı kapatabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-violet-100 bg-white px-3 py-3">
            <div>
              <Label htmlFor="hm-yekpare-pool-receive" className="font-semibold text-slate-800">
                Yekpare Haber Havuzu — haber alımı
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">Kapalıyken merkez havuzdan haber çekilmez.</p>
            </div>
            <Switch
              id="hm-yekpare-pool-receive"
              checked={p.hmYekparePoolReceiveEnabled !== false}
              disabled={saving}
              onCheckedChange={(checked) => void commit({ ...p, hmYekparePoolReceiveEnabled: checked ? true : false })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-violet-100 bg-white px-3 py-3">
            <div>
              <Label htmlFor="hm-yekpare-pool-send" className="font-semibold text-slate-800">
                Haberleri havuza gönder
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">Kapalıyken site haberleriniz merkez havuza senkron edilmez.</p>
            </div>
            <Switch
              id="hm-yekpare-pool-send"
              checked={p.hmYekparePoolSendEnabled !== false}
              disabled={saving}
              onCheckedChange={(checked) => void commit({ ...p, hmYekparePoolSendEnabled: checked ? true : false })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
          <p className="text-sm font-bold text-slate-900">Yekpare komisyonu</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            Başarılı abonelik ödemelerinde haber merkezi payı:{" "}
            <strong className="text-amber-900">%{HM_SUBSCRIPTION_REVENUE_SHARE_PERCENT}</strong>. Bu oran Yekpare üzerinden
            tahsil edilen abonelik tutarı üzerinden hesaplanır; tahsilat ve hakediş takvimi Yekpare operasyonuna bağlıdır.
          </p>
        </div>
          </div>
        </TabsContent>

        <TabsContent value="sayfalar" forceMount className="mt-0 data-[state=inactive]:hidden">
          <EditorSayfalarContent className="w-full max-w-5xl" />
        </TabsContent>
      </Tabs>
    </EditorLayout>
  );
}
