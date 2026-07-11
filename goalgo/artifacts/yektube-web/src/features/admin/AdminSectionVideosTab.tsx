import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { YektubeVideo } from "@workspace/yektube-core";
import { fetchVideos } from "@/lib/api";
import { adminDeleteVideo, adminPatchVideo } from "@/lib/adminApi";
import { videoThumbUrl, categoryLabel } from "@/lib/constants";
import { filterVideosByKidsCategory } from "@/lib/kidsFilter";
import { filterVideosByMood } from "@/lib/musicFilter";
import { useAdminCategoryOptions } from "./useAdminCategoryOptions";
import { AdminAlert, AdminBtn, AdminCard, AdminInput, AdminSelect } from "./ui/adminUi";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";

type SectionKind = "yektube" | "muzik" | "cocuk";

const MUZIK_SLUGS = new Set(["muzik", "müzik", "music"]);
const COCUK_SLUGS = new Set(["cocuk", "çocuk", "kids"]);

function sectionMatch(section: SectionKind, slug: string | null | undefined): boolean {
  const s = slug?.trim().toLowerCase() ?? "";
  const muzik = MUZIK_SLUGS.has(s);
  const cocuk = COCUK_SLUGS.has(s);
  if (section === "muzik") return muzik;
  if (section === "cocuk") return cocuk;
  return !muzik && !cocuk;
}

export function AdminSectionVideosTab({ section }: { section: SectionKind }) {
  const qc = useQueryClient();
  const categoryOptions = useAdminCategoryOptions();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [msg, setMsg] = useState("");

  const baseCategory =
    section === "muzik" ? "muzik" : section === "cocuk" ? "cocuk" : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-section-videos", section, q, baseCategory],
    queryFn: () =>
      fetchVideos({
        limit: 60,
        excludeStories: false,
        enrichTitles: true,
        search: q.trim() || undefined,
        categorySlug: baseCategory,
      }),
  });

  const videos = useMemo(() => {
    let list = (data?.items ?? []).filter((v) => sectionMatch(section, v.categorySlug));
    if (section === "yektube" && categoryFilter !== "all") {
      list = list.filter((v) => (v.categorySlug ?? "").toLowerCase() === categoryFilter);
    }
    if (section === "muzik" && subFilter !== "all") {
      list = filterVideosByMood(list, subFilter);
    }
    if (section === "cocuk" && subFilter !== "all") {
      list = filterVideosByKidsCategory(list, subFilter);
    }
    return list;
  }, [data?.items, section, categoryFilter, subFilter]);

  const patch = async (id: number, body: Parameters<typeof adminPatchVideo>[1]) => {
    try {
      await adminPatchVideo(id, body);
      await qc.invalidateQueries({ queryKey: ["admin-section-videos"] });
      setMsg("Güncellendi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    }
  };

  return (
    <div className="space-y-4">
      {msg ? <AdminAlert tone="success">{msg}</AdminAlert> : null}
      <AdminCard title="Video ara ve filtrele">
        <div className="flex flex-wrap gap-2">
          <AdminInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Başlık, kanal veya video ID…"
            className="min-w-[200px] flex-1"
          />
          {section === "yektube" ? (
            <AdminSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
              <option value="all">Tüm kategoriler</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </AdminSelect>
          ) : null}
          {section === "muzik" ? (
            <AdminSelect value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-44">
              <option value="all">Tüm türler</option>
              <option value="pop">Pop</option>
              <option value="enerji">Enerji</option>
              <option value="rahatlama">Rahatlama</option>
              <option value="romantik">Romantik</option>
              <option value="rap">Rap</option>
              <option value="rock">Rock</option>
            </AdminSelect>
          ) : null}
          {section === "cocuk" ? (
            <AdminSelect value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-44">
              <option value="all">Tümü</option>
              <option value="muzik">Müzik</option>
              <option value="kesfet">Keşfet</option>
              <option value="ogrenme">Öğrenme</option>
              <option value="sovlar">Şovlar</option>
            </AdminSelect>
          ) : null}
        </div>
      </AdminCard>
      {isLoading ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <VideoRow key={v.id} video={v} onPatch={patch} onDelete={() => void adminDeleteVideo(v.id)} />
          ))}
          {videos.length === 0 ? <p className="text-sm text-zinc-500">Video bulunamadı.</p> : null}
        </div>
      )}
    </div>
  );
}

function VideoRow({
  video: v,
  onPatch,
  onDelete,
}: {
  video: YektubeVideo;
  onPatch: (id: number, body: Parameters<typeof adminPatchVideo>[1]) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <img
        src={videoThumbUrl(v.videoId, v.thumbnail, "mq")}
        alt=""
        className="aspect-video w-28 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-white">{v.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {v.channelName} · {categoryLabel(v.categorySlug ?? "—")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <AdminBtn variant="secondary" onClick={() => void onPatch(v.id, { isFeatured: !v.isFeatured })}>
            <Star className="h-3 w-3" />
            {v.isFeatured ? "Öne çıkan" : "Öne çıkar"}
          </AdminBtn>
          <AdminBtn variant="secondary" onClick={() => void onPatch(v.id, { active: !v.active })}>
            {v.active !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {v.active !== false ? "Yayında" : "Gizli"}
          </AdminBtn>
          <AdminBtn
            variant="danger"
            onClick={() => {
              if (confirm("Video silinsin mi?")) onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
            Sil
          </AdminBtn>
        </div>
      </div>
    </div>
  );
}
