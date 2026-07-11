import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchThreeCxSettings,
  saveThreeCxSettings,
  testThreeCxConnection,
  type ThreeCxSettings,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { CheckCircle2, Loader2, Phone, Plug, Save } from "lucide-react";

export default function Pbx3cxSettings() {
  const [settings, setSettings] = useState<ThreeCxSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [fqdn, setFqdn] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchThreeCxSettings();
      setSettings(s);
      setEnabled(s.enabled);
      setFqdn(s.fqdn ?? "");
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
      const s = await saveThreeCxSettings({
        enabled,
        fqdn: fqdn.trim() || null,
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
      });
      setSettings(s);
      setClientId("");
      setClientSecret("");
      setMsg("3CX ayarları kaydedildi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const result = await testThreeCxConnection();
      setTestOk(result.ok);
      setTestMsg(result.message);
    } catch (err) {
      setTestOk(false);
      setTestMsg(err instanceof Error ? err.message : "Test başarısız");
    } finally {
      setTesting(false);
    }
  };

  const wssPreview = fqdn.trim() ? `wss://${fqdn.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "")}:443/ws` : settings?.defaultWssUrl;

  if (loading) {
    return (
      <PbxLayout title="3CX Ayarları">
        <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
      </PbxLayout>
    );
  }

  return (
    <PbxLayout title="3CX Ayarları">
      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#e61e25]" />
          <h2 className="font-semibold">3CX Configuration API</h2>
        </div>
        <p className="text-sm text-gray-600">
          3CX V20 XAPI ile Yekpare panelinden dahili oluşturabilirsiniz. Temsilci tarayıcı softphone&apos;u{" "}
          <code className="bg-gray-100 px-1 rounded">wss://FQDN:443/ws</code> üzerinden bağlanır.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {settings?.licenseNote}
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="threecx-enabled" />
          <Label htmlFor="threecx-enabled">3CX API entegrasyonunu etkinleştir</Label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>3CX FQDN (sunucu adresi)</Label>
            <Input
              value={fqdn}
              onChange={(e) => setFqdn(e.target.value)}
              placeholder="sirket.3cx.com.tr"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Client ID (Service Principal DN)</Label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={settings?.hasClientId ? settings.clientIdMasked : "yekpare-api"}
              className="mt-1.5"
            />
            {settings?.hasClientId ? (
              <p className="text-xs text-gray-500 mt-1">Kayıtlı: {settings.clientIdMasked}</p>
            ) : null}
          </div>
          <div>
            <Label>API key (Client Secret)</Label>
            <Input
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              type="password"
              placeholder={settings?.hasClientSecret ? "••••••••" : "Integrations → API'den kopyalayın"}
              className="mt-1.5"
            />
            {settings?.hasClientSecret ? (
              <p className="text-xs text-gray-500 mt-1">Kayıtlı: {settings.clientSecretMasked}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Label>Varsayılan WebRTC WSS (önizleme)</Label>
            <Input readOnly value={wssPreview ?? ""} className="mt-1.5 bg-gray-50 font-mono text-sm" />
          </div>
        </div>

        <details className="text-sm text-gray-700 bg-slate-50 rounded-lg p-4">
          <summary className="cursor-pointer font-medium">3CX Admin kurulum adımları</summary>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            {(settings?.setupSteps ?? []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-[#1e3a5f]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </Button>
          <Button variant="outline" onClick={() => void test()} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            Bağlantıyı test et
          </Button>
        </div>

        {msg ? (
          <p className="text-sm flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </p>
        ) : null}
        {testMsg ? (
          <p className={`text-sm rounded-lg px-3 py-2 ${testOk ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"}`}>
            {testMsg}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border bg-slate-50 p-4 text-sm text-gray-600 space-y-2">
        <p>
          API olmadan da çalışır: 3CX Admin&apos;de dahili oluşturup{" "}
          <a href="/admin/yekpare-ai-call/temsilci" className="text-[#e61e25] underline">
            Temsilciler
          </a>{" "}
          sayfasında <strong>3CX</strong> modunu seçin ve şifreyi manuel girin.
        </p>
      </div>
    </PbxLayout>
  );
}
