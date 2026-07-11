import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchDispositionCodesAdmin,
  fetchDispositionLog,
  fetchGoogleSheetsConfig,
  saveDispositionCode,
  saveGoogleSheetsConfig,
  type PbxCallDispositionRow,
  type PbxDispositionCode,
  type PbxGoogleSheetsConfig,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { Loader2, RefreshCw, Save, Sheet } from "lucide-react";

export default function PbxDispositions() {
  const [codes, setCodes] = useState<PbxDispositionCode[]>([]);
  const [log, setLog] = useState<PbxCallDispositionRow[]>([]);
  const [sheets, setSheets] = useState<PbxGoogleSheetsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, g] = await Promise.all([
        fetchDispositionCodesAdmin(),
        fetchDispositionLog(),
        fetchGoogleSheetsConfig(),
      ]);
      setCodes(c.codes);
      setLog(l);
      setSheets(g);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCode = async (code: PbxDispositionCode) => {
    await saveDispositionCode({ ...code, enabled: !code.enabled });
    await load();
  };

  const saveSheets = async () => {
    if (!sheets) return;
    setSaving(true);
    try {
      await saveGoogleSheetsConfig(sheets);
      setMsg("Google Sheets ayarları kaydedildi.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PbxLayout title="Sonlandırma kodları & Rapor">
      <p className="text-sm text-gray-600">
        Agent çağrı sonrası disposition (wrap-up) kodlarını işaretler. Kodlar kampanya, agent, Verimor domain veya SIP
        trunk kapsamında aktif/pasif yapılabilir. Google Sheets webhook ile anlık rapor alınabilir.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Sonlandırma kodları</h2>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor…</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.labelTr}</p>
                    <p className="text-xs text-gray-500">
                      {c.categoryLabelTr ?? c.category} · <code>{c.code}</code>
                    </p>
                  </div>
                  <Switch checked={c.enabled} onCheckedChange={() => void toggleCode(c)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Sheet className="w-4 h-4" /> Google E-Tablo raporu
          </h2>
          <p className="text-xs text-gray-500">
            Google Apps Script web uygulaması URL&apos;si yapıştırın; her disposition kaydında JSON POST gider. Bağlı
            e-posta bilgi amaçlıdır.
          </p>
          {sheets ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={sheets.enabled}
                  onCheckedChange={(v) => setSheets({ ...sheets, enabled: v })}
                />
                <Label>E-Tablo senkronu aktif</Label>
              </div>
              <div>
                <Label>Webhook URL (Apps Script)</Label>
                <Input
                  value={sheets.webhookUrl}
                  onChange={(e) => setSheets({ ...sheets, webhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/…/exec"
                />
              </div>
              <div>
                <Label>Spreadsheet ID (isteğe bağlı)</Label>
                <Input
                  value={sheets.spreadsheetId}
                  onChange={(e) => setSheets({ ...sheets, spreadsheetId: e.target.value })}
                />
              </div>
              <div>
                <Label>Sheet adı</Label>
                <Input
                  value={sheets.sheetName}
                  onChange={(e) => setSheets({ ...sheets, sheetName: e.target.value })}
                />
              </div>
              <div>
                <Label>Bağlı Google hesabı (etiket)</Label>
                <Input
                  value={sheets.connectedEmail}
                  onChange={(e) => setSheets({ ...sheets, connectedEmail: e.target.value })}
                  placeholder="rapor@firma.com"
                />
              </div>
              <div>
                <Label>Verimor varsayılan WSS URL</Label>
                <Input
                  value={sheets.verimorDefaultWssUrl}
                  onChange={(e) => setSheets({ ...sheets, verimorDefaultWssUrl: e.target.value })}
                  placeholder="wss://api.bulutsantralim.com:7443"
                />
                <p className="text-xs text-gray-500 mt-1">
                  WebRTC softphone WSS uç noktası — port 7443 olmalı (:443 çalışmaz, kayıtta otomatik düzeltilir).
                </p>
              </div>
              <Button onClick={() => void saveSheets()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-3 border-b font-semibold flex items-center gap-2">
          Agent sonlandırma kayıtları
          <Badge variant="outline" className="ml-2">
            {log.length}
          </Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2">Zaman</th>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Kampanya</th>
              <th className="px-4 py-2">Numara</th>
              <th className="px-4 py-2">Kod</th>
              <th className="px-4 py-2">Sheets</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {log.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                <td className="px-4 py-2">{r.agentName ?? "—"}</td>
                <td className="px-4 py-2">{r.campaignName ?? "—"}</td>
                <td className="px-4 py-2 font-mono">{r.phone || "—"}</td>
                <td className="px-4 py-2">{r.labelTr}</td>
                <td className="px-4 py-2">
                  <Badge variant={r.sheetsSynced ? "default" : "outline"}>{r.sheetsSynced ? "OK" : "—"}</Badge>
                </td>
              </tr>
            ))}
            {!loading && log.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Henüz kayıt yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {msg ? <p className="text-sm text-gray-600 mt-2">{msg}</p> : null}
    </PbxLayout>
  );
}
