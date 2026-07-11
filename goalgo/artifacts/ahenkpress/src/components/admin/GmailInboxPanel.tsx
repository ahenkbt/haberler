import { Loader2, RefreshCw, Reply, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GmailInboxMessage = {
  id: number;
  direction: string;
  from_addr: string;
  to_addr: string;
  subject: string | null;
  body_text: string | null;
  is_read: boolean;
  created_at: string;
};

type GmailInboxPanelProps = {
  messages: GmailInboxMessage[];
  selectedId: number | null;
  syncing: boolean;
  onRefresh: () => void;
  onSync: () => void;
  onSelect: (id: number, isRead: boolean) => void;
  onReply: (message: GmailInboxMessage) => void;
};

function senderLabel(from: string): string {
  const m = from.match(/^([^<]+)</);
  if (m?.[1]) return m[1].trim().replace(/"/g, "");
  if (from.includes("@")) return from.split("@")[0] ?? from;
  return from;
}

function formatMailDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function GmailInboxPanel({
  messages,
  selectedId,
  syncing,
  onRefresh,
  onSync,
  onSelect,
  onReply,
}: GmailInboxPanelProps) {
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex min-h-[560px] flex-1 flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} className="rounded-full">
          <RefreshCw className="mr-1 h-4 w-4" />
          Yenile
        </Button>
        <Button type="button" size="sm" onClick={onSync} disabled={syncing} className="rounded-full bg-[#c2e7ff] text-[#001d35] hover:bg-[#a8daff]">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : "IMAP senkron"}
        </Button>
        <span className="ml-auto text-xs text-gray-500">{messages.length} ileti</span>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className="min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-200">
          {messages.map((m) => {
            const unread = !m.is_read;
            const active = selectedId === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id, m.is_read)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,0.08)]",
                    active && "bg-[#c2dbff]/40",
                    unread && !active && "bg-white",
                  )}
                >
                  <Star className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", unread ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                        {senderLabel(m.from_addr)}
                      </span>
                      <span className={cn("shrink-0 text-xs", unread ? "font-semibold text-gray-900" : "text-gray-500")}>
                        {formatMailDate(m.created_at)}
                      </span>
                    </div>
                    <p className={cn("truncate text-sm", unread ? "font-semibold text-gray-900" : "text-gray-800")}>
                      {m.subject || "(konu yok)"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{m.body_text || "—"}</p>
                  </div>
                </button>
              </li>
            );
          })}
          {!messages.length ? (
            <li className="px-4 py-16 text-center text-sm text-gray-500">Kayıt yok — IMAP senkron deneyin</li>
          ) : null}
        </ul>

        <div className="min-h-[240px] overflow-y-auto bg-[#f6f8fc] p-4 lg:min-h-0">
          {selected ? (
            <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-normal text-gray-900">{selected.subject || "(konu yok)"}</h2>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{senderLabel(selected.from_addr)}</p>
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-400">kimden</span> {selected.from_addr}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-400">kime</span> {selected.to_addr}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString("tr-TR")}</p>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {selected.body_text || "(içerik yok)"}
              </div>
              {selected.direction === "in" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-6 rounded-full"
                  onClick={() => onReply(selected)}
                >
                  <Reply className="mr-1 h-4 w-4" />
                  Yanıtla
                </Button>
              ) : null}
            </article>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">
              Okumak için bir ileti seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
