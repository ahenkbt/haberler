import { useEffect, useRef, useState } from "react";
import { Check, Code2, Link2, Share2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildEmbedCode, shareTargets } from "@/lib/shareLinks";

export function ShareDialog({
  open,
  onClose,
  title,
  url,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const embedCode = buildEmbedCode(shareUrl, title, showControls);
  const targets = shareTargets(title, shareUrl);

  useEffect(() => {
    if (!open) {
      setShowEmbed(false);
      setCopied(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const copyText = async (text: string, kind: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Kopyalayın:", text);
    }
  };

  const handleTarget = async (target: (typeof targets)[0]) => {
    if (target.action === "embed") {
      setShowEmbed(true);
      return;
    }
    if (target.action === "copy") {
      await copyText(shareUrl, "link");
      return;
    }
    if (target.action === "native" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        onClose();
      } catch {
        /* cancelled */
      }
      return;
    }
    if (target.href) {
      window.open(target.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Kapat" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-[var(--color-yt-border)] yt-panel p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="share-dialog-title" className="text-lg font-semibold">
            {showEmbed ? "Videoyu yerleştir" : "Paylaş"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 yt-row-hover"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {showEmbed ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showControls}
                onChange={(e) => setShowControls(e.target.checked)}
                className="rounded"
              />
              Oynatıcı kontrollerini göster
            </label>
            <textarea
              readOnly
              value={embedCode}
              rows={5}
              className="w-full resize-none rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-input-bg)] p-3 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => void copyText(embedCode, "embed")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full yt-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              {copied === "embed" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
              {copied === "embed" ? "Kopyalandı" : "Kopyala"}
            </button>
            <button type="button" onClick={() => setShowEmbed(false)} className="text-sm font-medium text-[var(--color-yt-muted)] hover:underline">
              ← Paylaşım seçenekleri
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {typeof navigator !== "undefined" && "share" in navigator ? (
                <button
                  type="button"
                  onClick={() => void handleTarget({ id: "native", label: "Paylaş", color: "#0f0f0f", action: "native" })}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-yt-chip)]">
                    <Share2 className="h-5 w-5" />
                  </span>
                  <span className="max-w-[4.5rem] truncate text-xs">Cihaz</span>
                </button>
              ) : null}
              {targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void handleTarget(t)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.id === "embed" ? <Code2 className="h-5 w-5" /> : t.label.charAt(0)}
                  </span>
                  <span className="max-w-[4.5rem] truncate text-xs">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-input-bg)] px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-[var(--color-yt-muted)]" />
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => void copyText(shareUrl, "link")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
                  copied === "link" ? "yt-nav-active" : "yt-btn-primary",
                )}
              >
                {copied === "link" ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
