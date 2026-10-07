import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Activity, RefreshCw, Database } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";

type Probe = {
  url?: string;
  status?: number;
  ms?: number;
  ok?: boolean;
  error?: string;
  header?: string;
};

type SiteRow = {
  id: number;
  slug: string;
  name?: string;
  host?: string;
  ok?: boolean;
  home?: Probe;
  editor?: Probe;
  kose?: Probe;
};

type Issue = {
  kind: string;
  severity: string;
  siteId?: number;
  slug?: string;
  message: string;
};

type Report = {
  startedAt?: string;
  finishedAt?: string;
  dualWriteReady?: boolean;
  healthy?: boolean;
  api?: { live?: Probe; healthz?: Probe };
  sites?: SiteRow[];
  issues?: Issue[];
};

export default function HaberSiteleriBekci() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [dualWriteReady, setDualWriteReady] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDualWriteReady(data.dualWriteReady ?? null);
      setReport(data.last || null);
    } catch (e) {
      toast({
        title: "Bekçi durumu okunamadı",
        description: String(e).slice(0, 180),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runNow() {
    setRunning(true);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setReport(data.report || null);
      setDualWriteReady(data.report?.dualWriteReady ?? dualWriteReady);
      toast({
        title: data.report?.healthy ? "Siteler sağlıklı" : "Sorunlar bulundu",
        description: `${(data.report?.issues || []).length} uyarı`,
      });
    } catch (e) {
      toast({ title: "Tarama başarısız", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  async function syncSite(siteId: number) {
    setSyncingId(siteId);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog/sync-site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, limit: 120 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast({
        title: `Site #${siteId} PHP Neon’a eşitlendi`,
        description: `yazar ${data.authors || 0}, haber ${data.news || 0}, makale ${data.makaleler || 0} → phpSiteId ${data.phpSiteId ?? "?"}`,
      });
    } catch (e) {
      toast({ title: "Eşitleme başarısız", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <AdminLayout title="Haber AI Bekçi">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-[#e61e25]" />
              Haber siteleri AI Bekçi
            </h1>
            <p className="mt-1 text-sm text-gray-600 max-w-2xl">
              PBX’teki bekçi gibi sitelerin anasayfa / editör / köşe yazarı girişini tarar. Panel Neon ile PHP
              Neon (twilight-pine) kopuksa manşet ve köşe yazıları canlıya geçmez — burada tek tıkla eşitlersiniz.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/admin/ai-icerik-robotu" className="text-[#e61e25] underline font-semibold">
                Haber AI (AI İçerik Robotu)
              </Link>
              {" · "}
              <Link href="/admin/haber-siteleri" className="text-[#e61e25] underline font-semibold">
                Haber Siteleri
              </Link>
            </p>
          </div>
          <Button type="button" onClick={() => void runNow()} disabled={running || loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Taranıyor…" : "Şimdi tara"}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <h2 className="text-lg font-black text-gray-900">Veritabanı</h2>
          <p className="text-sm text-gray-700">
            Neon’da iki proje var: <strong>bitter-mouse</strong> (panel yazar),{" "}
            <strong>twilight-pine</strong> (PHP siteler okur). Hostinger’da haber DB’si yok; PHP Hostinger’da
            çalışır, veri Neon’da kalmalı — tek DB’ye birleşene kadar dual-write + eşitleme şart.
          </p>
          <p className="text-sm font-semibold">
            Dual-write:{" "}
            {dualWriteReady == null ? "…" : dualWriteReady ? (
              <span className="text-emerald-700">açık</span>
            ) : (
              <span className="text-red-700">kapalı — Worker’da NEWS_DATABASE_URL kontrol edin</span>
            )}
          </p>
        </div>

        {loading && !report ? (
          <p className="text-sm text-gray-500">Yükleniyor…</p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-gray-900 mb-3">Son tarama</h2>
              {!report ? (
                <p className="text-sm text-gray-500">Henüz tarama yok. «Şimdi tara»ya basın.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <p>
                    {report.finishedAt ? new Date(report.finishedAt).toLocaleString("tr-TR") : "—"} ·{" "}
                    {report.healthy ? (
                      <span className="text-emerald-700 font-semibold">sağlıklı</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">uyarı var</span>
                    )}
                  </p>
                  <p>
                    API live: {report.api?.live?.ok ? "OK" : "FAIL"} ({report.api?.live?.ms ?? "?"}ms) · healthz:{" "}
                    {report.api?.healthz?.ok ? "OK" : "FAIL"} ({report.api?.healthz?.ms ?? "?"}ms)
                  </p>
                  {(report.issues || []).length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-amber-900">
                      {(report.issues || []).map((issue, i) => (
                        <li key={`${issue.message}-${i}`}>{issue.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-gray-900 mb-3">Siteler</h2>
              <div className="space-y-3">
                {(report?.sites || []).map((site) => (
                  <div
                    key={site.id}
                    className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        #{site.id} {site.name || site.slug}{" "}
                        {site.ok ? (
                          <span className="text-emerald-600 text-xs">OK</span>
                        ) : (
                          <span className="text-red-600 text-xs">SORUN</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {site.host} · home {site.home?.status}/{site.home?.ms}ms · editor{" "}
                        {site.editor?.status}/{site.editor?.ms}ms · köşe {site.kose?.status}/{site.kose?.ms}ms
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={syncingId !== null}
                      onClick={() => void syncSite(site.id)}
                    >
                      <Database className="mr-1 h-3.5 w-3.5" />
                      {syncingId === site.id ? "Eşitleniyor…" : "PHP Neon’a eşitle"}
                    </Button>
                  </div>
                ))}
                {!report?.sites?.length && (
                  <p className="text-sm text-gray-500">Site listesi için önce tarama çalıştırın.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
