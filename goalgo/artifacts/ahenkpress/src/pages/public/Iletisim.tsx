import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from "lucide-react";
import { readEditorPageFlags } from "@/lib/editorPageFlags";
import { useHmPublicLinkContextOptional, useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { apiUrl } from "@/lib/apiBase";
import { toSafeHmStaticPageHtml } from "@/lib/hmStaticPageHtml";

export default function Iletisim() {
  const hm = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [iletisimOpen, setIletisimOpen] = useState(true);
  useEffect(() => {
    const sync = () => setIletisimOpen(readEditorPageFlags().iletisim);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("yekpare-editor-flags", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("yekpare-editor-flags", sync);
    };
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);
  const [errText, setErrText] = useState("");

  const rawCorp = (hm?.layoutPrefs.hmCorporatePageHtml?.iletisim ?? "").trim();
  const iletisimIntroHtml = useMemo(() => {
    return toSafeHmStaticPageHtml(rawCorp, hm);
  }, [rawCorp, hm]);

  const siteEmail = (hm?.contact?.email ?? "").trim();
  const siteAddress = (hm?.contact?.address ?? "").trim();
  const sitePhone = (hm?.contact?.phone ?? "").trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDone(null);
    setErrText("");
    try {
      const res = await fetch(apiUrl("/api/site/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message,
          ...(hm
            ? {
                siteId: hm.siteId,
                hmSiteSlug: hm.slug,
                pageSource: `hm/${hm.slug}/iletisim`.slice(0, 80),
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDone("err");
        setErrText(data.error ?? "Gönderilemedi");
        return;
      }
      setDone("ok");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch {
      setDone("err");
      setErrText("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  }

  if (!iletisimOpen) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10">
          <h1 className="text-xl font-bold text-slate-900">İletişim</h1>
          <p className="mt-3 text-sm text-slate-600">Bu sayfa site yöneticisi tarafından devre dışı bırakılmıştır.</p>
          <Link href={h("/")} className="inline-block mt-6 text-sm font-semibold text-indigo-600 hover:underline">
            Anasayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="mb-8">
          <Link href={h("/")} className="text-sm text-indigo-600 font-semibold hover:underline">
            ← Anasayfa
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">İletişim</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Soru, öneri veya iş birliği için formu doldurun. Mesajınız yönetim ekibine iletilir.
            {hm ? (
              <span className="block mt-2 text-xs text-slate-500">
                Bu form <strong className="text-slate-700">{hm.displayName}</strong> (haber merkezi) bağlamındadır; mesaj
                kaydında site bilgisi saklanır.
              </span>
            ) : null}
          </p>
        </div>

        {iletisimIntroHtml ? (
          <div
            className="mb-8 prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: iletisimIntroHtml }}
          />
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex gap-3 shadow-sm">
            <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">E-posta</div>
              {siteEmail ? (
                <a href={`mailto:${encodeURIComponent(siteEmail)}`} className="text-sm font-semibold text-indigo-700 hover:underline break-all">
                  {siteEmail}
                </a>
              ) : hm ? (
                <p className="text-sm text-slate-600">Kayıtlı e-posta yok — aşağıdaki formu kullanın.</p>
              ) : (
                <a href="mailto:yekparenet@gmail.com" className="text-sm font-semibold text-indigo-700 hover:underline break-all">
                  yekparenet@gmail.com
                </a>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex gap-3 shadow-sm">
            <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Adres</div>
              {siteAddress ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{siteAddress}</p>
              ) : hm ? (
                <p className="text-sm text-slate-600">Kayıtlı adres yok.</p>
              ) : (
                <p className="text-sm text-slate-700">Türkiye — detaylar için mesaj bırakın</p>
              )}
            </div>
          </div>
        </div>

        {sitePhone ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex gap-3 shadow-sm mb-8 max-w-md">
            <Phone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Telefon</div>
              <a href={`tel:${sitePhone.replace(/\s/g, "")}`} className="text-sm font-semibold text-indigo-700 hover:underline">
                {sitePhone}
              </a>
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          {done === "ok" && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-medium">
              <CheckCircle className="w-5 h-5 shrink-0" />
              Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.
            </div>
          )}
          {done === "err" && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {errText}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-500 uppercase">Ad Soyad *</span>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500 uppercase">E-posta *</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Konu</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Mesaj *</span>
            <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[140px]" />
          </label>
          <button type="submit" disabled={sending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 text-sm disabled:opacity-60 transition">
            <Send className="w-4 h-4" />
            {sending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </form>
      </div>
    </div>
  );
}
