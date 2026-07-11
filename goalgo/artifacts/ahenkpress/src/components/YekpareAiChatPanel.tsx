import { Bot, Send, X } from "lucide-react";
import { Link } from "wouter";
import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import type { ChatMessage } from "@/hooks/useYekpareAiSession";

const SADE_ACCENT = "#039D55";
const HOME_SEARCH_PATHS = new Set(["/", "/home", "/demo"]);

const QUICK_CHIPS = [
  { label: "Yemek", query: "Yemek siparişi nasıl verilir?", href: "/yemek" },
  { label: "Alışveriş", query: "Alışveriş ve mağaza nerede?", href: "/magaza" },
  { label: "Seyahat", query: "Seyahat ve tur rezervasyonu", href: "/turizm" },
  { label: "Haritalar", query: "Haritalar nerede?", href: "/haritalar" },
  { label: "Sipariş takip", query: "Siparişimi nasıl takip ederim?", href: "/siparis-takip" },
  { label: "Bilgi Ağacı", query: "Bilgi ağacı nedir?", href: "/bilgiagaci" },
] as const;

export type YekpareAiChatPanelProps = {
  savedLocationLabel: string | null;
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  pathNoQuery: string;
  listRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClose?: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickChip: (query: string) => void;
  variant?: "dock" | "inline-theme";
};

export function YekpareAiChatPanel({
  savedLocationLabel,
  messages,
  loading,
  input,
  pathNoQuery,
  listRef,
  inputRef,
  onClose,
  onInputChange,
  onSubmit,
  onQuickChip,
  variant = "dock",
}: YekpareAiChatPanelProps) {
  const isHomeSearch = HOME_SEARCH_PATHS.has(pathNoQuery);
  const isInlineTheme = variant === "inline-theme";

  if (isInlineTheme) {
    return (
      <div className="yekpare-ai-inline-theme">
        {messages.length <= 1 ? (
          <p className="yekpare-ai-inline-theme__greeting">
            {savedLocationLabel
              ? `${savedLocationLabel} — size nasıl yardımcı olabilirim?`
              : "Yekpare AI — Türkiye'nin yerli arama motoru"}
          </p>
        ) : null}

        {messages.length > 1 ? (
          <div ref={listRef} className="yekpare-ai-inline-theme__messages">
            {messages.slice(1).map((m) => (
              <div
                key={m.id}
                className={`yekpare-ai-inline-theme__bubble-row ${m.role === "user" ? "is-user" : "is-assistant"}`}
              >
                <div className={`yekpare-ai-inline-theme__bubble ${m.role === "user" ? "is-user" : "is-assistant"}`}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.links && m.links.length > 0 ? (
                    <div className="yekpare-ai-inline-theme__links">
                      {m.links.map((link) => (
                        <Link
                          key={`${m.id}-${link.href}-${link.label}`}
                          href={link.href}
                          className="yekpare-ai-inline-theme__link"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="yekpare-ai-inline-theme__bubble-row is-assistant">
                <div className="yekpare-ai-inline-theme__bubble is-assistant is-typing">Yazıyor…</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div ref={listRef} className="yekpare-ai-inline-theme__messages" aria-hidden="true" />
        )}

        {messages.length <= 1 ? (
          <div className="yekpare-ai-inline-theme__chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={loading}
                onClick={() => onQuickChip(chip.query)}
                className="yekpare-ai-inline-theme__chip"
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="yekpare-ai-inline-theme__form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            maxLength={500}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ne aramak veya sormak istersiniz?"
            className="yekpare-ai-inline-theme__input"
            disabled={loading}
            aria-label="Mesajınız"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="yekpare-ai-inline-theme__submit"
            aria-label="Gönder"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 text-white"
        style={{ background: `linear-gradient(135deg, ${SADE_ACCENT}, #028347)` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15">
            <Bot className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">Yekpare AI</p>
            <p className="truncate text-[10px] font-semibold text-emerald-50/90">
              {savedLocationLabel ? savedLocationLabel : "Türkiye'nin yerli arama motoru"}
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Sohbeti kapat"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-100 bg-slate-50 text-slate-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.links && m.links.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.links.map((link) => (
                    <Link
                      key={`${m.id}-${link.href}-${link.label}`}
                      href={link.href}
                      onClick={onClose ?? undefined}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#039D55] hover:bg-emerald-50"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              Yazıyor…
            </div>
          </div>
        ) : null}
      </div>

      {messages.length <= 1 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-emerald-50 px-3 py-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={loading}
              onClick={() => onQuickChip(chip.query)}
              className="rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-[#039D55] hover:text-[#039D55] disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-emerald-50 p-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          maxLength={500}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            isHomeSearch
              ? "Ne aramak veya sormak istersiniz?"
              : pathNoQuery === UNIFIED_SEARCH_PATH
                ? "Sorunuzu yazın veya arama yapın…"
                : "Yemek, sipariş veya konum sorun…"
          }
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#039D55] focus:ring-1 focus:ring-[#039D55]/30"
          disabled={loading}
          aria-label="Mesajınız"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40"
          style={{ backgroundColor: SADE_ACCENT }}
          aria-label="Gönder"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}
