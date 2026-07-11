import { Fragment, useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAiCallLogs, type AiCallLog } from "@/lib/aiCallApi";
import { Loader2, Phone, RefreshCw } from "lucide-react";

export default function YekpareAiCallLogs() {
  const [logs, setLogs] = useState<AiCallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchAiCallLogs(100));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <YekpareAiCallLayout title="Arama kayıtları">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-[#e61e25]" />
        <h2 className="font-semibold">Çağrı geçmişi</h2>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Tarih</th>
              <th className="px-4 py-2 text-left">Telefon</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Sağlayıcı</th>
              <th className="px-4 py-2 text-left">Süre</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <Fragment key={log.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <td className="px-4 py-2 text-xs">{new Date(log.startedAt).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-2 font-mono">{log.phone}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{log.status}</Badge>
                    {log.transferred ? <Badge className="ml-1 bg-amber-100 text-amber-800">Aktarıldı</Badge> : null}
                  </td>
                  <td className="px-4 py-2 text-xs">{log.provider} / {log.model}</td>
                  <td className="px-4 py-2">{log.durationSec}s</td>
                </tr>
                {expanded === log.id ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 bg-gray-50 text-xs whitespace-pre-wrap">
                      <p className="font-semibold mb-1">Özet</p>
                      <p className="mb-2">{log.aiSummary || "—"}</p>
                      <p className="font-semibold mb-1">Transkript</p>
                      <p>{log.transcript || "—"}</p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Henüz arama kaydı yok. Bir kampanya başlatın.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </YekpareAiCallLayout>
  );
}
