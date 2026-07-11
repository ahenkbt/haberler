import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { VehicleBrand, VehicleModel } from "../otomotivAdminTypes";
import { VEHICLE_CLASSES } from "../otomotivAdminConfig";
import { Badge, Btn, Field, Modal, StubNotice, inp, sel } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

export function MarkaModelTab() {
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandModal, setBrandModal] = useState<null | "add" | VehicleBrand>(null);
  const [modelModal, setModelModal] = useState<null | "add">(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${ADMIN}/brands`);
      const data = (await res.json()) as { brands?: VehicleBrand[] };
      setBrands(Array.isArray(data.brands) ? data.brands : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async (brandId: number | null) => {
    const params = brandId ? `?brand_id=${brandId}` : "";
    const res = await apiFetch(`${ADMIN}/models${params}`);
    const data = (await res.json()) as { models?: VehicleModel[] };
    setModels(Array.isArray(data.models) ? data.models : []);
  }, []);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    void loadModels(selectedBrandId);
  }, [selectedBrandId, loadModels]);

  const saveBrand = async () => {
    if (brandModal === "add") {
      await apiFetch(`${ADMIN}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (brandModal && typeof brandModal === "object") {
      await apiFetch(`${ADMIN}/brands/${brandModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setBrandModal(null);
    void loadBrands();
  };

  const saveModel = async () => {
    if (!selectedBrandId) return;
    await apiFetch(`${ADMIN}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, brand_id: selectedBrandId }),
    });
    setModelModal(null);
    void loadModels(selectedBrandId);
  };

  const deleteBrand = async (b: VehicleBrand) => {
    if (!confirm(`"${b.name}" pasif edilsin mi?`)) return;
    await apiFetch(`${ADMIN}/brands/${b.id}`, { method: "DELETE" });
    void loadBrands();
  };

  return (
    <div className="space-y-4">
      <StubNotice phase="Veri motoru — Marka / Model / Nesil (Phase 1 iskelet)">
        TecDoc benzeri marka-model- nesil-motor şeması Phase 4&apos;te genişletilecek. Şimdilik master CRUD.
      </StubNotice>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-semibold text-gray-600">Araç Markaları</span>
            <div className="flex gap-1">
              <Btn onClick={() => void loadBrands()} className="bg-white border text-gray-600 text-xs"><RefreshCw size={12} /></Btn>
              <Btn
                onClick={() => {
                  setForm({ name: "", vehicle_class: "otomobil", country: "" });
                  setBrandModal("add");
                }}
                className="bg-[#1e3a5f] text-white text-xs"
              >
                <Plus size={12} /> Marka
              </Btn>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y">
            {loading ? <p className="p-4 text-sm text-gray-500">Yükleniyor…</p> : null}
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrandId(b.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 ${
                  selectedBrandId === b.id ? "bg-blue-50" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-sm">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.vehicle_class} · {b.country || "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!b.is_active ? <Badge status="inactive" /> : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm({ name: b.name, vehicle_class: b.vehicle_class, country: b.country || "" });
                      setBrandModal(b);
                    }}
                    className="px-2 py-1 text-xs border rounded-lg bg-white text-gray-600"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteBrand(b);
                    }}
                    className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
            <span className="text-xs font-semibold text-gray-600">
              Modeller {selectedBrandId ? `— ${brands.find((b) => b.id === selectedBrandId)?.name ?? ""}` : ""}
            </span>
            <Btn
              onClick={() => {
                setForm({ name: "", year_from: "", year_to: "" });
                setModelModal("add");
              }}
              disabled={!selectedBrandId}
              className="bg-[#1e3a5f] text-white text-xs disabled:opacity-40"
            >
              <Plus size={12} /> Model
            </Btn>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y">
            {!selectedBrandId ? (
              <p className="p-4 text-sm text-gray-500">Sol listeden marka seçin.</p>
            ) : models.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Bu marka için model yok.</p>
            ) : (
              models.map((m) => (
                <div key={m.id} className="px-4 py-2.5">
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.year_from || "?"} — {m.year_to || "günümüz"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {brandModal ? (
        <Modal title={brandModal === "add" ? "Marka Ekle" : "Marka Düzenle"} onClose={() => setBrandModal(null)}>
          <div className="space-y-3">
            <Field label="Marka adı"><input className={inp} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Araç sınıfı">
              <select className={sel} value={form.vehicle_class || "otomobil"} onChange={(e) => setForm({ ...form, vehicle_class: e.target.value })}>
                {VEHICLE_CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Ülke"><input className={inp} value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setBrandModal(null)} className="bg-gray-100">İptal</Btn>
              <Btn onClick={() => void saveBrand()} className="bg-[#1e3a5f] text-white">Kaydet</Btn>
            </div>
          </div>
        </Modal>
      ) : null}

      {modelModal ? (
        <Modal title="Model Ekle" onClose={() => setModelModal(null)}>
          <div className="space-y-3">
            <Field label="Model adı"><input className={inp} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Yıl başlangıç"><input className={inp} type="number" value={form.year_from || ""} onChange={(e) => setForm({ ...form, year_from: e.target.value })} /></Field>
              <Field label="Yıl bitiş"><input className={inp} type="number" value={form.year_to || ""} onChange={(e) => setForm({ ...form, year_to: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setModelModal(null)} className="bg-gray-100">İptal</Btn>
              <Btn onClick={() => void saveModel()} className="bg-[#1e3a5f] text-white">Kaydet</Btn>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
