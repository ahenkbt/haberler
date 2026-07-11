import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Palette } from "lucide-react";
import { fetchSiteSettings, patchSiteSettings } from "@/lib/adminApi";
import {
  DEFAULT_YEKTUBE_SITE_SETTINGS,
  loadYektubeSiteSettings,
  saveYektubeSiteSettings,
  type YektubeSiteSettings,
} from "@/lib/yektubeSiteSettings";
import {
  AdminAlert,
  AdminBtn,
  AdminCard,
  AdminField,
  AdminInput,
  AdminPageHeader,
} from "./ui/adminUi";

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data: site, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: fetchSiteSettings,
  });

  const [apiKey, setApiKey] = useState("");
  const [display, setDisplay] = useState<YektubeSiteSettings>(() => loadYektubeSiteSettings());
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const saveApiKey = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      await patchSiteSettings({ youtubeApiKey: apiKey.trim() || "" });
      setApiKey("");
      await qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
      setMsg("YouTube API anahtarı kaydedildi.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  };

  const saveDisplay = () => {
    saveYektubeSiteSettings(display);
    setMsg("Görünüm ayarları kaydedildi.");
    setErr("");
  };

  const resetDisplay = () => {
    setDisplay({ ...DEFAULT_YEKTUBE_SITE_SETTINGS });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Ayarlar"
        description="YouTube senkron anahtarı ve Yektube görünüm tercihleri."
      />

      {msg ? <AdminAlert tone="success">{msg}</AdminAlert> : null}
      {err ? <AdminAlert tone="warn">{err}</AdminAlert> : null}

      <AdminCard
        title="YouTube Data API"
        description="Kanal ekleme ve tam senkron için Google Cloud API anahtarı."
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Anahtar yoksa RSS + HTML kazıma yedeği kullanılır (sınırlı video sayısı).{" "}
            <a
              href="https://developers.google.com/youtube/v3/getting-started?hl=tr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 underline"
            >
              API kılavuzu
            </a>
          </p>
          {isLoading ? (
            <p className="text-sm text-zinc-500">Yükleniyor…</p>
          ) : site?.hasYoutubeApiKey ? (
            <AdminAlert tone="info">
              Kayıtlı bir API anahtarı var. Değiştirmek için yeni anahtarı yazıp kaydedin.
            </AdminAlert>
          ) : (
            <AdminAlert tone="warn">API anahtarı tanımlı değil — senkron sınırlı modda çalışır.</AdminAlert>
          )}
          <AdminField label="YouTube Data API v3 anahtarı" hint="AIza… ile başlayan anahtar">
            <AdminInput
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={site?.hasYoutubeApiKey ? "•••••••• (yeni anahtar)" : "AIza…"}
              autoComplete="off"
              className="font-mono"
            />
          </AdminField>
          <AdminBtn variant="primary" disabled={busy} onClick={() => void saveApiKey()}>
            <KeyRound className="h-4 w-4" />
            API anahtarını kaydet
          </AdminBtn>
        </div>
      </AdminCard>

      <AdminCard title="Görünüm ve feed" description="Ana sayfa limitleri ve banner (cihazda saklanır).">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Site başlığı">
            <AdminInput
              value={display.siteTitle}
              onChange={(e) => setDisplay((d) => ({ ...d, siteTitle: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Banner video URL" hint="Ana sayfa üst banner (YouTube linki)">
            <AdminInput
              value={display.bannerVideoUrl}
              onChange={(e) => setDisplay((d) => ({ ...d, bannerVideoUrl: e.target.value }))}
              placeholder="https://youtube.com/watch?v=…"
            />
          </AdminField>
          <AdminField label="Popüler kanal limiti">
            <AdminInput
              type="number"
              min={1}
              max={20}
              value={display.popularLimit}
              onChange={(e) => setDisplay((d) => ({ ...d, popularLimit: Number(e.target.value) }))}
            />
          </AdminField>
          <AdminField label="Kategori limiti">
            <AdminInput
              type="number"
              min={1}
              max={20}
              value={display.categoryLimit}
              onChange={(e) => setDisplay((d) => ({ ...d, categoryLimit: Number(e.target.value) }))}
            />
          </AdminField>
          <AdminField label="Öne çıkan limiti">
            <AdminInput
              type="number"
              min={1}
              max={20}
              value={display.featuredLimit}
              onChange={(e) => setDisplay((d) => ({ ...d, featuredLimit: Number(e.target.value) }))}
            />
          </AdminField>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={display.autoAddChannels}
              onChange={(e) => setDisplay((d) => ({ ...d, autoAddChannels: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm text-zinc-300">
              RSS / haber botu çalışırken yeni kanalları otomatik ekle
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminBtn variant="primary" onClick={saveDisplay}>
            <Palette className="h-4 w-4" />
            Görünüm ayarlarını kaydet
          </AdminBtn>
          <AdminBtn variant="ghost" onClick={resetDisplay}>
            Varsayılana dön
          </AdminBtn>
        </div>
      </AdminCard>
    </div>
  );
}
