import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GmailInboxPanel } from "@/components/admin/GmailInboxPanel";
import { GmailMailCompose } from "@/components/admin/GmailMailCompose";
import { Loader2, Mail, Megaphone, PenSquare, Users, Wifi } from "lucide-react";

type MailMsg = {
  id: number;
  direction: string;
  from_addr: string;
  to_addr: string;
  subject: string | null;
  body_text: string | null;
  is_read: boolean;
  created_at: string;
};

type MailboxConfig = {
  address: string;
  fromDisplay: string;
  smtpConfigured: boolean;
  imapConfigured: boolean;
  ready: boolean;
  smtpHost: string | null;
  imapHost: string | null;
  imapFolder: string;
  source: string;
};

type Ann = { id: number; title: string; body: string; active: boolean; sort_order: number };
type BulkRun = {
  id: number;
  template: string;
  recipients_count: number;
  wa_requested: boolean;
  email_requested: boolean;
  whatsapp_sent: number;
  email_sent: number;
  created_at: string;
};

export default function AdminPostaVeDuyurular() {
  const [tab, setTab] = useState("posta");
  const [messages, setMessages] = useState<MailMsg[]>([]);
  const [mailboxConfig, setMailboxConfig] = useState<MailboxConfig | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(true);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubj, setComposeSubj] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const [annList, setAnnList] = useState<Ann[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  const [tpl, setTpl] = useState("Merhaba [isim soyisim],\n\nYekpare üzerinden kısa bir bilgilendirme.");
  const [wa, setWa] = useState(true);
  const [em, setEm] = useState(true);
  const [bulkLines, setBulkLines] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkRes, setBulkRes] = useState<string | null>(null);
  const [bulkHistory, setBulkHistory] = useState<BulkRun[]>([]);

  const loadMail = useCallback(async () => {
    const res = await fetch("/api/site/admin/mailbox?limit=60", { credentials: "include" });
    const d = await res.json().catch(() => ({}));
    setMessages(Array.isArray(d.messages) ? d.messages : []);
    if (d.config && typeof d.config === "object") setMailboxConfig(d.config as MailboxConfig);
  }, []);

  const loadAnn = useCallback(async () => {
    const res = await fetch("/api/site/admin/home-announcements", { credentials: "include" });
    const d = await res.json().catch(() => ({}));
    setAnnList(Array.isArray(d.announcements) ? d.announcements : []);
  }, []);

  const loadBulkHistory = useCallback(async () => {
    const res = await fetch("/api/site/admin/marketing/bulk-history?limit=25", { credentials: "include" });
    const d = await res.json().catch(() => ({}));
    setBulkHistory(Array.isArray(d.runs) ? d.runs : []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadMail(), loadAnn(), loadBulkHistory()]);
    } finally {
      setLoading(false);
    }
  }, [loadMail, loadAnn, loadBulkHistory]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab !== "posta") return;
    const t = window.setInterval(() => {
      void syncImap(true);
    }, 180_000);
    return () => window.clearInterval(t);
  }, [tab]);

  function extractReplyEmail(from: string): string {
    const m = from.match(/<([^>]+)>/);
    if (m?.[1]) return m[1].trim();
    if (from.includes("@")) return from.trim();
    return from.trim();
  }

  function clearCompose() {
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeSubj("");
    setComposeBody("");
  }

  function replyToMessage(m: MailMsg) {
    const addr = extractReplyEmail(m.from_addr);
    const subj = m.subject?.startsWith("Re:") ? m.subject : `Re: ${m.subject ?? ""}`.trim();
    setComposeOpen(true);
    setComposeTo(addr);
    setComposeCc("");
    setComposeBcc("");
    setComposeSubj(subj);
    setComposeBody(
      `\n\n---\n${new Date(m.created_at).toLocaleString("tr-TR")} · ${m.from_addr}\n${(m.body_text ?? "").slice(0, 4000)}`,
    );
    setSelectedId(m.id);
  }

  async function testConnection() {
    setTestingConn(true);
    setConnStatus(null);
    try {
      const res = await fetch("/api/site/admin/mailbox/test-connection", { method: "POST", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      const smtpOk = d.smtp?.ok;
      const imapOk = d.imap?.ok;
      setConnStatus(
        `SMTP: ${smtpOk ? "OK" : d.smtp?.error ?? "hata"} · IMAP: ${imapOk ? "OK" : d.imap?.error ?? "hata"}`,
      );
    } finally {
      setTestingConn(false);
    }
  }

  async function markMailRead(id: number) {
    await fetch(`/api/site/admin/mailbox/${id}/read`, { method: "PATCH", credentials: "include" });
    await loadMail();
  }

  async function syncImap(silent = false) {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/site/admin/mailbox/sync-imap", { method: "POST", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) alert(d.error ?? "Hata");
      } else if (!silent) {
        alert(`Çekilen: ${d.fetched ?? 0}, yeni: ${d.inserted ?? 0}`);
      }
      await loadMail();
    } finally {
      setSyncing(false);
    }
  }

  async function sendMail() {
    setSending(true);
    try {
      const recipients = [composeTo.trim(), ...composeCc.split(/[,;]/).map((s) => s.trim())].filter(Boolean).join(", ");
      const res = await fetch("/api/site/admin/mailbox/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject: composeSubj,
          bodyHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">${composeBody.replace(/\n/g, "<br/>")}</div>`,
          bodyText: composeBody,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error ?? "Gönderilemedi");
      else {
        clearCompose();
        setComposeOpen(false);
        await loadMail();
      }
    } finally {
      setSending(false);
    }
  }

  async function addAnn() {
    if (!annTitle.trim() || !annBody.trim()) return;
    const res = await fetch("/api/site/admin/home-announcements", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: annTitle, body: annBody, announcementType: "general", active: true, sortOrder: 0 }),
    });
    if (res.ok) {
      setAnnTitle("");
      setAnnBody("");
      await loadAnn();
    }
  }

  async function toggleAnn(id: number, active: boolean) {
    await fetch(`/api/site/admin/home-announcements/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await loadAnn();
  }

  async function delAnn(id: number) {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/site/admin/home-announcements/${id}`, { method: "DELETE", credentials: "include" });
    await loadAnn();
  }

  async function pullCustomers() {
    const res = await fetch("/api/site/admin/marketing/customers-export?limit=800", { credentials: "include" });
    const d = await res.json().catch(() => ({}));
    const rows = (d.customers as { name?: string; phone?: string; email?: string }[]) ?? [];
    setBulkLines(rows.map((c) => `${(c.name || "").trim()}\t${(c.phone || "").trim()}\t${(c.email || "").trim()}`).join("\n"));
  }

  function parseRecipients() {
    const out: { fullName: string; phone: string; email: string }[] = [];
    for (const line of bulkLines.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const parts = t.split(/\t+|,|;|\s{2,}/).map((x) => x.trim());
      const fullName = parts[0] || "";
      const phone = parts[1] || "";
      const email = parts.find((p) => p.includes("@")) || "";
      if (fullName || phone || email) out.push({ fullName: fullName || "Müşteri", phone, email });
    }
    return out;
  }

  async function runBulk() {
    const recipients = parseRecipients();
    if (!recipients.length) {
      alert("Satır: Ad Soyad<TAB>telefon<TAB>e-posta");
      return;
    }
    setBulkBusy(true);
    setBulkRes(null);
    try {
      const res = await fetch("/api/site/admin/marketing/bulk-customers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: tpl, channels: { wa, email: em }, recipients }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setBulkRes(d.error ?? "Hata");
      else {
        setBulkRes(`WhatsApp: ${d.whatsappSent ?? 0}, E-posta: ${d.emailSent ?? 0}`);
        await loadBulkHistory();
      }
    } catch {
      setBulkRes("Bağlantı hatası");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <AdminLayout title="Posta ve duyurular">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Posta, anasayfa duyuruları ve toplu müşteri mesajı</h1>
        {mailboxConfig ? (
          <div className="mb-4 rounded-xl border bg-gradient-to-r from-sky-50 to-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Site posta kutusu</p>
              <p className="text-lg font-bold text-gray-900">{mailboxConfig.address}</p>
              <p className="text-xs text-gray-600 mt-1">
                Gönderen: {mailboxConfig.fromDisplay}
                {mailboxConfig.smtpHost ? ` · SMTP ${mailboxConfig.smtpHost}` : null}
                {mailboxConfig.imapHost ? ` · IMAP ${mailboxConfig.imapHost}` : null}
              </p>
              {!mailboxConfig.ready ? (
                <p className="text-xs text-amber-700 mt-1">
                  Railway api-server ortam değişkenlerinde SMTP_USER, SMTP_PASS ve IMAP ayarlarını tanımlayın (bkz. docs/MAILBOX_BILGI_SETUP.md).
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => void testConnection()} disabled={testingConn}>
                {testingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 mr-1" />}
                Bağlantı testi
              </Button>
              {connStatus ? <span className="text-xs text-gray-600 max-w-xs">{connStatus}</span> : null}
            </div>
          </div>
        ) : null}
        <p className="text-sm text-gray-600 mb-6">
          Gelen kutusu IMAP ile senkron edilir; gönderim aynı hesabın SMTP bilgilerini kullanır. Ortam değişkenleri veya{" "}
          <strong>Genel Ayarlar → Entegrasyonlar</strong> kayıtları geçerlidir.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="posta" className="gap-2">
              <Mail className="w-4 h-4" />
              Gelen kutusu
            </TabsTrigger>
            <TabsTrigger value="duyuru" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Site duyuruları
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Users className="w-4 h-4" />
              Toplu müşteri
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posta">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            ) : (
              <div className="relative">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-2xl bg-[#c2e7ff] px-5 text-[#001d35] shadow-sm hover:bg-[#a8daff]"
                    onClick={() => {
                      clearCompose();
                      setComposeOpen(true);
                    }}
                  >
                    <PenSquare className="mr-2 h-4 w-4" />
                    Yeni ileti
                  </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <GmailInboxPanel
                    messages={messages}
                    selectedId={selectedId}
                    syncing={syncing}
                    onRefresh={() => void loadMail()}
                    onSync={() => void syncImap()}
                    onSelect={(id, isRead) => {
                      setSelectedId(id);
                      if (!isRead) void markMailRead(id);
                    }}
                    onReply={replyToMessage}
                  />
                </div>

                {composeOpen ? (
                  <GmailMailCompose
                    className="fixed bottom-0 right-4 z-50 hidden sm:flex lg:right-8"
                    fromAddress={mailboxConfig?.address}
                    to={composeTo}
                    cc={composeCc}
                    bcc={composeBcc}
                    subject={composeSubj}
                    body={composeBody}
                    sending={sending}
                    onToChange={setComposeTo}
                    onCcChange={setComposeCc}
                    onBccChange={setComposeBcc}
                    onSubjectChange={setComposeSubj}
                    onBodyChange={setComposeBody}
                    onSend={() => void sendMail()}
                    onDiscard={() => {
                      clearCompose();
                      setComposeOpen(false);
                    }}
                  />
                ) : null}

                {composeOpen ? (
                  <div className="mt-4 sm:hidden">
                    <GmailMailCompose
                      fromAddress={mailboxConfig?.address}
                      to={composeTo}
                      cc={composeCc}
                      bcc={composeBcc}
                      subject={composeSubj}
                      body={composeBody}
                      sending={sending}
                      onToChange={setComposeTo}
                      onCcChange={setComposeCc}
                      onBccChange={setComposeBcc}
                      onSubjectChange={setComposeSubj}
                      onBodyChange={setComposeBody}
                      onSend={() => void sendMail()}
                      onDiscard={() => {
                        clearCompose();
                        setComposeOpen(false);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="duyuru">
            <div className="bg-white border rounded-xl p-5 space-y-4 mb-6">
              <h3 className="font-bold">Yeni site duyurusu</h3>
              <Input placeholder="Başlık" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
              <Textarea placeholder="Metin" value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="min-h-[100px]" />
              <Button onClick={() => void addAnn()} className="bg-amber-600 hover:bg-amber-700 text-white">
                Ekle
              </Button>
            </div>
            <ul className="space-y-2">
              {annList.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 bg-gray-50 border rounded-lg p-3">
                  <div>
                    <p className="font-bold">{a.title}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-gray-500 mt-1">{a.active ? "Aktif" : "Pasif"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => void toggleAnn(a.id, a.active)}>
                      {a.active ? "Pasif" : "Aktif"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void delAnn(a.id)}>
                      Sil
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="bg-slate-900 text-white rounded-xl p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Kayıtlı müşterileri çekin veya tablo yapıştırın. Yer tutucu: <code className="bg-white/10 px-1 rounded">[isim soyisim]</code>,{" "}
                <code className="bg-white/10 px-1 rounded">[ad]</code>, <code className="bg-white/10 px-1 rounded">[soyad]</code>
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} />
                  WhatsApp (site CallMeBot)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={em} onChange={(e) => setEm(e.target.checked)} />
                  E-posta (site SMTP)
                </label>
              </div>
              <Textarea value={tpl} onChange={(e) => setTpl(e.target.value)} className="min-h-[120px] bg-white/5 border-white/20 text-white" />
              <Button variant="secondary" size="sm" onClick={() => void pullCustomers()}>
                Kayıtlı müşterileri çek
              </Button>
              <Textarea
                value={bulkLines}
                onChange={(e) => setBulkLines(e.target.value)}
                placeholder="Ad Soyad[TAB]telefon[TAB]email"
                className="min-h-[200px] font-mono text-xs bg-white/5 border-white/20 text-white"
              />
              {bulkRes && <p className="text-amber-300 text-sm">{bulkRes}</p>}
              <Button onClick={() => void runBulk()} disabled={bulkBusy} className="bg-amber-500 text-black font-bold">
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gönder"}
              </Button>
              <div className="rounded-xl border border-white/20 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Son toplu gönderimler</p>
                  <Button variant="secondary" size="sm" onClick={() => void loadBulkHistory()}>
                    Yenile
                  </Button>
                </div>
                <ul className="max-h-52 overflow-auto divide-y divide-white/10 text-xs">
                  {bulkHistory.map((h) => (
                    <li key={h.id} className="py-2">
                      <p className="font-semibold text-white/90">{new Date(h.created_at).toLocaleString("tr-TR")} · {h.recipients_count} alıcı</p>
                      <p className="text-slate-300">WA: {h.wa_requested ? `${h.whatsapp_sent} gönderim` : "kapalı"} · E-posta: {h.email_requested ? `${h.email_sent} gönderim` : "kapalı"}</p>
                      <p className="text-slate-400 line-clamp-2 mt-1 whitespace-pre-wrap">{h.template}</p>
                    </li>
                  ))}
                  {!bulkHistory.length && <li className="py-4 text-slate-300">Henüz kayıt yok.</li>}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
