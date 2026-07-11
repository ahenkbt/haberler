import type { YektubeSource, YektubeVideo } from "@workspace/yektube-core";
import { loadModuleFlags, saveModuleFlags as persistModuleFlags, type YektubeModuleFlags } from "@/lib/moduleFlags";
import { readHmEditorJwt } from "@/lib/hmEditorBridge";
import { isEmbedMode } from "@/lib/runtimeConfig";

export type AdminPanelStatus = {
  panelBootstrap: boolean;
  panelFullAdmin: boolean;
  permissions: string[] | null;
};

async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readHmEditorJwt();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; success?: boolean };
  if (!r.ok) {
    throw new Error(
      (data as { error?: string }).error ??
        (data as { message?: string }).message ??
        `HTTP ${r.status}`,
    );
  }
  return data;
}

export async function fetchAdminStatus(): Promise<AdminPanelStatus> {
  const token = readHmEditorJwt();
  if (token && isEmbedMode()) {
    try {
      const me = await adminJson<AdminPanelStatus>("/hm/editor/me?yektubeStudio=1");
      if (me.panelBootstrap) return me;
    } catch {
      /* session çerezi veya /me yedek */
    }
  }
  return adminJson<AdminPanelStatus>("/members/admin-panel-status");
}

export async function adminLogin(username: string, password: string): Promise<void> {
  await adminJson("/members/admin-panel-session", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function adminLogout(): Promise<void> {
  await adminJson("/members/logout", { method: "POST" }).catch(() => undefined);
}

export type HmEditorLoginResult = {
  token: string;
  site: { id: number; slug: string; domain?: string | null; displayName: string };
  editor: { id: number; email: string; displayName?: string | null };
  panelBootstrap?: boolean;
};

/** HM editör girişi — slug + e-posta + şifre */
export async function hmEditorLogin(
  slug: string,
  email: string,
  password: string,
  opts?: { yektubeStudio?: boolean },
): Promise<HmEditorLoginResult> {
  const data = await adminJson<HmEditorLoginResult & { error?: string }>("/hm/editor/login", {
    method: "POST",
    body: JSON.stringify({
      slug,
      email,
      password,
      yektubeStudio: opts?.yektubeStudio === true,
    }),
  });
  const token = data.token?.trim();
  if (!token || !data.site?.slug || !data.editor?.email) {
    throw new Error((data as { error?: string }).error || "Giriş başarısız");
  }
  return { token, site: data.site, editor: data.editor, panelBootstrap: data.panelBootstrap };
}

/** HM editör JWT → Yektube Studio panel oturumu (404 ise /me?yektubeStudio=1 yedek). */
export async function hmEditorYektubeAdminSession(token: string): Promise<void> {
  const auth = { Authorization: `Bearer ${token}` };
  const dedicated = await fetch("/api/hm/editor/yektube-admin-session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...auth },
    body: "{}",
  });
  if (dedicated.ok) return;
  if (dedicated.status !== 404) {
    const data = (await dedicated.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(data.error ?? data.message ?? `HTTP ${dedicated.status}`);
  }
  await adminJson("/hm/editor/me?yektubeStudio=1", {
    method: "GET",
    headers: auth,
  });
}

export async function adminCreateSource(body: {
  name: string;
  platform: "youtube" | "dailymotion" | "instagram" | "tiktok";
  sourceType: "channel" | "playlist" | "video" | "live";
  channelId: string;
  url?: string;
  categorySlug: string;
  active?: boolean;
  isLive?: boolean;
  useYoutubeApi?: boolean;
}): Promise<YektubeSource> {
  return adminJson<YektubeSource>("/video/sources", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminDeleteSource(id: number): Promise<void> {
  const r = await fetch(`/api/video/sources/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) {
    const data = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Silinemedi");
  }
}

export async function adminToggleSource(id: number): Promise<void> {
  await adminJson(`/video/sources/${id}/toggle`, { method: "POST" });
}

export type SyncLanguageScope = "tr" | "global";

export async function adminSyncSource(
  id: number,
  opts?: { languageScope?: SyncLanguageScope },
): Promise<{
  ok?: boolean;
  scheduled?: boolean;
  jobId?: string;
  batchId?: string;
  message?: string;
}> {
  return adminJson(`/video/sources/${id}/sync`, {
    method: "POST",
    body: JSON.stringify({ async: true, languageScope: opts?.languageScope ?? "tr" }),
  });
}

export async function adminSyncSourceNow(
  id: number,
  opts?: { languageScope?: SyncLanguageScope },
): Promise<{
  ok?: boolean;
  jobId?: string;
  batchId?: string;
  upserted?: number;
  scraped?: number;
  syncMode?: string;
  warning?: string;
  samples?: Array<{ videoId: string; title: string }>;
}> {
  return adminJson(`/video/sources/${id}/sync`, {
    method: "POST",
    body: JSON.stringify({ async: false, languageScope: opts?.languageScope ?? "tr" }),
  });
}

export type YektubeSyncJob = {
  id: string;
  batchId: string;
  kind: string;
  status: string;
  sourceId?: number;
  sourceName?: string;
  syncMode?: string;
  progress: { scraped: number; upserted: number; skippedEmbed: number; skippedLanguage: number; removed: number };
  warning?: string;
  error?: string;
  samples?: Array<{ videoId: string; title: string }>;
};

export type YektubeSyncQueueResponse = {
  summary: {
    total: number;
    queued: number;
    running: number;
    done: number;
    error: number;
    scraped: number;
    upserted: number;
  };
  jobs: YektubeSyncJob[];
};

export async function fetchYektubeSyncQueue(opts?: {
  batchId?: string;
  limit?: number;
}): Promise<YektubeSyncQueueResponse> {
  const qs = new URLSearchParams();
  if (opts?.batchId) qs.set("batchId", opts.batchId);
  if (opts?.limit) qs.set("limit", String(opts.limit));
  return adminJson(`/video/sync-queue?${qs}`);
}

export async function adminSyncAll(opts?: {
  geminiClassify?: boolean;
  languageScope?: SyncLanguageScope;
}): Promise<{
  ok?: boolean;
  message?: string;
  geminiClassify?: boolean;
  languageScope?: SyncLanguageScope;
  batchId?: string;
  bulkJobId?: string;
}> {
  return adminJson("/video/sync-all", {
    method: "POST",
    body: JSON.stringify({
      geminiClassify: opts?.geminiClassify !== false,
      languageScope: opts?.languageScope ?? "tr",
    }),
  });
}

export async function adminGeminiClassify(limit = 120): Promise<{ ok?: boolean; message?: string; scheduled?: boolean }> {
  return adminJson("/video/gemini/classify", {
    method: "POST",
    body: JSON.stringify({ limit, async: true }),
  });
}

export async function adminSyncShorts(): Promise<{ ok?: boolean; message?: string; scheduled?: boolean }> {
  return adminJson("/video/sync-shorts", { method: "POST", body: JSON.stringify({ async: true }) });
}

export async function adminSyncSocial(): Promise<{
  ok?: boolean;
  message?: string;
  scheduled?: boolean;
  upserted?: number;
  sources?: number;
}> {
  return adminJson("/video/sync-social", { method: "POST", body: JSON.stringify({ async: true }) });
}

export async function adminSyncSocialNow(): Promise<{
  ok?: boolean;
  message?: string;
  upserted?: number;
  sources?: number;
  warnings?: string[];
}> {
  return adminJson("/video/sync-social", { method: "POST", body: JSON.stringify({ async: false }) });
}

export type TurkishSocialHitPresets = {
  instagram: Array<{ handle: string; name: string; categorySlug: string }>;
  tiktok: Array<{ handle: string; name: string; categorySlug: string }>;
  hashtags: string[];
};

export async function fetchTurkishSocialHitPresets(): Promise<TurkishSocialHitPresets> {
  return adminJson<TurkishSocialHitPresets>("/video/social-hit-presets");
}

export async function adminSyncTurkishSocialHits(asyncMode = true): Promise<{
  ok?: boolean;
  scheduled?: boolean;
  message?: string;
  instagram?: { scraped: number; upserted: number; sourcesCreated: number };
  tiktok?: { scraped: number; upserted: number; sourcesCreated: number };
  warnings?: string[];
}> {
  return adminJson("/video/sync-social-hits", {
    method: "POST",
    body: JSON.stringify({ async: asyncMode, importPresetSources: true, maxPerPlatform: 120 }),
  });
}

export async function adminReclassifyYekcekDurations(limit = 2500): Promise<{ updated: number; message?: string }> {
  return adminJson("/video/reclassify-yekcek-durations", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
}

export async function adminRefresh(): Promise<void> {
  await adminJson("/video/refresh", { method: "POST", body: "{}" });
}

export async function adminImportTopChannels(): Promise<{ added?: number; skipped?: number }> {
  return adminJson("/video/import-top-channels", { method: "POST", body: "{}" });
}

export async function adminBulkPresets(category?: string): Promise<{ added?: number; skipped?: number }> {
  return adminJson("/video/presets/bulk-add", {
    method: "POST",
    body: JSON.stringify(category ? { category } : {}),
  });
}

export async function adminBulkLivePresets(category?: string): Promise<{ added?: number; skipped?: number; message?: string }> {
  return adminJson("/video/presets/bulk-add-live", {
    method: "POST",
    body: JSON.stringify(category ? { category } : {}),
  });
}

export type LiveTvPreset = { name: string; videoId: string; category: string };

export async function fetchLiveTvPresets(): Promise<LiveTvPreset[]> {
  return adminJson<LiveTvPreset[]>("/video/presets/live");
}

export type LiveTvSearchCategory = {
  key: string;
  label: string;
  categorySlug: string;
  defaultQuery: string;
};

export type YoutubeLiveSearchHit = {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail?: string;
  liveBroadcastContent?: "live" | "upcoming" | "none";
};

export async function fetchLiveTvCategories(): Promise<LiveTvSearchCategory[]> {
  return adminJson<LiveTvSearchCategory[]>("/video/live/categories");
}

export async function adminSearchLiveYoutube(
  query: string,
  limit = 15,
): Promise<{ items: YoutubeLiveSearchHit[] }> {
  const q = encodeURIComponent(query.trim());
  return adminJson(`/video/live/search?q=${q}&limit=${limit}`);
}

export async function adminImportLiveYoutubeSearch(opts: {
  query?: string;
  categoryKey?: string;
  categorySlug?: string;
  limit?: number;
}): Promise<{ ok?: boolean; added?: number; skipped?: number; found?: number; message?: string; errors?: string[] }> {
  return adminJson("/video/live/import-search", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function adminNormalizeLiveSources(): Promise<{ ok?: boolean; updated?: number; message?: string }> {
  return adminJson("/video/live/normalize", { method: "POST", body: "{}" });
}

export async function adminImportAllLiveCategories(
  limit = 10,
): Promise<{ ok?: boolean; added?: number; skipped?: number; categories?: number; message?: string; details?: Array<{ key: string; label: string; added: number; found: number }> }> {
  return adminJson("/video/live/import-all-categories", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
}

export async function adminBootstrapLiveTv(): Promise<{
  ok?: boolean;
  message?: string;
  presets?: { added?: number; skipped?: number };
  categories?: { added?: number; skipped?: number; details?: Array<{ key: string; label: string; added: number; found: number }> };
  normalize?: { updated?: number };
}> {
  return adminJson("/video/live/bootstrap", { method: "POST", body: "{}" });
}

export async function adminPatchVideo(
  id: number,
  patch: Partial<
    Pick<YektubeVideo, "active" | "isFeatured" | "categorySlug"> & { embedAllowed?: boolean; title?: string }
  >,
): Promise<YektubeVideo> {
  return adminJson<YektubeVideo>(`/video/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function adminBulkPatchVideoCategory(
  ids: number[],
  categorySlug: string,
): Promise<{ updated: number; categorySlug: string }> {
  return adminJson("/video/videos/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, categorySlug }),
  });
}

export async function adminDeleteVideo(id: number): Promise<void> {
  const r = await fetch(`/api/video/videos/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error("Video silinemedi");
}

export type VideoPreset = { name: string; channelId: string; category: string; logoUrl?: string };

export type SiteSettingsSlice = {
  hasYoutubeApiKey?: boolean;
  youtubeApiKey?: string;
};

export async function fetchHmSiteEditors(): Promise<{
  items: Array<{ id: number; email: string; displayName?: string | null; isActive: boolean; createdAt?: string }>;
}> {
  return adminJson("/hm/editor/site-editors");
}

export type VideoSyncCapabilities = {
  hasYoutubeApiKey: boolean;
  apiWarning: string | null;
  modes: Record<string, string>;
};

export async function fetchVideoSyncCapabilities(): Promise<VideoSyncCapabilities> {
  return adminJson<VideoSyncCapabilities>("/video/sync-capabilities");
}

export async function fetchSiteSettings(): Promise<SiteSettingsSlice> {
  return adminJson<SiteSettingsSlice>("/settings");
}

export async function patchSiteSettings(body: { youtubeApiKey?: string }): Promise<SiteSettingsSlice> {
  return adminJson<SiteSettingsSlice>("/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function fetchVideoPresets(): Promise<VideoPreset[]> {
  return adminJson<VideoPreset[]>("/video/presets");
}

export async function adminPatchSource(
  id: number,
  patch: Partial<
    Pick<YektubeSource, "name" | "categorySlug" | "active" | "useYoutubeApi" | "url"> & { channelId?: string }
  >,
): Promise<YektubeSource> {
  return adminJson<YektubeSource>(`/video/sources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function adminSyncPlaylists(id: number): Promise<void> {
  await adminJson(`/video/sources/${id}/sync-playlists`, { method: "POST", body: "{}" });
}

export async function adminFixPlayback(): Promise<{ message?: string }> {
  return adminJson("/video/fix-playback", { method: "POST", body: "{}" });
}

export type CleanupResult = {
  dryRun?: boolean;
  deletedVideos?: number;
  deletedSources?: number;
  details?: Record<string, number>;
};

export async function adminCleanup(dryRun = false): Promise<CleanupResult> {
  return adminJson<CleanupResult>("/video/cleanup", {
    method: "POST",
    body: JSON.stringify({ dryRun }),
  });
}

export async function adminFetchSourceVideos(sourceId: number, limit = 50): Promise<YektubeVideo[]> {
  const r = await fetch(`/api/video/videos?sourceId=${sourceId}&limit=${limit}`, { credentials: "include" });
  if (!r.ok) throw new Error("Videolar yüklenemedi");
  const data = await r.json();
  return (data.items ?? []) as YektubeVideo[];
}

export async function adminPatchVideoTitle(id: number, title: string): Promise<YektubeVideo> {
  return adminJson<YektubeVideo>(`/video/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export type { YektubeModuleFlags };
export { loadModuleFlags };

export function saveModuleFlags(flags: YektubeModuleFlags): void {
  persistModuleFlags(flags);
  window.dispatchEvent(new Event("yektube-modules-updated"));
}

export type MusicBrowseSection = {
  title: string;
  items: Array<{
    kind: string;
    id: string;
    title: string;
    subtitle?: string;
    thumbnail?: string;
    videoId?: string;
    artists?: string;
  }>;
};

export type MusicImportResult = {
  imported: number;
  skipped: number;
  channels: number;
  errors: string[];
};

export async function adminMusicStats(): Promise<{ sources: number; videos: number }> {
  return adminJson("/video/music/stats");
}

export async function adminMusicBrowse(): Promise<{ sections: MusicBrowseSection[] }> {
  return adminJson("/video/music/browse");
}

export async function adminMusicSearch(
  q: string,
  type = "song",
): Promise<{ items: MusicBrowseSection["items"]; channels: Array<{ channelId: string; title: string; thumbnail?: string }> }> {
  const qs = new URLSearchParams({ q, type, limit: "24" });
  return adminJson(`/video/music/search?${qs}`);
}

export async function adminImportMusicYoutubeSearch(body: {
  query?: string;
  limit?: number;
  importVideos?: boolean;
  importChannels?: boolean;
}): Promise<MusicImportResult> {
  return adminJson("/video/music/import-youtube-search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminImportMusicYtm(body: {
  sectionIndex?: number;
  playlistId?: string;
  videoIds?: string[];
  limit?: number;
}): Promise<MusicImportResult> {
  return adminJson("/video/music/import-ytm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminSyncMusicSources(): Promise<{ synced: number; failed: number }> {
  return adminJson("/video/music/sync-sources", { method: "POST", body: "{}" });
}

export type KidsImportResult = {
  imported: number;
  skipped: number;
  channels: number;
  errors: string[];
};

export async function adminKidsStats(): Promise<{ sources: number; videos: number }> {
  return adminJson("/video/kids/stats");
}

export async function adminImportKidsPresets(body?: {
  async?: boolean;
}): Promise<{ ok: boolean; scheduled?: boolean; message?: string; added: number; skipped: number; errors: string[] }> {
  return adminJson("/video/kids/import-presets", {
    method: "POST",
    body: JSON.stringify(body ?? { async: true }),
  });
}

export async function adminImportKidsYoutubeSearch(body: {
  query?: string;
  limit?: number;
  importVideos?: boolean;
  importChannels?: boolean;
  async?: boolean;
}): Promise<KidsImportResult & { ok?: boolean; scheduled?: boolean; message?: string }> {
  return adminJson("/video/kids/import-youtube-search", {
    method: "POST",
    body: JSON.stringify({ async: true, ...body }),
  });
}

export async function adminImportKidsBootstrap(body?: {
  videosPerQuery?: number;
  syncPresets?: boolean;
  async?: boolean;
}): Promise<KidsImportResult & { ok?: boolean; scheduled?: boolean; message?: string; presetsAdded?: number; presetsSkipped?: number; synced?: number }> {
  return adminJson("/video/kids/import-bootstrap", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export async function adminSyncKidsSources(): Promise<{ synced: number; failed: number }> {
  return adminJson("/video/kids/sync-sources", { method: "POST", body: "{}" });
}

export type SectionCategoryDef = {
  id: string;
  label: string;
  keywords?: string[];
  hidden?: boolean;
};

export type YektubeCategoryDef = {
  slug: string;
  label: string;
  hidden?: boolean;
};

export type SectionConfigStore = {
  yektubeCategories: YektubeCategoryDef[];
  muzikCategories: SectionCategoryDef[];
  cocukCategories: SectionCategoryDef[];
};

export type SectionCategoryStat = {
  slug: string;
  label: string;
  sourceCount: number;
  videoCount: number;
};

export type SectionAdminStat = {
  id: "yektube" | "muzik" | "cocuk";
  label: string;
  categoryCount: number;
  sourceCount: number;
  videoCount: number;
  categories: SectionCategoryStat[];
};

export async function adminFetchSectionStats(): Promise<{ sections: SectionAdminStat[] }> {
  return adminJson("/video/admin/section-stats");
}

export async function adminFetchSectionConfig(): Promise<SectionConfigStore> {
  return adminJson("/video/admin/section-config");
}

export async function adminSaveSectionConfig(body: SectionConfigStore): Promise<SectionConfigStore> {
  return adminJson("/video/admin/section-config", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function adminFetchPublicSectionCategories(
  section: "muzik" | "cocuk",
): Promise<{ categories: SectionCategoryDef[] }> {
  return adminJson(`/video/section-categories?section=${section}`);
}

export type YektubeStaticPageAdmin = {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  body: string;
  sidebarLabel?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function adminFetchStaticPages(): Promise<{ pages: YektubeStaticPageAdmin[] }> {
  return adminJson("/video/admin/pages");
}

export async function adminCreateStaticPage(body: {
  slug: string;
  title: string;
  lastUpdated?: string;
  body?: string;
  sidebarLabel?: string | null;
}): Promise<{ page: YektubeStaticPageAdmin }> {
  return adminJson("/video/admin/pages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminUpdateStaticPage(
  id: string,
  body: Partial<Pick<YektubeStaticPageAdmin, "slug" | "title" | "lastUpdated" | "body" | "sidebarLabel">>,
): Promise<{ page: YektubeStaticPageAdmin }> {
  return adminJson(`/video/admin/pages/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function adminDeleteStaticPage(id: string): Promise<{ success: boolean }> {
  return adminJson(`/video/admin/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
}
