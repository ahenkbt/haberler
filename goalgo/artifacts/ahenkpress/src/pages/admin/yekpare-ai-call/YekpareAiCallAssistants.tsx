import { useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  deleteAssistant,
  fetchAssistants,
  saveAssistant,
  type AiCallAssistant,
} from "@/lib/aiCallApi";
import { Bot, Loader2, Plus, Trash2 } from "lucide-react";

const empty = (): Partial<AiCallAssistant> & { name: string } => ({
  name: "",
  systemPrompt: "Sen yardımcı bir çağrı merkezi asistanısın. Türkçe ve kısa yanıt ver.",
  voice: "alloy",
  provider: "openai",
  model: "gpt-4o-mini",
  enabled: true,
});

export default function YekpareAiCallAssistants() {
  const [rows, setRows] = useState<AiCallAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAssistants());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) {
      setMsg("Asistan adı zorunludur.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await saveAssistant(form);
      setForm(empty());
      await load();
      setMsg("Kaydedildi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu asistan silinsin mi?")) return;
    await deleteAssistant(id);
    await load();
  };

  return (
    <YekpareAiCallLayout title="AI Asistanlar">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {form.id ? "Asistan düzenle" : "Yeni AI asistan"}
          </h2>
          <div className="grid gap-3">
            <div>
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Sistem istemi</Label>
              <Textarea
                rows={4}
                value={form.systemPrompt ?? ""}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sağlayıcı</Label>
                <Select
                  value={form.provider ?? "openai"}
                  onValueChange={(v) => setForm({ ...form, provider: v as "openai" | "gemini" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Input value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Ses (TTS — Faz 2)</Label>
              <Input value={form.voice ?? "alloy"} onChange={(e) => setForm({ ...form, voice: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled !== false} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          {msg ? <p className="text-sm text-gray-600">{msg}</p> : null}
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Kaydet
            </Button>
            {form.id ? (
              <Button type="button" variant="outline" onClick={() => setForm(empty())}>
                İptal
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#e61e25]" />
            <span className="font-semibold">Asistan listesi</span>
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-auto" /> : null}
          </div>
          <ul className="divide-y">
            {rows.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{a.systemPrompt.slice(0, 80)}…</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{a.provider}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.model}</Badge>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm(a)}>
                  Düzenle
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove(a.id)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </li>
            ))}
            {!loading && rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">Henüz asistan yok.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </YekpareAiCallLayout>
  );
}
