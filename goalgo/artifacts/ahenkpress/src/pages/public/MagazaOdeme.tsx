import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { apiUrl } from "@/lib/apiBase";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";

type PreviewData = {
  vendorGroups: Array<{
    vendorId: number;
    vendorName: string;
    vendorSlug: string;
    itemCount: number;
    subtotal: number;
    shippingFee: number;
    total: number;
  }>;
  subtotal: number;
  shippingTotal: number;
  grandTotal: number;
};

type PlacedOrder = {
  vendorId: number;
  vendorName: string;
  orderNumber: string;
  total: string;
};

function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 })
    : "₺0";
}

export default function MagazaOdeme() {
  const { items, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[] | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [postal, setPostal] = useState("");
  const [legalMesafeli, setLegalMesafeli] = useState(false);
  const [legalOnbilgi, setLegalOnbilgi] = useState(false);

  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        vendorId: item.product.vendorId ?? undefined,
        menuItemId: item.product.id,
        name: item.product.name,
        price: parseFloat(item.product.salePrice ?? item.product.price),
        qty: item.qty,
        variant: item.variant,
      })),
    [items],
  );

  useEffect(() => {
    if (!items.length) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    fetch(apiUrl("/api/delivery/marketplace/cart/preview"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: checkoutItems }),
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled) return;
        setPreview(payload?.success ? (payload.data as PreviewData) : null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutItems, items.length]);

  const submit = async () => {
    setError(null);
    if (!items.length) {
      navigate("/magaza/sepet");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !district.trim()) {
      setError("Ad, telefon, adres, il ve ilçe zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (!legalMesafeli || !legalOnbilgi) {
      setError("Mesafeli satış ve ön bilgilendirme onayı zorunludur.");
      return;
    }
    setSubmitting(true);
    try {
      const deliveryLine = `${address.trim()}, ${district.trim()}, ${city.trim()} ${postal.trim()}`.trim();
      const res = await fetch(apiUrl("/api/delivery/marketplace/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          customerAddress: deliveryLine,
          customerCity: city.trim(),
          customerDistrict: district.trim(),
          customerPostalCode: postal.replace(/\D/g, "").slice(0, 5) || undefined,
          paymentMethod: "cash",
          legalDistanceSalesAccepted: true,
          legalPreinfoAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Sipariş oluşturulamadı.");
        return;
      }
      const orders = (data?.data?.orders ?? []) as PlacedOrder[];
      setPlacedOrders(orders);
      clearCart();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length && !placedOrders) {
    return (
      <main className={`w-full pb-10 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <SellzyContainer className="rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-slate-900">Sepetiniz boş</p>
          <Link href="/magaza/urunler" className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">
            Ürünlere dön
          </Link>
        </SellzyContainer>
      </main>
    );
  }

  if (placedOrders?.length) {
    return (
      <main className={`w-full pb-10 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <SellzyContainer className="max-w-2xl rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
            <h1 className="text-2xl font-black">Siparişleriniz alındı</h1>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            {placedOrders.length > 1
              ? "Sepetinizdeki mağazalar için ayrı siparişler oluşturuldu. Her mağaza kendi sürecini yürütecek."
              : "Siparişiniz mağazaya iletildi."}
          </p>
          <ul className="mt-6 space-y-3">
            {placedOrders.map((o) => (
              <li key={o.orderNumber} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-black text-slate-900">{o.vendorName}</p>
                <p className="text-sm text-slate-600">
                  Sipariş no: <span className="font-bold">{o.orderNumber}</span> · {currency(o.total)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/magaza" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Pazaryerine dön
            </Link>
            <Link href="/siparislerim" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-800">
              Siparişlerim
            </Link>
          </div>
        </SellzyContainer>
      </main>
    );
  }

  return (
    <main className={`w-full pb-10 md:pb-14 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
      <SellzyContainer className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Pazaryeri ödeme</p>
          <h1 className="text-3xl font-black">Teslimat bilgileri</h1>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-slate-500">Ad Soyad</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Telefon</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">E-posta</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-slate-500">Adres</span>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">İl</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">İlçe</span>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Posta kodu</span>
              <input value={postal} onChange={(e) => setPostal(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={legalMesafeli} onChange={(e) => setLegalMesafeli(e.target.checked)} className="mt-1" />
              <span>Mesafeli satış sözleşmesini okudum ve kabul ediyorum.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={legalOnbilgi} onChange={(e) => setLegalOnbilgi(e.target.checked)} className="mt-1" />
              <span>Ön bilgilendirme formunu okudum ve kabul ediyorum.</span>
            </label>
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </section>

        <aside className="h-fit rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Sipariş özeti</h2>
          {previewLoading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Hesaplanıyor…
            </p>
          ) : preview ? (
            <div className="mt-4 space-y-4">
              {preview.vendorGroups.map((g) => (
                <div key={g.vendorId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                    <Store className="h-4 w-4 text-emerald-600" />
                    {g.vendorName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{g.itemCount} kalem · Kargo {currency(g.shippingFee)}</p>
                  <p className="text-sm font-bold text-emerald-700">{currency(g.total)}</p>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 text-sm font-semibold text-slate-600">
                <div className="flex justify-between"><span>Ara toplam</span><span>{currency(preview.subtotal)}</span></div>
                <div className="flex justify-between"><span>Kargo</span><span>{currency(preview.shippingTotal)}</span></div>
                <div className="mt-2 flex justify-between text-base font-black text-slate-950">
                  <span>Toplam</span><span>{currency(preview.grandTotal)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <Button
            disabled={submitting || !items.length}
            onClick={() => void submit()}
            className="mt-6 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gönderiliyor…
              </>
            ) : (
              "Siparişi tamamla (kapıda / havale)"
            )}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Online kart ödemesi mağaza vitrininde (PayTR/iyzico) ayrıca sunulur. Pazaryeri checkout şu an nakit/havale bildirimi ile sipariş oluşturur.
          </p>
          <Link href="/magaza/sepet" className="mt-4 block text-center text-xs font-bold text-slate-500 hover:text-emerald-700">
            ← Sepete dön
          </Link>
        </aside>
      </SellzyContainer>
    </main>
  );
}
