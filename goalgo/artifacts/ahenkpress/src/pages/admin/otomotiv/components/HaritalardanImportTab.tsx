import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { MapImportCandidate } from "../otomotivAdminTypes";
import { OTOMOTIV_BUSINESS_TYPES } from "../otomotivAdminConfig";
import { Btn, Field, MarketplaceDisclaimer, inp, sel } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

export function HaritalardanImportTab() {
  const [businessType, setBusinessType] = useState("galeri");
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<MapImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams({ business_type: businessType });
    if (q) params.set("q", q);
    try {
      const res = await apiFetch(`${ADMIN}/map-import/candidates?${params}`);
      const data = (await res.json()) as { candidates?: MapImportCandidate[]; _note?: string };
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      if (data._note) setMessage(data._note);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [businessType, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const res = await apiFetch(`${ADMIN}/map-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map_business_ids: [...selected], business_type: businessType }),
      });
      const data = (await res.json()) as { message?: string; imported?: number };
      setMessage(data.message ?? `${data.imported ?? 0} işletme içe aktarıldı.`);
      setSelected(new Set());
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />
      <p className="text-sm text-gray-600">
        Haritalardaki otomotiv işletmelerini seçerek otomotiv paneline aktarın. Galeri importu için hedef türü &quot;Oto Galeri&quot; seçin.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Hedef işletme türü">
          <select className={sel} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            {OTOMOTIV_BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Ara">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input className={`${inp} pl-9 min-w-[200px]`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşletme adı" />
          </div>
        </Field>
        <Btn onClick={() => void load()} className="bg-white border text-gray-600"><RefreshCw size={14} /> Ara</Btn>
        <Btn
          onClick={() => void importSelected()}
          disabled={selected.size === 0 || importing}
          className="bg-[#1e3a5f] text-white ml-auto"
        >
          <Download size={14} /> {importing ? "Aktarılıyor…" : `Seçilenleri Aktar (${selected.size})`}
        </Btn>
      </div>

      {message ? <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">{message}</p> : null}

      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 w-10" />
              <th className="px-3 py-2">İşletme</th>
              <th className="px-3 py-2">Tür</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Haritalarda otomotiv adayı bulunamadı.</td></tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  </td>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-gray-600">{String(c.store_type ?? c.category_slug ?? "—")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
