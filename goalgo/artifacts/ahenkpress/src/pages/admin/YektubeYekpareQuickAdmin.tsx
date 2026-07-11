import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, RefreshCw, Smartphone, Trash2, Settings2 } from "lucide-react";
/** Yekpare üzerinde Yektube Studio — /admin Yekpare paneline ayrıldı */
const STUDIO_ADMIN = "/yp/admin";

/** Yekpare admin — yalnızca hızlı Yektube işlemleri; tam yönetim Yektube Studio'da. */
export default function YektubeYekpareQuickAdmin() {
  const { toast } = useToast();
  const [syncShortsRunning, setSyncShortsRunning] = useState(false);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  const handleSyncShorts = async () => {
    setSyncShortsRunning(true);
    try {
      const r = await fetch("/api/video/sync-shorts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ async: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string; scheduled?: boolean };
      if (!r.ok) throw new Error(j.error || "Yekçek çekimi başarısız");
      toast({
        title: j.scheduled === false ? "Yekçek güncellemesi zaten çalışıyor" : "Hit Yekçek çekimi başlatıldı",
        description: j.message || "Kısa videolar arka planda taranıyor.",
      });
    } catch (e) {
      toast({
        title: "Yekçek çekimi başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSyncShortsRunning(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncAllRunning(true);
    try {
      const r = await fetch("/api/video/sync-all", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        sourceCount?: number;
        scheduled?: boolean;
      };
      if (!r.ok) throw new Error(j.error || "Toplu güncelleme başarısız");
      toast({
        title: j.scheduled === false ? "Güncelleme zaten çalışıyor" : "Toplu güncelleme başlatıldı",
        description:
          j.message ||
          (j.sourceCount != null
            ? `${j.sourceCount} kaynak arka planda güncelleniyor.`
            : "Tüm kaynaklar arka planda senkronlanıyor."),
      });
    } catch (e) {
      toast({
        title: "Toplu güncelleme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSyncAllRunning(false);
    }
  };

  const handleFixPlayback = async () => {
    setCleanupRunning(true);
    try {
      const r = await fetch("/api/video/fix-playback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        reclassifiedPodcasts?: number;
        embedBlockedHidden?: number;
        embedAudited?: number;
      };
      if (!r.ok) throw new Error(j.error || "Onarım başarısız");
      toast({
        title: "Oynatma ve kapaklar onarıldı",
        description: [
          j.embedBlockedHidden ? `${j.embedBlockedHidden} embed kapalı video gizlendi` : null,
          j.embedAudited ? `${j.embedAudited} ek video denetlendi` : null,
          j.reclassifiedPodcasts ? `${j.reclassifiedPodcasts} sesli günlük → playlist` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } catch (e) {
      toast({
        title: "Onarım başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCleanupRunning(false);
    }
  };

  const handleCleanup = async () => {
    if (
      !window.confirm(
        "Hatalı kanallar, pasif videolar ve gizlenen kaynaklar kalıcı olarak silinecek. Devam edilsin mi?",
      )
    ) {
      return;
    }
    setCleanupRunning(true);
    try {
      const r = await fetch("/api/video/cleanup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        deletedVideos?: number;
        deletedSources?: number;
      };
      if (!r.ok) throw new Error(j.error || "Temizleme başarısız");
      toast({
        title: "Veritabanı temizlendi",
        description: `${j.deletedSources ?? 0} kaynak, ${j.deletedVideos ?? 0} video silindi.`,
      });
    } catch (e) {
      toast({
        title: "Temizleme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCleanupRunning(false);
    }
  };

  const busy = syncShortsRunning || syncAllRunning || cleanupRunning;

  return (
    <AdminLayout title="Video TV">
      <div className="bg-[#0b1328] text-white p-6 rounded-md flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">
            VIDEO TV
          </div>
          <h1 className="text-2xl font-bold">Video TV — Yönetim</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-violet-500 text-violet-200 hover:bg-violet-900/40 hover:text-white"
            disabled={busy}
            onClick={() => void handleSyncShorts()}
          >
            <Smartphone className={`w-4 h-4 mr-1.5 ${syncShortsRunning ? "animate-pulse" : ""}`} />
            {syncShortsRunning ? "Yekçek çekiliyor…" : "Hit Yekçek Çek"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-600 text-emerald-200 hover:bg-emerald-900/40 hover:text-white"
            disabled={busy}
            onClick={() => void handleSyncAll()}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncAllRunning ? "animate-spin" : ""}`} />
            {syncAllRunning ? "Güncelleniyor…" : "Tümünü Güncelle"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            disabled={busy}
            onClick={() => void handleFixPlayback()}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${cleanupRunning ? "animate-spin" : ""}`} />
            Oynatmayı Onar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            disabled={busy}
            onClick={() => void handleCleanup()}
          >
            <Trash2 className={`w-4 h-4 mr-1.5 ${cleanupRunning ? "animate-pulse" : ""}`} />
            {cleanupRunning ? "Temizleniyor…" : "DB Temizle"}
          </Button>
          <a
            href="/yektube"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Siteyi Gör <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tam yönetim — Yektube Studio</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-600">
              Kanal ekleme, video moderasyonu, YouTube API anahtarı, hazır kanallar ve modül ayarları{" "}
              <strong>Yektube Studio</strong> panelindedir.
            </p>
          </div>
          <a
            href={STUDIO_ADMIN}
            className="inline-flex items-center gap-2 rounded-lg bg-[#e61e25] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9181e]"
          >
            <Settings2 className="h-4 w-4" />
            Yektube Studio&apos;yu aç
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}
