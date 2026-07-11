import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { YektubeSource } from "@workspace/yektube-core";
import {
  adminImportMusicYtm,
  adminImportMusicYoutubeSearch,
  adminMusicBrowse,
  adminMusicSearch,
  adminMusicStats,
  adminSyncMusicSources,
  type MusicBrowseSection,
} from "@/lib/adminApi";
import { AdminAlert, AdminBtn, AdminCard, AdminPageHeader, AdminTabBar } from "./ui/adminUi";
import { AdminSectionCategoriesTab } from "./AdminSectionCategoriesTab";
import { AdminSectionSourcesTab } from "./AdminSectionSourcesTab";
import { AdminSectionVideosTab } from "./AdminSectionVideosTab";
import { Loader2, Music2, RefreshCw, Search } from "lucide-react";

type TabId = "kaynaklar" | "kategoriler" | "videolar" | "ytm" | "youtube" | "senkron";

const MUSIC_SLUGS = new Set(["muzik", "müzik", "music"]);

function isMusicSource(s: YektubeSource): boolean {
  return MUSIC_SLUGS.has(s.categorySlug?.trim().toLowerCase() ?? "");
}

export function AdminMusicPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("kaynaklar");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ytQuery, setYtQuery] = useState("müzik");
  const [ytmQuery, setYtmQuery] = useState("türk pop");

  const { data: stats } = useQuery({
    queryKey: ["admin-music-stats"],
    queryFn: adminMusicStats,
  });

  const { data: ytmBrowse, isLoading: ytmLoading, refetch: refetchYtm } = useQuery({
    queryKey: ["admin-music-ytm-browse"],
    queryFn: adminMusicBrowse,
    enabled: tab === "ytm",
  });

  const [ytmSearchResult, setYtmSearchResult] = useState<{
    items: MusicBrowseSection["items"];
    channels: Array<{ channelId: string; title: string; thumbnail?: string }>;
  } | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fn();
      const extra =
        res && typeof res === "object" && "imported" in res
          ? ` — ${(res as { imported?: number }).imported ?? 0} video, ${(res as { channels?: number }).channels ?? 0} kanal, ${(res as { skipped?: number }).skipped ?? 0} atlandı`
          : res && typeof res === "object" && "synced" in res
            ? ` — ${(res as { synced?: number }).synced ?? 0} senkron, ${(res as { failed?: number }).failed ?? 0} hata`
            : "";
      setMsg(`${label} tamam${extra}`);
      void qc.invalidateQueries({ queryKey: ["admin-music-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-sources"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "kaynaklar", label: "Kaynaklar" },
    { id: "kategoriler", label: "Kategoriler" },
    { id: "videolar", label: "Videolar" },
    { id: "ytm", label: "YouTube Music" },
    { id: "youtube", label: "YouTube Arama" },
    { id: "senkron", label: "Senkron" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Müzik Yönetimi"
        description="YouTube Music ve YouTube aramasından müzik içeriği içe aktarın; müzik kaynaklarını yönetin."
        actions={
          stats ? (
            <div className="flex gap-3 text-xs text-zinc-400">
              <span>{stats.sources} kaynak</span>
              <span>{stats.videos} video</span>
            </div>
          ) : null
        }
      />

      {msg ? (
        <AdminAlert tone={msg.includes("Hata") || msg.includes("başarısız") ? "warn" : "success"}>{msg}</AdminAlert>
      ) : null}

      <AdminTabBar<TabId> tabs={tabs} active={tab} onChange={setTab} />

      {tab === "kaynaklar" ? (
        <AdminSectionSourcesTab
          title="Müzik kaynakları"
          filter={isMusicSource}
          defaultCategorySlug="muzik"
          lockCategory
        />
      ) : null}

      {tab === "kategoriler" ? <AdminSectionCategoriesTab section="muzik" /> : null}
      {tab === "videolar" ? <AdminSectionVideosTab section="muzik" /> : null}

      {tab === "ytm" ? (
        <div className="space-y-4">
          <AdminCard
            title="YouTube Music ana sayfa"
            description="music.youtube.com ana sayfasından bölümleri önizleyin ve içe aktarın."
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <AdminBtn disabled={busy} variant="secondary" onClick={() => void refetchYtm()}>
                <RefreshCw className="h-4 w-4" />
                Yenile
              </AdminBtn>
              <AdminBtn
                disabled={busy}
                onClick={() => void run("YTM ana sayfa içe aktarım", () => adminImportMusicYtm({ limit: 32 }))}
              >
                Ana sayfadan içe aktar (ilk 3 bölüm)
              </AdminBtn>
            </div>

            {ytmLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {(ytmBrowse?.sections ?? []).map((section, si) => (
                  <div key={`${section.title}-${si}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                      <AdminBtn
                        disabled={busy}
                        variant="secondary"
                        onClick={() => void run(`"${section.title}" içe aktarım`, () => adminImportMusicYtm({ sectionIndex: si, limit: 24 }))}
                      >
                        Bölümü içe aktar
                      </AdminBtn>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {section.items.slice(0, 12).map((item) => (
                        <div key={item.id} className="w-36 shrink-0">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="aspect-square w-full rounded-lg object-cover" />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-zinc-800">
                              <Music2 className="h-8 w-8 text-zinc-600" />
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs font-medium text-zinc-200">{item.title}</p>
                          <p className="line-clamp-1 text-[10px] text-zinc-500">{item.subtitle ?? item.kind}</p>
                          {item.kind === "playlist" && item.id.startsWith("VL") ? (
                            <AdminBtn
                              className="mt-1 w-full text-[10px]"
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                void run("Playlist içe aktarım", () => adminImportMusicYtm({ playlistId: item.id, limit: 24 }))
                              }
                            >
                              Listeyi aktar
                            </AdminBtn>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard title="YouTube Music arama" description="Parça, albüm veya liste arayıp içe aktarın.">
            <div className="flex flex-wrap gap-2">
              <input
                value={ytmQuery}
                onChange={(e) => setYtmQuery(e.target.value)}
                className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <AdminBtn
                disabled={busy}
                variant="secondary"
                onClick={() =>
                  void run("YTM arama", async () => {
                    const res = await adminMusicSearch(ytmQuery, "song");
                    setYtmSearchResult(res);
                  })
                }
              >
                <Search className="h-4 w-4" />
                Ara
              </AdminBtn>
              <AdminBtn
                disabled={busy}
                onClick={() =>
                  void run("YTM arama içe aktarım", () =>
                    adminImportMusicYtm({
                      videoIds: (ytmSearchResult?.items ?? [])
                        .map((i) => i.videoId ?? (i.kind === "song" ? i.id : null))
                        .filter((id): id is string => Boolean(id)),
                      limit: 24,
                    }),
                  )
                }
              >
                Sonuçları içe aktar
              </AdminBtn>
            </div>
            {ytmSearchResult?.items.length ? (
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-zinc-300">
                {ytmSearchResult.items.map((item) => (
                  <li key={item.id}>
                    {item.title} — {item.artists ?? item.subtitle ?? item.kind}
                  </li>
                ))}
              </ul>
            ) : null}
          </AdminCard>
        </div>
      ) : null}

      {tab === "youtube" ? (
        <AdminCard
          title="YouTube arama (müzik)"
          description="youtube.com/results?search_query=müzik benzeri arama — kanallar ve videolar müzik kategorisine eklenir."
        >
          <div className="flex flex-wrap gap-2">
            <input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              placeholder="müzik"
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
            <AdminBtn
              disabled={busy}
              onClick={() =>
                void run("YouTube müzik içe aktarım", () =>
                  adminImportMusicYoutubeSearch({
                    query: ytQuery,
                    limit: 32,
                    importVideos: true,
                    importChannels: true,
                  }),
                )
              }
            >
              Kanal + video içe aktar
            </AdminBtn>
            <AdminBtn
              disabled={busy}
              variant="secondary"
              onClick={() =>
                void run("Sadece kanallar", () =>
                  adminImportMusicYoutubeSearch({
                    query: ytQuery,
                    limit: 16,
                    importVideos: false,
                    importChannels: true,
                  }),
                )
              }
            >
              Sadece kanallar
            </AdminBtn>
            <AdminBtn
              disabled={busy}
              variant="secondary"
              onClick={() =>
                void run("Sadece videolar", () =>
                  adminImportMusicYoutubeSearch({
                    query: ytQuery,
                    limit: 32,
                    importVideos: true,
                    importChannels: false,
                  }),
                )
              }
            >
              Sadece videolar
            </AdminBtn>
          </div>
        </AdminCard>
      ) : null}

      {tab === "senkron" ? (
        <AdminCard title="Müzik senkronu" description="Tüm müzik kaynaklarını YouTube'dan günceller.">
          <AdminBtn disabled={busy} onClick={() => void run("Müzik senkronu", adminSyncMusicSources)}>
            <RefreshCw className="h-4 w-4" />
            Tüm müzik kaynaklarını senkronla
          </AdminBtn>
        </AdminCard>
      ) : null}
    </div>
  );
}
