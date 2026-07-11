import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  adminBulkPresets,
  adminCleanup,
  adminFixPlayback,
  adminGeminiClassify,
  adminRefresh,
  adminReclassifyYekcekDurations,
  adminSyncAll,
  adminSyncShorts,
  fetchVideoSyncCapabilities,
} from "@/lib/adminApi";
import { CATEGORY_LABELS } from "@/lib/constants";
import { AdminAlert, AdminBtn, AdminCard, AdminPageHeader, AdminSelect } from "./ui/adminUi";

const CONSOLE_DEPLOY_SNIPPET = `(async()=>{const api=(p,i={})=>fetch(\`/api\${p}\`,{credentials:"include",headers:{"Content-Type":"application/json",Accept:"application/json"},...i}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||\`HTTP \${r.status}\`);return j;});const log=(l,d)=>console.log(\`%c[Yektube] \${l}\`,"color:#2563eb;font-weight:bold",d);try{log("SEO",await api("/video/seo-meta/status"));log("Senkron+Gemini",await api("/video/sync-all",{method:"POST",body:JSON.stringify({geminiClassify:true})}));log("Shorts",await api("/video/sync-shorts",{method:"POST",body:"{}"}));log("Sitemap",{static:await fetch("/api/sitemap/yektube-static.xml").then(r=>r.status),v1:await fetch("/api/sitemap/yektube-videos-1.xml").then(r=>r.status)});if("serviceWorker"in navigator){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()));log("SW",\`\${r.length} silindi — Ctrl+F5\`);}console.log("%c✓ Tamam","color:#16a34a;font-size:14px;font-weight:bold");}catch(e){console.error("[Yektube]",e);}})();`;

export function AdminToolsPage() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [presetCat, setPresetCat] = useState("all");
  const { data: syncCaps } = useQuery({
    queryKey: ["video-sync-capabilities"],
    queryFn: fetchVideoSyncCapabilities,
  });

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fn();
      const extra =
        res && typeof res === "object" && "syncMode" in res && (res as { syncMode?: string }).syncMode
          ? ` [${(res as { syncMode?: string }).syncMode}]`
          : res && typeof res === "object" && "added" in res
          ? ` — ${(res as { added?: number }).added ?? 0} eklendi, ${(res as { skipped?: number }).skipped ?? 0} atlandı`
          : res && typeof res === "object" && "deletedVideos" in res
            ? ` — ${(res as { deletedVideos?: number }).deletedVideos ?? 0} video, ${(res as { deletedSources?: number }).deletedSources ?? 0} kaynak silindi`
            : res && typeof res === "object" && "updated" in res
              ? ` — ${(res as { updated?: number }).updated ?? 0} güncellendi`
              : "";
      setMsg(`${label} tamam${extra}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Araçlar"
        description="Toplu senkron, bakım, veritabanı temizliği ve oynatma onarımı."
      />

      {msg ? (
        <AdminAlert tone={msg.includes("Hata") || msg.includes("başarısız") ? "warn" : "success"}>{msg}</AdminAlert>
      ) : null}

      <AdminCard
        title="YouTube senkron modları"
        description="Data API ve kazıma ayrı yollardır. API anahtarı yoksa RSS + HTML kazıma devreye girer."
      >
        <p className="text-sm">
          API anahtarı:{" "}
          <strong>{syncCaps?.hasYoutubeApiKey ? "Yapılandırılmış" : "Yok — kazıma modu"}</strong>
        </p>
        {syncCaps?.apiWarning ? <p className="mt-2 text-sm text-amber-700">{syncCaps.apiWarning}</p> : null}
        {syncCaps?.modes ? (
          <ul className="mt-3 space-y-1 text-xs text-zinc-500">
            {Object.entries(syncCaps.modes).map(([k, v]) => (
              <li key={k}>
                <strong className="text-zinc-700">{k}</strong>: {v}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminCard>

      <AdminCard
        title="Senkron"
        description="Tüm kaynakları güncelle. Gemini ile yanlış kategorideki videoları ayıklar ve SEO meta üretir."
      >
        <div className="flex flex-wrap gap-2">
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() => void run("Toplu senkron (Gemini)", () => adminSyncAll({ geminiClassify: true }))}
          >
            Tüm kaynakları senkronla
          </AdminBtn>
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() => void run("Gemini kategori", () => adminGeminiClassify(150))}
          >
            Yalnızca Gemini sınıflandır
          </AdminBtn>
          <AdminBtn disabled={busy} variant="secondary" onClick={() => void run("Yekçek", adminSyncShorts)}>
            Shorts senkronu
          </AdminBtn>
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() =>
              void run("Süre/Yekçek sınıflandırma", () => adminReclassifyYekcekDurations(2500))
            }
          >
            Süre backfill + Yekçek
          </AdminBtn>
          <AdminBtn disabled={busy} variant="secondary" onClick={() => void run("Yenileme", adminRefresh)}>
            Arka plan yenile
          </AdminBtn>
        </div>
      </AdminCard>

      <AdminCard title="Hazır kanal listesi" description="Önceden tanımlı kanalları toplu ekle.">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            Kategori
            <AdminSelect
              className="mt-1 min-w-[160px]"
              value={presetCat}
              onChange={(e) => setPresetCat(e.target.value)}
            >
              <option value="all">Tümü</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </AdminSelect>
          </label>
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() =>
              void run("Preset ekleme", () => adminBulkPresets(presetCat === "all" ? undefined : presetCat))
            }
          >
            Preset kanalları ekle
          </AdminBtn>
        </div>
      </AdminCard>

      <AdminCard
        title="Hızlı deploy (konsol)"
        description="Admin oturumu açıkken DevTools → Console'a yapıştırın: senkron + Gemini + shorts + sitemap ping + SW temizliği."
      >
        <textarea
          readOnly
          className="h-36 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300"
          value={CONSOLE_DEPLOY_SNIPPET}
          onFocus={(e) => e.target.select()}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(CONSOLE_DEPLOY_SNIPPET).then(() =>
                setMsg("Konsol kodu kopyalandı — F12 → Console → yapıştır → Enter"),
              );
            }}
          >
            Kodu kopyala
          </AdminBtn>
        </div>
      </AdminCard>

      <AdminCard title="Bakım" description="Embed onarımı, kapak görseli ve podcast sınıflandırması.">
        <AdminBtn disabled={busy} variant="secondary" onClick={() => void run("Oynatma onarımı", adminFixPlayback)}>
          Oynatmayı düzelt (fix-playback)
        </AdminBtn>
      </AdminCard>

      <AdminCard
        title="Veritabanı temizliği"
        description="Hatalı kanallar, pasif videolar ve çift kayıtları kaldırır."
      >
        <div className="flex flex-wrap gap-2">
          <AdminBtn
            disabled={busy}
            variant="secondary"
            onClick={() => void run("Temizlik önizleme", () => adminCleanup(true))}
          >
            Önizle (dry-run)
          </AdminBtn>
          <AdminBtn
            disabled={busy}
            variant="danger"
            onClick={() => {
              if (!confirm("Pasif ve hatalı kayıtlar kalıcı silinecek. Devam?")) return;
              void run("DB temizliği", () => adminCleanup(false));
            }}
          >
            DB temizle
          </AdminBtn>
        </div>
      </AdminCard>
    </div>
  );
}
