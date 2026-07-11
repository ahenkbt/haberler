import type { YektubeSource } from "@workspace/yektube-core";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSources } from "@/lib/api";
import {
  adminBulkLivePresets,
  adminCreateSource,
  adminDeleteSource,
  adminPatchSource,
  adminSyncPlaylists,
  adminSyncSource,
  adminToggleSource,
  fetchLiveTvPresets,
} from "@/lib/adminApi";
import { Link, useLocation } from "wouter";
import { adminRoute } from "./adminPaths";
import { ytRoutes } from "@/lib/routes";
import { categoryLabel } from "@/lib/constants";
import { useAdminCategoryOptions } from "./useAdminCategoryOptions";
import { RefreshCw, Trash2, Plus, Power, Pencil, ListMusic, Radio, Video, Download } from "lucide-react";
import { AdminLiveSearchPanel } from "./AdminLiveSearchPanel";
import { AdminBtn, AdminField, AdminInput, AdminPageHeader, AdminSelect } from "./ui/adminUi";

type SourceFilter = "all" | "channel" | "playlist" | "video" | "live";
type SourceTypeOption = "channel" | "playlist" | "video" | "live";

function isLiveSourcesPath(path: string): boolean {
  return /\/canli-yayinlar\/?$/.test(path.replace(/\/$/, "")) || path.includes("/canli-yayinlar/");
}

function isLiveSource(s: YektubeSource): boolean {
  return s.sourceType === "live" || Boolean(s.isLive);
}

function sourceWatchUrl(source: YektubeSource): string {
  const url = source.url?.trim();
  if (url) return url;
  const cid = source.channelId?.trim() ?? "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(cid)) return `https://www.youtube.com/watch?v=${cid}`;
  return cid;
}

export function AdminSourcesPage() {
  const [path] = useLocation();
  const liveOnly = isLiveSourcesPath(path);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<SourceFilter>(liveOnly ? "live" : "all");
  const [showAdd, setShowAdd] = useState(false);
  const [addPreset, setAddPreset] = useState<SourceTypeOption>("channel");
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [importingLive, setImportingLive] = useState(false);

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    setMsgIsError(isError);
  };

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: fetchSources,
  });

  const { data: livePresets = [] } = useQuery({
    queryKey: ["admin-live-presets"],
    queryFn: fetchLiveTvPresets,
    enabled: liveOnly,
  });

  const livePresetNames = useMemo(() => livePresets.map((p) => p.name).join(", "), [livePresets]);
  const missingPresetCount = useMemo(() => {
    if (!liveOnly || livePresets.length === 0) return 0;
    const existing = new Set(sources.map((s) => s.name.trim().toLowerCase()));
    return livePresets.filter((p) => !existing.has(p.name.trim().toLowerCase())).length;
  }, [liveOnly, livePresets, sources]);

  const filtered = useMemo(() => {
    let rows = sources;
    if (filter === "channel") rows = rows.filter((s) => s.sourceType === "channel");
    else if (filter === "playlist") rows = rows.filter((s) => s.sourceType === "playlist" || s.sourceType === "podcast");
    else if (filter === "video") rows = rows.filter((s) => s.sourceType === "video");
    else if (filter === "live") rows = rows.filter((s) => s.sourceType === "live" || s.isLive);
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((s) => s.name.toLowerCase().includes(qq) || s.channelId.toLowerCase().includes(qq));
  }, [sources, q, filter]);

  const editSource = editId != null ? sources.find((s) => s.id === editId) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ekle") !== "1") return;
    if (params.get("live") === "1") {
      setAddPreset("live");
      setShowAdd(true);
      return;
    }
    if (params.get("video") === "1") {
      setAddPreset("video");
      setShowAdd(true);
      return;
    }
    if (params.get("playlist") === "1") {
      setAddPreset("playlist");
      setShowAdd(true);
      return;
    }
    setAddPreset("channel");
    setShowAdd(true);
  }, []);

  const addLiveDefault = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("live") === "1";
  }, []);

  const openAdd = (preset: SourceTypeOption) => {
    setAddPreset(preset);
    setShowAdd(true);
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-sources"] });

  const importLivePresets = async () => {
    setImportingLive(true);
    try {
      const r = await adminBulkLivePresets();
      showMsg(r.message ?? `${r.added ?? 0} canlı TV eklendi, ${r.skipped ?? 0} atlandı`);
      invalidate();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "Canlı TV presetleri eklenemedi", true);
    } finally {
      setImportingLive(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title={liveOnly ? "Canlı Yayınlar" : "Kaynaklar"}
        description={
          liveOnly
            ? "Canlı TV kanalları — site /canli sayfasında listelenir. Hazır kanalları içe aktarın veya tek tek ekleyin."
            : "YouTube kanalları, oynatma listeleri, tek videolar ve canlı yayın kaynakları."
        }
      />

      {liveOnly ? <AdminLiveSearchPanel onMessage={showMsg} /> : null}

      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-600">Hızlı işlemler</p>
        <div className="flex flex-wrap gap-2">
          {(liveOnly || filter === "live") && (
            <>
              <AdminBtn variant="primary" onClick={() => openAdd("live")}>
                <Radio className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Canlı TV ekle</span>
              </AdminBtn>
              <AdminBtn variant="secondary" disabled={importingLive} onClick={() => void importLivePresets()}>
                <Download className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">
                  {importingLive ? "İçe aktarılıyor…" : "Hazır kanalları içe aktar"}
                </span>
              </AdminBtn>
            </>
          )}
          {!liveOnly && (
            <>
              <AdminBtn variant="primary" onClick={() => openAdd("channel")}>
                <Plus className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Kanal ekle</span>
              </AdminBtn>
              <AdminBtn variant="secondary" onClick={() => openAdd("playlist")}>
                <ListMusic className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Playlist ekle</span>
              </AdminBtn>
              <AdminBtn variant="secondary" onClick={() => openAdd("video")}>
                <Video className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Tek video ekle</span>
              </AdminBtn>
              <AdminBtn variant="secondary" onClick={() => openAdd("live")}>
                <Radio className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Canlı TV ekle</span>
              </AdminBtn>
              <AdminBtn variant="secondary" disabled={importingLive} onClick={() => void importLivePresets()}>
                <Download className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">
                  {importingLive ? "İçe aktarılıyor…" : "Canlı presetleri içe aktar"}
                </span>
              </AdminBtn>
              <Link href={adminRoute("/kaziyici")}>
                <AdminBtn variant="secondary" type="button">
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  <span className="yt-admin-btn-label">Sosyal kazıyıcı</span>
                </AdminBtn>
              </Link>
            </>
          )}
          {liveOnly ? (
            <a href={ytRoutes.live()} target="_blank" rel="noopener noreferrer">
              <AdminBtn variant="secondary" type="button">
                <Radio className="h-4 w-4 shrink-0" />
                <span className="yt-admin-btn-label">Canlı sayfayı aç</span>
              </AdminBtn>
            </a>
          ) : null}
        </div>
      </div>

      {liveOnly && missingPresetCount > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{missingPresetCount} hazır kanal henüz eklenmemiş</p>
          <p className="mt-1 text-amber-900">
            <strong>Hazır kanalları içe aktar</strong> butonuna tıklayın: {livePresetNames}
          </p>
        </div>
      ) : null}

      {!liveOnly ? (
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Tümü"],
            ["channel", "Kanallar"],
            ["playlist", "Listeler"],
            ["video", "Tek video"],
            ["live", "Canlı"],
          ] as const
        ).map(([id, label]) => {
          const isActive = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              style={{
                color: isActive ? "#ffffff" : "#3f3f46",
                WebkitTextFillColor: isActive ? "#ffffff" : "#3f3f46",
                backgroundColor: isActive ? "#dc2626" : "#ffffff",
                borderColor: isActive ? "#dc2626" : "#cbd5e1",
              }}
              className={`yt-admin-filter rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-slate-400 hover:bg-slate-50 ${
                isActive ? "yt-admin-filter--active" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      ) : null}

      <AdminInput
        type="search"
        placeholder="Kaynak ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      {msg ? (
        <p className={`text-sm font-medium ${msgIsError ? "text-red-600" : "text-emerald-700"}`}>{msg}</p>
      ) : null}

      {filter === "live" || liveOnly ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Yayın kesildiyse satırdaki <strong>Link düzenle</strong> ile yeni YouTube adresini yapıştırın veya{" "}
          <strong>Sil</strong> ile kaldırın. Geçici gizlemek için <strong>Aç/Kapa</strong> kullanın.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-zinc-500">Yükleniyor…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Ad</th>
                <th className="px-4 py-3 font-semibold">Tür</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                {filter === "live" || liveOnly ? (
                  <th className="px-4 py-3 font-semibold">Yayın linki</th>
                ) : (
                  <th className="px-4 py-3 font-semibold">Video</th>
                )}
                {filter !== "live" && !liveOnly ? <th className="px-4 py-3 font-semibold">Çekim</th> : null}
                <th className="px-4 py-3 font-semibold">Durum</th>
                <th className="px-4 py-3 text-right font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const live = isLiveSource(s);
                const watchUrl = live ? sourceWatchUrl(s) : "";
                return (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.sourceType}</td>
                  <td className="px-4 py-3 text-zinc-600">{categoryLabel(s.categorySlug)}</td>
                  {filter === "live" || liveOnly ? (
                    <td className="max-w-[220px] px-4 py-3">
                      {watchUrl ? (
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs text-blue-700 hover:underline"
                          title={watchUrl}
                        >
                          {watchUrl}
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-zinc-600">{s.videoCount ?? "—"}</td>
                  )}
                  {filter !== "live" && !liveOnly ? (
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {s.useYoutubeApi !== false ? "API" : "Kazıma"}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-zinc-500"
                      }`}
                    >
                      {s.active ? "Aktif" : "Kapalı"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!live ? (
                        <>
                          <RowActionBtn
                            label="Güncelle"
                            onClick={() =>
                              void adminSyncSource(s.id)
                                .then((res) =>
                                  showMsg(
                                    res.batchId
                                      ? `${s.name} kuyruğa alındı — Sosyal kazıyıcıdan izleyin`
                                      : `${s.name} senkron kuyruğa alındı`,
                                  ),
                                )
                                .catch((e: Error) => showMsg(e.message, true))
                            }
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </RowActionBtn>
                          <RowActionBtn
                            label="Playlist"
                            onClick={() =>
                              void adminSyncPlaylists(s.id)
                                .then(() => showMsg(`${s.name} playlist senkronu başlatıldı`))
                                .catch((e: Error) => showMsg(e.message, true))
                            }
                          >
                            <ListMusic className="h-3.5 w-3.5" />
                          </RowActionBtn>
                        </>
                      ) : null}
                      <RowActionBtn label={live ? "Link düzenle" : "Düzenle"} onClick={() => setEditId(s.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </RowActionBtn>
                      <RowActionBtn
                        label="Aç/Kapa"
                        onClick={() =>
                          void adminToggleSource(s.id).then(invalidate).catch((e: Error) => showMsg(e.message, true))
                        }
                      >
                        <Power className="h-3.5 w-3.5" />
                      </RowActionBtn>
                      <RowActionBtn
                        label="Sil"
                        tone="danger"
                        onClick={() => {
                          const prompt = live
                            ? `"${s.name}" canlı kaynağı silinsin mi? Yayın kesildiyse önce yeni link deneyebilirsiniz.`
                            : `"${s.name}" silinsin mi?`;
                          if (!confirm(prompt)) return;
                          void adminDeleteSource(s.id).then(invalidate).catch((e: Error) => showMsg(e.message, true));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </RowActionBtn>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editSource ? (
        <EditSourceModal
          source={editSource}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            invalidate();
            showMsg("Kaynak güncellendi");
          }}
          onDeleted={() => {
            setEditId(null);
            invalidate();
            showMsg("Canlı kaynak silindi");
          }}
          onError={(text) => showMsg(text, true)}
        />
      ) : null}

      {showAdd ? (
        <AddSourceModal
          defaultSourceType={addPreset}
          defaultLive={addPreset === "live" || addLiveDefault}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            invalidate();
            showMsg("Kaynak eklendi");
          }}
        />
      ) : null}
    </div>
  );
}

function RowActionBtn({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  const textColor = tone === "danger" ? "#991b1b" : "#18181b";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        color: textColor,
        WebkitTextFillColor: textColor,
        backgroundColor: tone === "danger" ? "#fef2f2" : "#ffffff",
        borderColor: tone === "danger" ? "#fecaca" : "#cbd5e1",
      }}
      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
      <span className="yt-admin-btn-label">{label}</span>
    </button>
  );
}

function CategorySelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const options = useAdminCategoryOptions();
  return (
    <AdminSelect className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </AdminSelect>
  );
}

function EditSourceModal({
  source,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  source: YektubeSource;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const live = isLiveSource(source);
  const editableUrl = live || source.sourceType === "video";
  const [name, setName] = useState(source.name);
  const [url, setUrl] = useState(sourceWatchUrl(source));
  const [categorySlug, setCategorySlug] = useState(source.categorySlug ?? "haberler");
  const [active, setActive] = useState(source.active !== false);
  const [useYoutubeApi, setUseYoutubeApi] = useState(source.useYoutubeApi !== false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setErr("");
          const patch: Parameters<typeof adminPatchSource>[1] = {
            name: name.trim(),
            categorySlug,
            active,
          };
          if (!live && source.platform === "youtube") patch.useYoutubeApi = useYoutubeApi;
          if (editableUrl && url.trim()) {
            patch.url = url.trim();
            patch.channelId = url.trim();
          }
          void adminPatchSource(source.id, patch)
            .then(onSaved)
            .catch((ex: Error) => setErr(ex.message))
            .finally(() => setLoading(false));
        }}
      >
        <h2 className="text-lg font-bold text-zinc-900">{live ? "Canlı yayını düzenle" : "Kaynağı düzenle"}</h2>
        {live ? (
          <p className="mt-1 text-sm text-zinc-600">
            Yayın kesildiyse YouTube&apos;daki yeni canlı yayın linkini veya video ID&apos;sini yapıştırın.
          </p>
        ) : null}
        <AdminField label="Ad">
          <AdminInput value={name} onChange={(e) => setName(e.target.value)} />
        </AdminField>
        {editableUrl ? (
          <div className="mt-3">
            <AdminField
              label={live ? "Canlı yayın linki" : "YouTube URL / video ID"}
              hint="https://youtube.com/watch?v=… veya 11 karakterlik video ID"
            >
              <AdminInput
                required={live}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </AdminField>
          </div>
        ) : null}
        <div className="mt-3">
          <AdminField label="Kategori">
            <CategorySelect value={categorySlug} onChange={setCategorySlug} />
          </AdminField>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span>
            <span className="block text-sm font-medium text-zinc-900">Listede göster</span>
            <span className="text-[11px] text-zinc-500">
              {active ? "Açık — kullanıcılar görebilir" : "Kapalı — geçici olarak gizli"}
            </span>
          </span>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>
        {!live && source.platform === "youtube" ? (
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span>
              <span className="block text-sm font-medium text-zinc-900">YouTube Data API</span>
              <span className="text-[11px] text-zinc-500">
                {useYoutubeApi ? "Açık — resmi API ile video çekimi" : "Kapalı — RSS + HTML kazıma (en fazla ~50 video)"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={useYoutubeApi}
              onChange={(e) => setUseYoutubeApi(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
        ) : null}
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {live ? (
            <button
              type="button"
              disabled={deleting || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              onClick={() => {
                if (!confirm(`"${source.name}" canlı kaynağı silinsin mi?`)) return;
                setDeleting(true);
                void adminDeleteSource(source.id)
                  .then(onDeleted)
                  .catch((ex: Error) => onError(ex.message))
                  .finally(() => setDeleting(false));
              }}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Siliniyor…" : "Sil"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <AdminBtn variant="ghost" onClick={onClose}>
              İptal
            </AdminBtn>
            <button
              type="submit"
              disabled={loading || deleting}
              className="yt-admin-btn yt-admin-btn--primary inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AddSourceModal({
  onClose,
  onSaved,
  defaultLive = false,
  defaultSourceType = "channel",
}: {
  onClose: () => void;
  onSaved: () => void;
  defaultLive?: boolean;
  defaultSourceType?: SourceTypeOption;
}) {
  const initialType = defaultSourceType ?? (defaultLive ? "live" : "channel");
  const [platform, setPlatform] = useState<"youtube" | "instagram" | "tiktok">("youtube");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<SourceTypeOption>(initialType);
  const [categorySlug, setCategorySlug] = useState("haberler");
  const [useYoutubeApi, setUseYoutubeApi] = useState(true);
  const [isLive, setIsLive] = useState(initialType === "live" || defaultLive);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const isSocial = platform === "instagram" || platform === "tiktok";
  const urlPlaceholder = isSocial
    ? platform === "instagram"
      ? sourceType === "video"
        ? "https://instagram.com/reel/…"
        : "@kullanici veya instagram.com/kullanici"
      : sourceType === "video"
        ? "https://tiktok.com/@…/video/…"
        : "@kullanici veya tiktok.com/@kullanici"
    : sourceType === "video"
      ? "https://youtube.com/watch?v=… veya video ID"
      : sourceType === "playlist"
        ? "https://youtube.com/playlist?list=…"
        : sourceType === "live"
          ? "https://youtube.com/watch?v=… veya @kanal canlı URL"
          : "https://youtube.com/@kanal veya UC…";

  const showYoutubeApiToggle = !isSocial && (sourceType === "channel" || sourceType === "live");
  const showLiveToggle = !isSocial && sourceType !== "live";

  const modalTitle =
    sourceType === "live"
      ? "Canlı TV kanalı ekle"
      : sourceType === "video"
        ? "Tek video ekle"
        : "Kaynak ekle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setErr("");
          void adminCreateSource({
            name: name.trim() || url.trim(),
            platform,
            sourceType: isSocial && (sourceType === "playlist" || sourceType === "live") ? "channel" : sourceType,
            channelId: url.trim(),
            url: url.trim(),
            categorySlug,
            active: true,
            isLive: !isSocial && (sourceType === "live" ? true : isLive),
            useYoutubeApi: showYoutubeApiToggle ? useYoutubeApi : undefined,
          })
            .then(onSaved)
            .catch((ex: Error) => setErr(ex.message))
            .finally(() => setLoading(false));
        }}
      >
        <h2 className="text-lg font-bold text-zinc-900">{modalTitle}</h2>
        <div className="mt-3">
          <AdminField label="Platform">
            <AdminSelect
              value={platform}
              onChange={(e) => {
                const next = e.target.value as "youtube" | "instagram" | "tiktok";
                setPlatform(next);
                if (next !== "youtube" && (sourceType === "playlist" || sourceType === "live")) {
                  setSourceType("channel");
                  setIsLive(false);
                }
              }}
            >
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram Reels</option>
              <option value="tiktok">TikTok</option>
            </AdminSelect>
          </AdminField>
        </div>
        <div className="mt-3">
          <AdminField label="Görünen ad">
            <AdminInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. CNN Türk" />
          </AdminField>
        </div>
        <div className="mt-3">
          <AdminField label={isSocial ? "Profil / video URL" : "YouTube URL / ID"} hint={urlPlaceholder}>
            <AdminInput required value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlPlaceholder} />
          </AdminField>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <AdminField label="Tür">
            <AdminSelect
              value={sourceType}
              onChange={(e) => {
                const next = e.target.value as SourceTypeOption;
                setSourceType(next);
                if (next === "live") setIsLive(true);
              }}
            >
              <option value="channel">{isSocial ? "Profil" : "Kanal"}</option>
              {!isSocial ? <option value="playlist">Playlist</option> : null}
              <option value="video">Tek video</option>
              {!isSocial ? <option value="live">Canlı TV</option> : null}
            </AdminSelect>
          </AdminField>
          <AdminField label="Kategori">
            <CategorySelect value={categorySlug} onChange={setCategorySlug} />
          </AdminField>
        </div>
        {showLiveToggle ? (
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span>
              <span className="block text-sm font-medium text-zinc-900">Canlı yayın</span>
              <span className="text-[11px] text-zinc-500">
                {isLive ? "Açık — Canlı TV listesinde gösterilir" : "Kapalı — normal video olarak işlenir"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
        ) : null}
        {showYoutubeApiToggle ? (
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span>
              <span className="block text-sm font-medium text-zinc-900">YouTube Data API</span>
              <span className="text-[11px] text-zinc-500">
                {useYoutubeApi ? "Açık — resmi API" : "Kapalı — RSS + HTML kazıma"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={useYoutubeApi}
              onChange={(e) => setUseYoutubeApi(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
        ) : null}
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <AdminBtn variant="ghost" onClick={onClose}>
            İptal
          </AdminBtn>
          <button
            type="submit"
            disabled={loading}
            className="yt-admin-btn yt-admin-btn--primary inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Ekleniyor…" : "Ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}
