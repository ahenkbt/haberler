import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ClipboardList, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";

type Provider = {
  provider: string;
  label: string;
  scope: string;
  model?: string;
  status?: string;
  tokens?: number;
  calls?: number;
  failed?: number;
  quotaPercent?: number | null;
  dailyTokensLeft?: number | null;
  dailyTokensLimit?: number | null;
  error?: string;
};

type Recent = {
  id?: number | null;
  at?: string | null;
  site?: string;
  action?: string;
  label?: string;
  summary?: string;
  status?: string;
  source?: string;
  reversible?: boolean;
};

type SiteRow = {
  siteId: number;
  domain: string;
  slug: string;
  published: number;
  rewritten: number;
  errors: number;
  skipped: number;
};

type Daily = {
  rewritten?: number;
  published?: number;
  deduped?: number;
  hidden?: number;
  errors?: number;
  skipped?: number;
  columns?: number;
};

type Report = {
  ok?: boolean;
  generatedAt?: string;
  warnings?: string[];
  running?: Array<{ id?: number | null; kind?: string; status?: string; at?: string; detail?: string }>;
  providers?: Provider[];
  recent?: Recent[];
  sites?: SiteRow[];
  rss?: Array<{ table: string; rows?: number | null; byStatus?: Array<{ status: string; n: number }> }>;
  daily?: Daily;
  error?: string;
};

function when(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
}

function tokens(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 10_000) return `${Math.round(n / 1000)} B`;
  return Math.round(n).toLocaleString("tr-TR");
}

export default function AiEditorDurum() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/hm/admin/ai-editor-status");
      const data = (await res.json().catch(() => ({}))) as Report;
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReport(data);
    } catch (err) {
      toast({ title: "Durum okunamadı", description: String(err).slice(0, 180), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const daily = report?.daily || {};

  return (
    <AdminLayout title="AI Editör Durum Raporu">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-[#0B2A5B]" />
              AI Editör Durum Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 max-w-2xl">
              AI Haber Editörü’nün bugün ne yaptığını, çalışan işleri ve sağlayıcı kotasını gösterir. Anahtarlar
              bu ekranda yer almaz.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/admin/ai-icerik-robotu" className="text-[#e61e25] underline font-semibold">
                AI Haber Editörü
              </Link>
              {" · "}
              <Link href="/admin/haber-editoru-sohbet" className="text-[#e61e25] underline font-semibold">
                Haber Editörü Sohbet
              </Link>
              {" · "}
              <Link href="/admin/haber-siteleri-bekci" className="text-[#e61e25] underline font-semibold">
                AI Bekçi
              </Link>
            </p>
          </div>
          <Button type="button" className="w-full sm:w-auto" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Bugün yazılan", daily.rewritten ?? 0],
            ["Tekilleştirilen", daily.deduped ?? 0],
            ["Gizlenen", daily.hidden ?? 0],
            ["Hata / atlanan", `${daily.errors ?? 0} / ${daily.skipped ?? 0}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        {(report?.warnings || []).length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {(report?.warnings || []).map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-black text-gray-900 mb-3">Şu an çalışan işler</h2>
          {(report?.running || []).length === 0 ? (
            <p className="text-sm text-gray-500">Çalışan veya sırada bekleyen tur yok.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(report?.running || []).map((job, i) => (
                <li key={`${job.kind}-${job.id}-${i}`} className="rounded-xl bg-slate-50 px-3 py-2">
                  <b>{job.kind}</b> #{job.id} · {job.status} · {when(job.at)}
                  {job.detail ? <span className="block text-gray-600">{job.detail}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-black text-gray-900 mb-1">Sağlayıcı kullanımı</h2>
          <p className="text-xs text-gray-500 mb-3">Sıra: Evren, Evren yedek, NVIDIA, Gemini, OpenAI. Kota yüzdesi günlük token limitine göredir.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Sağlayıcı</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2 pr-3">Bugün</th>
                  <th className="py-2 pr-3">Kota</th>
                </tr>
              </thead>
              <tbody>
                {(report?.providers || []).map((p) => (
                  <tr key={`${p.provider}-${p.scope}`} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      <b>{p.label}</b>
                      <span className="block text-xs text-gray-500">{p.scope === "env" ? "sunucu" : p.scope || "ortak"}{p.model ? ` · ${p.model}` : ""}</span>
                    </td>
                    <td className="py-2 pr-3">{p.status || "—"}{p.error ? <span className="block text-xs text-red-700">{p.error}</span> : null}</td>
                    <td className="py-2 pr-3">{p.calls || 0} çağrı · {tokens(p.tokens)} token{p.failed ? ` · ${p.failed} hata` : ""}</td>
                    <td className="py-2 pr-3">{p.quotaPercent == null ? "bildirilmedi" : `%${p.quotaPercent}`}{p.dailyTokensLimit ? <span className="block text-xs text-gray-500">{tokens(p.dailyTokensLeft)} / {tokens(p.dailyTokensLimit)}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-black text-gray-900 mb-3">Son işlemler</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Zaman</th>
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Ne yaptı</th>
                  <th className="py-2 pr-3">Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {(report?.recent || []).length === 0 ? (
                  <tr><td colSpan={4} className="py-3 text-gray-500">Henüz kayıt yok. Editör turu veya sohbet eylemi geldikçe burada görünür.</td></tr>
                ) : (report?.recent || []).map((row, i) => (
                  <tr key={`${row.source}-${row.id}-${i}`} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{when(row.at)}</td>
                    <td className="py-2 pr-3">{row.site || "—"}</td>
                    <td className="py-2 pr-3"><b>{row.label}</b>{row.summary ? <span className="block text-gray-600">{row.summary}</span> : null}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-black text-gray-900 mb-3">Site bazlı kırılım (bugün)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Yazılan</th>
                  <th className="py-2 pr-3">Yayımlanan</th>
                  <th className="py-2 pr-3">Hata</th>
                  <th className="py-2 pr-3">Atlanan</th>
                </tr>
              </thead>
              <tbody>
                {(report?.sites || []).map((s) => (
                  <tr key={s.siteId} className="border-b border-slate-100">
                    <td className="py-2 pr-3"><b>{s.domain || s.slug}</b><span className="block text-xs text-gray-500">#{s.siteId}</span></td>
                    <td className="py-2 pr-3">{s.rewritten}</td>
                    <td className="py-2 pr-3">{s.published}</td>
                    <td className="py-2 pr-3">{s.errors}</td>
                    <td className="py-2 pr-3">{s.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(report?.rss || []).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-lg font-black text-gray-900 mb-3">RSS yeniden yazım durumu</h2>
            {(report?.rss || []).map((table) => (
              <p key={table.table} className="text-sm text-gray-700">
                <b>{table.table}</b>: {table.rows ?? "—"} satır
                {(table.byStatus || []).length ? ` · ${(table.byStatus || []).map((s) => `${s.status || "?"} ${s.n}`).join(", ")}` : ""}
              </p>
            ))}
          </section>
        )}
        <p className="text-xs text-gray-400">Son okuma: {when(report?.generatedAt)} · 30 saniyede bir yenilenir.</p>
      </div>
    </AdminLayout>
  );
}
