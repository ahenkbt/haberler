import {
  HM_MEDIA_GALLERY_HOME_MODULE_IDS,
  HM_MEDIA_GALLERY_SOURCE_OPTIONS,
  hmMediaGallerySourceLabel,
  type HmMediaGalleryHomeModuleId,
  type HmMediaGallerySourceId,
  type HmNewsGalleryVideoTvRef,
} from "@/lib/hmMediaSpotlightPool";
import { resolveHmNewsHomeModuleGallerySource, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Props = {
  title: string;
  description: string;
  moduleLabels: Record<string, string>;
  layoutPrefs: Pick<
    NewsSiteLayoutPrefs,
    "hmNewsHomeModuleGallerySources" | "hmNewsHomeModuleGalleryVideoTvRefs" | "hmNewsGallerySpotlightMode"
  >;
  values: Partial<Record<HmMediaGalleryHomeModuleId, HmMediaGallerySourceId>>;
  videoTvRefs: Partial<Record<HmMediaGalleryHomeModuleId, HmNewsGalleryVideoTvRef>>;
  disabled?: boolean;
  onChange: (item: HmMediaGalleryHomeModuleId, sourceId: HmMediaGallerySourceId) => void;
  onVideoTvRefChange: (item: HmMediaGalleryHomeModuleId, patch: Partial<HmNewsGalleryVideoTvRef>) => void;
};

export function hmMediaGalleryBlockLabel(
  layoutPrefs: Pick<
    NewsSiteLayoutPrefs,
    "hmNewsHomeModuleGallerySources" | "hmNewsGallerySpotlightMode"
  >,
  moduleId: HmMediaGalleryHomeModuleId,
): string {
  const sourceId = resolveHmNewsHomeModuleGallerySource(layoutPrefs, moduleId);
  const galleryLabel = hmMediaGallerySourceLabel(sourceId);
  return moduleId === "mediaDarkBlock" ? `${galleryLabel} koyu blok` : `${galleryLabel} odak şeridi`;
}

export function HmModuleGallerySourceEditor({
  title,
  description,
  moduleLabels,
  layoutPrefs,
  values,
  videoTvRefs,
  disabled,
  onChange,
  onVideoTvRefChange,
}: Props) {
  const { data: videoSources = [] } = useQuery({
    queryKey: ["editor-video-tv-sources"],
    queryFn: () => apiRequest("/api/video/sources") as Promise<Array<{ id: number; name?: string; sourceType?: string }>>,
    staleTime: 60_000,
  });
  const channelSources = videoSources.filter((s) => {
    const t = String(s.sourceType ?? "").toLowerCase();
    return t === "channel" || t === "live" || t === "";
  });
  const playlistSources = videoSources.filter((s) => String(s.sourceType ?? "").toLowerCase() === "playlist");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <Label className="font-semibold text-slate-900">{title}</Label>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3">
        {HM_MEDIA_GALLERY_HOME_MODULE_IDS.map((item) => {
          const selected = values[item] ?? resolveHmNewsHomeModuleGallerySource(layoutPrefs, item);
          const galleryLabel = hmMediaGallerySourceLabel(selected);
          const tvRef = videoTvRefs[item] ?? {};
          return (
            <div key={item} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{galleryLabel}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{moduleLabels[item] ?? item}</p>
                </div>
                <Select
                  value={selected}
                  disabled={disabled}
                  onValueChange={(value) => onChange(item, value as HmMediaGallerySourceId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HM_MEDIA_GALLERY_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected === "video-tv" ? (
                <div className="grid gap-2 border-t border-slate-200/80 pt-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">Video TV kanalı</Label>
                    <Select
                      value={tvRef.channelSourceId ? String(tvRef.channelSourceId) : "__all"}
                      disabled={disabled}
                      onValueChange={(value) =>
                        onVideoTvRefChange(item, {
                          channelSourceId: value === "__all" ? null : Number(value),
                          playlistSourceId: null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tüm kanallar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tüm kanallar</SelectItem>
                        {channelSources.map((source) => (
                          <SelectItem key={source.id} value={String(source.id)}>
                            {source.name?.trim() || `Kanal #${source.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">Oynatma listesi</Label>
                    <Select
                      value={tvRef.playlistSourceId ? String(tvRef.playlistSourceId) : "__none"}
                      disabled={disabled}
                      onValueChange={(value) =>
                        onVideoTvRefChange(item, {
                          playlistSourceId: value === "__none" ? null : Number(value),
                          channelSourceId: value === "__none" ? tvRef.channelSourceId ?? null : null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçilmedi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Seçilmedi</SelectItem>
                        {playlistSources.map((source) => (
                          <SelectItem key={source.id} value={String(source.id)}>
                            {source.name?.trim() || `Liste #${source.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
              {selected === "video-galeri" ? (
                <div className="space-y-1.5 border-t border-slate-200/80 pt-3">
                  <Label className="text-xs text-slate-600">Video TV bağlantısı (isteğe bağlı)</Label>
                  <Input
                    value={tvRef.manualLink ?? ""}
                    disabled={disabled}
                    placeholder="/tr/slug/video-tv/... veya tam URL"
                    onChange={(e) => onVideoTvRefChange(item, { manualLink: e.target.value.trim() || null })}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
