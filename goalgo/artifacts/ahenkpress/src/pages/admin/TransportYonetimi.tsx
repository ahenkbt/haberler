import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { GoogleIsletmeImportCard, vendorGoogleImportColumns } from "@/components/admin/GoogleIsletmeImportCard";
import { AdminMapPanelSyncToolbar } from "@/components/admin/AdminMapPanelSyncToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Car, Package, RefreshCw, CheckCircle, XCircle, Clock,
  MapPin, Phone, Truck, Search, Eye, Navigation, Building2, CheckCircle2, XCircle as XCircleIcon,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Bekliyor",    color: "bg-yellow-100 text-yellow-800" },
  accepted:   { label: "Kabul",       color: "bg-blue-100 text-blue-800" },
  in_transit: { label: "Yolda",       color: "bg-indigo-100 text-indigo-800" },
  delivered:  { label: "Teslim",      color: "bg-green-100 text-green-800" },
  cancelled:  { label: "İptal",       color: "bg-red-100 text-red-800" },
  completed:  { label: "Tamamlandı",  color: "bg-gray-100 text-gray-700" },
};

/** API ve formlar `taxi` | `courier` | `tow` | `moving` kullanır; eski kayıtlar için alias */
function normalizeTransportRequestType(raw: string | undefined): string {
  const t = (raw || "").toLowerCase();
  const aliases: Record<string, string> = {
    kurye: "courier",
    tasima: "moving",
    cekici: "tow",
    kargo: "cargo",
  };
  return aliases[t] || t;
}

function normalizeVehicleType(raw: string | undefined): string {
  const t = (raw || "").toLowerCase();
  const aliases: Record<string, string> = { kurye: "courier", cekici: "tow" };
  return aliases[t] || t;
}

const REQUEST_TYPE_ORDER = ["taxi", "courier", "tow", "moving", "cargo"] as const;

const REQUEST_TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  taxi:    { label: "Taksi / Yolculuk", emoji: "🚕", color: "bg-yellow-50 text-yellow-700" },
  courier: { label: "Kurye",            emoji: "📦", color: "bg-orange-50 text-orange-700" },
  moving:  { label: "Nakliyat",         emoji: "🚛", color: "bg-blue-50 text-blue-700" },
  tow:     { label: "Çekici",           emoji: "🔧", color: "bg-red-50 text-red-700" },
  cargo:   { label: "Kargo",            emoji: "📮", color: "bg-purple-50 text-purple-700" },
};

const VEHICLE_TYPE_ORDER = ["rideshare", "taxi", "courier", "tow", "moving", "cargo", "van", "truck", "minibus"] as const;

type UlasimVendorListFilter =
  | "all"
  | "active"
  | "opening"
  | "no_menu"
  | "no_contact"
  | "google_scrape"
  | "google_api";

const VEHICLE_TYPE_META: Record<string, { label: string; emoji: string }> = {
  rideshare: { label: "Araç paylaşımı", emoji: "🚗" },
  taxi:      { label: "Taksi", emoji: "🚕" },
  courier:   { label: "Kurye", emoji: "🛵" },
  tow:       { label: "Çekici", emoji: "🚛" },
  moving:    { label: "Nakliyat", emoji: "📦" },
  cargo:     { label: "Kargo", emoji: "📮" },
  van:       { label: "Panelvan", emoji: "🚐" },
  truck:     { label: "Kamyon", emoji: "🚚" },
  minibus:   { label: "Minibüs", emoji: "🚌" },
};

function requestTypeRowMeta(raw: string | undefined) {
  const norm = normalizeTransportRequestType(raw);
  return REQUEST_TYPE_META[norm] ?? { label: raw || "—", emoji: "📋", color: "bg-gray-50 text-gray-600" };
}

function transportPanelLoginEmail(v: any): string {
  return String(v.ownerEmail || v.owner_email || v.email || "").trim();
}

function transportVendorPublicHref(v: any): string {
  return v.slug ? `/kesfet/${v.slug}` : "/ulasim";
}

export default function TransportYonetimi() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"requests" | "vehicles" | "fleet" | "rides" | "vendors">("requests");
  const [reqTypeFilter, setReqTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewReq, setViewReq] = useState<any>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorListFilter, setVendorListFilter] = useState<UlasimVendorListFilter>("all");

  const [fleetForm, setFleetForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    vehicleType: "taxi",
    brand: "",
    model: "",
    plateNumber: "",
    city: "",
    address: "",
  });

  const { data: requestsData, isLoading: reqLoading } = useQuery<any[]>({
    queryKey: ["/api/transport/requests", reqTypeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (reqTypeFilter) params.set("type", reqTypeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const r = await apiRequest(`/api/transport/requests?${params}`);
      return asArray(Array.isArray(r) ? r : (r?.data ?? r?.requests));
    },
    refetchInterval: 20000,
  });
  const requests = asArray(requestsData);

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<any[]>({
    queryKey: ["/api/transport/vehicles", vehicleTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200", admin: "1" });
      if (vehicleTypeFilter) params.set("type", vehicleTypeFilter);
      const r = await apiRequest(`/api/transport/vehicles?${params}`);
      return asArray(Array.isArray(r) ? r : (r?.data ?? r?.vehicles));
    },
    enabled: tab === "vehicles" || tab === "fleet",
  });
  const vehicles = asArray(vehiclesData);

  const { data: ulasimVendorsData, isLoading: ulasimVendorsLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/vendors-admin", "ulasim"],
    queryFn: () => apiRequest("/api/delivery/vendors-admin?type=ulasim").then(asArray),
    enabled: tab === "vendors",
  });
  const ulasimVendors = asArray(ulasimVendorsData);

  const { data: ridesData, isLoading: ridesLoading } = useQuery<any[]>({
    queryKey: ["/api/transport/rides"],
    queryFn: async () => {
      const r = await apiRequest("/api/transport/rides");
      return asArray(Array.isArray(r) ? r : r?.data);
    },
    enabled: tab === "rides",
  });
  const rides = asArray(ridesData);

  const registerFleetMut = useMutation({
    mutationFn: async (body: typeof fleetForm) => {
      const res = await apiFetch(apiUrl("/api/transport/admin/register-driver"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/transport/vehicles"] });
      toast({ title: "Şoför hesabı ve araç kaydedildi" });
      setFleetForm({
        email: "",
        password: "",
        name: "",
        phone: "",
        vehicleType: "taxi",
        brand: "",
        model: "",
        plateNumber: "",
        city: "",
        address: "",
      });
    },
    onError: (e: unknown) =>
      toast({
        title: "Kayıt başarısız",
        description: (e instanceof Error ? e.message : String(e)).slice(0, 220),
        variant: "destructive",
      }),
  });

  const updateReqMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/transport/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport/requests"] });
      toast({ title: "Durum güncellendi" });
    },
  });

  const patchVendor = async (v: any, body: Record<string, unknown>) => {
    await apiRequest(`/api/delivery/vendors/${v.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    await qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ulasim"] });
  };

  const openProviderPanel = async (v: any) => {
    const res = await apiFetch(apiUrl(`/api/admin/providers/${v.id}/panel-session`), { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { session?: unknown; vendor?: { panel_route?: string } };
    if (!res.ok || !data.session) {
      toast({ title: "Panel açılamadı", description: "Panel oturumu oluşturulamadı.", variant: "destructive" });
      return;
    }
    localStorage.setItem("providerSession", JSON.stringify(data.session));
    window.open(data.vendor?.panel_route || "/ulasim-paneli", "_blank", "noopener,noreferrer");
  };

  const setProviderPassword = async (v: any) => {
    const password = window.prompt(`${v.name} için servis sağlayıcı panel şifresi girin (en az 4 karakter):`);
    if (password === null) return;
    if (password.trim().length < 4) {
      toast({ title: "Şifre kısa", description: "Şifre en az 4 karakter olmalı.", variant: "destructive" });
      return;
    }
    const res = await apiFetch(apiUrl(`/api/admin/providers/${v.id}/set-password`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ title: "Şifre kaydedilemedi", description: String((data as { error?: string }).error || res.status), variant: "destructive" });
      return;
    }
    toast({ title: "Panel şifresi kaydedildi", description: `Giriş: ${transportPanelLoginEmail(v) || "işletme e-postası"}` });
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const summaryByType = REQUEST_TYPE_ORDER.reduce<Record<string, number>>((acc, t) => {
    acc[t] = requests.filter((r) => normalizeTransportRequestType(r.requestType || r.request_type) === t).length;
    return acc;
  }, {});

  const ulasimSearchFiltered = ulasimVendors.filter((v) =>
    !vendorSearch ||
    String(v.name || "").toLowerCase().includes(vendorSearch.toLowerCase()) ||
    String(v.city || "").toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const ulasimFiltered = ulasimSearchFiltered.filter((v) => {
    if (vendorListFilter === "all") return true;
    if (vendorListFilter === "active") return v.active === true;
    if (vendorListFilter === "opening") return v.isOpen === false;
    if (vendorListFilter === "no_menu") return v.catalogMenuGap === true;
    if (vendorListFilter === "no_contact") return v.catalogContactGap === true;
    if (vendorListFilter === "google_scrape") return vendorGoogleImportColumns(v).scrape;
    if (vendorListFilter === "google_api") return vendorGoogleImportColumns(v).api;
    return true;
  });
  const ulasimVendorCounts = {
    all: ulasimVendors.length,
    active: ulasimVendors.filter((v) => v.active === true).length,
    opening: ulasimVendors.filter((v) => v.isOpen === false).length,
    no_menu: ulasimVendors.filter((v) => v.catalogMenuGap === true).length,
    no_contact: ulasimVendors.filter((v) => v.catalogContactGap === true).length,
    google_scrape: ulasimVendors.filter((v) => vendorGoogleImportColumns(v).scrape).length,
    google_api: ulasimVendors.filter((v) => vendorGoogleImportColumns(v).api).length,
  };

  const filteredRequests = requests.filter(r =>
    !search ||
    (r.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.customerPhone || "").includes(search) ||
    (r.trackingCode || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Ulaşım Yönetimi">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ulaşım Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Talepler, filo (şirket tarafından eklenen şoför + araç) ve araç paylaşım ilanları. Şoförler ayrıca{" "}
            <a href="/surucu-paneli" className="text-primary underline font-medium">sürücü panelinden</a> de kayıt olabilir.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Package className="w-5 h-5 text-indigo-600" /><span className="text-sm font-semibold text-indigo-700">Toplam Talep</span></div>
            <p className="text-2xl font-black text-indigo-700">{requests.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-yellow-600" /><span className="text-sm font-semibold text-yellow-700">Bekleyen</span></div>
            <p className="text-2xl font-black text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm font-semibold text-green-700">Tamamlanan</span></div>
            <p className="text-2xl font-black text-green-700">{requests.filter(r => r.status === "completed" || r.status === "delivered").length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Car className="w-5 h-5 text-blue-600" /><span className="text-sm font-semibold text-blue-700">Araç İlanları</span></div>
            <p className="text-2xl font-black text-blue-700">{rides.length || "—"}</p>
          </div>
        </div>

        {/* Request type quick-filter pills */}
        <div className="flex flex-wrap gap-2">
          {REQUEST_TYPE_ORDER.map((k) => {
            const v = REQUEST_TYPE_META[k];
            return (
            <button key={k}
              onClick={() => setReqTypeFilter(reqTypeFilter === k ? "" : k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition ${
                reqTypeFilter === k ? "border-current shadow-sm" : "border-transparent"
              } ${v.color}`}>
              {v.emoji} {v.label} <span className="opacity-60">({summaryByType[k] || 0})</span>
            </button>
          );})}
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 border-b">
          {[
            { key: "requests", label: `Talepler${pendingCount > 0 ? ` (${pendingCount} bekliyor)` : ""}`, icon: Package },
            { key: "vendors", label: "Ulaşım işletmeleri", icon: Building2 },
            { key: "vehicles", label: "Araç & Şoförler", icon: Car },
            { key: "fleet", label: "Filo ekle (admin)", icon: Truck },
            { key: "rides",    label: "Araç İlanları",   icon: Navigation },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                tab === key ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ─── Tab: Talepler ─── */}
        {tab === "requests" && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri, telefon, takip kodu..." className="pl-9" />
              </div>
              <select value={reqTypeFilter} onChange={e => setReqTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Tüm talep türleri</option>
                {REQUEST_TYPE_ORDER.map((k) => {
                  const v = REQUEST_TYPE_META[k];
                  return <option key={k} value={k}>{v.emoji} {v.label}</option>;
                })}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Tüm durumlar</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {reqLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Yükleniyor...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Talep bulunamadı</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Takip Kodu</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tür</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Müşteri</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nereden / Nereye</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarih</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRequests.map((r: any) => {
                      const st = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-gray-100 text-gray-600" };
                      const rt = requestTypeRowMeta(r.requestType || r.request_type);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.trackingCode || `#${r.id}`}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${rt.color}`}>{rt.emoji} {rt.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{r.customerName}</div>
                            <div className="text-xs text-gray-400">{r.customerPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                            <div className="truncate">{r.fromAddress}</div>
                            {r.toAddress && <div className="text-gray-400 truncate">→ {r.toAddress}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-4 py-3">
                            <select value={r.status}
                              onChange={e => updateReqMut.mutate({ id: r.id, status: e.target.value })}
                              className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${st.color}`}>
                              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => setViewReq(r)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-400 border-t">{filteredRequests.length} talep</div>
              </div>
            )}
          </>
        )}

        {/* ─── Tab: Ulaşım işletmeleri (vendor kayıtları) ─── */}
        {tab === "vendors" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600 max-w-xl">
                Haritadan toplu veya seçerek ulaşım vendor oluşturmak için aşağıdaki araç çubuğunu kullanın.
                Google&apos;dan doğrudan eklemek için alttaki formu kullanın (Place Details).
              </p>
              <AdminMapPanelSyncToolbar
                vendorModule="ulasim"
                invalidateQueryKeys={[["/api/delivery/vendors-admin", "ulasim"]]}
              />
            </div>

            <GoogleIsletmeImportCard
              vendorType="ulasim"
              borderClass="border-amber-100"
              onImported={() => void qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "ulasim"] })}
            />

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="İşletme adı, şehir…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { key: "all" as const, label: "Tümü", count: ulasimVendorCounts.all },
                { key: "active" as const, label: "Aktif işletmeler", count: ulasimVendorCounts.active },
                { key: "opening" as const, label: "Açılış aşamasında", count: ulasimVendorCounts.opening },
                { key: "no_menu" as const, label: "Menü/ürünü olmayanlar", count: ulasimVendorCounts.no_menu },
                { key: "no_contact" as const, label: "İletişim bilgisi olmayanlar", count: ulasimVendorCounts.no_contact },
                { key: "google_scrape" as const, label: "Google kazıma", count: ulasimVendorCounts.google_scrape },
                { key: "google_api" as const, label: "Google API", count: ulasimVendorCounts.google_api },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVendorListFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    vendorListFilter === key
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                  <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-gray-500 tabular-nums">{count}</span>
                </button>
              ))}
            </div>

            {ulasimVendorsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Yükleniyor…
              </div>
            ) : ulasimFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 border rounded-xl bg-white">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Kayıtlı ulaşım işletmesi yok</p>
                <p className="text-xs mt-1">Haritadan taşıyın veya Google&apos;dan ekleyin.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">İşletme / Panel</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kazıma</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">API</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Şehir</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Telefon</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Açık</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ulasimFiltered.map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{v.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">/{v.slug} · Panel: /ulasim-paneli</div>
                          <div className="text-[11px] text-amber-700 truncate max-w-[240px]">
                            Giriş: {transportPanelLoginEmail(v) || "e-posta tanımsız"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-medium">
                          {vendorGoogleImportColumns(v).scrape ? "Evet" : "—"}
                        </td>
                        <td className="px-4 py-3 text-sky-700 font-medium">
                          {vendorGoogleImportColumns(v).api ? "Evet" : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{v.city || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{v.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => void patchVendor(v, { isOpen: v.isOpen === false })}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${v.isOpen === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                          >
                            {v.isOpen === false ? "Kapalı" : "Açık"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            {v.active ? (
                              <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Aktif</>
                            ) : (
                              <><XCircleIcon className="w-3.5 h-3.5 text-gray-400" /> Pasif</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5 min-w-[360px]">
                            <Button size="sm" variant="outline" onClick={() => void openProviderPanel(v)}>
                              Panel
                            </Button>
                            <a href={transportVendorPublicHref(v)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                              Vitrin
                            </a>
                            <Button size="sm" variant="outline" onClick={() => void setProviderPassword(v)}>
                              Şifre
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void patchVendor(v, { active: !v.active, status: !v.active ? "active" : v.status })}>
                              {v.active ? "Pasifleştir" : "Aktif Et"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-400 border-t">
                  {ulasimFiltered.length} / {ulasimVendors.length} işletme (filtre sonrası)
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Araç & Şoförler ─── */}
        {tab === "vehicles" && (
          <>
            {/* Vehicle type summary grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {VEHICLE_TYPE_ORDER.map((k) => {
                const v = VEHICLE_TYPE_META[k];
                const count = vehicles.filter(
                  (ve) => normalizeVehicleType(ve.vehicleType || ve.vehicle_type) === k,
                ).length;
                return (
                  <button key={k}
                    onClick={() => setVehicleTypeFilter(vehicleTypeFilter === k ? "" : k)}
                    className={`bg-white border rounded-xl p-3 text-center transition hover:shadow-md ${vehicleTypeFilter === k ? "border-primary ring-1 ring-primary" : ""}`}>
                    <div className="text-2xl mb-1">{v.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">{v.label}</div>
                    <div className="text-lg font-black text-gray-900">{count}</div>
                  </button>
                );
              })}
            </div>

            {vehiclesLoading ? (
              <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Kayıtlı araç/şoför bulunamadı</p>
                <p className="text-xs mt-1">Sürücüler Ulaşım platformuna araç ekledikçe burada görünür</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {vehicles.map((v: any) => {
                  const vt =
                    VEHICLE_TYPE_META[normalizeVehicleType(v.vehicleType || v.vehicle_type)] ??
                    { label: v.vehicleType || v.vehicle_type || "—", emoji: "🚗" };
                  const available = v.isAvailable ?? v.is_available;
                  return (
                    <div key={v.id} className="bg-white rounded-xl border p-4 flex items-center gap-4 shadow-sm">
                      <div className="text-3xl shrink-0">{vt.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{v.ownerName || v.owner_name}</span>
                          <Badge className="bg-blue-50 text-blue-700 border-0">{vt.label}</Badge>
                          {(v.plateNo || v.plate_no) && <Badge className="bg-gray-100 text-gray-700 border-0 font-mono">{v.plateNo || v.plate_no}</Badge>}
                          <Badge className={available ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                            {available ? <><CheckCircle className="w-3 h-3 mr-1" />Müsait</> : <><XCircle className="w-3 h-3 mr-1" />Meşgul</>}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                          {(v.ownerPhone || v.owner_phone) && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.ownerPhone || v.owner_phone}</span>}
                          {(v.brand || v.model) && <span>{v.brand} {v.model} {v.year}</span>}
                          {(v.serviceArea || v.service_area) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.serviceArea || v.service_area}</span>}
                          {(v.pricePerKm || v.price_per_km) && <span className="font-medium text-indigo-600">{v.pricePerKm || v.price_per_km}₺/km</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Tab: Filo ekle (admin) ─── */}
        {tab === "fleet" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 max-w-2xl space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Şoför hesabı + araç ekle</h2>
              <p className="text-sm text-gray-500">
                Yeni bir <strong>shop_users</strong> hesabı ve ona bağlı <strong>ulaşım aracı</strong> oluşturulur. Şoför{" "}
                <a href="/surucu-paneli" className="text-primary underline font-medium" target="_blank" rel="noreferrer">
                  sürücü panelinden
                </a>{" "}
                aynı e-posta ve şifre ile giriş yapar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">E-posta *</Label>
                  <Input
                    type="email"
                    className="mt-1"
                    value={fleetForm.email}
                    onChange={(e) => setFleetForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="sofor@sirket.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Şifre * (min. 6)</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={fleetForm.password}
                    onChange={(e) => setFleetForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Ad Soyad *</Label>
                  <Input
                    className="mt-1"
                    value={fleetForm.name}
                    onChange={(e) => setFleetForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Telefon</Label>
                  <Input
                    className="mt-1"
                    value={fleetForm.phone}
                    onChange={(e) => setFleetForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05xx…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-600">Araç tipi *</Label>
                  <select
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={fleetForm.vehicleType}
                    onChange={(e) => setFleetForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  >
                    {VEHICLE_TYPE_ORDER.filter((k) => ["taxi", "courier", "tow", "moving", "cargo", "rideshare"].includes(k)).map((k) => (
                      <option key={k} value={k}>
                        {VEHICLE_TYPE_META[k]?.emoji} {VEHICLE_TYPE_META[k]?.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Marka</Label>
                  <Input className="mt-1" value={fleetForm.brand} onChange={(e) => setFleetForm((f) => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Model</Label>
                  <Input className="mt-1" value={fleetForm.model} onChange={(e) => setFleetForm((f) => ({ ...f, model: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Plaka</Label>
                  <Input className="mt-1" value={fleetForm.plateNumber} onChange={(e) => setFleetForm((f) => ({ ...f, plateNumber: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Şehir</Label>
                  <Input className="mt-1" value={fleetForm.city} onChange={(e) => setFleetForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ankara" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-gray-600">Adres</Label>
                  <Input className="mt-1" value={fleetForm.address} onChange={(e) => setFleetForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <Button
                className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                disabled={registerFleetMut.isPending}
                onClick={() => registerFleetMut.mutate(fleetForm)}
              >
                {registerFleetMut.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Mevcut filo (önizleme)</h3>
              {vehiclesLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : vehicles.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz kayıt yok.</p>
              ) : (
                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {vehicles.slice(0, 30).map((v: any) => (
                    <li key={v.id} className="flex justify-between gap-2 border-b border-gray-100 pb-1 last:border-0">
                      <span>{v.ownerName || v.owner_name || "—"}</span>
                      <span className="text-gray-500 font-mono text-xs">
                        {(v.vehicleType || v.vehicle_type) ?? ""} {v.plateNumber || v.plate_number || ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Araç İlanları ─── */}
        {tab === "rides" && (
          <>
            {ridesLoading ? (
              <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : rides.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Navigation className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Araç ilanı bulunamadı</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nereden</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nereye</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarih</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kapasite</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Fiyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rides.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{r.id}</td>
                        <td className="px-4 py-3 text-xs max-w-[150px] truncate">{r.fromAddress || r.from_address}</td>
                        <td className="px-4 py-3 text-xs max-w-[150px] truncate">{r.toAddress || r.to_address}</td>
                        <td className="px-4 py-3 text-xs">
                          {(r.departureTime || r.departure_time) ? new Date(r.departureTime || r.departure_time).toLocaleDateString("tr-TR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">{r.availableSeats || r.available_seats || "—"} kişi</td>
                        <td className="px-4 py-3 text-xs font-bold">
                          {(r.pricePerSeat || r.price_per_seat) ? `${r.pricePerSeat || r.price_per_seat}₺` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Talep Detay Modal */}
      {viewReq && (
        <Dialog open={!!viewReq} onOpenChange={() => setViewReq(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Talep #{viewReq.trackingCode || viewReq.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {([
                ["Müşteri",    viewReq.customerName],
                ["Telefon",    viewReq.customerPhone],
                ["Talep Türü", requestTypeRowMeta(viewReq.requestType || viewReq.request_type).label],
                ["Nereden",    viewReq.fromAddress],
                ["Nereye",     viewReq.toAddress || "—"],
                ["Planlı Tarih", viewReq.scheduledAt ? new Date(viewReq.scheduledAt).toLocaleString("tr-TR") : "—"],
                ["Tahmini Fiyat", viewReq.estimatedPrice ? `${viewReq.estimatedPrice}₺` : "—"],
                ["Not",        viewReq.note || "—"],
              ] as [string, string][]).filter(([, val]) => val).map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-28 shrink-0">{label}:</span>
                  <span>{val}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <label className="text-xs font-semibold text-gray-500">Durumu Güncelle</label>
                <select value={viewReq.status}
                  onChange={e => {
                    updateReqMut.mutate({ id: viewReq.id, status: e.target.value });
                    setViewReq((r: any) => ({ ...r, status: e.target.value }));
                  }}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
