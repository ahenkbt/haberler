import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, LifeBuoy, Send } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

type Props = {
  authHeaders: () => Record<string, string>;
};

/**
 * Servis sağlayıcı oturumu (`x-vendor-id` / `x-vendor-email`) ile platform destek talepleri.
 * Admin: Destek Talepleri (`/admin/destek-talepleri`).
 */
export function VendorPlatformSupportTab({ authHeaders }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tickets, setTickets] = useState<{ id: number; status: string; subject: string; created_at: string }[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(apiUrl("/api/support/tickets"), {
        credentials: "include",
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        setTickets([]);
        return;
      }
      const d = (await res.json()) as { tickets?: typeof tickets };
      setTickets(d.tickets ?? []);
    } catch {
      setTickets([]);
    } finally {
      setListLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subject.trim();
    const txt = body.trim();
    if (!sub || !txt) {
      setMsg({ type: "err", text: "Konu ve mesaj zorunludur." });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(apiUrl("/api/support/tickets"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subject: sub, body: txt }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ type: "err", text: d.error || "Gönderilemedi." });
        return;
      }
      setMsg({ type: "ok", text: "Talebiniz yönetime iletildi. En kısa sürede dönüş yapılır." });
      setSubject("");
      setBody("");
      void loadTickets();
    } catch {
      setMsg({ type: "err", text: "Bağlantı hatası." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
        <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
          <LifeBuoy className="w-4 h-4 shrink-0" />
          Yekpare yönetimine talep
        </div>
        <p className="text-xs text-indigo-900/90 mt-2 leading-relaxed">
          <strong>Özel alan adı</strong>, teknik sorun veya sözleşme konusunda buradan talep oluşturun. Kayıtlar yönetim panelindeki{" "}
          <strong>Destek Talepleri</strong> listesine düşer.
        </p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <Label htmlFor="vsp-subject">Konu</Label>
          <Input
            id="vsp-subject"
            className="mt-1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Örn: Özel alan adı veya entegrasyon sorunu"
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor="vsp-body">Mesaj</Label>
          <Textarea
            id="vsp-body"
            className="mt-1 min-h-[140px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Kurum slug’ı, istenen domain, DNS durumu…"
            maxLength={12000}
          />
        </div>
        {msg ? (
          <p className={`text-sm font-medium ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
        ) : null}
        <Button type="submit" disabled={sending} className="gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Talebi gönder
        </Button>
      </form>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Son talepleriniz</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadTickets()} disabled={listLoading}>
            {listLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yenile"}
          </Button>
        </div>
        {tickets.length === 0 ? (
          <p className="text-xs text-gray-500">Henüz kayıtlı talep yok.</p>
        ) : (
          <ul className="divide-y text-sm">
            {tickets.map((t) => (
              <li key={t.id} className="py-2 flex flex-col gap-0.5">
                <span className="font-medium text-gray-900">{t.subject}</span>
                <span className="text-[11px] text-gray-500">
                  #{t.id} · {t.status} · {new Date(t.created_at).toLocaleString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
