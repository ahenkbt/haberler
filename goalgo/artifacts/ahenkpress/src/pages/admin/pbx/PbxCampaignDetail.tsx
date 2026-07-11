import { useCallback, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addCampaignContacts,
  fetchCampaignAdmin,
  fetchCampaignContacts,
  fetchCampaignResults,
  importCampaignContactsFile,
  type PbxCampaign,
  type PbxCampaignContact,
  type PbxCampaignResult,
} from "@/lib/pbxApi";
import { PbxLayout } from "./PbxLayout";
import { ArrowLeft, FileSpreadsheet, Loader2, Phone, RefreshCw, Upload } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  dialing: "bg-amber-100 text-amber-800",
  answered: "bg-emerald-100 text-emerald-800",
  no_answer: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function PbxCampaignDetail() {
  const [, params] = useRoute("/admin/yekpare-ai-call/kampanya/:id");
  const campaignId = params?.id ?? "";

  const [campaign, setCampaign] = useState<PbxCampaign | null>(null);
  const [contacts, setContacts] = useState<PbxCampaignContact[]>([]);
  const [results, setResults] = useState<PbxCampaignResult[]>([]);
  const [tab, setTab] = useState<"contacts" | "results">("contacts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [pasteText, setPasteText] = useState("");

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [c, list, res] = await Promise.all([
        fetchCampaignAdmin(campaignId),
        fetchCampaignContacts(campaignId),
        fetchCampaignResults(campaignId),
      ]);
      setCampaign(c);
      setContacts(list);
      setResults(res);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addManual = async () => {
    if (!manualPhone.trim()) {
      setMsg("Telefon numarası zorunludur.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const result = await addCampaignContacts(campaignId, {
        contacts: [{ phone: manualPhone.trim(), name: manualName.trim() }],
      });
      setCampaign(result.campaign);
      setManualPhone("");
      setManualName("");
      setMsg(`${result.added} kişi eklendi${result.skipped ? `, ${result.skipped} atlandı` : ""}.`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ekleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const addPaste = async () => {
    if (!pasteText.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const result = await addCampaignContacts(campaignId, { text: pasteText });
      setCampaign(result.campaign);
      setPasteText("");
      setMsg(`${result.added} kişi eklendi${result.skipped ? `, ${result.skipped} atlandı` : ""}.`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ekleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const onFileUpload = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
    setMsg(null);
    try {
      const result = await importCampaignContactsFile(campaignId, file);
      setCampaign(result.campaign);
      setMsg(
        `${result.parsedCount} satır okundu, ${result.added} kişi eklendi${result.skipped ? `, ${result.skipped} atlandı` : ""}.`,
      );
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "İçe aktarma başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (!campaignId) {
    return (
      <PbxLayout title="Kampanya">
        <p className="text-sm text-gray-600">Geçersiz kampanya.</p>
      </PbxLayout>
    );
  }

  return (
    <PbxLayout title={campaign?.name ?? "Kampanya detayı"}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/yekpare-ai-call/kampanya">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Listeye dön
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </Button>
      </div>

      {campaign ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-wrap gap-3 text-sm">
          <Badge variant={campaign.status === "running" ? "default" : "outline"}>{campaign.status}</Badge>
          <span>{campaign.campaignTypeLabelTr}</span>
          {campaign.queueName ? <span>Kuyruk: {campaign.queueName}</span> : null}
          <span className="font-medium">{campaign.contactCount ?? 0} kişi</span>
          <span className="text-gray-500">{campaign.pendingCount ?? 0} bekleyen</span>
        </div>
      ) : null}

      <p className="text-sm text-gray-600">
        Agent <code className="bg-gray-100 px-1 rounded">/pbx/panel</code> → kampanyaya katıl → durum &quot;Çağrı Bekliyor&quot;.
        Otomatik arama worker sıradaki numarayı temsilci dahilisine bağlar (Verimor originate veya demo mod).
      </p>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "contacts" ? "border-[#e61e25] text-[#e61e25]" : "border-transparent text-gray-500"}`}
          onClick={() => setTab("contacts")}
        >
          Kişiler
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "results" ? "border-[#e61e25] text-[#e61e25]" : "border-transparent text-gray-500"}`}
          onClick={() => setTab("results")}
        >
          Sonuçlar
        </button>
      </div>

      {tab === "contacts" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" /> Manuel ekle
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label>Telefon</Label>
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="+90555..." />
                </div>
                <div>
                  <Label>Ad</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => void addManual()} disabled={saving} size="sm">
                Ekle
              </Button>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-semibold">Yapıştır (satır başına: telefon, ad)</h3>
              <Textarea rows={4} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
              <Button onClick={() => void addPaste()} disabled={saving} size="sm">
                Listeyi ekle
              </Button>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> CSV / Excel yükle
              </h3>
              <p className="text-xs text-gray-500">
                Sütunlar (ilk satır başlık): MÜŞTERİ, GSM, KURUM ADI, SEKTÖRÜ, ADRESİ, İLÇE, İL. GSM zorunlu;
                diğer alanlar ve boş satırlar hata vermez. Eski format (telefon, ad) da desteklenir. .csv, .xlsx
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                disabled={saving}
                onChange={(e) => void onFileUpload(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Upload className="w-3.5 h-3.5" />
                Dosya seçildiğinde otomatik yüklenir
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Kişi listesi ({contacts.length})</div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Telefon</th>
                    <th className="px-3 py-2 text-left">Ad</th>
                    <th className="px-3 py-2 text-left">Durum</th>
                    <th className="px-3 py-2 text-left">Deneme</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{c.phone}</td>
                      <td className="px-3 py-2">{c.name || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{c.attempts}</td>
                    </tr>
                  ))}
                  {!loading && contacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Henüz kişi yok.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Zaman</th>
                <th className="px-4 py-2 text-left">Telefon</th>
                <th className="px-4 py-2 text-left">Temsilci</th>
                <th className="px-4 py-2 text-left">Durum / Kod</th>
                <th className="px-4 py-2 text-left">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(r.startedAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-4 py-2">{r.agentName ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.dispositionLabel ? (
                      <span>{r.dispositionLabel} <span className="text-gray-400">({r.dispositionCode})</span></span>
                    ) : (
                      r.status
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{r.notes ?? "—"}</td>
                </tr>
              ))}
              {!loading && results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Henüz arama sonucu yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {msg ? <p className="text-sm text-gray-600">{msg}</p> : null}
    </PbxLayout>
  );
}
