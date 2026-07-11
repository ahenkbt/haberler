import { useState } from "react";
import { Key, Megaphone, Percent, Shield, Users, Inbox } from "lucide-react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { MarketplaceDisclaimer } from "./otomotiv/components/OtomotivAdminUi";
import { SigortaApiAyarlariTab } from "./sigorta/SigortaApiAyarlariTab";
import { SigortaAcenteOnayTab } from "./sigorta/SigortaAcenteOnayTab";
import { SigortaKomisyonTab } from "./sigorta/SigortaKomisyonTab";
import { SigortaKampanyaTab } from "./sigorta/SigortaKampanyaTab";
import { SigortaLeadlerTab } from "./sigorta/SigortaLeadlerTab";
import { OTOMOTIV } from "@/themes/otomotiv/otomotivRoutes";

type Tab = "leads" | "api" | "acente" | "komisyon" | "kampanya";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "leads", label: "Leadler", icon: <Inbox size={15} /> },
  { id: "api", label: "Broker API", icon: <Key size={15} /> },
  { id: "acente", label: "Acente Onay", icon: <Users size={15} /> },
  { id: "komisyon", label: "Komisyon", icon: <Percent size={15} /> },
  { id: "kampanya", label: "Çapraz Kampanya", icon: <Megaphone size={15} /> },
];

/** /admin/sigorta — Trafik & Kasko lead yönetimi (Faz 5 iskelet) */
export default function SigortaYonetimi() {
  const [tab, setTab] = useState<Tab>("leads");

  return (
    <AdminLayout title="Sigorta Yönetimi (Trafik & Kasko)">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-[#1e3a5f]/20 bg-gradient-to-r from-slate-50 to-blue-50/50 px-4 py-3">
          <Shield className="w-5 h-5 text-[#1e3a5f] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900">Otomotiv Sigorta — Faz 5</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Lead yönlendirme ve acente listeleme. Poliçe düzenleme ve ödeme lisanslı acente ile yapılır; Yekpare sigortacı değildir.
              Canlı teklif motoru broker API entegrasyonu sonrası açılır.
            </p>
            <Link href={OTOMOTIV.admin} className="text-xs text-[#1e3a5f] underline mt-1 inline-block">
              ← Otomotiv ekosistemi yönetimi
            </Link>
          </div>
        </div>

        <MarketplaceDisclaimer />

        <aside className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
          <strong>Sigorta disclaimer:</strong> Ödeme ve poliçe işlemi listelenen lisanslı sigorta acentesi / sigorta firması ile yapılır.
          Yekpare yalnızca listeleme ve lead iletimi sağlar.
        </aside>

        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? "border-[#1e3a5f] text-[#1e3a5f]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "leads" && <SigortaLeadlerTab />}
        {tab === "api" && <SigortaApiAyarlariTab />}
        {tab === "acente" && <SigortaAcenteOnayTab />}
        {tab === "komisyon" && <SigortaKomisyonTab />}
        {tab === "kampanya" && <SigortaKampanyaTab />}
      </div>
    </AdminLayout>
  );
}
