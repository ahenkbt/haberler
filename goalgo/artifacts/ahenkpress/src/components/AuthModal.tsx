import { useState } from "react";
import { X, Eye, EyeOff, User, Mail, Lock, Phone, Loader2, MapPin } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";

interface Props {
  onClose: () => void;
  initialTab?: "login" | "register";
  /** Giriş veya kayıt başarılı olduktan sonra (ör. adres formunu yeniden doldurmak için). */
  onSessionChange?: () => void;
}

export function AuthModal({ onClose, initialTab = "login", onSessionChange }: Props) {
  const { data: siteSettings } = useGetSiteSettings();
  const { login, register } = useCustomerAuth();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  /* Login form */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  /* Register form */
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regMahalle, setRegMahalle] = useState("");
  const [regAddressDetail, setRegAddressDetail] = useState("");
  const [regPostal, setRegPostal] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await login(loginEmail, loginPass);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onSessionChange?.();
    onClose();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); 
    if (regPass !== regPass2) { setError("Şifreler eşleşmiyor"); return; }
    setLoading(true);
    const mh = regMahalle.trim();
    const det = regAddressDetail.trim();
    const mergedAddr = mh ? (det ? `${mh}, ${det}` : mh) : det;
    const res = await register({
      email: regEmail,
      password: regPass,
      name: regName,
      phone: regPhone || undefined,
      city: regCity.trim() || undefined,
      district: regDistrict.trim() || undefined,
      address: mergedAddr || undefined,
      postal: regPostal.trim() || undefined,
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onSessionChange?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {tab === "login" ? "Hesabınıza Giriş Yapın" : "Hesap Oluşturun"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {tab === "login" ? "Siparişlerinizi ve favorilerinizi takip edin" : "Hızlı alışveriş için kayıt olun"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mb-5 bg-gray-100 rounded-xl p-1">
          {(["login", "register"] as const).map(t => (
            <button key={t}
              onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={tab === t ? { background: "#e61e25", color: "#fff", boxShadow: "0 2px 8px rgba(230,30,37,0.3)" } : { color: "#6b7280" }}>
              {t === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field icon={<Mail className="w-4 h-4" />} label="E-posta">
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="ornek@email.com" required autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
              </Field>
              <Field icon={<Lock className="w-4 h-4" />} label="Şifre">
                <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••" required autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-black text-sm transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #e61e25, #c0181e)" }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>
              <p className="text-center text-sm text-gray-500">
                Hesabınız yok mu?{" "}
                <button type="button" onClick={() => setTab("register")} className="text-red-600 font-bold hover:underline">
                  Kayıt Ol
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field icon={<User className="w-4 h-4" />} label="Ad Soyad">
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                  placeholder="Adınız Soyadınız" required autoComplete="name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
              </Field>
              <Field icon={<Mail className="w-4 h-4" />} label="E-posta">
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  placeholder="ornek@email.com" required autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />} label="Telefon (opsiyonel)">
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  placeholder="0555 000 00 00" autoComplete="tel"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
              </Field>
              <div className="rounded-xl border border-gray-100 bg-gray-50/90 p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Adres (isteğe bağlı)
                </p>
                <LocationPickerGooglePrimary
                  mapsSettings={siteSettings ?? null}
                  compactGoogle
                  value={{ city: regCity, district: regDistrict, mahalle: regMahalle }}
                  onChange={(v) => {
                    setRegCity(v.city);
                    setRegDistrict(v.district);
                    setRegMahalle(v.mahalle);
                  }}
                  showSokak={false}
                  onGooglePick={(r) => {
                    setRegAddressDetail((d) => (d || "").trim() ? d : r.addressLine);
                  }}
                />
                <Field icon={<MapPin className="w-4 h-4" />} label="Sokak, bina no (opsiyonel)">
                  <input type="text" value={regAddressDetail} onChange={e => setRegAddressDetail(e.target.value)}
                    placeholder="Cadde, kapı no, daire"
                    autoComplete="street-address"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
                </Field>
                <Field icon={<MapPin className="w-4 h-4" />} label="Posta kodu (opsiyonel)">
                  <input type="text" value={regPostal} onChange={e => setRegPostal(e.target.value)}
                    placeholder="34710"
                    autoComplete="postal-code"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<Lock className="w-4 h-4" />} label="Şifre">
                  <input type={showPass ? "text" : "password"} value={regPass} onChange={e => setRegPass(e.target.value)}
                    placeholder="Min 6 karakter" required minLength={6} autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
                </Field>
                <Field icon={<Lock className="w-4 h-4" />} label="Tekrar">
                  <input type={showPass ? "text" : "password"} value={regPass2} onChange={e => setRegPass2(e.target.value)}
                    placeholder="Şifreyi tekrarla" required autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" onChange={() => setShowPass(v => !v)} className="rounded" />
                Şifreyi göster
              </label>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-black text-sm transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #e61e25, #c0181e)" }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Kayıt yapılıyor…" : "Hesap Oluştur"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Kayıt olarak{" "}
                <a href="/kullanim-kosullari" className="underline">kullanım koşullarını</a>{" "}
                kabul etmiş sayılırsınız.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Input field wrapper with icon ── */
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}
