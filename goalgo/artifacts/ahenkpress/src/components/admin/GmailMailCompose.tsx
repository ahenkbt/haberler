import { useState } from "react";
import {
  ChevronDown,
  Loader2,
  Minus,
  Paperclip,
  Send,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GmailMailComposeProps = {
  fromAddress?: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  sending: boolean;
  onToChange: (v: string) => void;
  onCcChange: (v: string) => void;
  onBccChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSend: () => void;
  onDiscard: () => void;
  className?: string;
};

export function GmailMailCompose({
  fromAddress,
  to,
  cc,
  bcc,
  subject,
  body,
  sending,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onSend,
  onDiscard,
  className,
}: GmailMailComposeProps) {
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(Boolean(cc.trim()));
  const [showBcc, setShowBcc] = useState(Boolean(bcc.trim()));

  const canSend = to.trim() && subject.trim() && body.trim();

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className={cn(
          "fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#404040] px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#303030]",
          className,
        )}
      >
        <SquarePen className="h-4 w-4" />
        Yeni ileti
        {subject.trim() ? <span className="max-w-[180px] truncate opacity-80">· {subject}</span> : null}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div className="flex items-center justify-between bg-[#404040] px-4 py-2.5 text-white">
        <span className="text-sm font-medium">Yeni ileti</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Küçült"
            onClick={() => setMinimized(true)}
            className="rounded p-1.5 hover:bg-white/10"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onDiscard}
            className="rounded p-1.5 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-gray-100 px-4 py-1 text-sm">
        {fromAddress ? (
          <div className="flex min-h-10 items-center gap-2 border-b border-gray-100 py-1 text-gray-500">
            <span className="w-14 shrink-0">Kimden</span>
            <span className="truncate text-gray-800">{fromAddress}</span>
          </div>
        ) : null}

        <div className="flex min-h-10 items-center gap-2 border-b border-gray-100 py-1">
          <span className="w-14 shrink-0 text-gray-500">Kime</span>
          <input
            type="email"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            placeholder="Alıcılar"
            className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
          />
          <div className="flex shrink-0 gap-2 text-xs text-gray-500">
            {!showCc ? (
              <button type="button" className="hover:text-[#1a73e8]" onClick={() => setShowCc(true)}>
                Cc
              </button>
            ) : null}
            {!showBcc ? (
              <button type="button" className="hover:text-[#1a73e8]" onClick={() => setShowBcc(true)}>
                Bcc
              </button>
            ) : null}
          </div>
        </div>

        {showCc ? (
          <div className="flex min-h-10 items-center gap-2 border-b border-gray-100 py-1">
            <span className="w-14 shrink-0 text-gray-500">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => onCcChange(e.target.value)}
              placeholder="Cc"
              className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        ) : null}

        {showBcc ? (
          <div className="flex min-h-10 items-center gap-2 border-b border-gray-100 py-1">
            <span className="w-14 shrink-0 text-gray-500">Bcc</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => onBccChange(e.target.value)}
              placeholder="Bcc"
              className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        ) : null}

        <div className="flex min-h-10 items-center gap-2 py-1">
          <span className="w-14 shrink-0 text-gray-500">Konu</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Konu"
            className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder="Mesajınızı yazın…"
        className="min-h-[220px] flex-1 resize-none border-0 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none"
      />

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSend || sending}
            onClick={onSend}
            className="inline-flex items-center gap-1 rounded-full bg-[#0b57d0] px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0842a0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gönder
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          <button
            type="button"
            aria-label="Dosya ekle"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            title="Yakında"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Taslağı sil"
          onClick={onDiscard}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
