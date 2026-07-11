import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { adminFetchErrorHint, adminPanelCookieApiPath, apiFetch, portalCanonicalAdminPath } from "@/lib/apiBase";

export default function Login() {
  const { markPanelAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canonical = portalCanonicalAdminPath("/admin/giris");
    if (/^https?:\/\//i.test(canonical) && canonical !== window.location.href) {
      window.location.replace(canonical);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(adminPanelCookieApiPath("/api/members/admin-panel-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        logout();
        if (data.error?.trim()) {
          setError(data.error.trim().slice(0, 200) + adminFetchErrorHint(String(res.status)));
        } else if (res.status === 400) {
          setError("Kullanıcı adı ve şifre gerekli.");
        } else if (res.status >= 500) {
          setError(
            `Sunucu hatası (${res.status}). Oturum kaydedilemedi veya API geçici olarak yanıt vermiyor.` +
              adminFetchErrorHint(String(res.status)),
          );
        } else if (res.status === 401) {
          setError("Kullanıcı adı veya şifre hatalı.");
        } else {
          setError("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
        }
        setLoading(false);
        return;
      }
      markPanelAuthenticated();
      setLocation("/admin");
    } catch {
      logout();
      setError("Bağlantı hatası; tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e61e25] rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-black text-3xl">A</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Yönetim Paneli</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Giriş Yap</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="E-posta veya kullanıcı adı"
                  autoComplete="username"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#e61e25] focus:ring-1 focus:ring-[#e61e25]/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-10 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#e61e25] focus:ring-1 focus:ring-[#e61e25]/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[#e61e25] hover:bg-[#c9181e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v8z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Giriş yapılıyor...
                </>
              ) : "Giriş Yap"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Yekpare v5.3 — Yönetim Sistemi
        </p>
      </div>
    </div>
  );
}
