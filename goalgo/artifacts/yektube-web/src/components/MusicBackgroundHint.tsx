import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, PictureInPicture2, X } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "yektube-music-bg-hint-dismissed";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function MusicBackgroundHint({ playing }: { playing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const wasHiddenRef = useRef(false);
  const stallTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !isMobileDevice()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const showHint = () => {
      try {
        if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
      } catch {
        /* ignore */
      }
      setVisible(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        return;
      }
      if (wasHiddenRef.current && playing) {
        showHint();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    stallTimerRef.current = window.setTimeout(showHint, 12_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (stallTimerRef.current != null) window.clearTimeout(stallTimerRef.current);
    };
  }, [playing]);

  if (!visible || !playing) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "border-b border-[var(--color-yt-border)] bg-[var(--color-yt-surface-muted)] px-3 py-2 text-xs",
      )}
    >
      <div className="flex items-start gap-2">
        <PictureInPicture2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-yt-accent)]" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left font-medium"
          >
            <span>Arka planda müzik kesiliyor mu?</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-[var(--color-yt-muted)]" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-yt-muted)]" />
            )}
          </button>
          {expanded ? (
            <p className="mt-1.5 leading-relaxed text-[var(--color-yt-muted)]">
              Şarkıyı video olarak açıp oynatıcıdan <strong>Küçük ekran (PiP)</strong> deneyin veya{" "}
              <strong>Uygulamayı indir</strong> ile ana ekrana ekleyin. PiP simgesi çoğu cihazda oynatıcının
              köşesindedir.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Kapat"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-[var(--color-yt-muted)] hover:bg-[var(--color-yt-chip)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
