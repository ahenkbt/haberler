import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useListVideoSources,
  useListVideoPresets,
  useCreateVideoSource,
  useDeleteVideoSource,
  useToggleVideoSource,
  getListVideoSourcesQueryKey,
  useGetSiteSettings,
  type VideoSource,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlaySquare,
  Plus,
  Search,
  MonitorPlay,
  Trash2,
  Radio,
  ListVideo,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Pencil,
  Smartphone,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugifyVideoTvCategory, VIDEO_TV_ADMIN_CATEGORY_OPTIONS, VIDEO_TV_CATEGORY_LABELS } from "@/lib/videoTvCategories";

type SourceType = "channel" | "playlist" | "video" | "live";
type Platform = "youtube" | "dailymotion";

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    value: "channel",
    label: "Kanal",
    icon: <MonitorPlay className="w-4 h-4" />,
    hint: "YouTube kanal ID veya @kullaniciadi girin",
  },
  {
    value: "playlist",
    label: "Playlist",
    icon: <ListVideo className="w-4 h-4" />,
    hint: "YouTube playlist ID (PLxxxx formatı)",
  },
  {
    value: "video",
    label: "Tek Video",
    icon: <Video className="w-4 h-4" />,
    hint: "YouTube video ID veya tam URL",
  },
  {
    value: "live",
    label: "Canlı Yayın",
    icon: <Radio className="w-4 h-4" />,
    hint: "Canlı yayın kanal ID",
  },
];

function isChannelSourceType(type: string): boolean {
  return type === "channel" || type === "live" || type === "video";
}

function isListSourceType(type: string): boolean {
  return type === "playlist" || type === "podcast";
}

function matchesSourceSearch(name: string, query: string): boolean {
  return !query || name.toLowerCase().includes(query.toLowerCase());
}

const PRESET_ALL = "all";

function extractId(raw: string): string {
  const t = raw.trim();
  try {
    const url = new URL(t);
    // youtube.com/channel/UCxxxx or /c/name or /@handle
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("youtube")) {
      const listParam = url.searchParams.get("list");
      if (listParam) return listParam; // playlist
      const vParam = url.searchParams.get("v");
      if (vParam) return vParam; // video
      const idx = parts.findIndex(
        (p) => p === "channel" || p === "c" || p === "user",
      );
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      if (parts[0]?.startsWith("@")) return parts[0];
      return parts[parts.length - 1] || raw;
    }
  } catch {
    /* not a URL */
  }
  return t;
}

type AdminSource = VideoSource & {
  useYoutubeApi?: boolean;
};

type EditVideoRow = {
  id: number;
  title: string;
  videoId: string;
};

export default function VideoTv() {
  const { data: sources, isLoading: sourcesLoading } = useListVideoSources();
  const { data: presets } = useListVideoPresets();
  const { data: siteSettings } = useGetSiteSettings();
  const createSource = useCreateVideoSource();
  const deleteSource = useDeleteVideoSource();
  const toggleSource = useToggleVideoSource();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [platform, setPlatform] = useState<Platform>("youtube");
  const [sourceType, setSourceType] = useState<SourceType>("channel");
  const [rawInput, setRawInput] = useState("");
  const [channelId, setChannelId] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [category, setCategory] = useState("muzik");
  const [customCategory, setCustomCategory] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [useYoutubeApi, setUseYoutubeApi] = useState(true);
  const [presetCat, setPresetCat] = useState(PRESET_ALL);
  const [bulkAddingPresets, setBulkAddingPresets] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncUseApi, setSyncUseApi] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<AdminSource | null>(null);
  const [editName, setEditName] = useState("");
  const [editChannelId, setEditChannelId] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editCategory, setEditCategory] = useState("muzik");
  const [editUseApi, setEditUseApi] = useState(true);
  const [editVideos, setEditVideos] = useState<EditVideoRow[]>([]);
  const [editVideosLoading, setEditVideosLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [syncShortsRunning, setSyncShortsRunning] = useState(false);
  const [importTopRunning, setImportTopRunning] = useState(false);

  const hasYoutubeApiKey = Boolean((siteSettings as { hasYoutubeApiKey?: boolean } | undefined)?.hasYoutubeApiKey);

  useEffect(() => {
    if (platform === "youtube" && (sourceType === "channel" || sourceType === "live")) {
      setUseYoutubeApi(hasYoutubeApiKey);
    }
  }, [hasYoutubeApiKey, platform, sourceType]);

  useEffect(() => {
    if (!sources) return;
    const next: Record<number, boolean> = {};
    for (const s of sources) {
      next[s.id] = (s as AdminSource).useYoutubeApi !== false;
    }
    setSyncUseApi(next);
  }, [sources]);

  const openEdit = useCallback(async (source: AdminSource) => {
    setEditing(source);
    setEditName(source.name);
    setEditChannelId(source.channelId);
    setEditUrl(source.url ?? "");
    setEditLogoUrl(source.logoUrl ?? "");
    setEditCategory(source.categorySlug || "muzik");
    setEditUseApi((source as AdminSource).useYoutubeApi !== false);
    setEditVideos([]);
    setEditVideosLoading(true);
    try {
      const r = await fetch(`/api/video/videos?sourceId=${source.id}&limit=50`);
      const data = await r.json();
      setEditVideos(
        ((data.items ?? []) as EditVideoRow[]).map((v) => ({
          id: v.id,
          title: v.title,
          videoId: v.videoId,
        })),
      );
    } finally {
      setEditVideosLoading(false);
    }
  }, []);

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const cat = slugifyVideoTvCategory(editCategory);
      const r = await fetch(`/api/video/sources/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          channelId: editChannelId.trim(),
          url: editUrl.trim() || null,
          logoUrl: editLogoUrl.trim() || null,
          categorySlug: cat || editing.categorySlug,
          useYoutubeApi: editUseApi,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || "Kaynak güncellenemedi");

      for (const v of editVideos) {
        const orig = editing.id;
        await fetch(`/api/video/videos/${v.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: v.title.trim() }),
        }).catch(() => undefined);
        void orig;
      }

      toast({ title: "Kaynak güncellendi" });
      setEditing(null);
      invalidate();
    } catch (e) {
      toast({
        title: "Güncelleme hatası",
        description: e instanceof Error ? e.message : "Bilinmeyen hata",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListVideoSourcesQueryKey() });

  const handleFill = () => {
    const id = extractId(rawInput);
    setChannelId(id);
    toast({ title: "ID çıkarıldı", description: id });
  };

  const handleAdd = () => {
    const sourceInput = (channelId || rawInput).trim();
    if (!name || !sourceInput) {
      toast({ title: "Hata", description: "Ad ve YouTube URL / ID zorunludur", variant: "destructive" });
      return;
    }
    const cat = slugifyVideoTvCategory(category === "__custom__" ? customCategory : category);
    if (!cat) {
      toast({ title: "Hata", description: "Kategori zorunludur", variant: "destructive" });
      return;
    }
    createSource.mutate(
      {
        data: {
          name,
          platform,
          sourceType,
          channelId: sourceInput,
          url: rawInput.trim() || undefined,
          logoUrl: logoUrl || undefined,
          categorySlug: cat,
          isLive: sourceType === "live" ? true : isLive,
          useYoutubeApi: platform === "youtube" ? useYoutubeApi : undefined,
          active: true,
        },
      },
      {
        onSuccess: (created) => {
          const sync = created as {
            id?: number;
            sync?: { scheduled?: boolean; upserted?: number; warning?: string; error?: string };
            playlists?: { scheduled?: boolean; created?: number; warning?: string };
          };
          const detail = sync.sync?.scheduled
            ? "Video senkronu arka planda başladı"
            : [
                sync.sync?.upserted != null ? `${sync.sync.upserted} video` : null,
                sync.playlists?.created != null ? `${sync.playlists.created} playlist` : null,
                sync.sync?.warning || sync.playlists?.warning || sync.sync?.error || null,
              ]
                .filter(Boolean)
                .join(" · ");
          const addedLive = sourceType === "live" || isLive;
          if (addedLive && sync.id != null) {
            toast({
              title: "Canlı yayın eklendi",
              description: `${detail ? `${detail} · ` : ""}/canlitv/kanal/${sync.id} adresinde listelendi`,
            });
          } else {
            toast({ title: "Kaynak eklendi", description: detail || undefined });
          }
          invalidate();
          setName("");
          setChannelId("");
          setRawInput("");
          setLogoUrl("");
          setCustomCategory("");
          setCategory(cat);
        },
        onError: (err: unknown) => {
          toast({
            title: "Hata",
            description: (err instanceof Error ? err.message : String(err)).slice(0, 220),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteSource.mutate({ id }, { onSuccess: invalidate });
  };

  const handleToggle = (id: number) => {
    toggleSource.mutate({ id }, { onSuccess: invalidate });
  };

  const handleUpdateSource = async (id: number, sourceType: string) => {
    setSyncingId(id);
    try {
      const useApi = syncUseApi[id] ?? true;
      const r = await fetch(`/api/video/sources/${id}/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useYoutubeApi: useApi, async: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error || "Güncelleme başarısız");
      if (sourceType === "channel") {
        void fetch(`/api/video/sources/${id}/sync-playlists`, {
          method: "POST",
          credentials: "include",
        });
      }
      toast({
        title: "Güncelleme başlatıldı",
        description:
          j.message ||
          (useApi
            ? "YouTube API ile videolar çekiliyor; hata olursa RSS/kazıma yedeği devreye girer. Playlistler de arka planda içe aktarılıyor — 1-2 dk sonra yenileyin."
            : "Kazıma ile eksik videolar tamamlanıyor"),
      });
      invalidate();
    } catch (e) {
      toast({
        title: "Güncelleme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncPlaylists = async (id: number) => {
    setSyncingId(id);
    try {
      const r = await fetch(`/api/video/sources/${id}/sync-playlists`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; scheduled?: boolean; message?: string };
      if (!r.ok) throw new Error(j.error || "Playlist senkron başarısız");
      toast({
        title: "Playlist güncelleme başlatıldı",
        description: j.message || "Playlist kaynakları arka planda içe aktarılıyor",
      });
      invalidate();
    } catch {
      toast({ title: "Playlist senkron başarısız", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const handleAddPreset = (preset: { name: string; channelId: string; category: string; logoUrl?: string | null }) => {
    createSource.mutate(
      {
        data: {
          name: preset.name,
          platform: "youtube",
          sourceType: "channel",
          channelId: preset.channelId,
          logoUrl: preset.logoUrl,
          categorySlug: slugifyVideoTvCategory(preset.category) || preset.category,
          isLive: false,
          useYoutubeApi: true,
          active: true,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `${preset.name} eklendi`,
            description: "Video ve oynatma listesi senkronu arka planda başladı — 1-2 dk sonra kontrol edin",
          });
          invalidate();
        },
      },
    );
  };

  const handleResyncPreset = (sourceId: number, name: string) => {
    toast({ title: `${name} güncelleniyor`, description: "Videolar ve playlistler arka planda çekiliyor" });
    void handleUpdateSource(sourceId, "channel");
  };

  const presetCategories = useMemo(() => {
    const slugs = [...new Set(presets?.map((p) => slugifyVideoTvCategory(p.category) || p.category) ?? [])].sort(
      (a, b) => (VIDEO_TV_CATEGORY_LABELS[a] || a).localeCompare(VIDEO_TV_CATEGORY_LABELS[b] || b, "tr"),
    );
    return slugs;
  }, [presets]);

  const handleBulkAddPresets = async (category?: string) => {
    setBulkAddingPresets(true);
    try {
      const r = await fetch("/api/video/presets/bulk-add", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category ?? (presetCat === PRESET_ALL ? undefined : presetCat) }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        added?: number;
        skipped?: number;
      };
      if (!r.ok) throw new Error(j.error || "Toplu ekleme başarısız");
      toast({
        title: j.added ? `${j.added} kaynak eklendi` : "Kaynak eklenmedi",
        description: j.message || (j.skipped ? `${j.skipped} zaten vardı` : undefined),
      });
      invalidate();
    } catch (e) {
      toast({
        title: "Toplu ekleme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBulkAddingPresets(false);
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
          j.embedAudited ? `${j.embedAudited} ek video embed denetiminde gizlendi` : null,
          j.reclassifiedPodcasts ? `${j.reclassifiedPodcasts} sesli günlük → playlist` : null,
          "Kapak backfill arka planda",
        ]
          .filter(Boolean)
          .join(" · "),
      });
      invalidate();
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

  const handleImportTopChannels = async () => {
    setImportTopRunning(true);
    try {
      const r = await fetch("/api/video/import-top-channels", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          async: true,
          perCategory: 10,
          category: presetCat === PRESET_ALL ? undefined : presetCat,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error || "Top kanal içe aktarma başarısız");
      toast({
        title: "Top kanallar ekleniyor",
        description:
          j.message ||
          "Her kategoriden top kanallar ekleniyor; videolar, playlistler, sesli günlük ve Yekçek arka planda çekiliyor.",
      });
      invalidate();
    } catch (e) {
      toast({
        title: "Top kanal ekleme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setImportTopRunning(false);
    }
  };

  const handleSyncShorts = async () => {
    setSyncShortsRunning(true);
    try {
      const r = await fetch("/api/video/sync-shorts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ async: true }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        scheduled?: boolean;
      };
      if (!r.ok) throw new Error(j.error || "Yekçek çekimi başarısız");
      toast({
        title: j.scheduled === false ? "Yekçek güncellemesi zaten çalışıyor" : "Hit Yekçek çekimi başlatıldı",
        description:
          j.message ||
          "Tüm kanalların kısa video sekmesi ve popüler akış taranıyor — birkaç dakika sonra /yektube/yekcek adresini kontrol edin.",
      });
      invalidate();
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
            ? `${j.sourceCount} kanal ve playlist arka planda güncelleniyor — birkaç dakika sonra yenileyin.`
            : "Tüm kaynaklar arka planda senkronlanıyor"),
      });
      invalidate();
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

  const handleCleanup = async (dryRun = false) => {
    if (
      !dryRun &&
      !window.confirm(
        "Hatalı kanallar, pasif videolar ve gizlenen playlist/kaynaklar kalıcı olarak silinecek. Devam edilsin mi?",
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
        body: JSON.stringify({ dryRun }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        dryRun?: boolean;
        deletedVideos?: number;
        deletedSources?: number;
        details?: Record<string, number>;
      };
      if (!r.ok) throw new Error(j.error || "Temizleme başarısız");
      const d = j.details;
      const detailText = d
        ? [
            j.deletedSources != null ? `${j.deletedSources} kaynak` : null,
            j.deletedVideos != null ? `${j.deletedVideos} video` : null,
            d.inactiveVideos ? `${d.inactiveVideos} pasif video` : null,
            d.duplicateVideos ? `${d.duplicateVideos} çift video` : null,
            d.duplicateChannels ? `${d.duplicateChannels} çift kanal` : null,
            d.obsoleteChannelIds ? `${d.obsoleteChannelIds} hatalı ID` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined;
      toast({
        title: j.dryRun ? "Temizlik önizlemesi" : "Veritabanı temizlendi",
        description: detailText || undefined,
      });
      if (!dryRun) invalidate();
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

  const filteredPresets = presets?.filter(
    (p) => presetCat === PRESET_ALL || slugifyVideoTvCategory(p.category) === presetCat || p.category === presetCat,
  );
  const visiblePresets = showAllPresets
    ? filteredPresets
    : filteredPresets?.slice(0, 12);

  const channelSourcesAll = useMemo(
    () => sources?.filter((s) => isChannelSourceType(s.sourceType)) ?? [],
    [sources],
  );
  const listSourcesAll = useMemo(
    () => sources?.filter((s) => isListSourceType(s.sourceType)) ?? [],
    [sources],
  );
  const channelSources = useMemo(
    () => channelSourcesAll.filter((s) => matchesSourceSearch(s.name, sourceSearch)),
    [channelSourcesAll, sourceSearch],
  );
  const listSources = useMemo(
    () => listSourcesAll.filter((s) => matchesSourceSearch(s.name, sourceSearch)),
    [listSourcesAll, sourceSearch],
  );

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of VIDEO_TV_ADMIN_CATEGORY_OPTIONS) map.set(c.value, c.label);
    for (const s of sources ?? []) {
      const slug = slugifyVideoTvCategory(s.categorySlug);
      if (!slug) continue;
      map.set(slug, VIDEO_TV_CATEGORY_LABELS[slug] || s.categorySlug);
    }
    if (category !== "__custom__") {
      const slug = slugifyVideoTvCategory(category);
      if (slug && !map.has(slug)) map.set(slug, VIDEO_TV_CATEGORY_LABELS[slug] || category);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [category, sources]);

  return (
    <AdminLayout title="Video TV">
      {/* Header strip */}
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md flex justify-between items-center mb-6">
        <div>
          <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">
            VIDEO TV
          </div>
          <h1 className="text-2xl font-bold">Video TV — Yönetim</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-violet-500 text-violet-200 hover:bg-violet-900/40 hover:text-white"
            disabled={syncShortsRunning || syncAllRunning || cleanupRunning}
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
            disabled={syncAllRunning || cleanupRunning}
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
            disabled={cleanupRunning}
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
            disabled={cleanupRunning}
            onClick={() => void handleCleanup(false)}
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

      <Tabs defaultValue="kanallar" className="w-full">
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 mb-6 space-x-6">
          {[
            { value: "kanallar", label: "Kanallar" },
            { value: "playlistler", label: "Oynatma Listeleri" },
            { value: "ekle", label: "Kaynak Ekle" },
            { value: "hazir", label: "Hazır Kaynaklar" },
            { value: "ayarlar", label: "Ayarlar" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none py-3 px-1 text-base"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Kanallar Tab ── */}
        <TabsContent value="kanallar">
          <VideoSourcesTablePanel
            title="Kanallar"
            count={channelSourcesAll.length}
            sources={channelSources}
            loading={sourcesLoading}
            search={sourceSearch}
            onSearchChange={setSourceSearch}
            searchPlaceholder="Kanallarda ara..."
            emptyIcon={<MonitorPlay className="w-8 h-8 text-gray-400 mb-3" />}
            emptyTitle={sourceSearch ? "Sonuç bulunamadı" : "Henüz kanal eklenmemiş"}
            emptyHint={sourceSearch ? "Arama terimini değiştirin" : '"Kaynak Ekle" sekmesinden kanal ekleyin'}
            showPlaylistImport
            syncUseApi={syncUseApi}
            setSyncUseApi={setSyncUseApi}
            syncingId={syncingId}
            onToggle={handleToggle}
            onUpdate={handleUpdateSource}
            onSyncPlaylists={handleSyncPlaylists}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* ── Oynatma Listeleri Tab ── */}
        <TabsContent value="playlistler">
          <VideoSourcesTablePanel
            title="Oynatma Listeleri"
            count={listSourcesAll.length}
            sources={listSources}
            loading={sourcesLoading}
            search={sourceSearch}
            onSearchChange={setSourceSearch}
            searchPlaceholder="Oynatma listelerinde ara..."
            emptyIcon={<ListVideo className="w-8 h-8 text-gray-400 mb-3" />}
            emptyTitle={sourceSearch ? "Sonuç bulunamadı" : "Henüz oynatma listesi eklenmemiş"}
            emptyHint={
              sourceSearch
                ? "Arama terimini değiştirin"
                : 'Kanallarda "Listeler" ile içe aktarın veya "Kaynak Ekle"den playlist ekleyin'
            }
            showPlaylistImport={false}
            syncUseApi={syncUseApi}
            setSyncUseApi={setSyncUseApi}
            syncingId={syncingId}
            onToggle={handleToggle}
            onUpdate={handleUpdateSource}
            onSyncPlaylists={handleSyncPlaylists}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* ── Kaynak Ekle Tab ── */}
        <TabsContent value="ekle">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source type selector */}
            <div className="space-y-5">
              <div className="bg-white rounded-md shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Yeni Kaynak Ekle
                </h3>

                {/* Platform */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                    Platform
                  </Label>
                  <div className="flex gap-2">
                    {(["youtube", "dailymotion"] as Platform[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`flex-1 py-2 rounded-md text-sm font-bold border transition-colors ${
                          platform === p
                            ? "bg-[#e61e25] text-white border-[#e61e25]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {p === "youtube" ? "YouTube" : "Dailymotion"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source type */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                    Kaynak Türü
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSourceType(opt.value);
                          if (opt.value === "live") setIsLive(true);
                        }}
                        className={`flex items-center gap-2 p-3 rounded-md border text-sm font-medium transition-colors ${
                          sourceType === opt.value
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {
                      SOURCE_TYPE_OPTIONS.find((o) => o.value === sourceType)
                        ?.hint
                    }
                  </p>
                </div>

                {/* URL input + Fill */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                    YouTube URL / Handle / ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://youtube.com/... veya ID"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100 shrink-0"
                      onClick={handleFill}
                      disabled={!rawInput}
                    >
                      Doldur
                    </Button>
                  </div>
                </div>

                {/* Extracted ID */}
                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                    {sourceType === "playlist"
                      ? "Playlist ID"
                      : sourceType === "video"
                        ? "Video ID"
                        : "Kanal ID"}
                  </Label>
                  <Input
                    placeholder="Otomatik doldurulur veya elle girin"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="mb-4">
                  <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                    Ad / Başlık
                  </Label>
                  <Input
                    placeholder="Örn: NTV Haber Kanalı"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                      Logo URL (isteğe bağlı)
                    </Label>
                    <Input
                      placeholder="https://..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">
                      Kategori
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">Özel kategori…</SelectItem>
                      </SelectContent>
                    </Select>
                    {category === "__custom__" ? (
                      <Input
                        className="mt-2"
                        placeholder="örn. belgesel"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                      />
                    ) : null}
                  </div>
                </div>

                {sourceType !== "live" && (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50 mb-4">
                    <div>
                      <div className="font-medium text-sm">Canlı Yayın</div>
                      <div className="text-xs text-gray-500">
                        Bu kaynak 7/24 canlı mı?
                      </div>
                    </div>
                    <Switch checked={isLive} onCheckedChange={setIsLive} />
                  </div>
                )}

                {platform === "youtube" && (sourceType === "channel" || sourceType === "live") && (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-red-50/60 mb-4">
                    <div>
                      <div className="font-medium text-sm">YouTube Data API</div>
                      <div className="text-xs text-gray-500">
                        {hasYoutubeApiKey
                          ? useYoutubeApi
                            ? "Tüm videolar, playlistler ve sesli günlük API ile çekilir."
                            : "Kapalı — RSS + HTML kazıma (en fazla 50 video)."
                          : "API anahtarı tanımlı değil. Genel Ayarlar → Entegrasyonlar'dan ekleyin."}
                      </div>
                    </div>
                    <Switch
                      checked={useYoutubeApi}
                      onCheckedChange={setUseYoutubeApi}
                      disabled={!hasYoutubeApiKey}
                    />
                  </div>
                )}

                <Button
                  className="w-full bg-[#e61e25] hover:bg-[#c9181e] text-white"
                  onClick={handleAdd}
                  disabled={createSource.isPending || !name || !(channelId || rawInput).trim()}
                >
                  {createSource.isPending ? "Ekleniyor..." : "Kaynağı Ekle"}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div>
              <div className="bg-white rounded-md shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4">Önizleme</h3>
                {channelId ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      src={(() => {
                        if (sourceType === "video")
                          return `https://www.youtube-nocookie.com/embed/${channelId}`;
                        if (sourceType === "playlist")
                          return `https://www.youtube-nocookie.com/embed?listType=playlist&list=${channelId}`;
                        if (sourceType === "live")
                          return `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}`;
                        return `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${channelId}`;
                      })()}
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-col gap-2">
                    <MonitorPlay className="w-10 h-10" />
                    <p className="text-sm">ID girince önizleme görünür</p>
                  </div>
                )}

                {name && (
                  <div className="mt-4 p-3 bg-zinc-900 rounded-lg text-white flex items-center justify-between">
                    <span className="font-bold">{name}</span>
                    <SourceTypeBadge type={sourceType} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Hazır Kaynaklar Tab ── */}
        <TabsContent value="hazir">
          <div className="bg-white rounded-md shadow-sm border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-lg">
                Hazır YouTube Kaynakları{" "}
                <span className="text-gray-500 font-normal">({presets?.length || 0})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#e61e25] hover:bg-[#c91920] text-white"
                  disabled={importTopRunning || bulkAddingPresets}
                  onClick={() => void handleImportTopChannels()}
                >
                  {importTopRunning ? "Keşfediliyor…" : "Top Kanalları Ekle (API)"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bulkAddingPresets || importTopRunning}
                  onClick={() => void handleBulkAddPresets(presetCat === PRESET_ALL ? undefined : presetCat)}
                >
                  {bulkAddingPresets ? "Ekleniyor…" : presetCat === PRESET_ALL ? "Tümünü ekle" : "Kategoridekileri ekle"}
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              YouTube kategorilerine göre en çok abonesi olan kanalları API ile keşfedip ekleyin. Her kanal için
              videolar, oynatma listeleri, sesli günlük ve Yekçek otomatik senkronlanır.
            </p>

            <div className="flex gap-2 flex-wrap mb-6">
              <button
                type="button"
                onClick={() => setPresetCat(PRESET_ALL)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  presetCat === PRESET_ALL
                    ? "bg-[#e61e25] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tümü
              </button>
              {presetCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    presetCat === cat
                      ? "bg-[#e61e25] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {VIDEO_TV_CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visiblePresets?.map((preset, idx) => {
                const existing = sources?.find(
                  (s) => s.channelId === preset.channelId && isChannelSourceType(s.sourceType),
                );
                const alreadyAdded = Boolean(existing);
                const emptyChannel = alreadyAdded && (existing?.videoCount ?? 0) === 0;
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 text-center transition-colors ${
                      emptyChannel
                        ? "bg-amber-50 border-amber-300 hover:border-amber-500 cursor-pointer"
                        : alreadyAdded
                          ? "bg-green-50 border-green-200"
                          : "bg-white hover:border-red-300 cursor-pointer"
                    }`}
                    onClick={() => {
                      if (emptyChannel && existing) {
                        handleResyncPreset(existing.id, preset.name);
                      } else if (!alreadyAdded) {
                        handleAddPreset(preset);
                      }
                    }}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center overflow-hidden">
                      {preset.logoUrl ? (
                        <img
                          src={preset.logoUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlaySquare className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="font-medium text-sm truncate">{preset.name}</div>
                    <div className="text-xs text-gray-500">
                      {VIDEO_TV_CATEGORY_LABELS[slugifyVideoTvCategory(preset.category)] || preset.category}
                    </div>
                    {emptyChannel ? (
                      <div className="text-xs text-amber-700 font-bold mt-1">Boş — Güncelle</div>
                    ) : alreadyAdded ? (
                      <div className="text-xs text-green-600 font-bold mt-1">Eklendi</div>
                    ) : (
                      <button type="button" className="text-xs text-[#e61e25] font-bold mt-1 hover:underline">
                        + Ekle
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredPresets && filteredPresets.length > 12 && (
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllPresets(!showAllPresets)}
                  className="gap-1"
                >
                  {showAllPresets ? (
                    <>
                      Daha az göster <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Tümünü göster ({filteredPresets.length}){" "}
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Ayarlar Tab ── */}
        <TabsContent value="ayarlar">
          <VideoTvAyarlarPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kaynak düzenle — {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500">Ad</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500">Kanal / Playlist / Video ID</Label>
                <Input value={editChannelId} onChange={(e) => setEditChannelId(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500">URL</Label>
                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500">Logo URL</Label>
                <Input value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-gray-500">Kategori</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_TV_ADMIN_CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing.platform === "youtube" ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">YouTube Data API</p>
                    <p className="text-xs text-gray-500">Güncellemede API veya kazıma seçimi</p>
                  </div>
                  <Switch checked={editUseApi} onCheckedChange={setEditUseApi} />
                </div>
              ) : null}
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Videolar ({editVideos.length})</p>
                {editVideosLoading ? (
                  <p className="text-sm text-gray-400">Yükleniyor…</p>
                ) : editVideos.length === 0 ? (
                  <p className="text-sm text-gray-400">Henüz video yok — Güncelle ile çekin.</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-2">
                    {editVideos.map((v, i) => (
                      <div key={v.id} className="flex gap-2">
                        <Input
                          value={v.title}
                          onChange={(e) => {
                            const t = e.target.value;
                            setEditVideos((prev) => prev.map((x, j) => (j === i ? { ...x, title: t } : x)));
                          }}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              İptal
            </Button>
            <Button onClick={() => void saveEdit()} disabled={editSaving}>
              {editSaving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

/* ═══════════════════════════════════════════════════
   VIDEO TV AYARLAR PANELİ
   ═══════════════════════════════════════════════════ */
const VTV_SETTINGS_KEY = "vtv_settings";
const defaultVtvSettings = {
  siteTitle: "Video TV",
  popularLimit: 6,
  categoryLimit: 8,
  featuredLimit: 4,
  bannerVideoUrl: "",
  autoAddChannels: false,
};
type VtvSettings = typeof defaultVtvSettings;

function loadVtvSettings(): VtvSettings {
  try {
    const raw = localStorage.getItem(VTV_SETTINGS_KEY);
    if (raw) return { ...defaultVtvSettings, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultVtvSettings };
}

function VideoTvAyarlarPanel() {
  const { toast } = useToast();
  const [s, setS] = useState<VtvSettings>(loadVtvSettings);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof VtvSettings>(key: K, val: VtvSettings[K]) {
    setS((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(VTV_SETTINGS_KEY, JSON.stringify(s));
    setSaved(true);
    toast({ title: "Video TV ayarları kaydedildi" });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-md shadow-sm border p-6">
        <h3 className="font-bold text-lg mb-1">Genel Ayarlar</h3>
        <p className="text-gray-500 text-sm mb-6">Video TV modülünün genel görünüm ve davranış ayarları</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Site Başlığı */}
          <div>
            <Label className="mb-1 block">Site Başlığı</Label>
            <Input value={s.siteTitle} onChange={e => update("siteTitle", e.target.value)}
              placeholder="Video TV" />
            <p className="text-xs text-gray-400 mt-1">Video TV sayfasının üst başlığı</p>
          </div>

          {/* Banner Video URL */}
          <div>
            <Label className="mb-1 block">Banner Video URL (isteğe bağlı)</Label>
            <Input value={s.bannerVideoUrl} onChange={e => update("bannerVideoUrl", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." />
            <p className="text-xs text-gray-400 mt-1">Ana sayfada üstte oynatılacak YouTube videosu</p>
          </div>

          {/* Popüler Kanal Limiti */}
          <div>
            <Label className="mb-1 block">Popüler Kanal Limiti</Label>
            <Input type="number" min={1} max={20}
              value={s.popularLimit}
              onChange={e => update("popularLimit", Number(e.target.value))}
            />
            <p className="text-xs text-gray-400 mt-1">Ana sayfada gösterilecek maksimum popüler kanal sayısı</p>
          </div>

          {/* Kategori Limiti */}
          <div>
            <Label className="mb-1 block">Kategori Limiti</Label>
            <Input type="number" min={1} max={20}
              value={s.categoryLimit}
              onChange={e => update("categoryLimit", Number(e.target.value))}
            />
            <p className="text-xs text-gray-400 mt-1">Sidebar'da gösterilecek maksimum kategori sayısı</p>
          </div>

          {/* Öne Çıkan Limiti */}
          <div>
            <Label className="mb-1 block">Öne Çıkan Limiti</Label>
            <Input type="number" min={1} max={20}
              value={s.featuredLimit}
              onChange={e => update("featuredLimit", Number(e.target.value))}
            />
            <p className="text-xs text-gray-400 mt-1">Öne çıkanlar sekmesinde gösterilecek kanal sayısı</p>
          </div>
        </div>
      </div>

      {/* Otomatik Kanal Ekleme */}
      <div className="bg-white rounded-md shadow-sm border p-6">
        <h3 className="font-bold text-base mb-1">Otomatik Kanal Ekleme</h3>
        <p className="text-gray-500 text-sm mb-4">
          RSS ve Haber Botu çalıştığında otomatik olarak yeni kanallar eklensin mi?
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={s.autoAddChannels}
            onCheckedChange={val => update("autoAddChannels", val)}
          />
          <span className="text-sm font-medium">
            {s.autoAddChannels ? "Aktif — yeni kanallar otomatik eklenir" : "Kapalı — kanallar manuel eklenir"}
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          className="bg-[#e61e25] hover:bg-[#c9181e] text-white px-8"
          onClick={handleSave}
        >
          Ayarları Kaydet
        </Button>
        {saved && (
          <span className="text-green-600 text-sm font-medium flex items-center gap-1">
            ✓ Kaydedildi
          </span>
        )}
      </div>
    </div>
  );
}

type VideoSourcesTablePanelProps = {
  title: string;
  count: number;
  sources: AdminSource[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyHint: string;
  showPlaylistImport: boolean;
  syncUseApi: Record<number, boolean>;
  setSyncUseApi: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  syncingId: number | null;
  onToggle: (id: number) => void;
  onUpdate: (id: number, sourceType: string) => void;
  onSyncPlaylists: (id: number) => void;
  onEdit: (source: AdminSource) => void | Promise<void>;
  onDelete: (id: number) => void;
};

function VideoSourcesTablePanel({
  title,
  count,
  sources,
  loading,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyIcon,
  emptyTitle,
  emptyHint,
  showPlaylistImport,
  syncUseApi,
  setSyncUseApi,
  syncingId,
  onToggle,
  onUpdate,
  onSyncPlaylists,
  onEdit,
  onDelete,
}: VideoSourcesTablePanelProps) {
  return (
    <div className="bg-white rounded-md shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">
          {title}{" "}
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-sm ml-2">
            {count}
          </span>
        </h3>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Yükleniyor...</div>
      ) : sources.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center">
          {emptyIcon}
          <h4 className="font-medium text-gray-900 mb-1">{emptyTitle}</h4>
          <p className="text-sm text-gray-500">{emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b">
                <th className="pb-3 pl-2">Ad</th>
                <th className="pb-3">Tür</th>
                <th className="pb-3">Platform</th>
                <th className="pb-3">Kategori</th>
                <th className="pb-3">ID</th>
                <th className="pb-3">Durum</th>
                <th className="pb-3 w-40">Güncelle</th>
                <th className="pb-3 text-right pr-2">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pl-2 font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {source.logoUrl ? (
                        <img
                          src={source.logoUrl}
                          alt={source.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-500">
                          {source.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {source.name}
                  </td>
                  <td className="py-3">
                    <SourceTypeBadge type={source.sourceType} />
                  </td>
                  <td className="py-3 capitalize text-gray-600">{source.platform}</td>
                  <td className="py-3 text-gray-600">{source.categorySlug}</td>
                  <td className="py-3 font-mono text-xs text-gray-500 max-w-[140px] truncate">
                    {source.channelId}
                  </td>
                  <td className="py-3">
                    <Switch checked={source.active} onCheckedChange={() => onToggle(source.id)} />
                  </td>
                  <td className="py-3">
                    {source.sourceType !== "live" && !source.isLive ? (
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={syncUseApi[source.id] ?? true}
                            onCheckedChange={(v) =>
                              setSyncUseApi((prev) => ({ ...prev, [source.id]: v }))
                            }
                            aria-label="YouTube API"
                          />
                          <span className="text-[10px] font-bold uppercase text-gray-500 whitespace-nowrap">
                            {syncUseApi[source.id] ?? true ? "API" : "Kazıma"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={syncingId === source.id}
                          onClick={() => onUpdate(source.id, source.sourceType)}
                          title="Eksik videoları tamamla"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${syncingId === source.id ? "animate-spin" : ""}`}
                          />
                          Güncelle
                        </Button>
                        {showPlaylistImport &&
                        source.platform === "youtube" &&
                        source.sourceType === "channel" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            disabled={syncingId === source.id}
                            onClick={() => onSyncPlaylists(source.id)}
                            title="Playlistleri içe aktar"
                          >
                            <ListVideo className="w-3.5 h-3.5" />
                            Listeler
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Canlı TV</span>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-600 hover:text-zinc-900"
                        onClick={() => void onEdit(source)}
                        title="Düzenle"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourceTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; class: string }> = {
    channel: { label: "Kanal", class: "bg-blue-100 text-blue-700" },
    playlist: { label: "Playlist", class: "bg-purple-100 text-purple-700" },
    podcast: { label: "Sesli Günlük", class: "bg-emerald-100 text-emerald-700" },
    video: { label: "Video", class: "bg-orange-100 text-orange-700" },
    live: { label: "Canlı", class: "bg-red-100 text-red-700" },
  };
  const info = map[type] ?? { label: type, class: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${info.class}`}>
      {info.label}
    </span>
  );
}
