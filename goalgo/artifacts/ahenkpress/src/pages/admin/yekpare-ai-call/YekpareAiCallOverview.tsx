import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/apiBase";
import { seedAiCallDemo } from "@/lib/aiCallApi";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  CreditCard,
  BookOpen,
  Bot,
  Target,
  Server,
  Cloud,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CallCenterConfig = {
  ok: boolean;
  native?: boolean;
  configured: boolean;
  subscriptionActive: boolean;
  nativeStatus?: {
    demoMode: boolean;
    openaiConfigured: boolean;
    geminiConfigured: boolean;
    trunkCount: number;
    assistantCount: number;
    campaignCount: number;
    runningCampaigns: number;
    totalCalls: number;
  };
  extensions?: { id: string; labelTr: string; adminPath: string }[];
};

type CallCenterHealth = {
  ok: boolean;
  status: string;
  native?: boolean;
  latencyMs?: number;
  error?: string;
};

type SubscriptionAdmin = {
  callCenterEnabled: boolean;
  callCenterPlan: string | null;
  active: boolean;
  expiresAt: string | null;
  plans: { id: string; name: string }[];
};

const QUICK_LINKS = [
  { href: "/admin/yekpare-ai-call/verimor", label: "Verimor", icon: Cloud, desc: "Dahili, şifre, domain — API key yok", highlight: true },
  { href: "/admin/yekpare-ai-call/ayarlar", label: "Ayarlar", icon: Settings, desc: "OpenAI / Gemini API anahtarları" },
  { href: "/admin/yekpare-ai-call/asistanlar", label: "AI Asistanlar", icon: Bot, desc: "Sistem istemi ve model" },
  { href: "/admin/yekpare-ai-call/ai-kampanya", label: "AI Kampanyalar", icon: Target, desc: "Kişi listesi ve başlat" },
  { href: "/admin/yekpare-ai-call/sip-trunk", label: "SIP Trunk", icon: Server, desc: "Host, kullanıcı, şifre" },
];

export default function YekpareAiCallOverview() {
  const [config, setConfig] = useState<CallCenterConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [health, setHealth] = useState<CallCenterHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [subAdmin, setSubAdmin] = useState<SubscriptionAdmin | null>(null);
  const [subSaving, setSubSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await apiFetch("/api/call-center/config");
      setConfig((await res.json()) as CallCenterConfig);
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const res = await apiFetch("/api/call-center/admin/subscription");
      setSubAdmin((await res.json()) as SubscriptionAdmin);
    } catch {
      setSubAdmin(null);
    }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await apiFetch("/api/call-center/health");
      setHealth((await res.json()) as CallCenterHealth);
    } catch (err) {
      setHealth({
        ok: false,
        status: "error",
        error: err instanceof Error ? err.message : "Sağlık kontrolü başarısız",
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const saveSubscription = async (patch: {
    enabled: boolean;
    plan?: string;
    expiresAt?: string | null;
  }) => {
    setSubSaving(true);
    try {
      const res = await apiFetch("/api/call-center/admin/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: patch.enabled,
          plan: patch.plan ?? subAdmin?.callCenterPlan,
          status: patch.enabled ? "active" : "none",
          expiresAt: patch.expiresAt,
        }),
      });
      setSubAdmin((await res.json()) as SubscriptionAdmin);
      await loadConfig();
    } finally {
      setSubSaving(false);
    }
  };

  const loadDemo = async () => {
    setSeeding(true);
    try {
      await seedAiCallDemo();
      await loadConfig();
      await runHealthCheck();
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    void loadConfig();
    void loadSubscription();
  }, [loadConfig, loadSubscription]);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  const ns = config?.nativeStatus;

  return (
    <YekpareAiCallLayout title="Genel bakış">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={healthLoading} onClick={() => void runHealthCheck()}>
          {healthLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Bağlantıyı test et
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={seeding} onClick={() => void loadDemo()}>
          {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Demo veri yükle
        </Button>
      </div>

      <HealthBanner health={health} healthLoading={healthLoading} native={config?.native !== false} />

      <VerimorSetupBanner />

      {ns ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="SIP Trunk" value={ns.trunkCount} />
          <StatCard label="AI Asistan" value={ns.assistantCount} />
          <StatCard label="Kampanya" value={ns.campaignCount} sub={`${ns.runningCampaigns} çalışıyor`} />
          <StatCard label="Toplam arama" value={ns.totalCalls} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl border bg-white p-4 hover:shadow-md transition-all",
                "highlight" in link && link.highlight
                  ? "border-[#1e3a5f]/30 hover:border-[#1e3a5f]/50 bg-gradient-to-br from-[#1e3a5f]/5 to-white"
                  : "hover:border-[#e61e25]/30",
              )}
            >
              <Icon className={cn("w-5 h-5 mb-2", "highlight" in link && link.highlight ? "text-[#1e3a5f]" : "text-[#e61e25]")} />
              <p className="font-semibold text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
            </Link>
          );
        })}
      </div>

      {!configLoading && config && !config.subscriptionActive ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Abonelik gerekli</p>
          <p className="mt-1">
            Modüller yalnızca aktif abonelikte çalışır.{" "}
            <Link href="/ai-cagri-merkezi#basvuru" className="underline font-medium">
              Abonelik talebi
            </Link>
          </p>
        </div>
      ) : null}

      <Tabs defaultValue="kurulum" className="w-full">
        <TabsList>
          <TabsTrigger value="kurulum" className="gap-1.5">
            <Settings className="w-4 h-4" />
            Hızlı kurulum
          </TabsTrigger>
          <TabsTrigger value="abonelik" className="gap-1.5">
            <CreditCard className="w-4 h-4" />
            Abonelik
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kurulum" className="mt-4 space-y-4">
          <SetupCard native={config?.native !== false} nativeStatus={ns} />
          <DocsCard />
        </TabsContent>
        <TabsContent value="abonelik" className="mt-4">
          <SubscriptionPanel sub={subAdmin} saving={subSaving} onSave={saveSubscription} onRefresh={() => void loadSubscription()} />
        </TabsContent>
      </Tabs>
    </YekpareAiCallLayout>
  );
}

function VerimorSetupBanner() {
  return (
    <div className="rounded-xl border border-[#1e3a5f]/25 bg-gradient-to-r from-[#1e3a5f]/10 via-white to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="text-lg font-bold text-[#1e3a5f]">Verimor Bulutsantralim</h2>
            <Badge className="bg-[#1e3a5f] text-white text-[10px]">API key gerekmez</Badge>
          </div>
          <p className="text-sm text-gray-700 max-w-2xl">
            Personel <strong>/pbx</strong> adresinden Yekpare kullanıcı adı ile giriş yapar. Admin panelden dahili no, Verimor şifresi
            ve domain tanımlayın; tarayıcı softphone Verimor santraline SIP/WebRTC ile bağlanır.
          </p>
          <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-0.5">
            <li>
              <Link href="/admin/yekpare-ai-call/verimor" className="text-[#1e3a5f] underline font-medium">
                Verimor ayarları
              </Link>
              {" — softphone modunu açın"}
            </li>
            <li>
              <Link href="/admin/yekpare-ai-call/temsilci" className="text-[#1e3a5f] underline font-medium">
                Verimor agentler
              </Link>
              {" — dahili + şifre + domain"}
            </li>
            <li>
              <Link href="/admin/yekpare-ai-call/kampanya" className="text-[#1e3a5f] underline font-medium">
                Kampanya
              </Link>
              {" oluştur → agent /pbx üzerinden katılsın"}
            </li>
          </ol>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href="/admin/yekpare-ai-call/verimor"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#152a45]"
          >
            Verimor ayarlarına git
          </Link>
          <Link
            href="/pbx"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1e3a5f]/30 px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
          >
            Temsilci portalı
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

function HealthBanner({
  health,
  healthLoading,
  native,
}: {
  health: CallCenterHealth | null;
  healthLoading: boolean;
  native: boolean;
}) {
  if (healthLoading && !health) {
    return (
      <div className="rounded-lg border px-4 py-3 flex items-center gap-2 text-sm bg-gray-50 text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Platform durumu kontrol ediliyor…
      </div>
    );
  }
  if (!health) return null;
  const ok = health.ok === true;
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex flex-wrap items-center gap-2 text-sm",
        ok ? "bg-green-50 border-green-200 text-green-900" : "bg-amber-50 border-amber-200 text-amber-900",
      )}
    >
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span className="font-medium">
        {ok
          ? native
            ? "Yerel AI Call Center hazır"
            : "Sunucu erişilebilir"
          : "Kurulum gerekli — API anahtarı veya demo mod"}
      </span>
      {health.latencyMs != null ? (
        <Badge variant="outline" className="text-xs">
          {health.latencyMs} ms
        </Badge>
      ) : null}
      {health.error ? <span className="text-xs w-full">{health.error}</span> : null}
    </div>
  );
}

function SubscriptionPanel({
  sub,
  saving,
  onSave,
  onRefresh,
}: {
  sub: SubscriptionAdmin | null;
  saving: boolean;
  onSave: (p: { enabled: boolean; plan?: string; expiresAt?: string | null }) => Promise<void>;
  onRefresh: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [plan, setPlan] = useState("pro");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (!sub) return;
    setEnabled(sub.callCenterEnabled);
    setPlan(sub.callCenterPlan ?? "pro");
    setExpiresAt(sub.expiresAt?.slice(0, 10) ?? "");
  }, [sub]);

  return (
    <div className="rounded-xl border bg-white p-6 space-y-4 max-w-lg">
      <h2 className="text-lg font-semibold">Platform aboneliği</h2>
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={setEnabled} id="cc-enabled" />
        <Label htmlFor="cc-enabled">Çağrı merkezi etkin</Label>
        {sub?.active ? <Badge className="bg-green-100 text-green-800">Aktif</Badge> : <Badge variant="secondary">Kapalı</Badge>}
      </div>
      <div>
        <Label>Paket</Label>
        <Input className="mt-1" value={plan} onChange={(e) => setPlan(e.target.value)} />
      </div>
      <div>
        <Label>Bitiş tarihi</Label>
        <Input className="mt-1" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave({
              enabled,
              plan,
              expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            })
          }
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Kaydet
        </Button>
        <Button type="button" variant="outline" onClick={onRefresh}>
          Yenile
        </Button>
      </div>
    </div>
  );
}

function SetupCard({
  native,
  nativeStatus,
}: {
  native: boolean;
  nativeStatus?: CallCenterConfig["nativeStatus"];
}) {
  return (
    <div className="rounded-xl border bg-white p-6 space-y-5">
      <h2 className="text-lg font-semibold">3 adımda başlayın</h2>
      <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-2">
        <li>
          <Link href="/admin/yekpare-ai-call/ayarlar" className="text-[#e61e25] underline font-medium">
            Ayarlar
          </Link>
          {" — OpenAI ve/veya Gemini API anahtarını yapıştırın, &quot;Bağlantıyı Test Et&quot; tıklayın."}
        </li>
        <li>
          <Link href="/admin/yekpare-ai-call/sip-trunk" className="text-[#e61e25] underline font-medium">
            SIP Trunk
          </Link>
          {" — Host, kullanıcı adı, şifre ve port girin (Faz 2 gerçek arama)."}
        </li>
        <li>
          Asistan oluşturun → kampanya ekleyin →{" "}
          <Link href="/admin/yekpare-ai-call/ai-kampanya" className="text-[#e61e25] underline font-medium">
            Başlat
          </Link>
          . Hibrit mod için{" "}
          <Link href="/admin/yekpare-ai-call/hibrit" className="text-[#e61e25] underline font-medium">
            Hibrit Mod
          </Link>
          .
        </li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Badge variant={native ? "default" : "secondary"} className={native ? "bg-green-600" : ""}>
          {native ? "Yerel mod (native)" : "AgentLabs modu"}
        </Badge>
        {nativeStatus?.demoMode ? <Badge variant="outline">Demo mod</Badge> : null}
        {nativeStatus?.openaiConfigured ? <Badge variant="outline">OpenAI ✓</Badge> : null}
        {nativeStatus?.geminiConfigured ? <Badge variant="outline">Gemini ✓</Badge> : null}
      </div>
    </div>
  );
}

function DocsCard() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-6">
      <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        Dokümantasyon
      </h2>
      <p className="mt-2 text-sm text-blue-900/90">
        Detaylı kurulum: <code className="text-xs bg-white/80 px-1 rounded">goalgo/docs/YEKPARE_CALL_CENTER.md</code>
      </p>
      <ul className="mt-3 text-sm text-blue-900/90 space-y-1 list-disc pl-5">
        <li>PBX kurulumu: goalgo/docs/PBX_KURULUM.md</li>
        <li>AgentLabs referans (isteğe bağlı): goalgo/ai-call-center/</li>
        <li>USE_NATIVE_AI_CALL=false → eski AgentLabs vekili</li>
      </ul>
    </div>
  );
}
