import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { OtomotivAppointmentSlot, OtomotivService } from "../otomotivAdminTypes";
import { Badge, Btn, StubNotice, MarketplaceDisclaimer } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

export function RandevuHizmetTab() {
  const [services, setServices] = useState<OtomotivService[]>([]);
  const [slots, setSlots] = useState<OtomotivAppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"services" | "slots">("services");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, slotRes] = await Promise.all([
        apiFetch(`${ADMIN}/services`),
        apiFetch(`${ADMIN}/appointment-slots`),
      ]);
      const svcData = (await svcRes.json()) as { services?: OtomotivService[] };
      const slotData = (await slotRes.json()) as { slots?: OtomotivAppointmentSlot[] };
      setServices(Array.isArray(svcData.services) ? svcData.services : []);
      setSlots(Array.isArray(slotData.slots) ? slotData.slots : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />
      <StubNotice phase="Akıllı Randevu — Faz 4">
        Servis, yıkama, lastik montaj: gerçek zamanlı müsaitlik takvimi, hizmet seçimi + fiyat listesi, plaka bazlı hatırlatmalar (muayene, yağ değişimi km).
        SaaS abonelik modeli servis/yıkama işletmeleri için. Randevu ödemesi / kapora işletmenin kendi sürecinde.
      </StubNotice>
      <div className="flex gap-2">
        <Btn onClick={() => setView("services")} className={view === "services" ? "bg-[#1e3a5f] text-white" : "bg-white border text-gray-600"}>Hizmetler</Btn>
        <Btn onClick={() => setView("slots")} className={view === "slots" ? "bg-[#1e3a5f] text-white" : "bg-white border text-gray-600"}>Randevu Slotları</Btn>
        <Btn onClick={() => void load()} className="bg-white border text-gray-600 ml-auto"><RefreshCw size={14} /></Btn>
      </div>

      {view === "services" ? (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Hizmet</th>
                <th className="px-3 py-2">İşletme</th>
                <th className="px-3 py-2">Süre</th>
                <th className="px-3 py-2">Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Henüz hizmet tanımı yok.</td></tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2">{s.business_name}</td>
                    <td className="px-3 py-2">{s.duration_minutes ? `${s.duration_minutes} dk` : "—"}</td>
                    <td className="px-3 py-2">{s.price ? `${s.price} ₺` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Saat</th>
                <th className="px-3 py-2">Kapasite</th>
                <th className="px-3 py-2">Dolu</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
              ) : slots.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Henüz randevu slotu yok.</td></tr>
              ) : (
                slots.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.slot_date}</td>
                    <td className="px-3 py-2">{s.slot_time}</td>
                    <td className="px-3 py-2">{s.capacity}</td>
                    <td className="px-3 py-2">{s.booked_count}</td>
                    <td className="px-3 py-2"><Badge status={s.is_available ? "active" : "inactive"} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
