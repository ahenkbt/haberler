import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListAuthors } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { asArray, apiRequest } from "@/lib/queryClient";
import {
  Bot, Sparkles, Settings, Users, Trash2, CheckCircle, AlertCircle, PenLine,
  Loader2, Link2, FileText, Tag, RefreshCw, Play, BarChart3, Key, Search,
  Zap, Rss, Video, Newspaper, Clock, AlarmClock, ToggleRight,
  ChevronRight, Star, Globe, Grid3X3, Mic, Clapperboard, Save,
  Copy, Eye, Download,
} from "lucide-react";
import { useState, useEffect, useRef, Component, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  apiFetch as apiBaseFetch,
  apiUrl,
  ensureAdminPanelBootstrap,
  resolveClientMediaSrc,
} from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { Link } from "wouter";

function useAdminNewsCategories() {
  return useQuery({
    queryKey: ["/api/categories", "scope", "admin"],
    queryFn: () => apiRequest("/api/categories?scope=admin") as Promise<any[]>,
    staleTime: 5 * 60 * 1000,
  });
}

/* ── Error Boundary ─────────────────────────────── */
class TabErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-red-700 mb-1">Bu sekme yüklenirken bir hata oluştu</p>
          <p className="text-xs text-red-500 font-mono">{this.state.error}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-4 text-xs text-red-600 underline">Tekrar dene</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const API = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: text || "Geçersiz sunucu yanıtı" };
  }
  if (!res.ok && data?.ok !== false) data.ok = false;
  if (!res.ok) {
    data._httpStatus = res.status;
    data._rawBody = text;
  }
  return data;
}

/** AI robotu API hataları (Vercel /api vekili → Railway dahil). */
function describeAiApiError(
  data: { error?: string; detail?: string; _rawBody?: string; _httpStatus?: number },
  fallback: string,
): string {
  const raw = String(data._rawBody ?? data.error ?? data.detail ?? "");
  const statusLabel =
    typeof data._httpStatus === "number" && data._httpStatus > 0 ? `HTTP ${data._httpStatus}. ` : "";
  const healthz =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/healthz`
      : "/api/healthz";
  if (/MIDDLEWARE_INVOCATION_TIMEOUT/i.test(raw)) {
    return "Vercel ara katmanı zaman aşımına uğradı. Daha az haber seçin veya görselleri atlayın; istekler parça parça gönderilir.";
  }
  if (data._httpStatus === 504 || /\b504\b|Gateway Timeout/i.test(raw)) {
    return `${statusLabel}Sunucu yanıt vermedi (zaman aşımı). Daha az haber veya «Görselleri atla» ile tekrar deneyin. Sağlık: ${healthz}`;
  }
  if (data._httpStatus === 502 || /API vekiline bağlanılamadı/i.test(raw)) {
    const detail = data.detail ? ` (${data.detail})` : "";
    return (
      `${statusLabel}${data.error || "API sunucusuna ulaşılamadı"}${detail}. ` +
      `Önce ${healthz} açılmalı (status ok). ` +
      `Açılıyorsa Vercel Production'da vercel.json /api rewrite hedefi Railway genel URL ile aynı olmalı; sonra Redeploy.`
    );
  }
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  return fallback;
}

function describeTopicRunError(data: { error?: string; detail?: string; _rawBody?: string; _httpStatus?: number }): string {
  return describeAiApiError(data, "Konu üretimi başarısız");
}

function describeRssRunError(data: {
  error?: string;
  detail?: string;
  _rawBody?: string;
  _httpStatus?: number;
  openAiQuotaHit?: boolean;
  geminiFallbackAttempted?: boolean;
  geminiConfigured?: boolean;
  aiSkipped?: number;
}): string {
  const skipped =
    typeof data.aiSkipped === "number" && data.aiSkipped > 0 ? ` (${data.aiSkipped} madde atlandı)` : "";
  if (data.openAiQuotaHit) {
    if (data.geminiConfigured && data.geminiFallbackAttempted) {
      return (
        data.error ||
        `OpenAI kotası doldu; Gemini de yanıt vermedi${skipped}. Genel Ayarlar → Yapay zekâ anahtarını veya OpenAI kredisini kontrol edin.`
      );
    }
    if (data.geminiConfigured) {
      return (
        data.error ||
        `OpenAI kotası doldu${skipped}. Gemini yedek anahtarı tanımlı ancak devreye giremedi — Genel Ayarlar → Yapay zekâ bölümünü kontrol edin.`
      );
    }
    return (
      data.error ||
      `OpenAI kotası doldu${skipped}. Yedek için Genel Ayarlar → Yapay zekâ → Gemini ekleyin veya OpenAI kredisi yükleyin.`
    );
  }
  const raw = String(data._rawBody ?? data.error ?? data.detail ?? "");
  if (/quota|insufficient_quota|billing|exceeded your current quota/i.test(raw)) {
    if (data.geminiConfigured === false) {
      return `OpenAI kotası doldu${skipped}. Gemini yedek anahtarı yok — Yönetim → Genel Ayarlar → Yapay zekâ.`;
    }
    return `OpenAI kotası doldu; Gemini yedek deneniyor veya başarısız${skipped}. ${data.error || raw.slice(0, 160)}`;
  }
  return describeAiApiError(data, "RSS çalıştırma hatası");
}

/** RSS toplu çalıştırma parça boyutu (Vercel vekili zaman aşımı için küçük tutulur) */
const RSS_RUN_CHUNK_SIZE = 1;
/** Konu üretimi: görsel taraması + AI için istek başına 1 haber */
const TOPIC_RUN_CHUNK_SIZE = 1;

const TOPIC_BATCH_COUNTS = [5, 10, 15, 20, 50] as const;

type TopicBatchNews = { title: string; id: number };

async function executeTopicBatchRequest(opts: {
  topic: string;
  totalCount: number;
  categoryId: number | null | undefined;
  siteIds: number[];
  skipImages?: boolean;
  onProgress?: (done: number, target: number) => void;
}): Promise<{ totalGenerated: number; allNews: TopicBatchNews[]; lastError?: string }> {
  const trimmed = opts.topic.trim();
  const target = Math.max(1, Math.min(50, opts.totalCount));
  let totalGenerated = 0;
  const allNews: TopicBatchNews[] = [];
  let lastError: string | undefined;
  let remaining = target;

  opts.onProgress?.(0, target);

  while (remaining > 0) {
    const chunkCount = Math.min(TOPIC_RUN_CHUNK_SIZE, remaining);
    const res = await apiFetch("/ai/run-topic", {
      method: "POST",
      body: JSON.stringify({
        topic: trimmed,
        count: chunkCount,
        categoryId:
          opts.categoryId != null && Number.isFinite(opts.categoryId) ? opts.categoryId : undefined,
        siteIds: opts.siteIds,
        skipImages: opts.skipImages ? true : undefined,
      }),
    });
    if (!res.ok) {
      lastError = describeTopicRunError(res);
      break;
    }
    const n = Number(res.generated) || 0;
    totalGenerated += n;
    if (Array.isArray(res.news)) allNews.push(...res.news);
    remaining -= chunkCount;
    opts.onProgress?.(totalGenerated, target);
    if (n === 0) break;
  }

  return { totalGenerated, allNews, lastError };
}

interface AiStats {
  hasApiKey: boolean;
  openaiConfigured?: boolean;
  geminiConfigured?: boolean;
  deepseekConfigured?: boolean;
  preferredProvider?: PreferredProvider;
  hasAnyAiKey?: boolean;
  openaiModel: string;
  totalNews: number;
  aiGenerated: number;
  published: number;
  draft: number;
  rssSourceCount: number;
  totalAiRuns: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  autoRunEnabled: boolean;
  intervalHours: number;
}

type HmSiteRowPick = { id: number; slug: string; displayName: string; active: boolean };

async function fetchHmSitesAi(): Promise<{ items: HmSiteRowPick[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiBaseFetch(apiUrl("/api/hm/sites"));
  const j = (await r.json().catch(() => ({}))) as { items?: HmSiteRowPick[] };
  if (!r.ok) return { items: [] };
  return { items: Array.isArray(j.items) ? j.items.filter((x) => x?.active !== false) : [] };
}

type PreferredProvider = "auto" | "openai" | "gemini" | "deepseek";

interface AiSettings {
  hasApiKey: boolean;
  openaiApiKey: string;
  openaiModel: string;
  language: string;
  autoUniquify: boolean;
  wordCount: number;
  postStatus: string;
  rssUrls: string;
  maxPerSource: number;
  intervalHours: number;
  autoRunEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  totalAiRuns: number;
  preferredProvider?: PreferredProvider;
}

const AI_PROVIDER_OPTIONS: { value: PreferredProvider; label: string; description: string }[] = [
  { value: "auto", label: "Otomatik (OpenAI → Gemini)", description: "OpenAI kotası dolunca Gemini yedek" },
  { value: "openai", label: "OpenAI", description: "Yalnızca OpenAI kullan" },
  { value: "gemini", label: "Google Gemini", description: "Yalnızca Gemini (Genel Ayarlar anahtarı)" },
  { value: "deepseek", label: "DeepSeek", description: "Yalnızca DeepSeek (Genel Ayarlar anahtarı)" },
];

function providerConfigured(
  provider: PreferredProvider,
  status: {
    openaiConfigured?: boolean;
    geminiConfigured?: boolean;
    deepseekConfigured?: boolean;
  } | null,
): boolean {
  if (!status) return false;
  if (provider === "openai") return !!status.openaiConfigured;
  if (provider === "gemini") return !!status.geminiConfigured;
  if (provider === "deepseek") return !!status.deepseekConfigured;
  return !!(status.openaiConfigured || status.geminiConfigured);
}

function AiProviderSelect({
  value,
  onChange,
  onSaved,
  saveOnChange = false,
}: {
  value: PreferredProvider;
  onChange: (v: PreferredProvider) => void;
  onSaved?: () => void;
  saveOnChange?: boolean;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    openaiConfigured?: boolean;
    geminiConfigured?: boolean;
    deepseekConfigured?: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStatus = () => {
    apiFetch("/ai/status")
      .then((s) => {
        if (s && !s.error) setStatus(s);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleValueChange = async (next: PreferredProvider) => {
    onChange(next);
    if (!saveOnChange) return;
    setSaving(true);
    const res = await apiFetch("/ai/settings", {
      method: "PUT",
      body: JSON.stringify({ preferredProvider: next }),
    });
    setSaving(false);
    if (res.ok !== false) {
      onSaved?.();
      loadStatus();
    } else {
      toast({ title: "Sağlayıcı kaydedilemedi", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yapay zeka sağlayıcısı</Label>
      <Select value={value} onValueChange={(v) => void handleValueChange(v as PreferredProvider)} disabled={saving}>
        <SelectTrigger>
          <SelectValue placeholder="Sağlayıcı seçin" />
        </SelectTrigger>
        <SelectContent>
          {AI_PROVIDER_OPTIONS.map((opt) => {
            const ok = providerConfigured(opt.value, status);
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {ok ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>{opt.label}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-gray-500">
        {AI_PROVIDER_OPTIONS.find((o) => o.value === value)?.description}
        {saveOnChange ? " Değişiklik anında kaydedilir." : null}
      </p>
      <div className="flex flex-wrap gap-2 text-[10px]">
        {AI_PROVIDER_OPTIONS.filter((o) => o.value !== "auto").map((opt) => {
          const ok = providerConfigured(opt.value, status);
          return (
            <span
              key={opt.value}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                ok ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {opt.label.split(" ")[0]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function AiIcerikRobotu() {
  const [stats, setStats] = useState<AiStats | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ generated: number; news: any[] } | null>(null);
  /** Boş: merkez haber. Dolu: aynı içerik her seçilen HM sitesi için ayrı kayıt. */
  const [targetSiteIds, setTargetSiteIds] = useState<number[]>([]);
  /** Üst düğme + Konu Planı / Konuya göre sekmeleri ortak konu */
  const [sharedTopic, setSharedTopic] = useState("");
  const [sharedCategoryId, setSharedCategoryId] = useState("");
  const [topicSkipImages, setTopicSkipImages] = useState(false);
  const { toast } = useToast();

  const { data: hmSitesAi } = useQuery({
    queryKey: ["/api/hm/sites", "ai-robot"],
    queryFn: fetchHmSitesAi,
    retry: false,
  });
  const hmSitesList = hmSitesAi?.items ?? [];

  const loadStats = async () => {
    try {
      const s = await apiFetch("/ai/stats");
      if (s && !s.error) setStats(s);
    } catch {
      // AI istatistikleri yüklenemedi, sessizce devam et
    }
  };

  useEffect(() => { loadStats(); }, []);

  const handleRunRssNow = async (count = 10) => {
    setRunning(true);
    setRunResult(null);
    let totalGenerated = 0;
    const allNews: { title: string; id: number }[] = [];
    let lastError: string | undefined;

    try {
      let remaining = Math.max(1, Math.min(50, count));
      while (remaining > 0) {
        const chunkCount = Math.min(RSS_RUN_CHUNK_SIZE, remaining);
        const res = await apiFetch("/ai/run-rss", {
          method: "POST",
          body: JSON.stringify({ count: chunkCount, siteIds: targetSiteIds }),
        });
        if (!res.ok) {
          lastError = describeRssRunError(res);
          break;
        }
        const n = Number(res.generated) || 0;
        totalGenerated += n;
        if (Array.isArray(res.news)) allNews.push(...res.news);
        remaining -= chunkCount;
        if (n === 0) {
          if (res.error) lastError = describeRssRunError(res);
          break;
        }
      }

      if (totalGenerated > 0) {
        setRunResult({ generated: totalGenerated, news: allNews });
        toast({
          title: `${totalGenerated} haber üretildi!`,
          description: "RSS kaynaklarından AI ile içerik oluşturuldu.",
        });
        loadStats();
      } else if (lastError) {
        toast({ title: "Hata", description: lastError, variant: "destructive" });
      } else {
        toast({
          title: "Yeni haber üretilemedi",
          description: "RSS kaynaklarında yeni madde bulunamadı veya tümü zaten içe aktarılmış.",
          variant: "destructive",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Bağlantı hatası",
        description: describeAiApiError({ error: msg }, "API robotuna bağlanılamadı"),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleRunTopicNow = async (count = 10) => {
    const trimmed = sharedTopic.trim();
    if (!trimmed) {
      toast({
        title: "Konu girin",
        description: "Konu Planı veya Konuya göre üret sekmesinde konu yazın.",
        variant: "destructive",
      });
      return;
    }
    if (!canRunAi) {
      toast({ title: "API anahtarı gerekli", variant: "destructive" });
      return;
    }

    const catNum = sharedCategoryId ? Number(sharedCategoryId) : null;
    setRunning(true);
    setRunResult(null);

    try {
      const { totalGenerated, allNews, lastError } = await executeTopicBatchRequest({
        topic: trimmed,
        totalCount: count,
        categoryId: catNum != null && Number.isFinite(catNum) ? catNum : null,
        siteIds: targetSiteIds,
        skipImages: topicSkipImages,
      });

      if (totalGenerated > 0) {
        setRunResult({ generated: totalGenerated, news: allNews });
        toast({
          title: `${totalGenerated} haber üretildi!`,
          description: `"${trimmed}" — Google News kaynaklı özgün içerik.`,
        });
        loadStats();
      } else if (lastError) {
        toast({ title: "Üretim hatası", description: lastError, variant: "destructive" });
      } else {
        toast({
          title: "Yeni haber üretilemedi",
          description: "Tüm kaynaklar zaten içe aktarılmış olabilir veya RSS boş döndü.",
          variant: "destructive",
        });
      }
    } finally {
      setRunning(false);
    }
  };

  const canRunAi = stats?.hasAnyAiKey ?? stats?.hasApiKey ?? false;

  const nextRunLabel = stats?.nextRunAt
    ? new Date(stats.nextRunAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <AdminLayout title="AI İçerik Robotu">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-[#1a1a2e] text-white rounded-lg mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Rss className="w-5 h-5 text-red-400" />
            <span className="font-bold text-lg">AI Haber Botu</span>
            <span className="text-xs bg-red-600 px-2 py-0.5 rounded font-mono">v3.12.3</span>
          </div>
          <div className="flex items-center gap-4">
            {stats?.autoRunEnabled && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <AlarmClock className="w-4 h-4 text-green-400" />
                <span>Sonraki Otomatik Çalışma:</span>
                <span className="font-bold text-white">{nextRunLabel}</span>
              </div>
            )}
            <Button
              className="bg-[#e61e25] hover:bg-[#c91820] text-white font-bold gap-2 px-5"
              onClick={() => handleRunTopicNow(10)}
              disabled={running || !canRunAi || !sharedTopic.trim()}
              title={sharedTopic.trim() ? `Konu: ${sharedTopic.trim()}` : "Önce Konu Planı veya Konuya göre üret sekmesinde konu girin"}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Üretiliyor..." : "Şimdi 10 Haber Üret"}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-black/30 grid grid-cols-4 divide-x divide-white/10 text-center">
          {[
            { label: "Toplam Haber", value: stats?.totalNews ?? "-", icon: Newspaper },
            { label: "AI Üretilen", value: stats?.aiGenerated ?? "-", icon: Bot },
            { label: "RSS Kaynağı", value: stats?.rssSourceCount ?? "-", icon: Rss },
            { label: "Toplam Çalışma", value: stats?.totalAiRuns ?? "-", icon: Zap },
          ].map((item) => (
            <div key={item.label} className="py-3">
              <div className="text-2xl font-black text-white">{item.value}</div>
              <div className="text-xs text-zinc-400 mt-0.5 flex items-center justify-center gap-1">
                <item.icon className="w-3 h-3" />{item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Haber merkezi & içerik kısayolları
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/icerik-havuzu"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            İçerik Havuzu
          </Link>
          <Link
            href="/admin/haber-siteleri"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Haber Siteleri (HM)
          </Link>
          <Link
            href="/admin/hm-kose-makaleler"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Köşe Makaleleri (HM)
          </Link>
          <Link
            href="/admin/ansiklopedi-yonetimi"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Ansiklopedi
          </Link>
          <Link
            href="/admin/hm-kose-ice-aktar"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            AHB Köşe İçe Aktar
          </Link>
        </div>
      </div>

      {/* No API key warning */}
      {stats && !canRunAi && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <span className="text-sm text-amber-800">
            AI anahtarı yok. <strong>AI Ayarları</strong> → OpenAI veya <strong>Genel Ayarlar</strong> → Yapay zekâ → Gemini ekleyin.
          </span>
        </div>
      )}

      {hmSitesList.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Hedef haber merkezi siteleri</h3>
          <p className="mt-1 text-xs text-slate-600">
            İşaretlemezseniz üretilen haberler merkez akışa yazılır. Site seçtiğinizde yalnızca o sitelere yazılır;
            merkez akışa düşmez. Aynı RSS bağlantısı zaten kayıtlıysa (hangi sitede olursa) tekrar üretilmez.
          </p>
          <ul className="mt-3 flex max-h-40 flex-col gap-2 overflow-y-auto text-sm">
            {hmSitesList.map((s) => {
              const checked = targetSiteIds.includes(s.id);
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`ai-hm-${s.id}`}
                    checked={checked}
                    onCheckedChange={() =>
                      setTargetSiteIds((prev) =>
                        checked ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                      )
                    }
                  />
                  <label htmlFor={`ai-hm-${s.id}`} className="cursor-pointer">
                    <span className="font-medium">{s.displayName}</span>
                    <span className="text-slate-500">
                      {" "}
                      · /{HM_SITE_PUBLIC_PREFIX}/{s.slug}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Run result */}
      {runResult && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2 font-bold text-green-800">
            <CheckCircle className="w-5 h-5" />
            {runResult.generated} haber üretildi
          </div>
          <div className="flex flex-wrap gap-2">
            {runResult.news.map((n: any) => (
              <a key={n.id} href={`/admin/haberler/${n.id}/duzenle`} className="text-xs bg-white border border-green-300 text-green-800 px-2 py-1 rounded hover:bg-green-100 transition-colors">
                #{n.id} {n.title.slice(0, 40)}...
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/90 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-3">
          <PenLine className="w-8 h-8 text-slate-700 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">AHB köşe içe aktarma (Haber Merkezi)</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Yazar ve makale JSON dosyalarını seçerek <code className="rounded bg-white px-1">hm_makaleler</code>{" "}
              tablosuna aktarın. Tam sayfa: yönetim menüsünde AI İçerik Robotu altındaki bağlantı veya doğrudan{" "}
              <code className="rounded bg-white px-1">/admin/hm-kose-ice-aktar</code>. Silme ve toplu silme için site
              editöründe <strong>Blog</strong> listesini kullanın.
            </p>
          </div>
        </div>
        <Button asChild variant="default" className="shrink-0 bg-slate-900 hover:bg-slate-800">
          <a href="/admin/hm-kose-ice-aktar">İçe aktarma sayfası</a>
        </Button>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────── */}
      <Tabs defaultValue="klasik-rss">
        <TabsList className="bg-white border rounded-lg p-1 h-auto flex-wrap gap-1 mb-6 w-full justify-start">
          {[
            { value: "klasik-rss", label: "Klasik RSS Modu", icon: Rss },
            { value: "konu-plani", label: "Konu Planı (Google News)", icon: Globe },
            { value: "konuya-gore", label: "Konuya göre üret", icon: Search },
            { value: "site-bakimi", label: "Site Bakımı", icon: Trash2 },
            { value: "kose-yazarlari", label: "Köşe Yazarları", icon: Users },
            { value: "rss-direkt", label: "RSS Direkt (AI'sz)", icon: FileText },
            { value: "video-tv", label: "Video TV", icon: Video },
            { value: "tek-uret", label: "AI Tek Üret", icon: Sparkles },
            { value: "podcast-uret", label: "Podcast Üret", icon: Mic },
            { value: "video-uret", label: "Video Üret", icon: Clapperboard },
            { value: "magaza-urun", label: "Mağaza & Ürün", icon: Star },
            { value: "icerikler", label: "İçerikler", icon: Grid3X3 },
            { value: "ayarlar", label: "AI Ayarları", icon: Settings },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded px-3 py-2 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="klasik-rss">
          <TabErrorBoundary><KlasikRssTab stats={stats} onRunNow={handleRunRssNow} running={running} onRefresh={loadStats} /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="konu-plani">
          <TabErrorBoundary>
            <KonuPlaniTab
              hasApiKey={canRunAi}
              onSuccess={loadStats}
              targetSiteIds={targetSiteIds}
              hmSitesList={hmSitesList}
              sharedTopic={sharedTopic}
              onSharedTopicChange={setSharedTopic}
              sharedCategoryId={sharedCategoryId}
              onSharedCategoryChange={setSharedCategoryId}
              skipImages={topicSkipImages}
              onSkipImagesChange={setTopicSkipImages}
            />
          </TabErrorBoundary>
        </TabsContent>
        <TabsContent value="konuya-gore">
          <TabErrorBoundary>
            <KonuyaGoreTab
              hasApiKey={canRunAi}
              onSuccess={loadStats}
              targetSiteIds={targetSiteIds}
              hmSitesList={hmSitesList}
              sharedTopic={sharedTopic}
              onSharedTopicChange={setSharedTopic}
              sharedCategoryId={sharedCategoryId}
              onSharedCategoryChange={setSharedCategoryId}
              skipImages={topicSkipImages}
              onSkipImagesChange={setTopicSkipImages}
            />
          </TabErrorBoundary>
        </TabsContent>
        <TabsContent value="site-bakimi">
          <TabErrorBoundary>
            <SiteBakimiTab onSuccess={loadStats} targetSiteIds={targetSiteIds} hmSitesList={hmSitesList} />
          </TabErrorBoundary>
        </TabsContent>
        <TabsContent value="kose-yazarlari">
          <TabErrorBoundary><KoseYazarlariTab hasApiKey={canRunAi} onSuccess={loadStats} /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="rss-direkt">
          <TabErrorBoundary><RssDirektTab onSuccess={loadStats} /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="video-tv">
          <TabErrorBoundary><VideoTvTab /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="tek-uret">
          <TabErrorBoundary><TekUretTab hasApiKey={canRunAi} onSuccess={loadStats} /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="podcast-uret">
          <TabErrorBoundary><PodcastUretTab /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="video-uret">
          <TabErrorBoundary><VideoUretTab /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="magaza-urun">
          <TabErrorBoundary><MagazaUrunTab hasApiKey={canRunAi} /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="icerikler">
          <TabErrorBoundary><IceriklerTab /></TabErrorBoundary>
        </TabsContent>
        <TabsContent value="ayarlar">
          <TabErrorBoundary><AyarlarTab onSave={loadStats} /></TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KLASİK RSS MODU
   ══════════════════════════════════════════════════════════════════ */
/* RSS satırı: URL + kategori slug */
interface RssRow { url: string; catSlug: string; }

function rssRowsToString(rows: RssRow[]): string {
  return rows.filter(r => r.url.trim()).map(r => r.catSlug ? `${r.url.trim()} | ${r.catSlug}` : r.url.trim()).join("\n");
}

function stringToRssRows(raw: string): RssRow[] {
  const lines = raw.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [{ url: "", catSlug: "" }];
  return lines.map(l => {
    const [urlPart, catPart] = l.split("|").map(s => s.trim());
    return { url: urlPart ?? "", catSlug: catPart ?? "" };
  });
}

function KlasikRssTab({
  stats, onRunNow, running, onRefresh,
}: {
  stats: AiStats | null;
  onRunNow: (count: number) => void;
  running: boolean;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [rssRows, setRssRows] = useState<RssRow[]>([{ url: "", catSlug: "" }]);
  const [maxPerSource, setMaxPerSource] = useState("5");
  const [intervalHours, setIntervalHours] = useState("24");
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [wordCount, setWordCount] = useState("600");
  const [postStatus, setPostStatus] = useState("draft");
  const [autoUniquify, setAutoUniquify] = useState(false);
  const [preferredProvider, setPreferredProvider] = useState<PreferredProvider>("auto");
  const [selectedPopularUrls, setSelectedPopularUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { data: categoriesRaw } = useAdminNewsCategories();
  const categories = asArray(categoriesRaw);

  useEffect(() => {
    apiFetch("/ai/settings").then((s: AiSettings) => {
      setRssRows(stringToRssRows(s.rssUrls || ""));
      setMaxPerSource(String(s.maxPerSource || 5));
      setIntervalHours(String(s.intervalHours || 24));
      setAutoRunEnabled(s.autoRunEnabled);
      setWordCount(String(s.wordCount || 600));
      setPostStatus(s.postStatus || "draft");
      setAutoUniquify(s.autoUniquify);
      setPreferredProvider(s.preferredProvider ?? "auto");
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const rssUrls = rssRowsToString(rssRows);
    const res = await apiFetch("/ai/settings", {
      method: "PUT",
      body: JSON.stringify({
        rssUrls,
        maxPerSource: Number(maxPerSource),
        intervalHours: Number(intervalHours),
        autoRunEnabled,
        wordCount: Number(wordCount),
        postStatus,
        autoUniquify,
        preferredProvider,
      }),
    });
    setSaving(false);
    if (res.ok !== false) {
      toast({ title: "Ayarlar kaydedildi" });
      onRefresh();
    } else {
      toast({ title: "Hata", description: res.error, variant: "destructive" });
    }
  };

  const updateRow = (i: number, field: keyof RssRow, val: string) =>
    setRssRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRow = () => setRssRows(prev => [...prev, { url: "", catSlug: "" }]);
  const removeRow = (i: number) => setRssRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [{ url: "", catSlug: "" }]);

  const activeRows = rssRows.filter(r => r.url.trim());

  const POPULAR_RSS = [
    { label: "AA Haber", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel", cat: "gundem" },
    { label: "Sabah", url: "https://www.sabah.com.tr/rss/anasayfa.xml", cat: "gundem" },
    { label: "Hürriyet", url: "https://www.hurriyet.com.tr/rss/anasayfa", cat: "gundem" },
    { label: "CNN Türk", url: "https://www.cnnturk.com/feed/rss/all/news", cat: "gundem" },
    { label: "NTV", url: "https://www.ntv.com.tr/gundem.rss", cat: "gundem" },
    { label: "Milliyet", url: "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml", cat: "gundem" },
    { label: "Sözcü", url: "https://www.sozcu.com.tr/feed/", cat: "gundem" },
    { label: "T24", url: "https://t24.com.tr/rss", cat: "gundem" },
  ];

  const addPopularSource = (url: string, cat: string) => {
    setRssRows(prev => {
      if (prev.some((r) => r.url.trim() === url)) return prev;
      const emptyIdx = prev.findIndex(r => !r.url.trim());
      if (emptyIdx >= 0) {
        return prev.map((r, i) => i === emptyIdx ? { url, catSlug: cat } : r);
      }
      return [...prev, { url, catSlug: cat }];
    });
  };

  const togglePopularSelection = (url: string) => {
    setSelectedPopularUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const addSelectedPopularSources = () => {
    const picked = POPULAR_RSS.filter((s) => selectedPopularUrls.has(s.url));
    if (!picked.length) {
      toast({ title: "Kaynak seçin", description: "Listeden en az bir haber sitesi işaretleyin.", variant: "destructive" });
      return;
    }
    picked.forEach((s) => addPopularSource(s.url, s.cat));
    setSelectedPopularUrls(new Set());
    toast({ title: `${picked.length} RSS kaynağı eklendi` });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: Main settings */}
      <div className="xl:col-span-2 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Aktif Kaynak", value: activeRows.length, color: "text-blue-600 bg-blue-50" },
            { label: "Aralık (Saat)", value: intervalHours, color: "text-purple-600 bg-purple-50" },
            { label: "Toplam Haber", value: stats?.totalNews ?? "-", color: "text-gray-700 bg-gray-50" },
            { label: "Toplam Çalışma", value: stats?.totalAiRuns ?? "-", color: "text-green-600 bg-green-50" },
          ].map((item) => (
            <div key={item.label} className={`${item.color} rounded-xl p-4 border`}>
              <div className="text-2xl font-black">{item.value}</div>
              <div className="text-xs mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <AiProviderSelect
            value={preferredProvider}
            onChange={setPreferredProvider}
            saveOnChange
            onSaved={onRefresh}
          />
        </div>

        {/* RSS Sources — structured list */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Rss className="w-4 h-4 text-orange-500" /> RSS Kaynakları
            </h3>
            <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs">
              + Kaynak Ekle
            </Button>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_180px_36px] gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">RSS Feed URL</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Kategori</span>
            <span />
          </div>

          <div className="space-y-2">
            {rssRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_180px_36px] gap-2 items-center">
                <Input
                  placeholder="https://orneksite.com/rss.xml"
                  value={row.url}
                  onChange={(e) => updateRow(i, "url", e.target.value)}
                  className="text-xs font-mono h-9"
                />
                <Select value={row.catSlug || "auto"} onValueChange={(v) => updateRow(i, "catSlug", v === "auto" ? "" : v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="AI otomatik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">— AI Otomatik —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removeRow(i)}
                  className="w-9 h-9 flex items-center justify-center rounded border border-transparent hover:bg-red-50 hover:border-red-200 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="mt-3 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            + Yeni kaynak ekle
          </button>
        </div>

        {/* Yayın Ayarları */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" /> Yayın Ayarları
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Kaynak Başına Maks. Haber</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxPerSource}
                onChange={(e) => setMaxPerSource(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Her RSS kaynağından max kaç haber alınsın</p>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">İçerik Uzunluğu (Kelime)</Label>
              <Select value={wordCount} onValueChange={setWordCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">300 kelime (kısa)</SelectItem>
                  <SelectItem value="600">600 kelime (orta)</SelectItem>
                  <SelectItem value="900">900 kelime (uzun)</SelectItem>
                  <SelectItem value="1200">1200 kelime (detaylı)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yayın Durumu</Label>
              <Select value={postStatus} onValueChange={setPostStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Taslak olarak kaydet</SelectItem>
                  <SelectItem value="published">Doğrudan yayınla</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Çalışma Aralığı (Saat)</Label>
              <Select value={intervalHours} onValueChange={setIntervalHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Her 1 saat</SelectItem>
                  <SelectItem value="3">Her 3 saat</SelectItem>
                  <SelectItem value="6">Her 6 saat</SelectItem>
                  <SelectItem value="12">Her 12 saat</SelectItem>
                  <SelectItem value="24">Her 24 saat (günlük)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div>
                <div className="font-medium text-sm">Otomatik Çalışma</div>
                <div className="text-xs text-gray-500">Bot belirtilen aralıkta otomatik çalışsın</div>
              </div>
              <Switch checked={autoRunEnabled} onCheckedChange={setAutoRunEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div>
                <div className="font-medium text-sm">Otomatik Özgünleştirme</div>
                <div className="text-xs text-gray-500">RSS içeriğini AI ile yeniden yaz</div>
              </div>
              <Switch checked={autoUniquify} onCheckedChange={setAutoUniquify} />
            </div>
          </div>
        </div>

        {/* Manual run section */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-red-500" /> Manuel Çalıştır
          </h3>
          <div className="flex gap-3 flex-wrap">
            {[5, 10, 20, 50].map((count) => (
              <Button
                key={count}
                variant="outline"
                onClick={() => onRunNow(count)}
                disabled={running}
                className="gap-2"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rss className="w-3.5 h-3.5" />}
                {count} Haber Üret
              </Button>
            ))}
          </div>
          {stats?.lastRunAt && (
            <p className="text-xs text-gray-400 mt-3">
              Son çalışma: {new Date(stats.lastRunAt).toLocaleString("tr-TR")}
            </p>
          )}
        </div>

        <Button
          className="w-full bg-[#e61e25] hover:bg-[#c91820] text-white font-bold h-11"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Ayarları Kaydet
        </Button>
      </div>

      {/* Right: Quick-add sources */}
      <div className="space-y-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" /> Popüler Türk Haber Siteleri
          </h3>
          <p className="text-xs text-gray-400 mb-3">İşaretleyip toplu ekleyin veya satıra tıklayarak tek ekleyin</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {POPULAR_RSS.map((src) => {
              const checked = selectedPopularUrls.has(src.url);
              const alreadyAdded = rssRows.some((r) => r.url.trim() === src.url);
              return (
                <div
                  key={src.url}
                  className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs transition-colors ${
                    checked ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  } ${alreadyAdded ? "opacity-60" : ""}`}
                >
                  <Checkbox
                    id={`pop-rss-${src.label}`}
                    checked={checked}
                    onCheckedChange={() => togglePopularSelection(src.url)}
                    disabled={alreadyAdded}
                  />
                  <button
                    type="button"
                    onClick={() => addPopularSource(src.url, src.cat)}
                    disabled={alreadyAdded}
                    className="flex flex-1 items-center justify-between text-left min-w-0"
                  >
                    <span className="font-medium text-gray-700 truncate">{src.label}</span>
                    <span className="text-gray-400 text-[10px] truncate max-w-[100px] ml-2">
                      {alreadyAdded ? "ekli" : src.url.replace("https://", "")}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full text-xs"
            disabled={selectedPopularUrls.size === 0}
            onClick={addSelectedPopularSources}
          >
            Seçilenleri RSS kaynağı ekle ({selectedPopularUrls.size})
          </Button>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-3">Durum</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-500">OpenAI API</span>
              <span className={`font-bold flex items-center gap-1 ${stats?.hasApiKey ? "text-green-600" : "text-amber-600"}`}>
                {stats?.hasApiKey ? <><CheckCircle className="w-3.5 h-3.5" />Bağlı</> : <><AlertCircle className="w-3.5 h-3.5" />Yapılandırılmamış</>}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-500">Gemini API</span>
              <span className={`font-bold flex items-center gap-1 ${stats?.geminiConfigured ? "text-green-600" : "text-amber-600"}`}>
                {stats?.geminiConfigured ? <><CheckCircle className="w-3.5 h-3.5" />Bağlı</> : <><AlertCircle className="w-3.5 h-3.5" />Yapılandırılmamış</>}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-500">Otomatik Bot</span>
              <span className={`font-bold ${autoRunEnabled ? "text-green-600" : "text-gray-400"}`}>
                {autoRunEnabled ? "Aktif" : "Kapalı"}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Aktif Kaynak</span>
              <span className="font-bold text-gray-800">{activeRows.length} adet</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
          <div className="font-bold text-blue-900 mb-2">RSS Modu Nasıl Çalışır?</div>
          <div>1. RSS kaynaklarını ve kategorisini girin</div>
          <div>2. "Şimdi X Haber Üret" düğmesine basın</div>
          <div>3. AI her RSS haberini okuyup yeniden yazar</div>
          <div>4. Haberler "Haberler" bölümüne kaydedilir</div>
          <div className="mt-2 pt-2 border-t border-blue-200">Otomatik modu açarsanız bot belirtilen saatte çalışır</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KONU PLANI (Google News Style)
   ══════════════════════════════════════════════════════════════════ */
function KonuPlaniTab({
  hasApiKey,
  onSuccess,
  targetSiteIds,
  hmSitesList,
  onSharedTopicChange,
  onSharedCategoryChange,
  skipImages,
  onSkipImagesChange,
}: {
  hasApiKey: boolean;
  onSuccess: () => void;
  targetSiteIds: number[];
  hmSitesList: HmSiteRowPick[];
  sharedTopic: string;
  onSharedTopicChange: (v: string) => void;
  sharedCategoryId: string;
  onSharedCategoryChange: (v: string) => void;
  skipImages: boolean;
  onSkipImagesChange: (v: boolean) => void;
}) {
  const { data: categoriesRaw } = useAdminNewsCategories();
  const categories = asArray(categoriesRaw);
  const { toast } = useToast();
  const [topics, setTopics] = useState("Türkiye gündem");
  const [selectedCat, setSelectedCat] = useState("auto");
  const [preferredProvider, setPreferredProvider] = useState<PreferredProvider>("auto");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; target: number } | null>(null);
  const [results, setResults] = useState<{ title: string; id: number }[]>([]);

  const topicLines = topics.split("\n").map((l) => l.trim()).filter(Boolean);
  const isSingleTopic = topicLines.length === 1;
  const primaryTopic = topicLines[0] ?? "";

  useEffect(() => {
    onSharedTopicChange(primaryTopic);
  }, [primaryTopic, onSharedTopicChange]);

  useEffect(() => {
    onSharedCategoryChange(selectedCat === "auto" ? "" : selectedCat);
  }, [selectedCat, onSharedCategoryChange]);

  useEffect(() => {
    apiFetch("/ai/settings").then((s: AiSettings) => {
      setPreferredProvider(s.preferredProvider ?? "auto");
    });
  }, []);

  const siteScopeLabel =
    targetSiteIds.length > 0
      ? hmSitesList
          .filter((s) => targetSiteIds.includes(s.id))
          .map((s) => s.displayName)
          .join(", ")
      : "Merkez haber akışı";

  const resolveCategoryId = (): number | null => {
    if (selectedCat === "auto") return null;
    const catNum = Number(selectedCat);
    return Number.isFinite(catNum) ? catNum : null;
  };

  const runTopicBatch = async (totalCount: number) => {
    const trimmed = primaryTopic.trim();
    if (!trimmed) {
      toast({ title: "Konu girin", variant: "destructive" });
      return;
    }
    if (!hasApiKey) {
      toast({ title: "API anahtarı gerekli", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);
    const target = Math.max(1, Math.min(50, totalCount));
    setProgress({ done: 0, target });

    try {
      const { totalGenerated, allNews, lastError } = await executeTopicBatchRequest({
        topic: trimmed,
        totalCount: target,
        categoryId: resolveCategoryId(),
        siteIds: targetSiteIds,
        skipImages,
        onProgress: (done, t) => setProgress({ done, target: t }),
      });

      setResults(allNews);
      if (totalGenerated > 0) {
        toast({
          title: `${totalGenerated} haber üretildi`,
          description: `"${trimmed}" — Google News kaynaklı özgün içerik.`,
        });
        onSuccess();
      } else if (lastError) {
        toast({ title: "Üretim hatası", description: lastError, variant: "destructive" });
      } else {
        toast({
          title: "Yeni haber üretilemedi",
          description: "Kaynaklar zaten içe aktarılmış olabilir veya RSS boş döndü.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleMultiLineGenerate = async () => {
    if (!hasApiKey) {
      toast({ title: "API anahtarı gerekli", variant: "destructive" });
      return;
    }
    if (topicLines.length === 0) {
      toast({ title: "En az bir konu girin", variant: "destructive" });
      return;
    }
    if (isSingleTopic) {
      await runTopicBatch(1);
      return;
    }

    setLoading(true);
    setResults([]);
    const allNews: TopicBatchNews[] = [];

    try {
      for (const line of topicLines) {
        const { allNews: batchNews, lastError } = await executeTopicBatchRequest({
          topic: line,
          totalCount: 1,
          categoryId: resolveCategoryId(),
          siteIds: targetSiteIds,
          skipImages,
        });
        if (batchNews.length) allNews.push(...batchNews);
        else if (lastError) {
          toast({ title: `"${line}" atlandı`, description: lastError, variant: "destructive" });
        }
      }
      setResults(allNews);
      if (allNews.length) {
        toast({ title: `${allNews.length} haber üretildi`, description: `${topicLines.length} ayrı konu işlendi.` });
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" /> Konu Planı (Google News)
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Tek satırda bir konu yazıp 5–50 haber üretin (Google News taraması). Birden fazla satırda her satır ayrı konu olur;
          her biri için 1 haber üretilir.
        </p>

        <div className="mb-5 pb-5 border-b">
          <AiProviderSelect
            value={preferredProvider}
            onChange={setPreferredProvider}
            saveOnChange
            onSaved={onSuccess}
          />
        </div>

        <div className="mb-4">
          <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konu / Anahtar Kelimeler (her satır bir konu)</Label>
          <Textarea
            rows={10}
            placeholder={"Türkiye gündem\nEkonomi enflasyon\nSpor Süper Lig\nTeknik yapay zeka\nSağlık araştırma"}
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {isSingleTopic
              ? "Tek konu: aşağıdaki 5–50 düğmeleriyle toplu üretin."
              : `${topicLines.length} konu: her satır için 1 haber (çoklu haber için tek satır kullanın).`}
          </p>
        </div>

        <div className="mb-5">
          <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Varsayılan Kategori</Label>
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger><SelectValue placeholder="AI otomatik belirlesin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">AI Otomatik Belirlesin</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Hedef: </span>
          {siteScopeLabel}
        </div>

        <label className="mb-4 flex items-start gap-2 cursor-pointer text-sm text-slate-700">
          <Checkbox checked={skipImages} onCheckedChange={(c) => onSkipImagesChange(c === true)} className="mt-0.5" />
          <span>
            <span className="font-medium">Kapak görsellerini atla</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Daha hızlı üretim; og:image indirme ve sayfa taraması yapılmaz.
            </span>
          </span>
        </label>

        {isSingleTopic && (
          <>
            {progress && (
              <p className="mb-3 text-xs font-medium text-blue-700">
                Üretiliyor… {progress.done} / {progress.target} haber
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-2">
              {TOPIC_BATCH_COUNTS.map((count) => (
                <Button
                  key={count}
                  variant="outline"
                  onClick={() => runTopicBatch(count)}
                  disabled={loading || !hasApiKey || !primaryTopic}
                  className="gap-2 border-blue-200 text-blue-800 hover:bg-blue-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {count} Haber
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              İstekler tek tek gönderilir (Vercel ara katmanı zaman aşımını önler).
            </p>
          </>
        )}

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11"
          onClick={handleMultiLineGenerate}
          disabled={loading || !hasApiKey || !topics.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor
              {isSingleTopic && progress ? ` (${progress.done}/${progress.target})` : ` (${topicLines.length} konu)`}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />{" "}
              {isSingleTopic ? "1 Haber Üret" : `Her Satır İçin 1 Haber (${topicLines.length})`}
            </>
          )}
        </Button>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base mb-4">Üretilen Haberler</h3>
        {!results.length && !loading && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 border-2 border-dashed rounded-lg">
            <Globe className="w-10 h-10 mb-3" />
            <p className="text-sm">Üretilen haberler burada görünür</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
            <p className="text-sm">Google News taranıyor, AI yazıyor…</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((n) => (
              <div key={n.id} className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm flex-1 truncate">{n.title}</span>
                <a href={`/admin/haberler/${n.id}/duzenle`} className="text-xs text-blue-600 hover:underline shrink-0">Düzenle</a>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-bold text-sm text-gray-700 mb-2">Nasıl kullanılır?</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Tek satır + 5–50: aynı konudan toplu haber (Google News)</li>
            <li>• Çok satır: her satır farklı konu, satır başına 1 haber</li>
            <li>• Üstteki &quot;Şimdi 10 Haber Üret&quot; ilk satırdaki konuyu kullanır</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KONUYA GÖRE ÜRET (Google News RSS + AI)
   ══════════════════════════════════════════════════════════════════ */
function KonuyaGoreTab({
  hasApiKey,
  onSuccess,
  targetSiteIds,
  hmSitesList,
  sharedTopic,
  onSharedTopicChange,
  sharedCategoryId,
  onSharedCategoryChange,
  skipImages,
  onSkipImagesChange,
}: {
  hasApiKey: boolean;
  onSuccess: () => void;
  targetSiteIds: number[];
  hmSitesList: HmSiteRowPick[];
  sharedTopic: string;
  onSharedTopicChange: (v: string) => void;
  sharedCategoryId: string;
  onSharedCategoryChange: (v: string) => void;
  skipImages: boolean;
  onSkipImagesChange: (v: boolean) => void;
}) {
  const { data: categoriesRaw } = useAdminNewsCategories();
  const categories = asArray(categoriesRaw);
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [preferredProvider, setPreferredProvider] = useState<PreferredProvider>("auto");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; target: number } | null>(null);
  const [results, setResults] = useState<{ title: string; id: number }[]>([]);

  useEffect(() => {
    onSharedTopicChange(topic.trim());
  }, [topic, onSharedTopicChange]);

  useEffect(() => {
    onSharedCategoryChange(selectedCat);
  }, [selectedCat, onSharedCategoryChange]);

  useEffect(() => {
    apiFetch("/ai/settings").then((s: AiSettings) => {
      setPreferredProvider(s.preferredProvider ?? "auto");
    });
  }, []);

  const siteScopeLabel =
    targetSiteIds.length > 0
      ? hmSitesList
          .filter((s) => targetSiteIds.includes(s.id))
          .map((s) => s.displayName)
          .join(", ")
      : "Merkez haber akışı";

  const runTopic = async (totalCount: number) => {
    const trimmed = topic.trim();
    if (!trimmed) {
      toast({ title: "Konu girin", description: "Örn: sağlık, ekonomi, spor", variant: "destructive" });
      return;
    }
    if (!hasApiKey) {
      toast({ title: "API anahtarı gerekli", variant: "destructive" });
      return;
    }
    const catNum = selectedCat ? Number(selectedCat) : NaN;
    if (!Number.isFinite(catNum)) {
      toast({ title: "Kategori seçin", description: "Yayınlanacak kategoriyi listeden seçin.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setResults([]);

    try {
      const { totalGenerated, allNews, lastError } = await executeTopicBatchRequest({
        topic: trimmed,
        totalCount,
        categoryId: catNum,
        siteIds: targetSiteIds,
        skipImages,
        onProgress: (done, target) => setProgress({ done, target }),
      });

      setResults(allNews);
      if (totalGenerated > 0) {
        toast({
          title: `${totalGenerated} haber üretildi`,
          description: `"${trimmed}" konusunda Google News kaynaklı özgün içerik.`,
        });
        onSuccess();
      } else if (lastError) {
        toast({ title: "Üretim hatası", description: lastError, variant: "destructive" });
      } else {
        toast({
          title: "Yeni haber üretilemedi",
          description: "Tüm kaynaklar zaten içe aktarılmış olabilir veya RSS boş döndü.",
          variant: "destructive",
        });
      }
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Search className="w-5 h-5 text-violet-600" /> Konuya göre üret
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Tek bir konu girin (ör. sağlık, ekonomi, spor). Sistem Google News RSS ile güncel başlıkları tarar;
          AI her maddeyi özgün habere dönüştürür. Hedef site seçimi sayfa üstündeki listeden yapılır.
        </p>

        <div className="mb-5 pb-5 border-b">
          <AiProviderSelect
            value={preferredProvider}
            onChange={setPreferredProvider}
            saveOnChange
            onSaved={onSuccess}
          />
        </div>

        <div className="mb-4">
          <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konu / Anahtar kelime</Label>
          <Input
            placeholder="Sağlık, ekonomi, gündem, spor, iran savaşı..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="mb-4">
          <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yayın kategorisi</Label>
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger>
              <SelectValue placeholder="Kategori seçin" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Hedef: </span>
          {siteScopeLabel}
        </div>

        <label className="mb-4 flex items-start gap-2 cursor-pointer text-sm text-slate-700">
          <Checkbox checked={skipImages} onCheckedChange={(c) => onSkipImagesChange(c === true)} className="mt-0.5" />
          <span>
            <span className="font-medium">Kapak görsellerini atla</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Zaman aşımı yaşarsanız işaretleyin; og:image taraması yapılmaz.
            </span>
          </span>
        </label>

        {progress && (
          <p className="mb-3 text-xs font-medium text-violet-700">
            Üretiliyor… {progress.done} / {progress.target} haber
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-2">
          {TOPIC_BATCH_COUNTS.map((count) => (
            <Button
              key={count}
              variant="outline"
              onClick={() => runTopic(count)}
              disabled={running || !hasApiKey || !topic.trim() || !selectedCat}
              className="gap-2"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {count} Haber
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          İstekler tek tek gönderilir (Vercel ara katmanı zaman aşımını önler).
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base mb-4">Üretilen haberler</h3>
        {!results.length && !running && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 border-2 border-dashed rounded-lg">
            <Newspaper className="w-10 h-10 mb-3" />
            <p className="text-sm">Sonuçlar burada listelenir</p>
          </div>
        )}
        {running && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-500" />
            <p className="text-sm">Google News taranıyor, AI yazıyor…</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((n) => (
              <div key={n.id} className="flex items-center gap-2 p-3 border rounded-lg bg-violet-50">
                <CheckCircle className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="text-sm flex-1 truncate">{n.title}</span>
                <a href={`/admin/haberler/${n.id}/duzenle`} className="text-xs text-blue-600 hover:underline shrink-0">
                  Düzenle
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-bold text-sm text-gray-700 mb-2">Nasıl kullanılır?</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Üstte hedef HM sitesini işaretleyin veya merkez akışa bırakın</li>
            <li>• Kategori ve konu zorunludur; ardından 5–50 haber düğmesine basın</li>
            <li>• Yayın durumu AI Ayarları → taslak/yayında ayarından gelir</li>
            <li>• &quot;Konu Planı&quot; çok satırda konu başına 1 haber; tek satırda 5–50 toplu üretim</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SİTE BAKIMI (Duplikat temizleme)
   ══════════════════════════════════════════════════════════════════ */
function SiteBakimiTab({
  onSuccess,
  targetSiteIds,
  hmSitesList,
}: {
  onSuccess: () => void;
  targetSiteIds: number[];
  hmSitesList: HmSiteRowPick[];
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dupData, setDupData] = useState<{ totalNews: number; duplicateGroups: number; duplicates: any[] } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const siteScopeLabel =
    targetSiteIds.length > 0
      ? hmSitesList
          .filter((s) => targetSiteIds.includes(s.id))
          .map((s) => s.displayName)
          .join(", ") || `${targetSiteIds.length} site`
      : "Tüm siteler (site bazında gruplanır)";

  const scan = async () => {
    setLoading(true);
    const q = targetSiteIds.length ? `?siteIds=${targetSiteIds.join(",")}` : "";
    const res = await apiFetch(`/ai/duplicates${q}`);
    setDupData(res);
    setSelected(new Set());
    setLoading(false);
  };

  const groupOriginalId = (group: { originalId?: number; items: { id: number }[] }) =>
    group.originalId ?? Math.min(...group.items.map((item) => item.id));

  const isOriginalItem = (group: { originalId?: number; items: { id: number; isOriginal?: boolean }[] }, item: { id: number; isOriginal?: boolean }) =>
    item.isOriginal === true || item.id === groupOriginalId(group);

  const copyIdsInGroup = (group: { originalId?: number; items: { id: number; isOriginal?: boolean }[] }) =>
    group.items.filter((item) => !isOriginalItem(group, item)).map((item) => item.id);

  const toggleSelect = (id: number, group: { originalId?: number; items: { id: number; isOriginal?: boolean }[] }) => {
    const item = group.items.find((i) => i.id === id);
    if (!item || isOriginalItem(group, item)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllDups = () => {
    const ids: number[] = [];
    dupData?.duplicates.forEach((g) => copyIdsInGroup(g).forEach((id) => ids.push(id)));
    setSelected(new Set(ids));
  };

  const totalCopyCount =
    dupData?.duplicates.reduce((a: number, g: any) => a + copyIdsInGroup(g).length, 0) ?? 0;

  const deleteSelected = async () => {
    if (!selected.size) return;
    setDeleting(true);
    const res = await apiFetch("/ai/duplicates", { method: "DELETE", body: JSON.stringify({ ids: Array.from(selected) }) });
    setDeleting(false);
    if (res.ok) {
      toast({ title: `${res.deleted} duplikat haber silindi` });
      scan(); onSuccess();
    } else {
      toast({ title: "Hata", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" /> Duplikat Haber Temizleme
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Yalnızca <strong>aynı haber merkezi sitesinde</strong> (veya merkez akışta) aynı başlığa sahip kayıtları
          duplikat sayar. Farklı sitelerdeki aynı başlıklar birbirine karışmaz.
        </p>
        <p className="text-xs text-slate-500 mb-5">
          Tarama kapsamı: <span className="font-medium text-slate-700">{siteScopeLabel}</span>
          {targetSiteIds.length > 0
            ? " — üstteki hedef site seçimine göre."
            : " — üstte site seçerseniz yalnızca o siteler taranır."}
        </p>

        <div className="flex flex-wrap gap-3 mb-5">
          <Button onClick={scan} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Taranıyor..." : "Duplikatları Tara"}
          </Button>
          {dupData && dupData.duplicates.length > 0 && (
            <>
              <Button variant="outline" onClick={selectAllDups} className="gap-2">
                Tüm kopyaları seç (orijinal hariç){totalCopyCount > 0 ? ` (${totalCopyCount})` : ""}
              </Button>
              {selected.size > 0 && (
                <Button variant="destructive" onClick={deleteSelected} disabled={deleting} className="gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {selected.size} Haberi Sil
                </Button>
              )}
            </>
          )}
        </div>

        {dupData && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Toplam Haber", value: dupData.totalNews },
              { label: "Duplikat Grup", value: dupData.duplicateGroups, red: true },
              { label: "Seçili", value: selected.size },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg p-4 border text-center ${item.red && item.value > 0 ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
                <div className={`text-2xl font-black ${item.red && item.value > 0 ? "text-red-600" : "text-gray-800"}`}>{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {dupData?.duplicates.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p>Duplikat haber bulunamadı! Site temiz.</p>
          </div>
        )}

        {dupData && dupData.duplicates.length > 0 && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dupData.duplicates.map((group: any, gi: number) => (
              <div key={gi} className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b">
                  <span className="font-bold text-sm text-red-800">{group.count} adet duplikat</span>
                  <span className="text-xs font-semibold text-slate-700 bg-white/80 border border-red-100 px-2 py-0.5 rounded">
                    {group.siteName ?? "Merkez haber akışı"}
                  </span>
                  <span className="text-xs text-red-600 truncate max-w-xs w-full sm:w-auto sm:ml-auto">
                    "{group.key}"
                  </span>
                </div>
                {group.items.map((item: any) => {
                  const isOriginal = isOriginalItem(group, item);
                  return (
                  <div
                    key={item.id}
                    onClick={() => !isOriginal && toggleSelect(item.id, group)}
                    className={`flex items-center gap-3 px-4 py-2.5 border-t text-sm ${isOriginal ? "bg-green-50" : "hover:bg-gray-50 cursor-pointer"}`}
                  >
                    {isOriginal ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">ORİJİNAL</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        disabled={isOriginal}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(item.id, group)}
                        className="shrink-0"
                      />
                    )}
                    <span className="truncate flex-1">{item.title}</span>
                    <span className={`text-xs shrink-0 ${item.status === "published" ? "text-green-600" : "text-orange-500"}`}>
                      {item.status === "published" ? "Yayında" : "Taslak"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">#{item.id}</span>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KÖŞE YAZARLARI AI
   ══════════════════════════════════════════════════════════════════ */
function KoseYazarlariTab({ hasApiKey, onSuccess }: { hasApiKey: boolean; onSuccess: () => void }) {
  const { data: authorsRaw } = useListAuthors();
  const authors = asArray(authorsRaw);
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, { title: string; id: number }>>({});
  const [globalLoading, setGlobalLoading] = useState(false);

  // Global AI settings
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState("600");

  const generateOne = async (authorId: number, authorName: string) => {
    if (!hasApiKey) { toast({ title: "API anahtarı gerekli", variant: "destructive" }); return; }
    setLoadingId(authorId);
    const res = await apiFetch("/ai/columnist", {
      method: "POST",
      body: JSON.stringify({ authorId, topic: topic || "Güncel Gündem", wordCount: Number(wordCount) }),
    });
    setLoadingId(null);
    if (res.ok) {
      setResults((prev) => ({ ...prev, [authorId]: res.news }));
      toast({ title: `${authorName} için makale üretildi` });
      onSuccess();
    } else {
      toast({ title: "Hata", description: res.error, variant: "destructive" });
    }
  };

  const generateAll = async () => {
    if (!authors.length || !hasApiKey) return;
    setGlobalLoading(true);
    for (const author of authors) {
      setLoadingId(author.id);
      const res = await apiFetch("/ai/columnist", {
        method: "POST",
        body: JSON.stringify({ authorId: author.id, topic: topic || "Güncel Gündem", wordCount: Number(wordCount) }),
      });
      if (res.ok) setResults((prev) => ({ ...prev, [author.id]: res.news }));
    }
    setLoadingId(null);
    setGlobalLoading(false);
    toast({ title: `${authors.length} yazar için makale üretildi` });
    onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Global AI settings */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" /> AI Yazar Ayarları (Hepsi için geçerli)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konu / Başlık Yönlendirmesi</Label>
            <Input
              placeholder="Örn: Güncel Türkiye Gündemi (boş=genel)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Kelime Sayısı</Label>
            <Select value={wordCount} onValueChange={setWordCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300 kelime (kısa)</SelectItem>
                <SelectItem value="600">600 kelime (orta)</SelectItem>
                <SelectItem value="900">900 kelime (uzun)</SelectItem>
                <SelectItem value="1200">1200 kelime (detaylı)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
              onClick={generateAll}
              disabled={globalLoading || !hasApiKey || !authors.length}
            >
              {globalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Tüm Yazarlar İçin Üret
            </Button>
          </div>
        </div>
      </div>

      {/* Authors table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Yazar</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Tür / Unvan</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Son Üretilen Makale</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!authors.length && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Yazar bulunamadı. Önce yazar ekleyin.</p>
                </td>
              </tr>
            )}
            {authors.map((author) => (
              <tr key={author.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                      {author.avatarUrl
                        ? <img src={resolveClientMediaSrc(author.avatarUrl) || author.avatarUrl} className="w-full h-full object-cover" />
                        : <span className="font-bold text-purple-600">{author.name.charAt(0)}</span>
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{author.name}</div>
                      {author.bio && <div className="text-xs text-gray-400 truncate max-w-[150px]">{author.bio}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                    {author.title || "Köşe Yazarı"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {results[author.id] ? (
                    <a href={`/admin/haberler/${results[author.id].id}/duzenle`} className="text-xs text-blue-600 hover:underline line-clamp-2">
                      {results[author.id].title}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                    onClick={() => generateOne(author.id, author.name)}
                    disabled={loadingId === author.id || !hasApiKey}
                  >
                    {loadingId === author.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Yazıyor...</>
                      : <><Sparkles className="w-3 h-3" /> Yazar Üret</>
                    }
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasApiKey && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">AI Ayarları sekmesinden OpenAI API anahtarı girin.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RSS DİREKT (AI'sz)
   ══════════════════════════════════════════════════════════════════ */
function RssDirektTab({ onSuccess }: { onSuccess: () => void }) {
  const { data: categoriesRaw } = useAdminNewsCategories();
  const categories = asArray(categoriesRaw);
  const { toast } = useToast();
  const [rssUrl, setRssUrl] = useState("");
  const [catId, setCatId] = useState("");
  const [maxItems, setMaxItems] = useState("10");
  const [fetchAll, setFetchAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ title: string; id: number }[]>([]);

  const handleImport = async () => {
    if (!rssUrl.trim()) return;
    setLoading(true);
    setResults([]);
    const max = Math.min(500, Math.max(1, Number(maxItems) || 10));
    const catNum = catId ? Number(catId) : undefined;
    const res = await apiFetch("/ai/rss-import", {
      method: "POST",
      body: JSON.stringify({
        rssUrl: rssUrl.trim(),
        maxItems: fetchAll ? 0 : max,
        fetchAll,
        categoryId: catNum != null && Number.isFinite(catNum) ? catNum : null,
      }),
    });
    setLoading(false);
    if (res.ok && Array.isArray(res.imported)) {
      setResults(res.imported.map((row: { id: number; title: string }) => ({ id: row.id, title: row.title })));
      const skipped = typeof res.skipped === "number" ? res.skipped : 0;
      toast({
        title: `${res.imported.length} haber kaydedildi`,
        description: skipped > 0 ? `${skipped} öğe atlandı (çoğaltma veya boş).` : "Haberler panelinden düzenleyebilirsiniz.",
      });
      onSuccess();
    } else {
      toast({ title: "İçe aktarma başarısız", description: res.error || "Sunucu hatası", variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Rss className="w-5 h-5 text-orange-500" /> RSS Direkt İçe Aktar (AI'sz)
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          AI kullanmadan RSS haberlerini doğrudan çeker. Haberler düzenlemek için taslak olarak kaydedilir.
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">RSS URL</Label>
            <div className="flex gap-2">
              <Input placeholder="https://example.com/feed.rss" value={rssUrl} onChange={(e) => setRssUrl(e.target.value)} className="flex-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Kategori</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Maks. Haber</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxItems}
                disabled={fetchAll}
                onChange={(e) => setMaxItems(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <Checkbox
              id="rss-direkt-fetch-all"
              checked={fetchAll}
              onCheckedChange={(checked) => setFetchAll(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="rss-direkt-fetch-all" className="cursor-pointer text-sm leading-tight">
              <span className="font-semibold">Tümünü çek</span>
              <span className="text-muted-foreground block text-[11px] mt-0.5">
                Beslemedeki tüm RSS sayfalarını tarar (WordPress genelde sayfa başına 10 haber verir; en fazla 500 öğe).
              </span>
            </label>
          </div>
        </div>

        <Button
          className="w-full gap-2 h-11"
          onClick={handleImport}
          disabled={loading || !rssUrl}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Çekiliyor...</> : <><Rss className="w-4 h-4" /> RSS'i İçe Aktar</>}
        </Button>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base mb-4">Çekilen Haberler</h3>
        {!results.length && !loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 border-2 border-dashed rounded-lg">
            <Rss className="w-10 h-10 mb-3" />
            <p className="text-sm">İçe aktarılan haberler burada görünür</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((n) => (
              <div key={n.id} className="flex items-start gap-2 p-3 border rounded-lg">
                <Newspaper className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 flex-1">{n.title}</span>
                <a href={`/admin/haberler/${n.id}/duzenle`} className="text-xs text-blue-600 hover:underline shrink-0">Düzenle</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VIDEO TV (bağlantı)
   ══════════════════════════════════════════════════════════════════ */
function VideoTvTab() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[
        { label: "Yektube Studio", desc: "YouTube kanalları ve playlist yönetimi", icon: Video, href: "/yp/admin" },
        { label: "Yektube Görüntüle", desc: "Video ve kanallar", icon: Play, href: "/yektube" },
        { label: "Kanal Ekle", desc: "Yeni YouTube kanalı veya playlist ekle", icon: Rss, href: "/yp/admin/kaynaklar" },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="bg-white border rounded-xl p-6 shadow-sm hover:border-red-400 hover:shadow-md transition-all flex flex-col"
        >
          <item.icon className="w-8 h-8 text-red-500 mb-3" />
          <div className="font-bold text-gray-900 mb-1">{item.label}</div>
          <div className="text-xs text-gray-500 flex-1">{item.desc}</div>
          <div className="flex items-center gap-1 text-xs text-red-500 font-medium mt-3">
            Git <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </a>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   İÇERİKLER
   ══════════════════════════════════════════════════════════════════ */
function IceriklerTab() {
  const shortcuts = [
    {
      href: "/admin/haberler",
      icon: Newspaper,
      title: "Eklenen Haberler",
      desc: "Bu eklentinin oluşturduğu tüm haberler (Klasik, RSS Direkt, Köşe).",
      color: "text-blue-600 bg-blue-50",
    },
    {
      href: "/admin/haberler",
      icon: Clock,
      title: "İşlem Geçmişi",
      desc: "Otomatik çalışmalar, hata kayıtları ve detaylı log.",
      color: "text-purple-600 bg-purple-50",
    },
    {
      href: "/admin/toplu-ice-aktar",
      icon: FileText,
      title: "İçe / Dışa Aktarım",
      desc: "Haberleri/kategorileri JSON ile dışa aktar, başka kuruluma yükle.",
      color: "text-orange-600 bg-orange-50",
    },
    {
      href: "/yp/admin/kaynaklar",
      icon: Video,
      title: "Yektube — Kaynaklar",
      desc: "YouTube/RSS video kaynaklarını yönet.",
      color: "text-red-600 bg-red-50",
    },
    {
      href: "/yp/admin/videolar",
      icon: Play,
      title: "Yektube — Videolar",
      desc: "Çekilmiş tüm videoları görüntüle.",
      color: "text-red-600 bg-red-50",
    },
    {
      href: "/yp/admin/videolar",
      icon: Star,
      title: "Yektube — Öne Çıkanlar",
      desc: "Öne çıkan videoları yönet.",
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      href: "/yp/admin/hazir-kanallar",
      icon: Tag,
      title: "Yektube — Hazır kanallar",
      desc: "Preset kanal listesinden ekle.",
      color: "text-green-600 bg-green-50",
    },
    {
      href: "/yp/admin/ayarlar",
      icon: Settings,
      title: "Yektube — Ayarlar",
      desc: "YouTube API ve görünüm ayarları.",
      color: "text-zinc-600 bg-zinc-50",
    },
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-bold text-lg mb-1">İçerikler</h3>
      <p className="text-gray-500 text-sm mb-6">
        Sol menüyü temiz tutmak için tüm içerik yönetim sayfaları burada toplandı. Açmak istediğinize tıklayın.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shortcuts.map((item) => (
          <a
            key={item.title}
            href={item.href}
            className="group p-4 border rounded-xl hover:border-zinc-400 hover:shadow-md transition-all bg-white"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm mb-1 group-hover:text-[#e61e25] transition-colors">{item.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-6">
        İpucu: Haber Blokları ve Köşe Yazarları için yukarıdaki sekmeleri kullanın.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AI TEK ÜRET
   ══════════════════════════════════════════════════════════════════ */
function TekUretTab({ hasApiKey, onSuccess }: { hasApiKey: boolean; onSuccess: () => void }) {
  const { data: categoriesRaw } = useAdminNewsCategories();
  const categories = asArray(categoriesRaw);
  const { data: authorsRaw } = useListAuthors();
  const authors = asArray(authorsRaw);
  const { toast } = useToast();

  const [mode, setMode] = useState<"topic" | "url" | "keyword">("topic");
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [wordCount, setWordCount] = useState("600");
  const [postStatus, setPostStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; id: number; status: string } | null>(null);

  const handleGenerate = async () => {
    if (!hasApiKey) { toast({ title: "API anahtarı gerekli", variant: "destructive" }); return; }
    setLoading(true);
    setResult(null);
    const cat = categoryId ? Number(categoryId) : undefined;
    const res = await apiFetch("/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        mode,
        url,
        topic,
        keyword,
        categoryId: cat != null && Number.isFinite(cat) ? cat : undefined,
        authorId: authorId || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setResult(res.news);
      toast({ title: "Makale üretildi!", description: res.news.title });
      onSuccess();
    } else {
      toast({ title: "Hata", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" /> AI Tek Üret — Sayfa veya Haber
        </h3>

        {/* API key status bar */}
        <div className={`flex items-center gap-2 p-2.5 rounded-lg mb-5 text-xs font-medium ${hasApiKey ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {hasApiKey ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {hasApiKey ? `OpenAI API bağlı — Hazır` : "API anahtarı girilmemiş — Ayarlar sekmesine gidin"}
        </div>

        {/* Mode buttons */}
        <div className="mb-4">
          <Label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Üretim Modu</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "topic", label: "Konu Gir", icon: FileText },
              { value: "url", label: "URL'den Üret", icon: Link2 },
              { value: "keyword", label: "Anahtar Kelime", icon: Tag },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value as any)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${mode === m.value ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}
              >
                <m.icon className="w-4 h-4" />{m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "url" && (
          <div className="mb-4">
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Haber URL'si</Label>
            <Input placeholder="https://example.com/haber/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Sayfa içeriği çekilerek AI ile yeniden yazılır</p>
          </div>
        )}
        {mode === "topic" && (
          <div className="mb-4">
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konu / Başlık</Label>
            <Input placeholder="Örn: Türkiye'nin uzay programı son gelişmeler" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        )}
        {mode === "keyword" && (
          <div className="mb-4">
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Anahtar Kelimeler</Label>
            <Input placeholder="Örn: yapay zeka, teknoloji, Türkiye (virgülle ayırın)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yazar</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
              <SelectContent>
                {authors.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Kelime Sayısı</Label>
            <Select value={wordCount} onValueChange={setWordCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300 kelime</SelectItem>
                <SelectItem value="600">600 kelime</SelectItem>
                <SelectItem value="900">900 kelime</SelectItem>
                <SelectItem value="1200">1200 kelime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yayın Durumu</Label>
            <Select value={postStatus} onValueChange={setPostStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="published">Yayınla</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full bg-[#e61e25] hover:bg-[#c91820] text-white font-bold gap-2 h-11"
          onClick={handleGenerate}
          disabled={loading || !hasApiKey || (!url && !topic && !keyword)}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> AI Üretiyor...</> : <><Sparkles className="w-4 h-4" /> Tek Üret</>}
        </Button>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base mb-5">Üretim Sonucu</h3>

        {loading && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-500" />
            <p className="text-sm font-medium">AI makale yazıyor...</p>
            <p className="text-xs mt-1">Bu 10-30 saniye sürebilir</p>
          </div>
        )}
        {!loading && !result && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 border-2 border-dashed rounded-lg">
            <Sparkles className="w-10 h-10 mb-3" />
            <p className="text-sm">Makale üretildiğinde burada görünür</p>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">Makale Başarıyla Üretildi!</span>
              </div>
              <h4 className="font-bold text-gray-900 text-base leading-snug">{result.title}</h4>
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.status === "published" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {result.status === "published" ? "Yayında" : "Taslak"}
                </span>
                <span className="text-xs text-gray-500">ID: #{result.id}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`/admin/haberler/${result.id}/duzenle`} className="flex-1 text-center py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
                Düzenle
              </a>
              <button onClick={() => setResult(null)} className="px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Temizle
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1.5">
          <div className="font-bold text-gray-700 mb-2">İpuçları</div>
          <div>• <strong>URL Modu:</strong> Haber linkini yapıştırın, AI içeriği yeniden yazar</div>
          <div>• <strong>Konu Modu:</strong> Detaylı konu girin, AI özgün makale yazar</div>
          <div>• <strong>Anahtar Kelime:</strong> Birden fazla kelime virgülle ayırın</div>
          <div>• Üretilen makaleler Haberler bölümünde görünür</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AI AYARLARI
   ══════════════════════════════════════════════════════════════════ */
function AyarlarTab({ onSave }: { onSave: () => void }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    geminiConfigured?: boolean;
    deepseekConfigured?: boolean;
    geminiKeyHint?: string | null;
    hasAnyAiKey?: boolean;
  } | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [language, setLanguage] = useState("tr");
  const [preferredProvider, setPreferredProvider] = useState<PreferredProvider>("auto");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);

  const loadAiStatus = () => {
    apiFetch("/ai/status").then((s) => {
      if (s && !s.error) setAiStatus(s);
    }).catch(() => {});
  };

  useEffect(() => {
    apiFetch("/ai/settings").then((s: AiSettings) => {
      setSettings(s);
      setModel(s.openaiModel);
      setLanguage(s.language);
      setPreferredProvider(s.preferredProvider ?? "auto");
    });
    loadAiStatus();
  }, []);

  const canTestAi = aiStatus?.hasAnyAiKey ?? settings?.hasApiKey ?? false;

  const handleSave = async () => {
    setSaving(true);
    const body: any = { openaiModel: model, language, preferredProvider };
    if (apiKey.trim()) body.openaiApiKey = apiKey.trim();
    const res = await apiFetch("/ai/settings", { method: "PUT", body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok !== false) {
      const fresh = await apiFetch("/ai/settings");
      setSettings(fresh as AiSettings);
      setModel((fresh as AiSettings).openaiModel || model);
      setLanguage((fresh as AiSettings).language || language);
      toast({ title: "API ayarları kaydedildi", description: (fresh as AiSettings).hasApiKey ? "OpenAI anahtarı kaydedildi." : "Model/dil ayarları kaydedildi." });
      setApiKey("");
      onSave();
      loadAiStatus();
    } else {
      toast({ title: "Hata", description: res.error, variant: "destructive" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const res = await apiFetch("/ai/test", { method: "POST" });
    setTesting(false);
    if (res.ok) {
      const providerLabel =
        res.provider === "gemini"
          ? "Gemini"
          : res.provider === "deepseek"
            ? "DeepSeek"
            : "OpenAI";
      toast({ title: `Bağlantı başarılı!`, description: `${providerLabel} — ${res.model}` });
    } else {
      toast({ title: "Bağlantı başarısız", description: res.error, variant: "destructive" });
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    const res = await apiFetch("/ai/test-gemini", { method: "POST" });
    setTestingGemini(false);
    if (res.ok) {
      toast({ title: "Gemini bağlantısı başarılı", description: "Genel Ayarlar anahtarı ile API yanıt verdi." });
    } else {
      toast({
        title: "Gemini testi başarısız",
        description: res.error || res.detail || "Anahtarı ve Generative Language API'yi kontrol edin.",
        variant: "destructive",
      });
    }
  };

  const geminiSettingsHref = "/admin/ayarlar?tab=entegrasyon#yapay-zeka";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#e61e25]" /> Yapay Zeka Sağlayıcısı
          </h3>
          <AiProviderSelect value={preferredProvider} onChange={setPreferredProvider} />
          <p className="text-xs text-gray-500">
            OpenAI anahtarı bu sekmede; Gemini ve DeepSeek anahtarları{" "}
            <Link href={geminiSettingsHref} className="text-blue-600 hover:underline">
              Genel Ayarlar → Yapay zekâ
            </Link>{" "}
            bölümündedir.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-500" /> OpenAI API Bağlantısı
          </h3>

          <div className={`flex items-center gap-3 p-3 rounded-lg border ${settings?.hasApiKey ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            {settings?.hasApiKey ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <div>
              <div className={`font-bold text-sm ${settings?.hasApiKey ? "text-green-800" : "text-red-800"}`}>
                {settings?.hasApiKey ? "API anahtarı kayıtlı" : "API anahtarı girilmemiş"}
              </div>
              <div className="text-xs text-gray-500">
                {settings?.hasApiKey ? "Yeni bir anahtar girerek güncelleyebilirsiniz" : "OpenAI API anahtarınızı aşağıya girin"}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">OpenAI API Anahtarı</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="password"
                placeholder={settings?.hasApiKey ? "sk-•••• (değiştirmek için girin)" : "sk-proj-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-10 font-mono"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                platform.openai.com
              </a> adresinden API anahtarı alabilirsiniz
            </p>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Önerilen — Hızlı &amp; Ucuz)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o (Güçlü, Daha Pahalı)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (En Ekonomik)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">İçerik Dili</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">İngilizce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1 bg-[#e61e25] hover:bg-[#c91820] text-white gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Kaydet
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !canTestAi} className="gap-2">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Test Et
            </Button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" /> Google Gemini
          </h3>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${aiStatus?.geminiConfigured ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            {aiStatus?.geminiConfigured ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0">
              <div className={`font-bold text-sm ${aiStatus?.geminiConfigured ? "text-green-800" : "text-amber-900"}`}>
                {aiStatus?.geminiConfigured ? "Bağlı" : "Yapılandırılmamış"}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Anahtar <strong>Anahtar Yönetim → Genel Ayarlar → Yapay zekâ</strong> bölümünde tanımlı.
                OpenAI kotası dolunca RSS ve konu üretimi otomatik Gemini&apos;ye düşer.
              </p>
              {aiStatus?.geminiConfigured && aiStatus?.geminiKeyHint ? (
                <p className="text-xs text-gray-500 mt-1">
                  Kayıtlı anahtar: <span className="font-mono font-semibold">{aiStatus.geminiKeyHint}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleTestGemini}
              disabled={testingGemini || !aiStatus?.geminiConfigured}
            >
              {testingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Gemini API Test
            </Button>
            <Button variant="outline" className="flex-1 gap-2" asChild>
              <Link href={geminiSettingsHref}>
                Genel Ayarlarda düzenle
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Sistem Bilgisi
          </h3>
          <div className="space-y-3 text-sm">
            {[
              {
                label: "Seçili sağlayıcı",
                value:
                  AI_PROVIDER_OPTIONS.find((o) => o.value === (preferredProvider ?? "auto"))?.label ?? "Otomatik",
                mono: true,
              },
              { label: "Aktif Model", value: settings?.openaiModel ?? "-", mono: true },
              { label: "İçerik Dili", value: settings?.language === "tr" ? "Türkçe" : "İngilizce", mono: true },
              {
                label: "Gemini API",
                value: aiStatus?.geminiConfigured ? "Bağlı" : "Yapılandırılmamış",
                status: true,
                ok: !!aiStatus?.geminiConfigured,
              },
              {
                label: "DeepSeek API",
                value: aiStatus?.deepseekConfigured ? "Bağlı" : "Yapılandırılmamış",
                status: true,
                ok: !!aiStatus?.deepseekConfigured,
              },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b">
                <span className="text-gray-500">{item.label}</span>
                <span
                  className={
                    item.status
                      ? `font-bold ${item.ok ? "text-green-600" : "text-amber-600"}`
                      : "font-mono font-bold text-gray-900"
                  }
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-xs text-blue-700 space-y-2">
          <div className="font-bold text-blue-900 text-sm mb-2">Maliyet Tahmini</div>
          <div>• GPT-4o Mini: ~$0.15 / 1M token</div>
          <div>• Her haber: ~1.000–2.000 token</div>
          <div>• 1.000 haber ≈ $0.15–$0.30</div>
          <div className="border-t border-blue-200 pt-2 mt-1">
            GPT-4o Mini günlük 1.000 haber üretmek için yaklaşık $0.30 harcarsınız
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm text-xs text-gray-500 space-y-1.5">
          <div className="font-bold text-gray-700 text-sm mb-2">Notlar</div>
          <div>• API anahtarı şifreli olarak saklanır</div>
          <div>• Anahtarınızı kimseyle paylaşmayın</div>
          <div>• Kullanımı OpenAI Dashboard'dan takip edin</div>
          <div>• Rate limit aşılırsa otomatik yavaşlar</div>
          <div>• OpenAI kotası dolunca Gemini yedek devreye girer (Genel Ayarlar → Yapay zekâ)</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PODCAST ÜRET (ElevenLabs)
   ══════════════════════════════════════════════════════════════════ */
function PodcastUretTab() {
  const { toast } = useToast();
  const LS_KEY = "ahenkpress_elevenlabs_settings";
  const loadLS = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  };
  const saved = loadLS();

  const [apiKey, setApiKey] = useState(saved.apiKey || "");
  const [model, setModel] = useState(saved.model || "eleven_multilingual_v2");
  const [voiceId, setVoiceId] = useState(saved.voiceId || "");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [subject, setSubject] = useState("");
  const [script, setScript] = useState("");
  const [duration, setDuration] = useState("3");
  const [postStatus, setPostStatusP] = useState("draft");
  const [contentType, setContentType] = useState("haber");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [history, setHistory] = useState<{ title: string; date: string; url: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("ahenkpress_podcast_history") || "[]"); } catch { return []; }
  });

  const saveSettings = () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ apiKey, model, voiceId }));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleGenerate = async () => {
    if (!subject.trim() || !voiceId.trim()) return;
    setGenerating(true);
    setResult(null);
    const text = (script.trim() || subject.trim()).slice(0, 8000);
    const res = await apiFetch("/ai/elevenlabs-tts", {
      method: "POST",
      body: JSON.stringify({ text, voiceId: voiceId.trim(), apiKey: apiKey.trim(), modelId: model }),
    });
    setGenerating(false);
    if (res.ok && res.url) {
      const newEntry = {
        title: subject.slice(0, 120),
        date: new Date().toLocaleDateString("tr-TR"),
        url: res.url as string,
      };
      const updated = [newEntry, ...history.slice(0, 9)];
      setHistory(updated);
      localStorage.setItem("ahenkpress_podcast_history", JSON.stringify(updated));
      setResult(`Ses dosyası hazır (${duration} dk. hedefi). Aşağıdan dinleyebilir veya indirebilirsiniz.`);
      toast({ title: "Podcast sesi oluşturuldu" });
    } else {
      const err = res.error || "ElevenLabs isteği başarısız";
      toast({ title: "Hata", description: err, variant: "destructive" });
      setResult(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Not:</strong> ElevenLabs API anahtarı ve Voice ID gereklidir. API anahtarınızı{" "}
        <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" className="underline font-medium">elevenlabs.io</a>{" "}
        adresinden alabilirsiniz. Üretilen MP3 sunucuya kaydedilir; haber kaydı oluşturmaz.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-primary" /> ElevenLabs Ayarları
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">API Anahtarı</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-el-..."
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eleven_multilingual_v2">Multilingual v2 (Önerilen)</SelectItem>
                    <SelectItem value="eleven_monolingual_v1">Monolingual v1</SelectItem>
                    <SelectItem value="eleven_turbo_v2">Turbo v2 (Hızlı)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Ses (Voice ID)</Label>
                <Input
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="ElevenLabs Voice ID"
                />
                <p className="text-xs text-gray-400 mt-1">ElevenLabs panelinizden Voice ID kopyalayın</p>
              </div>
              <Button
                className={`w-full gap-2 ${settingsSaved ? "bg-green-600 hover:bg-green-600" : "bg-primary hover:bg-primary/90"}`}
                onClick={saveSettings}
              >
                {settingsSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {settingsSaved ? "Kaydedildi!" : "Ayarları Kaydet"}
              </Button>
            </div>
          </div>
        </div>

        {/* Center: Generate */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Mic className="w-4 h-4 text-primary" /> Podcast Üret
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Hedef Tür</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haber">Haber Özeti</SelectItem>
                    <SelectItem value="yorum">Yorum & Analiz</SelectItem>
                    <SelectItem value="roportaj">Röportaj</SelectItem>
                    <SelectItem value="gundem">Gündem Bülteni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konu / Yönerge</Label>
                <Textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Podcast konusu veya haber metni..."
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Hazır Script (Opsiyonel)</Label>
                <Textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Hazır script varsa buraya yapıştırın. Boş bırakırsanız AI script oluşturur."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Süre Hedefi (dakika)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">~1 dakika</SelectItem>
                      <SelectItem value="3">~3 dakika</SelectItem>
                      <SelectItem value="5">~5 dakika</SelectItem>
                      <SelectItem value="10">~10 dakika</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yayın Durumu</Label>
                  <Select value={postStatus} onValueChange={setPostStatusP}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="published">Yayınla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {result}
                </div>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90 gap-2"
                onClick={handleGenerate}
                disabled={generating || !subject.trim() || !apiKey.trim() || !voiceId.trim()}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {generating ? "Ses oluşturuluyor..." : "Podcast Üret"}
              </Button>
              {(!apiKey.trim() || !voiceId.trim()) && (
                <p className="text-xs text-red-500 text-center">API anahtarı ve Voice ID gerekli</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Geçmiş Podcast'ler
          </h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-xs text-gray-400">{h.date}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {h.url && h.url !== "#" && (
                    <audio controls className="h-8 max-w-[200px]" src={h.url} />
                  )}
                  <a
                    href={h.url && h.url !== "#" ? h.url : "#"}
                    download
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> İndir
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VIDEO ÜRET (HeyGen AI Avatar)
   ══════════════════════════════════════════════════════════════════ */
function VideoUretTab() {
  const { toast } = useToast();
  const LS_KEY = "ahenkpress_heygen_settings";
  const loadLS = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  };
  const saved = loadLS();

  const [apiKey, setApiKeyV] = useState(saved.apiKey || "");
  const [avatarId, setAvatarId] = useState(saved.avatarId || "");
  const [voiceIdHg, setVoiceIdHg] = useState(saved.voiceIdHg || "");
  const [useAvatar, setUseAvatar] = useState(saved.useAvatar !== false);
  const [useTurkish, setUseTurkish] = useState(saved.useTurkish !== false);
  const [settingsSaved, setSettingsSavedV] = useState(false);

  const [subject, setSubjectV] = useState("");
  const [script, setScriptV] = useState("");
  const [wordLimit, setWordLimit] = useState("150");
  const [resolution, setResolution] = useState("1280x720");
  const [ratio, setRatio] = useState("16:9");
  const [publishStatus, setPublishStatus] = useState("draft");
  const [generating, setGeneratingV] = useState(false);
  const [result, setResultV] = useState<string | null>(null);
  const [lastVideoUrl, setLastVideoUrl] = useState<string | null>(null);

  const [history, setHistoryV] = useState<{ title: string; date: string; videoUrl?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("ahenkpress_video_history") || "[]"); } catch { return []; }
  });

  const saveSettings = () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ apiKey, avatarId, voiceIdHg, useAvatar, useTurkish }));
    setSettingsSavedV(true);
    setTimeout(() => setSettingsSavedV(false), 2000);
  };

  const handleGenerate = async () => {
    if (!subject.trim() || !apiKey.trim() || !avatarId.trim() || !voiceIdHg.trim()) return;
    setGeneratingV(true);
    setResultV(null);
    setLastVideoUrl(null);
    const parts = resolution.toLowerCase().split("x").map((s) => Number(s.trim()));
    const width = Number.isFinite(parts[0]) ? parts[0]! : 1280;
    const height = Number.isFinite(parts[1]) ? parts[1]! : 720;
    const sec = Number(wordLimit) || 150;
    const lim = Math.min(4800, Math.max(200, sec * 32));
    const raw = (script.trim() || subject.trim()).slice(0, lim);
    const scriptText = useTurkish ? `Türkçe olarak, net telaffuzla oku:\n\n${raw}`.slice(0, lim) : raw;
    const res = await apiFetch("/ai/heygen-video", {
      method: "POST",
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        script: scriptText,
        avatarId: avatarId.trim(),
        voiceId: voiceIdHg.trim(),
        title: subject.slice(0, 200),
        width,
        height,
      }),
    });
    setGeneratingV(false);
    if (res.ok && res.videoUrl) {
      const url = res.videoUrl as string;
      setLastVideoUrl(url);
      setResultV(`Video hazır: "${subject.slice(0, 80)}" (${resolution}). Bağlantı HeyGen CDN üzerindedir (süreli).`);
      const newEntry = { title: subject.slice(0, 120), date: new Date().toLocaleDateString("tr-TR"), videoUrl: url };
      const updated = [newEntry, ...history.slice(0, 9)];
      setHistoryV(updated);
      localStorage.setItem("ahenkpress_video_history", JSON.stringify(updated));
      toast({ title: "HeyGen videosu tamamlandı" });
    } else {
      const err = (res.error as string) || "HeyGen isteği başarısız";
      toast({ title: "Hata", description: err, variant: "destructive" });
      setResultV(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Not:</strong> HeyGen <code className="text-xs bg-white/60 px-1 rounded">x-api-key</code>,{" "}
        <strong>avatar_id</strong> ve <strong>voice_id</strong> gerekir (HeyGen API: avatar / ses listelerinden).
        İşlem sunucuda başlar ve tamamlanana kadar beklenir (birkaç dakika sürebilir). Dönen MP4 bağlantısı HeyGen tarafında süreli olarak sunulur.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-primary" /> HeyGen Ayarları
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">HeyGen API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKeyV(e.target.value)}
                  placeholder="eyJ..."
                />
                <a
                  href="https://app.heygen.com/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 block"
                >
                  app.heygen.com/settings adresinden API Key alın
                </a>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Avatar ID</Label>
                <Input
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                  placeholder="HeyGen avatar_id"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">List Avatars (v2) API veya HeyGen arayüzünden kopyalayın.</p>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Voice ID</Label>
                <Input
                  value={voiceIdHg}
                  onChange={(e) => setVoiceIdHg(e.target.value)}
                  placeholder="HeyGen voice_id"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">Türkçe destekli bir ses seçin (List Voices v2).</p>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Switch checked={useAvatar} onCheckedChange={setUseAvatar} />
                <div>
                  <Label className="text-sm font-medium">Avatar Listesi</Label>
                  <p className="text-xs text-gray-400">Özel avatar yüklü değilse HeyGen varsayılan avatarı kullanılır</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <Switch checked={useTurkish} onCheckedChange={setUseTurkish} />
                <div>
                  <Label className="text-sm font-medium">Türkçe Seslendirme</Label>
                  <p className="text-xs text-gray-400">Türkçe içerik için önerilen ses şablonu</p>
                </div>
              </div>
              <Button
                className={`w-full gap-2 ${settingsSaved ? "bg-green-600 hover:bg-green-600" : "bg-primary hover:bg-primary/90"}`}
                onClick={saveSettings}
              >
                {settingsSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {settingsSaved ? "Kaydedildi!" : "Ayarları Kaydet"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Generate */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Clapperboard className="w-4 h-4 text-primary" /> Video Üret
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Başlık (konuşma metni)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubjectV(e.target.value)}
                  placeholder="Örn: Ankara'da bugün hava durumu..."
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Konuşma / Senaryo</Label>
                <Textarea
                  value={script}
                  onChange={(e) => setScriptV(e.target.value)}
                  placeholder="Hazır script — En iyi sonuç için 175–400 kelime arasında tutun."
                  rows={5}
                />
                <p className="text-xs text-gray-400 mt-1">Hazır script: kelime sayısı en az 100, en az 400 kelime olmalıdır</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Hedef uzunluk</Label>
                  <div className="flex gap-2">
                    <Select value={wordLimit} onValueChange={setWordLimit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">~60 sn (200 k.)</SelectItem>
                        <SelectItem value="150">~150 sn (500 k.)</SelectItem>
                        <SelectItem value="300">~300 sn (1000 k.)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Çözünürlük</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1280x720">HD (1280×720)</SelectItem>
                      <SelectItem value="1920x1080">Full HD (1920×1080)</SelectItem>
                      <SelectItem value="1080x1920">Dikey (1080×1920)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Oran</Label>
                  <Select value={ratio} onValueChange={setRatio}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Yatay 16:9</SelectItem>
                      <SelectItem value="9:16">Dikey 9:16</SelectItem>
                      <SelectItem value="1:1">Kare 1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Yayın Planı</Label>
                  <Select value={publishStatus} onValueChange={setPublishStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="published">Yayınla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {result}
                </div>
              )}

              {lastVideoUrl && (
                <div className="rounded-lg border overflow-hidden bg-black">
                  <video controls className="w-full max-h-[360px]" src={lastVideoUrl} playsInline />
                </div>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90 gap-2"
                onClick={handleGenerate}
                disabled={generating || !subject.trim() || !apiKey.trim() || !avatarId.trim() || !voiceIdHg.trim()}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                {generating ? "HeyGen işleniyor (bekleyin)..." : "Video Üret"}
              </Button>
              {(!apiKey.trim() || !avatarId.trim() || !voiceIdHg.trim()) && (
                <p className="text-xs text-red-500 text-center">API anahtarı, Avatar ID ve Voice ID gerekli</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Geçmiş Üretimler
          </h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-xs text-gray-400">{h.date}</div>
                </div>
                {h.videoUrl ? (
                  <a href={h.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    MP4 aç
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mağaza & Ürün Tab ─────────────────────────────────────── */
function MagazaUrunTab({ hasApiKey }: { hasApiKey: boolean }) {
  const [form, setForm] = useState({
    vendorName: "", vendorType: "ecommerce", productName: "", productCategory: "",
    keyFeatures: "", tone: "friendly", contentType: "product_desc",
  });
  const [result, setResult] = useState<{ baslik: string; icerik: string; etiketler: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasApiKeyLocal, setHasApiKeyLocal] = useState<boolean | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.vendorName) { setError("Mağaza adı zorunlu"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/ai/vendor-content", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.ok) setResult(d); else setError(d.error || "Hata oluştu");
    } catch { setError("Sunucuya bağlanılamadı"); }
    setLoading(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  useEffect(() => {
    apiFetch("/ai/settings")
      .then((s: AiSettings) => setHasApiKeyLocal(!!s?.hasApiKey))
      .catch(() => setHasApiKeyLocal(hasApiKey));
  }, [hasApiKey]);

  const canUseAi = hasApiKeyLocal ?? hasApiKey;

  if (!canUseAi) {
    return (
      <div className="p-8 border-2 border-amber-200 rounded-xl bg-amber-50 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="font-bold text-amber-700 mb-1">OpenAI API anahtarı gerekli</p>
        <p className="text-amber-600 text-sm">AI Ayarları sekmesinden OpenAI API anahtarınızı girin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" /> Mağaza & Ürün İçerik Üretici
        </h2>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">İçerik Türü</label>
          <select value={form.contentType} onChange={(e) => set("contentType", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="product_desc">📦 Ürün Açıklaması</option>
            <option value="promo_text">🎯 Promosyon / Tanıtım</option>
            <option value="social_post">📱 Sosyal Medya Paylaşımı</option>
            <option value="seo_title">🔍 SEO Başlık & Meta</option>
            <option value="announcement">📢 Duyuru / Kampanya</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Mağaza Adı *</label>
          <input type="text" value={form.vendorName} onChange={(e) => set("vendorName", e.target.value)}
            placeholder="Örn: Ahmet'in Mutfağı" className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Mağaza Türü</label>
            <select value={form.vendorType} onChange={(e) => set("vendorType", e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="delivery">🛵 Yemek / Teslimat</option>
              <option value="ecommerce">🛒 E-Ticaret</option>
              <option value="service">🔧 Hizmet</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Üslup</label>
            <select value={form.tone} onChange={(e) => set("tone", e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="friendly">😊 Samimi</option>
              <option value="professional">👔 Profesyonel</option>
              <option value="energetic">⚡ Enerjik</option>
              <option value="luxury">💎 Lüks</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Ürün / Hizmet Adı</label>
          <input type="text" value={form.productName} onChange={(e) => set("productName", e.target.value)}
            placeholder="Örn: Özel Kuzu Tandır" className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Kategori</label>
          <input type="text" value={form.productCategory} onChange={(e) => set("productCategory", e.target.value)}
            placeholder="Örn: Et Yemekleri, Elektronik..." className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Öne Çıkan Özellikler</label>
          <textarea value={form.keyFeatures} onChange={(e) => set("keyFeatures", e.target.value)} rows={2}
            placeholder="Örn: Taş fırında, ev yapımı, %100 doğal..." className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <button onClick={generate} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-60">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</> : <><Sparkles className="w-4 h-4" /> İçerik Üret</>}
        </button>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-500" /> Üretilen İçerik
        </h2>
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300">
            <Bot className="w-14 h-14 mb-3" />
            <p className="text-sm">Form doldurup "İçerik Üret" tıklayın</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 text-purple-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">AI içerik üretiyor...</p>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            {result.baslik && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Başlık</p>
                <p className="text-base font-bold text-gray-900">{result.baslik}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">İçerik</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.icerik}</div>
            </div>
            {result.etiketler?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Etiketler</p>
                <div className="flex flex-wrap gap-1">
                  {result.etiketler.map((t) => (
                    <span key={t} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => copy(result.icerik)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                <Copy className="w-3.5 h-3.5" /> {copied ? "Kopyalandı!" : "Kopyala"}
              </button>
              <button onClick={generate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition">
                <RefreshCw className="w-3.5 h-3.5" /> Yeniden Üret
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
