import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, MessageSquare, CheckCircle } from "lucide-react";

interface TicketRow {
  id: number;
  status: string;
  subject: string;
  author_kind: string;
  contact_email: string;
  created_at: string;
  message_count?: number;
}

export default function DestekTalepleri() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ ticket: Record<string, unknown>; messages: Record<string, unknown>[] } | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/site/admin/support-tickets?page=${p}`);
      const d = await r.json();
      setTickets(d.tickets ?? []);
      setTotal(d.total ?? 0);
      setPage(p);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const openDetail = async (id: number) => {
    setSelected(id);
    setDetail(null);
    setReply("");
    try {
      const r = await fetch(`/api/site/admin/support-tickets/${id}`);
      const d = await r.json();
      setDetail({ ticket: d.ticket, messages: d.messages ?? [] });
    } catch {
      setDetail(null);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/site/admin/support-tickets/${selected}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: reply.trim(), status: "answered" }),
      });
      setReply("");
      void openDetail(selected);
      void load(page);
    } finally {
      setSaving(false);
    }
  };

  const closeTicket = async (id: number) => {
    await fetch(`/api/site/admin/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    void load(page);
    if (selected === id) void openDetail(id);
  };

  return (
    <AdminLayout title="Destek Talepleri">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Yekpare destek talepleri</h1>
            <p className="text-sm text-gray-500 mt-1">Üye, müşteri ve işletmelerden gelen kayıtlar</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void load(page)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Yenile
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ul className="divide-y max-h-[70vh] overflow-y-auto">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(t.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-1 ${selected === t.id ? "bg-indigo-50" : ""}`}
                    >
                      <span className="font-semibold text-gray-900">{t.subject}</span>
                      <span className="text-xs text-gray-500">
                        #{t.id} · {t.author_kind} · {t.contact_email} · {new Date(t.created_at).toLocaleString("tr-TR")}
                      </span>
                      <span className="text-[11px] uppercase font-bold text-indigo-700">{t.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {total > 40 && (
              <div className="p-3 border-t flex justify-center gap-2 text-sm">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
                  Önceki
                </Button>
                <span className="self-center text-gray-500">{page}</span>
                <Button variant="ghost" size="sm" disabled={page * 40 >= total} onClick={() => void load(page + 1)}>
                  Sonraki
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5 min-h-[320px]">
            {!selected && <p className="text-sm text-gray-500">Detay için soldan bir talep seçin.</p>}
            {selected && !detail && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
            {detail && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">{String(detail.ticket.subject ?? "")}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {String(detail.ticket.author_kind ?? "")} · {String(detail.ticket.contact_email ?? "")}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border p-3 text-sm whitespace-pre-wrap">
                  {String(detail.ticket.body ?? "")}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {detail.messages.map((m) => (
                    <div
                      key={String(m.id)}
                      className={`text-sm rounded-lg p-2 border ${m.author_role === "admin" ? "bg-indigo-50 border-indigo-100" : "bg-white border-gray-200"}`}
                    >
                      <span className="text-[10px] font-bold uppercase text-gray-500">{String(m.author_role)}</span>
                      <p className="whitespace-pre-wrap mt-1">{String(m.body ?? "")}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{String(m.created_at ?? "")}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Yanıt yaz</Label>
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="mt-1 min-h-[100px]" placeholder="Kullanıcıya dönüş metni…" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2" disabled={saving || !reply.trim()} onClick={() => void sendReply()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Yanıtı kaydet
                  </Button>
                  <Button variant="outline" className="gap-1" disabled={selected == null} onClick={() => selected != null && void closeTicket(selected)}>
                    <CheckCircle className="w-4 h-4" />
                    Kapat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
