import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Save, RefreshCw, Search, Sailboat } from "lucide-react";
import type {
  YachtExtraService,
  YachtFaqItem,
  YachtFeatureCategory,
  YachtListingExtras,
} from "@/themes/turizm/lib/yatportListing";

const TOURISM_ADMIN = apiUrl("/api/tourism/admin");

type YachtListItem = {
  id: string;
  name: string;
  slug: string;
  city?: string;
  district?: string;
  extras_id?: number | null;
  saatlik_fiyat?: string | null;
};

function emptyExtras(): YachtListingExtras {
  return {
    kaptanli: true,
    kabinSayisi: null,
    yatakSayisi: null,
    wcSayisi: null,
    uzunlukM: null,
    yapimYili: null,
    ilanNo: null,
    featureCategories: [],
    sunulanHizmetler: [],
    ekstraHizmetler: [],
    teknikDetaylar: {},
    limanlar: [],
    faqItems: [],
    saatlikFiyat: null,
    gunlukFiyat: null,
    minSureSaat: 2,
    kdvDahil: true,
    kaporaOrani: null,
    rentalTypeDefault: "saatlik",
    relatedMapBusinessIds: [],
    cancellationPolicy: null,
  };
}

export function YatYonetimiAdminTab() {
  const [items, setItems] = useState<YachtListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extras, setExtras] = useState<YachtListingExtras>(emptyExtras());
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/yacht-extras?q=${encodeURIComponent(search)}&limit=40`);
      const d = await r.json();
      if (r.ok) {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function loadDetail(mapBusinessId: string) {
    setSelectedId(mapBusinessId);
    setMsg(null);
    const r = await apiFetch(`${TOURISM_ADMIN}/yacht-extras/${mapBusinessId}`);
    const d = await r.json();
    if (!r.ok) {
      setMsg({ type: "err", text: d.error || "Yüklenemedi" });
      return;
    }
    setBusinessName(String(d.business?.name ?? ""));
    setExtras({ ...emptyExtras(), ...(d.extras ?? {}) });
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await apiFetch(`${TOURISM_ADMIN}/yacht-extras/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extras),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg({ type: "ok", text: "Kaydedildi" });
        void loadList();
      } else {
        setMsg({ type: "err", text: d.error || "Kayıt başarısız" });
      }
    } finally {
      setSaving(false);
    }
  }

  function updateFeatureCat(idx: number, patch: Partial<YachtFeatureCategory>) {
    setExtras((e) => {
      const cats = [...(e.featureCategories ?? [])];
      cats[idx] = { ...cats[idx], ...patch };
      return { ...e, featureCategories: cats };
    });
  }

  function addFeatureCat() {
    setExtras((e) => ({
      ...e,
      featureCategories: [...(e.featureCategories ?? []), { category: "Yeni Kategori", items: [] }],
    }));
  }

  function addFaq() {
    setExtras((e) => ({
      ...e,
      faqItems: [...(e.faqItems ?? []), { question: "", answer: "" }],
    }));
  }

  function addExtraService() {
    setExtras((e) => ({
      ...e,
      ekstraHizmetler: [...(e.ekstraHizmetler ?? []), { name: "", pricePerPerson: 0, description: "" }],
    }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sailboat className="text-cyan-600" />
          <h2 className="font-bold text-gray-900">Yat İlanları ({total})</h2>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          />
          <button type="button" className="px-3 py-2 bg-cyan-600 text-white rounded-lg" onClick={() => setSearch(q)}>
            <Search size={16} />
          </button>
          <button type="button" className="px-3 py-2 border rounded-lg" onClick={() => void loadList()}>
            <RefreshCw size={16} />
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Yükleniyor…</p>
        ) : (
          <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedId === item.id ? "bg-cyan-50 border border-cyan-200 text-cyan-900" : "hover:bg-gray-50"}`}
                >
                  <strong className="block truncate">{item.name}</strong>
                  <span className="text-xs text-gray-500">
                    {[item.district, item.city].filter(Boolean).join(", ")}
                    {item.extras_id ? " · düzenlendi" : " · yatport"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
        {!selectedId ? (
          <p className="text-gray-500 text-sm">Düzenlemek için soldan bir tekne seçin.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{businessName}</h3>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                <Save size={16} /> {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
            {msg ? (
              <p className={`text-sm mb-3 ${msg.type === "ok" ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>
            ) : null}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                ["ilanNo", "İlan No", "text"],
                ["yapimYili", "Yapım Yılı", "number"],
                ["kabinSayisi", "Kabin", "number"],
                ["wcSayisi", "WC", "number"],
                ["uzunlukM", "Uzunluk (m)", "number"],
                ["yatakSayisi", "Yatak", "number"],
                ["saatlikFiyat", "Saatlik ₺", "number"],
                ["gunlukFiyat", "Günlük ₺", "number"],
                ["minSureSaat", "Min Süre (saat)", "number"],
                ["kaporaOrani", "Kapora %", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs font-semibold text-gray-600">
                  {label}
                  <input
                    type={type}
                    className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm font-normal text-gray-900"
                    value={String((extras as Record<string, unknown>)[key] ?? "")}
                    onChange={(e) =>
                      setExtras((ex) => ({
                        ...ex,
                        [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={extras.kaptanli !== false}
                onChange={(e) => setExtras((ex) => ({ ...ex, kaptanli: e.target.checked }))}
              />
              Kaptanlı kiralama
            </label>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={extras.kdvDahil !== false}
                onChange={(e) => setExtras((ex) => ({ ...ex, kdvDahil: e.target.checked }))}
              />
              KDV dahil
            </label>

            <label className="block text-xs font-semibold text-gray-600 mb-4">
              Limanlar (virgülle)
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm font-normal"
                value={(extras.limanlar ?? []).join(", ")}
                onChange={(e) =>
                  setExtras((ex) => ({
                    ...ex,
                    limanlar: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>

            <label className="block text-xs font-semibold text-gray-600 mb-4">
              Sunulan Hizmetler (virgülle)
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm font-normal"
                value={(extras.sunulanHizmetler ?? []).join(", ")}
                onChange={(e) =>
                  setExtras((ex) => ({
                    ...ex,
                    sunulanHizmetler: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Özellik Kategorileri</h4>
                <button type="button" className="text-xs text-cyan-700 font-semibold" onClick={addFeatureCat}>
                  + Kategori
                </button>
              </div>
              {(extras.featureCategories ?? []).map((cat, idx) => (
                <div key={idx} className="mb-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm mb-1"
                    value={cat.category}
                    onChange={(e) => updateFeatureCat(idx, { category: e.target.value })}
                  />
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={2}
                    placeholder="Özellikler (satır başına bir)"
                    value={cat.items.join("\n")}
                    onChange={(e) =>
                      updateFeatureCat(idx, {
                        items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Ekstra Hizmetler</h4>
                <button type="button" className="text-xs text-cyan-700 font-semibold" onClick={addExtraService}>
                  + Hizmet
                </button>
              </div>
              {(extras.ekstraHizmetler ?? []).map((ex, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="Ad"
                    value={ex.name}
                    onChange={(e) => {
                      const list = [...(extras.ekstraHizmetler ?? [])];
                      list[idx] = { ...list[idx], name: e.target.value };
                      setExtras((x) => ({ ...x, ekstraHizmetler: list }));
                    }}
                  />
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="₺/kişi"
                    value={ex.pricePerPerson || ""}
                    onChange={(e) => {
                      const list = [...(extras.ekstraHizmetler ?? [])];
                      list[idx] = { ...list[idx], pricePerPerson: Number(e.target.value) || 0 };
                      setExtras((x) => ({ ...x, ekstraHizmetler: list }));
                    }}
                  />
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="Açıklama"
                    value={ex.description ?? ""}
                    onChange={(e) => {
                      const list = [...(extras.ekstraHizmetler ?? [])];
                      list[idx] = { ...list[idx], description: e.target.value };
                      setExtras((x) => ({ ...x, ekstraHizmetler: list }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">SSS (FAQ)</h4>
                <button type="button" className="text-xs text-cyan-700 font-semibold" onClick={addFaq}>
                  + Soru
                </button>
              </div>
              {(extras.faqItems ?? []).map((faq, idx) => (
                <div key={idx} className="mb-2 p-3 bg-gray-50 rounded-lg space-y-1">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Soru"
                    value={faq.question}
                    onChange={(e) => {
                      const list = [...(extras.faqItems ?? [])] as YachtFaqItem[];
                      list[idx] = { ...list[idx], question: e.target.value };
                      setExtras((x) => ({ ...x, faqItems: list }));
                    }}
                  />
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={2}
                    placeholder="Cevap"
                    value={faq.answer}
                    onChange={(e) => {
                      const list = [...(extras.faqItems ?? [])] as YachtFaqItem[];
                      list[idx] = { ...list[idx], answer: e.target.value };
                      setExtras((x) => ({ ...x, faqItems: list }));
                    }}
                  />
                </div>
              ))}
            </div>

            <label className="block text-xs font-semibold text-gray-600">
              İptal / kapora politikası
              <textarea
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm font-normal"
                rows={2}
                value={extras.cancellationPolicy ?? ""}
                onChange={(e) => setExtras((ex) => ({ ...ex, cancellationPolicy: e.target.value }))}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export default YatYonetimiAdminTab;
