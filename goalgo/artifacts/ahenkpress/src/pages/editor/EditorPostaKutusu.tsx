import { useCallback, useEffect, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { GmailInboxPanel } from "@/components/admin/GmailInboxPanel";
import { GmailMailCompose } from "@/components/admin/GmailMailCompose";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { Loader2, PenSquare, Settings2, Wifi } from "lucide-react";

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

export default function EditorPostaKutusu() {
  const [messages, setMessages] = useState<MailMsg[]>([]);
  const [mailboxConfig, setMailboxConfig] = useState<MailboxConfig | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapFolder, setImapFolder] = useState("INBOX");

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubj, setComposeSubj] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMail = useCallback(async () => {
    const d = (await hmEditorFetch("/api/hm/editor/mailbox?limit=60")) as {
      messages?: MailMsg[];
      config?: MailboxConfig;
    };
    setMessages(Array.isArray(d.messages) ? d.messages : []);
    if (d.config && typeof d.config === "object") setMailboxConfig(d.config);
  }, []);

  const loadSettings = useCallback(async () => {
    const d = (await hmEditorFetch("/api/hm/editor/mail-settings")) as {
      settings?: Record<string, unknown> | null;
      config?: MailboxConfig;
    };
    const st = d.settings ?? null;
    if (st) {
      setSmtpHost(String(st.smtp_host ?? ""));
      setSmtpPort(String(st.smtp_port ?? "587"));
      setSmtpUser(String(st.smtp_user ?? ""));
      setSmtpFrom(String(st.smtp_from ?? ""));
      setImapHost(String(st.imap_host ?? ""));
      setImapPort(String(st.imap_port ?? "993"));
      setImapUser(String(st.imap_user ?? ""));
      setImapFolder(String(st.imap_folder ?? "INBOX"));
      if (st.has_smtp_pass) setSmtpPass("***");
      if (st.has_imap_pass) setImapPass("***");
    }
    if (d.config) setMailboxConfig(d.config);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadMail(), loadSettings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loadMail, loadSettings]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void syncImap(true);
    }, 180_000);
    return () => window.clearInterval(t);
  }, []);

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
      const d = (await hmEditorFetch("/api/hm/editor/mailbox/test-connection", { method: "POST" })) as {
        smtp?: { ok?: boolean; error?: string };
        imap?: { ok?: boolean; error?: string };
      };
      setConnStatus(
        `SMTP: ${d.smtp?.ok ? "OK" : d.smtp?.error ?? "hata"} · IMAP: ${d.imap?.ok ? "OK" : d.imap?.error ?? "hata"}`,
      );
    } catch (err) {
      setConnStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setTestingConn(false);
    }
  }

  async function markMailRead(id: number) {
    await hmEditorFetch(`/api/hm/editor/mailbox/${id}/read`, { method: "PATCH" });
    await loadMail();
  }

  async function syncImap(silent = false) {
    if (syncing) return;
    setSyncing(true);
    try {
      const d = (await hmEditorFetch("/api/hm/editor/mailbox/sync-imap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max: 40 }),
      })) as { fetched?: number; inserted?: number; error?: string };
      if (!silent && (d.fetched ?? 0) > 0) {
        // sessiz arka plan senkronunda uyarı gösterme
      }
      await loadMail();
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function sendMail() {
    setSending(true);
    try {
      const recipients = [composeTo.trim(), ...composeCc.split(/[,;]/).map((s) => s.trim())].filter(Boolean).join(", ");
      await hmEditorFetch("/api/hm/editor/mailbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject: composeSubj,
          bodyHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">${composeBody.replace(/\n/g, "<br/>")}</div>`,
          bodyText: composeBody,
        }),
      });
      clearCompose();
      setComposeOpen(false);
      await loadMail();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function saveMailSettings() {
    setSavingSettings(true);
    setError("");
    try {
      await hmEditorFetch("/api/hm/editor/mail-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass: smtpPass || undefined,
          smtpFrom,
          imapHost,
          imapPort,
          imapUser,
          imapPass: imapPass || undefined,
          imapFolder,
        }),
      });
      await loadAll();
      setSettingsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <EditorLayout title="Posta kutusu">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Posta kutusu</h1>
        <p className="text-sm text-slate-600 mb-4">
          Site e-posta hesabınızdan gelen kutusunu okuyun ve yanıt gönderin. Gelen kutusu IMAP ile senkron edilir;
          gönderim aynı hesabın SMTP bilgilerini kullanır.
        </p>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {mailboxConfig ? (
          <div className="mb-4 rounded-xl border bg-gradient-to-r from-sky-50 to-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Site posta kutusu</p>
              <p className="text-lg font-bold text-slate-900">{mailboxConfig.address}</p>
              <p className="text-xs text-slate-600 mt-1">
                Gönderen: {mailboxConfig.fromDisplay}
                {mailboxConfig.smtpHost ? ` · SMTP ${mailboxConfig.smtpHost}` : null}
                {mailboxConfig.imapHost ? ` · IMAP ${mailboxConfig.imapHost}` : null}
              </p>
              {!mailboxConfig.ready ? (
                <p className="text-xs text-amber-700 mt-1">
                  SMTP ve IMAP ayarlarını aşağıdan kaydedin (Gmail: smtp.gmail.com / imap.gmail.com, uygulama şifresi).
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen((v) => !v)}>
                <Settings2 className="w-4 h-4 mr-1" />
                {settingsOpen ? "Ayarları gizle" : "Posta ayarları"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void testConnection()} disabled={testingConn}>
                {testingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 mr-1" />}
                Bağlantı testi
              </Button>
              {connStatus ? <span className="text-xs text-slate-600 max-w-xs">{connStatus}</span> : null}
            </div>
          </div>
        ) : null}

        {settingsOpen ? (
          <div className="mb-6 rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">SMTP / IMAP ayarları</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP sunucu</Label>
                <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label>SMTP port</Label>
                <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
              </div>
              <div className="space-y-2">
                <Label>SMTP kullanıcı</Label>
                <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="info@siteniz.com" />
              </div>
              <div className="space-y-2">
                <Label>SMTP şifre</Label>
                <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="***" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Gönderen (From)</Label>
                <Input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="Site Adı <info@siteniz.com>" />
              </div>
              <div className="space-y-2">
                <Label>IMAP sunucu</Label>
                <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label>IMAP port</Label>
                <Input value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993" />
              </div>
              <div className="space-y-2">
                <Label>IMAP kullanıcı</Label>
                <Input value={imapUser} onChange={(e) => setImapUser(e.target.value)} placeholder="Boş = SMTP kullanıcı" />
              </div>
              <div className="space-y-2">
                <Label>IMAP şifre</Label>
                <Input type="password" value={imapPass} onChange={(e) => setImapPass(e.target.value)} placeholder="Boş = SMTP şifre" />
              </div>
              <div className="space-y-2">
                <Label>IMAP klasör</Label>
                <Input value={imapFolder} onChange={(e) => setImapFolder(e.target.value)} placeholder="INBOX" />
              </div>
            </div>
            <Button onClick={() => void saveMailSettings()} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </div>
        ) : null}

        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
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

            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
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
      </div>
    </EditorLayout>
  );
}
