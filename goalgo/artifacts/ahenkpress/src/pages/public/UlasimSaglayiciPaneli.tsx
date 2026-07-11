import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";
import { providerPanelPath } from "@/lib/providerPanelRoutes";

type Vendor = {
  id: number;
  name: string;
  slug?: string;
  is_open?: boolean;
  panel_route?: string;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  owner_email?: string | null;
};

type Vehicle = {
  id: number;
  vehicle_type?: string;
  brand?: string | null;
  model?: string | null;
  plate_number?: string | null;
  capacity?: number | null;
  city?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  service_area?: string | null;
  is_active?: boolean;
  is_available?: boolean;
};

type Ride = {
  id: number;
  from_city?: string;
  to_city?: string;
  departure_time?: string;
  total_seats?: number;
  available_seats?: number;
  price_per_seat?: string | number;
  status?: string;
  brand?: string | null;
  model?: string | null;
};

type TransportRequest = {
  id: number;
  request_type?: string;
  customer_name?: string;
  customer_phone?: string;
  from_address?: string;
  to_address?: string | null;
  scheduled_at?: string | null;
  estimated_price?: string | number | null;
  final_price?: string | number | null;
  assigned_vehicle_id?: number | null;
  tracking_code?: string;
  status?: string;
  extra_data?: Record<string, unknown> | null;
  created_at?: string;
};

type TabId = "anasayfa" | "profil" | "filo" | "talepler" | "dispatch" | "ortak-yolculuk" | "nakliye" | "personel" | "raporlar" | "ayarlar";

const VEHICLE_TYPES = [
  ["taxi", "Şehir içi yolcu taşıma"],
  ["courier", "Kurye"],
  ["tow", "Çekici"],
  ["moving", "Nakliyat"],
  ["cargo", "Kargo"],
  ["rideshare", "Ortak yolculuk"],
  ["van", "Panelvan"],
  ["truck", "Kamyon"],
  ["minibus", "Minibüs / Servis"],
];

const REQUEST_TYPES: Record<string, string> = {
  taxi: "Şehir içi yolcu taşıma",
  courier: "Kurye",
  tow: "Çekici",
  moving: "Nakliyat",
  cargo: "Kargo",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  accepted: "Kabul edildi",
  arrived_pickup: "Alım noktasında",
  picked_up: "Teslim alındı",
  in_transit: "Yolda",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
  cancelled: "İptal",
  active: "Aktif",
};

const EMPTY_VEHICLE = {
  vehicleType: "taxi",
  brand: "",
  model: "",
  plateNumber: "",
  capacity: "4",
  city: "",
  serviceArea: "",
  driverName: "",
  driverPhone: "",
  description: "",
};

const EMPTY_RIDE = {
  vehicleId: "",
  fromCity: "",
  toCity: "",
  fromAddress: "",
  toAddress: "",
  departureTime: "",
  totalSeats: "3",
  pricePerSeat: "",
  description: "",
};

const TABS: Array<{ id: TabId; label: string; group: string }> = [
  { id: "anasayfa", label: "🏠 Ana Sayfa", group: "GENEL" },
  { id: "profil", label: "👤 Profil", group: "GENEL" },
  { id: "filo", label: "🚐 Araç / Filo", group: "ULAŞIM OPERASYON" },
  { id: "talepler", label: "📦 Talepler", group: "ULAŞIM OPERASYON" },
  { id: "dispatch", label: "🧭 Dispatch", group: "ULAŞIM OPERASYON" },
  { id: "ortak-yolculuk", label: "🚗 Ortak Yolculuk", group: "ULAŞIM OPERASYON" },
  { id: "nakliye", label: "🚛 Nakliye / Çekici", group: "ULAŞIM OPERASYON" },
  { id: "personel", label: "👥 Sürücü / Kurye", group: "EKİP" },
  { id: "raporlar", label: "📊 Raporlar", group: "FİNANS" },
  { id: "ayarlar", label: "⚙️ Ayarlar", group: "GENEL" },
];

function authHeaders() {
  return providerAuthHeaders(getProviderSession());
}

function money(v: unknown): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("tr-TR")} TL` : "—";
}

function statusLabel(status?: string): string {
  return STATUS_LABELS[String(status ?? "")] ?? String(status ?? "—");
}

function vehicleTypeLabel(type?: string): string {
  return VEHICLE_TYPES.find(([value]) => value === type)?.[1] || type || "Araç";
}

function publicTransportHref(vendor: Vendor | null): string {
  return vendor?.slug ? `/kesfet/${vendor.slug}` : "/ulasim";
}

function PanelButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
        active
          ? "border border-orange-300 bg-orange-50 text-orange-950 shadow-sm"
          : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon, onClick, tone = "orange" }: { label: string; value: React.ReactNode; icon: string; onClick?: () => void; tone?: "orange" | "emerald" | "amber" | "rose" }) {
  const tones = {
    orange: "border-orange-100 bg-orange-50 text-orange-800",
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

export default function UlasimSaglayiciPaneli() {
  const [, navigate] = useLocation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [tab, setTab] = useState<TabId>("anasayfa");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [rideForm, setRideForm] = useState(EMPTY_RIDE);
  const [requestTypeFilter, setRequestTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4500);
  };

  const loadTransport = useCallback(async () => {
    const [summaryRes, vehiclesRes, ridesRes, requestsRes] = await Promise.all([
      fetch(apiUrl("/api/transport/vendor/summary"), { headers: authHeaders() }).then((x) => x.json()).catch(() => ({})),
      fetch(apiUrl("/api/transport/vendor/vehicles"), { headers: authHeaders() }).then((x) => x.json()).catch(() => []),
      fetch(apiUrl("/api/transport/vendor/rides"), { headers: authHeaders() }).then((x) => x.json()).catch(() => []),
      fetch(apiUrl(`/api/transport/vendor/requests${requestTypeFilter ? `?type=${encodeURIComponent(requestTypeFilter)}` : ""}`), { headers: authHeaders() }).then((x) => x.json()).catch(() => []),
    ]);
    setSummary(summaryRes || {});
    setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : []);
    setRides(Array.isArray(ridesRes) ? ridesRes : []);
    setRequests(Array.isArray(requestsRes) ? requestsRes : []);
  }, [requestTypeFilter]);

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
      if (panelPath !== "/ulasim-paneli") {
        navigate(panelPath, { replace: true });
        return;
      }
      setVendor(data.vendor);
      setVehicleForm((f) => ({ ...f, city: String(data.vendor?.city || "") }));
      await loadTransport();
    } finally {
      setLoading(false);
    }
  }, [loadTransport, navigate]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  useEffect(() => {
    if (!loading) void loadTransport();
  }, [requestTypeFilter]);

  const requestStats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      active: requests.filter((r) => ["accepted", "arrived_pickup", "picked_up", "in_transit"].includes(String(r.status))).length,
      done: requests.filter((r) => ["delivered", "completed"].includes(String(r.status))).length,
      revenue: requests.reduce((sum, r) => sum + (Number(r.final_price || r.estimated_price) || 0), 0),
    };
  }, [requests]);

  const groupedTabs = useMemo(() => {
    const groups = new Map<string, typeof TABS>();
    for (const t of TABS) groups.set(t.group, [...(groups.get(t.group) || []), t]);
    return Array.from(groups.entries());
  }, []);

  async function setOpen(open: boolean) {
    const res = await fetch(apiUrl("/api/providers/open-status"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ isOpen: open }),
    });
    if (res.ok) {
      setVendor((v) => (v ? { ...v, is_open: open } : v));
      flash(open ? "Ulaşım işletmesi açık" : "Ulaşım işletmesi kapalı");
    } else {
      flash("Açık/kapalı durumu kaydedilemedi");
    }
  }

  async function saveVehicle() {
    if (!vehicleForm.vehicleType) {
      flash("Araç/servis tipi seçin");
      return;
    }
    setSaving(true);
    const res = await fetch(apiUrl("/api/transport/vendor/vehicles"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ ...vehicleForm, capacity: Number(vehicleForm.capacity) || 1 }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || "Araç kaydedilemedi");
      return;
    }
    setVehicleForm((f) => ({ ...EMPTY_VEHICLE, city: f.city }));
    flash("Araç / personel kaydedildi");
    await loadTransport();
  }

  async function updateVehicle(id: number, patch: Record<string, unknown>) {
    await fetch(apiUrl(`/api/transport/vendor/vehicles/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(patch),
    });
    await loadTransport();
  }

  async function saveRide() {
    if (!rideForm.fromCity || !rideForm.toCity || !rideForm.departureTime || !rideForm.pricePerSeat) {
      flash("Kalkış, varış, tarih ve fiyat zorunlu");
      return;
    }
    setSaving(true);
    const res = await fetch(apiUrl("/api/transport/vendor/rides"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        ...rideForm,
        vehicleId: rideForm.vehicleId ? Number(rideForm.vehicleId) : null,
        totalSeats: Number(rideForm.totalSeats) || 3,
        pricePerSeat: Number(rideForm.pricePerSeat),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || "Yolculuk ilanı kaydedilemedi");
      return;
    }
    setRideForm(EMPTY_RIDE);
    flash("Ortak yolculuk ilanı yayınlandı");
    await loadTransport();
  }

  async function updateRequest(id: number, patch: Record<string, unknown>) {
    const res = await fetch(apiUrl(`/api/transport/vendor/requests/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || "Talep güncellenemedi");
      return;
    }
    flash("Talep güncellendi");
    await loadTransport();
  }

  function logout() {
    localStorage.removeItem("providerSession");
    navigate("/servis-saglayici-giris");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-300" />
      </div>
    );
  }

  const vitrinHref = publicTransportHref(vendor);
  const loginEmail = String(vendor?.owner_email || vendor?.email || "").trim();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-sm font-black text-orange-900">
              {vendor?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-950">{vendor?.name}</h1>
              <p className="text-xs text-slate-500">Ulaşım sağlayıcı paneli · {loginEmail || "e-posta tanımsız"}</p>
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

      {message ? <div className="mx-auto mt-4 max-w-[1700px] rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">{message}</div> : null}

      <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
          <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-slate-950 p-4 text-white">
            <p className="text-xs font-bold uppercase opacity-80">Ulaşım İşletmesi</p>
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
            <StatCard label="Araç / Personel" value={summary.vehicle_count ?? vehicles.length} icon="🚐" onClick={() => setTab("filo")} />
            <StatCard label="Bekleyen Talep" value={requestStats.pending} icon="⏳" tone="amber" onClick={() => setTab("talepler")} />
            <StatCard label="Devam Eden" value={requestStats.active} icon="🧭" tone="orange" onClick={() => setTab("dispatch")} />
            <StatCard label="Tamamlanan" value={requestStats.done} icon="✅" tone="emerald" onClick={() => setTab("talepler")} />
            <StatCard label="Yolculuk İlanı" value={summary.active_ride_count ?? rides.length} icon="🚗" onClick={() => setTab("ortak-yolculuk")} />
            <StatCard label="Tahmini Gelir" value={money(requestStats.revenue)} icon="💰" tone="rose" />
          </section>

          {tab === "anasayfa" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
                <p className="font-black">Ulaşım operasyon paneli</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Şehir içi yolcu taşıma, kurye, çekici, nakliyat, kargo ve ortak yolculuk operasyonlarınızı filo ve dispatch mantığıyla yönetin.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {TABS.filter((t) => !["anasayfa", "profil"].includes(t.id)).slice(0, 6).map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-orange-200 hover:shadow-md">
                    <p className="text-sm font-black text-slate-950">{t.label}</p>
                    <p className="mt-1 text-xs text-slate-500">Bu modüle git</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Canlı talepler</h2>
                <div className="mt-3 divide-y">
                  {requests.slice(0, 8).map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{r.customer_name || "Müşteri"} · {REQUEST_TYPES[String(r.request_type)] || r.request_type}</p>
                        <p className="text-xs text-slate-500">{r.from_address || "Adres yok"} {r.to_address ? `→ ${r.to_address}` : ""}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel(r.status)}</span>
                    </div>
                  ))}
                  {requests.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Henüz ulaşım talebi yok.</p> : null}
                </div>
              </div>
            </section>
          )}

          {tab === "profil" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">İşletme panel bilgileri</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Panel yolu:</span> /ulasim-paneli</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Giriş e-postası:</span> {loginEmail || "Tanımsız"}</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Telefon:</span> {vendor?.phone || "Tanımsız"}</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-bold">Vitrin:</span> {vitrinHref}</div>
              </div>
            </section>
          )}

          {tab === "filo" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Araç / sürücü / kurye ekle</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <select className="rounded-xl border px-3 py-2 text-sm" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleType: e.target.value }))}>
                    {VEHICLE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Şehir" value={vehicleForm.city} onChange={(e) => setVehicleForm((f) => ({ ...f, city: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Sürücü / kurye adı" value={vehicleForm.driverName} onChange={(e) => setVehicleForm((f) => ({ ...f, driverName: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Telefon" value={vehicleForm.driverPhone} onChange={(e) => setVehicleForm((f) => ({ ...f, driverPhone: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Marka" value={vehicleForm.brand} onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Model" value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Plaka" value={vehicleForm.plateNumber} onChange={(e) => setVehicleForm((f) => ({ ...f, plateNumber: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Kapasite" value={vehicleForm.capacity} onChange={(e) => setVehicleForm((f) => ({ ...f, capacity: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" placeholder="Hizmet bölgesi" value={vehicleForm.serviceArea} onChange={(e) => setVehicleForm((f) => ({ ...f, serviceArea: e.target.value }))} />
                  <textarea className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" rows={3} placeholder="Açıklama / belge notu" value={vehicleForm.description} onChange={(e) => setVehicleForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <button disabled={saving} onClick={() => void saveVehicle()} className="mt-4 rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </section>
              <section className="space-y-3">
                {vehicles.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-orange-700">{vehicleTypeLabel(v.vehicle_type)}</p>
                        <h3 className="text-lg font-black">{[v.brand, v.model, v.plate_number].filter(Boolean).join(" · ") || "Araç / personel"}</h3>
                        <p className="text-sm text-slate-500">{v.driver_name || "Sürücü atanmadı"} · {v.driver_phone || "Telefon yok"} · {v.city || "Şehir yok"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => void updateVehicle(v.id, { isAvailable: !v.is_available })} className="rounded-xl border px-3 py-2 text-xs font-bold">
                          {v.is_available === false ? "Müsait Yap" : "Meşgul Yap"}
                        </button>
                        <button onClick={() => void updateVehicle(v.id, { isActive: !v.is_active })} className="rounded-xl border px-3 py-2 text-xs font-bold">
                          {v.is_active === false ? "Aktif Et" : "Pasifleştir"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          {tab === "talepler" || tab === "dispatch" || tab === "nakliye" ? (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                <div>
                  <h2 className="text-lg font-black">{tab === "dispatch" ? "Dispatch ekranı" : tab === "nakliye" ? "Nakliye / çekici talepleri" : "Talepler ve operasyon"}</h2>
                  <p className="text-sm text-slate-500">Talep, atama, fiyat ve durum akışını buradan yönetin.</p>
                </div>
                <select className="rounded-xl border px-3 py-2 text-sm" value={requestTypeFilter} onChange={(e) => setRequestTypeFilter(e.target.value)}>
                  <option value="">Tüm talepler</option>
                  {Object.entries(REQUEST_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="divide-y">
                {requests.map((r) => (
                  <div key={r.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-orange-700">{REQUEST_TYPES[String(r.request_type)] || r.request_type}</p>
                        <h3 className="font-black text-slate-950">{r.customer_name} · {r.customer_phone}</h3>
                        <p className="text-sm text-slate-500">{r.from_address} {r.to_address ? `→ ${r.to_address}` : ""}</p>
                        <p className="mt-1 text-xs text-slate-400">Takip: {r.tracking_code || "—"} · Tahmini: {money(r.estimated_price)} · Final: {money(r.final_price)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel(r.status)}</span>
                        {["accepted", "in_transit", "delivered", "cancelled"].map((status) => (
                          <button key={status} onClick={() => void updateRequest(r.id, { status })} className="rounded-xl border px-3 py-2 text-xs font-bold">
                            {statusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Talep bulunamadı.</div> : null}
              </div>
            </section>
          ) : null}

          {tab === "ortak-yolculuk" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Ortak yolculuk ilanı</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <select className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" value={rideForm.vehicleId} onChange={(e) => setRideForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                    <option value="">Araç seçmeden yayınla</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{[v.brand, v.model, v.plate_number].filter(Boolean).join(" · ") || `Araç #${v.id}`}</option>)}
                  </select>
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Kalkış şehir" value={rideForm.fromCity} onChange={(e) => setRideForm((f) => ({ ...f, fromCity: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Varış şehir" value={rideForm.toCity} onChange={(e) => setRideForm((f) => ({ ...f, toCity: e.target.value }))} />
                  <input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={rideForm.departureTime} onChange={(e) => setRideForm((f) => ({ ...f, departureTime: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Koltuk fiyatı" value={rideForm.pricePerSeat} onChange={(e) => setRideForm((f) => ({ ...f, pricePerSeat: e.target.value }))} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Koltuk sayısı" value={rideForm.totalSeats} onChange={(e) => setRideForm((f) => ({ ...f, totalSeats: e.target.value }))} />
                  <textarea className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" rows={3} placeholder="Yolculuk notu" value={rideForm.description} onChange={(e) => setRideForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <button disabled={saving} onClick={() => void saveRide()} className="mt-4 rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">İlanı Yayınla</button>
              </section>
              <section className="space-y-3">
                {rides.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-black">{r.from_city} → {r.to_city}</p>
                    <p className="text-sm text-slate-500">{r.departure_time ? new Date(r.departure_time).toLocaleString("tr-TR") : "Tarih yok"} · {r.available_seats}/{r.total_seats} koltuk · {money(r.price_per_seat)}</p>
                  </div>
                ))}
              </section>
            </div>
          )}

          {["personel", "raporlar", "ayarlar"].includes(tab) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">{TABS.find((t) => t.id === tab)?.label}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Bu modül ulaşım işletmesi için hazırlandı. Filo personeli, operasyon raporları, belge takibi ve panel ayarları bu alanda yönetilecek.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Aktif ekip", "Belge / uygunluk", "Vitrin / SEO kontrolü"].map((x) => (
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
