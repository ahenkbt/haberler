import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";
import { providerPanelPath } from "@/lib/providerPanelRoutes";

type Vendor = {
  id: number;
  name: string;
  slug?: string;
  provider_subtype?: string;
  is_open?: boolean;
  active?: boolean;
  panel_route?: string;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  owner_email?: string | null;
  application_status?: string | null;
};

type TourismListing = {
  id: number;
  type: string;
  title: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  price?: string | number | null;
  sale_price?: string | number | null;
  price_unit?: string | null;
  status?: string;
  booking_count?: number;
  capacity?: number | null;
  star_rating?: number | null;
};

type TourismRoom = {
  id: number;
  listing_id?: number;
  name: string;
  description?: string | null;
  price?: string | number | null;
  count?: number | null;
  adults?: number | null;
  children?: number | null;
  beds?: number | null;
  size_sqm?: number | null;
  status?: string;
};

type TourismBooking = {
  id: number;
  booking_ref?: string;
  listing_title?: string;
  listing_type?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string | null;
  check_in?: string;
  check_out?: string;
  guests?: number;
  total_price?: string | number;
  status?: string;
  notes?: string | null;
  created_at?: string;
};

type TabId =
  | "anasayfa"
  | "profil"
  | "ilanlar"
  | "odalar"
  | "rezervasyonlar"
  | "takvim"
  | "misafirler"
  | "raporlar"
  | "ayarlar";

const TYPE_LABELS: Record<string, string> = {
  hotel: "Otel / Oda",
  tour: "Tur Programı",
  car: "Rent a Car",
  villa: "Villa / Ev",
  boat: "Yat / Tekne",
};

const SUBTYPE_DEFAULT_TYPE: Record<string, string> = {
  otel: "hotel",
  hotel: "hotel",
  tur: "tour",
  tour: "tour",
  arac: "car",
  car: "car",
  rentacar: "car",
  villa: "villa",
  yat: "boat",
  tekne: "boat",
  boat: "boat",
};

const EMPTY_LISTING = {
  type: "hotel",
  title: "",
  city: "",
  district: "",
  address: "",
  price: "",
  salePrice: "",
  capacity: "",
  starRating: "",
  imageUrl: "",
  description: "",
  features_brand: "",
  features_model: "",
  features_year: "",
  features_fuel: "",
  features_transmission: "",
  features_route: "",
  features_duration: "",
  features_language: "",
  features_guide: "",
};

const EMPTY_ROOM = {
  name: "",
  description: "",
  beds: "1",
  adults: "2",
  children: "0",
  sizeSqm: "",
  price: "",
  count: "1",
  imageUrl: "",
};

const TABS: Array<{ id: TabId; label: string; group: string }> = [
  { id: "anasayfa", label: "🏠 Ana Sayfa", group: "GENEL" },
  { id: "profil", label: "👤 Profil", group: "GENEL" },
  { id: "ilanlar", label: "✈️ İlan / Envanter", group: "TURİZM OPERASYON" },
  { id: "odalar", label: "🛏️ Oda / Kapasite", group: "TURİZM OPERASYON" },
  { id: "rezervasyonlar", label: "📅 Rezervasyonlar", group: "TURİZM OPERASYON" },
  { id: "takvim", label: "💸 Takvim & Fiyat", group: "TURİZM OPERASYON" },
  { id: "misafirler", label: "👥 Misafirler", group: "CRM" },
  { id: "raporlar", label: "📊 Raporlar", group: "FİNANS" },
  { id: "ayarlar", label: "⚙️ Ayarlar", group: "GENEL" },
];

function money(v: unknown): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? `${n.toLocaleString("tr-TR")} TL` : "—";
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    cancelled: "İptal",
    completed: "Tamamlandı",
    active: "Aktif",
    inactive: "Pasif",
    deleted: "Silindi",
  };
  return map[String(status ?? "")] ?? String(status ?? "—");
}

function authHeaders() {
  return providerAuthHeaders(getProviderSession());
}

function publicTourismHref(vendor: Vendor | null, listings: TourismListing[]): string {
  const first = listings.find((l) => l.status !== "deleted" && l.type && l.title);
  if (first) return `/turizm/${encodeURIComponent(first.type)}/${encodeURIComponent(String((first as { slug?: string }).slug || first.id))}`;
  return vendor?.slug ? `/kesfet/${vendor.slug}` : "/turizm";
}

function PanelButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
        active
          ? "border border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm"
          : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon, onClick, tone = "cyan" }: { label: string; value: React.ReactNode; icon: string; onClick?: () => void; tone?: "cyan" | "emerald" | "amber" | "rose" }) {
  const tones = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
  };
  const Cmp = onClick ? "button" : "div";
  return (
    <Cmp onClick={onClick as never} className={`rounded-2xl border p-4 text-left shadow-sm ${tones[tone]} ${onClick ? "hover:shadow-md transition" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-wide opacity-80">{label}</p>
    </Cmp>
  );
}

export default function TurizmSaglayiciPaneli() {
  const [, navigate] = useLocation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [tab, setTab] = useState<TabId>("anasayfa");
  const [listings, setListings] = useState<TourismListing[]>([]);
  const [roomsByListing, setRoomsByListing] = useState<Record<number, TourismRoom[]>>({});
  const [bookings, setBookings] = useState<TourismBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [listingForm, setListingForm] = useState(EMPTY_LISTING);
  const [roomListingId, setRoomListingId] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [saving, setSaving] = useState(false);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4500);
  };

  const loadListings = useCallback(async () => {
    const r = await fetch(apiUrl("/api/tourism/vendor/listings"), { headers: authHeaders() }).then((x) => x.json()).catch(() => []);
    const rows = Array.isArray(r) ? r : [];
    setListings(rows);
    const roomPairs = await Promise.all(
      rows
        .filter((l: TourismListing) => l.type === "hotel")
        .map(async (l: TourismListing) => {
          const rooms = await fetch(apiUrl(`/api/tourism/vendor/listings/${l.id}/rooms`), { headers: authHeaders() })
            .then((x) => x.json())
            .catch(() => []);
          return [l.id, Array.isArray(rooms) ? rooms : []] as const;
        }),
    );
    setRoomsByListing(Object.fromEntries(roomPairs));
  }, []);

  const loadBookings = useCallback(async () => {
    const r = await fetch(apiUrl("/api/tourism/vendor/bookings"), { headers: authHeaders() }).then((x) => x.json()).catch(() => []);
    setBookings(Array.isArray(r) ? r : []);
  }, []);

  const loadVendor = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/providers/me"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        navigate("/servis-saglayici-giris");
        return;
      }
      const panelPath = data.vendor?.panel_route || providerPanelPath(data.vendor);
      if (panelPath !== "/turizm-paneli") {
        navigate(panelPath, { replace: true });
        return;
      }
      setVendor(data.vendor);
      const defaultType = SUBTYPE_DEFAULT_TYPE[String(data.vendor?.provider_subtype ?? "").toLocaleLowerCase("tr-TR")] || "hotel";
      setListingForm((f) => ({ ...f, type: defaultType, city: String(data.vendor?.city || ""), district: String(data.vendor?.district || "") }));
      await Promise.all([loadListings(), loadBookings()]);
    } finally {
      setLoading(false);
    }
  }, [loadBookings, loadListings, navigate]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  const allRooms = useMemo(() => Object.values(roomsByListing).flat().filter((r) => r.status !== "deleted"), [roomsByListing]);
  const stats = useMemo(() => {
    const activeListings = listings.filter((l) => l.status !== "deleted");
    return {
      listings: activeListings.length,
      rooms: allRooms.length,
      capacity: allRooms.reduce((sum, r) => sum + (Number(r.count) || 0), 0),
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      revenue: bookings.filter((b) => ["confirmed", "completed"].includes(String(b.status))).reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
    };
  }, [allRooms, bookings, listings]);

  const groupedTabs = useMemo(() => {
    const groups = new Map<string, typeof TABS>();
    for (const t of TABS) groups.set(t.group, [...(groups.get(t.group) || []), t]);
    return Array.from(groups.entries());
  }, []);

  async function setOpen(open: boolean) {
    if (!vendor) return;
    const res = await fetch(apiUrl("/api/providers/open-status"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ isOpen: open }),
    });
    if (res.ok) {
      setVendor((v) => (v ? { ...v, is_open: open } : v));
      flash(open ? "Mağaza açık olarak işaretlendi" : "Mağaza kapalı olarak işaretlendi");
    } else {
      flash("Açık/kapalı durumu kaydedilemedi");
    }
  }

  async function saveListing() {
    if (!listingForm.title || !listingForm.price) {
      flash("Başlık ve fiyat zorunlu");
      return;
    }
    setSaving(true);
    const features: Record<string, string> = {};
    for (const [key, value] of Object.entries(listingForm)) {
      if (key.startsWith("features_") && value) features[key.replace("features_", "")] = value;
    }
    const res = await fetch(apiUrl("/api/tourism/vendor/listings"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        type: listingForm.type,
        title: listingForm.title,
        description: listingForm.description,
        city: listingForm.city,
        district: listingForm.district,
        address: listingForm.address,
        price: Number(listingForm.price),
        salePrice: listingForm.salePrice ? Number(listingForm.salePrice) : null,
        capacity: listingForm.capacity ? Number(listingForm.capacity) : null,
        starRating: listingForm.starRating ? Number(listingForm.starRating) : null,
        imageUrl: listingForm.imageUrl || null,
        features,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || "İlan kaydedilemedi");
      return;
    }
    setListingForm((f) => ({ ...EMPTY_LISTING, type: f.type, city: f.city, district: f.district }));
    flash("Turizm kaydı oluşturuldu");
    await loadListings();
  }

  async function saveRoom() {
    if (!roomListingId || !roomForm.name || !roomForm.price) {
      flash("Oda ve fiyat bilgisi zorunlu");
      return;
    }
    setSaving(true);
    const res = await fetch(apiUrl(`/api/tourism/vendor/listings/${roomListingId}/rooms`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: roomForm.name,
        description: roomForm.description || null,
        beds: Number(roomForm.beds) || 1,
        adults: Number(roomForm.adults) || 2,
        children: Number(roomForm.children) || 0,
        sizeSqm: roomForm.sizeSqm ? Number(roomForm.sizeSqm) : null,
        price: Number(roomForm.price),
        count: Number(roomForm.count) || 1,
        imageUrl: roomForm.imageUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      flash("Oda kaydedilemedi");
      return;
    }
    setRoomForm(EMPTY_ROOM);
    flash("Oda eklendi");
    await loadListings();
  }

  async function updateBooking(id: number, status: string) {
    await fetch(apiUrl(`/api/tourism/vendor/bookings/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status }),
    });
    flash("Rezervasyon durumu güncellendi");
    await loadBookings();
  }

  function logout() {
    localStorage.removeItem("providerSession");
    navigate("/servis-saglayici-giris");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
      </div>
    );
  }

  const vitrinHref = publicTourismHref(vendor, listings);
  const loginEmail = String(vendor?.owner_email || vendor?.email || "").trim();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-sm font-black text-cyan-900">
              {vendor?.name?.charAt(0)?.toUpperCase() || "T"}
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-950">{vendor?.name}</h1>
              <p className="text-xs text-slate-500">Turizm sağlayıcı paneli · {loginEmail || "e-posta tanımsız"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${vendor?.is_open === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {vendor?.is_open === false ? "Mağaza Kapalı" : "Mağaza Açık"}
            </span>
            <button onClick={() => void setOpen(vendor?.is_open === false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {vendor?.is_open === false ? "Aç" : "Kapat"}
            </button>
            <a href={vitrinHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Vitrin →</a>
            <button onClick={logout} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">Çıkış</button>
          </div>
        </div>
      </header>

      {message ? <div className="mx-auto mt-4 max-w-[1700px] rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">{message}</div> : null}

      <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-slate-950 p-4 text-white">
            <p className="text-xs font-bold uppercase opacity-80">Turizm İşletmesi</p>
            <p className="mt-1 text-lg font-black leading-tight">{vendor?.name}</p>
            <p className="mt-2 text-xs opacity-75">{vendor?.city || "Şehir yok"} {vendor?.district ? `/ ${vendor.district}` : ""}</p>
          </div>
          <div className="mt-4 space-y-4">
            {groupedTabs.map(([group, tabs]) => (
              <div key={group}>
                <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{group}</p>
                <div className="space-y-1">
                  {tabs.map((t) => (
                    <PanelButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                      {t.label}
                    </PanelButton>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="İlan" value={stats.listings} icon="✈️" onClick={() => setTab("ilanlar")} />
            <StatCard label="Oda / Birim" value={stats.rooms} icon="🛏️" onClick={() => setTab("odalar")} />
            <StatCard label="Kapasite" value={stats.capacity || "—"} icon="👥" tone="emerald" />
            <StatCard label="Bekleyen" value={stats.pending} icon="⏳" tone="amber" onClick={() => setTab("rezervasyonlar")} />
            <StatCard label="Onaylı" value={stats.confirmed} icon="✅" tone="emerald" onClick={() => setTab("rezervasyonlar")} />
            <StatCard label="Ciro" value={money(stats.revenue)} icon="💰" tone="rose" />
          </section>

          {tab === "anasayfa" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
                <p className="font-black">Turizm operasyon paneli</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Otel odası, tur programı, rent a car aracı, villa ve tekne ilanlarını; rezervasyon onaylarını ve fiyat takibini bu panelden yönetin.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {TABS.filter((t) => !["anasayfa", "profil"].includes(t.id)).slice(0, 6).map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-cyan-200 hover:shadow-md">
                    <p className="text-sm font-black text-slate-950">{t.label}</p>
                    <p className="mt-1 text-xs text-slate-500">Bu modüle git</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Son rezervasyonlar</h2>
                <div className="mt-3 divide-y">
                  {bookings.slice(0, 6).map((b) => (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{b.customer_name || "Misafir"} · {b.listing_title || "İlan"}</p>
                        <p className="text-xs text-slate-500">{b.customer_phone || "Telefon yok"} · {b.check_in || "Tarih yok"} · {money(b.total_price)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel(b.status)}</span>
                    </div>
                  ))}
                  {bookings.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Henüz rezervasyon yok.</p> : null}
                </div>
              </div>
            </section>
          )}

          {tab === "profil" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">İşletme panel bilgileri</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Panel yolu:</span> /turizm-paneli</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Giriş e-postası:</span> {loginEmail || "Tanımsız"}</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Telefon:</span> {vendor?.phone || "Tanımsız"}</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Vitrin:</span> {vitrinHref}</div>
              </div>
            </section>
          )}

          {tab === "ilanlar" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Yeni turizm kaydı</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <select className="rounded-xl border px-3 py-2 text-sm" value={listingForm.type} onChange={(e) => setListingForm((f) => ({ ...f, type: e.target.value }))}>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Başlık" value={listingForm.title} onChange={(e) => setListingForm((f) => ({ ...f, title: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Şehir" value={listingForm.city} onChange={(e) => setListingForm((f) => ({ ...f, city: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="İlçe" value={listingForm.district} onChange={(e) => setListingForm((f) => ({ ...f, district: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" placeholder="Adres / rota / buluşma noktası" value={listingForm.address} onChange={(e) => setListingForm((f) => ({ ...f, address: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Fiyat" inputMode="decimal" value={listingForm.price} onChange={(e) => setListingForm((f) => ({ ...f, price: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Kapasite / kontenjan" value={listingForm.capacity} onChange={(e) => setListingForm((f) => ({ ...f, capacity: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Marka / rehber / rota" value={listingForm.features_brand} onChange={(e) => setListingForm((f) => ({ ...f, features_brand: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Model / süre / dil" value={listingForm.features_model} onChange={(e) => setListingForm((f) => ({ ...f, features_model: e.target.value }))} />
                  <textarea className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" rows={3} placeholder="Açıklama" value={listingForm.description} onChange={(e) => setListingForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <button disabled={saving} onClick={() => void saveListing()} className="mt-4 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </section>
              <section className="space-y-3">
                {listings.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-cyan-700">{TYPE_LABELS[l.type] || l.type}</p>
                        <h3 className="text-lg font-black text-slate-950">{l.title}</h3>
                        <p className="text-sm text-slate-500">{[l.city, l.district].filter(Boolean).join(" / ") || "Konum yok"} · {money(l.sale_price || l.price)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel(l.status)}</span>
                    </div>
                    {l.type === "hotel" ? (
                      <button onClick={() => { setRoomListingId(l.id); setTab("odalar"); }} className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">
                        Oda yönetimine git
                      </button>
                    ) : null}
                  </div>
                ))}
              </section>
            </div>
          )}

          {tab === "odalar" && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Oda / kapasite yönetimi</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <select className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" value={roomListingId ?? ""} onChange={(e) => setRoomListingId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Otel ilanı seç</option>
                    {listings.filter((l) => l.type === "hotel" && l.status !== "deleted").map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                  <input className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" placeholder="Oda adı" value={roomForm.name} onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Fiyat" value={roomForm.price} onChange={(e) => setRoomForm((f) => ({ ...f, price: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Oda sayısı" value={roomForm.count} onChange={(e) => setRoomForm((f) => ({ ...f, count: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Yatak" value={roomForm.beds} onChange={(e) => setRoomForm((f) => ({ ...f, beds: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Yetişkin" value={roomForm.adults} onChange={(e) => setRoomForm((f) => ({ ...f, adults: e.target.value }))} />
                  <textarea className="rounded-xl border px-3 py-2 text-sm sm:col-span-4" rows={2} placeholder="Açıklama" value={roomForm.description} onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <button disabled={saving} onClick={() => void saveRoom()} className="mt-4 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Odayı Kaydet</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listings.filter((l) => l.type === "hotel").map((l) => (
                  <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-black text-slate-950">{l.title}</p>
                    <div className="mt-3 space-y-2">
                      {(roomsByListing[l.id] || []).map((r) => (
                        <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="font-bold">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.count || 1} oda · {r.adults || 2} yetişkin · {money(r.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === "rezervasyonlar" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="text-lg font-black">Rezervasyon operasyonu</h2>
                <p className="text-sm text-slate-500">Onay, iptal ve tamamlandı akışlarını buradan yönetin.</p>
              </div>
              <div className="divide-y">
                {bookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-black text-slate-950">{b.customer_name} · {b.listing_title}</p>
                      <p className="text-sm text-slate-500">{b.customer_phone} · {b.check_in || "Tarih yok"} - {b.check_out || ""} · {money(b.total_price)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel(b.status)}</span>
                      {["confirmed", "cancelled", "completed"].map((s) => (
                        <button key={s} onClick={() => void updateBooking(b.id, s)} className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {bookings.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Henüz rezervasyon yok.</div> : null}
              </div>
            </section>
          )}

          {["takvim", "misafirler", "raporlar", "ayarlar"].includes(tab) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">{TABS.find((t) => t.id === tab)?.label}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Bu modül turizm işletmesi için hazırlandı. Rezervasyon ve envanter verilerinizle birlikte sezon fiyatı, misafir notu,
                rapor ve operasyon ayarları bu alanda yönetilecek.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Günlük operasyon", "Onay bekleyen işler", "Vitrin / SEO kontrolü"].map((x) => (
                  <div key={x} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700">{x}</div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
