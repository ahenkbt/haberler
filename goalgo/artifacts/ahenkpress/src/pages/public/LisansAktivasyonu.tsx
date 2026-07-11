import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Mail, Key, CheckCircle2, AlertCircle,
  Building2, Phone, Globe, CreditCard, MessageCircle, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Tab = "activate" | "register";
type Plan = "starter" | "pro" | "enterprise";

const plans = [
  {
    value: "starter" as Plan,
    label: "Starter",
    price: 1499,
    desc: "Küçük bölgesel haber siteleri için",
    features: ["Sınırsız haber", "Temel modüller", "Standart destek"],
  },
  {
    value: "pro" as Plan,
    label: "Pro",
    price: 2999,
    desc: "Orta ölçekli haber portalları için",
    features: ["Tüm Starter özellikler", "AI İçerik Robotu", "Video TV", "E-Ticaret", "Öncelikli destek"],
    popular: true,
  },
  {
    value: "enterprise" as Plan,
    label: "Enterprise",
    price: 4999,
    desc: "Büyük haber kuruluşları için",
    features: ["Tüm Pro özellikler", "Çoklu site", "Özel entegrasyonlar", "7/24 destek"],
  },
];

function ActivateTab() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      apiRequest("/api/site-activation", {
        method: "POST",
        body: JSON.stringify({ email, activationCode: code }),
      }),
    onSuccess: (data: any) => {
      if (data.success) {
        setSuccess(true);
        setTimeout(() => window.location.href = "/", 2000);
      } else {
        setServerError(data.error || "Aktivasyon başarısız");
      }
    },
    onError: () => setServerError("Sunucu hatası. Lütfen tekrar deneyin."),
  });

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Lisans Aktifleştirildi!</h2>
        <p className="text-gray-500">Yekpare başarıyla lisanslandı. Anasayfaya yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Aktivasyon Kodu nereden alınır?</strong><br />
        Satın alma sonrası WhatsApp üzerinden size gönderilir. Henüz almadıysanız aşağıdan başvurun.
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
          <Mail className="w-3.5 h-3.5 inline mr-1" />E-posta Adresiniz
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="lisansinizla@kayitli.mail"
          className="text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
          <Key className="w-3.5 h-3.5 inline mr-1" />Aktivasyon Kodu
        </label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="AP-XXXXXX-XXXXXX-XXXXXX"
          className="text-sm font-mono"
          maxLength={26}
        />
        <p className="text-xs text-gray-400 mt-1">Format: AP-XXXXXX-XXXXXX-XXXXXX</p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {serverError}
        </div>
      )}

      <Button
        onClick={() => { setServerError(""); mut.mutate(); }}
        disabled={!email || !code || mut.isPending}
        className="w-full bg-[#e61e25] hover:bg-[#c9181e] text-white font-bold"
      >
        {mut.isPending ? "Doğrulanıyor..." : "Lisansı Aktifleştir"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function RegisterTab() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("pro");
  const [payMethod, setPayMethod] = useState<"bank" | "stripe">("bank");
  const [step, setStep] = useState<"plan" | "form" | "done">("plan");
  const [form, setForm] = useState({ customerName: "", customerEmail: "", phone: "", domain: "", notes: "" });
  const [reqId, setReqId] = useState<number | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      apiRequest("/api/license-request", {
        method: "POST",
        body: JSON.stringify({ ...form, plan: selectedPlan, paymentMethod: payMethod }),
      }),
    onSuccess: (data: any) => {
      if (data.success) { setReqId(data.requestId); setStep("done"); }
    },
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  if (step === "done") {
    return (
      <div className="flex flex-col items-center py-10 text-center gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Başvurunuz Alındı!</h2>
        <p className="text-gray-500 text-sm max-w-md">
          Başvuru numaranız: <strong>#{reqId}</strong><br />
          Ödeme yaptıktan sonra dekontunuzu WhatsApp üzerinden gönderin, aktivasyon kodunuz iletilecektir.
        </p>

        {payMethod === "bank" && (
          <div className="bg-gray-50 border rounded-xl p-5 text-left w-full max-w-sm mt-2">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Banka Hesap Bilgileri</h3>
            <div className="space-y-1.5 text-sm">
              <div><span className="text-gray-500">Alıcı:</span> <strong>Ahenk Bilgi Teknolojileri</strong></div>
              <div><span className="text-gray-500">IBAN:</span> <strong className="font-mono">TR00 0000 0000 0000 0000 0000 00</strong></div>
              <div><span className="text-gray-500">Tutar:</span> <strong>₺{plans.find(p => p.value === selectedPlan)?.price.toLocaleString("tr-TR")}</strong></div>
              <div><span className="text-gray-500">Açıklama:</span> <strong>Yekpare Lisans #{reqId}</strong></div>
            </div>
          </div>
        )}

        {payMethod === "stripe" && (
          <a
            href="https://buy.stripe.com/your-link"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#635bff] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#4f46e5] transition-colors mt-2"
          >
            <CreditCard className="w-4 h-4" /> Stripe ile Ödeme Yap
          </a>
        )}

        <a
          href="https://wa.me/905550000000"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Dekontu WhatsApp'tan Gönder
        </a>
      </div>
    );
  }

  if (step === "plan") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.value}
              onClick={() => setSelectedPlan(plan.value)}
              className={`relative text-left border-2 rounded-xl p-4 transition-all ${
                selectedPlan === plan.value
                  ? "border-[#e61e25] bg-red-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              {plan.popular && (
                <span className="absolute top-3 right-3 bg-[#e61e25] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  En Popüler
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-gray-900 text-lg">{plan.label}</span>
                <span className="font-black text-2xl text-gray-900">₺{plan.price.toLocaleString("tr-TR")}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{plan.desc}</p>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ödeme Yöntemi</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "bank" as const, label: "Banka Havalesi" },
              { value: "stripe" as const, label: "Kredi Kartı (Stripe)" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPayMethod(value)}
                className={`border-2 rounded-xl p-3 text-sm font-semibold transition-all ${
                  payMethod === value ? "border-[#e61e25] bg-red-50 text-[#e61e25]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={() => setStep("form")} className="w-full bg-[#e61e25] hover:bg-[#c9181e] text-white font-bold">
          Devam Et <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // form step
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border rounded-xl p-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">Seçili Plan:</span>
        <span className="font-bold text-gray-900">{plans.find(p => p.value === selectedPlan)?.label} — ₺{plans.find(p => p.value === selectedPlan)?.price.toLocaleString("tr-TR")}</span>
        <button onClick={() => setStep("plan")} className="text-[#e61e25] text-xs font-bold hover:underline">Değiştir</button>
      </div>

      {[
        { key: "customerName", label: "Ad Soyad", placeholder: "Ahmet Yılmaz", required: true },
        { key: "customerEmail", label: "E-posta", placeholder: "mail@adresiniz.com", required: true },
        { key: "phone", label: "Telefon / WhatsApp", placeholder: "+90 555 000 00 00", required: true },
        { key: "domain", label: "Site Domain", placeholder: "habersite.com", required: false },
      ].map(({ key, label, placeholder, required }) => (
        <div key={key}>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label} {required && "*"}</label>
          <Input
            value={(form as any)[key]}
            onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            className="text-sm"
          />
        </div>
      ))}

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notlar (opsiyonel)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-16"
          placeholder="Özel istekleriniz..."
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={() => mut.mutate()} disabled={!form.customerName || !form.customerEmail || !form.phone || mut.isPending} className="flex-1 bg-[#e61e25] hover:bg-[#c9181e] text-white font-bold">
          {mut.isPending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
        </Button>
        <Button variant="outline" onClick={() => setStep("plan")}>Geri</Button>
      </div>
    </div>
  );
}

export default function LisansAktivasyonu() {
  const [tab, setTab] = useState<Tab>("activate");

  const { data: activation } = useQuery({
    queryKey: ["site-activation"],
    queryFn: () => apiRequest("/api/site-activation"),
  });

  if ((activation as any)?.status === "active") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Lisans Aktif</h1>
          <p className="text-gray-500 text-sm mb-6">Bu kurulum lisanslıdır ve çalışmaya hazırdır.</p>
          <div className="bg-gray-50 border rounded-xl p-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">E-posta:</span>
              <span className="font-medium">{(activation as any).email}</span>
            </div>
            {(activation as any).expiresAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Geçerlilik:</span>
                <span className="font-medium">{new Date((activation as any).expiresAt).toLocaleDateString("tr-TR")}</span>
              </div>
            )}
          </div>
          <a href="/" className="mt-6 inline-flex items-center gap-2 bg-[#e61e25] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#c9181e] transition-colors">
            Siteye Git <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e61e25] rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-black text-3xl">Y</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            <span className="text-[#e61e25]">Yek</span>pare
          </h1>
          <p className="text-gray-500 text-sm mt-1">Yerli arama motoru — Lisans yönetimi</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            {([
              { key: "activate", label: "Lisansımı Aktifleştir", icon: Key },
              { key: "register", label: "Lisans Satın Al",       icon: ShieldCheck },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                  tab === key
                    ? "text-[#e61e25] border-b-2 border-[#e61e25] -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "activate" ? <ActivateTab /> : <RegisterTab />}
          </div>
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-green-900 text-sm">Desteğe ihtiyacınız mı?</div>
            <div className="text-xs text-green-700 mt-0.5">Sorularınız için WhatsApp'tan yazın</div>
          </div>
          <a
            href="https://wa.me/905550000000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
