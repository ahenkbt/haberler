import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchIvrFlows, type PbxIvrFlow } from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { GitBranch, Loader2, RefreshCw } from "lucide-react";

export default function PbxIvr() {
  const [flows, setFlows] = useState<PbxIvrFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFlows(await fetchIvrFlows());
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PbxLayout title="Anlık IVR">
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-[#e61e25]" />
        <h2 className="font-semibold text-gray-900">IVR / Akış listesi</h2>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>
      <p className="text-sm text-gray-500">
        AgentLabs akış oluşturucu (flow-automation) üzerinden senkronize edilir.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {flows.map((f) => (
          <div key={f.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{f.name}</p>
              <Badge variant={f.enabled ? "default" : "secondary"}>{f.enabled ? "Aktif" : "Kapalı"}</Badge>
            </div>
          </div>
        ))}
        {!loading && flows.length === 0 ? (
          <p className="text-sm text-gray-500 col-span-2 py-8 text-center">IVR akışı bulunamadı.</p>
        ) : null}
      </div>
    </PbxLayout>
  );
}
