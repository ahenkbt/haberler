import { useState } from "react";
import { Link } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import {
  User, Building2, FileText, CheckCircle2, Upload, ArrowRight,
  ArrowLeft, Mail, Phone, MapPin, Globe, Hash, Store,
  AlertCircle, Loader2, ShieldCheck
} from "lucide-react";
import type { TrAddressValue } from "@/components/TrAddressFields";

const API = "/api";

type PartnerType = "sahis" | "limited" | "anonim";

interface FormData {
  partnerType: PartnerType | "";
  firstName: string; lastName: string;
  email: string; phone: string;
  companyName: string; taxNumber: string; taxOffice: string;
  address: string; city: string; district: string; website: string;
  tcKimlik: string;
  taxDocumentUrl: string;
  signatureCircularUrl: string;
  businessCategories: string[];
  description: string;
  termsAccepted: boolean;
}

const INITIAL: FormData = {
  partnerType: "", firstName: "", lastName: "", email: "", phone: "",
  companyName: "", taxNumber: "", taxOffice: "", address: "", city: "",
  district: "", website: "", tcKimlik: "",
  taxDocumentUrl: "", signatureCircularUrl: "",
  businessCategories: [], description: "", termsAccepted: false,
};

const BUSINESS_CATS = [
  "🍔 Yemek & Restoran", "🛒 Market & Süpermarket", "💊 Eczane", "☕ Kafe & Pastane",
  "👕 Giyim & Moda", "📱 Elektronik", "🏠 Ev & Dekorasyon", "💄 Kozmetik & Bakım",
  "📚 Kitap & Kırtasiye", "⚽ Spor & Outdoor", "🌸 Çiçekçi", "🔧 Teknik Servis",
  "💇 Güzellik & Kuaför", "🏥 Sağlık & Klinik", "🏋️ Spor Salonu", "🎓 Eğitim",
  "🚗 Otomotiv", "🏡 Gayrimenkul", "✈️ Turizm & Seyahat", "Diğer",
];

const STEPS = [
  { label: "İşletme Türü", icon: <Store className="w-4 h-4" /> },
  { label: "İletişim Bilgileri", icon: <User className="w-4 h-4" /> },
  { label: "İşletme Bilgileri", icon: <Building2 className="w-4 h-4" /> },
  { label: "Belgeler", icon: <FileText className="w-4 h-4" /> },
  { label: "Faaliyet Alanı", icon: <Store className="w-4 h-4" /> },
  { label: "Onay & Gönder", icon: <CheckCircle2 className="w-4 h-4" /> },
];

function FileUploadBox({
  label, hint, value, onChange, accept = ".pdf,.jpg,.jpeg,.png"
}: {
  label: string; hint: string; value: string;
  onChange: (url: string) => void; accept?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Simulated upload — in production use object storage
    await new Promise(r => setTimeout(r, 800));
    onChange(`uploaded:${file.name}`);
    setUploading(false);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition
        ${value ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300"}`}>
        <input type="file" accept={accept} className="hidden" onChange={handleFile} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Yükleniyor...</span>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2 text-green-600">
            <CheckCircle2 className="w-7 h-7" />
            <span className="text-xs font-semibold">Yüklendi ✓</span>
            <span className="text-xs text-gray-400 max-w-[200px] truncate">{value.replace("uploaded:", "")}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload className="w-7 h-7" />
            <span className="text-xs">Dosya seç veya sürükle</span>
            <span className="text-xs text-gray-300">PDF, JPG, PNG — maks. 5MB</span>
          </div>
        )}
      </label>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder = "", type = "text", required = false, hint = ""
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
      />
    </div>
  );
}

export default function IsOrtagiBasvuru() {
  const { data: siteSettings } = useGetSiteSettings();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [appId, setAppId] = useState<number | null>(null);
  const [trAddress, setTrAddress] = useState<TrAddressValue>({ city: "", district: "", mahalle: "", sokak: "" });

  const set = (field: keyof FormData, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const setTr = (v: TrAddressValue) => {
    setTrAddress(v);
    setForm((f) => ({
      ...f,
      city: v.city,
      district: v.district,
      address: v.sokak?.trim() ? v.sokak : f.address,
    }));
  };

  const toggleCat = (cat: string) => {
    set("businessCategories", form.businessCategories.includes(cat)
      ? form.businessCategories.filter(c => c !== cat)
      : [...form.businessCategories, cat]);
  };

  const nextStep = () => { setError(""); setStep(s => s + 1); };
  const prevStep = () => { setError(""); setStep(s => s - 1); };

  const validateStep = (): boolean => {
    if (step === 0 && !form.partnerType) { setError("İşletme türü seçin"); return false; }
    if (step === 1) {
      if (!form.firstName || !form.lastName) { setError("Ad soyad zorunludur"); return false; }
      if (!form.email || !form.email.includes("@")) { setError("Geçerli e-posta girin"); return false; }
      if (!form.phone) { setError("Telefon zorunludur"); return false; }
    }
    if (step === 2) {
      if (!form.companyName) { setError("İşletme adı zorunludur"); return false; }
      if (!form.taxNumber) { setError("Vergi numarası zorunludur"); return false; }
      if (!form.address) { setError("Adres zorunludur"); return false; }
      if (!form.city) { setError("Şehir seçin"); return false; }
    }
    if (step === 3) {
      if (form.partnerType === "sahis" && !form.tcKimlik) {
        setError("Şahıs firmaları için TC kimlik numarası zorunludur"); return false;
      }
      if (!form.taxDocumentUrl) { setError("Vergi levhası yüklemek zorunludur"); return false; }
      if ((form.partnerType === "limited" || form.partnerType === "anonim") && !form.signatureCircularUrl) {
        setError("Şirketler için imza sirküleri zorunludur"); return false;
      }
    }
    if (step === 4 && form.businessCategories.length === 0) {
      setError("En az bir faaliyet alanı seçin"); return false;
    }
    if (step === 5 && !form.termsAccepted) {
      setError("Kullanım koşullarını kabul etmeniz gerekiyor"); return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) nextStep();
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/partners/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Başvuru gönderilemedi"); return; }
      setAppId(data.applicationId);
      setDone(true);
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Başvurunuz Alındı!</h2>
          <p className="text-gray-500 mb-4">Başvuru No: <span className="font-bold text-blue-600">#{appId}</span></p>
          <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-800 mb-6 space-y-2">
            <p className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <span><strong>{form.email}</strong> adresine doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              <span>E-postanızı doğruladıktan sonra belgeleriniz incelemeye alınacak.</span>
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>Onay süresi ortalama <strong>1–2 iş günü</strong>dür.</span>
            </p>
          </div>
          <Link href="/">
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
              Ana Sayfaya Dön
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/is-ortagi">
            <button className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto mb-3">
              <ArrowLeft className="w-4 h-4" /> İş Ortağı Sayfasına Dön
            </button>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">İş Ortağı Başvurusu</h1>
          <p className="text-gray-500 text-sm mt-1">Yekpare'ya satıcı olarak katıl</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex flex-col items-center ${i <= step ? "text-blue-600" : "text-gray-300"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                  ${i < step ? "bg-blue-600 border-blue-600 text-white" : i === step ? "bg-white border-blue-600 text-blue-600" : "bg-white border-gray-200 text-gray-300"}`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:block text-xs mt-1 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">

          {/* STEP 0: Partner type */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">İşletme Türünü Seç</h2>
              <p className="text-sm text-gray-500 mb-6">Belge gereksinimleri işletme türüne göre farklılık gösterir.</p>
              <div className="space-y-3">
                {[
                  { value: "sahis", icon: <User className="w-6 h-6 text-orange-500" />, label: "Şahıs Firması", desc: "Bireysel esnaf, serbest meslek sahibi", docs: "TC Kimlik + Vergi Levhası" },
                  { value: "limited", icon: <Building2 className="w-6 h-6 text-blue-600" />, label: "Limited Şirket (Ltd. Şti.)", desc: "Limited şirket tüzel kişisi", docs: "Vergi Levhası + İmza Sirküleri" },
                  { value: "anonim", icon: <Building2 className="w-6 h-6 text-indigo-600" />, label: "Anonim Şirket (A.Ş.)", desc: "Anonim şirket tüzel kişisi", docs: "Vergi Levhası + İmza Sirküleri" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set("partnerType", opt.value as PartnerType)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition
                      ${form.partnerType === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                      ${form.partnerType === opt.value ? "bg-blue-100" : "bg-gray-100"}`}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">📄 {opt.docs}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${form.partnerType === opt.value ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                      {form.partnerType === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Contact info */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">İletişim Bilgileri</h2>
              <p className="text-sm text-gray-500 mb-6">Yetkili kişinin bilgilerini girin.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Ad" value={form.firstName} onChange={v => set("firstName", v)} placeholder="Ahmet" required />
                  <InputField label="Soyad" value={form.lastName} onChange={v => set("lastName", v)} placeholder="Yılmaz" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    E-posta <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-1">E-posta doğrulaması için kullanılacak.</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                      placeholder="ahmet@firma.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                      placeholder="0530 000 0000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business info */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">İşletme Bilgileri</h2>
              <p className="text-sm text-gray-500 mb-6">Resmi kayıtlı işletme bilgilerinizi girin.</p>
              <div className="space-y-4">
                <InputField label="İşletme / Şirket Adı" value={form.companyName} onChange={v => set("companyName", v)}
                  placeholder="Yılmaz Bakkaliye" required />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Vergi Numarası <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={form.taxNumber} onChange={e => set("taxNumber", e.target.value)}
                        placeholder="1234567890"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>
                  </div>
                  <InputField label="Vergi Dairesi" value={form.taxOffice} onChange={v => set("taxOffice", v)}
                    placeholder="Kadıköy" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Il / Ilce / Mahalle / Sokak <span className="text-red-500">*</span>
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <LocationPickerGooglePrimary
                      mapsSettings={siteSettings ?? null}
                      compactGoogle
                      value={trAddress}
                      onChange={setTr}
                      showSokak
                      showMahalle
                      onGooglePick={(r) => {
                        setForm((f) => ({
                          ...f,
                          address: (f.address || "").trim() ? f.address : r.addressLine,
                        }));
                      }}
                    />
                  </div>
                </div>
                <InputField label="Açık Adres / Bina No" value={form.address} onChange={v => set("address", v)} placeholder="No, daire, kat, kapı tarifi..." required />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="url" value={form.website} onChange={e => set("website", e.target.value)}
                      placeholder="https://firma.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Documents */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Belge Yükleme</h2>
              <p className="text-sm text-gray-500 mb-6">
                {form.partnerType === "sahis"
                  ? "Şahıs firması olarak TC kimlik ve vergi levhası gereklidir."
                  : "Şirket olarak vergi levhası ve imza sirküleri gereklidir."}
              </p>
              <div className="space-y-5">

                {form.partnerType === "sahis" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      TC Kimlik Numarası <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">11 haneli TC kimlik numaranız</p>
                    <input
                      type="text"
                      maxLength={11}
                      value={form.tcKimlik}
                      onChange={e => set("tcKimlik", e.target.value.replace(/\D/g, ""))}
                      placeholder="12345678901"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition tracking-widest font-mono"
                    />
                    {form.tcKimlik.length > 0 && form.tcKimlik.length !== 11 && (
                      <p className="text-xs text-red-500 mt-1">TC kimlik numarası 11 haneli olmalıdır ({form.tcKimlik.length}/11)</p>
                    )}
                  </div>
                )}

                <FileUploadBox
                  label={`Vergi Levhası${" *"}`}
                  hint="Güncel vergi levhanızın fotoğrafı veya PDF'i (maks. 5MB)"
                  value={form.taxDocumentUrl}
                  onChange={v => set("taxDocumentUrl", v)}
                />

                {(form.partnerType === "limited" || form.partnerType === "anonim") && (
                  <FileUploadBox
                    label="İmza Sirküleri *"
                    hint="Noterce onaylı, yetkilinin imzasını gösteren sirküler (maks. 5MB)"
                    value={form.signatureCircularUrl}
                    onChange={v => set("signatureCircularUrl", v)}
                  />
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>Belgeler güvenli sunucularımızda şifreli olarak saklanır ve yalnızca doğrulama amacıyla kullanılır.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Business categories */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Faaliyet Alanı</h2>
              <p className="text-sm text-gray-500 mb-2">İşletmenizin faaliyet gösterdiği kategorileri seçin. <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mb-4">{form.businessCategories.length} kategori seçili</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {BUSINESS_CATS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border
                      ${form.businessCategories.includes(cat)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">İşletme Hakkında (İsteğe Bağlı)</label>
                <textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="İşletmenizi kısaca tanıtın, ne tür ürün/hizmet sunuyorsunuz..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Review & submit */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Başvuruyu Gözden Geçir</h2>
              <p className="text-sm text-gray-500 mb-5">Bilgilerinizi kontrol edin ve gönderin.</p>

              <div className="space-y-3 mb-6">
                {[
                  { label: "İşletme Türü", val: form.partnerType === "sahis" ? "Şahıs Firması" : form.partnerType === "limited" ? "Ltd. Şti." : "A.Ş." },
                  { label: "Ad Soyad", val: `${form.firstName} ${form.lastName}` },
                  { label: "E-posta", val: form.email },
                  { label: "Telefon", val: form.phone },
                  { label: "İşletme Adı", val: form.companyName },
                  { label: "Vergi No", val: form.taxNumber },
                  { label: "Şehir", val: `${form.city}${form.district ? ` / ${form.district}` : ""}` },
                  { label: "Faaliyet", val: form.businessCategories.length > 0 ? form.businessCategories.join(", ") : "—" },
                  { label: "Vergi Levhası", val: form.taxDocumentUrl ? "✓ Yüklendi" : "✗ Eksik" },
                  ...(form.partnerType === "sahis" ? [{ label: "TC Kimlik", val: form.tcKimlik ? `${"*".repeat(7)}${form.tcKimlik.slice(-4)}` : "✗ Eksik" }] : []),
                  ...((form.partnerType === "limited" || form.partnerType === "anonim") ? [{ label: "İmza Sirküleri", val: form.signatureCircularUrl ? "✓ Yüklendi" : "✗ Eksik" }] : []),
                ].map((row, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">{row.label}</span>
                    <span className={`font-semibold text-right max-w-[55%] ${row.val.startsWith("✗") ? "text-red-500" : "text-gray-800"}`}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => set("termsAccepted", !form.termsAccepted)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition
                    ${form.termsAccepted ? "bg-blue-600 border-blue-600" : "border-gray-300 group-hover:border-blue-400"}`}
                >
                  {form.termsAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-600">
                  <a href="/kullanim-kosullari" className="text-blue-600 hover:underline" target="_blank">Kullanım Koşulları</a>,{" "}
                  <a href="/gizlilik-politikasi" className="text-blue-600 hover:underline" target="_blank">Gizlilik Politikası</a>{" "}
                  ve Satıcı Sözleşmesi'ni okudum ve kabul ediyorum.
                </span>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={prevStep} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                Devam Et <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</> : <><CheckCircle2 className="w-4 h-4" /> Başvuruyu Gönder</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Sorunlarınız için: <a href="mailto:destek@turk.eco" className="text-blue-600 hover:underline">destek@turk.eco</a>
        </p>
      </div>
    </div>
  );
}
