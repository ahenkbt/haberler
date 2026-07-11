import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, RefreshCw, Search, Smartphone, Instagram } from "lucide-react";
import { fetchSources } from "@/lib/api";
import {
  adminCreateSource,
  adminSyncAll,
  adminSyncShorts,
  adminSyncSocial,
  adminSyncSocialNow,
  adminSyncTurkishSocialHits,
  adminSyncSource,
  adminSyncSourceNow,
  fetchTurkishSocialHitPresets,
  fetchVideoSyncCapabilities,
  fetchYektubeSyncQueue,
  type YektubeSyncQueueResponse,
} from "@/lib/adminApi";
import { categoryLabel } from "@/lib/constants";
import { adminRoute } from "./adminPaths";
import { AdminAlert, AdminBtn, AdminCard, AdminPageHeader, AdminSelect } from "./ui/adminUi";

type ScraperMode = "api" | "scrape";
type LanguageScope = "tr" | "global";
type SocialPlatform = "instagram" | "tiktok";
type SocialSourceType = "channel" | "video";

function statusBadge(status: string): string {
  if (status === "running") return "bg-sky-900/50 text-sky-200";
  if (status === "done") return "bg-emerald-900/50 text-emerald-200";
  if (status === "error") return "bg-red-900/50 text-red-300";
  return "bg-zinc-800 text-zinc-400";
}

function SyncQueuePanel({
  batchId,
  open,
  onClose,
}: {
  batchId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<YektubeSyncQueueResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const q = await fetchYektubeSyncQueue(batchId ? { batchId, limit: 200 } : { limit: 80 });
        if (!cancelled) setData(q);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, batchId]);

  const summary = data?.summary;
  const jobs = data?.jobs ?? [];
  const active = (summary?.running ?? 0) + (summary?.queued ?? 0) > 0;

  if (!open) return null;

  return (
    <AdminCard
      title="Senkron kuyruğu"
      description={
        batchId
          ? `Batch: ${batchId.slice(0, 24)}… — kazınan ve eklenen videolar`
          : "Son senkron işlemleri"
      }
    >
      {summary ? (
        <p className="mb-3 text-sm text-zinc-300">
          {active ? "⏳" : "✅"}{" "}
          {summary.done}/{summary.total} tamam
          {summary.running ? ` · ${summary.running} çalışıyor` : ""}
          {summary.queued ? ` · ${summary.queued} bekliyor` : ""}
          {summary.error ? ` · ${summary.error} hata` : ""}
          {" · "}
          <strong>{summary.scraped}</strong> kazındı, <strong>{summary.upserted}</strong> eklendi/güncellendi
        </p>
      ) : (
        <p className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Kuyruk yükleniyor…
        </p>
      )}

      <div className="max-h-[420px] overflow-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-zinc-900 text-[10px] uppercase text-zinc-500">
            <tr>
              <th className="px-2 py-2">Kaynak</th>
              <th className="px-2 py-2">Durum</th>
              <th className="px-2 py-2">Mod</th>
              <th className="px-2 py-2">Kazındı</th>
              <th className="px-2 py-2">Eklenen</th>
              <th className="px-2 py-2">Not</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  Henüz iş yok — aşağıdan senkron başlatın
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="align-top hover:bg-zinc-900/60">
                  <td className="px-2 py-2 font-medium text-white">
                    {j.sourceName ?? (j.kind === "bulk" ? "Toplu güncelleme" : j.kind)}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(j.status)}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-zinc-400">{j.syncMode ?? "—"}</td>
                  <td className="px-2 py-2 text-zinc-300">{j.progress.scraped}</td>
                  <td className="px-2 py-2 text-zinc-300">{j.progress.upserted}</td>
                  <td className="max-w-[200px] px-2 py-2 text-zinc-500">
                    {j.error ? <span className="text-red-400">{j.error}</span> : null}
                    {!j.error && j.warning ? j.warning : null}
                    {!j.error && !j.warning && j.samples?.length ? (
                      <details className="cursor-pointer text-emerald-400">
                        <summary>{j.samples.length} örnek video</summary>
                        <ul className="mt-1 space-y-0.5 pl-2">
                          {j.samples.map((s) => (
                            <li key={s.videoId} className="truncate" title={s.title}>
                              {s.title}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-2">
        <AdminBtn variant="secondary" onClick={onClose}>
          Gizle
        </AdminBtn>
        <Link href={adminRoute("/kaynaklar")} className="text-sm text-sky-400 hover:underline">
          Kaynak listesine git →
        </Link>
      </div>
    </AdminCard>
  );
}

export function AdminSyncScraperPage() {
  const [mode, setMode] = useState<ScraperMode>("api");
  const [languageScope, setLanguageScope] = useState<LanguageScope>("tr");
  const [sourceId, setSourceId] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const queueRef = useRef<HTMLDivElement>(null);

  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>("instagram");
  const [socialUrl, setSocialUrl] = useState("");
  const [socialName, setSocialName] = useState("");
  const [socialSourceType, setSocialSourceType] = useState<SocialSourceType>("channel");
  const [socialCategory, setSocialCategory] = useState("eglence");
  const [socialBusy, setSocialBusy] = useState(false);

  const { data: hitPresets } = useQuery({
    queryKey: ["social-hit-presets"],
    queryFn: fetchTurkishSocialHitPresets,
  });

  const { data: syncCaps } = useQuery({
    queryKey: ["video-sync-capabilities"],
    queryFn: fetchVideoSyncCapabilities,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: fetchSources,
  });

  const socialSources = useMemo(
    () => sources.filter((s) => s.platform === "instagram" || s.platform === "tiktok"),
    [sources],
  );

  const filteredSources = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let rows = sources.filter((s) => !s.isLive && s.sourceType !== "live");
    if (mode === "api") rows = rows.filter((s) => s.useYoutubeApi !== false);
    else rows = rows.filter((s) => s.useYoutubeApi === false);
    if (!qq) return rows;
    return rows.filter((s) => s.name.toLowerCase().includes(qq) || s.channelId.toLowerCase().includes(qq));
  }, [sources, q, mode]);

  const scrollToQueue = useCallback(() => {
    setQueueOpen(true);
    window.setTimeout(() => queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const runSourceSync = async (asyncMode: boolean) => {
    const id = parseInt(sourceId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setMsg("Önce bir kaynak seçin");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const syncOpts = { languageScope };
      if (asyncMode) {
        const res = await adminSyncSource(id, syncOpts);
        if (res.batchId) setBatchId(res.batchId);
        setMsg(`${res.message ?? "Senkron kuyruğa alındı"} — panelden izleyin`);
      } else {
        const res = await adminSyncSourceNow(id, syncOpts);
        if (res.batchId) setBatchId(res.batchId);
        setMsg(
          `✅ ${res.upserted ?? 0} video eklendi/güncellendi` +
            (res.scraped != null ? ` (${res.scraped} kazındı)` : "") +
            (res.syncMode ? ` · ${res.syncMode}` : "") +
            (res.warning ? ` · ${res.warning}` : ""),
        );
      }
      scrollToQueue();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Senkron başarısız");
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminSyncAll({ geminiClassify: false, languageScope });
      if (res.batchId) setBatchId(res.batchId);
      setMsg(res.message ?? "Toplu senkron başlatıldı");
      scrollToQueue();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Toplu senkron başarısız");
    } finally {
      setBusy(false);
    }
  };

  const runTurkishHitsBulk = async (asyncMode: boolean) => {
    setSocialBusy(true);
    setMsg("");
    try {
      const res = await adminSyncTurkishSocialHits(asyncMode);
      if (asyncMode) {
        setMsg(res.message ?? "Türkçe hit toplu kazıma arka planda başladı");
      } else {
        const ig = res.instagram?.upserted ?? 0;
        const tt = res.tiktok?.upserted ?? 0;
        setMsg(
          `✅ ${ig + tt} Türkçe hit video eklendi (Instagram: ${ig}, TikTok: ${tt})` +
            (res.instagram?.sourcesCreated || res.tiktok?.sourcesCreated
              ? ` · ${(res.instagram?.sourcesCreated ?? 0) + (res.tiktok?.sourcesCreated ?? 0)} yeni kaynak`
              : ""),
        );
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Türkçe hit kazıması başarısız");
    } finally {
      setSocialBusy(false);
    }
  };

  const runSocialSyncAll = async (asyncMode: boolean) => {
    setSocialBusy(true);
    setMsg("");
    try {
      const res = asyncMode ? await adminSyncSocial() : await adminSyncSocialNow();
      setMsg(
        res.message ??
          (asyncMode
            ? "Instagram/TikTok senkronu arka planda başladı"
            : `✅ ${res.upserted ?? 0} sosyal video eklendi/güncellendi`),
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sosyal medya senkronu başarısız");
    } finally {
      setSocialBusy(false);
    }
  };

  const addSocialSource = async () => {
    const url = socialUrl.trim();
    if (!url) {
      setMsg("Instagram veya TikTok URL / kullanıcı adı girin");
      return;
    }
    setSocialBusy(true);
    setMsg("");
    try {
      await adminCreateSource({
        name: socialName.trim() || url,
        platform: socialPlatform,
        sourceType: socialSourceType,
        channelId: url,
        url,
        categorySlug: socialCategory,
        active: true,
      });
      setSocialUrl("");
      setSocialName("");
      setMsg(`✅ ${socialPlatform === "instagram" ? "Instagram" : "TikTok"} kaynağı eklendi — senkron arka planda başladı`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kaynak eklenemedi");
    } finally {
      setSocialBusy(false);
    }
  };

  const runShortsSync = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminSyncShorts();
      setMsg(res.message ?? "Yekçek / shorts senkronu arka planda başladı");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Yekçek senkronu başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Sosyal medya kazıyıcı"
        description="YouTube, Instagram Reels ve TikTok kaynaklarından meta veri çekin; Yekçek akışına otomatik ekleyin. Videolar indirilmez — kaynak linklerinden yayınlanır."
      />

      <AdminCard
        title="Sosyal medya kazıma botu"
        description="Instagram Reels ve TikTok profilleri veya tek video linkleri. Meta veriler (başlık, kapak, etkileşim) kazınır; isStory=true ile Yekçek akışına dahil edilir."
      >
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSocialPlatform("instagram")}
              className={`rounded-xl border p-3 text-left transition ${
                socialPlatform === "instagram"
                  ? "border-fuchsia-600 bg-fuchsia-950/30"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              <p className="flex items-center gap-2 font-semibold text-white">
                <Instagram className="h-4 w-4" /> Instagram Reels
              </p>
              <p className="mt-1 text-xs text-zinc-400">Profil veya reel URL — video sunucuya indirilmez</p>
            </button>
            <button
              type="button"
              onClick={() => setSocialPlatform("tiktok")}
              className={`rounded-xl border p-3 text-left transition ${
                socialPlatform === "tiktok"
                  ? "border-cyan-600 bg-cyan-950/30"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              <p className="font-semibold text-white">TikTok</p>
              <p className="mt-1 text-xs text-zinc-400">@kullanıcı veya video linki — embed ile Yekçek&apos;te oynatılır</p>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSelect
              value={socialSourceType}
              onChange={(e) => setSocialSourceType(e.target.value as SocialSourceType)}
            >
              <option value="channel">Profil / kanal</option>
              <option value="video">Tek video / reel</option>
            </AdminSelect>
            <AdminSelect value={socialCategory} onChange={(e) => setSocialCategory(e.target.value)}>
              <option value="eglence">Eğlence</option>
              <option value="haberler">Haberler</option>
              <option value="spor">Spor</option>
              <option value="muzik">Müzik</option>
              <option value="yasam">Yaşam</option>
            </AdminSelect>
          </div>

          <input
            type="text"
            placeholder={
              socialPlatform === "instagram"
                ? socialSourceType === "video"
                  ? "https://instagram.com/reel/…"
                  : "@kullanici veya instagram.com/kullanici"
                : socialSourceType === "video"
                  ? "https://tiktok.com/@…/video/…"
                  : "@kullanici veya tiktok.com/@kullanici"
            }
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Görünen ad (isteğe bağlı)"
            value={socialName}
            onChange={(e) => setSocialName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-white"
          />

          <div className="flex flex-wrap gap-2">
            <AdminBtn disabled={socialBusy || !socialUrl.trim()} variant="primary" onClick={() => void addSocialSource()}>
              Kaynak ekle ve kazı
            </AdminBtn>
            <AdminBtn disabled={socialBusy} variant="secondary" onClick={() => void runSocialSyncAll(true)}>
              Tüm sosyal kaynakları senkronla
            </AdminBtn>
            <AdminBtn disabled={socialBusy} variant="secondary" onClick={() => void runSocialSyncAll(false)}>
              Hemen kazı (sonucu göster)
            </AdminBtn>
          </div>

          {socialSources.length > 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Kayıtlı sosyal kaynaklar ({socialSources.length})
              </p>
              <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-sm text-zinc-300">
                {socialSources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="font-medium text-white">{s.name}</span> · {s.platform} · {s.videoCount ?? 0} video
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-sky-400 hover:underline"
                      onClick={() => {
                        setSourceId(String(s.id));
                        setMsg("");
                      }}
                    >
                      Seç
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-100">Türkçe hit toplu kazıma</p>
            <p className="mt-1 text-xs text-zinc-400">
              Popüler TR hesapları ({hitPresets?.instagram.length ?? "…"} IG + {hitPresets?.tiktok.length ?? "…"}{" "}
              TikTok) ve hashtag&apos;ler (#turkiye, #kesfet, #gundem …) otomatik taranır. Yalnızca Türkçe içerik
              filtrelenir; en yüksek etkileşimli videolar Yekçek akışına eklenir.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminBtn disabled={socialBusy} variant="primary" onClick={() => void runTurkishHitsBulk(true)}>
                Toplu TR hit kazı (arka plan)
              </AdminBtn>
              <AdminBtn disabled={socialBusy} variant="secondary" onClick={() => void runTurkishHitsBulk(false)}>
                Hemen kazı ve sonucu göster
              </AdminBtn>
            </div>
            {hitPresets?.hashtags?.length ? (
              <p className="mt-2 text-[11px] text-zinc-500">
                Hashtag: {hitPresets.hashtags.slice(0, 8).map((h) => `#${h}`).join(", ")}…
              </p>
            ) : null}
          </div>
        </div>
      </AdminCard>

      {msg ? (
        <AdminAlert tone={msg.startsWith("✅") || msg.includes("başlat") ? "success" : "warn"}>{msg}</AdminAlert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("api")}
          className={`rounded-xl border p-4 text-left transition ${
            mode === "api" ? "border-emerald-600 bg-emerald-950/40" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
          }`}
        >
          <p className="font-semibold text-white">YouTube Data API</p>
          <p className="mt-1 text-xs text-zinc-400">
            {syncCaps?.hasYoutubeApiKey ? "API anahtarı yapılandırılmış — tam geçmiş" : "API anahtarı yok — Ayarlar'dan ekleyin"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("scrape")}
          className={`rounded-xl border p-4 text-left transition ${
            mode === "scrape"
              ? "border-amber-600 bg-amber-950/30"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
          }`}
        >
          <p className="font-semibold text-white">RSS + HTML kazıma</p>
          <p className="mt-1 text-xs text-zinc-400">API anahtarı gerekmez — en fazla ~200 video / kaynak</p>
        </button>
      </div>

      <AdminCard title="Kaynak seç ve çek" description="Haritalar kazıyıcısı gibi tek kaynak veya toplu güncelleme.">
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dil filtresi</p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={languageScope === "global"}
                onChange={(e) => setLanguageScope(e.target.checked ? "global" : "tr")}
                className="mt-0.5 rounded border-zinc-600"
              />
              <span>
                <strong>Global</strong> — tüm dillerdeki videoları çek
                <span className="mt-0.5 block text-xs text-zinc-500">
                  İşaretli değilken yalnızca Türkçe başlık/kanal videoları eklenir. Veritabanındaki mevcut yabancı
                  videolar silinmez.
                </span>
              </span>
            </label>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder="Kaynak ara…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white"
            />
          </div>

          <AdminSelect value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full">
            <option value="">— Kaynak seçin —</option>
            {filteredSources.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} · {categoryLabel(s.categorySlug)} · {s.videoCount ?? 0} video
              </option>
            ))}
          </AdminSelect>

          <div className="flex flex-wrap gap-2">
            <AdminBtn disabled={busy || !sourceId} variant="primary" onClick={() => void runSourceSync(true)}>
              <RefreshCw className="h-4 w-4" />
              Kuyruğa al (arka plan)
            </AdminBtn>
            <AdminBtn disabled={busy || !sourceId} variant="secondary" onClick={() => void runSourceSync(false)}>
              Hemen çek ve sonucu göster
            </AdminBtn>
            <AdminBtn disabled={busy} variant="secondary" onClick={() => void runBulk()}>
              Tüm kaynakları senkronla
            </AdminBtn>
            <AdminBtn disabled={busy} variant="secondary" onClick={() => void runShortsSync()}>
              <Smartphone className="h-4 w-4" />
              Yekçek / Shorts senkronu
            </AdminBtn>
          </div>
        </div>
      </AdminCard>

      <AdminCard
        title="Yekçek (≤3 dk)"
        description="Kanallardan shorts sekmesi + popüler kısa videoları çeker. Yekçek akışı karışık gösterilir; aynı kanal peş peşe gelmez."
      >
        <AdminBtn disabled={busy} variant="primary" onClick={() => void runShortsSync()}>
          <Smartphone className="h-4 w-4" />
          Tüm kanallardan Yekçek çek
        </AdminBtn>
      </AdminCard>

      <div ref={queueRef}>
        <SyncQueuePanel batchId={batchId} open={queueOpen} onClose={() => setQueueOpen(false)} />
      </div>

      {!queueOpen ? (
        <AdminBtn variant="secondary" onClick={() => setQueueOpen(true)}>
          Kuyruk panelini göster
        </AdminBtn>
      ) : null}
    </div>
  );
}
