import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import type { TrAddressValue } from "@/components/TrAddressFields";
import { combineTrAddressLine } from "@/components/transport/TransportAddressPicker";

const API = "/api";
const DAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface Business {
  id: string; name: string; address: string | null; email: string | null;
  phone: string | null; whatsappNumber: string | null; website: string | null;
  instagramUrl: string | null; facebookUrl: string | null; twitterUrl: string | null;
  youtubeUrl: string | null; menuUrl: string | null; description: string | null;
  photoUrl: string | null; coverPhotoUrl: string | null;
  isPremium: boolean; premiumExpiresAt: string | null;
  workingHours: Record<string, { open: string; close: string; closed?: boolean }> | null;
  hasDelivery: boolean; hasReservation: boolean; hasOnlineOrder: boolean;
  priceLevel: number | null; tags: string[] | null;
}

interface Product { id: string; name: string; description: string | null; price: number | null; imageUrl: string | null; category: string | null; isDeliverable: boolean; isAvailable: boolean; }
interface Campaign { id: string; title: string; description: string | null; discountPercent: number | null; validUntil: string | null; isActive: boolean; }
interface Reservation { id: string; guestName: string | null; guestPhone: string | null; reservationDate: string; partySize: number; note: string | null; status: string; }
interface Order { id: string; guestName: string | null; guestPhone: string | null; totalAmount: number; items: Array<{ name: string; quantity: number; price: number }>; status: string; createdAt: string; }

function GlassInput({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean; rows?: number;
}) {
  const cls = "w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 text-sm outline-none focus:border-indigo-300 focus:bg-white/15 transition duration-200";
  return (
    <div>
      <label className="block text-white/80 text-xs font-medium mb-1.5 tracking-wide">{label}</label>
      {multiline
        ? <textarea className={cls + " resize-none"} rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input type={type} className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.10] backdrop-blur-xl border border-white/25 rounded-3xl p-5 ${className}`}
      style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">{children}</h3>;
}

export default function IsletmePaneli() {
  const [, params] = useRoute("/isletme-paneli/:id");
  const businessId = params?.id;
  const [, navigate] = useLocation();

  const [ownerUser, setOwnerUser] = useState<{ email: string; displayName: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [biz, setBiz] = useState<Business | null>(null);
  const [tab, setTab] = useState("profil");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  interface PlacementPriceRow {
    placementKey: string;
    labelTr: string | null;
    priceDay: number;
    priceWeek: number;
    priceMonth: number;
  }
  interface FeatureReqRow {
    id: string;
    targetType?: "business" | "product" | "campaign";
    productId?: string | null;
    campaignId?: string | null;
    placementKey: string;
    billingPeriod: string;
    units: number;
    totalTry: number;
    paymentMethod: string;
    status: string;
    receiptUrl?: string | null;
    createdAt?: string;
    businessName?: string | null;
  }
  const [featPrices, setFeatPrices] = useState<PlacementPriceRow[]>([]);
  const [featRequests, setFeatRequests] = useState<FeatureReqRow[]>([]);
  const [featReceiptUploading, setFeatReceiptUploading] = useState(false);
  const [featForm, setFeatForm] = useState({
    targetType: "business" as "business" | "product" | "campaign",
    placementKey: "homepage",
    billingPeriod: "day" as "day" | "week" | "month",
    units: "1",
    paymentMethod: "bank_transfer" as "bank_transfer" | "stripe",
    receiptUrl: "",
    categorySuper: "yiyecek",
    productId: "",
    campaignId: "",
  });

  const { data: siteSettings } = useGetSiteSettings();
  const [profilAddrTr, setProfilAddrTr] = useState<TrAddressValue>({ city: "", district: "", mahalle: "", sokak: "" });
  const [profil, setProfil] = useState<Partial<Business>>({});
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});

  const [prodForm, setProdForm] = useState({ name: "", description: "", price: "", category: "", isDeliverable: false, imageUrl: "" });
  const [campForm, setCampForm] = useState({ title: "", description: "", discountPercent: "", validUntil: "" });

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  function getToken() { return localStorage.getItem("ownerToken"); }

  function ownerHeaders(extra?: Record<string, string>): Record<string, string> {
    const tok = getToken();
    return { ...(extra ?? {}), ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };
  }

  function unitPriceForFeatRow(row: PlacementPriceRow | undefined, period: "day" | "week" | "month"): number {
    if (!row) return 0;
    if (period === "week") return row.priceWeek;
    if (period === "month") return row.priceMonth;
    return row.priceDay;
  }

  async function uploadFeatureReceiptFile(file: File | null) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!ok.includes(file.type)) {
      flash("error", "Yalnızca JPG, PNG, GIF, WebP veya PDF yükleyin.");
      return;
    }
    setFeatReceiptUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("Dosya okunamadı"));
        r.readAsDataURL(file);
      });
      const res = await fetch(`${API}/media/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ dataUrl }),
      });
      const d = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !d.url) throw new Error(d.error || "Yükleme başarısız");
      setFeatForm((f) => ({ ...f, receiptUrl: d.url! }));
      flash("success", "Dekont yüklendi");
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setFeatReceiptUploading(false);
    }
  }

  async function submitFeatureRequest() {
    const tok = getToken();
    if (!tok || !businessId) {
      flash("error", "Oturum veya işletme bilgisi eksik");
      return;
    }
    const u = Math.max(1, parseInt(featForm.units, 10) || 1);
    const row = featPrices.find((p) => p.placementKey === featForm.placementKey);
    const unit = unitPriceForFeatRow(row, featForm.billingPeriod);
    if (unit <= 0) {
      flash("error", "Bu yerleşim için fiyat tanımlı değil. Yönetimden fiyat girilmesini isteyin.");
      return;
    }
    if (featForm.paymentMethod === "bank_transfer" && !featForm.receiptUrl.trim()) {
      flash("error", "Havale / EFT için önce dekont dosyasını yükleyin.");
      return;
    }
    if (featForm.targetType === "product" && !featForm.productId) {
      flash("error", "Öne çıkarılacak ürünü seçin.");
      return;
    }
    if (featForm.targetType === "campaign" && !featForm.campaignId) {
      flash("error", "Öne çıkarılacak kampanyayı seçin.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/map/owner/feature-promotion-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          businessId,
          targetType: featForm.targetType,
          productId: featForm.targetType === "product" ? featForm.productId : undefined,
          campaignId: featForm.targetType === "campaign" ? featForm.campaignId : undefined,
          placementKey: featForm.placementKey,
          billingPeriod: featForm.billingPeriod,
          units: u,
          paymentMethod: featForm.paymentMethod === "stripe" ? "online" : "bank_transfer",
          receiptUrl: featForm.receiptUrl.trim() || undefined,
          categorySuper: featForm.placementKey === "category_home" ? featForm.categorySuper.trim() : undefined,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Talep gönderilemedi");
      flash("success", d.message || "Talebiniz alındı");
      setFeatRequests((prev) => [d.data as FeatureReqRow, ...prev]);
      setFeatForm((f) => ({ ...f, receiptUrl: "", units: "1" }));
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("ownerToken");
    localStorage.removeItem("ownerUser");
    localStorage.removeItem("ownerBusinesses");
    navigate("/isletme-giris");
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/isletme-giris"); return; }
    fetch(`${API}/map/owner/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { navigate("/isletme-giris"); return; }
        setOwnerUser(d.data.user);
        setBusinesses(d.data.businesses || []);
        if (!businessId && d.data.businesses?.length > 0) {
          navigate(`/isletme-paneli/${d.data.businesses[0].id}`, { replace: true });
        }
        setAuthChecked(true);
      })
      .catch(() => navigate("/isletme-giris"));
  }, []);

  useEffect(() => {
    if (tab !== "onecikar" || !businessId) return;
    fetch(`${API}/map/feature-placement-pricing`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: PlacementPriceRow[] }) => {
        if (d.success && Array.isArray(d.data)) setFeatPrices(d.data);
      })
      .catch(() => {});
    const tok = getToken();
    if (!tok) return;
    fetch(`${API}/map/owner/feature-promotion-requests?businessId=${encodeURIComponent(businessId)}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: FeatureReqRow[] }) => {
        if (d.success && Array.isArray(d.data)) setFeatRequests(d.data);
      })
      .catch(() => {});
  }, [tab, businessId]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`${API}/map/businesses/${businessId}`).then(r => r.json()).then(d => {
      if (d.success) {
        setBiz(d.data);
        setProfil(d.data);
        setProfilAddrTr({ city: "", district: "", mahalle: "", sokak: "" });
        const h: Record<string, { open: string; close: string; closed: boolean }> = {};
        DAY_KEYS.forEach(k => {
          const existing = d.data.workingHours?.[k];
          h[k] = existing ? { open: existing.open || "09:00", close: existing.close || "22:00", closed: existing.closed || false } : { open: "09:00", close: "22:00", closed: false };
        });
        setHours(h);
      }
    }).finally(() => setLoading(false));

    Promise.all([
      fetch(`${API}/premium/businesses/${businessId}/products`, { headers: ownerHeaders() }).then(r => r.json()),
      fetch(`${API}/premium/businesses/${businessId}/campaigns`, { headers: ownerHeaders() }).then(r => r.json()),
      fetch(`${API}/premium/businesses/${businessId}/reservations`, { headers: ownerHeaders() }).then(r => r.json()),
      fetch(`${API}/premium/businesses/${businessId}/orders`, { headers: ownerHeaders() }).then(r => r.json()),
    ]).then(([p, c, r, o]) => {
      if (p.success) setProducts(p.data || []);
      if (c.success) setCampaigns(c.data || []);
      if (r.success) setReservations(r.data || []);
      if (o.success) setOrders(o.data || []);
    });
  }, [businessId]);

  async function saveProfil() {
    if (!businessId) return;
    setLoading(true);
    try {
      const mergedAddr =
        combineTrAddressLine(profilAddrTr, String(profil.address || "").trim()).trim() ||
        String(profil.address || "").trim();
      const r = await fetch(`${API}/premium/businesses/${businessId}/profile`, {
        method: "PUT", headers: ownerHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...profil, address: mergedAddr || profil.address, workingHours: hours }),
      });
      const d = await r.json();
      if (d.success) { setBiz(d.data); flash("success", "Profil güncellendi!"); }
      else flash("error", d.error || "Hata oluştu");
    } finally { setLoading(false); }
  }

  async function addProduct() {
    if (!businessId || !prodForm.name) return;
    const r = await fetch(`${API}/premium/businesses/${businessId}/products`, {
      method: "POST", headers: ownerHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(prodForm),
    });
    const d = await r.json();
    if (d.success) { setProducts(ps => [d.data, ...ps]); setProdForm({ name: "", description: "", price: "", category: "", isDeliverable: false, imageUrl: "" }); flash("success", "Ürün eklendi!"); }
    else flash("error", d.error || "Hata");
  }

  async function deleteProduct(id: string) {
    await fetch(`${API}/premium/products/${id}`, { method: "DELETE", headers: ownerHeaders() });
    setProducts(ps => ps.filter(p => p.id !== id));
    flash("success", "Ürün silindi");
  }

  async function addCampaign() {
    if (!businessId || !campForm.title) return;
    const r = await fetch(`${API}/premium/businesses/${businessId}/campaigns`, {
      method: "POST", headers: ownerHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...campForm, discountPercent: campForm.discountPercent ? parseInt(campForm.discountPercent) : null }),
    });
    const d = await r.json();
    if (d.success) { setCampaigns(cs => [d.data, ...cs]); setCampForm({ title: "", description: "", discountPercent: "", validUntil: "" }); flash("success", "Kampanya eklendi!"); }
    else flash("error", d.error || "Hata");
  }

  async function updateResStatus(id: string, status: string) {
    const r = await fetch(`${API}/premium/reservations/${id}/status`, {
      method: "PUT", headers: ownerHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }),
    });
    const d = await r.json();
    if (d.success) setReservations(rs => rs.map(r => r.id === id ? { ...r, status } : r));
  }

  async function updateOrderStatus(id: string, status: string) {
    const r = await fetch(`${API}/premium/orders/${id}/status`, {
      method: "PUT", headers: ownerHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }),
    });
    const d = await r.json();
    if (d.success) setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  }

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0f0c29, #1a1040, #24243e)" }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Giriş doğrulanıyor...</p>
      </div>
    </div>
  );

  if (!businessId) return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0f0c29, #1a1040, #24243e)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 px-4 py-5 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
        <Link href="/kesfet" className="p-2 rounded-xl bg-white/10 hover:bg-white/15 transition">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </Link>
        <h1 className="font-bold text-white">İşletme Paneli</h1>
      </div>
      <div className="relative z-10 max-w-lg mx-auto p-4 w-full mt-4">
        <GlassCard>
          <h2 className="font-bold text-white mb-4">İşletmenizi Seçin</h2>
          {businesses.length === 0 ? (
            <p className="text-white/40 text-center py-6">İşletme bulunamadı</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {businesses.map(b => (
                <Link key={b.id} href={`/isletme-paneli/${b.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition">
                  {b.photoUrl ? <img src={b.photoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" /> : <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shrink-0">🏢</div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{b.name}</p>
                    <p className="text-xs text-white/40 truncate">{b.address || "—"}</p>
                  </div>
                  {b.isPremium && <span className="text-amber-400 text-xs font-bold shrink-0">⭐ Premium</span>}
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
        <div className="mt-4 text-center">
          <p className="text-white/30 text-xs mb-2">İşletmeniz listede yoksa</p>
          <Link href="/kesfet" className="text-indigo-400 text-sm hover:text-indigo-300 transition">Keşfet'te arayın →</Link>
        </div>
      </div>
    </div>
  );

  if (loading && !biz) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0f0c29, #1a1040, #24243e)" }}>
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const TABS = [
    { k: "profil", l: "📝", label: "Profil" },
    { k: "saatler", l: "⏰", label: "Saatler" },
    { k: "urunler", l: "🛍️", label: `Ürünler`, count: products.length },
    { k: "kampanyalar", l: "🎁", label: "Kampanya", count: campaigns.length },
    { k: "onecikar", l: "🚀", label: "Öne çıkar" },
    { k: "rezervasyonlar", l: "📅", label: "Rezervasyon", count: reservations.filter(r => r.status === "pending").length },
    { k: "siparisler", l: "🛒", label: "Sipariş", count: orders.filter(o => o.status === "pending").length },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0c1445 70%, #0f0c29 100%)" }}>
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30" style={{ background: "rgba(15,12,41,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/kesfet" className="p-2 rounded-xl bg-white/8 hover:bg-white/12 transition shrink-0">
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </Link>

          {/* Business avatar + name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {biz?.photoUrl
              ? <img src={biz.photoUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-white/10" />
              : <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-lg"
                  style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}>🏢</div>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate text-sm">{biz?.name}</p>
              {biz?.isPremium ? (
                <span className="text-[10px] text-amber-400 font-semibold">⭐ İşletme üyesi</span>
              ) : (
                <Link href="/is-ortagi/basvuru" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition">10 TL/gün başvur →</Link>
              )}
            </div>
          </div>

          {/* Flash message */}
          {msg && (
            <div className={`text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 ${msg.type === "success" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
              {msg.text}
            </div>
          )}

          <Link href={`/kesfet/isletme/${businessId}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition shrink-0 hidden sm:block">
            Sayfayı Gör →
          </Link>
          <button onClick={handleLogout} title="Çıkış"
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 transition shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-3 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.k
                  ? "text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
              style={tab === t.k ? {
                background: "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow: "0 0 14px rgba(99,102,241,0.2)"
              } : {}}>
              <span>{t.l}</span>
              <span>{t.label}</span>
              {(t.count ?? 0) > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${tab === t.k ? "bg-white/20 text-white" : "bg-indigo-500/30 text-indigo-300"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-5 w-full space-y-4">

        {/* ── PROFIL ── */}
        {tab === "profil" && (
          <>
            <GlassCard>
              <SectionTitle>Temel Bilgiler</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassInput label="İşletme Adı" value={profil.name || ""} onChange={v => setProfil(p => ({ ...p, name: v }))} />
                <GlassInput label="Telefon" value={profil.phone || ""} onChange={v => setProfil(p => ({ ...p, phone: v }))} placeholder="+90 5XX XXX XX XX" />
                <GlassInput label="WhatsApp" value={profil.whatsappNumber || ""} onChange={v => setProfil(p => ({ ...p, whatsappNumber: v }))} placeholder="+90 5XX XXX XX XX" />
                <GlassInput label="E-posta" value={profil.email || ""} onChange={v => setProfil(p => ({ ...p, email: v }))} type="email" />
                <GlassInput label="Web Sitesi" value={profil.website || ""} onChange={v => setProfil(p => ({ ...p, website: v }))} placeholder="https://..." />
                <GlassInput label="Menü URL" value={profil.menuUrl || ""} onChange={v => setProfil(p => ({ ...p, menuUrl: v }))} placeholder="https://..." />
                <div className="sm:col-span-2 rounded-2xl border border-white/20 bg-white/[0.06] p-4">
                  <LocationPickerGooglePrimary
                    mapsSettings={siteSettings ?? null}
                    variant="dark"
                    compactGoogle
                    googleLabel="1) Konum araması"
                    value={profilAddrTr}
                    onChange={setProfilAddrTr}
                    showSokak={false}
                    onGooglePick={(r) =>
                      setProfil((p) => ({
                        ...p,
                        address: (p.address || "").trim() ? p.address : r.addressLine,
                      }))
                    }
                  />
                  <div className="mt-3">
                    <GlassInput
                      label="Sokak / bina / daire (detay)"
                      value={profil.address || ""}
                      onChange={(v) => setProfil((p) => ({ ...p, address: v }))}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <GlassInput label="Hakkında / Açıklama" value={profil.description || ""} onChange={v => setProfil(p => ({ ...p, description: v }))} multiline rows={3} />
                </div>
                <GlassInput label="Profil Fotoğrafı URL" value={profil.photoUrl || ""} onChange={v => setProfil(p => ({ ...p, photoUrl: v }))} placeholder="https://..." />
                <GlassInput label="Kapak Fotoğrafı URL" value={profil.coverPhotoUrl || ""} onChange={v => setProfil(p => ({ ...p, coverPhotoUrl: v }))} placeholder="https://..." />
              </div>
            </GlassCard>

            <GlassCard>
              <SectionTitle>Sosyal Medya</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassInput label="📸 Instagram" value={profil.instagramUrl || ""} onChange={v => setProfil(p => ({ ...p, instagramUrl: v }))} placeholder="https://instagram.com/..." />
                <GlassInput label="📘 Facebook" value={profil.facebookUrl || ""} onChange={v => setProfil(p => ({ ...p, facebookUrl: v }))} placeholder="https://facebook.com/..." />
                <GlassInput label="🐦 Twitter/X" value={profil.twitterUrl || ""} onChange={v => setProfil(p => ({ ...p, twitterUrl: v }))} placeholder="https://x.com/..." />
                <GlassInput label="▶ YouTube" value={profil.youtubeUrl || ""} onChange={v => setProfil(p => ({ ...p, youtubeUrl: v }))} placeholder="https://youtube.com/..." />
              </div>
            </GlassCard>

            <GlassCard>
              <SectionTitle>Özellikler</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "hasDelivery", label: "🛵 Teslimat Var" },
                  { key: "hasReservation", label: "📅 Rezervasyon Var" },
                  { key: "hasOnlineOrder", label: "🛒 Online Sipariş Var" },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-2.5 cursor-pointer p-3.5 rounded-2xl border border-white/10 hover:bg-white/5 transition">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${!!(profil as Record<string, unknown>)[f.key] ? "bg-indigo-500 border-indigo-500" : "border-white/20"}`}>
                      {!!(profil as Record<string, unknown>)[f.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <input type="checkbox" checked={!!(profil as Record<string, unknown>)[f.key]} onChange={e => setProfil(p => ({ ...p, [f.key]: e.target.checked }))} className="sr-only" />
                    <span className="text-sm font-medium text-white/80">{f.label}</span>
                  </label>
                ))}
              </div>
            </GlassCard>

            <button onClick={saveProfil} disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #4338ca, #7c3aed)",
                boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
              }}>
              {loading ? "Kaydediliyor..." : "💾 Değişiklikleri Kaydet"}
            </button>
          </>
        )}

        {/* ── SAATLER ── */}
        {tab === "saatler" && (
          <GlassCard>
            <SectionTitle>⏰ Çalışma Saatleri</SectionTitle>
            <div className="space-y-1">
              {DAYS_TR.map((day, i) => {
                const key = DAY_KEYS[i];
                const h = hours[key] || { open: "09:00", close: "22:00", closed: false };
                return (
                  <div key={key} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <label className="flex items-center gap-2.5 w-36 shrink-0 cursor-pointer">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all shrink-0 ${!h.closed ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}
                        onClick={() => setHours(hs => ({ ...hs, [key]: { ...h, closed: !h.closed } }))}>
                        {!h.closed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <span className={`text-sm font-semibold ${!h.closed ? "text-white" : "text-white/30"}`}>{day}</span>
                    </label>
                    {!h.closed ? (
                      <div className="flex items-center gap-2">
                        <input type="time" className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-400/60 transition" value={h.open} onChange={e => setHours(hs => ({ ...hs, [key]: { ...h, open: e.target.value } }))} />
                        <span className="text-white/30 text-sm">—</span>
                        <input type="time" className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-400/60 transition" value={h.close} onChange={e => setHours(hs => ({ ...hs, [key]: { ...h, close: e.target.value } }))} />
                      </div>
                    ) : <span className="text-sm text-white/25 italic">Kapalı</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={saveProfil} disabled={loading}
              className="mt-5 w-full py-3 rounded-2xl font-bold text-white text-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)", boxShadow: "0 6px 20px rgba(99,102,241,0.3)" }}>
              {loading ? "Kaydediliyor..." : "💾 Saatleri Kaydet"}
            </button>
          </GlassCard>
        )}

        {/* ── ÜRÜNLER ── */}
        {tab === "urunler" && (
          <>
            <GlassCard>
              <SectionTitle>Yeni Ürün / Hizmet Ekle</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <GlassInput label="Ürün Adı *" value={prodForm.name} onChange={v => setProdForm(f => ({ ...f, name: v }))} />
                </div>
                <GlassInput label="Kategori" value={prodForm.category} onChange={v => setProdForm(f => ({ ...f, category: v }))} placeholder="Ana Yemek, İçecek..." />
                <GlassInput label="Fiyat (₺)" value={prodForm.price} onChange={v => setProdForm(f => ({ ...f, price: v }))} type="number" />
                <GlassInput label="Fotoğraf URL" value={prodForm.imageUrl} onChange={v => setProdForm(f => ({ ...f, imageUrl: v }))} placeholder="https://..." />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${prodForm.isDeliverable ? "bg-indigo-500 border-indigo-500" : "border-white/20"}`}
                      onClick={() => setProdForm(f => ({ ...f, isDeliverable: !f.isDeliverable }))}>
                      {prodForm.isDeliverable && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className="text-sm text-white/70">🛵 Teslimat</span>
                  </label>
                </div>
                <div className="sm:col-span-3">
                  <GlassInput label="Açıklama" value={prodForm.description} onChange={v => setProdForm(f => ({ ...f, description: v }))} multiline rows={2} />
                </div>
              </div>
              <button onClick={addProduct} disabled={!prodForm.name}
                className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}>
                + Ürün Ekle
              </button>
            </GlassCard>

            {products.length === 0 ? (
              <div className="text-center py-10 text-white/30">Henüz ürün eklenmemiş</div>
            ) : (
              <GlassCard className="!p-0 overflow-hidden">
                {products.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < products.length - 1 ? "border-b border-white/5" : ""}`}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-white/10" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      <p className="text-xs text-white/40">{p.category}{p.price ? ` · ₺${p.price}` : ""}{p.isDeliverable ? " · 🛵" : ""}</p>
                    </div>
                    <button onClick={() => deleteProduct(p.id)}
                      className="text-xs text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition font-medium">
                      Sil
                    </button>
                  </div>
                ))}
              </GlassCard>
            )}
          </>
        )}

        {/* ── KAMPANYALAR ── */}
        {tab === "kampanyalar" && (
          <>
            <GlassCard>
              <SectionTitle>Yeni Kampanya Ekle</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <GlassInput label="Kampanya Başlığı *" value={campForm.title} onChange={v => setCampForm(f => ({ ...f, title: v }))} placeholder="2 Al 1 Öde, %30 İndirim..." />
                </div>
                <GlassInput label="İndirim Oranı (%)" value={campForm.discountPercent} onChange={v => setCampForm(f => ({ ...f, discountPercent: v }))} type="number" />
                <GlassInput label="Geçerlilik Tarihi" value={campForm.validUntil} onChange={v => setCampForm(f => ({ ...f, validUntil: v }))} type="date" />
                <div className="col-span-2">
                  <GlassInput label="Açıklama" value={campForm.description} onChange={v => setCampForm(f => ({ ...f, description: v }))} multiline rows={2} />
                </div>
              </div>
              <button onClick={addCampaign} disabled={!campForm.title}
                className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                🎁 Kampanya Ekle
              </button>
            </GlassCard>

            {campaigns.length === 0 ? (
              <div className="text-center py-10 text-white/30">Aktif kampanya yok</div>
            ) : (
              <div className="space-y-2">
                {campaigns.map(c => (
                  <GlassCard key={c.id} className="!py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-sm">{c.title}</p>
                        {c.description && <p className="text-xs text-white/50 mt-1">{c.description}</p>}
                        <div className="flex gap-2 mt-2">
                          {c.discountPercent && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">%{c.discountPercent} İndirim</span>}
                          {c.validUntil && <span className="text-xs text-white/30">📅 {new Date(c.validUntil).toLocaleDateString("tr-TR")}</span>}
                        </div>
                      </div>
                      <button onClick={async () => { await fetch(`${API}/premium/campaigns/${c.id}`, { method: "DELETE" }); setCampaigns(cs => cs.filter(x => x.id !== c.id)); }}
                        className="text-xs text-red-400/70 hover:text-red-400 shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition">
                        Kaldır
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ÖNE ÇIKAR ── */}
        {tab === "onecikar" && (
          <>
            <GlassCard>
              <SectionTitle>🚀 Öne çıkarma talebi</SectionTitle>
              <p className="text-xs text-white/45 mb-4 leading-relaxed">
                Yayın yeri, süre (gün / hafta / ay) ve ödeme yöntemini seçin. Havale / FAST EFT için dekontu JPG, PNG veya PDF olarak yükleyin. Fiyatları yönetici panelinden belirlenir; onay sonrası yayına alınır.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Öne çıkarma türü</label>
                  <select
                    value={featForm.targetType}
                    onChange={(e) => setFeatForm((f) => ({ ...f, targetType: e.target.value as "business" | "product" | "campaign" }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                  >
                    <option value="business" className="bg-slate-900">İşletme vitrini</option>
                    <option value="product" className="bg-slate-900">Ürün vitrini</option>
                    <option value="campaign" className="bg-slate-900">Kampanya vitrini</option>
                  </select>
                </div>
                {featForm.targetType === "product" ? (
                  <div className="sm:col-span-2">
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Ürün seçimi</label>
                    <select
                      value={featForm.productId}
                      onChange={(e) => setFeatForm((f) => ({ ...f, productId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                    >
                      <option value="" className="bg-slate-900">Ürün seçin</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {featForm.targetType === "campaign" ? (
                  <div className="sm:col-span-2">
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Kampanya seçimi</label>
                    <select
                      value={featForm.campaignId}
                      onChange={(e) => setFeatForm((f) => ({ ...f, campaignId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                    >
                      <option value="" className="bg-slate-900">Kampanya seçin</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.title}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Yayın yeri</label>
                  <select
                    value={featForm.placementKey}
                    onChange={(e) => setFeatForm((f) => ({ ...f, placementKey: e.target.value }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                  >
                    {featPrices.map((p) => (
                      <option key={p.placementKey} value={p.placementKey} className="bg-slate-900">
                        {(p.labelTr || p.placementKey).trim()} — gün ₺{p.priceDay} · hafta ₺{p.priceWeek} · ay ₺{p.priceMonth}
                      </option>
                    ))}
                    {featPrices.length === 0 ? (
                      <option value="homepage" className="bg-slate-900">Ana sayfa (fiyatlar yükleniyor…)</option>
                    ) : null}
                  </select>
                </div>
                {featForm.placementKey === "category_home" ? (
                  <div className="sm:col-span-2">
                    <GlassInput
                      label="Süper kategori (örn. yiyecek, alisveris, turizm)"
                      value={featForm.categorySuper}
                      onChange={(v) => setFeatForm((f) => ({ ...f, categorySuper: v }))}
                      placeholder="yiyecek"
                    />
                  </div>
                ) : null}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Süre birimi</label>
                  <select
                    value={featForm.billingPeriod}
                    onChange={(e) => setFeatForm((f) => ({ ...f, billingPeriod: e.target.value as "day" | "week" | "month" }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                  >
                    <option value="day" className="bg-slate-900">Günlük</option>
                    <option value="week" className="bg-slate-900">Haftalık</option>
                    <option value="month" className="bg-slate-900">Aylık</option>
                  </select>
                </div>
                <GlassInput
                  label="Kaç birim? (örn. 7 gün, 2 hafta)"
                  value={featForm.units}
                  onChange={(v) => setFeatForm((f) => ({ ...f, units: v.replace(/\D/g, "") || "1" }))}
                  placeholder="1"
                />
                <div className="sm:col-span-2">
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Ödeme</label>
                  <select
                    value={featForm.paymentMethod}
                    onChange={(e) => setFeatForm((f) => ({ ...f, paymentMethod: e.target.value as "bank_transfer" | "stripe" }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-400/60"
                  >
                    <option value="bank_transfer" className="bg-slate-900">Havale / FAST EFT (dekont)</option>
                    <option value="stripe" className="bg-slate-900">Stripe kart ödemesi</option>
                  </select>
                </div>
                {featForm.paymentMethod === "bank_transfer" ? (
                  <div className="sm:col-span-2">
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Dekont yükle (JPG, PNG, PDF)</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      disabled={featReceiptUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void uploadFeatureReceiptFile(f);
                      }}
                      className="block w-full text-xs text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-2 file:text-white file:text-xs disabled:opacity-50"
                    />
                    {featReceiptUploading ? (
                      <p className="text-xs text-amber-200/80 mt-2">Yükleniyor…</p>
                    ) : featForm.receiptUrl ? (
                      <a
                        href={featForm.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-300/90 mt-2 inline-block break-all hover:underline"
                      >
                        Yüklendi — önizle
                      </a>
                    ) : (
                      <p className="text-[11px] text-white/35 mt-2">Talep göndermeden önce dosya seçin.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-amber-200/90 font-semibold mt-4">
                Tahmini tutar: ₺
                {(
                  unitPriceForFeatRow(
                    featPrices.find((p) => p.placementKey === featForm.placementKey),
                    featForm.billingPeriod,
                  ) * Math.max(1, parseInt(featForm.units, 10) || 1)
                ).toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => void submitFeatureRequest()}
                disabled={loading}
                className="mt-4 w-full py-3.5 rounded-2xl font-bold text-white text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ea580c, #f97316)", boxShadow: "0 8px 24px rgba(234,88,12,0.35)" }}
              >
                {loading ? "Gönderiliyor…" : "Talep oluştur"}
              </button>
            </GlassCard>

            <GlassCard>
              <SectionTitle>Geçmiş talepler</SectionTitle>
              {featRequests.length === 0 ? (
                <p className="text-white/35 text-sm text-center py-6">Henüz talep yok</p>
              ) : (
                <div className="space-y-2">
                  {featRequests.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-white/80 font-semibold">
                          {(r.targetType || "business")} · {r.placementKey}
                        </span>
                        <span
                          className={`shrink-0 font-bold ${
                            r.status === "approved" ? "text-emerald-400" : r.status === "rejected" ? "text-red-400" : "text-amber-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-white/45 mt-1">
                        {r.billingPeriod} × {r.units} · ₺{Number(r.totalTry).toFixed(2)} · {r.paymentMethod}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}

        {/* ── REZERVASYONLAR ── */}
        {tab === "rezervasyonlar" && (
          <div className="space-y-2">
            {reservations.length === 0
              ? <div className="text-center py-10 text-white/30">Rezervasyon bulunmuyor</div>
              : reservations.map(r => (
                <GlassCard key={r.id} className="!py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{r.guestName}</p>
                      <p className="text-xs text-white/50 mt-0.5">{r.guestPhone} · {r.partySize} kişi</p>
                      <p className="text-xs text-indigo-400 font-semibold mt-1.5">📅 {new Date(r.reservationDate).toLocaleString("tr-TR")}</p>
                      {r.note && <p className="text-xs text-white/30 mt-1">Not: {r.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        r.status === "confirmed" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                        : r.status === "cancelled" ? "bg-red-500/20 text-red-300 border border-red-500/20"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                      }`}>
                        {r.status === "confirmed" ? "✓ Onaylandı" : r.status === "cancelled" ? "✗ İptal" : "⏳ Bekliyor"}
                      </span>
                      {r.status === "pending" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => updateResStatus(r.id, "confirmed")} className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-lg hover:bg-emerald-500/30 transition font-semibold">Onayla</button>
                          <button onClick={() => updateResStatus(r.id, "cancelled")} className="text-xs bg-red-500/20 text-red-300 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/30 transition font-semibold">İptal</button>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
          </div>
        )}

        {/* ── SİPARİŞLER ── */}
        {tab === "siparisler" && (
          <div className="space-y-2">
            {orders.length === 0
              ? <div className="text-center py-10 text-white/30">Sipariş bulunmuyor</div>
              : orders.map(o => (
                <GlassCard key={o.id} className="!py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-white text-sm">{o.guestName || "Misafir"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          o.status === "completed" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                          : o.status === "cancelled" ? "bg-red-500/20 text-red-300 border border-red-500/20"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                        }`}>
                          {o.status === "completed" ? "✓ Tamamlandı" : o.status === "cancelled" ? "✗ İptal" : "⏳ Bekliyor"}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">{o.guestPhone} · {new Date(o.createdAt).toLocaleString("tr-TR")}</p>
                      <div className="mt-2 space-y-0.5">
                        {o.items?.map((item, idx) => (
                          <p key={idx} className="text-xs text-white/60">{item.quantity}x {item.name} — ₺{item.price}</p>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-amber-400 mt-2">Toplam: ₺{o.totalAmount}</p>
                    </div>
                    {o.status === "pending" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => updateOrderStatus(o.id, "completed")} className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-lg hover:bg-emerald-500/30 transition font-semibold">Tamamla</button>
                        <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="text-xs bg-red-500/20 text-red-300 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/30 transition font-semibold">İptal</button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
          </div>
        )}

        {/* Business membership CTA (non-premium) */}
        {!biz?.isPremium && (
          <div className="rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1e1048, #2d1b69, #1e3a5f)", border: "1px solid rgba(139,92,246,0.25)", boxShadow: "0 8px 32px rgba(139,92,246,0.2)" }}>
            <div className="px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 16px rgba(245,158,11,0.4)" }}>⭐</div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">İşletme Üyeliğine Başvur</p>
                  <p className="text-white/50 text-xs mt-0.5">Günde 10 TL'ye web sitesi, görünürlük ve işletme araçları</p>
                </div>
              </div>
              <Link href="/is-ortagi/basvuru"
                className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white text-sm transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 6px 20px rgba(245,158,11,0.35)" }}>
                Günde 10 TL'ye Başvur →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
