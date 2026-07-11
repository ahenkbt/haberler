import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, RefreshCw, Send, Inbox } from "lucide-react";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";

function apiJoin(path: string): string {
  const rest = path.replace(/^\/+/, "");
  return apiUrl(`/api/${rest}`);
}

function getSession() {
  return getProviderSession();
}

function authHeaders(): Record<string, string> {
  return providerAuthHeaders(getSession());
}

type MailMsg = {
  id: number;
  direction: string;
  from_addr: string;
  to_addr: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  created_at: string;
};

export function VendorPostaHub() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<MailMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const [composeTo, setComposeTo] = useState("");
  const [composeSubj, setComposeSubj] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const [tpl, setTpl] = useState(
    "Değerli müşterimiz [isim soyisim],\n\nİşletmemizde Anneler Günü’ne özel indirimden yararlanmak için AnnelerGunu kodunu kullanabilirsiniz.\n\nTeşekkürler.",
  );
  const [wa, setWa] = useState(true);
  const [em, setEm] = useState(false);
  const [bulkLines, setBulkLines] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(apiJoin("providers/me/mail-settings"), { headers: authHeaders() }),
        fetch(apiJoin("providers/me/mailbox?limit=50"), { headers: authHeaders() }),
      ]);
      const sData = await sRes.json().catch(() => ({}));
      const mData = await mRes.json().catch(() => ({}));
      const st = (sData.settings ?? null) as Record<string, unknown> | null;
      setSettings(st);
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
      setMessages(Array.isArray(mData.messages) ? mData.messages : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMailSettings() {
    setSaving(true);
    try {
      const res = await fetch(apiJoin("providers/me/mail-settings"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
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
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error ?? "Kaydedilemedi");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function syncImap() {
    setSyncing(true);
    try {
      const res = await fetch(apiJoin("providers/me/mailbox/sync-imap"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ max: 30 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error ?? "IMAP hatası");
      else alert(`Gelen: ${d.fetched ?? 0}, yeni kayıt: ${d.inserted ?? 0}`);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function sendMail() {
    setSending(true);
    try {
      const res = await fetch(apiJoin("providers/me/mailbox/send"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubj,
          bodyHtml: `<div style="font-family:system-ui">${composeBody.replace(/\n/g, "<br/>")}</div>`,
          bodyText: composeBody,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error ?? "Gönderilemedi");
      else {
        setComposeTo("");
        setComposeSubj("");
        setComposeBody("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  async function loadContactsToBulk() {
    try {
      const res = await fetch(apiJoin("providers/me/marketing/contacts"), { headers: authHeaders() });
      const d = await res.json().catch(() => ({}));
      const lines = (d.contacts as { customer_name?: string; customer_phone?: string; customer_email?: string }[])
        .map((c) => `${(c.customer_name || "").trim()}\t${(c.customer_phone || "").trim()}\t${(c.customer_email || "").trim()}`)
        .join("\n");
      setBulkLines(lines);
    } catch {
      setBulkLines("");
    }
  }

  function parseBulkRecipients(): { fullName: string; phone: string; email: string }[] {
    const out: { fullName: string; phone: string; email: string }[] = [];
    for (const line of bulkLines.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const parts = t.split(/\t+|,|;|\s{2,}/).map((x) => x.trim());
      const fullName = parts[0] || "";
      const phone = parts[1] || parts.find((p) => /\d{10,}/.test(p.replace(/\D/g, ""))) || "";
      const email = parts.find((p) => p.includes("@")) || "";
      if (fullName || phone || email) out.push({ fullName: fullName || "Müşteri", phone, email });
    }
    return out;
  }

  async function runBulk() {
    const recipients = parseBulkRecipients();
    if (!recipients.length) {
      alert("En az bir satır: Ad Soyad<TAB>Telefon<TAB>E-posta");
      return;
    }
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const res = await fetch(apiJoin("providers/me/marketing/bulk"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ template: tpl, channels: { wa, email: em }, recipients }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setBulkResult(d.error ?? "Hata");
      else setBulkResult(`WhatsApp: ${d.whatsappSent ?? 0}, E-posta: ${d.emailSent ?? 0}`);
    } catch {
      setBulkResult("Bağlantı hatası");
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading && !settings && messages.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-gray-900 font-bold text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          Mağaza SMTP & IMAP
        </h2>
        <p className="text-xs text-gray-600">
          Gönderim için SMTP; gelen kutusunu çekmek için IMAP (çoğu sağlayıcıda 993 TLS). Şifre alanını boş bırakırsanız mevcut şifre korunur; yalnızca değiştirmek için yeni değer girin.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">SMTP sunucu</Label>
            <Input className="mt-1" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.domain.com" />
          </div>
          <div>
            <Label className="text-xs">SMTP port</Label>
            <Input className="mt-1" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">SMTP kullanıcı</Label>
            <Input className="mt-1" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">SMTP şifre</Label>
            <Input type="password" className="mt-1" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Gönderen (From)</Label>
            <Input className="mt-1" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="Mağaza Adı <no-reply@...>" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 border-t pt-4">
          <div>
            <Label className="text-xs">IMAP sunucu</Label>
            <Input className="mt-1" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.domain.com" />
          </div>
          <div>
            <Label className="text-xs">IMAP port</Label>
            <Input className="mt-1" value={imapPort} onChange={(e) => setImapPort(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">IMAP kullanıcı</Label>
            <Input className="mt-1" value={imapUser} onChange={(e) => setImapUser(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">IMAP şifre</Label>
            <Input type="password" className="mt-1" value={imapPass} onChange={(e) => setImapPass(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Klasör</Label>
            <Input className="mt-1" value={imapFolder} onChange={(e) => setImapFolder(e.target.value)} />
          </div>
        </div>
        <Button type="button" onClick={() => void saveMailSettings()} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Gelen / giden kutusu
          </h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Yenile
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void syncImap()} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "IMAP ile gelenleri çek"}
            </Button>
          </div>
          <ul className="max-h-[420px] overflow-y-auto divide-y text-sm">
            {messages.map((m) => (
              <li key={m.id} className={`py-2 ${m.is_read ? "" : "bg-amber-50/80"}`}>
                <div className="text-[10px] uppercase text-gray-400">
                  {m.direction === "out" ? "Giden" : "Gelen"} · {new Date(m.created_at).toLocaleString("tr-TR")}
                </div>
                <div className="font-semibold text-gray-900">{m.subject || "(konu yok)"}</div>
                <div className="text-xs text-gray-600">
                  {m.from_addr} → {m.to_addr}
                </div>
                {m.body_text && <p className="text-xs text-gray-700 mt-1 line-clamp-3 whitespace-pre-wrap">{m.body_text}</p>}
              </li>
            ))}
            {messages.length === 0 && <li className="py-6 text-center text-gray-500 text-sm">Henüz kayıt yok.</li>}
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900">E-posta gönder</h3>
          <div>
            <Label className="text-xs">Alıcı</Label>
            <Input className="mt-1" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} type="email" />
          </div>
          <div>
            <Label className="text-xs">Konu</Label>
            <Input className="mt-1" value={composeSubj} onChange={(e) => setComposeSubj(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Mesaj</Label>
            <Textarea className="mt-1 min-h-[140px]" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void sendMail()} disabled={sending} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Gönder
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/50 rounded-2xl p-5 text-white space-y-3">
        <h3 className="font-bold text-lg">Toplu müşteri mesajı</h3>
        <p className="text-xs text-indigo-200">
          Yer tutucular: <code className="bg-white/10 px-1 rounded">[isim soyisim]</code>, <code className="bg-white/10 px-1 rounded">[ad]</code>,{" "}
          <code className="bg-white/10 px-1 rounded">[soyad]</code> veya <code className="bg-white/10 px-1 rounded">{"{{isim soyisim}}"}</code>
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} />
            WhatsApp (CallMeBot anahtarı veya site anahtarı)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={em} onChange={(e) => setEm(e.target.checked)} />
            E-posta (mağaza SMTP)
          </label>
        </div>
        <Textarea value={tpl} onChange={(e) => setTpl(e.target.value)} className="min-h-[120px] bg-white/5 border-white/20 text-white" />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadContactsToBulk()}>
            Sipariş müşterilerini çek
          </Button>
        </div>
        <Label className="text-xs text-indigo-200">Satır başına: Ad Soyad [TAB] telefon [TAB] e-posta</Label>
        <Textarea
          value={bulkLines}
          onChange={(e) => setBulkLines(e.target.value)}
          placeholder="Ayşe Yılmaz	05551234567	ayse@..."
          className="min-h-[160px] font-mono text-xs bg-white/5 border-white/20 text-white"
        />
        {bulkResult && <p className="text-sm text-amber-200">{bulkResult}</p>}
        <Button type="button" onClick={() => void runBulk()} disabled={bulkBusy} className="bg-amber-500 text-black hover:bg-amber-400 font-bold">
          {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Toplu gönder"}
        </Button>
      </div>
    </div>
  );
}
