import { StubNotice } from "../otomotiv/components/OtomotivAdminUi";

export function SigortaApiAyarlariTab() {
  return (
    <div className="space-y-4">
      <StubNotice phase="Broker API Entegrasyonu — Faz 5">
        Sigorta broker API anahtarları burada yapılandırılacak. Canlı trafik/kasko teklifi yalnızca geçerli API
        anahtarları tanımlandığında açılır. Gerçek anahtarlar production secret store / env üzerinde tutulmalıdır.
      </StubNotice>
      <div className="rounded-xl border bg-white p-4 space-y-3 text-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Broker sağlayıcı</label>
          <select disabled className="w-full max-w-md border rounded-lg px-3 py-2 bg-gray-50 text-gray-500">
            <option>Seçin (entegrasyon sonrası)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">API Key (placeholder)</label>
          <input disabled placeholder="••••••••" className="w-full max-w-md border rounded-lg px-3 py-2 bg-gray-50" />
        </div>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" disabled checked readOnly className="rounded" />
          Sandbox modu
        </label>
      </div>
    </div>
  );
}
