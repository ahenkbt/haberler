import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPbxConfig, fetchPbxSummary, type PbxSummary } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import {
  RefreshCw,
  Server,
  Phone,
  Users,
  ListOrdered,
  PhoneCall,
  Loader2,
  AlertCircle,
  Radio,
} from "lucide-react";

type ConfigState = {
  configured?: boolean;
  demoMode?: boolean;
  backend?: string;
  agentLabsConfigured?: boolean;
};

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    default: "bg-[#e61e25]/10 text-[#e61e25]",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
  };
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
        </div>
        <div className={`rounded-lg p-2 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function PbxOverview() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [summary, setSummary] = useState<PbxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, sum] = await Promise.all([fetchPbxConfig(), fetchPbxSummary()]);
      setConfig(cfg);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const demoMode = summary?.demoMode ?? config?.demoMode ?? true;
  const agentLabs = summary?.backend === "agentlabs" || config?.backend === "agentlabs";

  return (
    <PbxLayout title="PBX Özet">
      <div className="flex flex-wrap items-center gap-2">
        {agentLabs ? (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            call.yekpare.net (AgentLabs)
          </Badge>
        ) : demoMode ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Demo modu
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            Canlı
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="ml-auto gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard label="Toplam Kayıt" value={summary.totalRecords} icon={ListOrdered} />
            <SummaryCard label="Aktif Kart" value={summary.activeCards} tone="emerald" icon={PhoneCall} />
            <SummaryCard label="İptal Kart" value={summary.cancelledCards ?? 0} tone="rose" icon={Phone} />
            <SummaryCard label="Susped" value={summary.suspendedCards ?? 0} tone="amber" icon={Users} />
          </div>

          <Tabs defaultValue="canli" className="w-full">
            <TabsList>
              <TabsTrigger value="canli">Canlı Çağrı Bölümü</TabsTrigger>
              <TabsTrigger value="istatistik">İstatistik Bölümü</TabsTrigger>
              <TabsTrigger value="randevular">Randevular</TabsTrigger>
              <TabsTrigger value="ivr">Anlık IVR</TabsTrigger>
            </TabsList>
            <TabsContent value="canli" className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Kuyrukta" value={summary.callsInQueue} icon={ListOrdered} />
              <SummaryCard label="Aktif Görüşme" value={summary.activeCalls} icon={PhoneCall} tone="emerald" />
              <SummaryCard label="Çevrimiçi Agent" value={summary.agentsOnline} sub={`${summary.totalAgents} kayıtlı`} icon={Users} />
              <SummaryCard label="Aktif Trunk" value={summary.activeTrunks} sub={`${summary.totalTrunks} trunk`} icon={Server} />
            </TabsContent>
            <TabsContent value="istatistik" className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SummaryCard label="Dahililer" value={summary.activeExtensions} sub={`${summary.totalExtensions} toplam`} icon={Phone} />
              <SummaryCard label="Kuyruklar" value={summary.totalQueues} icon={ListOrdered} />
              <SummaryCard label="SIP Köprüsü" value={summary.sipBridgeConnected ? "Bağlı" : "Yok"} icon={Server} />
            </TabsContent>
            <TabsContent value="randevular" className="mt-4">
              <p className="text-sm text-gray-600 rounded-xl border bg-white p-4">
                Randevu yönetimi AgentLabs akış modülünde.{" "}
                <a href="/call-center-app/app/flows/appointments" className="text-[#e61e25] underline">
                  Randevular çalışma alanı
                </a>
              </p>
            </TabsContent>
            <TabsContent value="ivr" className="mt-4">
              <p className="text-sm text-gray-600 rounded-xl border bg-white p-4">
                IVR akışları için{" "}
                <Link href="/admin/yekpare-ai-call/ivr" className="text-[#e61e25] underline">
                  Anlık IVR
                </Link>{" "}
                panelini veya{" "}
                <a href="/call-center-app/app/flows" className="text-[#e61e25] underline">
                  akış oluşturucuyu
                </a>{" "}
                kullanın.
              </p>
            </TabsContent>
          </Tabs>
        </>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Yükleniyor…
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Hızlı erişim
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/yekpare-ai-call/canli" className="text-[#e61e25] underline">
            Canlı izleme
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/admin/yekpare-ai-call/sip-trunk" className="text-[#e61e25] underline">
            SIP Trunk
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/admin/yekpare-ai-call/dahili" className="text-[#e61e25] underline">
            Dahililer
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/admin/yekpare-ai-call/kuyruk" className="text-[#e61e25] underline">
            Kuyruklar
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/pbx" className="text-[#e61e25] underline">
            Temsilci portalı
          </Link>
        </div>
      </div>
    </PbxLayout>
  );
}
