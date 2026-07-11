import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, Search } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { OtomotivBusiness } from "../otomotivAdminTypes";
import {
  OTOMOTIV_BUSINESS_TYPES,
  OTOMOTIV_SERVIS_CATEGORY_OPTIONS,
  businessTypeEmoji,
  businessTypeLabel,
} from "../otomotivAdminConfig";
import { Badge, Btn, Field, Modal, MarketplaceDisclaimer, inp, sel } from "./OtomotivAdminUi";
import { BusinessTypeDetailPanel } from "./BusinessTypeDetailPanel";

const ADMIN = apiUrl("/api/otomotiv/admin");

type Props = {
  onSelectBusiness?: (b: OtomotivBusiness | null) => void;
  selectedBusinessId?: number | null;
};

export function FirmalarTab({ onSelectBusiness, selectedBusinessId }: Props) {
  const [businesses, setBusinesses] = useState<OtomotivBusiness[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<null | "add" | OtomotivBusiness>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [detailBusiness, setDetailBusiness] = useState<OtomotivBusiness | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "100" });
    if (businessType) params.set("business_type", businessType);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    try {
      const res = await apiFetch(`${ADMIN}/businesses?${params}`);
      const data = (await res.json()) as { businesses?: OtomotivBusiness[]; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Firmalar alınamadı");
      setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setBusinesses([]);
      setTotal(0);
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, [businessType, status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setForm({ name: "", business_type: "galeri", servis_category_slug: "", city: "", district: "", phone: "", email: "", description: "" });
    setModal("add");
  };

  const openEdit = (b: OtomotivBusiness) => {
    setForm({
      name: b.name,
      business_type: b.business_type,
      servis_category_slug: b.servis_category_slug || "",
      city: b.city || "",
      district: b.district || "",
      phone: b.phone || "",
      email: b.email || "",
      description: b.description || "",
      status: b.status,
    });
    setModal(b);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === "add") {
        await apiFetch(`${ADMIN}/businesses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else if (modal && typeof modal === "object") {
        await apiFetch(`${ADMIN}/businesses/${modal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setModal(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (b: OtomotivBusiness) => {
    if (!confirm(`"${b.name}" pasif hale getirilsin mi?`)) return;
    await apiFetch(`${ADMIN}/businesses/${b.id}`, { method: "DELETE" });
    if (detailBusiness?.id === b.id) setDetailBusiness(null);
    void load();
  };

  const selectForDetail = (b: OtomotivBusiness) => {
    setDetailBusiness(b);
    onSelectBusiness?.(b);
  };

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="İşletme türü">
          <select className={sel} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            <option value="">Tümü</option>
            {OTOMOTIV_BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Durum">
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="pending">Bekliyor</option>
            <option value="inactive">Pasif</option>
          </select>
        </Field>
        <Field label="Ara">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input className={`${inp} pl-9 min-w-[200px]`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad veya şehir" />
          </div>
        </Field>
        <Btn onClick={() => void load()} className="bg-white border text-gray-600">
          <RefreshCw size={14} /> Yenile
        </Btn>
        <Btn onClick={openAdd} className="bg-[#1e3a5f] text-white ml-auto">
          <Plus size={14} /> İşletme Ekle
        </Btn>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 border rounded-xl overflow-hidden bg-white">
          <div className="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-500">
            {loading ? "Yükleniyor…" : `${total} işletme`}
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y">
            {businesses.length === 0 && !loading ? (
              <p className="p-6 text-sm text-gray-500 text-center">Henüz otomotiv işletmesi yok. Haritalardan içe aktarın veya manuel ekleyin.</p>
            ) : null}
            {businesses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => selectForDetail(b)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                  (detailBusiness?.id ?? selectedBusinessId) === b.id ? "bg-blue-50 border-l-4 border-[#1e3a5f]" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{businessTypeEmoji(b.business_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500">{businessTypeLabel(b.business_type)} · {b.city || "—"}</p>
                    <div className="mt-1"><Badge status={b.status} /></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {detailBusiness ? (
            <BusinessTypeDetailPanel
              business={detailBusiness}
              onClose={() => setDetailBusiness(null)}
              onEdit={() => openEdit(detailBusiness)}
              onDelete={() => void del(detailBusiness)}
              onRefresh={() => void load()}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-gray-700">İşletme seçin</p>
              <p className="text-sm text-gray-500 mt-1">Türe özel sekmeler (araçlar, ürünler, randevu vb.) burada açılır.</p>
            </div>
          )}
        </div>
      </div>

      {modal ? (
        <Modal title={modal === "add" ? "Otomotiv İşletmesi Ekle" : "İşletme Düzenle"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="İşletme türü *">
              <select
                className={sel}
                value={form.business_type || "galeri"}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              >
                {OTOMOTIV_BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.emoji} {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </Field>
            {form.business_type === "servis" ? (
              <Field label="Servis uzmanlığı *">
                <select
                  className={sel}
                  value={form.servis_category_slug || ""}
                  onChange={(e) => setForm({ ...form, servis_category_slug: e.target.value })}
                >
                  <option value="">Seçin…</option>
                  {OTOMOTIV_SERVIS_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.slug} value={opt.slug}>
                      {opt.groupName} → {opt.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Ad *">
              <input className={inp} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Şehir"><input className={inp} value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="İlçe"><input className={inp} value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon"><input className={inp} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="E-posta"><input className={inp} value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <Field label="Açıklama"><textarea className={inp} rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            {modal !== "add" ? (
              <Field label="Durum">
                <select className={sel} value={form.status || "pending"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Bekliyor</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </Field>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Btn onClick={() => setModal(null)} className="bg-gray-100 text-gray-700">İptal</Btn>
              <Btn onClick={() => void save()} disabled={saving || !form.name?.trim() || (form.business_type === "servis" && !form.servis_category_slug)} className="bg-[#1e3a5f] text-white">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Btn>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
