import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { providerPanelKind, providerPanelPath } from "@/lib/providerPanelRoutes";
import { LoginMathCaptcha, type LoginCaptchaValue } from "@/components/LoginMathCaptcha";

export type ServisSaglayiciGirisProps = {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};

export default function ServisSaglayiciGiris({
  title = "İşletme Girişi",
  subtitle = "Yekpare işletme panelinize erişin",
  backHref = "/",
  backLabel = "Ana sayfaya dön",
}: ServisSaglayiciGirisProps = {}) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<LoginCaptchaValue>({ token: "", answer: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/providers/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaToken: captcha.token,
          captchaAnswer: captcha.answer,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Giriş yapılamadı.");
        if (String(data.error ?? "").includes("Güvenlik doğrulaması")) {
          setCaptcha((c) => ({ ...c, answer: "" }));
        }
        return;
      }
      const sessionEmail =
        data.vendor.login_email ||
        data.vendor.owner_email ||
        data.vendor.email ||
        email.trim();
      localStorage.setItem("providerSession", JSON.stringify({
        id: data.vendor.id,
        email: sessionEmail,
        name: data.vendor.name,
        token: data.token,
        panelKind: data.vendor.panel_kind || providerPanelKind(data.vendor),
        panelPath: data.vendor.panel_route || providerPanelPath(data.vendor),
      }));
      navigate(data.vendor.panel_route || providerPanelPath(data.vendor));
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
          <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-900 leading-relaxed">
            <p>
              Giriş e-postası, kayıtta tanımlı <strong>yetkili</strong> veya <strong>işletme</strong> e-postası ile aynı olmalıdır.
            </p>
            <p className="mt-1.5">
              Birden fazla başvuru varsa sistem en güncel şifre kaydını kullanır.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-500 text-xs font-bold mb-1.5 tracking-wide">Kayıt E-Postanız</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="isletme@ornek.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold mb-1.5 tracking-wide">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition text-xs px-1">
                  {showPw ? "Gizle" : "Göster"}
                </button>
              </div>
            </div>

            <LoginMathCaptcha value={captcha} onChange={setCaptcha} variant="light" />

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password || !captcha.token || !captcha.answer.trim()}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Giriş yapılıyor...</> : "Giriş Yap →"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-3">
            <Link href="/sifre-sifirla" className="block text-emerald-700 hover:text-emerald-800 text-sm font-semibold transition">Şifremi unuttum →</Link>
            <Link href="/destek" className="block text-slate-500 hover:text-slate-700 text-xs transition">Yekpare destek talebi →</Link>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-slate-400 text-xs mb-2">Henüz başvuru yapmadınız mı?</p>
              <Link href="/isletme-basvuru" className="inline-block px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-bold hover:bg-emerald-100 transition">
                Servis Sağlayıcı Başvurusu →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link href={backHref} className="text-xs text-slate-400 transition hover:text-slate-700">← {backLabel}</Link>
        </div>
    </div>
  );
}
