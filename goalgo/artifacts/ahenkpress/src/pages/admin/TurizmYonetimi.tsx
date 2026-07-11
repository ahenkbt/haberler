import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import { AdminMapPanelSyncToolbar } from "@/components/admin/AdminMapPanelSyncToolbar";
import { vendorGoogleImportColumns } from "@/components/admin/GoogleIsletmeImportCard";
import { VendorGoogleImportHub } from "@/components/admin/VendorGoogleImportHub";
import {
  Building2, Car, Sailboat, Map, Home, Plus, Pencil, Trash2,
  Search, RefreshCw, X, ChevronLeft, ChevronRight, BedDouble,
  Star, Eye, EyeOff, CheckCircle, XCircle, Clock, AlertCircle, Calendar,
  LayoutTemplate, Download, CheckSquare, Square,
} from "lucide-react";
import { TurizmCmsAdminTab } from "./TurizmCmsAdmin";

const TOURISM_ADMIN = apiUrl("/api/tourism/admin");

/* ─── Types ─────────────────────────────────────────────── */
interface Vendor {
  id: number; name: string; slug: string; city: string | null;
  district: string | null; phone: string | null; email: string | null;
  owner_email?: string | null; owner_name?: string | null;
  image_url: string | null; provider_subtype: string; status: string;
  active: boolean; notes: string | null; listing_count: number;
  booking_count: number; created_at: string;
  google_place_id?: string | null;
  linked_map_business_id?: string | null;
  google_import_kind?: string | null;
  is_open?: boolean;
  catalog_menu_gap?: boolean;
  catalog_contact_gap?: boolean;
}
interface Listing {
  id: number | string; type: string; title: string; slug: string;
  city: string | null; district: string | null; price: string;
  sale_price: string | null; price_unit: string;
  star_rating: number | null; capacity: number | null;
  status: string; is_featured: boolean; booking_count: number;
  vendor_name: string | null; vendor_id: number | null;
  image_url: string | null; description: string | null;
  address: string | null; created_at: string | null;
  source?: "google" | "bc";
  room_count?: number;
  map_business_fallback?: boolean;
  is_demo?: boolean;
}
interface Room {
  id: number; listing_id: number; name: string; description: string | null;
  beds: number; adults: number; children: number;
  size_sqm: number | null; price: string; count: number;
  image_url: string | null; status: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const SUBTYPES = [
  { value: "otel",   label: "🏨 Otel",       listingType: "hotel" },
  { value: "arac",   label: "🚗 Rent a Car",  listingType: "car"   },
  { value: "villa",  label: "🏡 Villa & Ev",  listingType: "villa" },
  { value: "tur",    label: "🗺️ Tur",         listingType: "tour"  },
  { value: "yat",    label: "⛵ Yat & Tekne", listingType: "boat"  },
];
const TYPE_LABELS: Record<string, string> = {
  hotel: "🏨 Otel", car: "🚗 Rent a Car", villa: "🏡 Villa",
  tour: "🗺️ Tur", boat: "⛵ Yat",
};
const PRICE_UNITS: Record<string, string> = {
  hotel: "gece", car: "gün", villa: "gece", tour: "kişi", boat: "gün",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  deleted: "bg-red-100 text-red-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};
const STATUS_TR: Record<string, string> = {
  active: "Aktif", inactive: "Pasif", pending: "Bekliyor",
  deleted: "Silindi", approved: "Onaylı", rejected: "Reddedildi",
};

function isDemoTourismVendor(v: { name?: string; slug?: string }): boolean {
  const name = String(v.name ?? "").toLowerCase();
  const slug = String(v.slug ?? "").toLowerCase();
  if (/yekpare\s+demo/.test(name) || slug.startsWith("yekpare-demo")) return true;
  if (/four\s*seasons?/.test(name)) return true;
  return false;
}

/* ─── Shared UI ──────────────────────────────────────────── */
function Badge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}>
      {STATUS_TR[status] || status}
    </span>
  );
}
function Btn({ onClick, className = "", children, type = "button", disabled }: {
  onClick?: () => void; className?: string; children: React.ReactNode; type?: "button" | "submit"; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${className}`}>
      {children}
    </button>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function tourismPanelLoginEmail(v: Vendor): string {
  return String(v.owner_email || v.email || "").trim();
}

function tourismVendorPublicHref(v: Vendor): string {
  return v.slug ? `/kesfet/${v.slug}` : "/turizm";
}

/* ═══════════════════════════════════════════════════════════
   TAB 1: FİRMALAR
═══════════════════════════════════════════════════════════ */
type TurizmVendorListFilter =
  | "all"
  | "active"
  | "opening"
  | "no_menu"
  | "no_contact"
  | "google_scrape"
  | "google_api";

const TURIZM_PAGE_SIZE = 120;

function FirmalarTab() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [page, setPage] = useState(1);
  const [subtype, setSubtype] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [vendorListFilter, setVendorListFilter] = useState<TurizmVendorListFilter>("all");
  const [googleTourSubtype, setGoogleTourSubtype] = useState("otel");
  const [modal, setModal] = useState<null | "add" | Vendor>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(p), limit: String(TURIZM_PAGE_SIZE) });
    if (subtype) params.set("subtype", subtype);
    if (status)  params.set("status", status);
    if (q)       params.set("q", q);
    try {
      const response = await apiFetch(`${TOURISM_ADMIN}/vendors?${params}`);
      const payload = (await response.json().catch(() => ({}))) as { vendors?: Vendor[]; total?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || `Turizm firmaları alınamadı (HTTP ${response.status})`);
      setVendors(Array.isArray(payload.vendors) ? payload.vendors : []);
      setTotal(Number(payload.total) || 0);
      setPage(p);
    } catch (e) {
      setVendors([]);
      setTotal(0);
      setLoadError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [subtype, status, q]);

  useEffect(() => { void load(1); }, [load]);

  const openAdd = () => {
    setForm({ name: "", subtype: "otel", city: "", district: "", phone: "", email: "", image_url: "", notes: "" });
    setModal("add");
  };
  const openEdit = (v: Vendor) => {
    setForm({
      name: v.name, subtype: v.provider_subtype, city: v.city || "",
      district: v.district || "", phone: v.phone || "", email: v.email || "",
      image_url: v.image_url || "", notes: v.notes || "", status: v.status,
    });
    setModal(v);
  };
  const save = async () => {
    setSaving(true);
    if (modal === "add") {
      await apiFetch(`${TOURISM_ADMIN}/vendors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, imageUrl: form.image_url }) });
    } else if (modal && typeof modal === "object") {
      await apiFetch(`${TOURISM_ADMIN}/vendors/${modal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, imageUrl: form.image_url }) });
    }
    setSaving(false);
    setModal(null);
    void load(page);
  };
  const del = async (v: Vendor) => {
    if (!confirm(`"${v.name}" firmasını pasif hale getirmek istediğinize emin misiniz?`)) return;
    await apiFetch(`${TOURISM_ADMIN}/vendors/${v.id}`, { method: "DELETE" });
    void load(page);
  };
  const patchVendor = async (v: Vendor, body: Record<string, unknown>) => {
    await apiFetch(`${TOURISM_ADMIN}/vendors/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void load(page);
  };
  const openProviderPanel = async (v: Vendor) => {
    const res = await apiFetch(apiUrl(`/api/admin/providers/${v.id}/panel-session`), { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { session?: unknown; vendor?: { panel_route?: string } };
    if (!res.ok || !data.session) {
      alert("Panel oturumu oluşturulamadı.");
      return;
    }
    localStorage.setItem("providerSession", JSON.stringify(data.session));
    window.open(data.vendor?.panel_route || "/turizm-paneli", "_blank", "noopener,noreferrer");
  };
  const setProviderPassword = async (v: Vendor) => {
    const password = window.prompt(`${v.name} için servis sağlayıcı panel şifresi girin (en az 4 karakter):`);
    if (password === null) return;
    if (password.trim().length < 4) {
      alert("Şifre en az 4 karakter olmalı.");
      return;
    }
    const res = await apiFetch(apiUrl(`/api/admin/providers/${v.id}/set-password`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(String((data as { error?: string }).error || "Şifre kaydedilemedi."));
      return;
    }
    alert(`Panel şifresi kaydedildi.\nGiriş: ${tourismPanelLoginEmail(v) || v.email || "işletme e-postası"}`);
  };

  const bulkApprovePending = async () => {
    const raw = window.prompt("Kaç adet bekleyen (pending) firmayı onaylamak istersiniz? (1–5000)", "500");
    if (raw === null) return;
    const lim = Math.min(5000, Math.max(1, parseInt(raw, 10) || 500));
    const scope = subtype
      ? `Seçili tür (${SUBTYPES.find(s => s.value === subtype)?.label ?? subtype}) için `
      : "Tüm türler için ";
    if (!confirm(`${scope}en fazla ${lim} bekleyen turizm firması onaylanacak ve aktif edilecek. Devam?`)) return;
    setBulkWorking(true);
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/vendors/bulk-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: lim, subtype: subtype || undefined }),
      }).then(x => x.json()).catch(() => ({}));
      if (r.error) alert(String(r.error));
      else alert(`${r.updated ?? 0} firma onaylandı.`);
      void load(page);
    } finally {
      setBulkWorking(false);
    }
  };

  const displayVendors = vendors.filter((v) => {
    if (vendorListFilter === "all") return true;
    if (vendorListFilter === "active") return v.active === true;
    if (vendorListFilter === "opening") return v.is_open === false;
    if (vendorListFilter === "no_menu") return v.catalog_menu_gap === true;
    if (vendorListFilter === "no_contact") return v.catalog_contact_gap === true;
    if (vendorListFilter === "google_scrape") return vendorGoogleImportColumns(v as unknown as Record<string, unknown>).scrape;
    if (vendorListFilter === "google_api") return vendorGoogleImportColumns(v as unknown as Record<string, unknown>).api;
    return true;
  });

  const vendorCounts = {
    all: vendors.length,
    active: vendors.filter((v) => v.active === true).length,
    opening: vendors.filter((v) => v.is_open === false).length,
    no_menu: vendors.filter((v) => v.catalog_menu_gap === true).length,
    no_contact: vendors.filter((v) => v.catalog_contact_gap === true).length,
    google_scrape: vendors.filter((v) => vendorGoogleImportColumns(v as unknown as Record<string, unknown>).scrape).length,
    google_api: vendors.filter((v) => vendorGoogleImportColumns(v as unknown as Record<string, unknown>).api).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">Google turizm alt türü</label>
          <select className={sel} value={googleTourSubtype} onChange={(e) => setGoogleTourSubtype(e.target.value)}>
            {SUBTYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <VendorGoogleImportHub
        vendorType="turizm"
        tourismSubtype={googleTourSubtype}
        onImported={() => void load(page)}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Firma ara..." value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void load(1)} />
        </div>
        <select className={sel + " w-auto"} value={subtype} onChange={e => setSubtype(e.target.value)}>
          <option value="">Tüm Türler</option>
          {SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={sel + " w-auto"} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="approved">Onaylı</option>
          <option value="pending">Bekliyor</option>
          <option value="rejected">Reddedildi</option>
        </select>
        <Btn onClick={() => void load(1)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
          <RefreshCw size={14} /> Yenile
        </Btn>
        <Btn
          onClick={() => void bulkApprovePending()}
          disabled={bulkWorking}
          className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
        >
          <CheckCircle size={14} /> {bulkWorking ? "…" : "Bekleyenleri toplu onayla"}
        </Btn>
        <div className="flex flex-wrap items-center gap-2">
          <AdminMapPanelSyncToolbar
            vendorModule="turizm"
            tourismSubtype={googleTourSubtype}
            invalidateQueryKeys={[]}
            onAfterPromote={() => void load(page)}
          />
        </div>
        <Btn onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
          <Plus size={15} /> Firma Ekle
        </Btn>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: "all" as const, label: "Tümü", count: vendorCounts.all },
          { key: "active" as const, label: "Aktif işletmeler", count: vendorCounts.active },
          { key: "opening" as const, label: "Açılış aşamasında", count: vendorCounts.opening },
          { key: "no_menu" as const, label: "Menü/ürünü olmayanlar", count: vendorCounts.no_menu },
          { key: "no_contact" as const, label: "İletişim bilgisi olmayanlar", count: vendorCounts.no_contact },
          { key: "google_scrape" as const, label: "Google kazıma", count: vendorCounts.google_scrape },
          { key: "google_api" as const, label: "Google API", count: vendorCounts.google_api },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setVendorListFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              vendorListFilter === key
                ? "border-cyan-500 bg-cyan-50 text-cyan-900"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {label}
            <span className="rounded-full bg-white/80 px-1.5 text-[10px] text-gray-500 tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">{total} firma bulundu</div>
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Turizm firmaları yüklenemedi: {loadError}
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Yükleniyor...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Firma / Panel", "Kazıma", "API", "Tür", "Şehir", "İletişim", "İlanlar", "Rezerv.", "Açık", "Durum", "İşlemler"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayVendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {v.image_url
                        ? <img src={v.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                        : <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">{v.name[0]}</div>}
                      <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight flex flex-wrap items-center gap-1.5">
                          {v.name}
                          {isDemoTourismVendor(v) ? (
                            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">Demo</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-gray-400">#{v.id} · Panel: /turizm-paneli</div>
                        <div className="text-[11px] text-cyan-700 truncate max-w-[220px]">
                          Giriş: {tourismPanelLoginEmail(v) || "e-posta tanımsız"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-700 font-medium">
                    {vendorGoogleImportColumns(v as unknown as Record<string, unknown>).scrape ? "Evet" : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-sky-700 font-medium">
                    {vendorGoogleImportColumns(v as unknown as Record<string, unknown>).api ? "Evet" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{SUBTYPES.find(s => s.value === v.provider_subtype)?.label || v.provider_subtype}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.city || "—"}{v.district ? ` / ${v.district}` : ""}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">{v.phone || "—"}</div>
                    <div className="text-xs text-gray-400">{v.email || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-700">{v.listing_count}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{v.booking_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void patchVendor(v, { isOpen: v.is_open === false })}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${v.is_open === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {v.is_open === false ? "Kapalı" : "Açık"}
                    </button>
                  </td>
                  <td className="px-4 py-3"><Badge status={v.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5 min-w-[320px]">
                      <button onClick={() => void openProviderPanel(v)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">
                        Panel
                      </button>
                      <a href={tourismVendorPublicHref(v)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100">
                        Vitrin
                      </a>
                      <button onClick={() => void setProviderPassword(v)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100">
                        Şifre
                      </button>
                      <button onClick={() => void patchVendor(v, { active: !v.active, status: !v.active ? "approved" : v.status })} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                        {v.active ? "Pasifleştir" : "Aktif Et"}
                      </button>
                      <button onClick={() => openEdit(v)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100">
                        Düzenle
                      </button>
                      <button onClick={() => del(v)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100">
                        Sil/Pasif
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayVendors.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Firma bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > TURIZM_PAGE_SIZE && (
        <div className="flex items-center gap-3 justify-center pt-2">
          <Btn onClick={() => void load(page - 1)} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 ${page <= 1 ? "opacity-40 pointer-events-none" : ""}`}>
            <ChevronLeft size={14} />
          </Btn>
          <span className="text-sm text-gray-600">Sayfa {page} / {Math.ceil(total / TURIZM_PAGE_SIZE)}</span>
          <Btn onClick={() => void load(page + 1)} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 ${page >= Math.ceil(total / TURIZM_PAGE_SIZE) ? "opacity-40 pointer-events-none" : ""}`}>
            <ChevronRight size={14} />
          </Btn>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Yeni Firma Ekle" : `Düzenle: ${(modal as Vendor).name}`} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Firma Adı *">
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Firma adı" />
              </Field>
            </div>
            <Field label="Tür *">
              <select className={sel} value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))}>
                {SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            {modal !== "add" && (
              <Field label="Durum">
                <select className={sel} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Onaylı</option>
                  <option value="pending">Bekliyor</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </Field>
            )}
            <Field label="Şehir">
              <input className={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" />
            </Field>
            <Field label="İlçe">
              <input className={inp} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Kadıköy" />
            </Field>
            <Field label="Telefon">
              <input className={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0555 000 00 00" />
            </Field>
            <Field label="E-posta">
              <input className={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@firma.com" />
            </Field>
            <div className="col-span-2">
              <Field label="Fotoğraf URL">
                <input className={inp} value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notlar">
                <textarea className={inp} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Dahili notlar..." />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Btn onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">İptal</Btn>
            <Btn onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {modal === "add" ? "Firma Ekle" : "Kaydet"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2: İLANLAR
═══════════════════════════════════════════════════════════ */
function IlanlarTab({ onManageRooms }: { onManageRooms: (l: Listing) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<null | "add" | Listing>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (typeFilter)   params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (!typeFilter || typeFilter === "hotel") params.set("includeGoogle", "1");
    const [r, vr] = await Promise.all([
      apiFetch(`${TOURISM_ADMIN}/listings?${params}`).then(x => x.json()).catch(() => ({ listings: [], total: 0 })),
      apiFetch(`${TOURISM_ADMIN}/vendors?page=1`).then(x => x.json()).catch(() => ({ vendors: [] })),
    ]);
    setListings(r.listings || []);
    setTotal(r.total || 0);
    setVendors(vr.vendors || []);
    setPage(p);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => { void load(1); }, [load]);

  const openAdd = () => {
    setForm({ type: "hotel", title: "", vendorId: "", city: "", district: "", address: "", price: "", salePrice: "", starRating: "", capacity: "", imageUrl: "", description: "", status: "active" });
    setModal("add");
  };
  const openEdit = (l: Listing) => {
    setForm({
      type: l.type, title: l.title, vendorId: String(l.vendor_id || ""),
      city: l.city || "", district: l.district || "", address: l.address || "",
      price: l.price, salePrice: l.sale_price || "", starRating: String(l.star_rating || ""),
      capacity: String(l.capacity || ""), imageUrl: l.image_url || "",
      description: l.description || "", status: l.status,
    });
    setModal(l);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      ...form,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
      price: Number(form.price), salePrice: form.salePrice ? Number(form.salePrice) : null,
      starRating: form.starRating ? Number(form.starRating) : null,
      capacity: form.capacity ? Number(form.capacity) : null,
    };
    if (modal === "add") {
      await apiFetch(`${TOURISM_ADMIN}/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (modal && typeof modal === "object") {
      await apiFetch(`${TOURISM_ADMIN}/listings/${(modal as Listing).id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModal(null);
    void load(page);
  };

  const patch = async (id: number, body: object) => {
    await apiFetch(`${TOURISM_ADMIN}/listings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    void load(page);
  };
  const del = async (l: Listing) => {
    if (!confirm(`"${l.title}" ilanını silmek istediğinize emin misiniz?`)) return;
    await apiFetch(`${TOURISM_ADMIN}/listings/${l.id}`, { method: "DELETE" });
    void load(page);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className={sel + " w-auto"} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Tüm Türler</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={sel + " w-auto"} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
          <option value="pending">Bekliyor</option>
        </select>
        <Btn onClick={() => void load(1)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
          <RefreshCw size={14} /> Yenile
        </Btn>
        <Btn onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
          <Plus size={15} /> İlan Ekle
        </Btn>
      </div>

      <div className="text-xs text-gray-500">{total} ilan bulundu</div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Yükleniyor...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["İlan", "Tür", "Firma", "Şehir", "Fiyat", "Rezerv.", "Durum", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listings.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {l.image_url
                        ? <img src={l.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                        : <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 text-sm">{l.type === "hotel" ? "🏨" : l.type === "car" ? "🚗" : l.type === "villa" ? "🏡" : l.type === "tour" ? "🗺️" : "⛵"}</div>}
                      <div>
                        <div className="font-semibold text-gray-900 leading-tight max-w-[160px] truncate">{l.title}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {l.source === "google" && (
                            <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">Google</span>
                          )}
                          {l.is_demo && (
                            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">Demo</span>
                          )}
                          {l.room_count != null && l.room_count > 0 && (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{l.room_count} oda</span>
                          )}
                        </div>
                        {l.star_rating && <div className="text-[10px] text-amber-500">{"★".repeat(l.star_rating)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{TYPE_LABELS[l.type] || l.type}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{l.vendor_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{l.city || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{Number(l.price).toLocaleString("tr-TR")} ₺</div>
                    <div className="text-[10px] text-gray-400">/{l.price_unit}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{l.booking_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge status={l.status} />
                      {l.is_featured && <span className="text-[10px] text-amber-600 font-semibold">⭐ Öne Çıkan</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {l.source !== "google" && (
                        <button onClick={() => openEdit(l)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Düzenle"><Pencil size={14} /></button>
                      )}
                      {l.type === "hotel" && l.source !== "google" && (
                        <button onClick={() => onManageRooms(l)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600" title="Oda Yönetimi"><BedDouble size={14} /></button>
                      )}
                      {l.source !== "google" && (
                        <>
                          <button onClick={() => patch(Number(l.id), { isFeatured: !l.is_featured })} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Öne Çıkar">
                            <Star size={14} className={l.is_featured ? "fill-amber-400" : ""} />
                          </button>
                          <button onClick={() => patch(Number(l.id), { status: l.status === "active" ? "inactive" : "active" })}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title={l.status === "active" ? "Pasifleştir" : "Aktifleştir"}>
                            {l.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => del(l)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Sil"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">İlan bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center gap-3 justify-center pt-2">
          <Btn onClick={() => void load(page - 1)} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 ${page <= 1 ? "opacity-40 pointer-events-none" : ""}`}><ChevronLeft size={14} /></Btn>
          <span className="text-sm text-gray-600">Sayfa {page} / {Math.ceil(total / 20)}</span>
          <Btn onClick={() => void load(page + 1)} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 ${page >= Math.ceil(total / 20) ? "opacity-40 pointer-events-none" : ""}`}><ChevronRight size={14} /></Btn>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Yeni İlan Ekle" : `Düzenle: ${(modal as Listing).title}`} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="İlan Türü *">
              <select className={sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Durum">
              <select className={sel} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="pending">Bekliyor</option>
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Başlık *">
                <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="İlan başlığı" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Firma (Vendor)">
                <select className={sel} value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                  <option value="">Firma seçin...</option>
                  {vendors.filter(v => {
                    const typeToSubtype: Record<string,string> = { hotel: "otel", car: "arac", villa: "villa", tour: "tur", boat: "yat" };
                    return v.provider_subtype === typeToSubtype[form.type];
                  }).map(v => <option key={v.id} value={v.id}>{v.name} — {v.city}</option>)}
                  {vendors.filter(v => {
                    const typeToSubtype: Record<string,string> = { hotel: "otel", car: "arac", villa: "villa", tour: "tur", boat: "yat" };
                    return v.provider_subtype !== typeToSubtype[form.type];
                  }).map(v => <option key={v.id} value={v.id}>{v.name} ({v.provider_subtype})</option>)}
                </select>
              </Field>
            </div>
            <Field label="Şehir">
              <input className={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" />
            </Field>
            <Field label="İlçe">
              <input className={inp} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Beyoğlu" />
            </Field>
            <div className="col-span-2">
              <Field label="Adres">
                <input className={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Tam adres" />
              </Field>
            </div>
            <Field label={`Fiyat (₺/${PRICE_UNITS[form.type] || "gece"}) *`}>
              <input className={inp} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500" />
            </Field>
            <Field label="İndirimli Fiyat (₺)">
              <input className={inp} type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="1200" />
            </Field>
            {form.type === "hotel" && (
              <Field label="Yıldız (1-5)">
                <select className={sel} value={form.starRating} onChange={e => setForm(f => ({ ...f, starRating: e.target.value }))}>
                  <option value="">—</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Yıldız</option>)}
                </select>
              </Field>
            )}
            <Field label="Kapasite">
              <input className={inp} type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="2" />
            </Field>
            <div className="col-span-2">
              <Field label="Kapak Fotoğrafı URL">
                <input className={inp} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Açıklama">
                <textarea className={inp} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="İlan açıklaması..." />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Btn onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">İptal</Btn>
            <Btn onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {modal === "add" ? "İlan Ekle" : "Kaydet"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3: ODALAR
═══════════════════════════════════════════════════════════ */
function OdalarTab({ initialListing }: { initialListing: Listing | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(initialListing);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [modal, setModal] = useState<null | "add" | Room>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      setLoadingListings(true);
      const r = await apiFetch(`${TOURISM_ADMIN}/listings?type=hotel&page=1`).then(x => x.json()).catch(() => ({ listings: [] }));
      setListings(r.listings || []);
      setLoadingListings(false);
    })();
  }, []);

  const loadRooms = useCallback(async (l: Listing) => {
    setSelectedListing(l);
    setLoadingRooms(true);
    const r = await apiFetch(`${TOURISM_ADMIN}/rooms?listingId=${l.id}`).then(x => x.json()).catch(() => []);
    setRooms(Array.isArray(r) ? r : []);
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    if (initialListing) void loadRooms(initialListing);
  }, [initialListing, loadRooms]);

  const openAdd = () => {
    if (!selectedListing) return;
    setForm({ name: "", description: "", beds: "1", adults: "2", children: "0", sizeSqm: "", price: "", count: "1", imageUrl: "", status: "active" });
    setModal("add");
  };
  const openEdit = (r: Room) => {
    setForm({
      name: r.name, description: r.description || "", beds: String(r.beds),
      adults: String(r.adults), children: String(r.children),
      sizeSqm: String(r.size_sqm || ""), price: r.price, count: String(r.count),
      imageUrl: r.image_url || "", status: r.status,
    });
    setModal(r);
  };

  const save = async () => {
    if (!selectedListing) return;
    setSaving(true);
    const body = { ...form, listingId: selectedListing.id, beds: Number(form.beds), adults: Number(form.adults), children: Number(form.children), sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : null, price: Number(form.price), count: Number(form.count) };
    if (modal === "add") {
      await apiFetch(`${TOURISM_ADMIN}/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (modal && typeof modal === "object") {
      await apiFetch(`${TOURISM_ADMIN}/rooms/${(modal as Room).id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModal(null);
    void loadRooms(selectedListing);
  };

  const del = async (r: Room) => {
    if (!selectedListing || !confirm(`"${r.name}" odasını silmek istediğinize emin misiniz?`)) return;
    await apiFetch(`${TOURISM_ADMIN}/rooms/${r.id}`, { method: "DELETE" });
    void loadRooms(selectedListing);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Listing selector */}
        <div className="lg:col-span-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">
            Otel Seç
          </div>
          {loadingListings ? (
            <div className="py-8 flex justify-center text-gray-400"><RefreshCw size={18} className="animate-spin" /></div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {listings.map(l => (
                <button key={l.id} onClick={() => void loadRooms(l)}
                  className={`w-full text-left px-4 py-3 hover:bg-white transition-colors ${selectedListing?.id === l.id ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    {l.image_url
                      ? <img src={l.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-base flex-shrink-0">🏨</div>}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{l.title}</div>
                      <div className="text-xs text-gray-500">{l.city || "—"}</div>
                    </div>
                  </div>
                </button>
              ))}
              {listings.length === 0 && <div className="py-8 text-center text-sm text-gray-400">Otel ilanı yok</div>}
            </div>
          )}
        </div>

        {/* Rooms list */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedListing ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <BedDouble size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Sol panelden bir otel seçin</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedListing.title}</h3>
                  <p className="text-xs text-gray-500">{rooms.length} oda tanımlı</p>
                </div>
                <Btn onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus size={15} /> Oda Ekle
                </Btn>
              </div>

              {loadingRooms ? (
                <div className="flex justify-center py-8 text-gray-400"><RefreshCw size={18} className="animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {rooms.map(r => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4">
                      {r.image_url
                        ? <img src={r.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border flex-shrink-0" />
                        : <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🛏️</div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-gray-900">{r.name}</div>
                            {r.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.description}</div>}
                          </div>
                          <Badge status={r.status} />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                          <span>🛏️ {r.beds} yatak</span>
                          <span>👤 {r.adults} yetişkin + {r.children} çocuk</span>
                          {r.size_sqm && <span>📐 {r.size_sqm} m²</span>}
                          <span>📦 {r.count} oda mevcut</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="font-bold text-blue-700">{Number(r.price).toLocaleString("tr-TR")} ₺ / gece</div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Pencil size={14} /></button>
                            <button onClick={() => del(r)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {rooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <BedDouble size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">Henüz oda eklenmemiş</p>
                      <Btn onClick={openAdd} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        <Plus size={13} /> İlk Odayı Ekle
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Room Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Oda Ekle" : `Düzenle: ${(modal as Room).name}`} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Oda Adı *">
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Standart Oda, Deluxe Suite..." />
              </Field>
            </div>
            <Field label="Yatak Sayısı">
              <input className={inp} type="number" min={1} value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} />
            </Field>
            <Field label="Yetişkin">
              <input className={inp} type="number" min={1} value={form.adults} onChange={e => setForm(f => ({ ...f, adults: e.target.value }))} />
            </Field>
            <Field label="Çocuk">
              <input className={inp} type="number" min={0} value={form.children} onChange={e => setForm(f => ({ ...f, children: e.target.value }))} />
            </Field>
            <Field label="Alan (m²)">
              <input className={inp} type="number" value={form.sizeSqm} onChange={e => setForm(f => ({ ...f, sizeSqm: e.target.value }))} placeholder="25" />
            </Field>
            <Field label="Fiyat (₺/gece) *">
              <input className={inp} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="500" />
            </Field>
            <Field label="Mevcut Oda Adedi">
              <input className={inp} type="number" min={1} value={form.count} onChange={e => setForm(f => ({ ...f, count: e.target.value }))} />
            </Field>
            <Field label="Durum">
              <select className={sel} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Fotoğraf URL">
                <input className={inp} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Açıklama">
                <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Oda açıklaması..." />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Btn onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">İptal</Btn>
            <Btn onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {modal === "add" ? "Oda Ekle" : "Kaydet"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 4: ARAÇLAR & TURLAR
═══════════════════════════════════════════════════════════ */
function SubItemsTab({ type }: { type: "car" | "tour" | "boat" | "villa" }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "add" | Listing>(null);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  const typeMap = { car: "🚗 Araçlar", tour: "🗺️ Turlar", boat: "⛵ Tekneler", villa: "🏡 Villalar" };
  const label = typeMap[type];

  const load = useCallback(async () => {
    setLoading(true);
    const [lr, vr] = await Promise.all([
      apiFetch(`${TOURISM_ADMIN}/listings?type=${type}&page=1`).then(x => x.json()).catch(() => ({ listings: [] })),
      apiFetch(`${TOURISM_ADMIN}/vendors?page=1`).then(x => x.json()).catch(() => ({ vendors: [] })),
    ]);
    setListings(lr.listings || []);
    setVendors(vr.vendors || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setForm({ type, title: "", vendorId: "", city: "", district: "", address: "", price: "", salePrice: "", capacity: "", imageUrl: "", description: "", status: "active" });
    setModal("add");
  };
  const openEdit = (l: Listing) => {
    setForm({
      type: l.type, title: l.title, vendorId: String(l.vendor_id || ""),
      city: l.city || "", district: l.district || "", address: l.address || "",
      price: l.price, salePrice: l.sale_price || "",
      capacity: String(l.capacity || ""), imageUrl: l.image_url || "",
      description: l.description || "", status: l.status,
    });
    setSelected(l);
    setModal(l);
  };

  const save = async () => {
    setSaving(true);
    const body = { ...form, vendorId: form.vendorId ? Number(form.vendorId) : null, price: Number(form.price), salePrice: form.salePrice ? Number(form.salePrice) : null, capacity: form.capacity ? Number(form.capacity) : null };
    if (modal === "add") {
      await apiFetch(`${TOURISM_ADMIN}/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (selected) {
      await apiFetch(`${TOURISM_ADMIN}/listings/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModal(null);
    setSelected(null);
    void load();
  };

  const del = async (l: Listing) => {
    if (!confirm(`"${l.title}" silinecek. Emin misiniz?`)) return;
    await apiFetch(`${TOURISM_ADMIN}/listings/${l.id}`, { method: "DELETE" });
    void load();
  };
  const patch = async (l: Listing, body: object) => {
    await apiFetch(`${TOURISM_ADMIN}/listings/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-900">{label}</h2>
        <Btn onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus size={15} /> Ekle
        </Btn>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-gray-400"><RefreshCw size={18} className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-36">
                {l.image_url
                  ? <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-4xl">
                      {type === "car" ? "🚗" : type === "tour" ? "🗺️" : type === "boat" ? "⛵" : "🏡"}
                    </div>}
                <div className="absolute top-2 right-2"><Badge status={l.status} /></div>
              </div>
              <div className="p-4">
                <div className="font-semibold text-gray-900 text-sm truncate">{l.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l.city || "—"} {l.district ? `/ ${l.district}` : ""}</div>
                <div className="text-xs text-gray-400 mt-0.5">{l.vendor_name || "Firma yok"}</div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <div className="font-bold text-blue-700">{Number(l.price).toLocaleString("tr-TR")} ₺</div>
                    <div className="text-[10px] text-gray-400">/{l.price_unit}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(l)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Pencil size={13} /></button>
                    <button onClick={() => patch(l, { status: l.status === "active" ? "inactive" : "active" })}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                      {l.status === "active" ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => del(l)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {listings.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <AlertCircle size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Henüz ilan eklenmemiş</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === "add" ? `Yeni ${label} Ekle` : `Düzenle`} onClose={() => { setModal(null); setSelected(null); }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Başlık *">
                <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={`${label} adı / başlığı`} />
              </Field>
            </div>
            <Field label="Firma (Vendor)">
              <select className={sel} value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                <option value="">Firma seçin...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.city}</option>)}
              </select>
            </Field>
            <Field label="Durum">
              <select className={sel} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="pending">Bekliyor</option>
              </select>
            </Field>
            <Field label="Şehir">
              <input className={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" />
            </Field>
            <Field label="İlçe">
              <input className={inp} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Beşiktaş" />
            </Field>
            <Field label={`Fiyat (₺/${PRICE_UNITS[type]}) *`}>
              <input className={inp} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="500" />
            </Field>
            <Field label="İndirimli Fiyat (₺)">
              <input className={inp} type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="400" />
            </Field>
            <Field label="Kapasite (kişi)">
              <input className={inp} type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="4" />
            </Field>
            <div className="col-span-2">
              <Field label="Kapak Fotoğrafı URL">
                <input className={inp} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Adres / Kalkış Noktası">
                <input className={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adres veya kalkış noktası" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Açıklama">
                <textarea className={inp} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detay açıklaması..." />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Btn onClick={() => { setModal(null); setSelected(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">İptal</Btn>
            <Btn onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {modal === "add" ? "Ekle" : "Kaydet"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 5: REZERVASYONLAR
═══════════════════════════════════════════════════════════ */
interface TourismBooking {
  id: number;
  booking_ref: string;
  listing_type: string;
  listing_title: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number;
  total_price: string;
  status: string;
  vendor_name: string | null;
  created_at: string;
}

const BOOKING_STATUS_TR: Record<string, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  cancelled: "İptal",
  completed: "Tamamlandı",
};

function RezervasyonlarTab() {
  const [bookings, setBookings] = useState<TourismBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    const r = await apiFetch(`${TOURISM_ADMIN}/bookings?${params}`)
      .then((x) => x.json())
      .catch(() => ({ bookings: [], total: 0 }));
    setBookings(r.bookings || []);
    setTotal(r.total || 0);
    setPage(p);
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { void load(1); }, [load]);

  const patchStatus = async (id: number, status: string) => {
    await apiFetch(`${TOURISM_ADMIN}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load(page);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className={sel + " w-auto"} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tüm Türler</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select className={sel + " w-auto"} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="confirmed">Onaylandı</option>
          <option value="cancelled">İptal</option>
          <option value="completed">Tamamlandı</option>
        </select>
        <Btn onClick={() => void load(page)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">
          <RefreshCw size={14} /> Yenile
        </Btn>
      </div>
      <div className="text-xs text-gray-500">{total} rezervasyon</div>
      {loading ? (
        <div className="flex justify-center py-12 text-gray-400"><RefreshCw size={18} className="animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Kod", "İlan", "Tür", "Müşteri", "Tarih", "Tutar", "Durum", "İşlem"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{b.booking_ref}</td>
                  <td className="px-4 py-3 max-w-[140px] truncate">{b.listing_title}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[b.listing_type] || b.listing_type}</td>
                  <td className="px-4 py-3">
                    <div>{b.customer_name}</div>
                    <div className="text-xs text-gray-400">{b.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {b.check_in || "—"}
                    {b.check_out ? ` → ${b.check_out}` : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold">{Number(b.total_price).toLocaleString("tr-TR")} ₺</td>
                  <td className="px-4 py-3"><Badge status={b.status === "confirmed" ? "approved" : b.status === "pending" ? "pending" : b.status} /></td>
                  <td className="px-4 py-3">
                    <select
                      className={sel + " w-auto text-xs"}
                      value={b.status}
                      onChange={(e) => void patchStatus(b.id, e.target.value)}
                    >
                      {Object.entries(BOOKING_STATUS_TR).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Rezervasyon bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: DESTİNASYONLAR
═══════════════════════════════════════════════════════════ */
interface DestinationRow {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  excerpt: string | null;
  detail_title: string | null;
  city_match: string[];
  sort_order: number;
  is_active: boolean;
}

function DestinasyonlarTab() {
  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<DestinationRow>>({ is_active: true, sort_order: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/destinations`);
      const d = await r.json();
      setRows((d.destinations ?? []).map((x: Record<string, unknown>) => ({
        ...x,
        city_match: Array.isArray(x.city_match) ? x.city_match : [],
      })));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title || !form.slug) return;
    const payload = {
      title: form.title,
      slug: form.slug,
      imageUrl: form.image_url,
      excerpt: form.excerpt,
      detailTitle: form.detail_title,
      cityMatch: form.city_match ?? [form.title],
      sortOrder: form.sort_order ?? 0,
      isActive: form.is_active !== false,
    };
    if (editingId) {
      await apiFetch(`${TOURISM_ADMIN}/destinations/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch(`${TOURISM_ADMIN}/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setForm({ is_active: true, sort_order: 0 });
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Destinasyon silinsin mi?")) return;
    await apiFetch(`${TOURISM_ADMIN}/destinations/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Destinasyonlar</h2>
        <button type="button" onClick={load} className="text-sm text-blue-600 flex items-center gap-1"><RefreshCw size={14} /> Yenile</button>
      </div>
      <div className="grid md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border">
        <input className="border rounded px-3 py-2 text-sm" placeholder="Başlık" value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Slug" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
        <input className="border rounded px-3 py-2 text-sm md:col-span-2" placeholder="Görsel URL (/assets/turizm-bc/...)" value={form.image_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
        <input className="border rounded px-3 py-2 text-sm md:col-span-2" placeholder="Özet" value={form.excerpt ?? ""} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
        <input className="border rounded px-3 py-2 text-sm md:col-span-2" placeholder="Şehir eşleşmeleri (virgülle)" value={(form.city_match ?? []).join(", ")} onChange={(e) => setForm((f) => ({ ...f, city_match: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
        <button type="button" onClick={save} className="md:col-span-2 bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold">{editingId ? "Güncelle" : "Ekle"}</button>
      </div>
      {loading ? <p className="text-gray-400">Yükleniyor…</p> : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Başlık</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Durum</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3 text-gray-500">{r.slug}</td>
                  <td className="p-3">{r.is_active ? "Aktif" : "Pasif"}</td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" onClick={() => { setEditingId(r.id); setForm(r); }} className="text-blue-600"><Pencil size={14} /></button>
                    <button type="button" onClick={() => remove(r.id)} className="text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: HARİTALARDAN İÇE AKTAR
═══════════════════════════════════════════════════════════ */
interface MapImportRow {
  id: string;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  store_type?: string | null;
  category_name?: string | null;
  rating?: number | null;
  google_place_id?: string | null;
}

const MAP_IMPORT_CATEGORIES = [
  { value: "otel", label: "Oteller" },
  { value: "pansiyon", label: "Pansiyon" },
  { value: "arac", label: "Rent a Car" },
  { value: "tur", label: "Tur şirketleri" },
  { value: "vip", label: "VIP servis araçları" },
];

function HaritalardanImportTab() {
  const [rows, setRows] = useState<MapImportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [category, setCategory] = useState("otel");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [storeType, setStoreType] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(p), limit: "50", category });
    if (city.trim()) params.set("city", city.trim());
    if (q.trim()) params.set("q", q.trim());
    if (storeType.trim()) params.set("storeType", storeType.trim());
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/map-import/candidates?${params}`);
      const d = (await r.json().catch(() => ({}))) as {
        items?: MapImportRow[];
        total?: number;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setRows(Array.isArray(d.items) ? d.items : []);
      setTotal(Number(d.total) || 0);
      setPage(p);
      setSelected({});
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [category, city, q, storeType]);

  useEffect(() => { void load(1); }, [load]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected[r.id]);

  function toggleAll() {
    if (allOnPageSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.id] = true;
    setSelected(next);
  }

  async function runImport() {
    if (!selectedIds.length) {
      setResultMsg("En az bir işletme seçin.");
      return;
    }
    setImporting(true);
    setResultMsg(null);
    setError(null);
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/map-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapBusinessIds: selectedIds, category }),
      });
      const d = (await r.json().catch(() => ({}))) as {
        imported?: number;
        skipped?: number;
        errors?: string[];
        error?: string;
      };
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setResultMsg(
        `✓ ${d.imported ?? 0} işletme seyahat paneline aktarıldı · ${d.skipped ?? 0} atlandı` +
          (d.errors?.length ? ` · ${d.errors.slice(0, 2).join("; ")}` : ""),
      );
      void load(page);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <Download size={16} /> Haritalardan İçe Aktar
        </h3>
        <p className="text-xs text-emerald-900/85 mt-1 leading-relaxed">
          Keşfet / Haritalar&apos;daki işletmeleri tür, şehir ve kategoriye göre filtreleyin; çoklu seçimle
          turizm paneline çekin. Yinelenen kayıtlar <code className="text-[10px]">google_place_id</code> veya{" "}
          <code className="text-[10px]">slug</code> ile atlanır.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <Field label="Tür">
          <select className={sel} value={category} onChange={(e) => setCategory(e.target.value)}>
            {MAP_IMPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Şehir">
          <input className={inp} value={city} onChange={(e) => setCity(e.target.value)} placeholder="İstanbul" />
        </Field>
        <Field label="Arama">
          <input className={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşletme adı…" />
        </Field>
        <Field label="store_type (opsiyonel)">
          <input className={inp} value={storeType} onChange={(e) => setStoreType(e.target.value)} placeholder="turizm_otel" />
        </Field>
        <Btn onClick={() => void load(1)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">
          <Search size={14} /> Ara
        </Btn>
        <Btn
          onClick={() => void runImport()}
          disabled={importing || !selectedIds.length}
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {importing ? "Aktarılıyor…" : `Seyahate çek (${selectedIds.length})`}
        </Btn>
      </div>

      {resultMsg ? <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{resultMsg}</p> : null}
      {error ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p> : null}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-xs text-gray-600">
          <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 font-medium text-gray-700 hover:text-blue-600">
            {allOnPageSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            Sayfadaki tümünü seç ({rows.length})
          </button>
          <span>{total.toLocaleString("tr-TR")} aday · sayfa {page}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Bu filtreyle içe aktarılabilir işletme bulunamadı.</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
            {rows.map((row) => (
              <label key={row.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(selected[row.id])}
                  onChange={(e) => setSelected((s) => ({ ...s, [row.id]: e.target.checked }))}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-gray-900">{row.name || row.id}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {[row.city, row.district].filter(Boolean).join(" · ")}
                    {row.store_type ? ` · ${row.store_type}` : ""}
                    {row.category_name ? ` · ${row.category_name}` : ""}
                  </div>
                  {row.address ? <div className="text-xs text-gray-400 truncate">{row.address}</div> : null}
                </div>
                {row.rating ? (
                  <span className="text-xs text-amber-700 shrink-0">★ {Number(row.rating).toFixed(1)}</span>
                ) : null}
              </label>
            ))}
          </div>
        )}
        {total > 50 ? (
          <div className="flex justify-between items-center px-4 py-2 border-t bg-gray-50">
            <Btn disabled={page <= 1} onClick={() => void load(page - 1)} className="bg-white border text-gray-600">
              <ChevronLeft size={14} /> Önceki
            </Btn>
            <Btn disabled={page * 50 >= total} onClick={() => void load(page + 1)} className="bg-white border text-gray-600">
              Sonraki <ChevronRight size={14} />
            </Btn>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA
═══════════════════════════════════════════════════════════ */
type Tab = "firmalar" | "ilanlar" | "odalar" | "araclar" | "turlar" | "tekneler" | "villalar" | "destinasyonlar" | "rezervasyonlar" | "cms" | "haritalar-import";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "firmalar",  label: "Firmalar",    icon: <Building2 size={15} /> },
  { id: "haritalar-import", label: "Haritalardan İçe Aktar", icon: <Download size={15} /> },
  { id: "ilanlar",  label: "Oteller & İlanlar", icon: <Map size={15} /> },
  { id: "odalar",   label: "Odalar",      icon: <BedDouble size={15} /> },
  { id: "villalar", label: "Villalar",  icon: <Home size={15} /> },
  { id: "turlar",   label: "Turlar",      icon: <Map size={15} /> },
  { id: "araclar",  label: "Araçlar",     icon: <Car size={15} /> },
  { id: "tekneler", label: "Yatlar", icon: <Sailboat size={15} /> },
  { id: "destinasyonlar", label: "Destinasyonlar", icon: <Map size={15} /> },
  { id: "cms", label: "Kategori CMS", icon: <LayoutTemplate size={15} /> },
  { id: "rezervasyonlar", label: "Rezervasyonlar", icon: <Calendar size={15} /> },
];

export default function TurizmYonetimi() {
  const [tab, setTab] = useState<Tab>("firmalar");
  const [roomListing, setRoomListing] = useState<Listing | null>(null);

  const handleManageRooms = (l: Listing) => {
    setRoomListing(l);
    setTab("odalar");
  };

  return (
    <AdminLayout title="Turizm & Seyahat Yönetimi">
      <div className="space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "firmalar"  && <FirmalarTab />}
        {tab === "haritalar-import" && <HaritalardanImportTab />}
        {tab === "ilanlar"   && <IlanlarTab onManageRooms={handleManageRooms} />}
        {tab === "odalar"    && <OdalarTab initialListing={roomListing} />}
        {tab === "araclar"   && <SubItemsTab type="car" />}
        {tab === "turlar"    && <SubItemsTab type="tour" />}
        {tab === "tekneler"  && <SubItemsTab type="boat" />}
        {tab === "villalar"  && <SubItemsTab type="villa" />}
        {tab === "destinasyonlar" && <DestinasyonlarTab />}
        {tab === "cms" && <TurizmCmsAdminTab />}
        {tab === "rezervasyonlar" && <RezervasyonlarTab />}
      </div>
    </AdminLayout>
  );
}
