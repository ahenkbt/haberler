import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, Globe2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { LlmProviderKeysPanel, type LlmProviderSummaryRow } from "@/components/LlmProviderKeysPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  adminFetchErrorHint,
  apiFetch,
  apiUrl,
  ensureAdminPanelBootstrap,
  wakeAdminApiContainer,
} from "@/lib/apiBase";
import { suggestHmPlatformSubdomains } from "@/lib/hmPlatformApex";
import { hmPublicHomeHref } from "@/lib/hmPublicSiteUrl";
import {
  HM_CORPORATE_CREATE_THEMES,
  HM_NEWS_CREATE_THEMES,
  HM_NEW_SITE_COLOR_PALETTES,
  HM_NEW_SITE_PORTAL_THEME,
} from "@/lib/hmNewSiteTheme";
import { isHmPhpThemeSite, isHmPublicSuspended, parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";

type HmEditor = {
  id: number;
  email: string;
  displayName: string | null;
  isActive: boolean;
  createdAt?: string;
};

type SeoVerification = {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
};

export type HmSiteKind = "news" | "corporate";
export type SiteYonelim = "sag" | "sol" | "karma";

const YONELIM_OPTIONS: { id: SiteYonelim; label: string }[] = [
  { id: "sag", label: "Sağ" },
  { id: "sol", label: "Sol" },
  { id: "karma", label: "Karma" },
];

function normalizeYonelim(raw: unknown): SiteYonelim {
  const v = String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  if (v === "sag") return "sag";
  if (v === "sol") return "sol";
  return "karma";
}

function YonelimSecici({
  value,
  disabled,
  onChange,
}: {
  value: SiteYonelim | null;
  disabled?: boolean;
  onChange: (next: SiteYonelim) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Site yönelimi"
      title="Sağ: ılımlı kaynaklar, muhalif yok. Sol: muhalif kaynaklar. Karma: orta. Yalnız yönetim panelinde görünür."
      className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5"
    >
      {YONELIM_OPTIONS.map((opt) => {
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => {
              if (!on) onChange(opt.id);
            }}
            className={
              on
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                : "rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

type DomainCheckResult = {
  host: string;
  ok: boolean;
  status: number;
  ssl: boolean;
  sitemap?: string | null;
  canonicalOk?: boolean;
  error?: string;
  ms?: number;
};

type HmSiteRow = {
  id: number;
  slug: string;
  /** API: layout_json.hmSiteKind (kilitli) veya kurumsal tema/slug çıkarımı */
  siteKind?: HmSiteKind;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName: string;
  description?: string | null;
  active: boolean;
  hasOwnLlmKeys?: boolean;
  ownLlmProviders?: string[];
  layoutJson?: string | null;
  hybridRssEnabled?: boolean;
  publicSuspended?: boolean;
  /** sag | sol | karma. Yalnız yönetim listesinde. Varsayılan karma. */
  yonelim?: SiteYonelim | string | null;
  /** true: yönelim açıkça atanmış. Mevcut siteler false (süzgeç yok). */
  yonelimAktif?: boolean;
  /** layout_json phpTheme / frontend — Hostinger PHP şablon */
  phpTheme?: boolean;
  contact?: { phone?: string; email?: string; address?: string; notes?: string };
  seoVerification?: SeoVerification | null;
  editors?: HmEditor[];
  createdAt?: string;
  /** Varsa AI editör kaydı okundu. null = kayıt yok. Alan yoksa liste okunamadı. */
  aiEditor?: {
    enabled: boolean;
    conceptPrompt: string | null;
    contentMode: string | null;
    autoCreated: boolean;
  } | null;
};

type SiteForm = {
  slug: string;
  displayName: string;
  description: string;
  domain: string;
  domain2: string;
  domain3: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  yandexVerification: string;
  editorDisplayName: string;
  editorEmail: string;
  editorPassword: string;
  active: boolean;
  hybridRssEnabled: boolean;
  /** Yeni sitelerde varsayılan açık — Hostinger PHP (Yenişafak) şablonu */
  phpTheme: boolean;
  /** Haber: kendi domainleri (en fazla 2; ilki canonical) */
  customDomain: string;
  customDomain2: string;
  /** Haber: <slug>.gundemi.org / <slug>.fix.tc açık mı + mevcut host (slugdan farklı olabilir) */
  gundemiAlias: boolean;
  gundemiHost: string;
  fixAlias: boolean;
  fixHost: string;
  /** Kurumsal: VKD Tema (corporate) | VATAN — düzenleme formu. Oluşturmada vitrinTheme kullanılır. */
  corporateTheme: "corporate" | "vatan";
  /** Yeni site teması. Varsayılan Portal. Yalnız oluşturmada sunucuya gider. */
  vitrinTheme: string;
  /** Haber (yalnız oluşturma): konsept site — Süper Lig/burç vb. genel kutular olmaz; spor konseptinde Süper Lig kalır */
  conceptSite: boolean;
  conceptTopic: string;
  /** Konsept site paleti. `ozel` = conceptPrimary. */
  conceptPalette: string;
  conceptPrimary: string;
  /** Yeni sitede varsayılan açık. Kayıt yoksa düzenlemede kapalı (mevcut siteye satır açılmaz). */
  aiEditorEnabled: boolean;
  /** Manşet seçimi talimatı. AI haberi yeniden yazmaz. */
  aiConceptPrompt: string;
  /** null = seçilmedi (yönelim atanmaz, süzgeç yok). */
  yonelim: SiteYonelim | null;
};

const CONCEPT_TOPICS: { value: string; label: string }[] = [
  { value: "spor", label: "Spor (Süper Lig + branşlar)" },
  { value: "savunma", label: "Savunma" },
  { value: "sehit-gazi", label: "Şehit / Gazi" },
  { value: "cevre", label: "Çevre / Doğa" },
  { value: "saglik", label: "Sağlık" },
  { value: "ekonomi", label: "Ekonomi" },
  { value: "teknoloji", label: "Teknoloji" },
  { value: "yerel", label: "Yerel" },
  { value: "bolge", label: "Bölge (il / bölge gündemi)" },
  { value: "diger", label: "Diğer konsept" },
];

const emptyForm: SiteForm = {
  slug: "",
  displayName: "",
  description: "",
  domain: "",
  domain2: "",
  domain3: "",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
  googleSiteVerification: "",
  bingSiteVerification: "",
  yandexVerification: "",
  editorDisplayName: "",
  editorEmail: "",
  editorPassword: "",
  active: true,
  hybridRssEnabled: true,
  phpTheme: true,
  customDomain: "",
  customDomain2: "",
  gundemiAlias: true,
  gundemiHost: "",
  fixAlias: true,
  fixHost: "",
  corporateTheme: "corporate",
  vitrinTheme: HM_NEW_SITE_PORTAL_THEME,
  conceptSite: false,
  conceptTopic: "diger",
  conceptPalette: "portal",
  conceptPrimary: "#b00020",
  aiEditorEnabled: true,
  aiConceptPrompt: "",
  yonelim: null,
};

const PLATFORM_ZONES = ["gundemi.org", "fix.tc"] as const;

function bareHost(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** <label>.gundemi.org / <label>.fix.tc — platform adresi (apex gerçek sitedir). */
function platformZoneOf(raw: string | null | undefined): (typeof PLATFORM_ZONES)[number] | null {
  const h = bareHost(raw);
  for (const z of PLATFORM_ZONES) {
    if (h.endsWith(`.${z}`) && /^[a-z0-9-]+$/.test(h.slice(0, -(z.length + 1)))) return z;
  }
  return null;
}

/** API eskiyse (siteKind yok) sunucudaki kuralın aynısı. */
function inferSiteKind(site: HmSiteRow): HmSiteKind {
  if (site.siteKind === "news" || site.siteKind === "corporate") return site.siteKind;
  let layout: Record<string, unknown> = {};
  try {
    layout = site.layoutJson ? (JSON.parse(site.layoutJson) as Record<string, unknown>) : {};
  } catch {
    layout = {};
  }
  const k = String(layout.hmSiteKind ?? "").toLowerCase();
  if (k === "news" || k === "corporate") return k;
  const theme = String(layout.hmVitrinTheme ?? "").toLowerCase();
  if (["corporate", "kurumsal", "vatan"].includes(theme)) return "corporate";
  const slug = String(site.slug ?? "").toLowerCase();
  if (["vkd", "vatankahramanlari", "trafik", "tr", "tukav", "turkatavakfi"].includes(slug)) return "corporate";
  if (slug.includes("vatankahramanlari") || slug.includes("trafikdernegi")) return "corporate";
  const domains = [site.domain, site.domain2, site.domain3].map(bareHost);
  if (domains.some((d) => /(^|\.)(tukav\.org|vatankahramanlari\.org(\.tr)?|trafik\.gd|tgd\.tc|trafikdernegi\.com)$/.test(d))) {
    return "corporate";
  }
  return "news";
}

/** Haber formu → domain/domain2/domain3: kendi domainleri önce (canonical), sonra gundemi.org, sonra fix.tc. */
function composeNewsDomains(form: SiteForm): { list: string[]; error?: string } {
  const aliases = suggestHmPlatformSubdomains(form.slug);
  const list: string[] = [];
  for (const raw of [form.customDomain, form.customDomain2]) {
    const h = bareHost(raw);
    if (!h) continue;
    if (platformZoneOf(h)) {
      return { list, error: `${h} platform adresidir; aşağıdaki gundemi.org / fix.tc anahtarlarını kullanın.` };
    }
    if (!list.includes(h)) list.push(h);
  }
  if (form.gundemiAlias) list.push(bareHost(form.gundemiHost) || aliases.gundemiOrg);
  if (form.fixAlias) list.push(bareHost(form.fixHost) || aliases.fixTc);
  if (list.length === 0) return { list, error: "En az bir adres açık kalmalı (gundemi.org, fix.tc veya kendi domaini)." };
  if (list.length > 3) return { list, error: "En fazla 3 adres: kendi domaini + gundemi.org + fix.tc." };
  return { list };
}

const MULTI_LABEL_SUFFIXES = new Set(["com.tr", "net.tr", "org.tr", "gov.tr", "edu.tr", "k12.tr", "gen.tr", "bel.tr", "av.tr", "web.tr", "biz.tr", "info.tr", "tv.tr", "dr.tr", "bbs.tr", "name.tr", "tel.tr", "pol.tr", "tsk.tr", "kep.tr", "co.uk", "org.uk", "com.cy", "net.cy", "org.cy", "com.de"]);

/** Varsayılan editör (sunucu ile aynı kural): alt alan adı → <alt>@<üst>, normal domain → bilgi@<domain>; şifre = kullanıcı adı. */
function defaultEditorEmailForHost(raw: string | null | undefined): string | null {
  const h = bareHost(raw ?? "");
  if (!h) return null;
  const labels = h.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const reg = MULTI_LABEL_SUFFIXES.has(labels.slice(-2).join(".")) ? 3 : 2;
  if (labels.length > reg) return `${labels.slice(0, -reg).join(".")}@${labels.slice(-reg).join(".")}`;
  if (labels.length === reg) return `bilgi@${h}`;
  return null;
}

async function fetchHmSites(kind: HmSiteKind): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  let r: Response;
  try {
    r = await apiFetch(apiUrl(`/api/hm/sites?kind=${kind}`), { cache: "no-store" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Haber siteleri yüklenemedi";
    throw new Error(msg + adminFetchErrorHint(msg));
  }
  const text = await r.text();
  let j: { items?: HmSiteRow[]; error?: string } = {};
  if (text) {
    try {
      j = JSON.parse(text) as { items?: HmSiteRow[]; error?: string };
    } catch {
      throw new Error(
        (r.ok ? "Sunucu yanıtı okunamadı" : `HTTP ${r.status}`) + adminFetchErrorHint(text),
      );
    }
  }
  if (!r.ok) {
    const errMsg = j.error || text || "Haber siteleri yüklenemedi";
    throw new Error(errMsg + adminFetchErrorHint(errMsg));
  }
  const items = Array.isArray(j.items)
    ? j.items.map((site) => {
        const layout = parseNewsSiteLayoutFromJson(site.layoutJson ?? null, site.slug ?? null);
        return {
          ...site,
          hybridRssEnabled: layout.hybridRssEnabled === true,
          publicSuspended: isHmPublicSuspended(layout),
          phpTheme: isHmPhpThemeSite(layout),
          yonelim: normalizeYonelim(site.yonelim),
          yonelimAktif: site.yonelimAktif === true,
        };
      })
    : [];
  // Sunucu ?kind ile süzer; eski API için istemcide de süz (haber ↔ kurumsal karışmasın).
  return { items: items.filter((site) => inferSiteKind(site) === kind).sort((a, b) => a.id - b.id) };
}

/** Form için birincil editör — önce aktif; yoksa pasif kayıt (güncelleme ile yeniden aktif edilir). */
function primaryHmSiteEditor(site: HmSiteRow | undefined): HmEditor | undefined {
  if (!site) return undefined;
  const editors = site.editors ?? [];
  if (editors.length === 0) return undefined;
  const contactEmail = site.contact?.email?.trim().toLowerCase();
  if (contactEmail) {
    const byContactActive = editors.find(
      (e) => e.isActive !== false && e.email.trim().toLowerCase() === contactEmail,
    );
    if (byContactActive) return byContactActive;
    const byContactAny = editors.find((e) => e.email.trim().toLowerCase() === contactEmail);
    if (byContactAny) return byContactAny;
  }
  return editors.find((e) => e.isActive !== false) ?? editors[0];
}

function primaryEditorIsPassive(site: HmSiteRow | undefined): boolean {
  const editor = primaryHmSiteEditor(site);
  return Boolean(editor && editor.isActive === false);
}

function editorSummary(site: HmSiteRow): string {
  const editors = site.editors ?? [];
  if (!editors.length) return "";
  return editors
    .map((e) => {
      const label = e.displayName?.trim() || e.email;
      const inactive = e.isActive === false ? " (pasif)" : "";
      return `${label} <${e.email}>${inactive}`;
    })
    .join(" · ");
}

function formFromSite(site: HmSiteRow): SiteForm {
  const editor = primaryHmSiteEditor(site);
  const triad = [site.domain, site.domain2, site.domain3].map(bareHost).filter(Boolean);
  const customs = triad.filter((h) => !platformZoneOf(h));
  const gundemiHost = triad.find((h) => platformZoneOf(h) === "gundemi.org") ?? "";
  const fixHost = triad.find((h) => platformZoneOf(h) === "fix.tc") ?? "";
  let corporateTheme: "corporate" | "vatan" = "corporate";
  let conceptSite = false;
  let conceptTopic = "diger";
  try {
    const l = site.layoutJson ? (JSON.parse(site.layoutJson) as Record<string, unknown>) : {};
    if (String(l.hmVitrinTheme ?? "").toLowerCase() === "vatan") corporateTheme = "vatan";
    conceptSite = l.hmConceptSite === true;
    if (typeof l.hmConceptTopic === "string" && l.hmConceptTopic) conceptTopic = l.hmConceptTopic;
  } catch {
    /* ignore */
  }
  return {
    customDomain: customs[0] ?? "",
    customDomain2: customs[1] ?? "",
    gundemiAlias: Boolean(gundemiHost),
    gundemiHost,
    fixAlias: Boolean(fixHost),
    fixHost,
    corporateTheme,
    vitrinTheme: HM_NEW_SITE_PORTAL_THEME,
    conceptSite,
    conceptTopic,
    conceptPalette: "portal",
    conceptPrimary: "#b00020",
    aiEditorEnabled: site.aiEditor?.enabled === true,
    aiConceptPrompt: site.aiEditor?.conceptPrompt ?? "",
    slug: site.slug ?? "",
    displayName: site.displayName ?? "",
    description: site.description ?? "",
    domain: site.domain ?? "",
    domain2: site.domain2 ?? "",
    domain3: site.domain3 ?? "",
    contactPhone: site.contact?.phone ?? "",
    contactEmail: site.contact?.email ?? "",
    contactAddress: site.contact?.address ?? "",
    googleSiteVerification: site.seoVerification?.googleSiteVerification ?? "",
    bingSiteVerification: site.seoVerification?.bingSiteVerification ?? "",
    yandexVerification: site.seoVerification?.yandexVerification ?? "",
    editorDisplayName: editor?.displayName ?? "",
    editorEmail: editor?.email ?? "",
    editorPassword: "",
    active: site.active !== false,
    hybridRssEnabled: site.hybridRssEnabled === true,
    phpTheme: site.phpTheme === true,
    yonelim: site.yonelimAktif === true ? normalizeYonelim(site.yonelim) : null,
  };
}

function payloadFromForm(
  form: SiteForm,
  editorId?: number,
  opts?: { includePhpThemeFlag?: boolean; kind?: HmSiteKind; isCreate?: boolean; newsDomains?: string[]; includeAiEditor?: boolean },
) {
  const kind = opts?.kind ?? "news";
  const domains = kind === "news" && opts?.newsDomains ? opts.newsDomains : [form.domain, form.domain2, form.domain3];
  const body: Record<string, unknown> = {
    slug: form.slug,
    displayName: form.displayName,
    description: form.description || null,
    domain: domains[0] || null,
    domain2: domains[1] || null,
    domain3: domains[2] || null,
    contact: {
      phone: form.contactPhone,
      email: form.contactEmail,
      address: form.contactAddress,
    },
    seoVerification: {
      googleSiteVerification: form.googleSiteVerification,
      bingSiteVerification: form.bingSiteVerification,
      yandexVerification: form.yandexVerification,
    },
    active: form.active,
  };
  if (kind === "news" && form.yonelim) body.yonelim = form.yonelim;
  // Site türü sunucuda kilitli: haber = PHP (Yenişafak), kurumsal = VKD/VATAN. Tür yalnızca oluşturmada yazılır.
  if (opts?.isCreate) {
    body.siteKind = kind;
    const theme = kind === "news" && form.conceptSite ? HM_NEW_SITE_PORTAL_THEME : form.vitrinTheme || HM_NEW_SITE_PORTAL_THEME;
    body.vitrinTheme = theme;
    if (kind === "news") {
      body.platformAliases = { gundemi: form.gundemiAlias, fixTc: form.fixAlias };
      body.conceptSite = form.conceptSite;
      if (form.conceptSite) {
        body.conceptTopic = form.conceptTopic || "diger";
        body.conceptPalette = form.conceptPalette || "portal";
        body.conceptPrimary = form.conceptPrimary || "";
      }
    } else if (theme === "vatan" || theme === "corporate") {
      body.corporateTheme = theme;
    }
  }
  if (opts?.includePhpThemeFlag && kind === "news") {
    body.layoutJson = { phpTheme: true, frontend: "php" };
  }
  if (kind === "news" && (opts?.isCreate || opts?.includeAiEditor)) {
    body.aiEditorEnabled = form.aiEditorEnabled;
    body.aiConceptPrompt = form.aiConceptPrompt;
  }
  if (editorId) body.editorId = editorId;
  if (form.editorDisplayName) body.editorDisplayName = form.editorDisplayName;
  if (form.editorEmail) body.editorEmail = form.editorEmail;
  if (form.editorPassword) body.editorPassword = form.editorPassword;
  return body;
}

function normalizeSlugInput(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function HaberSiteleri({ kind = "news" }: { kind?: HmSiteKind } = {}) {
  const isNews = kind === "news";
  const noun = isNews ? "Haber sitesi" : "Kurumsal site";
  const [llmSummary, setLlmSummary] = useState<LlmProviderSummaryRow[] | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suspendingId, setSuspendingId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [domainChecks, setDomainChecks] = useState<Record<number, DomainCheckResult[]>>({});
  const [yonelimSavingId, setYonelimSavingId] = useState<number | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/hm/sites", "admin-panel", kind],
    queryFn: () => fetchHmSites(kind),
    retry: 1,
    retryDelay: 1500,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const sites = data?.items ?? [];

  const platformSubdomains = useMemo(
    () => suggestHmPlatformSubdomains(form.slug),
    [form.slug],
  );

  /** Aynı e-posta birden fazla sitede aktif — VKD+KH karışıklığı uyarısı */
  const duplicateEditorEmails = useMemo(() => {
    const byEmail = new Map<string, Array<{ siteId: number; siteName: string }>>();
    for (const site of sites) {
      for (const ed of site.editors ?? []) {
        if (ed.isActive === false) continue;
        const em = ed.email.trim().toLowerCase();
        if (!em.includes("@") || em === "sehirgazetesiankara@gmail.com") continue;
        const arr = byEmail.get(em) ?? [];
        arr.push({ siteId: site.id, siteName: site.displayName || site.slug });
        byEmail.set(em, arr);
      }
    }
    return [...byEmail.entries()].filter(([, rows]) => rows.length > 1);
  }, [sites]);

  const filteredSites = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const list = !q
      ? sites
      : sites.filter((s) => {
          if (String(s.id) === q || `#${s.id}` === q) return true;
          return [s.displayName, s.slug, s.domain, s.domain2, s.domain3, String(s.id)]
            .filter(Boolean)
            .some((v) => String(v).toLocaleLowerCase("tr-TR").includes(q));
        });
    return [...list].sort((a, b) => a.id - b.id);
  }, [query, sites]);

  function update<K extends keyof SiteForm>(key: K, value: SiteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(site: HmSiteRow) {
    setEditingId(site.id);
    setForm(formFromSite(site));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const autoEditorEmail = defaultEditorEmailForHost(
    isNews ? composeNewsDomains(form).list[0] : form.domain,
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function renderCreateThemeField() {
    if (editingId) return null;
    const options = isNews ? HM_NEWS_CREATE_THEMES : HM_CORPORATE_CREATE_THEMES;
    const lockedPortal = isNews && form.conceptSite;
    const selected = lockedPortal ? HM_NEW_SITE_PORTAL_THEME : form.vitrinTheme || HM_NEW_SITE_PORTAL_THEME;
    const activePalette = HM_NEW_SITE_COLOR_PALETTES.find((p) => p.id === form.conceptPalette);
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className={lockedPortal ? "grid gap-3 sm:grid-cols-2" : ""}>
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-80"
              value={selected}
              disabled={lockedPortal}
              onChange={(e) => update("vitrinTheme", e.target.value)}
            >
              {options.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {lockedPortal
                ? "Konsept site Portal temasıyla açılır. Yandaki renk bu temaya yazılır."
                : "Varsayılan Portal. İsterseniz değiştirin. Kayıtlı sitelerin teması değişmez."}
            </p>
          </div>
          {lockedPortal ? (
            <div className="space-y-1.5">
              <Label>Renk</Label>
              <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Renk paleti">
                {HM_NEW_SITE_COLOR_PALETTES.map((palette) => {
                  const active = form.conceptPalette === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      title={`${palette.label} ${palette.primary}`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          conceptPalette: palette.id,
                          conceptPrimary: palette.primary,
                        }))
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: palette.primary }} />
                      {palette.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Özel ana renk"
                  className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.conceptPrimary) ? form.conceptPrimary : activePalette?.primary ?? "#b00020"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      conceptPalette: "ozel",
                      conceptPrimary: e.target.value,
                    }))
                  }
                />
                <Input
                  className="h-9 font-mono text-xs"
                  aria-label="Özel renk kodu"
                  placeholder="#b00020"
                  value={form.conceptPrimary}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      conceptPalette: "ozel",
                      conceptPrimary: e.target.value,
                    }))
                  }
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {form.conceptPalette === "ozel" ? "Özel renk" : activePalette?.label ?? "Portal"} · Portal temasına kaydedilir.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  async function saveSite() {
    if (!form.slug.trim() || !form.displayName.trim()) {
      toast({ title: "Slug ve site adı gerekli", variant: "destructive" });
      return;
    }
    if (!editingId && form.editorEmail.trim() && form.editorPassword && form.editorPassword.length < 6) {
      toast({ title: "Editör şifresi en az 6 karakter olmalı (boş bırakırsanız şifre = kullanıcı adı)", variant: "destructive" });
      return;
    }
    if (editingId) {
      const current = sites.find((s) => s.id === editingId);
      const hasEditor = Boolean(primaryHmSiteEditor(current));
      if (!hasEditor && (!form.editorEmail.trim() || form.editorPassword.length < 8)) {
        toast({
          title: "Bu sitede editör yok",
          description: "E-posta ve en az 8 karakter şifre girin — yeni editör oluşturulacak.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      void wakeAdminApiContainer();
      await ensureAdminPanelBootstrap();
      const current = editingId ? sites.find((s) => s.id === editingId) : undefined;
      const editorId = primaryHmSiteEditor(current)?.id;
      const includePhpThemeFlag = isNews && (!editingId || current?.phpTheme !== true);
      let newsDomains: string[] | undefined;
      if (isNews) {
        const composed = composeNewsDomains(form);
        if (composed.error) throw new Error(composed.error);
        newsDomains = composed.list;
      }
      const r = await apiFetch(apiUrl(editingId ? `/api/hm/sites/${editingId}` : "/api/hm/sites"), {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payloadFromForm(form, editorId, {
            includePhpThemeFlag,
            kind,
            isCreate: !editingId,
            newsDomains,
            includeAiEditor: Boolean(current && Object.prototype.hasOwnProperty.call(current, "aiEditor")),
          }),
        ),
      });
      const text = await r.text();
      const j = text
        ? (JSON.parse(text) as {
            error?: string;
            site?: { id?: number };
            id?: number;
            gundemiProvision?: {
              tokenPresent?: boolean;
              dns?: Array<{ action?: string; fqdn?: string }>;
            };
          })
        : {};
      if (!r.ok) throw new Error(j.error || text || "Kaydedilemedi");

      const siteId =
        editingId ??
        (typeof j.site?.id === "number" ? j.site.id : typeof j.id === "number" ? j.id : null);

      const savedSite = (j as { site?: { domain?: string | null } }).site;
      const savedDomain = bareHost(savedSite?.domain ?? (newsDomains ? newsDomains[0] : form.domain));
      const gundemiNote = isNews && savedDomain ? ` · yayında: https://${savedDomain}` : "";
      void siteId;

      const createdEditor = (j as { editor?: { email?: string; auto?: boolean } | null }).editor;
      const createdDefault = (j as { defaultEditorCreated?: string }).defaultEditorCreated;
      const editorNote = createdEditor?.auto && createdEditor.email
        ? ` · editör: ${createdEditor.email} (şifre = kullanıcı adı)`
        : createdDefault
          ? ` · yeni editör: ${createdDefault} (şifre = kullanıcı adı)`
          : "";
      const wasPassiveEditor = primaryEditorIsPassive(current);
      const aiEditorWarning = (j as { aiEditorWarning?: string }).aiEditorWarning;
      toast({
        title: editingId ? `${noun} güncellendi` : `${noun} oluşturuldu`,
        description: wasPassiveEditor
          ? `Editör yeniden aktif edildi · slug: /${form.slug.trim()}${gundemiNote}${editorNote}`
          : `Slug: /${form.slug.trim()}${gundemiNote}${editorNote} · kaydı yenileniyor…`,
      });
      if (aiEditorWarning) {
        toast({ title: "AI editör uyarısı", description: aiEditorWarning, variant: "destructive" });
      }
      resetForm();
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
      await refetch();
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: String((e as Error)?.message ?? e).slice(0, 480),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function runAdminRepair(
    path: string,
    label: string,
    body: Record<string, unknown> = { dryRun: false },
  ) {
    setRepairing(path);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; error?: string; ok?: boolean };
      if (!r.ok) throw new Error(j.error || j.message || "Onarım başarısız");
      toast({
        title: label,
        description: String(j.message ?? "Tamamlandı").slice(0, 480),
      });
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
      await refetch();
    } catch (e) {
      toast({
        title: `${label} başarısız`,
        description: String((e as Error)?.message ?? e).slice(0, 480),
        variant: "destructive",
      });
    } finally {
      setRepairing(null);
    }
  }

  /** TGD arşiv + anasayfa kopyası — forceFull ile iki geçiş (eksik sayfa / kopya tamamlansın). */
  async function runTgdRestore() {
    const path = "/api/hm/admin/tgd-restore-pages";
    setRepairing(path);
    try {
      await ensureAdminPanelBootstrap();
      for (let i = 0; i < 2; i++) {
        const r = await apiFetch(apiUrl(path), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceFull: true }),
        });
        const j = (await r.json().catch(() => ({}))) as { message?: string; error?: string; ok?: boolean };
        if (!r.ok) throw new Error(j.error || j.message || "TGD yükleme başarısız");
      }
      toast({
        title: "TGD arşiv yükleme",
        description: "Trafik Güvenliği Derneği sayfaları ve anasayfa kopyası güncellendi",
      });
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
      await refetch();
    } catch (e) {
      toast({
        title: "TGD arşiv yükleme başarısız",
        description: String((e as Error)?.message ?? e).slice(0, 480),
        variant: "destructive",
      });
    } finally {
      setRepairing(null);
    }
  }

  function patchSiteList(siteId: number, patch: Partial<HmSiteRow>) {
    qc.setQueryData<{ items: HmSiteRow[] }>(["/api/hm/sites", "admin-panel", kind], (old) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((row) => (row.id === siteId ? { ...row, ...patch } : row)),
      };
    });
  }

  async function togglePublicSuspended(site: HmSiteRow) {
    const next = site.publicSuspended !== true;
    setSuspendingId(site.id);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutJson: { hmPublicSuspended: next } }),
      });
      if (!r.ok) throw new Error(await r.text());
      patchSiteList(site.id, { publicSuspended: next });
      toast({
        title: next ? "Site askıya alındı" : "Site yayına alındı",
        description: next ? "Ziyaretçiler Ahenk askı sayfasını görür." : `${site.displayName} yeniden açıldı.`,
      });
      void qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
    } catch (e) {
      toast({ title: "Askı durumu değişmedi", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setSuspendingId(null);
    }
  }

  async function setSiteYonelim(site: HmSiteRow, next: SiteYonelim) {
    if (site.yonelimAktif === true && normalizeYonelim(site.yonelim) === next) return;
    setYonelimSavingId(site.id);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yonelim: next }),
      });
      if (!r.ok) throw new Error(await r.text());
      patchSiteList(site.id, { yonelim: next, yonelimAktif: true });
      if (editingId === site.id) update("yonelim", next);
      void qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
    } catch (e) {
      toast({ title: "Yönelim kaydedilemedi", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setYonelimSavingId(null);
    }
  }

  async function toggleActive(site: HmSiteRow) {
    const next = !site.active;
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!r.ok) throw new Error(await r.text());
      patchSiteList(site.id, { active: next });
      void qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
    } catch (e) {
      toast({ title: "Durum değiştirilemedi", description: String(e).slice(0, 180), variant: "destructive" });
    }
  }

  async function deleteSite(site: HmSiteRow) {
    if (!window.confirm(`${site.displayName} ${isNews ? "haber sitesini" : "kurumsal siteyi"} silmek istediğinize emin misiniz?`)) return;
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await r.text());
      toast({ title: `${noun} silindi` });
      if (editingId === site.id) resetForm();
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel", kind] });
    } catch (e) {
      toast({ title: "Silinemedi", description: String(e).slice(0, 180), variant: "destructive" });
    }
  }

  async function checkDomains(site: HmSiteRow) {
    setCheckingId(site.id);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}/domain-check`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = (await r.json().catch(() => ({}))) as { results?: DomainCheckResult[]; error?: string };
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setDomainChecks((prev) => ({ ...prev, [site.id]: j.results ?? [] }));
    } catch (e) {
      toast({ title: "Domain kontrolü yapılamadı", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <AdminLayout title={isNews ? "Haber Siteleri" : "HM Kurumsal"}>
      <div className="space-y-6">
        {isNews ? (
        <details className="group rounded-2xl border border-slate-200 bg-white p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-black text-gray-900">Haber Merkezi yapay zekâ anahtarları</span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              {llmSummary
                ? llmSummary.map((r) => `${r.label.replace(/ NIM$/, "").replace(/^Google /, "")} ${r.hasKey && r.enabled ? "✓" : "✗"}`).join(", ")
                : "…"}
              <span className="text-gray-400 transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
            </span>
          </summary>
          <p className="mt-3 mb-4 text-sm text-gray-600">
            Merkez anahtarları tüm haber sitelerinin yedeğidir. Sitenin kendi anahtarı varsa önce o kullanılır.
          </p>
          <LlmProviderKeysPanel mode="global" onSummary={setLlmSummary} />
        </details>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{isNews ? "Haber Siteleri" : "HM Kurumsal"}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {isNews
                ? "Haber sitelerini (PHP tema), adreslerini, editör hesaplarını ve SEO doğrulamalarını yönetin. Kurumsal siteler HM Kurumsal bölümünde."
                : "Vakıf ve dernek sitelerini (VKD / VATAN kurumsal tema) yönetin. Kurumsal siteye haber modülü ve haber teması verilmez."}
            </p>
            <Link
              href={isNews ? "/admin/hm-kurumsal" : "/admin/haber-siteleri"}
              className="mt-1 inline-block text-xs font-semibold text-red-700 hover:underline"
            >
              {isNews ? "→ HM Kurumsal (vakıf / dernek siteleri)" : "→ Haber Siteleri"}
            </Link>
          </div>
          {isNews ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/haber-siteleri-bekci" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100">
              Haber AI Bekçi + PHP Neon eşitle
            </Link>
            <Link href="/admin/icerik-havuzu" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              İçerik Havuzu
            </Link>
            <Link href="/admin/hm-haber-ice-aktar" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Haber İçe Aktar
            </Link>
            <Link href="/admin/hm-kose-ice-aktar" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Köşe İçe Aktar
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={repairing !== null}
              onClick={() => void runAdminRepair("/api/hm/admin/backfill-rss-images", "RSS görsel backfill")}
            >
              {repairing === "/api/hm/admin/backfill-rss-images" ? "Onarılıyor…" : "RSS görsellerini doldur"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={repairing !== null}
              onClick={() =>
                void runAdminRepair("/api/hm/admin/repair-editor-cross-site", "Çift editör e-posta onarımı")
              }
            >
              {repairing === "/api/hm/admin/repair-editor-cross-site" ? "Onarılıyor…" : "Çift e-posta onar"}
            </Button>
          </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={repairing !== null}
              onClick={() => void runTgdRestore()}
            >
              {repairing === "/api/hm/admin/tgd-restore-pages" ? "Yükleniyor…" : "TGD arşiv yükle"}
            </Button>
          </div>
          )}
        </div>

        {duplicateEditorEmails.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-bold">Çift editör e-postası tespit edildi</p>
            <p className="mt-1 text-xs text-amber-900">
              Aynı e-posta birden fazla haber sitesinde kayıtlı; girişte site karışıklığı ve otomatik çıkış yapabilir.
              «Çift e-posta onar» ile fazla kayıtlar pasifleştirilir (Kırşehir için kevser@gmail.com yalnızca Site
              #19&apos;da kalır).
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              {duplicateEditorEmails.map(([email, rows]) => (
                <li key={email}>
                  <code>{email}</code> → {rows.map((r) => `${r.siteName} (#${r.siteId})`).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {isNews
                    ? editingId ? "Haber Sitesini Düzenle" : "Yeni Haber Sitesi"
                    : editingId ? "Kurumsal Siteyi Düzenle" : "Yeni Kurumsal Site"}
                </h2>
                {editingId ? (
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    Site ID:{" "}
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white">{editingId}</span>
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-gray-500">
                  {isNews ? (
                    <>
                      Site oluşunca hemen{" "}
                      <code className="rounded bg-gray-100 px-1">{platformSubdomains.gundemiOrg}</code> ve{" "}
                      <code className="rounded bg-gray-100 px-1">{platformSubdomains.fixTc}</code> adreslerinde PHP
                      temayla yayına girer.
                    </>
                  ) : (
                    <>Kurumsal site kendi domainleriyle yayın yapar (gundemi.org / fix.tc haber adresi verilmez).</>
                  )}
                </p>
              </div>
              {editingId ? (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  <Plus className="mr-1 h-4 w-4" /> Yeni
                </Button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => update("slug", normalizeSlugInput(e.target.value))} placeholder="ankara-haber" />
                </div>
                <div className="space-y-1.5">
                  <Label>Site adı</Label>
                  <Input value={form.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="Ankara Haber" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="Kısa site açıklaması" />
              </div>

              {isNews ? (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="text-xs font-black uppercase tracking-wide text-emerald-800">Yayın adresleri</div>
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                    <span className="min-w-0 text-sm font-semibold text-gray-800">
                      <code className="break-all">{bareHost(form.gundemiHost) || platformSubdomains.gundemiOrg}</code>
                    </span>
                    <Switch checked={form.gundemiAlias} onCheckedChange={(v) => update("gundemiAlias", Boolean(v))} />
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                    <span className="min-w-0 text-sm font-semibold text-gray-800">
                      <code className="break-all">{bareHost(form.fixHost) || platformSubdomains.fixTc}</code>
                    </span>
                    <Switch checked={form.fixAlias} onCheckedChange={(v) => update("fixAlias", Boolean(v))} />
                  </label>
                  <div className="space-y-1.5">
                    <Label>Kendi domaini (isteğe bağlı)</Label>
                    <Input value={form.customDomain} onChange={(e) => update("customDomain", e.target.value)} placeholder="adanahaber.com" />
                  </div>
                  {form.customDomain2 || form.customDomain ? (
                    <div className="space-y-1.5">
                      <Label>Ek domain (isteğe bağlı)</Label>
                      <Input value={form.customDomain2} onChange={(e) => update("customDomain2", e.target.value)} placeholder="adanahaber.com.tr" />
                    </div>
                  ) : null}
                  {!editingId ? (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
                      <label className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-800">Konsept site</span>
                        <Switch
                          checked={form.conceptSite}
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            setForm((prev) => ({
                              ...prev,
                              conceptSite: on,
                              vitrinTheme: on ? HM_NEW_SITE_PORTAL_THEME : prev.vitrinTheme,
                              conceptPalette: prev.conceptPalette || "portal",
                              conceptPrimary: prev.conceptPrimary || "#b00020",
                            }));
                          }}
                        />
                      </label>
                      {form.conceptSite ? (
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={form.conceptTopic}
                          onChange={(e) => update("conceptTopic", e.target.value)}
                        >
                          {CONCEPT_TOPICS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <p className="text-[11px] leading-relaxed text-amber-900">
                        {form.conceptSite
                          ? form.conceptTopic === "spor"
                            ? "Spor konsepti: Süper Lig puan durumu ve spor branşları açık; burçlar kapalı."
                            : "Konsept site: Süper Lig, burçlar ve diğer genel kutular gösterilmez; site yalnızca kendi konusunu yayınlar."
                          : "Kapalı = genel haber sitesi: Süper Lig, burçlar ve tüm genel kutular açık."}
                      </p>
                    </div>
                  ) : null}
                  {renderCreateThemeField()}
                  <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2">
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800">AI editör</span>
                      <Switch checked={form.aiEditorEnabled} onCheckedChange={(v) => update("aiEditorEnabled", Boolean(v))} />
                    </label>
                    <div className="space-y-1.5">
                      <Label>Site konsepti / içerik talimatı</Label>
                      <Textarea
                        value={form.aiConceptPrompt}
                        onChange={(e) => update("aiConceptPrompt", e.target.value)}
                        rows={4}
                        placeholder="Örn. Yalnızca ekonomi ve piyasa haberleri; magazin ve spor seçme."
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-sky-950">
                      AI yalnız manşet seçer ve kategori atar. Haber metnini yeniden yazmaz; kaynak haber ve link kalır
                      (içerik modu curate).
                      {editingId &&
                      Object.prototype.hasOwnProperty.call(sites.find((s) => s.id === editingId) ?? {}, "aiEditor") &&
                      sites.find((s) => s.id === editingId)?.aiEditor == null
                        ? " Bu sitede AI editör kaydı yok; mevcut siteler buradan eklenmez."
                        : ""}
                    </p>
                  </div>
                  <ul className="list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-emerald-950">
                    <li>
                      Kendi domaini varsa canonical, sitemap.xml, robots.txt, SEO/GEO, OG ve RSS o domaini gösterir;
                      yoksa <code>{bareHost(form.gundemiHost) || platformSubdomains.gundemiOrg}</code>.
                    </li>
                    <li>gundemi.org / fix.tc adresini kapatabilirsiniz; site açık kalan adreslerde yayına devam eder.</li>
                    <li>
                      Kendi domaininin DNS kaydı: <code>A 187.77.84.201</code> (Cloudflare&apos;da turuncu bulut). Sunucu
                      yönlendirmesi bir dakika içinde kendiliğinden açılır; listedeki «Adresleri kontrol et» ile doğrulayın.
                    </li>
                  </ul>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="space-y-1.5">
                      <Label>Domain 1</Label>
                      <Input value={form.domain} onChange={(e) => update("domain", e.target.value)} placeholder="ornek.org" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Domain 2</Label>
                      <Input value={form.domain2} onChange={(e) => update("domain2", e.target.value)} placeholder="ornek.org.tr" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Domain 3</Label>
                      <Input value={form.domain3} onChange={(e) => update("domain3", e.target.value)} placeholder="alternatif.org" />
                    </div>
                  </div>
                  {renderCreateThemeField()}
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>İletişim telefonu</Label>
                  <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>İletişim e-postası</Label>
                  <Input value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Adres</Label>
                <Input value={form.contactAddress} onChange={(e) => update("contactAddress", e.target.value)} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">SEO doğrulama</div>
                <div className="space-y-3">
                  <Input value={form.googleSiteVerification} onChange={(e) => update("googleSiteVerification", e.target.value)} placeholder="Google site verification content" />
                  <Input value={form.bingSiteVerification} onChange={(e) => update("bingSiteVerification", e.target.value)} placeholder="Bing msvalidate.01 content" />
                  <Input value={form.yandexVerification} onChange={(e) => update("yandexVerification", e.target.value)} placeholder="Yandex verification content" />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="mb-3 text-xs font-black uppercase tracking-wide text-indigo-700">Editör hesabı</div>
                {editingId && !primaryHmSiteEditor(sites.find((s) => s.id === editingId)) ? (
                  <p className="mb-3 text-xs font-semibold text-amber-800">
                    Bu sitede henüz editör yok. E-posta + şifre girip kaydedin; yeni editör oluşturulur.
                  </p>
                ) : null}
                {editingId && primaryEditorIsPassive(sites.find((s) => s.id === editingId)) ? (
                  <p className="mb-3 text-xs font-semibold text-amber-800">
                    Bu editör şu an <strong>pasif</strong> — site «Aktif» olsa bile giriş yapılamaz. «Güncelle»
                    deyince editör yeniden aktif olur; yeni şifre girmeniz önerilir.
                  </p>
                ) : null}
                <div className="space-y-3">
                  <Input value={form.editorDisplayName} onChange={(e) => update("editorDisplayName", e.target.value)} placeholder="Editör adı" />
                  {!editingId ? (
                    <p className="text-[11px] font-semibold leading-relaxed text-indigo-800">
                      Boş bırakın → otomatik hesap:{" "}
                      <code className="rounded bg-white px-1">{autoEditorEmail ?? "<alt>@<üst> / bilgi@<domain>"}</code>, şifre = kullanıcı adı.
                    </p>
                  ) : null}
                  <Input
                    value={form.editorEmail}
                    onChange={(e) => update("editorEmail", e.target.value)}
                    placeholder={!editingId && autoEditorEmail ? autoEditorEmail : "editor@ornek.com"}
                  />
                  <Input
                    value={form.editorPassword}
                    onChange={(e) => update("editorPassword", e.target.value)}
                    placeholder={
                      editingId && primaryHmSiteEditor(sites.find((s) => s.id === editingId))
                        ? "Yeni şifre (boş bırak: değişmesin)"
                        : !editingId
                          ? "Şifre (boş: kullanıcı adı ile aynı)"
                          : "En az 8 karakter şifre"
                    }
                    type="password"
                  />
                </div>
              </div>

              {isNews ? (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                  <div className="mb-2 text-sm font-semibold text-gray-800">Yönelim</div>
                  <YonelimSecici value={form.yonelim} onChange={(next) => update("yonelim", next)} />
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Sağ: ılımlı kaynaklar, muhalif kaynak yok. Sol: muhalif kaynaklardan beslenir. Karma: orta.
                    Seçilmezse yönelim atanmaz ve süzgeç uygulanmaz. Bu seçim yalnız yönetim panelinde görünür.
                  </p>
                </div>
              ) : null}

              <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
                <span className="text-sm font-semibold text-gray-800">Site aktif</span>
                <Switch checked={form.active} onCheckedChange={(v) => update("active", Boolean(v))} />
              </label>
              <p className="text-[11px] leading-relaxed text-slate-500">
                «Site aktif» yalnızca vitrini açar. Editör girişi için sağ listedeki hesap «(pasif)» olmamalı.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                {isNews ? (
                  <>
                    <span className="font-semibold text-slate-800">
                      Yeni haber sitesi varsayılan teması Portal.
                    </span>{" "}
                    Konsept sitede tema Portal kalır ve seçilen renk bu temaya yazılır. Kayıtlı sitelerin teması
                    değişmez. Site türü kilitlidir.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">
                      Yeni kurumsal site varsayılan teması Portal.
                    </span>{" "}
                    VKD veya VATAN seçilebilir. Kayıtlı sitelerin teması değişmez. Site türü kilitlidir.
                  </>
                )}
              </div>

              <Button type="button" disabled={saving} onClick={saveSite} className="w-full bg-[#e61e25] hover:bg-[#c91820]">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : isNews ? "Haber Sitesi Oluştur" : "Kurumsal Site Oluştur"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">{isNews ? "Kayıtlı Haber Siteleri" : "Kayıtlı Kurumsal Siteler"}</h2>
                <p className="text-xs text-gray-500">{sites.length} site · Site ID (1, 2, 3…) listede</p>
                <p className="mt-1 max-w-xl text-xs text-gray-500">
                  Askıya al, site girişine Ahenk Bilgi Teknolojileri askı sayfasını yazar. Aktif anahtarı siteyi gizler.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input className="sm:w-64" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Site ID, ad, slug veya domain…" />
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  Yenile
                </Button>
              </div>
            </div>

            {error && sites.length === 0 ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {(error as Error).message}
              </div>
            ) : isLoading || (isFetching && sites.length === 0 && !error) ? (
              <div className="p-5 text-sm text-gray-500">
                Haber siteleri yükleniyor…
                <span className="mt-1 block text-xs text-gray-400">
                  İlk yükleme soğuk sunucuda bir dakikaya kadar sürebilir; zaman aşımında kırmızı uyarı ve Yenile
                  görünür.
                </span>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Kayıt bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSites.map((site) => {
                  const publicHref = hmPublicHomeHref(site);
                  const domains = [site.domain, site.domain2, site.domain3].filter(Boolean) as string[];
                  const canonicalDomain = domains[0] ?? null;
                  return (
                    <article key={`${site.id}-${site.slug}`} className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 font-mono text-sm font-black text-white" title="Site ID">
                              Site ID: {site.id}
                            </span>
                            <h3 className="text-base font-black text-gray-900">{site.displayName}</h3>
                            <Badge variant={site.active ? "default" : "secondary"}>{site.active ? "Aktif" : "Pasif"}</Badge>
                            {site.publicSuspended ? <Badge variant="outline">Askıda</Badge> : null}
                            {site.phpTheme ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                PHP şablon
                              </Badge>
                            ) : null}
                            {site.hasOwnLlmKeys ? (
                              <Badge variant="outline">Kendi API{(site.ownLlmProviders ?? []).length ? `: ${(site.ownLlmProviders ?? []).join(", ")}` : ""}</Badge>
                            ) : (
                              <Badge variant="secondary">Merkez API</Badge>
                            )}
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">/{site.slug}</span>
                          </div>
                          {site.description ? <p className="mb-3 text-sm text-gray-600 line-clamp-2">{site.description}</p> : null}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <a href={publicHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100">
                              <ExternalLink className="h-3 w-3" /> Siteyi gör
                            </a>
                            {domains.map((domain) => (
                              <a key={domain} href={`https://${domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200">
                                <Globe2 className="h-3 w-3" /> {domain}
                                {isNews && domain === canonicalDomain && domains.length > 1 ? (
                                  <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] text-emerald-800">canonical</span>
                                ) : null}
                              </a>
                            ))}
                            {domains.length === 0 ? (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">Domain tanımlı değil</span>
                            ) : null}
                          </div>
                          {domainChecks[site.id]?.length ? (
                            <ul className="mt-2 space-y-1 text-xs">
                              {domainChecks[site.id].map((c) => (
                                <li key={c.host} className={c.ok ? "text-emerald-700" : "text-red-700"}>
                                  {c.ok ? "✓" : "✗"} <code>{c.host}</code> — {c.ok ? "DNS + SSL + PHP tema açık" : c.error ? `bağlanamadı (${c.error})` : `HTTP ${c.status}`}
                                  {c.sitemap ? ` · sitemap: ${c.sitemap}` : ""}
                                  {c.ok && c.canonicalOk === false ? " · canonical farklı" : ""}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {site.editors?.length ? (
                            <div className="mt-3 text-xs text-gray-500">
                              Editör: {editorSummary(site)}
                            </div>
                          ) : (
                            <div className="mt-3 text-xs font-semibold text-amber-700">Editör tanımlı değil</div>
                          )}
                        </div>

                        <div className="flex flex-col items-start gap-2 lg:items-end">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={site.publicSuspended ? "default" : "outline"}
                            size="sm"
                            disabled={suspendingId === site.id}
                            onClick={() => void togglePublicSuspended(site)}
                          >
                            {suspendingId === site.id ? "Kaydediliyor…" : site.publicSuspended ? "Yayına al" : "Askıya al"}
                          </Button>
                          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                            Aktif
                            <Switch checked={site.active} onCheckedChange={() => toggleActive(site)} />
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={checkingId === site.id || domains.length === 0}
                            onClick={() => void checkDomains(site)}
                          >
                            {checkingId === site.id ? "Kontrol ediliyor…" : "Adresleri kontrol et"}
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(site)}>
                            <Pencil className="mr-1 h-4 w-4" /> Düzenle
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => deleteSite(site)} className="border-red-200 text-red-600 hover:bg-red-50">
                            <Trash2 className="mr-1 h-4 w-4" /> Sil
                          </Button>
                        </div>
                        {isNews ? (
                          <YonelimSecici
                            value={site.yonelimAktif === true ? normalizeYonelim(site.yonelim) : null}
                            disabled={yonelimSavingId === site.id}
                            onChange={(next) => void setSiteYonelim(site, next)}
                          />
                        ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
