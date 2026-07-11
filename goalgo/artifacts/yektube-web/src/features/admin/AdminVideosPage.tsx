import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { YektubeVideo } from "@workspace/yektube-core";
import { fetchVideos } from "@/lib/api";
import { filterVideosByCategory } from "@/lib/categoryMatch";
import { adminBulkPatchVideoCategory, adminDeleteVideo, adminPatchVideo } from "@/lib/adminApi";
import { videoThumbUrl, categoryLabel } from "@/lib/constants";
import { AdminCategorySelect } from "@/features/admin/AdminCategorySelect";
import { useAdminCategoryOptions } from "@/features/admin/useAdminCategoryOptions";
import { Star, Eye, EyeOff, Trash2, Pencil, X } from "lucide-react";

export function AdminVideosPage() {
  const qc = useQueryClient();
  const categoryOptions = useAdminCategoryOptions();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"" | "instagram" | "tiktok" | "social">("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<YektubeVideo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("eglence");
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-videos", q, categoryFilter, platformFilter],
    queryFn: () =>
      fetchVideos({
        limit: 48,
        excludeStories: false,
        enrichTitles: true,
        search: q.trim() || undefined,
        categorySlug: categoryFilter || undefined,
        strictCategory: Boolean(categoryFilter),
        platform: platformFilter || undefined,
      }),
  });

  const videos = filterVideosByCategory(data?.items ?? [], categoryFilter || undefined);
  const videoIds = useMemo(() => videos.map((v) => v.id), [videos]);
  const allSelected = videoIds.length > 0 && videoIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const patch = async (id: number, body: Parameters<typeof adminPatchVideo>[1]) => {
    try {
      await adminPatchVideo(id, body);
      await qc.invalidateQueries({ queryKey: ["admin-videos"] });
      setMsg("Güncellendi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    }
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(videoIds) : new Set());
  };

  const applyBulkCategory = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await adminBulkPatchVideoCategory(ids, bulkCategory);
      await qc.invalidateQueries({ queryKey: ["admin-videos"] });
      setSelectedIds(new Set());
      setMsg(`${result.updated} video "${categoryLabel(result.categorySlug)}" kategorisine taşındı`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Toplu güncelleme başarısız");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Videolar</h1>
        <p className="text-sm text-zinc-400">Kategori düzenle, öne çıkar, gizle veya sil</p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSelectedIds(new Set());
          void refetch();
        }}
      >
        <input
          type="search"
          placeholder="Başlık, kanal veya video ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
          className="w-44 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white"
        >
          <option value="">Tüm platformlar</option>
          <option value="social">Instagram + TikTok</option>
          <option value="instagram">Instagram Reels</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white"
        >
          <option value="">Tüm kategoriler</option>
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">
          Ara
        </button>
      </form>

      {videos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => toggleAll(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-red-600"
            />
            Tümünü seç
          </label>
          <span className="text-xs text-zinc-500">
            {someSelected ? `${selectedIds.size} video seçili` : "Bu sayfadaki videolar (en fazla 48)"}
          </span>
        </div>
      ) : null}

      {someSelected ? (
        <div className="sticky top-2 z-20 flex flex-wrap items-end gap-2 rounded-xl border border-red-900/40 bg-zinc-900 p-3 shadow-lg">
          <div className="min-w-[200px] flex-1">
            <p className="mb-1 text-xs font-medium text-zinc-400">Toplu kategori değiştir ({selectedIds.size} video)</p>
            <AdminCategorySelect value={bulkCategory} onChange={setBulkCategory} />
          </div>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => void applyBulkCategory()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {bulkBusy ? "Uygulanıyor…" : "Kategoriyi uygula"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
          >
            Seçimi temizle
          </button>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}

      {editing ? (
        <EditCategoryModal
          video={editing}
          onClose={() => setEditing(null)}
          onSave={async (categorySlug) => {
            await patch(editing.id, { categorySlug });
            setEditing(null);
          }}
        />
      ) : null}

      {isLoading ? (
        <p className="text-zinc-500">Yükleniyor…</p>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => {
            const checked = selectedIds.has(v.id);
            return (
              <div
                key={v.id}
                className={`flex gap-3 rounded-xl border p-3 ${
                  checked ? "border-red-800/60 bg-red-950/20" : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <label className="flex shrink-0 cursor-pointer items-start pt-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleOne(v.id, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-red-600"
                    aria-label={`${v.title} — seç`}
                  />
                </label>
                <img
                  src={videoThumbUrl(v.videoId, v.thumbnail, "mq")}
                  alt=""
                  className="aspect-video w-32 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-white">{v.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {v.channelName} · {v.videoId}
                    {v.platform === "instagram" || v.platform === "tiktok" ? (
                      <span className="ml-2 rounded bg-fuchsia-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fuchsia-200">
                        {v.platform}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Kategori: <span className="text-zinc-200">{categoryLabel(v.categorySlug ?? "—")}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <ToggleBtn active={false} onClick={() => setEditing(v)} icon={Pencil} label="Düzenle" />
                    <ToggleBtn
                      active={v.isFeatured}
                      onClick={() => void patch(v.id, { isFeatured: !v.isFeatured })}
                      icon={Star}
                      label={v.isFeatured ? "Öne çıkan" : "Öne çıkar"}
                    />
                    <ToggleBtn
                      active={v.active !== false}
                      onClick={() => void patch(v.id, { active: !v.active })}
                      icon={v.active !== false ? Eye : EyeOff}
                      label={v.active !== false ? "Yayında" : "Gizli"}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Video silinsin mi?")) return;
                        void adminDeleteVideo(v.id)
                          .then(() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(v.id);
                              return next;
                            });
                            return qc.invalidateQueries({ queryKey: ["admin-videos"] });
                          })
                          .catch((e: Error) => setMsg(e.message));
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-red-900/50 px-2 py-1 text-[10px] font-bold uppercase text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {videos.length === 0 ? <p className="text-sm text-zinc-500">Video bulunamadı.</p> : null}
        </div>
      )}
    </div>
  );
}

function EditCategoryModal({
  video,
  onClose,
  onSave,
}: {
  video: YektubeVideo;
  onClose: () => void;
  onSave: (categorySlug: string) => Promise<void>;
}) {
  const [categorySlug, setCategorySlug] = useState(video.categorySlug?.trim() || "eglence");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Kategori düzenle</h2>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{video.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-xs font-medium text-zinc-400">
          Video kategorisi
          <AdminCategorySelect value={categorySlug} onChange={setCategorySlug} className="mt-1" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void onSave(categorySlug).finally(() => setSaving(false));
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: typeof Star;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`yt-admin-toggle inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
        active
          ? "yt-admin-toggle--active border-amber-700/50 bg-amber-950/40 text-amber-300"
          : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500 hover:text-white"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
