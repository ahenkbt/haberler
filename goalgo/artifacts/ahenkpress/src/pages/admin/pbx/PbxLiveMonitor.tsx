import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchLiveAgents,
  fetchLiveQueues,
  statusBadgeClass,
  type LiveAgentRow,
  type LiveQueueRow,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Loader2, PhoneCall, RefreshCw, Users } from "lucide-react";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function agentRowClass(status: LiveAgentRow["status"]): string {
  const map: Record<string, string> = {
    available: "bg-emerald-50/80",
    on_call: "bg-violet-50/80",
    break: "bg-amber-50/80",
    paused: "bg-slate-50/80",
    wrap_up: "bg-violet-50/50",
    offline: "",
  };
  return map[status] ?? "";
}

export default function PbxLiveMonitor() {
  const [queues, setQueues] = useState<LiveQueueRow[]>([]);
  const [agents, setAgents] = useState<LiveAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const [q, a] = await Promise.all([fetchLiveQueues(), fetchLiveAgents()]);
      setQueues(q);
      setAgents(a);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const totalOnCall = agents.filter((a) => a.status === "on_call").length;

  return (
    <PbxLayout title="Canlı İzleme">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm">
          <PhoneCall className="w-4 h-4 text-[#e61e25]" />
          <span className="text-sm">
            <strong>{totalWaiting}</strong> kuyrukta
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm">
          <Users className="w-4 h-4 text-[#e61e25]" />
          <span className="text-sm">
            <strong>{totalOnCall}</strong> görüşmede
          </span>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Otomatik (5 sn)
        </label>
      </div>

      <Tabs defaultValue="kuyruk" className="w-full">
        <TabsList>
          <TabsTrigger value="kuyruk">Kuyruk Durumu</TabsTrigger>
          <TabsTrigger value="agent">Anlık Agent Durumu</TabsTrigger>
        </TabsList>

        <TabsContent value="kuyruk" className="mt-4">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold bg-gray-50">Kuyruk durumu</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2">Kampanya</th>
                    <th className="px-4 py-2">Süre</th>
                    <th className="px-4 py-2">Telefon</th>
                    <th className="px-4 py-2">Voip</th>
                    <th className="px-4 py-2">Tipi</th>
                    <th className="px-4 py-2">Bekleyen</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queues.map((q) => (
                    <tr key={q.queueId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{q.campaignName ?? q.queueName}</td>
                      <td className="px-4 py-2">{formatDuration(q.longestWaitSec)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{q.phone ?? "—"}</td>
                      <td className="px-4 py-2">{q.voip ?? "SIP"}</td>
                      <td className="px-4 py-2">
                        {q.callType === "AI Aktarım" ? (
                          <Badge className="bg-violet-100 text-violet-800 border-violet-300">{q.callType}</Badge>
                        ) : (
                          q.callType ?? "Otomatik Arama"
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={q.waiting > 0 ? "destructive" : "secondary"}>{q.waiting}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agent" className="mt-4">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold bg-gray-50">Anlık agent durumu</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2">Agent</th>
                    <th className="px-4 py-2">Dahili</th>
                    <th className="px-4 py-2">Kampanya</th>
                    <th className="px-4 py-2">Grup</th>
                    <th className="px-4 py-2">Durumu</th>
                    <th className="px-4 py-2">Geçen Süre</th>
                    <th className="px-4 py-2">Çağrı Adedi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agents.map((a) => (
                    <tr key={a.agentId} className={`hover:bg-gray-50 ${agentRowClass(a.status)}`}>
                      <td className="px-4 py-2 font-medium">{a.displayName}</td>
                      <td className="px-4 py-2 font-mono">{a.extension ?? "—"}</td>
                      <td className="px-4 py-2 text-xs">{a.campaignName ?? a.queueNames[0] ?? "—"}</td>
                      <td className="px-4 py-2 text-xs">{a.groupName ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(a.status)}`}
                        >
                          {a.statusLabelTr}
                        </span>
                      </td>
                      <td className="px-4 py-2">{a.loginDurationSec ? formatDuration(a.loginDurationSec) : "—"}</td>
                      <td className="px-4 py-2">{a.callsHandledToday}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PbxLayout>
  );
}
