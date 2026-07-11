import type { YektubeSource, YektubeVideo } from "@workspace/yektube-core";

export type SiteMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  accountType: "individual" | "business";
};

export type YektubeMemberPrefs = {
  notifyNewVideos: boolean;
  notifyShorts: boolean;
  notifyLive: boolean;
  saveHistory: boolean;
  avatarUrl?: string | null;
  linkedChannelUrl?: string | null;
  hasPushSubscription?: boolean;
};

export type CreatorAnalytics = {
  videoCount: number;
  publishedCount: number;
  pendingUploads: number;
  pendingLinks: number;
  totalViews: number;
  subscriberCount: number;
  hasChannel: boolean;
};

export type YektubePlaylist = {
  id: number;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  videos: YektubeVideo[];
};

export type WatchHistoryItem = YektubeVideo & { watchedAt?: string };

async function memberJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; success?: boolean };
  if (!r.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${r.status}`);
  }
  return data;
}

export async function fetchMemberMe(): Promise<SiteMember | null> {
  const res = await memberJson<{ success: boolean; data: SiteMember | null }>("/members/me");
  return res.data ?? null;
}

export async function memberLogin(email: string, password: string): Promise<SiteMember> {
  const res = await memberJson<{ success: boolean; data: SiteMember }>("/members/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

export async function memberRegister(body: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<SiteMember> {
  const res = await memberJson<{ success: boolean; data: SiteMember }>("/members/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function memberLogout(): Promise<void> {
  await memberJson("/members/logout", { method: "POST" });
}

export async function fetchMySubscriptions(): Promise<YektubeSource[]> {
  const res = await memberJson<{ items: YektubeSource[] }>("/video/me/subscriptions");
  return res.items ?? [];
}

export async function fetchSubscriptionStatus(sourceId: number): Promise<boolean> {
  const res = await memberJson<{ subscribed: boolean }>(`/video/me/subscriptions/status?sourceId=${sourceId}`);
  return res.subscribed;
}

export async function subscribeSource(sourceId: number): Promise<void> {
  await memberJson(`/video/me/subscriptions/${sourceId}`, { method: "POST", body: "{}" });
}

export async function unsubscribeSource(sourceId: number): Promise<void> {
  await memberJson(`/video/me/subscriptions/${sourceId}`, { method: "DELETE" });
}

export async function fetchWatchHistory(limit = 50): Promise<WatchHistoryItem[]> {
  const res = await memberJson<{ items: WatchHistoryItem[] }>(`/video/me/history?limit=${limit}`);
  return res.items ?? [];
}

export async function recordWatchHistory(entry: {
  videoId: number;
  sourceId?: number;
  youtubeVideoId: string;
}): Promise<void> {
  await memberJson("/video/me/history", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function clearWatchHistory(videoId?: number): Promise<void> {
  const qs = videoId != null ? `?videoId=${videoId}` : "";
  await memberJson(`/video/me/history${qs}`, { method: "DELETE" });
}

export async function fetchPlaylists(): Promise<YektubePlaylist[]> {
  const res = await memberJson<{ items: YektubePlaylist[] }>("/video/me/playlists");
  return res.items ?? [];
}

export async function createPlaylist(title: string): Promise<YektubePlaylist> {
  return memberJson<YektubePlaylist>("/video/me/playlists", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function deletePlaylist(id: number): Promise<void> {
  await memberJson(`/video/me/playlists/${id}`, { method: "DELETE" });
}

export async function addToPlaylist(playlistId: number, videoId: number): Promise<void> {
  await memberJson(`/video/me/playlists/${playlistId}/items`, {
    method: "POST",
    body: JSON.stringify({ videoId }),
  });
}

export async function removeFromPlaylist(playlistId: number, videoId: number): Promise<void> {
  await memberJson(`/video/me/playlists/${playlistId}/items/${videoId}`, { method: "DELETE" });
}

export async function fetchMemberPrefs(): Promise<YektubeMemberPrefs> {
  return memberJson<YektubeMemberPrefs>("/video/me/prefs");
}

export async function patchMemberPrefs(patch: Partial<YektubeMemberPrefs>): Promise<YektubeMemberPrefs> {
  return memberJson<YektubeMemberPrefs>("/video/me/prefs", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function syncGuestData(body: {
  subscriptions: number[];
  history: { videoId: number; sourceId?: number; youtubeVideoId: string }[];
}): Promise<void> {
  await memberJson("/video/me/sync-guest", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Üye video dosyası yükle — Yektube barındırma */
export async function uploadCreatorVideo(body: FormData): Promise<{
  ok: boolean;
  sourceId: number;
  video: import("@workspace/yektube-core").YektubeVideo;
  streamUrl: string;
}> {
  const r = await fetch("/api/video/me/creator/upload", {
    method: "POST",
    credentials: "include",
    body,
  });
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    sourceId?: number;
    video?: import("@workspace/yektube-core").YektubeVideo;
    streamUrl?: string;
    error?: string;
  };
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  if (!data.video || data.sourceId == null || !data.streamUrl) {
    throw new Error("Yükleme yanıtı eksik");
  }
  return { ok: true, sourceId: data.sourceId, video: data.video, streamUrl: data.streamUrl };
}

/** Üye içerik önerisi — moderasyon sonrası yayına alınır */
export async function submitCreatorSource(body: {
  name: string;
  url: string;
  sourceType: "channel" | "playlist" | "live";
  categorySlug: string;
}): Promise<{ ok: boolean; sourceId: number }> {
  return memberJson<{ ok: boolean; sourceId: number }>("/video/me/creator/sources", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type CreatorSubmission = {
  kind: "upload" | "link" | "live" | "playlist";
  status: "pending" | "published" | "approved";
  title: string;
  url?: string | null;
  sourceId: number;
  videoId?: number;
  categorySlug: string;
  createdAt: string;
  platform: string;
};

export async function fetchCreatorSubmissions(): Promise<CreatorSubmission[]> {
  const res = await memberJson<{ items: CreatorSubmission[] }>("/video/me/creator/submissions");
  return res.items ?? [];
}

export async function fetchCreatorAnalytics(): Promise<CreatorAnalytics> {
  return memberJson<CreatorAnalytics>("/video/me/creator/analytics");
}

export async function uploadProfileAvatar(file: File): Promise<{ ok: boolean; avatarUrl: string }> {
  const form = new FormData();
  form.append("avatar", file);
  const r = await fetch("/api/video/me/profile/avatar", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; avatarUrl?: string; error?: string };
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  if (!data.avatarUrl) throw new Error("Avatar yanıtı eksik");
  return { ok: true, avatarUrl: data.avatarUrl };
}

export async function fetchPushConfig(): Promise<{ vapidPublicKey: string | null; pushEnabled: boolean }> {
  return memberJson("/video/me/push-config");
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await memberJson("/video/me/push-subscription", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
}

export async function clearPushSubscription(): Promise<void> {
  await memberJson("/video/me/push-subscription", { method: "DELETE" });
}

export async function sendPushTest(): Promise<void> {
  await memberJson("/video/me/push-test", { method: "POST", body: "{}" });
}
