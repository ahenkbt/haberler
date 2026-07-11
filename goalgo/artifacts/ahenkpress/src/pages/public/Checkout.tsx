import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useShopAuth, shopFetch } from "@/hooks/useShopAuth";
import {
  ShoppingCart, User, MapPin, CreditCard, ChevronLeft,
  CheckCircle, Lock, AlertCircle, Eye, EyeOff, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import type { TrAddressValue } from "@/components/TrAddressFields";
import { StripeCardPay } from "@/components/TrCheckoutPanel";

interface CartItem { product: { id: number; name: string; price: string; salePrice?: string | null; imageUrl?: string | null }; qty: number }

interface CheckoutProps { cart: CartItem[]; onSuccess: (orderNumber: string, trackingCode: string) => void; onBack: () => void }

type Step = "info" | "payment" | "success";

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const cart: CartItem[] = JSON.parse(sessionStorage.getItem("checkout_cart") ?? "[]");
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; trackingCode: string } | null>(null);
  const [step, setStep] = useState<Step>(orderResult ? "success" : "info");

  if (cart.length === 0 && step !== "success") {
    navigate("/magaza");
    return null;
  }

  return (
    <CheckoutFlow
      cart={cart}
      onSuccess={(orderNumber, trackingCode) => {
        setOrderResult({ orderNumber, trackingCode });
        setStep("success");
      }}
      onBack={() => navigate("/magaza")}
      step={step}
      setStep={setStep}
      orderResult={orderResult}
    />
  );
}

function CheckoutFlow({ cart, onSuccess, onBack, step, setStep, orderResult }: {
  cart: CartItem[]; onSuccess: (o: string, t: string) => void;
  onBack: () => void; step: Step; setStep: (s: Step) => void;
  orderResult: { orderNumber: string; trackingCode: string } | null;
}) {
  const { data: settings } = useGetSiteSettings();
  const { user, login, register } = useShopAuth();
  const { toast } = useToast();

  const subtotal = cart.reduce((s, c) => s + parseFloat(c.product.salePrice ?? c.product.price) * c.qty, 0);
  const taxRate = 0.20;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  // Customer info form
  const [form, setForm] = useState({
    name: user?.name ?? "", email: "", phone: user?.phone ?? "",
    address: user?.address ?? "", city: user?.city ?? "", district: user?.district ?? "", postal: user?.postal ?? "",
    billingName: "", billingAddress: "", billingCity: "", billingTaxId: "",
    differentBilling: false,
  });
  const [deliveryTr, setDeliveryTr] = useState<TrAddressValue>({
    city: user?.city ?? "",
    district: user?.district ?? "",
    mahalle: "",
    sokak: "",
  });
  useEffect(() => {
    if (user) setForm(f => ({ ...f, name: f.name || user.name, phone: f.phone || (user.phone ?? ""), address: f.address || (user.address ?? ""), city: f.city || (user.city ?? ""), district: f.district || (user.district ?? ""), postal: f.postal || (user.postal ?? "") }));
  }, [user]);
  useEffect(() => {
    setForm((f) => ({ ...f, city: deliveryTr.city, district: deliveryTr.district }));
  }, [deliveryTr.city, deliveryTr.district]);
  useEffect(() => {
    if (!deliveryTr.sokak?.trim()) return;
    setForm((f) => (f.address?.trim() ? f : { ...f, address: deliveryTr.sokak || "" }));
  }, [deliveryTr.sokak]);

  // Auth
  const [authMode, setAuthMode] = useState<"guest" | "login" | "register">("guest");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Payment (Stripe intent)
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [legalMesafeli, setLegalMesafeli] = useState(false);
  const [legalOnbilgi, setLegalOnbilgi] = useState(false);

  const f = (key: keyof typeof form, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const u = await login(authEmail, authPass);
        setForm(prev => ({ ...prev, name: prev.name || u.name, phone: prev.phone || (u.phone ?? ""), address: prev.address || (u.address ?? ""), city: prev.city || (u.city ?? "") }));
        toast({ title: `Hoş geldiniz, ${u.name}!` });
      } else if (authMode === "register") {
        const u = await register({ email: authEmail, password: authPass, name: authName, phone: form.phone, address: form.address, city: form.city, district: form.district, postal: form.postal });
        toast({ title: `Hesabınız oluşturuldu, ${u.name}!` });
      }
    } catch (e: any) { toast({ title: "Hata", description: e.message, variant: "destructive" }); }
    finally { setAuthLoading(false); }
  };

  const validateInfo = () => {
    if (!form.name || !form.email || !form.phone || !form.address || !form.city || !form.postal) {
      toast({ title: "Eksik bilgi", description: "Tüm zorunlu alanları doldurun", variant: "destructive" }); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Geçersiz e-posta", variant: "destructive" }); return false;
    }
    if (!legalMesafeli || !legalOnbilgi) {
      toast({
        title: "Yasal onay",
        description: "Mesafeli satış sözleşmesi ve ön bilgilendirme formunu onaylamanız zorunludur.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const loadPaymentIntent = useCallback(async () => {
    setIntentLoading(true);
    try {
      const items = cart.map((c) => ({ productId: c.product.id, qty: c.qty }));
      const [intentRes, keyRes] = await Promise.all([
        shopFetch("/api/shop/checkout/intent", { method: "POST", body: JSON.stringify({ items }) }),
        shopFetch("/api/shop/checkout/stripe-key"),
      ]);
      const intentData = await intentRes.json();
      const keyData = await keyRes.json();
      setStripeConfigured(Boolean(intentData.stripeConfigured));
      setClientSecret(intentData.clientSecret ?? null);
      setPaymentIntentId(intentData.paymentIntentId ?? null);
      setStripeKey(keyData.key ?? null);
    } catch {
      toast({ title: "Ödeme yüklenemedi", description: "Lütfen tekrar deneyin.", variant: "destructive" });
      setStripeConfigured(false);
    } finally {
      setIntentLoading(false);
    }
  }, [cart, toast]);

  useEffect(() => {
    if (step === "payment") void loadPaymentIntent();
  }, [step, loadPaymentIntent]);

  const submitOrder = async (confirmedPaymentIntentId: string | null) => {
    setPlacing(true);
    try {
      const items = cart.map((c) => ({ productId: c.product.id, qty: c.qty }));
      const r = await shopFetch("/api/shop/checkout/order", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          customerAddress: form.address,
          customerCity: form.city,
          customerDistrict: form.district,
          customerPostal: form.postal,
          billingName: form.differentBilling ? form.billingName : form.name,
          billingAddress: form.differentBilling ? form.billingAddress : form.address,
          billingCity: form.differentBilling ? form.billingCity : form.city,
          billingTaxId: form.billingTaxId || null,
          items,
          paymentIntentId: confirmedPaymentIntentId,
          legalDistanceSalesAccepted: true,
          legalPreinfoAccepted: true,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Sipariş oluşturulamadı");
      sessionStorage.removeItem("checkout_cart");
      onSuccess(data.orderNumber, data.trackingCode);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sipariş oluşturulamadı";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  const placePendingOrder = async () => {
    if (stripeConfigured) {
      toast({ title: "Kart ödemesi gerekli", description: "Stripe ile ödemeyi tamamlayın.", variant: "destructive" });
      return;
    }
    await submitOrder(null);
  };

  const siteName = (settings?.logoText1 ?? "Yek") + (settings?.logoText2 ?? "pare");

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            <span className="text-[#e61e25]">{settings?.logoText1 || "Yek"}</span>
            <span>{settings?.logoText2 || "pare"}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5 text-green-500" /> Güvenli Ödeme
          </div>
        </div>
      </header>

      {step === "success" && orderResult ? (
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">Siparişiniz Alındı!</h1>
          <p className="text-gray-500 mb-6">Sipariş numaranız: <strong>{orderResult.orderNumber}</strong></p>
          <div className="bg-white border rounded-xl p-5 mb-6 text-left">
            <p className="text-sm font-bold mb-2 text-gray-700">Sipariş Takip Kodu</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-lg font-bold text-center text-[#e61e25] border">{orderResult.trackingCode}</div>
            <p className="text-xs text-gray-400 mt-2 text-center">Bu kodu not alın. Siparişinizi takip etmek için kullanabilirsiniz.</p>
          </div>
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-bold text-blue-800 mb-1">Üye olarak daha kolay takip edin!</p>
              <p className="text-blue-600">Üye olarak tüm siparişlerinizi tek yerden takip edebilirsiniz.</p>
            </div>
          )}
          <div className="flex gap-3">
            <Link href={`/siparis-takip/${orderResult.trackingCode}`} className="flex-1 bg-[#e61e25] text-white rounded-lg py-3 font-bold text-sm text-center hover:bg-[#c9181e] transition-colors">
              Siparişi Takip Et
            </Link>
            <Link href="/magaza" className="flex-1 border rounded-lg py-3 font-bold text-sm text-center hover:bg-gray-50 transition-colors">
              Alışverişe Devam
            </Link>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8 text-sm">
            <div className={`flex items-center gap-1.5 font-semibold ${step === "info" ? "text-[#e61e25]" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === "info" ? "bg-[#e61e25] text-white" : step === "payment" ? "bg-green-500 text-white" : "bg-gray-200"}`}>1</span>
              Bilgiler
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-1.5 font-semibold ${step === "payment" ? "text-[#e61e25]" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === "payment" ? "bg-[#e61e25] text-white" : "bg-gray-200"}`}>2</span>
              Ödeme
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-5">
              {step === "info" && (
                <>
                  {/* Auth section */}
                  {!user && (
                    <div className="bg-white rounded-xl border p-5">
                      <h2 className="font-black mb-4 flex items-center gap-2"><User className="w-5 h-5 text-[#e61e25]" /> Hesap</h2>
                      <div className="flex gap-2 mb-4 text-sm">
                        {(["guest", "login", "register"] as const).map(m => (
                          <button key={m} onClick={() => setAuthMode(m)} className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${authMode === m ? "bg-[#e61e25] text-white" : "border hover:bg-gray-50"}`}>
                            {m === "guest" ? "Misafir" : m === "login" ? "Giriş Yap" : "Üye Ol"}
                          </button>
                        ))}
                      </div>
                      {authMode !== "guest" && (
                        <div className="space-y-3">
                          {authMode === "register" && <Input placeholder="Ad Soyad *" value={authName} onChange={e => setAuthName(e.target.value)} />}
                          <Input placeholder="E-posta *" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                          <div className="relative">
                            <Input placeholder="Şifre *" type={showPass ? "text" : "password"} value={authPass} onChange={e => setAuthPass(e.target.value)} className="pr-10" />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                          </div>
                          <Button onClick={handleAuth} disabled={authLoading} className="bg-[#e61e25] hover:bg-[#c9181e] text-white w-full">
                            {authLoading ? "..." : authMode === "login" ? "Giriş Yap" : "Üye Ol"}
                          </Button>
                        </div>
                      )}
                      {authMode === "guest" && <p className="text-xs text-gray-500">Misafir olarak devam ediyorsunuz. Sipariş takip linki e-postanıza gönderilecektir.</p>}
                    </div>
                  )}
                  {user && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> <strong>{user.name}</strong> olarak giriş yapıldı</div>}

                  {/* Delivery info */}
                  <div className="bg-white rounded-xl border p-5">
                    <h2 className="font-black mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-[#e61e25]" /> Teslimat Bilgileri</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">Ad Soyad *</label><Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ad Soyad" /></div>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">E-posta *</label><Input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="ornek@email.com" /></div>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">Telefon *</label><Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="0530 000 00 00" /></div>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">Posta Kodu *</label><Input value={form.postal} onChange={e => f("postal", e.target.value)} placeholder="34100" /></div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Teslimat konumu *</label>
                        <div className="rounded-xl border p-3 bg-gray-50/70">
                          <LocationPickerGooglePrimary
                            mapsSettings={settings ?? null}
                            value={deliveryTr}
                            onChange={setDeliveryTr}
                            showSokak
                            showMahalle
                            compactGoogle
                            onGooglePick={(r) => {
                              setForm((prev) => ({
                                ...prev,
                                address: (prev.address || "").trim() ? prev.address : r.addressLine,
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Açık Adres *</label><Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Bina no, daire, kapı tarifi..." /></div>
                    </div>

                    <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.differentBilling} onChange={e => f("differentBilling", e.target.checked)} className="accent-[#e61e25]" />
                      Farklı fatura adresi kullanmak istiyorum
                    </label>

                    {form.differentBilling && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
                        <div><label className="text-xs font-bold text-gray-500 mb-1 block">Fatura Adı/Ünvanı</label><Input value={form.billingName} onChange={e => f("billingName", e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500 mb-1 block">Vergi No / TC</label><Input value={form.billingTaxId} onChange={e => f("billingTaxId", e.target.value)} /></div>
                        <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">Fatura Adresi</label><Input value={form.billingAddress} onChange={e => f("billingAddress", e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500 mb-1 block">Fatura Şehri</label><Input value={form.billingCity} onChange={e => f("billingCity", e.target.value)} /></div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm text-gray-800">
                    <p className="font-bold text-gray-900">Yasal onaylar</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={legalMesafeli} onChange={(e) => setLegalMesafeli(e.target.checked)} className="accent-[#e61e25] mt-1" />
                      <span>
                        <Link href="/mesafeli-satis-sozlesmesi" className="text-[#e61e25] font-bold underline" target="_blank" rel="noopener noreferrer">
                          Mesafeli Satış Sözleşmesi
                        </Link>
                        &apos;ni okudum ve kabul ediyorum.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={legalOnbilgi} onChange={(e) => setLegalOnbilgi(e.target.checked)} className="accent-[#e61e25] mt-1" />
                      <span>
                        <Link href="/on-bilgilendirme" className="text-[#e61e25] font-bold underline" target="_blank" rel="noopener noreferrer">
                          Ön bilgilendirme formu
                        </Link>
                        nu okudum ve kabul ediyorum.
                      </span>
                    </label>
                  </div>

                  <Button onClick={() => { if (validateInfo()) setStep("payment"); }} className="w-full bg-[#e61e25] hover:bg-[#c9181e] text-white h-12 font-bold text-base">
                    Ödemeye Geç →
                  </Button>
                </>
              )}

              {step === "payment" && (
                <>
                  <div className="bg-white rounded-xl border p-5">
                    <h2 className="font-black mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#e61e25]" /> Ödeme</h2>

                    {intentLoading ? (
                      <p className="text-sm text-gray-500">Ödeme seçenekleri yükleniyor…</p>
                    ) : stripeConfigured && clientSecret && stripeKey ? (
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2 text-sm text-blue-700">
                          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                          <span>Kart bilgileriniz Stripe üzerinden güvenli şekilde işlenir; sunucuya aktarılmaz.</span>
                        </div>
                        <StripeCardPay
                          publishableKey={stripeKey}
                          clientSecret={clientSecret}
                          onSucceeded={() => void submitOrder(paymentIntentId)}
                        />
                      </>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <p className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Online kart ödemesi kapalı</p>
                        <p className="mt-2 text-amber-900">Yönetici Stripe anahtarlarını tanımlayana kadar kartla ödeme alınamaz. Siparişi ödeme bekliyor olarak kaydedebilirsiniz.</p>
                        <Button
                          onClick={() => void placePendingOrder()}
                          disabled={placing}
                          className="mt-4 w-full bg-[#e61e25] hover:bg-[#c9181e] text-white"
                        >
                          {placing ? "Kaydediliyor…" : "Siparişi kaydet (ödeme bekliyor)"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep("info")} variant="outline" className="flex-1">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Order summary */}
            <div>
              <div className="bg-white rounded-xl border p-5 sticky top-24">
                <h3 className="font-black mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-[#e61e25]" /> Sipariş Özeti</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map(({ product, qty }) => (
                    <div key={product.id} className="flex items-center gap-3">
                      {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">× {qty}</p>
                      </div>
                      <p className="text-xs font-bold shrink-0">₺{(parseFloat(product.salePrice ?? product.price) * qty).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Ara Toplam</span><span>₺{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>KDV (%20)</span><span>₺{taxAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Kargo</span><span className="text-green-600 font-semibold">Ücretsiz</span></div>
                  <div className="flex justify-between font-black text-lg border-t pt-2"><span>Toplam</span><span className="text-[#e61e25]">₺{total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
