import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { YekpareAiChatPanel } from "@/components/YekpareAiChatPanel";
import { useYekpareAiSession } from "@/hooks/useYekpareAiSession";
import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import { dispatchHomeAiToggle } from "@/lib/yekpareAiHomeEvents";
import { getYekpareAiLayout } from "@/lib/yekpareAiRoutes";
import "@/styles/yekpareAiChat.css";

const SADE_ACCENT = "#039D55";
const HOME_SEARCH_PATHS = new Set(["/", "/home", "/demo"]);

export default function YekpareAiChat() {
  const [location] = useLocation();
  const pathNoQuery = (location.split("?")[0] ?? "/").trim() || "/";
  const layout = getYekpareAiLayout(pathNoQuery);
  const isHomeInline = layout === "home-inline";
  const isFabDock = layout === "fab-dock";
  const isDock = layout === "dock";
  const showDockPanel = isDock || isFabDock;
  const [open, setOpen] = useState(false);

  const session = useYekpareAiSession(pathNoQuery);
  const { input, setInput, loading, savedLocationLabel, messages, listRef, inputRef, sendMessage } =
    session;

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading, listRef]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, inputRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;
      if (HOME_SEARCH_PATHS.has(pathNoQuery)) {
        void sendMessage(trimmed);
        return;
      }
      if (pathNoQuery === UNIFIED_SEARCH_PATH) {
        window.location.href = `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(trimmed)}&ai=1`;
        return;
      }
      void sendMessage(trimmed);
    },
    [input, loading, pathNoQuery, sendMessage],
  );

  const handleFabClick = () => {
    if (isHomeInline) {
      dispatchHomeAiToggle();
      return;
    }
    setOpen((v) => !v);
  };

  /* Anasayfa: hero içinde YekpareAiHomeInline — yüzen FAB/panel yok */
  if (!layout || isHomeInline) return null;

  return (
    <>
      {open && showDockPanel ? (
        <div className="yekpare-ai-panel yekpare-ai-panel--dock" role="dialog" aria-label="Yekpare AI sohbet">
          <YekpareAiChatPanel
            savedLocationLabel={savedLocationLabel}
            messages={messages}
            loading={loading}
            input={input}
            pathNoQuery={pathNoQuery}
            listRef={listRef}
            inputRef={inputRef}
            onClose={() => setOpen(false)}
            onInputChange={setInput}
            onSubmit={onSubmit}
            onQuickChip={(query) => void sendMessage(query)}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleFabClick}
        className={`yekpare-ai-fab ${isHomeInline || isFabDock ? "yekpare-ai-fab--center" : "yekpare-ai-fab--dock"}`}
        aria-expanded={isHomeInline ? undefined : open && showDockPanel}
        aria-label={
          isHomeInline
            ? "Yekpare AI panelini aç/kapat"
            : open
              ? "Yekpare AI sohbetini kapat"
              : "Yekpare AI sohbetini aç"
        }
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${SADE_ACCENT}, #028347)` }}
        >
          {open && showDockPanel ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <span className="yekpare-ai-fab-label">Yekpare AI</span>
      </button>
    </>
  );
}
