import { useState } from "react";
import {
  Building2,
  Car,
  Download,
  Layers,
  Package,
  Calendar,
  Truck,
  Settings2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { FirmalarTab } from "./otomotiv/components/FirmalarTab";
import { HaritalardanImportTab } from "./otomotiv/components/HaritalardanImportTab";
import { MarkaModelTab } from "./otomotiv/components/MarkaModelTab";
import { GaleriAraclarTab } from "./otomotiv/components/GaleriAraclarTab";
import { ParcaUrunlerTab } from "./otomotiv/components/ParcaUrunlerTab";
import { RandevuHizmetTab } from "./otomotiv/components/RandevuHizmetTab";
import { KargoAyarlariTab } from "./otomotiv/components/KargoAyarlariTab";
import { MarketplaceDisclaimer } from "./otomotiv/components/OtomotivAdminUi";

type Tab =
  | "firmalar"
  | "haritalar-import"
  | "marka-model"
  | "galeri-araclar"
  | "parca-urunler"
  | "randevu-hizmet"
  | "kargo";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "firmalar", label: "İşletmeler", icon: <Building2 size={15} /> },
  { id: "haritalar-import", label: "Haritalardan İçe Aktar", icon: <Download size={15} /> },
  { id: "marka-model", label: "Marka / Model", icon: <Layers size={15} /> },
  { id: "galeri-araclar", label: "Araç İlanları", icon: <Car size={15} /> },
  { id: "parca-urunler", label: "Parça & Ürünler", icon: <Package size={15} /> },
  { id: "randevu-hizmet", label: "Randevu & Hizmet", icon: <Calendar size={15} /> },
  { id: "kargo", label: "Kargo Ayarları", icon: <Truck size={15} /> },
];

/** /admin/otomotiv — tüm otomotiv dikeyleri için ayrılmış yönetim paneli */
export default function OtomotivYonetimi() {
  const [tab, setTab] = useState<Tab>("firmalar");

  return (
    <AdminLayout title="Otomotiv Ekosistemi Yönetimi">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-[#1e3a5f]/20 bg-gradient-to-r from-slate-50 to-blue-50/50 px-4 py-3">
          <Settings2 className="w-5 h-5 text-[#1e3a5f] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900">Ayrılmış otomotiv admin paneli</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Galeri, yedek parça, çıkma, servis, yıkama, lastik, sigorta — işletme türüne göre dinamik sekmeler.
              İşletme seçerek türe özel formlara erişin.{" "}
              <a href="/admin/sigorta" className="text-[#1e3a5f] underline">Sigorta yönetimi →</a>
            </p>
          </div>
        </div>

        <MarketplaceDisclaimer />

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

        {tab === "firmalar" && <FirmalarTab />}
        {tab === "haritalar-import" && <HaritalardanImportTab />}
        {tab === "marka-model" && <MarkaModelTab />}
        {tab === "galeri-araclar" && <GaleriAraclarTab />}
        {tab === "parca-urunler" && <ParcaUrunlerTab />}
        {tab === "randevu-hizmet" && <RandevuHizmetTab />}
        {tab === "kargo" && <KargoAyarlariTab />}
      </div>
    </AdminLayout>
  );
}
