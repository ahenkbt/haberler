import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useYektubePwaInstall } from "@/hooks/useYektubePwaInstall";

export function YektubePwaInstallBanner({ className }: { className?: string }) {
  const { state, canPrompt, triggerInstall, dismiss, visible } = useYektubePwaInstall();

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-[var(--color-yt-border)] bg-[var(--color-yt-surface-muted)] px-3 py-2.5 text-sm",
        className,
      )}
      role="region"
      aria-label="Yektube uygulamasını yükle"
    >
      <Download className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-yt-accent)]" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Yektube uygulamasını indir</p>
        {state === "ios" ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-yt-muted)]">
            Safari&apos;de{" "}
            <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden /> Paylaş →{" "}
            <strong>Ana Ekrana Ekle</strong>. Uygulama{" "}
            <strong>yekpare.net/yp</strong> adresinden açılır.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-yt-muted)]">
            Ana ekrandan tek dokunuşla açın — başlangıç adresi{" "}
            <strong>yekpare.net/yp</strong>.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {state === "chrome-prompt" && canPrompt ? (
            <button
              type="button"
              onClick={() => void triggerInstall()}
              className="rounded-full px-3 py-1.5 text-xs font-semibold yt-btn-primary"
            >
              Uygulamayı indir
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-yt-muted)] yt-panel-hover"
          >
            Sonra
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Kapat"
        onClick={dismiss}
        className="shrink-0 rounded p-1 text-[var(--color-yt-muted)] hover:bg-[var(--color-yt-chip)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
