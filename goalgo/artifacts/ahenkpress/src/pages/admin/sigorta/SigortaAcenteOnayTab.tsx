import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Badge, Btn, StubNotice } from "../otomotiv/components/OtomotivAdminUi";

type Agent = {
  id: number;
  name: string;
  slug: string;
  license_no: string | null;
  city: string | null;
  status: string;
};

export function SigortaAcenteOnayTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(apiUrl("/api/otomotiv/sigorta/admin/agents"));
      const data = (await res.json()) as { agents?: Agent[] };
      setAgents(Array.isArray(data.agents) ? data.agents : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <StubNotice phase="Acente Onay — Faz 5">
        Levha numarası, evrak ve acente profili onayı. Onaylı acenteler lead alır; poliçe ve ödeme acente sorumluluğundadır.
      </StubNotice>
      <div className="flex justify-end">
        <Btn onClick={() => void load()} className="bg-white border text-gray-600">
          <RefreshCw size={14} />
        </Btn>
      </div>
      <div className="border rounded-xl bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">Acente</th>
              <th className="px-4 py-2">Levha</th>
              <th className="px-4 py-2">Şehir</th>
              <th className="px-4 py-2">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-gray-500">Yükleniyor…</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-gray-500">Henüz sigorta acentesi kaydı yok. Migration 0081 sonrası başvurular burada listelenecek.</td></tr>
            ) : (
              agents.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2">{a.license_no ?? "—"}</td>
                  <td className="px-4 py-2">{a.city ?? "—"}</td>
                  <td className="px-4 py-2"><Badge status={a.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
