import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchSources } from "@/lib/api";
import {
  adminBootstrapLiveTv,
  adminBulkLivePresets,
  adminFetchSectionStats,
  adminImportTopChannels,
  adminRefresh,
  adminSyncAll,
  adminSyncShorts,
  type SectionAdminStat,
} from "@/lib/adminApi";
import { RefreshCw, Zap, Smartphone, Import, Music2, Baby, Tv, Radio, Download, Plus, Video, ListMusic } from "lucide-react";
import { AdminAlert, AdminBtn, AdminCard, AdminPageHeader, AdminStat, AdminStatGrid } from "./ui/adminUi";
import { adminRoute } from "./adminPaths";
import { isAdminEmbedLight } from "./adminEmbedTheme";

function SectionBreakdown({ section }: { section: SectionAdminStat }) {
  const light = isAdminEmbedLight();
  const topCats = section.categories.filter((c) => c.sourceCount > 0 || c.videoCount > 0).slice(0, 6);
  return (
    <AdminCard
      title={section.label}
      description={`${section.categoryCount} kategori · ${section.sourceCount} kaynak · ${section.videoCount} video`}
    >
      {topCats.length === 0 ? (
        <p className="text-xs text-zinc-500">Henüz içerik yok.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {topCats.map((c) => (
            <li key={c.slug} className={`flex justify-between gap-2 ${light ? "text-zinc-600" : "text-zinc-300"}`}>
              <span className={`truncate font-medium ${light ? "text-zinc-900" : "text-zinc-100"}`}>{c.label}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {c.sourceCount} kanal · {c.videoCount} video
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export function AdminDashboard() {
  const qc = useQueryClient();
  const light = isAdminEmbedLight();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: fetchSources,
  });

  const { data: sectionStats } = useQuery({
    queryKey: ["admin-section-stats"],
    queryFn: adminFetchSectionStats,
  });

  const active = sources.filter((s) => s.active);
  const channels = sources.filter((s) => s.sourceType === "channel");
  const live = sources.filter((s) => s.isLive || s.sourceType === "live");
  const playlists = sources.filter((s) => s.sourceType === "playlist" || s.sourceType === "podcast");
  const totalVideos = sources.reduce((n, s) => n + (s.videoCount ?? 0), 0);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    setMsg("");
    try {
      const res = await fn();
      const extra =
        res && typeof res === "object" && "added" in res
          ? ` (+${(res as { added?: number }).added ?? 0} eklendi)`
          : "";
      setMsg(`${ok}${extra}`);
      await qc.invalidateQueries({ queryKey: ["admin-sources"] });
      await qc.invalidateQueries({ queryKey: ["admin-section-stats"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(null);
    }
  };

  const sections = sectionStats?.sections ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Yönetim paneli"
        description="Kaynak özeti, bölüm istatistikleri ve hızlı işlemler."
      />

      {isLoading ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : (
        <AdminStatGrid>
          <AdminStat label="Kaynak" value={sources.length} sub={`${active.length} aktif`} />
          <AdminStat label="Kanal" value={channels.length} />
          <AdminStat label="Canlı" value={live.length} />
          <AdminStat label="Video" value={totalVideos} sub={`${playlists.length} playlist`} />
        </AdminStatGrid>
      )}

      {sections.length > 0 ? (
        <div>
          <h2 className={`mb-3 text-sm font-semibold ${light ? "text-zinc-800" : "text-white"}`}>Bölüm özeti</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {sections.map((s) => (
              <SectionBreakdown key={s.id} section={s} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-600">Kaynak ekle</p>
        <p className="mb-3 text-sm text-zinc-600">Yeni içerik kaynağı oluşturun.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={adminRoute("/kaynaklar?ekle=1")}>
            <AdminBtn variant="primary" type="button">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="yt-admin-btn-label">Kanal ekle</span>
            </AdminBtn>
          </Link>
          <Link href={`${adminRoute("/kaynaklar")}?ekle=1&playlist=1`}>
            <AdminBtn variant="secondary" type="button">
              <ListMusic className="h-4 w-4 shrink-0" />
              <span className="yt-admin-btn-label">Playlist ekle</span>
            </AdminBtn>
          </Link>
          <Link href={`${adminRoute("/kaynaklar")}?ekle=1&video=1`}>
            <AdminBtn variant="secondary" type="button">
              <Video className="h-4 w-4 shrink-0" />
              <span className="yt-admin-btn-label">Tek video ekle</span>
            </AdminBtn>
          </Link>
          <Link href={adminRoute("/canli-yayinlar")}>
            <AdminBtn variant="secondary" type="button">
              <Radio className="h-4 w-4 shrink-0" />
              <span className="yt-admin-btn-label">Canlı TV ekle</span>
            </AdminBtn>
          </Link>
        </div>
      </div>

      <AdminCard title="Güncelleme işlemleri" description="Veritabanını YouTube ile senkronlar — birkaç dakika sürebilir.">
        <div className="flex flex-wrap gap-2">
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("all", adminSyncAll, "Tüm kaynaklar senkron kuyruğuna alındı")}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${busy === "all" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">{busy === "all" ? "Senkronlanıyor…" : "Tümünü senkronla"}</span>
          </AdminBtn>
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("shorts", adminSyncShorts, "Yekçek (shorts) senkronu başlatıldı")}
          >
            <Smartphone className={`h-4 w-4 shrink-0 ${busy === "shorts" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">{busy === "shorts" ? "Çekiliyor…" : "Yekçek videolarını çek"}</span>
          </AdminBtn>
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("refresh", adminRefresh, "Arka plan yenileme kuyruğa alındı")}
          >
            <Zap className={`h-4 w-4 shrink-0 ${busy === "refresh" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">{busy === "refresh" ? "Yenileniyor…" : "Oynatmayı onar / yenile"}</span>
          </AdminBtn>
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("import", adminImportTopChannels, "Popüler kanallar içe aktarıldı")}
          >
            <Import className={`h-4 w-4 shrink-0 ${busy === "import" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">{busy === "import" ? "Aktarılıyor…" : "Top kanalları içe aktar"}</span>
          </AdminBtn>
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("live-bootstrap", adminBootstrapLiveTv, "Canlı TV kuruldu")}
          >
            <Radio className={`h-4 w-4 shrink-0 ${busy === "live-bootstrap" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">
              {busy === "live-bootstrap" ? "Kuruluyor…" : "Canlı TV kur (preset + 7 kategori)"}
            </span>
          </AdminBtn>
          <AdminBtn
            variant="secondary"
            disabled={!!busy}
            onClick={() => void run("live-presets", adminBulkLivePresets, "Canlı TV kanalları içe aktarıldı")}
          >
            <Download className={`h-4 w-4 shrink-0 ${busy === "live-presets" ? "animate-spin" : ""}`} />
            <span className="yt-admin-btn-label">
              {busy === "live-presets" ? "Aktarılıyor…" : "Canlı TV presetlerini içe aktar"}
            </span>
          </AdminBtn>
        </div>
        {msg ? (
          <div className="mt-3">
            <AdminAlert tone={msg.includes("başarısız") ? "warn" : "success"}>{msg}</AdminAlert>
          </div>
        ) : null}
      </AdminCard>

      <div>
        <h2 className={`mb-3 text-sm font-semibold ${light ? "text-zinc-800" : "text-white"}`}>Yönetim sayfaları</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { href: adminRoute("/canli-yayinlar"), title: "Canlı Yayınlar", desc: "Canlı TV kanalları", icon: Radio },
            { href: adminRoute("/yektube"), title: "Yektube", desc: "Kategori, kaynak, video", icon: Tv },
            { href: adminRoute("/muzik"), title: "Müzik", desc: "YouTube Music yönetimi", icon: Music2 },
            { href: adminRoute("/cocuk"), title: "Çocuk", desc: "Kids içerik yönetimi", icon: Baby },
            { href: adminRoute("/kaynaklar"), title: "Kaynaklar", desc: "Tüm kaynaklar", icon: Import },
          ].map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-xl border p-4 transition-colors ${
                light
                  ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <Icon className="mb-2 h-5 w-5 text-red-500" />
              <p className={`font-semibold ${light ? "text-zinc-900" : "text-white"}`}>{title}</p>
              <p className="mt-1 text-xs text-zinc-500">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
