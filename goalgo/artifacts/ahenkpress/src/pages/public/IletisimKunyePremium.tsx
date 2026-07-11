import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Phone, Mail, Building2, Send, CheckCircle, AlertCircle, ImagePlus } from "lucide-react";
import { YEKPARE_SADE_TEAL } from "@/lib/yekpareSadeTheme";

const ACCENT = YEKPARE_SADE_TEAL;

const OFFICES = [
  { flag: "🇬🇧", title: "İngiltere", lines: ["Company number: 16966493", "71-75, Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ"] },
  { flag: "🇹🇷", title: "İstanbul Ofisi", lines: ["Ferko Signature Plaza, Esentepe, Büyükdere Cd. No:175 A Blok, 34394 Şişli/İstanbul"] },
  { flag: "🇹🇷", title: "Ankara", lines: ["Meşrutiyet Mah. Karanfil Sokak 4/91 Çankaya / Ankara"] },
  { flag: "🇺🇸", title: "USA — Wyoming Ofisi", lines: ["1621 Central Ave, Cheyenne, WY 82001 USA"] },
  { flag: "🇦🇿", title: "Azerbaycan — Bakü Ofisi", lines: ["İçerişeher, Caferov Qardaşları No: 19, Bakü, AZ"] },
  { flag: "🇬🇪", title: "Gürcistan — Batum Ofisi", lines: ["Kutaisi Street No: 1, Old Batumi, Batum, GE"] },
];

export default function IletisimKunyePremium() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);
  const [errText, setErrText] = useState("");

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 400 * 1024) {
      setErrText("Görsel en fazla 400 KB olmalıdır.");
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      if (s.startsWith("data:image/")) setImageData(s);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDone(null);
    setErrText("");
    try {
      const res = await fetch("/api/site/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: "",
          subject,
          message,
          pageSource: "iletisim-kunye",
          imageData: imageData || undefined,
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
      setSubject("");
      setMessage("");
      setImageData(null);
    } catch {
      setDone("err");
      setErrText("Bağlantı hatası");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 w-full bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100 pb-4">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <Link href="/" className="inline-flex text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition">
          ← Anasayfa
        </Link>

        {/* Üst kart — iletişim bilgileri */}
        <div className="relative flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-2xl border border-zinc-800 bg-zinc-950 text-white">
          <div
            className="md:hidden shrink-0 py-2.5 px-4 text-center font-black text-xs tracking-[0.25em] text-white uppercase"
            style={{ backgroundColor: ACCENT }}
          >
            YEKPARE
          </div>
          <div
            className="hidden md:flex w-14 shrink-0 flex-col items-center justify-center py-8 font-black text-[10px] tracking-[0.2em] text-white uppercase"
            style={{ backgroundColor: ACCENT, writingMode: "vertical-rl" }}
          >
            YEKPARE
          </div>
          <div className="flex-1 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: ACCENT }}>
              Künye & iletişim
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight border-b border-white/15 pb-4 mb-6">
              İletişim bilgileri
            </h1>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  Merkez / şirket
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  Ahenk Bilgi Teknolojileri
                  <br />
                  Başak Mah. Özalp Caddesi 5/2 Mamak / Ankara
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                  <Phone className="w-4 h-4 shrink-0" />
                  Telefon
                </div>
                <a href="tel:+905322291892" className="text-xl sm:text-2xl font-black text-white hover:opacity-90">
                  0532 229 18 92
                </a>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                  <Mail className="w-4 h-4 shrink-0" />
                  E-posta
                </div>
                <a href="mailto:ahenkbt@gmail.com" className="text-sm sm:text-base text-white underline font-semibold break-all">
                  ahenkbt@gmail.com
                </a>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://yekpare.net"
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                yekpare.net
              </a>
              <Link
                href="/destek"
                className="inline-flex items-center justify-center rounded-xl border-2 px-5 py-2.5 text-sm font-bold transition hover:bg-white/5"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                Destek talebi
              </Link>
            </div>
          </div>
        </div>

        {/* Ofisler */}
        <div className="grid sm:grid-cols-2 gap-4">
          {OFFICES.map((o) => (
            <div
              key={o.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{o.flag}</span>
                <div>
                  <h2 className="font-black text-zinc-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    {o.title}
                  </h2>
                  {o.lines.map((line) => (
                    <p key={line} className="text-xs text-zinc-600 mt-2 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form kartı */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-lg font-black tracking-tight">Bize mesaj gönderin</h2>
            <p className="text-xs text-zinc-400 mt-1">Ticari teklif, iş birliği veya genel sorularınız için.</p>
          </div>
          <form onSubmit={submit} className="p-6 sm:p-8 space-y-4">
            {done === "ok" && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 text-emerald-300 px-4 py-3 text-sm font-medium border border-emerald-500/30">
                <CheckCircle className="w-5 h-5 shrink-0" />
                Mesajınız kaydedildi. Yönetim panelinden incelenecektir.
              </div>
            )}
            {done === "err" && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/15 text-red-300 px-4 py-3 text-sm font-medium border border-red-500/30">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {errText}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase text-zinc-400">Adınız soyadınız *</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase text-zinc-400">E-posta *</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Konu</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Kısa başlık"
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-red-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Mesajınız *</span>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-red-500 resize-y min-h-[120px]"
              />
            </label>
            <div className="rounded-xl border border-dashed border-zinc-600 p-4 bg-zinc-900/50">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-300">
                <ImagePlus className="w-5 h-5 shrink-0" style={{ color: ACCENT }} />
                <span>Görsel ekle (isteğe bağlı, max 400 KB)</span>
                <input type="file" accept="image/*" className="hidden" onChange={onImagePick} />
              </label>
              {imageData && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={imageData} alt="" className="h-16 w-auto rounded-lg border border-zinc-600" />
                  <button type="button" onClick={() => setImageData(null)} className="text-xs text-red-400 font-bold underline">
                    Kaldır
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-lg disabled:opacity-50 transition hover:opacity-95"
              style={{ backgroundColor: ACCENT }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {sending ? "Gönderiliyor…" : "Gönder"}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-500 px-2">
          Platform üzerinden satın alınan ürün ve hizmetlerde satıcı işletme bilgileri sipariş öncesi ayrıca gösterilir.
        </p>
      </div>
    </div>
  );
}
