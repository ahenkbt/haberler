import { useEffect, useState } from "react";
import { PictureInPicture2, X } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "yektube-ios-pip-guide-dismissed";

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function IosPipGuideBanner({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosDevice()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-surface-muted)] p-3 text-sm",
        className,
      )}
    >
      <PictureInPicture2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-yt-accent)]" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">iOS — küçük ekran (PiP)</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-yt-muted)]">
          Videoyu izlerken Ana ekrana geçin veya başka bir uygulamaya geçin; Safari çoğu videoda küçük oynatıcıyı
          otomatik açar. Olmazsa oynatıcıdaki PiP simgesine dokunun. YouTube iframe modunda altyazı ve PiP menüsü
          oynatıcı ayarlarından açılır.
        </p>
      </div>
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          setVisible(false);
          try {
            sessionStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded p-1 text-[var(--color-yt-muted)] hover:bg-[var(--color-yt-chip)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
