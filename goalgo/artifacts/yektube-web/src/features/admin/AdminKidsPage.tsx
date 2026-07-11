import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import {
  adminFetchSectionStats,
  adminImportKidsBootstrap,
  adminImportKidsPresets,
  adminImportKidsYoutubeSearch,
  adminSyncKidsSources,
} from "@/lib/adminApi";
import type { YektubeSource } from "@workspace/yektube-core";
import { AdminAlert, AdminBtn, AdminCard, AdminPageHeader, AdminTabBar } from "./ui/adminUi";
import { AdminSectionCategoriesTab } from "./AdminSectionCategoriesTab";
import { AdminSectionSourcesTab } from "./AdminSectionSourcesTab";
import { AdminSectionVideosTab } from "./AdminSectionVideosTab";

type TabId = "kaynaklar" | "kategoriler" | "videolar" | "ice-aktar" | "senkron";

const COCUK_SLUGS = new Set(["cocuk", "çocuk", "kids"]);

const KIDS_SEARCH_PRESETS = [
  { label: "Genel", query: "çocuk videoları türkçe" },
  { label: "Müzik", query: "çocuk şarkıları türkçe" },
  { label: "Öğrenme", query: "eğitici çocuk videoları türkçe" },
  { label: "Çizgi film", query: "çizgi film türkçe" },
  { label: "Niloya", query: "niloya türkçe" },
  { label: "Rafadan Tayfa", query: "rafadan tayfa" },
];

function isKidsSource(s: YektubeSource): boolean {
  return COCUK_SLUGS.has(s.categorySlug?.trim().toLowerCase() ?? "");
}

export function AdminKidsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("kaynaklar");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ytQuery, setYtQuery] = useState("çocuk videoları türkçe");

  const { data: stats } = useQuery({
    queryKey: ["admin-section-stats"],
    queryFn: adminFetchSectionStats,
    select: (data) => {
      const cocuk = data.sections.find((s) => s.id === "cocuk");
      return { sources: cocuk?.sourceCount ?? 0, videos: cocuk?.videoCount ?? 0 };
    },
  });

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fn();
      const extra =
        res && typeof res === "object" && "scheduled" in res && (res as { scheduled?: boolean }).scheduled
          ? " — arka planda çalışıyor (1-2 dk sonra listeyi yenileyin)"
          : res && typeof res === "object" && "imported" in res
          ? ` — ${(res as { imported?: number }).imported ?? 0} video, ${(res as { channels?: number }).channels ?? 0} kanal`
          : res && typeof res === "object" && "added" in res
            ? ` — ${(res as { added?: number }).added ?? 0} kanal eklendi`
            : res && typeof res === "object" && "synced" in res
              ? ` — ${(res as { synced?: number }).synced ?? 0} senkron`
              : res && typeof res === "object" && "scheduled" in res
                ? " — arka planda çalışıyor"
                : "";
      setMsg(`${label} tamam${extra}`);
      void qc.invalidateQueries({ queryKey: ["admin-section-stats"] });
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
    { id: "ice-aktar", label: "İçe Aktar" },
    { id: "senkron", label: "Senkron" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Çocuk Yönetimi"
        description="YouTube Kids tarzı çocuk bölümü — kanal, kategori ve video yönetimi."
        actions={
          stats ? (
            <div className="flex gap-3 text-xs text-zinc-400">
              <span>{stats.sources} kaynak</span>
              <span>{stats.videos} video</span>
            </div>
          ) : (
            <Baby className="h-5 w-5 text-orange-400" />
          )
        }
      />

      {msg ? (
        <AdminAlert tone={msg.includes("Hata") || msg.includes("başarısız") || msg.includes("HTTP") ? "warn" : "success"}>
          {msg}
        </AdminAlert>
      ) : null}

      <AdminTabBar<TabId> tabs={tabs} active={tab} onChange={setTab} />

      {tab === "kaynaklar" ? (
        <AdminSectionSourcesTab
          title="Çocuk kaynakları"
          filter={isKidsSource}
          defaultCategorySlug="cocuk"
          lockCategory
        />
      ) : null}
      {tab === "kategoriler" ? <AdminSectionCategoriesTab section="cocuk" /> : null}
      {tab === "videolar" ? <AdminSectionVideosTab section="cocuk" /> : null}

      {tab === "ice-aktar" ? (
        <div className="space-y-4">
          <AdminCard
            title="YouTube Kids tarzı toplu içe aktarım"
            description="Hazır çocuk kanallarını ekler, kategori aramalarından video ve kanal içe aktarır."
          >
            <div className="flex flex-wrap gap-2">
              <AdminBtn
                variant="primary"
                disabled={busy}
                onClick={() => void run("Toplu içe aktarım", () => adminImportKidsBootstrap({ async: true }))}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Tümünü içe aktar
              </AdminBtn>
              <AdminBtn
                disabled={busy}
                onClick={() => void run("Hazır kanallar", () => adminImportKidsPresets({ async: true }))}
              >
                Sadece hazır kanallar
              </AdminBtn>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              TRT Çocuk, Niloya, Rafadan Tayfa, CoComelon, Peppa Pig ve 30+ çocuk kanalı; Müzik / Keşfet / Öğrenme / Şovlar
              aramalarından videolar.
            </p>
          </AdminCard>

          <AdminCard title="YouTube aramasından içe aktar" description="Belirli bir sorgu ile kanal ve video ekleyin.">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run("YouTube arama", () =>
                  adminImportKidsYoutubeSearch({ query: ytQuery, limit: 24, importVideos: true, importChannels: true, async: true }),
                );
              }}
            >
              <input
                value={ytQuery}
                onChange={(e) => setYtQuery(e.target.value)}
                placeholder="ör. çocuk şarkıları türkçe"
                className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
              <AdminBtn type="submit" variant="primary" disabled={busy}>
                <Search className="h-4 w-4" />
                Ara ve içe aktar
              </AdminBtn>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {KIDS_SEARCH_PRESETS.map((p) => (
                <button
                  key={p.query}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setYtQuery(p.query);
                    void run(p.label, () =>
                      adminImportKidsYoutubeSearch({ query: p.query, limit: 20, importVideos: true, importChannels: true, async: true }),
                    );
                  }}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </AdminCard>
        </div>
      ) : null}

      {tab === "senkron" ? (
        <AdminCard
          title="Çocuk kaynaklarını senkronla"
          description="Tüm aktif çocuk kanallarından güncel videoları çeker."
        >
          <AdminBtn
            variant="primary"
            disabled={busy}
            onClick={() => void run("Senkron", () => adminSyncKidsSources())}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tüm çocuk kaynaklarını senkronla
          </AdminBtn>
        </AdminCard>
      ) : null}
    </div>
  );
}
