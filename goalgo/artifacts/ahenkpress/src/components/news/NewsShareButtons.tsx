import { Facebook, Link2, MessageCircle, Send } from "lucide-react";

export function NewsShareButtons({
  title,
  className = "",
  compact = false,
}: {
  title: string;
  className?: string;
  compact?: boolean;
}) {
  if (typeof window === "undefined") return null;

  const rawUrl = window.location.href;
  const shareUrl = encodeURIComponent(rawUrl);
  const shareTitle = encodeURIComponent(title);
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  const tw = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;
  const wa = `https://wa.me/?text=${shareTitle}%20${shareUrl}`;
  const tg = `https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`;
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black uppercase tracking-[0.04em] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
  const labelClass = compact ? "hidden sm:inline" : "";

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Sosyal medyada paylaş</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className={`${base} border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700`}>
          <MessageCircle className="h-4 w-4" />
          <span className={labelClass}>WhatsApp</span>
        </a>
        <a href={fb} target="_blank" rel="noreferrer" className={`${base} border-blue-200 bg-blue-600 text-white hover:bg-blue-700`}>
          <Facebook className="h-4 w-4" />
          <span className={labelClass}>Facebook</span>
        </a>
        <a href={tw} target="_blank" rel="noreferrer" className={`${base} border-slate-300 bg-slate-950 text-white hover:bg-black`}>
          <span className="text-[13px] font-black">X</span>
          <span className={labelClass}>Twitter</span>
        </a>
        <a href={tg} target="_blank" rel="noreferrer" className={`${base} border-sky-200 bg-sky-500 text-white hover:bg-sky-600`}>
          <Send className="h-4 w-4" />
          <span className={labelClass}>Telegram</span>
        </a>
        <button
          type="button"
          className={`${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
          onClick={() => void navigator.clipboard?.writeText(rawUrl)}
        >
          <Link2 className="h-4 w-4" />
          <span className={labelClass}>Linki kopyala</span>
        </button>
      </div>
    </div>
  );
}
