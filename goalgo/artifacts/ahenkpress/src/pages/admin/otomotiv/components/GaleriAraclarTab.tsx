import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { OtomotivBusiness, OtomotivListing, VehicleBrand, VehicleModel } from "../otomotivAdminTypes";
import { Badge, Btn, Field, Modal, MarketplaceDisclaimer, inp, sel } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

type ListingForm = {
  business_id: string;
  title: string;
  slug: string;
  brand_id: string;
  model_id: string;
  year: string;
  km: string;
  fuel: string;
  transmission: string;
  price: string;
  is_zero_km: boolean;
  status: string;
  is_featured: boolean;
  description: string;
};

const emptyForm = (): ListingForm => ({
  business_id: "",
  title: "",
  slug: "",
  brand_id: "",
  model_id: "",
  year: "",
  km: "",
  fuel: "",
  transmission: "",
  price: "",
  is_zero_km: false,
  status: "active",
  is_featured: false,
  description: "",
});

export function GaleriAraclarTab() {
  const [listings, setListings] = useState<OtomotivListing[]>([]);
  const [businesses, setBusinesses] = useState<OtomotivBusiness[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "add" | OtomotivListing>(null);
  const [form, setForm] = useState<ListingForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, bizRes, brandRes] = await Promise.all([
        apiFetch(`${ADMIN}/listings?kind=vehicle`),
        apiFetch(`${ADMIN}/businesses?business_type=galeri&limit=200`),
        apiFetch(`${ADMIN}/brands`),
      ]);
      const listData = (await listRes.json()) as { listings?: OtomotivListing[] };
      const bizData = (await bizRes.json()) as { businesses?: OtomotivBusiness[] };
      const brandData = (await brandRes.json()) as { brands?: VehicleBrand[] };
      setListings(Array.isArray(listData.listings) ? listData.listings : []);
      setBusinesses(Array.isArray(bizData.businesses) ? bizData.businesses : []);
      setBrands(Array.isArray(brandData.brands) ? brandData.brands : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!form.brand_id) {
      setModels([]);
      return;
    }
    void apiFetch(`${ADMIN}/models?brand_id=${form.brand_id}`)
      .then((r) => r.json())
      .then((d: { models?: VehicleModel[] }) => setModels(Array.isArray(d.models) ? d.models : []))
      .catch(() => setModels([]));
  }, [form.brand_id]);

  const openAdd = () => {
    setForm(emptyForm());
    setModal("add");
  };

  const openEdit = (l: OtomotivListing) => {
    setForm({
      business_id: String(l.business_id),
      title: l.title,
      slug: l.slug,
      brand_id: l.brand_id ? String(l.brand_id) : "",
      model_id: l.model_id ? String(l.model_id) : "",
      year: l.year ? String(l.year) : "",
      km: l.km ? String(l.km) : "",
      fuel: l.fuel ?? "",
      transmission: l.transmission ?? "",
      price: l.price ? String(l.price) : "",
      is_zero_km: l.is_zero_km,
      status: l.status,
      is_featured: l.is_featured,
      description: "",
    });
    setModal(l);
  };

  const save = async () => {
    if (!form.business_id || !form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        business_id: parseInt(form.business_id, 10),
        listing_kind: "vehicle",
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        brand_id: form.brand_id ? parseInt(form.brand_id, 10) : null,
        model_id: form.model_id ? parseInt(form.model_id, 10) : null,
        year: form.year ? parseInt(form.year, 10) : null,
        km: form.km ? parseInt(form.km, 10) : null,
        fuel: form.fuel || null,
        transmission: form.transmission || null,
        price: form.price || null,
        is_zero_km: form.is_zero_km,
        status: form.status,
        is_featured: form.is_featured,
        description: form.description || null,
      };
      if (modal === "add") {
        await apiFetch(`${ADMIN}/listings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else if (modal) {
        await apiFetch(`${ADMIN}/listings/${modal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (l: OtomotivListing) => {
    if (!confirm(`"${l.title}" ilanını silmek istediğinize emin misiniz?`)) return;
    await apiFetch(`${ADMIN}/listings/${l.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Galeri araç ilanları — public /otomotiv/galeri listesinde görünür.</p>
        <div className="flex gap-2">
          <Btn onClick={() => void load()} className="bg-white border text-gray-600"><RefreshCw size={14} /> Yenile</Btn>
          <Btn onClick={openAdd} className="bg-[#1e3a5f] text-white"><Plus size={14} /> İlan Ekle</Btn>
        </div>
      </div>
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">İlan</th>
              <th className="px-3 py-2">İşletme</th>
              <th className="px-3 py-2">Marka/Model</th>
              <th className="px-3 py-2">Yıl/Km</th>
              <th className="px-3 py-2">Fiyat</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : listings.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Henüz araç ilanı yok.</td></tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{l.title}</td>
                  <td className="px-3 py-2 text-gray-600">{l.business_name}</td>
                  <td className="px-3 py-2">{l.brand_name} {l.model_name}</td>
                  <td className="px-3 py-2">{l.year || "—"} / {l.km?.toLocaleString("tr-TR") ?? "—"} km</td>
                  <td className="px-3 py-2">{l.price ? `${l.price} ₺` : "—"}</td>
                  <td className="px-3 py-2"><Badge status={l.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Btn onClick={() => openEdit(l)} className="text-xs px-2 py-1 bg-white border">Düzenle</Btn>
                      <Btn onClick={() => void del(l)} className="text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-200"><Trash2 size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal ? (
        <Modal title={modal === "add" ? "Araç İlanı Ekle" : "İlan Düzenle"} onClose={() => setModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Galeri / İşletme *">
              <select className={sel} value={form.business_id} onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))}>
                <option value="">Seçin</option>
                {businesses.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Başlık *">
              <input className={inp} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Slug">
              <input className={inp} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="otomatik" />
            </Field>
            <Field label="Marka">
              <select className={sel} value={form.brand_id} onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value, model_id: "" }))}>
                <option value="">—</option>
                {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select className={sel} value={form.model_id} onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))} disabled={!form.brand_id}>
                <option value="">—</option>
                {models.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Yıl">
              <input className={inp} type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </Field>
            <Field label="Km">
              <input className={inp} type="number" value={form.km} onChange={(e) => setForm((f) => ({ ...f, km: e.target.value }))} />
            </Field>
            <Field label="Yakıt">
              <input className={inp} value={form.fuel} onChange={(e) => setForm((f) => ({ ...f, fuel: e.target.value }))} />
            </Field>
            <Field label="Vites">
              <input className={inp} value={form.transmission} onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value }))} />
            </Field>
            <Field label="Fiyat (₺)">
              <input className={inp} type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </Field>
            <Field label="Durum">
              <select className={sel} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktif</option>
                <option value="draft">Taslak</option>
                <option value="sold">Satıldı</option>
                <option value="inactive">Pasif</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.is_zero_km} onChange={(e) => setForm((f) => ({ ...f, is_zero_km: e.target.checked }))} />
              Sıfır km
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
              Öne çıkan
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn onClick={() => setModal(null)} className="bg-white border">İptal</Btn>
            <Btn onClick={() => void save()} disabled={saving} className="bg-[#1e3a5f] text-white">{saving ? "Kaydediliyor…" : "Kaydet"}</Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
