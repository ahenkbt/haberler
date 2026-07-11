import { useEffect } from "react";
import { useYekpareAiSession } from "@/hooks/useYekpareAiSession";
import { YekpareAiChatPanel } from "@/components/YekpareAiChatPanel";
import {
  YEKPARE_HOME_AI_CLOSE_EVENT,
  YEKPARE_HOME_AI_OPEN_EVENT,
} from "@/lib/yekpareAiHomeEvents";
import "@/styles/yekpareAiChat.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Anasayfa hero içinde inline Yekpare AI — kutu değil, arama ile aynı düzlem. */
export function YekpareAiHomeInline({ open, onOpenChange }: Props) {
  const pathNoQuery = "/";
  const session = useYekpareAiSession(pathNoQuery);
  const { input, setInput, loading, savedLocationLabel, messages, listRef, inputRef, sendMessage } =
    session;

  useEffect(() => {
    const onOpen = () => onOpenChange(true);
    const onClose = () => onOpenChange(false);
    window.addEventListener(YEKPARE_HOME_AI_OPEN_EVENT, onOpen);
    window.addEventListener(YEKPARE_HOME_AI_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(YEKPARE_HOME_AI_OPEN_EVENT, onOpen);
      window.removeEventListener(YEKPARE_HOME_AI_CLOSE_EVENT, onClose);
    };
  }, [onOpenChange]);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  if (!open) return null;

  return (
    <section className="seh-home-ai-inline" aria-label="Yekpare AI">
      <YekpareAiChatPanel
        variant="inline-theme"
        savedLocationLabel={savedLocationLabel}
        messages={messages}
        loading={loading}
        input={input}
        pathNoQuery={pathNoQuery}
        listRef={listRef}
        inputRef={inputRef}
        onInputChange={setInput}
        onSubmit={onSubmit}
        onQuickChip={(query) => void sendMessage(query)}
      />
    </section>
  );
}
