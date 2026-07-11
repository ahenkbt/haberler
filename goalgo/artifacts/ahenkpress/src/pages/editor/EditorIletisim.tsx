import { useCallback, useEffect, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Check, Mail, RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  page_source?: string | null;
};

async function hmEditorFetch(path: string, init?: RequestInit) {
  const token = readHmJwt();
  if (!token) throw new Error("Oturum yok");
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export default function EditorIletisim() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError("");
    try {
      const r = (await hmEditorFetch(`/api/hm/editor/contact-messages?page=${p}`)) as {
        messages?: ContactMessage[];
        total?: number;
      };
      setMessages(r.messages ?? []);
      setTotal(r.total ?? 0);
      setPage(p);
    } catch (err) {
      setMessages([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const markRead = async (id: number) => {
    await hmEditorFetch(`/api/hm/editor/contact-messages/${id}/read`, { method: "PATCH" });
    void load(page);
  };

  const isTalep = (m: ContactMessage) =>
    String(m.page_source ?? "").includes("/talep-formu") || String(m.subject ?? "").startsWith("[Talep]");

  return (
    <EditorLayout title="İletişim">
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">İletişim ve talepler</h1>
            <p className="mt-1 text-sm text-slate-500">
              {total} kayıt — iletişim formu ve talep formu mesajları
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading && messages.length === 0 ? (
          <p className="py-12 text-center text-slate-500">Yükleniyor…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <Mail className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            Henüz mesaj yok. Ziyaretçiler talep formu veya iletişim sayfasından yazabilir.
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border p-4 ${m.is_read ? "border-slate-100 bg-white" : "border-amber-200 bg-amber-50/80"}`}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <a href={`mailto:${m.email}`} className="text-sm text-red-600 hover:underline">
                      {m.email}
                    </a>
                    {m.phone ? <span className="ml-2 text-sm text-slate-600">{m.phone}</span> : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isTalep(m) ? (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800">
                        Talep formu
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-500">
                        {m.page_source || "iletisim"}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString("tr-TR")}</span>
                    {!m.is_read ? (
                      <Button size="sm" variant="secondary" className="h-8" onClick={() => void markRead(m.id)}>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Okundu
                      </Button>
                    ) : null}
                  </div>
                </div>
                {m.subject ? <p className="mb-1 text-sm font-semibold text-slate-700">{m.subject}</p> : null}
                <p className="whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
              </li>
            ))}
          </ul>
        )}

        {total > 30 ? (
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Önceki
            </Button>
            <span className="self-center px-2 text-sm text-slate-600">
              Sayfa {page} / {Math.ceil(total / 30)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / 30)}
              onClick={() => void load(page + 1)}
            >
              Sonraki
            </Button>
          </div>
        ) : null}
      </div>
    </EditorLayout>
  );
}
