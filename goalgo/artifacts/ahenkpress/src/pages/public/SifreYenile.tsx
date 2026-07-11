import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const API = "/api";

export default function SifreYenile() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
    else setError("Geçersiz veya eksik sıfırlama linki.");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Şifreler eşleşmiyor."); return; }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/providers/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Bir hata oluştu."); return; }
      setDone(true);
      setTimeout(() => navigate("/servis-saglayici-giris"), 3000);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-950">Yeni Şifre Belirle</h1>
          <p className="mt-1 text-sm text-slate-500">Hesabınız için yeni bir şifre girin</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">Şifreniz güncellendi!</p>
              <p className="text-sm text-slate-500">Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    {showPw ? "Gizle" : "Göster"}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600">Şifre Tekrar</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
              </div>
              {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <button
                type="submit"
                disabled={loading || !password || !confirm || !token}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-3.5 text-sm font-bold text-white transition hover:bg-[#0b5f59] disabled:opacity-40"
                style={{ color: "#fff" }}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Güncelleniyor...
                  </>
                ) : (
                  "Şifremi Güncelle ✓"
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
