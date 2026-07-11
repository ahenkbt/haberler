import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  fetchAiCampaigns,
  fetchAssistants,
  saveAiCampaign,
  startAiCampaign,
  stopAiCampaign,
  type AiCallCampaign,
} from "@/lib/aiCallApi";
import { fetchTrunks, type PbxTrunk } from "@/lib/pbxApi";
import { Loader2, Play, Square, Target } from "lucide-react";

export default function YekpareAiCallCampaigns() {
  const [campaigns, setCampaigns] = useState<AiCallCampaign[]>([]);
  const [assistants, setAssistants] = useState<{ id: string; name: string }[]>([]);
  const [trunks, setTrunks] = useState<PbxTrunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [trunkId, setTrunkId] = useState("");
  const [routingMode, setRoutingMode] = useState<"ai_only" | "hybrid">("ai_only");
  const [contactsText, setContactsText] = useState("+905551112233, Demo Kişi\n+905554445566");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, t] = await Promise.all([fetchAiCampaigns(), fetchAssistants(), fetchTrunks()]);
      setCampaigns(c);
      setAssistants(a.map((x) => ({ id: x.id, name: x.name })));
      setTrunks(t);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parseContacts = () =>
    contactsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, ...rest] = line.split(/[,;\t]/);
        return { phone: phone.trim(), name: rest.join(" ").trim() };
      })
      .filter((c) => c.phone);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveAiCampaign({
        name: name.trim(),
        assistantId: assistantId || null,
        trunkId: trunkId || null,
        routingMode,
        contacts: parseContacts(),
      });
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: "bg-green-100 text-green-800",
      paused: "bg-amber-100 text-amber-800",
      completed: "bg-gray-100 text-gray-800",
      draft: "bg-blue-100 text-blue-800",
    };
    return <Badge className={colors[status] ?? ""}>{status}</Badge>;
  };

  return (
    <YekpareAiCallLayout title="AI Kampanyalar">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-[#e61e25]" />
            Yeni kampanya
          </h2>
          <div className="grid gap-3">
            <div>
              <Label>Kampanya adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>AI asistan</Label>
              <Select value={assistantId || "_none"} onValueChange={(v) => setAssistantId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Seçilmedi —</SelectItem>
                  {assistants.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SIP trunk</Label>
              <Select value={trunkId || "_none"} onValueChange={(v) => setTrunkId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Trunk yok (demo) —</SelectItem>
                  {trunks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.host})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Trunk eklemek için{" "}
                <Link href="/admin/yekpare-ai-call/sip-trunk" className="text-[#e61e25] underline">
                  SIP Trunk
                </Link>{" "}
                sayfasını kullanın.
              </p>
            </div>
            <div>
              <Label>Yönlendirme modu</Label>
              <Select value={routingMode} onValueChange={(v) => setRoutingMode(v as "ai_only" | "hybrid")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_only">Yalnızca AI</SelectItem>
                  <SelectItem value="hybrid">Hibrit (AI → temsilci)</SelectItem>
                </SelectContent>
              </Select>
              {routingMode === "hybrid" ? (
                <p className="text-xs text-gray-500 mt-1">
                  Hibrit ayarları:{" "}
                  <Link href="/admin/yekpare-ai-call/hibrit" className="text-[#e61e25] underline">
                    Hibrit Mod
                  </Link>
                </p>
              ) : null}
            </div>
            <div>
              <Label>Kişi listesi (satır başına: telefon, ad)</Label>
              <Textarea rows={4} value={contactsText} onChange={(e) => setContactsText(e.target.value)} />
            </div>
          </div>
          <Button type="button" disabled={saving} onClick={() => void create()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Kampanya oluştur
          </Button>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
            Kampanyalar
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-auto" /> : null}
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Ad</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-left">Kişi</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.assistantName ?? "—"} · {c.routingMode}</p>
                  </td>
                  <td className="px-4 py-2">{statusBadge(c.status)}</td>
                  <td className="px-4 py-2">{c.contactCount}</td>
                  <td className="px-4 py-2 text-right space-x-1">
                    {c.status === "running" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => void stopAiCampaign(c.id).then(load)}>
                        <Square className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button type="button" variant="default" size="sm" onClick={() => void startAiCampaign(c.id).then(load)}>
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Kampanya yok. Demo veri için Genel bakış sayfasından &quot;Demo yükle&quot; kullanın.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </YekpareAiCallLayout>
  );
}
