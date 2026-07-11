import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Badge, Btn, StubNotice } from "../otomotiv/components/OtomotivAdminUi";

type Lead = {
  id: number;
  lead_type: string;
  contact_name: string | null;
  contact_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  status: string;
  created_at: string;
};

export function SigortaLeadlerTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(apiUrl("/api/otomotiv/sigorta/admin/leads"));
      const data = (await res.json()) as { leads?: Lead[] };
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <StubNotice phase="Lead Yönetimi — Faz 5">
        Araç ilanı ve /otomotiv/sigorta sayfasından gelen teklif talepleri. Acente paneli chat entegrasyonu sonraki faz.
      </StubNotice>
      <div className="flex justify-end">
        <Btn onClick={() => void load()} className="bg-white border text-gray-600">
          <RefreshCw size={14} />
        </Btn>
      </div>
      <div className="border rounded-xl bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Tür</th>
              <th className="px-4 py-2">İletişim</th>
              <th className="px-4 py-2">Araç</th>
              <th className="px-4 py-2">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-gray-500">Yükleniyor…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-gray-500">Henüz lead yok.</td></tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.id}</td>
                  <td className="px-4 py-2">{l.lead_type}</td>
                  <td className="px-4 py-2">{l.contact_name ?? "—"}<br /><span className="text-xs text-gray-500">{l.contact_phone}</span></td>
                  <td className="px-4 py-2">{[l.vehicle_brand, l.vehicle_model].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-4 py-2"><Badge status={l.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Acente paneli: <Link href="/admin/sigorta" className="text-[#1e3a5f] underline">/admin/sigorta</Link> (lead atama sonraki faz)
      </p>
    </div>
  );
}
