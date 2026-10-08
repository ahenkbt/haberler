import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailPlus, RefreshCw } from "lucide-react";

/**
 * Haber siteleri posta kutuları — "Yeni mail adresi aç" (admin).
 * Kenar API: /api/hm/admin/site-mail/boxes (panel oturumu). Kutular Yekpare Posta ile ortaktır;
 * editörler kendi sitelerinin kutusunu editör panelinde (Posta kutusu) şifresiz açar.
 */
type SiteRow = {
  siteId: number;
  slug: string;
  displayName: string;
  hosts: string[];
  defaults: string[];
  editorLogin: string | null;
  createDomains: string[];
  boxes: { address: string; displayName: string | null }[];
};

function domainChoices(s: SiteRow): string[] {
  const out = [...s.createDomains];
  for (const a of s.defaults) {
    const d = a.split("@")[1];
    if (d && !out.includes(d)) out.push(d);
  }
  return out;
}

export default function AdminHaberPostaKutulari() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [siteId, setSiteId] = useState<number | null>(null);
  const [local, setLocal] = useState("");
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hm/admin/site-mail/boxes", { credentials: "include" });
      const d = (await res.json().catch(() => ({}))) as { sites?: SiteRow[]; error?: string };
      if (!res.ok) throw new Error(d.error || res.statusText);
      setSites(d.sites ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = sites.find((s) => s.siteId === siteId) ?? null;

  async function create() {
    if (!selected) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/hm/admin/site-mail/boxes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selected.siteId, localPart: local, domain, displayName: name }),
      });
      const d = (await res.json().catch(() => ({}))) as { address?: string; note?: string; error?: string };
      if (!res.ok) throw new Error(d.error || res.statusText);
      setInfo(`${d.address} açıldı.${d.note ? ` ${d.note}` : ""}`);
      setLocal("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminLayout title="Haber siteleri posta kutuları">
      <div className="max-w-5xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Haber siteleri posta kutuları</h1>
            <p className="text-sm text-gray-600">
              Her haber sitesinin varsayılan kutusu bilgi@alanadı (alt alan adı sitelerde ör. kibris@gundemi.org).
              Editörler kutuyu editör panelindeki «Posta kutusu» sayfasında şifresiz açar. Editör girişi de aynı adrestir
              (kullanıcı adı = şifre).
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Yenile
          </Button>
        </div>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {info ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="flex items-center gap-2 font-bold text-gray-900">
            <MailPlus className="h-4 w-4" /> Yeni mail adresi aç
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Site</Label>
              <select
                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                value={siteId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  setSiteId(id);
                  const s = sites.find((x) => x.siteId === id);
                  setDomain(s ? domainChoices(s)[0] ?? "" : "");
                }}
              >
                <option value="">Site seçin</option>
                {sites.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.displayName} ({s.hosts[0] ?? s.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adres</Label>
              <Input value={local} onChange={(e) => setLocal(e.target.value.toLowerCase())} placeholder="haber" className="w-40" />
            </div>
            <span className="pb-2 text-gray-500">@</span>
            <div className="space-y-1">
              <Label className="text-xs">Alan adı</Label>
              <select className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} disabled={!selected}>
                {(selected ? domainChoices(selected) : []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Görünen ad</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Haber Masası" className="w-48" />
            </div>
            <Button type="button" className="bg-gray-900 text-white" disabled={!selected || !local.trim() || !domain || creating} onClick={() => void create()}>
              {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Aç
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Editör girişi</th>
                <th className="px-3 py-2">Posta kutuları</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sites.map((s) => (
                <tr key={s.siteId}>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-gray-900">{s.displayName}</span>
                    <span className="block text-xs text-gray-500">{s.hosts.join(", ")}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.editorLogin ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.boxes.length ? s.boxes.map((b) => <span key={b.address} className="mr-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono">{b.address}</span>) : <span className="text-gray-400">henüz yok (editör ilk açtığında oluşur)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
