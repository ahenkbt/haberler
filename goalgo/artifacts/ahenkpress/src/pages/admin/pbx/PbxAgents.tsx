import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAgents,
  fetchThreeCxSettings,
  fetchTrunks,
  saveAgent,
  saveExtension,
  saveThreeCxAgent,
  saveVerimorAgent,
  type PbxAgent,
  type PbxTrunk,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, RefreshCw, Save } from "lucide-react";

const DEFAULT_PASSWORD = import.meta.env.PROD ? "" : "agent123";
const VERIMOR_WSS_PLACEHOLDER = "wss://api.bulutsantralim.com:7443";

function normalizeVerimorWssInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/bulutsantralim\.com/i.test(trimmed) && /:443(\/|$)/.test(trimmed)) {
    return trimmed.replace(/:443(\/|$)/, ":7443$1");
  }
  return trimmed;
}

type AgentProviderMode = "verimor" | "3cx" | "sip_trunk";

const emptyForm = () => ({
  providerMode: "verimor" as AgentProviderMode,
  username: "",
  displayName: "",
  password: DEFAULT_PASSWORD,
  verimorExtension: "",
  verimorPassword: "",
  sipDomain: "",
  externalNumber: "",
  sipWssUrl: "",
  threecxExtension: "",
  threecxPassword: "",
  autoProvision: true,
  localExtension: "",
  sipSecret: "",
  trunkId: "",
});

export default function PbxAgents() {
  const [rows, setRows] = useState<PbxAgent[]>([]);
  const [trunks, setTrunks] = useState<PbxTrunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const [threecxFqdn, setThreecxFqdn] = useState<string | null>(null);
  const [threecxWss, setThreecxWss] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agents, trunkList, tcxSettings] = await Promise.all([
        fetchAgents(),
        fetchTrunks().catch(() => [] as PbxTrunk[]),
        fetchThreeCxSettings().catch(() => null),
      ]);
      setRows(agents);
      setTrunks(trunkList);
      setThreecxFqdn(tcxSettings?.fqdn ?? null);
      setThreecxWss(tcxSettings?.defaultWssUrl ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.username.trim() || !form.displayName.trim()) {
      setMsg("Kullanıcı adı ve ad zorunludur.");
      return;
    }
    if (!form.password.trim()) {
      setMsg("Yekpare şifresi zorunludur.");
      return;
    }
    if (form.providerMode === "verimor") {
      if (!form.verimorExtension.trim() || !form.verimorPassword.trim() || !form.sipDomain.trim()) {
        setMsg("Verimor dahili no, şifre ve domain zorunludur.");
        return;
      }
    } else if (form.providerMode === "3cx") {
      if (!form.threecxExtension.trim()) {
        setMsg("3CX dahili numarası zorunludur.");
        return;
      }
      if (!form.autoProvision && !form.threecxPassword.trim()) {
        setMsg("Otomatik oluşturma kapalıysa 3CX dahili şifresi zorunludur.");
        return;
      }
    } else if (!form.localExtension.trim()) {
      setMsg("SIP trunk modunda dahili numarası zorunludur.");
      return;
    }
    setSaving(true);
    setMsg(null);
    setMsgOk(false);
    try {
      if (form.providerMode === "verimor") {
        await saveVerimorAgent({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          verimorExtension: form.verimorExtension.trim(),
          verimorPassword: form.verimorPassword.trim(),
          sipDomain: form.sipDomain.trim(),
          externalNumber: form.externalNumber.trim(),
          sipWssUrl: normalizeVerimorWssInput(form.sipWssUrl.trim()) || undefined,
        });
        setMsg("Verimor temsilci kaydedildi.");
      } else if (form.providerMode === "3cx") {
        const result = await saveThreeCxAgent({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          threecxExtension: form.threecxExtension.trim(),
          threecxPassword: form.threecxPassword.trim() || undefined,
          autoProvision: form.autoProvision,
          sipDomain: threecxFqdn ?? undefined,
          sipWssUrl: form.sipWssUrl.trim() || threecxWss || undefined,
          externalNumber: form.externalNumber.trim(),
        });
        setMsg(result.provisionMessage ?? "3CX temsilci kaydedildi.");
      } else {
        const selectedTrunk = trunks.find((t) => t.id === form.trunkId);
        const extension = await saveExtension({
          extension: form.localExtension.trim(),
          displayName: form.displayName.trim(),
          email: form.username.trim(),
          sipSecret: form.sipSecret.trim() || undefined,
          provider: "local",
          sipDomain: selectedTrunk?.host?.trim() || undefined,
          sipWssUrl: selectedTrunk?.sipWssUrl?.trim() || undefined,
          externalNumber: selectedTrunk?.outboundCallerId?.trim() || undefined,
          enabled: true,
        });
        await saveAgent({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          extensionId: extension.id,
          enabled: true,
        });
        setMsg(
          selectedTrunk
            ? `SIP trunk temsilci kaydedildi (${selectedTrunk.name}).`
            : "SIP trunk temsilci kaydedildi.",
        );
      }
      setForm(emptyForm());
      await load();
      setMsgOk(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
      setMsgOk(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="Temsilciler">
      <p className="text-sm text-gray-600">
        Yekpare panel girişi + Verimor, 3CX veya kayıtlı SIP trunk üzerinden dahili.
      </p>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni temsilci
        </h2>

        <div>
          <Label>Bağlantı türü</Label>
          <Select
            value={form.providerMode}
            onValueChange={(value) => setForm({ ...form, providerMode: value as AgentProviderMode })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verimor">Verimor softphone (Bulutsantralim)</SelectItem>
              <SelectItem value="3cx">3CX (WebRTC softphone)</SelectItem>
              <SelectItem value="sip_trunk">SIP trunk (TurkNet / Netgsm vb.)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Yekpare kullanıcı adı</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ofis" />
          </div>
          <div>
            <Label>Yekpare şifresi</Label>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" />
          </div>
          <div>
            <Label>Ad soyad</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          {form.providerMode === "verimor" ? (
            <>
              <div>
                <Label>Verimor dahili no</Label>
                <Input value={form.verimorExtension} onChange={(e) => setForm({ ...form, verimorExtension: e.target.value })} placeholder="1000" />
              </div>
              <div>
                <Label>Verimor dahili şifresi</Label>
                <Input value={form.verimorPassword} onChange={(e) => setForm({ ...form, verimorPassword: e.target.value })} type="password" placeholder="RWG-693bqp" />
              </div>
              <div>
                <Label>Domain (sunucu)</Label>
                <Input value={form.sipDomain} onChange={(e) => setForm({ ...form, sipDomain: e.target.value })} placeholder="vatankahramanlari.bulutsantralim.com" />
              </div>
              <div>
                <Label>Dış numara (opsiyonel)</Label>
                <Input value={form.externalNumber} onChange={(e) => setForm({ ...form, externalNumber: e.target.value })} placeholder="903129630795" />
              </div>
              <div className="sm:col-span-2">
                <Label>WSS URL (opsiyonel)</Label>
                <Input value={form.sipWssUrl} onChange={(e) => setForm({ ...form, sipWssUrl: e.target.value })} placeholder={VERIMOR_WSS_PLACEHOLDER} />
                <p className="text-xs text-gray-500 mt-1">
                  Boş bırakılırsa Verimor resmi WSS kullanılır ({VERIMOR_WSS_PLACEHOLDER}). Port 443 değil 7443 olmalıdır.
                </p>
              </div>
            </>
          ) : form.providerMode === "3cx" ? (
            <>
              <div>
                <Label>3CX dahili no</Label>
                <Input value={form.threecxExtension} onChange={(e) => setForm({ ...form, threecxExtension: e.target.value })} placeholder="101" />
              </div>
              <div>
                <Label>3CX dahili şifresi</Label>
                <Input
                  value={form.threecxPassword}
                  onChange={(e) => setForm({ ...form, threecxPassword: e.target.value })}
                  type="password"
                  placeholder={form.autoProvision ? "Otomatik oluşturulacak" : "Manuel girin"}
                  disabled={form.autoProvision}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Checkbox
                  id="auto-provision"
                  checked={form.autoProvision}
                  onCheckedChange={(v) => setForm({ ...form, autoProvision: v === true })}
                />
                <Label htmlFor="auto-provision" className="font-normal cursor-pointer">
                  3CX&apos;te otomatik dahili oluştur (Configuration API)
                </Label>
              </div>
              <div>
                <Label>SIP domain (FQDN)</Label>
                <Input readOnly value={threecxFqdn ?? ""} placeholder="Önce 3CX ayarlarından FQDN kaydedin" className="bg-gray-50" />
              </div>
              <div>
                <Label>Dış numara (opsiyonel)</Label>
                <Input value={form.externalNumber} onChange={(e) => setForm({ ...form, externalNumber: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>WSS URL (opsiyonel)</Label>
                <Input
                  value={form.sipWssUrl}
                  onChange={(e) => setForm({ ...form, sipWssUrl: e.target.value })}
                  placeholder={threecxWss ?? "wss://sirket.3cx.com.tr:443/ws"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Boş bırakılırsa 3CX cloud WSS kullanılır ({threecxWss ?? "wss://FQDN:443/ws"}).
                  {!threecxFqdn ? (
                    <>
                      {" "}
                      <a href="/admin/yekpare-ai-call/3cx" className="text-[#e61e25] underline">
                        3CX ayarları
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Dahili numarası</Label>
                <Input value={form.localExtension} onChange={(e) => setForm({ ...form, localExtension: e.target.value })} placeholder="101" />
              </div>
              <div>
                <Label>Dahili SIP şifresi (opsiyonel)</Label>
                <Input value={form.sipSecret} onChange={(e) => setForm({ ...form, sipSecret: e.target.value })} type="password" />
              </div>
              <div className="sm:col-span-2">
                <Label>SIP trunk</Label>
                <Select value={form.trunkId || "__none__"} onValueChange={(v) => setForm({ ...form, trunkId: v === "__none__" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Trunk seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seçilmedi</SelectItem>
                    {trunks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Trunk kayıtları SIP Trunk sayfasından yönetilir; kampanya yönlendirmesinde kullanılır.
                </p>
              </div>
            </>
          )}
        </div>

        {msg ? (
          <p className={`text-sm ${msgOk ? "text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2" : "text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"}`}>
            {msg}
          </p>
        ) : null}
        <Button onClick={() => void submit()} disabled={saving} className="gap-2 bg-[#1e3a5f]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Kullanıcı</th>
              <th className="px-4 py-2 text-left">Ad</th>
              <th className="px-4 py-2 text-left">Dahili</th>
              <th className="px-4 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 font-mono">{a.username}</td>
                <td className="px-4 py-2">{a.displayName}</td>
                <td className="px-4 py-2">{a.extension ?? "—"}</td>
                <td className="px-4 py-2">{a.statusLabelTr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PbxLayout>
  );
}
