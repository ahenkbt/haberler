import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fetchExtensions, fetchQueues, saveQueue, type PbxExtension, type PbxQueue } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Loader2, Plus, Save } from "lucide-react";

const STRATEGIES = [
  { value: "ringall", label: "Hepsini çal" },
  { value: "leastrecent", label: "En az meşgul" },
  { value: "fewestcalls", label: "En az çağrı" },
  { value: "random", label: "Rastgele" },
  { value: "rrmemory", label: "Sıralı hafıza" },
];

const emptyQueue = (): Partial<PbxQueue> & { name: string } => ({
  name: "",
  strategy: "ringall",
  timeoutSec: 30,
  maxlen: 50,
  musicOnHold: "default",
  memberExtensionIds: [],
  enabled: true,
});

export default function PbxQueues() {
  const [queues, setQueues] = useState<PbxQueue[]>([]);
  const [extensions, setExtensions] = useState<PbxExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyQueue());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, e] = await Promise.all([fetchQueues(), fetchExtensions()]);
      setQueues(q);
      setExtensions(e);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Veri alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) {
      setMsg("Kuyruk adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await saveQueue(form);
      setForm(emptyQueue());
      await load();
      setMsg("Kuyruk kaydedildi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="Kuyruklar">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {form.id ? "Kuyruk düzenle" : "Yeni kuyruk"}
          </h2>
          <div className="grid gap-3">
            <div>
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Strateji</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.strategy ?? "ringall"}
                onChange={(e) => setForm({ ...form, strategy: e.target.value })}
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Zaman aşımı (sn)</Label>
                <Input type="number" value={form.timeoutSec ?? 30} onChange={(e) => setForm({ ...form, timeoutSec: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Maks. bekleyen</Label>
                <Input type="number" value={form.maxlen ?? 50} onChange={(e) => setForm({ ...form, maxlen: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Üye dahililer</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {extensions.map((ext) => {
                  const checked = (form.memberExtensionIds ?? []).includes(ext.id);
                  return (
                    <label key={ext.id} className="flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const ids = form.memberExtensionIds ?? [];
                          setForm({
                            ...form,
                            memberExtensionIds: checked ? ids.filter((id: string) => id !== ext.id) : [...ids, ext.id],
                          });
                        }}
                      />
                      {ext.extension}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled ?? true} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          {msg ? <p className="text-sm text-gray-600">{msg}</p> : null}
          <Button onClick={() => void submit()} disabled={saving} className="gap-2 bg-[#1e3a5f]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </Button>
        </div>

        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {loading ? (
            <div className="p-6 text-gray-500">Yükleniyor…</div>
          ) : (
            queues.map((q) => (
              <button key={q.id} type="button" className="w-full text-left px-5 py-3 hover:bg-gray-50" onClick={() => setForm(q)}>
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{q.name}</span>
                  <Badge variant="outline">{q.strategy}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{q.memberExtensionIds.length} üye · timeout {q.timeoutSec}s</p>
              </button>
            ))
          )}
        </div>
      </div>
    </PbxLayout>
  );
}
