import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Newspaper,
  Sparkles,
  Inbox,
  Loader2,
  MailPlus,
  PenSquare,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";

/**
 * Site posta kutusu — editör panelinin içinde, şifre sormadan.
 * Kenar API: /api/hm/editor/site-mail/* (editör oturumu hangi kutulara erişileceğini belirler).
 * Aynı kutular yekpare.net/posta ile ortaktır (Cloudflare Email Routing → Yekpare Posta).
 */

type Box = { address: string; displayName: string; isDefault: boolean; canReceive: boolean | null; note: string; missing?: boolean };
type Folder = "inbox" | "sent" | "starred" | "trash";
type MsgRow = {
  id: number;
  direction: string;
  from_addr: string;
  to_addr: string;
  subject: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_trashed: boolean;
  created_at: string;
  snippet: string | null;
  converted_news_id?: number | null;
};
type MsgFull = {
  id: number;
  direction: string;
  from: string;
  to: string;
  subject: string | null;
  text: string | null;
  html: string | null;
  isStarred: boolean;
  isTrashed: boolean;
  createdAt: string;
  messageId: string | null;
  box: string;
  convertedNewsId?: number | null;
};

const FOLDERS: { id: Folder; label: string }[] = [
  { id: "inbox", label: "Gelen kutusu" },
  { id: "sent", label: "Gönderilen" },
  { id: "starred", label: "Yıldızlı" },
  { id: "trash", label: "Çöp kutusu" },
];

async function mailFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })
    : d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
}

function shortAddr(raw: string): string {
  const m = String(raw ?? "").match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  return (m?.[1] || raw || "").trim();
}

function replyAddress(raw: string): string {
  const m = String(raw ?? "").match(/<([^>]+)>/);
  return (m?.[1] || raw || "").trim();
}

/** HTML gövde: script çalışmayan, ayrı bir iframe içinde. */
function HtmlBody({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:14px/1.5 system-ui,sans-serif;color:#0f172a;margin:0;padding:12px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
  return <iframe title="E-posta" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} className="h-[60vh] w-full rounded border border-slate-200 bg-white" />;
}

export default function EditorPostaKutusu() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [createDomains, setCreateDomains] = useState<string[]>([]);
  const [canSend, setCanSend] = useState(true);
  const [box, setBox] = useState<string>("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState<MsgFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [cTo, setCTo] = useState("");
  const [cCc, setCCc] = useState("");
  const [cSubj, setCSubj] = useState("");
  const [cBody, setCBody] = useState("");
  const [cReplyId, setCReplyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [newLocal, setNewLocal] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState<"" | "plain" | "ai">("");
  const [, setLocation] = useLocation();

  const currentBox = useMemo(() => boxes.find((b) => b.address === box) ?? null, [boxes, box]);

  const loadBoxes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await mailFetch<{ boxes: Box[]; createDomains: string[]; canSend: boolean }>("/api/hm/editor/site-mail");
      setBoxes(d.boxes ?? []);
      setCreateDomains(d.createDomains ?? []);
      setCanSend(d.canSend !== false);
      setNewDomain((prev) => prev || d.createDomains?.[0] || "");
      setBox((prev) => (prev && d.boxes.some((b) => b.address === prev) ? prev : d.boxes.find((b) => !b.missing)?.address || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    if (!box || currentBox?.missing) {
      setRows([]);
      return;
    }
    setListLoading(true);
    try {
      const params = new URLSearchParams({ box, folder, limit: "60" });
      if (q.trim()) params.set("q", q.trim());
      const d = await mailFetch<{ messages: MsgRow[]; unread: number }>(`/api/hm/editor/site-mail/messages?${params}`);
      setRows(d.messages ?? []);
      setUnread(d.unread ?? 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setListLoading(false);
    }
  }, [box, folder, q, currentBox?.missing]);

  useEffect(() => {
    void loadBoxes();
  }, [loadBoxes]);

  useEffect(() => {
    setOpen(null);
    void loadList();
  }, [box, folder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(() => void loadList(), 60_000);
    return () => window.clearInterval(t);
  }, [loadList]);

  async function openMessage(id: number) {
    try {
      const d = await mailFetch<{ message: MsgFull }>(`/api/hm/editor/site-mail/messages/${id}`);
      setOpen(d.message);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function patchMessage(id: number, patch: { isRead?: boolean; isStarred?: boolean; isTrashed?: boolean }) {
    await mailFetch(`/api/hm/editor/site-mail/messages/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (patch.isTrashed !== undefined) setOpen(null);
    else if (open?.id === id && patch.isStarred !== undefined) setOpen({ ...open, isStarred: patch.isStarred });
    await loadList();
  }

  function startCompose(reply?: MsgFull) {
    if (reply) {
      setCTo(replyAddress(reply.direction === "out" ? reply.to : reply.from));
      const s = reply.subject ?? "";
      setCSubj(/^(re|ynt):/i.test(s) ? s : `Re: ${s}`.trim());
      const quoted = (reply.text || (reply.html ?? "").replace(/<[^>]+>/g, " ")).slice(0, 4000).split("\n").map((l) => `> ${l}`).join("\n");
      setCBody(`\n\n${fmtDate(reply.createdAt)} tarihinde ${reply.from} yazdı:\n${quoted}`);
      setCReplyId(reply.messageId);
    } else {
      setCTo("");
      setCSubj("");
      setCBody("");
      setCReplyId(null);
    }
    setCCc("");
    setComposeOpen(true);
  }

  async function send() {
    setSending(true);
    setError("");
    try {
      const html = cBody
        .split("\n")
        .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
        .join("<br>");
      await mailFetch("/api/hm/editor/site-mail/send", {
        method: "POST",
        body: JSON.stringify({ from: box, to: cTo, cc: cCc, subject: cSubj, text: cBody, html, inReplyTo: cReplyId }),
      });
      setComposeOpen(false);
      setInfo("E-posta gönderildi.");
      window.setTimeout(() => setInfo(""), 4000);
      if (folder === "sent") void loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  /** "Habere dönüştür": taslak haber açılır (asla otomatik yayın yok), editör haber formunda gözden geçirip yayınlar. */
  async function convertToNews(msg: MsgFull, ai: boolean) {
    setConverting(ai ? "ai" : "plain");
    setError("");
    try {
      const d = await mailFetch<{ newsId: number; editUrl: string; images: number; aiUsed: boolean; notes?: string[] }>(
        `/api/hm/editor/site-mail/messages/${msg.id}/to-news`,
        { method: "POST", body: JSON.stringify({ ai }) },
      );
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

  async function createBox() {
    setCreating(true);
    setError("");
    try {
      const d = await mailFetch<{ address: string; canReceive: boolean | null; note: string }>("/api/hm/editor/site-mail/boxes", {
        method: "POST",
        body: JSON.stringify({ localPart: newLocal, domain: newDomain, displayName: newName }),
      });
      setNewOpen(false);
      setNewLocal("");
      setNewName("");
      setInfo(`${d.address} açıldı.${d.note ? ` ${d.note}` : ""}`);
      window.setTimeout(() => setInfo(""), 6000);
      await loadBoxes();
      setBox(d.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <EditorLayout title="Posta kutusu">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <p className="font-black text-slate-900">Sitenin e-posta kutusu</p>
            <p className="text-xs text-slate-500">
              Şifre gerekmez; editör girişinizle sitenizin kutuları açılır. Aynı kutular yekpare.net/posta ile ortaktır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void loadList()} disabled={listLoading || !box}>
              {listLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Yenile
            </Button>
            {createDomains.length > 0 ? (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setNewOpen((v) => !v)}>
                <MailPlus className="h-4 w-4" />
                Yeni mail adresi aç
              </Button>
            ) : null}
            <Button type="button" size="sm" className="gap-1.5 bg-slate-900 text-white" onClick={() => startCompose()} disabled={!box || !canSend || !!currentBox?.missing}>
              <PenSquare className="h-4 w-4" />
              Yeni e-posta
            </Button>
          </div>
        </div>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {info ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}

        {newOpen ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="font-semibold text-slate-900">Yeni mail adresi aç</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Adres</Label>
                <Input value={newLocal} onChange={(e) => setNewLocal(e.target.value.toLowerCase())} placeholder="haber" className="w-40" />
              </div>
              <span className="pb-2 text-slate-500">@</span>
              <div className="space-y-1">
                <Label className="text-xs">Alan adı</Label>
                <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm">
                  {createDomains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Görünen ad (isteğe bağlı)</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Haber Masası" className="w-48" />
              </div>
              <Button type="button" className="bg-slate-900 text-white" disabled={creating || !newLocal.trim()} onClick={() => void createBox()}>
                {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Aç
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Posta kutusu açılıyor…
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                {boxes.map((b) => (
                  <button
                    key={b.address}
                    type="button"
                    onClick={() => setBox(b.address)}
                    className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${box === b.address ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
                  >
                    <span className="block truncate font-semibold">{b.address}</span>
                    {b.canReceive === false ? (
                      <span className={`mt-0.5 flex items-center gap-1 text-[11px] ${box === b.address ? "text-amber-200" : "text-amber-700"}`}>
                        <AlertTriangle className="h-3 w-3" /> E-posta alamıyor
                      </span>
                    ) : null}
                  </button>
                ))}
                {boxes.length === 0 ? <p className="p-2 text-xs text-slate-500">Bu sitede posta kutusu yok.</p> : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                {FOLDERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFolder(f.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${folder === f.id ? "bg-slate-100 font-bold" : "hover:bg-slate-50"}`}
                  >
                    {f.label}
                    {f.id === "inbox" && unread > 0 ? <span className="rounded-full bg-red-600 px-2 text-[11px] font-bold text-white">{unread}</span> : null}
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 space-y-3">
              {currentBox?.note ? (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {currentBox.note}
                </p>
              ) : null}

              {composeOpen ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <p className="text-xs text-slate-500">
                    Gönderen: <strong>{box}</strong>
                  </p>
                  <Input value={cTo} onChange={(e) => setCTo(e.target.value)} placeholder="Kime (virgülle birden fazla)" />
                  <Input value={cCc} onChange={(e) => setCCc(e.target.value)} placeholder="Bilgi (CC, isteğe bağlı)" />
                  <Input value={cSubj} onChange={(e) => setCSubj(e.target.value)} placeholder="Konu" />
                  <Textarea value={cBody} onChange={(e) => setCBody(e.target.value)} className="min-h-[220px]" placeholder="Mesajınız…" />
                  <div className="flex gap-2">
                    <Button type="button" className="gap-1.5 bg-slate-900 text-white" disabled={sending || !cTo.trim() || !cSubj.trim()} onClick={() => void send()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Gönder
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : null}

              {open ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(null)}>
                      <ArrowLeft className="h-4 w-4" /> Listeye dön
                    </Button>
                    {canSend ? (
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose(open)}>
                        <Reply className="h-4 w-4" /> Yanıtla
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void patchMessage(open.id, { isStarred: !open.isStarred })}>
                      <Star className={`h-4 w-4 ${open.isStarred ? "fill-amber-400 text-amber-500" : ""}`} /> {open.isStarred ? "Yıldızı kaldır" : "Yıldızla"}
                    </Button>
                    {open.direction === "in" ? (
                      open.convertedNewsId ? (
                        <Link href={`/editor/haberler/${open.convertedNewsId}/duzenle`}>
                          <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" /> Habere dönüştürüldü · taslağı aç
                          </span>
                        </Link>
                      ) : (
                        <>
                          <Button type="button" size="sm" className="gap-1.5 bg-red-700 text-white hover:bg-red-800" disabled={!!converting} onClick={() => void convertToNews(open, false)}>
                            {converting === "plain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />} Habere dönüştür
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!!converting} onClick={() => void convertToNews(open, true)} title="Evren AI başlık, spot ve metni haber diline çevirir; taslak olarak kaydedilir.">
                            {converting === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI ile düzenle
                          </Button>
                        </>
                      )
                    ) : null}
                    {open.isTrashed ? (
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void patchMessage(open.id, { isTrashed: false })}>
                        <Undo2 className="h-4 w-4" /> Geri al
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-red-700" onClick={() => void patchMessage(open.id, { isTrashed: true })}>
                        <Trash2 className="h-4 w-4" /> Çöpe at
                      </Button>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{open.subject || "(konu yok)"}</p>
                    <p className="text-xs text-slate-500">
                      {open.direction === "out" ? "Kime" : "Kimden"}: {open.direction === "out" ? open.to : open.from} · {new Date(open.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    </p>
                  </div>
                  {open.direction === "in" && !open.convertedNewsId ? (
                    <p className="text-[11px] text-slate-500">
                      Habere dönüştür: konu başlık, metin haber gövdesi olur (imza/yasal uyarı ayıklanır), e-postadaki görseller kapak ve galeriye eklenir, kategori önerilir. Haber <strong>taslak</strong> kaydedilir; yayını siz yaparsınız.
                    </p>
                  ) : null}
                  {open.html ? <HtmlBody html={open.html} /> : <pre className="whitespace-pre-wrap break-words text-sm text-slate-800">{open.text || ""}</pre>}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <form
                    className="flex items-center gap-2 border-b border-slate-100 p-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void loadList();
                    }}
                  >
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Postalarda ara" className="h-8 border-0 shadow-none focus-visible:ring-0" />
                  </form>
                  {listLoading && rows.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-10 text-sm text-slate-500">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      Bu klasörde e-posta yok.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {rows.map((m) => (
                        <li key={m.id}>
                          <button type="button" onClick={() => void openMessage(m.id)} className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${m.is_read ? "" : "bg-blue-50/40"}`}>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${m.is_read ? "text-slate-700" : "font-bold text-slate-900"}`}>
                                {folder === "sent" ? `Kime: ${m.to_addr}` : shortAddr(m.from_addr)}
                              </span>
                              <span className={`block truncate text-sm ${m.is_read ? "text-slate-600" : "font-semibold text-slate-900"}`}>{m.subject || "(konu yok)"}</span>
                              <span className="block truncate text-xs text-slate-400">{(m.snippet ?? "").replace(/\s+/g, " ")}</span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-slate-400">
                              {fmtDate(m.created_at)}
                              {m.is_starred ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : null}
                              {m.converted_news_id ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" /> Habere dönüştürüldü
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </EditorLayout>
  );
}
