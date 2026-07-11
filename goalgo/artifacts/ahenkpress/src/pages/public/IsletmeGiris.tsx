import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const API = "/api";

interface RecentBiz {
  id: string;
  name: string;
  photoUrl?: string | null;
  city?: { name?: string | null } | null;
  isPremium?: boolean;
}

export default function IsletmeGiris() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentBiz, setRecentBiz] = useState<RecentBiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/map/owner/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Giriş başarısız");
      localStorage.setItem("ownerToken", data.data.token);
      localStorage.setItem("ownerUser", JSON.stringify(data.data.user));
      localStorage.setItem("ownerBusinesses", JSON.stringify(data.data.businesses));
      if (data.data.businesses?.length > 0) {
        navigate(`/isletme-paneli/${data.data.businesses[0].id}`);
      } else {
        navigate("/isletme-paneli");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regForm.password.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/map/owner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Kayıt başarısız");
      localStorage.setItem("ownerToken", data.data.token);
      localStorage.setItem("ownerUser", JSON.stringify(data.data.user));
      navigate("/isletme-basvuru");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/map/businesses/recent-public?limit=10`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: RecentBiz[] }) => {
        if (!cancelled && d.success && Array.isArray(d.data)) setRecentBiz(d.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSetLocation() {
    setLocMsg(null);
    if (!("geolocation" in navigator)) {
      setLocMsg("Bu cihazda konum desteklenmiyor.");
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
        try {
          localStorage.setItem("kesfetUserGeo", JSON.stringify(o));
        } catch {
          /* ignore */
        }
        setLocMsg("Konum kaydedildi. Keşfet’te yakınınızdaki işletmeler için konum düğmesini kullanabilirsiniz.");
        setLocBusy(false);
      },
      () => {
        setLocMsg("Konum alınamadı. Tarayıcı iznini kontrol edin.");
        setLocBusy(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-2">
      <div>
        <div className="mb-8 text-center lg:text-left">
          <Link href="/kesfet" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] transition hover:text-[#0b5f59]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Keşfet&apos;e dön
          </Link>
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <span className="text-3xl">⭐</span>
          </div>
          <h1 className="text-2xl font-black text-slate-950">İşletme Paneli</h1>
          <p className="mt-1 text-sm text-slate-500">Harita işletme hesabınıza giriş yapın veya kayıt olun</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex rounded-xl bg-slate-50 p-1">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === "login" ? "bg-[#0f766e] text-white shadow" : "text-slate-500 hover:text-slate-900"}`}
              style={tab === "login" ? { color: "#fff" } : undefined}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === "register" ? "bg-[#0f766e] text-white shadow" : "text-slate-500 hover:text-slate-900"}`}
              style={tab === "register" ? { color: "#fff" } : undefined}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Login Form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <GlassInput label="E-posta" type="email" value={loginForm.email} onChange={v => setLoginForm(f => ({ ...f, email: v }))} placeholder="isletme@email.com" />
              <GlassInput label="Şifre" type="password" value={loginForm.password} onChange={v => setLoginForm(f => ({ ...f, password: v }))} placeholder="••••••••" />
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] py-3 font-bold text-white transition hover:bg-[#0b5f59] disabled:opacity-50"
                style={{ color: "#fff" }}
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Giriş yapılıyor...</> : "Giriş Yap"}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <GlassInput label="Ad" type="text" value={regForm.firstName} onChange={v => setRegForm(f => ({ ...f, firstName: v }))} placeholder="Ahmet" />
                <GlassInput label="Soyad" type="text" value={regForm.lastName} onChange={v => setRegForm(f => ({ ...f, lastName: v }))} placeholder="Yılmaz" />
              </div>
              <GlassInput label="E-posta *" type="email" value={regForm.email} onChange={v => setRegForm(f => ({ ...f, email: v }))} placeholder="isletme@email.com" />
              <GlassInput label="Telefon" type="tel" value={regForm.phone} onChange={v => setRegForm(f => ({ ...f, phone: v }))} placeholder="0555 000 00 00" />
              <GlassInput label="Şifre *" type="password" value={regForm.password} onChange={v => setRegForm(f => ({ ...f, password: v }))} placeholder="En az 6 karakter" />
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] py-3 font-bold text-white transition hover:bg-[#0b5f59] disabled:opacity-50"
                style={{ color: "#fff" }}
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Kaydediliyor...</> : "Kayıt Ol & İşletme Ekle →"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="mb-3 text-xs text-slate-500">İşletme başvurusu yapmak ister misiniz?</p>
            <Link href="/isletme-basvuru" className="text-sm font-semibold text-[#0f766e] transition hover:text-[#0b5f59]">
              Premium başvuru yap →
            </Link>
          </div>
        </div>

        {/* Son eklenen işletmeler + konum */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-black text-slate-950">Son eklenen işletmeler</h2>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Keşfet varsayılan olarak son eklenenleri gösterir. Konumunuzu isteğe bağlı kaydedebilir veya haritada açabilirsiniz.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={locBusy}
              onClick={() => void handleSetLocation()}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:opacity-50"
              style={{ color: "#fff" }}
            >
              {locBusy ? "Konum alınıyor…" : "Konumunu belirle"}
            </button>
            <Link
              href="/haritalar"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-[#0f766e]"
            >
              Haritalarda aç →
            </Link>
          </div>
          {locMsg ? <p className="mb-4 text-xs text-emerald-700">{locMsg}</p> : null}
          {recentLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : recentBiz.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Henüz kayıt yok</p>
          ) : (
            <ul className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1">
              {recentBiz.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/kesfet?nav=${encodeURIComponent(b.id)}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white">
                      {b.photoUrl ? (
                        <img src={b.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">🏪</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {b.city?.name ? `${b.city.name} · ` : ""}
                        {b.isPremium ? "Premium" : "Kayıtlı"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function GlassInput({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
      />
    </div>
  );
}
