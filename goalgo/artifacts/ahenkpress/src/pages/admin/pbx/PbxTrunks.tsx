import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fetchTrunks, saveTrunk, type PbxTrunk } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save } from "lucide-react";

const SIP_PROVIDER_PRESETS = ["Twilio", "Netgsm", "Verimor", "TurkNet"] as const;
const MANUAL_PROVIDER_KEY = "__manual__";

function matchPresetProvider(provider: string | undefined): string | null {
  const value = (provider ?? "").trim();
  if (!value) return null;
  return SIP_PROVIDER_PRESETS.find((preset) => preset.toLowerCase() === value.toLowerCase()) ?? null;
}

function providerSelectValue(provider: string | undefined): string {
  return matchPresetProvider(provider) ?? MANUAL_PROVIDER_KEY;
}

function isManualProvider(provider: string | undefined): boolean {
  return providerSelectValue(provider) === MANUAL_PROVIDER_KEY;
}

const emptyForm = (): Partial<PbxTrunk> & { name: string; password?: string } => ({
  name: "",
  provider: "",
  host: "",
  username: "",
  password: "",
  outboundCallerId: "",
  sipWssUrl: "",
  maxChannels: 10,
  register: true,
  enabled: true,
});

export default function PbxTrunks() {
  const [rows, setRows] = useState<PbxTrunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchTrunks());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (row: PbxTrunk) => {
    setForm({ ...row });
    setMsg(null);
    setMsgOk(false);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setMsg("Trunk adı zorunludur.");
      setMsgOk(false);
      return;
    }
    if (!form.provider?.trim()) {
      setMsg("Sağlayıcı adı zorunludur.");
      setMsgOk(false);
      return;
    }
    if (!form.host?.trim()) {
      setMsg("SIP sunucusu (IP veya host) zorunludur.");
      setMsgOk(false);
      return;
    }
    setSaving(true);
    setMsg(null);
    setMsgOk(false);
    try {
      await saveTrunk(form);
      setForm(emptyForm());
      await load();
      setMsg("Kaydedildi — trunk listeye eklendi.");
      setMsgOk(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
      setMsgOk(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="SIP Trunk">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {form.id ? "Trunk düzenle" : "Yeni SIP trunk"}
          </h2>
          <div className="grid gap-3">
            <div>
              <Label>Trunk adı</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TurkNet SIP" />
            </div>
            <div>
              <Label>Sağlayıcı</Label>
              <Select
                value={providerSelectValue(form.provider)}
                onValueChange={(value) => {
                  if (value === MANUAL_PROVIDER_KEY) {
                    setForm({
                      ...form,
                      provider: matchPresetProvider(form.provider) ? "" : (form.provider ?? ""),
                    });
                  } else {
                    setForm({ ...form, provider: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sağlayıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {SIP_PROVIDER_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_PROVIDER_KEY}>Diğer (Manuel / Yerli sağlayıcı)</SelectItem>
                </SelectContent>
              </Select>
              {isManualProvider(form.provider) ? (
                <Input
                  className="mt-2"
                  value={form.provider ?? ""}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  placeholder="örn. Netgsm, Verimor, TurkNet"
                />
              ) : null}
              <p className="text-xs text-gray-500 mt-1">
                Netgsm, Verimor gibi yerli sağlayıcılar için &quot;Diğer (Manuel)&quot; seçip adı yazın.
              </p>
            </div>
            <div>
              <Label>SIP sunucusu</Label>
              <Input value={form.host ?? ""} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="sip.ornek.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kullanıcı adı</Label>
                <Input value={form.username ?? ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <Label>Şifre</Label>
                <Input type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Giden arayan kimliği</Label>
              <Input value={form.outboundCallerId ?? ""} onChange={(e) => setForm({ ...form, outboundCallerId: e.target.value })} />
            </div>
            <div>
              <Label>WebRTC WSS URL (tarayıcı softphone)</Label>
              <Input
                value={form.sipWssUrl ?? ""}
                onChange={(e) => setForm({ ...form, sipWssUrl: e.target.value })}
                placeholder="wss://pbx.example.com:8089/ws"
              />
              <p className="text-xs text-gray-500 mt-1">
                Asterisk/PJSIP WebSocket uç noktası. Boş bırakılırsa PBX ayarlarındaki sip_bridge_ws_url veya PBX_WSS_URL env kullanılır.
              </p>
            </div>
            <div>
              <Label>Maks. kanal</Label>
              <Input type="number" value={form.maxChannels ?? 10} onChange={(e) => setForm({ ...form, maxChannels: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.register ?? true} onCheckedChange={(v) => setForm({ ...form, register: v })} />
                <Label>Kayıt ol (register)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled ?? true} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                <Label>Aktif</Label>
              </div>
            </div>
          </div>
          {msg ? (
            <p className={`text-sm ${msgOk ? "text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2" : "text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"}`}>
              {msg}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button onClick={() => void submit()} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Kaydet
            </Button>
            {form.id ? (
              <Button variant="outline" onClick={() => setForm(emptyForm())}>
                İptal
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold">Kayıtlı trunklar</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Henüz kayıtlı trunk yok. Sol formdan ekleyin.
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => edit(row)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.name}</span>
                    <Badge variant={row.enabled ? "default" : "secondary"}>{row.enabled ? "Aktif" : "Pasif"}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{row.host} · {row.provider}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PbxLayout>
  );
}
