import { useState, useEffect } from "react";
import { useMember } from "../context/MemberContext";

const API = "/api";

export default function MemberModal() {
  const { modalOpen, closeModal, defaultTab, refresh } = useMember();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  useEffect(() => { setTab(defaultTab); }, [defaultTab, modalOpen]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "business">("individual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!modalOpen) return null;

  function reset() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setPassword(""); setConfirm(""); setError(null); setSuccess(false); setAccountType("individual");
  }

  function switchTab(t: "login" | "register") {
    setTab(t); reset();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/members/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          password,
          accountType,
        }),
      });
      const d = await res.json();
      if (d.success) {
        await refresh();
        setSuccess(true);
        setTimeout(() => { closeModal(); reset(); }, 1500);
      } else { setError(d.error || "Kayıt başarısız."); }
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/members/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (d.success) {
        await refresh();
        setSuccess(true);
        setTimeout(() => { closeModal(); reset(); }, 1200);
      } else { setError(d.error || "Giriş başarısız."); }
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { closeModal(); reset(); } }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg,#1e1e2e,#302b63)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <button onClick={() => { closeModal(); reset(); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <h2 className="text-lg font-bold text-white">{tab === "register" ? "Yekpare'e Üye Ol" : "Giriş Yap"}</h2>
          <p className="text-xs text-white/60 mt-0.5">
            {tab === "register"
              ? "Üye ol, işletmelerin özel indirim ve avantajlarından yarar­lan."
              : "Hesabına giriş yaparak üyelere özel avantajlara eriş."}
          </p>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t ? "bg-white text-gray-900" : "text-white/60 hover:text-white"}`}>
                {t === "login" ? "Giriş Yap" : "Üye Ol"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="font-semibold text-gray-800">{tab === "register" ? "Hoş geldiniz! 🎉" : "Giriş başarılı!"}</p>
              <p className="text-xs text-gray-500 text-center">İşletmelerin üyelere özel avantajlarından yararlanabilirsiniz.</p>
            </div>
          ) : (
            <form onSubmit={tab === "register" ? handleRegister : handleLogin} className="space-y-3">
              {tab === "register" && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Hesap türü</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("individual")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${accountType === "individual" ? "border-indigo-500 bg-white text-indigo-700 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      Bireysel
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("business")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${accountType === "business" ? "border-indigo-500 bg-white text-indigo-700 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      İşletme
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    Bireysel hesap sipariş ve alışveriş için kullanılır. İşletme hesabı haritada ve modüllerde görünürlük için yönetim onaylıdır.
                  </p>
                </div>
              )}
              {tab === "register" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ad *</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Adınız"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Soyad *</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Soyadınız"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ornek@mail.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GSM <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XX XXX XX XX"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Şifre *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="En az 6 karakter"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şifre tekrar *</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Şifreyi tekrar girin"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              )}
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Lütfen bekleyin...</> : tab === "register" ? "Üye Ol" : "Giriş Yap"}
              </button>
              {tab === "register" && (
                <div className="flex items-start gap-2 text-[11px] text-gray-400 mt-1">
                  <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Üyelik ile premium işletmelerin özel indirim ve kampanyalarından yararlanırsınız.
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
