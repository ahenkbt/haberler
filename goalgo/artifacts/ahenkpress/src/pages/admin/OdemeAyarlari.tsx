import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Save, CreditCard, Building2, Settings, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface PaymentSettings {
  stripeEnabled: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  bankTransferEnabled: boolean;
  bankName?: string;
  bankIban?: string;
  bankAccountName?: string;
  bankBranch?: string;
  currency: string;
  taxRate: string;
  orderEmailFrom?: string;
}

export default function OdemeAyarlari() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings>({
    stripeEnabled: false, bankTransferEnabled: false,
    currency: "TRY", taxRate: "18",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/shop/payment-settings");
      const data = await res.json();
      setSettings(data);
    } catch { toast({ title: "Yüklenemedi", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shop/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Ödeme ayarları kaydedildi" });
      load();
    } catch { toast({ title: "Kaydedilemedi", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const set = (key: keyof PaymentSettings, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return (
    <AdminLayout title="Ödeme Ayarları">
      <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Ödeme Ayarları">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ödeme Ayarları</h1>
          <p className="text-sm text-gray-500 mt-1">Stripe ve banka havalesi entegrasyonu</p>
        </div>
        <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
      </div>

      <Tabs defaultValue="stripe">
        <TabsList className="mb-6">
          <TabsTrigger value="stripe" className="gap-2"><CreditCard className="w-4 h-4" />Stripe (Kart)</TabsTrigger>
          <TabsTrigger value="havale" className="gap-2"><Building2 className="w-4 h-4" />Banka Havalesi</TabsTrigger>
          <TabsTrigger value="genel" className="gap-2"><Settings className="w-4 h-4" />Genel</TabsTrigger>
        </TabsList>

        <TabsContent value="stripe">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#635bff]" /> Stripe Entegrasyonu
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Kredi/banka kartı ödemeleri için Stripe</p>
              </div>
              <Switch checked={settings.stripeEnabled} onCheckedChange={(v) => set("stripeEnabled", v)} />
            </div>

            {settings.stripeEnabled ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-800">Stripe aktif — müşteriler kart ile ödeme yapabilir</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800">Stripe kapalı — etkinleştirmek için anahtarları girin ve açın</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label>Publishable Key (Açık Anahtar)</Label>
                <Input
                  value={settings.stripePublishableKey ?? ""}
                  onChange={e => set("stripePublishableKey", e.target.value)}
                  placeholder="pk_live_... veya pk_test_..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Stripe Dashboard → Developers → API Keys</p>
              </div>
              <div>
                <Label>Secret Key (Gizli Anahtar)</Label>
                <Input
                  type="password"
                  value={settings.stripeSecretKey === "***" ? "" : (settings.stripeSecretKey ?? "")}
                  onChange={e => set("stripeSecretKey", e.target.value)}
                  placeholder={settings.stripeSecretKey === "***" ? "●●●●●●●●●●● (kayıtlı)" : "sk_live_... veya sk_test_..."}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Webhook Secret</Label>
                <Input
                  type="password"
                  value={settings.stripeWebhookSecret === "***" ? "" : (settings.stripeWebhookSecret ?? "")}
                  onChange={e => set("stripeWebhookSecret", e.target.value)}
                  placeholder={settings.stripeWebhookSecret === "***" ? "●●●●●●●●●●● (kayıtlı)" : "whsec_..."}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>

            <div className="bg-[#635bff]/5 border border-[#635bff]/20 rounded-lg p-4 text-sm">
              <p className="font-semibold text-[#635bff] mb-1">Stripe nasıl kurulur?</p>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>stripe.com'da hesap oluşturun</li>
                <li>Dashboard → Developers → API Keys bölümünden anahtarları kopyalayın</li>
                <li>Test modunda pk_test_ ve sk_test_ ile başlayan anahtarları kullanın</li>
                <li>Canlı yayına geçince pk_live_ ve sk_live_ ile değiştirin</li>
              </ol>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="havale">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Banka Havalesi
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">EFT/Havale ile ödeme seçeneği</p>
              </div>
              <Switch checked={settings.bankTransferEnabled} onCheckedChange={(v) => set("bankTransferEnabled", v)} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banka Adı</Label>
                  <Input value={settings.bankName ?? ""} onChange={e => set("bankName", e.target.value)} placeholder="Ziraat Bankası" className="mt-1" />
                </div>
                <div>
                  <Label>Şube</Label>
                  <Input value={settings.bankBranch ?? ""} onChange={e => set("bankBranch", e.target.value)} placeholder="Kırşehir Şubesi" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Hesap Sahibi Adı</Label>
                <Input value={settings.bankAccountName ?? ""} onChange={e => set("bankAccountName", e.target.value)} placeholder="Yekpare Yayıncılık A.Ş." className="mt-1" />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input value={settings.bankIban ?? ""} onChange={e => set("bankIban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className="mt-1 font-mono tracking-wider" />
              </div>
            </div>

            {settings.bankTransferEnabled && settings.bankIban && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Müşteriye gösterilecek bilgiler:</p>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Banka: <strong>{settings.bankName}</strong></div>
                  <div>Hesap Sahibi: <strong>{settings.bankAccountName}</strong></div>
                  <div>IBAN: <strong className="font-mono">{settings.bankIban}</strong></div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="genel">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold text-lg">Genel Ödeme Ayarları</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Para Birimi</Label>
                <Input value={settings.currency} onChange={e => set("currency", e.target.value)} placeholder="TRY" className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">TRY, USD, EUR</p>
              </div>
              <div>
                <Label>KDV Oranı (%)</Label>
                <Input type="number" value={settings.taxRate} onChange={e => set("taxRate", e.target.value)} min="0" max="100" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Sipariş E-posta Gönderici Adresi</Label>
              <Input value={settings.orderEmailFrom ?? ""} onChange={e => set("orderEmailFrom", e.target.value)} placeholder="siparisler@siteaniz.com" type="email" className="mt-1" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2 px-8" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Ayarları Kaydet
        </Button>
      </div>
    </AdminLayout>
  );
}
