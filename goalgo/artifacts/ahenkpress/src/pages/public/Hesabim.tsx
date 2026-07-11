import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  UserCircle2, Package, Heart, LogOut, Save, Loader2,
  ChevronRight, MapPin, Phone, Mail, Lock, ShoppingBag, UtensilsCrossed,
  Star, Clock, CheckCircle, XCircle, Truck,
  AlertCircle,
} from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { AuthModal } from "@/components/AuthModal";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import { PlatformBroadcastStrip } from "@/components/PlatformBroadcastStrip";

const API = "/api";
type Tab = "profil" | "siparisler" | "favoriler";

interface Order {
  id: number;
  status: string;
  totalAmount: string;
  vendorId?: number;
  deliveryAddress?: string;
  createdAt: string;
}

interface Vendor {
  id: number;
  name: string;
  imageUrl?: string;
  vendorType: string;
  rating?: number;
  city?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Bekliyor",      color: "#f59e0b", icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed:  { label: "Onaylandı",     color: "#3b82f6", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  preparing:  { label: "Hazırlanıyor",  color: "#8b5cf6", icon: <Package className="w-3.5 h-3.5" /> },
  delivering: { label: "Yolda",         color: "#06b6d4", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:  { label: "Teslim Edildi", color: "#22c55e", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled:  { label: "İptal",         color: "#ef4444", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function Hesabim() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const { user, token, logout, updateProfile, toggleFavorite, favoriteIds, loading } = useCustomerAuth();
  const [tab, setTab] = useState<Tab>("profil");
  const [authOpen, setAuthOpen] = useState(false);

  /* Profile form */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [profileMahalle, setProfileMahalle] = useState("");
  const [postal, setPostal] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* Orders */
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* Favorites */
  const [favVendors, setFavVendors] = useState<Vendor[]>([]);
  const [favsLoading, setFavsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setAddress(user.address ?? "");
      setCity(user.city ?? "");
      setDistrict(user.district ?? "");
      setProfileMahalle("");
      setPostal((user as any).postal ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (tab !== "siparisler" || !token) return;
    setOrdersLoading(true);
    fetch(`${API}/customer/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [tab, token]);

  useEffect(() => {
    if (tab !== "favoriler" || !token) return;
    setFavsLoading(true);
    fetch(`${API}/customer/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setFavVendors(Array.isArray(data) ? data : []))
      .catch(() => setFavVendors([]))
      .finally(() => setFavsLoading(false));
  }, [tab, token, favoriteIds.length]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null); setProfileLoading(true);
    const mh = profileMahalle.trim();
    const addrBody = address.trim();
    const mergedAddress = mh ? (addrBody ? `${mh}, ${addrBody}` : mh) : addrBody;
    const res = await updateProfile({
      name, phone, address: mergedAddress, city, district,
      ...(curPass && newPass ? { currentPassword: curPass, newPassword: newPass } : {}),
    });
    setProfileLoading(false);
    if (res.error) setProfileMsg({ type: "err", text: res.error });
    else { setProfileMsg({ type: "ok", text: "Bilgileriniz güncellendi!" }); setCurPass(""); setNewPass(""); }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
        <UserCircle2 className="h-20 w-20 text-slate-300" />
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-black text-slate-800">Hesabınıza Giriş Yapın</h2>
          <p className="text-sm text-slate-500">Siparişlerinizi ve favorilerinizi görmek için giriş yapın.</p>
        </div>
        <button
          onClick={() => setAuthOpen(true)}
          className="rounded-xl bg-[#0f766e] px-8 py-3 text-sm font-black text-white transition hover:bg-[#0b5f59]"
          style={{ color: "#fff" }}
        >
          Giriş Yap / Kayıt Ol
        </button>
        {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} /> : null}
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-[#f4f7f6]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-emerald-100 bg-[#f4fbf7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(16,185,129,0.18),transparent_28%)]" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-5 px-4 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f766e] text-2xl font-black text-white shadow-lg shadow-emerald-900/15">
            {((user.name ?? "").trim().charAt(0) || "?").toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-950">{(user.name ?? "").trim() || "Hesabım"}</h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">{user.email}</p>
            <Link href="/destek" className="mt-1 inline-block text-xs font-semibold text-[#0f766e] underline hover:text-[#0b5f59]">
              Yekpare destek
            </Link>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white/80"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Çıkış</span>
          </button>
        </div>
      </div>

      {token ? <PlatformBroadcastStrip mode="customer" token={token} /> : null}

      {/* Tab bar */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl px-4">
          {([
            { key: "profil", label: "Profilim", icon: <UserCircle2 className="h-4 w-4" /> },
            { key: "siparisler", label: "Siparişlerim", icon: <Package className="h-4 w-4" /> },
            { key: "favoriler", label: "Favorilerim", icon: <Heart className="h-4 w-4" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex items-center gap-2 px-4 py-4 text-sm font-bold transition-all"
              style={{ color: tab === t.key ? "#0f766e" : "#64748b" }}
            >
              {t.icon}
              <span className="hidden sm:block">{t.label}</span>
              {tab === t.key ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#0f766e]" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── PROFİL ── */}
        {tab === "profil" && (
          <form onSubmit={handleProfileSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-black text-gray-900">Kişisel Bilgiler</h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
              <strong>Sipariş ve alışveriş:</strong> Mağazalardan sorunsuz sipariş verebilmek için{" "}
              <strong>telefon, e-posta ve teslimat adresinizin</strong> (il, ilçe, mahalle ve açık adres) doğru ve güncel olması gerekir. Bildirimler bu bilgilere gönderilir.
            </div>
            {profileMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${profileMsg.type === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                {profileMsg.text}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <PF icon={<UserCircle2 className="w-4 h-4" />} label="Ad Soyad *">
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </PF>
              <PF icon={<Phone className="w-4 h-4" />} label="Telefon">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0555 000 00 00"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </PF>
              <PF icon={<Mail className="w-4 h-4" />} label="E-posta">
                <input value={user.email} readOnly
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400" />
              </PF>
              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50/90 p-4">
                <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Konum
                </p>
                <LocationPickerGooglePrimary
                  mapsSettings={siteSettings ?? null}
                  compactGoogle
                  value={{ city, district, mahalle: profileMahalle }}
                  onChange={(v) => {
                    setCity(v.city);
                    setDistrict(v.district);
                    setProfileMahalle(v.mahalle);
                  }}
                  showSokak={false}
                  onGooglePick={(r) => {
                    setAddress((a) => (a || "").trim() ? a : r.addressLine);
                  }}
                />
              </div>
              <PF icon={<MapPin className="w-4 h-4" />} label="Posta Kodu">
                <input value={postal} onChange={e => setPostal(e.target.value)} placeholder="34710"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
              </PF>
            </div>
            <PF icon={<MapPin className="w-4 h-4" />} label="Açık Adres">
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                placeholder="Mahalle, sokak, bina no, daire..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none" />
            </PF>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Şifre Değiştir
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <PF icon={<Lock className="w-4 h-4" />} label="Mevcut Şifre">
                  <input type="password" value={curPass} onChange={e => setCurPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
                </PF>
                <PF icon={<Lock className="w-4 h-4" />} label="Yeni Şifre">
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
                </PF>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="flex items-center gap-2 rounded-xl bg-[#0f766e] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0b5f59] disabled:opacity-60"
                style={{ color: "#fff" }}
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </form>
        )}

        {/* ── SİPARİŞLERİM ── */}
        {tab === "siparisler" && (
          <div className="space-y-3">
            {ordersLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : orders.length === 0 ? (
              <EmptyState icon={<Package className="w-12 h-12 text-gray-300" />} title="Henüz sipariş vermediniz"
                desc="İlk siparişinizi verin ve burada takip edin.">
                <button
                  onClick={() => navigate("/siparis")}
                  className="mt-5 rounded-xl bg-[#0f766e] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0b5f59]"
                  style={{ color: "#fff" }}
                >
                  Sipariş Ver
                </button>
              </EmptyState>
            ) : orders.map(order => {
              const s = STATUS_MAP[order.status] ?? { label: order.status, color: "#6b7280", icon: <Clock className="w-3.5 h-3.5" /> };
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                        <UtensilsCrossed className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">Sipariş #{order.id}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${s.color}18`, color: s.color }}>
                      {s.icon}{s.label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{order.deliveryAddress ?? "Adres belirtilmemiş"}
                    </p>
                    <p className="font-black text-gray-900 text-sm">₺{parseFloat(order.totalAmount ?? "0").toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FAVORİLERİM ── */}
        {tab === "favoriler" && (
          <div className="space-y-3">
            {favsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : favVendors.length === 0 ? (
              <EmptyState icon={<Heart className="w-12 h-12 text-gray-300" />} title="Henüz favori eklemediniz"
                desc="Beğendiğiniz işletmeleri ❤ ikonuna tıklayarak kaydedin.">
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => navigate("/siparis")}
                    className="flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-bold text-white"
                    style={{ color: "#fff" }}
                  >
                    <UtensilsCrossed className="w-4 h-4" /> Sipariş
                  </button>
                  <button onClick={() => navigate("/alisveris")}
                    className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                    <ShoppingBag className="w-4 h-4" /> Alışveriş
                  </button>
                </div>
              </EmptyState>
            ) : favVendors.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {v.imageUrl
                    ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300">
                        {v.vendorType === "delivery" ? <UtensilsCrossed className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 truncate">{v.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {v.rating && v.rating > 0 && (
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-current" />{v.rating.toFixed(1)}
                      </span>
                    )}
                    {v.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleFavorite(v.id)}
                    className="p-2 rounded-xl transition hover:bg-red-50" title="Favoriden çıkar">
                    <Heart className="w-5 h-5 fill-current text-red-500" />
                  </button>
                  <button
                    onClick={() => navigate(v.vendorType === "delivery" ? `/siparis/${v.id}` : `/alisveris/${v.id}`)}
                    className="flex items-center gap-1 rounded-xl bg-[#0f766e] px-3 py-2 text-xs font-bold text-white"
                    style={{ color: "#fff" }}
                  >
                    Git <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function PF({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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

function EmptyState({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-gray-600 font-bold">{title}</p>
      <p className="text-gray-400 text-sm mt-1">{desc}</p>
      {children}
    </div>
  );
}
