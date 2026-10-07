import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { adminFetchErrorHint, adminPanelCookieApiPath, hmEditorEntryPathForHost, portalCanonicalAdminPath } from "@/lib/apiBase";
import { invalidateAdminRouteVerificationCache } from "@/lib/adminRouteAuthCache";

const LOGIN_MAX_ATTEMPTS = 8;

function isLoginBusy(status: number, data: { error?: string; ok?: boolean }): boolean {
  if (status === 503 || status === 502 || status === 504) return true;
  return /uyanıyor|meşgul|Failed to start|Durable Object reset|provisioning|timeout|origin-budget/i.test(
    String(data.error || ""),
  );
}

function loginRetryDelayMs(attempt: number): number {
  return Math.min(15_000, 2000 * Math.max(1, attempt));
}

/** Edge /live ısıtır; gerçek /healthz Container hazır olana kadar bekler. */
async function wakeAndWaitForApi(signal?: { cancelled?: boolean }): Promise<boolean> {
  const live = adminPanelCookieApiPath("/api/healthz/live");
  const healthz = adminPanelCookieApiPath("/api/healthz");
  void fetch(live, { cache: "no-store" }).catch(() => null);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (signal?.cancelled) return false;
    try {
      const res = await fetch(healthz, { cache: "no-store" });
      if (res.ok) return true;
      const text = await res.text().catch(() => "");
      if (!/Failed to start|Durable Object reset|meşgul|provisioning/i.test(text) && res.status < 500) {
        // Beklenmeyen 4xx — ısıtmayı bırakma, yine de login denenecek
        return false;
      }
    } catch {
      /* cold / network */
    }
    void fetch(live, { cache: "no-store" }).catch(() => null);
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

export default function Login() {
  const { markPanelAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // HM haber sitesi: /admin → /editor (turk.eco/admin'e atma)
    const editorEntry = hmEditorEntryPathForHost();
    if (editorEntry) {
      window.location.replace(editorEntry);
      return;
    }
    const canonical = portalCanonicalAdminPath("/admin/giris");
    if (/^https?:\/\//i.test(canonical) && canonical !== window.location.href) {
      window.location.replace(canonical);
    }
    // Soğuk Container: sayfa açılır açılmaz ısıt.
    const signal = { cancelled: false };
    void wakeAndWaitForApi(signal);
    return () => {
      signal.cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Autofill çoğu tarayıcıda React onChange tetiklemez; DOM/FormData'dan oku.
      const fd = new FormData(e.currentTarget);
      const user = String(fd.get("username") ?? username)
        .trim()
        .replace(/^\uFEFF/, "");
      const pass = String(fd.get("password") ?? password).replace(/^\uFEFF/, "");
      if (!user || !pass) {
        setError("Kullanıcı adı ve şifre gerekli.");
        setLoading(false);
        return;
      }
      setUsername(user);
      setPassword(pass);

      // apiFetch 401'de oturum yenileme denemesi yapar — giriş POST'unda kullanma.
      // Cold Container "Sunucu meşgul" (503) / DO reset verir; healthz hazır olana kadar dene.
      let res: Response | null = null;
      let data: { success?: boolean; error?: string; ok?: boolean } = {};
      let lastBusy = false;

      for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          setError("Sunucu uyanıyor, tekrar deneniyor…");
          await new Promise((r) => setTimeout(r, loginRetryDelayMs(attempt)));
          await wakeAndWaitForApi();
        } else {
          void fetch(adminPanelCookieApiPath("/api/healthz/live"), { cache: "no-store" }).catch(() => null);
        }

        try {
          res = await fetch(adminPanelCookieApiPath("/api/members/admin-panel-session"), {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ username: user, password: pass }),
          });
          data = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
            ok?: boolean;
          };
        } catch {
          lastBusy = true;
          res = null;
          data = { error: "Sunucu meşgul" };
          continue;
        }

        const busy = isLoginBusy(res.status, data);
        lastBusy = busy;
        if (!busy || res.ok || data.success) break;
      }

      if (!res || !res.ok || !data.success) {
        logout();
        if (lastBusy || isLoginBusy(res?.status ?? 503, data)) {
          setError(
            "Sunucu henüz uyanıyor. 15–20 sn bekleyip tekrar Giriş Yap’a basın. Sürekli olursa Cloudflare Container’ın ayakta olduğundan emin olun.",
          );
        } else if (data.error?.trim()) {
          setError(data.error.trim().slice(0, 200) + adminFetchErrorHint(String(res?.status || "")));
        } else if (res?.status === 400) {
          setError("Kullanıcı adı ve şifre gerekli.");
        } else if ((res?.status ?? 0) >= 500) {
          setError(
            `Sunucu hatası (${res?.status}). Oturum kaydedilemedi veya API geçici olarak yanıt vermiyor.` +
              adminFetchErrorHint(String(res?.status)),
          );
        } else if (res?.status === 401) {
          setError(
            "Kullanıcı adı veya şifre hatalı. Şifreyi elle yazıp tekrar deneyin. Hâlâ olmazsa Cloudflare’de ADMIN_PANEL_USERNAMES / ADMIN_PANEL_PASSWORD secret’larını kontrol edin.",
          );
        } else {
          setError("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
        }
        setLoading(false);
        return;
      }
      invalidateAdminRouteVerificationCache();
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

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="username"
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
                  name="password"
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
              disabled={loading}
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
