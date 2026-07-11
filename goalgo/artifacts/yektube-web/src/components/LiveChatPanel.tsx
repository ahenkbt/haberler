import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MessageCircle, Radio } from "lucide-react";
import { cn } from "@/lib/cn";
import { VideoCommentComposer } from "@/components/VideoCommentComposer";
import type { YoutubeVideoComment } from "@/lib/api";
import { formatCommentTime, type LocalVideoComment } from "@/lib/videoComments";
import { formatCompactCount } from "@/lib/formatCount";

function ChatBubble({
  author,
  text,
  time,
  avatarUrl,
}: {
  author: string;
  text: string;
  time?: string;
  avatarUrl?: string;
}) {
  return (
    <div className="flex gap-2 py-1.5">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full yt-avatar text-[10px] font-bold">
          {author.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold text-[var(--color-yt-text)]">{author}</span>
        {time ? <span className="ml-1.5 text-[10px] text-[var(--color-yt-muted)]">{time}</span> : null}
        <p className="mt-0.5 break-words text-sm leading-snug">{text}</p>
      </div>
    </div>
  );
}

/** Canlı yayın sohbeti — sidebar modunda kutu her zaman kalır, sohbet yoksa boş gösterilir */
export function LiveChatPanel({
  youtubeVideoId,
  isLive,
  viewerCount,
  className,
  compact,
  sidebar = false,
  chatEnabled,
  onVisibleChange,
  fallback,
}: {
  youtubeVideoId: string;
  isLive: boolean;
  viewerCount?: number | null;
  className?: string;
  compact?: boolean;
  /** Sağ sütun — video yüksekliğine hizalı */
  sidebar?: boolean;
  /** API: false ise sidebar'da boş kutu; inline modda panel gizlenir */
  chatEnabled?: boolean | null;
  onVisibleChange?: (visible: boolean) => void;
  /** Sidebar — sohbet yoksa gösterilecek içerik (ör. kanal görseli) */
  fallback?: ReactNode;
}) {
  const embedDomain = typeof window !== "undefined" ? window.location.hostname : "yektube.com";
  const liveChatSrc = useMemo(
    () =>
      `https://www.youtube.com/live_chat?v=${encodeURIComponent(youtubeVideoId)}&embed_domain=${encodeURIComponent(embedDomain)}&dark_theme=${document.documentElement.dataset.ytTheme === "dark" ? "1" : "0"}`,
    [youtubeVideoId, embedDomain],
  );

  const [iframeReady, setIframeReady] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const iframeReadyRef = useRef(false);

  useEffect(() => {
    iframeReadyRef.current = iframeReady;
  }, [iframeReady]);

  useEffect(() => {
    setIframeReady(false);
    setIframeFailed(false);
    iframeReadyRef.current = false;
    if (chatEnabled === false) {
      setIframeFailed(true);
      if (!sidebar) onVisibleChange?.(false);
      return;
    }
    let cancelled = false;
    const failTimer = window.setTimeout(() => {
      if (cancelled || iframeReadyRef.current) return;
      setIframeFailed(true);
      if (!sidebar) onVisibleChange?.(false);
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
    };
  }, [youtubeVideoId, liveChatSrc, chatEnabled, onVisibleChange, sidebar]);

  useEffect(() => {
    if (sidebar) return;
    if (iframeReady && !iframeFailed) onVisibleChange?.(true);
    if (iframeFailed) onVisibleChange?.(false);
  }, [iframeReady, iframeFailed, onVisibleChange, sidebar]);

  const shellClass = cn(
    "flex flex-col overflow-hidden rounded-xl border border-[var(--color-yt-border)] yt-panel",
    sidebar
      ? "h-[min(calc(100vh-12rem),680px)] min-h-[320px]"
      : compact
        ? "h-[min(420px,50vh)]"
        : "h-[min(calc(100vh-8rem),680px)]",
    !sidebar && !iframeReady && "h-0 min-h-0 overflow-hidden border-0 opacity-0",
    className,
  );

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-yt-border)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        {isLive ? (
          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Radio className="h-3 w-3" />
            Canlı
          </span>
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        <span className="text-sm font-semibold">{isLive ? "Canlı sohbet" : "Sohbet"}</span>
      </div>
      {viewerCount != null ? (
        <span className="text-xs text-[var(--color-yt-muted)]">{formatCompactCount(viewerCount)} izleyici</span>
      ) : null}
    </div>
  );

  if (!isLive) {
    return (
      <div className={shellClass}>
        {header}
        <div className="flex flex-1 flex-col p-3">
          <p className="mb-3 text-sm text-[var(--color-yt-muted)]">
            Bu video canlı yayın değil. Sohbet ve yorumlar aşağıdaki bölümde.
          </p>
          <VideoCommentComposer youtubeVideoId={youtubeVideoId} placeholder="Mesaj yazın…" />
        </div>
      </div>
    );
  }

  const chatUnavailable = chatEnabled === false || iframeFailed;

  if (sidebar && chatUnavailable) {
    if (fallback) return fallback;
    return (
      <div className={shellClass}>
        {header}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
          <MessageCircle className="mb-3 h-10 w-10 text-[var(--color-yt-muted)] opacity-40" />
          <p className="text-sm font-medium text-[var(--color-yt-text)]">Canlı sohbet yok</p>
          <p className="mt-1 text-xs text-[var(--color-yt-muted)]">
            Bu kanalda canlı sohbet açık değil veya bu yayın için kullanılamıyor.
          </p>
        </div>
      </div>
    );
  }

  if (!sidebar && chatUnavailable) return null;

  return (
    <div className={shellClass}>
      {header}

      <iframe
        title="Canlı sohbet"
        src={liveChatSrc}
        className="min-h-0 flex-1 w-full border-0 bg-[var(--color-yt-bg)]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        onLoad={() => {
          iframeReadyRef.current = true;
          setIframeReady(true);
          setIframeFailed(false);
          onVisibleChange?.(true);
        }}
        onError={() => {
          setIframeFailed(true);
          if (!sidebar) onVisibleChange?.(false);
        }}
      />
    </div>
  );
}

/** Yorum listesi + yerel mesaj birleşimi */
export function ChatMessageList({
  apiComments,
  localComments,
}: {
  apiComments: YoutubeVideoComment[];
  localComments: LocalVideoComment[];
}) {
  const merged = [
    ...localComments.map((c) => ({
      id: c.id,
      author: c.author,
      text: c.text,
      time: formatCommentTime(c.publishedAt),
      avatarUrl: undefined as string | undefined,
    })),
    ...apiComments.map((c) => ({
      id: c.id,
      author: c.author,
      text: c.text,
      time: c.publishedAt ? formatCommentTime(c.publishedAt) : undefined,
      avatarUrl: c.authorAvatarUrl,
    })),
  ];

  if (merged.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-yt-muted)]">
        Henüz mesaj yok. İlk yorumu siz yazın.
      </p>
    );
  }

  return (
    <div className="space-y-0.5 px-1">
      {merged.map((m) => (
        <ChatBubble key={m.id} author={m.author} text={m.text} time={m.time} avatarUrl={m.avatarUrl} />
      ))}
    </div>
  );
}
