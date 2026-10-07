import { useCallback, useEffect, useMemo, useState } from "react";
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
  host?: string | null;
  ok?: boolean;
  canSync?: boolean;
  phpTheme?: boolean;
  corporate?: boolean;
  softIssues?: string[];
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
  note?: string;
  api?: { live?: Probe; healthz?: Probe };
  sites?: SiteRow[];
  issues?: Issue[];
};

export default function HaberSiteleriBekci() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [dualWriteReady, setDualWriteReady] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [catalog, setCatalog] = useState<SiteRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDualWriteReady(data.dualWriteReady ?? null);
      setReport(data.last || null);
      setCatalog(Array.isArray(data.sites) ? data.sites : []);
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

  /** Tarama siteleri varsa onları; yoksa Neon katalog — eşitleme butonları her zaman görünsün. */
  const displaySites = useMemo(() => {
    const fromReport = report?.sites || [];
    if (fromReport.length > 0) return fromReport;
    return catalog;
  }, [report?.sites, catalog]);

  async function runNow() {
    setRunning(true);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setReport(data.report || null);
      setDualWriteReady(data.report?.dualWriteReady ?? dualWriteReady);
      if (Array.isArray(data.report?.sites) && data.report.sites.length > 0) {
        setCatalog(
          data.report.sites.map((s: SiteRow) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            host: s.host,
            canSync: s.canSync ?? data.report?.dualWriteReady,
          })),
        );
      }
      const issues = data.report?.issues || [];
      const high = issues.filter((i: Issue) => i.severity === "high").length;
      const soft = issues.filter((i: Issue) => i.severity === "low").length;
      toast({
        title: data.report?.healthy ? "Siteler sağlıklı" : "Sorunlar bulundu",
        description:
          high > 0
            ? `${high} kritik uyarı`
            : soft > 0
              ? `${soft} soft uyarı (eşitleme/probe ayrımı — kritik yok)`
              : `${issues.length} uyarı (kritik yok)`,
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
        description: `yazar ${data.authors || 0}, haber ${data.news || 0}, makale ${data.makaleler || 0} → phpSiteId ${data.phpSiteId ?? "?"}. Kalan editör/healthz uyarısı probe’dur; eşitleme başarısız değil.`,
      });
    } catch (e) {
      toast({ title: "Eşitleme başarısız", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  }

  async function syncAll() {
    setSyncingAll(true);
    try {
      const res = await apiFetch("/api/hm/admin/site-watchdog/sync-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 24, perSiteLimit: 120 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast({
        title: "Toplu eşitleme tamam",
        description: `${data.synced || 0} site PHP Neon’a aktarıldı. Eşitleme ≠ HTTP probe: kalan SORUN çoğu zaman editör SPA self-fetch 404 veya soğuk healthz — «Şimdi tara» ile soft/kritik ayrımını görün.`,
      });
    } catch (e) {
      toast({ title: "Toplu eşitleme başarısız", description: String(e).slice(0, 180), variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  }

  const canSync = dualWriteReady === true;
  const busy = syncingId !== null || syncingAll;

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
              Sitelerin anasayfa / editör / köşe yazarı girişini tarar. Panel Neon (bitter-mouse) ile PHP Neon
              (twilight-pine) kopuksa manşet ve köşe yazıları canlıya geçmez — burada tek tıkla eşitlersiniz.
            </p>
            <p className="mt-2 text-sm text-amber-900/90 max-w-2xl rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <strong className="text-amber-950">Eşitleme ≠ probe:</strong> «PHP Neon’a eşitle» yalnızca DB
              içeriğini aktarır. Tarama hâlâ uyarı verebilir (PHP temada editör SPA self-fetch 404, soğuk
              Container healthz, Hostinger’da henüz yüklenmemiş kurumsal paket). Soft uyarılar eşitleme
              başarısızlığı değildir; gerçek kesinti (anasayfa down) ayrı işaretlenir.
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">
              <strong className="text-gray-700">Bekçi ≠ İçerik Robotu:</strong> Bekçi sağlık + Neon eşitleme;
              İçerik Robotu RSS/AI ile haber üretir ve yayınlar.
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
          <div className="flex flex-wrap gap-2">
            {canSync && displaySites.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void syncAll()}
                disabled={busy || loading || running}
              >
                <Database className={`mr-2 h-4 w-4 ${syncingAll ? "animate-pulse" : ""}`} />
                {syncingAll ? "Eşitleniyor…" : "Tümünü PHP Neon’a eşitle"}
              </Button>
            )}
            <Button type="button" onClick={() => void runNow()} disabled={running || loading || busy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Taranıyor…" : "Şimdi tara"}
            </Button>
          </div>
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
            {dualWriteReady == null ? (
              "…"
            ) : dualWriteReady ? (
              <span className="text-emerald-700">açık — eşitleme butonları kullanılabilir</span>
            ) : (
              <span className="text-red-700">kapalı — Worker’da NEWS_DATABASE_URL kontrol edin</span>
            )}
          </p>
        </div>

        {canSync && displaySites.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-2">
            <h2 className="text-lg font-black text-emerald-950">Hızlı onarım</h2>
            <p className="text-sm text-emerald-900">
              Tarama uyarı verse bile dual-write açıksa siteleri PHP Neon’a eşitleyebilirsiniz. Eşitleme
              tamamlandıktan sonra kalan SORUN çoğu zaman probe/routing’dir (editör SPA, healthz) — DB
              aktarımı başarısız demek değildir. API healthz soğuk Container’da FAIL olabilir; kenar live OK
              ise panel oturumu çalışır.
            </p>
            <Button type="button" onClick={() => void syncAll()} disabled={busy || running}>
              <Database className="mr-2 h-4 w-4" />
              {syncingAll ? "Eşitleniyor…" : "Şimdi tüm siteleri eşitle"}
            </Button>
          </div>
        )}

        {loading && !report && catalog.length === 0 ? (
          <p className="text-sm text-gray-500">Yükleniyor…</p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-gray-900 mb-3">Son tarama</h2>
              {!report ? (
                <p className="text-sm text-gray-500">
                  Henüz tarama yok. «Şimdi tara»ya basın — site listesi aşağıda zaten görünür.
                </p>
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
                    {report.api?.live?.ok && !report.api?.healthz?.ok ? (
                      <span className="text-gray-500"> — Container soğuk olabilir (kritik değil; eşitleme ile ilgili değil)</span>
                    ) : null}
                  </p>
                  {report.note ? <p className="text-xs text-gray-500">{report.note}</p> : null}
                  {(report.issues || []).length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-amber-900">
                      {(report.issues || []).map((issue, i) => (
                        <li key={`${issue.message}-${i}`}>
                          {issue.severity === "high" ? (
                            <span className="font-semibold text-red-800">[kritik] </span>
                          ) : issue.severity === "low" ? (
                            <span className="font-semibold text-slate-600">[soft] </span>
                          ) : null}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-gray-900 mb-3">Siteler</h2>
              <div className="space-y-3">
                {displaySites.map((site) => (
                  <div
                    key={site.id}
                    className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        #{site.id} {site.name || site.slug}{" "}
                        {site.ok === true ? (
                          <span className="text-emerald-600 text-xs">
                            OK
                            {site.softIssues && site.softIssues.length > 0 ? " · soft uyarı" : ""}
                          </span>
                        ) : site.ok === false ? (
                          <span className="text-red-600 text-xs">SORUN</span>
                        ) : (
                          <span className="text-gray-400 text-xs">tarama yok</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {site.host || "—"}
                        {site.home ? (
                          <>
                            {" "}
                            · home {site.home?.status}/{site.home?.ms}ms · editor {site.editor?.status}/
                            {site.editor?.ms}ms · köşe {site.kose?.status}/{site.kose?.ms}ms
                            {site.phpTheme ? " · PHP tema" : ""}
                            {site.corporate ? " · kurumsal" : ""}
                          </>
                        ) : null}
                      </div>
                      {site.ok === true && site.softIssues && site.softIssues.length > 0 ? (
                        <div className="text-xs text-slate-600 mt-1">
                          Soft (eşitleme dışı): {site.softIssues.join("; ")}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || !canSync}
                      title={!canSync ? "Dual-write kapalı" : undefined}
                      onClick={() => void syncSite(site.id)}
                    >
                      <Database className="mr-1 h-3.5 w-3.5" />
                      {syncingId === site.id ? "Eşitleniyor…" : "PHP Neon’a eşitle"}
                    </Button>
                  </div>
                ))}
                {!displaySites.length && (
                  <p className="text-sm text-gray-500">
                    Site listesi boş. Neon’da aktif hm_news_sites yok veya okuma hatası — «Şimdi tara» ile
                    tekrar deneyin.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
