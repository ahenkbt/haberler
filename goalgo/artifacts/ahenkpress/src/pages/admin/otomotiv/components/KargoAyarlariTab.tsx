import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { OtomotivBusiness } from "../otomotivAdminTypes";
import { Btn, Field, StubNotice, MarketplaceDisclaimer, inp } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

export function KargoAyarlariTab() {
  const [businesses, setBusinesses] = useState<OtomotivBusiness[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settingsJson, setSettingsJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${ADMIN}/cargo-settings`);
      const data = (await res.json()) as { businesses?: OtomotivBusiness[] };
      const list = Array.isArray(data.businesses) ? data.businesses : [];
      setBusinesses(list);
      if (list[0] && !selectedId) {
        setSelectedId(list[0].id);
        setSettingsJson(JSON.stringify(list[0].cargo_settings_json ?? {}, null, 2));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectBusiness = (b: OtomotivBusiness) => {
    setSelectedId(b.id);
    setSettingsJson(JSON.stringify(b.cargo_settings_json ?? {
      provider: "geliver",
      carriers: ["yurtici", "aras", "mng"],
      desi_calculation: true,
      free_shipping_threshold_try: null,
    }, null, 2));
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(settingsJson) as Record<string, unknown>;
      await apiFetch(`${ADMIN}/cargo-settings/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      void load();
    } catch {
      alert("Geçersiz JSON veya kayıt hatası.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />
      <StubNotice phase="Parça Listeleme Kargo — Faz 3">
        Desi bazlı Yurtiçi, Aras, MNG — mevcut Geliver entegrasyonu ile birleştirilecek (işletme kargo ayarı).
        Parçacı abonelik / listeleme paketi gelir modeli; satış ödemesi işletmede.
      </StubNotice>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border rounded-xl bg-white overflow-hidden lg:col-span-1">
          <div className="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-600">Parçacı İşletmeler</div>
          <div className="max-h-[360px] overflow-y-auto divide-y">
            {loading ? <p className="p-4 text-sm text-gray-500">Yükleniyor…</p> : null}
            {businesses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBusiness(b)}
                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 ${selectedId === b.id ? "bg-blue-50" : ""}`}
              >
                <p className="font-semibold text-sm">{b.name}</p>
                <p className="text-xs text-gray-500">{b.business_type}</p>
              </button>
            ))}
            {!loading && businesses.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Yedek/çıkma parçacı işletmesi yok.</p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <Field label="Kargo ayarları (JSON)" hint="provider, carriers, desi_calculation, free_shipping_threshold_try">
            <textarea
              className={`${inp} font-mono text-xs min-h-[240px]`}
              value={settingsJson}
              onChange={(e) => setSettingsJson(e.target.value)}
              disabled={!selectedId}
            />
          </Field>
          <Btn onClick={() => void save()} disabled={!selectedId || saving} className="bg-[#1e3a5f] text-white">
            <Save size={14} /> {saving ? "Kaydediliyor…" : "Kaydet"}
          </Btn>
          <Btn onClick={() => void load()} className="bg-white border text-gray-600"><RefreshCw size={14} /></Btn>
        </div>
      </div>
    </div>
  );
}
