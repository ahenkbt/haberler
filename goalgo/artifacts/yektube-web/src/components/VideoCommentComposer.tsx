import { useState } from "react";
import { Send } from "lucide-react";
import { addLocalComment } from "@/lib/videoComments";
import { cn } from "@/lib/cn";

export function VideoCommentComposer({
  youtubeVideoId,
  placeholder = "Yorum ekleyin…",
  className,
  onPosted,
}: {
  youtubeVideoId: string;
  placeholder?: string;
  className?: string;
  onPosted?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      addLocalComment(youtubeVideoId, trimmed);
      setText("");
      onPosted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full yt-avatar text-sm font-bold">
        S
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-yt-text)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!text.trim() || busy}
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-full yt-btn-primary px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
