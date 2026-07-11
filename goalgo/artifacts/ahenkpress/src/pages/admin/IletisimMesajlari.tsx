import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Check } from "lucide-react";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  page_source?: string | null;
  image_data?: string | null;
  hm_site_id?: number | null;
  hm_site_slug?: string | null;
}

export default function IletisimMesajlari() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/site/admin/contact-messages?page=${p}`).then((x) => x.json());
      setMessages(r.messages ?? []);
      setTotal(r.total ?? 0);
      setPage(p);
    } catch {
      setMessages([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const markRead = async (id: number) => {
    await fetch(`/api/site/admin/contact-messages/${id}/read`, { method: "PATCH" });
    void load(page);
  };

  return (
    <AdminLayout title="İletişim Mesajları">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">İletişim formu</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} kayıt · <span className="font-mono text-xs">/iletisim</span>,{" "}
              <span className="font-mono text-xs">/iletisim-kunye</span>,{" "}
              <span className="font-mono text-xs">/ucretsiz-haber-sitesi</span>,{" "}
              <span className="font-mono text-xs">/tr/…/iletisim</span> ve diğer formlar
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load(page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        {loading && messages.length === 0 ? (
          <p className="text-gray-500 py-12 text-center">Yükleniyor...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-500">
            <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            Henüz mesaj yok. Ziyaretçiler <code className="text-xs bg-white px-1 rounded">/iletisim</code>,{" "}
            <code className="text-xs bg-white px-1 rounded">/iletisim-kunye</code> veya haber merkezi{" "}
            <code className="text-xs bg-white px-1 rounded">/tr/…/iletisim</code> üzerinden yazabilir.
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border p-4 ${m.is_read ? "bg-white border-gray-100" : "bg-amber-50/80 border-amber-200"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-gray-900">{m.name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <a href={`mailto:${m.email}`} className="text-sm text-indigo-600 hover:underline">{m.email}</a>
                    {m.phone && (
                      <span className="text-sm text-gray-600 ml-2">{m.phone}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {m.hm_site_id != null && Number(m.hm_site_id) > 0 ? (
                      <span
                        className="text-[10px] font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded"
                        title={`Haber merkezi site id: ${m.hm_site_id}`}
                      >
                        HM · {m.hm_site_slug || `#${m.hm_site_id}`}
                      </span>
                    ) : null}
                    {m.page_source && (
                      <span className="text-[10px] font-mono uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {m.page_source}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleString("tr-TR")}
                    </span>
                    {!m.is_read && (
                      <Button size="sm" variant="secondary" className="h-8" onClick={() => void markRead(m.id)}>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Okundu
                      </Button>
                    )}
                  </div>
                </div>
                {m.subject && <p className="text-sm font-semibold text-gray-700 mb-1">{m.subject}</p>}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.message}</p>
                {m.image_data && String(m.image_data).startsWith("data:image/") && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Ek görsel</p>
                    <img src={m.image_data} alt="" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {total > 30 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Önceki
            </Button>
            <span className="text-sm text-gray-600 self-center px-2">
              Sayfa {page} / {Math.ceil(total / 30)}
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 30)} onClick={() => void load(page + 1)}>
              Sonraki
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
