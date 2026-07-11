import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchVerimorSettings, saveVerimorSettings, type VerimorSettings } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { CheckCircle2, Loader2, Phone, Save } from "lucide-react";

export default function PbxVerimorSettings() {
  const [settings, setSettings] = useState<VerimorSettings | null>(null);
  const [softphoneEnabled, setSoftphoneEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchVerimorSettings();
      setSettings(s);
      setSoftphoneEnabled(s.softphoneEnabled ?? s.enabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const s = await saveVerimorSettings({ softphoneEnabled, enabled: softphoneEnabled });
      setSettings(s);
      setMsg("Verimor softphone modu kaydedildi. API anahtarı gerekmez.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PbxLayout title="Verimor Softphone">
        <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
      </PbxLayout>
    );
  }

  return (
    <PbxLayout title="Verimor Softphone">
      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#e61e25]" />
          <h2 className="font-semibold">PortSIP benzeri mod (API key yok)</h2>
        </div>
        <p className="text-sm text-gray-600">
          Her agent için admin panelden <strong>dahili no + Verimor şifresi + domain</strong> tanımlayın.
          Personel <code className="bg-gray-100 px-1 rounded">/pbx</code> adresinden Yekpare kullanıcı adı ile giriş yapar;
          tarayıcı Verimor santraline SIP/WebRTC ile bağlanır.
        </p>

        <div className="flex items-center gap-3">
          <Switch checked={softphoneEnabled} onCheckedChange={setSoftphoneEnabled} id="softphone" />
          <Label htmlFor="softphone">Verimor softphone modunu etkinleştir</Label>
        </div>

        <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1 bg-slate-50 rounded-lg p-4">
          <li>Bu sayfada modu açıp kaydedin</li>
          <li><a href="/admin/yekpare-ai-call/temsilci" className="text-[#e61e25] underline">Verimor Agent</a> sayfasından agent ekleyin</li>
          <li><a href="/admin/yekpare-ai-call/kampanya" className="text-[#e61e25] underline">Kampanya</a> oluşturup durumu &quot;running&quot; yapın</li>
          <li>Agent <code className="bg-gray-100 px-1 rounded">/pbx</code> → giriş → kampanyaya katıl</li>
        </ol>

        <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-[#1e3a5f]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
        {msg ? (
          <p className="text-sm flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </p>
        ) : null}
      </div>

      {settings?.hasApiKey ? (
        <div className="rounded-xl border bg-slate-50 p-4 text-xs text-gray-600">
          İsteğe bağlı API anahtarı kayıtlı ({settings.apiKeyMasked}). Canlı izleme webhook gibi gelişmiş özellikler için kullanılır; softphone için zorunlu değildir.
        </div>
      ) : null}
    </PbxLayout>
  );
}
