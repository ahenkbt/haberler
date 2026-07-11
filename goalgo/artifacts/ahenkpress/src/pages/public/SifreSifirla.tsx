import { useState } from "react";
import { Link } from "wouter";

const API = "/api";

type Mode = "email" | "whatsapp";

export default function SifreSifirla() {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "email" && !email.trim()) return;
    if (mode === "whatsapp" && !whatsapp.trim()) return;
    setLoading(true);
    setError("");
    try {
      const body =
        mode === "email"
          ? { email: email.trim() }
          : { whatsapp: whatsapp.trim() };
      const res = await fetch(`${API}/providers/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu.");
        return;
      }
      setSent(true);
      if (data._devLink) setResetLink(data._devLink);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center py-8">
      <div className="w-full">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f766e] shadow-lg shadow-emerald-900/15">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-950">Şifre Sıfırla</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kayıtlı e-postanıza veya işletme WhatsApp numaranıza sıfırlama bağlantısı gönderilir.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">İstek alındı</p>
              <p className="text-sm text-slate-500">
                Hesabınız sistemdeyse e-posta ve/veya WhatsApp ile bağlantı gönderilir. Gelen kutusu ve spam klasörünü
                kontrol edin.
              </p>
              {resetLink && (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-left">
                  <p className="text-yellow-300 text-xs font-semibold mb-1">🔧 Test Bağlantısı (geliştirme):</p>
                  <a href={resetLink} className="text-yellow-200 text-xs break-all underline">
                    {resetLink}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    mode === "email" ? "bg-[#0f766e] text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={mode === "email" ? { color: "#fff" } : undefined}
                >
                  E-posta
                </button>
                <button
                  type="button"
                  onClick={() => setMode("whatsapp")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    mode === "whatsapp" ? "bg-[#0f766e] text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={mode === "whatsapp" ? { color: "#fff" } : undefined}
                >
                  WhatsApp
                </button>
              </div>

              {mode === "email" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600">Kayıt E-Postanız</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="isletme@ornek.com"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600">
                    İşletme WhatsApp / telefon
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+90 5xx xxx xx xx"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                    Başvuruda kayıtlı WhatsApp veya telefon numaranızla eşleşmelidir.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || (mode === "email" ? !email.trim() : !whatsapp.trim())}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-3.5 text-sm font-bold text-white transition hover:bg-[#0b5f59] disabled:opacity-40"
                style={{ color: "#fff" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  "Sıfırlama Linki Gönder →"
                )}
              </button>
            </form>
          )}

          <div className="mt-5 border-t border-slate-100 pt-5 text-center">
            <Link href="/servis-saglayici-giris" className="text-sm font-semibold text-[#0f766e] transition hover:text-[#0b5f59]">
              ← Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
