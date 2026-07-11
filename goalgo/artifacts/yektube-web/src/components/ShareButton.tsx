import { useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ShareDialog } from "@/components/ShareDialog";

export function ShareButton({
  title,
  url,
  className,
  compact,
  vertical,
  variant = "inline",
}: {
  title: string;
  url?: string;
  className?: string;
  compact?: boolean;
  vertical?: boolean;
  variant?: "inline" | "overlay" | "panel";
}) {
  const [open, setOpen] = useState(false);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  if (vertical) {
    const isPanel = variant === "panel";
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1",
            isPanel ? "text-[var(--color-yt-text)]" : "text-white",
            className,
          )}
          aria-label="Paylaş"
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              isPanel ? "bg-[var(--color-yt-chip)] hover:bg-[var(--color-yt-border)]" : "bg-white/10 backdrop-blur-sm",
            )}
          >
            <Share2 className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium">Paylaş</span>
        </button>
        <ShareDialog open={open} onClose={() => setOpen(false)} title={title} url={shareUrl} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-[var(--color-yt-border)] px-3 py-1.5 text-sm font-medium yt-row-hover",
          compact && "px-2.5 py-1 text-xs",
          className,
        )}
      >
        <Share2 className="h-4 w-4" />
        Paylaş
      </button>
      <ShareDialog open={open} onClose={() => setOpen(false)} title={title} url={shareUrl} />
    </>
  );
}

export function CopyLinkButton({ url, label = "Link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1.5 rounded-full border border-[var(--color-yt-border)] px-3 py-1.5 text-sm font-medium yt-row-hover"
    >
      {copied ? "Kopyalandı" : label}
    </button>
  );
}
