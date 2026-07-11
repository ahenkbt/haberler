import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCampaignsAdmin, fetchQueues, saveCampaign, type PbxCampaign } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Loader2, Megaphone, Plus, RefreshCw, Save } from "lucide-react";

export default function PbxCampaigns() {
  const [campaigns, setCampaigns] = useState<PbxCampaign[]>([]);
  const [queues, setQueues] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", campaignType: "auto_dial" as const, queueId: "", status: "running" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, q] = await Promise.all([fetchCampaignsAdmin(), fetchQueues()]);
      setCampaigns(c);
      setQueues(q.map((x) => ({ id: x.id, name: x.name })));
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) {
      setMsg("Kampanya adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await saveCampaign({
        name: form.name.trim(),
        campaignType: form.campaignType,
        queueId: form.queueId || null,
        status: form.status,
        enabled: true,
      });
      setForm({ name: "", campaignType: "auto_dial", queueId: "", status: "running" });
      await load();
      setMsg("Kampanya oluşturuldu. Agent /pbx panelinden katılabilir.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="Kampanyalar">
      <p className="text-sm text-gray-600">
        Kampanyalar Yekpare üzerinde yönetilir. Agent <code className="bg-gray-100 px-1 rounded">/pbx/panel</code> → Katıl ile çağrı almaya başlar. Verimor API gerekmez.
      </p>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni kampanya
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Kampanya adı</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Kuyruk</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={form.queueId}
              onChange={(e) => setForm({ ...form, queueId: e.target.value })}
            >
              <option value="">—</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tip</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={form.campaignType}
              onChange={(e) => setForm({ ...form, campaignType: e.target.value as "auto_dial" })}
            >
              <option value="auto_dial">Otomatik arama</option>
              <option value="manual">Manuel</option>
            </select>
          </div>
          <div>
            <Label>Durum</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="running">Aktif (running)</option>
              <option value="paused">Duraklatıldı</option>
              <option value="draft">Taslak</option>
            </select>
          </div>
        </div>
        {msg ? <p className="text-sm text-gray-600">{msg}</p> : null}
        <Button onClick={() => void submit()} disabled={saving} className="gap-2 bg-[#1e3a5f]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kampanya oluştur
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-[#e61e25]" />
        <h2 className="font-semibold text-gray-900">Kampanya listesi</h2>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">Kampanya</th>
              <th className="px-4 py-2">Tipi</th>
              <th className="px-4 py-2">Durum</th>
              <th className="px-4 py-2">Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/admin/yekpare-ai-call/kampanya/${c.id}`} className="text-[#1e3a5f] hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.campaignTypeLabelTr}</td>
                <td className="px-4 py-2">
                  <Badge variant={c.status === "running" ? "default" : "outline"}>{c.status}</Badge>
                </td>
                <td className="px-4 py-2">{c.contactCount ?? 0}</td>
              </tr>
            ))}
            {!loading && campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Henüz kampanya yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PbxLayout>
  );
}
