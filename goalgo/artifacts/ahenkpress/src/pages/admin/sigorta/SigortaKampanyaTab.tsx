import { StubNotice } from "../otomotiv/components/OtomotivAdminUi";

const SAMPLE_CAMPAIGNS = [
  { id: "kasko-yikama", title: "Kasko + Detay Yıkama", status: "Taslak" },
  { id: "trafik-servis", title: "Trafik Sigortası + Periyodik Bakım", status: "Taslak" },
];

export function SigortaKampanyaTab() {
  return (
    <div className="space-y-4">
      <StubNotice phase="Çapraz Pazarlama Sihirbazı — Faz 5">
        Kasko + yıkama, trafik + servis gibi anlaşmalı işletme kampanyaları. Yalnızca yönlendirme; ödeme ilgili firmada.
      </StubNotice>
      <ul className="space-y-2">
        {SAMPLE_CAMPAIGNS.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm">
            <span className="font-medium">{c.title}</span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{c.status}</span>
          </li>
        ))}
      </ul>
      <button type="button" disabled className="text-sm text-gray-400 cursor-not-allowed">
        + Yeni kampanya (yakında)
      </button>
    </div>
  );
}
