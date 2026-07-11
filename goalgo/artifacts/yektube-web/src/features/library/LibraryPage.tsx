import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { History, ListVideo, LogOut, Settings, Trash2, UserCircle } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import {
  clearWatchHistory,
  clearPushSubscription,
  createPlaylist,
  deletePlaylist,
  fetchMemberPrefs,
  fetchPlaylists,
  fetchPushConfig,
  fetchWatchHistory,
  patchMemberPrefs,
  removeFromPlaylist,
  savePushSubscription,
  sendPushTest,
  uploadProfileAvatar,
  type WatchHistoryItem,
} from "@/lib/memberApi";
import { subscribeWebPush } from "@/lib/pushSubscribe";
import {
  clearGuestHistory,
  loadGuestHistory,
  loadGuestPrefs,
  saveGuestPrefs,
  type GuestHistoryEntry,
} from "@/lib/guestStorage";
import { decodeHtml } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { readLowBandwidthMode, writeLowBandwidthMode } from "@/lib/yektubePlaybackPrefs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/features/theme/ThemeProvider";
import { MemberAuthPanel } from "@/features/auth/MemberAuthPanel";

type Tab = "history" | "playlists" | "settings";

export function LibraryPage() {
  const { member, ready, login, register, logout } = useMemberAuth();
  const [path] = useLocation();
  const isAccountPanel = path.includes("/hesabim");
  const [tab, setTab] = useState<Tab>("history");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (!ready) {
    return <p className="px-4 py-12 text-center text-sm text-[var(--color-yt-muted)]">Yükleniyor…</p>;
  }

  return (
    <div className="min-h-full px-4 py-4 lg:px-6 lg:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{isAccountPanel ? "Hesabım" : "Siz"}</h1>
          {member ? (
            <p className="mt-1 text-sm text-[var(--color-yt-muted)]">
              {member.firstName} {member.lastName} · {member.email}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--color-yt-muted)]">
              Yekpare hesabı ile geçmiş ve listelerinizi cihazlar arasında senkronlayın.
            </p>
          )}
        </div>
        {member ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1 rounded-lg border border-[var(--color-yt-border)] px-3 py-1.5 text-xs font-medium yt-panel-hover"
          >
            <LogOut className="h-3.5 w-3.5" />
            Çıkış
          </button>
        ) : null}
      </div>

      {!member ? (
        <MemberAuthPanel mode={authMode} onModeChange={setAuthMode} onLogin={login} onRegister={register} />
      ) : null}

      <div className="mt-6 flex gap-1 border-b border-[var(--color-yt-border)]">
        {(
          [
            { id: "history" as const, label: "Geçmiş", icon: History },
            { id: "playlists" as const, label: "Listeler", icon: ListVideo },
            { id: "settings" as const, label: "Ayarlar", icon: Settings },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-[var(--color-yt-text)] text-[var(--color-yt-text)]"
                : "border-transparent text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "history" ? <HistoryTab member={Boolean(member)} /> : null}
        {tab === "playlists" ? <PlaylistsTab member={Boolean(member)} /> : null}
        {tab === "settings" ? <SettingsTab member={Boolean(member)} /> : null}
      </div>
    </div>
  );
}

function HistoryTab({ member }: { member: boolean }) {
  const qc = useQueryClient();
  const { data: serverItems = [], isLoading } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => fetchWatchHistory(),
    enabled: member,
  });
  const guestItems = member ? [] : loadGuestHistory();

  const clearMut = useMutation({
    mutationFn: () => clearWatchHistory(),
    onSuccess: () => {
      clearGuestHistory();
      void qc.invalidateQueries({ queryKey: ["watch-history"] });
    },
  });

  const items: (WatchHistoryItem | GuestHistoryEntry)[] = member ? serverItems : guestItems;

  if (member && isLoading) {
    return <HistorySkeleton />;
  }

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">
        Henüz izleme geçmişi yok. Bir video izleyince burada görünür.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (member) clearMut.mutate();
            else {
              clearGuestHistory();
              window.location.reload();
            }
          }}
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Geçmişi temizle
        </button>
      </div>
      <div className="divide-y divide-[var(--color-yt-border)] rounded-xl border border-[var(--color-yt-border)]">
        {items.map((v) => (
          <HistoryRow key={v.videoId} item={v} />
        ))}
      </div>
    </div>
  );
}

function HistoryRow({ item }: { item: WatchHistoryItem | GuestHistoryEntry }) {
  const sourceId = item.sourceId ?? 0;
  const isGuest = "youtubeVideoId" in item;
  const ytId = isGuest ? item.youtubeVideoId : (item as WatchHistoryItem).videoId;
  const title =
    (isGuest ? item.title : (item as WatchHistoryItem).title) ?? ytId;
  const thumb = item.thumbnail?.trim();

  if (!sourceId) {
    return (
      <div className="flex gap-3 px-3 py-2">
        {thumb ? <img src={thumb} alt="" className="h-16 w-28 rounded-lg object-cover" /> : null}
        <p className="text-sm">{decodeHtml(String(title))}</p>
      </div>
    );
  }

  return (
    <Link
      href={ytRoutes.watch(
        { id: sourceId, name: (item as WatchHistoryItem).channelName ?? "kanal" },
        { videoId: String(ytId), title: String(title) },
      )}
      className="flex gap-3 px-3 py-2 hover:bg-zinc-50"
    >
      {thumb ? (
        <img src={thumb} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="h-16 w-28 shrink-0 rounded-lg bg-zinc-200" />
      )}
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 text-sm font-medium">{decodeHtml(String(title))}</p>
      </div>
    </Link>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3">
          <div className="h-16 w-28 rounded-lg bg-zinc-200" />
          <div className="h-4 flex-1 rounded bg-zinc-200" />
        </div>
      ))}
    </div>
  );
}

function PlaylistsTab({ member }: { member: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["my-playlists"],
    queryFn: fetchPlaylists,
    enabled: member,
  });

  const createMut = useMutation({
    mutationFn: (t: string) => createPlaylist(t),
    onSuccess: () => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["my-playlists"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deletePlaylist,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-playlists"] }),
  });

  const removeMut = useMutation({
    mutationFn: ({ playlistId, videoId }: { playlistId: number; videoId: number }) =>
      removeFromPlaylist(playlistId, videoId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-playlists"] }),
  });

  if (!member) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">
        Oynatma listeleri için giriş yapın.
      </p>
    );
  }

  return (
    <div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) createMut.mutate(title.trim());
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Yeni liste adı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          disabled={createMut.isPending || !title.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Oluştur
        </button>
      </form>

      {isLoading ? (
        <HistorySkeleton />
      ) : playlists.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-yt-muted)]">Henüz liste yok.</p>
      ) : (
        <div className="space-y-4">
          {playlists.map((pl) => (
            <div key={pl.id} className="rounded-xl border border-[var(--color-yt-border)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{pl.title}</h3>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(pl.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Sil
                </button>
              </div>
              {pl.videos.length === 0 ? (
                <p className="text-xs text-zinc-500">Video eklemek için izlerken «Listeye ekle» kullanın.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {pl.videos.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 py-2">
                      <Link
                        href={ytRoutes.watch(
                          { id: v.sourceId ?? 0, name: v.channelName ?? "kanal" },
                          { videoId: v.videoId, title: v.title },
                        )}
                        className="min-w-0 flex-1 truncate text-sm hover:underline"
                      >
                        {decodeHtml(v.title)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeMut.mutate({ playlistId: pl.id, videoId: v.id })}
                        className="shrink-0 text-xs text-zinc-500 hover:text-red-600"
                      >
                        Kaldır
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ member }: { member: boolean }) {
  const qc = useQueryClient();
  const { preference, resolved } = useTheme();
  const { data: serverPrefs } = useQuery({
    queryKey: ["member-prefs"],
    queryFn: fetchMemberPrefs,
    enabled: member,
  });
  const { data: pushConfig } = useQuery({
    queryKey: ["push-config"],
    queryFn: fetchPushConfig,
    enabled: member,
  });
  const [guestPrefs, setGuestPrefsState] = useState(loadGuestPrefs);
  const [linkedChannelDraft, setLinkedChannelDraft] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(() => readLowBandwidthMode());
  const prefs = member ? serverPrefs : guestPrefs;

  const patchMut = useMutation({
    mutationFn: patchMemberPrefs,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["member-prefs"] }),
  });

  const avatarMut = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: () => {
      setProfileError(null);
      void qc.invalidateQueries({ queryKey: ["member-prefs"] });
    },
    onError: (err: Error) => setProfileError(err.message),
  });

  if (!prefs) {
    return <p className="py-8 text-center text-sm text-zinc-500">Yükleniyor…</p>;
  }

  const update = (key: "notifyNewVideos" | "notifyShorts" | "notifyLive" | "saveHistory", value: boolean) => {
    if (member) {
      patchMut.mutate({ [key]: value });
    } else {
      const next = { ...guestPrefs, [key]: value };
      setGuestPrefsState(next);
      saveGuestPrefs(next);
    }
  };

  const rows: { key: "notifyNewVideos" | "notifyShorts" | "notifyLive" | "saveHistory"; label: string; hint: string }[] = [
    { key: "saveHistory", label: "İzleme geçmişini kaydet", hint: "Kapalıyken yeni izlemeler kaydedilmez." },
    { key: "notifyNewVideos", label: "Yeni video bildirimleri", hint: "Abone olduğunuz kanallarda yeni içerik." },
    { key: "notifyShorts", label: "Yekçek bildirimleri", hint: "Kısa video güncellemeleri." },
    { key: "notifyLive", label: "Canlı yayın bildirimleri", hint: "Canlı yayın başladığında." },
  ];

  const linkedDraftValue =
    linkedChannelDraft || (member && serverPrefs ? (serverPrefs.linkedChannelUrl ?? "") : "");

  return (
    <div className="max-w-lg space-y-4">
      {member && serverPrefs ? (
        <div className="rounded-xl border border-[var(--color-yt-border)] p-4">
          <p className="text-sm font-medium">Profil</p>
          <div className="mt-3 flex items-center gap-4">
            {serverPrefs.avatarUrl ? (
              <img src={serverPrefs.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200">
                <UserCircle className="h-10 w-10 text-zinc-500" />
              </div>
            )}
            <label className="cursor-pointer rounded-lg border border-[var(--color-yt-border)] px-3 py-2 text-xs font-medium yt-panel-hover">
              Fotoğraf yükle
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={avatarMut.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) avatarMut.mutate(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-[var(--color-yt-muted)]">Bağlı YouTube kanalı</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-yt-border)] px-3 py-2 text-sm"
              placeholder="https://youtube.com/@kanal"
              value={linkedDraftValue}
              onChange={(e) => setLinkedChannelDraft(e.target.value)}
              onBlur={() => {
                const val = linkedDraftValue.trim();
                if (val !== (serverPrefs.linkedChannelUrl ?? "")) {
                  patchMut.mutate({ linkedChannelUrl: val || null });
                }
              }}
            />
          </label>
          {profileError ? <p className="mt-2 text-xs text-red-600">{profileError}</p> : null}
        </div>
      ) : null}

      {member && serverPrefs && pushConfig?.pushEnabled ? (
        <div className="rounded-xl border border-[var(--color-yt-border)] p-4">
          <p className="text-sm font-medium">Push bildirimleri</p>
          <p className="mt-1 text-xs text-[var(--color-yt-muted)]">
            {serverPrefs.hasPushSubscription
              ? "Bu cihaz bildirimlere abone."
              : "Tarayıcı bildirimlerini etkinleştirin."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!serverPrefs.hasPushSubscription ? (
              <button
                type="button"
                disabled={pushBusy}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                onClick={() => {
                  if (!pushConfig.vapidPublicKey) return;
                  setPushBusy(true);
                  setProfileError(null);
                  void subscribeWebPush(pushConfig.vapidPublicKey)
                    .then((sub) => savePushSubscription(sub))
                    .then(() => qc.invalidateQueries({ queryKey: ["member-prefs"] }))
                    .catch((err: Error) => setProfileError(err.message))
                    .finally(() => setPushBusy(false));
                }}
              >
                {pushBusy ? "Kaydediliyor…" : "Bildirimlere izin ver"}
              </button>
            ) : (
              <button
                type="button"
                disabled={pushBusy}
                className="rounded-lg border border-[var(--color-yt-border)] px-3 py-1.5 text-xs font-medium yt-panel-hover"
                onClick={() => {
                  setPushBusy(true);
                  void clearPushSubscription()
                    .then(() => qc.invalidateQueries({ queryKey: ["member-prefs"] }))
                    .finally(() => setPushBusy(false));
                }}
              >
                Aboneliği kaldır
              </button>
            )}
            {serverPrefs.hasPushSubscription ? (
              <button
                type="button"
                disabled={pushBusy}
                className="rounded-lg border border-[var(--color-yt-border)] px-3 py-1.5 text-xs font-medium yt-panel-hover"
                onClick={() => {
                  setPushBusy(true);
                  setProfileError(null);
                  void sendPushTest()
                    .catch((err: Error) => setProfileError(err.message))
                    .finally(() => setPushBusy(false));
                }}
              >
                Test bildirimi
              </button>
            ) : null}
          </div>
        </div>
      ) : member ? (
        <p className="text-xs text-[var(--color-yt-muted)]">
          Push bildirimleri için sunucuda WEB_PUSH_VAPID_PUBLIC_KEY yapılandırılmalıdır.
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--color-yt-border)] p-4">
        <p className="text-sm font-medium">Oynatma</p>
        <label className="mt-3 flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Düşük bant modu</p>
            <p className="text-xs text-[var(--color-yt-muted)]">
              Ağır video akışı yerine iframe; Yekçek önbellek yüklemesini azaltır.
            </p>
          </div>
          <input
            type="checkbox"
            checked={lowBandwidth}
            onChange={(e) => {
              const on = e.target.checked;
              setLowBandwidth(on);
              writeLowBandwidthMode(on);
            }}
            className="mt-1 h-4 w-4"
          />
        </label>
      </div>

      <div className="rounded-xl border border-[var(--color-yt-border)] p-4">
        <p className="text-sm font-medium">Görünüm</p>
        <p className="mt-1 text-xs text-[var(--color-yt-muted)]">
          Açık veya koyu tema seçin (şu an: {resolved === "dark" ? "koyu" : "açık"}).
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </div>

      {rows.map(({ key, label, hint }) => (
        <label
          key={key}
          className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--color-yt-border)] p-3"
        >
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-[var(--color-yt-muted)]">{hint}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs[key]}
            onChange={(e) => update(key, e.target.checked)}
            className="mt-1 h-4 w-4"
          />
        </label>
      ))}
      {!member ? (
        <p className="text-xs text-zinc-500">Misafir modunda tercihler yalnızca bu cihazda saklanır.</p>
      ) : null}
    </div>
  );
}
