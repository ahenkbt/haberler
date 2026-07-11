import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fetchExtensions, saveExtension, type PbxExtension } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Loader2, Plus, Save } from "lucide-react";

const emptyForm = (): Partial<PbxExtension> & { extension: string; displayName: string } => ({
  extension: "",
  displayName: "",
  email: "",
  sipSecret: "",
  provider: "verimor",
  externalNumber: "",
  voicemail: true,
  enabled: true,
  queueIds: [],
});

export default function PbxExtensions() {
  const [rows, setRows] = useState<PbxExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchExtensions());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (row: PbxExtension) => {
    setForm({ ...row });
    setMsg(null);
  };

  const submit = async () => {
    if (!form.extension.trim() || !form.displayName.trim()) {
      setMsg("Dahili numarası ve ad zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await saveExtension(form);
      setForm(emptyForm());
      await load();
      setMsg("Kaydedildi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="Dahililer">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {form.id ? "Dahili düzenle" : "Yeni dahili"}
          </h2>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dahili no</Label>
                <Input value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="101" />
              </div>
              <div>
                <Label>Görünen ad</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>E-posta</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>SIP şifresi (Verimor)</Label>
              <Input value={form.sipSecret ?? ""} onChange={(e) => setForm({ ...form, sipSecret: e.target.value })} placeholder="RWG-693bqp" />
              <p className="text-xs text-gray-500 mt-1">OIM Cihaz Kurulum Sihirbazı&apos;ndaki şifre</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sağlayıcı</Label>
                <select
                  className="w-full border rounded-md h-9 px-2 text-sm"
                  value={form.provider ?? "verimor"}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as "local" | "verimor" })}
                >
                  <option value="verimor">Verimor Bulutsantralim</option>
                  <option value="local">Yerel / Demo</option>
                </select>
              </div>
              <div>
                <Label>Dış numara (Caller ID)</Label>
                <Input
                  value={form.externalNumber ?? ""}
                  onChange={(e) => setForm({ ...form, externalNumber: e.target.value })}
                  placeholder="903129630795"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.voicemail ?? true} onCheckedChange={(v) => setForm({ ...form, voicemail: v })} />
                <Label>Sesli posta</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled ?? true} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                <Label>Aktif</Label>
              </div>
            </div>
          </div>
          {msg ? <p className="text-sm text-gray-600">{msg}</p> : null}
          <Button onClick={() => void submit()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </Button>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold">Dahili listesi</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Dahili</th>
                  <th className="px-4 py-2">Ad</th>
                  <th className="px-4 py-2">Sağlayıcı</th>
                  <th className="px-4 py-2">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => edit(row)}>
                    <td className="px-4 py-2 font-mono font-medium">{row.extension}</td>
                    <td className="px-4 py-2">{row.displayName}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{row.provider === "verimor" ? "Verimor" : "Yerel"}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={row.enabled ? "default" : "secondary"}>{row.enabled ? "Aktif" : "Pasif"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PbxLayout>
  );
}
