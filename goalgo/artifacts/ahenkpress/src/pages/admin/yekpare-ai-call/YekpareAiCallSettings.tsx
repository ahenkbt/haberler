import { useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  fetchAiCallSettings,
  saveAiCallSettings,
  testGemini,
  testOpenAi,
  type AiCallSettings,
} from "@/lib/aiCallApi";
import { Loader2, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function YekpareAiCallSettings() {
  const [settings, setSettings] = useState<AiCallSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [testMsg, setTestMsg] = useState<{ openai?: string; gemini?: string }>({});
  const [testing, setTesting] = useState<{ openai?: boolean; gemini?: boolean }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await fetchAiCallSettings());
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        defaultProvider: settings.defaultProvider,
        defaultModel: settings.defaultModel,
        demoMode: settings.demoMode,
      };
      if (openaiKey.trim()) patch.openaiApiKey = openaiKey.trim();
      if (geminiKey.trim()) patch.geminiApiKey = geminiKey.trim();
      const next = await saveAiCallSettings(patch);
      setSettings(next);
      setOpenaiKey("");
      setGeminiKey("");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (provider: "openai" | "gemini") => {
    setTesting((t) => ({ ...t, [provider]: true }));
    setTestMsg((m) => ({ ...m, [provider]: undefined }));
    try {
      const fn = provider === "openai" ? testOpenAi : testGemini;
      const key = provider === "openai" ? openaiKey : geminiKey;
      const result = await fn(key.trim() || undefined, settings?.defaultModel);
      setTestMsg((m) => ({
        ...m,
        [provider]: result.ok ? `Başarılı: ${result.content ?? "OK"}` : `Hata: ${result.error}`,
      }));
    } catch (err) {
      setTestMsg((m) => ({
        ...m,
        [provider]: err instanceof Error ? err.message : "Test başarısız",
      }));
    } finally {
      setTesting((t) => ({ ...t, [provider]: false }));
    }
  };

  if (loading) {
    return (
      <YekpareAiCallLayout title="Ayarlar">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
        </div>
      </YekpareAiCallLayout>
    );
  }

  return (
    <YekpareAiCallLayout title="Ayarlar">
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#e61e25]" />
          <h2 className="text-lg font-semibold">AI sağlayıcı anahtarları</h2>
        </div>
        <p className="text-sm text-gray-600">
          OpenAI ve/veya Gemini API anahtarlarınızı yapıştırın. Anahtarlar veritabanında şifreli saklanır; yanıtta
          maskelenir.
        </p>

        <div className="flex items-center gap-3">
          <Switch
            id="demo-mode"
            checked={settings?.demoMode ?? true}
            onCheckedChange={(v) => settings && setSettings({ ...settings, demoMode: v })}
          />
          <Label htmlFor="demo-mode">Demo mod (anahtar olmadan simülasyon)</Label>
        </div>

        <div className="space-y-4">
          <div>
            <Label>OpenAI API anahtarı</Label>
            {settings?.hasOpenaiKey ? (
              <p className="text-xs text-gray-500 mt-1">Kayıtlı: {settings.openaiKeyMasked}</p>
            ) : null}
            <Input
              className="mt-1 font-mono text-sm"
              type="password"
              placeholder="sk-…"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" disabled={testing.openai} onClick={() => void runTest("openai")}>
                {testing.openai ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Bağlantıyı Test Et
              </Button>
            </div>
            {testMsg.openai ? (
              <p className={`text-xs mt-1 flex items-center gap-1 ${testMsg.openai.startsWith("Başarılı") ? "text-green-700" : "text-red-700"}`}>
                {testMsg.openai.startsWith("Başarılı") ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testMsg.openai}
              </p>
            ) : null}
          </div>

          <div>
            <Label>Gemini API anahtarı</Label>
            {settings?.hasGeminiKey ? (
              <p className="text-xs text-gray-500 mt-1">Kayıtlı: {settings.geminiKeyMasked}</p>
            ) : null}
            <Input
              className="mt-1 font-mono text-sm"
              type="password"
              placeholder="AIza…"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" disabled={testing.gemini} onClick={() => void runTest("gemini")}>
                {testing.gemini ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Bağlantıyı Test Et
              </Button>
            </div>
            {testMsg.gemini ? (
              <p className={`text-xs mt-1 flex items-center gap-1 ${testMsg.gemini.startsWith("Başarılı") ? "text-green-700" : "text-red-700"}`}>
                {testMsg.gemini.startsWith("Başarılı") ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testMsg.gemini}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Varsayılan sağlayıcı</Label>
            <Select
              value={settings?.defaultProvider ?? "openai"}
              onValueChange={(v) => settings && setSettings({ ...settings, defaultProvider: v as "openai" | "gemini" })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Varsayılan model</Label>
            <Input
              className="mt-1"
              value={settings?.defaultModel ?? "gpt-4o-mini"}
              onChange={(e) => settings && setSettings({ ...settings, defaultModel: e.target.value })}
              placeholder="gpt-4o-mini veya gemini-2.0-flash"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Kaydet
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Badge variant={settings?.hasOpenaiKey ? "default" : "secondary"}>OpenAI {settings?.hasOpenaiKey ? "✓" : "—"}</Badge>
          <Badge variant={settings?.hasGeminiKey ? "default" : "secondary"}>Gemini {settings?.hasGeminiKey ? "✓" : "—"}</Badge>
          {settings?.demoMode ? <Badge variant="outline">Demo mod aktif</Badge> : null}
        </div>
      </div>
    </YekpareAiCallLayout>
  );
}
