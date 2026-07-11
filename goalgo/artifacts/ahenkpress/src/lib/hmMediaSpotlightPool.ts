import { apiRequest } from "@/lib/queryClient";
import { isLongFormVideo, isPlaceholderShortTitle, recommendationVideoTitle } from "@/lib/yektubeVideoClassify";

export type HmMediaSpotlightItem = {
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  categoryName: string;
  createdAt?: string | null;
  videoSourceId?: number | null;
};

export type HmNewsGalleryVideoTvRef = {
  channelSourceId?: number | null;
  playlistSourceId?: number | null;
  manualLink?: string | null;
};

export type HmNewsHomeModuleGalleryVideoTvRefs = Partial<Record<HmMediaGalleryHomeModuleId, HmNewsGalleryVideoTvRef>>;

export const HM_MEDIA_GALLERY_SOURCE_OPTIONS = [
  { id: "mixed", label: "Karma (Video TV öncelikli)" },
  { id: "foto-galeri", label: "Foto Galeri" },
  { id: "video-galeri", label: "Video Galeri" },
  { id: "video-tv", label: "Video TV" },
] as const;

export type HmMediaGallerySourceId = (typeof HM_MEDIA_GALLERY_SOURCE_OPTIONS)[number]["id"];

/** Editör JSON anahtarı: `hmNewsGallerySpotlightMode` */
export type HmNewsGallerySpotlightMode = "mixed" | "videoTv" | "photoGallery" | "videoGallery";

const HM_GALLERY_SPOTLIGHT_MODE_TO_SOURCE: Record<HmNewsGallerySpotlightMode, HmMediaGallerySourceId> = {
  mixed: "mixed",
  videoTv: "video-tv",
  photoGallery: "foto-galeri",
  videoGallery: "video-galeri",
};

export function hmGallerySpotlightModeToSourceId(
  mode: HmNewsGallerySpotlightMode | null | undefined,
): HmMediaGallerySourceId | null {
  if (!mode) return null;
  return HM_GALLERY_SPOTLIGHT_MODE_TO_SOURCE[mode] ?? null;
}

export function hmGallerySourceIdToSpotlightMode(sourceId: HmMediaGallerySourceId): HmNewsGallerySpotlightMode {
  if (sourceId === "mixed") return "mixed";
  if (sourceId === "video-tv") return "videoTv";
  if (sourceId === "foto-galeri") return "photoGallery";
  return "videoGallery";
}

const HM_MEDIA_SPOTLIGHT_CATEGORY_PRIORITY: Record<string, number> = {
  "Video TV": 0,
  "Video Galeri": 1,
  "Foto Galeri": 2,
};

export function sortHmMediaSpotlightMixed(items: HmMediaSpotlightItem[]): HmMediaSpotlightItem[] {
  return [...items].sort((a, b) => {
    const pa = HM_MEDIA_SPOTLIGHT_CATEGORY_PRIORITY[String(a.categoryName ?? "").trim()] ?? 99;
    const pb = HM_MEDIA_SPOTLIGHT_CATEGORY_PRIORITY[String(b.categoryName ?? "").trim()] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
}

export const HM_MEDIA_GALLERY_HOME_MODULE_IDS = ["mediaDarkBlock", "agencyDarkSpotlight"] as const;

export type HmMediaGalleryHomeModuleId = (typeof HM_MEDIA_GALLERY_HOME_MODULE_IDS)[number];

export function normalizeHmMediaGallerySourceId(value: unknown): HmMediaGallerySourceId | null {
  const raw = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "-");
  if (raw === "foto-galeri" || raw === "foto" || raw === "fotogaleri") return "foto-galeri";
  if (raw === "video-galeri" || raw === "videogaleri" || raw === "video_galeri") return "video-galeri";
  if (raw === "video-tv" || raw === "videotv" || raw === "video_tv" || raw === "yektube") return "video-tv";
  if (raw === "mixed" || raw === "karma" || raw === "all") return "mixed";
  return null;
}

export function normalizeHmNewsGallerySpotlightMode(value: unknown): HmNewsGallerySpotlightMode | null {
  const raw = String(value ?? "")
    .trim()
    .replace(/[-_\s]+/g, "");
  if (!raw) return null;
  if (raw === "mixed" || raw === "karma" || raw === "all") return "mixed";
  if (raw === "videotv" || raw === "videoTv") return "videoTv";
  if (raw === "photogallery" || raw === "photoGallery" || raw === "fotogaleri") return "photoGallery";
  if (raw === "videogallery" || raw === "videoGallery") return "videoGallery";
  return null;
}

export function hmMediaGallerySourceLabel(sourceId: HmMediaGallerySourceId): string {
  if (sourceId === "mixed") return "Video / Galeri";
  return HM_MEDIA_GALLERY_SOURCE_OPTIONS.find((option) => option.id === sourceId)?.label ?? "Video TV";
}

export function hmMediaGallerySourceListHref(
  sourceId: HmMediaGallerySourceId,
  h: (path: string) => string,
  videoTvHref: string,
): string {
  if (sourceId === "foto-galeri") return h("/foto-galeri");
  if (sourceId === "video-galeri") return h("/yektube");
  if (sourceId === "mixed") return videoTvHref;
  return videoTvHref;
}

export function filterHmMediaSpotlightByGallerySource(
  items: HmMediaSpotlightItem[],
  sourceId: HmMediaGallerySourceId | null | undefined,
): HmMediaSpotlightItem[] {
  if (!sourceId || sourceId === "mixed") return sortHmMediaSpotlightMixed(items);
  const label = hmMediaGallerySourceLabel(sourceId);
  return items.filter((item) => String(item.categoryName ?? "").trim() === label);
}

export function applyHmGallerySpotlightForModule(
  items: HmMediaSpotlightItem[],
  sourceId: HmMediaGallerySourceId,
  ref: HmNewsGalleryVideoTvRef | null | undefined,
): HmMediaSpotlightItem[] {
  let filtered = filterHmMediaSpotlightByGallerySource(items, sourceId);
  if (sourceId === "video-tv") {
    filtered = applyHmGalleryVideoTvRefFilter(filtered, ref);
  } else if (sourceId === "video-galeri" && ref?.manualLink?.trim()) {
    filtered = applyHmGalleryManualLinkHighlight(filtered, ref.manualLink.trim());
  }
  return filtered;
}

export function applyHmGalleryManualLinkHighlight(
  items: HmMediaSpotlightItem[],
  manualLink: string,
): HmMediaSpotlightItem[] {
  const link = manualLink.trim();
  if (!link) return items;
  return [
    {
      id: `manual:${link}`,
      title: "Video Galeri",
      imageUrl: "",
      href: link,
      categoryName: "Video Galeri",
    },
    ...items.filter((item) => item.id !== `manual:${link}`),
  ];
}

export function normalizeHmNewsGalleryVideoTvRef(raw: unknown): HmNewsGalleryVideoTvRef | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: HmNewsGalleryVideoTvRef = {};
  const channelSourceId = Number(o.channelSourceId);
  const playlistSourceId = Number(o.playlistSourceId);
  const manualLink = typeof o.manualLink === "string" ? o.manualLink.trim() : "";
  if (Number.isFinite(channelSourceId) && channelSourceId > 0) out.channelSourceId = channelSourceId;
  if (Number.isFinite(playlistSourceId) && playlistSourceId > 0) out.playlistSourceId = playlistSourceId;
  if (manualLink) out.manualLink = manualLink.slice(0, 500);
  return Object.keys(out).length > 0 ? out : null;
}

export function normalizeHmNewsHomeModuleGalleryVideoTvRefs(raw: unknown): HmNewsHomeModuleGalleryVideoTvRefs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: HmNewsHomeModuleGalleryVideoTvRefs = {};
  for (const moduleId of HM_MEDIA_GALLERY_HOME_MODULE_IDS) {
    const ref = normalizeHmNewsGalleryVideoTvRef((raw as Record<string, unknown>)[moduleId]);
    if (ref) out[moduleId] = ref;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveHmNewsGalleryVideoTvRef(
  refs: HmNewsHomeModuleGalleryVideoTvRefs | null | undefined,
  moduleId: HmMediaGalleryHomeModuleId,
): HmNewsGalleryVideoTvRef | null {
  return normalizeHmNewsGalleryVideoTvRef(refs?.[moduleId]) ?? null;
}

export function applyHmGalleryVideoTvRefFilter(
  items: HmMediaSpotlightItem[],
  ref: HmNewsGalleryVideoTvRef | null | undefined,
): HmMediaSpotlightItem[] {
  const sourceFilterId = ref?.playlistSourceId ?? ref?.channelSourceId ?? null;
  let filtered = items;
  if (sourceFilterId != null && sourceFilterId > 0) {
    filtered = filtered.filter((item) => item.videoSourceId === sourceFilterId);
  }
  const manualLink = ref?.manualLink?.trim();
  if (manualLink) {
    filtered = [
      {
        id: `manual:${manualLink}`,
        title: "Video TV",
        imageUrl: "",
        href: manualLink,
        categoryName: "Video TV",
      },
      ...filtered.filter((item) => item.id !== `manual:${manualLink}`),
    ];
  }
  return filtered;
}

function isActiveGallery(row: { status?: string | null }): boolean {
  return String(row?.status ?? "active").trim().toLowerCase() !== "inactive";
}

export async function fetchHmMediaSpotlightPool(opts: {
  fotoHref: (id: number) => string;
  videoGalleryHref: (id: number) => string;
  videoTvHref: (sourceId: number, videoId: string) => string;
  limit?: number;
}): Promise<HmMediaSpotlightItem[]> {
  const limit = opts.limit ?? 12;
  const out: HmMediaSpotlightItem[] = [];
  const seen = new Set<string>();

  const push = (item: HmMediaSpotlightItem) => {
    const title = String(item.title ?? "").trim();
    const href = String(item.href ?? "").trim();
    if (!title || !href || seen.has(item.id)) return;
    seen.add(item.id);
    out.push({ ...item, title, href });
  };

  try {
    const fotoGalleries = (await apiRequest("/api/foto-galeri")) as Array<Record<string, unknown>>;
    for (const gallery of fotoGalleries.filter(isActiveGallery).slice(0, 10)) {
      const id = Number(gallery.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      push({
        id: `foto:${id}`,
        title: String(gallery.title ?? "Foto Galeri"),
        imageUrl: String(gallery.coverImage ?? "").trim(),
        href: opts.fotoHref(id),
        categoryName: "Foto Galeri",
        createdAt: typeof gallery.createdAt === "string" ? gallery.createdAt : null,
      });
    }
  } catch {
    /* foto galeri opsiyonel */
  }

  try {
    const videoGalleries = (await apiRequest("/api/video-galeri")) as Array<Record<string, unknown>>;
    for (const gallery of videoGalleries.filter(isActiveGallery).slice(0, 10)) {
      const id = Number(gallery.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      push({
        id: `vg:${id}`,
        title: String(gallery.title ?? "Video Galeri"),
        imageUrl: String(gallery.coverImage ?? "").trim(),
        href: opts.videoGalleryHref(id),
        categoryName: "Video Galeri",
        createdAt: typeof gallery.createdAt === "string" ? gallery.createdAt : null,
      });
    }
  } catch {
    /* video galeri opsiyonel */
  }

  try {
    const res = (await apiRequest(
      "/api/video/videos?limit=48&longFormOnly=true&mixChannels=true",
    )) as { items?: Array<Record<string, unknown>> };
    for (const video of res?.items ?? []) {
      const sourceId = Number(video.sourceId);
      const platformVideoId = String(video.videoId ?? "").trim();
      const rowId = Number(video.id);
      if (!Number.isFinite(sourceId) || sourceId <= 0 || !platformVideoId) continue;

      const isStory = video.isStory === true;
      const rawTitle = String(video.title ?? "");
      const channelName = typeof video.channelName === "string" ? video.channelName : null;
      const duration = typeof video.duration === "string" ? video.duration : null;
      if (!isLongFormVideo({ isStory, title: rawTitle, duration })) continue;

      const title = recommendationVideoTitle(rawTitle, channelName);
      if (isPlaceholderShortTitle(title)) continue;

      push({
        id: `vtv:${rowId}`,
        title,
        imageUrl: String(video.thumbnail ?? "").trim(),
        href: opts.videoTvHref(sourceId, platformVideoId),
        categoryName: "Video TV",
        videoSourceId: sourceId,
        createdAt:
          typeof video.publishedAt === "string"
            ? video.publishedAt
            : typeof video.createdAt === "string"
              ? video.createdAt
              : null,
      });
    }
  } catch {
    /* video TV opsiyonel */
  }

  return sortHmMediaSpotlightMixed(out).slice(0, limit);
}
