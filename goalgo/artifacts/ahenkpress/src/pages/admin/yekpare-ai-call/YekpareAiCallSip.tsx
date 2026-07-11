import { useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { callCenterProxy, proxyErrorMessage } from "@/lib/callCenterProxy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Trash2, Server } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

type SipTrunk = {
  id: string;
  name: string;
  engine: string;
  provider: string;
  sipHost: string;
  sipPort: number;
  transport: string;
  isActive: boolean;
  healthStatus?: string;
  createdAt: string;
};

export default function YekpareAiCallSip() {
  const [trunks, setTrunks] = useState<SipTrunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    engine: "elevenlabs-sip",
    provider: "",
    sipHost: "",
    sipPort: "5061",
    transport: "tls",
    username: "",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callCenterProxy<{ success?: boolean; data?: SipTrunk[] }>("sip/trunks");
      if (!res.ok) {
        setError(proxyErrorMessage(res.data));
        setTrunks([]);
        return;
      }
      const list = (res.data as { data?: SipTrunk[] }).data ?? [];
      setTrunks(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTrunk = async () => {
    if (!form.provider.trim()) {
      setError("Sağlayıcı adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const res = await callCenterProxy("sip/trunks", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          engine: form.engine,
          provider: form.provider,
          sipHost: form.sipHost || undefined,
          sipPort: Number(form.sipPort) || 5061,
          transport: form.transport,
          username: form.username || undefined,
          password: form.password || undefined,
        }),
      });
      if (!res.ok) {
        setError(proxyErrorMessage(res.data));
        return;
      }
      setDialogOpen(false);
      setForm({
        name: "",
        engine: "elevenlabs-sip",
        provider: "",
        sipHost: "",
        sipPort: "5061",
        transport: "tls",
        username: "",
        password: "",
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteTrunk = async (id: string) => {
    if (!confirm("Bu SIP trunk silinsin mi?")) return;
    const res = await callCenterProxy(`sip/trunks/${id}`, { method: "DELETE" });
    if (!res.ok) setError(proxyErrorMessage(res.data));
    else await load();
  };

  const testTrunk = async (id: string) => {
    const res = await callCenterProxy<{ success?: boolean; message?: string }>(`sip/trunks/${id}/test`, {
      method: "POST",
    });
    if (res.ok) alert("Bağlantı testi gönderildi.");
    else setError(proxyErrorMessage(res.data));
  };

  return (
    <YekpareAiCallLayout title="SIP Trunk">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-xl">
          Kendi SIP sağlayıcınızı (Twilio, Netgsm, Verimor, TurkNet vb.) ElevenLabs veya OpenAI SIP motorlarına bağlayın.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Yenile
          </Button>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Trunk ekle
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 rounded-xl border bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : trunks.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <Server className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Henüz SIP trunk yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Motor</TableHead>
                <TableHead>Sağlayıcı</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trunks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.engine}</TableCell>
                  <TableCell>{t.provider}</TableCell>
                  <TableCell className="text-xs font-mono">{t.sipHost}</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.healthStatus ?? (t.isActive ? "aktif" : "pasif")}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => void testTrunk(t.id)}>
                      Test
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void deleteTrunk(t.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni SIP trunk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Motor</Label>
              <Select value={form.engine} onValueChange={(v) => setForm((f) => ({ ...f, engine: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs-sip">ElevenLabs SIP</SelectItem>
                  <SelectItem value="openai-sip">OpenAI SIP (yalnızca gelen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sağlayıcı</Label>
              <Select
                value={providerSelectValue(form.provider)}
                onValueChange={(value) => {
                  if (value === MANUAL_PROVIDER_KEY) {
                    setForm((f) => ({
                      ...f,
                      provider: matchPresetProvider(f.provider) ? "" : f.provider,
                    }));
                  } else {
                    setForm((f) => ({ ...f, provider: value }));
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
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                  placeholder="örn. Netgsm, Verimor, TurkNet"
                />
              ) : null}
              <p className="text-xs text-gray-500 mt-1">
                Netgsm, Verimor gibi yerli sağlayıcılar için &quot;Diğer (Manuel)&quot; seçip adı yazın.
              </p>
            </div>
            <div>
              <Label>SIP host</Label>
              <Input
                placeholder="ornek.pstn.twilio.com"
                value={form.sipHost}
                onChange={(e) => setForm((f) => ({ ...f, sipHost: e.target.value }))}
              />
            </div>
            <div>
              <Label>Kullanıcı / şifre (isteğe bağlı)</Label>
              <Input
                className="mb-2"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button type="button" disabled={saving || !form.name || !form.provider.trim()} onClick={() => void createTrunk()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </YekpareAiCallLayout>
  );
}
