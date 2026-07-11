import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchHybridSettings,
  fetchAiQueueMappings,
  saveHybridSettings,
  saveAiQueueMapping,
  mockTransferIn,
  fetchQueues,
  type PbxHybridSettings,
  type PbxAiQueueMapping,
  type PbxQueue,
  ROUTING_MODE_OPTIONS,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { ArrowRightLeft, Copy, Loader2, Plus, RefreshCw, Sparkles } from "lucide-react";

export default function PbxHybrid() {
  const [settings, setSettings] = useState<PbxHybridSettings | null>(null);
  const [mappings, setMappings] = useState<PbxAiQueueMapping[]>([]);
  const [queues, setQueues] = useState<PbxQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [mockMsg, setMockMsg] = useState<string | null>(null);

  const [newAiId, setNewAiId] = useState("");
  const [newAiName, setNewAiName] = useState("");
  const [newQueueId, setNewQueueId] = useState("");
  const [newMode, setNewMode] = useState<"ai_only" | "human_only" | "hybrid">("hybrid");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, q] = await Promise.all([fetchHybridSettings(), fetchAiQueueMappings(), fetchQueues()]);
      setSettings(s);
      setMappings(m);
      setQueues(q);
      if (!newQueueId && q[0]) setNewQueueId(q[0].id);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [newQueueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveGlobal = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await saveHybridSettings({
        hybridModeEnabled: settings.hybridModeEnabled,
        defaultRoutingMode: settings.defaultRoutingMode,
        defaultPbxQueueId: settings.defaultPbxQueueId,
      });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const addMapping = async () => {
    if (!newAiId.trim()) return;
    setSaving(true);
    try {
      await saveAiQueueMapping({
        aiCampaignId: newAiId.trim(),
        aiCampaignName: newAiName.trim() || newAiId.trim(),
        routingMode: newMode,
        pbxQueueId: newQueueId || null,
      });
      setNewAiId("");
      setNewAiName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = async (m: PbxAiQueueMapping, patch: Partial<PbxAiQueueMapping>) => {
    setSaving(true);
    try {
      await saveAiQueueMapping({ ...m, ...patch });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const runMock = async () => {
    setMockBusy(true);
    setMockMsg(null);
    try {
      const res = await mockTransferIn({});
      setMockMsg(res.message ?? "Demo aktarım gönderildi.");
      await load();
    } catch (e) {
      setMockMsg(e instanceof Error ? e.message : "Demo aktarım başarısız.");
    } finally {
      setMockBusy(false);
    }
  };

  const copyWebhook = () => {
    if (settings?.transferWebhookUrl) {
      void navigator.clipboard.writeText(settings.transferWebhookUrl);
    }
  };

  if (loading && !settings) {
    return (
      <PbxLayout title="Hibrit Mod">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Yükleniyor…
        </div>
      </PbxLayout>
    );
  }

  return (
    <PbxLayout title="Hibrit Mod (AI → Canlı Temsilci)">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-[#e61e25]" />
        <h2 className="font-semibold text-gray-900">AI + PBX hibrit yönlendirme</h2>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>
      <p className="text-sm text-gray-500">
        AgentLabs (<code className="text-xs bg-gray-100 px-1 rounded">call.yekpare.net</code>) AI görüşmesi bittiğinde veya
        &quot;temsilciye aktar&quot; tetiklendiğinde çağrı PBX kuyruğuna düşer.{" "}
        <a href="/admin/yekpare-ai-call" className="text-[#e61e25] underline">
          AI Call admin
        </a>{" "}
        ile birlikte yapılandırın.
      </p>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Hibrit Mod (AI → Canlı Temsilci)</p>
            <p className="text-sm text-gray-500">Kapalıyken AI aktarım webhook&apos;ları reddedilir (kampanya bazlı istisna yok).</p>
          </div>
          <Switch
            checked={settings?.hybridModeEnabled ?? false}
            onCheckedChange={(v) => setSettings((s) => (s ? { ...s, hybridModeEnabled: v } : s))}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Varsayılan yönlendirme modu</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={settings?.defaultRoutingMode ?? "hybrid"}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, defaultRoutingMode: e.target.value as PbxHybridSettings["defaultRoutingMode"] } : s,
                )
              }
            >
              {ROUTING_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Varsayılan PBX kuyruğu</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={settings?.defaultPbxQueueId ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, defaultPbxQueueId: e.target.value || null } : s))}
            >
              <option value="">— Seçin —</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={() => void saveGlobal()} disabled={saving} className="bg-[#e61e25]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Global ayarları kaydet
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900">Webhook URL (AgentLabs Transfer Node)</h3>
        <p className="text-sm text-gray-500">
          AgentLabs akış editöründe &quot;Transfer to Human&quot; / webhook düğümüne aşağıdaki URL&apos;yi ekleyin. POST gövdesi:
          <code className="block mt-1 text-xs bg-gray-50 p-2 rounded">{`{ "call_id", "phone", "campaign_id", "summary", "context" }`}</code>
        </p>
        <div className="flex gap-2">
          <Input readOnly value={settings?.transferWebhookUrl ?? ""} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={copyWebhook} title="Kopyala">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          İsteğe bağlı başlık: <code>X-PBX-Transfer-Secret</code> (admin panelinde veya <code>PBX_TRANSFER_WEBHOOK_SECRET</code> env).
        </p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold bg-gray-50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#e61e25]" />
          AI kampanya ↔ PBX kuyruk eşlemesi
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50/80">
            <tr>
              <th className="px-4 py-2">AI Kampanya ID</th>
              <th className="px-4 py-2">Ad</th>
              <th className="px-4 py-2">Yönlendirme Modu</th>
              <th className="px-4 py-2">PBX Kuyruk</th>
              <th className="px-4 py-2 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{m.aiCampaignId}</td>
                <td className="px-4 py-2">{m.aiCampaignName}</td>
                <td className="px-4 py-2">
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={m.routingMode}
                    onChange={(e) =>
                      void updateMapping(m, { routingMode: e.target.value as PbxAiQueueMapping["routingMode"] })
                    }
                  >
                    {ROUTING_MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    className="rounded border px-2 py-1 text-xs max-w-[180px]"
                    value={m.pbxQueueId ?? ""}
                    onChange={(e) => void updateMapping(m, { pbxQueueId: e.target.value || null })}
                  >
                    <option value="">Varsayılan</option>
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="text-[10px]">
                    {m.routingModeLabelTr ?? m.routingMode}
                  </Badge>
                </td>
              </tr>
            ))}
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Henüz eşleme yok. Demo seed: <code className="text-xs">demo-ai-campaign</code>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="p-4 border-t bg-gray-50/50 grid sm:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-xs">AI Kampanya ID</Label>
            <Input placeholder="agentlabs-campaign-uuid" value={newAiId} onChange={(e) => setNewAiId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Kampanya adı</Label>
            <Input placeholder="Satış AI" value={newAiName} onChange={(e) => setNewAiName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Mod / Kuyruk</Label>
            <div className="flex gap-1">
              <select className="rounded border px-2 py-2 text-xs flex-1" value={newMode} onChange={(e) => setNewMode(e.target.value as typeof newMode)}>
                {ROUTING_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select className="rounded border px-2 py-2 text-xs flex-1" value={newQueueId} onChange={(e) => setNewQueueId(e.target.value)}>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={() => void addMapping()} disabled={saving || !newAiId.trim()} className="gap-1">
            <Plus className="w-4 h-4" />
            Ekle
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 space-y-3">
        <h3 className="font-semibold text-amber-900">Demo test</h3>
        <p className="text-sm text-amber-800">
          AgentLabs olmadan sahte bir AI aktarımı gönderin. Hibrit mod açık ve kuyruk eşlemesi tanımlı olmalı.
        </p>
        <Button variant="outline" onClick={() => void runMock()} disabled={mockBusy} className="gap-1 border-amber-400">
          {mockBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Demo aktarım gönder
        </Button>
        {mockMsg ? <p className="text-sm text-amber-900">{mockMsg}</p> : null}
        <p className="text-xs text-amber-700">
          Sonrasında{" "}
          <a href="/admin/yekpare-ai-call/canli" className="underline">
            Canlı İzleme
          </a>{" "}
          ve{" "}
          <a href="/pbx/panel" className="underline">
            Temsilci paneli
          </a>{" "}
          üzerinden kontrol edin.
        </p>
      </div>
    </PbxLayout>
  );
}
