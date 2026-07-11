import { useState } from "react";
import { Link } from "wouter";
import { Phone, Search, Package, ChevronRight, Clock } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor", confirmed: "Onaylandı", preparing: "Hazırlanıyor",
  ready: "Hazır", picked_up: "Yolda", on_the_way: "Yolda", delivered: "Teslim Edildi", cancelled: "İptal Edildi",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800", ready: "bg-teal-100 text-teal-800",
  picked_up: "bg-indigo-100 text-indigo-800", on_the_way: "bg-indigo-100 text-indigo-800", delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface Order {
  id: number; orderNumber: string; status: string; totalAmount: string;
  createdAt: string; vendorName?: string; items?: string; trackingToken?: string;
}

export default function Siparislerim() {
  const { data: settings } = useGetSiteSettings();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const siteName = (settings?.logoText1 ?? "Yek") + (settings?.logoText2 ?? "pare");

  const search = async () => {
    const cleaned = phone.replace(/\s/g, "").replace(/\D/g, "");
    const last4 = cleaned.slice(-4);
    if (cleaned.length < 10 || last4.length !== 4) { setError("Geçerli bir telefon numarası girin."); return; }
    setLoading(true); setError(""); setSearched(true);
    try {
      const r = await fetch(`/api/delivery/orders/by-phone?phone=${encodeURIComponent(cleaned)}&last4=${encodeURIComponent(last4)}`);
      if (!r.ok) { setError("Arama sırasında hata oluştu."); return; }
      const d = await r.json();
      setOrders(Array.isArray(d) ? d : []);
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  };

  const parseCount = (items?: string) => {
    try { const a = items ? JSON.parse(items) : []; return a.reduce((s: number, i: { quantity: number }) => s + (i.quantity ?? 1), 0); } catch { return 0; }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <Phone className="h-7 w-7 text-[#0f766e]" />
        </div>
        <h1 className="mb-1 text-2xl font-black text-slate-950">Siparişlerim</h1>
        <p className="text-sm text-slate-500">{siteName}&apos;de verdiğiniz tüm siparişleri telefon numaranızla görüntüleyin</p>
        <Link href="/siparis-takip" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] hover:text-[#0b5f59]">
          <Package className="h-4 w-4" /> Sipariş kodu ile sorgula
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Telefon Numaranız</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="05XX XXX XX XX"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              type="tel"
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:opacity-50"
            style={{ color: "#fff" }}
          >
            <Search className="h-4 w-4" /> {loading ? "Aranıyor…" : "Sorgula"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {searched && !loading && (
        orders.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="font-semibold">Bu numarayla sipariş bulunamadı.</p>
            <p className="mt-1 text-sm">
              Farklı bir numara deneyin veya{" "}
              <Link href="/siparis-takip" className="font-semibold text-[#0f766e] hover:underline">
                sipariş kodunuzla sorgulayın
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{orders.length} sipariş bulundu</p>
            {orders.map((o) => (
              <Link key={o.id} href={`/siparis-takip/${o.orderNumber}${o.trackingToken ? `?t=${encodeURIComponent(o.trackingToken)}` : ""}`}>
                <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{o.orderNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    {o.vendorName ? <p className="truncate text-sm font-semibold text-slate-900">{o.vendorName}</p> : null}
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(o.createdAt).toLocaleDateString("tr-TR")}</span>
                      {parseCount(o.items) > 0 ? <span>{parseCount(o.items)} ürün</span> : null}
                      <span className="font-semibold text-slate-700">{parseFloat(o.totalAmount ?? "0").toFixed(2)}₺</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
