import { useMemo } from "react";
import { MessageCircle, Radio } from "lucide-react";

function formatViewerCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}B`;
  return String(Math.round(value));
}

/** Canlı yayın sohbeti — YouTube live_chat embed */
export function YektubeLiveChatPanel({
  youtubeVideoId,
  isLive = true,
  viewerCount,
  className,
  compact,
}: {
  youtubeVideoId: string;
  isLive?: boolean;
  viewerCount?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const embedDomain = typeof window !== "undefined" ? window.location.hostname : "yekpare.net";
  const liveChatSrc = useMemo(
    () =>
      `https://www.youtube.com/live_chat?v=${encodeURIComponent(youtubeVideoId)}&embed_domain=${encodeURIComponent(embedDomain)}&dark_theme=0`,
    [youtubeVideoId, embedDomain],
  );

  return (
    <div
      className={[
        "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white",
        compact ? "h-[min(380px,48vh)]" : "h-[min(420px,52vh)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1 rounded-full bg-[#039D55] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Radio className="h-3 w-3" />
              Canlı
            </span>
          ) : (
            <MessageCircle className="h-4 w-4 text-zinc-500" />
          )}
          <span className="text-sm font-semibold text-zinc-900">Canlı sohbet</span>
        </div>
        {viewerCount != null ? (
          <span className="text-xs text-zinc-500">{formatViewerCount(viewerCount)} izleyici</span>
        ) : null}
      </div>
      <iframe
        title="Canlı sohbet"
        src={liveChatSrc}
        className="min-h-0 flex-1 w-full border-0 bg-white"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
