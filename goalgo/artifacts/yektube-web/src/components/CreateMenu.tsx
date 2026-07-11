import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Radio, Upload, Video, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ytRoutes } from "@/lib/routes";

type CreateMenuProps = {
  open: boolean;
  onClose: () => void;
  anchor?: "bottom" | "top";
};

/** + / Oluştur menüsü → Yek Gönder içerik merkezi */
const items = [
  {
    href: ytRoutes.studioAdd({ upload: true }),
    label: "Video yükle",
    desc: "MP4/WebM dosyanızı Yektube'de yayınlayın",
    icon: Upload,
  },
  {
    href: ytRoutes.yekGonderBroadcast(),
    label: "Canlı yayın başlat",
    desc: "Kamera ve mikrofonunuzdan doğrudan yayın yapın",
    icon: Radio,
  },
  {
    href: ytRoutes.yeklive(),
    label: "Yek Gönder",
    desc: "Video yükle, kanal ekle veya canlı yayın başlat",
    icon: Video,
  },
  {
    href: ytRoutes.studioAdd(),
    label: "Video veya kanal ekle",
    desc: "Stüdyo üzerinden kaynak gönder",
    icon: Upload,
  },
  {
    href: ytRoutes.studioAdd({ live: true }),
    label: "Canlı yayın başlat",
    desc: "Canlı yayın kaynağı oluştur",
    icon: Radio,
  },
  {
    href: ytRoutes.live(),
    label: "Canlı Yayın izle",
    desc: "Aktif canlı yayınları keşfet",
    icon: Radio,
  },
] as const;

export function CreateMenu({ open, onClose, anchor = "bottom" }: CreateMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Kapat" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Oluştur"
        className={cn(
          "absolute yt-panel shadow-xl",
          anchor === "bottom"
            ? "inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--color-yt-border)] pb-[env(safe-area-inset-bottom,0px)]"
            : "right-4 top-14 w-[min(100vw-2rem,320px)] rounded-2xl border border-[var(--color-yt-border)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-yt-border)] px-4 py-3">
          <h2 className="text-base font-semibold">Yek Gönder — Oluştur</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full yt-panel-hover"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="divide-y divide-[var(--color-yt-border)] p-2">
          {items.map(({ href, label, desc, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                onClick={onClose}
                className="flex items-start gap-3 rounded-xl px-3 py-3 yt-panel-hover"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-yt-chip)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-yt-muted)]">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
