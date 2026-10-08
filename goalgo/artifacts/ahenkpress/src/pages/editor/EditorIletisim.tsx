import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  EyeOff,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Newspaper,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Undo2,
} from "lucide-react";

/**
 * İletişim kutusu (2026-10-08): sitenin /iletisim formundan gelen mesajlar.
 * Kenar API: /api/hm/editor/site-contact/* — editör yalnızca kendi sitesinin mesajlarını görür.
 * Aynı mesajlar Posta kutusunda "İletişimden gelenler" klasöründe de durur. "Habere dönüştür" taslak haber açar
 * (asla otomatik yayın yok); resim ekleri kapak ve galeri olur.
 */

type Topic = "haber" | "duyuru" | "talep" | "sikayet" | "kariyer";
type Att = { id: number; name: string; mime: string; kind: string; size: number };
type Row = {
  id: number;
  topic: Topic;
  topicLabel: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  snippet?: string;
  message?: string;
  attachments: Att[];
  isRead: boolean;
  isTrashed: boolean;
  host: string | null;
  createdAt: string;
  convertedNewsId: number | null;
};
type ListResp = {
  topics: { key: Topic; label: string; total: number; unread: number }[];
  total: number;
  unread: number;
  messages: Row[];
};
type Status = "all" | "unread" | "read" | "trash";

const TOPIC_COLORS: Record<string, string> = {
  haber: "bg-blue-100 text-blue-800",
  duyuru: "bg-violet-100 text-violet-800",
  talep: "bg-amber-100 text-amber-800",
  sikayet: "bg-rose-100 text-rose-800",
  kariyer: "bg-emerald-100 text-emerald-800",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readHmJwt();
  if (!token) throw new Error("Oturum yok, lütfen yeniden giriş yapın.");
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

function kb(n: number): string {
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Ekler oturumla indirilir (bağlantı herkese açık değil); resimler önizlenir. */
function Attachments({ msgId, items }: { msgId: number; items: Att[] }) {
  const [urls, setUrls] = useState<Record<number, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    (async () => {
      const token = readHmJwt();
      for (const a of items) {
        try {
          const res = await fetch(apiUrl(`/api/hm/editor/site-contact/${msgId}/files/${a.id}`), { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) continue;
          const u = URL.createObjectURL(await res.blob());
          made.push(u);
          if (alive) setUrls((p) => ({ ...p, [a.id]: u }));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [msgId, items]);
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-700">
        <Paperclip className="h-4 w-4" /> Ekler ({items.length})
      </p>
      <div className="flex flex-wrap gap-3">
        {items.map((a) => (
          <a
            key={a.id}
            href={urls[a.id] || undefined}
            download={a.kind === "image" || a.kind === "pdf" ? undefined : a.name}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-40 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-xs hover:border-slate-400"
          >
            {a.kind === "image" && urls[a.id] ? (
              <img src={urls[a.id]} alt={a.name} className="h-28 w-full object-cover" />
            ) : (
              <span className="flex h-28 w-full items-center justify-center bg-slate-50 text-slate-500">
                {urls[a.id] ? <FileText className="h-8 w-8" /> : <Loader2 className="h-5 w-5 animate-spin" />}
              </span>
            )}
            <span className="flex items-center justify-between gap-1 px-2 py-1.5">
              <span className="truncate" title={a.name}>{a.name}</span>
              <span className="shrink-0 text-slate-400">{kb(a.size)}</span>
            </span>
            <span className="flex items-center gap-1 border-t border-slate-100 px-2 py-1 text-slate-500 group-hover:text-slate-800">
              <Download className="h-3 w-3" /> {a.kind === "image" || a.kind === "pdf" ? "Aç" : "İndir"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function EditorIletisim() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ListResp | null>(null);
  const [topic, setTopic] = useState<Topic | "">("");
  const [status, setStatus] = useState<Status>("all");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [converting, setConverting] = useState<"" | "plain" | "ai">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status, limit: "100" });
      if (topic) params.set("topic", topic);
      if (q) params.set("q", q);
      setData(await api<ListResp>(`/api/hm/editor/site-contact?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [status, topic, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const openMsg = useCallback(async (id: number) => {
    setError("");
    setInfo("");
    try {
      const d = await api<{ message: Row }>(`/api/hm/editor/site-contact/${id}`);
      setOpen(d.message);
      setData((p) => (p ? { ...p, messages: p.messages.map((m) => (m.id === id ? { ...m, isRead: true } : m)) } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // /editor/iletisim?id=N (posta kopyasındaki bağlantı) doğrudan mesajı açar.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("id"));
    if (Number.isFinite(id) && id > 0) void openMsg(id);
  }, [openMsg]);

  async function patch(id: number, body: { isRead?: boolean; isTrashed?: boolean }, note: string) {
    try {
      await api(`/api/hm/editor/site-contact/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setInfo(note);
      window.setTimeout(() => setInfo(""), 4000);
      if (body.isTrashed !== undefined || body.isRead === false) setOpen(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function toNews(msg: Row, ai: boolean) {
    setConverting(ai ? "ai" : "plain");
    setError("");
    try {
      const d = await api<{ newsId: number; editUrl: string; images: number; notes?: string[] }>(`/api/hm/editor/site-contact/${msg.id}/to-news`, {
        method: "POST",
        body: JSON.stringify({ ai }),
      });
      setOpen({ ...msg, convertedNewsId: d.newsId });
      const extra = [d.images ? `${d.images} görsel eklendi` : "", ...(d.notes ?? [])].filter(Boolean).join(" · ");
      setInfo(`Taslak haber oluşturuldu${extra ? ` (${extra})` : ""}. Haber formu açılıyor…`);
      window.setTimeout(() => setLocation(d.editUrl), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConverting("");
    }
  }

  const topics = data?.topics ?? [];
  const statusTabs: { id: Status; label: string }[] = useMemo(
    () => [
      { id: "all", label: "Tümü" },
      { id: "unread", label: `Okunmamış${data?.unread ? ` (${data.unread})` : ""}` },
      { id: "read", label: "Okunmuş" },
      { id: "trash", label: "Gizlenenler" },
    ],
    [data?.unread],
  );

  return (
    <EditorLayout title="İletişim">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-black text-slate-900">
              <Inbox className="h-5 w-5" /> İletişim formundan gelenler
            </p>
            <p className="text-sm text-slate-500">
              Sitenizin /iletisim sayfasındaki formdan gelen mesajlar. Aynı mesajlar Posta kutusunda “İletişimden gelenler” klasöründe de durur.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Yenile
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTopic("")}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${topic === "" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
          >
            Tüm konular{data ? ` · ${data.total}` : ""}
          </button>
          {topics.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTopic(t.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${topic === t.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {t.label} · {t.total}
              {t.unread ? <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">{t.unread}</span> : null}
            </button>
          ))}
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qDraft.trim());
            }}
          >
            <Input value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Ad, e-posta veya metin ara" className="h-9 w-56" />
            <Button type="submit" variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {statusTabs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(s.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${status === s.id ? "border-slate-900 font-bold text-slate-900" : "border-transparent text-slate-500"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {info ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <ul className={`divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white ${open ? "hidden lg:block" : ""}`}>
            {!loading && (data?.messages.length ?? 0) === 0 ? (
              <li className="p-8 text-center text-sm text-slate-500">Bu görünümde mesaj yok.</li>
            ) : null}
            {(data?.messages ?? []).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void openMsg(m.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 ${open?.id === m.id ? "bg-slate-50" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    {!m.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Okunmamış" /> : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TOPIC_COLORS[m.topic] || "bg-slate-100"}`}>{m.topicLabel}</span>
                    <span className={`truncate text-sm ${m.isRead ? "text-slate-700" : "font-bold text-slate-900"}`}>{m.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-slate-400">{fmtDate(m.createdAt)}</span>
                  </span>
                  <span className={`truncate text-sm ${m.isRead ? "text-slate-600" : "font-semibold text-slate-800"}`}>{m.title || m.snippet}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    {m.attachments.length ? (
                      <span className="flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" /> {m.attachments.length}
                      </span>
                    ) : null}
                    {m.convertedNewsId ? (
                      <span className="flex items-center gap-0.5 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Habere dönüştürüldü
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${open ? "" : "hidden lg:block"}`}>
            {!open ? (
              <p className="py-16 text-center text-sm text-slate-500">Okumak için soldan bir mesaj seçin.</p>
            ) : (
              <div>
                <button type="button" className="mb-3 flex items-center gap-1 text-sm text-slate-500 lg:hidden" onClick={() => setOpen(null)}>
                  <ArrowLeft className="h-4 w-4" /> Listeye dön
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TOPIC_COLORS[open.topic] || "bg-slate-100"}`}>{open.topicLabel}</span>
                  <span className="text-xs text-slate-400">{fmtDate(open.createdAt)}</span>
                  {open.host ? <span className="text-xs text-slate-400">· {open.host}/iletisim</span> : null}
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-900">{open.title || "(Başlıksız mesaj)"}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{open.name}</span>
                  <a className="flex items-center gap-1 underline" href={`mailto:${open.email}`}>
                    <Mail className="h-3.5 w-3.5" /> {open.email}
                  </a>
                  {open.phone ? (
                    <a className="flex items-center gap-1 underline" href={`tel:${open.phone.replace(/[^0-9+]/g, "")}`}>
                      <Phone className="h-3.5 w-3.5" /> {open.phone}
                    </a>
                  ) : null}
                </div>
                <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-800">{open.message}</div>
                <Attachments msgId={open.id} items={open.attachments} />

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {open.convertedNewsId ? (
                    <Button variant="outline" onClick={() => setLocation(`/editor/haberler/${open.convertedNewsId}/duzenle`)}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Habere dönüştürüldü · taslağı aç
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => void toNews(open, false)} disabled={!!converting}>
                        {converting === "plain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />} Habere dönüştür
                      </Button>
                      <Button variant="outline" onClick={() => void toNews(open, true)} disabled={!!converting}>
                        {converting === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI ile düzenle
                      </Button>
                    </>
                  )}
                  <Button variant="outline" asChild>
                    <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.title || open.topicLabel}`)}`}>
                      <Mail className="h-4 w-4" /> Yanıtla
                    </a>
                  </Button>
                  <Button variant="ghost" onClick={() => void patch(open.id, { isRead: false }, "Okunmadı olarak işaretlendi.")}>
                    <MailOpen className="h-4 w-4" /> Okunmadı yap
                  </Button>
                  {open.isTrashed ? (
                    <Button variant="ghost" onClick={() => void patch(open.id, { isTrashed: false }, "Mesaj geri alındı.")}>
                      <Undo2 className="h-4 w-4" /> Geri al
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => void patch(open.id, { isTrashed: true }, "Mesaj gizlendi (Gizlenenler sekmesinden geri alınabilir).")}>
                      <EyeOff className="h-4 w-4" /> Gizle
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Habere dönüştür: başlık, metin ve resim ekleri (ilk resim kapak) <strong>taslak</strong> habere aktarılır; yayını siz yaparsınız. AI ile düzenle metni haber diline çevirir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </EditorLayout>
  );
}
