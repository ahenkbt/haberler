import { StubNotice } from "../otomotiv/components/OtomotivAdminUi";

export function SigortaKomisyonTab() {
  return (
    <div className="space-y-4">
      <StubNotice phase="Komisyon / Hakediş — iş planı stub">
        Partner acente komisyon oranları ve hakediş raporları burada yapılandırılacak. Yekpare poliçe satmaz;
        komisyon modeli yalnızca lead yönlendirme ve listeleme aboneliği kapsamındadır — gerçek tahsilat acentede.
      </StubNotice>
      <div className="rounded-xl border bg-white p-4 max-w-md space-y-3 text-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Varsayılan komisyon oranı (%)</label>
          <input disabled placeholder="—" className="w-full border rounded-lg px-3 py-2 bg-gray-50" />
        </div>
        <p className="text-xs text-gray-500">Acente bazlı override ve dönemsel hakediş raporu Faz 5.2 ile eklenecek.</p>
      </div>
    </div>
  );
}
