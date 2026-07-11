import { useState, useEffect, useRef } from "react";
import { addMinutes } from "date-fns";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { forwardGeocodeAddressHybrid, reverseGeocodeHybrid } from "@/lib/mapsGeocode";
import { AdminMapPanelSyncToolbar } from "@/components/admin/AdminMapPanelSyncToolbar";
import { GeofillAddressButton } from "@/components/transport/GeofillAddressButton";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import { GoogleMapMiniPicker } from "@/components/GoogleMapMiniPicker";
import { apiRequest, asArray } from "@/lib/queryClient";
import { apiFetch, apiUrl, postAdminJson, ensureAdminPanelBootstrap, adminFetchErrorHint } from "@/lib/apiBase";
import {
  DELIVERY_MODULES,
  type DeliveryBusinessModule,
  deliveryVendorModule,
} from "@/lib/deliveryModuleGroups";
import { vendorGoogleImportColumns } from "@/components/admin/GoogleIsletmeImportCard";
import { ExternalMenuImportPanel } from "@/components/ExternalMenuImportPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Power, Star, MapPin, Phone,
  UtensilsCrossed, CheckCircle, XCircle, Store, ShoppingBag, Eye, Mail, KeyRound, Loader2, Sparkles, RefreshCcw,
} from "lucide-react";

function deliverySlaBreached(o: { status?: string; estimatedTime?: number; estimated_time?: number; confirmedAt?: string; confirmed_at?: string }) {
  const et = o.estimatedTime ?? o.estimated_time;
  const ca = o.confirmedAt ?? o.confirmed_at;
  if (!et || !ca) return false;
  if (["delivered", "cancelled"].includes(String(o.status ?? ""))) return false;
  return Date.now() > addMinutes(new Date(String(ca)), Number(et)).getTime();
}

function slugify(str: string) {
  return str.toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function panelLoginEmail(v: { ownerEmail?: string | null; email?: string | null }) {
  const o = String(v.ownerEmail ?? "").trim();
  const e = String(v.email ?? "").trim();
  return o || e || "";
}

const EMPTY: any = {
  name: "", slug: "", description: "", vendorType: "delivery",
  phone: "", email: "", address: "", city: "", district: "", mahalle: "", lat: null as number | null, lng: null as number | null,
  imageUrl: "", coverUrl: "", workingHours: "", deliveryFee: "0",
  deliveryTime: 30, minOrderAmount: "0", whatsapp: "",
  ownerName: "", ownerEmail: "", active: true, featured: false, isOpen: true,
  catalogContactGap: false, catalogMenuGap: false,
  branchType: "tek_subeli", parentVendorId: null,
  membershipTier: "gold",
};

type VendorAdminFilter =
  | "all"
  | "active"
  | "opening"
  | "no_menu"
  | "no_contact"
  | "google_scrape"
  | "google_api";

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Bekliyor",     color: "bg-yellow-100 text-yellow-800" },
  confirmed:  { label: "Onaylandı",   color: "bg-blue-100 text-blue-800" },
  preparing:  { label: "Hazırlanıyor",color: "bg-indigo-100 text-indigo-800" },
  ready:      { label: "Hazır",       color: "bg-teal-100 text-teal-800" },
  picked_up:  { label: "Kuryede",    color: "bg-orange-100 text-orange-800" },
  on_the_way: { label: "Yolda",       color: "bg-purple-100 text-purple-800" },
  delivered:  { label: "Teslim",      color: "bg-green-100 text-green-800" },
  cancelled:  { label: "İptal",       color: "bg-red-100 text-red-800" },
};

function normalizeCoord(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function SiparisIsletmeleri() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: siteSettings } = useGetSiteSettings();
  const [geoBusy, setGeoBusy] = useState(false);
  const [tab, setTab] = useState<"vendors" | "orders">("vendors");
  const [deliveryModuleFilter, setDeliveryModuleFilter] = useState<DeliveryBusinessModule | "all">("all");
  const [vendorListFilter, setVendorListFilter] = useState<VendorAdminFilter>("all");
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const formRef = useRef(form);
  formRef.current = form;
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>("");
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [pendingCancel, setPendingCancel] = useState<{ id: number } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{ id: number } | null>(null);
  const [confirmEtInput, setConfirmEtInput] = useState("30");
  const [viewOrderEt, setViewOrderEt] = useState("");
  const [magnificVendorFilter, setMagnificVendorFilter] = useState("");
  const [wipeConfirmPhrase, setWipeConfirmPhrase] = useState("");
  const [vendorsJsonText, setVendorsJsonText] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorPageLimit, setVendorPageLimit] = useState<number>(200);
  const [vendorPageLimitCustom, setVendorPageLimitCustom] = useState("");
  const [seedDemoBusy, setSeedDemoBusy] = useState(false);
  const [aiBusyVendorId, setAiBusyVendorId] = useState<number | null>(null);
  const [newApiBusyVendorId, setNewApiBusyVendorId] = useState<number | null>(null);
  const [menuImportVendor, setMenuImportVendor] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (!viewOrder) { setViewOrderEt(""); return; }
    const v = viewOrder.estimatedTime ?? viewOrder.estimated_time;
    setViewOrderEt(v != null && v !== "" ? String(v) : "");
  }, [viewOrder]);

  /** Adres + şehir yazılınca (enlem/boylam boşken) Google/OSM ile otomatik koordinat */
  useEffect(() => {
    if (!showForm) return;
    const t = window.setTimeout(async () => {
      const f = formRef.current;
      if (normalizeCoord(f.lat) != null && normalizeCoord(f.lng) != null) return;
      const addr = String(f.address || "").trim();
      const cit = String(f.city || "").trim();
      if (!addr || addr.length < 8 || !cit) return;
      setGeoBusy(true);
      try {
        const q = [f.mahalle, addr, f.district, cit, "Türkiye"].filter((x: string) => String(x || "").trim()).join(", ");
        const hit = await forwardGeocodeAddressHybrid(siteSettings ?? null, q);
        if (hit) {
          setForm((prev: any) => {
            if (normalizeCoord(prev.lat) != null && normalizeCoord(prev.lng) != null) return prev;
            return { ...prev, lat: hit.lat, lng: hit.lng };
          });
        }
      } catch {
        /* sessiz */
      } finally {
        setGeoBusy(false);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [showForm, form.address, form.city, form.district, siteSettings]);

  const { data: vendorsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/vendors-admin", "delivery"],
    queryFn: () => apiRequest("/api/delivery/vendors-admin?type=delivery").then(asArray),
  });
  const vendors = asArray(vendorsData);
  const { data: vendorCategoriesData } = useQuery<any[]>({
    queryKey: ["/api/admin/vendor-categories"],
    queryFn: () => apiRequest("/api/admin/vendor-categories").then(asArray),
    staleTime: 30_000,
  });
  const vendorCategories = asArray(vendorCategoriesData);

  const { data: ordersData, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery/orders", selectedVendorId, selectedOrderStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (selectedVendorId) params.set("vendorId", selectedVendorId);
      if (selectedOrderStatus) params.set("status", selectedOrderStatus);
      const r = await apiRequest(`/api/delivery/orders?${params}`);
      return asArray(Array.isArray(r) ? r : (r?.data ?? r?.orders));
    },
    enabled: tab === "orders",
    refetchInterval: 30000,
  });
  const orders = asArray(ordersData);

  const updateOrderMut = useMutation({
    mutationFn: async ({ id, status, cancelReason, estimatedTime }: { id: number; status: string; cancelReason?: string; estimatedTime?: number }) => {
      const r = await apiFetch(apiUrl(`/api/delivery/orders/${id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(cancelReason !== undefined ? { cancelReason } : {}),
          ...(estimatedTime !== undefined ? { estimatedTime } : {}),
        }),
      });
      const text = await r.text();
      let body: { error?: string } = {};
      try { body = text ? JSON.parse(text) : {}; } catch { /* noop */ }
      if (!r.ok) throw new Error(body.error || text || `HTTP ${r.status}`);
      return text ? JSON.parse(text) : null;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/orders"] }); toast({ title: "Durum güncellendi" }); },
    onError: (e: Error) => toast({ title: "Durum güncellenemedi", description: e.message, variant: "destructive" }),
  });

  function onOrderStatusSelect(orderId: number, newStatus: string, currentStatus: string) {
    if (newStatus === "cancelled") {
      setPendingCancel({ id: orderId });
      setCancelReasonInput("");
      return;
    }
    if (newStatus === "confirmed" && currentStatus === "pending") {
      setPendingConfirm({ id: orderId });
      setConfirmEtInput("30");
      return;
    }
    updateOrderMut.mutate({ id: orderId, status: newStatus });
  }

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("/api/delivery/vendors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] }); closeForm(); toast({ title: "İşletme oluşturuldu" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/delivery/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] }); closeForm(); toast({ title: "İşletme güncellendi" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/delivery/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] }); toast({ title: "Silindi" }); },
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: any) => apiRequest(`/api/delivery/vendors/${id}`, { method: "PUT", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] }),
  });

  const bulkDeactivateVendorsMut = useMutation({
    mutationFn: async (ids: number[]) => {
      const clean = Array.from(new Set(ids.filter((n) => Number.isFinite(n))));
      if (clean.length === 0) return { changed: 0, total: 0 };
      const settled = await Promise.allSettled(
        clean.map((id) => apiRequest(`/api/delivery/vendors/${id}`, { method: "PUT", body: JSON.stringify({ active: false }) })),
      );
      const ok = settled.filter((x) => x.status === "fulfilled").length;
      if (ok === 0) throw new Error("Seçilen işletmeler pasife alınamadı.");
      return { changed: ok, total: clean.length };
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      setSelectedVendorIds([]);
      toast({ title: "Pasife alındı", description: `${d?.changed ?? 0}/${d?.total ?? 0} işletme pasife alındı.` });
    },
    onError: (e: any) => toast({ title: "Pasife alma başarısız", description: e.message, variant: "destructive" }),
  });

  const bulkHardDeleteVendorsMut = useMutation({
    mutationFn: async (ids: number[]) => {
      const clean = Array.from(new Set(ids.filter((n) => Number.isFinite(n))));
      if (clean.length === 0) return { deleted: 0, total: 0 };
      const settled = await Promise.allSettled(clean.map((id) => apiRequest(`/api/delivery/vendors/${id}`, { method: "DELETE" })));
      const ok = settled.filter((x) => x.status === "fulfilled").length;
      if (ok === 0) throw new Error("Pasif seçili işletmeler kalıcı silinemedi.");
      return { deleted: ok, total: clean.length };
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      setSelectedVendorIds([]);
      toast({ title: "Kalıcı silindi", description: `${d?.deleted ?? 0}/${d?.total ?? 0} pasif işletme kalıcı silindi.` });
    },
    onError: (e: any) => toast({ title: "Toplu silinemedi", description: e.message, variant: "destructive" }),
  });

  const WIPE_MAGIC = "SIL-TUM-ISLETMELER";
  const wipeAllBusinessesMut = useMutation({
    mutationFn: async () => {
      const r = await postAdminJson("/api/map/admin/wipe-all-business-data", { confirm: WIPE_MAGIC });
      const d = (await r.json().catch(() => ({}))) as { success?: boolean; error?: string; message?: string };
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      return d;
    },
    onSuccess: (d) => {
      setWipeConfirmPhrase("");
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      toast({
        title: "Veritabanı temizlendi",
        description: d.message || "Harita + tüm vendor kayıtları silindi.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Silme başarısız", description: e.message, variant: "destructive" }),
  });

  const vendorsJsonImportMut = useMutation({
    mutationFn: async () => {
      let items: unknown;
      try {
        items = JSON.parse(vendorsJsonText.trim() || "[]");
      } catch {
        throw new Error("Geçersiz JSON");
      }
      if (!Array.isArray(items)) throw new Error('Kök bir dizi olmalıdır, örn. [{"name":"Örnek Restoran","city":"Ankara"}]');
      const r = await postAdminJson("/api/delivery/admin/vendors-import-json", { items, syncMap: true });
      const d = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        inserted?: number;
        skipped?: number;
        errors?: string[];
      };
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      return d;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      toast({
        title: "JSON içe aktarma",
        description: `Eklenen: ${d.inserted ?? 0} · Atlandı/boş: ${d.skipped ?? 0}${d.errors?.length ? ` · Hata satırı: ${d.errors.length}` : ""}`,
      });
      if (d.errors?.length) {
        toast({ title: "Satır hataları", description: d.errors.slice(0, 5).join(" | "), variant: "destructive" });
      }
    },
    onError: (e: Error) =>
      toast({ title: "JSON içe aktarma başarısız", description: e.message, variant: "destructive" }),
  });

  const fillMagnificMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { maxItems: 60, delayMs: 700 };
      const vid = magnificVendorFilter.trim();
      if (vid) body.vendorId = parseInt(vid, 10);
      const r = await postAdminJson("/api/delivery/admin/fill-menu-images-magnific", body);
      const data = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!r.ok) {
        let msg = data.error || `HTTP ${r.status}`;
        if (r.status === 401 || data.code === "ADMIN_REQUIRED") {
          msg += " Panel oturumu gerekir; çıkış yapıp yeniden giriş yapın.";
        }
        throw new Error(msg);
      }
      return data as { processed: number; filled: number; failed: number };
    },
    onSuccess: (d) => {
      const samples = Array.isArray((d as any).errorSamples) ? ((d as any).errorSamples as string[]).slice(0, 4) : [];
      toast({
        title: "Magnific görseller",
        description:
          `İşlenen: ${d.processed} · Doldurulan: ${d.filled} · Atlanan/hata: ${d.failed}` +
          (samples.length ? ` · Örnek: ${samples.join(" | ")}` : ""),
      });
    },
    onError: (e: Error) =>
      toast({ title: "Magnific ataması başarısız", description: e.message, variant: "destructive" }),
  });

  const [pwModal, setPwModal] = useState<{ id: number; name: string } | null>(null);
  const [pwInput, setPwInput] = useState("Yekpare");
  const [pwSaving, setPwSaving] = useState(false);

  async function savePassword() {
    if (!pwModal || !pwInput.trim() || pwInput.length < 4) return;
    setPwSaving(true);
    try {
      await apiRequest(`/api/admin/providers/${pwModal.id}/set-password`, { method: "POST", body: JSON.stringify({ password: pwInput }) });
      toast({ title: "Şifre güncellendi", description: `${pwModal.name} için yeni şifre: ${pwInput}` });
      setPwModal(null); setPwInput("Yekpare");
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally { setPwSaving(false); }
  }

  function openCreate() { setForm({ ...EMPTY, vendorType: "delivery" }); setEditId(null); setShowForm(true); }
  function openEdit(v: any) { setForm({ ...v }); setEditId(v.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); }
  function setF(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function handleNameBlur() { if (!editId && !form.slug) setF("slug", slugify(form.name)); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mah = String(form.mahalle ?? "").trim();
    const addr = String(form.address ?? "").trim();
    const mergedAddr = mah ? (addr ? `${mah}, ${addr}` : mah) : addr;
    const { mahalle: _m, ...rest } = form;
    const payload = {
      ...rest,
      address: mergedAddr,
      lat: normalizeCoord(form.lat),
      lng: normalizeCoord(form.lng),
    };
    if (editId) updateMut.mutate({ id: editId, data: payload });
    else createMut.mutate(payload);
  }

  async function geocodeFromAddressFields() {
    const parts = [form.mahalle, form.address, form.district, form.city, "Türkiye"].filter((x: string) => String(x || "").trim());
    const q = parts.join(", ").trim();
    if (!q || q.length < 8) {
      toast({ title: "Adres gerekli", description: "En az adres + şehir yazın.", variant: "destructive" });
      return;
    }
    setGeoBusy(true);
    try {
      const hit = await forwardGeocodeAddressHybrid(siteSettings ?? null, q);
      if (!hit) {
        toast({ title: "Bulunamadı", description: "Adresi düzeltip tekrar deneyin veya GPS kullanın.", variant: "destructive" });
        return;
      }
      setF("lat", hit.lat);
      setF("lng", hit.lng);
      try {
        const rev = await reverseGeocodeHybrid(siteSettings ?? null, hit.lat, hit.lng);
        if (rev.city && !form.city?.trim()) setF("city", rev.city);
        if (rev.district && !form.district?.trim()) setF("district", rev.district);
      } catch { /* ignore */ }
      toast({ title: "Koordinat bulundu", description: `${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)}` });
    } finally {
      setGeoBusy(false);
    }
  }

  function toggleSelectAllActive() {
    const ids = activeFiltered.map((v) => Number(v.id)).filter((x) => Number.isFinite(x));
    const allSelected = ids.length > 0 && ids.every((id) => selectedVendorIds.includes(id));
    setSelectedVendorIds((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  }

  function toggleSelectAllPassive() {
    const ids = passiveFiltered.map((v) => Number(v.id)).filter((x) => Number.isFinite(x));
    const allSelected = ids.length > 0 && ids.every((id) => selectedVendorIds.includes(id));
    setSelectedVendorIds((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  }

  const searchFiltered = vendors.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    const hay = [v.name, v.city, v.district, v.address].map((x) => String(x || "").toLowerCase()).join(" ");
    return hay.includes(q);
  });

  const moduleFiltered = searchFiltered.filter((v) => {
    if (deliveryModuleFilter === "all") return true;
    return deliveryVendorModule(v, vendorCategories) === deliveryModuleFilter;
  });

  const filtered = moduleFiltered.filter((v) => {
    if (vendorListFilter === "all") return true;
    if (vendorListFilter === "active") return v.active === true;
    if (vendorListFilter === "opening") return v.isOpen === false;
    if (vendorListFilter === "no_menu") return v.catalogMenuGap === true;
    if (vendorListFilter === "no_contact") return v.catalogContactGap === true;
    if (vendorListFilter === "google_scrape") return vendorGoogleImportColumns(v).scrape;
    if (vendorListFilter === "google_api") return vendorGoogleImportColumns(v).api;
    return true;
  });
  const activeFiltered = filtered.filter((v) => v.active === true);
  const passiveFiltered = filtered.filter((v) => v.active !== true);
  const vendorTotalPages = Math.max(1, Math.ceil(filtered.length / vendorPageLimit));
  const filteredPage = filtered.slice((vendorPage - 1) * vendorPageLimit, vendorPage * vendorPageLimit);

  useEffect(() => {
    setVendorPage(1);
  }, [search, deliveryModuleFilter, vendorListFilter, vendorPageLimit]);

  const vendorCounts = {
    all: moduleFiltered.length,
    active: moduleFiltered.filter((v) => v.active === true).length,
    opening: moduleFiltered.filter((v) => v.isOpen === false).length,
    no_menu: moduleFiltered.filter((v) => v.catalogMenuGap === true).length,
    no_contact: moduleFiltered.filter((v) => v.catalogContactGap === true).length,
    google_scrape: moduleFiltered.filter((v) => vendorGoogleImportColumns(v).scrape).length,
    google_api: moduleFiltered.filter((v) => vendorGoogleImportColumns(v).api).length,
  };

  const filteredOrders = orders.filter(o =>
    !orderSearch || (o.customerName || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.orderNumber || "").toLowerCase().includes(orderSearch.toLowerCase())
  );

  const pendingCount = orders.filter((o: any) => o.status === "pending").length;

  async function runGenerateAbout(vendorId: number) {
    setAiBusyVendorId(vendorId);
    try {
      await apiRequest(`/api/delivery/admin/vendors/${vendorId}/generate-about`, { method: "POST", body: JSON.stringify({}) });
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      toast({ title: "AI Hakkımızda güncellendi" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "AI içerik üretilemedi",
        description: msg + adminFetchErrorHint(msg),
        variant: "destructive",
      });
    } finally {
      setAiBusyVendorId(null);
    }
  }

  async function runGoogleNewApi(vendorId: number) {
    setNewApiBusyVendorId(vendorId);
    try {
      await apiRequest(`/api/delivery/admin/vendors/${vendorId}/enrich-google-new`, { method: "POST", body: JSON.stringify({}) });
      qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
      toast({ title: "New API zenginleştirme tamamlandı" });
    } catch (e: unknown) {
      toast({ title: "New API çalıştırılamadı", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setNewApiBusyVendorId(null);
    }
  }

  function openMenuImport(v: { id: number | string; name: string }) {
    setMenuImportVendor({ id: Number(v.id), name: String(v.name) });
  }

  return (
    <AdminLayout title="Sipariş İşletmeleri">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-orange-500" /> Sipariş / Teslimat Yönetimi
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Teslimat işletmeleri ve siparişler. Haritadan taşıma için &quot;Haritayı panele taşı&quot;; ileri düzey toplu işletme JSON&apos;u aşağıda gizli bölümde.
            </p>
          </div>
          {tab === "vendors" && (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <AdminMapPanelSyncToolbar
                vendorModule="delivery"
                invalidateQueryKeys={[["/api/delivery/vendors-admin", "delivery"]]}
              >
                <Button onClick={openCreate} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4" /> Yeni İşletme
                </Button>
              </AdminMapPanelSyncToolbar>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {[
            { key: "vendors", label: `İşletmeler (${vendors.length})`, icon: Store },
            { key: "orders", label: `Alınan Siparişler${pendingCount > 0 ? ` — ${pendingCount} bekliyor` : ""}`, icon: ShoppingBag },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${tab === key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "vendors" ? (
          <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-teal-50/80">
            <span className="text-xs font-bold text-teal-950 shrink-0">Hızlı:</span>
            <AdminMapPanelSyncToolbar
              vendorModule="delivery"
              invalidateQueryKeys={[["/api/delivery/vendors-admin", "delivery"]]}
              className="flex-wrap"
            >
              <Button type="button" size="sm" onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4" /> Yeni İşletme
              </Button>
            </AdminMapPanelSyncToolbar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-violet-300 text-violet-900 bg-white hover:bg-violet-50"
              disabled={seedDemoBusy}
              title="Demo teslimat işletmesi + kurye (ulaşım sayfası ve paneller için)"
              onClick={async () => {
                setSeedDemoBusy(true);
                try {
                  await ensureAdminPanelBootstrap();
                  const r = await postAdminJson("/api/delivery/admin/seed-demo-transport", {});
                  const j = (await r.json().catch(() => ({}))) as {
                    error?: string;
                    providerPanel?: { email?: string; password?: string };
                    courierPanel?: { phone?: string; password?: string };
                  };
                  if (!r.ok) {
                    toast({ title: "Demo eklenemedi", description: j.error || `HTTP ${r.status}`, variant: "destructive" });
                    return;
                  }
                  qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
                  toast({
                    title: "Demo ulaşım hazır",
                    description: `İşletme: ${j.providerPanel?.email ?? ""} / Kurye: ${j.courierPanel?.phone ?? ""}`,
                  });
                } catch (e: unknown) {
                  toast({
                    title: "Hata",
                    description: e instanceof Error ? e.message : String(e),
                    variant: "destructive",
                  });
                } finally {
                  setSeedDemoBusy(false);
                }
              }}
            >
              {seedDemoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Demo işletme + kurye
            </Button>
          </div>
        ) : null}

        {/* ─── Tab: İşletmeler ─── */}
        {tab === "vendors" && (
          <>
            <details className="bg-white rounded-xl border border-indigo-100 group">
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-sm font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span>İleri düzey: JSON ile teslimat işletmesi toplu kayıt (yönetici)</span>
                <span className="text-xs font-normal text-indigo-600 group-open:hidden">Göster</span>
                <span className="text-xs font-normal text-indigo-600 hidden group-open:inline">Gizle</span>
              </summary>
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-indigo-50">
                <p className="text-xs text-gray-600 pt-3">
                  Bu kutu <strong>teslimat işletmesi (vendor)</strong> kaydı içindir; ürün/menü CSV içe aktarma işletme panelinde{" "}
                  <strong>Aktarım</strong> sekmesindedir. Excel&apos;inizi API sunucusunda{" "}
                  <code className="text-[11px] bg-gray-100 px-1 rounded">node scripts/excel-to-vendors-json.mjs yol.xlsx</code>{" "}
                  ile diziye çevirin; çıktıyı buraya yapıştırın veya .json dosyası seçin.{" "}
                  <code className="text-[11px] bg-gray-100 px-1 rounded">googleImportKind</code>:{" "}
                  <code className="text-[11px]">gmaps_scrape</code> | <code className="text-[11px]">places_api</code> |{" "}
                  <code className="text-[11px]">manual</code>.
                </p>
                <Textarea
                  value={vendorsJsonText}
                  onChange={(e) => setVendorsJsonText(e.target.value)}
                  placeholder={`[\n  { "name": "Örnek Döner", "city": "Ankara", "district": "Çankaya", "address": "...", "phone": "+90...", "googleImportKind": "manual" }\n]`}
                  rows={10}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="text-xs max-w-[260px]"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      void f.text().then((t) => {
                        setVendorsJsonText(t);
                        toast({ title: "Dosya okundu", description: f.name });
                      });
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={vendorsJsonImportMut.isPending || !vendorsJsonText.trim()}
                    onClick={() => vendorsJsonImportMut.mutate()}
                  >
                    {vendorsJsonImportMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    JSON&apos;dan içe aktar
                  </Button>
                </div>
              </div>
            </details>

            <div className="bg-white rounded-xl border border-sky-100 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Magnific — ücretsiz stok foto (freemium)</h3>
              <p className="text-xs text-gray-600">
                Görseli boş olan teslimat menü kalemleri için{" "}
                <a href="https://docs.magnific.com/introduction" className="text-sky-700 underline" target="_blank" rel="noopener noreferrer">
                  Magnific Stock API
                </a>{" "}
                ile önizleme URL'si atanır. API anahtarı: Admin → Genel Ayarlar → Harita → Magnific (veya{" "}
                <code className="text-[11px] bg-gray-100 px-1 rounded">MAGNIFIC_API_KEY</code>).
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="min-w-[200px] flex-1">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">İşletme (boş = tümü)</label>
                  <select
                    value={magnificVendorFilter}
                    onChange={(e) => setMagnificVendorFilter(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Tüm teslimat işletmeleri</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  className="bg-sky-600 hover:bg-sky-700"
                  disabled={fillMagnificMut.isPending}
                  onClick={() => fillMagnificMut.mutate()}
                >
                  {fillMagnificMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Görselleri doldur (max 60 kalem)
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="İşletme adı, şehir..." className="pl-9" />
            </div>

            <div className="rounded-xl border border-orange-100 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">Sipariş grubu</p>
                  <p className="text-xs text-gray-500">İşletmeleri Yemek, Market ve Yakındaki İşletmeler olarak ayırır.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all" as const, label: "Tümü", emoji: "🧭", count: searchFiltered.length },
                  ...DELIVERY_MODULES.map((mod) => ({
                    key: mod.key,
                    label: mod.label,
                    emoji: mod.emoji,
                    count: searchFiltered.filter((v) => deliveryVendorModule(v, vendorCategories) === mod.key).length,
                  })),
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDeliveryModuleFilter(item.key as DeliveryBusinessModule | "all")}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      deliveryModuleFilter === item.key
                        ? "border-orange-500 bg-orange-50 text-orange-800"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span>{item.emoji}</span>
                    {item.label}
                    <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-gray-500 tabular-nums">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { key: "all" as const, label: "Tümü", count: vendorCounts.all, hint: "Durum rozetleri satırda" },
                { key: "active" as const, label: "Aktif işletmeler", count: vendorCounts.active },
                { key: "opening" as const, label: "Açılış aşamasında", count: vendorCounts.opening },
                { key: "no_menu" as const, label: "Menü/ürünü olmayanlar", count: vendorCounts.no_menu },
                { key: "no_contact" as const, label: "İletişim bilgisi olmayanlar", count: vendorCounts.no_contact },
                { key: "google_scrape" as const, label: "Google kazıma", count: vendorCounts.google_scrape },
                { key: "google_api" as const, label: "Google API", count: vendorCounts.google_api },
              ]).map(({ key, label, count, hint }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVendorListFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    vendorListFilter === key
                      ? "border-orange-500 bg-orange-50 text-orange-800"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                  <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-gray-500 tabular-nums">{count}</span>
                  {hint ? <span className="sr-only">{hint}</span> : null}
                </button>
              ))}
            </div>
            {vendorListFilter === "all" ? (
              <p className="text-xs text-gray-500 -mt-1">Tümü: her satırda açık / açılış aşaması, aktif/pasif ve veri eksikliği rozetleri görünür.</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-600">
                Seçili: <strong>{selectedVendorIds.length}</strong> · Aktif <strong>{activeFiltered.length}</strong> · Pasif <strong>{passiveFiltered.length}</strong> · Sayfa <strong>{vendorPage}</strong>/<strong>{vendorTotalPages}</strong>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllActive}>
                Aktifleri {activeFiltered.length > 0 && activeFiltered.every((v) => selectedVendorIds.includes(Number(v.id))) ? "bırak" : "seç"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedVendorIds.filter((id) => activeFiltered.some((v) => Number(v.id) === id)).length === 0 || bulkDeactivateVendorsMut.isPending}
                onClick={() => {
                  const ids = selectedVendorIds.filter((id) => activeFiltered.some((v) => Number(v.id) === id));
                  if (!ids.length) return;
                  if (!confirm(`${ids.length} aktif işletme pasife alınsın mı?`)) return;
                  bulkDeactivateVendorsMut.mutate(ids);
                }}
              >
                Seçili aktifleri pasife al
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllPassive}>
                Pasifleri {passiveFiltered.length > 0 && passiveFiltered.every((v) => selectedVendorIds.includes(Number(v.id))) ? "bırak" : "seç"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedVendorIds.filter((id) => passiveFiltered.some((v) => Number(v.id) === id)).length === 0 || bulkHardDeleteVendorsMut.isPending}
                onClick={() => {
                  const ids = selectedVendorIds.filter((id) => passiveFiltered.some((v) => Number(v.id) === id));
                  if (!ids.length) return;
                  if (!confirm(`${ids.length} pasif işletme kalıcı silinsin mi?`)) return;
                  bulkHardDeleteVendorsMut.mutate(ids);
                }}
              >
                Seçili pasifleri kalıcı sil
              </Button>
              <select
                value={String(vendorPageLimit)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 50) setVendorPageLimit(n);
                }}
                className="border rounded-md px-2 py-1 text-xs bg-white"
              >
                <option value="200">200 / sayfa</option>
                <option value="300">300 / sayfa</option>
                <option value="500">500 / sayfa</option>
              </select>
              <Input
                value={vendorPageLimitCustom}
                onChange={(e) => setVendorPageLimitCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const n = Number(vendorPageLimitCustom);
                  if (!Number.isFinite(n)) return;
                  setVendorPageLimit(Math.max(50, Math.min(2000, Math.floor(n))));
                }}
                placeholder="Özel sayfa boyutu"
                className="w-[170px] h-8 text-xs"
              />
              <Button type="button" variant="outline" size="sm" disabled={vendorPage <= 1} onClick={() => setVendorPage((p) => Math.max(1, p - 1))}>
                Önceki
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={vendorPage >= vendorTotalPages} onClick={() => setVendorPage((p) => Math.min(vendorTotalPages, p + 1))}>
                Sonraki
              </Button>
            </div>

            <details className="rounded-xl border border-red-200 bg-red-50/40 px-3 py-2">
              <summary className="cursor-pointer text-sm font-bold text-red-900 list-none flex items-center justify-between gap-2">
                <span>Tehlikeli: tüm işletmeleri sil (harita + vendor + sipariş)</span>
                <span className="text-xs font-normal text-red-700">Geri alınamaz</span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-red-100 pt-3">
                <p className="text-xs text-red-900/90">
                  Aşağıya tam olarak <code className="bg-white px-1 rounded font-mono">{WIPE_MAGIC}</code> yazın ve onaylayın.{" "}
                  <strong>Harita işletmeleri</strong> (binlerce kayıt dahil) ve <strong>tüm vendor türleri</strong> ile bağlı{" "}
                  <strong>teslimat siparişleri / menü / kupon</strong> silinir. Site üyeleri ve harita şehir/kategori tabloları kalır.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <Input
                    value={wipeConfirmPhrase}
                    onChange={(e) => setWipeConfirmPhrase(e.target.value)}
                    placeholder={WIPE_MAGIC}
                    className="font-mono text-sm bg-white"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={wipeConfirmPhrase !== WIPE_MAGIC || wipeAllBusinessesMut.isPending}
                    onClick={() => {
                      if (!window.confirm("Son uyarı: veritabanındaki TÜM işletme ve sipariş verisi silinecek. Devam?")) return;
                      wipeAllBusinessesMut.mutate();
                    }}
                  >
                    {wipeAllBusinessesMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Hepsini sil
                  </Button>
                </div>
              </div>
            </details>

            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Henüz sipariş işletmesi yok</p></div>
            ) : (
              <div className="grid gap-3">
                {filteredPage.map(v => {
                  const serviceModule = DELIVERY_MODULES.find((mod) => mod.key === deliveryVendorModule(v, vendorCategories));
                  return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-xl border p-4 shadow-sm ${!v.active ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 mt-1"
                        checked={selectedVendorIds.includes(Number(v.id))}
                        onChange={(e) => {
                          const id = Number(v.id);
                          if (!Number.isFinite(id)) return;
                          setSelectedVendorIds((prev) =>
                            e.target.checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
                          );
                        }}
                      />
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-orange-50">
                        {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                      </div>

                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{v.name}</span>
                        {serviceModule ? (
                          <Badge className="bg-slate-100 text-slate-700 border-0">
                            {serviceModule.emoji} {serviceModule.label}
                          </Badge>
                        ) : null}
                        {v.featured && <Badge className="bg-amber-100 text-amber-700 border-0"><Star className="w-3 h-3 mr-1" />Öne Çıkan</Badge>}
                        <Badge className={v.isOpen ? "bg-green-100 text-green-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                          {v.isOpen ? "Açık" : "Açılış Aşamasında"}
                        </Badge>
                        <Badge className={v.active ? "bg-blue-50 text-blue-600 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                          {v.active ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {v.active ? "Aktif" : "Pasif"}
                        </Badge>
                        <Badge className="bg-yellow-50 text-yellow-700 border-0">⭐ {v.rating?.toFixed(1) || "0.0"}</Badge>
                        {v.catalogContactGap === true && (
                          <Badge className="bg-rose-50 text-rose-800 border border-rose-100" title="Yemeksepeti kaynağında olup çapraz dosyalarda iletişim eşleşmedi">
                            İletişim eksik
                          </Badge>
                        )}
                        {v.catalogMenuGap === true && (
                          <Badge className="bg-violet-50 text-violet-800 border border-violet-100" title="Menü/ürün bilgisi yok (ör. YS dışı kaynak)">
                            Menü eksik
                          </Badge>
                        )}
                      </div>
                      {v.catalogMenuGap === true && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-violet-200 text-violet-800"
                            disabled={false}
                            onClick={() => openMenuImport(v)}
                          >
                            Harici URL'den menü
                          </Button>
                          <a
                            href={`/admin/siparis-menu-items?vendorId=${encodeURIComponent(String(v.id))}`}
                            className="inline-flex h-7 items-center rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Manuel ürün ekle
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                        {v.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</span>}
                        {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>}
                        {v.ownerName && <span className="flex items-center gap-1"><Store className="w-3 h-3" />{v.ownerName}</span>}
                        {panelLoginEmail(v) && (
                          <span className="flex items-center gap-1" title="servis-saglayici-giris">
                            <Mail className="w-3 h-3" />{panelLoginEmail(v)}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            v.panelPasswordSet
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]"
                              : "border-amber-200 bg-amber-50 text-amber-900 text-[10px]"
                          }
                        >
                          {v.panelPasswordSet ? "Panel şifresi var" : "Şifre atanmadı"}
                        </Badge>
                        <span className="text-gray-400">/{v.slug}</span>
                      </div>
                    </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-violet-200 text-violet-700"
                        title="AI içerik üret (Hakkımızda)"
                        disabled={aiBusyVendorId === Number(v.id)}
                        onClick={() => void runGenerateAbout(Number(v.id))}
                      >
                        {aiBusyVendorId === Number(v.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span className="hidden sm:inline ml-2">AI</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-sky-200 text-sky-700"
                        title="Google Places New API ile zenginleştir"
                        disabled={newApiBusyVendorId === Number(v.id)}
                        onClick={() => void runGoogleNewApi(Number(v.id))}
                      >
                        {newApiBusyVendorId === Number(v.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        <span className="hidden sm:inline ml-2">Google</span>
                      </Button>

                      <span className="hidden sm:inline-flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide mr-1">
                        <span title="Harita botu veya OSM kaynağı" className={vendorGoogleImportColumns(v).scrape ? "text-emerald-700" : "text-gray-300"}>Kazıma</span>
                        <span title="Google Places API" className={vendorGoogleImportColumns(v).api ? "text-sky-700" : "text-gray-300"}>API</span>
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-violet-200 text-violet-800"
                        title="Yemeksepeti / Getir linkinden menü çek"
                        onClick={() => openMenuImport(v)}
                      >
                        <UtensilsCrossed className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Menü çek</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedVendorId(String(v.id)); setTab("orders"); }}
                        title="Bu işletmenin siparişleri"
                      >
                        <ShoppingBag className="w-4 h-4 text-orange-500" />
                        <span className="hidden sm:inline ml-2">Siparişler</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMut.mutate({ id: v.id, active: !v.active })}
                        title={v.active ? "Pasife al" : "Aktife al"}
                      >
                        <Power className={`w-4 h-4 ${v.active ? "text-green-600" : "text-gray-400"}`} />
                        <span className="hidden sm:inline ml-2">{v.active ? "Pasif" : "Aktif"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPwModal({ id: v.id, name: v.name }); setPwInput("Yekpare"); }}
                        title="Şifre ayarla"
                      >
                        <KeyRound className="w-4 h-4 text-indigo-500" />
                        <span className="hidden sm:inline ml-2">Şifre</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)} title="Düzenle">
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Düzenle</span>
                      </Button>
                      {v.active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bulkDeactivateVendorsMut.mutate([Number(v.id)])}
                          title="Pasife al"
                        >
                          <Power className="w-4 h-4 text-amber-600" />
                          <span className="hidden sm:inline ml-2">Pasife al</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { if (confirm(`"${v.name}" kalıcı silinsin mi?`)) deleteMut.mutate(v.id); }}
                          title="Kalıcı sil"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline ml-2">Sil</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Tab: Alınan Siparişler ─── */}
        {tab === "orders" && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Müşteri adı veya sipariş no..." className="pl-9" />
              </div>
              <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white min-w-[180px]">
                <option value="">Tüm işletmeler</option>
                {vendors.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
              </select>
              <select value={selectedOrderStatus} onChange={e => setSelectedOrderStatus(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white">
                <option value="">Tüm durumlar</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {ordersLoading ? (
              <div className="text-center py-12 text-gray-400">Siparişler yükleniyor...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Sipariş bulunamadı</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Sipariş No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Müşteri</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">İşletme</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Toplam</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tahmin (dk)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarih</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((o: any) => {
                      const st = ORDER_STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-600" };
                      const vendorName = vendors.find(v => v.id === o.vendorId)?.name || `#${o.vendorId}`;
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.orderNumber}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{o.customerName}</div>
                            <div className="text-xs text-gray-400">{o.customerPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{vendorName}</td>
                          <td className="px-4 py-3 font-bold">{parseFloat(o.totalPrice || "0").toFixed(2)}₺</td>
                          <td className="px-4 py-3">
                            <select value={o.status}
                              onChange={e => onOrderStatusSelect(o.id, e.target.value, o.status)}
                              className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${st.color}`}>
                              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={deliverySlaBreached(o) ? "text-red-700 font-bold" : "text-gray-600"}>
                              {o.estimatedTime ?? o.estimated_time ?? "—"}
                              {deliverySlaBreached(o) ? " !" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => setViewOrder(o)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-400 border-t">{filteredOrders.length} sipariş</div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!pendingConfirm} onOpenChange={v => !v && setPendingConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Siparişi onayla</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Müşteri takip ekranında SLA bandı için tahmini süre (dakika).</p>
          <div className="mt-2">
            <label className="text-xs font-bold text-gray-600">Tahmini teslim süresi (dk)</label>
            <Input
              type="number"
              min={1}
              max={300}
              value={confirmEtInput}
              onChange={e => setConfirmEtInput(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setPendingConfirm(null)}>Vazgeç</Button>
            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              disabled={updateOrderMut.isPending}
              onClick={() => {
                if (!pendingConfirm) return;
                const n = parseInt(confirmEtInput, 10);
                const et = Number.isFinite(n) && n > 0 && n <= 300 ? n : 30;
                updateOrderMut.mutate(
                  { id: pendingConfirm.id, status: "confirmed", estimatedTime: et },
                  { onSuccess: () => setPendingConfirm(null) },
                );
              }}
            >
              Onayla
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingCancel} onOpenChange={v => !v && setPendingCancel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Siparişi iptal et</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">İptal nedeni kayda geçer (müşteri takip / işletme bildirimi).</p>
          <Textarea
            value={cancelReasonInput}
            onChange={e => setCancelReasonInput(e.target.value)}
            placeholder="Örn: stok yok, müşteri talebi, adres ulaşılamadı…"
            rows={3}
            className="mt-2"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPendingCancel(null)}>Vazgeç</Button>
            <Button
              variant="destructive"
              disabled={updateOrderMut.isPending}
              onClick={() => {
                if (!pendingCancel) return;
                updateOrderMut.mutate(
                  { id: pendingCancel.id, status: "cancelled", cancelReason: cancelReasonInput.trim() || undefined },
                  {
                    onSuccess: () => { setPendingCancel(null); setCancelReasonInput(""); },
                  },
                );
              }}
            >
              İptali kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sipariş Detay Modal */}
      {viewOrder && (
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sipariş #{viewOrder.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-semibold text-gray-500">Müşteri:</span> <span>{viewOrder.customerName}</span></div>
                <div><span className="font-semibold text-gray-500">Telefon:</span> <span>{viewOrder.customerPhone}</span></div>
                <div className="col-span-2"><span className="font-semibold text-gray-500">Adres:</span> <span>{viewOrder.deliveryAddress}</span></div>
                <div><span className="font-semibold text-gray-500">Toplam:</span> <span className="font-bold">{parseFloat(viewOrder.totalPrice || "0").toFixed(2)}₺</span></div>
                <div><span className="font-semibold text-gray-500">Teslimat:</span> <span>{parseFloat(viewOrder.deliveryFee || "0").toFixed(2)}₺</span></div>
                {viewOrder.couponCode && <div><span className="font-semibold text-gray-500">Kupon:</span> <span>{viewOrder.couponCode}</span></div>}
                {viewOrder.notes && <div className="col-span-2"><span className="font-semibold text-gray-500">Not:</span> <span>{viewOrder.notes}</span></div>}
                {viewOrder.status === "cancelled" && (viewOrder.cancelReason || viewOrder.cancel_reason) && (
                  <div className="col-span-2 text-red-700 bg-red-50 rounded p-2 text-xs">
                    <span className="font-semibold">İptal nedeni: </span>
                    {viewOrder.cancelReason ?? viewOrder.cancel_reason}
                  </div>
                )}
                {viewOrder.status === "confirmed" && (
                  <div className="col-span-2 flex flex-wrap gap-2 items-end pt-2 border-t border-gray-100">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tahmini teslim (dk)</label>
                      <Input
                        type="number"
                        min={1}
                        max={300}
                        value={viewOrderEt}
                        onChange={e => setViewOrderEt(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                      disabled={updateOrderMut.isPending}
                      onClick={() => {
                        const n = parseInt(viewOrderEt, 10);
                        const et = Number.isFinite(n) && n > 0 && n <= 300 ? n : 30;
                        updateOrderMut.mutate(
                          { id: viewOrder.id, status: "confirmed", estimatedTime: et },
                          { onSuccess: () => setViewOrder((prev: any) => (prev ? { ...prev, estimatedTime: et } : prev)) },
                        );
                      }}
                    >
                      Süreyi güncelle
                    </Button>
                  </div>
                )}
              </div>
              {viewOrder.items && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Ürünler:</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {(Array.isArray(viewOrder.items) ? viewOrder.items : JSON.parse(viewOrder.items || "[]")).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-medium">{(parseFloat(item.price || "0") * (item.qty || 1)).toFixed(2)}₺</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Şifre Sıfırlama Modal */}
      <Dialog open={!!pwModal} onOpenChange={v => !v && setPwModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" /> Şifre Ayarla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{pwModal?.name}</span> işletmesinin panel giriş şifresi
            </p>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Yeni Şifre</label>
              <Input
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                placeholder="En az 4 karakter"
                onKeyDown={e => e.key === "Enter" && void savePassword()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Varsayılan şifre: <code className="bg-gray-100 px-1 rounded">Yekpare</code></p>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button variant="outline" onClick={() => setPwModal(null)}>Vazgeç</Button>
              <Button
                onClick={() => void savePassword()}
                disabled={pwSaving || !pwInput || pwInput.length < 4}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {pwSaving ? "Kaydediliyor..." : "Şifreyi Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* İşletme Düzenle/Ekle Modal */}
      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "İşletmeyi Düzenle" : "Yeni Sipariş İşletmesi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-gray-600">İşletme Adı *</label>
                <Input value={form.name} onChange={e => setF("name", e.target.value)} onBlur={handleNameBlur} required /></div>
              <div><label className="text-xs font-bold text-gray-600">Slug (URL) *</label>
                <Input value={form.slug} onChange={e => setF("slug", e.target.value)} required /></div>
              <div className="sm:col-span-2"><label className="text-xs font-bold text-gray-600">Açıklama</label>
                <textarea value={form.description || ""} onChange={e => setF("description", e.target.value)} rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1 resize-none" /></div>
              <div><label className="text-xs font-bold text-gray-600">Telefon</label>
                <Input value={form.phone || ""} onChange={e => setF("phone", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">WhatsApp</label>
                <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", e.target.value)} placeholder="905xxxxxxxxx" /></div>
              <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <LocationPickerGooglePrimary
                  mapsSettings={siteSettings ?? null}
                  value={{ city: form.city || "", district: form.district || "", mahalle: form.mahalle || "", sokak: "" }}
                  onChange={(v) => {
                    setForm((f: any) => ({ ...f, city: v.city, district: v.district, mahalle: v.mahalle }));
                  }}
                  showSokak={false}
                  onGooglePick={(r) => {
                    setForm((f: any) => ({
                      ...f,
                      lat: r.lat,
                      lng: r.lng,
                      address: String(f.address || "").trim() ? f.address : r.addressLine,
                    }));
                    toast({ title: "Adres ve koordinat", description: "Google seçimi forma işlendi." });
                  }}
                />
                <GoogleMapMiniPicker
                  mapsSettings={siteSettings ?? null}
                  heightClass="h-[220px]"
                  className="mt-3"
                  onPick={(r) => {
                    setForm((f: any) => ({
                      ...f,
                      lat: r.lat,
                      lng: r.lng,
                      city: r.city || f.city,
                      district: r.district || f.district,
                      mahalle: f.mahalle,
                      address: String(f.address || "").trim() ? f.address : r.label,
                    }));
                    toast({ title: "Haritadan seçildi", description: r.label });
                  }}
                />
              </div>
              <div className="sm:col-span-2"><label className="text-xs font-bold text-gray-600">Adres (harita / teslimat)</label>
                <Input value={form.address || ""} onChange={e => setF("address", e.target.value)} placeholder="Mahalle, cadde, no…" /></div>
              <div><label className="text-xs font-bold text-gray-600">Enlem (lat)</label>
                <Input
                  inputMode="decimal"
                  value={form.lat === null || form.lat === undefined ? "" : String(form.lat)}
                  onChange={e => setF("lat", e.target.value.trim() === "" ? null : e.target.value.replace(",", "."))}
                  placeholder="39,92 veya 39.92"
                /></div>
              <div><label className="text-xs font-bold text-gray-600">Boylam (lng)</label>
                <Input
                  inputMode="decimal"
                  value={form.lng === null || form.lng === undefined ? "" : String(form.lng)}
                  onChange={e => setF("lng", e.target.value.trim() === "" ? null : e.target.value.replace(",", "."))}
                  placeholder="32,85 veya 32.85"
                /></div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={geoBusy} onClick={() => void geocodeFromAddressFields()}>
                  {geoBusy ? "Aranıyor…" : "Koordinat bul (adres)"}
                </Button>
                <GeofillAddressButton
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-1.5 disabled:opacity-60"
                  onFilled={({ address, lat, lng }) => {
                    const line = address.includes(" (GPS") ? address.slice(0, address.indexOf(" (GPS")).trim() : address.trim();
                    setForm((prev: any) => ({
                      ...prev,
                      lat,
                      lng,
                      address: String(prev.address || "").trim() ? prev.address : line,
                    }));
                    toast({ title: "GPS koordinat", description: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
                  }}
                />
                <span className="text-xs text-gray-500">Google harita açıksa adres araması Google'dan; değilse OSM. GPS yalnızca cihaz konumu.</span>
              </div>
              {form.slug ? (
                <div className="sm:col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs space-y-2">
                  <p className="font-bold text-indigo-900">Yekpare — Keşfet & harita</p>
                  <p>
                    <span className="text-gray-600">Keşfet / QR sayfası: </span>
                    <a className="text-indigo-600 underline break-all" href={`${typeof window !== "undefined" ? window.location.origin : ""}/kesfet/${encodeURIComponent(form.slug)}`} target="_blank" rel="noopener noreferrer">
                      /kesfet/{form.slug}
                    </a>
                  </p>
                  <p>
                    <span className="text-gray-600">Haritalar (genel): </span>
                    <a className="text-indigo-600 underline" href="/haritalar" target="_blank" rel="noopener noreferrer">/haritalar</a>
                    {form.lat != null && form.lng != null ? (
                      <span className="text-gray-500"> — pin için Keşfet bağlantısını kullanın veya enlem/boylamı kaydedin.</span>
                    ) : null}
                  </p>
                </div>
              ) : null}
              <div><label className="text-xs font-bold text-gray-600">Logo URL</label>
                <Input value={form.imageUrl || ""} onChange={e => setF("imageUrl", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Kapak URL</label>
                <Input value={form.coverUrl || ""} onChange={e => setF("coverUrl", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Min. Sipariş (₺)</label>
                <Input type="number" value={form.minOrderAmount || "0"} onChange={e => setF("minOrderAmount", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Teslimat Ücreti (₺)</label>
                <Input type="number" value={form.deliveryFee || "0"} onChange={e => setF("deliveryFee", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Tahmini Süre (dk)</label>
                <Input type="number" value={form.deliveryTime || 30} onChange={e => setF("deliveryTime", parseInt(e.target.value))} /></div>
              <div><label className="text-xs font-bold text-gray-600">Çalışma Saatleri</label>
                <Input value={form.workingHours || ""} onChange={e => setF("workingHours", e.target.value)} placeholder="09:00-22:00" /></div>
              <div><label className="text-xs font-bold text-gray-600">Sahip Adı</label>
                <Input value={form.ownerName || ""} onChange={e => setF("ownerName", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-600">Sahip E-posta</label>
                <Input value={form.ownerEmail || ""} onChange={e => setF("ownerEmail", e.target.value)} /></div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-600">Servis sağlayıcı üyelik paketi</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-md h-9 px-2 text-sm bg-white"
                  value={form.membershipTier || "gold"}
                  onChange={(e) => setF("membershipTier", e.target.value)}
                >
                  <option value="standard">Standart — vitrin, ürün, sipariş (dar panel)</option>
                  <option value="gold">Gold — tam panel</option>
                  <option value="premium">
                    Premium (Kurumsal) — Gold + özel kök alan adı hakkı; sınırsız mağaza/ilan/araç (politika dahilinde)
                  </option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  USD liste fiyatları: Genel Ayarlar → Abonelik. Özel kök alan adı yalnızca <strong>Premium</strong> iş ortaklarında yönetimden atanır.
                </p>
              </div>
            </div>

            {/* ZİNCİR / TEK ŞUBELİ */}
            <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 space-y-3">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Şube Türü</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="branchType" value="tek_subeli"
                    checked={form.branchType === "tek_subeli" || !form.branchType}
                    onChange={() => setF("branchType", "tek_subeli")} className="accent-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Tek Şubeli</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="branchType" value="zincir_merkez"
                    checked={form.branchType === "zincir_merkez"}
                    onChange={() => setF("branchType", "zincir_merkez")} className="accent-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Zincir — Merkez Şube</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="branchType" value="zincir_sube"
                    checked={form.branchType === "zincir_sube"}
                    onChange={() => setF("branchType", "zincir_sube")} className="accent-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Zincir — Alt Şube</span>
                </label>
              </div>
              {form.branchType === "zincir_sube" && (
                <div><label className="text-xs font-bold text-gray-600">Bağlı Olduğu Merkez Şube ID</label>
                  <Input type="number" value={form.parentVendorId || ""} onChange={e => setF("parentVendorId", e.target.value ? parseInt(e.target.value) : null)} placeholder="Merkez şubenin vendor ID'si" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.active} onChange={e => setF("active", e.target.checked)} /> Aktif
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.featured} onChange={e => setF("featured", e.target.checked)} /> Öne Çıkan
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.isOpen} onChange={e => setF("isOpen", e.target.checked)} /> Şu an Açık
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" title="Liste: İletişim bilgisi olmayanlar">
                <input type="checkbox" checked={!!form.catalogContactGap} onChange={e => setF("catalogContactGap", e.target.checked)} /> İletişim veri eksiği (işaretle)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" title="Liste: Menü/ürünü olmayanlar">
                <input type="checkbox" checked={!!form.catalogMenuGap} onChange={e => setF("catalogMenuGap", e.target.checked)} /> Menü veri eksiği (işaretle)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Vazgeç</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600"
                disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={menuImportVendor != null} onOpenChange={(open) => { if (!open) setMenuImportVendor(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yemeksepeti / Getir menü içe aktarma — {menuImportVendor?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            İşletme sayfası linkini yapıştırın, önizleyin ve kategorileri seçerek içe aktarın. Otomatik çekme çalışmazsa mor «Sayfa kaynağını yapıştır» kutusunu kullanın (Ctrl+U).
          </p>
          {menuImportVendor ? (
            <ExternalMenuImportPanel
              previewUrl={apiUrl("/api/delivery/admin/import-external-menu/preview")}
              importUrl={apiUrl(`/api/delivery/admin/vendors/${menuImportVendor.id}/import-external-menu`)}
              buildHeaders={() => ({})}
              exampleUrls={[
                "https://www.yemeksepeti.com/restaurant/cauu/merve-pide-1992",
                "https://getir.com/yemek/restoran/merve-pide-1992-fevzi-cakmak-mah-torbali-izmir/",
                "https://getir.com/carsi/isletmeler/nasip-market-manav-ekin-ankara/",
              ]}
              onImported={(stats) => {
                void qc.invalidateQueries({ queryKey: ["/api/delivery/vendors-admin", "delivery"] });
                toast({
                  title: "Menü içe aktarıldı",
                  description: `${stats.items ?? 0} ürün, ${stats.categories ?? 0} kategori eklendi.`,
                });
                setMenuImportVendor(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
