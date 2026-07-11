import { useState } from "react";
import { adminCreateSource } from "@/lib/adminApi";
import { AdminCategorySelect } from "@/features/admin/AdminCategorySelect";
import { AdminBtn } from "@/features/admin/ui/adminUi";

export function AdminAddSourceModal({
  onClose,
  onSaved,
  defaultCategorySlug = "haberler",
  lockCategory = false,
  defaultLive = false,
}: {
  onClose: () => void;
  onSaved: () => void;
  defaultCategorySlug?: string;
  lockCategory?: boolean;
  defaultLive?: boolean;
}) {
  type SourceTypeOption = "channel" | "playlist" | "video" | "live";
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<SourceTypeOption>(defaultLive ? "live" : "channel");
  const [categorySlug, setCategorySlug] = useState(defaultCategorySlug);
  const [useYoutubeApi, setUseYoutubeApi] = useState(true);
  const [isLive, setIsLive] = useState(defaultLive);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const urlPlaceholder =
    sourceType === "video"
      ? "https://youtube.com/watch?v=… veya video ID"
      : sourceType === "playlist"
        ? "https://youtube.com/playlist?list=…"
        : sourceType === "live"
          ? "https://youtube.com/@kanal veya canlı URL"
          : "https://youtube.com/@kanal veya UC…";

  const showYoutubeApiToggle = sourceType === "channel" || sourceType === "live";
  const showLiveToggle = sourceType !== "live";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 max-h-[90vh] overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setErr("");
          void adminCreateSource({
            name: name.trim() || url.trim(),
            platform: "youtube",
            sourceType,
            channelId: url.trim(),
            url: url.trim(),
            categorySlug: lockCategory ? defaultCategorySlug : categorySlug,
            active: true,
            isLive: sourceType === "live" ? true : isLive,
            useYoutubeApi: showYoutubeApiToggle ? useYoutubeApi : undefined,
          })
            .then(onSaved)
            .catch((ex: Error) => setErr(ex.message))
            .finally(() => setLoading(false));
        }}
      >
        <h2 className="text-lg font-bold text-white">Kaynak ekle</h2>
        <label className="mt-3 block text-xs text-zinc-400">
          Görünen ad
          <input
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-xs text-zinc-400">
          YouTube URL / ID
          <input
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={urlPlaceholder}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">
            Tür
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
              value={sourceType}
              onChange={(e) => {
                const next = e.target.value as SourceTypeOption;
                setSourceType(next);
                if (next === "live") setIsLive(true);
              }}
            >
              <option value="channel">Kanal</option>
              <option value="playlist">Playlist</option>
              <option value="video">Tek video</option>
              <option value="live">Canlı</option>
            </select>
          </label>
          {!lockCategory ? (
            <label className="text-xs text-zinc-400">
              Kategori
              <AdminCategorySelect value={categorySlug} onChange={setCategorySlug} className="mt-1" />
            </label>
          ) : (
            <div className="text-xs text-zinc-400">
              Kategori
              <p className="mt-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                {defaultCategorySlug}
              </p>
            </div>
          )}
        </div>
        {showLiveToggle ? (
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-zinc-700 px-3 py-2">
            <span>
              <span className="block text-sm text-white">Canlı yayın</span>
            </span>
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600"
            />
          </label>
        ) : null}
        {showYoutubeApiToggle ? (
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-zinc-700 px-3 py-2">
            <span>
              <span className="block text-sm text-white">YouTube Data API</span>
            </span>
            <input
              type="checkbox"
              checked={useYoutubeApi}
              onChange={(e) => setUseYoutubeApi(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600"
            />
          </label>
        ) : null}
        {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <AdminBtn type="button" variant="ghost" onClick={onClose}>
            İptal
          </AdminBtn>
          <AdminBtn type="submit" variant="primary" disabled={loading}>
            {loading ? "Ekleniyor…" : "Kaynağı ekle"}
          </AdminBtn>
        </div>
      </form>
    </div>
  );
}
